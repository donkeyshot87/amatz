'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  currentUserId: string
  onCreated: () => void
  onCancel: () => void
}

const ADDITION_STAGE_NAMES = ['הסכם', 'שרטוטים', 'ייצור', 'התקנה', 'מסירה']

export function AdditionForm({ projectId, currentUserId, onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contractValue, setContractValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('יש להזין שם תוספת'); return }
    setSaving(true)
    const supabase = createClient()

    const { data: addition, error: insertErr } = await supabase
      .from('additions')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || null,
        contract_value: contractValue ? parseFloat(contractValue) : null,
        created_by: currentUserId,
      })
      .select()
      .single()

    if (insertErr || !addition) { setError('שגיאה בשמירה'); setSaving(false); return }

    await supabase.from('addition_stages').insert(
      ADDITION_STAGE_NAMES.map((stageName, i) => ({
        addition_id: addition.id,
        stage_number: i + 1,
        stage_name: stageName,
        billing_pct: 0,
      }))
    )

    setSaving(false)
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)' }}>
      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>תוספת חדשה</p>
      <input
        className="input-field"
        placeholder="שם התוספת *"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <input
        className="input-field"
        placeholder="תיאור (אופציונלי)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <input
        className="input-field"
        type="number"
        placeholder="ערך חוזה ₪ (אופציונלי)"
        value={contractValue}
        onChange={e => setContractValue(e.target.value)}
      />
      {error && <p style={{ color: 'var(--status-issues)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'שומר...' : 'צור תוספת'}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>ביטול</button>
      </div>
    </form>
  )
}
