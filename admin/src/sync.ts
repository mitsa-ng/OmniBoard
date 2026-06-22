import { buildSyncPayload, clearDirtyFlags, currentUnixTimestamp, hasDirtyChanges, type BoardState, type Category, type Task, type SyncConfig } from "./domain";

export type SyncResult = {
  board: BoardState;
  config: SyncConfig;
  message: string;
};

function normalizeBoard(response: { categories: Omit<Category, "is_dirty">[]; tasks: Omit<Task, "is_dirty">[] }): BoardState {
  return {
    categories: response.categories.map((category) => ({ ...category, is_dirty: false })),
    tasks: response.tasks.map((task) => ({ ...task, is_dirty: false })),
  };
}

export async function pullBoardFromServer(config: SyncConfig): Promise<SyncResult> {
  if (!config.syncToken.trim()) {
    throw new Error("Sync token is required.");
  }

  const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/board`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.syncToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Pull failed with ${response.status}.`);
  }

  const data = await response.json();
  const syncedAt = currentUnixTimestamp();
  return {
    board: normalizeBoard(data),
    config: { ...config, lastSyncTimestamp: syncedAt },
    message: "Board pulled from database successfully.",
  };
}

export async function pushDirtyChanges(board: BoardState, config: SyncConfig): Promise<SyncResult> {
  if (!hasDirtyChanges(board)) {
    return { board, config, message: "No local changes to sync." };
  }

  if (!config.syncToken.trim()) {
    throw new Error("Sync token is required.");
  }

  const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.syncToken}`,
      "X-Client-Timestamp": String(currentUnixTimestamp()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildSyncPayload(board)),
  });

  if (!response.ok) {
    throw new Error(`Sync failed with ${response.status}.`);
  }

  const syncedAt = currentUnixTimestamp();
  return {
    board: clearDirtyFlags(board),
    config: { ...config, lastSyncTimestamp: syncedAt },
    message: "Data synchronized successfully.",
  };
}
