'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, ProjectStage, UserRole, TailIssue, Attachment } from '@/lib/types'
import { StageTimeline } from '@/components/StageTimeline'
import { ConfirmationToast } from '@/components/ConfirmationToast'
import { TailIssueForm } from '@/components/TailIssueForm'
import { TailIssueList } from '@/components/TailIssueList'
import { FileUpload } from '@/components/FileUpload'
import { FileList } from '@/components/FileList'
import { formatProjectNumber, formatDate, formatCurrency, PROJECT_STATUS_LABELS } from '@/lib/formatters'
import { can, FINANCE_ROLES } from '@/lib/permissions'
import Link from 'next/link'

interface Props {
  project: Project
  stages: ProjectStage[]
  tailIssues: TailIssue[]
  attachments: Attachment[]
  currentUserId: string
  currentUserRole: UserRole
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  delivered_with_issues: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-600',
}

export function ProjectDetail({ project, stages, tailIssues, attachments, currentUserId, currentUserRole }: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)

  function handleStageUpdated(message: string) {
    setToast(message)
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← לוח בקרה</Link>
      </div>

      {/* Project header */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {formatProjectNumber(project.project_number)} · {project.client_name}
            </p>
            {project.planned_delivery_date && (
              <p className="text-gray-500 text-sm">מסירה מתוכננת: {formatDate(project.planned_delivery_date)}</p>
            )}
            {project.actual_delivery_date && (
              <p className="text-gray-500 text-sm">מסירה בפועל: {formatDate(project.actual_delivery_date)}</p>
            )}
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium flex-shrink-0 ${PROJECT_STATUS_COLORS[project.status]}`}>
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
        </div>

        {can(currentUserRole, FINANCE_ROLES) && (
          <div className="mt-4 grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-gray-500">ערך חוזה</p>
              <p className="font-semibold">{formatCurrency(project.contract_value)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">עלות מוערכת</p>
              <p className="font-semibold">{formatCurrency(project.cost_estimate)}</p>
            </div>
          </div>
        )}

        {project.description && (
          <p className="mt-4 text-gray-600 text-sm">{project.description}</p>
        )}
      </div>

      {/* Stage timeline */}
      <h2 className="text-lg font-semibold mb-3">שלבי הפרויקט</h2>
      <StageTimeline
        stages={stages}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onStageUpdated={handleStageUpdated}
      />

      {/* Files */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">קבצים</h2>
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <FileUpload projectId={project.id} onUploaded={() => router.refresh()} />
          <FileList attachments={attachments} />
        </div>
      </div>

      {/* Tail issues */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">זנבות</h2>
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <TailIssueList issues={tailIssues} onUpdated={() => router.refresh()} />
          <TailIssueForm projectId={project.id} onCreated={() => router.refresh()} />
        </div>
      </div>

      {toast && <ConfirmationToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
