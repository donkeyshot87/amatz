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
    setLoading(userId)
    const supabase = createClient()
    await supabase.from('user_profiles').update({ role }).eq('id', userId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {users.map(user => (
        <div key={user.id} className="bg-white rounded-xl border p-4 flex items-center justify-between gap-3">
          <p className="font-medium">{user.full_name}</p>
          <select
            value={user.role}
            onChange={e => updateRole(user.id, e.target.value as UserRole)}
            disabled={loading === user.id}
            className="border rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
