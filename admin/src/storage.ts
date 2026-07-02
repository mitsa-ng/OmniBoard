import {
  defaultBoard,
  defaultSyncConfig,
  isBoardState,
  isSyncConfig,
  type BoardState,
  type SyncConfig,
} from "./domain";

const boardStorageKey = "omniboard.admin.board";
const configStorageKey = "omniboard.admin.syncConfig";
const storageVersion = 1;

export function loadBoard(): BoardState {
  const value = readStored(boardStorageKey);
  return isBoardState(value) ? value : defaultBoard;
}

export function saveBoard(board: BoardState) {
  writeStored(boardStorageKey, board);
}

export function loadSyncConfig(): SyncConfig {
  const value = readStored(configStorageKey);
  return isSyncConfig(value) ? value : defaultSyncConfig;
}

export function saveSyncConfig(config: SyncConfig) {
  writeStored(configStorageKey, config);
}

function writeStored(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify({ version: storageVersion, data }));
}

// Unwraps the versioned envelope; data saved before versioning was introduced
// is returned as-is so existing installs migrate on their next save.
function readStored(key: string): unknown {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "data" in parsed
    ) {
      return (parsed as { data: unknown }).data;
    }
    return parsed;
  } catch {
    return null;
  }
}
