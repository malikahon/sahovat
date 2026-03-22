# Sahovat Technical Architecture

## System Overview

Sahovat is a crowdfunding platform for Uzbekistan, built as a monorepo with a clear backend/frontend separation.

```
                    ┌─────────────────┐
                    │     Nginx       │
                    │  Reverse Proxy  │
                    │  (SSL, gzip)    │
                    └────┬──────┬─────┘
                         │      │
              /api/*     │      │  /*
                         │      │
                    ┌────▼──┐ ┌─▼──────────┐
                    │Backend│ │  Frontend   │
                    │Express│ │  Next.js 15 │
                    │  v5   │ │  App Router │
                    └──┬──┬─┘ └────────────┘
                       │  │
              ┌────────▼┐ ├──────────┐
              │PostgreSQL│ │  Redis 7 │
              │   16     │ │          │
              └──────────┘ └──────────┘
```

**Tech Stack:**

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + TypeScript (ESM), Express v5 |
| Frontend | Next.js 15, React 19, Tailwind v4, shadcn/ui |
| Database | PostgreSQL 16 + pgcrypto |
| Cache/Sessions | Redis 7 (OTP, refresh tokens, fee cache) |
| Payments | PayMe Subscribe API + Merchant API |
| SMS | Eskiz.uz (mock fallback in dev) |
| PDF | pdfkit (donation receipts) |
| OCR | Tesseract.js (verification documents) |
| i18n | next-intl (Uzbek, Russian, English) |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Deployment | Docker Compose, Nginx, GitHub Actions CI/CD |

## Backend Architecture

### Module Pattern

The backend follows a domain-driven module structure. Each module is self-contained:

```
backend/src/modules/{module}/
  ├── {module}.controller.ts   # Request handling, response formatting
  ├── {module}.service.ts      # Business logic, database queries
  ├── {module}.routes.ts       # Express router with middleware
  ├── {module}.validation.ts   # Zod schemas for request validation
  └── {module}.types.ts        # Module-specific TypeScript types
```

**Modules:** auth, users, campaigns, donations, withdrawals, admin, events, feed, recurring, payme, saved-cards

### Shared Infrastructure

- **`config/`** -- Environment validation (Zod), database pool, Redis client, storage paths
- **`lib/`** -- Error classes, JWT, OTP, AES-256-GCM encryption, phone validation
- **`middleware/`** -- Auth guards, Zod validation, rate limiting, file upload (multer), global error handler
- **`services/`** -- SMS (Eskiz.uz), PayMe client, storage (dual-directory), PDF generation, cron scheduler, OCR
- **`types/`** -- Shared entity interfaces, API DTOs, service contracts, middleware types

### Middleware Chain

```
Request → helmet → cors → json parser → rate limiter → route middleware → handler
                                                          │
                                          ┌───────────────┼─────────────┐
                                          │               │             │
                                     requireAuth    validate(zod)   upload(multer)
                                          │
                                   ┌──────┼──────┐
                                   │             │
                              requireAdmin  requireVerified
```

### Error Handling

All errors extend `AppError` with a status code and error code. The global error handler (`middleware/errorHandler.ts`) catches these and returns structured JSON:

```json
{ "success": false, "error": "Campaign not found", "code": "NOT_FOUND" }
```

Error classes: `NotFoundError` (404), `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `ConflictError` (409), `RateLimitError` (429).

## Frontend Architecture

### App Router Structure

Four route groups with distinct layouts:

```
(auth)/     -- Centered card layout (login, OTP, register)
(public)/   -- Navbar + footer (landing, browse, campaign detail)
(dashboard)/ -- Sidebar layout (donor home, profile, campaigns, donations)
(admin)/    -- Admin sidebar layout (cockpit, verification, users, withdrawals)
```

### BFF (Backend-for-Frontend) Pattern

The frontend does NOT call the backend directly. Instead, 66 Next.js API route handlers in `frontend/src/app/api/` proxy requests to the backend, managing auth tokens via httpOnly cookies:

```
Browser → Next.js API Route → Express Backend
           (attaches JWT      (validates JWT,
            from cookie)       returns data)
```

This keeps tokens out of client-side JavaScript and avoids CORS complexity in production.

### State Management

- **Auth:** React Context (`AuthContext`) with auto-refresh
- **Server state:** TanStack Query (React Query) for caching and refetching
- **Forms:** react-hook-form + Zod resolvers for type-safe form validation

### Component Organization

```
components/
  ├── ui/          # 21 shadcn/ui primitives (button, card, dialog, input, etc.)
  ├── campaign/    # CampaignCard, ProgressBar, StatusBadge, StepIndicator
  ├── donation/    # DonationBottomSheet, AmountStep, ConfirmStep, SuccessStep, ImpactBadge
  ├── payment/     # SavedCardSelect, CardForm
  ├── recurring/   # RecurringCard
  ├── admin/       # StatCard
  └── shared/      # Navbar, Footer, ProtectedRoute, LanguageSwitcher, OtpDialog
