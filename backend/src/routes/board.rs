use axum::{extract::State, http::HeaderMap, response::IntoResponse, Json};

use crate::{
    auth::validate_authorization, db, error::ApiError, routes::AppState,
};

pub async fn board_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, ApiError> {
    validate_authorization(&headers, &state.config.sync_api_key)?;
    let board = db::load_public_board(&state.pool).await?;
    Ok(Json(board))
}
