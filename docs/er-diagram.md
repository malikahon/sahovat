# Sahovat Database ER Diagram

> 16 tables across 7 migrations. PostgreSQL 16 with pgcrypto extension.

```mermaid
erDiagram
    users {
        uuid id PK
        varchar phone_number UK
        varchar display_name
        varchar password_hash
        date date_of_birth
        varchar gender
        text[] preferred_categories
        boolean is_verified
        boolean is_admin
        boolean is_banned
        varchar verification_status
        varchar oneid_id UK
        timestamptz oneid_verified_at
        varchar language_preference
        text bio
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    campaigns {
        uuid id PK
        uuid creator_id FK
        varchar title
        text description
        varchar category
        bigint goal_amount
        bigint current_amount
        varchar status
        varchar region
        boolean is_verified
        date end_date
        text cover_image_url
        timestamptz created_at
        timestamptz updated_at
    }

    campaign_documents {
        uuid id PK
        uuid campaign_id FK
        varchar document_type
        text file_url
        varchar file_name
        integer file_size
        varchar mime_type
        boolean is_private
        text notes
        timestamptz uploaded_at
    }

    donations {
        uuid id PK
        uuid campaign_id FK
        uuid donor_id FK
        bigint amount
        bigint platform_fee
        bigint net_amount
        varchar payment_provider
        varchar payment_transaction_id UK
        varchar status
        boolean is_anonymous
        varchar donor_display_name
        text note
        timestamptz created_at
        timestamptz completed_at
    }

    donation_receipts {
        uuid id PK
        uuid donation_id FK_UK
        text file_url
        timestamptz generated_at
    }

    withdrawal_accounts {
        uuid id PK
        uuid user_id FK
        varchar provider
        text account_number_encrypted
        varchar account_holder_name
        boolean is_primary
        boolean is_verified
        timestamptz created_at
        timestamptz updated_at
    }

    withdrawals {
        uuid id PK
        uuid campaign_id FK
        uuid organizer_id FK
        uuid withdrawal_account_id FK
        bigint amount
        bigint platform_fee
        bigint net_amount
        varchar status
        varchar card_number_masked
        varchar cardholder_name
        text admin_notes
        varchar transaction_reference
        timestamptz created_at
        timestamptz reviewed_at
        timestamptz completed_at
        timestamptz updated_at
    }

    platform_fees {
        uuid id PK
        uuid donation_id FK
        uuid withdrawal_id FK
        varchar fee_type
        bigint amount
        timestamptz created_at
    }

    admin_actions {
        uuid id PK
        uuid admin_id FK
        varchar action_type
        varchar target_type
        uuid target_id
        jsonb details
        timestamptz created_at
    }

    admin_settings {
        uuid id PK
        text master_card_number_encrypted
        varchar master_card_holder_name
        numeric platform_fee_percentage
        timestamptz updated_at
        uuid updated_by FK
    }

    user_events {
        uuid id PK
        uuid user_id FK
        varchar session_id
        varchar event_type
        uuid campaign_id FK
        jsonb metadata
        timestamptz created_at
    }

    user_category_scores {
        uuid id PK
        uuid user_id FK
        varchar category
        numeric score
        timestamptz last_interaction_at
        timestamptz updated_at
    }

    recurring_donations {
        uuid id PK
        uuid donor_id FK
        uuid campaign_id FK
        varchar category
        bigint amount
        varchar frequency
        varchar payment_provider
        varchar status
        date next_charge_date
        date last_charge_date
        integer failure_count
        timestamptz created_at
        timestamptz updated_at
    }

    payme_transactions {
        uuid id PK
        varchar payme_id UK
        uuid donation_id FK
        smallint state
        bigint amount
        smallint reason
        bigint create_time
        bigint perform_time
        bigint cancel_time
        timestamptz created_at
    }

    saved_cards {
        uuid id PK
        uuid user_id FK
        text card_token
        varchar card_number_masked
        varchar card_expire
        varchar card_type
        boolean is_default
        boolean is_verified
        timestamptz created_at
        timestamptz updated_at
    }

    verification_documents {
        uuid id PK
        uuid user_id FK
        varchar document_type
        text file_url
        varchar original_filename
        varchar status
        uuid reviewer_id FK
        text reviewer_notes
        varchar legal_first_name
        varchar legal_last_name
        varchar ai_status
        real ai_confidence
        text ai_extracted_text
        timestamptz ai_processed_at
        timestamptz uploaded_at
        timestamptz reviewed_at
    }

    %% Relationships
    users ||--o{ campaigns : "creates"
    users ||--o{ donations : "donates"
    users ||--o{ withdrawal_accounts : "owns"
    users ||--o{ withdrawals : "requests"
    users ||--o{ user_events : "generates"
    users ||--o{ user_category_scores : "has"
    users ||--o{ recurring_donations : "subscribes"
    users ||--o{ saved_cards : "saves"
    users ||--o{ verification_documents : "uploads"
    users ||--o{ admin_actions : "performs"

    campaigns ||--o{ campaign_documents : "has"
    campaigns ||--o{ donations : "receives"
    campaigns ||--o{ withdrawals : "funds"
    campaigns ||--o{ recurring_donations : "targets"
    campaigns ||--o{ user_events : "tracked_on"

    donations ||--o| donation_receipts : "has"
    donations ||--o{ platform_fees : "generates_fee"
    donations ||--o| payme_transactions : "processed_by"

    withdrawals ||--o{ platform_fees : "generates_fee"
    withdrawal_accounts ||--o{ withdrawals : "used_for"

    users ||--o| admin_settings : "updates"
    users ||--o{ verification_documents : "reviews"
```

## Table Summary

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `users` | Core | User accounts (donors, organizers, admins) |
| `campaigns` | Core | Fundraising campaigns |
| `campaign_documents` | Core | Supporting documents for campaigns (medical reports, IDs) |
| `donations` | Core | Individual donation records |
| `donation_receipts` | Core | PDF receipt metadata (1:1 with donations) |
| `withdrawal_accounts` | Core | Organizer bank/card accounts (encrypted) |
| `withdrawals` | Core | Payout requests from organizers |
| `platform_fees` | Financial | Fee records (from donations and withdrawals) |
| `admin_actions` | Audit | Append-only admin action log |
| `admin_settings` | Config | Singleton: platform fee %, master card (encrypted) |
| `user_events` | Analytics | Behavioral event tracking (high-write) |
| `user_category_scores` | Analytics | Per-user category affinity scores |
| `recurring_donations` | Core | Recurring donation subscriptions |
| `payme_transactions` | Payment | PayMe Merchant API transaction tracking |
| `saved_cards` | Payment | Tokenized payment cards via PayMe Subscribe API |
| `verification_documents` | KYC | Identity verification uploads with AI/OCR processing |

## Key Constraints

- **Singleton enforcement:** `admin_settings` has a unique index on `((true))` ensuring only one row.
- **Exactly-one FK:** `platform_fees` has a CHECK constraint: `num_nonnulls(donation_id, withdrawal_id) = 1`.
- **One default card per user:** `saved_cards` has a unique partial index on `(user_id) WHERE is_default = true`.
- **Unique payment transaction:** `donations.payment_transaction_id` has a unique partial index (non-null only).
- **Category uniqueness:** `user_category_scores` has a UNIQUE constraint on `(user_id, category)`.
- **All UUIDs:** Generated via `pgcrypto`'s `gen_random_uuid()`.
- **Auto-updated timestamps:** `updated_at` columns use `trigger_set_updated_at()` trigger.
