# TODO — Learning Agreement signing RPC

## Context
Audit 2026-05-03 dropte la_token_unauth_update policy omdat hij structureel
onveilig was (token-aanwezigheid is geen autorisatie).

Learning Agreement signing-flow bestaat nu niet in client-code of Edge
Functions. Wanneer hij gebouwd wordt:

## Verplicht ontwerp
- NIET direct PATCH op learning_agreements met token query-param
- WEL SECURITY DEFINER RPC: sign_learning_agreement(la_id uuid, token text, signature_data jsonb)
- RPC valideert token (la_id-match, used=false, expires_at > now)
- RPC limiteert welke velden muteerbaar zijn (alleen *_signed booleans en *_signed_at timestamps voor de juiste rol)
- la_tokens.used = true zetten in dezelfde transactie
- la_tokens.used_at, la_tokens.used_by_ip loggen voor audit-trail
- RLS op learning_agreements blijft strict auth.uid()-based, geen token-route in policy

## Reden
Stagepact dec 2025 maakt LA juridisch bindend. Tamper-protection moet
sluitend zijn, niet aanwezigheidstest.

## Niet doen
TBD — Barry te bevestigen

## Trigger om te bouwen
Wanneer la-sign.html of internationale dashboards de flow daadwerkelijk
gaan implementeren.
