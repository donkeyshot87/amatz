-- 004_v2.sql — Amatz V2 schema additions

-- stage_pulses: sub-units of stages 3 (blind frame) and 6 (installation)
CREATE TABLE stage_pulses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id     uuid NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pulse_number integer NOT NULL,
  name         text,
  billing_pct  integer NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','completed','blocked')),
  -- Installation (stage 6) category quantities
  qty_openings_planned  integer,
  qty_openings_actual   integer DEFAULT 0,
  qty_windows_planned   integer,
  qty_windows_actual    integer DEFAULT 0,
  qty_showcases_planned integer,
  qty_showcases_actual  integer DEFAULT 0,
  qty_curtain_planned   integer,
  qty_curtain_actual    integer DEFAULT 0,
  -- Blind frame (stage 3) category quantity
  qty_blind_frame_planned integer,
  qty_blind_frame_actual  integer DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(stage_id, pulse_number)
);

CREATE TRIGGER pulses_updated_at BEFORE UPDATE ON stage_pulses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- additions: sub-projects linked to a parent project
CREATE TABLE additions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text,
  contract_value numeric,
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','completed','cancelled')),
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TRIGGER additions_updated_at BEFORE UPDATE ON additions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- addition_stages: the 5 stages of each addition
CREATE TABLE addition_stages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addition_id  uuid NOT NULL REFERENCES additions(id) ON DELETE CASCADE,
  stage_number integer NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
  stage_name   text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','completed','blocked')),
  notes        text,
  billing_pct  integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(addition_id, stage_number)
);

CREATE TRIGGER addition_stages_updated_at BEFORE UPDATE ON addition_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- billing_alerts: add nullable references for addition-stage billing
ALTER TABLE billing_alerts ADD COLUMN addition_id uuid REFERENCES additions(id);
ALTER TABLE billing_alerts ADD COLUMN addition_stage_id uuid REFERENCES addition_stages(id);

-- attachments: add nullable reference to a tail_issue (גמר)
ALTER TABLE attachments ADD COLUMN tail_issue_id uuid REFERENCES tail_issues(id);

-- user_profiles: add can_edit flag (default true = view+edit)
ALTER TABLE user_profiles ADD COLUMN can_edit boolean NOT NULL DEFAULT true;

-- RLS for stage_pulses
ALTER TABLE stage_pulses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulses_all_view" ON stage_pulses
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "pulses_insert" ON stage_pulses
  FOR INSERT WITH CHECK (
    current_user_role() IN ('developer','admin')
  );

CREATE POLICY "pulses_update" ON stage_pulses
  FOR UPDATE USING (
    current_user_role() IN ('developer','admin','coordinator','production','field_manager','production_manager')
  );

CREATE POLICY "pulses_delete" ON stage_pulses
  FOR DELETE USING (
    current_user_role() IN ('developer','admin')
  );

-- RLS for additions
ALTER TABLE additions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "additions_all_view" ON additions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "additions_insert" ON additions
  FOR INSERT WITH CHECK (current_user_role() IN ('developer','admin'));

CREATE POLICY "additions_update" ON additions
  FOR UPDATE USING (current_user_role() IN ('developer','admin'));

CREATE POLICY "additions_delete" ON additions
  FOR DELETE USING (current_user_role() IN ('developer','admin'));

-- RLS for addition_stages
ALTER TABLE addition_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addition_stages_all_view" ON addition_stages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "addition_stages_insert" ON addition_stages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "addition_stages_update" ON addition_stages
  FOR UPDATE USING (
    current_user_role() IN ('developer','admin','coordinator','production','field_manager','production_manager')
  );
