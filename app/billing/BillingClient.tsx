'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BillingAlertStatus } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import Link from 'next/link'

interface Alert {
  id: string
  amount: number
  status: BillingAlertStatus
  created_at: string
  projects: { name: string; project_number: number } | null
  project_stages: { stage_name: string; stage_number: number } | null
}

interface Props {
  alerts: Alert[]
  totalPending: number
  totalDoneMonth: number
  currentUserId: string
}

const STATUS_LABELS: Record<BillingAlertStatus, string> = {
  pending: 'ממתין',
  in_progress: 'בטיפול',
  done: 'טופל',
}

export function BillingClient({ alerts, totalPending, totalDoneMonth, currentUserId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateAlert(alertId: string, status: BillingAlertStatus) {
    setLoading(alertId)
    const supabase = createClient()
    await supabase.from('billing_alerts')
      .update({ status, handled_by: currentUserId })
      .eq('id', alertId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← לוח בקרה</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">גבייה</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <p className="text-sm text-orange-600 font-medium">ממתין לגבייה</p>
          <p className="text-2xl font-bold text-orange-800 mt-1">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="text-sm text-green-600 font-medium">טופל החודש</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalDoneMonth)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && (
          <p className="text-gray-400 text-center py-8">אין התראות גבייה</p>
        )}
        {alerts.map(alert => (
          <div key={alert.id} className={`bg-white rounded-2xl shadow p-5 ${alert.status === 'done' ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{alert.projects?.name}</p>
                <p className="text-sm text-gray-500">
                  שלב {alert.project_stages?.stage_number} — {alert.project_stages?.stage_name}
                </p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(alert.created_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <p className="font-bold text-lg">{formatCurrency(alert.amount)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  alert.status === 'done' ? 'bg-green-100 text-green-700' :
                  alert.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {STATUS_LABELS[alert.status]}
                </span>
              </div>
            </div>
            {alert.status !== 'done' && (
              <div className="flex gap-2 mt-4">
                {alert.status === 'pending' && (
                  <button
                    onClick={() => updateAlert(alert.id, 'in_progress')}
                    disabled={loading === alert.id}
                    className="text-sm border rounded-lg px-4 py-1.5 hover:bg-gray-50"
                  >
                    בטיפול
                  </button>
                )}
                <button
                  onClick={() => updateAlert(alert.id, 'done')}
                  disabled={loading === alert.id}
                  className="text-sm bg-green-600 text-white rounded-lg px-4 py-1.5 hover:bg-green-700"
                >
                  טופל
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
