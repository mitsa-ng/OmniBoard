import type { PublicBoardResponse, Task } from "../api";
import { CategoryColumn } from "./CategoryColumn";

type BoardProps = {
  board: PublicBoardResponse;
};

export function Board({ board }: BoardProps) {
  const tasksByCategory = board.tasks.reduce<Record<string, Task[]>>((groups, task) => {
    groups[task.category_id] = groups[task.category_id] ?? [];
    groups[task.category_id].push(task);
    return groups;
  }, {});

  for (const key of Object.keys(tasksByCategory)) {
    tasksByCategory[key].sort((a, b) => a.display_order - b.display_order);
  }

  if (board.categories.length === 0) {
    return <div className="empty-board">No categories have been synced yet.</div>;
  }

  return (
    <main className="board" aria-label="Public task board">
      {board.categories.map((category) => (
        <CategoryColumn
          key={category.id}
          category={category}
          tasks={tasksByCategory[category.id] ?? []}
        />
      ))}
    </main>
  );
}
