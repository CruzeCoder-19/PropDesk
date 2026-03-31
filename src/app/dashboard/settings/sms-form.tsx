'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { saveSmsSettingsAction, type SmsState } from './actions'

interface Props {
  initialSettings?: {
    provider?:  string
    api_key?:   string
    sender_id?: string
  }
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Save SMS Settings
    </button>
  )
}

export function SmsForm({ initialSettings }: Props) {
  const [state, formAction] = useActionState<SmsState, FormData>(saveSmsSettingsAction, null)
  const isConnected = Boolean(initialSettings?.api_key)

  return (
    <form action={formAction} className="space-y-4">
      {/* Provider */}
      <div>
        <label htmlFor="sms-provider" className="block text-sm font-medium text-slate-700 mb-1">
          Provider
        </label>
        <select
          id="sms-provider"
          name="sms_provider"
          defaultValue={initialSettings?.provider ?? 'msg91'}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="msg91">MSG91</option>
          <option value="twilio">Twilio</option>
        </select>
      </div>

      {/* API Key */}
      <div>
        <label htmlFor="sms-api-key" className="block text-sm font-medium text-slate-700 mb-1">
          API Key / Auth Token
        </label>
        <input
          id="sms-api-key"
          name="sms_api_key"
          type="password"
          autoComplete="off"
          defaultValue={initialSettings?.api_key ?? ''}
          placeholder="••••••••••••••••"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Sender ID */}
      <div>
        <label htmlFor="sms-sender-id" className="block text-sm font-medium text-slate-700 mb-1">
          Sender ID <span className="text-slate-400 font-normal">(MSG91: Sender ID · Twilio: From number)</span>
        </label>
        <input
          id="sms-sender-id"
          name="sms_sender_id"
          type="text"
          defaultValue={initialSettings?.sender_id ?? ''}
          placeholder="e.g. PROPDK or +91XXXXXXXXXX"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {state && 'error' in state && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      {state && 'success' in state && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          SMS settings saved.
        </div>
      )}

      <div className="flex items-center justify-between">
        <SubmitButton />
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isConnected
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-400'}`} />
          {isConnected ? 'Connected' : 'Not Connected'}
        </span>
      </div>
    </form>
  )
}
