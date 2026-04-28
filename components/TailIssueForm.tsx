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
        className="btn-ghost"
        onClick={() => setOpen(true)}
        style={{ color: 'var(--status-issues)', fontSize: '0.8rem', padding: '0.3rem 0' }}
      >
        + פתח גמר
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--bg-raised)',
      border: '1px solid var(--border-mid)',
      borderRight: '3px solid var(--status-issues)',
      borderRadius: 'var(--radius-md)',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-issues)', margin: 0 }}>
        גמר חדש
      </p>
      <textarea
        required
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="תיאור הגמר..."
        rows={3}
        className="input-field"
        style={{ resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
        >
          {loading ? 'שומר...' : 'הוסף גמר'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setOpen(false)}
          style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
        >
          ביטול
        </button>
      </div>
    </form>
  )
}
