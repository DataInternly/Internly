# BACKLOG SECURITY NOTES

Lopende notities over toekomstige security-gevoelige features.
Wordt bijgewerkt wanneer een feature in scope komt of gebouwd gaat worden.

---

## Learning Agreement signing — toekomstige RPC

**Toegevoegd** 2026-05-03
**Trigger** Statische audit bevestigde dat `learning_agreements` PATCH-pattern, `la_token` en `sign_learning_agreement`/`signLearningAgreement` 0 matches hebben in `js/*.js` én geen Edge Function `sign-learning-agreement` bestaat in `supabase/functions/`. La-flow leeft (nog) niet in code.

Wanneer `learning_agreements` signing-flow gebouwd wordt:

- NIET direct PATCH op tabel met token-param
- WEL SECURITY DEFINER RPC: `sign_learning_agreement(la_id uuid, token text, signature_data jsonb)`
- RPC valideert token, lokaliseert toegestane velden, doet update server-side
- `la_tokens.used = true` zetten in dezelfde transactie
- `la_tokens.used_at`, `la_tokens.used_by_ip` loggen voor audit-trail
- RLS op `learning_agreements` blijft strict `auth.uid()`-based, geen token-route in policy

**Reden**: een policy die alleen "een token bestaat ergens" checkt is een aanwezigheidstest, geen autorisatie. Stagepact dec 2025 maakt LA juridisch bindend, dus tamper-protection moet sluitend zijn.

**Bestaande haakjes in code** (waar de flow zal landen):
- [la-sign.html](../la-sign.html) — publieke pagina, gemount in `PUBLIC_PAGES` ([js/utils.js:37](../js/utils.js#L37))
- [international-student-dashboard.html:989](../international-student-dashboard.html#L989) — "Learning Agreement"-sectie
- [international-school-dashboard.html:523](../international-school-dashboard.html#L523) — "Sign documents"-sectie
