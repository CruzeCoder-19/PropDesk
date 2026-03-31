'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clientLoginAction } from './actions'

export default function ClientLoginPage() {
  const [state, formAction, isPending] = useActionState(clientLoginAction, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Logo */}
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400">
            <Building2 className="h-5 w-5 text-slate-950" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">PropDesk</span>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Your Property Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your payments and documents
          </p>
        </div>

        {/* Error */}
        {state?.error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@email.com"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
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

        <p className="mt-6 text-center text-xs text-slate-400">
          For builders &amp; agents →{' '}
          <Link href="/login" className="font-medium text-slate-500 hover:text-slate-700">
            Admin Login
          </Link>
        </p>
      </div>
    </div>
  )
}
