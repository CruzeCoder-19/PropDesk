'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type SignupState = { error: string; field?: string } | null

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const fullName = (formData.get('full_name') as string).trim()
  const orgName = (formData.get('org_name') as string).trim()
  const email = (formData.get('email') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const password = formData.get('password') as string

  // Basic server-side validation
  if (!fullName) return { error: 'Full name is required.', field: 'full_name' }
  if (!orgName) return { error: 'Organization name is required.', field: 'org_name' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.', field: 'password' }

  const supabase = await createClient()

  // 1. Create the auth user — also seeds the profile via handle_new_user trigger
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'admin', // org creator is always an admin
      },
    },
  })

  if (authError) {
    if (authError.message.toLowerCase().includes('already registered')) {
      return { error: 'An account with this email already exists.', field: 'email' }
    }
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Signup failed. Please try again.' }
  }

  // 2. Use service-role client to bypass RLS for org creation + profile update
  const admin = createAdminClient()

  // Generate a URL-safe slug; append short uid suffix to avoid collisions
  const baseSlug = toSlug(orgName)
  const slug = `${baseSlug}-${authData.user.id.slice(0, 6)}`

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName, slug })
    .select('id')
    .single()

  if (orgError) {
    // Roll back: delete the auth user we just created
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: 'Could not create your organization. Please try again.' }
  }

  // 3. Update the profile row (created synchronously by the DB trigger)
  //    Use upsert in case of edge-case trigger timing
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: authData.user.id,
      full_name: fullName,
      phone: phone || null,
      role: 'admin',
      organization_id: org.id,
    })

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: 'Could not set up your profile. Please try again.' }
  }

  // session is present → email confirmation disabled, user is already logged in
  if (authData.session) {
    redirect('/dashboard')
  }

  // No session → Supabase sent a confirmation email
  redirect('/login?message=check_email')
}
