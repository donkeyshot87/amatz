'use client'

import { Attachment } from '@/lib/types'
import { FILE_TYPE_LABELS } from '@/lib/formatters'
import { createClient } from '@/lib/supabase/client'

interface Props {
  attachments: Attachment[]
}

export function FileList({ attachments }: Props) {
  if (attachments.length === 0) return <p className="text-gray-400 text-sm">אין קבצים</p>

  async function getDownloadUrl(path: string) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('project-attachments').createSignedUrl(path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const grouped = attachments.reduce((acc, f) => {
    if (!acc[f.file_type]) acc[f.file_type] = []
    acc[f.file_type].push(f)
    return acc
  }, {} as Record<string, Attachment[]>)

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, files]) => (
        <div key={type}>
          <h4 className="text-sm font-medium text-gray-500 mb-2">{FILE_TYPE_LABELS[type] ?? type}</h4>
          <ul className="space-y-1">
            {files.map(f => (
              <li key={f.id}>
                <button
                  onClick={() => getDownloadUrl(f.storage_path)}
                  className="text-blue-600 text-sm hover:underline text-right"
                >
                  📎 {f.file_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
