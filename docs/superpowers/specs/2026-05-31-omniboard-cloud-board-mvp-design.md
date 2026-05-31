# OmniBoard Cloud Board MVP Design

Date: 2026-05-31

## 1. Purpose

This spec defines the first deployable slice of OmniBoard: a protected cloud sync API, a PostgreSQL-backed board store, and a public read-only board website.

The full product vision includes a Flutter local-first client. That client is intentionally out of scope for this phase. This phase focuses on proving the cloud sharing loop:

1. A trusted client or test script uploads categories and tasks.
2. The backend authenticates the write request.
3. The backend merges records using Last-Write-Wins based on `updated_at`.
4. External viewers open a public website and see the latest board state.

## 2. Scope

### In Scope

- Rust Axum backend service.
- PostgreSQL persistence.
- `POST /api/v1/sync` protected sync endpoint.
- `GET /api/v1/public/board` unauthenticated public endpoint.
- Bearer token authentication for sync writes.
- `X-Client-Timestamp` replay window validation.
- Last-Write-Wins upsert for categories and tasks.
- Read-only public web board.
- Automatic public board refresh.
- Local Docker Compose development setup.
- Deployment documentation for Koyeb, Cloudflare Pages, and Supabase or Neon.
- Curl examples for testing sync without a Flutter client.

### Out of Scope

- Flutter desktop or mobile app implementation.
- Local SQLite or Drift schema.
- Rich text editor support.
- Multi-user accounts.
- Per-board permissions.
- Complex conflict resolution beyond Last-Write-Wins.
- Web-based editing.
- Push-based realtime updates.

## 3. Recommended Free Deployment Route

The default free deployment route is:

- Public website: Cloudflare Pages.
- Backend API: Koyeb Free web service.
- Database: Supabase Free PostgreSQL by default, with Neon Free as an alternative.

The backend remains a normal containerized Rust service, so it can also be moved later to Render, Railway, Fly.io, a VPS, or Kubernetes without changing API contracts.

## 4. Repository Layout

```text
OmniBoard/
  backend/
    Cargo.toml
    Dockerfile
    src/
      main.rs
      config.rs
      db.rs
      models.rs
      routes/
        mod.rs
        public.rs
        sync.rs
      auth.rs
      error.rs
    migrations/
  web/
    package.json
    src/
      App.tsx
      api.ts
      components/
        Board.tsx
        CategoryColumn.tsx
        TaskCard.tsx
  docs/
    api.md
    deployment.md
    curl-examples.md
  docker-compose.yml
  .env.example
```

## 5. Backend Design

### Runtime

- Framework: Rust + Axum.
- Database access: SQLx with PostgreSQL.
- Serialization: Serde.
- Time handling: Unix timestamps in seconds for API compatibility.
- Configuration: environment variables.

### Environment Variables

```text
DATABASE_URL=postgres://...
SYNC_API_KEY=<strong-random-secret>
ALLOWED_WEB_ORIGIN=https://<cloudflare-pages-domain>
PUBLIC_CACHE_MAX_AGE_SECONDS=60
PORT=3000
```

`SYNC_API_KEY` must never be committed. `.env.example` may show placeholder values only.

### Routes

`POST /api/v1/sync`

- Requires `Authorization: Bearer <token>`.
- Requires `X-Client-Timestamp: <unix_timestamp_seconds>`.
- Rejects missing or malformed authorization with `401`.
- Rejects incorrect token with `403`.
- Rejects missing, malformed, or stale timestamp with `400`.
- Accepts `categories` and `tasks` arrays.
- Upserts each record only if the incoming `updated_at` is newer than or equal to the stored `updated_at`.
- Returns status `200` with body `Data Synchronized Successfully`.

`GET /api/v1/public/board`

- Requires no authentication.
- Returns all categories sorted by `display_order ASC`, then `updated_at DESC`, then `id ASC`.
- Returns all tasks sorted by `updated_at DESC`, then `id ASC`.
- Sets `Cache-Control: public, max-age=60` by default.

### API Payloads

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

The cloud API does not accept or return the local-only `is_dirty` field.

## 6. Data Model

### `categories`

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  updated_at BIGINT NOT NULL
);
```

### `tasks`

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  updated_at BIGINT NOT NULL
);
```

Indexes:

```sql
CREATE INDEX categories_display_order_idx ON categories(display_order);
CREATE INDEX tasks_category_id_idx ON tasks(category_id);
CREATE INDEX tasks_updated_at_idx ON tasks(updated_at);
```

## 7. Conflict Handling

The backend uses Last-Write-Wins:

- If a record does not exist, insert it.
- If a record exists and incoming `updated_at >= stored updated_at`, update it.
- If incoming `updated_at < stored updated_at`, ignore it.

Equal timestamps allow replacement so repeated client retries remain idempotent.

## 8. Public Web Board Design

The public website is a focused read-only operational board, not a marketing page.

Primary screen:

- Top bar with product name, refresh action, and last refreshed time.
- Horizontal board columns using category order from the API.
- Task cards with title, notes preview, and last updated time.
- Empty category state.
- Network error state with retry action.
- Loading state that keeps the layout stable.

Behavior:

- Fetch `GET /api/v1/public/board` on load.
- Auto-refresh every 60 seconds.
- Manual refresh button.
- No edit controls.
- No token or private configuration exposed to the browser.

## 9. Local Development

Docker Compose starts:

- PostgreSQL.
- Backend service with local environment variables.

The web app runs through its package manager dev server and points to the backend URL through a public environment variable such as:

```text
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

The backend should provide CORS for the configured web origin during development and deployment.

## 10. Testing Strategy

Backend tests:

- Missing authorization returns `401`.
- Incorrect token returns `403`.
- Missing timestamp returns `400`.
- Timestamp outside the 300 second window returns `400`.
- Valid sync inserts categories and tasks.
- Older sync data does not overwrite newer records.
- Equal timestamp sync is idempotent.
- Public board returns categories in display order.
- Public board sets cache headers.

Web checks:

- Board renders categories and tasks from mocked API data.
- Empty categories render a stable empty state.
- Failed API request shows retry state.
- Manual refresh triggers a new fetch.

Manual end-to-end check:

1. Start local PostgreSQL and backend.
2. Send the documented curl sync request.
3. Open the public web board.
4. Confirm the uploaded tasks appear in the expected columns.

## 11. Deployment Notes

### Supabase or Neon

- Create a free PostgreSQL project.
- Copy the pooled connection string when available.
- Store the connection string as `DATABASE_URL` in Koyeb.
- Run migrations during backend startup or as a documented deploy step.

### Koyeb

- Deploy the backend from the repository or Dockerfile.
- Set `DATABASE_URL`, `SYNC_API_KEY`, `ALLOWED_WEB_ORIGIN`, `PUBLIC_CACHE_MAX_AGE_SECONDS`, and `PORT`.
- Expose the backend public URL.
- Configure allowed CORS origin for the Cloudflare Pages domain.

### Cloudflare Pages

- Deploy the `web/` directory.
- Set `VITE_API_BASE_URL` to the Koyeb backend URL plus `/api/v1`.
- Enable HTTPS through Cloudflare Pages defaults.

## 12. Later Phases

After this MVP works, the next phase can add the Flutter local-first client:

- Drift tables matching the cloud API contract.
- Local dirty flags.
- Drag-and-drop category and task updates.
- Secure token storage through OS keychain APIs.
- Sync window scheduling.
- Upload only dirty records.
- Clear dirty flags after successful sync.

The cloud API contract in this MVP is designed so the Flutter client can adopt it without backend rewrites.
