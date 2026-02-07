# Uzbek Crowdfunding Platform - Quick Implementation Roadmap

## Key Platform Decisions

| Feature | Decision |
|---------|----------|
| **User Verification** | Via OneID (Uzbekistan's national identity service) |
| **Fundraiser Verification** | Manual admin approval (only OneID-verified users can create) |
| **Donations** | Login required (can choose to appear anonymous - fully private) |
| **Payment Provider** | PayMe only |
| **Withdrawals** | To PayMe accounts |

---

## Week-by-Week Development Plan (12 Weeks MVP)

---

## Week 1: Foundation Setup

### Day 1-2: Project Initialization
- [x] Create Git repository
- [x] Set up project structure (backend + frontend folders)
- [x] Install Node.js, PostgreSQL, Redis
- [x] Create `.env.example` files with all required environment variables
- [x] Initialize backend (Express.js + TypeScript setup)
- [x] Initialize frontend (Next.js setup with Tailwind CSS)

### Day 3-5: Database Setup
- [x] Design and implement database schema in PostgreSQL
- [x] Create migration files for all tables:
  - users
  - withdrawal_accounts
  - fundraisers
  - fundraiser_documents
  - donations
  - withdrawals
  - platform_fees
  - admin_actions
- [x] Create database indexes
- [x] Write seed script for initial admin account
- [x] Test database connections

### Day 6-7: Authentication Foundation
- [x] Set up Redis for OTP storage
- [x] Implement phone number validation (Uzbek format +998)
- [x] Create OTP generation function
- [x] Mock SMS service (console.log for testing)
- [x] JWT token generation and verification
- [x] Auth middleware (requireAuth, requireVerified, requireAdmin)

**Deliverable:** Working backend with database and basic auth structure ✅

---

## Week 2: Authentication & User Management

### Day 1-3: Auth Endpoints
- [x] POST /api/auth/request-otp
- [x] POST /api/auth/verify-otp
- [x] POST /api/auth/refresh
- [x] POST /api/auth/logout
- [x] Implement rate limiting for OTP requests
- [x] Test auth flow with Postman

### Day 4-5: User Verification via OneID
- [x] POST /api/auth/verify-user-mock - Submit verification request (mock for testing)
- [x] GET /api/auth/verify-status - Check verification status
- [x] Integrate OneID OAuth flow for identity verification
- [x] Store OneID verification response in database
- [x] Auto-verify users upon successful OneID authentication

### Day 6-7: Frontend Auth Pages
- [x] Create auth layout
- [x] Phone number input page with country code (+998)
- [x] OTP input page (6-digit code)
- [x] Session management with JWT
- [x] Protected route wrapper component

**Deliverable:** Complete authentication system (backend + frontend) ✅

---

## Week 3: Withdrawal Accounts & User Profile

### Day 1-3: Withdrawal Account System (PayMe only)
- [x] POST /api/users/withdrawal-accounts - Add PayMe account
- [x] GET /api/users/withdrawal-accounts - List accounts
- [x] PUT /api/users/withdrawal-accounts/:id - Update
- [x] DELETE /api/users/withdrawal-accounts/:id - Delete
- [x] POST /api/users/withdrawal-accounts/:id/set-primary
- [x] Mock account verification (check name match)
- [x] Encrypt account numbers in database

### Day 4-7: User Dashboard Frontend
- [x] User profile page
- [x] Withdrawal accounts management UI (PayMe accounts)
- [x] Add PayMe account form
- [x] OneID verification status display
- [x] OneID verification button (redirects to OneID)
- [x] Language preference selector
- [x] "My Fundraisers" list (empty for now)
- [x] "My Donations" list (empty for now)

**Deliverable:** User profile and withdrawal account management ✅

---

## Week 4: Fundraiser Creation Backend

### Day 1-2: Fundraiser CRUD
- [ ] POST /api/fundraisers - Create fundraiser
- [ ] GET /api/fundraisers - List with filters (status, category, verified, search)
- [ ] GET /api/fundraisers/:id - Get single fundraiser
- [ ] PUT /api/fundraisers/:id - Update fundraiser
- [ ] DELETE /api/fundraisers/:id - Delete fundraiser
- [ ] Validation: only OneID-verified users can create fundraisers
- [ ] Validation: must have PayMe withdrawal account

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
- [ ] Check OneID verification status before allowing creation
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
- [ ] Step 5: PayMe withdrawal account selection
- [ ] Step 6: Preview page
- [ ] Submit button with confirmation
- [ ] Note: Requires OneID verification to submit

**Deliverable:** Complete fundraiser creation flow

---

## Week 6: Donation System Backend

### Day 1-3: Donation Endpoints (Login Required)
- [ ] POST /api/donations/initiate - Create donation record (auth required)
- [ ] POST /api/donations/:id/confirm - PayMe webhook handler
- [ ] GET /api/donations/:id - Get donation details (respects anonymity)
- [ ] GET /api/fundraisers/:id/donations - List donations (public, respects anonymity)
- [ ] PATCH /api/donations/:id/note - Edit comment (24hr limit)
- [ ] GET /api/donations/my-donations - User's donation history
- [ ] Platform fee calculation (1%)
- [ ] Login required, anonymous option hides identity from EVERYONE (admins, creators, public)
- [ ] Real donor_id stored in DB only for legal/compliance (money laundering, fraud investigations)

### Day 4-5: PayMe Integration
- [ ] Create PayMe payment service
- [ ] Integrate PayMe API for payment initiation
- [ ] Handle PayMe webhook callbacks
- [ ] Return PayMe checkout URL
- [ ] Transaction ID storage and verification
- [ ] Mock mode for local testing

### Day 6-7: Donation Logic
- [ ] Validate user is authenticated before donation
- [ ] Anonymous donation toggle (fully private - hidden from everyone including admins/creators)
- [ ] Donor display name handling (use profile name, custom, or "Anonymous")
- [ ] Donation note/comment with character limit (optional)
- [ ] Store donor_id in database for legal compliance (accessible only via direct DB for investigations)

**Deliverable:** Complete donation backend with PayMe integration

---

## Week 7: Donation Flow Frontend

### Day 1-2: Donation Widget
- [ ] Create donation button on fundraiser page
- [ ] Donation modal/page (requires login)
- [ ] Login redirect if not authenticated
- [ ] Amount selection (suggested + custom)
- [ ] Platform fee display
- [ ] Real-time total calculation

### Day 3-4: Donor Options
- [ ] Display logged-in user info
- [ ] Anonymous donation toggle (fully private - hidden from everyone)
- [ ] Explain privacy: "Your identity will be hidden from the public, fundraiser creator, and admins"
- [ ] Custom display name input (if not anonymous)
- [ ] Donation comment/note textarea with character counter (optional)

### Day 5-7: PayMe Payment Flow
- [ ] PayMe payment button with logo
- [ ] Confirmation screen (summary of donation)
- [ ] Redirect to PayMe checkout
- [ ] Return URL handling (success/cancel)
- [ ] Success page with donation details
- [ ] Failure page with retry option
- [ ] Download receipt button (optional)

**Deliverable:** Complete donation flow frontend with PayMe

---

## Week 8: Admin Panel Backend

### Day 1-2: Admin Endpoints - Users
- [ ] GET /api/admin/users - List all users
- [ ] GET /api/admin/users/:id - Get user details
- [ ] GET /api/admin/users/verified - List OneID verified users
- [ ] POST /api/admin/users/:id/make-admin
- [ ] POST /api/admin/users/:id/revoke-admin
- [ ] POST /api/admin/users/:id/ban - Ban user from platform
- [ ] Note: User verification is handled by OneID (no manual approval)

### Day 3-4: Admin Endpoints - Fundraisers (Admin Verification)
- [ ] GET /api/admin/fundraisers/pending-verification
- [ ] GET /api/admin/fundraisers/:id/review - Get with documents
- [ ] POST /api/admin/fundraisers/:id/verify - Add blue checkmark (admin only)
- [ ] POST /api/admin/fundraisers/:id/reject-verification - Reject with reason
- [ ] POST /api/admin/fundraisers/:id/unverify - Remove verification
- [ ] POST /api/admin/fundraisers/:id/pause - Pause fundraiser
- [ ] POST /api/admin/fundraisers/:id/resume - Resume fundraiser
- [ ] Note: Only OneID-verified users can create fundraisers

### Day 5-6: Admin Endpoints - Withdrawals
- [ ] GET /api/admin/withdrawals/pending
- [ ] POST /api/admin/withdrawals/:id/approve
- [ ] POST /api/admin/withdrawals/:id/reject
- [ ] POST /api/admin/withdrawals/:id/mark-completed

### Privacy Note - Anonymous Donations
- Anonymous donor identities are NOT visible via API (not to admins, not to fundraiser creators)
- Real donor_id is stored in database for legal compliance only
- Access to real identity requires direct database query (for fraud/money laundering investigations, court orders)

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
- [ ] Charts (donations over time, categories)
- [ ] Top fundraisers table
- [ ] PayMe transaction summary

### Day 3-4: Fundraiser Verification Queue
- [ ] Fundraiser verification queue page
- [ ] Fundraiser review page with document grid
- [ ] Document viewer/download
- [ ] Verify/reject fundraiser actions with reason modal
- [ ] Filter by status (pending, verified, rejected)
- [ ] Note: Users are auto-verified via OneID

### Day 5-6: Withdrawal Management
- [ ] Withdrawal queue page
- [ ] Withdrawal detail modal
- [ ] PayMe account verification check display
- [ ] Approve/reject/complete actions
- [ ] Transaction log display

### Day 7: User & Stats Management
- [ ] Users list page with filters (verified via OneID, admin status)
- [ ] User detail page (show OneID verification status)
- [ ] Make/revoke admin actions
- [ ] Ban/unban user actions
- [ ] Statistics dashboard with detailed charts
- [ ] Platform fees report (PayMe)
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
  - User signup → OneID verification → create fundraiser
  - Login → donate via PayMe flow (with/without anonymous option)
  - Admin fundraiser verification workflow
  - Withdrawal request and approval flow
- [ ] Test PayMe integration (sandbox mode)
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
- Demo: User signup, OneID verification, create fundraiser with documents

**Milestone 2 (End of Week 7):**
- Demo: Complete donation flow (login → donate via PayMe, with anonymous option)

**Milestone 3 (End of Week 9):**
- Demo: Admin panel (verify fundraisers, approve withdrawals, user management)

**Milestone 4 (End of Week 10):**
- Demo: Complete public platform with homepage, search, fundraiser pages

**Final Demo (End of Week 12):**
- Full platform demo in 3 languages
- Show all user journeys (signup → OneID → create fundraiser → receive donations)
- Admin capabilities demonstration (fundraiser verification, withdrawals)
- PayMe payment flow demonstration

---

## Risk Mitigation

**Common Risks & Solutions:**

**Risk:** PayMe integration too complex
**Solution:** Use PayMe sandbox for testing, mock service for local development

**Risk:** OneID integration issues
**Solution:** Implement mock OneID flow for testing, document OAuth flow clearly

**Risk:** Anonymous donation privacy concerns
**Solution:** Anonymous donations hide identity from ALL users including admins/creators. Real donor_id stored in DB only for legal compliance (court orders, fraud investigations). API never exposes anonymous donor identity.

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
- [ ] Push notifications (Telegram bot integration)
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
- [ ] Additional payment providers (Click, Uzum)

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
