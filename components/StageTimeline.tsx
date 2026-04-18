import { ProjectStage, UserRole } from '@/lib/types'
import { STAGE_STATUS_LABELS, formatDate } from '@/lib/formatters'
import { StageUpdateButton } from './StageUpdateButton'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
}

interface Props {
  stages: ProjectStage[]
  currentUserId: string
  currentUserRole: UserRole
  onStageUpdated: (message: string) => void
}

export function StageTimeline({ stages, currentUserId, currentUserRole, onStageUpdated }: Props) {
  const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number)

  return (
    <div className="space-y-3">
      {sorted.map(stage => (
        <div key={stage.id} className="bg-white rounded-xl border p-4 flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
            {stage.stage_number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{stage.stage_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[stage.status]}`}>
                {STAGE_STATUS_LABELS[stage.status]}
              </span>
              {stage.billing_pct > 0 && (
                <span className="text-xs text-gray-400">{stage.billing_pct}%</span>
              )}
            </div>
            {stage.completed_at && (
              <p className="text-xs text-gray-500 mt-0.5">הושלם: {formatDate(stage.completed_at)}</p>
            )}
            {stage.notes && (
              <p className="text-sm text-gray-600 mt-1">{stage.notes}</p>
            )}
          </div>
          <div className="flex-shrink-0">
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
        </div>
      ))}
    </div>
  )
}
