# OmniBoard Admin Client

The `admin/` app is the current management client MVP.

It is implemented as a Vite React app because the local machine does not have Flutter installed. The app still follows the Local-First sync contract:

- Board data is stored in browser `localStorage`.
- Categories and tasks carry local `is_dirty` flags.
- Task cards can be dragged between categories.
- Categories and tasks can be created, edited, and deleted.
- Sync settings include API base URL, sync token, start time, end time, and last sync time.
- Manual sync posts the full current board snapshot to `POST /api/v1/sync`, then clears dirty flags after success.
- Automatic sync checks every minute and runs once per configured sync window when dirty records exist.

Local run:

```bash
cd admin
npm install
npm run dev
```

Open:

```text
http://localhost:5174
```

Local sync token:

```text
OmniBoard_Local_Development_Secret
```

Limitations:

- Browser `localStorage` is used instead of SQLite/Drift.
- Browser storage is used instead of OS keychain storage.
- This MVP is intended to validate workflows before the Flutter client is implemented.
