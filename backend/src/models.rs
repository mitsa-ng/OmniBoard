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

pub const MAX_SYNC_ITEMS: usize = 10_000;

impl SyncRequestPayload {
    pub fn validate(&self) -> Result<(), String> {
        if self.categories.len() > MAX_SYNC_ITEMS {
            return Err(format!("categories exceed {MAX_SYNC_ITEMS} items"));
        }
        if self.tasks.len() > MAX_SYNC_ITEMS {
            return Err(format!("tasks exceed {MAX_SYNC_ITEMS} items"));
        }
        if self.categories.iter().any(|c| c.id.trim().is_empty()) {
            return Err("category id must not be empty".to_string());
        }
        if self
            .tasks
            .iter()
            .any(|t| t.id.trim().is_empty() || t.category_id.trim().is_empty())
        {
            return Err("task id and category_id must not be empty".to_string());
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct PublicBoardResponse {
    pub categories: Vec<Category>,
    pub tasks: Vec<Task>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn category(id: &str) -> Category {
        Category {
            id: id.to_string(),
            name: "name".to_string(),
            display_order: 0,
            updated_at: 0,
        }
    }

    fn task(id: &str, category_id: &str) -> Task {
        Task {
            id: id.to_string(),
            title: "title".to_string(),
            notes: String::new(),
            category_id: category_id.to_string(),
            display_order: 0,
            updated_at: 0,
        }
    }

    #[test]
    fn valid_payload_is_accepted() {
        let payload = SyncRequestPayload {
            full_snapshot: false,
            categories: vec![category("c1")],
            tasks: vec![task("t1", "c1")],
        };

        assert!(payload.validate().is_ok());
    }

    #[test]
    fn empty_category_id_is_rejected() {
        let payload = SyncRequestPayload {
            full_snapshot: false,
            categories: vec![category("  ")],
            tasks: vec![],
        };

        assert!(payload.validate().is_err());
    }

    #[test]
    fn empty_task_ids_are_rejected() {
        let payload = SyncRequestPayload {
            full_snapshot: false,
            categories: vec![category("c1")],
            tasks: vec![task("t1", "")],
        };

        assert!(payload.validate().is_err());
    }

    #[test]
    fn oversized_payload_is_rejected() {
        let payload = SyncRequestPayload {
            full_snapshot: false,
            categories: (0..=MAX_SYNC_ITEMS)
                .map(|index| category(&format!("c{index}")))
                .collect(),
            tasks: vec![],
        };

        assert!(payload.validate().is_err());
    }
}
