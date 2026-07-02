export type Category = {
  id: string;
  name: string;
  display_order: number;
  updated_at: number;
};

export type Task = {
  id: string;
  title: string;
  notes: string;
  category_id: string;
  display_order: number;
  updated_at: number;
};

export type PublicBoardResponse = {
  categories: Category[];
  tasks: Task[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.display_order === "number" &&
    typeof value.updated_at === "number"
  );
}

function isTask(value: unknown): value is Task {
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

export function isPublicBoardResponse(value: unknown): value is PublicBoardResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.categories) &&
    value.categories.every(isCategory) &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isTask)
  );
}

export async function fetchPublicBoard(signal?: AbortSignal): Promise<PublicBoardResponse> {
  const response = await fetch(`${apiBaseUrl}/public/board`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Board request failed with ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isPublicBoardResponse(data)) {
    throw new Error("Board request returned an unexpected payload");
  }

  return data;
}
