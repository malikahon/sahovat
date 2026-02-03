# Uzbek Crowdfunding Platform - Quick Implementation Roadmap

## Week-by-Week Development Plan (12 Weeks MVP)

---

## Week 1: Foundation Setup

### Day 1-2: Project Initialization
- [ ] Create Git repository
- [ ] Set up project structure (backend + frontend folders)
- [ ] Install Node.js, PostgreSQL, Redis
- [ ] Create `.env.example` files with all required environment variables
- [ ] Initialize backend (Express.js + TypeScript setup)
- [ ] Initialize frontend (Next.js setup with Tailwind CSS)

### Day 3-5: Database Setup
- [ ] Design and implement database schema in PostgreSQL
- [ ] Create migration files for all tables:
  - users
  - withdrawal_accountsi_
  - fundraisers
  - fundraiser_documents
  - donations
  - withdrawals
  - platform_fees
  - admin_actions
- [ ] Create database indexes
- [ ] Write seed script for initial admin account
- [ ] Test database connections

### Day 6-7: Authentication Foundation
- [ ] Set up Redis for OTP storage
- [ ] Implement phone number validation (Uzbek format +998)
- [ ] Create OTP generation function
- [ ] Mock SMS service (console.log for testing)
- [ ] JWT token generation and verification
- [ ] Auth middleware (requireAuth, requireVerified, requireAdmin)

**Deliverable:** Working backend with database and basic auth structure

---

## Week 2: Authentication & User Management

### Day 1-3: Auth Endpoints
- [ ] POST /api/auth/request-otp
- [ ] POST /api/auth/verify-otp
- [ ] POST /api/auth/refresh
- [ ] POST /api/auth/logout
- [ ] Implement rate limiting for OTP requests
- [ ] Test auth flow with Postman

### Day 4-5: User Verification (Mock)
- [ ] POST /api/auth/verify-user-mock - Submit verification request
- [ ] GET /api/auth/verify-status - Check verification status
- [ ] File upload for ID document
- [ ] Store verification requests in database

### Day 6-7: Frontend Auth Pages
- [ ] Create auth layout
- [ ] Phone number input page with country code (+998)
- [ ] OTP input page (6-digit code)
- [ ] Session management with JWT
- [ ] Protected route wrapper component

**Deliverable:** Complete authentication system (backend + frontend)

---

## Week 3: Withdrawal Accounts & User Profile

### Day 1-3: Withdrawal Account System
- [ ] POST /api/users/withdrawal-accounts - Add account
- [ ] GET /api/users/withdrawal-accounts - List accounts
- [ ] PUT /api/users/withdrawal-accounts/:id - Update
- [ ] DELETE /api/users/withdrawal-accounts/:id - Delete
- [ ] POST /api/users/withdrawal-accounts/:id/set-primary
- [ ] Mock account verification (check name match)
- [ ] Encrypt account numbers in database

### Day 4-7: User Dashboard Frontend
- [ ] User profile page
- [ ] Withdrawal accounts management UI
- [ ] Add withdrawal account form (select provider, enter account)
- [ ] Verification request submission form
- [ ] Language preference selector
- [ ] "My Fundraisers" list (empty for now)
- [ ] "My Donations" list (empty for now)

**Deliverable:** User profile and withdrawal account management

---

## Week 4: Fundraiser Creation Backend

### Day 1-2: Fundraiser CRUD
- [ ] POST /api/fundraisers - Create fundraiser
- [ ] GET /api/fundraisers - List with filters (status, category, verified, search)
- [ ] GET /api/fundraisers/:id - Get single fundraiser
- [ ] PUT /api/fundraisers/:id - Update fundraiser
- [ ] DELETE /api/fundraisers/:id - Delete fundraiser
- [ ] Validation: only verified users, must have withdrawal account

### Day 3-5: Document Upload System
- [ ] POST /api/fundraisers/:id/documents - Upload document
- [ ] GET /api/fundraisers/:id/documents - List documents
- [ ] DELETE /api/fundraisers/:id/documents/:docId
- [ ] File upload middleware (multer or similar)
- [ ] File validation (type, size, max 15 per fundraiser)
- [ ] Store files in /uploads directory
- [ ] Associate document types and notes

