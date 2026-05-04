'use client'

import { useState, useRef, DragEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileType } from '@/lib/types'
import { FILE_TYPE_LABELS } from '@/lib/formatters'

interface Props {
  projectId: string
  stageId?: string
  additionStageId?: string
  tailIssueId?: string
  onUploaded: () => void
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-]/g, '_')
}

export function FileUpload({ projectId, stageId, additionStageId, tailIssueId, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<FileType>('other')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) setFile(dropped)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('משתמש לא מחובר'); setLoading(false); return }

    const safeName = sanitizeFileName(file.name)
    const path = stageId
      ? `${projectId}/${stageId}/${Date.now()}_${safeName}`
      : `${projectId}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('project-attachments')
      .upload(path, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setError(`שגיאה בהעלאת הקובץ: ${uploadError.message}`)
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('attachments').insert({
      project_id: projectId,
      stage_id: stageId ?? null,
      addition_stage_id: additionStageId ?? null,
      tail_issue_id: tailIssueId ?? null,
      file_name: file.name,
      file_type: fileType,
      storage_path: path,
      uploaded_by: user.id,
    })

    if (insertError) {
      console.error('Insert error:', insertError)
      setError(`שגיאה בשמירת הקובץ: ${insertError.message}`)
      setLoading(false)
      return
    }

    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
    setLoading(false)
    onUploaded()
  }

  return (
    <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--brand)' : file ? 'var(--status-done)' : 'var(--border-mid)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          background: dragging ? 'var(--brand-light)' : file ? '#f0fdf4' : 'var(--bg-raised)',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.15s',
          userSelect: 'none',
        }}
      >
        {file ? (
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--status-done)', fontWeight: 600 }}>
            ✓ {file.name}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            📎 גרור קובץ לכאן או <span style={{ color: 'var(--brand)', fontWeight: 600 }}>לחץ לבחירה</span>
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          style={{ display: 'none' }}
        />
      </div>

      {/* Type selector + upload button */}
      {file && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={fileType}
            onChange={e => setFileType(e.target.value as FileType)}
            className="input-field"
            style={{ width: 'auto', flex: 1 }}
          >
            {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map(k => (
              <option key={k} value={k}>{FILE_TYPE_LABELS[k]}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 1.25rem' }}
          >
            {loading ? 'מעלה...' : 'העלה'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = '' }}
            style={{ fontSize: '0.8rem' }}
          >
            ביטול
          </button>
        </div>
      )}

      {error && <p style={{ color: 'var(--status-issues)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
    </form>
  )
}
