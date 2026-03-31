'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Layers, FolderPlus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UnitSheet } from '@/components/inventory/unit-sheet'
import { AddUnitSheet } from '@/components/inventory/add-unit-sheet'
import { BulkAddDialog } from '@/components/inventory/bulk-add-dialog'
import {
  STATUS_COLORS,
  STATUS_TEXT_COLORS,
  STATUS_SUMMARY_ACCENT,
  STATUS_LABELS,
  type GridUnit,
  type ProjectRow,
  type ProjectType,
} from '@/lib/inventory-constants'
import { formatCrores } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const ZOOM_MIN = 0.5
const ZOOM_MAX = 1.5
const ZOOM_STEP = 0.1

// ── UnitCell ──────────────────────────────────────────────────────────────────

function UnitCell({ unit, onClick }: { unit: GridUnit; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${unit.unit_number}${unit.total_price != null ? ' · ' + formatCrores(unit.total_price) : ''}`}
      className={`flex flex-col items-start justify-between rounded-lg border p-2 text-left transition-colors cursor-pointer h-[72px] min-w-[80px] w-full ${STATUS_COLORS[unit.status] ?? ''} ${STATUS_TEXT_COLORS[unit.status] ?? ''}`}
    >
      <span className="text-xs font-bold leading-tight truncate w-full">
        {unit.unit_number}
      </span>
      {unit.type && (
        <span className="text-[10px] leading-tight truncate w-full opacity-80">
          {unit.type}
        </span>
      )}
      {unit.carpet_area_sqft != null && (
        <span className="text-[10px] leading-tight opacity-70">
          {unit.carpet_area_sqft} sqft
        </span>
      )}
    </button>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function floorLabel(floor: number): string {
  return floor === 0 ? 'GF' : `F${floor}`
}

function buildFloorGrid(units: GridUnit[]): { floorMap: Map<number, GridUnit[]>; sortedFloors: number[] } {
  const floorMap = new Map<number, GridUnit[]>()
  units.forEach((u) => {
    const f = u.floor ?? 0
    floorMap.set(f, [...(floorMap.get(f) ?? []), u])
  })
  floorMap.forEach((arr, f) =>
    floorMap.set(
      f,
      [...arr].sort((a, b) =>
        a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true })
      )
    )
  )
  const sortedFloors = [...floorMap.keys()].sort((a, b) => b - a)
  return { floorMap, sortedFloors }
}

function sortFlat(units: GridUnit[]): GridUnit[] {
  return [...units].sort((a, b) =>
    a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true })
  )
}

// ── UnitGrid ──────────────────────────────────────────────────────────────────

interface UnitGridProps {
  initialUnits: GridUnit[]
  projectId: string
  projectType: ProjectType
  projects: ProjectRow[]
  currentUserId: string
}

export function UnitGrid({
  initialUnits,
  projectId,
  projectType,
  projects,
  currentUserId,
}: UnitGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [units, setUnits] = useState<GridUnit[]>(initialUnits)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [selectedUnit, setSelectedUnit] = useState<GridUnit | null>(null)
  const [addUnitOpen, setAddUnitOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)

  // Sync local state when server re-renders with a different project
  useEffect(() => {
    setUnits(initialUnits)
    setSelectedUnit(null)
  }, [initialUnits])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`units-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'units',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setUnits((prev) => [...prev, payload.new as GridUnit])
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as GridUnit
            setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
            // Keep sheet in sync if it's showing this unit
            setSelectedUnit((prev) => (prev?.id === updated.id ? updated : prev))
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            setUnits((prev) => prev.filter((u) => u.id !== deletedId))
            setSelectedUnit((prev) => (prev?.id === deletedId ? null : prev))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  // Summary counts — derived from live units state
  const summary = useMemo(
    () => ({
      total: units.length,
      available: units.filter((u) => u.status === 'available').length,
      blocked: units.filter((u) => u.status === 'blocked').length,
      booked: units.filter((u) => u.status === 'booked').length,
      sold: units.filter((u) => u.status === 'sold').length,
    }),
    [units]
  )

  // Project selector
  function handleProjectChange(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('project_id', id)
    router.replace(`/dashboard/inventory?${params.toString()}`)
  }

  // Grid data
  const isFloorBased = projectType === 'apartment' || projectType === 'villa'
  const floorGrid = useMemo(
    () => (isFloorBased ? buildFloorGrid(units) : null),
    [units, isFloorBased]
  )
  const flatUnits = useMemo(
    () => (!isFloorBased ? sortFlat(units) : null),
    [units, isFloorBased]
  )

  return (
    <div className="space-y-4">
      {/* Row 1: project selector + Add Unit */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {projects.length > 1 ? (
            <select
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="h-9 rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-medium text-slate-700">{projects[0]?.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/inventory/new-project"
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'border-slate-200 text-slate-700')}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New Project
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkAddOpen(true)}
          >
            <Layers className="h-3.5 w-3.5" />
            Bulk Add
          </Button>
          <Button
            size="sm"
            onClick={() => setAddUnitOpen(true)}
            className="bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Unit
          </Button>
        </div>
      </div>

      {/* Row 2: summary pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">{summary.total} Units</span>
        {(['available', 'blocked', 'booked', 'sold'] as const).map((status) => (
          <span
            key={status}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_SUMMARY_ACCENT[status]}`}
          >
            {STATUS_LABELS[status]}: {summary[status]}
          </span>
        ))}
      </div>

      {/* Row 3: grid */}
      {units.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-400">
            No units yet. Click &ldquo;Add Unit&rdquo; to get started.
          </p>
        </div>
      ) : (
        <div className="relative rounded-xl border border-slate-200 bg-white overflow-hidden">
          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white rounded-lg border border-slate-200 shadow-sm p-1">
            <button
              type="button"
              onClick={() =>
                setZoomLevel((z) =>
                  parseFloat(Math.max(ZOOM_MIN, z - ZOOM_STEP).toFixed(1))
                )
              }
              className="h-6 w-6 rounded text-slate-600 hover:bg-slate-100 flex items-center justify-center text-sm font-medium"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="text-xs text-slate-500 min-w-[36px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                setZoomLevel((z) =>
                  parseFloat(Math.min(ZOOM_MAX, z + ZOOM_STEP).toFixed(1))
                )
              }
              className="h-6 w-6 rounded text-slate-600 hover:bg-slate-100 flex items-center justify-center text-sm font-medium"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>

          {/* Scrollable container */}
          <div className="overflow-auto p-4 pr-24 pb-4">
            <div
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
              className="transition-transform duration-150 inline-block"
            >
              {isFloorBased && floorGrid ? (
                /* Apartment / Villa: floor-based table */
                <table className="border-collapse">
                  <tbody>
                    {floorGrid.sortedFloors.map((floor) => (
                      <tr key={floor}>
                        <td className="px-3 py-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 sticky left-0 z-10 whitespace-nowrap align-middle min-w-[36px]">
                          {floorLabel(floor)}
                        </td>
                        {floorGrid.floorMap.get(floor)!.map((unit) => (
                          <td key={unit.id} className="p-1 border border-slate-100">
                            <UnitCell unit={unit} onClick={() => setSelectedUnit(unit)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* Plot / Commercial: flat grid */
                <div className="grid grid-cols-6 gap-2">
                  {(flatUnits ?? []).map((unit) => (
                    <UnitCell key={unit.id} unit={unit} onClick={() => setSelectedUnit(unit)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Color legend */}
      <div className="flex flex-wrap items-center gap-3">
        {(['available', 'blocked', 'booked', 'sold', 'mortgage'] as const).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className={`h-3 w-3 rounded border ${
                status === 'available' ? 'bg-green-100 border-green-300' :
                status === 'blocked'   ? 'bg-yellow-100 border-yellow-300' :
                status === 'booked'   ? 'bg-orange-100 border-orange-300' :
                status === 'sold'     ? 'bg-red-100 border-red-300' :
                                        'bg-gray-200 border-gray-300'
              }`}
            />
            <span className="text-xs text-slate-500">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      {/* Unit detail sheet */}
      <UnitSheet
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
        currentUserId={currentUserId}
      />

      {/* Add unit sheet */}
      <AddUnitSheet
        projectId={projectId}
        open={addUnitOpen}
        onClose={() => setAddUnitOpen(false)}
        onSuccess={() => router.refresh()}
      />

      {/* Bulk add dialog */}
      <BulkAddDialog
        projectId={projectId}
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
      />
    </div>
  )
}
