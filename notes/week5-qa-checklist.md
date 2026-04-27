# Week 5 — Section 5.0 QA Checklist

Methodology: code-level audit + cross-reference with existing unit/integration tests. Manual real-device validation (Telegram message arrival on `@malikahon_v`, email delivery to `EMAIL_DEMO_DONOR`, etc.) deferred to **Phase 5 pre-push smoke** because it requires presenter present with phone in hand.

Severity legend: **B**locker · **M**ajor · **m**inor

## Week 1 — Telegram Login + OTP channel + email collection

| ID | Verification | Status | Severity | Notes |
|---|---|---|---|---|
| 5.0.1 | Telegram Login Widget renders + HMAC verify | PASS (code) | — | `TelegramLoginButton.tsx` loads `telegram-widget.js?22` with `data-request-access=write`. `telegram-auth.service.ts` HMAC verified by 9 unit cases. Real-device check in Phase 5. |
| 5.0.2 | OTP toggle persists in localStorage | PASS (code) | — | `OtpChannelToggle.tsx` reads/writes `localStorage['preferred_otp_channel']` with helper `getStoredOtpChannel()`. |
| 5.0.3 | Telegram link/unlink on profile | PASS (code) | — | Routes `/api/auth/telegram-link` (auth required) + `/api/auth/telegram-unlink` (with orphan-guard) wired in `auth.routes.ts:99-112`. UI in `LinkedAccountsSection.tsx`. |
| 5.0.4 | Dev OTP fully removed | PASS | — | `rg -i 'devOtp\|dev_otp\|OTP_DEV'` returns zero hits in both backend/src and frontend/src. |
| 5.0.5 | Email collection on registration | PASS (code) | — | `register/page.tsx` schema lines 42-46, optional, sent only if non-empty. Backend stores normalized lowercase. |
| 5.0.6 | Profile email row | PASS (code) | — | `EmailRow.tsx` (349 lines) with verify-request + verify-confirm wiring. |

## Week 2 — Click payment provider

| ID | Verification | Status | Severity | Notes |
|---|---|---|---|---|
| 5.0.7 | Provider selector | PASS (code+test) | — | `ProviderSelector.tsx` 71 lines. `click-flow.test.ts` test #1 confirms checkout_url contains `/mock-click/`. |
| 5.0.8 | Mock Click checkout fidelity | **FAIL** | **M** | `frontend/src/app/(public)/mock-click/[donation_id]/page.tsx` uses generic theme tokens (`bg-card`, `text-foreground`). Spec demands Click red branding. **Hotfix → 5.0.8.fix.** |
| 5.0.9 | MD5 idempotency | PASS | — | `click-sign.test.ts` 6 cases. `click-flow.test.ts` test #3 exercises duplicate webhook → `platform_fees` count == 1. |
| 5.0.10 | donation-return both providers | PASS (code) | — | `donation-return/page.tsx` lines 26-32 unify both query-string formats. (Hardcoded English strings flagged to Phase 4 i18n sweep.) |

## Week 3 — Telegram + Email notifications + preferences

| ID | Verification | Status | Severity | Notes |
|---|---|---|---|---|
| 5.0.11 | Dispatcher fan-out | PASS (code+test) | — | `dispatcher.ts` lines 105-184: per-channel filter, sync attempt, retry-enqueue on failure. `dispatcher.test.ts` 271 lines covers fan-out + skip rules. |
| 5.0.12 | Real Telegram delivery | DEFERRED | — | Code-clean. Real-device test in Phase 5 with `TELEGRAM_PROVIDER=real`. |
| 5.0.13 | Email rendering quality | DEFERRED | — | All 7 templates exist in `backend/src/emails/` (+ bonus `RecurringChargeSucceededEmail`). `templates.test.ts` snapshot tests cover rendering. Visual inspection in Gmail/Apple Mail in Phase 5. |
| 5.0.14 | Email verification flow | PASS (code+test) | — | Routes `/api/users/me/email/verify-request` + `/me/email/verify-confirm` (spec deviation: spec phrasing said `/api/users/email/...`, implementation has `/me/`; functional, not breaking — frontend wired correctly). `email-verify.test.ts` 233 lines. |
| 5.0.15 | Notifications matrix UI | PASS (code) | m (deviation) | `NotificationPreferencesSection.tsx` rendered as stacked Card not Tabs — explicit decision to leave as-is. Matrix 7 events × 3 channels with email-disabled-when-unverified tooltip. |
| 5.0.16 | Admin Telegram alerts | PASS (code) | — | `admin-feed.ts` covers campaignPending + withdrawalSubmitted + contactMessage. Gated by `TELEGRAM_ADMIN_CHAT_ID` (no-op when unset). Real-device test in Phase 5. |
| 5.0.17 | Migrations clean | DEFERRED | — | 13 migrations 001→013 present. Live migration test in Phase 5 against fresh DB. |

## Cross-cutting

| ID | Verification | Status | Notes |
|---|---|---|---|
| 5.0.18 | Test suite green | PASS | Backend: 30 files / 260 tests. Frontend: 4 files / 27 tests. |
| 5.0.19 | TypeScript clean | PASS | Both workspaces: `tsc --noEmit` zero errors. |
| 5.0.20 | Pre-push prod smoke | DEFERRED | Run in Phase 5 immediately before any prod push. |

## Hotfixes

### 5.0.8.fix — Mock Click checkout: apply Click red branding

