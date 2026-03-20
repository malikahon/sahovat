-- ============================================================
-- Migration 007: Verification AI & Legal Name Fields
-- Adds legal name fields (user-provided at upload time) and AI/OCR
-- processing columns to verification_documents.
-- ============================================================

ALTER TABLE verification_documents
  -- User-provided legal name at time of upload (must match document)
  ADD COLUMN IF NOT EXISTS legal_first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS legal_last_name  VARCHAR(100),
  -- document_type already exists but only allows 'identity'|'passport'|'drivers_license'|'other'
  -- Widen constraint to include 'national_id'
  ADD COLUMN IF NOT EXISTS ai_status VARCHAR(20) DEFAULT 'pending'
    CHECK (ai_status IN ('pending', 'auto_approved', 'auto_rejected', 'needs_review')),
  ADD COLUMN IF NOT EXISTS ai_confidence   REAL,
  ADD COLUMN IF NOT EXISTS ai_extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS ai_processed_at  TIMESTAMPTZ;

-- Update document_type constraint to allow 'national_id' in addition to existing values
ALTER TABLE verification_documents
  DROP CONSTRAINT IF EXISTS verification_documents_document_type_check;

ALTER TABLE verification_documents
  ADD CONSTRAINT verification_documents_document_type_check
    CHECK (document_type IN ('identity', 'passport', 'national_id', 'drivers_license', 'other'));

CREATE INDEX IF NOT EXISTS idx_verification_documents_ai_status
  ON verification_documents(ai_status);
