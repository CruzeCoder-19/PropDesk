# PropDesk — Digital Sales Office for Real Estate

A cloud-based SaaS platform that replaces Excel sheets, WhatsApp groups, and paper registers for small-to-mid-sized real estate builders. Built for the Indian market, starting with tier-2 cities like Bhubaneswar.

## What It Does

**For Builders/Admins** — A command center dashboard showing total revenue, active leads, available inventory value (in crores), team performance, and pending dues in real time.

**For Salespeople** — A mobile-friendly tool to capture leads, block units from the field, log site visits, and track follow-ups. When a salesperson blocks a flat, every other team member sees the update instantly — no more double-booking.

**For Buyers** — A self-service portal to check payment schedules, track construction milestones, and download documents like allotment letters and receipts without calling the office.

## Core Workflow

Customer clicks Facebook ad → Lead auto-captured in dashboard → WhatsApp brochure sent in 10 seconds → Salesperson sees "Hot" lead → Schedules site visit → Customer likes a unit → Salesperson blocks it on the visual grid → Admin converts to booking with construction-linked payment plan → System tracks milestones → Auto-sends WhatsApp/SMS reminders when payment is due → Buyer checks status on their portal.

## Features

**Lead Management**
- Auto-capture from Facebook Ads, website forms, and embeddable iframe
- Lead scoring (Hot / Warm / Cold) and status pipeline tracking
- Activity timeline with calls, WhatsApp, site visits, meetings
- Salesperson assignment and follow-up scheduling

**Interactive Inventory Grid**
- Visual building cross-section for apartments (floor × unit grid)
- Flat grid layout for plotting schemes
- Color-coded: Green (Available) → Yellow (Blocked) → Orange (Booked) → Red (Sold)
- Real-time updates via Supabase Realtime — changes reflect across all browsers instantly
- Zoom controls for mobile use

**Bookings & Payments**
- 5-step booking wizard: Client → Unit → Financials → Milestones → Review
- Construction-Linked Payment (CLP) plan with auto-generated milestones
- Payment recording with receipt upload
- Document vault per booking (allotment letters, agreements, NOCs)

**Client Portal**
- Separate buyer-facing login at `/client-portal`
- Payment progress bar and milestone tracker
- Document downloads (only docs marked visible by builder)

**Analytics Dashboard**
- Bookings per month (line chart)
- Revenue booked vs collected (bar chart)
- Lead source breakdown (pie chart)
- Conversion funnel and rate
- Inventory value remaining
- Team performance ranking

**Automated Notifications**
- Dues reminder cron job (daily check for upcoming/overdue milestones)
- WhatsApp integration placeholder (Interakt/Wati/AiSensy ready)
- SMS placeholder (MSG91/Twilio ready)
- Notification log with manual send option

**Team & Access Control**
- Role-based access: Admin, Sales Manager, Salesperson, Client
- Salesperson sees only their assigned leads
- Admin-only features: analytics, team management, settings
- Email-based team invitations

**Settings & Integrations**
- Organization branding (logo, GST, RERA)
- Lead Capture API with API key authentication
- Embeddable enquiry form (iframe snippet)
- Facebook Lead Ads webhook endpoint
- WhatsApp and SMS provider configuration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (base-nova) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT, email/password) |
| Real-time | Supabase Realtime (Postgres Changes) |
| File Storage | Supabase Storage |
| State | Zustand (sidebar), React state (forms) |
| Charts | Recharts |
| Icons | Lucide React |
| Hosting | Vercel (frontend) + Supabase (backend) |

## Project Structure

```
src/
├── app/
│   ├── dashboard/          # Builder admin panel
│   │   ├── leads/          # Lead management
│   │   ├── inventory/      # Unit grid + bulk add + new project
│   │   ├── bookings/       # Booking wizard + detail + payments
│   │   ├── analytics/      # Charts and metrics
│   │   ├── team/           # Team management + invites
│   │   ├── settings/       # Org, profile, integrations, billing
│   │   └── notifications/  # Notification log
│   ├── client-portal/      # Buyer-facing portal
│   │   ├── dashboard/      # Payment overview
│   │   ├── payments/       # Milestone table
│   │   └── documents/      # Document downloads
│   ├── api/
│   │   ├── leads/capture/  # External lead capture REST API
│   │   ├── leads/facebook/ # Facebook Lead Ads webhook
│   │   ├── cron/check-dues/# Daily dues reminder cron
│   │   └── send-notification/
│   └── embed/[org-slug]/   # Embeddable lead capture form
├── components/
│   ├── ui/                 # shadcn components
│   ├── dashboard/          # Sidebar, topbar, role provider
│   ├── inventory/          # Unit grid, unit sheet, bulk add
│   └── bookings/           # Record payment dialog
├── lib/
│   ├── supabase/           # Client, server, admin, middleware
│   ├── whatsapp/           # WhatsApp service class
│   ├── format.ts           # ₹ formatting (INR, Crores, Lakhs)
│   └── role.ts             # Role helpers and constants
├── hooks/                  # useRole()
├── stores/                 # Zustand sidebar store
└── types/
```

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/propdesk.git
   cd propdesk
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com)

3. **Set environment variables** — copy `.env.local.example` to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   CRON_SECRET=any_random_string
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run database migrations** — go to Supabase SQL Editor and run these files in order:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_storage_documents_bucket.sql
   supabase/migrations/003_notifications.sql
   supabase/migrations/004_lead_capture.sql
   supabase/migrations/005_organization_settings.sql
   supabase/migrations/006_media_bucket.sql
   ```

5. **Configure Supabase Auth** — in Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

6. **Seed demo data**
   ```bash
   npx tsx scripts/seed.ts
   ```

7. **Start the app**
   ```bash
   npm run dev
   ```

8. **Open** `http://localhost:3000/login`

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@odishadevelopers.com | Seed@12345 |
| Sales Manager | susmita@odishadevelopers.com | Seed@12345 |
| Salesperson | rajesh@odishadevelopers.com | Seed@12345 |
| Buyer | sanjay.m@example.com | Seed@12345 |

## Deployment (Vercel)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Update Supabase Auth URLs to your Vercel domain
5. Done — Vercel handles builds, serverless functions, and cron jobs automatically

## Roadmap

- [ ] WhatsApp Business API live integration (Interakt/Wati)
- [ ] SMS notifications via MSG91/Twilio
- [ ] Payment gateway integration (Razorpay)
- [ ] Multi-language support (Odia, Hindi)
- [ ] Native mobile app (React Native)
- [ ] White-label option for enterprise clients
- [ ] Automated email campaigns
- [ ] Integration with 99acres, MagicBricks, Housing.com

## License

Private — All rights reserved.
