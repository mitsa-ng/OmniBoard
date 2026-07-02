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
    #[error("invalid payload: {0}")]
    Validation(String),
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
            ApiError::InvalidTimestamp | ApiError::StaleTimestamp | ApiError::Validation(_) => {
                StatusCode::BAD_REQUEST
            }
            ApiError::Config(_) | ApiError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        // Never expose database internals (SQL, table names, connection info) to clients.
        let message = match &self {
            ApiError::Database(error) => {
                tracing::error!(%error, "database error");
                "internal database error".to_string()
            }
            other => other.to_string(),
        };

        let body = Json(ErrorBody { error: message });

        (status, body).into_response()
    }
}
