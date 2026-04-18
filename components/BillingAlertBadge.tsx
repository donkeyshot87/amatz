import Link from 'next/link'

interface Props {
  count: number
}

export function BillingAlertBadge({ count }: Props) {
  if (count === 0) return null
  return (
    <Link
      href="/billing"
      className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-100"
    >
      🔔 {count} התראות גבייה
    </Link>
  )
}
