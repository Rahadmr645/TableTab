# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

TableTab is a restaurant table-ordering system with three independent Node.js packages (no monorepo tooling):

| Service | Directory | Port | Start Command |
|---------|-----------|------|---------------|
| Backend API + WebSocket | `server/` | 5000 | `npm start` (or `npx nodemon server.js` for hot reload) |
| Customer SPA | `client/` | 5172 | `npm run dev` |
| Admin Dashboard SPA | `admin/` | 5173 | `npm run dev` |

Both frontends proxy `/api`, `/uploads`, and `/socket.io` to the backend via Vite dev server config.

### Prerequisites

- **Node.js 22** (installed via NodeSource)
- **MongoDB 8.0** (must be running before starting the backend)

### Starting services

1. Start MongoDB: `mongod --dbpath /data/db --fork --logpath /var/log/mongod.log`
2. Start backend: `cd server && npm start` (or `npx nodemon server.js` for dev)
3. Start frontends: `cd admin && npm run dev` and `cd client && npm run dev`

### Environment variables

The backend requires a `.env` file at `server/.env` with at minimum:
- `MONGO_URL` — MongoDB connection string (e.g., `mongodb://127.0.0.1:27017/tabletab`)
- `SECTRATE_KEY` — JWT signing secret (note: this is the project's spelling, not a typo by us)
- `STRIPE_SECRET_KEY` — required at module-load time by `controllers/paymentController.js`; use any placeholder like `sk_test_placeholder` for local dev if Stripe is not needed
- `PORT` — defaults to 5000

The client `.env` (`client/.env`) should set `VITE_API_URL=http://0.0.0.0:5000` to proxy to local backend instead of the production Railway URL.

### Gotchas

- `paymentController.js` throws at **module import time** if `STRIPE_SECRET_KEY` is missing — the server will not start without it. A placeholder value is fine if you don't need real payments.
- The admin login flow uses OTP via email by default. For local dev without email config, create an admin via `POST /api/admin/create` and use the returned JWT token directly, or log in via `POST /api/admin/login`.
- Category enum values in the Menu model use some non-standard spellings: `"Cold Dirinks"` and `"Othres"` — use these exact strings when creating menu items.
- Each package has its own `package-lock.json`; run `npm install` separately in `server/`, `admin/`, and `client/`.

### Lint / Build

- `cd admin && npm run lint` — ESLint for admin (has some pre-existing errors)
- `cd client && npm run lint` — ESLint for client (warnings only)
- `cd admin && npm run build` / `cd client && npm run build` — Vite production builds
- The `server/` directory has no lint or test scripts configured.
