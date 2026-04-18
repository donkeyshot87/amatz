import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProjectDetail } from './ProjectDetail'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: project }, { data: stages }, { data: profile }, { data: tailIssues }, { data: attachments }] =
    await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('project_stages').select('*').eq('project_id', id).order('stage_number'),
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('tail_issues').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('attachments').select('*').eq('project_id', id).order('uploaded_at', { ascending: false }),
    ])

  if (!project) redirect('/dashboard')

  return (
    <ProjectDetail
      project={project}
      stages={stages ?? []}
      tailIssues={tailIssues ?? []}
      attachments={attachments ?? []}
      currentUserId={user.id}
      currentUserRole={profile?.role ?? 'coordinator'}
    />
  )
}
