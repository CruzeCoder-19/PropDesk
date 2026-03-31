'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  org: { name: string; slug: string; api_key: string }
  projects: { id: string; name: string }[]
}

export function EmbedForm({ org, projects }: Props) {
  const [name,      setName]      = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  if (submitted) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-8 text-center shadow-lg">
        <CheckCircle2 className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Thank you!</h2>
        <p className="mt-2 text-sm text-slate-600">Our team will contact you shortly.</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': org.api_key,
        },
        body: JSON.stringify({
          organization_slug: org.slug,
          name:         name.trim(),
          phone:        phone.trim(),
          email:        email.trim() || undefined,
          project_slug: projectId || undefined,
          source:       'website',
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 ' +
    'placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20'

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-lg space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          required
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      {projects.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">I'm interested in</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a project (optional)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-500 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          'Send Enquiry'
        )}
      </button>

      <p className="text-center text-xs text-slate-400">
        Your details are safe with us. We'll never share them.
      </p>
    </form>
  )
}
