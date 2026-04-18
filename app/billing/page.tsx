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

  const { data: alerts } = await supabase
    .from('billing_alerts')
    .select(`*, projects(name, project_number), project_stages(stage_name, stage_number)`)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const pending = (alerts ?? []).filter(a => a.status === 'pending')
  const doneThisMonth = (alerts ?? []).filter(a => a.status === 'done' && a.created_at >= startOfMonth)
  const totalPending = pending.reduce((sum, a) => sum + Number(a.amount), 0)
  const totalDoneMonth = doneThisMonth.reduce((sum, a) => sum + Number(a.amount), 0)

  return (
    <BillingClient
      alerts={alerts ?? []}
      totalPending={totalPending}
      totalDoneMonth={totalDoneMonth}
      currentUserId={user.id}
    />
  )
}
