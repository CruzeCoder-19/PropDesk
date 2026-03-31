import { Skeleton } from '@/components/ui/skeleton'

export default function InventoryLoading() {
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Skeleton className="h-9 w-44 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-5 w-20" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-28 rounded-full" />
        ))}
      </div>

      {/* Unit grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="rounded-lg" style={{ height: '72px' }} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
