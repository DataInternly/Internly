import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VATCOMPLY_URL = 'https://api.vatcomply.com/vat';
const EC_VIES_URL   =
  'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number';

const MANUAL_COUNTRIES = ['DE'];
const RATE_LIMIT_HOURS = 24;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'authorization, content-type',
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } =
      await supabase.auth.getUser(token);

    if (authErr || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { vat_number, company_profile_id } =
      await req.json();

    if (!vat_number || !company_profile_id) {
      return json({
        error: 'vat_number en company_profile_id verplicht'
      }, 400);
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const { data: cp } = await supabase
      .from('company_profiles')
      .select('profile_id, vat_last_attempt_at, verification_status')
      .eq('profile_id', company_profile_id)
      .maybeSingle();

    if (!cp) {
      return json({ error: 'Bedrijf niet gevonden' }, 404);
    }

    if (cp.profile_id !== user.id && prof?.role !== 'admin') {
      return json({ error: 'Forbidden' }, 403);
    }

    if (cp.vat_last_attempt_at) {
      const lastAttempt = new Date(cp.vat_last_attempt_at);
      const hoursSince =
        (Date.now() - lastAttempt.getTime()) / 3_600_000;
      if (hoursSince < RATE_LIMIT_HOURS) {
        const hoursLeft = Math.ceil(RATE_LIMIT_HOURS - hoursSince);
        return json({
          error: `Rate limit: probeer over ${hoursLeft} uur opnieuw`,
          retry_after_hours: hoursLeft
        }, 429);
      }
    }

    const normalized = vat_number
      .toUpperCase()
      .replace(/[\s.\-]/g, '');

    const countryCode = normalized.slice(0, 2);
    const vatPart     = normalized.slice(2);

    if (!/^[A-Z]{2}/.test(normalized)) {
      return json({
        error: 'BTW-nummer moet beginnen met landcode (bv. NL, DE, FR)',
        valid: false
      }, 400);
    }

    await supabase
      .from('company_profiles')
      .update({ vat_last_attempt_at: new Date().toISOString() })
      .eq('profile_id', company_profile_id);

    if (MANUAL_COUNTRIES.includes(countryCode)) {
      await setManual(supabase, company_profile_id, user.id,
        `${countryCode} VIES-node onbetrouwbaar — handmatige verificatie vereist`
      );
      return json({
        valid: false,
        status: 'pending',
        reason: 'manual_required',
        message: `${countryCode}-bedrijven worden handmatig geverifieerd. Je ontvangt een bevestiging binnen 48 uur.`
      });
    }

    let result = await tryVATcomply(normalized);

    if (result.error) {
      result = await tryECVIES(countryCode, vatPart);
    }

    if (result.error) {
      await setManual(supabase, company_profile_id, user.id,
        `VIES niet bereikbaar voor ${countryCode} — handmatige verificatie`
      );
      return json({
        valid: false,
        status: 'pending',
        reason: 'vies_unavailable',
        message: 'VIES tijdelijk niet beschikbaar. Handmatige verificatie gestart.'
      });
    }

    if (result.valid) {
      await supabase
        .from('company_profiles')
        .update({
          verification_status:   'verified',
          verified_at:           new Date().toISOString(),
          vat_number:            normalized,
          vat_cache_name:        result.name || null,
          vat_cache_address:     result.address || null,
          vat_cache_verified_at: new Date().toISOString(),
          company_type:          'eu',
          country:               countryCode,
        })
        .eq('profile_id', company_profile_id);

      await logVerification(supabase, {
        company_id:   company_profile_id,
        action:       'vies_verified',
        performed_by: user.id,
        notes:        `VIES bevestigd voor ${normalized}`
      });

      await supabase.from('notifications').insert({
        user_id:    company_profile_id,
        type:       'verification_approved',
        ref_type:   'company',
        message:    'Je bedrijf is geverifieerd. Je vacatures zijn nu zichtbaar voor studenten.',
        read:       false,
        created_at: new Date().toISOString()
      });

      return json({
        valid:   true,
        status:  'verified',
        name:    result.name,
        address: result.address,
        country: countryCode
      });

    } else {
      await supabase
        .from('company_profiles')
        .update({
          verification_status: 'pending',
          vat_number:          normalized,
          company_type:        'eu',
          country:             countryCode,
        })
        .eq('profile_id', company_profile_id);

      await logVerification(supabase, {
        company_id:   company_profile_id,
        action:       'vies_failed',
        performed_by: user.id,
        notes:        `BTW-nummer ${normalized} niet gevonden in VIES`
      });

      return json({
        valid:  false,
        status: 'pending',
        reason: 'not_found',
        message: 'BTW-nummer niet gevonden in VIES. Upload een bedrijfsdocument voor handmatige verificatie.'
      });
    }

  } catch (err) {
    console.error('[vat-verify] onverwachte fout:', err);
    return json({ error: 'Interne fout' }, 500);
  }
});

async function tryVATcomply(vatNumber: string) {
  try {
    const res = await fetch(
      `${VATCOMPLY_URL}?vat_number=${encodeURIComponent(vatNumber)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      valid:   data.valid === true,
      name:    data.name || null,
      address: data.address
        ? `${data.address.street_address || ''} ${data.address.city || ''}`.trim()
        : null
    };
  } catch (e) {
    return { error: String(e) };
  }
}

async function tryECVIES(countryCode: string, vatNumber: string) {
  try {
    const res = await fetch(EC_VIES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode, vatNumber }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      valid:   data.isValid === true,
      name:    data.name || null,
      address: data.address || null
    };
  } catch (e) {
    return { error: String(e) };
  }
}

async function setManual(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  notes: string
) {
  await supabase
    .from('company_profiles')
    .update({ verification_status: 'pending' })
    .eq('profile_id', companyId);

  await logVerification(supabase, {
    company_id:   companyId,
    action:       'vies_failed',
    performed_by: userId,
    notes
  });
}

async function logVerification(
  supabase: ReturnType<typeof createClient>,
  entry: {
    company_id:   string;
    action:       string;
    performed_by: string;
    notes?:       string;
  }
) {
  await supabase.from('verification_log').insert({
    ...entry,
    created_at: new Date().toISOString()
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
