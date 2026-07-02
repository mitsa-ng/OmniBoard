import type { Task } from "./api";

export function groupTasksByCategory(tasks: Task[]): Record<string, Task[]> {
  const groups = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    acc[task.category_id] = acc[task.category_id] ?? [];
    acc[task.category_id].push(task);
    return acc;
  }, {});

  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.display_order - b.display_order);
  }

  return groups;
}
