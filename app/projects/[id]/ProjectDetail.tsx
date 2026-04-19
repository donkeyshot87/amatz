'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, ProjectStage, UserRole, TailIssue, Attachment } from '@/lib/types'
import { StageTimeline } from '@/components/StageTimeline'
import { ConfirmationToast } from '@/components/ConfirmationToast'
import { TailIssueForm } from '@/components/TailIssueForm'
import { TailIssueList } from '@/components/TailIssueList'
import { formatProjectNumber, formatDate, formatCurrency, PROJECT_STATUS_LABELS, STAGE_STATUS_LABELS } from '@/lib/formatters'
import { can, FINANCE_ROLES, CREATE_PROJECT_ROLES } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface HistoryEntry {
  id: string
  changed_at: string
  changed_by: string | null
  old_status: string | null
  new_status: string
  project_stages: { stage_name: string; stage_number: number } | null
}

interface Props {
  project: Project
  stages: ProjectStage[]
  tailIssues: TailIssue[]
  attachments: Attachment[]
  currentUserId: string
  currentUserRole: UserRole
  ownerNames: Record<string, string>
  history: HistoryEntry[]
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  delivered_with_issues: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-600',
}

export function ProjectDetail({ project, stages, tailIssues, attachments, currentUserId, currentUserRole, ownerNames, history }: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(project.name)
  const [savingName, setSavingName] = useState(false)
  const canEdit = can(currentUserRole, CREATE_PROJECT_ROLES)

  function handleStageUpdated(message: string) {
    setToast(message)
    router.refresh()
  }

  async function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === project.name) { setEditingName(false); setNameValue(project.name); return }
    setSavingName(true)
    const supabase = createClient()
    await supabase.from('projects').update({ name: trimmed }).eq('id', project.id)
    setSavingName(false)
    setEditingName(false)
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
            {editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameValue(project.name) } }}
                disabled={savingName}
                className="text-2xl font-bold border-b-2 border-blue-500 outline-none bg-transparent w-full"
              />
            ) : (
              <h1
                className={`text-2xl font-bold ${canEdit ? 'cursor-pointer hover:text-blue-600 group' : ''}`}
                onClick={() => canEdit && setEditingName(true)}
                title={canEdit ? 'לחץ לעריכה' : undefined}
              >
                {nameValue}
                {canEdit && <span className="text-sm text-gray-400 font-normal me-2 opacity-0 group-hover:opacity-100"> ✎</span>}
              </h1>
            )}
            <p className="text-gray-700 text-sm mt-1">
              {formatProjectNumber(project.project_number)} · {project.client_name}
            </p>
            {project.planned_delivery_date && (
              <p className="text-gray-700 text-sm">מסירה מתוכננת: {formatDate(project.planned_delivery_date)}</p>
            )}
            {project.actual_delivery_date && (
              <p className="text-gray-700 text-sm">מסירה בפועל: {formatDate(project.actual_delivery_date)}</p>
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
        attachments={attachments}
        project={project}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onStageUpdated={handleStageUpdated}
        onRefresh={() => router.refresh()}
      />

      {/* Tail issues */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">זנבות</h2>
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <TailIssueList issues={tailIssues} onUpdated={() => router.refresh()} />
          <TailIssueForm projectId={project.id} onCreated={() => router.refresh()} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">היסטוריית שינויים</h2>
        <div className="bg-white rounded-2xl shadow p-5">
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm">אין שינויים עדיין</p>
          ) : (
            <div className="space-y-2">
              {history.map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">שלב {entry.project_stages?.stage_number}: {entry.project_stages?.stage_name}</span>
                    <span className="text-gray-400">←</span>
                    <span className="text-gray-700">{STAGE_STATUS_LABELS[entry.old_status ?? ''] ?? entry.old_status}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-blue-700">{STAGE_STATUS_LABELS[entry.new_status] ?? entry.new_status}</span>
                  </div>
                  <div className="text-xs text-gray-400 text-left flex-shrink-0 mr-4">
                    <span>{ownerNames[entry.changed_by ?? ''] ?? '—'}</span>
                    <span className="mx-1">·</span>
                    <span>{formatDate(entry.changed_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <ConfirmationToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
