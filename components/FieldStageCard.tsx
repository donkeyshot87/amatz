'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Attachment, StagePulse, UserRole, StageStatus } from '@/lib/types'
import { STAGE_STATUS_LABELS } from '@/lib/formatters'
import { StagePanel } from './StagePanel'
import { PulsePanel } from './PulsePanel'
import { ConfirmationToast } from './ConfirmationToast'
import { createClient } from '@/lib/supabase/client'
import { canCompleteStage } from '@/lib/permissions'

interface Stage {
  id: string
  stage_number: number
  stage_name: string
  status: StageStatus
  notes: string | null
  owner_id: string | null
  billing_pct: number
}

interface Project {
  id: string
  name: string
  project_number: number
  client_name: string
  contract_value: number | null
  cost_estimate: number | null
}

interface Props {
  project: Project
  stages: Stage[]
  pulses: StagePulse[]
  attachments: Attachment[]
  currentUserId: string
  currentUserRole: UserRole
}

const STAGE_STATUS_CONFIG: Record<string, string> = {
  pending:     'badge badge-closed',
  in_progress: 'badge badge-in-progress',
  blocked:     'badge badge-blocked',
  completed:   'badge badge-done',
}

const STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: 'pending', label: 'ממתין' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'completed', label: 'הושלם' },
  { value: 'blocked', label: 'חסום' },
]

const PULSE_STAGES = [3, 5, 6]

export function FieldStageCard({ project, stages, pulses, attachments, currentUserId, currentUserRole }: Props) {
  const router = useRouter()
  const [openStageId, setOpenStageId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loadingStage, setLoadingStage] = useState<string | null>(null)

  async function updateStatus(stageId: string, newStatus: StageStatus, billingPct: number) {
    setLoadingStage(stageId)
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
    setToast(msg)
    setLoadingStage(null)
    router.refresh()
  }

  return (
    <>
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Project header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--brand)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '3px' }}>
            P-{String(project.project_number).padStart(3, '0')}
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
            {project.name}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>{project.client_name}</p>
        </div>

        {/* Stages */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {stages.map((stage, i) => {
            const isOpen = openStageId === stage.id
            const isOwner = stage.owner_id === currentUserId
            const canEdit = canCompleteStage(currentUserRole, isOwner, stage.stage_number)
            const stageAttachments = attachments.filter(a => a.stage_id === stage.id)
            const stagePulses = pulses.filter(p => p.stage_id === stage.id)
            const isPulseStage = PULSE_STAGES.includes(stage.stage_number)
            const isCompleted = stage.status === 'completed'

            return (
              <div key={stage.id} style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                {/* Stage row */}
                <div
                  style={{
                    padding: '0.85rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    opacity: isCompleted ? 0.7 : 1,
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setOpenStageId(isOpen ? null : stage.id)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  {/* Number circle */}
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isCompleted ? 'rgba(34,197,94,0.12)' : 'var(--bg-raised)',
                    border: `1.5px solid ${isCompleted ? 'var(--status-done)' : 'var(--border-mid)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: isCompleted ? 'var(--status-done)' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    {isCompleted ? '✓' : stage.stage_number}
                  </div>

                  {/* Name + badge */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {stage.stage_name}
                    </span>
                    <span className={STAGE_STATUS_CONFIG[stage.status] ?? 'badge badge-closed'}>
                      {STAGE_STATUS_LABELS[stage.status]}
                    </span>
                  </div>

                  {/* Status select (if can edit) */}
                  {canEdit && (
                    <div onClick={e => e.stopPropagation()}>
                      <select
                        value={stage.status}
                        onChange={e => updateStatus(stage.id, e.target.value as StageStatus, stage.billing_pct)}
                        disabled={loadingStage === stage.id}
                        style={{
                          background: 'var(--bg-raised)',
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
                    </div>
                  )}

                  {/* Chevron */}
                  <span style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.6rem',
                    flexShrink: 0,
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                  }}>▼</span>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div style={{ padding: '0 1.5rem 1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    {isPulseStage ? (
                      <PulsePanel
                        stageId={stage.id}
                        stageNumber={stage.stage_number}
                        projectId={project.id}
                        contractValue={project.contract_value}
                        stageBillingPct={stage.billing_pct}
                        pulses={stagePulses}
                        currentUserRole={currentUserRole}
                        canEditProp={canEdit}
                        onUpdated={() => router.refresh()}
                      />
                    ) : (
                      <StagePanel
                        stageId={stage.id}
                        projectId={project.id}
                        stageNumber={stage.stage_number}
                        initialNotes={stage.notes}
                        attachments={stageAttachments}
                        project={project as any}
                        allStages={stages}
                        currentUserRole={currentUserRole}
                        canEditProp={canEdit}
                        onUpdated={() => router.refresh()}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {toast && <ConfirmationToast message={toast} onClose={() => setToast(null)} />}
    </>
  )
}
