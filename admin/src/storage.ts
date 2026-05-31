import { defaultBoard, defaultSyncConfig, type BoardState, type SyncConfig } from "./domain";

const boardStorageKey = "omniboard.admin.board";
const configStorageKey = "omniboard.admin.syncConfig";

export function loadBoard(): BoardState {
  return readJson(boardStorageKey, defaultBoard);
}

export function saveBoard(board: BoardState) {
  localStorage.setItem(boardStorageKey, JSON.stringify(board));
}

export function loadSyncConfig(): SyncConfig {
  return readJson(configStorageKey, defaultSyncConfig);
}

export function saveSyncConfig(config: SyncConfig) {
  localStorage.setItem(configStorageKey, JSON.stringify(config));
}

function readJson<T>(key: string, fallback: T): T {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}
