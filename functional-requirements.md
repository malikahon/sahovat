1. Set up monorepo with Express v5 backend and Next.js 16 frontend, Docker Compose for PostgreSQL+Redis
2. Create full database schema with migrations: users, campaigns, campaign_documents, donations, donation_receipts, withdrawal_accounts, withdrawals, platform_fees, admin_actions, admin_settings, user_events, user_category_scores, recurring_donations, payme_transactions, saved_cards
3. Create seed script with realistic Uzbek test data (admin, organizers, donors, campaigns, donations, withdrawals)
4. Implement shared libraries: error classes, Uzbek phone validation, AES-256-GCM encryption, OTP generation/verification with Redis, JWT access/refresh token management
5. Implement dual-directory file storage service (public for images, private for KYC docs) with env-driven paths
6. Define shared type system: domain enums, entity interfaces, API DTOs, service interfaces, middleware types

## Authentication

7. Implement phone/OTP login: user enters +998 phone, receives 6-digit SMS OTP via Eskiz.uz (mock in dev), verifies OTP, gets JWT tokens; auto-create user on first login
8. Implement new user registration: after first OTP verify, collect display_name, date_of_birth, gender, preferred_categories, language
9. Implement JWT session management: 15-min access tokens, 7-day refresh tokens stored in Redis, token rotation on refresh, revocation on logout
10. Implement admin password login: phone + bcrypt password for admin users
11. Implement auth middleware: requireAuth, requireAdmin, requireVerified, optionalAuth; block banned users
12. Implement rate limiting: general (100/15min), auth (10/15min), OTP (5/15min)
13. Implement dev-only mock login endpoint that bypasses SMS

## Frontend Auth

14. Build login page with +998 phone input
15. Build OTP verification page with 6-digit code input and resend cooldown
16. Build registration page for new users (name, gender, language, category preferences)
17. Build auth context with auto-refresh, token management via httpOnly cookies (BFF pattern)
18. Build ProtectedRoute component enforcing auth/admin/verified guards

## User Profile & Verification

19. Implement user profile CRUD: view and update display_name, DOB, gender, preferred_categories, language, bio
20. Implement OneID identity verification flow (mock): initiate OAuth redirect, handle callback, update verification status
21. Implement KYC document upload: passport/ID images stored in private storage, admin-only access
22. Build profile page with editable fields, OneID verification section with status badges

## Campaign Management (Backend)

23. Implement campaign CRUD: create (draft status, requires verified user + withdrawal account), read, update, delete with ownership checks
24. Implement campaign submission flow: draft -> pending_review, with full status machine (active, paused, completed, cancelled, frozen)
25. Implement cover image upload: single JPEG/PNG/WebP (max 5MB), stored in public storage, replaces previous
26. Implement campaign document management: upload with type classification (medical, ID, financial, etc.), max 15 files, private storage for sensitive types, download endpoint
27. Implement campaign listing: filters (status, category, region, text search), pagination, sorting (newest, most funded, ending soon), returns stats (donor count, progress %, days remaining)

## Campaign Management (Frontend)

28. Build 5-step campaign creation wizard: basic info -> story -> cover image -> documents -> review & submit
29. Build campaign browse page: grid view, category/region filters, search, sort, pagination
30. Build campaign detail page: cover image, description, documents, progress bar, creator info, share buttons, donation trigger
31. Build "My Campaigns" page: list user's campaigns with status badges, edit/delete/view actions

## Donation System (Backend)

32. Implement PayMe payment integration: Subscribe API client for card tokenization and charges, mock service for dev, factory pattern
33. Implement PayMe Merchant API webhook handler: JSON-RPC 2.0 protocol (CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction, CheckTransaction, GetStatement), Basic auth, 12-min timeout
34. Implement donation flow: initiate (validate campaign, calculate fee, create pending record) -> PayMe checkout redirect or saved card charge -> webhook confirms -> update donation + campaign balance in transaction
35. Implement platform fee: auto-calculate percentage from admin_settings (cached), record in platform_fees table
36. Implement high-value donation OTP: require SMS verification for donations above configurable threshold
37. Implement donation receipt PDF: generate with pdfkit (campaign details, donor info, UZS formatting), store and serve for download
38. Implement donation listing: donor history with campaign info, per-campaign donation feed respecting anonymity
39. Implement anonymous donations: is_anonymous flag masks donor identity from all API responses

## Donation System (Frontend)

40. Build donation bottom sheet: amount step (preset chips 10K/50K/100K/500K/1M, custom, anonymous toggle, note) -> card select -> OTP (if high-value) -> confirm with fee breakdown -> success with receipt download
41. Build "My Donations" page: history with campaign thumbnails, status badges, receipt download
42. Build PayMe payment return page: handle redirect back from PayMe, verify donation status

## Saved Payment Cards

