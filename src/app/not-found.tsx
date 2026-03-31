import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400">
          <Building2 className="h-5 w-5 text-slate-950" />
        </div>
        <span className="text-xl font-bold text-slate-900">PropDesk</span>
      </div>

      <p className="text-8xl font-black text-amber-400 leading-none mb-3">404</p>
      <h1 className="text-xl font-semibold text-slate-900 mb-2">Page not found</h1>
      <p className="text-sm text-slate-500 mb-8 max-w-sm text-center">
        This page doesn&apos;t exist or may have been moved. Head back to the dashboard.
      </p>

      <Link
        href="/dashboard"
        className="rounded-lg bg-amber-400 px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  )
}
