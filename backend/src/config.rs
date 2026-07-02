use std::{env, net::SocketAddr};

use crate::error::ApiError;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub sync_api_key: String,
    pub allowed_web_origins: Vec<String>,
    pub public_cache_max_age_seconds: u64,
    pub db_max_connections: u32,
    pub bind_addr: SocketAddr,
}

impl Config {
    pub fn from_env() -> Result<Self, ApiError> {
        let database_url = required_env("DATABASE_URL")?;
        let sync_api_key = required_env("SYNC_API_KEY")?;
        let allowed_web_origins = env::var("ALLOWED_WEB_ORIGIN")
            .unwrap_or_else(|_| {
                "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
                    .to_string()
            })
            .split(',')
            .map(str::trim)
            .filter(|origin| !origin.is_empty())
            .map(ToOwned::to_owned)
            .collect();
        let public_cache_max_age_seconds = env::var("PUBLIC_CACHE_MAX_AGE_SECONDS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(60);
        let db_max_connections = env::var("DB_MAX_CONNECTIONS")
            .ok()
            .and_then(|value| value.parse::<u32>().ok())
            .unwrap_or(10);
        let port = env::var("PORT")
            .ok()
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(3000);
        let bind_addr = SocketAddr::from(([0, 0, 0, 0], port));

        Ok(Self {
            database_url,
            sync_api_key,
            allowed_web_origins,
            public_cache_max_age_seconds,
            db_max_connections,
            bind_addr,
        })
    }
}

fn required_env(name: &str) -> Result<String, ApiError> {
    env::var(name).map_err(|_| ApiError::Config(format!("{name} is required")))
}
