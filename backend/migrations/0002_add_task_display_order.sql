ALTER TABLE tasks ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS tasks_display_order_idx ON tasks(display_order);
