'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const OPTIONS = [
  { value: 'pending', label: 'ממתין' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'completed', label: 'הושלם' },
  { value: 'blocked', label: 'חסום' },
]

export function StatusFilterBar({ selected }: { selected: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter(s => s !== value)
      : [...selected, value]

    const params = new URLSearchParams()
    if (next.length === 0) {
      params.append('s', '__none__')
    } else {
      next.forEach(s => params.append('s', s))
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      {OPTIONS.map(opt => {
        const isActive = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            style={{
              padding: '0.35rem 1rem',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: isActive ? 600 : 500,
              background: isActive ? 'var(--brand)' : 'var(--bg-card)',
              color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
              border: `1px solid ${isActive ? 'var(--brand)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'var(--font-body)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
