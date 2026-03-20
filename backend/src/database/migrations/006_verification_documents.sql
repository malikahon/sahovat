-- ============================================================
-- Migration 006: Verification Documents
-- Stores KYC document uploads submitted by users for admin review.
-- ============================================================

CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL DEFAULT 'identity'
    CHECK (document_type IN ('identity', 'passport', 'drivers_license', 'other')),
  file_url TEXT NOT NULL,
  original_filename VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES users(id),
  reviewer_notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_verification_documents_user ON verification_documents(user_id);
CREATE INDEX idx_verification_documents_status ON verification_documents(status);
