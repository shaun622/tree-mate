-- ============================================================
-- MIGRATION: Pipeline Restructure
-- ============================================================

-- 1. Migrate on_hold jobs before changing constraint
UPDATE jobs SET status = 'scheduled' WHERE status = 'on_hold';

-- 2. Drop old status constraint, add expanded one, change default
ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('enquiry','site_visit','quoted','approved','scheduled','in_progress','completed','invoiced','paid'));
ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'enquiry';

-- 3. Add new columns to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS site_visit_date DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS site_visit_time TIME;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_duration TEXT DEFAULT 'half_day';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS equipment_needed TEXT[] DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS time_spent_hours NUMERIC;

-- 4. Add priority check constraint
DO $$ BEGIN
  ALTER TABLE jobs ADD CONSTRAINT jobs_priority_check CHECK (priority IN ('normal','urgent','emergency'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Add duration check constraint
DO $$ BEGIN
  ALTER TABLE jobs ADD CONSTRAINT jobs_duration_check CHECK (estimated_duration IN ('half_day','full_day','two_days','three_plus'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Add new columns to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS inclusions TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exclusions TEXT;

-- 7. Add job_id to job_photos + make job_report_id nullable
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs;
ALTER TABLE job_photos ALTER COLUMN job_report_id DROP NOT NULL;

-- 8. Add crew columns to staff_members
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid();
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT 'pending';
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

DO $$ BEGIN
  ALTER TABLE staff_members ADD CONSTRAINT staff_invite_check CHECK (invite_status IN ('pending','accepted'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Add columns to activity_feed
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS link_to TEXT;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 10. Update RLS policies for job_photos to support direct job attachment
DROP POLICY IF EXISTS "photos_select" ON job_photos;
DROP POLICY IF EXISTS "photos_insert" ON job_photos;
DROP POLICY IF EXISTS "photos_update" ON job_photos;
DROP POLICY IF EXISTS "photos_delete" ON job_photos;

CREATE POLICY "photos_select" ON job_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id())
  OR EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_id AND j.business_id = get_user_business_id())
);
CREATE POLICY "photos_insert" ON job_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id())
  OR EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_id AND j.business_id = get_user_business_id())
);
CREATE POLICY "photos_update" ON job_photos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id())
  OR EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_id AND j.business_id = get_user_business_id())
);
CREATE POLICY "photos_delete" ON job_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id())
  OR EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_id AND j.business_id = get_user_business_id())
);

-- 11. Add new indexes
CREATE INDEX IF NOT EXISTS idx_jobs_business_status ON jobs(business_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_status ON jobs(scheduled_date) WHERE status IN ('scheduled','in_progress');
CREATE INDEX IF NOT EXISTS idx_jobs_site_visit ON jobs(site_visit_date) WHERE status = 'site_visit';
CREATE INDEX IF NOT EXISTS idx_quotes_job ON quotes(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_invite ON staff_members(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_unread ON activity_feed(business_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_job_photos_job ON job_photos(job_id) WHERE job_id IS NOT NULL;
