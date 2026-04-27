# Week 5 — Phase 0 Baseline (2026-04-27)

Captured at the start of Week 5 execution as the known-good signal.

## Test + tsc baseline

| Workspace | Command | Result |
|---|---|---|
| backend | `npm run lint` (`tsc --noEmit`) | PASS, zero TS errors |
| backend | `npm test` (vitest run) | PASS, 30 files / 260 tests green, ~13s |
| frontend | `npm run lint` (`tsc --noEmit`) | PASS, zero TS errors |
| frontend | `npm test` (vitest run) | PASS, 4 files / 27 tests green, ~1.2s |

## Workspace state

- Repo root: `/Users/mal/Desktop/sahovat`
- Env files (root, not workspace-local): `.env`, `.env.local`, `.env.demo`, `.env.example`, `.env.production.example`
- Migrations 001 → 013 present (`backend/src/database/migrations/`)
- backend boots (per leftover `backend.log` from Apr 27 02:37 + `dist/` artifacts)
- frontend boots (per leftover `frontend.log` Apr 26 + `.next/` cache)

## Test suites observed

Unit:
- middleware/validate, lib/{errors,phone,encryption}, donations/{anonymous-masking,fee-calculation}
- services/{telegram-auth, click-sign, telegram, email, pdf}
- services/notifications/{dispatcher, queue, milestones}
- modules/{contact, public}
- emails/templates

Integration:
- {auth, admin, campaigns, donations, events, feed, withdrawals, payme-flow, click-flow, email-verify, notification-prefs}

Frontend component tests: 4 files, 27 tests.

## Decision log

- **No baseline hotfixes required.** Clean starting point.
- Proceeding directly to Phase 1 (Section 5.0 verification pass).
- Test suite already exercises the most critical Week 1/2/3 boundaries (HMAC verify, MD5 sign, dispatcher fan-out, email templates, idempotency). Manual smoke testing in Phase 1 will focus on real-device validation (Telegram + email landing on `@malikahon_v` / `@malacled` / `EMAIL_DEMO_*`).
