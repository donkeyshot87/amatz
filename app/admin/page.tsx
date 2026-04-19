import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserManagement } from '@/components/UserManagement'
import { StageHistoryLog } from '@/components/StageHistoryLog'
import { formatCurrency, formatProjectNumber, PROJECT_STATUS_LABELS } from '@/lib/formatters'
import Link from 'next/link'

const PROJECT_STATUS_BADGE: Record<string, string> = {
  active: 'badge badge-active',
  delivered_with_issues: 'badge badge-issues',
  closed: 'badge badge-closed',
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!['developer', 'admin'].includes(profile?.role ?? '')) redirect('/dashboard')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: projects }, { data: users }, { data: history }, { data: doneAlerts }] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('*').order('full_name'),
    supabase.from('stage_history')
      .select(`*, user_profiles(full_name)`)
      .order('changed_at', { ascending: false })
      .limit(100),
    supabase.from('billing_alerts')
      .select('amount')
      .eq('status', 'done')
      .gte('created_at', startOfMonth),
  ])

  const closedThisMonth = (projects ?? []).filter(
    p => p.status === 'closed' && p.updated_at >= startOfMonth
  ).length

  const totalCollectedMonth = (doneAlerts ?? []).reduce((sum, a) => sum + Number(a.amount), 0)

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <Link href="/dashboard" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← לוח בקרה
      </Link>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.75rem',
        fontWeight: 900,
        color: 'var(--text-primary)',
        margin: '0 0 2rem',
        letterSpacing: '-0.02em',
      }}>ניהול</h1>

      {/* Monthly summary */}
      <AdminSection title="סיכום חודשי">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>פרויקטים שנסגרו החודש</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1 }}>{closedThisMonth}</p>
          </div>
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>גבייה שהתקבלה החודש</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold-bright)', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1 }}>{formatCurrency(totalCollectedMonth)}</p>
          </div>
        </div>
      </AdminSection>

      {/* All projects */}
      <AdminSection title="כל הפרויקטים">
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-raised)' }}>
                {['מספר', 'שם', 'לקוח', 'ערך חוזה', 'סטטוס'].map(h => (
                  <th key={h} style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(projects ?? []).map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < (projects?.length ?? 0) - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 600 }}>
                    {formatProjectNumber(p.project_number)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link href={`/projects/${p.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {p.name}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{p.client_name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--gold-bright)', fontWeight: 600 }}>{formatCurrency(p.contract_value)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={PROJECT_STATUS_BADGE[p.status] ?? 'badge badge-closed'}>
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      {/* User management */}
      <AdminSection title="ניהול משתמשים">
        <UserManagement users={users ?? []} />
      </AdminSection>

      {/* History log */}
      <AdminSection title="היסטוריית שינויים">
        <div className="card" style={{ padding: '0.5rem 1.25rem' }}>
          <StageHistoryLog history={history ?? []} />
        </div>
      </AdminSection>
    </div>
  )
}

function AdminSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.05rem',
        fontWeight: 700,
        color: 'var(--text-secondary)',
        margin: '0 0 1rem',
        letterSpacing: '-0.01em',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ width: '3px', height: '16px', background: 'var(--gold)', borderRadius: '2px', display: 'inline-block' }} />
        {title}
      </h2>
      {children}
    </section>
  )
}
