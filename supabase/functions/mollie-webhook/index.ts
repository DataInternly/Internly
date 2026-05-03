// ─────────────────────────────────────────────────────────────────────────
// Internly — Mollie webhook (CC-1, 3 mei 2026)
// ─────────────────────────────────────────────────────────────────────────
// Mollie legacy webhooks zijn ongesigneerd: de body bevat alleen
// `id=tr_xxx` of `id=sub_xxx`. Deze handler vertrouwt de body NIET.
// Bij elk inkomend bericht:
//   1. Parse het ID en valideer het prefix.
//   2. Idempotency check via `processed_webhooks` tabel.
//   3. Fetch de resource terug van de Mollie API met onze API-key —
//      alleen wat Mollie zelf teruggeeft is gezaghebbend.
//   4. Update Supabase op basis van de Mollie-status.
//   5. Markeer het webhook-id als verwerkt.
// Antwoord altijd 200, ook bij interne fouten — anders blijft Mollie retrying.
// Deploy: supabase functions deploy mollie-webhook --no-verify-jwt
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MOLLIE_API_KEY        = Deno.env.get('MOLLIE_API_KEY')         ?? ''
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')           ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEBHOOK_URL           = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/mollie-webhook`
  : ''

// ── Plan-config (gespiegeld aan create-checkout/index.ts) ──────────────
const PLAN_INTERVALS: Record<string, string> = {
  company_pro:              '1 month',
  company_business:         '1 month',
  school_premium:           '1 year',
  school_premium_monthly:   '1 month',
  begeleider_starter:       '1 month',
  begeleider_pro:           '1 month',
}
const PLAN_AMOUNTS: Record<string, string> = {
  company_pro:              '59.00',
  company_business:         '169.00',
  school_premium:           '249.00',
  school_premium_monthly:   '29.00',
  begeleider_starter:       '49.00',
  begeleider_pro:           '79.00',
}
const PLAN_DESCRIPTIONS: Record<string, string> = {
  company_pro:              'Internly Bedrijf Pro — maandabonnement',
  company_business:         'Internly Bedrijf Business — maandabonnement',
  school_premium:           'Internly School Premium — jaarabonnement',
  school_premium_monthly:   'Internly School Premium — maandabonnement',
  begeleider_starter:       'Internly Begeleider Starter — maandabonnement',
  begeleider_pro:           'Internly Begeleider Pro — maandabonnement',
}

// ── Mollie API helpers ──────────────────────────────────────────────────
async function mollieGet(path: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://api.mollie.com/v2${path}`, {
      headers: { 'Authorization': `Bearer ${MOLLIE_API_KEY}` },
    })
    if (res.status === 404) {
      console.warn(`[mollie-webhook] Mollie 404 for ${path} — resource not found`)
      return null
    }
    if (!res.ok) {
      console.warn(`[mollie-webhook] Mollie ${res.status} for ${path}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error(`[mollie-webhook] Mollie GET ${path} fout:`, err)
    return null
  }
}

async function molliePost(path: string, body: unknown): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://api.mollie.com/v2${path}`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${MOLLIE_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`[mollie-webhook] Mollie POST ${path} ${res.status}:`, await res.text())
      return null
    }
    return await res.json()
  } catch (err) {
    console.error(`[mollie-webhook] Mollie POST ${path} fout:`, err)
    return null
  }
}

// ── Body-parsing ────────────────────────────────────────────────────────
function _parseId(body: string): string | null {
  // Vorm 1 — application/x-www-form-urlencoded (Mollie default)
  const params = new URLSearchParams(body)
  const fromForm = params.get('id')
  if (fromForm) return fromForm
  // Vorm 2 — application/json (fallback)
  try {
    const json = JSON.parse(body)
    if (json && typeof json.id === 'string') return json.id
  } catch (_) { /* niet-JSON, OK */ }
  return null
}

type ResourceType = 'payment' | 'subscription' | 'order'
function _idType(id: string): ResourceType | null {
  if (id.startsWith('tr_'))  return 'payment'
  if (id.startsWith('sub_')) return 'subscription'
  if (id.startsWith('ord_')) return 'order'
  return null
}

// ── Helpers (Supabase client typed loosely; SDK-specifieke types
//    veranderen tussen versies, dus geen impliciete generieke types) ───
type Supa = ReturnType<typeof createClient>

