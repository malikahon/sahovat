# Sahovat - Uzbek Crowdfunding Platform

## Project Overview
Sahovat is a crowdfunding platform for Uzbekistan, enabling users to create fundraisers and accept donations through local payment providers (Payme, Click, Uzcard, Humo).

## Project Structure
```
sahovat/
├── backend/          # Express.js + TypeScript API
│   ├── src/
│   │   ├── config/       # Configuration files (database, redis, env)
│   │   ├── controllers/  # Route controllers
│   │   ├── middlewares/  # Express middlewares
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript type definitions
│   │   ├── utils/        # Utility functions
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
- **Authentication**: JWT (jsonwebtoken)
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

## Day 1-2 Initialization Complete
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

## Next Steps (Day 3-5: Database Setup)
- [ ] Design and implement database schema in PostgreSQL
- [ ] Create migration files for all tables
- [ ] Create database indexes
- [ ] Write seed script for initial admin account
- [ ] Test database connections

## API Endpoints (Planned)
- `GET /api/health` - Health check (implemented)
- `POST /api/auth/request-otp` - Request OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- More to come...

## Notes for Development
- Backend runs on port 3001, frontend on port 3000
- Use `npm run dev` in both directories for development
- PostgreSQL and Redis must be running locally
- All monetary values are in UZS (Uzbek Som)
- Platform fee is 1% on donations
- KYC required for donations >= 3,000,000 UZS
