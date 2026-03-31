import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UnitGrid } from '@/components/inventory/unit-grid'
import { type GridUnit, type ProjectRow, type ProjectType } from '@/lib/inventory-constants'

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ project_id?: string }>
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const { project_id } = await searchParams
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

  // Fetch all projects for the org
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, type, status')
    .eq('organization_id', orgId)
    .order('name')

  const safeProjects: ProjectRow[] = projects ?? []

  // No projects yet
  if (safeProjects.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-400">
            No projects yet. Add a project to get started.
          </p>
        </div>
      </div>
    )
  }

  // Determine the active project
  const selectedProject =
    safeProjects.find((p) => p.id === project_id) ?? safeProjects[0]

  // Redirect to default project if no param in URL
  if (!project_id) {
    redirect(`/dashboard/inventory?project_id=${selectedProject.id}`)
  }

  // Fetch units for the selected project
  const { data: units } = await supabase
    .from('units')
    .select(
      'id, unit_number, floor, block, type, carpet_area_sqft, super_buildup_area_sqft, base_price, total_price, status, facing, parking_included, blocked_by, blocked_at, sold_to, sold_at, notes'
    )
    .eq('project_id', selectedProject.id)
    .order('floor', { ascending: false, nullsFirst: false })
    .order('unit_number')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
      <UnitGrid
        initialUnits={(units ?? []) as GridUnit[]}
        projectId={selectedProject.id}
        projectType={selectedProject.type as ProjectType}
        projects={safeProjects}
        currentUserId={user.id}
      />
    </div>
  )
}
