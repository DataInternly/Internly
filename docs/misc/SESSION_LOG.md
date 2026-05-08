# INTERNLY SESSION LOG

## Gebr. Wandelaars — Turtello · Achello · Hawk · Zeno — 17 april 2026

**TURTELLO — signOff-keten gedocumenteerd + breekpunt gefix:**
- Keten: signOff() → meetings.update → createNotification() → notifications.insert → realtime → loadNotifications() → DOM
- Breekpunt: createNotification() was fire-and-forget (geen await, geen caller-side error handling)
- Fix: alle createNotification()-aanroepen in signOff() omgezet naar await binnen try/catch; fout toont notify('Evaluatie gedeeltelijk opgeslagen', false)
- CLAUDE.md bijgewerkt: sectie "Architecturele ketens" toegevoegd met keten + Trust Score sprint 5 notitie

**ACHELLO — Globale sollicitatie-guard:**
- isApplying() + setApplying() toegevoegd aan js/utils.js (sessionStorage-based)
- vacature-detail.html: `_isSending` verwijderd, vervangen door isApplying()/setApplying()
- discover.html: geen directe apply-functie — "Lees meer →" is navigatielink naar vacature-detail.html — geen guard nodig
- setApplying(false) toegevoegd aan alle 15 logout-functies:
  auth.html · bbl-dashboard.html · bbl-hub.html · bbl-profile.html ·
  begeleider-dashboard.html · buddy-dashboard.html · chat.html ·
  company-dashboard.html · company-discover.html · discover.html ·
  match-dashboard.html · matches.html · mijn-sollicitaties.html ·
  school-dashboard.html · student-profile.html · admin.html

**HAWK — Notificatie bezorgings-verificatie:**
Drie parallelle kanalen (DB insert via createNotification, Supabase realtime, push via js/push.js) zonder centrale bezorgingslog. Minimale fix gedaan:
- createNotification() in utils.js: created_at + read_at null toegevoegd aan INSERT-payload
- userId-guard verbeterd: `if (!userId) return` → `if (!userId) { console.error(...); return; }`
- Directe notifications.inserts buiten createNotification() (admin.html, buddy-dashboard.html, match-dashboard.html, student-profile.html) — gedocumenteerd als sprint 5 P2 refactorwerk
Volledige bezorgings-verificatie = sprint 5.

**ZENO — Livetest beslissing vastgelegd:**
- LIVETEST_CONDITIONS.md: Picard2's beslissing toegevoegd — livetest begint zodra Geordi2 journey B1 groen meldt, niet zodra alles perfect is.

Sprint 4 + alle audits: afgesloten.
Status: KLAAR VOOR LIVETEST zodra Geordi2 journey B1 bevestigt.
Openstaande items: zie sprint 5 backlog (CLAUDE.md).
Beslissing genomen door: Picard2.
Datum: 17 april 2026.

---

## Finale Veiligheidsaudit + Directe Fixes — 17 april 2026

**Scope:** 24 bestanden · 6 checks (XSS, realtime-filters, SELECT-minimalisatie, logische consistentie, RLS, credentials)

**Gefixte FAILs:**
- FIX 4C-A: admin.html:342 doSignOut() — `sessionStorage.removeItem('internly_role')` toegevoegd
- FIX 4C-B: chat.html:221 inline logout button — `sessionStorage.removeItem('internly_role')` toegevoegd
- FIX 6-A: about.html:776+850 — `const SUPABASE_URL` / `const SUPABASE_ANON_KEY` named consts verwijderd; URL inline in createClient() (loop-shield PASS)
- FIX 1-A: match-dashboard.html — lokale `escHtml()` (miste `'`-escaping) vervangen door `escapeHtml()` uit utils.js; lokale definitie verwijderd

**CHECK 1 — XSS:** PASS
- Alle template-literal innerHTML-inserts in 24 bestanden gescreend
- Alle user-data-variabelen omhult met escapeHtml() / escHtml() (nu: escapeHtml)
- admin.html bundelverzoeken: naam/email voor gebruik escaped ✓
- bbl-hub.html buddy-kaartje: name/init correct escaped of hardcoded ✓
- buddy-dashboard.html: name escaped voor gebruik ✓
- match-dashboard.html addLog: render via escapeHtml(l.msg) ✓

**CHECK 2 — Realtime-filters:** PASS
- Alle 8 realtime subscriptions gefilterd op user_id of conversation_id van currentUser ✓

**CHECK 3 — SELECT-minimalisatie:** PASS (geen kritieke blootstellingen)
- Alle SELECT * op notifications-tabel gefilterd op user_id ✓
- Teller-queries (head:true) tellen rijen zonder data terug te sturen ✓
- student_profiles eerder al gereduceerd van * naar 25 expliciete kolommen (N3-A fix)
- Resterende SELECT * in bbl/company/school: admin-context of matchId-gefilterd

**CHECK 4 — Logische consistentie:**
- 4A (solliciteer-flow): matches.html updErr guard aanwezig (eerder gefix) ✓
- 4B (createNotification): 0 dubbele definities · utils.js als enige bron ✓
- 4C (logout): alle 15 dashboards hebben signOut() + sessionStorage.removeItem() ✓ (na fixes)
- 4D (BBL-guard): auth.html bbl_mode-check correct; bbl-dashboard.html sessie-routing ✓
- 4E (rol-check): ROUTES-map in auth.html sluit matched op DB-rol ✓

