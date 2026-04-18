import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatProjectNumber, formatDate, STAGE_STATUS_LABELS } from '@/lib/formatters'
import Link from 'next/link'

const PRODUCTION_ROLES = ['developer', 'admin', 'production', 'production_manager']

export default async function ProductionPage() {
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

  const productionProjects = (projects ?? []).filter(p => {
    const stages = (p as any).project_stages as any[]
    return stages.some((s: any) =>
      [4, 5].includes(s.stage_number) && ['pending', 'in_progress', 'blocked'].includes(s.status)
    )
  })

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← לוח בקרה</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">ייצור</h1>

      {productionProjects.length === 0 ? (
        <p className="text-gray-400 text-center py-12">אין פרויקטים בשלב ייצור</p>
      ) : (
        <div className="space-y-4">
          {productionProjects.map(project => {
            const stages = (project as any).project_stages as any[]
            const activeStage = stages
              .filter((s: any) => [4, 5].includes(s.stage_number))
              .sort((a: any, b: any) => a.stage_number - b.stage_number)[0]

            return (
              <div key={project.id} className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-mono">{formatProjectNumber(project.project_number)}</p>
                    <Link href={`/projects/${project.id}`} className="font-semibold text-blue-600 hover:underline">
                      {project.name}
                    </Link>
                    <p className="text-sm text-gray-500">{project.client_name}</p>
                  </div>
                  {project.planned_delivery_date && (
                    <p className="text-sm text-gray-400 flex-shrink-0">
                      מסירה: {formatDate(project.planned_delivery_date)}
                    </p>
                  )}
                </div>
                {activeStage && (
                  <div className="mt-3 bg-blue-50 rounded-xl p-3">
                    <p className="text-sm font-medium">שלב {activeStage.stage_number}: {activeStage.stage_name}</p>
                    <p className="text-xs text-gray-500">{STAGE_STATUS_LABELS[activeStage.status]}</p>
                    {activeStage.notes && <p className="text-xs text-gray-500 mt-1">{activeStage.notes}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
