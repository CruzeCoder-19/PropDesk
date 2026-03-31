'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { bulkAddUnitsAction } from '@/app/dashboard/inventory/actions'
import { formatCrores } from '@/lib/format'

// ── Constants ─────────────────────────────────────────────────────────────────

const UNIT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Plot', 'Shop', 'Office']

const SELECT_CLS =
  'h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UnitPreviewRow {
  unit_number: string
  floor: number
  block: string
  type: string
  super_buildup_area_sqft: number
  base_price: number
  total_price: number
  parking_included: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateUnits(
  block: string,
  floorStart: number,
  floorEnd: number,
  unitsPerFloor: number,
  type: string,
  baseRate: number,
  superArea: number,
  parkingIncluded: boolean
): UnitPreviewRow[] {
  const rows: UnitPreviewRow[] = []
  for (let floor = floorStart; floor <= floorEnd; floor++) {
    for (let i = 1; i <= unitsPerFloor; i++) {
      const idx = String(i).padStart(2, '0')
      rows.push({
        unit_number: `${block}-${floor}${idx}`,
        floor,
        block,
        type,
        super_buildup_area_sqft: superArea,
        base_price: baseRate,
        total_price: Math.round(baseRate * superArea),
        parking_included: parkingIncluded,
      })
    }
  }
  return rows
}

// ── BulkAddDialog ─────────────────────────────────────────────────────────────

interface Props {
  projectId: string
  open: boolean
  onClose: () => void
}

export function BulkAddDialog({ projectId, open, onClose }: Props) {
  const [phase, setPhase] = useState<'input' | 'preview'>('input')
  const [previewUnits, setPreviewUnits] = useState<UnitPreviewRow[]>([])
  const [validationError, setValidationError] = useState('')

  // Input form state
  const [block, setBlock] = useState('')
  const [floorStart, setFloorStart] = useState('')
  const [floorEnd, setFloorEnd] = useState('')
  const [unitsPerFloor, setUnitsPerFloor] = useState('')
  const [unitType, setUnitType] = useState(UNIT_TYPES[1])
  const [baseRate, setBaseRate] = useState('')
  const [superArea, setSuperArea] = useState('')
  const [parkingIncluded, setParkingIncluded] = useState(false)

  // Server action
  const [state, formAction, isPending] = useActionState(
    bulkAddUnitsAction.bind(null, projectId),
    null
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      toast.success(`${previewUnits.length} units added`)
      resetAndClose()
    }
    if (state && 'error' in state) {
      toast.error(state.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  function resetAndClose() {
    setPhase('input')
    setBlock('')
    setFloorStart('')
    setFloorEnd('')
    setUnitsPerFloor('')
    setUnitType(UNIT_TYPES[1])
    setBaseRate('')
    setSuperArea('')
    setParkingIncluded(false)
    setPreviewUnits([])
    setValidationError('')
    onClose()
  }

  function handlePreview() {
    setValidationError('')
    if (!block.trim()) { setValidationError('Block name is required'); return }
    const fs = parseInt(floorStart, 10)
    const fe = parseInt(floorEnd, 10)
    const upf = parseInt(unitsPerFloor, 10)
    const br = parseFloat(baseRate)
    const sa = parseFloat(superArea)
    if (isNaN(fs) || isNaN(fe)) { setValidationError('Valid floor range is required'); return }
    if (fe < fs) { setValidationError('Floor end must be ≥ floor start'); return }
    if (isNaN(upf) || upf < 1 || upf > 20) { setValidationError('Units per floor must be 1–20'); return }
    if (isNaN(br) || br <= 0) { setValidationError('Valid base rate is required'); return }
    if (isNaN(sa) || sa <= 0) { setValidationError('Valid super buildup area is required'); return }

    const units = generateUnits(block.trim(), fs, fe, upf, unitType, br, sa, parkingIncluded)
    setPreviewUnits(units)
    setPhase('preview')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAndClose()
      }}
    >
      <DialogContent className="max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {phase === 'input' ? 'Bulk Add Units' : `Preview — ${previewUnits.length} units`}
          </DialogTitle>
        </DialogHeader>

        {phase === 'input' ? (
          <div className="space-y-4 overflow-y-auto max-h-[70vh] px-1 pb-1">
            {/* Block + Floor range */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Block</label>
                <Input
                  placeholder="e.g. A, Tower 1"
                  className="h-9"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Floor Start</label>
                <Input
                  type="number"
                  placeholder="e.g. 1"
                  className="h-9"
                  value={floorStart}
                  onChange={(e) => setFloorStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Floor End</label>
                <Input
                  type="number"
                  placeholder="e.g. 12"
                  className="h-9"
                  value={floorEnd}
                  onChange={(e) => setFloorEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Units/floor + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Units per Floor</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="e.g. 4"
                  className="h-9"
                  value={unitsPerFloor}
                  onChange={(e) => setUnitsPerFloor(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Unit Type</label>
                <select
                  className={SELECT_CLS}
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Base rate + Super area */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Base Rate (₹/sqft)</label>
                <Input
                  type="number"
                  step="1"
                  placeholder="e.g. 5000"
                  className="h-9"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Super Buildup (sqft)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1100"
                  className="h-9"
                  value={superArea}
                  onChange={(e) => setSuperArea(e.target.value)}
                />
              </div>
            </div>

            {/* Parking */}
            <div className="flex items-center gap-2.5">
              <input
                id="bulk-parking"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 accent-amber-400"
                checked={parkingIncluded}
                onChange={(e) => setParkingIncluded(e.target.checked)}
              />
              <label className="text-sm font-medium text-slate-700" htmlFor="bulk-parking">
                Parking Included
              </label>
            </div>

            {validationError && (
              <p className="text-xs text-red-600">{validationError}</p>
            )}

            <div className="pt-2">
              <Button
                type="button"
                onClick={handlePreview}
                className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
              >
                Preview →
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[70vh] px-1 pb-1">
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Unit #</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Floor</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Block</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Type</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Area (sqft)</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewUnits.map((u) => (
                    <tr key={u.unit_number} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-medium text-slate-900">{u.unit_number}</td>
                      <td className="px-3 py-1.5 text-slate-600">{u.floor}</td>
                      <td className="px-3 py-1.5 text-slate-600">{u.block}</td>
                      <td className="px-3 py-1.5 text-slate-600">{u.type}</td>
                      <td className="px-3 py-1.5 text-right text-slate-600">{u.super_buildup_area_sqft}</td>
                      <td className="px-3 py-1.5 text-right text-slate-700 font-medium">
                        {formatCrores(u.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form ref={formRef} action={formAction} className="flex gap-2 pt-1">
              <input
                type="hidden"
                name="units_json"
                value={JSON.stringify(previewUnits)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPhase('input')}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  `Confirm & Add ${previewUnits.length} Units`
                )}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
