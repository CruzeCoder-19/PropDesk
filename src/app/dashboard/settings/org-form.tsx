'use client'

import { useState, useActionState, useTransition, type ChangeEvent } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CopyButton } from './copy-button'
import { updateOrgAction, type OrgState } from './actions'

interface OrgData {
  name:          string | null
  slug:          string
  logo_url:      string | null
  address:       string | null
  city:          string | null
  state:         string | null
  gst_number:    string | null
  rera_number:   string | null
  contact_email: string | null
  contact_phone: string | null
}

interface Props {
  org:     OrgData
  orgId:   string
  isAdmin: boolean
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Save Organisation
    </button>
  )
}

export function OrgForm({ org, orgId, isAdmin }: Props) {
  const [state, formAction] = useActionState<OrgState, FormData>(updateOrgAction, null)
  const [logoUrl, setLogoUrl]     = useState(org.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')

    const ext     = file.name.split('.').pop() ?? 'jpg'
    const path    = `${orgId}/logo.${ext}`
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('media')
      .upload(path, file, { upsert: true })

    if (error) {
      setUploadError(error.message)
    } else {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
    }
    setUploading(false)
  }

  const disabled = !isAdmin

  return (
    <form action={formAction} className="space-y-6">
      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Organisation Details</h2>

        <div className="flex items-center gap-5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Organisation logo"
              className="h-16 w-16 rounded-xl object-contain border border-slate-200 bg-slate-50"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
              <Upload className="h-6 w-6" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Logo</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              disabled={uploading || disabled}
              className="block text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
            />
            {uploading && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
              </p>
            )}
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          </div>
        </div>

        {/* Hidden logo_url sent with form */}
        <input type="hidden" name="logo_url" value={logoUrl} />

        {/* Slug (read-only) */}
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
            Organisation Slug (read-only)
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-600">
              {org.slug}
            </code>
            <CopyButton value={org.slug} />
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-slate-700 mb-1">
            Organisation Name <span className="text-red-500">*</span>
          </label>
          <input
            id="org-name"
            name="name"
            type="text"
            defaultValue={org.name ?? ''}
            disabled={disabled}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="org-address" className="block text-sm font-medium text-slate-700 mb-1">
            Address
          </label>
          <input
            id="org-address"
            name="address"
            type="text"
            defaultValue={org.address ?? ''}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {/* City / State */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="org-city" className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <input
              id="org-city"
              name="city"
              type="text"
              defaultValue={org.city ?? ''}
              disabled={disabled}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div>
            <label htmlFor="org-state" className="block text-sm font-medium text-slate-700 mb-1">State</label>
            <input
              id="org-state"
              name="state"
              type="text"
              defaultValue={org.state ?? ''}
              disabled={disabled}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        {/* GST / RERA */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="org-gst" className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
            <input
              id="org-gst"
              name="gst_number"
              type="text"
              defaultValue={org.gst_number ?? ''}
              disabled={disabled}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div>
            <label htmlFor="org-rera" className="block text-sm font-medium text-slate-700 mb-1">RERA Number</label>
            <input
              id="org-rera"
              name="rera_number"
              type="text"
              defaultValue={org.rera_number ?? ''}
              disabled={disabled}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="org-email" className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
            <input
              id="org-email"
              name="contact_email"
              type="email"
              defaultValue={org.contact_email ?? ''}
              disabled={disabled}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div>
            <label htmlFor="org-phone" className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
            <input
              id="org-phone"
              name="contact_phone"
              type="tel"
              defaultValue={org.contact_phone ?? ''}
              disabled={disabled}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        {/* Feedback */}
        {state && 'error' in state && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </div>
        )}
        {state && 'success' in state && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Organisation settings saved.
          </div>
        )}

        {isAdmin ? (
          <SubmitButton disabled={uploading} />
        ) : (
          <p className="text-sm text-slate-500 italic">Only admins can edit organisation settings.</p>
        )}
      </div>
    </form>
  )
}
