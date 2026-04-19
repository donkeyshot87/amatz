'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) { router.push('/login'); return }

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: form.get('name') as string,
        client_name: form.get('client_name') as string,
        description: (form.get('description') as string) || null,
        contract_value: form.get('contract_value') ? Number(form.get('contract_value')) : null,
        cost_estimate: form.get('cost_estimate') ? Number(form.get('cost_estimate')) : null,
        planned_delivery_date: (form.get('planned_delivery_date') as string) || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError || !project) {
      setError('שגיאה ביצירת הפרויקט. נסה שנית.')
      setLoading(false)
      return
    }

    await supabase.rpc('create_default_stages', { p_project_id: project.id })
    router.push(`/projects/${project.id}`)
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <Link href="/dashboard" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← לוח בקרה
      </Link>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.75rem',
        fontWeight: 900,
        color: 'var(--text-primary)',
        margin: '0 0 1.75rem',
        letterSpacing: '-0.02em',
      }}>פרויקט חדש</h1>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        <FormField label="שם הפרויקט *">
          <input name="name" required className="input-field" placeholder="לדוגמה: חלונות בניין מגורים רחוב הרצל" />
        </FormField>

        <FormField label="שם הלקוח *">
          <input name="client_name" required className="input-field" placeholder="שם הלקוח או החברה" />
        </FormField>

        <FormField label="תיאור">
          <textarea
            name="description"
            rows={3}
            className="input-field"
            placeholder="פירוט נוסף על הפרויקט (אופציונלי)"
            style={{ resize: 'vertical', minHeight: '80px' }}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="ערך חוזה (₪)">
            <input name="contract_value" type="number" step="0.01" min="0" className="input-field" placeholder="0" dir="ltr" />
          </FormField>
          <FormField label="עלות מוערכת (₪)">
            <input name="cost_estimate" type="number" step="0.01" min="0" className="input-field" placeholder="0" dir="ltr" />
          </FormField>
        </div>

        <FormField label="תאריך מסירה מתוכנן">
          <input name="planned_delivery_date" type="date" className="input-field" dir="ltr" />
        </FormField>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '6px',
            padding: '0.6rem 0.75rem',
            fontSize: '0.8rem',
            color: '#f87171',
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
            {loading ? 'יוצר פרויקט...' : '+ צור פרויקט'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>
            ביטול
          </button>
        </div>
      </form>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
