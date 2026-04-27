# Sahovat

Crowdfunding platform for Uzbekistan. Built as a university project with real startup ambitions.

Sahovat enables verified fundraising campaigns with transparent fund tracking, PayMe payments, PDF receipts, admin oversight, and personalized discovery -- all in Uzbek, Russian, and English.

## Features

- **Phone/OTP authentication** via Eskiz.uz SMS
- **Campaign creation** with 5-step wizard and document uploads
- **PayMe integration** -- card tokenization (Subscribe API) + checkout redirect (Merchant API)
- **Anonymous donations** with optional comments
- **PDF donation receipts** generated automatically
- **Admin panel** -- campaign verification, user management, withdrawal processing, audit log
- **Virtual ledger** -- real-time escrow tracking across all campaigns
- **Recurring donations** -- weekly/monthly auto-charges with failure handling
- **Personalized feed** -- 3-signal recommendation scoring (urgency, affinity, recency)
- **Trilingual** -- Uzbek, Russian, English (~800 keys per language)
- **Identity verification** -- document upload with OCR/AI-assisted review

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express v5, TypeScript (ESM) |
| Frontend | Next.js 15, React 19, Tailwind v4, shadcn/ui |
| Database | PostgreSQL 16 + pgcrypto |
| Cache | Redis 7 |
| Payments | PayMe Subscribe + Merchant API |
| SMS | Eskiz.uz |
| PDF | pdfkit |
| i18n | next-intl |
| Testing | Vitest, Playwright |
| Deployment | Docker Compose, Nginx, GitHub Actions |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### Setup

```bash
# clone
git clone <repository-url> sahovat
cd sahovat

# install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# environment
cp .env.example .env
# edit .env with your values 

# start PostgreSQL + Redis
docker compose up -d

# run migrations and seed
cd backend
npm run migrate
npm run seed
cd ..

# start development servers
npm run dev
```

the frontend runs at http://localhost:3000 and the backend at http://localhost:3001.

### Environment Variables

key variables (see `.env.example` for the full list):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `ENCRYPTION_KEY` | AES-256-GCM key (32 bytes hex) |
| `FRONTEND_URL` | Frontend origin (for CORS) |
| `ESKIZ_EMAIL` / `ESKIZ_PASSWORD` | Eskiz.uz SMS credentials |
| `PAYME_MERCHANT_ID` / `PAYME_KEY` | PayMe merchant credentials |
| `NODE_ENV` | `development` or `production` |

## Project Structure

```
sahovat/
├── backend/                 # Express v5 API (TypeScript, ESM)
│   ├── src/
│   │   ├── config/          # env, database, redis, storage
│   │   ├── modules/         # auth, users, campaigns, donations,
│   │   │                    # withdrawals, admin, events, feed,
│   │   │                    # recurring, payme, saved-cards
│   │   ├── services/        # sms, payment, storage, pdf, scheduler, ocr
│   │   ├── middleware/      # auth, validate, rateLimiter, upload, errorHandler
│   │   ├── lib/             # errors, jwt, otp, encryption, phone
│   │   ├── database/        # migrations, seeds
│   │   ├── docs/            # OpenAPI spec, swagger setup
│   │   └── types/           # entities, api, services, middleware
│   ├── storage/             # public/ + private/ file storage
│   └── tests/               # unit + integration tests
├── frontend/                # Next.js 15 (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/      # login, verify, register
│   │   │   ├── (public)/    # landing, browse, campaign detail
│   │   │   ├── (dashboard)/ # donor home, profile, campaigns, donations
│   │   │   ├── (admin)/     # admin panel
│   │   │   └── api/         # BFF proxy routes (66 handlers)
│   │   ├── components/      # ui, campaign, donation, admin, shared
│   │   ├── hooks/           # useAuth, useEvents
│   │   ├── contexts/        # AuthContext
│   │   ├── lib/             # api client, types, formatters
│   │   └── i18n/            # uz.json, ru.json, en.json
│   └── tests/               # component tests
├── e2e/                     # Playwright E2E tests
├── docs/                    # architecture, manuals, deployment guide
├── docker-compose.yml       # dev: PostgreSQL + Redis
├── docker-compose.prod.yml  # prod: full stack with Nginx
└── nginx/                   # reverse proxy config
```

## Available Scripts

### Root

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend |
| `npm run test:e2e` | Run Playwright E2E tests |

### Backend (`cd backend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload (tsx) |
| `npm run build` | TypeScript build |
| `npm run start` | Start production build |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed test data |
| `npm run test` | Run Vitest tests |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check |

### Frontend (`cd frontend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run Vitest tests |
| `npm run lint` | ESLint + Next.js lint |
| `npm run typecheck` | TypeScript type check |

## API Documentation

Interactive Swagger UI is available at `/api/docs` when the backend is running.

The OpenAPI 3.1 spec is at `backend/src/docs/openapi.yaml`.

**88 endpoints** across 13 modules: Auth, Users, Campaigns, Donations, Withdrawals, Withdrawal Accounts, Events, Feed, Recurring Donations, Saved Cards, PayMe, Admin, Health.

