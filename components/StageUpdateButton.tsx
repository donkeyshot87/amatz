'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canCompleteStage } from '@/lib/permissions'
import { UserRole, StageStatus } from '@/lib/types'

interface Props {
  stageId: string
  stageNumber: number
  currentStatus: StageStatus
  ownerId: string | null
  currentUserId: string
  currentUserRole: UserRole
  billingPct: number
  onUpdated: (message: string) => void
}

const STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: 'pending', label: 'ממתין' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'blocked', label: 'חסום' },
  { value: 'completed', label: 'הושלם' },
]

export function StageUpdateButton({
  stageId, stageNumber, currentStatus, ownerId,
  currentUserId, currentUserRole, billingPct, onUpdated
}: Props) {
  const [loading, setLoading] = useState(false)
  const isOwner = ownerId === currentUserId

  if (!canCompleteStage(currentUserRole, isOwner, stageNumber)) {
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        currentStatus === 'completed' ? 'bg-green-100 text-green-700' :
        currentStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
        currentStatus === 'blocked' ? 'bg-red-100 text-red-700' :
        'bg-gray-100 text-gray-600'
      }`}>
        {STATUS_OPTIONS.find(o => o.value === currentStatus)?.label}
      </span>
    )
  }

  if (currentStatus === 'completed') {
    return <span className="text-green-600 text-sm font-medium">✓ הושלם</span>
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
      className="border rounded-lg px-2 py-1 text-sm bg-white"
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
