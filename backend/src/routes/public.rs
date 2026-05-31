use axum::{
    extract::State,
    http::{header, HeaderValue},
    response::IntoResponse,
    Json,
};

use crate::{db, error::ApiError, routes::AppState};

pub async fn public_board_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, ApiError> {
    let board = db::load_public_board(&state.pool).await?;
    let cache_control = format!(
        "public, max-age={}",
        state.config.public_cache_max_age_seconds
    );
    let headers = [(
        header::CACHE_CONTROL,
        HeaderValue::from_str(&cache_control)
            .unwrap_or_else(|_| HeaderValue::from_static("public, max-age=60")),
    )];

    Ok((headers, Json(board)))
}
