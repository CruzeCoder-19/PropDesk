'use client'

import { useState, useActionState, type ChangeEvent } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, CheckCircle2, AlertCircle, Upload, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateProfileAction, changePasswordAction, type ProfileState, type PasswordState } from './actions'

interface ProfileData {
  full_name:  string | null
  phone:      string | null
  avatar_url: string | null
}

interface Props {
  profile: ProfileData
  userId:  string
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  )
}

export function ProfileForm({ profile, userId }: Props) {
  const [profileState, profileAction] = useActionState<ProfileState, FormData>(updateProfileAction, null)
  const [pwState,      pwAction]      = useActionState<PasswordState, FormData>(changePasswordAction, null)

  const [avatarUrl, setAvatarUrl]   = useState(profile.avatar_url ?? '')
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')

    const ext      = file.name.split('.').pop() ?? 'jpg'
    const path     = `${userId}/avatar.${ext}`
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('media')
      .upload(path, file, { upsert: true })

    if (error) {
      setUploadError(error.message)
    } else {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    }
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      {/* ── Profile section ───────────────────────────────────────── */}
      <form action={profileAction} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">My Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile avatar"
              className="h-16 w-16 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
              <User className="h-7 w-7" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Avatar</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              disabled={uploading}
              className="block text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
            />
            {uploading && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
              </p>
            )}
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          </div>
        </div>

        <input type="hidden" name="avatar_url" value={avatarUrl} />

        {/* Full Name */}
        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 mb-1">
            Full Name
          </label>
          <input
            id="profile-name"
            name="full_name"
            type="text"
            defaultValue={profile.full_name ?? ''}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="profile-phone" className="block text-sm font-medium text-slate-700 mb-1">
            Phone
          </label>
          <input
            id="profile-phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ''}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {profileState && 'error' in profileState && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {profileState.error}
          </div>
        )}
        {profileState && 'success' in profileState && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Profile saved.
          </div>
        )}

        <SubmitButton label="Save Profile" />
      </form>

      {/* ── Change password section ───────────────────────────────── */}
      <form action={pwAction} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Change Password</h2>

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1">
            New Password <span className="text-slate-400 font-normal">(min 8 characters)</span>
          </label>
          <input
            id="new-password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {pwState && 'error' in pwState && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {pwState.error}
          </div>
        )}
        {pwState && 'success' in pwState && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Password updated successfully.
          </div>
        )}

        <SubmitButton label="Change Password" />
      </form>
    </div>
  )
}