### Day 6-7: Fundraiser Statistics
- [ ] GET /api/fundraisers/:id/statistics
- [ ] Calculate current_amount from donations
- [ ] Get donor count
- [ ] Get latest donations
- [ ] Progress percentage calculation

**Deliverable:** Complete fundraiser backend API

---

## Week 5: Fundraiser Creation Frontend

### Day 1-2: Multi-step Form Structure
- [ ] Create fundraiser creation wizard component
- [ ] Step 1: Basic info (title, category, goal, end date)
- [ ] Form validation with Zod
- [ ] Save draft functionality
- [ ] Progress indicator between steps

### Day 3-4: Description & Media
- [ ] Step 2: Rich text editor for description (react-quill or similar)
- [ ] Step 3: Image upload (cover + additional images)
- [ ] Image preview
- [ ] Video link embed
- [ ] Character counter for description

### Day 5-7: Document Upload UI
- [ ] Step 4: Document upload interface
- [ ] Drag-and-drop file upload
- [ ] Document type selector for each file
- [ ] Note field for each document
- [ ] Upload progress indicators
- [ ] File preview/thumbnails
- [ ] Max 15 documents validation
- [ ] Step 5: Withdrawal account selection
- [ ] Step 6: Preview page
- [ ] Submit button with confirmation

**Deliverable:** Complete fundraiser creation flow

---

## Week 6: Donation System Backend

### Day 1-3: Donation Endpoints
- [ ] POST /api/donations/check-requirements (check if ≥3M UZS)
- [ ] POST /api/donations/initiate - Create donation record
- [ ] POST /api/donations/:id/confirm - Webhook handler (mock for now)
- [ ] GET /api/donations/:id - Get donation details
- [ ] GET /api/fundraisers/:id/donations - List donations (public, paginated)
- [ ] PATCH /api/donations/:id/note - Edit note (24hr limit)
- [ ] GET /api/donations/my-donations - User's donation history
- [ ] Platform fee calculation (1%)

### Day 4-5: Payment Gateway Mock
- [ ] Create mock payment service
- [ ] Simulate payment flow for all 4 providers (Payme, Click, Uzcard, Humo)
- [ ] Return mock payment URLs
- [ ] Mock webhook confirmation
- [ ] Transaction ID generation

### Day 6-7: KYC Logic
- [ ] Implement 3M UZS threshold check
- [ ] Block unverified users from large donations
- [ ] Set requires_verification flag
- [ ] Anonymous vs logged-in donation logic
- [ ] Donor display name handling

**Deliverable:** Complete donation backend with mock payments

---

## Week 7: Donation Flow Frontend

### Day 1-2: Donation Widget
- [ ] Create donation button on fundraiser page
- [ ] Donation modal/page
- [ ] Amount selection (suggested + custom)
- [ ] Platform fee display
- [ ] Real-time total calculation

### Day 3-4: Donor Options
- [ ] KYC check UI for ≥3M donations
- [ ] Login prompt if needed
- [ ] Verification requirement message
- [ ] Anonymous donation toggle (for logged-in users)
- [ ] Custom display name input
- [ ] Donation note textarea with character counter

### Day 5-7: Payment Flow
- [ ] Payment provider selection (4 cards with logos)
- [ ] Confirmation screen (summary of donation)
- [ ] Redirect to mock payment page
- [ ] Return URL handling
- [ ] Success page with donation details
- [ ] Failure page with retry option
- [ ] Download receipt button (optional)

**Deliverable:** Complete donation flow frontend

---

## Week 8: Admin Panel Backend

### Day 1-2: Admin Endpoints - Users
- [ ] GET /api/admin/users - List all users
- [ ] GET /api/admin/users/pending-verification
- [ ] POST /api/admin/users/:id/verify - Approve user
- [ ] POST /api/admin/users/:id/reject-verification - Reject with reason
- [ ] POST /api/admin/users/:id/make-admin
- [ ] POST /api/admin/users/:id/revoke-admin

