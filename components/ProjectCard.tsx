import Link from 'next/link'
import { Project } from '@/lib/types'
import { formatProjectNumber, formatDate, PROJECT_STATUS_LABELS } from '@/lib/formatters'

const BORDER_COLORS: Record<string, string> = {
  active: 'border-r-blue-400',
  delivered_with_issues: 'border-r-red-500',
  closed: 'border-r-gray-300',
}

interface Props {
  project: Project & { open_tail_issues: number }
}

export function ProjectCard({ project }: Props) {
  const hasOpenTails = project.open_tail_issues > 0

  return (
    <Link href={`/projects/${project.id}`}>
      <div className={`bg-white rounded-2xl shadow hover:shadow-md transition-shadow border-r-4 p-5 cursor-pointer ${BORDER_COLORS[project.status]}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-mono">{formatProjectNumber(project.project_number)}</p>
            <h3 className="font-semibold text-gray-900 mt-0.5 truncate">{project.name}</h3>
            <p className="text-sm text-gray-500 truncate">{project.client_name}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
            hasOpenTails ? 'bg-red-100 text-red-700' :
            project.status === 'closed' ? 'bg-gray-100 text-gray-500' :
            'bg-blue-100 text-blue-700'
          }`}>
            {hasOpenTails ? `זנב (${project.open_tail_issues})` : PROJECT_STATUS_LABELS[project.status]}
          </span>
        </div>
        {project.planned_delivery_date && (
          <p className="text-xs text-gray-400 mt-3">מסירה: {formatDate(project.planned_delivery_date)}</p>
        )}
      </div>
    </Link>
  )
}
