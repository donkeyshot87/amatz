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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
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
    <div className="space-y-3">
      {sorted.map(stage => {
        const canView = canViewStage(currentUserRole, stage.stage_number)
        const isOpen = openStage === stage.stage_number
        const stageAttachments = attachments.filter(a => a.stage_id === stage.id)

        return (
          <div key={stage.id} className="bg-white rounded-xl border overflow-hidden">
            <div
              className={`p-4 flex items-start gap-4 ${canView ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => toggleStage(stage.stage_number)}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                {stage.stage_number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{stage.stage_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[stage.status]}`}>
                    {STAGE_STATUS_LABELS[stage.status]}
                  </span>
                  <span className="text-xs text-gray-400">{STAGE_OWNERS[stage.stage_number]}</span>
                  {stage.billing_pct > 0 && (
                    <span className="text-xs text-gray-400">{stage.billing_pct}%</span>
                  )}
                </div>
                {stage.completed_at && (
                  <p className="text-xs text-gray-700 mt-0.5">הושלם: {formatDate(stage.completed_at)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
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
              {canView && (
                <span className="text-gray-400 text-xs flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
              )}
            </div>

            {isOpen && (
              <div className="px-4 pb-4">
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
            )}
          </div>
        )
      })}
    </div>
  )
}
