// ── Booking status ────────────────────────────────────────────────────────────

export const BOOKING_STATUS_BADGE: Record<string, string> = {
  token_paid:       'bg-blue-50 text-blue-700 border-blue-200',
  agreement_signed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  loan_processing:  'bg-purple-50 text-purple-700 border-purple-200',
  registered:       'bg-green-50 text-green-700 border-green-200',
  possession:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:        'bg-red-50 text-red-700 border-red-200',
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  token_paid:       'Token Paid',
  agreement_signed: 'Agreement Signed',
  loan_processing:  'Loan Processing',
  registered:       'Registered',
  possession:       'Possession',
  cancelled:        'Cancelled',
}

// ── Milestone status ──────────────────────────────────────────────────────────

export const MILESTONE_STATUS_BADGE: Record<string, string> = {
  upcoming: 'bg-slate-100 text-slate-600 border-slate-200',
  due:      'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid:     'bg-green-50 text-green-700 border-green-200',
  overdue:  'bg-red-50 text-red-700 border-red-200',
}

export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  due:      'Due',
  paid:     'Paid',
  overdue:  'Overdue',
}

// ── Payment plan ──────────────────────────────────────────────────────────────

export const PAYMENT_PLAN_LABELS: Record<string, string> = {
  construction_linked: 'Construction Linked',
  down_payment:        'Down Payment',
  flexi:               'Flexi',
  custom:              'Custom',
}

// ── Document type ─────────────────────────────────────────────────────────────

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  brochure:         'Brochure',
  allotment_letter: 'Allotment Letter',
  agreement:        'Agreement',
  receipt:          'Receipt',
  noc:              'NOC',
  plan_approval:    'Plan Approval',
  rera_certificate: 'RERA Certificate',
  other:            'Other',
}

// ── CLP milestone template (percentages sum to 100) ───────────────────────────

export const CLP_TEMPLATE = [
  { name: 'Token',       pct: 10 },
  { name: 'Foundation',  pct: 15 },
  { name: 'Plinth',      pct: 10 },
  { name: '1st Slab',    pct: 10 },
  { name: '3rd Slab',    pct: 10 },
  { name: '5th Slab',    pct: 10 },
  { name: 'Brickwork',   pct: 10 },
  { name: 'Plastering',  pct: 10 },
  { name: 'Possession',  pct: 15 },
]

// ── Down-payment template ─────────────────────────────────────────────────────

export const DOWN_PAYMENT_TEMPLATE = [
  { name: 'Token',        pct: 10 },
  { name: 'Full Payment', pct: 90 },
]
