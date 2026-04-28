import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatProjectNumber, formatDate } from '@/lib/formatters'
import { FilterBar } from '@/components/FilterBar'
import { FieldStageCard } from '@/components/FieldStageCard'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

const PRODUCTION_ROLES = ['developer', 'admin', 'production', 'production_manager']
const PRODUCTION_STAGES = [2, 4, 5]
const DEFAULT_STATUSES = ['pending', 'in_progress']

interface Props {
  searchParams: Promise<{ s?: string | string[]; q?: string; sort?: string }>
}

export default async function ProductionPage({ searchParams }: Props) {
  const { s, q, sort } = await searchParams
  const raw: string[] = s ? (Array.isArray(s) ? s : [s]) : DEFAULT_STATUSES
  const selected: string[] = raw.includes('__none__') ? [] : raw
  const searchQuery = q ?? ''
  const sortValue = sort ?? 'created_desc'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!PRODUCTION_ROLES.includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: projects } = await supabase
    .from('projects')
    .select(`*, project_stages(*)`)
    .eq('status', 'active')
    .order('planned_delivery_date', { ascending: true })

  const productionProjects = (projects ?? [])
    .map(p => {
      const allStages = (p as any).project_stages as any[]
      const relevantStages = allStages
        .filter((s: any) => PRODUCTION_STAGES.includes(s.stage_number) && selected.includes(s.status))
        .sort((a: any, b: any) => a.stage_number - b.stage_number)
      return { ...p, relevantStages }
    })
    .filter(p => p.relevantStages.length > 0)

  const projectIds = productionProjects.map(p => p.id)
  const { data: attachments } = projectIds.length > 0
    ? await supabase.from('attachments').select('*').in('project_id', projectIds)
    : { data: [] }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <Link href="/dashboard" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← לוח בקרה
      </Link>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.75rem',
        fontWeight: 900,
        color: 'var(--text-primary)',
        margin: '0 0 1.5rem',
        letterSpacing: '-0.02em',
      }}>ייצור</h1>

      <FilterBar selected={selected} searchQuery={searchQuery} sortValue={sortValue} />

      {productionProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <p>אין פרויקטים להצגה</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {productionProjects.map(project => (
            <FieldStageCard
              key={project.id}
              project={project}
              stages={project.relevantStages}
              attachments={(attachments ?? []).filter((a: any) => a.project_id === project.id)}
              currentUserId={user.id}
              currentUserRole={(profile?.role ?? 'production') as UserRole}
            />
          ))}
        </div>
      )}
    </div>
  )
}
