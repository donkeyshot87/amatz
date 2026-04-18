'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) { router.push('/login'); return }

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: form.get('name') as string,
        client_name: form.get('client_name') as string,
        description: (form.get('description') as string) || null,
        contract_value: form.get('contract_value') ? Number(form.get('contract_value')) : null,
        cost_estimate: form.get('cost_estimate') ? Number(form.get('cost_estimate')) : null,
        planned_delivery_date: (form.get('planned_delivery_date') as string) || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError || !project) {
      setError('שגיאה ביצירת הפרויקט. נסה שנית.')
      setLoading(false)
      return
    }

    await supabase.rpc('create_default_stages', { p_project_id: project.id })

    router.push(`/projects/${project.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← לוח בקרה</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">פרויקט חדש</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl shadow p-6">
        <div>
          <label className="block text-sm font-medium mb-1">שם הפרויקט *</label>
          <input name="name" required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">שם הלקוח *</label>
          <input name="client_name" required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">תיאור</label>
          <textarea name="description" rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">ערך חוזה (₪)</label>
            <input name="contract_value" type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">עלות מוערכת (₪)</label>
            <input name="cost_estimate" type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">תאריך מסירה מתוכנן</label>
          <input name="planned_delivery_date" type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white rounded-lg px-6 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'יוצר...' : 'צור פרויקט'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border rounded-lg px-6 py-2 font-medium hover:bg-gray-50"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  )
}
