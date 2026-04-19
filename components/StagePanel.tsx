'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attachment, Project, UserRole } from '@/lib/types'
import { FileUpload } from './FileUpload'
import { FileList } from './FileList'
import { formatCurrency } from '@/lib/formatters'
import { can, FINANCE_ROLES } from '@/lib/permissions'

interface Props {
  stageId: string
  projectId: string
  stageNumber: number
  initialNotes: string | null
  attachments: Attachment[]
  project: Project
  currentUserRole: UserRole
  onUpdated: () => void
}

export function StagePanel({
  stageId, projectId, stageNumber, initialNotes,
  attachments, project, currentUserRole, onUpdated,
}: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)

  async function saveNotes() {
    const trimmed = notes.trim()
    if (trimmed === (initialNotes ?? '').trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('project_stages').update({ notes: trimmed || null }).eq('id', stageId)
    setSaving(false)
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-4">
      {/* Notes */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">הערות</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          disabled={saving}
          rows={3}
          placeholder="הוסף הערות לשלב..."
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Finance data — stage 1 only, finance roles only */}
      {stageNumber === 1 && can(currentUserRole, FINANCE_ROLES) && (
        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-3">
          <div>
            <p className="text-xs text-gray-500">ערך חוזה</p>
            <p className="font-semibold text-sm">{formatCurrency(project.contract_value)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">עלות מוערכת</p>
            <p className="font-semibold text-sm">{formatCurrency(project.cost_estimate)}</p>
          </div>
        </div>
      )}

      {/* Files */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">קבצים</p>
        <FileList attachments={attachments} />
        <div className="mt-3">
          <FileUpload projectId={projectId} stageId={stageId} onUploaded={onUpdated} />
        </div>
      </div>
    </div>
  )
}
