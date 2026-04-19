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

const STATUS_BADGE: Record<BillingAlertStatus, string> = {
  pending: 'badge badge-pending',
  in_progress: 'badge badge-in-progress',
  done: 'badge badge-done',
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
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Back */}
      <Link href="/dashboard" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← לוח בקרה
      </Link>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.75rem',
        fontWeight: 900,
        color: 'var(--text-primary)',
        margin: '0 0 1.75rem',
        letterSpacing: '-0.02em',
      }}>גבייה</h1>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem 1.5rem', borderRight: '3px solid var(--status-pending)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            ממתין לגבייה
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24', margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="card" style={{ padding: '1.25rem 1.5rem', borderRight: '3px solid var(--status-done)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            טופל החודש
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#4ade80', margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {formatCurrency(totalDoneMonth)}
          </p>
        </div>
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.95rem' }}>אין התראות גבייה</p>
          </div>
        )}
        {alerts.map(alert => (
          <div
            key={alert.id}
            className="card metal-card"
            style={{
              padding: '1.25rem 1.5rem',
              opacity: alert.status === 'done' ? 0.55 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {alert.projects?.name}
                  </span>
                  <span className={STATUS_BADGE[alert.status]}>
                    {STATUS_LABELS[alert.status]}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 2px' }}>
                  שלב {alert.project_stages?.stage_number} — {alert.project_stages?.stage_name}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                  {formatDate(alert.created_at)}
                </p>
              </div>

              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <p style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--gold-bright)', fontFamily: 'var(--font-display)', margin: '0 0 0.75rem', lineHeight: 1.1 }}>
                  {formatCurrency(alert.amount)}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {alert.status === 'pending' && (
                    <button
                      onClick={() => updateAlert(alert.id, 'in_progress')}
                      disabled={loading === alert.id}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
                    >
                      בטיפול
                    </button>
                  )}
                  {alert.status === 'done' && (
                    <button
                      onClick={() => updateAlert(alert.id, 'in_progress')}
                      disabled={loading === alert.id}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
                    >
                      החזר לטיפול
                    </button>
                  )}
                  {alert.status !== 'done' && (
                    <button
                      onClick={() => updateAlert(alert.id, 'done')}
                      disabled={loading === alert.id}
                      className="btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
                    >
                      ✓ טופל
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
