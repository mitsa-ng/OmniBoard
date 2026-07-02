import { describe, expect, it } from "vitest";

import type { Task } from "./api";
import { groupTasksByCategory } from "./board-logic";

function task(id: string, categoryId: string, displayOrder: number): Task {
  return {
    id,
    title: id,
    notes: "",
    category_id: categoryId,
    display_order: displayOrder,
    updated_at: 0,
  };
}

describe("groupTasksByCategory", () => {
  it("groups tasks by category and sorts each group by display order", () => {
    const groups = groupTasksByCategory([
      task("t3", "c1", 2),
      task("t1", "c1", 0),
      task("t2", "c2", 1),
    ]);

    expect(Object.keys(groups).sort()).toEqual(["c1", "c2"]);
    expect(groups.c1.map((t) => t.id)).toEqual(["t1", "t3"]);
    expect(groups.c2.map((t) => t.id)).toEqual(["t2"]);
  });

  it("returns an empty object for no tasks", () => {
    expect(groupTasksByCategory([])).toEqual({});
  });
});
