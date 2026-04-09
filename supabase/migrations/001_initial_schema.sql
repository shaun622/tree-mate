-- ============================================================
-- TreePro Initial Schema Migration
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  brand_colour TEXT DEFAULT '#22c55e',
  abn TEXT,
  phone TEXT,
  email TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  next_invoice_number INTEGER DEFAULT 1,
  invoice_prefix TEXT DEFAULT 'INV',
  default_payment_terms_days INTEGER DEFAULT 14,
  bank_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  service_rate NUMERIC,
  billing_frequency TEXT,
  assigned_staff_id UUID,
  pipeline_stage TEXT DEFAULT 'lead' CHECK (pipeline_stage IN ('lead','quoted','active','on_hold','lost')),
  auth_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  address TEXT NOT NULL,
  site_type TEXT DEFAULT 'residential' CHECK (site_type IN ('residential','commercial','rural','council','strata','roadside')),
  site_access TEXT DEFAULT 'easy' CHECK (site_access IN ('easy','moderate','difficult','crane_required')),
  site_area TEXT,
  hazards JSONB DEFAULT '[]',
  notes TEXT,
  regular_maintenance BOOLEAN DEFAULT false,
  maintenance_frequency TEXT CHECK (maintenance_frequency IN ('weekly','fortnightly','monthly','quarterly','biannual','annual')),
  next_due_at TIMESTAMPTZ,
  access_notes TEXT,
  assigned_staff_id UUID,
  route_order INTEGER,
  portal_token UUID DEFAULT gen_random_uuid(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geocoded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'arborist' CHECK (role IN ('arborist','climber','groundsman','operator','manager','owner')),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  client_id UUID REFERENCES clients,
  job_site_id UUID REFERENCES job_sites,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','follow_up','accepted','declined')),
  line_items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  gst NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  scope TEXT,
  terms TEXT,
  token UUID,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  client_id UUID REFERENCES clients,
  job_site_id UUID REFERENCES job_sites,
  quote_id UUID REFERENCES quotes,
  staff_id UUID REFERENCES staff_members,
  job_type TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','on_hold','completed')),
  scheduled_date DATE,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  job_site_id UUID REFERENCES job_sites,
  job_id UUID REFERENCES jobs,
  staff_id UUID REFERENCES staff_members,
  technician_name TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  notes TEXT,
  debris_volume_m3 NUMERIC,
  stump_count INTEGER,
  trees_removed INTEGER,
  trees_pruned INTEGER,
  herbicide_applied BOOLEAN DEFAULT false,
  ground_levelled BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  report_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tree_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID REFERENCES job_reports NOT NULL,
  tree_number INTEGER DEFAULT 1,
  species TEXT,
  diameter_dbh_cm NUMERIC,
  height_m NUMERIC,
  canopy_spread_m NUMERIC,
  health_condition TEXT CHECK (health_condition IN ('healthy','declining','dead','hazardous','storm_damaged')),
  lean_direction TEXT,
  root_system TEXT,
  action_taken TEXT CHECK (action_taken IN ('removed','pruned','lopped','stump_ground','treated','assessed_only')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID REFERENCES job_reports NOT NULL,
  task_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID REFERENCES job_reports NOT NULL,
  equipment_name TEXT NOT NULL,
  hours_used NUMERIC,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID REFERENCES job_reports NOT NULL,
  storage_path TEXT NOT NULL,
  signed_url TEXT,
  tag TEXT DEFAULT 'before' CHECK (tag IN ('before','during','after','hazard','stump','equipment')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('cutting','grinding','chipping','lifting','transport','safety','other')),
  hourly_rate NUMERIC,
  notes TEXT,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, name)
);

CREATE TABLE recurring_job_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  client_id UUID REFERENCES clients,
  job_site_id UUID REFERENCES job_sites,
  job_type TEXT,
  frequency TEXT NOT NULL,
  next_run_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  client_id UUID REFERENCES clients,
  job_id UUID REFERENCES jobs,
  quote_id UUID REFERENCES quotes,
  invoice_number TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  line_items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  gst NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  client_id UUID REFERENCES clients,
  job_site_id UUID REFERENCES job_sites,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'email',
  trigger_type TEXT,
  subject TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  action TEXT DEFAULT 'send_email',
  template_id UUID REFERENCES communication_templates,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_rule_id UUID REFERENCES automation_rules,
  business_id UUID REFERENCES businesses NOT NULL,
  trigger_event TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  client_id UUID REFERENCES clients,
  job_site_id UUID REFERENCES job_sites,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes BIGINT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_type_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#22c55e',
  default_tasks JSONB DEFAULT '[]',
  estimated_duration_minutes INTEGER,
  price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pricing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'each',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_clients_business ON clients(business_id);
