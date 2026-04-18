'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TailIssue, TailIssueStatus } from '@/lib/types'

const STATUS_LABELS: Record<TailIssueStatus, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  resolved: 'נסגר',
}

const STATUS_COLORS: Record<TailIssueStatus, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
}

interface Props {
  issues: TailIssue[]
  onUpdated: () => void
}

export function TailIssueList({ issues, onUpdated }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  if (issues.length === 0) return <p className="text-gray-400 text-sm">אין זנבות פתוחים</p>

  async function updateStatus(issueId: string, status: TailIssueStatus) {
    setLoading(issueId)
    const supabase = createClient()
    await supabase.from('tail_issues').update({ status }).eq('id', issueId)
    setLoading(null)
    onUpdated()
  }

  return (
    <ul className="space-y-3">
      {issues.map(issue => (
        <li key={issue.id} className="bg-white border rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm">{issue.description}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[issue.status]}`}>
              {STATUS_LABELS[issue.status]}
            </span>
          </div>
          {issue.status !== 'resolved' && (
            <div className="flex gap-2 mt-3">
              {issue.status === 'open' && (
                <button
                  onClick={() => updateStatus(issue.id, 'in_progress')}
                  disabled={loading === issue.id}
                  className="text-xs border rounded-lg px-3 py-1 hover:bg-gray-50"
                >
                  בטיפול
                </button>
              )}
              <button
                onClick={() => updateStatus(issue.id, 'resolved')}
                disabled={loading === issue.id}
                className="text-xs bg-green-600 text-white rounded-lg px-3 py-1 hover:bg-green-700"
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