43. Implement saved card tokenization via PayMe Subscribe API: add card, verify via OTP, store token (no raw numbers), auto-detect card type (UzCard/Humo)
44. Implement saved card management: list verified cards, remove (PayMe + DB), set default (one per user)
45. Build payment methods page: card list, add card form, OTP verification step, set default, remove

## Virtual Ledger & Escrow

46. Implement campaign balance calculation: available = sum(net_donations) - sum(completed_withdrawals) - sum(pending_withdrawals)
47. Implement platform escrow totals: total escrow across all campaigns, total platform revenue from fees

## Withdrawal System

48. Implement withdrawal account CRUD: PayMe/Uzcard/Humo accounts with AES-256-GCM encrypted card numbers, masked display, auto-primary, prevent deletion with pending withdrawals
49. Implement withdrawal request: validate campaign ownership + sufficient balance + active account, record cardholder name for admin comparison, deduct platform fee
50. Implement organizer dashboard: per-campaign stats, available balance, withdrawal history
51. Build withdrawal accounts page, withdrawal request form (select campaign, amount, account, fee preview), withdrawal history table

## Admin Panel (Backend)

52. Implement admin dashboard stats: total users, campaigns, donations, platform fees, escrow balance, pending items; donations-over-time and by-category aggregations
53. Implement campaign verification queue: list pending, approve/reject/request_info with reasons, status transitions with state machine validation
54. Implement user management: list with filters (search, verification, admin, banned), toggle admin role, toggle ban
55. Implement withdrawal review queue: list pending, show organizer name vs cardholder name for comparison, approve/reject with notes, mark completed with transaction reference
56. Implement escrow dashboard endpoint: total escrow, revenue, per-campaign balances
57. Implement platform settings: configurable fee percentage and OTP threshold, in-memory cache with invalidation
58. Implement audit log: log all admin actions with JSONB details, filterable list endpoint

## Admin Panel (Frontend)

59. Build admin cockpit: stat cards, donations-over-time line chart, by-category bar chart, recent audit actions
60. Build campaign verification page: campaign info, creator info, document viewer, approve/reject/request-info/freeze actions
61. Build user management page: searchable table, filter by status, toggle admin/ban with confirmation
62. Build withdrawal review page: name match comparison (organizer vs cardholder), approve/reject/complete with transaction reference input
63. Build escrow dashboard: summary cards, per-campaign balance table with progress bars
64. Build platform settings page: fee %, OTP threshold, update with confirmation
65. Build audit log page: filterable table with expandable JSON detail rows

## Event Tracking & Feed

66. Implement behavioral event tracking: campaign_viewed, campaign_shared, donation_initiated, donation_completed; single + batch endpoints; works for authenticated and anonymous users
67. Implement category affinity scoring: weighted scores (view=1, share=2, initiate=1.5, complete=5) with 0.95 time decay, stored per user per category
68. Implement personalized feed: 3-signal ranking (urgency 35%, affinity 35%, recency 30%), fallback to urgency+recency for anonymous users
69. Build event tracking hook (useEvents): tracks views with time-on-page via sendBeacon, shares, donation funnel events, guest session via localStorage

## Recurring Donations

70. Implement recurring donation CRUD: subscribe to campaign or category, amount, frequency (weekly/monthly), payment provider
71. Implement recurring charge scheduler: daily cron at 06:00 Tashkent, fetch due records, charge saved card, create donation, update next_charge_date
72. Implement failure handling: increment failure count, auto-pause after 3 failures
73. Implement impact statistics: total donated, campaigns supported, streak weeks, active count, monthly total
74. Build recurring donations page: list active subscriptions, pause/resume/cancel with confirmation, impact badge

## Internationalization

75. Implement trilingual support (Uzbek, Russian, English) via next-intl with ~777 translation keys per language
76. Build language switcher in navbar (UZ/EN/RU), persist preference in cookie and user profile
77. Implement locale-aware formatting: UZS currency, dates, phone numbers (+998 XX XXX XX XX), Tashkent timezone

## Frontend Infrastructure

78. Implement BFF API proxy: 58 Next.js API route handlers forwarding to backend, auth tokens in httpOnly cookies
79. Build 4 route group layouts: (auth) centered, (public) navbar+footer, (dashboard) sidebar, (admin) admin sidebar
80. Build landing page: hero, stats, featured campaigns, category cards, how-it-works, CTA
81. Implement Zod-based request validation middleware with field-level error responses
82. Implement global error handler: AppError -> structured JSON, unknown errors hidden in production, frontend error code -> i18n mapping

## Deployment

83. Create production Dockerfiles for backend and frontend, docker-compose.prod.yml with Nginx reverse proxy
84. Implement Eskiz.uz SMS integration with bearer token auth, automatic refresh, localized messages, mock fallback
