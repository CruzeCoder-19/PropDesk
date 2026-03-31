'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ClientLoginState = { error: string } | null

export async function clientLoginAction(
  _prev: ClientLoginState,
  formData: FormData
): Promise<ClientLoginState> {
  const email    = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return {
      error: error.message.toLowerCase().includes('invalid')
        ? 'Incorrect email or password.'
        : error.message,
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication failed.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client') {
    await supabase.auth.signOut()
    return { error: 'This portal is for property buyers. Please use the admin login.' }
  }

  redirect('/client-portal/dashboard')
}
