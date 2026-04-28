'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TailIssue, TailIssueStatus, Attachment } from '@/lib/types'
import { formatDate } from '@/lib/formatters'

const STATUS_LABELS: Record<TailIssueStatus, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  resolved: 'טופל',
}

const STATUS_STYLES: Record<TailIssueStatus, { badge: string; dot: string }> = {
  open:        { badge: 'badge badge-issues',      dot: 'status-dot status-dot-issues' },
  in_progress: { badge: 'badge badge-in-progress', dot: 'status-dot status-dot-active' },
  resolved:    { badge: 'badge badge-done',         dot: 'status-dot status-dot-done' },
}

interface Props {
  issues: TailIssue[]
  attachments: Attachment[]
  ownerNames: Record<string, string>
  canEditProp: boolean
  onUpdated: () => void
}

export function TailIssueList({ issues, attachments, ownerNames, canEditProp, onUpdated }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  if (issues.length === 0) {
    return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>אין גמרים פתוחים</p>
  }

  async function updateStatus(issueId: string, status: TailIssueStatus) {
    setLoading(issueId)
    const supabase = createClient()
    const update: Record<string, unknown> = { status }
    if (status === 'resolved') update.resolved_at = new Date().toISOString()
    await supabase.from('tail_issues').update(update).eq('id', issueId)
    setLoading(null)
    onUpdated()
  }

  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
      {issues.map(issue => {
        const fileCount = attachments.filter(a => a.tail_issue_id === issue.id).length
        return (
          <li key={issue.id} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                <span className={STATUS_STYLES[issue.status].dot} style={{ marginTop: '5px' }} />
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.5 }}>{issue.description}</p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>נפתח ב-{formatDate(issue.created_at)}</span>
                    {issue.assigned_to && ownerNames[issue.assigned_to] && (
                      <span>מטפל: {ownerNames[issue.assigned_to]}</span>
                    )}
                    {issue.resolved_at && <span>טופל ב-{formatDate(issue.resolved_at)}</span>}
                    {fileCount > 0 && <span>{fileCount} קבצים</span>}
                  </div>
                </div>
              </div>
              <span className={STATUS_STYLES[issue.status].badge} style={{ flexShrink: 0 }}>
                {STATUS_LABELS[issue.status]}
              </span>
            </div>
            {canEditProp && issue.status !== 'resolved' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', paddingRight: '15px' }}>
                {issue.status === 'open' && (
                  <button className="btn-secondary" onClick={() => updateStatus(issue.id, 'in_progress')} disabled={loading === issue.id} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
                    בטיפול
                  </button>
                )}
                <button className="btn-primary" onClick={() => updateStatus(issue.id, 'resolved')} disabled={loading === issue.id} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
                  סגור גמר
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
