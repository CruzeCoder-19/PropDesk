'use client'

import { useRoleContext } from '@/components/dashboard/role-provider'
import type { AppRole } from '@/lib/role'

export function useRole(): AppRole {
  return useRoleContext()
}
