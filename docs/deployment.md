# OmniBoard Free Deployment Guide

This guide deploys the MVP with:

- **Vercel** for the public website and admin client.
- **Render** for the Rust Axum backend.
- **Supabase** Free PostgreSQL by default, with **Neon** Free as an alternative.

## 1. Create PostgreSQL

Use Supabase:

1. Create a Supabase project.
2. Open the database connection settings.
3. Copy the pooled PostgreSQL connection string.
4. Keep the password private.

Or use Neon:

1. Create a Neon project.
2. Copy the pooled PostgreSQL connection string.
3. Keep the password private.

The backend runs migrations on startup, so the database can start empty.

## 2. Deploy Backend To Render

1. Push the repository to GitHub.
2. In Render Dashboard → **New +** → **Blueprint**.
3. Connect your repository. Render will auto-detect `render.yaml`.

Or create a **Web Service** manually:

- **Runtime**: Docker
- **Repository**: your GitHub repo
- **Dockerfile path**: `./backend/Dockerfile`

Set environment variables in Render dashboard:

```text
DATABASE_URL=<supabase-or-neon-postgres-url>
SYNC_API_KEY=<openssl rand -hex 32>
ALLOWED_WEB_ORIGIN=https://<your-vercel-web-domain>,https://<your-vercel-admin-domain>
PUBLIC_CACHE_MAX_AGE_SECONDS=60
PORT=3000
RUST_LOG=omniboard_backend=info,tower_http=info
```

After deployment, test:

```bash
curl -i https://<your-render-app.onrender.com>/health
```

Expected body:

```text
ok
```

> **Note**: Render free tier sleeps after 15 minutes of inactivity. The first request after idle will have a ~1s cold start. Upgrade to the Starter plan ($7/month) to disable sleeping.

## 3. Deploy Public Web To Vercel

1. In Vercel Dashboard → **Add New...** → **Project**.
2. Import your GitHub repository.
3. **Root Directory**: `web`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Set environment variable:

```text
VITE_API_BASE_URL=https://<your-render-app.onrender.com>/api/v1
```

7. Deploy.

## 4. Deploy Admin Client To Vercel

1. Create another Vercel project from the same repository.
2. **Root Directory**: `admin`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Set environment variable:

```text
VITE_API_BASE_URL=https://<your-render-app.onrender.com>/api/v1
```

6. Deploy.
7. Add the admin domain to the backend `ALLOWED_WEB_ORIGIN` environment variable on Render.

## 5. Smoke Test Sync

Send sample data to the deployed backend:

```bash
curl -i -X POST https://<your-render-app.onrender.com>/api/v1/sync \
  -H "Authorization: Bearer <SYNC_API_KEY>" \
  -H "X-Client-Timestamp: $(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{
    "full_snapshot": true,
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
  }'
```

Refresh the Vercel site and confirm the task appears.

## Environment Variables Reference

### Backend (Render)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SYNC_API_KEY` | ✅ | Strong random secret for sync auth |
| `ALLOWED_WEB_ORIGIN` | ❌ | Comma-separated CORS origins (default: localhost) |
| `PUBLIC_CACHE_MAX_AGE_SECONDS` | ❌ | Public API Cache-Control max-age (default: 60) |
| `PORT` | ❌ | Server port (default: 3000) |
| `RUST_LOG` | ❌ | Logging level (default: info) |

### Web & Admin (Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ❌ | Backend API base URL (default: http://localhost:3000/api/v1) |
