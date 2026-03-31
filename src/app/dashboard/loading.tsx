import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
            <div style={{ height: '220px' }}>
              <Skeleton className="h-full w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Mini tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            <div className="px-5 py-4">
              <Skeleton className="h-4 w-32" />
            </div>
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
