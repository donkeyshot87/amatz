'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileType } from '@/lib/types'
import { FILE_TYPE_LABELS } from '@/lib/formatters'

interface Props {
  projectId: string
  stageId?: string
  tailIssueId?: string
  onUploaded: () => void
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-֐-׿]/g, '_')
}

export function FileUpload({ projectId, stageId, tailIssueId, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<FileType>('other')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setLoading(false)
    onUploaded()
  }

  return (
    <form onSubmit={handleUpload} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <input
        type="file"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}
      />
      <select
        value={fileType}
        onChange={e => setFileType(e.target.value as FileType)}
        className="input-field"
        style={{ width: 'auto' }}
      >
        {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map(k => (
          <option key={k} value={k}>{FILE_TYPE_LABELS[k]}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!file || loading}
        className="btn-primary"
        style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
      >
        {loading ? 'מעלה...' : 'העלה'}
      </button>
      {error && <p style={{ color: 'var(--status-issues)', fontSize: '0.8rem', width: '100%', margin: 0 }}>{error}</p>}
    </form>
  )
}
