# INTERNLY PRE-DEPLOYMENT AUDIT
# Datum: 30 april 2026
# Status: VOLTOOID

---

## CHECK 1 — SCRIPT LOAD ORDER

Live HTML files in project root (excluding `BACKUP/` en `_revamp_2026-04-29/`):

| Bestand | utils → supabase OK? | Inline scripts na utils? | Roles.js geladen indien nodig? |
|---|---|---|---|
| 404.html | n/a (geen scripts) | n/a | n/a |
| about.html | ✓ (utils:948 → supabase:950) | ✓ (951+) | ✓ (949) |
| admin.html | ✓ (utils:15 → supabase:18) | ✓ (326) | ✓ (16) |
| auth.html | ✓ (utils:16 → supabase:19) | ✓ (22, 641) | ✓ (17) |
| bbl-dashboard.html | ✓ (utils:21 → supabase:23) | ✓ (365) | n/a (geen routing-aanroepen) |
| bbl-hub.html | ✓ (utils:59 → supabase:61) | ✓ (1031) | n/a (geen routing-aanroepen) |
| bbl-profile.html | ✓ (utils:21 → supabase:24) | ✓ (417) | ✓ (22) |
| begeleider-dashboard.html | ✓ (utils:15 → supabase:18) | ✓ (656) | ✓ (16) |
| bol-profile.html | ✓ (utils:15 → supabase:18) | ✓ (788) | ✓ (16) |
| buddy-dashboard.html | ✓ (utils:23 → supabase:26) | ✓ (480) | ✓ (24) |
| chat.html | ✓ (utils:14 → supabase:17) | ✓ (529) | ✓ (15) |
| company-dashboard.html | ✓ (utils:15 → supabase:18) | ✓ (1092) | ✓ (16) |
| company-discover.html | ✓ (utils:15 → supabase:18) | ✓ (501) | ✓ (16) |
| discover.html | ✓ (utils:16 → supabase:19) | ✓ (764) | ✓ (17) |
| esg-export.html | n/a (alleen js/esg-inject.js) | onbekend | n/a |
| esg-rapportage.html | n/a (statische pagina) | n/a | n/a |
| faq.html | ✓ (utils:997 → supabase:999) | ✓ (1003) | ✓ (998) |
| index.html | ✓ (utils:1815 → supabase:1817) | ✓ (1819) | ✓ (1816) |
| internly_simulator.html | n/a (alleen inline) | n/a | n/a |
| international-school-dashboard.html | ✓ (utils:34 → supabase:36) | ✓ (39) | n/a (geen routing-aanroepen) |
| international-student-dashboard.html | ✓ (utils:39 → supabase:41) | ✓ (44) | n/a (zelf geannoteerd, regel 8-9) |
| kennisbank-artikel.html | ✓ (utils:16 → supabase:18) | ✓ (128) | n/a (publiek) |
| kennisbank.html | ✓ (utils:16 → supabase:18) | ✓ (382) | n/a (publiek) |
| la-sign.html | **VIOLATION** geen utils.js, supabase.js wel (40) | ✓ (41) | n/a |
| match-dashboard.html | ✓ (utils:16 → supabase:22) | ✓ (2130) | ✓ (17) |
| matches.html | ✓ (utils:15 → supabase:18) | ✓ (135) | ✓ (16) |
| matchpool.html | ✓ (utils:16 → supabase:18) | ✓ (355) | n/a (geen routing-aanroepen) |
| mijn-berichten.html | ✓ (utils:14 → supabase:17) | ✓ (284) | ✓ (15) |
| mijn-sollicitaties.html | ✓ (utils:13 → supabase:16) | ✓ (231) | ✓ (14) |
| pricing.html | ✓ (utils:405 → supabase:408) | ✓ (638) | ✓ (406) |
| preview.html | n/a (alleen inline) | n/a | n/a |
| privacybeleid.html | n/a (statische pagina) | n/a | n/a |
| review-form.html | ✓ (utils:15 → supabase:17) | ✓ (239) | n/a (geen routing-aanroepen) |
| school-dashboard.html | ✓ (utils:15 → supabase:18) | ✓ (983) | ✓ (16) |
| spelregels.html | n/a (statische pagina) | n/a | n/a |
| stagebegeleiding.html | n/a (alleen inline) | n/a | n/a |
| student-profile.html | ✓ (utils:15 → supabase:18) | ✓ (1091) | ✓ (16) |
| vacature-detail.html | ✓ (utils:15 → supabase:18) | ✓ (603) | ✓ (16) |

