'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Building2, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction } from './actions'

const FEATURES = [
  'Lead management across 10+ channels',
  'Real-time unit inventory tracking',
  'Construction-linked payment schedules',
  'White-labelled client portal',
]

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — branding ───────────────────────────── */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between overflow-hidden bg-slate-950 p-12">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-[#0c1a3a]" />

        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Decorative building silhouette */}
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

        {/* Hero copy + features */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-[2.6rem] font-bold leading-tight text-white">
              Your Digital<br />Sales Office
            </h1>
            <p className="mt-3 text-base text-slate-400">
              The complete CRM for Indian real estate developers.
              Close deals faster, track every rupee.
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

        {/* Footer */}
        <p className="relative z-10 text-xs text-slate-700">
          © {new Date().getFullYear()} PropDesk · Built for builders.
        </p>
      </div>

      {/* ── Right panel — form ──────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
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
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to your organization's workspace
            </p>
          </div>

          {/* Info banner (e.g., "check your email") */}
          {message === 'check_email' && (
            <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              Account created! Check your email to confirm before signing in.
            </div>
          )}

          <form action={formAction} className="space-y-5">
            {/* Error */}
            {state?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="h-10"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="mt-1 h-10 w-full bg-slate-900 text-white hover:bg-slate-800"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-medium text-amber-600 hover:text-amber-500"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
