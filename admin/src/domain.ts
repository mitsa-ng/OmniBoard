export type Category = {
  id: string;
  name: string;
  display_order: number;
  updated_at: number;
  is_dirty: boolean;
};

export type Task = {
  id: string;
  title: string;
  notes: string;
  category_id: string;
  display_order: number;
  updated_at: number;
  is_dirty: boolean;
};

export type BoardState = {
  categories: Category[];
  tasks: Task[];
};

export type SyncConfig = {
  apiBaseUrl: string;
  syncToken: string;
  startTime: string;
  endTime: string;
  lastSyncTimestamp: number | null;
};

export type SyncPayload = {
  full_snapshot: true;
  categories: Array<Omit<Category, "is_dirty">>;
  tasks: Array<Omit<Task, "is_dirty">>;
};

export const defaultBoard: BoardState = {
  categories: [
    {
      id: "cat_todo",
      name: "待处理",
      display_order: 1,
      updated_at: currentUnixTimestamp(),
      is_dirty: true,
    },
    {
      id: "cat_doing",
      name: "进行中",
      display_order: 2,
      updated_at: currentUnixTimestamp(),
      is_dirty: true,
    },
    {
      id: "cat_done",
      name: "已完成",
      display_order: 3,
      updated_at: currentUnixTimestamp(),
      is_dirty: true,
    },
  ],
  tasks: [],
};

export const defaultSyncConfig: SyncConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "https://omniboard-o64i.onrender.com/api/v1",
  syncToken: "",
  startTime: "09:00",
  endTime: "18:00",
  lastSyncTimestamp: null,
};

export function currentUnixTimestamp(date = new Date()) {
  return Math.floor(date.getTime() / 1000);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isServerCategory(value: unknown): value is Omit<Category, "is_dirty"> {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.display_order === "number" &&
    typeof value.updated_at === "number"
  );
}

export function isServerTask(value: unknown): value is Omit<Task, "is_dirty"> {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.notes === "string" &&
    typeof value.category_id === "string" &&
    typeof value.display_order === "number" &&
    typeof value.updated_at === "number"
  );
}

export function isServerBoard(
  value: unknown,
): value is { categories: Omit<Category, "is_dirty">[]; tasks: Omit<Task, "is_dirty">[] } {
  return (
    isRecord(value) &&
    Array.isArray(value.categories) &&
    value.categories.every(isServerCategory) &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isServerTask)
  );
}

export function isBoardState(value: unknown): value is BoardState {
  return (
    isServerBoard(value) &&
    value.categories.every((category) => typeof (category as Category).is_dirty === "boolean") &&
    value.tasks.every((task) => typeof (task as Task).is_dirty === "boolean")
  );
}

export function isSyncConfig(value: unknown): value is SyncConfig {
  return (
    isRecord(value) &&
    typeof value.apiBaseUrl === "string" &&
    typeof value.syncToken === "string" &&
    typeof value.startTime === "string" &&
    typeof value.endTime === "string" &&
    (value.lastSyncTimestamp === null || typeof value.lastSyncTimestamp === "number")
  );
}

export function createId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${randomId}`;
}

export function hasDirtyChanges(board: BoardState) {
  return board.categories.some((category) => category.is_dirty) || board.tasks.some((task) => task.is_dirty);
}

export function buildSyncPayload(board: BoardState): SyncPayload {
  return {
    full_snapshot: true,
    categories: board.categories.map(({ is_dirty: _isDirty, ...category }) => category),
    tasks: board.tasks.map(({ is_dirty: _isDirty, ...task }) => task),
  };
}

export function clearDirtyFlags(board: BoardState): BoardState {
  return {
    categories: board.categories.map((category) => ({ ...category, is_dirty: false })),
    tasks: board.tasks.map((task) => ({ ...task, is_dirty: false })),
  };
}

export function moveTaskToCategory(board: BoardState, taskId: string, categoryId: string, now = currentUnixTimestamp()): BoardState {
  const categoryTasks = board.tasks.filter((t) => t.category_id === categoryId && t.id !== taskId);
  const nextOrder = categoryTasks.length > 0 ? Math.max(...categoryTasks.map((t) => t.display_order)) + 1 : 0;
  return {
    ...board,
    tasks: board.tasks.map((task) =>
      task.id === taskId
        ? { ...task, category_id: categoryId, display_order: nextOrder, updated_at: now, is_dirty: true }
        : task,
    ),
  };
}

export function isNowInSyncWindow(now: Date, startTime: string, endTime: string) {
  const currentMinutes = minutesSinceMidnight(now);
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function isLastSyncInsideCurrentWindow(now: Date, config: SyncConfig) {
  if (!config.lastSyncTimestamp) {
    return false;
  }

  const lastSync = new Date(config.lastSyncTimestamp * 1000);
  if (!isNowInSyncWindow(lastSync, config.startTime, config.endTime)) {
    return false;
  }

  const currentWindowStart = resolveWindowStart(now, config.startTime, config.endTime);
  return lastSync.getTime() >= currentWindowStart.getTime();
}

function resolveWindowStart(now: Date, startTime: string, endTime: string) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const currentMinutes = minutesSinceMidnight(now);
  const start = new Date(now);
  start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

  if (startMinutes > endMinutes && currentMinutes < endMinutes) {
    start.setDate(start.getDate() - 1);
  }

  return start;
}

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
