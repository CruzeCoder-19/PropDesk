import { Skeleton } from '@/components/ui/skeleton'

export default function BookingsLoading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Search + tabs */}
      <div className="space-y-3">
        <Skeleton className="h-9 w-72 rounded-lg" />
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex gap-6">
          {[72, 96, 80, 60, 96, 72, 72].map((w, i) => (
            <Skeleton key={i} className="h-3 rounded" style={{ width: w }} />
          ))}
        </div>
        <div className="divide-y divide-slate-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3">
              <Skeleton className="h-3 w-20 font-mono" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-7 w-14 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile card skeleton */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3 w-20 font-mono" />
            </div>
            <Skeleton className="h-4 w-40" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
