import { createAdminClient } from '@/lib/supabase/admin'

export interface NotifCtx {
  orgId?: string
  bookingId?: string
  milestoneId?: string
  clientProfileId?: string
  /** If set, skip creating a new notification — the caller already created one (e.g. cron). */
  existingNotifId?: string
}

interface WhatsAppSettings {
  provider: string
  api_key: string
  templates: Record<string, string>
}

class WhatsAppService {
  private settings: WhatsAppSettings

  constructor(settings: WhatsAppSettings) {
    this.settings = settings
  }

  private async _insertNotification(
    message: string,
    type: 'general' | 'dues_reminder',
    ctx: NotifCtx
  ): Promise<void> {
    // If the caller already created a notification, skip to avoid duplicates
    if (ctx.existingNotifId) return
    if (!ctx.orgId) return

    const admin = createAdminClient()
    const { error } = await admin.from('notifications').insert({
      organization_id:   ctx.orgId,
      booking_id:        ctx.bookingId ?? null,
      milestone_id:      ctx.milestoneId ?? null,
      client_profile_id: ctx.clientProfileId ?? null,
      type,
      channel:           'whatsapp',
      message_text:      message,
      status:            'pending',
    })
    if (error) {
      console.error('[WhatsApp] Failed to insert notification:', error.message)
    }
  }

  async sendThankYou(phone: string, clientName: string, ctx: NotifCtx = {}): Promise<void> {
    try {
      const message =
        `Dear ${clientName}, thank you for your interest! ` +
        `Our team will reach out to you shortly.`

      console.log(`[WhatsApp] Would send to ${phone}: ${message}`)

      // To activate WhatsApp:
      // 1. Sign up at https://www.interakt.shop or https://www.wati.io
      // 2. Get your API key and set WHATSAPP_API_KEY in .env
      // 3. Create a "thank_you" message template in their dashboard
      // 4. Uncomment the fetch() call below
      // const response = await fetch('https://api.interakt.ai/v1/public/message/', {
      //   method: 'POST',
      //   headers: { 'Authorization': 'Basic ' + this.settings.api_key, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     countryCode: '+91',
      //     phoneNumber: phone,
      //     type: 'Template',
      //     template: { name: this.settings.templates.thank_you, languageCode: 'en', bodyValues: [clientName] },
      //   }),
      // })

      await this._insertNotification(message, 'general', ctx)
    } catch (e) {
      console.error('[WhatsApp] sendThankYou error:', e)
    }
  }

  async sendBrochure(phone: string, brochureUrl: string, projectName: string, ctx: NotifCtx = {}): Promise<void> {
    try {
      const message =
        `Here is the brochure for ${projectName}: ${brochureUrl} ` +
        `Feel free to reach out if you have any questions!`

      console.log(`[WhatsApp] Would send to ${phone}: ${message}`)

      // To activate WhatsApp:
      // 1. Sign up at https://www.interakt.shop or https://www.wati.io
      // 2. Get your API key and set WHATSAPP_API_KEY in .env
      // 3. Create a "brochure" message template (with a document/link component)
      // 4. Uncomment the fetch() call below
      // const response = await fetch('https://api.interakt.ai/v1/public/message/', {
      //   method: 'POST',
      //   headers: { 'Authorization': 'Basic ' + this.settings.api_key, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     countryCode: '+91',
      //     phoneNumber: phone,
      //     type: 'Template',
      //     template: { name: this.settings.templates.brochure, languageCode: 'en', bodyValues: [projectName, brochureUrl] },
      //   }),
      // })

      await this._insertNotification(message, 'general', ctx)
    } catch (e) {
      console.error('[WhatsApp] sendBrochure error:', e)
    }
  }

  async sendDueReminder(
    phone: string,
    clientName: string,
    amount: string,
    dueDate: string,
    unitNumber: string,
    ctx: NotifCtx = {}
  ): Promise<void> {
    try {
      const message =
        `Dear ${clientName}, your payment of ${amount} for unit ${unitNumber} ` +
        `is due on ${dueDate}. Please arrange payment at your earliest convenience.`

      console.log(`[WhatsApp] Would send to ${phone}: ${message}`)

      // To activate WhatsApp:
      // 1. Sign up at https://www.interakt.shop or https://www.wati.io
      // 2. Get your API key and set WHATSAPP_API_KEY in .env
      // 3. Create a "due_reminder" message template
      // 4. Uncomment the fetch() call below
      // const response = await fetch('https://api.interakt.ai/v1/public/message/', {
      //   method: 'POST',
      //   headers: { 'Authorization': 'Basic ' + this.settings.api_key, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     countryCode: '+91',
      //     phoneNumber: phone,
      //     type: 'Template',
      //     template: {
      //       name: this.settings.templates.due_reminder,
      //       languageCode: 'en',
      //       bodyValues: [clientName, amount, unitNumber, dueDate],
      //     },
      //   }),
      // })

      await this._insertNotification(message, 'dues_reminder', ctx)
    } catch (e) {
      console.error('[WhatsApp] sendDueReminder error:', e)
    }
  }

  async sendBookingConfirmation(
    phone: string,
    clientName: string,
    unitNumber: string,
    projectName: string,
    ctx: NotifCtx = {}
  ): Promise<void> {
    try {
      const message =
        `Dear ${clientName}, your booking for unit ${unitNumber} in ${projectName} ` +
        `has been confirmed. Welcome to your new home! Our team will be in touch with next steps.`

      console.log(`[WhatsApp] Would send to ${phone}: ${message}`)

      // To activate WhatsApp:
      // 1. Sign up at https://www.interakt.shop or https://www.wati.io
      // 2. Get your API key and set WHATSAPP_API_KEY in .env
      // 3. Create a "booking_confirmation" message template
      // 4. Uncomment the fetch() call below
      // const response = await fetch('https://api.interakt.ai/v1/public/message/', {
      //   method: 'POST',
      //   headers: { 'Authorization': 'Basic ' + this.settings.api_key, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     countryCode: '+91',
      //     phoneNumber: phone,
      //     type: 'Template',
      //     template: {
      //       name: this.settings.templates.booking_confirmation,
      //       languageCode: 'en',
      //       bodyValues: [clientName, unitNumber, projectName],
      //     },
      //   }),
      // })

      await this._insertNotification(message, 'general', ctx)
    } catch (e) {
      console.error('[WhatsApp] sendBookingConfirmation error:', e)
    }
  }
}

/**
 * Async factory that loads org WhatsApp settings from the DB and returns a
 * ready-to-use WhatsAppService. Always succeeds — falls back to safe defaults
 * if no settings row exists yet.
 */
export async function createWhatsAppClient(orgId: string): Promise<WhatsAppService> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('organization_settings')
    .select('settings')
    .eq('organization_id', orgId)
    .single()

  const wa = (data?.settings as Record<string, unknown> | null)?.whatsapp as
    | Partial<WhatsAppSettings>
    | undefined

  const settings: WhatsAppSettings = {
    provider:  wa?.provider  ?? 'interakt',
    api_key:   wa?.api_key   ?? '',
    templates: {
      thank_you:            (wa?.templates as Record<string, string> | undefined)?.thank_you            ?? '',
      brochure:             (wa?.templates as Record<string, string> | undefined)?.brochure             ?? '',
      due_reminder:         (wa?.templates as Record<string, string> | undefined)?.due_reminder         ?? '',
      booking_confirmation: (wa?.templates as Record<string, string> | undefined)?.booking_confirmation ?? '',
    },
  }

  return new WhatsAppService(settings)
}
