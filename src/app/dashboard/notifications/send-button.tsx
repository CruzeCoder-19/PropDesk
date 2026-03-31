'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export function SendReminderButton({ notificationId }: { notificationId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    setLoading(true)
    try {
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to send')
      } else {
        toast.success('Reminder sent!')
        router.refresh()
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-medium text-slate-950 hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Send className="h-3 w-3" />
      )}
      Send
    </button>
  )
}
