# Sahovat - Uzbek Crowdfunding Platform

## Project Overview
Sahovat is a crowdfunding platform for Uzbekistan, enabling users to create fundraisers and accept donations through local payment providers (Payme, Click, Uzcard, Humo).

## Project Structure
```
sahovat/
├── backend/          # Express.js + TypeScript API
│   ├── src/
│   │   ├── config/       # Configuration files (database, redis, env)
│   │   ├── controllers/  # Route controllers (auth)
│   │   ├── database/     # Migrations and seed scripts
│   │   │   ├── migrations/  # SQL migration files
│   │   │   ├── migrate.ts   # Migration runner
│   │   │   └── seed.ts      # Database seeder
│   │   ├── middlewares/  # Express middlewares (auth, errorHandler)
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes (auth)
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript type definitions
│   │   ├── utils/        # Utility functions (jwt, otp, phone, sms)
│   │   └── index.ts      # Application entry point
│   ├── uploads/          # File uploads directory
│   └── package.json
├── frontend/         # Next.js 16 + Tailwind CSS
│   ├── src/
│   │   └── app/          # App router pages
│   └── package.json
└── implementation_roadmap.md
```

## Tech Stack
### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Language**: TypeScript
- **Database**: PostgreSQL (via `pg` library)
- **Cache**: Redis
- **Authentication**: JWT (jsonwebtoken) + OTP via SMS
- **Validation**: express-validator
- **File Upload**: multer
- **Security**: helmet, cors, express-rate-limit

### Frontend
- **Framework**: Next.js 16.x (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.x
- **React**: 19.x

## Development Commands

### Backend
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start development server (port 3001)
npm run build        # Build for production
npm start            # Start production server
npm run migrate      # Run database migrations
npm run seed         # Seed initial admin user
npm run db:setup     # Run migrations + seed
```

### Frontend
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm start            # Start production server
```

## Environment Variables
See `.env.example` files in both `backend/` and `frontend/` directories.

## Week 1 - Foundation Setup (COMPLETE)

### Day 1-2 Initialization (COMPLETE)
- [x] Git repository created
- [x] Project structure set up (backend + frontend folders)
- [x] Backend initialized with Express.js + TypeScript
  - Database configuration (PostgreSQL)
  - Redis configuration
  - Error handling middleware
  - Health check endpoint
  - TypeScript types defined
- [x] Frontend initialized with Next.js + Tailwind CSS
  - Basic landing page with Uzbek text
  - Responsive design
- [x] `.env.example` files created

### Day 3-5 Database Setup (COMPLETE)
- [x] Database schema designed and implemented (8 tables)
  - users, withdrawal_accounts, fundraisers, fundraiser_documents
  - donations, withdrawals, platform_fees, admin_actions
- [x] Migration system with tracking (_migrations table)
- [x] All indexes created for query performance
- [x] Auto-updating `updated_at` triggers on all relevant tables
- [x] Seed script for initial admin account (+998901234567)
- [x] npm scripts: `migrate`, `seed`, `db:setup`

### Day 6-7 Authentication Foundation (COMPLETE)
- [x] Redis OTP storage with TTL and attempt tracking
- [x] Phone number validation (Uzbek +998 format, valid mobile prefixes)
- [x] OTP generation (6-digit, configurable) with lockout after 5 failed attempts
- [x] Mock SMS service (console.log in development)
- [x] JWT access + refresh tokens with Redis-backed storage
- [x] Auth middleware: requireAuth, requireVerified, requireAdmin
- [x] Auth controller with full request-otp / verify-otp / refresh / logout flow
- [x] Rate limiting on OTP endpoints

## API Endpoints
- `GET /api/health` - Health check (implemented)
- `POST /api/auth/request-otp` - Request OTP (implemented, rate-limited)
- `POST /api/auth/verify-otp` - Verify OTP and get tokens (implemented, rate-limited)
- `POST /api/auth/refresh` - Refresh access token (implemented)
- `POST /api/auth/logout` - Logout, requires auth (implemented)
- More to come in Week 2...

## Next Steps (Week 2: Authentication & User Management)
- [ ] Test auth flow with Postman
- [ ] User verification (mock) endpoints
- [ ] Frontend auth pages (phone input, OTP input)
- [ ] Session management with JWT
- [ ] Protected route wrapper component

## Database Schema
8 tables with UUID primary keys, CHECK constraints, and foreign key relationships:
- **users** - Phone-based auth, verification status, admin flag
- **withdrawal_accounts** - Payment provider accounts (Payme, Click, Uzcard, Humo)
- **fundraisers** - Campaigns with categories, goals, and verification
- **fundraiser_documents** - Supporting documents (max 15 per fundraiser)
- **donations** - Transactions with platform fee calculation (1%)
- **withdrawals** - Creator payouts with admin approval
- **platform_fees** - Fee tracking for donations and withdrawals
- **admin_actions** - Complete audit log with JSONB details

## Notes for Development
- Backend runs on port 3001, frontend on port 3000
- Use `npm run dev` in both directories for development
- PostgreSQL and Redis must be running locally
- Run `npm run db:setup` to initialize database schema and seed admin
- All monetary values are in UZS (Uzbek Som)
- Platform fee is 1% on donations
- KYC required for donations >= 3,000,000 UZS
- OTP codes are logged to console in development mode (MOCK SMS)
- Initial admin account: +998901234567
