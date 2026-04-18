import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserManagement } from '@/components/UserManagement'
import { StageHistoryLog } from '@/components/StageHistoryLog'
import { formatCurrency, formatProjectNumber, PROJECT_STATUS_LABELS } from '@/lib/formatters'
import Link from 'next/link'

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
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← לוח בקרה</Link>
      </div>
      <h1 className="text-2xl font-bold">ניהול</h1>

      {/* Monthly summary */}
      <section>
        <h2 className="text-lg font-semibold mb-4">סיכום חודשי</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-gray-500">פרויקטים שנסגרו החודש</p>
            <p className="text-3xl font-bold mt-1">{closedThisMonth}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-gray-500">גבייה שהתקבלה החודש</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalCollectedMonth)}</p>
          </div>
        </div>
      </section>

      {/* All projects */}
      <section>
        <h2 className="text-lg font-semibold mb-4">כל הפרויקטים</h2>
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium">מספר</th>
                <th className="text-right px-4 py-3 font-medium">שם</th>
                <th className="text-right px-4 py-3 font-medium">לקוח</th>
                <th className="text-right px-4 py-3 font-medium">ערך חוזה</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(projects ?? []).map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{formatProjectNumber(p.project_number)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.client_name}</td>
                  <td className="px-4 py-3">{formatCurrency(p.contract_value)}</td>
                  <td className="px-4 py-3">{PROJECT_STATUS_LABELS[p.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* User management */}
      <section>
        <h2 className="text-lg font-semibold mb-4">ניהול משתמשים</h2>
        <UserManagement users={users ?? []} />
      </section>

      {/* History log */}
      <section>
        <h2 className="text-lg font-semibold mb-4">היסטוריית שינויים</h2>
        <div className="bg-white rounded-2xl shadow p-5">
          <StageHistoryLog history={history ?? []} />
        </div>
      </section>
    </div>
  )
}
