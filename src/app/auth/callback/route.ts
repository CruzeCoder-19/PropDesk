import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles the OAuth/magic-link/email-confirmation callback from Supabase.
 * Supabase redirects here after the user clicks a confirmation link, passing
 * a one-time `code` in the query string. We exchange it for a session and
 * then forward the user to their intended destination.
 *
 * Configure this URL in Supabase Dashboard → Auth → URL Configuration:
 *   Redirect URL:  https://yourdomain.com/auth/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Supabase sent back an error (e.g. expired link, already used)
  if (error) {
    const params = new URLSearchParams({
      error: errorDescription ?? error,
    })
    return NextResponse.redirect(`${origin}/login?${params}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const params = new URLSearchParams({ error: exchangeError.message })
    return NextResponse.redirect(`${origin}/login?${params}`)
  }

  // Successful — send the user to the dashboard (or wherever `next` points)
  const next = searchParams.get('next') ?? '/dashboard'
  const forwardTo = next.startsWith('/') ? `${origin}${next}` : origin

  return NextResponse.redirect(forwardTo)
}
