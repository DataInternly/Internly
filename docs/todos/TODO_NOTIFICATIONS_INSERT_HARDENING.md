# TODO — notifications INSERT spam-vector

## Context
Audit 2026-05-03. notif_insert_auth heeft WITH CHECK
((auth.uid() IS NOT NULL) AND (user_id IS NOT NULL)).

Vector: iedere ingelogde user kan een notificatie inserten met willekeurige
user_id, dus spam tegen andere users mogelijk.

## Beslissing tijdens audit
Pad A gekozen, niet gefixt. Reden onduidelijkheid of client-code ergens
notificaties voor andere users schrijft. Server-side flows (triggers,
Edge Functions) gebruiken service_role en bypassen RLS sowieso.

## Wat te doen
1. Grep door client-code: findstr /S /N /I "notifications" js\*.js
2. Bevestig of notif-insert client-side ooit user_id != auth.uid() doet
3. Als nee:
   DROP POLICY notif_insert_auth ON notifications;
   CREATE POLICY notif_insert_self_only
     ON notifications FOR INSERT
     TO authenticated
     WITH CHECK (user_id = (select auth.uid()));
4. Als ja: laat policy zoals hij is, accepteer spam-vector als productrisico

## Niet doen
TBD — Barry te bevestigen

## Trigger om te bouwen
TBD — Barry te bevestigen
