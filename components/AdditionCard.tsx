'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Addition, AdditionStage, UserRole } from '@/lib/types'
import { STAGE_STATUS_LABELS, formatCurrency } from '@/lib/formatters'
import { can, FINANCE_ROLES } from '@/lib/permissions'

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'ממתין' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'completed',   label: 'הושלם' },
  { value: 'blocked',     label: 'חסום' },
]

interface Props {
  addition: Addition
  stages: AdditionStage[]
  currentUserRole: UserRole
  currentUserId: string
  canEditProp: boolean
  onUpdated: () => void
}

export function AdditionCard({ addition, stages, currentUserRole, currentUserId, canEditProp, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const isFinance = can(currentUserRole, FINANCE_ROLES)
  const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number)
  const completedCount = sorted.filter(s => s.status === 'completed').length

  async function updateStageStatus(stageId: string, newStatus: string, billingPct: number) {
    setLoading(stageId)
    const supabase = createClient()
    await supabase.from('addition_stages').update({ status: newStatus, updated_by: currentUserId }).eq('id', stageId)

    if (newStatus === 'completed' && billingPct > 0 && addition.contract_value) {
      const amount = addition.contract_value * billingPct / 100
      await supabase.from('billing_alerts').insert({
        project_id: addition.project_id,
        stage_id: stageId,
        addition_id: addition.id,
        addition_stage_id: stageId,
        amount,
      })
    }
    setLoading(null)
    onUpdated()
  }

  async function updateNotes(stageId: string, notes: string) {
    const supabase = createClient()
    await supabase.from('addition_stages').update({ notes: notes || null }).eq('id', stageId)
    onUpdated()
  }

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{addition.name}</span>
          <span style={{ marginRight: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{completedCount}/{sorted.length} שלבים</span>
          {isFinance && addition.contract_value != null && (
            <span style={{ fontSize: '0.78rem', color: 'var(--brand)', fontWeight: 600, marginRight: '8px' }}>{formatCurrency(addition.contract_value)}</span>
          )}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map(stage => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', minWidth: '80px' }}>{stage.stage_name}</span>
              {canEditProp ? (
                <select
                  value={stage.status}
                  onChange={e => updateStageStatus(stage.id, e.target.value, stage.billing_pct)}
                  disabled={loading === stage.id}
                  className="input-field"
                  style={{ width: 'auto' }}
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{STAGE_STATUS_LABELS[stage.status]}</span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--brand)' }}>{stage.billing_pct}%</span>
              {canEditProp && (
                <input
                  className="input-field"
                  defaultValue={stage.notes ?? ''}
                  placeholder="הערות..."
                  onBlur={e => updateNotes(stage.id, e.target.value)}
                  style={{ flex: 1 }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
