'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = { error: string } | null

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Supabase returns "Invalid login credentials" — make it friendlier
    if (error.message.toLowerCase().includes('invalid')) {
      return { error: 'Incorrect email or password. Please try again.' }
    }
    return { error: error.message }
  }

  redirect('/dashboard')
}
