export const ROLE_LABELS: Record<string, string> = {
  admin:         'Admin',
  sales_manager: 'Sales Manager',
  salesperson:   'Salesperson',
  client:        'Client',
}

export const ROLE_BADGE: Record<string, string> = {
  admin:         'bg-purple-50 text-purple-700 border-purple-200',
  sales_manager: 'bg-blue-50 text-blue-700 border-blue-200',
  salesperson:   'bg-slate-100 text-slate-600 border-slate-200',
  client:        'bg-green-50 text-green-700 border-green-200',
}

export type AppRole = 'admin' | 'sales_manager' | 'salesperson' | 'client'

export function canManageTeam(role: string): boolean {
  return role === 'admin' || role === 'sales_manager'
}
