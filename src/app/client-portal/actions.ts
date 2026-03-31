'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function clientSignOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/client-portal/login')
}
