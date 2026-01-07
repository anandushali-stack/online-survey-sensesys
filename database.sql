-- FINAL DATABASE SETUP - Hospital Survey System
-- This is the complete, working database schema
-- Run this entire script in Supabase SQL Editor

-- ==============================================
-- STEP 1: DROP EXISTING TABLES (if any)
-- ==============================================
DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS points_ledger CASCADE;
DROP TABLE IF EXISTS patient_form_completion CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;
DROP TABLE IF EXISTS survey_questions CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- ==============================================
-- STEP 2: CREATE EXTENSIONS
-- ==============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- STEP 3: CREATE ALL TABLES
-- ==============================================

-- Patients table
CREATE TABLE patients (
    uhid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    mobile varchar(15) UNIQUE,
    email varchar(100) UNIQUE,
    patient_code varchar UNIQUE NOT NULL,
    hospital_uhid varchar(50) NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Ensure legacy databases gain the `email` column if missing
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email varchar(100) UNIQUE;

-- Survey questions table
CREATE TABLE survey_questions (
    id serial PRIMARY KEY,
    question_text text NOT NULL,
    type varchar(20) NOT NULL DEFAULT 'rating',
    options jsonb,
    form_id varchar(10) NOT NULL DEFAULT '1',
    created_at timestamp with time zone DEFAULT now()
);

-- Surveys table
CREATE TABLE surveys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_code varchar(10) UNIQUE NOT NULL,
    uhid uuid REFERENCES patients(uhid) ON DELETE CASCADE,
    form_id varchar(10) NOT NULL DEFAULT '1',
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Survey responses table
CREATE TABLE survey_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE,
    question_id int REFERENCES survey_questions(id) ON DELETE CASCADE,
    answer text NOT NULL,
    points int DEFAULT 0,
    answered_at timestamp with time zone DEFAULT now()
);

-- Points ledger table (with all required columns)
CREATE TABLE points_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(uhid) ON DELETE CASCADE,
    survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE,
    points_earned int DEFAULT 0,
    points_redeemed int DEFAULT 0,
    record_at timestamp with time zone DEFAULT now(),
    redemption_type varchar(20) DEFAULT 'points',
    redemption_reason text,
    money_equivalent numeric(10, 2) DEFAULT 0.00
);

-- Form completion tracking table
CREATE TABLE patient_form_completion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(uhid) ON DELETE CASCADE,
    form_id varchar(10) NOT NULL,
    completed_at timestamp with time zone DEFAULT now(),
    survey_id uuid REFERENCES surveys(id),
    UNIQUE(patient_id, form_id)
);

-- Admin users table
CREATE TABLE admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username varchar(50) UNIQUE NOT NULL,
    password varchar(100) NOT NULL,
    email varchar(100),
    created_at timestamp with time zone DEFAULT now()
);

-- ==============================================
-- STEP 4: INSERT ADMIN USER
-- ==============================================
INSERT INTO admin_users (username, password, email) VALUES 
('admin', 'admin123', 'admin@hospital.com')
ON CONFLICT (username) DO NOTHING;

-- ==============================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ==============================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_form_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 6: CREATE RLS POLICIES
-- ==============================================

-- Patients policies
CREATE POLICY "Allow public read access to patients" ON patients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to patients" ON patients FOR INSERT WITH CHECK (true);
-- Allow updating patients (needed for hospital_uhid assignment)
CREATE POLICY "Allow public update access to patients"
ON patients
FOR UPDATE
USING (true)
WITH CHECK (true);


-- Surveys policies
CREATE POLICY "Allow public read access to surveys" ON surveys FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to surveys" ON surveys FOR INSERT WITH CHECK (true);

-- Survey questions policies
CREATE POLICY "Allow public read access to survey_questions" ON survey_questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to survey_questions" ON survey_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to survey_questions" ON survey_questions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to survey_questions" ON survey_questions FOR DELETE USING (true);

-- Survey responses policies
CREATE POLICY "Allow public read access to survey_responses" ON survey_responses FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to survey_responses" ON survey_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access to survey_responses" ON survey_responses FOR DELETE USING (true);

-- Points ledger policies
CREATE POLICY "Allow public read access to points_ledger" ON points_ledger FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to points_ledger" ON points_ledger FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to points_ledger" ON points_ledger FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to points_ledger" ON points_ledger FOR DELETE USING (true);

-- Patient form completion policies
CREATE POLICY "Allow public read access to patient_form_completion" ON patient_form_completion FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to patient_form_completion" ON patient_form_completion FOR INSERT WITH CHECK (true);

-- Admin users policies
CREATE POLICY "Allow public access to admin_users" ON admin_users FOR ALL USING (true);

