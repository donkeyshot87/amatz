'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attachment, Project, UserRole } from '@/lib/types'
import { FileUpload } from './FileUpload'
import { FileList } from './FileList'
import { formatCurrency } from '@/lib/formatters'
import { can, FINANCE_ROLES, canUpdateStage } from '@/lib/permissions'

interface Props {
  stageId: string
  projectId: string
  stageNumber: number
  initialNotes: string | null
  attachments: Attachment[]
  project: Project
  allStages: Array<{ id: string; stage_number: number; stage_name: string; billing_pct: number }>
  currentUserRole: UserRole
  canEditProp: boolean
  isAdditionStage?: boolean
  onUpdated: () => void
}

export function StagePanel({
  stageId, projectId, stageNumber, initialNotes,
  attachments, project, allStages, currentUserRole, canEditProp, isAdditionStage, onUpdated,
}: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const canEditThisStage = canEditProp && canUpdateStage(currentUserRole, stageNumber)

  async function saveNotes() {
    const trimmed = notes.trim()
    if (trimmed === savedNotes.trim()) return
    setSaving(true)
    const supabase = createClient()
    const table = isAdditionStage ? 'addition_stages' : 'project_stages'
    await supabase.from(table).update({ notes: trimmed || null }).eq('id', stageId)
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
        {canEditThisStage ? (
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
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{notes || '—'}</p>
        )}
      </div>

      {/* Finance data — stage 1 only, finance roles, project stages only */}
      {stageNumber === 1 && !isAdditionStage && can(currentUserRole, FINANCE_ROLES) && (
        <ContractEditor
          projectId={projectId}
          initialContractValue={project.contract_value}
          stages={allStages}
          canEdit={canEditThisStage}
          onUpdated={onUpdated}
        />
      )}

      {/* Files */}
      <div>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          קבצים
        </p>
        <FileList attachments={attachments} />
        {canEditThisStage && (
          <div style={{ marginTop: '0.75rem' }}>
            <FileUpload
              projectId={projectId}
              stageId={isAdditionStage ? undefined : stageId}
              additionStageId={isAdditionStage ? stageId : undefined}
              onUploaded={onUpdated}
            />
          </div>
        )}
      </div>
    </div>
  )
}

interface ContractEditorProps {
  projectId: string
  initialContractValue: number | null
  stages: Array<{ id: string; stage_number: number; stage_name: string; billing_pct: number }>
  canEdit: boolean
  onUpdated: () => void
}

function ContractEditor({ projectId, initialContractValue, stages, canEdit, onUpdated }: ContractEditorProps) {
  const [contractValue, setContractValue] = useState(initialContractValue?.toString() ?? '')
  const [stagePcts, setStagePcts] = useState<Record<string, string>>(
    Object.fromEntries(stages.map(s => [s.id, s.billing_pct.toString()]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const cv = parseFloat(contractValue)
    if (!isNaN(cv)) {
      await supabase.from('projects').update({ contract_value: cv }).eq('id', projectId)
    }
    for (const stage of stages.filter(s => ![3, 6].includes(s.stage_number))) {
      const pct = parseInt(stagePcts[stage.id] ?? '0')
      if (!isNaN(pct)) {
        await supabase.from('project_stages').update({ billing_pct: pct }).eq('id', stage.id)
      }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onUpdated()
  }

  return (
    <div style={{ background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>חוזה וגבייה</p>
        {saving && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>שומר...</span>}
        {saved && !saving && <span style={{ fontSize: '0.7rem', color: 'var(--status-done)' }}>✓ נשמר</span>}
      </div>
      <div>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>ערך חוזה (₪)</label>
        {canEdit ? (
          <input
            type="number"
            value={contractValue}
            onChange={e => setContractValue(e.target.value)}
            onBlur={save}
            className="input-field"
            style={{ maxWidth: '200px' }}
          />
        ) : (
          <p style={{ fontWeight: 600, color: 'var(--brand)', margin: 0 }}>{formatCurrency(initialContractValue)}</p>
        )}
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>אחוזי גבייה לפי שלב</p>
        {stages.filter(s => ![3, 6].includes(s.stage_number)).map(stage => (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '120px' }}>
              {stage.stage_number}. {stage.stage_name}
            </span>
            {canEdit ? (
              <input
                type="number"
                min={0}
                max={100}
                value={stagePcts[stage.id] ?? '0'}
                onChange={e => setStagePcts(prev => ({ ...prev, [stage.id]: e.target.value }))}
                onBlur={save}
                className="input-field"
                style={{ width: '60px' }}
              />
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{stage.billing_pct}%</span>
            )}
            {canEdit && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