// ── Payment handler ─────────────────────────────────────────────────────
async function _handlePayment(supabase: Supa, payment: Record<string, unknown>) {
  const pId          = String(payment.id ?? '')
  const pStatus      = String(payment.status ?? '')
  const customerId   = payment.customerId ? String(payment.customerId) : null
  const sequenceType = payment.sequenceType ? String(payment.sequenceType) : null

  if (!pId || !pStatus) {
    console.warn('[mollie-webhook] payment zonder id/status:', payment)
    return
  }

  // Vind de subscription-rij — eerst via mollie_payment_id, daarna customer
  let { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('mollie_payment_id', pId)
    .maybeSingle()

  if (!sub && customerId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('mollie_customer_id', customerId)
      .maybeSingle()
    sub = data
  }

  if (!sub) {
    console.warn(`[mollie-webhook] geen subscription gevonden voor payment ${pId}`)
    return
  }

  // === PAID ===
  if (pStatus === 'paid') {
    const now = new Date()

    if (sequenceType === 'first' && !sub.mollie_sub_id && customerId) {
      await _createMollieSubscription(supabase, sub, customerId, now)
    } else {
      // Recurring charge — verleng de periode
      const periodEnd = new Date(now)
      if (sub.plan === 'school_premium') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      }
      await supabase.from('subscriptions').update({
        status:               'active',
        mollie_payment_id:    pId,
        current_period_start: now.toISOString(),
        current_period_end:   periodEnd.toISOString(),
      }).eq('id', sub.id)
    }

    await supabase.from('notifications').insert({
      user_id:  sub.profile_id,
      type:     'subscription_activated',
      ref_type: 'subscription',
      ref_id:   sub.id,
      message:  'Je abonnement is actief.',
      read:     false,
    })
    return
  }

  // === FAILED / EXPIRED / CANCELED (van een payment) ===
  if (['failed', 'expired', 'canceled'].includes(pStatus)) {
    await supabase.from('subscriptions').update({
      status: 'past_due',
    }).eq('id', sub.id)

    await supabase.from('notifications').insert({
      user_id:  sub.profile_id,
      type:     'subscription_failed',
      ref_type: 'subscription',
      ref_id:   sub.id,
      message:  'Je betaling is mislukt. Hernieuwen om toegang te behouden.',
      read:     false,
    })
    return
  }

  // === REFUNDED / CHARGED_BACK ===
  if (['refunded', 'charged_back'].includes(pStatus)) {
    await supabase.from('subscriptions').update({
      status:            'cancelled',
      mollie_sub_id:     null,
      mollie_mandate_id: null,
    }).eq('id', sub.id)
    return
  }

  // === PENDING / OPEN ===
  // Geen actie — wachten op een definitieve status.
  console.log(`[mollie-webhook] payment ${pId} status=${pStatus} — geen actie`)
}

