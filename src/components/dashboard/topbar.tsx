'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { useSidebarStore } from '@/stores/sidebar'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/leads': 'Leads',
  '/dashboard/leads/new': 'New Lead',
  '/dashboard/inventory': 'Inventory',
  '/dashboard/bookings': 'Bookings',
  '/dashboard/payments': 'Payments',
  '/dashboard/documents': 'Documents',
  '/dashboard/team': 'Team',
  '/dashboard/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Walk up path segments for a closest-prefix match
  const segments = pathname.split('/')
  while (segments.length > 1) {
    segments.pop()
    const candidate = segments.join('/')
    if (PAGE_TITLES[candidate]) return PAGE_TITLES[candidate]
  }
  return 'Dashboard'
}

interface TopbarProps {
  orgName: string
}

export function Topbar({ orgName }: TopbarProps) {
  const toggle = useSidebarStore((s) => s.toggle)
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4 md:px-6">
      {/* Hamburger (mobile only) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-slate-600"
        onClick={toggle}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      <h1 className="text-base font-semibold text-slate-900 flex-1 truncate">{title}</h1>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Org name (hidden on small screens) */}
        <span className="hidden sm:block text-sm text-slate-500 mr-1">{orgName}</span>

        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="text-slate-500" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Add Lead */}
        <Link
          href="/dashboard/leads/new"
          className={cn(
            buttonVariants({ size: 'sm' }),
            'bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Lead
        </Link>
      </div>
    </header>
  )
}
