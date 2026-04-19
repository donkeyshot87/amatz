'use client'

import { useEffect } from 'react'

interface Props {
  message: string
  onClose: () => void
}

export function ConfirmationToast({ message, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className="animate-fade-up"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-mid)',
        borderRight: '3px solid var(--status-done)',
        color: 'var(--text-primary)',
        padding: '0.75rem 1.25rem',
        borderRadius: '10px',
        boxShadow: 'var(--shadow-raised)',
        fontSize: '0.875rem',
        fontWeight: 500,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: 'var(--status-done)', fontSize: '1rem' }}>✓</span>
      {message}
    </div>
  )
}
