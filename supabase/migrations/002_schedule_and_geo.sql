-- Add precise scheduling timestamps to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- Add geocoded coordinates to job sites
ALTER TABLE job_sites ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE job_sites ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Index for efficient day queries
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_start ON jobs(scheduled_start);