**Severity:** M
**File:** `frontend/src/app/(public)/mock-click/[donation_id]/page.tsx`
**Plan:**
- Header strip with Click signature red (`#0070f3` is Stripe; Click brand is closer to red — use `#1e2c4f` navy + `#ee0033` red per click.uz). Use `#ee2c40` red as accent.
- Replace generic muted card with white background, red header bar, red "Approve" button.
- Add Click logo wordmark (text-only, "Click" in red sans).
- Keep i18n-free strings ("Click Checkout", "Approve", "Decline") since this is a mock checkout simulating an external page; the real Click site is also locale-fixed.

### Other deviations noted (not fixed — minor, decision is to leave)
- `telegram.service.ts` filename (spec said `telegram-bot.service.ts`) — leave.
- `/api/users/me/email/*` route prefix (spec said `/api/users/email/*`) — leave; frontend already wired correctly.
- `NotificationPreferencesSection` renders as stacked Card not Tabs — explicit decision per Week 5 plan question.

### Hardcoded English strings (Phase 4 i18n sweep, not Section 5.0)
- `donation-return/page.tsx` ("Verifying payment...", "Payment Cancelled", etc.) — flag for Phase 4.
- `mock-click/[donation_id]/page.tsx` ("Click Checkout", etc.) — intentional, leave.

## Outcome

**Phase 1 verdict:** Weeks 1–3 pass code-level audit with one major hotfix (5.0.8.fix). All test suites green. All TypeScript clean. Real-device validation queued for Phase 5.

---

# Phase 5 — Pre-deploy smoke + sign-off (build complete, manual smoke pending)

## What was built across Week 5 (Phases 0–5)

| Phase | Scope | Status |
|---|---|---|
| 0 | Baseline established: backend 30/260, frontend 4/27, tsc clean both sides | ✅ |
| 1 | Section 5.0 audit complete; one hotfix (5.0.8.fix) applied to mock Click checkout for Click red branding | ✅ |
| 2 | `backend/src/database/seeds/demo.seed.ts` created; `db:seed:demo` npm script wired; demo personas pull real Telegram + email IDs from `.env.demo`; curated notification prefs per roadmap §11 | ✅ |
| 3 | Demo Notifications Console: `notifications:demo-stream` Redis pub/sub channel; mock SMS/Telegram/Email services publish redacted previews; SSE endpoint at `GET /api/dev/notifications-stream` (admin-gated, env-flag-gated); Next.js SSE proxy route forwards Bearer cookie; floating React panel with × dismiss + localStorage persistence; new env var `DEMO_CONSOLE_ENABLED` (backend) and `NEXT_PUBLIC_DEMO_CONSOLE` (frontend); 11 backend unit tests + 5 frontend component tests | ✅ |
| 4 | i18n sweep: `donationReturn` namespace added (en/uz/ru); `errorPages` namespace added (en/uz/ru); two hardcoded "Cancel" buttons in `LinkedAccountsSection` and `EmailRow` routed through `common.cancel`; sr-only "Email channel info" routed through new key. Friendly `app/not-found.tsx` and `app/error.tsx` pages added with full i18n. Recurring donation demo trigger endpoint `POST /api/dev/trigger-recurring-cron` wired. `processRecurringDonations` exported from scheduler.service.ts. | ✅ |
| 5 | Final test + tsc green confirmed. Sign-off documented. | ✅ |

## Final test + tsc green

| Workspace | Tests | TSC |
|---|---|---|
| backend | 31 files / 271 tests | ✅ zero errors |
| frontend | 5 files / 32 tests | ✅ zero errors |

## Manual smoke checklist (5.0.20) — to be run before any push to prod

These items require the backend + frontend running locally and access to the presenter's phone (`@malikahon_v` / `+998947981800`) and email (`malikahon2005@gmail.com`):

1. SMS login works (codes from backend log).
2. Telegram login works against real `@malikahon_v` (TELEGRAM_PROVIDER=real with bot token set).
3. PayMe mock donation completes end-to-end → `donation-return` shows success.
4. Click mock donation completes end-to-end via `/mock-click/[id]` → branded checkout → success.
5. Profile loads, Linked Accounts shows phone + Telegram + verified email with green check.
6. Withdrawal request submission works.
7. Admin verifies a pending campaign → Telegram alert + email both fire to admin (set TELEGRAM_ADMIN_CHAT_ID).
8. Donate as donor persona → real Telegram receipt + real email receipt land on phone + Gmail.
9. With `NEXT_PUBLIC_DEMO_CONSOLE=true` and `DEMO_CONSOLE_ENABLED=true`: Demo Notifications Console floats bottom-right and shows mock-user notifications as they happen.
10. Click `×` on console → stays gone after page refresh.
11. `npm run db:seed:demo` produces clean seed with 10 campaigns, donor + organizer with real identifiers.
12. `POST /api/dev/trigger-recurring-cron` (as admin) fires recurring scheduler synchronously.

## Sign-off

Week 5 is **build-complete**. No code-level findings remain. Tests + tsc green on both workspaces. Demo personas, console, and trigger endpoint are wired and ready for the manual smoke checklist before deploy.

The only spec deviations left intentionally unfixed (per Phase 1 decision):
- `telegram.service.ts` filename (spec said `telegram-bot.service.ts`)
- `/api/users/me/email/*` route prefix (spec said `/api/users/email/*`)
- `NotificationPreferencesSection` rendered as Card not Tabs

All three are functionally complete and frontend is wired correctly; no demo impact.
