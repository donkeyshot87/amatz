import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProjectCard } from '@/components/ProjectCard'
import { BillingAlertBadge } from '@/components/BillingAlertBadge'
import { can, BILLING_ROLES, CREATE_PROJECT_ROLES } from '@/lib/permissions'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { status: filterStatus } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role: UserRole = profile?.role ?? 'coordinator'

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: openTails } = await supabase
    .from('tail_issues')
    .select('project_id')
    .in('status', ['open', 'in_progress'])

  const tailCountMap = (openTails ?? []).reduce((acc, t) => {
    acc[t.project_id] = (acc[t.project_id] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const enrichedProjects = (projects ?? [])
    .map(p => ({ ...p, open_tail_issues: tailCountMap[p.id] ?? 0 }))
    .filter(p => !filterStatus || p.status === filterStatus)
    .sort((a, b) => (b.open_tail_issues > 0 ? 1 : 0) - (a.open_tail_issues > 0 ? 1 : 0))

  let pendingBillingCount = 0
  if (can(role, BILLING_ROLES)) {
    const { count } = await supabase
      .from('billing_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingBillingCount = count ?? 0
  }

  const STATUS_FILTERS = [
    { value: '', label: 'הכל' },
    { value: 'active', label: 'פעיל' },
    { value: 'delivered_with_issues', label: 'נמסר עם בעיות' },
    { value: 'closed', label: 'סגור' },
  ]

  const activeCount = (projects ?? []).filter(p => p.status === 'active').length
  const issuesCount = (projects ?? []).filter(p => p.status === 'delivered_with_issues').length
  const closedCount = (projects ?? []).filter(p => p.status === 'closed').length

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 900,
            color: 'var(--text-primary)',
            margin: '0 0 4px',
            letterSpacing: '-0.02em',
          }}>לוח בקרה</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            {(projects ?? []).length} פרויקטים במערכת
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {can(role, BILLING_ROLES) && <BillingAlertBadge count={pendingBillingCount} />}
          {can(role, CREATE_PROJECT_ROLES) && (
            <Link
              href="/projects/new"
              className="btn-primary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
              פרויקט חדש
            </Link>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <StatCard label="פעיל" value={activeCount} color="var(--status-active)" />
        <StatCard label="עם בעיות" value={issuesCount} color="var(--status-issues)" />
        <StatCard label="סגור" value={closedCount} color="var(--text-muted)" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => {
          const isActive = (filterStatus ?? '') === f.value
          return (
            <Link
              key={f.value}
              href={f.value ? `?status=${f.value}` : '/dashboard'}
              style={{
                textDecoration: 'none',
                padding: '0.35rem 1rem',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 500,
                background: isActive ? 'var(--gold)' : 'var(--bg-card)',
                color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                border: `1px solid ${isActive ? 'var(--gold)' : 'var(--border-subtle)'}`,
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {/* Project grid */}
      {enrichedProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }}>◻</div>
          <p style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>אין פרויקטים להצגה</p>
          {can(role, CREATE_PROJECT_ROLES) && (
            <Link href="/projects/new" style={{ fontSize: '0.85rem', color: 'var(--gold)', textDecoration: 'none' }}>
              צור את הפרויקט הראשון ←
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {enrichedProjects.map((p, i) => (
            <div key={p.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <ProjectCard project={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem' }}>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: '1.75rem', fontWeight: 700, color, margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{value}</p>
    </div>
  )
}
