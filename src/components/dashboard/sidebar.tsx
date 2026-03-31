'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  Bell,
  Building2,
  FileCheck,
  FolderOpen,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCog,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/role'
import { useSidebarStore } from '@/stores/sidebar'
import { logoutAction } from '@/app/dashboard/actions'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'Leads', href: '/dashboard/leads', icon: Users },
  { label: 'Inventory', href: '/dashboard/inventory', icon: Building2 },
  { label: 'Bookings', href: '/dashboard/bookings', icon: FileCheck },
  { label: 'Payments', href: '/dashboard/payments', icon: IndianRupee },
  { label: 'Documents', href: '/dashboard/documents', icon: FolderOpen },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Team', href: '/dashboard/team', icon: UserCog },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
] as const

interface SidebarProps {
  fullName: string
  role: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-slate-800 text-white'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}

function SidebarContent({ fullName, role, onNavClick }: SidebarProps & { onNavClick?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 shrink-0">
          <Building2 className="h-4 w-4 text-slate-950" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">PropDesk</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {NAV_ITEMS
          .filter((item) => {
            const restricted = ['/dashboard/team', '/dashboard/analytics', '/dashboard/notifications']
            return !(restricted.includes(item.href) && role === 'salesperson')
          })
          .map((item) => (
            <NavItem key={item.href} {...item} onClick={onNavClick} />
          ))}
      </nav>

      {/* User panel */}
      <div className="border-t border-slate-800 px-3 py-4 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
            {getInitials(fullName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-200">{fullName}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABELS[role] ?? role}</p>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log out
          </button>
        </form>
      </div>
    </div>
  )
}

export function Sidebar({ fullName, role }: SidebarProps) {
  const open = useSidebarStore((s) => s.open)
  const close = useSidebarStore((s) => s.close)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 bg-slate-900 h-screen sticky top-0">
        <SidebarContent fullName={fullName} role={role} />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={close}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full w-64 bg-slate-900">
            <SidebarContent fullName={fullName} role={role} onNavClick={close} />
          </aside>
        </div>
      )}
    </>
  )
}
