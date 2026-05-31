import type { Category, Task } from "../api";
import { TaskCard } from "./TaskCard";

type CategoryColumnProps = {
  category: Category;
  tasks: Task[];
};

export function CategoryColumn({ category, tasks }: CategoryColumnProps) {
  return (
    <section className="category-column" aria-labelledby={`category-${category.id}`}>
      <header className="category-column__header">
        <h2 id={`category-${category.id}`}>{category.name}</h2>
        <span>{tasks.length}</span>
      </header>

      <div className="category-column__tasks">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="empty-column">No tasks in this column.</div>
        )}
      </div>
    </section>
  );
}
