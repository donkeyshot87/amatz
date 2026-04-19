'use client'

import { useState } from 'react'
import { ProjectStage, UserRole, Attachment, Project } from '@/lib/types'
import { STAGE_STATUS_LABELS, formatDate } from '@/lib/formatters'
import { StageUpdateButton } from './StageUpdateButton'
import { StagePanel } from './StagePanel'
import { canViewStage } from '@/lib/permissions'

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
  attachments: Attachment[]
  project: Project
  currentUserId: string
  currentUserRole: UserRole
  onStageUpdated: (message: string) => void
  onRefresh: () => void
}

export function StageTimeline({ stages, attachments, project, currentUserId, currentUserRole, onStageUpdated, onRefresh }: Props) {
  const [openStage, setOpenStage] = useState<number | null>(null)
  const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number)

  function toggleStage(stageNumber: number) {
    if (!canViewStage(currentUserRole, stageNumber)) return
    setOpenStage(prev => prev === stageNumber ? null : stageNumber)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sorted.map(stage => {
        const canView = canViewStage(currentUserRole, stage.stage_number)
        const isOpen = openStage === stage.stage_number
        const stageAttachments = attachments.filter(a => a.stage_id === stage.id)
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
                cursor: canView ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
              onClick={() => toggleStage(stage.stage_number)}
              onMouseEnter={e => canView && ((e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              {/* Stage number circle */}
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: isCompleted ? 'rgba(34,197,94,0.15)' : 'var(--bg-deep)',
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
                  {stage.billing_pct > 0 && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--gold)', fontWeight: 600 }}>{stage.billing_pct}%</span>
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
                  onUpdated={onStageUpdated}
                />
              </div>

              {/* Expand chevron */}
              {canView && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  ▼
                </span>
              )}
            </div>

            {/* Expanded panel */}
            {isOpen && (
              <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ paddingTop: '1rem' }}>
                  <StagePanel
                    stageId={stage.id}
                    projectId={project.id}
                    stageNumber={stage.stage_number}
                    initialNotes={stage.notes}
                    attachments={stageAttachments}
                    project={project}
                    currentUserRole={currentUserRole}
                    onUpdated={onRefresh}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
