'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  projectName: string
}

export function DeleteProjectButton({ projectId, projectName }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', projectId)
    router.push('/dashboard')
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="btn-secondary"
        style={{ color: 'var(--status-issues)', borderColor: 'var(--status-issues)' }}
      >
        מחק פרויקט
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
        האם אתה בטוח שברצונך למחוק את הפרויקט &quot;{projectName}&quot;?
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>פעולה זו אינה הפיכה.</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleDelete} disabled={deleting} className="btn-primary" style={{ background: 'var(--status-issues)' }}>
          {deleting ? 'מוחק...' : 'כן, מחק'}
        </button>
        <button onClick={() => setShowConfirm(false)} className="btn-secondary">ביטול</button>
      </div>
    </div>
  )
}
