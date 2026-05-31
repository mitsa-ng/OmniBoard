import { Check, Clock, GripVertical, Plus, RefreshCw, Settings, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  createId,
  currentUnixTimestamp,
  hasDirtyChanges,
  isLastSyncInsideCurrentWindow,
  isNowInSyncWindow,
  moveTaskToCategory,
  type BoardState,
  type Category,
  type SyncConfig,
  type Task,
} from "./domain";
import { loadBoard, loadSyncConfig, saveBoard, saveSyncConfig } from "./storage";
import { pushDirtyChanges } from "./sync";

type DraftTask = {
  title: string;
  notes: string;
};

const emptyDraft: DraftTask = { title: "", notes: "" };

export default function App() {
  const [board, setBoard] = useState<BoardState>(() => loadBoard());
  const [config, setConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<Record<string, DraftTask>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState("Ready");

  useEffect(() => saveBoard(board), [board]);
  useEffect(() => saveSyncConfig(config), [config]);

  const sortedCategories = useMemo(
    () => [...board.categories].sort((a, b) => a.display_order - b.display_order),
    [board.categories],
  );

  const dirtyCount =
    board.categories.filter((category) => category.is_dirty).length +
    board.tasks.filter((task) => task.is_dirty).length;

  const runSync = useCallback(async () => {
    setSyncStatus("Syncing...");
    try {
      const result = await pushDirtyChanges(board, config);
      setBoard(result.board);
      setConfig(result.config);
      setSyncStatus(result.message);
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Sync failed.");
    }
  }, [board, config]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      if (
        hasDirtyChanges(board) &&
        isNowInSyncWindow(now, config.startTime, config.endTime) &&
        !isLastSyncInsideCurrentWindow(now, config)
      ) {
        void runSync();
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [board, config, runSync]);

  function addCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      return;
    }

    setBoard((current) => ({
      ...current,
      categories: [
        ...current.categories,
        {
          id: createId("cat"),
          name,
          display_order: current.categories.length + 1,
          updated_at: currentUnixTimestamp(),
          is_dirty: true,
        },
      ],
    }));
    setNewCategoryName("");
  }

  function renameCategory(categoryId: string, name: string) {
    setBoard((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId
          ? { ...category, name, updated_at: currentUnixTimestamp(), is_dirty: true }
          : category,
      ),
    }));
  }

  function deleteCategory(categoryId: string) {
    setBoard((current) => ({
      categories: current.categories
        .filter((category) => category.id !== categoryId)
        .map((category, index) => ({
          ...category,
          display_order: index + 1,
          updated_at: currentUnixTimestamp(),
          is_dirty: true,
        })),
      tasks: current.tasks.filter((task) => task.category_id !== categoryId),
    }));
  }

  function moveCategory(categoryId: string, direction: -1 | 1) {
    setBoard((current) => {
      const ordered = [...current.categories].sort((a, b) => a.display_order - b.display_order);
      const index = ordered.findIndex((category) => category.id === categoryId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
        return current;
      }

      [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
      return {
        ...current,
        categories: ordered.map((category, orderIndex) => ({
          ...category,
          display_order: orderIndex + 1,
          updated_at: currentUnixTimestamp(),
          is_dirty: true,
        })),
      };
    });
  }

  function addTask(categoryId: string, event: FormEvent) {
    event.preventDefault();
    const draft = taskDrafts[categoryId] ?? emptyDraft;
    const title = draft.title.trim();
    if (!title) {
      return;
    }

    setBoard((current) => {
      const categoryTasks = current.tasks.filter((t) => t.category_id === categoryId);
      const nextOrder = categoryTasks.length > 0 ? Math.max(...categoryTasks.map((t) => t.display_order)) + 1 : 0;
      return {
        ...current,
        tasks: [
          ...current.tasks,
          {
            id: createId("task"),
            title,
            notes: draft.notes.trim(),
            category_id: categoryId,
            display_order: nextOrder,
            updated_at: currentUnixTimestamp(),
            is_dirty: true,
          },
        ],
      };
    });
    setTaskDrafts((current) => ({ ...current, [categoryId]: emptyDraft }));
  }

  function updateTask(taskId: string, patch: Partial<Pick<Task, "title" | "notes">>) {
    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch, updated_at: currentUnixTimestamp(), is_dirty: true } : task,
      ),
    }));
  }

  function updateTaskDisplayOrder(taskId: string, display_order: number) {
    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, display_order, updated_at: currentUnixTimestamp(), is_dirty: true } : task,
      ),
    }));
  }

  function deleteTask(taskId: string) {
    setBoard((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));
  }

  function dropTask(categoryId: string, targetTaskId?: string) {
    if (!draggedTaskId) {
      return;
    }

    if (targetTaskId) {
      // Dropped onto another task within the same category — reorder
      setBoard((current) => {
        const draggedTask = current.tasks.find((t) => t.id === draggedTaskId);
        const targetTask = current.tasks.find((t) => t.id === targetTaskId);
        if (!draggedTask || !targetTask) return current;

        const categoryTasks = current.tasks
          .filter((t) => t.category_id === categoryId && t.id !== draggedTaskId)
          .sort((a, b) => a.display_order - b.display_order);

        const targetIndex = categoryTasks.findIndex((t) => t.id === targetTaskId);
        const insertAt = targetIndex < 0 ? categoryTasks.length : targetIndex;

        categoryTasks.splice(insertAt, 0, { ...draggedTask, category_id: categoryId });

        const now = currentUnixTimestamp();
        return {
          ...current,
          tasks: categoryTasks.map((t, i) =>
            t.id === draggedTaskId
              ? { ...t, display_order: i, category_id: categoryId, updated_at: now, is_dirty: true }
              : t.id === draggedTaskId || t.is_dirty || t.display_order !== i
                ? { ...t, display_order: i, updated_at: now, is_dirty: true }
                : t,
          ),
        };
      });
    } else {
      setBoard((current) => moveTaskToCategory(current, draggedTaskId, categoryId));
    }
    setDraggedTaskId(null);
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div>
          <p className="label">OmniBoard</p>
          <h1>管理客户端</h1>
        </div>

        <section className="panel">
          <div className="panel-title">
            <Settings size={17} />
            <h2>同步设置</h2>
          </div>
          <label>
            API Base URL
            <input
              value={config.apiBaseUrl}
              onChange={(event) => setConfig({ ...config, apiBaseUrl: event.target.value })}
            />
          </label>
          <label>
            Sync Token
            <input
              type="password"
              value={config.syncToken}
              onChange={(event) => setConfig({ ...config, syncToken: event.target.value })}
              placeholder="Bearer token"
            />
          </label>
          <div className="time-grid">
            <label>
              Start
              <input
                type="time"
                value={config.startTime}
                onChange={(event) => setConfig({ ...config, startTime: event.target.value })}
              />
            </label>
            <label>
              End
              <input
                type="time"
                value={config.endTime}
                onChange={(event) => setConfig({ ...config, endTime: event.target.value })}
              />
            </label>
          </div>
          <button className="primary-button" type="button" onClick={() => void runSync()}>
            <RefreshCw size={16} />
            Sync now
          </button>
          <p className="status-line">{syncStatus}</p>
        </section>

        <section className="panel">
          <div className="panel-title">
            <Clock size={17} />
            <h2>本地状态</h2>
          </div>
          <div className="stat-row">
            <span>Dirty records</span>
            <strong>{dirtyCount}</strong>
          </div>
          <div className="stat-row">
            <span>Last sync</span>
            <strong>{config.lastSyncTimestamp ? formatDate(config.lastSyncTimestamp) : "Never"}</strong>
          </div>
          <div className="stat-row">
            <span>Window now</span>
            <strong>{isNowInSyncWindow(new Date(), config.startTime, config.endTime) ? "Open" : "Closed"}</strong>
          </div>
        </section>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="label">Local-first task control</p>
            <h2>任务状态看板</h2>
          </div>
          <form className="add-category" onSubmit={addCategory}>
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="新增区域"
            />
            <button type="submit">
              <Plus size={16} />
              Add
            </button>
          </form>
        </header>

        <div className="board">
          {sortedCategories.map((category, index) => (
            <CategoryColumn
              key={category.id}
              category={category}
              tasks={board.tasks.filter((task) => task.category_id === category.id)}
              draft={taskDrafts[category.id] ?? emptyDraft}
              isFirst={index === 0}
              isLast={index === sortedCategories.length - 1}
              editingTaskId={editingTaskId}
              onRenameCategory={renameCategory}
              onDeleteCategory={deleteCategory}
              onMoveCategory={moveCategory}
              onDraftChange={(draft) => setTaskDrafts((current) => ({ ...current, [category.id]: draft }))}
              onAddTask={addTask}
              onTaskDragStart={setDraggedTaskId}
              onDropTask={dropTask}
              onEditTask={setEditingTaskId}
              onUpdateTask={updateTask}
              onUpdateTaskDisplayOrder={updateTaskDisplayOrder}
              onDeleteTask={deleteTask}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

type CategoryColumnProps = {
  category: Category;
  tasks: Task[];
  draft: DraftTask;
  isFirst: boolean;
  isLast: boolean;
  editingTaskId: string | null;
  onRenameCategory: (categoryId: string, name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onMoveCategory: (categoryId: string, direction: -1 | 1) => void;
  onDraftChange: (draft: DraftTask) => void;
  onAddTask: (categoryId: string, event: FormEvent) => void;
  onTaskDragStart: (taskId: string) => void;
  onDropTask: (categoryId: string, targetTaskId?: string) => void;
  onEditTask: (taskId: string | null) => void;
  onUpdateTask: (taskId: string, patch: Partial<Pick<Task, "title" | "notes">>) => void;
  onUpdateTaskDisplayOrder: (taskId: string, display_order: number) => void;
  onDeleteTask: (taskId: string) => void;
};

function CategoryColumn({
  category,
  tasks,
  draft,
  isFirst,
  isLast,
  editingTaskId,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
  onDraftChange,
  onAddTask,
  onTaskDragStart,
  onDropTask,
  onEditTask,
  onUpdateTask,
  onUpdateTaskDisplayOrder,
  onDeleteTask,
}: CategoryColumnProps) {
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.display_order - b.display_order),
    [tasks],
  );

  return (
    <section className="column" onDragOver={(event) => event.preventDefault()} onDrop={() => onDropTask(category.id)}>
      <header className="column-header">
        <GripVertical size={16} />
        <input value={category.name} onChange={(event) => onRenameCategory(category.id, event.target.value)} />
        <div className="column-actions">
          <button type="button" disabled={isFirst} onClick={() => onMoveCategory(category.id, -1)}>
            ←
          </button>
          <button type="button" disabled={isLast} onClick={() => onMoveCategory(category.id, 1)}>
            →
          </button>
          <button type="button" onClick={() => onDeleteCategory(category.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      <form className="task-form" onSubmit={(event) => onAddTask(category.id, event)}>
        <input
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          placeholder="任务标题"
        />
        <textarea
          value={draft.notes}
          onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })}
          placeholder="任务注记"
        />
        <button type="submit">
          <Plus size={15} />
          Add task
        </button>
      </form>

      <div className="task-list">
        {sortedTasks.length === 0 ? <div className="empty-column">拖拽任务到这里</div> : null}
        {sortedTasks.map((task) => (
          <article
            className={`task-card ${task.is_dirty ? "task-card--dirty" : ""}`}
            draggable
            key={task.id}
            onDragStart={() => {
              onTaskDragStart(task.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDropTask(category.id, task.id);
            }}
          >
            {editingTaskId === task.id ? (
              <div className="edit-task">
                <input value={task.title} onChange={(event) => onUpdateTask(task.id, { title: event.target.value })} />
                <textarea value={task.notes} onChange={(event) => onUpdateTask(task.id, { notes: event.target.value })} />
                <div className="edit-task-actions">
                  <button type="button" onClick={() => onEditTask(null)}>
                    <Check size={15} />
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="task-card-header">
                  <h3>{task.title}</h3>
                  <div className="task-card-header-actions">
                    <span className="order-input-wrap">
                      <input
                        type="number"
                        className="order-input"
                        value={task.display_order}
                        min={0}
                        onChange={(event) => {
                          const val = parseInt(event.target.value, 10);
                          if (!isNaN(val)) {
                            onUpdateTaskDisplayOrder(task.id, val);
                          }
                        }}
                        aria-label="Sequence order"
                      />
                    </span>
                    <button type="button" onClick={() => onDeleteTask(task.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p>{task.notes || "No notes"}</p>
                <footer>
                  <span>{task.is_dirty ? "Pending sync" : "Synced"}</span>
                  <button type="button" onClick={() => onEditTask(task.id)}>
                    Edit
                  </button>
                </footer>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(unixSeconds: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}
