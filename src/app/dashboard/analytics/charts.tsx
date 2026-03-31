'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCrores } from '@/lib/format'

export type MonthPoint = {
  month: string
  bookings: number
  revenue: number
  collected: number
}

export type SourceSlice = {
  source: string
  label: string
  count: number
}

export type FunnelStep = {
  status: string
  label: string
  count: number
}

export type ProjectInventory = {
  project: string
  available: number
  blocked: number
  sold: number
}

const PIE_COLORS = [
  '#f59e0b',
  '#3b82f6',
  '#8b5cf6',
  '#22c55e',
  '#f97316',
  '#06b6d4',
  '#ec4899',
  '#64748b',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-slate-700">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatCrores(entry.value)}
        </p>
      ))}
    </div>
  )
}

export function BookingsLineChart({ data }: { data: MonthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          labelStyle={{ color: '#475569', fontWeight: 600 }}
        />
        <Line
          type="monotone"
          dataKey="bookings"
          name="Bookings"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function RevenueBarChart({ data }: { data: MonthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCrores(v)}
        />
        <Tooltip content={<RevenueTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Revenue Booked" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LeadSourcesPieChart({ data }: { data: SourceSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
        No data
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={90}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={({ name, percent }: any) =>
            (percent ?? 0) > 0.05 ? `${name} ${Math.round((percent ?? 0) * 100)}%` : ''
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function LeadFunnelChart({ data }: { data: FunnelStep[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={88}
          tick={{ fontSize: 12, fill: '#475569' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Bar dataKey="count" name="Leads" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function InventoryStackedBarChart({ data }: { data: ProjectInventory[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
        No data
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="project"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          interval={0}
          // Truncate long project names
          tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 11) + '…' : v)}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="available" name="Available" stackId="a" fill="#22c55e" />
        <Bar dataKey="blocked" name="Blocked" stackId="a" fill="#f59e0b" />
        <Bar dataKey="sold" name="Sold" stackId="a" fill="#64748b" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
