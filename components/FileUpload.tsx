'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileType } from '@/lib/types'
import { FILE_TYPE_LABELS } from '@/lib/formatters'

interface Props {
  projectId: string
  stageId?: string
  onUploaded: () => void
}

export function FileUpload({ projectId, stageId, onUploaded }: Props) {
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
    if (!user) return

    const path = stageId
      ? `${projectId}/${stageId}/${Date.now()}_${file.name}`
      : `${projectId}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('project-attachments')
      .upload(path, file)

    if (uploadError) {
      setError('שגיאה בהעלאת הקובץ')
      setLoading(false)
      return
    }

    await supabase.from('attachments').insert({
      project_id: projectId,
      stage_id: stageId ?? null,
      file_name: file.name,
      file_type: fileType,
      storage_path: path,
      uploaded_by: user.id,
    })

    setFile(null)
    setLoading(false)
    onUploaded()
  }

  return (
    <form onSubmit={handleUpload} className="flex items-center gap-3 flex-wrap">
      <input
        type="file"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <select
        value={fileType}
        onChange={e => setFileType(e.target.value as FileType)}
        className="border rounded-lg px-2 py-1.5 text-sm bg-white"
      >
        {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map(k => (
          <option key={k} value={k}>{FILE_TYPE_LABELS[k]}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!file || loading}
        className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'מעלה...' : 'העלה'}
      </button>
      {error && <p className="text-red-600 text-sm w-full">{error}</p>}
    </form>
  )
}
