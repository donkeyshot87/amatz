'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TailIssue, TailIssueStatus } from '@/lib/types'

const STATUS_LABELS: Record<TailIssueStatus, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  resolved: 'נסגר',
}

const STATUS_STYLES: Record<TailIssueStatus, { badge: string; dot: string }> = {
  open:        { badge: 'badge badge-issues',      dot: 'status-dot status-dot-issues' },
  in_progress: { badge: 'badge badge-in-progress', dot: 'status-dot status-dot-active' },
  resolved:    { badge: 'badge badge-done',         dot: 'status-dot status-dot-done' },
}

interface Props {
  issues: TailIssue[]
  onUpdated: () => void
}

export function TailIssueList({ issues, onUpdated }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  if (issues.length === 0) {
    return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>אין זנבות פתוחים</p>
  }

  async function updateStatus(issueId: string, status: TailIssueStatus) {
    setLoading(issueId)
    const supabase = createClient()
    await supabase.from('tail_issues').update({ status }).eq('id', issueId)
    setLoading(null)
    onUpdated()
  }

  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
      {issues.map(issue => (
        <li key={issue.id} style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
              <span className={STATUS_STYLES[issue.status].dot} style={{ marginTop: '5px' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                {issue.description}
              </p>
            </div>
            <span className={STATUS_STYLES[issue.status].badge} style={{ flexShrink: 0 }}>
              {STATUS_LABELS[issue.status]}
            </span>
          </div>

          {issue.status !== 'resolved' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', paddingRight: '15px' }}>
              {issue.status === 'open' && (
                <button
                  className="btn-secondary"
                  onClick={() => updateStatus(issue.id, 'in_progress')}
                  disabled={loading === issue.id}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                >
                  בטיפול
                </button>
              )}
              <button
                className="btn-primary"
                onClick={() => updateStatus(issue.id, 'resolved')}
                disabled={loading === issue.id}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
              >
                סגור בעיה
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
