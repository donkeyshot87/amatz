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

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">לוח בקרה</h1>
        <div className="flex items-center gap-3">
          {can(role, BILLING_ROLES) && <BillingAlertBadge count={pendingBillingCount} />}
          {can(role, CREATE_PROJECT_ROLES) && (
            <Link
              href="/projects/new"
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >
              + פרויקט חדש
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <Link
            key={f.value}
            href={f.value ? `?status=${f.value}` : '/dashboard'}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              (filterStatus ?? '') === f.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {enrichedProjects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">אין פרויקטים להצגה</p>
          {can(role, CREATE_PROJECT_ROLES) && (
            <Link href="/projects/new" className="text-blue-600 hover:underline text-sm mt-2 block">
              צור את הפרויקט הראשון
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrichedProjects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  )
}
