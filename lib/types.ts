export type UserRole =
  | 'developer'
  | 'admin'
  | 'coordinator'
  | 'production'
  | 'finance'
  | 'field_manager'
  | 'production_manager'

export interface UserProfile {
  id: string
  full_name: string
  role: UserRole
  can_edit: boolean
  created_at: string
}

export type ProjectStatus = 'active' | 'delivered_with_issues' | 'closed'
export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'
export type BillingAlertStatus = 'pending' | 'in_progress' | 'done'
export type TailIssueStatus = 'open' | 'in_progress' | 'resolved'
export type FileType = 'quote' | 'drawing' | 'delivery_note' | 'invoice' | 'other'
export type AdditionStatus = 'active' | 'completed' | 'cancelled'

export interface Project {
  id: string
  project_number: number
  name: string
  client_name: string
  description: string | null
  contract_value: number | null
  cost_estimate: number | null
  planned_delivery_date: string | null
  actual_delivery_date: string | null
  status: ProjectStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectStage {
  id: string
  project_id: string
  stage_number: number
  stage_name: string
  owner_id: string | null
  status: StageStatus
  completed_at: string | null
  notes: string | null
  billing_pct: number
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface StagePulse {
  id: string
  stage_id: string | null
  addition_stage_id: string | null
  project_id: string
  pulse_number: number
  name: string | null
  billing_pct: number
  status: StageStatus
  qty_openings_planned: number | null
  qty_openings_actual: number
  qty_windows_planned: number | null
  qty_windows_actual: number
  qty_showcases_planned: number | null
  qty_showcases_actual: number
  qty_curtain_planned: number | null
  qty_curtain_actual: number
  qty_blind_frame_planned: number | null
  qty_blind_frame_actual: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Addition {
  id: string
  project_id: string
  name: string
  description: string | null
  contract_value: number | null
  status: AdditionStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AdditionStage {
  id: string
  addition_id: string
  stage_number: number
  stage_name: string
  status: StageStatus
  notes: string | null
  billing_pct: number
  completed_at: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface StageHistory {
  id: string
  stage_id: string
  project_id: string
  changed_by: string | null
  old_status: string | null
  new_status: string
  note: string | null
  changed_at: string
}

export interface BillingAlert {
  id: string
  project_id: string
  stage_id: string
  addition_id: string | null
  addition_stage_id: string | null
  amount: number
  status: BillingAlertStatus
  handled_by: string | null
  created_at: string
  project?: Pick<Project, 'name' | 'project_number'>
  stage?: Pick<ProjectStage, 'stage_name' | 'stage_number'>
  addition?: Pick<Addition, 'name'>
  addition_stage?: Pick<AdditionStage, 'stage_name' | 'stage_number'>
}

export interface TailIssue {
  id: string
  project_id: string
  description: string
  reported_by: string | null
  assigned_to: string | null
  status: TailIssueStatus
  resolved_at: string | null
  created_at: string
}

export interface Attachment {
  id: string
  project_id: string
  stage_id: string | null
  addition_stage_id: string | null
  tail_issue_id: string | null
  file_name: string
  file_type: FileType
  storage_path: string
  uploaded_by: string | null
  uploaded_at: string
}
