import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses RLS entirely.
 * ONLY use in server-side code (Server Actions, Route Handlers).
 * Never expose the service role key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
