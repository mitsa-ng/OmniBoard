use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub display_order: i32,
    pub updated_at: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub notes: String,
    pub category_id: String,
    pub display_order: i32,
    pub updated_at: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SyncRequestPayload {
    #[serde(default)]
    pub full_snapshot: bool,
    pub categories: Vec<Category>,
    pub tasks: Vec<Task>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct PublicBoardResponse {
    pub categories: Vec<Category>,
    pub tasks: Vec<Task>,
}
