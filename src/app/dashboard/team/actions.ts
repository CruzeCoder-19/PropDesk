'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type InviteState = { error: string } | { success: true } | null

export async function inviteMemberAction(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const name  = (formData.get('name') as string).trim()
  const email = (formData.get('email') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const role  = formData.get('role') as string

  if (!['sales_manager', 'salesperson'].includes(role)) {
    return { error: 'Invalid role.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return { error: 'Organization not found.' }
  if (!['admin', 'sales_manager'].includes(profile.role)) {
    return { error: 'You do not have permission to invite members.' }
  }

  const admin = createAdminClient()

  // Send invite email — creates auth user and triggers profile row creation
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)
  if (inviteError) {
    const msg = inviteError.message
    return {
      error: msg.toLowerCase().includes('already been registered')
        ? 'A user with this email already exists.'
        : msg,
    }
  }

  const userId = inviteData.user.id

  // Update profile: set name, phone, role, org
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: name,
      phone: phone || null,
      role,
      organization_id: profile.organization_id,
    })
    .eq('id', userId)

  if (profileError) {
    return { error: 'Invitation sent but profile update failed: ' + profileError.message }
  }

  return { success: true }
}
