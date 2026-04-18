import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { can, BILLING_ROLES, USER_MGMT_ROLES } from '@/lib/permissions'
import { UserRole } from '@/lib/types'
import { LogoutButton } from './LogoutButton'

const PRODUCTION_ROLES: UserRole[] = ['developer', 'admin', 'production', 'production_manager']
const FIELD_ROLES: UserRole[] = ['developer', 'admin', 'field_manager']

export async function NavBar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role: UserRole = profile?.role ?? 'coordinator'

  let pendingCount = 0
  if (can(role, BILLING_ROLES)) {
    const { count } = await supabase
      .from('billing_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingCount = count ?? 0
  }

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <Link href="/dashboard" className="font-bold text-gray-900 text-lg">
        אמץ אלומיניום
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">לוח בקרה</Link>

        {can(role, BILLING_ROLES) && (
          <Link href="/billing" className="relative text-gray-600 hover:text-gray-900">
            גבייה
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -left-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
        )}

        {PRODUCTION_ROLES.includes(role) && (
          <Link href="/production" className="text-gray-600 hover:text-gray-900">ייצור</Link>
        )}

        {FIELD_ROLES.includes(role) && (
          <Link href="/field" className="text-gray-600 hover:text-gray-900">שטח</Link>
        )}

        {can(role, USER_MGMT_ROLES) && (
          <Link href="/admin" className="text-gray-600 hover:text-gray-900">ניהול</Link>
        )}

        <span className="text-gray-300">|</span>
        <span className="text-gray-500 text-xs">{profile?.full_name}</span>
        <LogoutButton />
      </div>
    </nav>
  )
}
