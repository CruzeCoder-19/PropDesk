import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TestConnectionButton } from './test-button'

export const metadata = { title: 'WhatsApp Settings — PropDesk' }

const PROVIDERS = [
  { value: 'interakt', label: 'Interakt' },
  { value: 'wati',     label: 'Wati' },
  { value: 'aisensy',  label: 'AiSensy' },
  { value: 'meta',     label: 'Official Meta API' },
] as const

const TEMPLATE_FIELDS = [
  { name: 'thank_you',            label: 'Thank You (lead captured)',     placeholder: 'e.g. thank_you_v1' },
  { name: 'brochure',             label: 'Brochure (with project link)',  placeholder: 'e.g. send_brochure_v1' },
  { name: 'due_reminder',         label: 'Payment Due Reminder',         placeholder: 'e.g. due_reminder_v1' },
  { name: 'booking_confirmation', label: 'Booking Confirmation',         placeholder: 'e.g. booking_confirmed_v1' },
] as const

export default async function WhatsAppSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/login')
  if (profile.role === 'salesperson') redirect('/dashboard')

  // Use service role so missing settings row returns null gracefully (not RLS denied)
  const admin = createAdminClient()
  const { data: settingsRow } = await admin
    .from('organization_settings')
    .select('settings')
    .eq('organization_id', profile.organization_id)
    .single()

  const wa = (settingsRow?.settings as Record<string, unknown> | null)?.whatsapp as
    | { provider?: string; api_key?: string; templates?: Record<string, string> }
    | undefined

  const isConnected = !!(wa?.api_key)

  async function formAction(formData: FormData) {
    'use server'
    const { saveWhatsAppSettings } = await import('./actions')
    await saveWhatsAppSettings(null, formData)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Settings
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">WhatsApp</span>
      </div>

      {/* Header + status badge */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">WhatsApp Integration</h1>
        {isConnected ? (
          <span className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Not Connected
          </span>
        )}
      </div>

      {/* ── Card: Configuration ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Configuration</h2>
          <p className="mt-1 text-sm text-slate-500">
            Connect a WhatsApp Business API provider to send automated messages to leads and clients.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          {/* Provider */}
          <div>
            <label htmlFor="provider" className="mb-1.5 block text-xs font-medium text-slate-600 uppercase tracking-wide">
              Provider
            </label>
            <select
              id="provider"
              name="provider"
              defaultValue={wa?.provider ?? 'interakt'}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="api_key" className="mb-1.5 block text-xs font-medium text-slate-600 uppercase tracking-wide">
              API Key
            </label>
            <input
              id="api_key"
              type="password"
              name="api_key"
              defaultValue={wa?.api_key ?? ''}
              autoComplete="off"
              placeholder="Paste your provider API key here"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          {/* Template IDs */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Message Template IDs</p>
            <p className="text-xs text-slate-500">
              Create these templates in your provider dashboard and paste their IDs here.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATE_FIELDS.map((field) => (
                <div key={field.name}>
                  <label htmlFor={field.name} className="mb-1 block text-xs text-slate-500">
                    {field.label}
                  </label>
                  <input
                    id={field.name}
                    type="text"
                    name={field.name}
                    defaultValue={wa?.templates?.[field.name] ?? ''}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-700 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-500"
          >
            Save Settings
          </button>
        </form>
      </div>

      {/* ── Card: Test Connection ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Test Connection</h2>
          <p className="mt-1 text-sm text-slate-500">
            Verify your configuration by sending a test message to the server log.
          </p>
        </div>
        <TestConnectionButton />
      </div>

      {/* ── Card: Setup Guide ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Activation Guide</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
          <li>
            Sign up at{' '}
            <span className="font-medium text-slate-800">Interakt</span>{' '}
            (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">interakt.shop</code>),{' '}
            <span className="font-medium text-slate-800">Wati</span>{' '}
            (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">wati.io</code>), or your chosen provider.
          </li>
          <li>Connect your WhatsApp Business number in their dashboard.</li>
          <li>Create the four message templates listed above and note their IDs.</li>
          <li>Paste your API key and template IDs above, then click <strong>Save Settings</strong>.</li>
          <li>
            In <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">src/lib/whatsapp/client.ts</code>,
            uncomment the <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">fetch()</code> call in each method to activate real sending.
          </li>
        </ol>
      </div>
    </div>
  )
}
