'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import {
  blockUnitAction,
  releaseBlockAction,
  updateUnitNotesAction,
  markAsRegisteredAction,
} from '@/app/dashboard/inventory/actions'
import {
  STATUS_LABELS,
  BOOKING_STATUS_LABELS,
  type GridUnit,
  type BookingInfo,
} from '@/lib/inventory-constants'
import { formatCrores } from '@/lib/format'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── MarkRegisteredButton (separate component for stable useActionState) ──────

function MarkRegisteredButton({ unitId, bookingId }: { unitId: string; bookingId: string }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    markAsRegisteredAction.bind(null, unitId, bookingId),
    null
  )

  useEffect(() => {
    if (state && 'success' in state) {
      toast.success('Marked as registered')
      router.refresh()
    }
    if (state && 'error' in state) toast.error(state.error)
  }, [state, router])

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        className="w-full h-8 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          'Mark as Registered'
        )}
      </button>
    </form>
  )
}

// ── UnitSheetBody (remounts when unit.id changes, resetting all action state) ─

function UnitSheetBody({
  unit,
  currentUserId,
}: {
  unit: GridUnit
  currentUserId: string
}) {
  const router = useRouter()
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)

  const [blockState, blockFormAction, blockPending] = useActionState(
    blockUnitAction.bind(null, unit.id),
    null
  )
  const [releaseState, releaseFormAction, releasePending] = useActionState(
    releaseBlockAction.bind(null, unit.id),
    null
  )
  const [notesState, notesFormAction, notesPending] = useActionState(
    updateUnitNotesAction.bind(null, unit.id),
    null
  )

  useEffect(() => {
    if (blockState && 'success' in blockState) {
      toast.success('Unit blocked')
      setConfirmBlock(false)
      router.refresh()
    }
    if (blockState && 'error' in blockState) toast.error(blockState.error)
  }, [blockState, router])

  useEffect(() => {
    if (releaseState && 'success' in releaseState) {
      toast.success('Block released')
      router.refresh()
    }
    if (releaseState && 'error' in releaseState) toast.error(releaseState.error)
  }, [releaseState, router])

  useEffect(() => {
    if (notesState && 'success' in notesState) toast.success('Notes saved')
    if (notesState && 'error' in notesState) toast.error(notesState.error)
  }, [notesState])

  // Fetch booking info for booked/sold units
  useEffect(() => {
    if (unit.status !== 'booked' && unit.status !== 'sold') {
      setBookingInfo(null)
      return
    }
    setBookingLoading(true)
    createClient()
      .from('bookings')
      .select(
        'id, status, agreement_value, total_amount, client:profiles!client_profile_id(full_name, phone)'
      )
      .eq('unit_id', unit.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setBookingInfo(data as any)
        setBookingLoading(false)
      })
  }, [unit.id, unit.status])

  const blockedAt = unit.blocked_at
    ? new Date(unit.blocked_at).toLocaleDateString('en-IN')
    : null
  const soldAt = unit.sold_at
    ? new Date(unit.sold_at).toLocaleDateString('en-IN')
    : null

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Unit details grid */}
      <div className="px-5 py-4 space-y-3 border-b border-slate-100">
        {/* Status badge */}
        <div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              unit.status === 'available'
                ? 'bg-green-50 text-green-700 border-green-200'
                : unit.status === 'blocked'
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : unit.status === 'booked'
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : unit.status === 'sold'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
          >
            {STATUS_LABELS[unit.status] ?? unit.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {unit.type && (
            <div>
              <p className="text-xs text-slate-500">Type</p>
              <p className="font-medium text-slate-900">{unit.type}</p>
            </div>
          )}
          {unit.total_price != null && (
            <div>
              <p className="text-xs text-slate-500">Total Price</p>
              <p className="font-medium text-slate-900">{formatCrores(unit.total_price)}</p>
            </div>
          )}
          {unit.carpet_area_sqft != null && (
            <div>
              <p className="text-xs text-slate-500">Carpet Area</p>
              <p className="font-medium text-slate-900">{unit.carpet_area_sqft} sqft</p>
            </div>
          )}
          {unit.super_buildup_area_sqft != null && (
            <div>
              <p className="text-xs text-slate-500">Super Buildup</p>
              <p className="font-medium text-slate-900">{unit.super_buildup_area_sqft} sqft</p>
            </div>
          )}
          {unit.facing && (
            <div>
              <p className="text-xs text-slate-500">Facing</p>
              <p className="font-medium text-slate-900">{unit.facing}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500">Parking</p>
            <p className="font-medium text-slate-900">
              {unit.parking_included ? 'Included' : 'Not included'}
            </p>
          </div>
          {unit.floor !== null && (
            <div>
              <p className="text-xs text-slate-500">Floor</p>
              <p className="font-medium text-slate-900">
                {unit.floor === 0 ? 'Ground' : `Floor ${unit.floor}`}
              </p>
            </div>
          )}
          {unit.block && (
            <div>
              <p className="text-xs text-slate-500">Block</p>
              <p className="font-medium text-slate-900">{unit.block}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status-based actions */}
      <div className="px-5 py-4 space-y-3 border-b border-slate-100">
        {/* Available → Block Unit */}
        {unit.status === 'available' && (
          <div>
            {!confirmBlock ? (
              <button
                type="button"
                onClick={() => setConfirmBlock(true)}
                className="w-full h-9 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-medium hover:bg-yellow-100 transition-colors"
              >
                Block Unit
              </button>
            ) : (
              <div className="space-y-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm text-yellow-800">Block this unit for yourself?</p>
                <div className="flex gap-2">
                  <form action={blockFormAction} className="flex-1">
                    <button
                      type="submit"
                      disabled={blockPending}
                      className="w-full h-8 rounded-lg bg-yellow-400 text-slate-950 text-sm font-semibold hover:bg-yellow-300 disabled:opacity-50 transition-colors flex items-center justify-center"
                    >
                      {blockPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Confirm Block'
                      )}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setConfirmBlock(false)}
                    className="h-8 px-3 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Blocked → Convert to Booking / Release */}
        {unit.status === 'blocked' && (
          <div className="space-y-3">
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2.5">
              <p className="text-sm text-yellow-800 font-medium">
                {unit.blocked_by === currentUserId ? 'Blocked by you' : 'Blocked'}
                {blockedAt && (
                  <span className="font-normal text-yellow-700"> · {blockedAt}</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/dashboard/bookings/new?unit_id=${unit.id}`}
                className={cn(
                  buttonVariants({ size: 'sm' }),
                  'flex-1 bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent justify-center'
                )}
              >
                Convert to Booking
              </Link>
              <form action={releaseFormAction}>
                <button
                  type="submit"
                  disabled={releasePending}
                  className="h-7 px-2.5 rounded-[min(var(--radius-md),12px)] border border-slate-200 text-slate-600 text-[0.8rem] font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  {releasePending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Release'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Booked → client info + Mark Registered */}
        {unit.status === 'booked' && (
          <div className="space-y-3">
            {bookingLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading booking info…
              </div>
            )}
            {!bookingLoading && bookingInfo && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 space-y-1">
                <p className="text-sm font-medium text-orange-800">
                  {bookingInfo.client?.full_name ?? 'Client'}
                </p>
                {bookingInfo.client?.phone && (
                  <p className="text-xs text-orange-700">{bookingInfo.client.phone}</p>
                )}
                <p className="text-xs text-orange-600">
                  {BOOKING_STATUS_LABELS[bookingInfo.status] ?? bookingInfo.status}
                  {bookingInfo.total_amount != null &&
                    ` · ${formatCrores(bookingInfo.total_amount)}`}
                </p>
              </div>
            )}
            {bookingInfo && (
              <MarkRegisteredButton unitId={unit.id} bookingId={bookingInfo.id} />
            )}
          </div>
        )}

        {/* Sold → read-only */}
        {unit.status === 'sold' && (
          <div className="space-y-2">
            {bookingLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading details…
              </div>
            )}
            {!bookingLoading && bookingInfo && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-red-500">Sold</p>
                <p className="text-sm font-medium text-red-800">
                  {bookingInfo.client?.full_name ?? 'Client'}
                </p>
                {bookingInfo.client?.phone && (
                  <p className="text-xs text-red-700">{bookingInfo.client.phone}</p>
                )}
                {soldAt && <p className="text-xs text-red-600">Sold on {soldAt}</p>}
              </div>
            )}
          </div>
        )}

        {/* Mortgage → read-only */}
        {unit.status === 'mortgage' && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="text-sm text-gray-600">
              This unit is under mortgage and not available for sale.
            </p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="px-5 py-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</p>
        <form action={notesFormAction} className="space-y-2">
          <textarea
            name="notes"
            rows={3}
            defaultValue={unit.notes ?? ''}
            placeholder="Add notes about this unit…"
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-slate-900 placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 resize-none"
          />
          <button
            type="submit"
            disabled={notesPending}
            className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            {notesPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Notes'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── UnitSheet ─────────────────────────────────────────────────────────────────

interface UnitSheetProps {
  unit: GridUnit | null
  onClose: () => void
  currentUserId: string
}

export function UnitSheet({ unit, onClose, currentUserId }: UnitSheetProps) {
  return (
    <>
      {/* Backdrop */}
      {unit && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sheet panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl transition-transform duration-300 flex flex-col ${
          unit ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {unit?.unit_number ?? 'Unit Details'}
            </h2>
            {unit && (
              <p className="text-xs text-slate-500 mt-0.5">
                {[
                  unit.block && `Block ${unit.block}`,
                  unit.floor !== null &&
                    (unit.floor === 0 ? 'Ground Floor' : `Floor ${unit.floor}`),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — re-mounts on unit.id change to reset all action states */}
        {unit && (
          <UnitSheetBody key={unit.id} unit={unit} currentUserId={currentUserId} />
        )}
      </div>
    </>
  )
}
