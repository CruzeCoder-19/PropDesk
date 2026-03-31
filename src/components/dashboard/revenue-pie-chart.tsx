'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCrores } from '@/lib/format'

const COLORS = ['#10b981', '#f59e0b']

interface PieEntry {
  name: string
  value: number
}

export function RevenuePieChart({ data }: { data: PieEntry[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Revenue Overview</h2>
      <p className="mb-4 text-xs text-slate-400">
        Total: {total > 0 ? formatCrores(total) : '—'}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            formatter={(value) => [typeof value === 'number' ? formatCrores(value) : value, '']}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
