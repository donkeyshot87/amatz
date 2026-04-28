'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StagePulse, UserRole } from '@/lib/types'
import { STAGE_STATUS_LABELS } from '@/lib/formatters'
import { can, FINANCE_ROLES } from '@/lib/permissions'

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'ממתין' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'completed',   label: 'הושלם' },
  { value: 'blocked',     label: 'חסום' },
]

interface Props {
  stageId: string
  stageNumber: number
  projectId: string
  contractValue: number | null
  pulses: StagePulse[]
  currentUserRole: UserRole
  canEditProp: boolean
  onUpdated: () => void
}

const STAGE6_CATEGORIES = [
  { key: 'openings',  label: 'פתחים' },
  { key: 'windows',   label: 'חלונות' },
  { key: 'showcases', label: 'ויטרינות' },
  { key: 'curtain',   label: 'קירות מסך' },
] as const

export function PulsePanel({ stageId, stageNumber, projectId, contractValue, pulses, currentUserRole, canEditProp, onUpdated }: Props) {
  const isAdmin = can(currentUserRole, FINANCE_ROLES)
  const [loading, setLoading] = useState<string | null>(null)

  async function addPulse() {
    const supabase = createClient()
    const nextNum = (pulses.length > 0 ? Math.max(...pulses.map(p => p.pulse_number)) : 0) + 1
    await supabase.from('stage_pulses').insert({
      stage_id: stageId,
      project_id: projectId,
      pulse_number: nextNum,
      name: `פעימה ${nextNum}`,
      billing_pct: 0,
      status: 'pending',
    })
    onUpdated()
  }

  async function deletePulse(pulseId: string) {
    const supabase = createClient()
    await supabase.from('stage_pulses').delete().eq('id', pulseId)
    onUpdated()
  }

  async function updatePulseStatus(pulse: StagePulse, newStatus: string) {
    setLoading(pulse.id)
    const supabase = createClient()
    await supabase.from('stage_pulses').update({ status: newStatus }).eq('id', pulse.id)

    if (newStatus === 'in_progress' && pulse.billing_pct > 0 && contractValue) {
      const amount = contractValue * pulse.billing_pct / 100
      await supabase.from('billing_alerts').insert({
        project_id: projectId,
        stage_id: stageId,
        amount,
      })
    }
    setLoading(null)
    onUpdated()
  }

  async function updateQty(pulseId: string, field: string, value: number) {
    const supabase = createClient()
    await supabase.from('stage_pulses').update({ [field]: value }).eq('id', pulseId)
    onUpdated()
  }

  async function updatePulseMeta(pulseId: string, field: string, value: string | number) {
    const supabase = createClient()
    await supabase.from('stage_pulses').update({ [field]: value }).eq('id', pulseId)
    onUpdated()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {pulses.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>אין פעימות עדיין.</p>
      )}

      {pulses.map(pulse => (
        <div key={pulse.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-raised)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {isAdmin && canEditProp ? (
              <input
                defaultValue={pulse.name ?? ''}
                onBlur={e => updatePulseMeta(pulse.id, 'name', e.target.value)}
                className="input-field"
                style={{ maxWidth: '140px' }}
              />
            ) : (
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{pulse.name ?? `פעימה ${pulse.pulse_number}`}</span>
            )}

            {isAdmin && canEditProp ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={pulse.billing_pct}
                  onBlur={e => updatePulseMeta(pulse.id, 'billing_pct', parseInt(e.target.value))}
                  className="input-field"
                  style={{ width: '55px' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--brand)', fontWeight: 600 }}>{pulse.billing_pct}%</span>
            )}

            {canEditProp ? (
              <select
                value={pulse.status}
                onChange={e => updatePulseStatus(pulse, e.target.value)}
                disabled={loading === pulse.id}
                className="input-field"
                style={{ width: 'auto' }}
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{STAGE_STATUS_LABELS[pulse.status]}</span>
            )}

            {isAdmin && canEditProp && pulse.status === 'pending' && (
              <button
                onClick={() => deletePulse(pulse.id)}
                style={{ fontSize: '0.75rem', color: 'var(--status-issues)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 'auto' }}
              >
                מחק
              </button>
            )}
          </div>

          {stageNumber === 6 && STAGE6_CATEGORIES.map(cat => {
            const plannedKey = `qty_${cat.key}_planned` as keyof StagePulse
            const actualKey  = `qty_${cat.key}_actual`  as keyof StagePulse
            const planned = pulse[plannedKey] as number | null
            const actual  = pulse[actualKey]  as number
            return (
              <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '6px', fontSize: '0.82rem' }}>
                <span style={{ minWidth: '90px', color: 'var(--text-secondary)' }}>{cat.label}</span>
                {isAdmin && canEditProp ? (
                  <input
                    type="number"
                    min={0}
                    defaultValue={planned ?? ''}
                    placeholder="סה״כ"
                    onBlur={e => updateQty(pulse.id, plannedKey as string, parseInt(e.target.value))}
                    className="input-field"
                    style={{ width: '70px' }}
                  />
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>{planned ?? '—'}</span>
                )}
                <span style={{ color: 'var(--text-muted)' }}>סה״כ |</span>
                {canEditProp ? (
                  <input
                    type="number"
                    min={0}
                    defaultValue={actual}
                    onBlur={e => updateQty(pulse.id, actualKey as string, parseInt(e.target.value))}
                    className="input-field"
                    style={{ width: '70px' }}
                  />
                ) : (
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{actual}</span>
                )}
                <span style={{ color: 'var(--text-muted)' }}>הותקנו</span>
                {planned != null && planned > 0 && (
                  <span style={{ fontSize: '0.72rem', color: actual >= planned ? 'var(--status-done)' : 'var(--text-muted)' }}>
                    ({Math.round((actual / planned) * 100)}%)
                  </span>
                )}
              </div>
            )
          })}

          {stageNumber === 3 && (() => {
            const planned = pulse.qty_blind_frame_planned
            const actual  = pulse.qty_blind_frame_actual
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem' }}>
                <span style={{ minWidth: '90px', color: 'var(--text-secondary)' }}>משקוף עיוור</span>
                {isAdmin && canEditProp ? (
                  <input
                    type="number"
                    min={0}
                    defaultValue={planned ?? ''}
                    placeholder="סה״כ"
                    onBlur={e => updateQty(pulse.id, 'qty_blind_frame_planned', parseInt(e.target.value))}
                    className="input-field"
                    style={{ width: '70px' }}
                  />
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>{planned ?? '—'}</span>
                )}
                <span style={{ color: 'var(--text-muted)' }}>סה״כ |</span>
                {canEditProp ? (
                  <input
                    type="number"
                    min={0}
                    defaultValue={actual}
                    onBlur={e => updateQty(pulse.id, 'qty_blind_frame_actual', parseInt(e.target.value))}
                    className="input-field"
                    style={{ width: '70px' }}
                  />
                ) : (
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{actual}</span>
                )}
                <span style={{ color: 'var(--text-muted)' }}>הותקנו</span>
                {planned != null && planned > 0 && (
                  <span style={{ fontSize: '0.72rem', color: actual >= planned ? 'var(--status-done)' : 'var(--text-muted)' }}>
                    ({Math.round((actual / planned) * 100)}%)
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      ))}

      {isAdmin && canEditProp && (
        <button onClick={addPulse} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>
          + הוסף פעימה
        </button>
      )}
    </div>
  )
}
