import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { can, BILLING_ROLES, USER_MGMT_ROLES } from '@/lib/permissions'
import { UserRole } from '@/lib/types'
import { LogoutButton } from './LogoutButton'

const PRODUCTION_ROLES: UserRole[] = ['developer', 'admin', 'production', 'production_manager']
const FIELD_ROLES: UserRole[] = ['developer', 'admin', 'field_manager']

const ROLE_LABELS: Record<UserRole, string> = {
  developer: 'מפתח',
  admin: 'מנהל',
  coordinator: 'רכזת',
  production: 'ייצור',
  finance: 'כספים',
  field_manager: 'שטח',
  production_manager: 'מנהל ייצור',
}

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
    <>
      <style>{`
        .nav-link {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
          text-decoration: none;
          display: inline-block;
        }
        .nav-link:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        .nav-billing {
          position: relative;
          display: inline-block;
        }
      `}</style>
      <nav style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          {/* Logo */}
          <Link href="/dashboard" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, padding: 0, background: 'transparent' }}>
            <div style={{
              width: '28px',
              height: '28px',
              background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-bright) 100%)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 900,
              color: 'var(--text-inverse)',
              letterSpacing: '-0.03em',
              flexShrink: 0,
            }}>א</div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}>אמץ אלומיניום</span>
          </Link>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}>
            <Link href="/dashboard" className="nav-link">לוח בקרה</Link>

            {can(role, BILLING_ROLES) && (
              <span className="nav-billing">
                <Link href="/billing" className="nav-link">גבייה</Link>
                {pendingCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    left: '-2px',
                    background: 'var(--status-issues)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    borderRadius: '999px',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    lineHeight: 1,
                  }}>{pendingCount > 9 ? '9+' : pendingCount}</span>
                )}
              </span>
            )}

            {PRODUCTION_ROLES.includes(role) && <Link href="/production" className="nav-link">ייצור</Link>}
            {FIELD_ROLES.includes(role) && <Link href="/field" className="nav-link">שטח</Link>}
            {can(role, USER_MGMT_ROLES) && <Link href="/admin" className="nav-link">ניהול</Link>}
          </div>

          {/* User info + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {profile?.full_name}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>
            <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />
            <LogoutButton />
          </div>
        </div>
      </nav>
    </>
  )
}
