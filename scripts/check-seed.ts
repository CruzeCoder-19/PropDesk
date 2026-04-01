import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    process.env[key] = value
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@odishadevelopers.com'
const ORG_SLUG    = 'odisha-developers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pass(msg: string) { console.log(`✓ ${msg}`) }
function fail(msg: string) { console.log(`✗ ${msg}`) }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let allPassed = true

  // ── 1. Find admin auth user ───────────────────────────────────────────────

  const { data: usersPage, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr || !usersPage) {
    fail(`Cannot list auth users: ${listErr?.message}`)
    process.exit(1)
  }

  const adminAuthUser = usersPage.users.find((u) => u.email === ADMIN_EMAIL)
  if (!adminAuthUser) {
    fail(`Admin user ${ADMIN_EMAIL} not found in auth.users — run seed.ts first`)
    process.exit(1)
  }
  pass(`Admin user found: id=${adminAuthUser.id}`)

  // ── 2. Find the organization ──────────────────────────────────────────────

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', ORG_SLUG)
    .maybeSingle()

  if (orgErr || !org) {
    fail(`Organization "${ORG_SLUG}" not found: ${orgErr?.message ?? 'no row returned'}`)
    process.exit(1)
  }
  pass(`Organization exists: "${org.name}" (id=${org.id})`)

  // ── 3. Read profile (service role bypasses RLS — sees raw data) ───────────

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, organization_id')
    .eq('id', adminAuthUser.id)
    .single()

  if (profileErr || !profile) {
    fail(`Profile not found for admin user: ${profileErr?.message ?? 'no row'}`)
    process.exit(1)
  }

  // ── 4. Check profile fields — auto-fix if wrong ───────────────────────────

  const roleOk  = profile.role === 'admin'
  const orgOk   = profile.organization_id === org.id

  if (roleOk && orgOk) {
    pass(`Profile: role=${profile.role}, organization_id=${profile.organization_id}`)
  } else {
    if (!roleOk) fail(`Profile role is "${profile.role}" — expected "admin"`)
    if (!orgOk)  fail(`Profile organization_id is ${profile.organization_id ?? 'NULL'} — expected ${org.id}`)
    allPassed = false

    console.log('  Patching profile...')
    const { error: fixErr } = await supabase
      .from('profiles')
      .update({ role: 'admin', organization_id: org.id })
      .eq('id', adminAuthUser.id)

    if (fixErr) {
      fail(`Could not patch profile: ${fixErr.message}`)
      process.exit(1)
    }
    pass(`Fixed: role=admin, organization_id=${org.id}`)
    allPassed = true
  }

  // ── 5. Check projects ─────────────────────────────────────────────────────

  const { data: projects, error: projectsErr } = await supabase
    .from('projects')
    .select('id, name')
    .eq('organization_id', org.id)
    .order('name')

  if (projectsErr) {
    fail(`Projects query failed: ${projectsErr.message}`)
    allPassed = false
  } else if (!projects || projects.length === 0) {
    fail(`No projects found for organization "${org.name}" — run seed.ts first`)
    allPassed = false
  } else {
    // ── 6. Count units per project ─────────────────────────────────────────
    const parts: string[] = []

    for (const project of projects) {
      const { count, error: countErr } = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)

      if (countErr) {
        fail(`Units count failed for "${project.name}": ${countErr.message}`)
        allPassed = false
      } else {
        parts.push(`${project.name} (${count ?? 0} units)`)
      }
    }

    if (allPassed) {
      pass(`Projects (${projects.length}): ${parts.join(', ')}`)
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('')
  if (allPassed) {
    console.log('✓ All checks passed — data looks correct')
    console.log('  If the inventory page still shows no data:')
    console.log('  1. Restart the dev server (next dev)')
    console.log('  2. Log out and log back in as', ADMIN_EMAIL, '/ Seed@12345')
    console.log('  3. Check the server terminal for [inventory] error lines')
  } else {
    console.log('✗ Some checks failed — see above')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
