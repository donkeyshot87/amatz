-- 006_addition_pulses.sql
-- 1. Allow addition_stages to mirror the 7 project stages
ALTER TABLE addition_stages DROP CONSTRAINT addition_stages_stage_number_check;
ALTER TABLE addition_stages ADD CONSTRAINT addition_stages_stage_number_check
  CHECK (stage_number BETWEEN 1 AND 7);

-- 2. Allow stage_pulses to reference addition_stages instead of (or in addition to) project_stages
ALTER TABLE stage_pulses ALTER COLUMN stage_id DROP NOT NULL;
ALTER TABLE stage_pulses ADD COLUMN addition_stage_id uuid REFERENCES addition_stages(id) ON DELETE CASCADE;

-- Ensure each pulse belongs to exactly one parent (project stage or addition stage)
ALTER TABLE stage_pulses ADD CONSTRAINT pulses_one_parent
  CHECK (
    (stage_id IS NOT NULL AND addition_stage_id IS NULL) OR
    (stage_id IS NULL AND addition_stage_id IS NOT NULL)
  );

-- Unique pulse number per addition stage
ALTER TABLE stage_pulses DROP CONSTRAINT stage_pulses_stage_id_pulse_number_key;
-- Unique per project-stage (only when stage_id is set)
CREATE UNIQUE INDEX stage_pulses_project_stage_unique
  ON stage_pulses (stage_id, pulse_number)
  WHERE stage_id IS NOT NULL;
-- Unique per addition-stage (only when addition_stage_id is set)
CREATE UNIQUE INDEX stage_pulses_addition_stage_unique
  ON stage_pulses (addition_stage_id, pulse_number)
  WHERE addition_stage_id IS NOT NULL;

-- RLS: allow update on addition-stage pulses for same roles as project-stage pulses
-- (existing pulses_update policy already covers all rows; no change needed)
