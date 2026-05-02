'use client'

import { useState } from 'react'
import { ProjectStage, UserRole, Attachment, Project, StagePulse } from '@/lib/types'
import { STAGE_STATUS_LABELS, formatDate } from '@/lib/formatters'
import { StageUpdateButton } from './StageUpdateButton'
import { StagePanel } from './StagePanel'
import { PulsePanel } from './PulsePanel'
import { canViewStage, can, FINANCE_ROLES } from '@/lib/permissions'

const STAGE_OWNERS: Record<number, string> = {
  1: 'איציק',
  2: 'נמרוד',
  3: 'סלאח',
  4: 'נמרוד',
  5: 'יעקב',
  6: 'סלאח',
  7: 'סלאח',
}

const STATUS_CONFIG: Record<string, { badge: string; dot: string; color: string }> = {
  pending:     { badge: 'badge badge-closed',      dot: 'status-dot',              color: 'var(--text-muted)' },
  in_progress: { badge: 'badge badge-in-progress', dot: 'status-dot status-dot-active',   color: 'var(--status-active)' },
  completed:   { badge: 'badge badge-done',         dot: 'status-dot status-dot-done',    color: 'var(--status-done)' },
  blocked:     { badge: 'badge badge-blocked',      dot: 'status-dot status-dot-blocked', color: 'var(--status-blocked)' },
}

interface Props {
  stages: ProjectStage[]
  pulses: StagePulse[]
  attachments: Attachment[]
  project: Project
  currentUserId: string
  currentUserRole: UserRole
  canEditProp: boolean
  onStageUpdated: (message: string) => void
  onRefresh: () => void
}

export function StageTimeline({ stages, pulses, attachments, project, currentUserId, currentUserRole, canEditProp, onStageUpdated, onRefresh }: Props) {
  const [openStage, setOpenStage] = useState<number | null>(null)
  const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number)

  function toggleStage(stageNumber: number) {
    setOpenStage(prev => prev === stageNumber ? null : stageNumber)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sorted.map(stage => {
        const isOpen = openStage === stage.stage_number
        const stageAttachments = attachments.filter(a => a.stage_id === stage.id)
        const stagePulses = pulses.filter(p => p.stage_id === stage.id)
        const isPulseStage = [3, 5, 6].includes(stage.stage_number)
        const config = STATUS_CONFIG[stage.status] ?? STATUS_CONFIG.pending
        const isCompleted = stage.status === 'completed'

        return (
          <div
            key={stage.id}
            className="card"
            style={{ overflow: 'hidden', opacity: isCompleted ? 0.75 : 1, transition: 'opacity 0.2s' }}
          >
            {/* Stage header row */}
            <div
              style={{
                padding: '0.9rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => toggleStage(stage.stage_number)}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              {/* Stage number circle */}
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: isCompleted ? '#dcfce7' : 'var(--bg-raised)',
                border: `2px solid ${config.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: config.color,
                flexShrink: 0,
              }}>
                {isCompleted ? '✓' : stage.stage_number}
              </div>

              {/* Stage info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {stage.stage_name}
                  </span>
                  <span className={config.badge}>{STAGE_STATUS_LABELS[stage.status]}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{STAGE_OWNERS[stage.stage_number]}</span>
                  {!isPulseStage && stage.billing_pct > 0 && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--brand)', fontWeight: 600 }}>{stage.billing_pct}%</span>
                  )}
                  {isPulseStage && stagePulses.length > 0 && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{stagePulses.length} פעימות</span>
                  )}
                </div>
                {stage.completed_at && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    הושלם: {formatDate(stage.completed_at)}
                  </p>
                )}
              </div>

              {/* Action button */}
              <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                <StageUpdateButton
                  stageId={stage.id}
                  stageNumber={stage.stage_number}
                  currentStatus={stage.status}
                  ownerId={stage.owner_id}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  billingPct={stage.billing_pct}
                  canEditProp={canEditProp}
                  onUpdated={onStageUpdated}
                />
              </div>

              {/* Expand chevron */}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                ▼
              </span>
            </div>

            {/* Expanded panel */}
            {isOpen && (
              <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ paddingTop: '1rem' }}>
                  {isPulseStage ? (
                    <PulsePanel
                      stageId={stage.id}
                      stageNumber={stage.stage_number}
                      projectId={project.id}
                      contractValue={project.contract_value}
                      stageBillingPct={stage.billing_pct}
                      pulses={stagePulses}
                      currentUserRole={currentUserRole}
                      canEditProp={canEditProp}
                      onUpdated={onRefresh}
                    />
                  ) : (
                    <StagePanel
                      stageId={stage.id}
                      projectId={project.id}
                      stageNumber={stage.stage_number}
                      initialNotes={stage.notes}
                      attachments={stageAttachments}
                      project={project}
                      allStages={stages}
                      currentUserRole={currentUserRole}
                      canEditProp={canEditProp}
                      onUpdated={onRefresh}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
