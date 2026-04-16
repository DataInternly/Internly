import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MOLLIE_API_KEY = Deno.env.get('MOLLIE_API_KEY')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL        = Deno.env.get('APP_URL') ?? 'https://internly.pro'

const PLANS: Record<string, { amount: string; description: string; interval: string | null }> = {
  company_pro:              { amount: '59.00',  description: 'Internly Bedrijf Pro — maandabonnement',          interval: '1 month' },
  company_business:         { amount: '169.00', description: 'Internly Bedrijf Business — maandabonnement',      interval: '1 month' },
  school_premium:           { amount: '249.00', description: 'Internly School Premium — jaarabonnement',         interval: '1 year'  },
  school_premium_monthly:   { amount: '29.00',  description: 'Internly School Premium — maandabonnement',        interval: '1 month' },
  begeleider_starter:       { amount: '49.00',  description: 'Internly Begeleider Starter — maandabonnement',    interval: '1 month' },
  begeleider_pro:           { amount: '79.00',  description: 'Internly Begeleider Pro — maandabonnement',        interval: '1 month' },
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
    const err = await res.text()
    throw new Error(`Mollie ${path} failed ${res.status}: ${err}`)
  }
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': APP_URL,
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      }
    })
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': APP_URL,
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401, headers: corsHeaders })

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return new Response(JSON.stringify({ error: 'Ongeldig token' }), { status: 401, headers: corsHeaders })

    const { plan } = await req.json()
    if (!plan || !PLANS[plan]) {
      return new Response(JSON.stringify({ error: 'Ongeldig plan' }), { status: 400, headers: corsHeaders })
    }

    const { data: profile } = await supabase.from('profiles').select('role, naam, email').eq('id', user.id).single()
    if (!profile) return new Response(JSON.stringify({ error: 'Profiel niet gevonden' }), { status: 404, headers: corsHeaders })

    const planAllowed =
      (plan.startsWith('company_')    && profile.role === 'bedrijf')   ||
      (plan.startsWith('school_')     && profile.role === 'school')    ||
      (plan.startsWith('begeleider_') && profile.role === 'begeleider')
    if (!planAllowed) return new Response(JSON.stringify({ error: 'Plan niet beschikbaar voor jouw rol' }), { status: 403, headers: corsHeaders })

    let { data: sub } = await supabase.from('subscriptions').select('mollie_customer_id').eq('profile_id', user.id).maybeSingle()
    let mollieCustomerId = sub?.mollie_customer_id

    if (!mollieCustomerId) {
      const customer = await molliePost('/customers', {
        name:     profile.naam  ?? user.email,
        email:    profile.email ?? user.email,
        metadata: { supabase_user_id: user.id },
      })
      mollieCustomerId = customer.id
    }

    const planConfig = PLANS[plan]

    const payment = await molliePost('/payments', {
      amount:       { currency: 'EUR', value: planConfig.amount },
      description:  planConfig.description,
      sequenceType: 'first',
      customerId:   mollieCustomerId,
      redirectUrl:  `${APP_URL}/${
        plan.startsWith('school_')     ? 'school-dashboard.html'    :
        plan.startsWith('begeleider_') ? 'begeleider-dashboard.html' :
                                         'company-dashboard.html'
      }?payment=success&plan=${plan}`,
      webhookUrl:   `https://qoxgbkbnjsycodcqqmft.supabase.co/functions/v1/mollie-webhook`,
      locale:       'nl_NL',
      metadata:     { supabase_user_id: user.id, plan },
    })

    await supabase.from('subscriptions').upsert({
      profile_id:         user.id,
      plan,
      status:             'pending',
      mollie_customer_id: mollieCustomerId,
      mollie_payment_id:  payment.id,
      max_students:       plan === 'begeleider_starter' ? 30
                        : plan === 'begeleider_pro'     ? 100
                        : null,
    }, { onConflict: 'profile_id' })

    return new Response(
      JSON.stringify({ checkoutUrl: payment._links.checkout.href }),
      { headers: corsHeaders }
    )

  } catch (err) {
    console.error('create-checkout error:', err)
    return new Response(
      JSON.stringify({ error: 'Interne fout. Probeer het opnieuw.' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
