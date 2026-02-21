# Focus - Personal Planner

A mobile-first personal planner web app for tracking tasks, staying focused, and prioritizing.

## Features

- **Four Views**: Today, Next 14 Days (includes overdue), Backlog, Someday
- **Smart Prioritization**: Automatic sorting based on impact, effort, and deadlines (overdue tasks float to top)
- **Task Management**: Create, edit, delete, and complete tasks
- **Markdown Notes**: Rich text notes for each task
- **Import/Export**: JSON-based backup and restore with merge or replace modes
- **Dark Mode**: Toggle between light and dark themes
- **Per-User Data**: Each user sees only their own tasks

## Tech Stack

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: PocketBase v0.25.9 (SQLite-based, self-contained)
- **Deployment**: Docker Compose

## Project Structure

```
client/src/                # Canonical frontend source (used by both dev and Docker builds)
  App.tsx                  # Root component, auth check, theme init
  pages/
    AuthPage.tsx           # Login/register page
    PlannerPage.tsx        # Main planner page with all 4 views
  components/
    BottomNav.tsx          # Mobile bottom nav with view switching
    TaskCard.tsx           # Individual task card with complete/edit/delete
    TaskForm.tsx           # Create/edit task modal
    ImportExport.tsx       # Import/export dialog with merge/replace modes
  lib/
    pocketbase.ts          # PocketBase SDK client + TaskRecord type
    priority.ts            # Smart sort algorithm, due badges
    utils.ts               # cn() utility

frontend/                  # Docker build config (no source code here)
  Dockerfile               # Multi-stage: build with Vite, serve with 'serve'
  package.json             # Frontend-only dependencies for Docker builds
  index.html               # HTML entry point
  vite.config.ts           # Vite config with path aliases
  tailwind.config.ts       # TailwindCSS config
  tsconfig.json            # TypeScript config

backend/                   # PocketBase backend
  pb_migrations/           # JSVM migration scripts
    1700000000_create_tasks.js  # Tasks collection schema
  Dockerfile               # Downloads PocketBase binary, copies migrations

server/                    # Express proxy for Replit dev environment
  index.ts                 # Express + Vite dev server, PocketBase proxy

docker-compose.yml         # Production: PocketBase + Frontend containers
.env.example               # Environment variable template
```

## Development (Replit)

The app runs in Replit with Express proxying API requests to PocketBase:

```
npm run dev
```

This starts:
- PocketBase on port 8090
- Express + Vite on port 5000 (proxies `/api` to PocketBase)

## Production Deployment (Docker)

### Prerequisites

- Docker and Docker Compose installed
- A domain with DNS pointing to your server
- NGINX installed on the host (or any reverse proxy)

### 1. Clone and Configure

```bash
git clone <your-repo-url> focus-planner
cd focus-planner
cp .env.example .env
```

Edit `.env`:

```env
# The URL where the browser will reach PocketBase
# Must match your NGINX config
VITE_PB_URL=https://focus-api.yourdomain.com

# Host port mappings
FRONTEND_PORT=8080
PB_PORT=8090
```

### 2. Build and Start

```bash
docker compose up -d --build
```

This starts:
- **PocketBase** on `localhost:8090` (with health check)
- **Frontend** on `localhost:8080` (static files via `serve`)

The frontend Docker build uses `client/src/` as its source. There is only one copy of the frontend source code.

### 3. Create First Admin Account

After first deployment, create the PocketBase superuser via CLI (do NOT expose the admin UI publicly):

```bash
docker compose exec pocketbase /pb/pocketbase superuser upsert admin@yourdomain.com YOUR_STRONG_PASSWORD
```

Use a strong, unique password (20+ characters recommended).

### 4. NGINX Reverse Proxy Configuration

Create two server blocks - one for the frontend, one for the PocketBase API.

**Important**: The PocketBase admin dashboard (`/_/`) should NOT be publicly accessible. The NGINX config below blocks it. Access the admin UI only via SSH tunnel or VPN.

```nginx
# Frontend
server {
    listen 443 ssl http2;
    server_name focus.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/focus.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/focus.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# PocketBase API
server {
    listen 443 ssl http2;
    server_name focus-api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/focus-api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/focus-api.yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    # SECURITY: Block public access to PocketBase admin dashboard
    # Access admin only via SSH tunnel: ssh -L 8090:localhost:8090 user@server
    # Then open http://localhost:8090/_/ in your browser
    location /_/ {
        deny all;
        return 403;
    }

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE support (for realtime)
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }
}

# HTTP -> HTTPS redirects
server {
    listen 80;
    server_name focus.yourdomain.com focus-api.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

After adding the config:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL with Let's Encrypt

```bash
sudo certbot --nginx -d focus.yourdomain.com -d focus-api.yourdomain.com
```

## Security Best Practices

- **HTTPS required**: Always use TLS in production. The NGINX config above enforces HTTPS via redirect.
- **Block admin UI**: The `/_/` admin dashboard is blocked in NGINX. Access it only via SSH tunnel (`ssh -L 8090:localhost:8090 user@server`) when needed.
- **Strong admin password**: Use a unique 20+ character password for the PocketBase superuser.
- **Bind to localhost**: PocketBase port (8090) should only be bound to `127.0.0.1` on the host, not `0.0.0.0`. Update docker-compose.yml port to `"127.0.0.1:8090:8090"` if exposing directly.
- **Keep PocketBase updated**: Monitor releases at github.com/pocketbase/pocketbase for security patches.
- **Regular backups**: Set up automated backups (see below).

## Backup and Restore

### Backup PocketBase Data

PocketBase stores everything in SQLite. The data is in a Docker volume:

```bash
# Create a backup
docker compose exec pocketbase /pb/pocketbase backup create

# Copy backup from container
docker cp focus-pocketbase:/pb/pb_data/backups/ ./backups/
```

### Restore from Backup

```bash
# Stop services
docker compose down

# Copy backup into volume
docker cp ./backups/pb_backup_TIMESTAMP.zip focus-pocketbase:/pb/pb_data/backups/

# Start and restore via SSH tunnel to admin UI
docker compose up -d
# SSH tunnel: ssh -L 8090:localhost:8090 user@server
# Then visit http://localhost:8090/_/#/settings/backups to restore
```

### Manual SQLite Backup

```bash
# Direct volume backup
docker run --rm -v focus-planner_pb_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/pb_data_backup_$(date +%Y%m%d).tar.gz -C /data .
```

## Upgrading PocketBase

1. Update the version in `backend/Dockerfile`:
   ```dockerfile
   ARG PB_VERSION=0.25.9  # Change to new version
   ```

2. Rebuild and restart:
   ```bash
   docker compose up -d --build pocketbase
   ```

3. PocketBase handles its own database migrations automatically on startup.

## Upgrading the Frontend

1. Make changes in `client/src/` (the single source of truth for all frontend code)
2. Rebuild:
   ```bash
   docker compose up -d --build frontend
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_PB_URL` | PocketBase URL as seen by the browser | `http://localhost:8090` |
| `FRONTEND_PORT` | Host port for frontend | `8080` |
| `PB_PORT` | Host port for PocketBase | `8090` |

## Task Model

| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Task title (required, max 500 chars) |
| `notes` | editor | Markdown notes |
| `impact` | number | Impact score 1-5 |
| `effort` | number | Effort score 1-5 |
| `dueDate` | date | Optional due date |
| `bucket` | select | today, backlog, or someday |
| `tags` | json | Array of tag strings |
| `completed` | bool | Completion status |
| `completedAt` | date | When completed |
| `user` | relation | Owner (users collection) |
