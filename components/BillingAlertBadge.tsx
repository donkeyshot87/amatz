import Link from 'next/link'

interface Props {
  count: number
}

export function BillingAlertBadge({ count }: Props) {
  if (count === 0) return null
  return (
    <Link
      href="/billing"
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: '999px',
        padding: '0.35rem 0.9rem',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#fbbf24',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: '0.9rem' }}>🔔</span>
      {count} התראות גבייה
    </Link>
  )
}
