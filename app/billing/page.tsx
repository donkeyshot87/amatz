import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { can, BILLING_ROLES } from '@/lib/permissions'
import { BillingClient } from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!can(profile?.role, BILLING_ROLES)) redirect('/dashboard')

  // Clean up billing_alerts for soft-deleted projects
  const { data: deletedProjects } = await supabase
    .from('projects')
    .select('id')
    .not('deleted_at', 'is', null)
  if (deletedProjects && deletedProjects.length > 0) {
    const deletedIds = deletedProjects.map(p => p.id)
    await supabase.from('billing_alerts').delete().in('project_id', deletedIds)
  }


  const { data: rawAlerts } = await supabase
    .from('billing_alerts')
    .select(`*, projects(name, project_number), project_stages(stage_name, stage_number, billing_pct)`)
    .order('status', { ascending: true })

  const STATUS_ORDER: Record<string, number> = { pending: 0, in_progress: 1, done: 2 }
  const alerts = (rawAlerts ?? []).sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0)
    if (statusDiff !== 0) return statusDiff
    const projectDiff = (a.projects?.project_number ?? 0) - (b.projects?.project_number ?? 0)
    if (projectDiff !== 0) return projectDiff
    return (a.project_stages?.stage_number ?? 0) - (b.project_stages?.stage_number ?? 0)
  })

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, project_number, contract_value')
    .is('deleted_at', null)
    .order('project_number', { ascending: true })

  // Fetch all stages for manual creation form
  const { data: allStages } = await supabase
    .from('project_stages')
    .select('id, project_id, stage_number, stage_name, billing_pct')
    .order('stage_number', { ascending: true })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const pending = (alerts ?? []).filter(a => a.status === 'pending')
  const doneThisMonth = (alerts ?? []).filter(a => a.status === 'done' && a.created_at >= startOfMonth)
  const totalPending = pending.reduce((sum, a) => sum + Number(a.amount), 0)
  const totalDoneMonth = doneThisMonth.reduce((sum, a) => sum + Number(a.amount), 0)

  return (
    <BillingClient
      alerts={alerts ?? []}
      projects={projects ?? []}
      allStages={allStages ?? []}
      totalPending={totalPending}
      totalDoneMonth={totalDoneMonth}
      currentUserId={user.id}
    />
  )
}