-- ==============================================
-- STEP 7: INSERT SAMPLE SURVEY QUESTIONS
-- ==============================================
INSERT INTO survey_questions (question_text, type, options, form_id) VALUES
-- Form 1: Hospital Services (5 questions)
('How would you rate the overall cleanliness of the hospital?', 'rating', '["1", "2", "3", "4", "5"]', '1'),
('Was the hospital easy to navigate?', 'rating', '["1", "2", "3", "4", "5"]', '1'),
('How satisfied are you with the waiting area comfort?', 'rating', '["1", "2", "3", "4", "5"]', '1'),
('Rate the availability of basic facilities (restrooms, water, etc.)', 'rating', '["1", "2", "3", "4", "5"]', '1'),
('How would you rate the overall hospital environment?', 'rating', '["1", "2", "3", "4", "5"]', '1'),

-- Form 2: Staff & Care Quality (5 questions)
('How would you rate the politeness of the staff?', 'rating', '["1", "2", "3", "4", "5"]', '2'),
('Rate the staff responsiveness to your needs', 'rating', '["1", "2", "3", "4", "5"]', '2'),
('How satisfied are you with the information provided by staff?', 'rating', '["1", "2", "3", "4", "5"]', '2'),
('Rate the overall quality of customer service', 'rating', '["1", "2", "3", "4", "5"]', '2'),
('How would you rate the staff professionalism?', 'rating', '["1", "2", "3", "4", "5"]', '2'),

-- Form 3: Facilities & Environment (5 questions)
('Rate the air conditioning and ventilation', 'rating', '["1", "2", "3", "4", "5"]', '3'),
('How satisfied are you with the noise levels?', 'rating', '["1", "2", "3", "4", "5"]', '3'),
('Rate the seating arrangements and comfort', 'rating', '["1", "2", "3", "4", "5"]', '3'),
('How would you rate the lighting in the hospital?', 'rating', '["1", "2", "3", "4", "5"]', '3'),
('Rate the overall comfort of the facilities', 'rating', '["1", "2", "3", "4", "5"]', '3'),

-- Form 4: Treatment Experience (5 questions)
('How would you rate your overall treatment experience?', 'rating', '["1", "2", "3", "4", "5"]', '4'),
('Rate the effectiveness of your treatment', 'rating', '["1", "2", "3", "4", "5"]', '4'),
('How satisfied are you with the treatment timeline?', 'rating', '["1", "2", "3", "4", "5"]', '4'),
('Rate the pain management during treatment', 'rating', '["1", "2", "3", "4", "5"]', '4'),
('How would you rate the medical equipment used?', 'rating', '["1", "2", "3", "4", "5"]', '4'),

-- Form 5: Doctor Consultation (5 questions)
('How would you rate your doctor consultation experience?', 'rating', '["1", "2", "3", "4", "5"]', '5'),
('Rate the doctor listening skills', 'rating', '["1", "2", "3", "4", "5"]', '5'),
('How clear was the diagnosis explanation?', 'rating', '["1", "2", "3", "4", "5"]', '5'),
('Rate the doctor professionalism', 'rating', '["1", "2", "3", "4", "5"]', '5'),
('How satisfied are you with the consultation time?', 'rating', '["1", "2", "3", "4", "5"]', '5'),

-- Form 6: Recovery & Follow-up (5 questions)
('How would you rate the post-treatment care instructions?', 'rating', '["1", "2", "3", "4", "5"]', '6'),
('Rate the follow-up appointment scheduling', 'rating', '["1", "2", "3", "4", "5"]', '6'),
('How satisfied are you with the recovery process?', 'rating', '["1", "2", "3", "4", "5"]', '6'),
('Rate the medication instructions clarity', 'rating', '["1", "2", "3", "4", "5"]', '6'),
('How would you rate the post-treatment support?', 'rating', '["1", "2", "3", "4", "5"]', '6');

-- ==============================================
-- STEP 8: CREATE INDEXES FOR PERFORMANCE
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_survey_questions_form 
ON survey_questions(form_id);

CREATE INDEX IF NOT EXISTS idx_patient_form_completion_patient 
ON patient_form_completion(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_form_completion_form 
ON patient_form_completion(patient_id, form_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_patient 
ON points_ledger(patient_id);

CREATE INDEX IF NOT EXISTS idx_surveys_patient 
ON surveys(uhid);

-- ==============================================
-- STEP 9: VERIFY SETUP
-- ==============================================
SELECT 'Database setup completed successfully!' as status;
SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
SELECT 'Question count by form:' as info;
SELECT form_id, COUNT(*) as question_count
FROM survey_questions 
GROUP BY form_id 
ORDER BY form_id;

