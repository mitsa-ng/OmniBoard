import { buildSyncPayload, clearDirtyFlags, currentUnixTimestamp, hasDirtyChanges, type BoardState, type SyncConfig } from "./domain";

export type SyncResult = {
  board: BoardState;
  config: SyncConfig;
  message: string;
};

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