CREATE INDEX idx_clients_auth ON clients(auth_user_id);
CREATE INDEX idx_job_sites_business ON job_sites(business_id);
CREATE INDEX idx_job_sites_client ON job_sites(client_id);
CREATE INDEX idx_job_sites_portal ON job_sites(portal_token);
CREATE INDEX idx_job_reports_business ON job_reports(business_id);
CREATE INDEX idx_job_reports_site ON job_reports(job_site_id);
CREATE INDEX idx_job_reports_job ON job_reports(job_id);
CREATE INDEX idx_tree_assessments_report ON tree_assessments(job_report_id);
CREATE INDEX idx_job_tasks_report ON job_tasks(job_report_id);
CREATE INDEX idx_equipment_used_report ON equipment_used(job_report_id);
CREATE INDEX idx_job_photos_report ON job_photos(job_report_id);
CREATE INDEX idx_equipment_library_business ON equipment_library(business_id);
CREATE INDEX idx_staff_business ON staff_members(business_id);
CREATE INDEX idx_quotes_business ON quotes(business_id);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_token ON quotes(token);
CREATE INDEX idx_jobs_business ON jobs(business_id);
CREATE INDEX idx_jobs_client ON jobs(client_id);
CREATE INDEX idx_jobs_site ON jobs(job_site_id);
CREATE INDEX idx_jobs_date ON jobs(scheduled_date);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_recurring_business ON recurring_job_profiles(business_id);
CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_surveys_business ON surveys(business_id);
CREATE INDEX idx_templates_business ON communication_templates(business_id);
CREATE INDEX idx_rules_business ON automation_rules(business_id);
CREATE INDEX idx_rules_trigger ON automation_rules(trigger_event);
CREATE INDEX idx_logs_business ON automation_logs(business_id);
CREATE INDEX idx_documents_business ON documents(business_id);
CREATE INDEX idx_job_types_business ON job_type_templates(business_id);
CREATE INDEX idx_activity_business ON activity_feed(business_id);
CREATE INDEX idx_activity_created ON activity_feed(created_at DESC);
CREATE INDEX idx_pricing_business ON pricing_items(business_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_job_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_type_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_items ENABLE ROW LEVEL SECURITY;

-- Helper to get current user's business id
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT id FROM businesses WHERE owner_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Businesses
CREATE POLICY "biz_select" ON businesses FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "biz_insert" ON businesses FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "biz_update" ON businesses FOR UPDATE USING (owner_id = auth.uid());

-- Macro for business-scoped tables
-- Clients
CREATE POLICY "clients_select" ON clients FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (business_id = get_user_business_id());

-- Job Sites
CREATE POLICY "sites_select" ON job_sites FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "sites_insert" ON job_sites FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "sites_update" ON job_sites FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "sites_delete" ON job_sites FOR DELETE USING (business_id = get_user_business_id());
-- Portal: public read via token
CREATE POLICY "sites_portal" ON job_sites FOR SELECT USING (portal_token IS NOT NULL);

-- Staff
CREATE POLICY "staff_select" ON staff_members FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "staff_insert" ON staff_members FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "staff_update" ON staff_members FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "staff_delete" ON staff_members FOR DELETE USING (business_id = get_user_business_id());

-- Reports
CREATE POLICY "reports_select" ON job_reports FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "reports_insert" ON job_reports FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "reports_update" ON job_reports FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "reports_delete" ON job_reports FOR DELETE USING (business_id = get_user_business_id());

-- Child tables via report join
CREATE POLICY "assess_select" ON tree_assessments FOR SELECT USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "assess_insert" ON tree_assessments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "assess_update" ON tree_assessments FOR UPDATE USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "assess_delete" ON tree_assessments FOR DELETE USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));

CREATE POLICY "tasks_select" ON job_tasks FOR SELECT USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "tasks_insert" ON job_tasks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "tasks_update" ON job_tasks FOR UPDATE USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "tasks_delete" ON job_tasks FOR DELETE USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));

CREATE POLICY "equip_select" ON equipment_used FOR SELECT USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "equip_insert" ON equipment_used FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "equip_update" ON equipment_used FOR UPDATE USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "equip_delete" ON equipment_used FOR DELETE USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));

CREATE POLICY "photos_select" ON job_photos FOR SELECT USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "photos_insert" ON job_photos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "photos_update" ON job_photos FOR UPDATE USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));
CREATE POLICY "photos_delete" ON job_photos FOR DELETE USING (EXISTS (SELECT 1 FROM job_reports r WHERE r.id = job_report_id AND r.business_id = get_user_business_id()));

