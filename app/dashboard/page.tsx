import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProjectCard } from '@/components/ProjectCard'
import { BillingAlertBadge } from '@/components/BillingAlertBadge'
import { FilterBar } from '@/components/FilterBar'
import { can, BILLING_ROLES, CREATE_PROJECT_ROLES } from '@/lib/permissions'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ s?: string | string[]; q?: string; sort?: string }>
}

function applySort(projects: any[], sort: string) {
  return [...projects].sort((a, b) => {
    if (sort === 'created_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sort === 'delivery_asc') {
      const da = a.planned_delivery_date ? new Date(a.planned_delivery_date).getTime() : Infinity
      const db = b.planned_delivery_date ? new Date(b.planned_delivery_date).getTime() : Infinity
      return da - db
    }
    if (sort === 'delivery_desc') {
      const da = a.planned_delivery_date ? new Date(a.planned_delivery_date).getTime() : -Infinity
      const db = b.planned_delivery_date ? new Date(b.planned_delivery_date).getTime() : -Infinity
      return db - da
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export default async function DashboardPage({ searchParams }: Props) {
  const { s, q, sort } = await searchParams
  const rawS: string[] = s ? (Array.isArray(s) ? s : [s]) : []
  const selected = rawS.includes('__none__') ? [] : rawS
  const searchQuery = q ?? ''
  const sortValue = sort ?? 'created_desc'

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

  const { data: openTails } = await supabase
    .from('tail_issues')
    .select('project_id')
    .in('status', ['open', 'in_progress'])

  const tailCountMap = (openTails ?? []).reduce((acc, t) => {
    acc[t.project_id] = (acc[t.project_id] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  let enriched = (projects ?? []).map(p => ({ ...p, open_tail_issues: tailCountMap[p.id] ?? 0 }))

  if (selected.length > 0) {
    enriched = enriched.filter(p => selected.includes(p.status))
  }

  if (searchQuery) {
    const qLower = searchQuery.toLowerCase()
    enriched = enriched.filter(p =>
      p.name.toLowerCase().includes(qLower) || p.client_name.toLowerCase().includes(qLower)
    )
  }

  enriched = applySort(enriched, sortValue)

  let pendingBillingCount = 0
  if (can(role, BILLING_ROLES)) {
    const { count } = await supabase
      .from('billing_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingBillingCount = count ?? 0
  }

  const activeCount = (projects ?? []).filter(p => p.status === 'active').length
  const issuesCount = (projects ?? []).filter(p => p.status === 'delivered_with_issues').length
  const closedCount = (projects ?? []).filter(p => p.status === 'closed').length

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>לוח בקרה</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{(projects ?? []).length} פרויקטים במערכת</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {can(role, BILLING_ROLES) && <BillingAlertBadge count={pendingBillingCount} />}
          {can(role, CREATE_PROJECT_ROLES) && (
            <Link href="/projects/new" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
              פרויקט חדש
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <StatCard label="פעיל" value={activeCount} color="var(--status-active)" />
        <StatCard label="עם בעיות" value={issuesCount} color="var(--status-issues)" />
        <StatCard label="סגור" value={closedCount} color="var(--text-muted)" />
      </div>

      <FilterBar selected={selected} searchQuery={searchQuery} sortValue={sortValue} />

      {enriched.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>אין פרויקטים להצגה</p>
          {can(role, CREATE_PROJECT_ROLES) && (
            <Link href="/projects/new" style={{ fontSize: '0.85rem', color: 'var(--brand)', textDecoration: 'none' }}>
              צור את הפרויקט הראשון ←
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {enriched.map((p, i) => (
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