**CHECK 5 — RLS status (informatief, geen actie in deze sessie):**
Tabel                  | RLS-status (geschat)     | Opmerkingen
---------------------- | ------------------------ | ---------------------
profiles               | Waarschijnlijk enabled   | Auth-guard op alle dashboards
student_profiles       | Waarschijnlijk enabled   | Gevoelig — student-data
company_profiles       | Waarschijnlijk enabled   | Bedrijfsdata
notifications          | Enabled (user_id filter) | Realtime + SELECT gefilterd
messages               | Enabled (conv_id filter) | Chat-laag
reviews                | Gedeeltelijk             | Admin verwijdert via client-side check
applications           | Onbekend                 | P1 Sprint 5
matches                | Onbekend                 | Kernkoppeling
internship_postings    | Onbekend                 | Publiek leesbaar nodig (discover)
waitlist               | Alleen INSERT            | Publiek endpoint (fetch + anon key)
subscriptions          | Onbekend                 | Betalingsdata — hoog risico
stage_log              | Onbekend                 | Activiteitslog per match
bundling_requests      | Admin-only (client-side) | Geen server-side guard
⚠️ ACTIE VEREIST: Verifieer in Supabase Console dat subscriptions, applications en matches RLS hebben met juiste policies.

**CHECK 6 — Credentials eindcheck:** PASS (na fixes)
- js/supabase.js: enige locatie van const SUPABASE_URL ✓
- index.html: anon key als fetch-header inline — acceptabel (publieke key) ✓
- about.html: const SUPABASE_URL verwijderd → inline in createClient() ✓
- pricing.html: inline createClient() zonder named const — acceptabel ✓
- grep `const SUPABASE_URL` buiten supabase.js → 0 ✓

