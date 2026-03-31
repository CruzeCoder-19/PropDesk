'use client'

import { useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { changeBookingStatusAction } from '@/app/dashboard/bookings/actions'

const SELECT_CLS =
  'h-9 rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50'

const BOOKING_STATUSES = [
  { value: 'token_paid', label: 'Token Paid' },
  { value: 'agreement_signed', label: 'Agreement Signed' },
  { value: 'loan_processing', label: 'Loan Processing' },
  { value: 'registered', label: 'Registered' },
  { value: 'possession', label: 'Possession' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface Props {
  bookingId: string
  currentStatus: string
}

export function BookingStatusChanger({ bookingId, currentStatus }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    changeBookingStatusAction.bind(null, bookingId),
    null
  )

  useEffect(() => {
    if (state && 'success' in state) {
      toast.success('Booking status updated')
      router.refresh()
    }
    if (state && 'error' in state) {
      toast.error(state.error)
    }
  }, [state, router])

  return (
    <form action={formAction} className="flex items-center gap-2">
      <select name="status" defaultValue={currentStatus} className={SELECT_CLS}>
        {BOOKING_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={isPending} variant="outline" className="border-slate-200">
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Update'}
      </Button>
    </form>
  )
}
