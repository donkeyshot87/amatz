-- Trigger 1: When stage status → 'completed'
--   a) Set completed_at
--   b) Insert into stage_history
--   c) If billing_pct > 0, insert into billing_alerts
--   d) Update project status if stage 7 completed

CREATE OR REPLACE FUNCTION on_stage_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_value numeric;
  v_open_issues    integer;
  v_incomplete_stages integer;
BEGIN
  -- Record any status change in history
  IF NEW.status <> OLD.status THEN
    INSERT INTO stage_history (stage_id, project_id, changed_by, old_status, new_status)
    VALUES (NEW.id, NEW.project_id, NEW.updated_by, OLD.status, NEW.status);
  END IF;

  -- Extra actions only when transitioning TO 'completed'
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at = now();

    -- Create billing alert if billing_pct > 0
    IF NEW.billing_pct > 0 THEN
      SELECT contract_value INTO v_contract_value FROM projects WHERE id = NEW.project_id;
      INSERT INTO billing_alerts (project_id, stage_id, amount)
      VALUES (NEW.project_id, NEW.id, v_contract_value * NEW.billing_pct / 100.0);
    END IF;

    -- If stage 7 completed → update project status
    IF NEW.stage_number = 7 THEN
      SELECT COUNT(*) INTO v_open_issues
        FROM tail_issues
        WHERE project_id = NEW.project_id AND status IN ('open','in_progress');

      IF v_open_issues = 0 THEN
        UPDATE projects SET status = 'closed' WHERE id = NEW.project_id;
      ELSE
        UPDATE projects SET status = 'delivered_with_issues' WHERE id = NEW.project_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER stage_status_changed_trigger
  BEFORE UPDATE ON project_stages
  FOR EACH ROW EXECUTE FUNCTION on_stage_status_changed();

-- Trigger 2: When tail_issue resolved → check if project can close
CREATE OR REPLACE FUNCTION on_tail_issue_resolved()
RETURNS TRIGGER AS $$
DECLARE
  v_open_issues       integer;
  v_incomplete_stages integer;
BEGIN
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
    NEW.resolved_at = now();

    SELECT COUNT(*) INTO v_open_issues
      FROM tail_issues
      WHERE project_id = NEW.project_id
        AND status IN ('open','in_progress')
        AND id <> NEW.id;

    SELECT COUNT(*) INTO v_incomplete_stages
      FROM project_stages
      WHERE project_id = NEW.project_id AND status <> 'completed';

    IF v_open_issues = 0 AND v_incomplete_stages = 0 THEN
      UPDATE projects SET status = 'closed' WHERE id = NEW.project_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tail_issue_resolved_trigger
  BEFORE UPDATE ON tail_issues
  FOR EACH ROW EXECUTE FUNCTION on_tail_issue_resolved();

-- Function: create 7 default stages for a new project
CREATE OR REPLACE FUNCTION create_default_stages(p_project_id uuid)
RETURNS void AS $$
DECLARE
  stage_defs CONSTANT jsonb[] := ARRAY[
    '{"stage_number":1,"stage_name":"חתימה על הסכם","billing_pct":5}'::jsonb,
    '{"stage_number":2,"stage_name":"שרטוטים","billing_pct":5}'::jsonb,
    '{"stage_number":3,"stage_name":"משקוף עיוור","billing_pct":10}'::jsonb,
    '{"stage_number":4,"stage_name":"הזמנת חומר","billing_pct":40}'::jsonb,
    '{"stage_number":5,"stage_name":"ייצור","billing_pct":0}'::jsonb,
    '{"stage_number":6,"stage_name":"התקנה","billing_pct":30}'::jsonb,
    '{"stage_number":7,"stage_name":"מסירה","billing_pct":10}'::jsonb
  ];
  s jsonb;
BEGIN
  FOREACH s IN ARRAY stage_defs LOOP
    INSERT INTO project_stages (project_id, stage_number, stage_name, billing_pct)
    VALUES (p_project_id, (s->>'stage_number')::integer, s->>'stage_name', (s->>'billing_pct')::integer);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
