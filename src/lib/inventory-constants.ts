// ── Status display constants ────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-50 border-green-200 hover:bg-green-100',
  blocked:   'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  booked:    'bg-orange-50 border-orange-200 hover:bg-orange-100',
  sold:      'bg-red-50 border-red-200 hover:bg-red-100',
  mortgage:  'bg-gray-100 border-gray-300 hover:bg-gray-200',
}

export const STATUS_TEXT_COLORS: Record<string, string> = {
  available: 'text-green-800',
  blocked:   'text-yellow-800',
  booked:    'text-orange-800',
  sold:      'text-red-800',
  mortgage:  'text-gray-500',
}

export const STATUS_SUMMARY_ACCENT: Record<string, string> = {
  available: 'bg-green-50 text-green-700 border-green-200',
  blocked:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  booked:    'bg-orange-50 text-orange-700 border-orange-200',
  sold:      'bg-red-50 text-red-700 border-red-200',
}

export const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  blocked:   'Blocked',
  booked:    'Booked',
  sold:      'Sold',
  mortgage:  'Mortgage',
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  token_paid:       'Token Paid',
  agreement_signed: 'Agreement Signed',
  loan_processing:  'Loan Processing',
  registered:       'Registered',
  possession:       'Possession',
  cancelled:        'Cancelled',
}

// ── Shared types ─────────────────────────────────────────────────────────────

export type UnitStatus = 'available' | 'blocked' | 'booked' | 'sold' | 'mortgage'
export type ProjectType = 'apartment' | 'villa' | 'plot' | 'commercial'

export type GridUnit = {
  id: string
  unit_number: string
  floor: number | null
  block: string | null
  type: string
  carpet_area_sqft: number | null
  super_buildup_area_sqft: number | null
  base_price: number | null
  total_price: number | null
  status: UnitStatus
  facing: string | null
  parking_included: boolean | null
  blocked_by: string | null
  blocked_at: string | null
  sold_to: string | null
  sold_at: string | null
  notes: string | null
}

export type ProjectRow = {
  id: string
  name: string
  type: string
  status: string
}

export type BookingInfo = {
  id: string
  status: string
  agreement_value: number | null
  total_amount: number | null
  client: { full_name: string | null; phone: string | null } | null
}
