use axum::http::HeaderMap;
use chrono::Utc;

use crate::error::ApiError;

const TIMESTAMP_WINDOW_SECONDS: i64 = 300;

pub fn validate_sync_headers(headers: &HeaderMap, expected_token: &str) -> Result<(), ApiError> {
    validate_authorization(headers, expected_token)?;
    validate_timestamp(headers, Utc::now().timestamp())
}

pub fn validate_authorization(headers: &HeaderMap, expected_token: &str) -> Result<(), ApiError> {
    let value = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(ApiError::MissingAuthorization)?;

    let token = value
        .strip_prefix("Bearer ")
        .filter(|token| !token.is_empty())
        .ok_or(ApiError::MissingAuthorization)?;

    if token == expected_token {
        Ok(())
    } else {
        Err(ApiError::InvalidToken)
    }
}

fn validate_timestamp(headers: &HeaderMap, server_timestamp: i64) -> Result<(), ApiError> {
    let client_timestamp = headers
        .get("X-Client-Timestamp")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<i64>().ok())
        .ok_or(ApiError::InvalidTimestamp)?;

    let drift = (server_timestamp - client_timestamp).abs();
    if drift <= TIMESTAMP_WINDOW_SECONDS {
        Ok(())
    } else {
        Err(ApiError::StaleTimestamp)
    }
}

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue};

    use super::*;

    #[test]
    fn missing_authorization_is_rejected() {
        let headers = HeaderMap::new();

        let error = validate_authorization(&headers, "secret").unwrap_err();

        assert!(matches!(error, ApiError::MissingAuthorization));
    }

    #[test]
    fn incorrect_token_is_rejected() {
        let mut headers = HeaderMap::new();
        headers.insert(
            axum::http::header::AUTHORIZATION,
            HeaderValue::from_static("Bearer wrong"),
        );

        let error = validate_authorization(&headers, "secret").unwrap_err();

        assert!(matches!(error, ApiError::InvalidToken));
    }

    #[test]
    fn valid_token_is_accepted() {
        let mut headers = HeaderMap::new();
        headers.insert(
            axum::http::header::AUTHORIZATION,
            HeaderValue::from_static("Bearer secret"),
        );

        validate_authorization(&headers, "secret").unwrap();
    }

    #[test]
    fn stale_timestamp_is_rejected() {
        let mut headers = HeaderMap::new();
        headers.insert("X-Client-Timestamp", HeaderValue::from_static("100"));

        let error = validate_timestamp(&headers, 500).unwrap_err();

        assert!(matches!(error, ApiError::StaleTimestamp));
    }

    #[test]
    fn timestamp_inside_window_is_accepted() {
        let mut headers = HeaderMap::new();
        headers.insert("X-Client-Timestamp", HeaderValue::from_static("1000"));

        validate_timestamp(&headers, 1299).unwrap();
    }
}