```

## Database Design

16 tables across 7 migrations. See [ER Diagram](./er-diagram.md) for full schema.

### Virtual Ledger (Escrow)

No separate escrow table. Balances are computed from existing data:

```sql
campaign_balance   = SUM(net_donations) - SUM(completed_withdrawals) - SUM(pending_withdrawals)
platform_revenue   = SUM(platform_fees)
total_escrow       = SUM(all_net_donations) - SUM(all_completed_withdrawals)
```

### Encryption

Sensitive data is encrypted at rest using AES-256-GCM:
- Withdrawal account card numbers (`withdrawal_accounts.account_number_encrypted`)
- Admin master card number (`admin_settings.master_card_number_encrypted`)

Format: `iv:authTag:ciphertext` (stored as a single string).

## Payment Integration

### PayMe Subscribe API (Card Tokenization)

Used for saved cards and direct charges:

```
1. POST cards.create  → returns card object
2. POST cards.verify  → user enters OTP from SMS
3. Card token stored  → used for future charges
4. POST receipts.create + receipts.pay → charge saved card
```

### PayMe Merchant API (Checkout Redirect)

JSON-RPC 2.0 protocol at `/api/payme`:

```
PayMe calls our endpoint:
  CheckPerformTransaction → validate donation exists, amount matches
  CreateTransaction       → record PayMe transaction ID
  PerformTransaction      → mark donation as completed, update campaign balance
  CancelTransaction       → mark donation as refunded
  CheckTransaction        → return transaction state
  GetStatement            → return transactions in date range
```

Authentication: HTTP Basic with PayMe merchant credentials.

### Donation Flow

```
User selects amount → [OTP if >100k UZS] → Initiate donation
  → PayMe checkout redirect (or saved card charge)
  → PayMe webhook confirms payment
  → Donation marked complete, campaign balance updated
  → PDF receipt generated and stored
```

## Storage Architecture

Dual-directory system compliant with Uzbekistan's Data Localization Law (ZRU-547):

- **Public storage** (`/storage/public/`) -- Campaign images, avatars. Served via Express static middleware. Publicly accessible.
- **Private storage** (`/storage/private/`) -- KYC documents, passport scans. Only accessible via authenticated admin API endpoint. No direct URL access.

Paths are environment-driven (`PUBLIC_STORAGE_PATH`, `PRIVATE_STORAGE_PATH`) for easy cloud migration.

## Security

| Measure | Implementation |
|---------|---------------|
| Authentication | JWT (15-min access, 7-day refresh, Redis-backed) |
| OTP | 6-digit codes via Eskiz.uz SMS, stored in Redis with TTL |
| Rate limiting | Per-IP: 100/15min (general), 10/15min (auth), 5/15min (OTP) |
| Encryption at rest | AES-256-GCM for card numbers and sensitive data |
| Password hashing | bcrypt for admin passwords |
| Input validation | Zod schemas on every endpoint |
| Security headers | Helmet.js (HSTS, CSP, X-Frame-Options, etc.) |
| CORS | Restricted to frontend origin |
| Data localization | All data on Uzbek VPS per ZRU-547 |

## Feed Personalization

3-signal weighted scoring for authenticated users:

```
score = 0.35 * urgency_score + 0.35 * affinity_score + 0.30 * recency_score
```

- **Urgency (35%):** Campaigns close to goal with approaching end dates
- **Category affinity (35%):** Based on user's view/donation history per category (with time decay)
- **Recency (30%):** Newer campaigns scored higher

Guest users get urgency + recency only (no affinity data).

Event types tracked: `campaign_viewed`, `campaign_shared`, `donation_initiated`, `donation_completed`.

## Deployment

### Production Stack (Docker Compose)

```
docker-compose.prod.yml:
  ├── postgresql  (port 5432, internal network)
  ├── redis       (port 6379, internal network)
  ├── backend     (Express, port 3001, internal)
  ├── frontend    (Next.js standalone, port 3000, internal)
  └── nginx       (ports 80/443, SSL termination, reverse proxy)
```

### CI/CD (GitHub Actions)

1. **CI** (`ci.yml`): Lint, typecheck, backend tests (with PG+Redis services), frontend tests, Docker build check
2. **Deploy** (`deploy.yml`): On CI success, SSH to VPS, git pull, docker compose build, docker compose up

### Backups

Daily PostgreSQL backup via `scripts/backup.sh` with 7-day retention.

## API Documentation

Interactive Swagger UI available at `/api/docs` (served via swagger-ui-express from the OpenAPI 3.1 spec at `backend/src/docs/openapi.yaml`).

88 total API endpoints across 13 modules.
