'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canCompleteStage } from '@/lib/permissions'
import { UserRole, StageStatus } from '@/lib/types'
import { STAGE_STATUS_LABELS } from '@/lib/formatters'

interface Props {
  stageId: string
  stageNumber: number
  currentStatus: StageStatus
  ownerId: string | null
  currentUserId: string
  currentUserRole: UserRole
  billingPct: number
  canEditProp: boolean
  onUpdated: (message: string) => void
}

const STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: 'pending', label: 'ממתין' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'completed', label: 'הושלם' },
  { value: 'blocked', label: 'חסום' },
]

const STATUS_BADGE: Record<string, string> = {
  pending:     'badge badge-closed',
  in_progress: 'badge badge-in-progress',
  completed:   'badge badge-done',
  blocked:     'badge badge-blocked',
}

export function StageUpdateButton({
  stageId, stageNumber, currentStatus, ownerId,
  currentUserId, currentUserRole, billingPct, canEditProp, onUpdated
}: Props) {
  const [loading, setLoading] = useState(false)
  const isOwner = ownerId === currentUserId

  if (!canCompleteStage(currentUserRole, isOwner, stageNumber) || !canEditProp) {
    return (
      <span className={STATUS_BADGE[currentStatus] ?? 'badge badge-closed'}>
        {STAGE_STATUS_LABELS[currentStatus]}
      </span>
    )
  }

  async function updateStatus(newStatus: StageStatus) {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('project_stages')
      .update({ status: newStatus, updated_by: currentUserId })
      .eq('id', stageId)

    let msg = 'הסטטוס עודכן'
    if (newStatus === 'completed' && billingPct > 0) {
      msg = `השלב הושלם — נוצרה התראת גבייה למירי (${billingPct}%)`
    } else if (newStatus === 'completed') {
      msg = 'השלב הושלם'
    }
    onUpdated(msg)
    setLoading(false)
  }

  return (
    <select
      value={currentStatus}
      onChange={e => updateStatus(e.target.value as StageStatus)}
      disabled={loading}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-mid)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        fontSize: '0.78rem',
        padding: '0.3rem 0.6rem',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        outline: 'none',
      }}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