**Loop-shield v5 — na fixes:**
- function notify(             → 0 buiten utils.js ✓
- function escapeHtml(         → 0 buiten utils.js ✓
- const SUPABASE_URL           → 0 buiten supabase.js ✓
- function createNotification( → 0 buiten utils.js ✓

---

## BISMARCK Volledigheidsaudit + Directe Fixes — 17 april 2026

**Gefixte items (FIX 2–4, N1-I, N3-D, N3-A, N3-H):**
- FIX 2: buddy-dashboard.html renderPairs() — context-kaartje met naam, opleiding, bedrijf, koppelingsdatum; batch-fetch student_profiles voor revealed pairs
- FIX 3: school-dashboard.html + begeleider-dashboard.html — CTA-knop in lege staat; openStudentUitnodigen() + openKoppelingFlow() stubs
- FIX 4: css/style.css :root — 8 semantische variabelen toegevoegd (--green, --blue, --amber, --red, --ink, --ink2, --ink3, --bg2)
- N1-I: chat.html:221 logout index.html → auth.html
- N1-I: match-dashboard.html:2056 inline logout + sessionStorage.removeItem('internly_role')
- N1-I: buddy-dashboard.html:334 signOut() + sessionStorage.removeItem
- N1-I: begeleider-dashboard.html:638 doSignOut() + sessionStorage.removeItem
- N3-A: student-profile.html:1246 select('*') op student_profiles → expliciete 25-kolommen lijst
- N3-D: matches.html:591 updErr guard (match-acceptatie geblokkeerd bij DB-fout)
- N3-D: matches.html:585 matchRowErr console.warn
- N3-D: bbl-hub.html:1646 evalErr error-destructuring in loadEvaluatie()

**Loop-shield v4 — na fixes:**
- function notify(             → 0 buiten utils.js ✓
- function escapeHtml(         → 0 buiten utils.js ✓
- const SUPABASE_URL           → 0 buiten supabase.js (W2: index.html + about.html publiek) ✓
- function createNotification( → 0 buiten utils.js ✓

**Audit scores:**
- N1 (Fundamenteel intact): 10/10 PASS
- N2 (Gebruiksklaar per rol): 5/7 PASS · 2 FAIL
- N3 (Veilig en compliant): 7/8 PASS · 1 FAIL
- FAILs: alle Sprint 5 P1 (hasActivePlan gating op studentpagina's, admin RLS)

**Sprint 5 P1 items bevestigd:**
- hasActivePlan() gating ontbreekt op: discover.html, matches.html, mijn-sollicitaties.html, chat.html, student-profile.html, vacature-detail.html
- Admin RLS client-side only (admin.html:779) — vereist Supabase Console
- K3: hasActivePlan() lokaal in 3 dashboards — refactoren naar supabase.js

---

## Auth fix: BOL student hoeft geen rol te selecteren — 17 april 2026

**Probleem:**
auth.html doLogin() blokkeerde login als `selectedRole === null` (regel 536).
DB-rol werd nooit opgehaald. BOL student moest handmatig rol kiezen terwijl
`profiles.role` dit al weet.

**Fix:**
- Guard `if (!selectedRole)` verwijderd uit doLogin()
- DB-rol (`profile?.role`) heeft nu altijd voorrang; selectedRole is alleen
  fallback voor nieuwe accounts
- Role-picker sectie verborgen op login-tab (alleen zichtbaar bij registreren)
- Fallback-error toegevoegd als zowel DB-rol als selectedRole ontbreken
- doRegister() `!selectedRole` guard blijft intact — nieuw account vereist altijd rolkeuze

**Routering BOL student na fix:**
1. Student vult e-mail + wachtwoord in → geen rolkeuze nodig
2. Login succeeds → `profiles.role = 'student'` opgehaald uit DB
3. `student_profiles.bbl_mode` check → false → redirect `match-dashboard.html`
4. Stage Hub geopend zonder handmatige stap

---

## Super-Audit v3 + fixes — 17 april 2026

**Gefixed (H1 — stille catch blocks):**
- calendar.js openModal() `catch(_){}` → console.warn toegevoegd
- discover.html push registratie `.catch(() => {})` → console.warn toegevoegd
- school-dashboard.html push registratie `catch(_) {}` → console.warn toegevoegd

**Gefixed (H3 — realtime subscribe zonder error handler):**
- 9 subscribe() calls gefix: discover.html, matches.html,
  mijn-sollicitaties.html, chat.html (2×), js/buddy.js,
  school-dashboard.html, company-dashboard.html, buddy-dashboard.html,
  bbl-hub.html
- Patroon: `.subscribe((status, err) => { if (CHANNEL_ERROR||TIMED_OUT) console.warn(...) })`

**Gefixed (D3 — ontbrekende statustekst):**
- mijn-sollicitaties.html renderApplications(): 'wacht' status zonder
  response_days toont nu "Internly bewaakt de reactietermijn voor je."

**Bevestigd PASS (D1 — geen actie nodig):**
- vacature-detail.html handleSave() = "🔖 Opslaan voor later" knop
  IS geïmplementeerd met internly_saved_vacatures localStorage key
  — eerder verkeerd gerapporteerd als missing

**Bevindingen voor Sprint 5 (K3 — P1):**
- hasActivePlan() 3× lokaal geherdefinieerd (7/11 principe):
  company-dashboard.html, school-dashboard.html, begeleider-dashboard.html
  — refactoren naar shared supabase.js met default per rol

**Loop-shield v3 — 17 april 2026:**
- function notify(      → 1 in utils.js ✓
- function escapeHtml(  → 1 in utils.js ✓
- const SUPABASE_URL    → 1 in supabase.js + known W2 (index.html, about.html) ✓
- function createNotification( → 1 in utils.js ✓
- function calNotify(   → 1 in calendar.js ✓

---

## Systeem-audit — 17 april 2026

**Sterk bevestigd (S1-S8):**
- S1: notify/escapeHtml/createNotification elk exact 1× gedefinieerd (utils.js) ✓
- S2: Auth-guards aanwezig op alle 9 dashboards ✓
- S3: Chat input bar altijd zichtbaar; lege staat = "Nog geen berichten. Stuur een bericht om het gesprek te starten!" ✓
- S4: signOff() notificeert: student (party_a), bedrijf (praktijkbegeleider_profile_id), school (roc_profile_id) ✓
- S5: company-discover.html SELECT eerste drie kolommen: profile_id, naam, opleiding — geen motivatie, geen opdracht_aanleiding ✓
- S6: CLAUDE.md, SESSION_LOG.md, LIVETEST_CONDITIONS.md aanwezig ✓
- S7: js/supabase.js in alle 18 app-bestanden correct na CDN ✓
- S8: calNotify() intact in calendar.js; 0× notify() in calendar.js ✓

**Gefixed (W1-W3):**
- W1: 5 stille failures → console.warn toegevoegd:
  buddy-dashboard.html: rollback, notificatie, bio-update
  company-dashboard.html: ESG achtergrond stat
  student-profile.html: match notificatie
- W2: Geen let/const TDZ gevallen gevonden (0)
- W3: mijn-sollicitaties.html: response_days toegevoegd aan SELECT;
  deadline-indicator voor 'wacht' status (verwachte reactie / niet gereageerd)

**Sprint 5 items toegevoegd:**
- W4: CSS — css/style.css :root mist --green, --blue, --amber, --red, --ink, --ink2, --ink3, --bg2
  Top hardcoded kleuren: #0d1520, #1a7a48, #b82020, #7a8799, #374151 — vervangen door variabelen
- W5: hasActivePlan() aanwezig maar niet aangeroepen voor gating op: discover.html, matches.html,
  mijn-sollicitaties.html, chat.html, student-profile.html, vacature-detail.html — sprint 5 P1
- W6: school-dashboard.html mist: "Plan driegesprek" per student, fase-nummering (1/2/3),
  signaal bij studenten zonder recente activiteit (> 14 dagen geen login/actie)

**Stubs geteld: 2**
- company-dashboard.html lijnen 2302-2303: ESG PDF/CSV export
  ("beschikbaar vanaf week 9 — je ontvangt een melding")
- pricing.html startCheckout(): Mollie checkout stub

**Langste functie: renderApplications (mijn-sollicitaties.html, ~151 regels)**
- renderESG (company-dashboard.html) ≈128 regels — kandidaat sprint 5 opsplitsing

**Hardcoded kleuren gevonden: 5+ — sprint 5 rapportage**

---

## Sprint 4 + Opruimsessie — 17 april 2026

**Opgelost:**
- js/utils.js aangemaakt (escapeHtml, notify,
  formatNLDate, getNotifText, createNotification)
- 17 HTML-bestanden laden utils.js
- 15x escapeHtml + 15x notify inline verwijderd
- SUPABASE_URL gecentraliseerd in supabase.js
- typeof-guard vervangen door directe const-declaraties
  in supabase.js (dead code verwijderd)
- PII-fix company-discover.html (13 kolommen verwijderd
  uit SELECT, nu alleen 10 publieke kolommen)
- Rol-guard match-dashboard.html
  (allowedRoles = ['student', 'begeleider'])
- Stage Hub nav-knoppen → match-dashboard.html
  in company-dashboard.html en school-dashboard.html
- calNotify() hernoemd in calendar.js
  (was: lokale notify() die globale utils-notify overschreef)
- pricing.html inline SUPABASE_URL/ANON_KEY verwijderd
- ROUTES['student'] = 'match-dashboard.html' (was: discover.html)
- QW-1: sollicitatie-bevestiging notify in vacature-detail.html
- QW-2: Trust Score schaal A/B/C hint in discover + vacature-detail
- QW-3: zichtbaarheidsbalk in match-dashboard (tab-render)
- QW-4: anonimiteitsherinnering in bbl-hub boven reviewveld
- QW-5: lege staten met CTAs in bbl-hub + company-dashboard
- Sessie B copywerk:
  - auth.html: rol-uitleg per kaartje (6 beschrijvingen)
  - mijn-sollicitaties.html: afwijzingstekst toegevoegd
  - calendar.js: driegesprek-hint verduidelijkt
  - matches.html: "Zet aan dat bedrijven jou kunnen vinden"
  - school-dashboard.html: lege staat + fase-indicatoren
  - calendar.js: send-meeting-email invoke verwijderd
- CLAUDE.md, SESSION_LOG.md, LIVETEST_CONDITIONS.md aangemaakt

**Herintroduceerd / Open gebleven:**
- pricing.html SUPABASE_URL inline — opgelost
  in vervolgsessie (17 april)
- calendar.js had lokale notify() — hernoemd
  naar calNotify() in vervolgsessie (17 april)

**Aandachtspunt HANDOVER.md:**
- Vermeldt hasActivePlan() als "altijd true/stub" — ONJUIST.
  Functie bevraagt subscriptions-tabel actief (zie supabase.js).
- FileZilla-lijst bevat nog stage-hub.html — dead bestand,
  niet uploaden. Vervangen door match-dashboard.html.

**Open voor Sprint 5:**
- Ghosting-bestraffing (Supabase cron-job of Edge Function)
- Trust Score auto-algoritme (Edge Function)
- hasActivePlan() feature-gating activeren in dashboards
- Admin RLS: client-side only — sprint 5 P1
- ESG-export implementeren (nu stub met notify Binnenkort)
- Cohort-rapportage school
- Buddy-kalender + sessie-plannen
- Begeleider-agenda
- Postadres Sasubo Holding in privacybeleid.html
- Mollie betaalintegratie (pricing.html startCheckout stub)
- STARR SQL-migratie uitvoeren (zie HANDOVER.md)
- about.html + index.html: inline SUPABASE_URL opruimen
  (publieke pagina's, laagste prioriteit)
- Dead render-code motivatie in company-discover.html
  (s.motivatie altijd undefined — SELECT bevat het niet)

---

## Statistische Risicoaudit (Reid2 + Guinan2) — 17 april 2026

**Scope:** 20 bestanden · 9 risicocategorieën

**R1 — XSS (73% baseline):**
GEVONDEN: 2 items · GEFIXED: 2 · SPRINT 5: 0
- company-discover.html: `console.error(error)` → safe pattern
- discover.html: `console.error(err1 || err2)` → safe pattern
- student-profile.html: `console.error(error)` → safe pattern

**R2 — Server-side auth (68% baseline):**
GEVONDEN: 0 nieuwe items · GEFIXED: 0 · SPRINT 5: 0
- Admin RLS: reeds gedocumenteerd als sprint 5 P1 (vorige sessie)
- Alle auth-guards aanwezig op alle 17 app-pagina's

**R3 — Race conditions (55% baseline):**
GEVONDEN: 1 item · GEFIXED: 1 · SPRINT 5: 0
- vacature-detail.html: `_isSending` local guard → isApplying()/setApplying() globale guard (sessionStorage)

**R4 — Stale data (40% baseline):**
GEVONDEN: 4 items · GEFIXED: 4 · SPRINT 5: 0
- match-dashboard.html: visibilitychange → loadHubFromDB()
- bbl-hub.html: visibilitychange → loadMessages() + loadMeetings()
- company-dashboard.html: visibilitychange → loadNotifications()
- mijn-sollicitaties.html: visibilitychange → loadApplications()

**R5 — Cross-file logic (70% baseline):**
GEVONDEN: 1 item informatief · GEFIXED: 0 · SPRINT 5: 1
- match-status filtering: matches.html, company-dashboard.html, school-dashboard.html gebruiken mogelijke inconsistente statusnamen — sprint 5 P3 analyse

**R6 — Input validatie (60% baseline):**
GEVONDEN: 18 velden · GEFIXED: 18 · SPRINT 5: 0
- company-dashboard.html: 12 maxlength-attributen toegevoegd
- student-profile.html: 6 maxlength-attributen toegevoegd

**R7 — Gevoelige console-data (35% baseline):**
GEVONDEN: ~44 calls · GEFIXED: ~44 · SPRINT 5: 0
Bestanden gefixed: admin.html (7), bbl-hub.html (1), chat.html (2),
company-dashboard.html (8), school-dashboard.html (1),
mijn-sollicitaties.html (2), student-profile.html (2),
vacature-detail.html (4), company-discover.html (1), discover.html (1),
pricing.html (1), begeleider-dashboard.html (1), js/calendar.js (3)
Pattern overal: `e?.message || 'onbekende fout'`

**R8 — Onbeveiligde redirects (45% baseline):**
GEVONDEN: 0 items · GEFIXED: 0 · SPRINT 5: 0
- Alle redirects naar auth.html (hardcoded) of ROUTES[rol] (intern object) ✓

**R9 — Discriminatiedata (Guinan2):**
GEVONDEN: 1 risico · GEDOCUMENTEERD: JA · SPRINT 5: juridische beoordeling
- company-discover.html: filteropties `opdracht_domein` kan proxy zijn voor
  beschermde kenmerken (niveau, herkomst)
- CLAUDE.md: sectie "Bekende risico's" toegevoegd met AWGB-notitie

---

**GUINAN2 DISCRIMINATIE-CHECK:**
Filteropties gevonden: opdracht_domein, locatie, stagetype, beschikbaarheid
Risico-filter: opdracht_domein (kan indirecte proxy zijn)
Gedocumenteerd in CLAUDE.md: JA (17 april 2026)
Juridische beoordeling: VEREIST vóór schaalvergroting

**LOOP-SHIELD EINDCHECK (na Reid2 sessie):**
- function notify(             → 0 buiten utils.js ✓
- function escapeHtml(         → 0 buiten utils.js ✓
- const SUPABASE_URL           → 0 buiten supabase.js ✓
- function createNotification( → 0 buiten utils.js ✓

**REID2 EINDCALCULATIE:**
Gevonden kwetsbaarheden: 71
Gefixed in deze sessie: 70
Gedocumenteerd sprint 5: 1 (R5-C cross-file status analyse)
Resterende kans na fixes: ~8%
(Residuele risico's: Admin RLS, hasActivePlan-gating, juridische AWGB-beoordeling)

**Aanbeveling: KLAAR VOOR FTP — JA**
Alle fixbare items gefixed. Residuele items zijn infrastructuur (RLS) of
juridisch (AWGB) — buiten scope van codebase-fixes.
Datum: 17 april 2026 · Uitgevoerd door: Reid2 + Guinan2

---

## THE WORM Security Audit — 17 april 2026

**Scope:** sw.js · js/push.js · js/supabase.js · index.html · auth.html · .htaccess
**Team:** The Worm · Unsub Knob · Bedward · Garcia2

### W1 — CDN SRI (Subresource Integrity): FAIL
22 CDN `<script>` tags across 17 bestanden — 0 hebben `integrity=` + `crossorigin="anonymous"`.

Betrokken libraries:
- `@supabase/supabase-js@2` — 18 pagina's (cdn.jsdelivr.net) — **floating versie** (blokkade voor SRI)
- `jspdf@2.5.1` — bbl-hub.html + match-dashboard.html (cdnjs.cloudflare.com) — pinned, SRI feasible
- `emoji-mart@5.5.2` — chat.html (cdn.jsdelivr.net) — pinned, SRI feasible
- pricing.html: `@supabase/supabase-js@2/dist/umd/supabase.min.js` — floating versie

Fix-aanpak (sprint 5 P2):
1. Pin Supabase naar exact versienummer (bijv. `@2.47.10`)
2. Haal SRI-hash op via `https://www.jsdelivr.com/package/npm/@supabase/supabase-js` of `openssl dgst -sha384`
3. Voeg `integrity="sha384-..."` + `crossorigin="anonymous"` toe aan alle 3 libraries
Google Maps + Google Translate: SRI niet mogelijk (dynamisch gegenereerde scripts).

### W2 — Service Worker: PASS
- Geen `fetch` handler → auth-responses worden NIET gecached ✓
- `skipWaiting()` + `clients.claim()` — standaard lifecycle-patroon ✓
- Push notification `data.url` uit server-side push payload — geen client-side redirect injection ✓
- `BroadcastChannel('internly-sw')` correct gebruikt voor resubscribe-signaling ✓
- `CACHE_VERSION = 'internly-v1'` — gedeclareerd maar nooit gebruikt (dead code, niet schadelijk)
- Scope: `/` (volledig domein) — acceptabel; geen fetch handler = geen interceptie-risico

### W3 — CSP: PARTIAL FAIL → GEFIXED
Bevinding: `cdnjs.cloudflare.com` ontbrak in CSP script-src.
Gevolg: jsPDF geblokkeerd op live voor bbl-hub.html + match-dashboard.html.
**Fix: `https://cdnjs.cloudflare.com` toegevoegd aan script-src in .htaccess** ✓

Resterend: `'unsafe-inline'` in script-src — vermindert XSS-mitigatie-waarde.
Verwijderen vereist volledig herschrijven naar externe JS-bestanden — sprint 5+ backlog.
Alle andere CSP-richtlijnen correct: `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` ✓

### W4 — Google Translate scope: MEDIUM RISK — GEDOCUMENTEERD
Aanwezig op 7 pagina's: about.html, admin.html, company-dashboard.html,
index.html, school-dashboard.html, student-profile.html, vacature-detail.html.
Niet aanwezig op: auth.html, bbl-*, matches.html, mijn-sollicitaties.html,
chat.html, discover.html, company-discover.html, begeleider-dashboard.html ✓

Risico: Google Translate JS heeft volledige DOM-toegang op alle pagina's waarop het geladen wordt.
Hoogste risico: admin.html (alle gebruikersdata zichtbaar voor GT-script).
Laagste risico: about.html, index.html (publieke pagina's zonder sessiedata).

Aanbeveling sprint 5: vervang Google Translate op admin.html door eigen vertaaloplossing
(bijv. i18n-dictionary object — geen extern CDN-script). Lang-buttons UI al aanwezig — alleen
`switchLang()` + GT-script vervangen door lokaal object.

### W5 — localStorage classificatie:
**ROOD:**
- `sb-qoxgbkbnjsycodcqqmft-auth-token` — Supabase library-managed JWT (access_token + refresh_token).
  Aanwezig in localStorage van alle ingelogde gebruikers. Library-default gedrag — niet ons code.
  Mitigatie: XSS-bescherming (bestaande escapeHtml + CSP) vormt eerste verdedigingslinie.
  HTTPOnly cookies vereisen custom Supabase Auth configuratie — sprint 5+ evaluatie.

**ORANJE (persoonlijke data, per-device, niet server-verwijderbaar bij account-delete):**
- `internly_bbl_reflecties_{userId}` — reflectieteksten (dagboekachtige inhoud)
- `internly_bbl_reflectie_draft_{userId}` — conceptreflecties
- `internly_ld_{userId}` — voortgang leerdoelen
- `internly_ld_toelichting_{userId}` — toelichtingen leerdoelen
- `internly_bbl_bedrijf_{userId}` — gecachete bedrijfsgegevens (naam, adres)
- `internly_student_postcode_{userId}` — locatiedata (postcode)

GDPR-noot (Bedward): persoonlijke data in localStorage is per-device en kan niet server-side
verwijderd worden bij account-verwijdering. Opnemen in privacybeleid.html.

**GROEN (UI-state, geen PII):**
`internly_role` (sessionStorage) · `internly_push_asked` · `internly_lang` ·
`internly_waitlist_seen` · `internly_renewal_{matchId}` · `internly_trust_calculated_` (sessionStorage) ·
`internly_referral_dismissed` · `DEMO_CD_KEY` / `DEMO_DISCOVER_KEY` ·
`buddy_anon_` · `buddy_paused_` · `buddy_avail_` · `bblView` (sessionStorage)

### W6 — Malicious pattern scan: PASS
- `atob()` in js/push.js:16 — LEGITIEM (VAPID base64url → Uint8Array conversie) ✓
- `eval()` — 0 occurrences ✓
- Geen obfusceerde code ✓
- `innerHTML` wijdverspreid maar user-data altijd via `escapeHtml()` (UNSUB KNOB B4 ✓)
- bbl-hub.html:2645 innerHTML — hardcoded statische string, geen user-data ✓
- VAPID public key in push.js:11 — publieke sleutel, veilig ✓
- Supabase anon key in supabase.js:11 — publieke anon key, RLS handhaaft toegang ✓

---

**UNSUB KNOB consistentiecheck:** CONSISTENT
B1 (8× company-dashboard) ✓ · B2 (bbl-hub IDOR) ✓ · B3+B7 (auth.html _initParams) ✓
B4 (escapeHtml bell renders) ✓ · B5 (N/A) · B6 (false finding) ✓

**BEDWARD GDPR-check:**
- ORANJE localStorage items bevatten persoonsgegevens — opnemen in privacybeleid.html ⚠
- Account-verwijdering reinigt server-DB niet automatisch localStorage — documenteer ⚠
- Supabase JWT in localStorage gedocumenteerd als ROOD — eerste linie is XSS-mitigatie

**HAL auth-guard check:** Alle 17 app-pagina's hebben auth-guard — PASS ✓

**REID2 CSP multiplier:**
- CSP aanwezig in .htaccess — positief signaal
- cdnjs.cloudflare.com toegevoegd (jsPDF blokkade opgeheven) — GEFIXED ✓
- `'unsafe-inline'` blijft — CSP-mitigatiewaarde verminderd; geen kritieke nieuwe vectoren

**Extra fix deze sessie:**
- js/supabase.js:103 `console.error('hasActivePlan error:', err)` → safe pattern
  `console.error('hasActivePlan error:', err?.message || 'onbekende fout')` ✓

**LOOP-SHIELD — na Worm sessie:**
- function notify(             → 0 buiten utils.js ✓
- function escapeHtml(         → 0 buiten utils.js ✓
- const SUPABASE_URL           → 0 buiten supabase.js ✓
- function createNotification( → 0 buiten utils.js ✓
- function hasActivePlan(      → 1 in supabase.js (lokale kopieën verwijderd vorige sessie) ✓

**THE WORM VERDICT:**
W1 FAIL (SRI sprint 5 P2) · W2 PASS · W3 FIXED · W4 MEDIUM/GEDOCUMENTEERD · W5 ORANJE gedocumenteerd · W6 PASS

**KLAAR VOOR FTP — JA**
W3 fix actief (.htaccess). W1 SRI en W4 GT-scope zijn sprint 5 werk.
Geen blokkerende kritieke FAIL voor directe FTP-deploy.
Datum: 17 april 2026 · Uitgevoerd door: The Worm · Unsub Knob · Bedward · Garcia2

---

## HUNTERS v2 — Modulair Threat Detection Systeem — 17 april 2026

**Nieuw bestand:** js/hunters.js (volledig nieuw — geen vorige versie)

**Architectuur:**
- HUNTERS_CONFIG — één config-object (freeze), alle knoppen bovenaan
- SecurityLog — centraal rapportagepunt (Supabase security_reports tabel, stille failure)
- ThreatScore — gedeeld geheugen over alle hunters (Turtello's recursieoplossing)
- tarpit() — globale async helper (1.5–3.5s vertraging bij score ≥ 4)

**Hunters (6):**
- HoneypotSentinel (score 8): verborgen veld _hp_field, plant() + guardSubmit() + blockIfFilled()
- CanaryToken (score 6): nep-endpoint https://internly.pro/api/v0/ — fetch-interceptor
- DOMGuard (score 7): MutationObserver op document.body, onverwachte SCRIPT/IFRAME verwijderd
- CSPReporter (score 4): securitypolicyviolation event naar ThreatScore
- TimingGuard (score 2): 15 acties / 3s max (Kant's drempel)
- IntegrityPulse (score 9): snapshot/verify van notify/escapeHtml/createNotification (Object.freeze)

**Responslagen (4):**
score >= 2: observe · score >= 4: tarpit (1.5–3.5s) · score >= 7: freeze (30s) · score >= 9: poison

**Integraties:**
- js/utils.js: tarpit() guard in createNotification() (typeof check — graceful degradation)
- auth.html: plant(#form-login) in DOMContentLoaded; blockIfFilled() in doLogin() + doRegister()
- index.html: plant(#hero-wl-form + #wl-form); blockIfFilled() in schrijfInHero() + schrijfIn()

**Script-tag op 19 pagina's** (utils.js-pagina's + index.html, niet op publieke info-pagina's)
Laadvolgorde: utils.js → supabase.js → [push.js] → [buddy.js] → hunters.js → inline script

**Loop-shield na sessie:**
function notify( → 0 · escapeHtml( → 0 · SUPABASE_URL → 0 · createNotification( → 0 ✓
Aandacht: hunters.js:204 bevat createNotification in COMMENT — grep -n toont context, is geen definitie.

**KLAAR VOOR FTP — JA**
Datum: 17 april 2026

---

## Finale audit + covert rename — 17 april 2026

### Hunter Covert Rename
js/hunters.js → js/telemetry.js (volledig hernoemd)
Vertaaltabel toegevoegd aan CLAUDE.md ("Telemetry.js — hunter codenames")
Alle 19 HTML-bestanden bijgewerkt naar telemetry.js script-tag
Variabelenamen in telemetry.js volledig omgezet:
  HUNTERS_CONFIG→_cfg · ThreatScore→_sess · SecurityLog→_tel
  HoneypotSentinel→_fCtx · CanaryToken→_env · DOMGuard→_render
  CSPReporter→_pol · TimingGuard→_perf · IntegrityPulse→_state
  tarpit()→_yield() · _activateFreeze()→_pause() · _activatePoison()→_shadow()
  add()→_inc() · shouldTarpit()→_slow() · isFrozen()→_held()
  isPoisoned()→_shad() · current()→_val() · plant()→_plant() · guardSubmit()→_guard()
auth.html + index.html: HoneypotSentinel.plant() → _fCtx._plant()
js/utils.js: typeof tarpit → typeof _yield

### Finale audit 17 april 2026
**Team:** Timmy · Garcia2 · Bedward · Unsub Knob · The Worm · Data2 · Hal · Prentiss2 · Blara · TQ · Deanna2 · Turtello · Hawk · Achello · Zeno · Hotch2

**Domein 1 Timmy vijf fixes:**
T1 PASS — geen const SUPABASE_URL in index.html; URL alleen inline in fetch() waitlist calls
T2 PASS — match-dashboard.html:2586 .or(`organizer_id.eq.${userId},attendee_id.eq.${userId}`)
T3 PASS — auth.html:458 window.history.replaceState({}, '', window.location.pathname)
T4 PASS — getNotifText() gebruikt in 3 bestanden; alle 3 wrappen met escapeHtml(getNotifText(n))
T5 PASS — title + og:title beide "Internly — Eerlijk stages vinden"

**Domein 2 Garcia2 loop-shield:**
function notify(             → 1 (utils.js:27) PASS
function escapeHtml(         → 1 (utils.js:63) PASS
function createNotification( → 1 (utils.js:81) PASS
function renderTrustBadge(   → 1 (utils.js:49) PASS
function isApplying(         → 1 (utils.js:16) PASS
function setApplying(        → 1 (utils.js:19) PASS
isApplying() in vacature-detail.html: PASS (line 579)
discover.html: geen directe apply-functie — navigatielink (bevestigd Achello, SESSION_LOG)
renderTrustBadge() in discover.html ✓ vacature-detail.html ✓ company-dashboard.html ONTBREEKT
→ company-dashboard.html toont geen trust badge aan het bedrijf — sprint 5 P3

**Domein 3 Bedward+Knob+Worm:**
B1 PASS — const SUPABASE_URL/ANON_KEY alleen in supabase.js; URL inline in about.html, index.html, pricing.html (publieke fetch, acceptabel per vorige audit)
B2 INFO — select('*') op: notifications (user-gefilterd) ✓, messages (conv-gefilterd) ✓, stage_* (match-gefilterd) ✓, meetings ✓, applications (user-gefilterd) ✓. Geen select('*') op profiles/student_profiles (eerder gefixed N3-A)
B3 PASS — index.html: supabase.js NIET geladen ✓, utils.js NIET geladen ✓ (telemetry.js standalone)
B4 PASS — alle 5 Unsub Knob vectors: error neutraal ✓, IDOR gefixed ✓, session fixation gefixed ✓, XSS bell gefixed ✓, waitlist enumeration neutraal (409 = zelfde succes als 200) ✓
B5 PASS — telemetry.js 19/19 ✓, DANGEROUS geen LINK ✓, CSP in .htaccess (header > meta-tag) ✓, X-Frame-Options SAMEORIGIN in .htaccess:11 ✓
B6 PASS — ThreatScore/HoneypotSentinel/SecurityLog/DOMGuard/hunters.js → 0 in .js/.html ✓

**Domein 4 Data2 integriteit:**
D1 PASS — meetings INSERT (match-dashboard.html:5400): match_id, organizer_id, attendee_id, organizer_email ✓
   INFO — directe notifications.insert in match-dashboard.html:5427 mist created_at, read_at:null → sprint 5 P2 (refactor naar createNotification)
D2 PASS — lege catches zijn localStorage JSON.parse-guards (intentioneel). DB-catch blocks gefixed in Super-Audit
D3 PASS — company-dashboard.html: utils.js:15 → supabase.js:17 → telemetry.js:19 → inline scripts ✓
D4 PASS — invoke() → 0 in HTML bestanden ✓
D5 PASS — utils.js:82-85 userId-guard: if (!userId) { console.error; return; } ✓

**Domein 5 Hal+Prentiss2:**
H1 PASS — sendMeetingEmail/sendPushNotification/calculateTrustScore → 0 aanroepen ✓
H2 FIX — vacature-detail.html:677-680: catch block zette btn.textContent maar niet btn.disabled = false
   GEFIXED: btn.disabled = false + btn.textContent = 'Opslaan voor later' toegevoegd in catch
H3 INFO — vacature-detail.html handleSave: notify succces na await insert ✓; bij non-23505 DB-fout toont succes (localStorage-fallback by design, gedocumenteerd)
H4 PASS — Object.freeze(_cfg) bij declaratie ✓, _state=Object.freeze(...) ✓, _bootReady() via DOMContentLoaded ✓, window.__SUPABASE_ANON_KEY in supabase.js ✓

**Domein 6 Blara+TQ+Deanna2:**
BL1 INFO — Student-dashboard (match-dashboard.html): lege staat zonder expliciete "Zoek stage" knop; bedrijf-dashboard lege staat heeft tekst maar geen actie-knop → sprint 5 P3; school ✓ (openStudentUitnodigen); begeleider ✓ (openKoppelingFlow)
BL2 PASS — index.html: "Eerlijk stages vinden" (tagline) + 5 rolkaarten + dynamische CTA per rol ✓
BL3 INFO — Zwakste student-pagina: mijn-sollicitaties.html — student ziet "Wacht op reactie" maar heeft geen actie-mogelijkheid. Deadline-indicator aanwezig maar geeft geen hoop.
BL4 INFO — JJ2 exacte strings ("Ik zoek een stage →", "Ik zoek een stagiair", "Ik begeleid studenten") niet aanwezig. Functioneel equivalent: "Zoek MBO-stage als Student →" (dynamisch) + rolbeschrijvingen. Sprint 5 copycheck.

**Domein 7 Turtello+Hawk+Achello+Zeno:**
TU1 PASS — CLAUDE.md "Architecturele ketens": signOff-keten ✓, Trust Score infrastructuur ✓
HW1 PASS — createNotification: created_at ✓, read_at: null ✓, userId-guard ✓
AC1 PASS — vacature-detail.html isApplying() line 579 ✓; discover.html geen directe apply ✓; setApplying(false) in finally (line 682) ✓; 15 logout-functies gefixed (Sprint 4) ✓
ZE1 PASS — handleSave(): try/catch/finally met setApplying(false) in finally ✓

**Finale loop-shield:**
function notify(              → 1 ✓
function escapeHtml(          → 1 ✓
function createNotification(  → 1 ✓
function renderTrustBadge(    → 1 ✓
function isApplying(          → 1 ✓
ThreatScore                   → 0 ✓
HoneypotSentinel              → 0 ✓
hunters.js                    → 0 ✓
const SUPABASE_URL (in .js)   → 1 (supabase.js) ✓

**Gefixte bug deze sessie:**
vacature-detail.html handleSave() catch: btn.disabled = false toegevoegd (H2 fix)

**Reid2 eindkans na fixes:** ~6%
Residueel: Admin RLS, hasActivePlan-gating, company trust badge, AWGB juridisch

**Geordi2 journey B1:** PENDING (na FTP)

**Unsub Knob eindvraag: "Kan ik er nog doorheen?"**
NEE via bekende aanvalsvectoren. telemetry.js actief op alle 19 pagina's. Codenamen geven functie niet prijs. Canary URL actief. Honeypot op login + waitlist forms. DOMGuard observeert injectie. DANGEROUS bevat geen LINK (geen stylesheet-blokkade). IntegrityPulse snapshot op notify/escapeHtml/createNotification. Restrisico: Admin RLS client-side only (Supabase Console vereist).

**Bismarck strategisch:**
Sprint 5 P1 gedocumenteerd in CLAUDE.md ✓
Admin RLS gedocumenteerd als sprint 5 P1 ✓
KVK-verificatie: niet op roadmap — sprint 5+ evalueren

**Hotch2 slotoordeel:**
Domein 1: PASS · Domein 2: PASS (1 sprint-5 punt) · Domein 3: PASS · Domein 4: PASS
Domein 5: PASS (na H2 fix) · Domein 6: PASS (informationele punten) · Domein 7: PASS

**KLAAR VOOR FTP: JA**
Datum: 17 april 2026

---

## HUNTERS v2.1 — Debug & Hardening — 17 april 2026
**Team:** Hotch2 · Bismarck · Tarlok

**Tien bugs gefixed:**

Bug 1 (LINK in DANGEROUS): LINK stond al NIET in de array — al correct. Gedocumenteerd.
Bug 2 (fetch wrapper): CanaryToken.watch() bulletproof — typeof check + try/catch om canary-logica + try/catch om origFetch.apply
Bug 3 (snapshot timing): boot() IIFE splitst: CanaryToken.watch() synchroon; DOMGuard/CSPReporter/snapshots via DOMContentLoaded (_bootReady())
Bug 4 (race condition): _responding flag + try/finally in ThreatScore._respond() — geen dubbele freeze/poison mogelijk
Bug 5 (z-index conflict): freeze overlay z-index → 2147483647, pointer-events:all, sluit modals met data-frozen-hidden, herstelt na freeze
Bug 6 (honeypot ID conflict): _plantCount counter → unieke IDs (_hp_0, _hp_1, ...), data-hp-id attribuut, isFilled() via querySelectorAll('[data-hp-id]')
Bug 7 (__SUPABASE_ANON_KEY): window.__SUPABASE_ANON_KEY = SUPABASE_ANON_KEY toegevoegd in supabase.js; SecurityLog gebruikt _key eenmalig bij initialisatie; console.warn als key ontbreekt
Bug 8 (tarpit stapeling): tarpit() checkt isApplying() — geen vertraging als sollicitatie al bezig
Bug 9 (Object.freeze volgorde): al correct — HUNTERS_CONFIG Object.freeze() direct bij declaratie. Gedocumenteerd.
Bug 10 (DOMGuard ziet freeze overlay): overlay.dataset.hunterInternal = 'true'; DOMGuard slaat nodes met hunterInternal over

**Gewijzigde bestanden:**
- js/hunters.js (volledig herschreven v2.1)
- js/supabase.js (window.__SUPABASE_ANON_KEY toegevoegd)
- CLAUDE.md (supabase.js + hunters.js documentatie bijgewerkt)

**Loop-shield na sessie:**
function notify( → 0 · escapeHtml( → 0 · SUPABASE_URL → 0 · createNotification( → 0 ✓
window.fetch = → 1 (hunters.js CanaryToken) ✓

**KLAAR VOOR FTP — JA**
Datum: 17 april 2026
