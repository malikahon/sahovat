# Sahovat Deployment Guide

## Prerequisites

- **Node.js** 20+ (LTS)
- **Docker** and **Docker Compose** v2+
- **Git**
- A VPS with at least 2GB RAM and 20GB disk (for production)

---

## Development Setup

### 1. Clone and Install

```bash
git clone <repository-url> sahovat
cd sahovat
npm install            # root dependencies (concurrently, playwright)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your local values. Key variables:

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://sahovat:sahovat_dev@localhost:5433/sahovat` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | `your-random-secret-min-32-chars` | JWT signing secret |
| `ENCRYPTION_KEY` | `32-byte-hex-string` | AES-256-GCM key for card encryption |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin |
| `ESKIZ_EMAIL` | (your Eskiz account) | SMS provider credentials |
| `ESKIZ_PASSWORD` | (your Eskiz password) | |
| `PAYME_MERCHANT_ID` | (from PayMe) | PayMe merchant credentials |
| `PAYME_KEY` | (from PayMe) | |

### 3. Start Infrastructure

```bash
docker compose up -d    # starts PostgreSQL (port 5433) + Redis (port 6379)
```

### 4. Database Setup

```bash
cd backend
npm run migrate          # runs all SQL migrations
npm run seed             # creates admin user + test data
```

### 5. Start Development Servers

```bash
# from the project root
npm run dev              # starts both backend (3001) and frontend (3000)
```

Or individually:

```bash
cd backend && npm run dev    # Express on http://localhost:3001
cd frontend && npm run dev   # Next.js on http://localhost:3000
```

### 6. Verify

- Frontend: http://localhost:3000
- Backend health: http://localhost:3001/api/health
- API docs: http://localhost:3001/api/docs

---

## Production Deployment

### 1. VPS Setup

Recommended: Ubuntu 22.04 LTS on an Uzbek VPS provider (Servercore.uz or similar).

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin

# Clone repository
git clone <repository-url> /opt/sahovat
cd /opt/sahovat
```

### 2. Production Environment

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with production values:

- Strong `JWT_SECRET` (generate: `openssl rand -hex 32`)
- Strong `ENCRYPTION_KEY` (generate: `openssl rand -hex 16`)
- Real Eskiz.uz production credentials
- Real PayMe production merchant ID and key
- `NODE_ENV=production`
- `FRONTEND_URL=https://yourdomain.uz`
- `BACKEND_URL=https://yourdomain.uz`

### 3. SSL Certificate

The Nginx config expects SSL certificates. Set up Let's Encrypt:

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.uz
```

Certificates will be at:
- `/etc/letsencrypt/live/yourdomain.uz/fullchain.pem`
- `/etc/letsencrypt/live/yourdomain.uz/privkey.pem`

Update `docker-compose.prod.yml` to mount the certificate directory, or update `nginx/nginx.conf` paths.

### 4. Build and Deploy

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This starts:
- **PostgreSQL** (internal, port 5432)
- **Redis** (internal, port 6379)
- **Backend** (internal, port 3001)
- **Frontend** (internal, port 3000)
- **Nginx** (exposed, ports 80 and 443)

### 5. Database Migration

```bash
docker compose -f docker-compose.prod.yml exec backend npm run migrate
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

### 6. Verify

```bash
curl https://yourdomain.uz/api/health
```

Expected response:
```json
{ "status": "ok", "timestamp": "...", "checks": { "database": "ok", "redis": "ok" } }
```

---

## Nginx Configuration

The Nginx reverse proxy (`nginx/nginx.conf`) handles:

- SSL termination
- Routing: `/api/*` to backend, `/*` to frontend
- gzip compression
- Rate limiting (10 req/s per IP)
- Security headers (HSTS, X-Frame-Options, etc.)
- Static file caching

---

## Backups

### Automated Backups

A backup script is provided at `scripts/backup.sh`:

```bash
# Set up daily cron job
crontab -e
# Add: 0 3 * * * /opt/sahovat/scripts/backup.sh
```

This creates daily PostgreSQL dumps with 7-day retention.

### Manual Backup

```bash
docker compose -f docker-compose.prod.yml exec postgresql \
  pg_dump -U sahovat sahovat > backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
docker compose -f docker-compose.prod.yml exec -T postgresql \
  psql -U sahovat sahovat < backup_20260101.sql
```

---

## Monitoring

### Health Check

The `/api/health` endpoint checks database and Redis connectivity. Use an uptime monitoring service (e.g., UptimeRobot) to poll this endpoint.

### Process Management

The Docker containers auto-restart on failure (`restart: unless-stopped` in docker-compose.prod.yml).

### Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

---

## CI/CD

GitHub Actions workflows are configured:

- **`.github/workflows/ci.yml`** -- runs on every push: lint, typecheck, tests (backend + frontend), Docker build check
- **`.github/workflows/deploy.yml`** -- on CI success: SSH to VPS, git pull, rebuild containers

---

## Troubleshooting

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yml ps postgresql

# Check logs
docker compose -f docker-compose.prod.yml logs postgresql
```

### Redis Connection Errors

```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Expected: PONG
```

### Nginx 502 Bad Gateway

Backend container might not be ready:

```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml restart backend
```

### SSL Certificate Renewal

```bash
sudo certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

### Viewing Environment Variables

```bash
docker compose -f docker-compose.prod.yml exec backend env | grep -E "^(NODE_ENV|DATABASE|REDIS)"
```
