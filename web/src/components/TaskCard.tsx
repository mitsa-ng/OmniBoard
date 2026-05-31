import type { Task } from "../api";

type TaskCardProps = {
  task: Task;
};

export function TaskCard({ task }: TaskCardProps) {
  return (
    <article className="task-card">
      <div className="task-card__header">
        <h3>{task.title}</h3>
        <time dateTime={new Date(task.updated_at * 1000).toISOString()}>
          {formatRelativeTime(task.updated_at)}
        </time>
      </div>
      {task.notes.trim().length > 0 ? <p>{task.notes}</p> : <p className="muted">No notes</p>}
    </article>
  );
}

function formatRelativeTime(unixSeconds: number) {
  const date = new Date(unixSeconds * 1000);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
