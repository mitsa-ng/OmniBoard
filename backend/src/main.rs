mod auth;
mod config;
mod db;
mod error;
mod models;
mod routes;

use std::sync::Arc;

use axum::http::{HeaderValue, Method};
use config::Config;
use error::ApiError;
use routes::AppState;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), ApiError> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "omniboard_backend=info,tower_http=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Arc::new(Config::from_env()?);
    let pool = db::create_pool(&config.database_url).await?;
    db::run_migrations(&pool).await?;

    let allowed_origins = config
        .allowed_web_origins
        .iter()
        .map(|origin| {
            origin.parse::<HeaderValue>().map_err(|_| {
                ApiError::Config("ALLOWED_WEB_ORIGIN must contain valid origins".to_string())
            })
        })
        .collect::<Result<Vec<_>, _>>()?;

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any)
        .allow_origin(allowed_origins);

    let app = routes::router(AppState {
        config: Arc::clone(&config),
        pool,
    })
    .layer(cors);

    let listener = tokio::net::TcpListener::bind(config.bind_addr)
        .await
        .map_err(|error| ApiError::Config(format!("failed to bind server: {error}")))?;

    tracing::info!("listening on {}", config.bind_addr);
    axum::serve(listener, app)
        .await
        .map_err(|error| ApiError::Config(format!("server error: {error}")))?;

    Ok(())
}
