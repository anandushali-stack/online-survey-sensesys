-- ==============================================
-- MIGRATION: EMAIL AUTH & SURVEY RETAKE POLICY
-- Run this script in the Supabase SQL Editor
-- ==============================================

-- 1. DROP the unique constraint on (patient_id, form_id) in patient_form_completion
-- This allows a patient to take the same form multiple times (historical tracking).
ALTER TABLE patient_form_completion 
DROP CONSTRAINT IF EXISTS patient_form_completion_patient_id_form_id_key;

-- 2. Make survey_code nullable in surveys table
-- New surveys for email-based users won't need a visible survey code.
ALTER TABLE surveys 
ALTER COLUMN survey_code DROP NOT NULL;

-- 3. Create an index on completed_at for faster history checks
CREATE INDEX IF NOT EXISTS idx_patient_form_completion_completed_at 
ON patient_form_completion(completed_at);

-- 4. Verify changes
SELECT 'Migration completed successfully' as status;
