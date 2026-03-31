import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'
import { RoleProvider } from '@/components/dashboard/role-provider'
import type { AppRole } from '@/lib/role'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Verify authenticated session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch org name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single()

  const fullName = profile.full_name ?? user.email ?? 'User'
  const orgName = org?.name ?? 'Your Organization'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar fullName={fullName} role={profile.role} />

      {/* Right column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar orgName={orgName} />
        <main className="flex-1 overflow-y-auto p-6">
          <RoleProvider role={profile.role as AppRole}>
            {children}
          </RoleProvider>
        </main>
      </div>
    </div>
  )
}
