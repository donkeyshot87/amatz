'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteBillingAlert(alertId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('billing_alerts').delete().eq('id', alertId)
  if (error) throw new Error(error.message)
}

export async function createBillingAlert(data: {
  project_id: string
  stage_id: string | null
  amount: number
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('billing_alerts').insert({
    ...data,
    status: 'pending',
  })
  if (error) throw new Error(error.message)
}
