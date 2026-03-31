import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { EmbedForm } from './embed-form'

interface Props {
  params: Promise<{ 'org-slug': string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const admin = createAdminClient()
  const slug = (await params)['org-slug']
  const { data: org } = await admin
    .from('organizations')
    .select('name')
    .eq('slug', slug)
    .single()

  return { title: org ? `${org.name} — Enquiry Form` : 'Enquiry Form' }
}

export default async function EmbedPage({ params }: Props) {
  const slug = (await params)['org-slug']
  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, slug, api_key')
    .eq('slug', slug)
    .single()

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-500 text-sm">Form not found.</p>
      </div>
    )
  }

  const { data: projects } = await admin
    .from('projects')
    .select('id, name, slug')
    .eq('organization_id', org.id)
    .eq('status', 'active')
    .order('name')

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">{org.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Fill in your details and we'll get back to you.</p>
        </div>
        <EmbedForm
          org={{ name: org.name as string, slug: org.slug as string, api_key: org.api_key as string }}
          projects={(projects ?? []).map((p) => ({ id: p.id as string, name: p.name as string }))}
        />
      </div>
    </div>
  )
}
