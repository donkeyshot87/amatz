'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useRef } from 'react'

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'ממתין' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'completed',   label: 'הושלם' },
  { value: 'blocked',     label: 'חסום' },
]

const SORT_OPTIONS = [
  { value: 'created_desc',  label: 'תאריך יצירה (חדש ראשון)' },
  { value: 'created_asc',   label: 'תאריך יצירה (ישן ראשון)' },
  { value: 'delivery_asc',  label: 'תאריך מסירה (קרוב ראשון)' },
  { value: 'delivery_desc', label: 'תאריך מסירה (רחוק ראשון)' },
]

interface Props {
  selected: string[]
  searchQuery: string
  sortValue: string
}

export function FilterBar({ selected, searchQuery, sortValue }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildUrl = useCallback((newSelected: string[], newQ: string, newSort: string) => {
    const params = new URLSearchParams()
    if (newSelected.length === 0) {
      params.set('s', '__none__')
    } else {
      newSelected.forEach(s => params.append('s', s))
    }
    if (newQ) params.set('q', newQ)
    if (newSort) params.set('sort', newSort)
    return `${pathname}?${params.toString()}`
  }, [pathname])

  function toggleStatus(value: string) {
    const next = selected.includes(value)
      ? selected.filter(s => s !== value)
      : [...selected, value]
    router.push(buildUrl(next, searchQuery, sortValue))
  }

  function clearAll() {
    router.push(buildUrl([], searchQuery, sortValue))
  }

  function handleSearch(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl(selected, q, sortValue))
    }, 400)
  }

  function handleSort(sort: string) {
    router.push(buildUrl(selected, searchQuery, sort))
  }

  const allClear = selected.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
      <input
        type="text"
        placeholder="חיפוש לפי שם פרויקט או לקוח..."
        defaultValue={searchQuery}
        onChange={e => handleSearch(e.target.value)}
        className="input-field"
        style={{ maxWidth: '360px' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={clearAll}
            style={{
              padding: '0.3rem 0.9rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.78rem',
              fontWeight: allClear ? 600 : 500,
              background: allClear ? 'var(--brand)' : 'var(--bg-surface)',
              color: allClear ? 'var(--text-inverse)' : 'var(--text-secondary)',
              border: `1px solid ${allClear ? 'var(--brand)' : 'var(--border-mid)'}`,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            הכל
          </button>
          {STATUS_OPTIONS.map(opt => {
            const active = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleStatus(opt.value)}
                style={{
                  padding: '0.3rem 0.9rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.78rem',
                  fontWeight: active ? 600 : 500,
                  background: active ? 'var(--brand)' : 'var(--bg-surface)',
                  color: active ? 'var(--text-inverse)' : 'var(--text-secondary)',
                  border: `1px solid ${active ? 'var(--brand)' : 'var(--border-mid)'}`,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <select
          value={sortValue || 'created_desc'}
          onChange={e => handleSort(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '200px' }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
