use std::sync::Arc;

use axum::{
    extract::DefaultBodyLimit,
    routing::{get, post},
    Router,
};
use sqlx::PgPool;

use crate::config::Config;

const MAX_BODY_BYTES: usize = 2 * 1024 * 1024;

pub mod board;
pub mod public;
pub mod sync;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub pool: PgPool,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health_handler))
        .route("/api/v1/board", get(board::board_handler))
        .route("/api/v1/sync", post(sync::sync_board_handler))
        .route("/api/v1/public/board", get(public::public_board_handler))
        .layer(DefaultBodyLimit::max(MAX_BODY_BYTES))
        .with_state(state)
}

async fn health_handler(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Result<&'static str, crate::error::ApiError> {
    sqlx::query("SELECT 1").execute(&state.pool).await?;
    Ok("ok")
}
