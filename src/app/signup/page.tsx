'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Building2, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signupAction } from './actions'

const FEATURES = [
  'Set up your org in under 5 minutes',
  'Invite your sales team instantly',
  'All your projects in one place',
  'Clients get their own portal',
]

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signupAction, null)

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — branding ───────────────────────────── */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between overflow-hidden bg-slate-950 p-12">
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-[#0c1a3a]" />

        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Decorative silhouette */}
        <Building2
          strokeWidth={0.5}
          className="absolute -bottom-8 -right-8 h-72 w-72 text-white/5"
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400">
            <Building2 className="h-5 w-5 text-slate-950" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">PropDesk</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-[2.6rem] font-bold leading-tight text-white">
              Start selling<br />smarter today
            </h1>
            <p className="mt-3 text-base text-slate-400">
              Create your PropDesk organization and bring your
              entire sales team on board in minutes.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-amber-400" />
                <span className="text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-slate-700">
          © {new Date().getFullYear()} PropDesk · Built for builders.
        </p>
      </div>

      {/* ── Right panel — form ──────────────────────────────── */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400">
              <Building2 className="h-4 w-4 text-slate-950" />
            </div>
            <span className="text-lg font-bold text-slate-900">PropDesk</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;ll be the admin. Add your team after setup.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            {/* Global error */}
            {state?.error && !state.field && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            {/* Full name */}
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                placeholder="Rajesh Kumar"
                className="h-10"
                aria-invalid={state?.field === 'full_name' || undefined}
              />
              {state?.field === 'full_name' && (
                <p className="text-xs text-red-600">{state.error}</p>
              )}
            </div>

            {/* Organization name */}
            <div className="space-y-1.5">
              <Label htmlFor="org_name">Organization name</Label>
              <Input
                id="org_name"
                name="org_name"
                type="text"
                required
                placeholder="Suncity Developers"
                className="h-10"
                aria-invalid={state?.field === 'org_name' || undefined}
              />
              {state?.field === 'org_name' ? (
                <p className="text-xs text-red-600">{state.error}</p>
              ) : (
                <p className="text-xs text-slate-400">
                  Your company or builder brand name
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="rajesh@suncity.in"
                className="h-10"
                aria-invalid={state?.field === 'email' || undefined}
              />
              {state?.field === 'email' && (
                <p className="text-xs text-red-600">{state.error}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                className="h-10"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="h-10"
                aria-invalid={state?.field === 'password' || undefined}
              />
              {state?.field === 'password' ? (
                <p className="text-xs text-red-600">{state.error}</p>
              ) : (
                <p className="text-xs text-slate-400">At least 8 characters</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="mt-2 h-10 w-full bg-slate-900 text-white hover:bg-slate-800"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-amber-600 hover:text-amber-500"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
