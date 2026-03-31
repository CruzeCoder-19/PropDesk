'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useTransition, useRef, useEffect } from 'react'
import { SOURCE_LABELS } from '@/lib/lead-constants'

const SCORES = ['hot', 'warm', 'cold'] as const
const SOURCES = Object.keys(SOURCE_LABELS)

export function LeadFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentScore = searchParams.get('score') ?? ''
  const currentStatus = searchParams.get('status') ?? ''
  const currentSource = searchParams.get('source') ?? ''
  const currentQ = searchParams.get('q') ?? ''

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset to page 1 on filter change
    params.delete('page')
    startTransition(() => {
      router.replace(`/dashboard/leads?${params.toString()}`)
    })
  }

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParam('q', value)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <input
        type="search"
        placeholder="Search name, phone, email…"
        defaultValue={currentQ}
        onChange={(e) => handleSearch(e.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 w-52"
      />

      {/* Score quick-filters */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => updateParam('score', '')}
          className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${
            !currentScore
              ? 'bg-amber-400 text-slate-950'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        {SCORES.map((score) => (
          <button
            key={score}
            onClick={() => updateParam('score', currentScore === score ? '' : score)}
            className={`h-8 rounded-lg px-3 text-xs font-medium capitalize transition-colors ${
              currentScore === score
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {score.charAt(0).toUpperCase() + score.slice(1)}
          </button>
        ))}
      </div>

      {/* Status: New button */}
      <button
        onClick={() => updateParam('status', currentStatus === 'new' ? '' : 'new')}
        className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${
          currentStatus === 'new'
            ? 'bg-amber-400 text-slate-950'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        New
      </button>

      {/* Source select */}
      <select
        value={currentSource}
        onChange={(e) => updateParam('source', e.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
      >
        <option value="">All Sources</option>
        {SOURCES.map((src) => (
          <option key={src} value={src}>
            {SOURCE_LABELS[src]}
          </option>
        ))}
      </select>
    </div>
  )
}
