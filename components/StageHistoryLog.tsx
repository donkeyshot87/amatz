import { formatDate } from '@/lib/formatters'

const STATUS_HE: Record<string, string> = {
  pending: 'ממתין',
  in_progress: 'בתהליך',
  completed: 'הושלם',
  blocked: 'חסום',
}

interface HistoryEntry {
  id: string
  old_status: string | null
  new_status: string
  changed_at: string
  user_profiles?: { full_name: string } | null
}

interface Props {
  history: HistoryEntry[]
}

export function StageHistoryLog({ history }: Props) {
  if (history.length === 0) return <p className="text-gray-400 text-sm">אין היסטוריה</p>

  return (
    <ul className="space-y-2">
      {history.map(h => (
        <li key={h.id} className="text-sm text-gray-600 border-r-2 border-gray-200 pr-3">
          <span className="font-medium">{h.user_profiles?.full_name ?? 'לא ידוע'}</span>
          {' '}שינה מ-
          <span className="text-orange-600">{STATUS_HE[h.old_status ?? ''] ?? h.old_status ?? '—'}</span>
          {' '}ל-
          <span className="text-blue-600">{STATUS_HE[h.new_status] ?? h.new_status}</span>
          <span className="text-gray-400 mr-2 text-xs">{formatDate(h.changed_at)}</span>
        </li>
      ))}
    </ul>
  )
}
