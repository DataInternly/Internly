import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MOLLIE_API_KEY = Deno.env.get('MOLLIE_API_KEY')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function mollieGet(path: string) {
  const res = await fetch(`https://api.mollie.com/v2${path}`, {
    headers: { 'Authorization': `Bearer ${MOLLIE_API_KEY}` },
  })
  if (!res.ok) return null
  return res.json()
}

async function molliePost(path: string, body: object) {
  const res = await fetch(`https://api.mollie.com/v2${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MOLLIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error(`Mollie POST ${path} failed:`, await res.text())
    return null
  }
  return res.json()
}

Deno.serve(async (req) => {
  try {
    const body    = await req.text()
    const params  = new URLSearchParams(body)
    const paymentId = params.get('id')

    if (!paymentId) return new Response('ok', { status: 200 })

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    // Fetch real status from Mollie — never trust the webhook body
    const payment = await mollieGet(`/payments/${paymentId}`)
    if (!payment) return new Response('ok', { status: 200 })

    const { id: pId, status: pStatus, customerId, sequenceType } = payment

    // Idempotency — skip if already processed at this exact status
    const { error: idempotencyErr } = await supabase
      .from('webhook_events')
      .insert({ payment_id: `${pId}:${pStatus}`, status: pStatus })

    if (idempotencyErr?.code === '23505') {
      console.log(`Duplicate webhook ${pId} status=${pStatus}, skipping`)
      return new Response('ok', { status: 200 })
    }

    // Find the subscription row — first by payment ID, then by customer ID
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
      console.log(`No subscription found for payment ${pId}`)
      return new Response('ok', { status: 200 })
    }

    // ── PAID ──────────────────────────────────────────────────────
    if (pStatus === 'paid') {
      const now = new Date()

      if (sequenceType === 'first' && !sub.mollie_sub_id) {
        // Verify mandate exists before creating subscription
        const mandates     = await mollieGet(`/customers/${customerId}/mandates`)
        const validMandate = mandates?._embedded?.mandates?.find(
          (m: { status: string }) => m.status === 'valid'
        )

        if (validMandate) {
          const planIntervals: Record<string, string> = {
            company_pro:              '1 month',
            company_business:         '1 month',
            school_premium:           '1 year',
            school_premium_monthly:   '1 month',
            begeleider_starter:       '1 month',
            begeleider_pro:           '1 month',
          }
          const planAmounts: Record<string, string> = {
            company_pro:              '59.00',
            company_business:         '169.00',
            school_premium:           '249.00',
            school_premium_monthly:   '29.00',
            begeleider_starter:       '49.00',
            begeleider_pro:           '79.00',
          }
          const planDescriptions: Record<string, string> = {
            company_pro:              'Internly Bedrijf Pro — maandabonnement',
            company_business:         'Internly Bedrijf Business — maandabonnement',
            school_premium:           'Internly School Premium — jaarabonnement',
            school_premium_monthly:   'Internly School Premium — maandabonnement',
            begeleider_starter:       'Internly Begeleider Starter — maandabonnement',
            begeleider_pro:           'Internly Begeleider Pro — maandabonnement',
          }

          const interval = planIntervals[sub.plan]

          if (interval) {
            const nextDate = new Date(now)
            if (interval === '1 month') nextDate.setMonth(nextDate.getMonth() + 1)
            else if (interval === '1 year') nextDate.setFullYear(nextDate.getFullYear() + 1)

            const mollieSubResponse = await molliePost(`/customers/${customerId}/subscriptions`, {
              amount:      { currency: 'EUR', value: planAmounts[sub.plan] },
              interval,
              description: planDescriptions[sub.plan],
              startDate:   nextDate.toISOString().split('T')[0],
              webhookUrl:  `https://qoxgbkbnjsycodcqqmft.supabase.co/functions/v1/mollie-webhook`,
              metadata:    { supabase_user_id: sub.profile_id, plan: sub.plan },
            })

            if (mollieSubResponse?.id) {
              await supabase.from('subscriptions').update({
                mollie_sub_id:        mollieSubResponse.id,
                mollie_mandate_id:    validMandate.id,
                status:               'active',
                current_period_start: now.toISOString(),
                current_period_end:   nextDate.toISOString(),
                max_students:         sub.plan === 'begeleider_starter' ? 30
                                    : sub.plan === 'begeleider_pro'     ? 100
                                    : undefined,
              }).eq('id', sub.id)
            }
          }
        } else {
          await supabase.from('subscriptions').update({ status: 'active' }).eq('id', sub.id)
        }

      } else {
        // Recurring charge paid — extend period
        const periodEnd = new Date(now)
        if (sub.plan === 'school_premium') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        else periodEnd.setMonth(periodEnd.getMonth() + 1)

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
        message:  `Je abonnement is actief.`,
        read:     false,
      })
    }

    // ── FAILED / EXPIRED / CANCELED ───────────────────────────────
    if (['failed', 'expired', 'canceled'].includes(pStatus)) {
      await supabase.from('subscriptions').update({
        status: pStatus === 'failed' ? 'past_due' : 'cancelled',
      }).eq('id', sub.id)

      await supabase.from('notifications').insert({
        user_id:  sub.profile_id,
        type:     'subscription_failed',
        ref_type: 'subscription',
        ref_id:   sub.id,
        message:  'Je betaling is mislukt. Hernieuwen om toegang te behouden.',
        read:     false,
      })
    }

    // ── CHARGED BACK ──────────────────────────────────────────────
    if (pStatus === 'charged_back') {
      await supabase.from('subscriptions').update({
        status:            'cancelled',
        mollie_sub_id:     null,
        mollie_mandate_id: null,
      }).eq('id', sub.id)
    }

    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('mollie-webhook unhandled error:', err)
    return new Response('ok', { status: 200 })
  }
})
