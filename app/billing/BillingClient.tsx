'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BillingAlertStatus } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { deleteBillingAlert, createBillingAlert } from './actions'
import Link from 'next/link'

interface Alert {
  id: string
  amount: number
  status: BillingAlertStatus
  created_at: string
  project_id: string
  stage_id: string | null
  projects: { name: string; project_number: number } | null
  project_stages: { stage_name: string; stage_number: number; billing_pct: number } | null
}

interface Project {
  id: string
  name: string
  project_number: number
  contract_value: number | null
}

interface Stage {
  id: string
  project_id: string
  stage_number: number
  stage_name: string
  billing_pct: number
}

interface Props {
  alerts: Alert[]
  projects: Project[]
  allStages: Stage[]
  totalPending: number
  totalDoneMonth: number
  currentUserId: string
}

const STATUS_LABELS: Record<BillingAlertStatus, string> = {
  pending: 'ממתין',
  in_progress: 'בטיפול',
  done: 'טופל',
}

const STATUS_BADGE: Record<BillingAlertStatus, string> = {
  pending: 'badge badge-pending',
  in_progress: 'badge badge-in-progress',
  done: 'badge badge-done',
}

export function BillingClient({ alerts, projects, allStages, totalPending, totalDoneMonth, currentUserId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [filterProjects, setFilterProjects] = useState<Set<string>>(new Set())
  const [filterStages, setFilterStages] = useState<Set<string>>(new Set())
  const [projectSearch, setProjectSearch] = useState('')
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectId, setNewProjectId] = useState('')
  const [newStageId, setNewStageId] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function updateAlert(alertId: string, status: BillingAlertStatus) {
    setLoading(alertId)
    const supabase = createClient()
    await supabase.from('billing_alerts')
      .update({ status, handled_by: currentUserId })
      .eq('id', alertId)
    setLoading(null)
    router.refresh()
  }

  async function deleteAlert(alertId: string) {
    setDeletingId(alertId)
    await deleteBillingAlert(alertId)
    setDeletingId(null)
    router.refresh()
  }

  async function createAlert() {
    if (!newProjectId || !newAmount) return
    setCreating(true)
    await createBillingAlert({
      project_id: newProjectId,
      stage_id: newStageId || null,
      amount: parseFloat(newAmount),
    })
    setCreating(false)
    setShowCreateForm(false)
    setNewProjectId('')
    setNewStageId('')
    setNewAmount('')
    router.refresh()
  }

  function toggleProject(id: string) {
    setFilterProjects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setFilterStages(new Set())
    setProjectSearch('')
  }

  function toggleStage(num: string) {
    setFilterStages(prev => {
      const next = new Set(prev)
      next.has(num) ? next.delete(num) : next.add(num)
      return next
    })
  }

  const stageOptions = Array.from(
    new Map(
      alerts
        .filter(a => filterProjects.size === 0 || filterProjects.has(a.project_id))
        .filter(a => a.project_stages)
        .map(a => [a.project_stages!.stage_number, a.project_stages!.stage_name])
    ).entries()
  ).sort((a, b) => a[0] - b[0])

  const filtered = alerts.filter(a => {
    if (filterProjects.size > 0 && !filterProjects.has(a.project_id)) return false
    if (filterStages.size > 0 && !filterStages.has(String(a.project_stages?.stage_number))) return false
    return true
  })

  const hasFilter = filterProjects.size > 0 || filterStages.size > 0

  // Stages for the selected project in the create form
  const formStages = allStages.filter(s => s.project_id === newProjectId)
  const selectedProject = projects.find(p => p.id === newProjectId)
  const selectedStage = allStages.find(s => s.id === newStageId)

  // Auto-calculate amount when stage is selected
  function onStageSelect(stageId: string) {
    setNewStageId(stageId)
    const stage = allStages.find(s => s.id === stageId)
    const project = projects.find(p => p.id === newProjectId)
    if (stage && project?.contract_value && stage.billing_pct > 0) {
      setNewAmount(String(Math.round(project.contract_value * stage.billing_pct / 100)))
    }
  }

  const chipStyle = (active: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.3rem 0.7rem',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
    border: `1px solid ${active ? 'var(--brand)' : 'var(--border-mid)'}`,
    borderRadius: '999px',
    background: active ? 'var(--brand)' : 'var(--bg-surface)',
    color: active ? '#fff' : 'var(--text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
  })

  const inputStyle = {
    padding: '0.45rem 0.75rem',
    fontSize: '0.85rem',
    border: '1px solid var(--border-mid)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    width: '100%',
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      <Link href="/dashboard" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← לוח בקרה
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: 900,
          color: 'var(--text-primary)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>גבייה</h1>
        <button
          onClick={() => setShowCreateForm(v => !v)}
          className="btn-primary"
          style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
        >
          {showCreateForm ? 'ביטול' : '+ פקודת גבייה ידנית'}
        </button>
      </div>

      {/* Manual create form */}
      {showCreateForm && (
        <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', borderRight: '3px solid var(--brand)' }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem' }}>פקודת גבייה חדשה</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>פרויקט *</label>
              <select value={newProjectId} onChange={e => { setNewProjectId(e.target.value); setNewStageId(''); setNewAmount('') }} style={inputStyle}>
                <option value="">בחר פרויקט</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.project_number} — {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>שלב (אופציונלי)</label>
              <select value={newStageId} onChange={e => onStageSelect(e.target.value)} style={inputStyle} disabled={!newProjectId}>
                <option value="">בחר שלב</option>
                {formStages.map(s => (
                  <option key={s.id} value={s.id}>שלב {s.stage_number} — {s.stage_name} ({s.billing_pct}%)</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                סכום (₪) *
                {selectedStage && selectedProject?.contract_value && selectedStage.billing_pct > 0 && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--brand)', marginRight: '6px' }}>
                    ({selectedStage.billing_pct}% × {formatCurrency(selectedProject.contract_value)})
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          </div>
          <button
            onClick={createAlert}
            disabled={creating || !newProjectId || !newAmount}
            className="btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem' }}
          >
            {creating ? 'יוצר...' : 'צור פקודת גבייה'}
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem 1.5rem', borderRight: '3px solid var(--status-pending)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>ממתין לגבייה</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24', margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="card" style={{ padding: '1.25rem 1.5rem', borderRight: '3px solid var(--status-done)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>טופל החודש</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#4ade80', margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {formatCurrency(totalDoneMonth)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* Project combobox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: `1px solid ${projectDropdownOpen ? 'var(--brand)' : 'var(--border-mid)'}`,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                padding: '0.35rem 0.6rem',
                cursor: 'text',
                gap: '4px',
                flexWrap: 'wrap',
                minHeight: '36px',
              }}
              onClick={() => setProjectDropdownOpen(true)}
            >
              {filterProjects.size === 0 && !projectDropdownOpen && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>סנן לפי פרויקט...</span>
              )}
              {Array.from(filterProjects).map(id => {
                const p = projects.find(p => p.id === id)
                return p ? (
                  <span key={id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'var(--brand)', color: '#fff',
                    borderRadius: '999px', padding: '1px 8px', fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    {p.project_number} — {p.name}
                    <button onClick={e => { e.stopPropagation(); toggleProject(id) }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '0.8rem' }}>✕</button>
                  </span>
                ) : null
              })}
              <input
                value={projectSearch}
                onChange={e => { setProjectSearch(e.target.value); setProjectDropdownOpen(true) }}
                onFocus={() => setProjectDropdownOpen(true)}
                onBlur={() => setTimeout(() => setProjectDropdownOpen(false), 150)}
                placeholder={filterProjects.size > 0 ? '' : ''}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', color: 'var(--text-primary)', minWidth: '80px', flex: 1 }}
              />
            </div>
            {projectDropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0, zIndex: 100,
                background: 'var(--bg-surface)', border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                maxHeight: '220px', overflowY: 'auto',
              }}>
                {projects
                  .filter(p => {
                    const q = projectSearch.toLowerCase()
                    return p.name.toLowerCase().includes(q) || String(p.project_number).includes(q)
                  })
                  .map(p => (
                    <div
                      key={p.id}
                      onMouseDown={() => toggleProject(p.id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        background: filterProjects.has(p.id) ? '#eff6ff' : 'transparent',
                        color: 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}
                      onMouseEnter={e => { if (!filterProjects.has(p.id)) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = filterProjects.has(p.id) ? '#eff6ff' : 'transparent' }}
                    >
                      {filterProjects.has(p.id) && <span style={{ color: 'var(--brand)', fontWeight: 700 }}>✓</span>}
                      <span>{p.project_number} — {p.name}</span>
                    </div>
                  ))
                }
                {projects.filter(p => {
                  const q = projectSearch.toLowerCase()
                  return p.name.toLowerCase().includes(q) || String(p.project_number).includes(q)
                }).length === 0 && (
                  <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>לא נמצאו פרויקטים</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stage chips — only when projects selected */}
        {stageOptions.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '2px', flexShrink: 0 }}>שלבים:</span>
            {stageOptions.map(([num, name]) => (
              <button key={num} onClick={() => toggleStage(String(num))} style={chipStyle(filterStages.has(String(num)))}>
                שלב {num} — {name}
              </button>
            ))}
          </div>
        )}

        {hasFilter && (
          <button
            onClick={() => { setFilterProjects(new Set()); setFilterStages(new Set()); setProjectSearch('') }}
            style={{ alignSelf: 'flex-start', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0' }}
          >
            נקה פילטר ✕
          </button>
        )}
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.95rem' }}>אין התראות גבייה</p>
          </div>
        )}
        {filtered.map(alert => (
          <div
            key={alert.id}
            className="card"
            style={{
              padding: '1.25rem 1.5rem',
              opacity: alert.status === 'done' ? 0.55 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {alert.projects?.name ?? 'פרויקט ידני'}
                  </span>
                  <span className={STATUS_BADGE[alert.status]}>
                    {STATUS_LABELS[alert.status]}
                  </span>
                </div>
                {alert.project_stages ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 2px' }}>
                    שלב {alert.project_stages.stage_number} — {alert.project_stages.stage_name}
                    {alert.project_stages.billing_pct != null && (
                      <span style={{ marginRight: '6px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        ({alert.project_stages.billing_pct}%)
                      </span>
                    )}
                  </p>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 2px' }}>הזנה ידנית</p>
                )}
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                  {formatDate(alert.created_at)}
                </p>
              </div>

              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <p style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-display)', margin: '0 0 0.75rem', lineHeight: 1.1 }}>
                  {formatCurrency(alert.amount)}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {alert.status === 'pending' && (
                    <button onClick={() => updateAlert(alert.id, 'in_progress')} disabled={loading === alert.id} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}>
                      בטיפול
                    </button>
                  )}
                  {alert.status === 'done' && (
                    <button onClick={() => updateAlert(alert.id, 'in_progress')} disabled={loading === alert.id} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}>
                      החזר לטיפול
                    </button>
                  )}
                  {alert.status !== 'done' && (
                    <button onClick={() => updateAlert(alert.id, 'done')} disabled={loading === alert.id} className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}>
                      ✓ טופל
                    </button>
                  )}
                  <button
                    onClick={() => { if (window.confirm('למחוק פקודת גבייה זו?')) deleteAlert(alert.id) }}
                    disabled={deletingId === alert.id}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: 'var(--status-issues)', borderColor: 'var(--status-issues)' }}
                    title="מחק"
                  >
                    {deletingId === alert.id ? '...' : '✕'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