## Documentation

| Document | Path |
|----------|------|
| Technical Architecture | [docs/architecture.md](docs/architecture.md) |
| Database ER Diagram | [docs/er-diagram.md](docs/er-diagram.md) |
| User Manual | [docs/user-manual.md](docs/user-manual.md) |
| Admin Manual | [docs/admin-manual.md](docs/admin-manual.md) |
| Deployment Guide | [docs/deployment.md](docs/deployment.md) |
| Presentation Outline | [docs/presentation-outline.md](docs/presentation-outline.md) |
| Demo Script | [docs/demo-script.md](docs/demo-script.md) |
| Implementation Roadmap | [roadmap.md](roadmap.md) |
| Functional Requirements | [functional-requirements.md](functional-requirements.md) |

## Testing

```bash
# backend unit + integration tests
cd backend && npm test

# frontend component tests
cd frontend && npm test

# E2E tests (requires running dev servers)
npm run test:e2e
```

## Deployment

see [docs/deployment.md](docs/deployment.md) for full deployment instructions.

quick production deploy:

```bash
cp .env.production.example .env.production
# edit .env.production with production values
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npm run migrate
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

## Deploying & Rolling Back (production pipeline)

The production deploy pipeline is **manual-dispatch only** (no auto-deploy on push to main). Every deploy takes a database snapshot and tags previous container images so any failure can be reverted in one command.

### How to deploy

1. Push or merge to `main` (CI runs automatically, but no deploy fires).
2. Go to **GitHub → Actions → deploy → Run workflow**.
3. Set `confirm_deploy=yes`. Optionally set `target_sha` to a specific commit (default: current `main`).
4. Watch the workflow log:
   - **Pre-deploy** records rollback target SHA, takes a `pre-deploy-*.sql.gz` snapshot, tags running images as `:previous`.
   - **Deploy** pulls the target SHA, rebuilds, brings containers up, runs migrations.
   - **Verify** polls `https://sahovat.tech/api/health` for up to 60s, expecting HTTP 200 + `status:ok`.
   - **On failure** (deploy or health) the workflow auto-runs `scripts/rollback.sh --yes`.

### How to roll back manually

If the workflow reported success but you've decided functionality is broken (e.g. login works in CI but fails in prod):

```bash
ssh sahovat@<host>
cd ~/sahovat
bash scripts/rollback.sh
# Type ROLLBACK at the prompt to confirm.
```

This:
1. Resets the working tree to the last known-good commit (`ROLLBACK_SHA` from `.last-deploy-state`).
2. Re-tags `sahovat-{backend,frontend}:previous` → `:latest` and brings containers up (no rebuild).
3. Restores the database from `pre-deploy-*.sql.gz` (the snapshot captured before the bad deploy).
4. Polls `/api/health` for 60s and reports outcome.

If both auto and manual rollback fail (rare — implies the rollback target itself was already broken), the database is still recoverable from the daily backup at `backups/sahovat_*.sql.gz`.

### How to take a manual snapshot

```bash
ssh sahovat@<host>
cd ~/sahovat
bash scripts/pre-deploy-snapshot.sh
# prints the path of the new snapshot on the last line
```

Retains the 3 most recent pre-deploy snapshots. Daily 7-day backups (`scripts/backup.sh`) are retained separately.

### Where state lives

| Path | Purpose |
|------|---------|
| `~/sahovat/.last-deploy-state.in-progress` | Written by pre-deploy step. Holds the rollback target for the IN-FLIGHT deploy. Promoted to `.last-deploy-state` by the post-deploy success step, OR consumed by auto-rollback on failure. Gitignored. |
| `~/sahovat/.last-deploy-state` | Written by the post-deploy step on a SUCCESSFUL deploy. Holds `ROLLBACK_SHA`, `SNAPSHOT_FILE`, `DEPLOY_TIMESTAMP`, `DEPLOY_TARGET_SHA`. Read by `scripts/rollback.sh` for manual rollback after a green-but-broken deploy. Gitignored. |
| `~/sahovat/backups/pre-deploy-*.sql.gz` | Last 3 pre-deploy DB snapshots. |
| `~/sahovat/backups/sahovat_*.sql.gz` | Last 7 daily cron snapshots. |
| `sahovat-{backend,frontend}:previous` | Image tags pointing at the version that was running before the most recent deploy. |
| `sahovat-{backend,frontend}:rollback-YYYYMMDD-HHMM` | Last 3 dated rollback points. |

### Trip-wires that trigger rollback

The auto-rollback fires on:
- Backend container fails to become healthy in 90s (zod env validation crash, migration failure).
- Public health check (`https://sahovat.tech/api/health`) doesn't return HTTP 200 + JSON `status:ok` within 60s (6 attempts × 10s).

The following are NOT auto-rollback trip-wires (require manual rollback):
- Login functionality regression where `/api/health` still returns 200.
- Donation flow breakage.
- Telegram or email delivery failure.
- Frontend 500 on a specific route.

## License

MIT
