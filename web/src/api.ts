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

export async function fetchPublicBoard(signal?: AbortSignal): Promise<PublicBoardResponse> {
  const response = await fetch(`${apiBaseUrl}/public/board`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Board request failed with ${response.status}`);
  }

  return response.json();
}
