import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewBookingForm } from './new-booking-form'

interface PageProps {
  searchParams: Promise<{ unit_id?: string }>
}

export default async function NewBookingPage({ searchParams }: PageProps) {
  const { unit_id } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/login')
  const orgId = profile.organization_id

  // Fetch available/blocked units with project info
  // Units join via projects, so filter by projects.organization_id
  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number, block, floor, type, total_price, status, project:projects!inner(id, name)')
    .in('status', ['available', 'blocked'])
    .order('unit_number')
  // Post-filter to org (inner join doesn't filter client-side; RLS handles it)
  // RLS already restricts to org's projects, so units are already scoped
  const safeUnits = (units ?? []) as unknown as {
    id: string
    unit_number: string
    block: string | null
    floor: number | null
    type: string
    total_price: number | null
    status: string
    project: { id: string; name: string }
  }[]

  // Fetch leads for client search
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, email')
    .eq('organization_id', orgId)
    .order('name')
  const safeLeads = (leads ?? []) as { id: string; name: string; phone: string; email: string | null }[]

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/bookings"
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Bookings
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-bold text-slate-900">New Booking</h1>
      </div>
      <NewBookingForm
        preselectedUnitId={unit_id ?? null}
        units={safeUnits}
        leads={safeLeads}
      />
    </div>
  )
}
