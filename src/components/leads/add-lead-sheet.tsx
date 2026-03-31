'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createLeadAction } from '@/app/dashboard/leads/actions'
import { SOURCE_LABELS } from '@/lib/lead-constants'
import { useState } from 'react'

interface Props {
  projects: { id: string; name: string }[]
  teamMembers: { id: string; full_name: string }[]
}

const SOURCES = Object.entries(SOURCE_LABELS)

export function AddLeadSheet({ projects, teamMembers }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createLeadAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      setOpen(false)
      formRef.current?.reset()
      router.refresh()
    }
  }, [state, router])

  function getFieldError(field: string): string | undefined {
    if (state && 'error' in state && state.field === field) return state.error
    return undefined
  }

  return (
    <>
      {/* Trigger button */}
      <Button
        onClick={() => setOpen(true)}
        className="bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
        size="sm"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Lead
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sheet panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Add New Lead</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          action={formAction}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          {/* Global error */}
          {state && 'error' in state && !state.field && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="sl-name">
              Name <span className="text-red-500">*</span>
            </label>
            <Input id="sl-name" name="name" placeholder="Full name" className="h-9" />
            {getFieldError('name') && (
              <p className="text-xs text-red-600">{getFieldError('name')}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="sl-phone">
              Phone <span className="text-red-500">*</span>
            </label>
            <Input id="sl-phone" name="phone" placeholder="+91 98765 43210" className="h-9" />
            {getFieldError('phone') && (
              <p className="text-xs text-red-600">{getFieldError('phone')}</p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="sl-whatsapp">
              WhatsApp Number
            </label>
            <Input
              id="sl-whatsapp"
              name="whatsapp_number"
              placeholder="If different from phone"
              className="h-9"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="sl-email">
              Email
            </label>
            <Input
              id="sl-email"
              name="email"
              type="email"
              placeholder="email@example.com"
              className="h-9"
            />
          </div>

          {/* Source */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="sl-source">
              Source
            </label>
            <select
              id="sl-source"
              name="source"
              defaultValue="other"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
            >
              {SOURCES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="sl-project">
              Project Interest
            </label>
            <select
              id="sl-project"
              name="project_id"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
            >
              <option value="">No preference</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Budget */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Budget (₹)</label>
            <div className="flex gap-2">
              <Input name="budget_min" type="number" placeholder="Min" className="h-9" />
              <Input name="budget_max" type="number" placeholder="Max" className="h-9" />
            </div>
          </div>

          {/* Preferred unit type */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="sl-unit-type">
              Preferred Unit Type
            </label>
            <Input
              id="sl-unit-type"
              name="preferred_unit_type"
              placeholder="e.g. 2BHK, Plot, Villa"
              className="h-9"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="sl-notes">
              Notes
            </label>
            <textarea
              id="sl-notes"
              name="notes"
              rows={3}
              placeholder="Any additional details…"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-slate-900 placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 resize-none"
            />
          </div>

          {/* Assigned to */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="sl-assigned">
              Assign To
            </label>
            <select
              id="sl-assigned"
              name="assigned_to"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
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
                'Save Lead'
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
