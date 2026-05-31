use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("configuration error: {0}")]
    Config(String),
    #[error("missing or invalid authorization")]
    MissingAuthorization,
    #[error("token is incorrect")]
    InvalidToken,
    #[error("missing or invalid client timestamp")]
    InvalidTimestamp,
    #[error("client timestamp is outside the allowed replay window")]
    StaleTimestamp,
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let status = match self {
            ApiError::MissingAuthorization => StatusCode::UNAUTHORIZED,
            ApiError::InvalidToken => StatusCode::FORBIDDEN,
            ApiError::InvalidTimestamp | ApiError::StaleTimestamp => StatusCode::BAD_REQUEST,
            ApiError::Config(_) | ApiError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        let body = Json(ErrorBody {
            error: self.to_string(),
        });

        (status, body).into_response()
    }
}
