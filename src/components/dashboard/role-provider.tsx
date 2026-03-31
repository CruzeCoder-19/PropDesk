'use client'

import { createContext, useContext } from 'react'
import type { AppRole } from '@/lib/role'

const RoleContext = createContext<AppRole>('salesperson')

export function RoleProvider({
  role,
  children,
}: {
  role: AppRole
  children: React.ReactNode
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRoleContext(): AppRole {
  return useContext(RoleContext)
}
