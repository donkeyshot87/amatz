'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  onCreated: () => void
}

export function TailIssueForm({ projectId, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('tail_issues').insert({
      project_id: projectId,
      description,
      reported_by: user?.id,
      status: 'open',
    })

    setDescription('')
    setOpen(false)
    setLoading(false)
    onCreated()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:underline font-medium"
      >
        + פתח בעיית זנב
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-red-50 rounded-xl p-4">
      <h4 className="font-medium text-red-800">בעיה חדשה</h4>
      <textarea
        required
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="תיאור הבעיה..."
        rows={3}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'שומר...' : 'פתח בעיה'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border rounded-lg px-4 py-1.5 text-sm"
        >
          ביטול
        </button>
      </div>
    </form>
  )
}
