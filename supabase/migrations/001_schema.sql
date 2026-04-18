-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- user_profiles (extends auth.users)
CREATE TABLE user_profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role      text NOT NULL CHECK (role IN ('developer','admin','coordinator','production','finance','field_manager','production_manager')),
  created_at timestamptz DEFAULT now()
);

-- projects
CREATE TABLE projects (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number        serial UNIQUE,
  name                  text NOT NULL,
  client_name           text NOT NULL,
  description           text,
  contract_value        numeric,
  cost_estimate         numeric,
  planned_delivery_date date,
  actual_delivery_date  date,
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active','delivered_with_issues','closed')),
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- project_stages
CREATE TABLE project_stages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_number integer NOT NULL CHECK (stage_number BETWEEN 1 AND 7),
  stage_name   text NOT NULL,
  owner_id     uuid REFERENCES auth.users(id),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','blocked')),
  completed_at timestamptz,
  notes        text,
  billing_pct  integer NOT NULL DEFAULT 0,
  updated_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(project_id, stage_number)
);

-- stage_history
CREATE TABLE stage_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id    uuid NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  changed_by  uuid REFERENCES auth.users(id),
  old_status  text,
  new_status  text NOT NULL,
  note        text,
  changed_at  timestamptz DEFAULT now()
);

-- billing_alerts
CREATE TABLE billing_alerts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id   uuid NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
  amount     numeric NOT NULL,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  handled_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- tail_issues
CREATE TABLE tail_issues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  reported_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  resolved_at timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- attachments
CREATE TABLE attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id     uuid REFERENCES project_stages(id),
  file_name    text NOT NULL,
  file_type    text NOT NULL CHECK (file_type IN ('quote','drawing','delivery_note','invoice','other')),
  storage_path text NOT NULL,
  uploaded_by  uuid REFERENCES auth.users(id),
  uploaded_at  timestamptz DEFAULT now()
);

-- time_entries (schema only — v2)
CREATE TABLE time_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
  worker_id    uuid REFERENCES auth.users(id),
  station      text CHECK (station IN ('table','saw','press','yard','packing')),
  started_at   timestamptz,
  ended_at     timestamptz,
  duration_min integer GENERATED ALWAYS AS (
    CAST(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 AS integer)
  ) STORED,
  notes        text
);

-- updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER stages_updated_at BEFORE UPDATE ON project_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_alerts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tail_issues     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries    ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- user_profiles: self read + admin/developer read all
CREATE POLICY "profiles_self_read" ON user_profiles
  FOR SELECT USING (id = auth.uid() OR current_user_role() IN ('admin','developer'));

CREATE POLICY "profiles_admin_write" ON user_profiles
  FOR ALL USING (current_user_role() IN ('admin','developer'));

-- projects: all authenticated can view
CREATE POLICY "projects_all_view" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "projects_create" ON projects
  FOR INSERT WITH CHECK (current_user_role() IN ('developer','admin','coordinator','production','field_manager'));

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (current_user_role() IN ('developer','admin','coordinator','production','field_manager'));

-- project_stages: all authenticated can view
CREATE POLICY "stages_all_view" ON project_stages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stages_insert" ON project_stages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "stages_update" ON project_stages
  FOR UPDATE USING (
    current_user_role() IN ('developer','admin','coordinator','production','field_manager','production_manager')
  );

-- stage_history: admin/developer only for SELECT; authenticated for INSERT
CREATE POLICY "history_admin_only" ON stage_history
  FOR SELECT USING (current_user_role() IN ('admin','developer'));

CREATE POLICY "history_insert_authenticated" ON stage_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- billing_alerts: finance, admin, developer
CREATE POLICY "billing_view" ON billing_alerts
  FOR SELECT USING (current_user_role() IN ('finance','admin','developer'));

CREATE POLICY "billing_insert" ON billing_alerts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "billing_update" ON billing_alerts
  FOR UPDATE USING (current_user_role() IN ('finance','admin','developer'));

-- tail_issues: all authenticated
CREATE POLICY "tail_all_view" ON tail_issues
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tail_insert" ON tail_issues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tail_update" ON tail_issues
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- attachments: all authenticated can view; upload roles can insert
CREATE POLICY "attach_view" ON attachments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "attach_insert" ON attachments
  FOR INSERT WITH CHECK (
    current_user_role() IN ('developer','admin','coordinator','production','finance','field_manager')
  );

-- time_entries: admin/developer only (v2 — no UI yet)
CREATE POLICY "time_admin_only" ON time_entries
  FOR ALL USING (current_user_role() IN ('admin','developer'));
