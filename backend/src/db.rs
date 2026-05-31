use sqlx::{postgres::PgPoolOptions, PgPool, Row};

use crate::{
    error::ApiError,
    models::{Category, PublicBoardResponse, SyncRequestPayload, Task},
};

pub async fn create_pool(database_url: &str) -> Result<PgPool, ApiError> {
    PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .map_err(ApiError::Database)
}

pub async fn run_migrations(pool: &PgPool) -> Result<(), ApiError> {
    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|error| ApiError::Database(sqlx::Error::Migrate(Box::new(error))))
}

pub async fn sync_board(pool: &PgPool, payload: &SyncRequestPayload) -> Result<(), ApiError> {
    let mut transaction = pool.begin().await?;

    for category in &payload.categories {
        sqlx::query(
            r#"
            INSERT INTO categories (id, name, display_order, updated_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name,
                display_order = EXCLUDED.display_order,
                updated_at = EXCLUDED.updated_at
            WHERE EXCLUDED.updated_at >= categories.updated_at
            "#,
        )
        .bind(&category.id)
        .bind(&category.name)
        .bind(category.display_order)
        .bind(category.updated_at)
        .execute(&mut *transaction)
        .await?;
    }

    for task in &payload.tasks {
        sqlx::query(
            r#"
            INSERT INTO tasks (id, title, notes, category_id, display_order, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE
            SET title = EXCLUDED.title,
                notes = EXCLUDED.notes,
                category_id = EXCLUDED.category_id,
                display_order = EXCLUDED.display_order,
                updated_at = EXCLUDED.updated_at
            WHERE EXCLUDED.updated_at >= tasks.updated_at
            "#,
        )
        .bind(&task.id)
        .bind(&task.title)
        .bind(&task.notes)
        .bind(&task.category_id)
        .bind(task.display_order)
        .bind(task.updated_at)
        .execute(&mut *transaction)
        .await?;
    }

    if payload.full_snapshot {
        let category_ids = payload
            .categories
            .iter()
            .map(|category| category.id.as_str())
            .collect::<Vec<_>>();
        let task_ids = payload
            .tasks
            .iter()
            .map(|task| task.id.as_str())
            .collect::<Vec<_>>();

        sqlx::query("DELETE FROM tasks WHERE id <> ALL($1)")
            .bind(&task_ids)
            .execute(&mut *transaction)
            .await?;

        sqlx::query("DELETE FROM categories WHERE id <> ALL($1)")
            .bind(&category_ids)
            .execute(&mut *transaction)
            .await?;
    }

    transaction.commit().await?;
    Ok(())
}

pub async fn load_public_board(pool: &PgPool) -> Result<PublicBoardResponse, ApiError> {
    let category_rows = sqlx::query(
        r#"
        SELECT id, name, display_order, updated_at
        FROM categories
        ORDER BY display_order ASC, updated_at DESC, id ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let task_rows = sqlx::query(
        r#"
        SELECT id, title, notes, category_id, display_order, updated_at
        FROM tasks
        ORDER BY display_order ASC, updated_at DESC, id ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let categories = category_rows
        .into_iter()
        .map(|row| Category {
            id: row.get("id"),
            name: row.get("name"),
            display_order: row.get("display_order"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    let tasks = task_rows
        .into_iter()
        .map(|row| Task {
            id: row.get("id"),
            title: row.get("title"),
            notes: row.get("notes"),
            category_id: row.get("category_id"),
            display_order: row.get("display_order"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    Ok(PublicBoardResponse { categories, tasks })
}

#[cfg(test)]
fn should_replace(stored_updated_at: i64, incoming_updated_at: i64) -> bool {
    incoming_updated_at >= stored_updated_at
}

#[cfg(test)]
mod tests {
    use super::should_replace;

    #[test]
    fn newer_records_replace_stored_records() {
        assert!(should_replace(10, 11));
    }

    #[test]
    fn equal_timestamps_replace_for_idempotent_retries() {
        assert!(should_replace(10, 10));
    }

    #[test]
    fn older_records_do_not_replace_stored_records() {
        assert!(!should_replace(10, 9));
    }
}
