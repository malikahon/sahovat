# Sahovat -- Presentation Outline

> Estimated duration: 15-20 minutes (including demo)

---

## Slide 1: Title

- **Sahovat** -- Crowdfunding Platform for Uzbekistan
- University project
- Presenter name, date

---

## Slide 2: The Problem

- Uzbekistan has a strong giving culture (sadaqa, zakat, community support)
- But no dedicated, trustworthy digital platform for crowdfunding
- Current problems:
  - Social media fundraising has no accountability
  - No way to verify organizers or track funds
  - No receipts, no transparency
  - Donors don't know if their money reached the right person

---

## Slide 3: The Solution

- **Sahovat**: a full-featured crowdfunding platform built for Uzbekistan
- Verified campaigns with admin review
- Transparent fund tracking (virtual ledger / escrow)
- PayMe integration for secure payments
- PDF donation receipts
- Available in Uzbek, Russian, and English

---

## Slide 4: Key Features

| Feature | Description |
|---------|-------------|
| OTP Login | Phone-based auth via Eskiz.uz SMS |
| Campaign Wizard | 5-step creation with document uploads |
| PayMe Payments | Card tokenization + checkout redirect |
| Anonymous Donations | Full privacy for donors |
| PDF Receipts | Downloadable after every donation |
| Admin Verification | Side-by-side document review |
| Virtual Ledger | Real-time escrow tracking |
| Recurring Donations | Weekly/monthly auto-charges |
| Personalized Feed | 3-signal recommendation scoring |
| Trilingual | Uzbek, Russian, English |

---

## Slide 5: Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express v5, TypeScript (ESM) |
| Frontend | Next.js 15, React 19, Tailwind v4, shadcn/ui |
| Database | PostgreSQL 16, Redis 7 |
| Payments | PayMe Subscribe + Merchant API |
| SMS | Eskiz.uz |
| Deployment | Docker, Nginx, GitHub Actions |
| Testing | Vitest, Playwright |

---

## Slide 6: Architecture Diagram

- Show the system diagram:
  - Nginx reverse proxy (SSL)
  - Frontend (Next.js, BFF pattern)
  - Backend (Express, modular architecture)
  - PostgreSQL + Redis
- Highlight the BFF pattern: frontend never exposes JWT to browser

---

## Slide 7: Database Design

- 16 tables, domain-driven
- Show ER diagram (simplified)
- Highlight key design decisions:
  - Virtual ledger (no separate escrow table)
  - AES-256-GCM encryption for card numbers
  - pgcrypto UUIDs
  - Behavioral event tracking for personalization

---

## Slide 8: User Journey -- Donor

1. Visit landing page, browse campaigns
2. Register with phone + OTP
3. Select preferred categories
4. Browse personalized feed
5. Donate to a campaign (2-click flow)
6. Download PDF receipt
7. Set up recurring donations

*Show screenshots or live demo*

---

## Slide 9: User Journey -- Organizer

1. Register and verify identity (upload passport)
2. Add withdrawal account (card number)
3. Create campaign (5-step wizard with documents)
4. Submit for admin review
5. Campaign goes live after approval
6. Receive donations, track progress
7. Request withdrawal when ready

*Show screenshots or live demo*

---

## Slide 10: Admin Panel

- Dashboard with real-time metrics and charts
- Campaign verification queue (side-by-side document review)
- User management (ban, admin toggle, verification)
- Withdrawal processing (name comparison, approve, complete)
- Escrow dashboard (per-campaign balances)
- Audit log (immutable action history)
- Platform settings (fee %, master card)

*Show screenshots or live demo*

---

## Slide 11: Payment Integration

- **PayMe Subscribe API**: card tokenization, saved cards, direct charges
- **PayMe Merchant API**: JSON-RPC 2.0, checkout redirect, webhook callbacks
- High-value OTP verification (>100k UZS)
- Platform fee auto-calculated and tracked
- Mock service for development, real PayMe for production

---

## Slide 12: Security & Compliance

| Measure | Implementation |
|---------|---------------|
| Authentication | JWT with 15-min access tokens, Redis-backed refresh |
| Encryption | AES-256-GCM for card numbers |
| Rate Limiting | Per-IP limits on all endpoints |
| Input Validation | Zod schemas on every request |
| Data Localization | All data on Uzbek VPS (ZRU-547 compliant) |
| Audit Trail | Immutable admin action log |
| Anonymous Donations | Donor identity hidden from all roles |

---

## Slide 13: Personalization

- Behavioral event tracking: views, shares, donation funnel
- Category affinity scoring with time decay
- 3-signal feed ranking:
  - Urgency (35%): campaigns close to goal / deadline
  - Category affinity (35%): based on user's history
  - Recency (30%): newer campaigns ranked higher
- Guest users get urgency + recency only
- Scaffolded for future ML engine (post-MVP)

---

## Slide 14: Internationalization

- Three languages: Uzbek, Russian, English
- ~800 translation keys per language
- Language switcher in navbar
- Locale-aware formatting: UZS currency, dates, phone numbers
- User preference persisted in profile

---

## Slide 15: Testing Strategy

| Type | Tool | Coverage |
|------|------|----------|
| Unit tests | Vitest | Auth, encryption, fees, phone validation |
| Integration tests | Vitest + Supertest | All API endpoints |
| Component tests | Vitest + Testing Library | Key UI components |
| E2E tests | Playwright | Guest, donor, organizer, admin flows |
| Security tests | Custom | Rate limiting, brute force, injection |

---

## Slide 16: Deployment

- Docker Compose production stack (5 containers)
- Nginx with SSL (Let's Encrypt)
- GitHub Actions CI/CD pipeline
- Automated daily PostgreSQL backups (7-day retention)
- Health check endpoint for monitoring
- Zero-downtime deploys via Docker rebuild

---

## Slide 17: MVP Milestones

| Milestone | Delivered |
|-----------|-----------|
| M1 (Week 4) | Auth, verification, campaign creation |
| M2 (Week 7) | Full donation flow with PayMe |
| M3 (Week 9) | Admin panel with verification workflow |
| M4 (Week 10) | Homepage, search, withdrawal system |
| M5 (Week 12) | Personalized feed, recurring donations |
| Final (Week 16) | Deployed, documented, 3 languages |

---

## Slide 18: Numbers

- **88** API endpoints
- **43** frontend pages
- **16** database tables
- **~800** i18n keys per language (3 languages)
- **66** BFF proxy routes
- **20** backend test files
- **3** E2E test suites
- **16** weeks of development

---

## Slide 19: Future Roadmap

| Phase | Description |
|-------|-------------|
| Phase 6 | Telegram notifications, automated payouts |
| Phase 7 | ML recommendation engine (PostgreSQL + Python) |
| Phase 8 | Scaling (read replicas, CDN, load testing) |
| Phase 9 | Social features, multi-provider payments, corporate donations |

---

## Slide 20: Live Demo / Demo Video

- Walk through the full user journey (3-5 minutes)
- Or play the recorded demo video

---

## Slide 21: Q&A

- Questions?
- Contact info
- Repository link
