import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { fetchPublicBoard, type PublicBoardResponse } from "./api";
import { Board } from "./components/Board";

const REFRESH_INTERVAL_MS = 60_000;

type LoadState =
  | {
      status: "loading" | "ready";
      board: PublicBoardResponse | null;
      lastRefresh: Date | null;
      message?: never;
    }
  | {
      status: "error";
      board: PublicBoardResponse | null;
      lastRefresh: Date | null;
      message: string;
    };

export default function App() {
  const [state, setState] = useState<LoadState>({
    status: "loading",
    board: null,
    lastRefresh: null,
  });

  const loadBoard = useCallback(async (signal?: AbortSignal) => {
    setState((current) => ({
      status: current.board ? "ready" : "loading",
      board: current.board,
      lastRefresh: current.lastRefresh,
    }));

    try {
      const board = await fetchPublicBoard(signal);
      setState({ status: "ready", board, lastRefresh: new Date() });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setState((current) => ({
        status: "error",
        board: current.board,
        lastRefresh: current.lastRefresh,
        message: error instanceof Error ? error.message : "Unable to load board",
      }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadBoard(controller.signal);
    const interval = window.setInterval(() => {
      void loadBoard();
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadBoard]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Public board</p>
          <h1>OmniBoard</h1>
        </div>
        <div className="topbar__actions">
          <span className="last-refresh">
            {state.lastRefresh ? `Updated ${formatTime(state.lastRefresh)}` : "Waiting for sync"}
          </span>
          <button className="icon-button" type="button" onClick={() => void loadBoard()}>
            <RefreshCw size={18} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {state.status === "error" ? (
        <div className="alert" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{state.message}</span>
        </div>
      ) : null}

      {state.board ? <Board board={state.board} /> : <BoardSkeleton />}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <main className="board" aria-label="Loading board">
      {["one", "two", "three"].map((key) => (
        <section className="category-column category-column--loading" key={key}>
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </section>
      ))}
    </main>
  );
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
