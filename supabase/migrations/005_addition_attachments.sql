-- 005_addition_attachments.sql
-- Allow attachments to reference addition_stages (in addition to project_stages)

ALTER TABLE attachments ADD COLUMN addition_stage_id uuid REFERENCES addition_stages(id) ON DELETE SET NULL;
