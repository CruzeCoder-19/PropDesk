'use client'

import { useRole } from '@/hooks/use-role'
import type { AppRole } from '@/lib/role'

interface Props {
  roles: AppRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RequireRole({ roles, children, fallback = null }: Props) {
  const role = useRole()
  if (!roles.includes(role)) return <>{fallback}</>
  return <>{children}</>
}