-- Equipment Library
CREATE POLICY "eqlib_select" ON equipment_library FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "eqlib_insert" ON equipment_library FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "eqlib_update" ON equipment_library FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "eqlib_delete" ON equipment_library FOR DELETE USING (business_id = get_user_business_id());

-- Quotes
CREATE POLICY "quotes_select" ON quotes FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "quotes_insert" ON quotes FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "quotes_update" ON quotes FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "quotes_delete" ON quotes FOR DELETE USING (business_id = get_user_business_id());
-- Public quote via token
CREATE POLICY "quotes_public" ON quotes FOR SELECT USING (token IS NOT NULL);

-- Jobs
CREATE POLICY "jobs_select" ON jobs FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "jobs_insert" ON jobs FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "jobs_update" ON jobs FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "jobs_delete" ON jobs FOR DELETE USING (business_id = get_user_business_id());

-- Recurring
CREATE POLICY "recurring_select" ON recurring_job_profiles FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "recurring_insert" ON recurring_job_profiles FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "recurring_update" ON recurring_job_profiles FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "recurring_delete" ON recurring_job_profiles FOR DELETE USING (business_id = get_user_business_id());

-- Invoices
CREATE POLICY "inv_select" ON invoices FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "inv_insert" ON invoices FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "inv_update" ON invoices FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "inv_delete" ON invoices FOR DELETE USING (business_id = get_user_business_id());

-- Surveys (also allow public insert for portal)
CREATE POLICY "surveys_select" ON surveys FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "surveys_insert" ON surveys FOR INSERT WITH CHECK (true);

-- Templates
CREATE POLICY "tpl_select" ON communication_templates FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "tpl_insert" ON communication_templates FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "tpl_update" ON communication_templates FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "tpl_delete" ON communication_templates FOR DELETE USING (business_id = get_user_business_id());

-- Automation Rules
CREATE POLICY "auto_select" ON automation_rules FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "auto_insert" ON automation_rules FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "auto_update" ON automation_rules FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "auto_delete" ON automation_rules FOR DELETE USING (business_id = get_user_business_id());

-- Automation Logs
CREATE POLICY "logs_select" ON automation_logs FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "logs_insert" ON automation_logs FOR INSERT WITH CHECK (business_id = get_user_business_id());

-- Documents
CREATE POLICY "docs_select" ON documents FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "docs_insert" ON documents FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "docs_update" ON documents FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "docs_delete" ON documents FOR DELETE USING (business_id = get_user_business_id());

-- Job Type Templates
CREATE POLICY "jtt_select" ON job_type_templates FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "jtt_insert" ON job_type_templates FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "jtt_update" ON job_type_templates FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "jtt_delete" ON job_type_templates FOR DELETE USING (business_id = get_user_business_id());

-- Activity Feed
CREATE POLICY "activity_select" ON activity_feed FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "activity_insert" ON activity_feed FOR INSERT WITH CHECK (business_id = get_user_business_id());

-- Pricing Items
CREATE POLICY "pricing_select" ON pricing_items FOR SELECT USING (business_id = get_user_business_id());
CREATE POLICY "pricing_insert" ON pricing_items FOR INSERT WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "pricing_update" ON pricing_items FOR UPDATE USING (business_id = get_user_business_id());
CREATE POLICY "pricing_delete" ON pricing_items FOR DELETE USING (business_id = get_user_business_id());

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_job_sites_updated BEFORE UPDATE ON job_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON staff_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON job_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_recurring_updated BEFORE UPDATE ON recurring_job_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON communication_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_job_types_updated BEFORE UPDATE ON job_type_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pricing_updated BEFORE UPDATE ON pricing_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STORAGE BUCKETS (run in Supabase SQL editor or dashboard)
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('staff-photos', 'staff-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "auth_upload_logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');
CREATE POLICY "public_read_logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "auth_upload_staff" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'staff-photos' AND auth.role() = 'authenticated');
CREATE POLICY "public_read_staff" ON storage.objects FOR SELECT USING (bucket_id = 'staff-photos');
CREATE POLICY "auth_upload_job_photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'job-photos' AND auth.role() = 'authenticated');
CREATE POLICY "public_read_job_photos" ON storage.objects FOR SELECT USING (bucket_id = 'job-photos');
CREATE POLICY "auth_upload_docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "auth_read_docs" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "auth_update_storage" ON storage.objects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_storage" ON storage.objects FOR DELETE USING (auth.role() = 'authenticated');
