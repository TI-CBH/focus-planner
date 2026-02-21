# Focus - Personal Planner

## Overview
A mobile-first personal planner web app for tracking tasks, staying focused, and prioritizing. Features four views (Today, Next 14 Days, Backlog, Someday), smart prioritization based on impact/effort/deadlines, markdown notes, import/export, and dark mode.

## Architecture
- **Frontend**: React + Vite + TypeScript + TailwindCSS (mobile-first)
- **Backend**: PocketBase v0.25.9 (self-contained backend with SQLite, auth, and REST API)
- **Auth**: PocketBase built-in email/password auth via SDK
- **Dev Proxy**: Express.js proxies `/api` and `/_/` requests to PocketBase in Replit dev environment

## Project Structure
```
client/src/                  # Canonical frontend source (dev + Docker builds)
  App.tsx                    # Root component, auth check, theme init
  pages/
    AuthPage.tsx             # Login/register page
    PlannerPage.tsx          # Main planner page with all 4 views
  components/
    BottomNav.tsx            # Mobile bottom nav with view switching
    TaskCard.tsx             # Individual task card with complete/edit/delete
    TaskForm.tsx             # Create/edit task modal
    ImportExport.tsx         # Import/export dialog
  lib/
    pocketbase.ts            # PocketBase SDK client + TaskRecord type
    priority.ts              # Smart sort algorithm, due badges
    utils.ts                 # cn() utility

frontend/                    # Docker build config (no source code)
  Dockerfile                 # Multi-stage: copies client/src, builds with Vite, serves with 'serve'
  package.json               # Frontend-only dependencies for Docker builds
  vite.config.ts             # Path aliases (@/ -> src/)

backend/                     # PocketBase backend
  pb_migrations/             # JSVM migration scripts
    1700000000_create_tasks.js  # Tasks collection schema
  Dockerfile                 # Downloads PB binary, copies migrations

server/
  index.ts                   # Express + Vite dev server, PocketBase proxy

docker-compose.yml           # Production: PocketBase + Frontend containers
.env.example                 # Environment variable template
```

## Key Features
- **Auth**: PocketBase email/password registration and login
- **Task Model**: title, notes (editor/markdown), impact (1-5), effort (1-5), dueDate, bucket, tags, completed, completedAt
- **Views**: Today (bucket=today), Next 14 Days (dueDate <= now+14 days, including overdue), Backlog (bucket=backlog), Someday (bucket=someday)
- **Smart Sort**: Rewards high impact/low effort, boosts overdue/due-soon items
- **Import/Export**: JSON format, merge or replace modes
- **Dark Mode**: Toggle with localStorage persistence

## API (PocketBase REST)
All API calls go through PocketBase SDK. In dev, requests are proxied through Express on port 5000.

- `POST /api/collections/users/records` - Register
- `POST /api/collections/users/auth-with-password` - Login
- `POST /api/collections/users/auth-refresh` - Refresh token
- `GET /api/collections/tasks/records` - List tasks (filtered by auth)
- `POST /api/collections/tasks/records` - Create task
- `PATCH /api/collections/tasks/records/:id` - Update task
- `DELETE /api/collections/tasks/records/:id` - Delete task

## PocketBase SDK (v0.25.2)
- Client initialized in `client/src/lib/pocketbase.ts`
- SDK connects to `window.location.origin` by default (via Express proxy)
- In Docker, set `VITE_PB_URL` to the PocketBase URL
- Auth state stored in `pb.authStore` (localStorage-backed)

## Running
The workflow `Start application` runs `npm run dev`:
- Spawns PocketBase on port 8090
- Express + Vite on port 5000
- API requests proxied: `/api/**` and `/_/**` -> PocketBase :8090

## Docker Deployment
See README.md for full Docker deployment instructions with NGINX reverse proxy config.

## Recent Changes
- 2026-02-21: Fixed PocketBase migration - added `created` and `updated` autodate fields to tasks collection
- 2026-02-21: Downgraded PocketBase SDK from v0.26.8 to v0.25.2 to match server v0.25.9
- 2026-02-21: Migrated from Express+PostgreSQL to PocketBase backend architecture
