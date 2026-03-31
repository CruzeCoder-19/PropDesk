'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createBookingAction } from '@/app/dashboard/bookings/actions'
import { formatCrores } from '@/lib/format'
import {
  CLP_TEMPLATE,
  DOWN_PAYMENT_TEMPLATE,
  PAYMENT_PLAN_LABELS,
  BOOKING_STATUS_LABELS,
} from '@/lib/booking-constants'
import { STATUS_LABELS } from '@/lib/inventory-constants'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface UnitOption {
  id: string
  unit_number: string
  block: string | null
  floor: number | null
  type: string
  total_price: number | null
  status: string
  project: { id: string; name: string }
}

interface LeadOption {
  id: string
  name: string
  phone: string
  email: string | null
}

interface MilestoneRow {
  id: string
  name: string
  pct: number
  amount: number
  due_date: string
}

interface Props {
  preselectedUnitId: string | null
  units: UnitOption[]
  leads: LeadOption[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SELECT_CLS =
  'h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50'

const STEPS = [
  { n: 1, label: 'Client' },
  { n: 2, label: 'Unit' },
  { n: 3, label: 'Financial' },
  { n: 4, label: 'Milestones' },
  { n: 5, label: 'Review' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function seedMilestones(plan: string, total: number): MilestoneRow[] {
  const template =
    plan === 'construction_linked'
      ? CLP_TEMPLATE
      : plan === 'down_payment'
      ? DOWN_PAYMENT_TEMPLATE
      : []
  return template.map((t) => ({
    id: crypto.randomUUID(),
    name: t.name,
    pct: t.pct,
    amount: Math.round((t.pct / 100) * total),
    due_date: '',
  }))
}

function floorLabel(floor: number | null): string {
  if (floor === null) return ''
  return floor === 0 ? 'GF' : `F${floor}`
}

// ── NewBookingForm ─────────────────────────────────────────────────────────────

export function NewBookingForm({ preselectedUnitId, units, leads }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [loading, setLoading] = useState(false)

  // Step 1 — Client
  const [clientMode, setClientMode] = useState<'lead' | 'new'>('lead')
  const [leadSearch, setLeadSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Step 2 — Unit
  const [unitSearch, setUnitSearch] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null)

  // Step 3 — Financial
  const today = new Date().toISOString().slice(0, 10)
  const [bookingDate, setBookingDate] = useState(today)
  const [agreementValue, setAgreementValue] = useState('')
  const [gstPercent, setGstPercent] = useState('5')
  const [totalOverride, setTotalOverride] = useState('')
  const [paymentPlan, setPaymentPlan] = useState('construction_linked')
  const [notes, setNotes] = useState('')

  // Step 4 — Milestones
  const [milestones, setMilestones] = useState<MilestoneRow[]>([])
  const [milestonesSeeded, setMilestonesSeeded] = useState(false)

  // Pre-select unit from URL param
  useEffect(() => {
    if (preselectedUnitId) {
      const found = units.find((u) => u.id === preselectedUnitId)
      if (found) setSelectedUnit(found)
    }
  }, [preselectedUnitId, units])

  // Derived financials
  const agreeNum = parseFloat(agreementValue) || 0
  const gstNum = parseFloat(gstPercent) || 0
  const gstAmount = Math.round((agreeNum * gstNum) / 100)
  const autoTotal = agreeNum + gstAmount
  const displayTotal = totalOverride !== '' ? parseFloat(totalOverride) || 0 : autoTotal

  // Seed milestones when entering step 4
  const enterStep4 = useCallback(() => {
    setMilestones(seedMilestones(paymentPlan, displayTotal))
    setMilestonesSeeded(true)
    setStep(4)
  }, [paymentPlan, displayTotal])

  // Re-seed if plan or total changed after already seeded
  useEffect(() => {
    if (milestonesSeeded) {
      setMilestones(seedMilestones(paymentPlan, displayTotal))
    }
    // Only re-seed when plan/total changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentPlan, displayTotal])

  // ── Lead search ──────────────────────────────────────────────────────────────
  const filteredLeads = leadSearch.trim()
    ? leads
        .filter((l) => {
          const q = leadSearch.toLowerCase()
          return (
            l.name.toLowerCase().includes(q) ||
            l.phone.includes(q) ||
            (l.email ?? '').toLowerCase().includes(q)
          )
        })
        .slice(0, 8)
    : []

  // ── Unit search ──────────────────────────────────────────────────────────────
  const filteredUnits = unitSearch.trim()
    ? units
        .filter((u) => {
          const q = unitSearch.toLowerCase()
          return (
            u.unit_number.toLowerCase().includes(q) ||
            (u.block ?? '').toLowerCase().includes(q) ||
            u.project.name.toLowerCase().includes(q) ||
            u.type.toLowerCase().includes(q)
          )
        })
        .slice(0, 10)
    : units.slice(0, 10)

  // ── Milestone helpers ─────────────────────────────────────────────────────────
  function updateMilestone(id: string, field: keyof MilestoneRow, value: string | number) {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        const updated = { ...m, [field]: value }
        if (field === 'pct') {
          updated.amount = Math.round((Number(value) / 100) * displayTotal)
        } else if (field === 'amount') {
          updated.pct = displayTotal > 0 ? Math.round((Number(value) / displayTotal) * 100) : 0
        }
        return updated
      })
    )
  }

  function addMilestone() {
    setMilestones((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', pct: 0, amount: 0, due_date: '' },
    ])
  }

  function removeMilestone(id: string) {
    setMilestones((prev) => prev.filter((m) => m.id !== id))
  }

  const milestoneTotalAllocated = milestones.reduce((s, m) => s + m.amount, 0)

  // ── Step validation ───────────────────────────────────────────────────────────
  function validateStep1(): string | null {
    if (clientMode === 'lead') {
      if (!selectedLead) return 'Please select a lead'
    } else {
      if (!newName.trim()) return 'Client name is required'
      if (!newPhone.trim()) return 'Client phone is required'
      if (!newEmail.trim()) return 'Client email is required'
    }
    return null
  }

  function validateStep2(): string | null {
    if (!selectedUnit) return 'Please select a unit'
    return null
  }

  function validateStep3(): string | null {
    if (!agreeNum || agreeNum <= 0) return 'Agreement value is required'
    if (!displayTotal || displayTotal <= 0) return 'Total amount is required'
    return null
  }

  function handleNext() {
    if (step === 1) {
      const err = validateStep1()
      if (err) { toast.error(err); return }
      setStep(2)
    } else if (step === 2) {
      const err = validateStep2()
      if (err) { toast.error(err); return }
      setStep(3)
    } else if (step === 3) {
      const err = validateStep3()
      if (err) { toast.error(err); return }
      if (!milestonesSeeded) {
        enterStep4()
      } else {
        setMilestones(seedMilestones(paymentPlan, displayTotal))
        setStep(4)
      }
    } else if (step === 4) {
      setStep(5)
    }
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5)
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setLoading(true)
    const fd = new FormData()
    fd.set('client_mode', clientMode)
    if (clientMode === 'lead') {
      fd.set('lead_id', selectedLead!.id)
    } else {
      fd.set('new_client_name', newName)
      fd.set('new_client_phone', newPhone)
      fd.set('new_client_email', newEmail)
    }
    fd.set('unit_id', selectedUnit!.id)
    fd.set('booking_date', bookingDate)
    fd.set('agreement_value', String(agreeNum))
    fd.set('gst_amount', String(gstAmount))
    fd.set('total_amount', String(displayTotal))
    fd.set('payment_plan', paymentPlan)
    if (notes) fd.set('notes', notes)
    fd.set(
      'milestones_json',
      JSON.stringify(
        milestones.map((m, i) => ({
          milestone_name: m.name,
          milestone_order: i + 1,
          amount_due: m.amount,
          due_date: m.due_date || null,
        }))
      )
    )

    const result = await createBookingAction(null, fd)
    if (!result || 'error' in result) {
      toast.error((result as { error: string } | null)?.error ?? 'Unknown error')
      setLoading(false)
      return
    }
    toast.success('Booking created')
    router.push(`/dashboard/bookings/${result.bookingId}`)
  }

  // ── Progress indicator ────────────────────────────────────────────────────────
  function StepIndicator() {
    return (
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((s, i) => {
          const isActive = step === s.n
          const isDone = step > s.n
          return (
            <div key={s.n} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors',
                    isActive
                      ? 'bg-amber-400 border-amber-400 text-slate-950'
                      : isDone
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-slate-200 text-slate-400'
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : s.n}
                </div>
                <span
                  className={cn(
                    'mt-1 text-[10px] font-medium whitespace-nowrap',
                    isActive ? 'text-slate-900' : isDone ? 'text-green-600' : 'text-slate-400'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-1 mb-4',
                    step > s.n ? 'bg-green-400' : 'bg-slate-200'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <StepIndicator />

      {/* ── Step 1: Client ───────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Client Details</h2>

          {/* Mode toggle */}
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1 w-fit">
            <button
              type="button"
              onClick={() => setClientMode('lead')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                clientMode === 'lead'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              From Lead
            </button>
            <button
              type="button"
              onClick={() => setClientMode('new')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                clientMode === 'new'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              New Client
            </button>
          </div>

          {clientMode === 'lead' ? (
            <div className="space-y-2">
              {selectedLead ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{selectedLead.name}</p>
                      <p className="text-xs text-slate-500">{selectedLead.phone}</p>
                      {selectedLead.email && (
                        <p className="text-xs text-slate-400">{selectedLead.email}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedLead(null); setLeadSearch('') }}
                      className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    placeholder="Search by name, phone, or email…"
                    className="h-9"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                  />
                  {filteredLeads.length > 0 && (
                    <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {filteredLeads.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => { setSelectedLead(l); setLeadSearch('') }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{l.name}</p>
                            <p className="text-xs text-slate-400">{l.phone}</p>
                          </div>
                          {l.email && (
                            <p className="text-xs text-slate-400 truncate max-w-[140px]">{l.email}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {leadSearch.trim() && filteredLeads.length === 0 && (
                    <p className="text-xs text-slate-400 px-1">No leads found for &ldquo;{leadSearch}&rdquo;</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Rajesh Sharma"
                  className="h-9"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    className="h-9"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. rajesh@email.com"
                    className="h-9"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Unit ─────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Select Unit</h2>

          {selectedUnit ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{selectedUnit.unit_number}</p>
                  <p className="text-xs text-slate-600">{selectedUnit.project.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                    {selectedUnit.type && <span>{selectedUnit.type}</span>}
                    {selectedUnit.floor !== null && <span>{floorLabel(selectedUnit.floor)}</span>}
                    {selectedUnit.block && <span>Block {selectedUnit.block}</span>}
                    {selectedUnit.total_price != null && (
                      <span className="font-medium text-slate-700">{formatCrores(selectedUnit.total_price)}</span>
                    )}
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium',
                        selectedUnit.status === 'available'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      )}
                    >
                      {STATUS_LABELS[selectedUnit.status] ?? selectedUnit.status}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedUnit(null); setUnitSearch('') }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Search unit number, block, or project…"
                className="h-9"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
              />
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden max-h-72 overflow-y-auto">
                {filteredUnits.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUnit(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {u.unit_number}
                        {u.block && (
                          <span className="font-normal text-slate-400"> · Block {u.block}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {u.project.name}
                        {u.type && ` · ${u.type}`}
                        {u.floor !== null && ` · ${floorLabel(u.floor)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.total_price != null && (
                        <span className="text-xs text-slate-600">{formatCrores(u.total_price)}</span>
                      )}
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium',
                          u.status === 'available'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        )}
                      >
                        {STATUS_LABELS[u.status] ?? u.status}
                      </span>
                    </div>
                  </button>
                ))}
                {filteredUnits.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-slate-400">No units found</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Financial ────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Financial Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Booking Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Payment Plan</label>
              <select
                value={paymentPlan}
                onChange={(e) => setPaymentPlan(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="construction_linked">Construction Linked</option>
                <option value="down_payment">Down Payment</option>
                <option value="flexi">Flexi</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Agreement Value (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="1"
                placeholder="e.g. 5000000"
                className="h-9"
                value={agreementValue}
                onChange={(e) => {
                  setAgreementValue(e.target.value)
                  setTotalOverride('')
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">GST %</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="5"
                className="h-9"
                value={gstPercent}
                onChange={(e) => {
                  setGstPercent(e.target.value)
                  setTotalOverride('')
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">GST Amount (₹)</label>
              <div className="h-9 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-600">
                {gstAmount > 0 ? gstAmount.toLocaleString('en-IN') : '—'}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Total Amount (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="1"
                placeholder="Auto-calculated"
                className="h-9"
                value={totalOverride !== '' ? totalOverride : autoTotal > 0 ? String(autoTotal) : ''}
                onChange={(e) => setTotalOverride(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes about this booking…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-slate-900 placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 resize-none"
            />
          </div>
        </div>
      )}

      {/* ── Step 4: Milestones ───────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Payment Milestones</h2>
            <p className="text-xs text-slate-500">Total: {formatCrores(displayTotal)}</p>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Milestone</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-16">%</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-28">Amount (₹)</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-36">Due Date</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {milestones.map((m) => (
                  <tr key={m.id}>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => updateMilestone(m.id, 'name', e.target.value)}
                        placeholder="Milestone name"
                        className="w-full h-7 rounded-md border border-transparent bg-transparent px-1.5 text-sm text-slate-900 placeholder:text-slate-300 focus:border-input focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={m.pct}
                        onChange={(e) => updateMilestone(m.id, 'pct', parseFloat(e.target.value) || 0)}
                        className="w-full h-7 rounded-md border border-transparent bg-transparent px-1.5 text-sm text-right text-slate-900 focus:border-input focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step="1"
                        value={m.amount}
                        onChange={(e) => updateMilestone(m.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full h-7 rounded-md border border-transparent bg-transparent px-1.5 text-sm text-right text-slate-900 focus:border-input focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={m.due_date}
                        onChange={(e) => updateMilestone(m.id, 'due_date', e.target.value)}
                        className="w-full h-7 rounded-md border border-transparent bg-transparent px-1.5 text-sm text-slate-900 focus:border-input focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(m.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={addMilestone}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Milestone
            </button>
            <p
              className={cn(
                'text-xs font-medium',
                Math.abs(milestoneTotalAllocated - displayTotal) < 1
                  ? 'text-green-600'
                  : 'text-amber-600'
              )}
            >
              Allocated: {formatCrores(milestoneTotalAllocated)} of {formatCrores(displayTotal)}
            </p>
          </div>
        </div>
      )}

      {/* ── Step 5: Review ───────────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Review & Confirm</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Client */}
            <div className="rounded-lg border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client</p>
              {clientMode === 'lead' ? (
                <>
                  <p className="font-medium text-slate-900">{selectedLead?.name}</p>
                  <p className="text-xs text-slate-500">{selectedLead?.phone}</p>
                  {selectedLead?.email && (
                    <p className="text-xs text-slate-400">{selectedLead.email}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-900">{newName}</p>
                  <p className="text-xs text-slate-500">{newPhone}</p>
                  <p className="text-xs text-slate-400">{newEmail}</p>
                </>
              )}
            </div>

            {/* Unit */}
            <div className="rounded-lg border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unit</p>
              <p className="font-medium text-slate-900">{selectedUnit?.unit_number}</p>
              <p className="text-xs text-slate-500">{selectedUnit?.project.name}</p>
              <div className="flex flex-wrap gap-x-2 text-xs text-slate-400">
                {selectedUnit?.type && <span>{selectedUnit.type}</span>}
                {selectedUnit?.floor !== null && selectedUnit?.floor !== undefined && (
                  <span>{floorLabel(selectedUnit.floor)}</span>
                )}
                {selectedUnit?.block && <span>Block {selectedUnit.block}</span>}
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Financial</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Agreement Value</span>
                <span className="font-medium text-slate-900">{formatCrores(agreeNum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GST ({gstPercent}%)</span>
                <span className="font-medium text-slate-900">{formatCrores(gstAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-semibold text-slate-900">{formatCrores(displayTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan</span>
                <span className="text-slate-900">{PAYMENT_PLAN_LABELS[paymentPlan] ?? paymentPlan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Date</span>
                <span className="text-slate-900">
                  {bookingDate
                    ? new Date(bookingDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Initial Status</span>
                <span className="text-slate-900">{BOOKING_STATUS_LABELS['token_paid']}</span>
              </div>
            </div>
          </div>

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Payment Schedule ({milestones.length} milestones)
                </p>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {milestones.map((m, i) => (
                    <tr key={m.id} className="px-4">
                      <td className="px-4 py-2 text-slate-600">{m.name || `Milestone ${i + 1}`}</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-900">
                        {formatCrores(m.amount)}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-slate-400">
                        {m.due_date
                          ? new Date(m.due_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-6 mt-6 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
          className="border-slate-200 text-slate-700"
        >
          ← Back
        </Button>

        {step < 5 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
          >
            Next →
          </Button>
        ) : (
          <Button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Booking'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
