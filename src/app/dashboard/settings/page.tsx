import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CopyButton } from './copy-button'
import { TabsNav } from './tabs-nav'
import { OrgForm } from './org-form'
import { ProfileForm } from './profile-form'
import { SmsForm } from './sms-form'

export const metadata = { title: 'Settings — PropDesk' }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url, role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/login')
  if (profile.role === 'salesperson') redirect('/dashboard')

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, address, city, state, gst_number, rera_number, contact_email, contact_phone, api_key')
    .eq('id', profile.organization_id)
    .single()

  // Fetch org settings via admin client (avoids RLS issue on first load when no row exists)
  const admin = createAdminClient()
  const { data: orgSettings } = await admin
    .from('organization_settings')
    .select('settings')
    .eq('organization_id', profile.organization_id)
    .single()

  const settings    = (orgSettings?.settings ?? {}) as Record<string, unknown>
  const waSettings  = settings.whatsapp as { api_key?: string } | undefined
  const smsSettings = settings.sms as { provider?: string; api_key?: string; sender_id?: string } | undefined

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const captureEndpoint = `${appUrl}/api/leads/capture`
  const embedUrl        = `${appUrl}/embed/${org?.slug ?? ''}`
  const facebookWebhook = `${appUrl}/api/leads/facebook?org=${org?.slug ?? ''}`
  const iframeSnippet   =
    `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="520"\n  frameborder="0"\n  style="border:none;border-radius:16px;"\n></iframe>`

  const tab     = (await searchParams).tab ?? 'organization'
  const isAdmin = profile.role === 'admin'

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>

      {/* Tab navigation */}
      <Suspense fallback={<div className="h-10 border-b border-slate-200" />}>
        <TabsNav />
      </Suspense>

      {/* ── Tab: Organization ─────────────────────────────────────── */}
      {tab === 'organization' && org && (
        <OrgForm
          org={{
            name:          org.name,
            slug:          org.slug,
            logo_url:      org.logo_url,
            address:       org.address,
            city:          org.city,
            state:         org.state,
            gst_number:    org.gst_number,
            rera_number:   org.rera_number,
            contact_email: org.contact_email,
            contact_phone: org.contact_phone,
          }}
          orgId={org.id}
          isAdmin={isAdmin}
        />
      )}

      {/* ── Tab: My Profile ───────────────────────────────────────── */}
      {tab === 'profile' && (
        <ProfileForm
          profile={{
            full_name:  profile.full_name,
            phone:      profile.phone,
            avatar_url: profile.avatar_url,
          }}
          userId={user.id}
        />
      )}

      {/* ── Tab: Integrations ─────────────────────────────────────── */}
      {tab === 'integrations' && (
        <div className="space-y-4">

          {/* WhatsApp card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">WhatsApp</h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  waSettings?.api_key
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    waSettings?.api_key ? 'bg-green-500' : 'bg-slate-400'
                  }`}
                />
                {waSettings?.api_key ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Connect your WhatsApp Business API provider to send automated messages for lead follow-ups, booking confirmations, and payment reminders.
            </p>
            <Link
              href="/dashboard/settings/whatsapp"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Configure →
            </Link>
          </div>

          {/* SMS card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">SMS (MSG91 / Twilio)</h2>
              <p className="mt-1 text-sm text-slate-500">
                Send SMS notifications for dues reminders and booking confirmations.
              </p>
            </div>
            <SmsForm initialSettings={smsSettings} />
          </div>

          {/* Facebook Lead Ads card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Facebook Lead Ads</h2>
              <p className="mt-1 text-sm text-slate-500">
                Connect Facebook Lead Ads to automatically capture leads from your ad campaigns.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Webhook URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700">
                    {facebookWebhook}
                  </code>
                  <CopyButton value={facebookWebhook} />
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Required Environment Variables</p>
                <div className="flex flex-wrap gap-2">
                  <code className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700">FACEBOOK_VERIFY_TOKEN</code>
                  <code className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700">FB_APP_SECRET</code>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 space-y-1">
              <p className="font-medium">Setup instructions</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-700">
                <li>Go to <strong>Facebook App Dashboard → Webhooks → Page → leadgen</strong></li>
                <li>Enter the webhook URL above and set your <code className="font-mono text-xs">FACEBOOK_VERIFY_TOKEN</code></li>
                <li>Subscribe to the <strong>leadgen</strong> field</li>
                <li>Set <code className="font-mono text-xs">FB_APP_SECRET</code> in your deployment environment for payload signature verification</li>
              </ol>
            </div>
          </div>

          {/* Lead Capture API card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Lead Capture API</h2>
              <p className="mt-1 text-sm text-slate-500">
                Post leads from any external system using the endpoint and API key below.
                Include the key in the{' '}
                <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded">X-API-Key</code> request header.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Endpoint</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700">
                    POST {captureEndpoint}
                  </code>
                  <CopyButton value={captureEndpoint} />
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">API Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700">
                    {org?.api_key ?? '—'}
                  </code>
                  <CopyButton value={org?.api_key ?? ''} />
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Embed Form URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700">
                    {embedUrl}
                  </code>
                  <CopyButton value={embedUrl} />
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Embed Code</p>
                <div className="relative">
                  <pre className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre">
                    {iframeSnippet}
                  </pre>
                  <div className="absolute right-2 top-2">
                    <CopyButton value={iframeSnippet} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium">Required fields</p>
              <p className="font-mono text-blue-600">name · phone · organization_slug</p>
              <p className="font-medium mt-1">Optional fields</p>
              <p className="font-mono text-blue-600">email · source · project_slug · utm_source · utm_medium · utm_campaign</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Billing ──────────────────────────────────────────── */}
      {tab === 'billing' && (
        <div className="space-y-6">

          {/* Trial banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-amber-900">Free Trial</h2>
              <p className="mt-0.5 text-sm text-amber-700">Explore all features — no credit card required.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-900">
              14 days remaining
            </span>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Starter */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Starter</h3>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  ₹4,999<span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {['Up to 3 users', '500 leads / month', 'Basic analytics', 'Lead Capture API', 'Email support'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:sales@propdesk.in?subject=Starter Plan Enquiry"
                className="block w-full text-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Contact Sales
              </a>
            </div>

            {/* Growth */}
            <div className="rounded-xl border-2 border-amber-400 bg-white p-6 space-y-4 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-semibold text-amber-900">
                Most Popular
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Growth</h3>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  ₹9,999<span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {['Up to 10 users', 'Unlimited leads', 'Full analytics dashboard', 'WhatsApp integration', 'Facebook Lead Ads', 'Priority email support'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:sales@propdesk.in?subject=Growth Plan Enquiry"
                className="block w-full text-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-300 transition-colors"
              >
                Contact Sales
              </a>
            </div>

            {/* Enterprise */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Enterprise</h3>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  ₹19,999<span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {['Unlimited users', 'Custom integrations', 'White-label branding', 'Dedicated account manager', 'SLA-backed support', 'On-premise option'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:sales@propdesk.in?subject=Enterprise Plan Enquiry"
                className="block w-full text-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
