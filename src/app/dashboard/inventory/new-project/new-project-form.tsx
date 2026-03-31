'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { createProjectAction } from '@/app/dashboard/inventory/actions'

// ── Constants ─────────────────────────────────────────────────────────────────

const SELECT_CLS =
  'h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50'

// ── NewProjectForm ─────────────────────────────────────────────────────────────

export function NewProjectForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [brochureFile, setBrochureFile] = useState<File | null>(null)
  const [fieldError, setFieldError] = useState<{ field?: string; message: string } | null>(null)

  // Fetch org ID on mount for storage path scoping
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.organization_id) setOrgId(data.organization_id)
        })
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setFieldError(null)

    let brochure_url: string | null = null

    if (brochureFile && orgId) {
      const supabase = createClient()
      const ext = brochureFile.name.split('.').pop() ?? 'pdf'
      const path = `${orgId}/brochures/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, brochureFile)
      if (uploadError) {
        toast.error('Brochure upload failed: ' + uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      brochure_url = urlData.publicUrl
    }

    const fd = new FormData(e.currentTarget)
    if (brochure_url) fd.set('brochure_url', brochure_url)

    const result = await createProjectAction(null, fd)

    if (!result) {
      setLoading(false)
      return
    }

    if ('error' in result) {
      if (result.field) {
        setFieldError({ field: result.field, message: result.error })
      } else {
        toast.error(result.error)
      }
      setLoading(false)
      return
    }

    toast.success('Project created')
    router.push(`/dashboard/inventory?project_id=${result.projectId}`)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

        {/* Name */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="np-name">
            Project Name <span className="text-red-500">*</span>
          </label>
          <Input id="np-name" name="name" placeholder="e.g. Sunrise Heights" className="h-9" />
          {fieldError?.field === 'name' && (
            <p className="text-xs text-red-600">{fieldError.message}</p>
          )}
        </div>

        {/* Type + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="np-type">
              Project Type <span className="text-red-500">*</span>
            </label>
            <select id="np-type" name="type" className={SELECT_CLS} defaultValue="apartment">
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="np-status">
              Status
            </label>
            <select id="np-status" name="status" className={SELECT_CLS} defaultValue="upcoming">
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="sold_out">Sold Out</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Address + City */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="np-address">
              Address
            </label>
            <Input id="np-address" name="address" placeholder="Street address" className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="np-city">
              City
            </label>
            <Input id="np-city" name="city" placeholder="e.g. Mumbai" className="h-9" />
          </div>
        </div>

        {/* RERA ID */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="np-rera">
            RERA ID
          </label>
          <Input id="np-rera" name="rera_id" placeholder="e.g. P52100012345" className="h-9" />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="np-desc">
            Description
          </label>
          <textarea
            id="np-desc"
            name="description"
            rows={3}
            placeholder="Brief description of the project…"
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-slate-900 placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 resize-none"
          />
        </div>

        {/* Brochure upload */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="np-brochure">
            Brochure
          </label>
          <input
            id="np-brochure"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="block w-full text-sm text-slate-700 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            onChange={(e) => setBrochureFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-slate-400">PDF, JPG, PNG or WebP — max 50 MB</p>
        </div>

        {/* Submit */}
        <div className="pt-2 flex gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
