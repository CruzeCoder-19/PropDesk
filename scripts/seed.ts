import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as readline from 'readline'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((res) => {
    rl.question(question, (answer) => {
      rl.close()
      res(answer.toLowerCase() === 'y')
    })
  })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const ok = await confirm('This will seed the database with demo data. Continue? (y/n) ')
  if (!ok) {
    console.log('Aborted.')
    process.exit(0)
  }

  // Idempotency check
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'odisha-developers')
    .maybeSingle()

  if (existing) {
    console.error('Database already seeded (org "odisha-developers" exists). Aborting.')
    process.exit(1)
  }

  // ── 1. Organization ───────────────────────────────────────────────────────

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({
      name: 'Odisha Developers Pvt. Ltd.',
      slug: 'odisha-developers',
      address: 'Plot No. 42, Saheed Nagar',
      city: 'Bhubaneswar',
      state: 'Odisha',
      gst_number: '21AABCO1234A1ZK',
      rera_number: 'RERA/BBR/ORG/2022/001234',
      contact_email: 'info@odishadevelopers.com',
      contact_phone: '+919437100001',
    })
    .select('id')
    .single()

  if (orgErr) { console.error('Org insert failed:', orgErr.message); process.exit(1) }
  const orgId = org!.id
  console.log('✓ Organization created')

  // ── 2. Auth users + Profiles ──────────────────────────────────────────────

  const users = [
    { role: 'admin', name: 'Bikram Pradhan', email: 'admin@odishadevelopers.com' },
    { role: 'sales_manager', name: 'Susmita Patra', email: 'susmita@odishadevelopers.com' },
    { role: 'salesperson', name: 'Rajesh Nayak', email: 'rajesh@odishadevelopers.com' },
    { role: 'client', name: 'Sanjay Mohanty', email: 'sanjay.m@example.com' },
    { role: 'client', name: 'Priya Mishra', email: 'priya.m@example.com' },
    { role: 'client', name: 'Debasis Sahoo', email: 'debasis.s@example.com' },
    { role: 'client', name: 'Lipika Das', email: 'lipika.d@example.com' },
    { role: 'client', name: 'Amarendra Rath', email: 'amarendra.r@example.com' },
  ]

  const profileIds: Record<string, string> = {}

  for (const user of users) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'Seed@12345',
      email_confirm: true,
    })
    if (authErr) {
      console.warn(`  ⚠ Auth user ${user.email}: ${authErr.message} (skipping)`)
      continue
    }
    const userId = authUser.user.id
    profileIds[user.name] = userId

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: user.name, role: user.role, organization_id: orgId })

    if (profileErr) {
      console.error(`Profile insert failed for ${user.name}:`, profileErr.message)
      process.exit(1)
    }
  }

  console.log('✓ Auth users + profiles created')

  const salespersonId = profileIds['Rajesh Nayak']
  const salesManagerId = profileIds['Susmita Patra']
  const buyerIds = [
    profileIds['Sanjay Mohanty'],
    profileIds['Priya Mishra'],
    profileIds['Debasis Sahoo'],
    profileIds['Lipika Das'],
    profileIds['Amarendra Rath'],
  ]

  // ── 3. Project 1: Sunrise Heights ─────────────────────────────────────────

  const { data: proj1, error: proj1Err } = await supabase
    .from('projects')
    .insert({
      organization_id: orgId,
      name: 'Sunrise Heights',
      slug: 'sunrise-heights',
      type: 'apartment',
      status: 'active',
      address: 'Puri-Cuttack Road',
      city: 'Bhubaneswar',
      total_units: 48,
      rera_id: 'RERA/BBR/PRJ/2023/005678',
      description: '12-floor premium apartment building with modern amenities in Bhubaneswar.',
    })
    .select('id')
    .single()

  if (proj1Err) { console.error('Project 1 insert failed:', proj1Err.message); process.exit(1) }
  const proj1Id = proj1!.id
  console.log('✓ Project 1 (Sunrise Heights) created')

  // ── 4. Units for Project 1 (48 units) ─────────────────────────────────────

  const aptUnits = []
  for (let floor = 1; floor <= 12; floor++) {
    for (let pos = 1; pos <= 4; pos++) {
      const idx = (floor - 1) * 4 + (pos - 1)
      const is2BHK = pos <= 2

      let status: string
      if (idx < 29) status = 'available'
      else if (idx < 36) status = 'blocked'
      else if (idx < 43) status = 'booked'
      else status = 'sold'

      aptUnits.push({
        project_id: proj1Id,
        unit_number: `A-${floor * 100 + pos}`,
        floor,
        block: 'A',
        type: is2BHK ? '2BHK' : '3BHK',
        carpet_area_sqft: is2BHK ? 1050 : 1450,
        base_price: is2BHK ? 5200000 : 7200000,
        total_price: is2BHK ? 5200000 : 7200000,
        status,
        parking_included: true,
        ...(status === 'blocked'
          ? { blocked_by: salespersonId, blocked_at: new Date().toISOString() }
          : {}),
      })
    }
  }

  const { error: aptUnitsErr } = await supabase.from('units').insert(aptUnits)
  if (aptUnitsErr) { console.error('Units insert failed:', aptUnitsErr.message); process.exit(1) }
  console.log('✓ 48 units created for Sunrise Heights')

  // Fetch the 5 booked units for bookings
  const { data: bookedUnits, error: bookedErr } = await supabase
    .from('units')
    .select('id, unit_number, base_price')
    .eq('project_id', proj1Id)
    .eq('status', 'booked')
    .order('unit_number')
    .limit(5)

  if (bookedErr || !bookedUnits?.length) {
    console.error('Failed to fetch booked units:', bookedErr?.message)
    process.exit(1)
  }

  // ── 5. Project 2: Green Meadows ───────────────────────────────────────────

  const { data: proj2, error: proj2Err } = await supabase
    .from('projects')
    .insert({
      organization_id: orgId,
      name: 'Green Meadows',
      slug: 'green-meadows',
      type: 'plot',
      status: 'active',
      address: 'Raghunathpur',
      city: 'Bhubaneswar',
      total_units: 80,
      description: 'Premium plotting scheme with 80 freehold residential plots near Bhubaneswar.',
    })
    .select('id')
    .single()

  if (proj2Err) { console.error('Project 2 insert failed:', proj2Err.message); process.exit(1) }
  const proj2Id = proj2!.id
  console.log('✓ Project 2 (Green Meadows) created')

  // ── 6. Units for Project 2 (80 plots) ─────────────────────────────────────

  const plotSizes = [1200, 1500, 1800, 2000, 2400]
  const pricePerSqft = 1250
  const plotUnits = []

  for (let i = 0; i < 80; i++) {
    const sqft = plotSizes[i % plotSizes.length]
    const price = sqft * pricePerSqft

    let status: string
    if (i < 40) status = 'available'
    else if (i < 56) status = 'blocked'
    else if (i < 72) status = 'sold'
    else status = 'booked'

    plotUnits.push({
      project_id: proj2Id,
      unit_number: `Plot-${String(i + 1).padStart(2, '0')}`,
      type: `Plot-${sqft}sqft`,
      carpet_area_sqft: sqft,
      base_price: price,
      total_price: price,
      status,
      ...(status === 'blocked'
        ? { blocked_by: salespersonId, blocked_at: new Date().toISOString() }
        : {}),
    })
  }

  const { error: plotUnitsErr } = await supabase.from('units').insert(plotUnits)
  if (plotUnitsErr) { console.error('Plot units insert failed:', plotUnitsErr.message); process.exit(1) }
  console.log('✓ 80 plots created for Green Meadows')

  // ── 7. Leads (20) ─────────────────────────────────────────────────────────

  const leadsData = [
    { name: 'Subhashree Panda', phone: '+919437200101', source: 'facebook', score: 'hot', status: 'site_visited', project_id: proj1Id, preferred_unit_type: '2BHK', budget_min: 4500000, budget_max: 6000000, assigned_to: salespersonId },
    { name: 'Manoranjan Behera', phone: '+919437200102', source: 'walk_in', score: 'hot', status: 'negotiation', project_id: proj1Id, preferred_unit_type: '3BHK', budget_min: 6500000, budget_max: 8000000, assigned_to: salespersonId },
    { name: 'Sasmita Nanda', phone: '+919437200103', source: '99acres', score: 'warm', status: 'contacted', project_id: proj1Id, preferred_unit_type: '2BHK', budget_min: 4000000, budget_max: 5500000, assigned_to: salespersonId },
    { name: 'Biswanath Tripathy', phone: '+919437200104', source: 'google_ads', score: 'warm', status: 'site_visit_scheduled', project_id: proj1Id, preferred_unit_type: '2BHK', budget_min: 4500000, budget_max: 6000000, assigned_to: salespersonId },
    { name: 'Itishree Mohanty', phone: '+919437200105', source: 'referral', score: 'hot', status: 'negotiation', project_id: proj1Id, preferred_unit_type: '3BHK', budget_min: 7000000, budget_max: 8500000, assigned_to: salespersonId },
    { name: 'Prasanta Sahu', phone: '+919437200106', source: 'magicbricks', score: 'cold', status: 'new', project_id: proj1Id, preferred_unit_type: '2BHK', budget_min: 4000000, budget_max: 5500000, assigned_to: salespersonId },
    { name: 'Deepa Rout', phone: '+919437200107', source: 'website', score: 'warm', status: 'contacted', project_id: proj1Id, preferred_unit_type: '2BHK', budget_min: 4500000, budget_max: 5500000, assigned_to: salespersonId },
    { name: 'Shibani Choudhury', phone: '+919437200108', source: 'facebook', score: 'hot', status: 'site_visited', project_id: proj1Id, preferred_unit_type: '3BHK', budget_min: 6500000, budget_max: 8000000, assigned_to: salespersonId },
    { name: 'Gourhari Das', phone: '+919437200109', source: 'justdial', score: 'cold', status: 'new', project_id: proj1Id, preferred_unit_type: '2BHK', budget_min: 4000000, budget_max: 5500000, assigned_to: salespersonId },
    { name: 'Minakshi Jena', phone: '+919437200110', source: 'instagram', score: 'warm', status: 'contacted', project_id: proj1Id, preferred_unit_type: '2BHK', budget_min: 4500000, budget_max: 6000000, assigned_to: salespersonId },
    { name: 'Asutosh Patnaik', phone: '+919437200111', source: 'referral', score: 'hot', status: 'site_visited', project_id: proj1Id, preferred_unit_type: '3BHK', budget_min: 6500000, budget_max: 8000000, assigned_to: salesManagerId },
    { name: 'Nilakantha Swain', phone: '+919437200112', source: 'walk_in', score: 'cold', status: 'new', project_id: proj1Id, preferred_unit_type: '2BHK', budget_min: 4000000, budget_max: 5500000, assigned_to: salesManagerId },
    { name: 'Rashmita Biswal', phone: '+919437200113', source: 'google_ads', score: 'warm', status: 'site_visit_scheduled', project_id: proj2Id, preferred_unit_type: 'Plot', budget_min: 1500000, budget_max: 2500000, assigned_to: salesManagerId },
    { name: 'Sridhar Senapati', phone: '+919437200114', source: '99acres', score: 'hot', status: 'negotiation', project_id: proj2Id, preferred_unit_type: 'Plot', budget_min: 2000000, budget_max: 3000000, assigned_to: salesManagerId },
    { name: 'Pramila Acharya', phone: '+919437200115', source: 'facebook', score: 'warm', status: 'contacted', project_id: proj2Id, preferred_unit_type: 'Plot', budget_min: 1500000, budget_max: 2500000, assigned_to: salesManagerId },
    { name: 'Krushna Mishra', phone: '+919437200116', source: 'website', score: 'cold', status: 'new', project_id: proj2Id, preferred_unit_type: 'Plot', budget_min: 1500000, budget_max: 2000000, assigned_to: salesManagerId },
    { name: 'Sanjukta Kar', phone: '+919437200117', source: 'magicbricks', score: 'warm', status: 'contacted', project_id: proj2Id, preferred_unit_type: 'Plot', budget_min: 1800000, budget_max: 2500000, assigned_to: salesManagerId },
    { name: 'Bimalendu Lenka', phone: '+919437200118', source: 'referral', score: 'hot', status: 'negotiation', project_id: proj2Id, preferred_unit_type: 'Plot', budget_min: 2500000, budget_max: 3500000, assigned_to: salesManagerId },
    { name: 'Tanushree Barik', phone: '+919437200119', source: 'instagram', score: 'warm', status: 'site_visit_scheduled', project_id: proj2Id, preferred_unit_type: 'Plot', budget_min: 1500000, budget_max: 2000000, assigned_to: salesManagerId },
    { name: 'Pramod Dhal', phone: '+919437200120', source: 'walk_in', score: 'cold', status: 'new', project_id: proj2Id, preferred_unit_type: 'Plot', budget_min: 1200000, budget_max: 1800000, assigned_to: salesManagerId },
  ]

  const { data: insertedLeads, error: leadsErr } = await supabase
    .from('leads')
    .insert(leadsData.map((l) => ({ ...l, organization_id: orgId })))
    .select('id')

  if (leadsErr) { console.error('Leads insert failed:', leadsErr.message); process.exit(1) }
  console.log('✓ 20 leads created')

  const leadIds = insertedLeads!.map((l) => l.id)

  // Mark first 5 leads as 'won'
  const { error: updateLeadsErr } = await supabase
    .from('leads')
    .update({ status: 'won' })
    .in('id', leadIds.slice(0, 5))

  if (updateLeadsErr) {
    console.error('Lead status update failed:', updateLeadsErr.message)
    process.exit(1)
  }

  // ── 8. Bookings (5) ───────────────────────────────────────────────────────

  const bookingDates = ['2025-10-15', '2025-11-20', '2025-12-10', '2026-01-08', '2026-02-15']
  const bookingStatuses = ['token_paid', 'agreement_signed', 'loan_processing', 'registered', 'possession']

  const bookingsPayload = bookedUnits.slice(0, 5).map((unit, i) => {
    const agreementValue = unit.base_price as number
    const gstAmount = Math.round(agreementValue * 0.05)
    return {
      unit_id: unit.id,
      lead_id: leadIds[i],
      organization_id: orgId,
      client_profile_id: buyerIds[i],
      booking_date: bookingDates[i],
      agreement_value: agreementValue,
      gst_amount: gstAmount,
      total_amount: agreementValue + gstAmount,
      payment_plan: 'construction_linked',
      status: bookingStatuses[i],
    }
  })

  const { data: insertedBookings, error: bookingsErr } = await supabase
    .from('bookings')
    .insert(bookingsPayload)
    .select('id, booking_date, status, agreement_value, gst_amount')

  if (bookingsErr) { console.error('Bookings insert failed:', bookingsErr.message); process.exit(1) }
  console.log('✓ 5 bookings created')

  // ── 9. Payment Milestones (25 total) ──────────────────────────────────────

  const milestoneTemplate = [
    { name: 'Token Amount', pct: 0.05, order: 1 },
    { name: 'Agreement Signing', pct: 0.10, order: 2 },
    { name: 'Foundation Complete', pct: 0.15, order: 3 },
    { name: '3rd Floor Slab', pct: 0.20, order: 4 },
    { name: 'Handover', pct: 0.50, order: 5 },
  ]

  const paidCounts: Record<string, number> = {
    token_paid: 1,
    agreement_signed: 2,
    loan_processing: 2,
    registered: 3,
    possession: 5,
  }
  const dueCounts: Record<string, number> = {
    token_paid: 0,
    agreement_signed: 0,
    loan_processing: 1,
    registered: 1,
    possession: 0,
  }

  const allMilestones = []
  for (const booking of insertedBookings!) {
    const paid = paidCounts[booking.status] ?? 0
    const due = dueCounts[booking.status] ?? 0
    const total = (booking.agreement_value as number) + (booking.gst_amount as number)

    for (const tmpl of milestoneTemplate) {
      const amountDue = Math.round(total * tmpl.pct)
      let mStatus: string
      let paidDate: string | null = null
      let paidAmount: number | null = null

      if (tmpl.order <= paid) {
        mStatus = 'paid'
        paidDate = addDays(booking.booking_date as string, tmpl.order * 7)
        paidAmount = amountDue
      } else if (tmpl.order === paid + 1 && due > 0) {
        mStatus = 'due'
      } else {
        mStatus = 'upcoming'
      }

      allMilestones.push({
        booking_id: booking.id,
        milestone_name: tmpl.name,
        milestone_order: tmpl.order,
        amount_due: amountDue,
        status: mStatus,
        ...(paidDate ? { paid_date: paidDate, paid_amount: paidAmount } : {}),
      })
    }
  }

  const { error: milestonesErr } = await supabase.from('payment_milestones').insert(allMilestones)
  if (milestonesErr) { console.error('Milestones insert failed:', milestonesErr.message); process.exit(1) }
  console.log('✓ 25 payment milestones created')

  // ── 10. Lead Activities (10) ──────────────────────────────────────────────

  const activities = [
    { lead_id: leadIds[0], activity_type: 'call', description: 'Initial inquiry about 2BHK units', performed_by: salespersonId },
    { lead_id: leadIds[0], activity_type: 'site_visit', description: 'Visited Sunrise Heights site, liked Block A', performed_by: salespersonId },
    { lead_id: leadIds[1], activity_type: 'whatsapp', description: 'Sent brochure and price list', performed_by: salespersonId },
    { lead_id: leadIds[1], activity_type: 'meeting', description: 'Discussed CLP payment plan options', performed_by: salespersonId },
    { lead_id: leadIds[2], activity_type: 'call', description: 'Follow up on 99acres inquiry', performed_by: salespersonId },
    { lead_id: leadIds[3], activity_type: 'email', description: 'Sent project details and RERA certificate', performed_by: salespersonId },
    { lead_id: leadIds[4], activity_type: 'site_visit', description: 'Second site visit with family', performed_by: salesManagerId },
    { lead_id: leadIds[4], activity_type: 'note', description: 'Client prefers east-facing unit, budget flexible', performed_by: salesManagerId },
    { lead_id: leadIds[7], activity_type: 'call', description: 'Warm lead from Facebook campaign', performed_by: salesManagerId },
    { lead_id: leadIds[10], activity_type: 'meeting', description: 'Negotiation meeting, offered 2% discount', performed_by: salesManagerId },
  ]

  const { error: activitiesErr } = await supabase.from('lead_activities').insert(activities)
  if (activitiesErr) { console.error('Lead activities insert failed:', activitiesErr.message); process.exit(1) }
  console.log('✓ 10 lead activities created')

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('\n✅ Seed complete!\n')
  console.log('  Organization : Odisha Developers Pvt. Ltd.')
  console.log('  Auth users   : 8  (admin / sales_manager / salesperson / 5 clients)')
  console.log('  Projects     : 2  (Sunrise Heights + Green Meadows)')
  console.log('  Units        : 128  (48 apartments + 80 plots)')
  console.log('  Leads        : 20')
  console.log('  Bookings     : 5')
  console.log('  Milestones   : 25')
  console.log('  Activities   : 10')
  console.log('\n  Login as admin : admin@odishadevelopers.com / Seed@12345')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
