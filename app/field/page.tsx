import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatusFilterBar } from '@/components/StatusFilterBar'
import { FieldStageCard } from '@/components/FieldStageCard'
import { UserRole } from '@/lib/types'
import Link from 'next/link'

const FIELD_ROLES = ['developer', 'admin', 'field_manager']
const DEFAULT_STATUSES = ['pending', 'in_progress']

interface Props {
  searchParams: Promise<{ s?: string | string[] }>
}

export default async function FieldPage({ searchParams }: Props) {
  const { s } = await searchParams
  const selected: string[] = s ? (Array.isArray(s) ? s : [s]) : DEFAULT_STATUSES

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!FIELD_ROLES.includes(profile?.role ?? '')) redirect('/dashboard')

  const isAdmin = ['developer', 'admin'].includes(profile?.role ?? '')

  let stagesQuery = supabase
    .from('project_stages')
    .select(`*, projects(id, name, project_number, client_name, contract_value, cost_estimate)`)
    .in('stage_number', [3, 6, 7])
    .in('status', selected.length > 0 ? selected : ['pending'])
    .order('stage_number', { ascending: true })

  if (!isAdmin) stagesQuery = stagesQuery.eq('owner_id', user.id)

  const { data: stages } = await stagesQuery

  // Group by project
  const projectMap = new Map<string, { project: any; stages: any[] }>()
  for (const stage of stages ?? []) {
    const pid = stage.project_id
    if (!projectMap.has(pid)) projectMap.set(pid, { project: stage.projects, stages: [] })
    projectMap.get(pid)!.stages.push(stage)
  }
  const grouped = Array.from(projectMap.values())

  // Fetch attachments for all relevant project_ids
  const projectIds = Array.from(projectMap.keys())
  const { data: attachments } = projectIds.length > 0
    ? await supabase.from('attachments').select('*').in('project_id', projectIds)
    : { data: [] }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
      }}>שטח</h1>

      <StatusFilterBar selected={selected} />

      {grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <p>אין שלבים להצגה</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {grouped.map(({ project, stages: projectStages }) => (
            <FieldStageCard
              key={project.id}
              project={project}
              stages={projectStages}
              attachments={(attachments ?? []).filter((a: any) => a.project_id === project.id)}
              currentUserId={user.id}
              currentUserRole={(profile?.role ?? 'field_manager') as UserRole}
            />
          ))}
        </div>
      )}
    </div>
  )
}
