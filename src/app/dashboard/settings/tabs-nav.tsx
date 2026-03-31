'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const TABS = [
  { id: 'organization', label: 'Organization' },
  { id: 'profile',      label: 'My Profile' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'billing',      label: 'Billing' },
]

export function TabsNav() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()
  const active       = searchParams.get('tab') ?? 'organization'

  return (
    <div className="flex gap-0 border-b border-slate-200 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(`${pathname}?tab=${tab.id}`)}
          className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab.id
              ? 'border-amber-400 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
