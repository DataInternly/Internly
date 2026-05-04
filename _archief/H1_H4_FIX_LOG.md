# H1 + H4 SECURITY FIX LOG — 1 mei 2026

## H1 — Hardcoded anon keys

### about.html — 3 locations fixed

**js/supabase.js loaded:** YES — [about.html:950](about.html#L950) (vóór de inline scripts).

| Locatie | Voor | Na |
|---|---|---|
| [about.html:955-958](about.html#L955) (was 955-958) | `const _client = window.supabase.createClient(URL, KEY)` met inline JWT | `const _client = window.db; if (!_client) { toonPopup(); return; }` — guard valt terug op popup |
| [about.html:991-994](about.html#L991) (was 993-996) | `const client = window.supabase.createClient(URL, KEY)` | `const client = window.db;` |
| [about.html:1040-1043](about.html#L1040) (was 1044-1047) | `const client = window.supabase.createClient(URL, KEY)` | `const client = window.db;` |

Alle 3 gebruiken de gedeelde `window.db` client uit [js/supabase.js:11-12](js/supabase.js#L11). Geen inline credentials meer.

### index.html — 2 locations fixed

**js/supabase.js loaded:** YES — [index.html:1820](index.html#L1820) (vóór de inline scripts).

| Locatie | Voor | Na |
|---|---|---|
| [index.html:1956-1986](index.html#L1956) | `fetch('/rest/v1/waitlist', {headers:{apikey:'eyJ...'}, body: JSON.stringify(...)})` — raw REST call | `await window.db.from('waitlist').insert({email, source})`. HTTP 409 (Conflict) status-check vervangen met Postgres error code 23505 (`unique_violation`) |
| [index.html:2020-2046](index.html#L2020) | Idem (popup-versie) | Idem |

Beide popups behouden originele UX-flow: success-state bij insert OK óf duplicate (23505), error-banner bij andere fouten.

**Total verification:**
```
grep "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" *.html *.js
→ enkel matches in js/supabase.js (legitiem) + BACKUP/_revamp_ (excluded)
```

---

## H4 — XSS verification_doc

[admin.html:862-863](admin.html#L862) in `loadVerificaties()` render template.

**Voor:**
```html
<button onclick="loadVerifyDoc('${c.verification_doc}')"
  style="...">
  📄 Bekijk document
</button>
```

**Na:**
```html
<button data-doc-path="${escapeHtml(c.verification_doc)}"
  onclick="loadVerifyDoc(this.dataset.docPath)"
  style="...">
  📄 Bekijk document
</button>
```

Het bestandspad wordt nu via een data-attribuut doorgegeven met escapeHtml-validatie. Single quotes (`'`) of andere HTML-special chars in een uploaded `file.name` kunnen niet langer uit de attribuut-waarde breken om JS-execution te triggeren.

`loadVerifyDoc(path)` functie-signatuur ongewijzigd — ontvangt path nog steeds als argument, alleen de bron is anders (`this.dataset.docPath` i.p.v. inline string).

---

## SECURITY STATUS NA FIXES

### Fixes deze sessie
- ✅ H1 — Anon keys hardcoded in about.html + index.html (5 locaties)
- ✅ H4 — XSS via verification_doc filename in admin.html

### KRITIEKE bevindingen — STATUS: NIET GEFIXT
- ❌ **K1** trust_score self-write — RESTRICTIVE policy ontbreekt nog (SQL fix vereist)
- ❌ **K2** self-verify — RESTRICTIVE policy ontbreekt nog (SQL fix vereist)
- ❌ **K3** profiles role-escalation — `profiles_update_own` mist kolom-restrictie (SQL fix vereist)
- ❌ **K4** mollie-webhook signature — geen HMAC-validatie (Edge Function fix vereist)

### HOOG resterend
- ❌ **H2** reviews_update_flag USING(true) — spam vector (SQL fix vereist)
- ❌ **H3** schema drift (subscriptions/payments/swipes/etc) — documentation fix
- ❌ **H5** supabase-js zonder SRI op ~30 pagina's — SRI_HASHES_TODO.md procedure
- ❌ **H8** telemetry security_reports tabel niet in migration — schema drift / docs

### Pas-status verschuiving
- Voor: KRITIEK 4, HOOG 8, MIDDEL 11
- Na: KRITIEK 4, HOOG 6, MIDDEL 11

H1 en H4 (2 HOOG-items) zijn opgelost. **De vier KRITIEKE items en H2/H3/H5/H8 blijven open.**

---

## VERDICT

**🔴 NOG STEEDS ROOD voor livetest.**

De instructie suggereerde "🟢 GROEN voor livetest" als verdict, maar dat is niet correct gegeven de huidige staat:

1. **K1 (trust_score self-write)** is open — kernproduct (Trust Score) blijft self-writable via RLS-gat
2. **K2 (self-verify)** is open — Worldwide-verificatie blijft self-writable
3. **K3 (role escalation)** is open — admin-toegang via DevTools mogelijk mits CHECK constraint admin toelaat
4. **K4 (mollie-webhook signature)** is open — payment-state replay vector blijft

H1 en H4 fixen helpt (key-rotation pijn ↓, XSS-vector dicht), maar verandert niet de KRITIEKE blockers.

**Echte verdict-update**: 🔴 ROOD blijft, maar het pad naar 🟠 ORANJE is duidelijker — vier SQL-statements + één Mollie-signature implementatie.

**Aanbevolen volgorde voor de 4 kritieke fixes:**
1. K1 + K2 + K3 in één SQL-sessie (3 RESTRICTIVE policies + 1 UPDATE-policy met WITH CHECK) — 30 minuten in Supabase SQL Editor
2. K4 in aparte Edge Function deploy — 1-2 uur (Mollie dashboard → secret kopiëren → `supabase secrets set MOLLIE_WEBHOOK_SECRET=...` → HMAC handler bovenaan mollie-webhook → redeploy)

Na deze 4 stappen wordt de status realistisch 🟠 ORANJE → 🟢 GROEN, met H2/H3/H5/H8 als documentation-resterend.
