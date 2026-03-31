'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, Send } from 'lucide-react'
import { testWhatsAppConnection, type TestConnectionState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Sending…
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          Test Connection
        </>
      )}
    </button>
  )
}

export function TestConnectionButton() {
  const [state, formAction] = useActionState<TestConnectionState, FormData>(
    testWhatsAppConnection,
    null
  )

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Sends a test message to the server log (no real WhatsApp message is sent until you activate a provider).
      </p>
      <form action={formAction}>
        <SubmitButton />
      </form>
      {state && 'success' in state && (
        <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
          {state.message}
        </p>
      )}
      {state && 'error' in state && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </div>
  )
}
