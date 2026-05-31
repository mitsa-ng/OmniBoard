import { describe, expect, it } from "vitest";

import {
  buildSyncPayload,
  clearDirtyFlags,
  hasDirtyChanges,
  isLastSyncInsideCurrentWindow,
  isNowInSyncWindow,
  moveTaskToCategory,
  type BoardState,
  type SyncConfig,
} from "./domain";

const board: BoardState = {
  categories: [
    { id: "todo", name: "Todo", display_order: 1, updated_at: 10, is_dirty: true },
    { id: "done", name: "Done", display_order: 2, updated_at: 10, is_dirty: false },
  ],
  tasks: [
    { id: "task_1", title: "Write", notes: "Draft", category_id: "todo", display_order: 0, updated_at: 10, is_dirty: true },
    { id: "task_2", title: "Ship", notes: "Deploy", category_id: "done", display_order: 0, updated_at: 10, is_dirty: false },
  ],
};

describe("board dirty state", () => {
  it("builds a full snapshot sync payload and omits local flags", () => {
    const payload = buildSyncPayload(board);

    expect(payload).toEqual({
      full_snapshot: true,
      categories: [
        { id: "todo", name: "Todo", display_order: 1, updated_at: 10 },
        { id: "done", name: "Done", display_order: 2, updated_at: 10 },
      ],
      tasks: [
        { id: "task_1", title: "Write", notes: "Draft", category_id: "todo", display_order: 0, updated_at: 10 },
        { id: "task_2", title: "Ship", notes: "Deploy", category_id: "done", display_order: 0, updated_at: 10 },
      ],
    });
  });

  it("clears dirty flags after successful sync", () => {
    const cleanBoard = clearDirtyFlags(board);

    expect(hasDirtyChanges(cleanBoard)).toBe(false);
  });

  it("marks a dragged task as dirty and updates its category and order", () => {
    const nextBoard = moveTaskToCategory(board, "task_1", "done", 20);

    expect(nextBoard.tasks[0]).toMatchObject({
      category_id: "done",
      display_order: 1,
      updated_at: 20,
      is_dirty: true,
    });
  });
});

describe("sync window", () => {
  it("accepts times inside a same-day window", () => {
    expect(isNowInSyncWindow(new Date("2026-05-31T12:30:00"), "12:00", "13:00")).toBe(true);
  });

  it("rejects times outside a same-day window", () => {
    expect(isNowInSyncWindow(new Date("2026-05-31T14:00:00"), "12:00", "13:00")).toBe(false);
  });

  it("accepts late-night times inside a cross-day window", () => {
    expect(isNowInSyncWindow(new Date("2026-05-31T23:30:00"), "23:00", "01:00")).toBe(true);
  });

  it("accepts after-midnight times inside a cross-day window", () => {
    expect(isNowInSyncWindow(new Date("2026-06-01T00:30:00"), "23:00", "01:00")).toBe(true);
  });

  it("detects whether the current window already synced", () => {
    const config: SyncConfig = {
      apiBaseUrl: "http://localhost:3000/api/v1",
      syncToken: "secret",
      startTime: "23:00",
      endTime: "01:00",
      lastSyncTimestamp: Math.floor(new Date("2026-05-31T23:30:00").getTime() / 1000),
    };

    expect(isLastSyncInsideCurrentWindow(new Date("2026-06-01T00:30:00"), config)).toBe(true);
  });
});
