use axum::{extract::State, http::HeaderMap};

use crate::{
    auth::validate_sync_headers, db, error::ApiError, models::SyncRequestPayload, routes::AppState,
};

pub async fn sync_board_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(payload): axum::Json<SyncRequestPayload>,
) -> Result<&'static str, ApiError> {
    validate_sync_headers(&headers, &state.config.sync_api_key)?;
    db::sync_board(&state.pool, &payload).await?;
    Ok("Data Synchronized Successfully")
}
