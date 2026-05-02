'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Addition, AdditionStage, Attachment, StagePulse, UserRole } from '@/lib/types'
import { STAGE_STATUS_LABELS, formatCurrency } from '@/lib/formatters'
import { StagePanel } from './StagePanel'
import { PulsePanel } from './PulsePanel'
import { StageUpdateButton } from './StageUpdateButton'
import { can, FINANCE_ROLES, canUpdateStage } from '@/lib/permissions'

const STATUS_BADGE: Record<string, string> = {
  pending:     'badge badge-closed',
  in_progress: 'badge badge-in-progress',
  completed:   'badge badge-done',
  blocked:     'badge badge-blocked',
}

// Pulse stages mirror project: 3=משקוף עיוור, 5=ייצור מוגמר, 6=התקנה
const PULSE_STAGE_NUMBERS = [3, 5, 6]

interface Props {
  addition: Addition
  stages: AdditionStage[]
  pulses: StagePulse[]
  attachments: Attachment[]
  currentUserRole: UserRole
  currentUserId: string
  canEditProp: boolean
  onUpdated: () => void
}

export function AdditionCard({ addition, stages, pulses, attachments, currentUserRole, currentUserId, canEditProp, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const [openStageId, setOpenStageId] = useState<string | null>(null)
  const [loadingStage, setLoadingStage] = useState<string | null>(null)
  const isFinance = can(currentUserRole, FINANCE_ROLES)
  const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number)
  const completedCount = sorted.filter(s => s.status === 'completed').length

  // Stage 1 (הסכם) = finance only; others follow same role rules as project stages
  function canEditStage(stageNumber: number): boolean {
    if (!canEditProp) return false
    if (stageNumber === 1) return can(currentUserRole, FINANCE_ROLES)
    return canUpdateStage(currentUserRole, stageNumber)
  }

  async function deleteAddition() {
    if (!window.confirm(`למחוק את התוספת "${addition.name}"? פעולה זו אינה ניתנת לביטול.`)) return
    const supabase = createClient()
    await supabase.from('additions').delete().eq('id', addition.id)
    onUpdated()
  }

  async function updateStageStatus(stageId: string, stageNumber: number, newStatus: string) {
    setLoadingStage(stageId)
    const supabase = createClient()
    await supabase.from('addition_stages').update({ status: newStatus, updated_by: currentUserId }).eq('id', stageId)
    setLoadingStage(null)
    onUpdated()
  }

  // Build a fake Project-like object for StagePanel's ContractEditor
  const fakeProject = {
    id: addition.project_id,
    contract_value: addition.contract_value,
    cost_estimate: null,
  } as any

  // Build fake allStages shape for ContractEditor (billing pct per stage)
  const fakeAllStages = sorted.map(s => ({
    id: s.id,
    stage_number: s.stage_number,
    stage_name: s.stage_name,
    billing_pct: s.billing_pct,
  }))

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      {/* Addition header */}
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
        {can(currentUserRole, FINANCE_ROLES) && (
          <button
            onClick={e => { e.stopPropagation(); deleteAddition() }}
            style={{ fontSize: '0.75rem', color: 'var(--status-issues)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}
          >
            מחק
          </button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>

      {/* Stages list */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {sorted.map(stage => {
            const isStageOpen = openStageId === stage.id
            const isPulseStage = PULSE_STAGE_NUMBERS.includes(stage.stage_number)
            const stageAttachments = attachments.filter(a => a.addition_stage_id === stage.id)
            const stagePulses = pulses.filter(p => p.addition_stage_id === stage.id)
            const canEdit = canEditStage(stage.stage_number)
            const isCompleted = stage.status === 'completed'

            return (
              <div key={stage.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {/* Stage row */}
                <div
                  onClick={() => setOpenStageId(isStageOpen ? null : stage.id)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                    opacity: isCompleted ? 0.75 : 1,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  {/* Stage number circle */}
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: isCompleted ? 'rgba(34,197,94,0.12)' : 'var(--bg-raised)',
                    border: `1.5px solid ${isCompleted ? 'var(--status-done)' : 'var(--border-mid)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700,
                    color: isCompleted ? 'var(--status-done)' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    {isCompleted ? '✓' : stage.stage_number}
                  </div>

                  {/* Stage name + badge */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{stage.stage_name}</span>
                    <span className={STATUS_BADGE[stage.status] ?? 'badge badge-closed'}>{STAGE_STATUS_LABELS[stage.status]}</span>
                    {isPulseStage && stagePulses.length > 0 && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{stagePulses.length} פעימות</span>
                    )}
                  </div>

                  {/* Status update — mirrors StageUpdateButton logic inline for addition_stages table */}
                  {canEdit && (
                    <div onClick={e => e.stopPropagation()}>
                      <select
                        value={stage.status}
                        onChange={e => updateStageStatus(stage.id, stage.stage_number, e.target.value)}
                        disabled={loadingStage === stage.id}
                        style={{
                          background: 'var(--bg-surface)', border: '1px solid var(--border-mid)',
                          borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.78rem',
                          padding: '0.3rem 0.6rem', cursor: 'pointer', fontFamily: 'var(--font-body)', outline: 'none',
                        }}
                      >
                        {[
                          { value: 'pending',     label: 'ממתין' },
                          { value: 'in_progress', label: 'בתהליך' },
                          { value: 'completed',   label: 'הושלם' },
                          { value: 'blocked',     label: 'חסום' },
                        ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  )}

                  <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', flexShrink: 0, transition: 'transform 0.2s', transform: isStageOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>

                {/* Stage expanded panel — same components as project */}
                {isStageOpen && (
                  <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    {isPulseStage ? (
                      <PulsePanel
                        stageId={null}
                        additionStageId={stage.id}
                        stageNumber={stage.stage_number}
                        projectId={addition.project_id}
                        contractValue={addition.contract_value}
                        stageBillingPct={stage.billing_pct}
                        pulses={stagePulses}
                        currentUserRole={currentUserRole}
                        canEditProp={canEdit}
                        onUpdated={onUpdated}
                      />
                    ) : (
                      <StagePanel
                        stageId={stage.id}
                        projectId={addition.project_id}
                        stageNumber={stage.stage_number}
                        initialNotes={stage.notes}
                        attachments={stageAttachments}
                        project={fakeProject}
                        allStages={fakeAllStages}
                        currentUserRole={currentUserRole}
                        canEditProp={canEditProp}
                        onUpdated={onUpdated}
                        isAdditionStage
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
