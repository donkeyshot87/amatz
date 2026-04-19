'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, ProjectStage, UserRole, TailIssue, Attachment } from '@/lib/types'
import { StageTimeline } from '@/components/StageTimeline'
import { ConfirmationToast } from '@/components/ConfirmationToast'
import { TailIssueForm } from '@/components/TailIssueForm'
import { TailIssueList } from '@/components/TailIssueList'
import { formatProjectNumber, formatDate, formatCurrency, PROJECT_STATUS_LABELS, STAGE_STATUS_LABELS } from '@/lib/formatters'
import { can, FINANCE_ROLES, CREATE_PROJECT_ROLES } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface HistoryEntry {
  id: string
  changed_at: string
  changed_by: string | null
  old_status: string | null
  new_status: string
  project_stages: { stage_name: string; stage_number: number } | null
}

interface Props {
  project: Project
  stages: ProjectStage[]
  tailIssues: TailIssue[]
  attachments: Attachment[]
  currentUserId: string
  currentUserRole: UserRole
  ownerNames: Record<string, string>
  history: HistoryEntry[]
}

const PROJECT_STATUS_DOT: Record<string, string> = {
  active: 'status-dot status-dot-active',
  delivered_with_issues: 'status-dot status-dot-issues',
  closed: 'status-dot status-dot-closed',
}

const PROJECT_STATUS_BADGE: Record<string, string> = {
  active: 'badge badge-active',
  delivered_with_issues: 'badge badge-issues',
  closed: 'badge badge-closed',
}

export function ProjectDetail({ project, stages, tailIssues, attachments, currentUserId, currentUserRole, ownerNames, history }: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(project.name)
  const [savingName, setSavingName] = useState(false)
  const canEdit = can(currentUserRole, CREATE_PROJECT_ROLES)

  function handleStageUpdated(message: string) {
    setToast(message)
    router.refresh()
  }

  async function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === project.name) { setEditingName(false); setNameValue(project.name); return }
    setSavingName(true)
    const supabase = createClient()
    await supabase.from('projects').update({ name: trimmed }).eq('id', project.id)
    setSavingName(false)
    setEditingName(false)
    router.refresh()
  }

  const openTailCount = tailIssues.filter(t => t.status !== 'resolved').length

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Back link */}
      <Link href="/dashboard" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← לוח בקרה
      </Link>

      {/* Project header card */}
      <div className="card metal-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '0.68rem',
              fontFamily: 'monospace',
              color: 'var(--gold)',
              fontWeight: 600,
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}>
              {formatProjectNumber(project.project_number)}
            </p>

            {editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameValue(project.name) } }}
                disabled={savingName}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '2px solid var(--gold)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '100%',
                  letterSpacing: '-0.02em',
                }}
              />
            ) : (
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  cursor: canEdit ? 'pointer' : 'default',
                }}
                onClick={() => canEdit && setEditingName(true)}
                title={canEdit ? 'לחץ לעריכה' : undefined}
              >
                {nameValue}
                {canEdit && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginRight: '8px', opacity: 0.5 }}> ✎</span>}
              </h1>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{project.client_name}</span>
              {project.planned_delivery_date && (
                <>
                  <span style={{ color: 'var(--border-mid)' }}>·</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>מסירה: {formatDate(project.planned_delivery_date)}</span>
                </>
              )}
              {project.actual_delivery_date && (
                <>
                  <span style={{ color: 'var(--border-mid)' }}>·</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>בפועל: {formatDate(project.actual_delivery_date)}</span>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={PROJECT_STATUS_DOT[project.status]} />
              <span className={PROJECT_STATUS_BADGE[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</span>
            </div>
            {openTailCount > 0 && (
              <span className="badge badge-issues">{openTailCount} זנב פתוח</span>
            )}
          </div>
        </div>

        {/* Finance data */}
        {can(currentUserRole, FINANCE_ROLES) && (
          <div style={{
            marginTop: '1.25rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            background: 'var(--bg-deep)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
          }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ערך חוזה</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold-bright)', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1 }}>
                {formatCurrency(project.contract_value)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>עלות מוערכת</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1 }}>
                {formatCurrency(project.cost_estimate)}
              </p>
            </div>
          </div>
        )}

        {project.description && (
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {project.description}
          </p>
        )}
      </div>

      {/* Stage timeline */}
      <SectionTitle>שלבי הפרויקט</SectionTitle>
      <div style={{ marginBottom: '1.5rem' }}>
        <StageTimeline
          stages={stages}
          attachments={attachments}
          project={project}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onStageUpdated={handleStageUpdated}
          onRefresh={() => router.refresh()}
        />
      </div>

      {/* Tail issues */}
      <SectionTitle>זנבות</SectionTitle>
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <TailIssueList issues={tailIssues} onUpdated={() => router.refresh()} />
        <div style={{ marginTop: tailIssues.length > 0 ? '1rem' : 0, paddingTop: tailIssues.length > 0 ? '1rem' : 0, borderTop: tailIssues.length > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
          <TailIssueForm projectId={project.id} onCreated={() => router.refresh()} />
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <>
          <SectionTitle>היסטוריית שינויים</SectionTitle>
          <div className="card" style={{ padding: '0.5rem 1.25rem', marginBottom: '1.5rem' }}>
            {history.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.7rem 0',
                  borderBottom: i < history.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    שלב {entry.project_stages?.stage_number}: {entry.project_stages?.stage_name}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>←</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{STAGE_STATUS_LABELS[entry.old_status ?? ''] ?? entry.old_status}</span>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{STAGE_STATUS_LABELS[entry.new_status] ?? entry.new_status}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, display: 'flex', gap: '6px' }}>
                  <span>{ownerNames[entry.changed_by ?? ''] ?? '—'}</span>
                  <span>·</span>
                  <span>{formatDate(entry.changed_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && <ConfirmationToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display)',
      fontSize: '1.05rem',
      fontWeight: 700,
      color: 'var(--text-secondary)',
      margin: '0 0 0.75rem',
      letterSpacing: '-0.01em',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{ width: '3px', height: '16px', background: 'var(--gold)', borderRadius: '2px', display: 'inline-block' }} />
      {children}
    </h2>
  )
}
