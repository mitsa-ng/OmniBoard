# OmniBoard Curl Examples

Start local services:

```bash
docker compose up --build
```

Sync sample data:

```bash
curl -i -X POST http://localhost:3000/api/v1/sync \
  -H "Authorization: Bearer OmniBoard_Local_Development_Secret" \
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
      },
      {
        "id": "cat_doing",
        "name": "进行中",
        "display_order": 2,
        "updated_at": 1717100100
      },
      {
        "id": "cat_done",
        "name": "已完成",
        "display_order": 3,
        "updated_at": 1717100200
      }
    ],
    "tasks": [
      {
        "id": "task_001",
        "title": "撰写产品企划书",
        "notes": "包含市场调查与报价",
        "category_id": "cat_todo",
        "updated_at": 1717100300
      },
      {
        "id": "task_002",
        "title": "确认公开部署路线",
        "notes": "Cloudflare Pages + Koyeb + Supabase",
        "category_id": "cat_doing",
        "updated_at": 1717100400
      }
    ]
  }'
```

Read public board:

```bash
curl -i http://localhost:3000/api/v1/public/board
```

Run the web app locally:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`.

Run the management client locally:

```bash
cd admin
npm install
npm run dev
```

Open `http://localhost:5174`, set the local token to `OmniBoard_Local_Development_Secret`, then create or drag tasks and click `Sync now`.
