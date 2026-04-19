import { UserRole } from './types'

export const FINANCE_ROLES: UserRole[] = ['developer', 'admin']
export const HISTORY_ROLES: UserRole[] = ['developer', 'admin']
export const BILLING_ROLES: UserRole[] = ['developer', 'admin', 'finance']
export const CREATE_PROJECT_ROLES: UserRole[] = ['developer', 'admin', 'coordinator', 'production', 'field_manager']
export const UPDATE_STAGE_ROLES: UserRole[] = ['developer', 'admin', 'coordinator', 'production', 'field_manager', 'production_manager']
export const UPLOAD_FILE_ROLES: UserRole[] = ['developer', 'admin', 'coordinator', 'production', 'finance', 'field_manager']
export const UPLOAD_QUOTE_ROLES: UserRole[] = ['developer', 'admin', 'coordinator']
export const USER_MGMT_ROLES: UserRole[] = ['developer', 'admin']

export function can(role: UserRole | undefined | null, permission: UserRole[]): boolean {
  if (!role) return false
  return permission.includes(role)
}

// Salah (field_manager) can only update stages 3, 6, 7
export function canUpdateStage(role: UserRole, stageNumber: number): boolean {
  if (!can(role, UPDATE_STAGE_ROLES)) return false
  if (role === 'field_manager') return [3, 6, 7].includes(stageNumber)
  return true
}

export function canCompleteStage(role: UserRole, isStageOwner: boolean, stageNumber: number): boolean {
  if (can(role, FINANCE_ROLES)) return true
  return isStageOwner && canUpdateStage(role, stageNumber)
}

const STAGE_VIEW_MAP: Record<UserRole, number[]> = {
  developer:          [1, 2, 3, 4, 5, 6, 7],
  admin:              [1, 2, 3, 4, 5, 6, 7],
  coordinator:        [1, 2, 3, 4, 5, 6, 7],
  production:         [2, 4, 5],
  production_manager: [2, 4, 5],
  field_manager:      [3, 6, 7],
  finance:            [1],
}

export function canViewStage(role: UserRole, stageNumber: number): boolean {
  return STAGE_VIEW_MAP[role]?.includes(stageNumber) ?? false
}
