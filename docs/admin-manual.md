# Sahovat Admin Manual

## Table of Contents

1. [Admin Login](#1-admin-login)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Campaign Verification](#3-campaign-verification)
4. [User Management](#4-user-management)
5. [Withdrawal Processing](#5-withdrawal-processing)
6. [Escrow & Ledger Management](#6-escrow--ledger-management)
7. [Platform Settings](#7-platform-settings)
8. [Audit Log](#8-audit-log)
9. [Verification Document Review](#9-verification-document-review)

---

## 1. Admin Login

Admins have two login methods:

### Method A: Phone + Password

1. Navigate to the admin login page
2. Enter your admin phone number (`+998XXXXXXXXX`)
3. Enter your admin password
4. You are logged in with full admin access

### Method B: OTP + Password Verification

1. Login via the standard OTP flow (phone + SMS code)
2. If your account has admin privileges, you will be prompted to verify your password
3. Enter your admin password to unlock admin features

All admin actions are logged in the audit trail.

---

## 2. Dashboard Overview

The admin cockpit (`/admin`) provides a real-time overview of the platform:

### Metrics Cards

- **Total Users** -- all registered users
- **Active Campaigns** -- campaigns currently accepting donations
- **Total Raised** -- sum of all completed donations (UZS)
- **Platform Fees** -- total revenue from platform fees
- **Escrow Balance** -- total funds held (donated minus withdrawn)
- **Pending Verifications** -- campaigns awaiting review
- **Pending Withdrawals** -- withdrawal requests awaiting action

### Charts

- **Donations Over Time** -- line chart showing daily donation volume (configurable: last 7, 30, or 90 days)
- **Donations by Category** -- bar chart showing donation distribution across campaign categories

### Money Flow

The money flow panel shows:

- Gross donations received
- Platform fees collected (broken down by donation fees vs. withdrawal fees)
- Net amount distributed to campaigns
- Total withdrawn by organizers
- Current escrow balance
- Month-over-month comparison
- Weekly trend data

---

## 3. Campaign Verification

### Verification Queue

Navigate to **Admin** > **Campaigns** to see all campaigns. Filter by status `pending_review` to see the verification queue.

Each entry shows:
- Campaign title and category
- Creator name and phone
- Goal amount
- Number of uploaded documents
- Submission date

### Review Process

1. Click on a campaign to open the **review page**
2. Review the campaign details:
   - Title, description, category, goal amount, region
   - Creator's verification status and identity documents
3. Review supporting documents:
   - Medical reports, financial statements, proof of residence, photos
   - Documents marked as private are only visible to admins
   - Side-by-side comparison: creator's ID vs. campaign documents
4. Take action:
   - **Approve** -- campaign becomes `active` and visible to donors
   - **Reject** -- campaign returns to creator with admin notes explaining why
   - **Request Info** -- ask the creator for additional documentation

### Campaign Status Management

For existing campaigns, admins can:

- **Pause** -- temporarily hide from feed, stop accepting donations
- **Resume** -- reactivate a paused campaign
- **Freeze** -- hide from feed, halt donations, lock withdrawals (for suspected fraud)
- **Cancel** -- permanently close the campaign

All status changes are logged in the audit trail with admin notes.

---

## 4. User Management

Navigate to **Admin** > **Users** to manage platform users.

### User List

- **Search** by name or phone number
- **Filter** by: verification status, admin role, ban status
- View key stats per user: campaign count, total donated

### User Actions

Click on a user to see full details, then:

- **Toggle Admin** -- grant or revoke admin privileges (requires confirmation)
- **Toggle Ban** -- ban or unban a user
  - Banned users cannot log in, create campaigns, or donate
  - Provide a reason when banning (logged in audit trail)
- **Edit Profile** -- admin can update any user field:
  - Display name, phone number, date of birth, gender
  - Language preference
  - Verification status (manually approve/reject)
  - Bio

### User Verification

When a user uploads identity documents:

1. Documents appear in **Admin** > **Verifications**
2. Review the uploaded document (passport, national ID)
3. OCR/AI processing may auto-extract text and provide a confidence score
4. Approve or reject the verification
5. On approval, the user's `verification_status` changes to `approved` and `is_verified` becomes `true`

---

## 5. Withdrawal Processing

Navigate to **Admin** > **Withdrawals** to manage payout requests.

### Withdrawal Queue

Each withdrawal request shows:
- Organizer name and campaign title
- Requested amount
- Platform fee (deducted from the amount)
- Net payout amount
- Withdrawal account details (masked card number)
- Status: Pending, Approved, Rejected, Completed

### Review Process

1. Click a pending withdrawal to open the detail view
2. **Name Comparison** -- the system shows side-by-side:
   - **Organizer's verified legal name** (from their KYC documents)
   - **Cardholder name** (on the withdrawal account)
   - Verify these match (or are acceptably close)
3. Verify the campaign has sufficient balance
4. Take action:
   - **Approve** -- marks the withdrawal as approved, ready for payout
   - **Reject** -- returns to organizer with notes explaining why

### Completing a Withdrawal

After approving, process the manual bank transfer, then:

1. Open the approved withdrawal
2. Click **Mark as Completed**
3. Enter the **transaction reference** (from the bank transfer confirmation)
4. Add optional admin notes
5. The withdrawal is marked as `completed`

The organizer can see the transaction reference in their withdrawal history.

---

## 6. Escrow & Ledger Management

Navigate to **Admin** > **Escrow** for the virtual ledger view.

### Summary Cards

- **Total Escrow Balance** -- total funds held across all campaigns
- **Total Platform Revenue** -- sum of all platform fees collected
- **Total Withdrawn** -- sum of all completed withdrawals

### Per-Campaign Balances

A table showing each campaign's financial state:

| Column | Description |
|--------|-------------|
| Campaign | Title (linked to campaign detail) |
| Total Donated | Sum of completed donations |
| Total Fees | Platform fees deducted |
| Total Withdrawn | Completed payouts |
| Available Balance | What the organizer can withdraw |
| Progress | Visual progress bar |

### Balance Formula

```
available_balance = total_donated - total_withdrawn - pending_withdrawals
```

This is computed from the `donations`, `withdrawals`, and `platform_fees` tables -- there is no separate escrow table.

---

## 7. Platform Settings

Navigate to **Admin** > **Settings** to configure platform-wide settings.

### Configurable Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Platform Fee %** | Percentage charged on each donation | 1% |
| **Master Card Number** | The platform's card for receiving fees (encrypted at rest) | -- |
| **Master Card Holder Name** | Name on the platform's card | -- |

### Updating Settings

1. Enter new values in the form
2. Card numbers are displayed masked (`8600 **** **** 1234`)
3. Changes take effect immediately (fee cache is invalidated)
4. All settings changes are logged in the audit trail

---

## 8. Audit Log

Navigate to **Admin** > **Audit Log** to review all administrative actions.

### Audit Entries

Every admin action is recorded with:

- **Admin name** -- who performed the action
- **Action type** -- e.g., `verify_campaign`, `ban_user`, `approve_withdrawal`, `update_settings`
- **Target type** -- campaign, user, withdrawal, or settings
- **Target ID** -- the affected entity
- **Details** -- JSON metadata (e.g., previous values, reason, notes)
- **Timestamp**

### Filtering

- By action type
- By target type (campaign, user, withdrawal, settings)
- By admin (who performed the action)
- By date range

### Immutability

Audit log entries are append-only. They cannot be edited or deleted, even by admins. This ensures a complete accountability trail.

---

## 9. Verification Document Review

Navigate to **Admin** > **Verifications** to review KYC documents.

### Document Queue

Filter by status: `pending`, `approved`, `rejected`

Each entry shows:
- User name and phone
- Document type (identity, passport, national ID, driver's license)
- Upload date
- AI processing status and confidence score

### Review Process

1. Click on a document to preview it
2. The system may show AI-extracted text (OCR) for reference
3. Compare the document against the user's profile information
4. Enter the user's legal name (first and last) as it appears on the document
5. Take action:
   - **Approve** -- user's verification status is updated
   - **Reject** -- provide notes explaining why (e.g., "Document is blurry", "Name does not match")

### AI-Assisted Processing

The system uses Tesseract.js OCR to:
- Extract text from uploaded documents
- Provide a confidence score
- Auto-flag documents that may need closer review

AI results are advisory only. The admin makes the final decision.