### Day 3-4: Admin Endpoints - Fundraisers
- [ ] GET /api/admin/fundraisers/pending-verification
- [ ] GET /api/admin/fundraisers/:id/review - Get with documents
- [ ] POST /api/admin/fundraisers/:id/verify - Add blue checkmark
- [ ] POST /api/admin/fundraisers/:id/reject-verification
- [ ] POST /api/admin/fundraisers/:id/unverify
- [ ] POST /api/admin/fundraisers/:id/pause
- [ ] POST /api/admin/fundraisers/:id/resume

### Day 5-6: Admin Endpoints - Withdrawals
- [ ] GET /api/admin/withdrawals/pending
- [ ] POST /api/admin/withdrawals/:id/approve
- [ ] POST /api/admin/withdrawals/:id/reject
- [ ] POST /api/admin/withdrawals/:id/mark-completed

### Day 7: Admin Statistics & Actions
- [ ] GET /api/admin/dashboard - Overview stats
- [ ] GET /api/admin/statistics - Detailed stats
- [ ] GET /api/admin/platform-fees
- [ ] GET /api/admin/actions - Audit log
- [ ] Record all admin actions in admin_actions table

**Deliverable:** Complete admin backend API

---

## Week 9: Admin Panel Frontend

### Day 1-2: Admin Dashboard
- [ ] Create admin layout with sidebar navigation
- [ ] Dashboard overview page with key metrics cards
- [ ] Charts (donations over time, categories, payment methods)
- [ ] Top fundraisers table

### Day 3-4: Verification Queues
- [ ] User verification queue page
- [ ] User detail modal with ID document viewer
- [ ] Approve/reject buttons with reason modal
- [ ] Fundraiser verification queue page
- [ ] Fundraiser review page with document grid
- [ ] Document viewer/download
- [ ] Verify/reject fundraiser actions

### Day 5-6: Withdrawal Management
- [ ] Withdrawal queue page
- [ ] Withdrawal detail modal
- [ ] Account verification check display
- [ ] Approve/reject/complete actions
- [ ] Transaction log display

### Day 7: User & Stats Management
- [ ] Users list page with filters
- [ ] User detail page
- [ ] Make/revoke admin actions
- [ ] Statistics dashboard with detailed charts
- [ ] Platform fees report
- [ ] Admin action log viewer

**Deliverable:** Complete admin panel

---

## Week 10: Public Pages & Polish

### Day 1-2: Homepage
- [ ] Hero section with search
- [ ] Featured/verified fundraisers carousel
- [ ] Category cards
- [ ] Statistics (total raised, active campaigns, etc.)
- [ ] How it works section
- [ ] Footer with links

### Day 3-4: Fundraiser List & Detail
- [ ] Fundraiser listing page with filters
- [ ] Category filter
- [ ] Verified only toggle
- [ ] Search functionality
- [ ] Sort options (newest, most funded, ending soon)
- [ ] Pagination
- [ ] Fundraiser detail page layout
- [ ] Progress bar
- [ ] Donation list (comment section style)
- [ ] Creator info section
- [ ] Share buttons

### Day 5-7: Withdrawal Request Flow
- [ ] GET /api/fundraisers/:id/available-balance
- [ ] POST /api/withdrawals/request
- [ ] GET /api/withdrawals/my-requests
- [ ] POST /api/withdrawals/:id/cancel
- [ ] Withdrawal request UI in user dashboard
- [ ] Available balance display
- [ ] Fee calculator
- [ ] Withdrawal history

**Deliverable:** Complete public-facing pages and withdrawal system

---

## Week 11: Internationalization & Testing

### Day 1-3: Multilingual Support
- [ ] Set up i18n (next-i18next or react-i18next)
- [ ] Create translation files:
  - uz.json (Uzbek - primary)
  - ru.json (Russian)
  - en.json (English)
- [ ] Translate all UI text
- [ ] Add language selector to navigation
- [ ] Store language preference in user profile
- [ ] Test language switching

### Day 4-7: Testing & Bug Fixes
- [ ] Write unit tests for critical backend functions
- [ ] Test all API endpoints with Postman
- [ ] E2E testing with Playwright:
  - User signup → verification → create fundraiser
  - Guest donation
  - Large donation KYC flow
  - Admin verification workflow
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing
- [ ] Fix discovered bugs
- [ ] Performance optimization (lazy loading, code splitting)

**Deliverable:** Fully tested, multilingual application

