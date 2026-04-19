'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="btn-ghost"
      style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.3rem 0.6rem' }}
    >
      יציאה
    </button>
  )
}
