# INTERNLY FIX SESSION — 30 april 2026

## BLOCKERS OPGELOST

### FIX 1 — index.html: Supabase CDN ontbreekt — DONE
- Locatie: [index.html:1816-1817](index.html#L1816)
- Voor: `<script src="js/roles.js"></script>` direct gevolgd door `<script src="js/supabase.js"></script>`
- Na: CDN script tag `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` toegevoegd tussen roles.js en supabase.js (lijn 1817).

### FIX 2 — bbl-hub.html: hardcoded test UUID — DONE
- Locatie: [bbl-hub.html:9](bbl-hub.html#L9)
- Voor: `--   WHERE profile_id = '65ed548f-a7da-4a9b-96c3-e64ccb9ca7d7';`
- Na: `--   WHERE profile_id = '<TEST_STUDENT_UUID>';`
- Note: lijn behouden, alleen UUID-token vervangen door placeholder zodat de SQL-instructie zichtbaar blijft.

### FIX 3 — company-dashboard.html: trust_score client write — DONE
- Locatie: [company-dashboard.html:2024-2033](company-dashboard.html#L2024)
- Beide DB-write blokken (upsert op company_profiles + update op internship_postings) volledig uitgecommentarieerd met audit-fix toelichting.
- `updateTrustDisplay(score, grade, reviewCount);` blijft actief — score wordt nog steeds berekend en in UI getoond, maar NIET naar DB geschreven.

---

## HOOG OPGELOST

### FIX 4 — auth.html: wachtwoord-vergeten flow — DONE
- **Change A** [auth.html:506](auth.html#L506): "Wachtwoord vergeten?" link toegevoegd direct na loginBtn.
- **Change B** [auth.html:785](auth.html#L785): `showForgotPassword()` functie toegevoegd vóór `doLogin()`.
- **Change C** [auth.html:672](auth.html#L672): recovery-token landing handler toegevoegd direct na de "expired" handler — toont reset-wachtwoord formulier en verbergt login/register tabs als `?type=recovery#access_token=...` in URL aanwezig is.
- **Change D** [auth.html:806](auth.html#L806): `doSetNewPassword()` functie toegevoegd direct na `showForgotPassword()`, valideert nieuw wachtwoord en roept `db.auth.updateUser({password})` aan.

### FIX 5 — esg-export.html: viewport meta — DONE
- Locatie: [esg-export.html:5](esg-export.html#L5)
- Direct na `<meta charset="UTF-8">` toegevoegd: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.

### FIX 6 — js/reviews.js: rate limiting — DONE
- Top van bestand: `_reviewRateLimits` object + `_reviewRateCheck(key, limitMs)` helper toegevoegd ([js/reviews.js:11-18](js/reviews.js#L11)).
- `submitReview()`: rate-check op `'submit_' + companyId` met 15s window, returnt early met notify ([js/reviews.js:124-128](js/reviews.js#L124)).
- `flagReview()`: rate-check op `'flag_' + reviewId` met 5s window, returnt early met notify ([js/reviews.js:172-176](js/reviews.js#L172)).
- Note: instructie noemde `revieweeId` — gebruikte werkelijke parameter `companyId` (zelfde concept).

### FIX 7 — match-dashboard.html: meeting date min + validatie — DONE
- [match-dashboard.html:5376](match-dashboard.html#L5376) — `min="${new Date().toISOString().split('T')[0]}"` toegevoegd aan `<input type="date">` in `renderModalStep2()` template.
- [match-dashboard.html:5434-5440](match-dashboard.html#L5434) — `_today` + `_invalidDates` server-side validatie blok toegevoegd direct na de `filled.length === 0` check in `saveMeeting()`.

### FIX 8 — match-dashboard.html: PDF null guard — DONE
- Alle `match.student.X` referenties in `exportPDF()` vervangen door optional chaining + fallback:
  - [match-dashboard.html:5695](match-dashboard.html#L5695): `${match?.student?.name || 'Onbekend'}`
  - [match-dashboard.html:5707](match-dashboard.html#L5707): `match?.student?.name || 'Onbekend'`
  - [match-dashboard.html:5784](match-dashboard.html#L5784): `match?.student?.name || 'Onbekend'`
  - [match-dashboard.html:5785](match-dashboard.html#L5785): `match?.student?.opleiding || '—'`
  - [match-dashboard.html:5946](match-dashboard.html#L5946): `match?.student?.name || 'student'`
- Referenties in exportCSV (lijn 5627-5635, 5654) NIET aangepast — vielen buiten exportPDF-scope per instructie.

### FIX 9 — bbl-profile.html: contract datum validatie — DONE
- [bbl-profile.html:562-568](bbl-profile.html#L562) — validatieblok toegevoegd direct na het lezen van `contractStart`/`contractEnd`, vóór de upsert. Returnt early met notify als einddatum < startdatum.

### FIX 10 — chat.html: zero-width character filter — DONE
- [chat.html:1088-1092](chat.html#L1088) — `sendMessage()`: `input.value` wordt eerst door `.replace(/[​‌‍‎‏﻿ ]/g, '')` gehaald en daarna getrimd.
- Note: in de file zijn de literal Unicode-tekens geschreven i.p.v. `\u`-escapes — functioneel equivalent (zelfde code points).

### FIX 14 — international-student-dashboard.html: LA validatie — DONE
- [international-student-dashboard.html:1808-1834](international-student-dashboard.html#L1808) — volledig validatieblok toegevoegd direct vóór `const payload = {...}`. Controleert: aanwezigheid van start/eind, einddatum > startdatum, niet zelfde dag, uren ≥ 1, supervisor naam aanwezig, supervisor email bevat `@`.

### FIX 15 — jsPDF SRI hash verificatie — DONE
- Computed hash via `curl --ssl-no-revoke + openssl dgst -sha384`: `JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk`
- Hash in files: `OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb` (= SHA-384 van lege string, placeholder)
- **MISMATCH bevestigd** — productie-deploy zou jsPDF blokkeren en PDF export breken in beide bestanden.
- Vervangen in [bbl-hub.html:63](bbl-hub.html#L63) en [match-dashboard.html:19](match-dashboard.html#L19).

### FIX 16 — student profile guards — DONE
- [match-dashboard.html:2710-2719](match-dashboard.html#L2710) — guard toegevoegd in DOMContentLoaded demo-mode flow: vóór `startHub('student')` wordt student_profiles.naam gecheckt; bij ontbrekende naam redirect naar student-profile.html.
- [chat.html:1426-1436](chat.html#L1426) — guard toegevoegd direct na `currentUser = user;`. Eerst rol opgevraagd uit profiles; alleen als role='student' wordt naam-check gedaan.

---

## MIDDEL OPGELOST

### FIX 11 — chat.html: double-escape bug — DONE
- Bevinding: lijn 661 zet `text = escapeHtml(raw).replace(/\bbobba\b/g, '<span...>')`. De variabele `text` is dus reeds geëscaped EN bevat een ingevoegd `<span>`. De latere `escapeHtml(text)` op lijn 683 zou dat span-element kapot escapen.
- Fix [chat.html:683](chat.html#L683): `${escapeHtml(text)}` vervangen door `${text}`. Het bobba-styling span blijft nu zichtbaar.

### FIX 12 — review-form.html:222 rel attribuut — DONE
- [review-form.html:222](review-form.html#L222): `rel="noopener noreferrer"` toegevoegd aan `<a href="spelregels.html" target="_blank">`.

### FIX 13 — matchpool.html: beforeunload cleanup — DONE
- [matchpool.html:457-465](matchpool.html#L457): `window.addEventListener('beforeunload', ...)` toegevoegd na de bestaande document-click listener. Roept `db.removeAllChannels()` aan.

---

## RESTERENDE ACTIES (buiten CC scope)

1. **Supabase SQL Editor — notifications RLS INSERT policy:**
   ```sql
   ALTER POLICY "notif_insert_auth" ON notifications
   USING (auth.uid() IS NOT NULL)
   WITH CHECK (auth.uid() IS NOT NULL AND user_id IS NOT NULL);
   ```

2. **Supabase SQL Editor — trust_score column-level restriction:**
   ```sql
   CREATE POLICY "cp_no_trust_override" ON company_profiles
   AS RESTRICTIVE FOR UPDATE
   USING (profile_id = auth.uid())
   WITH CHECK (
     trust_score IS NOT DISTINCT FROM (
       SELECT trust_score FROM company_profiles
       WHERE profile_id = auth.uid()
     )
   );
   ```
   (Alternatief: verwijder trust_score uit GRANT UPDATE)

3. **Supabase Dashboard → Authentication → SMTP:**
   Configureer custom SMTP (Postmark/Resend/SendGrid) vóór livetest om spam-folder bezorging te voorkomen.

4. **Supabase Dashboard → Authentication → Password:**
   Bevestig minimum length = 8 (eerder gedaan, verifieer).

5. **Pin supabase-js versie + SRI hashes op ~30 pagina's** (fase 2 werk, zie masterlijst). Computed hash voor jsPDF 2.5.1 al toegevoegd in FIX 15; supabase-js vereist eerst versiepinning vóór SRI berekening.

---

## MODIFIED FILES

1. [index.html](index.html) — FIX 1
2. [bbl-hub.html](bbl-hub.html) — FIX 2 + FIX 15
3. [company-dashboard.html](company-dashboard.html) — FIX 3
4. [auth.html](auth.html) — FIX 4 (4 changes)
5. [esg-export.html](esg-export.html) — FIX 5
6. [js/reviews.js](js/reviews.js) — FIX 6
7. [match-dashboard.html](match-dashboard.html) — FIX 7 + FIX 8 + FIX 15 + FIX 16
8. [bbl-profile.html](bbl-profile.html) — FIX 9
9. [chat.html](chat.html) — FIX 10 + FIX 11 + FIX 16
10. [review-form.html](review-form.html) — FIX 12
11. [matchpool.html](matchpool.html) — FIX 13
12. [international-student-dashboard.html](international-student-dashboard.html) — FIX 14

Totaal: **12 bestanden gewijzigd, 16 fixes toegepast, 0 SKIPs.**

---

## AUDIT VOLTOOID — 2026-04-30T00:00:00.000Z
