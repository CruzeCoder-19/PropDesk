import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { clientSignOutAction } from './actions'

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client-portal/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') redirect('/client-portal/login')

  const fullName = profile.full_name ?? user.email ?? 'Buyer'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navbar */}
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400">
              <Building2 className="h-4 w-4 text-slate-950" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">PropDesk</span>
          </div>

          {/* Nav links */}
          <div className="hidden items-center gap-6 sm:flex">
            <Link
              href="/client-portal/dashboard"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              My Property
            </Link>
            <Link
              href="/client-portal/payments"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Payments
            </Link>
            <Link
              href="/client-portal/documents"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Documents
            </Link>
          </div>

          {/* User + sign out */}
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">{fullName}</span>
            <form action={clientSignOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex gap-4 border-t border-slate-100 px-4 py-2 sm:hidden">
          <Link href="/client-portal/dashboard" className="text-xs text-slate-600 hover:text-slate-900">
            My Property
          </Link>
          <Link href="/client-portal/payments" className="text-xs text-slate-600 hover:text-slate-900">
            Payments
          </Link>
          <Link href="/client-portal/documents" className="text-xs text-slate-600 hover:text-slate-900">
            Documents
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  )
}
