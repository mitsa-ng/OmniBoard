import type { PublicBoardResponse } from "../api";
import { groupTasksByCategory } from "../board-logic";
import { CategoryColumn } from "./CategoryColumn";

type BoardProps = {
  board: PublicBoardResponse;
};

export function Board({ board }: BoardProps) {
  const tasksByCategory = groupTasksByCategory(board.tasks);

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
