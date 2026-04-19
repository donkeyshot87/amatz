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
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveNotes() {
    const trimmed = notes.trim()
    if (trimmed === savedNotes.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('project_stages').update({ notes: trimmed || null }).eq('id', stageId)
    setSavedNotes(trimmed)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Notes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            הערות
          </p>
          {saving && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>שומר...</span>}
          {saved && !saving && <span style={{ fontSize: '0.7rem', color: 'var(--status-done)' }}>✓ נשמר</span>}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          disabled={saving}
          rows={3}
          placeholder="הוסף הערות לשלב..."
          className="input-field"
          style={{ resize: 'vertical', minHeight: '72px' }}
        />
      </div>

      {/* Finance data — stage 1 only, finance roles */}
      {stageNumber === 1 && can(currentUserRole, FINANCE_ROLES) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          background: 'var(--bg-deep)',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
        }}>
          <div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '3px' }}>ערך חוזה</p>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gold-bright)', margin: 0 }}>{formatCurrency(project.contract_value)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '3px' }}>עלות מוערכת</p>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{formatCurrency(project.cost_estimate)}</p>
          </div>
        </div>
      )}

      {/* Files */}
      <div>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          קבצים
        </p>
        <FileList attachments={attachments} />
        <div style={{ marginTop: '0.75rem' }}>
          <FileUpload projectId={projectId} stageId={stageId} onUploaded={onUpdated} />
        </div>
      </div>
    </div>
  )
}
