import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageTeam, ROLE_LABELS, ROLE_BADGE } from '@/lib/role'
import { InviteMemberDialog } from './invite-member-dialog'

interface Member {
  id: string
  full_name: string | null
  phone: string | null
  role: string
  created_at: string
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/login')

  // Salespersons cannot access this page
  if (profile.role === 'salesperson') redirect('/dashboard')

  const orgId = profile.organization_id

  // Fetch all org members (exclude clients)
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, created_at')
    .eq('organization_id', orgId)
    .neq('role', 'client')
    .order('full_name')

  // Get email addresses from auth users via admin client
  const adminClient = createAdminClient()
  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? '']))

  // Lead counts per member
  const { data: leadRows } = await supabase
    .from('leads')
    .select('assigned_to')
    .eq('organization_id', orgId)
    .not('assigned_to', 'is', null)

  const countMap = new Map<string, number>()
  for (const l of (leadRows ?? [])) {
    const aid = l.assigned_to as string
    countMap.set(aid, (countMap.get(aid) ?? 0) + 1)
  }

  const safeMembers = (members ?? []) as Member[]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">Team</h1>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {safeMembers.length} member{safeMembers.length !== 1 ? 's' : ''}
          </span>
        </div>
        {canManageTeam(profile.role) && <InviteMemberDialog />}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {safeMembers.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No team members yet. Invite your first member.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Leads</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {safeMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  {/* Avatar + name + email */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
                        {getInitials(m.full_name)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {m.full_name ?? <span className="text-slate-400 italic">No name</span>}
                        </p>
                        {emailMap.get(m.id) && (
                          <p className="text-xs text-slate-400">{emailMap.get(m.id)}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0 text-[11px] font-medium ${
                        ROLE_BADGE[m.role] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {m.phone ?? <span className="text-slate-300">—</span>}
                  </td>

                  {/* Lead count */}
                  <td className="px-4 py-3 text-slate-700">
                    {countMap.get(m.id) ?? 0}
                  </td>

                  {/* Joined date */}
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(m.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
