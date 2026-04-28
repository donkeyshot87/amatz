'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserProfile, UserRole } from '@/lib/types'
import { useRouter } from 'next/navigation'

const ROLE_LABELS: Record<UserRole, string> = {
  developer: 'מנכ"ל (איציק)',
  admin: 'אדמין (ניר)',
  coordinator: 'מרכזת',
  production: 'ייצור',
  finance: 'כספים',
  field_manager: 'מנהל שטח',
  production_manager: 'מנהל ייצור',
}

interface Props {
  users: UserProfile[]
}

export function UserManagement({ users }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateRole(userId: string, role: UserRole) {
    setLoading(userId + '_role')
    const supabase = createClient()
    await supabase.from('user_profiles').update({ role }).eq('id', userId)
    setLoading(null)
    router.refresh()
  }

  async function toggleCanEdit(userId: string, canEdit: boolean) {
    setLoading(userId + '_edit')
    const supabase = createClient()
    await supabase.from('user_profiles').update({ can_edit: canEdit }).eq('id', userId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {users.map(user => (
        <div
          key={user.id}
          className="card"
          style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
        >
          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>{user.full_name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={user.role}
              onChange={e => updateRole(user.id, e.target.value as UserRole)}
              disabled={loading === user.id + '_role'}
              className="input-field"
              style={{ width: 'auto' }}
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={user.can_edit ?? true}
                disabled={loading === user.id + '_edit'}
                onChange={e => toggleCanEdit(user.id, e.target.checked)}
              />
              עריכה מופעלת
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}
