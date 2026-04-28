import Link from 'next/link'
import { Project } from '@/lib/types'
import { formatProjectNumber, formatDate, PROJECT_STATUS_LABELS } from '@/lib/formatters'

interface Props {
  project: Project & { open_tail_issues: number }
}

const STATUS_CONFIG: Record<string, { badge: string; dot: string; accent: string }> = {
  active:                { badge: 'badge badge-active',  dot: 'status-dot status-dot-active',  accent: 'var(--status-active)' },
  delivered_with_issues: { badge: 'badge badge-issues',  dot: 'status-dot status-dot-issues',  accent: 'var(--status-issues)' },
  closed:                { badge: 'badge badge-closed',  dot: 'status-dot status-dot-closed',  accent: 'var(--status-closed)' },
}

export function ProjectCard({ project }: Props) {
  const hasOpenTails = project.open_tail_issues > 0
  const statusKey = hasOpenTails ? 'delivered_with_issues' : project.status
  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.active

  return (
    <Link href={`/projects/${project.id}`} className="project-card-link">
      <div
        className="card project-card"
        style={{ borderRight: `3px solid ${config.accent}` }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontSize: '0.65rem',
              fontFamily: 'monospace',
              color: 'var(--brand)',
              fontWeight: 600,
              letterSpacing: '0.05em',
              marginBottom: '4px',
            }}>
              {formatProjectNumber(project.project_number)}
            </p>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--text-primary)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}>
              {project.name}
            </h3>
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {project.client_name}
            </p>
          </div>
          <span className={hasOpenTails ? 'badge badge-issues' : config.badge} style={{ flexShrink: 0 }}>
            {hasOpenTails ? `גמרים (${project.open_tail_issues})` : PROJECT_STATUS_LABELS[project.status]}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={config.dot} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
          </div>
          {project.planned_delivery_date && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              מסירה: {formatDate(project.planned_delivery_date)}
            </p>
          )}
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            נוצר: {formatDate(project.created_at)}
          </p>
        </div>
      </div>
    </Link>
  )
}
