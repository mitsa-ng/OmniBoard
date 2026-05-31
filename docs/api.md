# OmniBoard API

Base URL:

```text
https://your-backend-domain.com/api/v1
```

## POST `/sync`

Protected endpoint for trusted client uploads.

Headers:

```text
Authorization: Bearer <SYNC_API_KEY>
X-Client-Timestamp: <unix timestamp in seconds>
Content-Type: application/json
```

Request body:

```json
{
  "full_snapshot": false,
  "categories": [
    {
      "id": "cat_todo",
      "name": "待办中",
      "display_order": 1,
      "updated_at": 1717100000
    }
  ],
  "tasks": [
    {
      "id": "task_001",
      "title": "撰写产品企划书",
      "notes": "包含市场调查与报价",
      "category_id": "cat_todo",
      "updated_at": 1717100300
    }
  ]
}
```

`full_snapshot` is optional and defaults to `false`. When `full_snapshot` is `true`, the payload is treated as the complete current board; cloud categories and tasks not present in the payload are deleted. The cloud API does not accept the local-only `is_dirty` field.

Success:

```text
200 OK
Data Synchronized Successfully
```

Errors:

- `401`: missing or malformed `Authorization`.
- `403`: incorrect bearer token.
- `400`: missing, malformed, or stale `X-Client-Timestamp`.

## GET `/public/board`

Public read-only endpoint. No authentication is required.

Response:

```json
{
  "categories": [
    {
      "id": "cat_todo",
      "name": "待办中",
      "display_order": 1,
      "updated_at": 1717100000
    }
  ],
  "tasks": [
    {
      "id": "task_001",
      "title": "撰写产品企划书",
      "notes": "包含市场调查与报价",
      "category_id": "cat_todo",
      "updated_at": 1717100300
    }
  ]
}
```

The response includes:

- `Cache-Control: public, max-age=60` by default.
- Categories sorted by `display_order ASC`, `updated_at DESC`, then `id ASC`.
- Tasks sorted by `updated_at DESC`, then `id ASC`.
