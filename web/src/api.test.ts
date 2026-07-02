import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPublicBoard, isPublicBoardResponse } from "./api";

const validBoard = {
  categories: [{ id: "c1", name: "Todo", display_order: 1, updated_at: 10 }],
  tasks: [
    { id: "t1", title: "Write", notes: "", category_id: "c1", display_order: 0, updated_at: 10 },
  ],
};

function mockFetch(response: Partial<Response>) {
  const fetchMock = vi.fn().mockResolvedValue(response as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPublicBoard", () => {
  it("returns the board when the response is valid", async () => {
    mockFetch({ ok: true, json: async () => validBoard });

    await expect(fetchPublicBoard()).resolves.toEqual(validBoard);
  });

  it("throws with the status code on http errors", async () => {
    mockFetch({ ok: false, status: 503, json: async () => ({}) });

    await expect(fetchPublicBoard()).rejects.toThrow("Board request failed with 503");
  });

  it("rejects payloads that do not match the board shape", async () => {
    mockFetch({ ok: true, json: async () => ({ categories: [{ id: 42 }], tasks: [] }) });

    await expect(fetchPublicBoard()).rejects.toThrow("unexpected payload");
  });
});

describe("isPublicBoardResponse", () => {
  it("accepts a valid board", () => {
    expect(isPublicBoardResponse(validBoard)).toBe(true);
  });

  it("rejects non-objects and missing collections", () => {
    expect(isPublicBoardResponse(null)).toBe(false);
    expect(isPublicBoardResponse("board")).toBe(false);
    expect(isPublicBoardResponse({ categories: [] })).toBe(false);
  });

  it("rejects tasks with wrong field types", () => {
    const invalid = {
      categories: [],
      tasks: [{ id: "t1", title: "x", notes: "", category_id: "c1", display_order: "first", updated_at: 10 }],
    };

    expect(isPublicBoardResponse(invalid)).toBe(false);
  });
});
