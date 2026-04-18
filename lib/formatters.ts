export function formatProjectNumber(n: number): string {
  return `P-${String(n).padStart(3, '0')}`
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount)
}

export const FILE_TYPE_LABELS: Record<string, string> = {
  quote: 'הצעת מחיר',
  drawing: 'שרטוט',
  delivery_note: 'תעודת משלוח',
  invoice: 'חשבונית',
  other: 'אחר',
}

export const STAGE_STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  in_progress: 'בתהליך',
  completed: 'הושלם',
  blocked: 'חסום',
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  delivered_with_issues: 'נמסר עם בעיות',
  closed: 'סגור',
}
