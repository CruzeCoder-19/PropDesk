import Link from 'next/link'
import { NewProjectForm } from './new-project-form'

export default function NewProjectPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/inventory"
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Inventory
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-bold text-slate-900">New Project</h1>
      </div>
      <NewProjectForm />
    </div>
  )
}
