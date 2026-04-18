import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatProjectNumber, STAGE_STATUS_LABELS } from '@/lib/formatters'
import Link from 'next/link'

const FIELD_ROLES = ['developer', 'admin', 'field_manager']

export default async function FieldPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!FIELD_ROLES.includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: stages } = await supabase
    .from('project_stages')
    .select(`*, projects(id, name, project_number, client_name)`)
    .eq('owner_id', user.id)
    .in('stage_number', [3, 6, 7])
    .in('status', ['pending', 'in_progress', 'blocked'])

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← לוח בקרה</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">שטח</h1>

      {(stages ?? []).length === 0 ? (
        <p className="text-gray-400 text-center py-12">אין שלבים פעילים</p>
      ) : (
        <div className="space-y-4">
          {(stages ?? []).map((stage: any) => (
            <div key={stage.id} className="bg-white rounded-2xl shadow p-5">
              <p className="text-xs text-gray-400 font-mono">{formatProjectNumber(stage.projects?.project_number)}</p>
              <Link href={`/projects/${stage.project_id}`} className="font-semibold text-blue-600 hover:underline">
                {stage.projects?.name}
              </Link>
              <p className="text-sm text-gray-500">{stage.projects?.client_name}</p>
              <div className="mt-3 bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-medium">שלב {stage.stage_number}: {stage.stage_name}</p>
                <p className="text-xs text-gray-500">{STAGE_STATUS_LABELS[stage.status]}</p>
              </div>
              <div className="mt-3">
                <Link
                  href={`/projects/${stage.project_id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  עדכן שלב / העלה קובץ / פתח זנב ←
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
