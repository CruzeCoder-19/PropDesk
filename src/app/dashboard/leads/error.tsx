'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-4">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <h2 className="text-base font-semibold text-slate-900 mb-1">Something went wrong</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">
        An unexpected error occurred. Please try again or contact support if the issue persists.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}
