# OmniBoard Cloud Board MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first deployable OmniBoard slice: a protected Rust sync API, PostgreSQL persistence, and a public read-only web board.

**Architecture:** The backend is a small Axum service with SQLx PostgreSQL access and explicit route modules for sync and public board reads. The web app is a Vite React client that fetches the public board API and renders an operational kanban view. Docker Compose provides local PostgreSQL and backend wiring; docs explain curl testing and free-tier deployment.

**Tech Stack:** Rust, Axum, SQLx, PostgreSQL, Tokio, Vite, React, TypeScript, Docker Compose.

---

## File Map

- `backend/Cargo.toml`: Rust backend package and dependencies.
- `backend/src/main.rs`: application bootstrap and HTTP server.
- `backend/src/config.rs`: environment loading and validation.
- `backend/src/models.rs`: shared request and response structs.
- `backend/src/error.rs`: API error type and response mapping.
- `backend/src/auth.rs`: bearer token and timestamp validation.
- `backend/src/db.rs`: PostgreSQL pool, migrations, upsert, and query helpers.
- `backend/src/routes/mod.rs`: route registration.
- `backend/src/routes/sync.rs`: protected sync handler.
- `backend/src/routes/public.rs`: public board handler.
- `backend/migrations/0001_init.sql`: database tables and indexes.
- `backend/Dockerfile`: production backend image.
- `web/package.json`: web app scripts and dependencies.
- `web/src/App.tsx`: public board screen and fetch state.
- `web/src/api.ts`: API client and types.
- `web/src/components/Board.tsx`: board layout.
- `web/src/components/CategoryColumn.tsx`: category column.
- `web/src/components/TaskCard.tsx`: task card.
- `web/src/main.tsx`: React entrypoint.
- `web/src/styles.css`: operational dashboard styling.
- `web/index.html`, `web/tsconfig.json`, `web/vite.config.ts`: Vite configuration.
- `docker-compose.yml`: local PostgreSQL and backend services.
- `.env.example`: local environment template.
- `docs/api.md`: API contract.
- `docs/curl-examples.md`: sync smoke-test commands.
- `docs/deployment.md`: Cloudflare Pages, Koyeb, Supabase/Neon deployment steps.

## Tasks

### Task 1: Backend Foundation

- [ ] Create backend package files and modules.
- [ ] Define `Config`, API models, and API error mapping.
- [ ] Implement Axum app bootstrap with CORS and health route.
- [ ] Verify with `cargo fmt --check` and `cargo check`.

### Task 2: Database And Sync API

- [ ] Add PostgreSQL migration.
- [ ] Implement SQLx pool initialization and migration runner.
- [ ] Implement Last-Write-Wins upsert helpers.
- [ ] Implement bearer token and timestamp validation.
- [ ] Implement `POST /api/v1/sync`.
- [ ] Add backend tests for auth validation and LWW behavior.

### Task 3: Public Board API

- [ ] Implement board query helper.
- [ ] Implement `GET /api/v1/public/board`.
- [ ] Add cache-control header.
- [ ] Add backend tests for ordering and cache header.

### Task 4: Public Web Board

- [ ] Create Vite React project files.
- [ ] Implement typed API client.
- [ ] Implement board, column, and task card components.
- [ ] Add loading, empty, error, manual refresh, and auto-refresh states.
- [ ] Verify with `npm run build`.

### Task 5: Local Dev And Deployment Docs

- [ ] Add Dockerfile and Docker Compose.
- [ ] Add `.env.example`.
- [ ] Write API docs.
- [ ] Write curl examples.
- [ ] Write free deployment docs for Cloudflare Pages, Koyeb, and Supabase/Neon.
- [ ] Run final backend and web verification commands.

## Self-Review

- Spec coverage: protected sync, public API, LWW merge, PostgreSQL, read-only web board, local Docker, and free deployment docs are all mapped to tasks.
- Placeholder scan: no TBD or open implementation placeholders remain.
- Type consistency: API payload fields use `id`, `name`, `display_order`, `updated_at`, `title`, `notes`, and `category_id` consistently across backend and web.