// ── Subscription handler (sub_) ─────────────────────────────────────────
async function _handleSubscription(supabase: Supa, subscription: Record<string, unknown>) {
  const subId      = String(subscription.id ?? '')
  const subStatus  = String(subscription.status ?? '')
  if (!subId || !subStatus) {
    console.warn('[mollie-webhook] subscription zonder id/status:', subscription)
    return
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('mollie_sub_id', subId)
    .maybeSingle()

  if (!sub) {
    console.warn(`[mollie-webhook] geen subscription gevonden voor sub_id ${subId}`)
    return
  }

  let newStatus: string | null = null
  if (subStatus === 'active')                              newStatus = 'active'
  else if (subStatus === 'canceled' || subStatus === 'suspended') newStatus = 'cancelled'
  else if (subStatus === 'completed')                      newStatus = 'expired'

  if (!newStatus) {
    console.log(`[mollie-webhook] subscription ${subId} status=${subStatus} — geen actie`)
    return
  }

  await supabase.from('subscriptions').update({ status: newStatus }).eq('id', sub.id)

  if (newStatus === 'cancelled' || newStatus === 'expired') {
    await supabase.from('notifications').insert({
      user_id:  sub.profile_id,
      type:     'subscription_failed',
      ref_type: 'subscription',
      ref_id:   sub.id,
      message:  newStatus === 'expired'
        ? 'Je abonnement is afgelopen.'
        : 'Je abonnement is opgezegd.',
      read:     false,
    })
  }
}

// ── First-payment helper — set up recurring Mollie subscription ─────────
async function _createMollieSubscription(
  supabase: Supa,
  sub: Record<string, unknown>,
  customerId: string,
  now: Date,
) {
  const mandates = await mollieGet(`/customers/${customerId}/mandates`)
  // deno-lint-ignore no-explicit-any
  const mandateList: any[] = (mandates?._embedded as any)?.mandates ?? []
  const validMandate = mandateList.find((m) => m?.status === 'valid')

  const plan = String(sub.plan ?? '')
  const interval = PLAN_INTERVALS[plan]

  if (!validMandate || !interval) {
    // Geen mandate of onbekend plan — markeer wel actief zodat de
    // gebruiker niet vastzit, maar geen recurring billing.
    await supabase.from('subscriptions').update({ status: 'active' }).eq('id', sub.id)
    return
  }

  const nextDate = new Date(now)
  if (interval === '1 month')      nextDate.setMonth(nextDate.getMonth() + 1)
  else if (interval === '1 year')  nextDate.setFullYear(nextDate.getFullYear() + 1)

  const mollieSubResponse = await molliePost(
    `/customers/${customerId}/subscriptions`,
    {
      amount:      { currency: 'EUR', value: PLAN_AMOUNTS[plan] },
      interval,
      description: PLAN_DESCRIPTIONS[plan],
      startDate:   nextDate.toISOString().split('T')[0],
      webhookUrl:  WEBHOOK_URL,
      metadata:    { supabase_user_id: sub.profile_id, plan },
    },
  )

  if (mollieSubResponse?.id) {
    const update: Record<string, unknown> = {
      mollie_sub_id:        mollieSubResponse.id,
      mollie_mandate_id:    validMandate.id,
      status:               'active',
      current_period_start: now.toISOString(),
      current_period_end:   nextDate.toISOString(),
    }
    if (plan === 'begeleider_starter') update.max_students = 30
    else if (plan === 'begeleider_pro') update.max_students = 100
    await supabase.from('subscriptions').update(update).eq('id', sub.id)
  } else {
    // Mollie subscription kon niet worden aangemaakt — set actief, log fout
    await supabase.from('subscriptions').update({ status: 'active' }).eq('id', sub.id)
  }
}

// ── Main entry ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // 1. Methode-check
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // 2. Content-type check
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/x-www-form-urlencoded')
      && !contentType.includes('application/json')) {
    return new Response('Invalid content type', { status: 400 })
  }

  // 3. Env-vars-check — return 200 zodat Mollie niet blijft retryen op
  //    config-fout aan onze kant
  if (!MOLLIE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[mollie-webhook] Missing env vars')
    return new Response('Config error', { status: 200 })
  }

  try {
    const body = await req.text()
    const id   = _parseId(body)
    if (!id) {
      console.warn('[mollie-webhook] Geen id in body:', body.slice(0, 100))
      return new Response('No id in payload', { status: 400 })
    }

    const type = _idType(id)
    if (!type) {
      console.warn('[mollie-webhook] Ongeldig id-prefix:', id)
      return new Response('Invalid id format', { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 4. Idempotency check
    const { data: existing } = await supabase
      .from('processed_webhooks')
      .select('id')
      .eq('mollie_id', id)
      .maybeSingle()

    if (existing) {
      console.log(`[mollie-webhook] al verwerkt: ${id}`)
      return new Response('Already processed', { status: 200 })
    }

    // 5. Fetch resource terug van Mollie — bron-van-waarheid
    const path = type === 'payment'      ? `/payments/${id}`
              : type === 'subscription' ? `/subscriptions/${id}`
                                        : `/orders/${id}`
    const resource = await mollieGet(path)

    if (!resource) {
      // Mollie 404/5xx of fetch-error — antwoord 200, geen markering,
      // zodat Mollie kan retryen op een transient error.
      return new Response('Mollie API error, will retry', { status: 200 })
    }

    // 6. Verwerk
    if (type === 'payment') {
      await _handlePayment(supabase, resource)
    } else if (type === 'subscription') {
      await _handleSubscription(supabase, resource)
    } else {
      // Order webhooks worden door Internly niet gebruikt; loggen en negeren.
      console.log(`[mollie-webhook] order webhook genegeerd: ${id}`)
    }

    // 7. Markeer als verwerkt (UNIQUE op mollie_id beschermt tegen race)
    const { error: insErr } = await supabase
      .from('processed_webhooks')
      .insert({ mollie_id: id, event_type: type })
    if (insErr && insErr.code !== '23505') {
      console.warn('[mollie-webhook] processed_webhooks insert fout:', insErr.message)
    }

    return new Response('OK', { status: 200 })

  } catch (err) {
    // Vang ALLES af — Mollie blijft retryen bij niet-200 reponses.
    console.error('[mollie-webhook] Unhandled error:', err)
    return new Response('Internal error', { status: 200 })
  }
})