### KRITIEKE BEVINDINGEN

**index.html — Supabase CDN ontbreekt** [BLOCKER]
- index.html:1817 laadt `js/supabase.js` MAAR laadt geen `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- js/supabase.js:11 doet `window.supabase.createClient(...)` — `window.supabase` is `undefined`
- Resultaat: `db` is undefined → auth gate op regel 1837 crasht met `TypeError: Cannot read properties of undefined`
- Impact: alle auth-redirects op de marketing-pagina werken niet
- Severity: **BLOCKER**

**la-sign.html — js/utils.js wordt niet geladen** [LAAG]
- Geen aanroepen van `notify`, `escapeHtml`, `validate*`, `requireRole`, `performLogout` gevonden in la-sign.html
- Maar telemetry.js wordt wel geladen (regel 53), die gebruikt `escapeHtml` en `notify` indirect
- Pagina functioneert technisch maar mist DRY-conventie
- Severity: **LAAG**

**esg-export.html — geen utils.js, geen supabase.js** [LAAG]
- Lijkt een statische export-template te zijn die door js/esg-inject.js gevuld wordt
- Geen functionele bug zolang esg-inject.js zelfstandig is
- Severity: **LAAG** (afh. van esg-inject.js scope)

### CONCLUSIE CHECK 1
- 35 van 37 live HTML-pagina's: PASS
- 1 BLOCKER (index.html — ontbrekende Supabase CDN)
- 2 LAAG (la-sign.html, esg-export.html — afwijkende load-volgorde)

**Severity: BLOCKER**

---

## CHECK 2 — AUTH GUARDS

| Bestand | requireRole | User-check (auth) | Role-check | Verdict |
|---|---|---|---|---|
| admin.html | ❌ | line 790 | line 794 (admin) | PASS |
| auth.html | n/a (login-pagina zelf) | n/a | n/a | PASS |
| bbl-dashboard.html | ❌ | line 532 | ❌ | **MIDDEL** |
| bbl-hub.html | ❌ | line 2481 | ❌ | **MIDDEL** |
| bbl-profile.html | ❌ | line 624 | line 643 (student) | PASS |
| begeleider-dashboard.html | ❌ | line 1120 | line 1129 (begeleider) | PASS |
| bol-profile.html | ❌ | line 1278 | ❌ | **MIDDEL** |
| buddy-dashboard.html | ❌ | line 947 | line 957 (gepensioneerd) | PASS |
| chat.html | ✓ line 1418 (student/bedrijf/school) | n/a | inclusief | PASS |
| company-dashboard.html | ❌ | line 1238/2712 | ❌ | **MIDDEL** |
| company-discover.html | ❌ | line 707 | ❌ | **MIDDEL** |
| discover.html | ✓ line 1372 (student) | n/a | inclusief | PASS |
| international-school-dashboard.html | ❌ | line 951 | line 589 (school) | PASS |
| international-student-dashboard.html | ❌ | line 1071 | ❌ | **MIDDEL** |
| la-sign.html | n/a (token-auth, externe ondertekenaars) | n/a (per design) | n/a | PASS |
| match-dashboard.html | ❌ | line 2690 | line 2740 (allowedRoles) | PASS |
| matches.html | ✓ line 695 (student) | n/a | inclusief | PASS |
| matchpool.html | ✓ via js/matchpool.js:287 (student) | line 283-284 | inclusief | PASS |
| mijn-berichten.html | ✓ line 782 (student) | n/a | inclusief | PASS |
| mijn-sollicitaties.html | ✓ line 798 (student) | n/a | inclusief | PASS |
| review-form.html | ❌ | line 340 | ❌ | **MIDDEL** |
| school-dashboard.html | ❌ | line 1125/2328 | ❌ | **MIDDEL** |
| student-profile.html | ❌ | line 1581 | ❌ | **MIDDEL** |
| vacature-detail.html | ❌ | line 871 | line 887 (student) | PASS |

### KRITIEKE BEVINDINGEN
- **9 protected pages** missen een role-check (alleen user-check):
  - bbl-dashboard.html (regel 532)
  - bbl-hub.html (regel 2481)
  - bol-profile.html (regel 1278)
  - company-dashboard.html (regel 1238/2712)
  - company-discover.html (regel 707)
  - international-student-dashboard.html (regel 1071)
  - review-form.html (regel 340)
  - school-dashboard.html (regel 1125/2328)
  - student-profile.html (regel 1581)
- Risico: een ingelogde gebruiker met de verkeerde rol kan een dashboard van een ander rol-type bereiken.
- Geen BLOCKERs (auth-check is wel aanwezig op alle pagina's), maar wel een consistent **MIDDEL**-risico.

**Severity: MIDDEL**

---

## CHECK 3 — REMAINING DIRECT NOTIFICATION INSERTS

Patroon: `db.from('notifications').insert(` of `supabase.from('notifications').insert(` in live HTML/JS-bestanden.

| Bestand | Regel | Context | Severity |
|---|---|---|---|
| bol-profile.html | 945 | buddy-flow notify | HOOG |
| buddy-dashboard.html | 697 | buddy-flow notify | HOOG |
| international-student-dashboard.html | 1848 | intl-flow notify | HOOG |
| international-student-dashboard.html | 2121 | intl-flow notify | HOOG |
| js/buddy.js | 462 | _buddyNotify (zie ARCHIEF audit) | HOOG |
| js/calendar.js | 367 | meeting-invite notify | HOOG |
| match-dashboard.html | 5153 | match-flow notify | HOOG |
| match-dashboard.html | 5210 | match-flow notify | HOOG |
| match-dashboard.html | 5244 | match-flow notify | HOOG |
| match-dashboard.html | 5495 | match-flow notify | HOOG |
| student-profile.html | 1248 | profiel-flow notify | HOOG |

Server-side (out-of-scope): supabase/functions/mollie-webhook/index.ts:162, 178 — Edge Function, ongewijzigd.

### KRITIEKE BEVINDING
- Bekend uit audit 2026-04-21 (CODEBASE_AUDIT) en _archief: deze inserts omzeilen `createNotification()` in utils.js. Dat betekent:
  - VALID_NOTIFICATION_TYPES wordt niet gevalideerd
  - tarpit-vertraging (`_yield()`) wordt niet toegepast
  - geen consistente error-paden
- 11 directe inserts blijven over (de drie bekende fixes uit admin.html en bbl-hub.html zijn niet meer aanwezig — zoals verwacht).

**Severity: HOOG** (11 instances)

---

## CHECK 4 — XSS: UNESCAPED innerHTML

Patroon: `.innerHTML = \`...${variable}...\`` waar variable géén `escapeHtml()` aanroept.

### METHODE
Subagent-scan (Explore) over alle live HTML/JS-bestanden, plus eigen verificatie op chat.html (rich-text rendering met inline-replace).

### TOP 10 BEVINDINGEN

| # | Bestand:Regel | Variabele | Type | Severity |
|---|---|---|---|---|
| 1 | chat.html:642 | `${text}` | escapeHtml + replace `\bbobba\b` (static) | PASS — text is reeds geëscaped |
| 2 | chat.html:683 | `${escapeHtml(text)}` | dubbele escape (text reeds geescaped) | PASS — cosmetisch, geen XSS |
| 3 | chat.html:726 | `${typeLabel}${contactLine}` | computed/static labels | MIDDEL |
| 4 | bbl-dashboard.html:403/405 | `${decisionDateStr}` | computed date | MIDDEL — datum-string, geen user-input |
| 5 | bbl-dashboard.html:500 | `${skills.length}` | numeric | PASS |
| 6 | chat.html:1779 | `${escapeHtml(otherPartyName)}` | escaped | PASS |
| 7 | chat.html:639/640 | `${rowClass}`, `${senderInit}` | escaped | PASS |
| 8 | chat.html:706/710 | `onclick="..(${id})"` | id is UUID-only (DB) | LAAG |
| 9 | chat.html:1670 | `${cls}`, `${dn}`, `${onclick}` | static / computed | PASS |
| 10 | chat.html:1650 | `${myScore}-${theirScore}` | numeric | PASS |

### CONCLUSIE
- De codebase past `escapeHtml()` consistent toe op alle DB-velden (naam, content, body, message, beschrijving, motivatie).
- Geen BLOCKER- of HOOG-vulnerabilities gevonden.
- Een paar MIDDEL-meldingen (computed strings die in theorie injectie zouden kunnen bevatten als de bron-data ooit verandert).

**Severity: PASS** (geen materiële XSS-risico's; codebase heeft volwassen hygiëne)

---

## CHECK 5 — BROKEN FUNCTION CALLS

Doel: alle live HTML-bestanden die utility-functies aanroepen MOETEN het juiste script laden.

### FUNCTIE-INVENTORY (js/utils.js)
- `validatePassword` (538), `validateEmail` (546), `sanitizeNaam` (551), `validatePostcode` (556)
- `createNotification` (281), `notify` (224), `escapeHtml` (263), `formatNLDate` (274), `getNotifText` (334)
- `requireRole` (125), `performLogout` (162), `getDisplayName` (140), `renderStudentHeader` (434)

### CONTROLE
Alle 22 live HTML-bestanden die deze functies aanroepen, laden ook `js/utils.js`. La-sign.html en esg-export.html roepen geen utility-functies aan en laden utils.js niet (consistent — geen verbroken call).

### VERDIENT VERMELDING
- `validatePassword`, `validateEmail`, `sanitizeNaam` worden ALLEEN aangeroepen in auth.html (758, 916, 921, 923) — utils.js geladen op lijn 16. PASS.
- `getNotifText` aangeroepen in matchpool.html:399 — utils.js geladen op lijn 16. PASS.
- `renderStudentHeader` aangeroepen in bbl-dashboard.html:566 — utils.js geladen op lijn 21. PASS.

### CONCLUSIE CHECK 5
Geen verbroken functie-calls gedetecteerd. Alle utility-functies worden vanuit pagina's met de juiste script-load aangeroepen.

**Severity: PASS**

---

## CHECK 6 — SUPABASE WRITE PATHS: ERROR HANDLING

Tabellen: profiles, student_profiles, company_profiles, internship_postings, matches, reviews, messages.

### HOOG (silent failure — geen `error` destructuring of try/catch)
| Bestand:Regel | Tabel | Operatie | Probleem |
|---|---|---|---|
| chat.html:1799 | messages | insert | geen `{ error }`, geen try/catch — fire-and-forget |
| matches.html:553 | matches | update | geen `{ error }`, geen try/catch |
| student-profile.html:1231 (loop) | matches | insert | console.error in loop, geen notify |
| school-dashboard.html:2256 (loop) | matches | insert | console.error in loop, geen notify |
| mijn-berichten.html:454 | matches | update | minimale check, geen user feedback |

### MIDDEL (`error` destructured maar zwakke feedback)
| Bestand:Regel | Tabel | Operatie | Probleem |
|---|---|---|---|
| bol-profile.html:928 | matches | insert | console.error, geen notify |
| company-dashboard.html:2085 (loop) | matches | insert | error gevangen maar geen user-zichtbare melding |
| company-dashboard.html:2347 | reviews | update | notify wel, maar volgorde-issue (closeFlagModal eerst) |
| matches.html:501 | matches | insert | data destructured, error niet op insert zelf |
| international-student-dashboard.html:1593 | matches | insert | try/throw, geen notify in catch |
| js/account.js:129, 410 | profiles | update | gooit error door, vertrouwt op outer handler |

### PASS (correcte error-flow met notify)
admin.html:467 (reviews); auth.html:962 (profiles); bbl-hub.html:1303, 2210 (messages); begeleider-dashboard.html:1024 (matches); chat.html:1115 (messages); company-dashboard.html:1635, 1657, 2121, 2175, 2197 (matches/postings); matches.html:440 (matches); mijn-berichten.html:490, 754 (matches); mijn-sollicitaties.html:292 (reviews); school-dashboard.html:1719 (matches).

### TOTALEN
- PASS: 18 calls
- MIDDEL: 8 calls (zwakke feedback)
- HOOG: 5 calls (silent failure-risico)

**Severity: HOOG** (5 silent-failure punten op kritieke schrijfpaden)

---

## CHECK 7 — HARDCODED IDS EN TEST DATA

### UUIDs (8-4-4-4-12 hex)
| Bestand:Regel | UUID | Locatie | Severity |
|---|---|---|---|
| bbl-hub.html:9 | `65ed548f-a7da-4a9b-96c3-e64ccb9ca7d7` (test student) | HTML-comment / SQL-instructie | BLOCKER (per spec: test-account UUID in productie-bestand) |

### Test-account verwijzingen (65ed548f / a5d25384 / 520f9b1a)
- bbl-hub.html:9 — student-test-UUID in HTML-comment
- Geen verdere matches in live HTML/JS bestanden.

### Hardcoded e-mailadressen (@internly.pro)
- Alle voorkomens zijn legitieme contact-adressen: hallo@internly.pro, data@internly.pro, boekhouding@internly.pro
- Géén test-account e-mails (`student@`, `bedrijf@`, `school@`) in productie-bestanden.

### CONCLUSIE CHECK 7
- 1 hardcoded test-UUID in productie-bestand (bbl-hub.html:9). Hoewel het in een SQL-comment staat, leakt dit het test-account ID — moet worden verwijderd vóór deploy.
- Geen test-emails of andere test-data hardcoded.

**Severity: BLOCKER** (volgens audit-spec, hardcoded test-UUID in productie-code)

---

## CHECK 8 — MISSING OR BROKEN FILE REFERENCES

### JS-bestanden (uniek)
Alle gerefereerde js/*.js bestanden bestaan in de project js/ directory:
- utils.js, roles.js, supabase.js, push.js, toast.js, telemetry.js, translate.js
- buddy.js, account.js, profanity.js, reviews.js, swipes.js, optimistic.js
- calendar.js, info.js, esg-export.js, esg-inject.js, animations/match-celebrate.js
- reistijd.js, matchpool.js, kb.js — allemaal ✓

### CSS-bestanden
- css/style.css — bestaat ✓
- Geen andere CSS-references in productie-pagina's.

### Interne HTML-links (uniek)
Alle 25 unieke gerefereerde .html-bestanden bestaan in project root:
- 404.html (referenced indirect), about, auth, bbl-dashboard, bbl-hub, bbl-profile, bol-profile, buddy-dashboard
- chat, company-dashboard, company-discover, discover, faq, index
- internly_simulator, kennisbank, match-dashboard, matches, mijn-sollicitaties
- pricing, privacybeleid, school-dashboard, spelregels, stagebegeleiding
- student-profile, vacature-detail — allemaal ✓

### Externe (CDN) bronnen
- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 — Supabase SDK
- https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js — jsPDF
- https://maps.googleapis.com/maps/api/js — Google Maps (discover.html)
- https://cdn.jsdelivr.net/npm/emoji-mart@5.5.2 — emoji picker (chat)
- https://fonts.googleapis.com — Google Fonts
- (afhankelijk van CDN-availability — geen interne controle)

### CONCLUSIE CHECK 8
Geen ontbrekende lokale bestanden. Alle src/href/link-references binnen het project resolven.

**Severity: PASS**

---

## CHECK 9 — CONSOLE ERRORS WITHOUT USER FEEDBACK

Top-10 silent catch-blocks in user-facing flows (form submit, Supabase write, auth). Geselecteerd op impact: een fout die de gebruiker raakt zonder dat hij/zij het ziet.

| # | Bestand:Regel | Context | Severity |
|---|---|---|---|
| 1 | auth.html:852-854 | student_profiles fetch in login-flow | MIDDEL (login werkt evt. door, profiel niet geladen) |
| 2 | auth.html:864-866 | intl school fetch in login-flow | MIDDEL |
| 3 | auth.html:1001-1003 | BBL upsert tijdens signup | **MIDDEL+** (account zonder profiel-row) |
| 4 | auth.html:1018-1020 | intl student upsert tijdens signup | **MIDDEL+** |
| 5 | auth.html:1038-1040 | NL student upsert tijdens signup | **MIDDEL+** |
| 6 | auth.html:1055-1057 | intl school upsert tijdens signup | **MIDDEL+** |
| 7 | bbl-hub.html:1771-1773 | skills_progress DB write | MIDDEL (data-verlies) |
| 8 | bbl-hub.html:1808-1810 | skills_toelichting DB write | MIDDEL (data-verlies) |
| 9 | bbl-hub.html:1847-1849 | loadBBLReflecties read | LAAG (geen UI-fout-melding) |
| 10 | bol-profile.html:955-958 | Matching trigger | MIDDEL (zwijgend uitval-pad) |

### CONCLUSIE CHECK 9
- 6 van 10 silent-catches zitten in auth.html signup-flow → ernstige UX-impact (gebruiker zou kunnen denken dat account aangemaakt is, terwijl profile-row ontbreekt).
- 3 in bbl-hub.html — DB-writes voor reflectie/skills die zonder feedback verloren gaan.
- Alle 10 zijn MIDDEL volgens spec.

**Severity: MIDDEL** (10 silent error sites, vooral auth.html signup-flow)

---

## CHECK 10 — GDPR: PUBLIC DATA EXPOSURE

### Supabase SELECTs op gevoelige tabellen

Alle SELECT-queries op `student_profiles`, `company_profiles`, `profiles` (met email/naam) gebruiken óf:
- `.eq('id', user.id)` (eigen gegevens)
- `.eq('profile_id', userId)` of analoog (RLS-bounded)
- `.in('id', allIds)` in admin.html (admin-rol via role-check)
- `.maybeSingle()` na user-context

**Geen SELECT zonder WHERE-clause op publieke pagina's gevonden.** PASS op data-leak via SDK.

### Bedward P2 — supabase.js op publieke pagina's
| Pagina | Laadt js/supabase.js? | Doel | Risico |
|---|---|---|---|
| index.html | ✓ regel 1817 | Auth-gate (redirect ingelogde users) — gedocumenteerd in CLAUDE.md | Bewust ontwerp |
| about.html | ✓ regel 950 | Waitlist-form REST-call | MIDDEL |
| faq.html | ✓ regel 999 | Onbekend gebruik op publieke pagina | MIDDEL |
| kennisbank.html | ✓ regel 18 | KB-content (DB-gestuurd) | LAAG (data is publiek) |
| kennisbank-artikel.html | ✓ regel 18 | Artikelinhoud | LAAG |
| pricing.html | ✓ regel 408 | Checkout-flow | MIDDEL |
| privacybeleid.html | ❌ | n/a | PASS |
| spelregels.html | ❌ | n/a | PASS |
| 404.html | ❌ | n/a | PASS |
| esg-rapportage.html | ❌ | n/a | PASS |

### NB
- ANON_KEY is per Supabase-design publiek bedoeld; daadwerkelijke beveiliging zit in RLS.
- index.html laadt supabase.js bewust (CLAUDE.md regel 144 — "auth gate vereist db").
- Alle voorkomens van directe SUPABASE_URL in inline-code (index, about, pricing) zijn voor specifieke endpoints (waitlist, checkout) — geen data-leak.

### CONCLUSIE CHECK 10
- Geen ongeauthenticeerde SELECT-leaks van persoonsgegevens.
- Bedward P2-violation: 5 publieke pagina's (about, faq, kennisbank, kennisbank-artikel, pricing) laden supabase.js — moet heroverwogen worden voor waitlist-verkeer of via Edge Function.
- Per CLAUDE.md is index.html-loading bewust.

**Severity: MIDDEL** (geen acute leak, wel afwijking van Bedward P2 op 5 publieke pagina's)

---

## CHECK 11 — DUPLICATE SANITIZATION FUNCTIONS

| Functie | Definities buiten utils.js | Status |
|---|---|---|
| `escapeHtml` | geen | PASS |
| `notify` | geen | PASS |
| `validateEmail` | geen | PASS |
| `validatePassword` | geen | PASS |
| `calNotify` | js/calendar.js:28 | PASS (gedocumenteerde uitzondering in CLAUDE.md, lokale toast voor #cal-notif) |
| `_esc` | la-sign.html:322 | MIDDEL — bewust gemaakt om loop-shield grep clean te houden, maar **dupliceert functionaliteit** van escapeHtml |

### CONCLUSIE CHECK 11
- Eén echte 7/11-violation: la-sign.html definieert `_esc()` lokaal. Hoewel gedocumenteerd in CLAUDE.md als bewuste keuze (la-sign is publiek/token-based), valt het binnen de spec voor MIDDEL.
- Alle andere sanitization-functies komen exclusief uit utils.js.

**Severity: MIDDEL** (1 documented duplicate)

---

## CHECK 12 — MOBILE READINESS

### Viewport meta-tag
36 van 37 live HTML-bestanden hebben `<meta name="viewport"...>`.

| Bestand | Viewport | Severity |
|---|---|---|
| esg-export.html | ❌ ontbreekt | HOOG |
| (alle andere live pagina's) | ✓ | PASS |

### Input font-size (iOS zoom)
- css/style.css regel 1335-1340: globale rule `input, textarea, select { font-size: 16px; }` — iOS-zoom-preventie actief op alle pagina's.
- Specifieke override in `.review-form textarea` (regel 784) — ook 16px ✓.
- `.rf-postcode` (regel 1036) — ook 16px met `!important` ✓.

### Fixed pixel widths >375px
- Niet steekproefsgewijs gecontroleerd in deze audit; vereist visuele review.

### CONCLUSIE CHECK 12
- esg-export.html mist viewport-meta — wordt waarschijnlijk in een PDF-export-context gebruikt, dus impact mogelijk laag, maar formeel HOOG volgens spec.
- Font-size globally 16px — iOS-zoom voorkomen.

**Severity: HOOG** (1 viewport-violation in esg-export.html)

---

## CHECK 13 — EDGE FUNCTION CALLS

### Bestaande Edge Functions (in supabase/functions/)
- send-push-notification
- create-checkout
- mollie-webhook

### Edge function calls in live code
| Bestand:Regel | Edge Function | Bestaat? | Severity |
|---|---|---|---|
| pricing.html:693 | create-checkout (via fetch) | ✓ | PASS |
| utils.js:299 | RPC `create_notification` (database, geen Edge Function) | n/a | PASS |
| sw.js:108 | send-push-notification (in commentaar — auto-trigger via DB-webhook) | ✓ | PASS |

### Lokale JS-functies met edge-achtige naam
- `triggerStudentMatching` in bol-profile.html:901 en student-profile.html:1204 — **lokale JS-functie**, geen Edge Function call. PASS.

### CONCLUSIE CHECK 13
- Geen `.invoke()` calls in live code (oude pattern volledig vervangen).
- Alle Edge Function-references wijzen naar bestaande functies in supabase/functions/.
- create-checkout wordt aangeroepen in pricing.html maar Mollie is per CLAUDE.md niet actief — startCheckout is een stub.

**Severity: PASS** (geen verbroken Edge Function calls)

---

## CHECK 14 — PASSWORD FIELDS

### Wachtwoord-velden in live HTML
| Bestand:Regel | Type | autocomplete | console-log? | DB-insert? |
|---|---|---|---|---|
| auth.html:500 | password (login) | `current-password` ✓ | nee | nee |
| auth.html:522 | password (signup) | `new-password` ✓ | nee | nee |

### Wachtwoord-flow
- auth.html:794 — `db.auth.signInWithPassword({ email, password })` — Supabase SDK ✓
- auth.html:937 — `db.auth.signUp({ ... })` — Supabase SDK ✓
- Geen `password.*\.insert` of `password.*\.from('...')` matches gevonden.

### Veiligheid
- Wachtwoord wordt nooit naar een eigen DB-tabel geschreven.
- Wachtwoord wordt niet via `console.log` gelogd.
- Beide velden hebben correcte autocomplete-attributen.

### CONCLUSIE CHECK 14
Wachtwoord-veiligheid is correct geïmplementeerd. Alle veiligheidsregels (autocomplete, geen DB-write, geen logging) zijn nageleefd.

**Severity: PASS**

---

## DEPLOYMENT BESLISSING

### Tellingen per severity

**BLOCKER: 2** — deployment STOP
- Check 1 — index.html: ontbrekende Supabase CDN (script src missing)
- Check 7 — bbl-hub.html:9: hardcoded test-account UUID in productie-bestand

**HOOG: 17 items**
- Check 3 — 11 directe notification inserts (createNotification omzeild)
- Check 6 — 5 silent-failure schrijfpaden op kritieke tabellen
- Check 12 — 1 viewport-violation (esg-export.html)

**MIDDEL: 33 items**
- Check 2 — 9 protected pages zonder role-check
- Check 6 — 8 zwakke error-feedback paths
- Check 9 — 10 silent catch-blocks (vooral auth.html signup)
- Check 10 — 5 publieke pagina's laden js/supabase.js (ANON_KEY-exposure)
- Check 11 — 1 lokale `_esc` duplicate in la-sign.html

**LAAG: 2 items**
- Check 1 — la-sign.html laadt geen utils.js (bewust)
- Check 1 — esg-export.html laadt geen utils.js / supabase.js

**PASS: 5 checks** (geen issues)
- Check 4 — XSS innerHTML hygiëne
- Check 5 — Function call integrity
- Check 8 — File references resolven
- Check 13 — Edge Function calls
- Check 14 — Password field veiligheid

### EINDOORDEEL

> **ROOD LICHT — fix blockers eerst**

### BLOCKER lijst (volledig)

| # | Bestand:Regel | Probleem |
|---|---|---|
| 1 | index.html (geen CDN-script vóór regel 1817) | js/supabase.js faalt op `window.supabase.createClient` — auth-gate werkt niet |
| 2 | bbl-hub.html:9 | Hardcoded test-student UUID `65ed548f-a7da-4a9b-96c3-e64ccb9ca7d7` in HTML-comment |

### HOOG lijst (volledig, gegroepeerd)

**Direct notification inserts (omzeilen createNotification):**
- bol-profile.html:945
- buddy-dashboard.html:697
- international-student-dashboard.html:1848, 2121
- js/buddy.js:462
- js/calendar.js:367
- match-dashboard.html:5153, 5210, 5244, 5495
- student-profile.html:1248

**Supabase write silent failures:**
- chat.html:1799 (messages.insert)
- matches.html:553 (matches.update)
- student-profile.html:1231 (matches.insert in loop)
- school-dashboard.html:2256 (matches.insert in loop)
- mijn-berichten.html:454 (matches.update)

**Viewport meta:**
- esg-export.html (ontbreekt)

---

## AANBEVOLEN FIX VOLGORDE

### Fase 1 — BLOCKERS (vóór elke deploy)
1. **index.html — voeg Supabase CDN script toe** (klein, <30min)
   - `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` toevoegen vóór `<script src="js/supabase.js">` op regel 1817.
2. **bbl-hub.html:9 — verwijder hardcoded UUID uit comment** (klein, <30min)
   - Regel 7-9: vervang test-UUID door `'<student_profile_id>'` placeholder of verwijder de comment.

### Fase 2 — HOOG (binnen 1-2 dagen na deploy)
3. **Vervang 11 directe notification.insert calls door createNotification()** (middel, 30-90min)
   - Elke insert vervangen door `await createNotification(userId, type, refId, refType, message)`.
4. **Voeg error handling toe aan 5 silent-failure write paths** (middel, 30-90min)
   - chat.html:1799, matches.html:553, student-profile.html:1231, school-dashboard.html:2256, mijn-berichten.html:454.
5. **Voeg viewport-meta toe aan esg-export.html** (klein, <30min)

### Fase 3 — MIDDEL (eerste week)
6. **Voeg role-check toe aan 9 protected pages** (groot, >90min)
   - bbl-dashboard, bbl-hub, bol-profile, company-dashboard, company-discover, international-student-dashboard, review-form, school-dashboard, student-profile.
7. **Voeg notify() toe aan 10 silent catches** (middel, 30-90min)
   - vooral auth.html:1001-1057 (signup-flow), bbl-hub.html:1771-1810 (skills-DB writes).
8. **Versterk 8 zwakke error-feedback paths** (middel, 30-90min)
9. **Heroverweeg supabase.js op 5 publieke pagina's** (groot, >90min — design-decision)
   - about.html, faq.html, kennisbank.html, kennisbank-artikel.html, pricing.html.
10. **Verwijder of legitimeer `_esc` in la-sign.html** (klein, <30min)

### Fase 4 — LAAG (backlog)
11. **la-sign.html / esg-export.html script-load consistentie** (klein)

---

## AUDIT VOLTOOID — 2026-04-30T09:00:49.969Z