---

## Week 12: Deployment & Documentation

### Day 1-2: Deployment Preparation
- [ ] Set up production environment variables
- [ ] Configure PostgreSQL production database
- [ ] Set up Redis in production
- [ ] Configure file storage
- [ ] Set up SSL certificate
- [ ] Configure Nginx reverse proxy

### Day 3-4: Deploy Application
- [ ] Deploy backend to production server
- [ ] Deploy frontend to production server
- [ ] Run database migrations
- [ ] Seed initial admin account
- [ ] Test production deployment
- [ ] Set up monitoring (basic logging)
- [ ] Configure backups

### Day 5-7: Documentation & Presentation
- [ ] Write technical architecture document
- [ ] Create API documentation (Swagger/Postman collection)
- [ ] Document database schema with ER diagram
- [ ] Write user manual (PDF)
- [ ] Write admin manual
- [ ] Create deployment/setup guide
- [ ] Create presentation slides
- [ ] Record demo video (3-5 minutes)
- [ ] Take screenshots for presentation
- [ ] Prepare for university presentation

**Deliverable:** Deployed MVP + Complete documentation + Presentation materials

---

## Daily Development Checklist

Use this checklist every day to stay on track:

- [ ] Pull latest code from repository
- [ ] Review today's tasks from weekly plan
- [ ] Write code with clear comments
- [ ] Test new features locally
- [ ] Commit code with descriptive messages
- [ ] Push code to repository
- [ ] Update project documentation
- [ ] Log any blockers or issues
- [ ] Plan next day's tasks

---

## Key Milestones & Demo Points

**Milestone 1 (End of Week 4):** 
- Demo: User signup, verification, create fundraiser with documents

**Milestone 2 (End of Week 7):**
- Demo: Complete donation flow (guest, logged-in, KYC check)

**Milestone 3 (End of Week 9):**
- Demo: Admin panel (verify users, verify fundraisers, approve withdrawals)

**Milestone 4 (End of Week 10):**
- Demo: Complete public platform with homepage, search, fundraiser pages

**Final Demo (End of Week 12):**
- Full platform demo in 3 languages
- Show all user journeys
- Admin capabilities demonstration

---

## Risk Mitigation

**Common Risks & Solutions:**

**Risk:** Payment provider integration too complex
**Solution:** Use mock service for MVP, clearly document integration points

**Risk:** File upload handling issues
**Solution:** Start with local filesystem, implement proper validation early

**Risk:** Database performance issues
**Solution:** Create indexes early, test with realistic data volumes

**Risk:** Frontend complexity overwhelming
**Solution:** Use component library (shadcn/ui), focus on functionality over aesthetics initially

**Risk:** Time constraints
**Solution:** Prioritize must-have features, mark nice-to-have features for post-MVP

**Risk:** Security vulnerabilities
**Solution:** Follow OWASP best practices, validate all inputs, encrypt sensitive data

---

## Post-MVP Enhancements (Optional)

If time permits or for startup version:

- [ ] Email notifications
- [ ] Push notifications
- [ ] Real-time updates (Socket.io)
- [ ] Social sharing optimization
- [ ] PDF donation receipts
- [ ] Fundraiser update posts
- [ ] Donation comments/replies
- [ ] Advanced search with filters
- [ ] Analytics dashboard for creators
- [ ] Fundraiser templates
- [ ] Recurring donations
- [ ] Team fundraising
- [ ] Mobile app (React Native)

---

## Tools & Resources

**Development:**
- VS Code with extensions (ESLint, Prettier, Thunder Client)
- TablePlus or pgAdmin (database management)
- Postman (API testing)
- Figma (if designing mockups)

**Learning Resources:**
- Next.js documentation: nextjs.org/docs
- Express.js guide: expressjs.com
- PostgreSQL tutorial: postgresql.org/docs
- Tailwind CSS docs: tailwindcss.com

**Code Quality:**
- ESLint configuration for consistent code style
- Prettier for auto-formatting
- Husky for pre-commit hooks
- Conventional commits for clear git history

---

**Good luck with your university project! 🚀**

Remember: The goal is a working MVP that demonstrates core functionality. Perfect is the enemy of done. Focus on getting features working, then refine.
