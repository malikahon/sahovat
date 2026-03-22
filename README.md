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

## License

MIT
