'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { addUnitAction } from '@/app/dashboard/inventory/actions'

// ── Constants ─────────────────────────────────────────────────────────────────

const UNIT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Plot', 'Shop', 'Office']
const FACING_OPTIONS = ['East', 'West', 'North', 'South', 'NE', 'NW', 'SE', 'SW']

const SELECT_CLS =
  'h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50'

// ── AddUnitSheet ───────────────────────────────────────────────────────────────

interface Props {
  projectId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddUnitSheet({ projectId, open, onClose, onSuccess }: Props) {
  const [state, formAction, isPending] = useActionState(
    addUnitAction.bind(null, projectId),
    null
  )
  const formRef = useRef<HTMLFormElement>(null)

  // Auto-calc state
  const [baseRate, setBaseRate] = useState('')
  const [superArea, setSuperArea] = useState('')
  const [totalOverride, setTotalOverride] = useState('')

  const autoTotal =
    baseRate && superArea
      ? String(Math.round(parseFloat(baseRate) * parseFloat(superArea)))
      : ''
  const displayTotal = totalOverride !== '' ? totalOverride : autoTotal

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      formRef.current?.reset()
      setBaseRate('')
      setSuperArea('')
      setTotalOverride('')
      toast.success('Unit added')
      onClose()
      onSuccess()
    }
    if (state && 'error' in state && !state.field) {
      toast.error(state.error)
    }
  }, [state, onClose, onSuccess])

  function getFieldError(field: string): string | undefined {
    if (state && 'error' in state && state.field === field) return state.error
    return undefined
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add New Unit</DialogTitle>
        </DialogHeader>

        <form
          ref={formRef}
          action={formAction}
          className="space-y-4 overflow-y-auto max-h-[70vh] px-1 pb-1"
        >
          {/* Unit Number */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="au-unit-number">
              Unit Number <span className="text-red-500">*</span>
            </label>
            <Input
              id="au-unit-number"
              name="unit_number"
              placeholder="e.g. A-301, Plot-88, Villa-12"
              className="h-9"
            />
            {getFieldError('unit_number') && (
              <p className="text-xs text-red-600">{getFieldError('unit_number')}</p>
            )}
          </div>

          {/* Floor + Block */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="au-floor">
                Floor
              </label>
              <Input
                id="au-floor"
                name="floor"
                type="number"
                placeholder="0 = Ground"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="au-block">
                Block
              </label>
              <Input
                id="au-block"
                name="block"
                placeholder="e.g. A, B, Tower 1"
                className="h-9"
              />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="au-type">
              Unit Type
            </label>
            <select id="au-type" name="type" className={SELECT_CLS} defaultValue="">
              <option value="">Select type…</option>
              {UNIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Areas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="au-carpet">
                Carpet Area (sqft)
              </label>
              <Input
                id="au-carpet"
                name="carpet_area_sqft"
                type="number"
                step="0.01"
                placeholder="e.g. 850"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="au-super">
                Super Buildup (sqft)
              </label>
              <Input
                id="au-super"
                name="super_buildup_area_sqft"
                type="number"
                step="0.01"
                placeholder="e.g. 1100"
                className="h-9"
                value={superArea}
                onChange={(e) => {
                  setSuperArea(e.target.value)
                  setTotalOverride('')
                }}
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="au-base-price">
                Base Rate (₹/sqft)
              </label>
              <Input
                id="au-base-price"
                name="base_price"
                type="number"
                step="1"
                placeholder="e.g. 5000"
                className="h-9"
                value={baseRate}
                onChange={(e) => {
                  setBaseRate(e.target.value)
                  setTotalOverride('')
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="au-total-price">
                Total Price (₹)
              </label>
              <Input
                id="au-total-price"
                name="total_price"
                type="number"
                step="1"
                placeholder="Auto-calculated"
                className="h-9"
                value={displayTotal}
                onChange={(e) => setTotalOverride(e.target.value)}
              />
            </div>
          </div>

          {/* Facing */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="au-facing">
              Facing
            </label>
            <select id="au-facing" name="facing" className={SELECT_CLS} defaultValue="">
              <option value="">Select facing…</option>
              {FACING_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Parking */}
          <div className="flex items-center gap-2.5">
            <input
              id="au-parking"
              name="parking_included"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 accent-amber-400"
            />
            <label className="text-sm font-medium text-slate-700" htmlFor="au-parking">
              Parking Included
            </label>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Unit
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
