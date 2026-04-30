# Codebase Audit Internly.pro
Datum: 21 april 2026
Auteur: Claude Code (claude-sonnet-4-6)
Scope: Volledige codebase per die datum

---

## 0. Leeswijzer

Dit document is een feit-gebaseerde audit van de Internly.pro codebase zoals aanwezig op 21 april 2026. Elke claim heeft een bestandsnaam en regelnummer als bewijs. Claims die niet bevestigd konden worden staan in hoofdstuk 11.

Afkortingen: `sp` = student_profiles, `cp` = company_profiles, `RLS` = Row Level Security.

---

## 1. Bestandenkaart

### 1.1 HTML-pagina's

| Bestand | Regels | Hoofddoel | Toegestane rollen | Auth-guard | Geladen JS |
|---|---|---|---|---|---|
| `index.html` | 1660 | Publieke landingspagina + auth-gate | Publiek (redirect bij ingelogd) | Auth-gate inline (r.1127–1148): redirect ingelogde user | utils.js, supabase.js, telemetry.js |
| `auth.html` | 920 | Login + registratie | Publiek | Geen guard nodig (is zelf de gate) | utils.js, supabase.js, push.js, roles.js, telemetry.js |
| `admin.html` | 841 | Platformbeheer | admin (rol in profiles) | r.784–785: `prof?.role !== 'admin'` → auth.html | utils.js, supabase.js, telemetry.js |
| `discover.html` | 1408 | Vacatures zoeken voor studenten | student | r.1152: `requireRole('student')` | utils.js, supabase.js, push.js, buddy.js, translate.js, telemetry.js |
| `matches.html` | 893 | Actieve matches student | student | r.813: `requireRole('student')` | utils.js, supabase.js, push.js, translate.js, telemetry.js |
| `mijn-sollicitaties.html` | 732 | Sollicitatieoverzicht student | student | r.670: `requireRole('student')` | utils.js, supabase.js, push.js, translate.js, info.js, telemetry.js |
| `match-dashboard.html` | 6141 | Gedeelde stage-workspace (student/bedrijf/school) | student, bedrijf, school, begeleider | r.2660–2662: auth-check bij MATCH_ID; demo-modus zonder MATCH_ID toont role-picker | utils.js, supabase.js, telemetry.js, jspdf CDN |
| `hub.html` | 45 | Stage Hub placeholder (BOL) | student (BOL) | r.40: `requireMode('bol')` | roles.js, utils.js, supabase.js |
| `student-profile.html` | 1665 | Profielinvullen BOL/HBO/WO student | student | r.1279–1290: auth + rolcheck | utils.js, supabase.js, push.js, telemetry.js |
| `bol-profile.html` | 1666 | Profielpagina voor MBO-BOL studenten | student (BOL) | Eigen init: auth + rolcheck (r.1279 patroon) | utils.js, supabase.js, push.js, telemetry.js |
| `bbl-profile.html` | 678 | Profielinvullen BBL-student | student (bbl_mode=true) | r.620–650: auth + bbl_mode check | utils.js, supabase.js, telemetry.js |
| `bbl-hub.html` | 2692 | BBL-traject hub | student (bbl_mode=true) | r.2469–2495: auth + bbl_mode check | utils.js, supabase.js, push.js, calendar.js, telemetry.js |
| `bbl-dashboard.html` | 635 | BBL-overzichtspagina | student (bbl_mode=true) | r.517–543: auth + bbl_mode check | utils.js, supabase.js, telemetry.js |
| `company-dashboard.html` | 2832 | Bedrijfsdashboard | bedrijf | r.2497–2506: auth + rolcheck | utils.js, supabase.js, push.js, telemetry.js |
| `company-discover.html` | 540 | Studentprofielen zoeken | bedrijf | r.510–520: auth + rolcheck | utils.js, supabase.js, translate.js, telemetry.js |
| `school-dashboard.html` | 2193 | Schooldashboard | school | r.2072–2081: auth + rolcheck | utils.js, supabase.js, push.js, telemetry.js |
| `begeleider-dashboard.html` | 922 | Stagebegeleider dashboard | begeleider | r.~617: auth-guard (patroon gelijk aan school) | utils.js, supabase.js, push.js, telemetry.js |
| `buddy-dashboard.html` | 822 | Gepensioneerde buddy dashboard | gepensioneerd | r.760–776: auth + `role !== 'gepensioneerd'` check | utils.js, supabase.js, telemetry.js |
| `chat.html` | 1200 | Berichten (match + buddy) | student, bedrijf, school | r.1146: `requireRole('student','bedrijf','school')` | utils.js, supabase.js, push.js, calendar.js, buddy.js, telemetry.js |
| `vacature-detail.html` | 935 | Vacaturedetail + solliciteer | Publiek (zacht, geen redirect) | r.712–716: geen redirect; toont banner bij niet-ingelogd | utils.js, supabase.js, telemetry.js |
| `about.html` | 942 | Publieke over-ons pagina | Publiek | Geen auth-guard | utils.js, supabase.js (inline client r.781–783) |
| `pricing.html` | 567 | Abonnementen overzicht | Publiek (betaalknop vereist login) | Geen page-guard; checkout-redirect naar auth bij niet-ingelogd | utils.js, supabase.js, telemetry.js |

**Niet-gespecificeerde publieke pagina's** (geen audit-scope, geen auth): `404.html`, `faq.html`, `privacybeleid.html`, `spelregels.html`, `stagebegeleiding.html`, `kennisbank.html`.

**Demo/tool pagina's**: `internly_simulator.html` (4118 r.), `esg-export.html` (1109 r.), `esg-rapportage.html` (751 r.) — niet in audit-scope.

### 1.2 JavaScript-modules

| Bestand | Regels | window.* exports | Dependencies | Geladen op |
|---|---|---|---|---|
| `js/utils.js` | 565 | `smartHomeRedirect`, `getRoleLanding`, `getUserMode`, `requireMode`, `requireRole`, `getDisplayName`, `performLogout`, `renderStudentHeader` (plus globals: `notify`, `escapeHtml`, `formatNLDate`, `createNotification`, `routeStudent`, `routeStudentByMode`, `VALID_NOTIFICATION_TYPES`, `getNotifText`, `isApplying`, `setApplying`, `renderTrustBadge`, `TOAST_TIMEOUT_MS`) | Supabase client `db` (geladen door supabase.js vóór utils.js op HTML niveau) | Alle app-pagina's |
| `js/supabase.js` | 106 | `db` (window.db), `__SUPABASE_ANON_KEY` | Supabase CDN (@supabase/supabase-js@2) | Alle app-pagina's |
| `js/roles.js` | 74 | `window.Internly` met `ROLES`, `detectRole`, `routeForRole`, `ROLE_DETECTION_COLUMNS` | Geen | auth.html, hub.html |
| `js/telemetry.js` | 554 | Geen publieke exports; gebruikt `window.notify`, `window.__SUPABASE_ANON_KEY` | utils.js (voor notify snapshot), supabase.js (voor anon key) | Alle app-pagina's als laatste script |
| `js/push.js` | 77 | `VAPID_PUBLIC_KEY`, `urlBase64ToUint8Array`, `registerPushNotifications` | Supabase client (parameter doorgegeven) | auth.html, discover.html, matches.html, mijn-sollicitaties.html, bbl-hub.html, school-dashboard.html, company-dashboard.html, chat.html, begeleider-dashboard.html |
| `js/buddy.js` | 773 | `buddyInit`, `buddyLoadPairs`, `buddyLoadPendingRequests`, `buddySendRequest`, `buddyAcceptRequest`, `buddyDeclineRequest`, `buddyEndPair`, `buddyRenderPairCard`, `buddyRenderIncomingRequests`, `buddyRenderRequestWidget`, `buddyHandleRequest`, `buddyHandleRequestFromWidget`, `buddyOpenChat`, `BuddyModule`, `BUDDY_TYPES`, `BUDDY_CONFIG` | utils.js (`escapeHtml`, `notify`), Supabase client | discover.html, chat.html |
| `js/calendar.js` | 472 | `InternlyCalendar` module object | utils.js, Supabase client | bbl-hub.html, chat.html |
| `js/info.js` | 93 | `toggleInfoPop` | Geen | mijn-sollicitaties.html |
| `js/translate.js` | 46 | `switchLang`, `googleTranslateElementInit` | Google Translate CDN | auth.html, discover.html, matches.html, mijn-sollicitaties.html, company-discover.html |
| `js/telemetry.js` | 554 | Geen | utils.js, supabase.js | Alle app-pagina's (altijd als laatste) |
| `js/esg-export.js` | (niet geïnventariseerd in audit-scope) | — | — | esg-export.html, esg-rapportage.html |
| `js/esg-inject.js` | (niet geïnventariseerd) | — | — | esg-export.html |
| `js/reistijd.js` | (niet geïnventariseerd) | — | — | onbekend |
| `sw.js` | 102 | Geen (Service Worker scope) | Geen | Geregistreerd via push.js |

**Laadvolgorde (kritiek)**: utils.js → supabase.js → (push.js/calendar.js/buddy.js) → telemetry.js.
`telemetry.js:543` snapshots `window.notify`, `escapeHtml`, `createNotification` — deze moeten vóór telemetry geladen zijn.

### 1.3 Dode bestanden

| Bestand | Reden | Bewijs |
|---|---|---|
| `hub.html` (45 r.) | Placeholder, bouw uitgesteld. Tekst: "Stage Hub wordt morgen verder gebouwd". Nooit gelinkt via navigatie. | hub.html:27–34 |
| `stage-hub.html` | Staat in HANDOVER.md FileZilla-lijst (r.30) maar bestand bestaat niet op schijf — vervangen door match-dashboard.html | CLAUDE.md §"Bekende stubs" |
| `chat.backup.2026-04-20-0904.html` | Backup; niet in productie | Bestandsnaam |
| `match-dashboard.backup.2026-04-20-0904.html` | Backup | Bestandsnaam |
| `discover.backup.2026-04-20-0904.html` | Backup | Bestandsnaam |
| `matches.backup.2026-04-20-0904.html` | Backup | Bestandsnaam |
| `mijn-sollicitaties.backup.2026-04-20-0904.html` | Backup | Bestandsnaam |
| `company-dashboard.backup.2026-04-20.html` | Backup | Bestandsnaam |
| `index.backup.2026-04-19-p15.html` | Backup | Bestandsnaam |
| `index.backup.2026-04-20-tiles.html` | Backup | Bestandsnaam |
| `js/utils.backup.2026-04-20-0904.js` | Backup | Bestandsnaam |
| `tatus --short` | Aangemaakt door git-commando fout (`git status --short` zonder `s`) | Aanwezig in rootmap |

### 1.4 Ontbrekende bestanden

| Bestand | Waarom verwacht | Status |
|---|---|---|
| Supabase Edge Function `send-meeting-email` | Ooit aangeroepen vanuit calendar.js; verwijderd per sprint | Invoke verwijderd, functie bestaat niet — CLAUDE.md §"Bekende stubs" |
| `icons/icon-192.png`, `icons/badge-72.png` | sw.js:18–19 verwijst ernaar in push-notification | Niet aangetroffen in inventory; mogelijke 404 bij push |
| `js/roles.js` laadt op bbl-hub.html, bbl-dashboard.html | Niet gevonden in `<script>` tags van die pagina's | Beide pagina's leunen op bbl_mode direct uit DB, niet via Internly.detectRole() |

---

## 2. Database-schema

### 2.1 Tabellen

Afgeleid uit `.from('...')` queries in code. Geen directe Supabase Console toegang — kolommen zijn gereconstrueerd uit SELECT-statements.

| Tabel | Gelezen kolommen (bestand:regel) | Geschreven kolommen |
|---|---|---|
| `profiles` | `id, role, naam, is_buddy_eligible, email, is_admin, email_zichtbaar` — utils.js:82, utils.js:125, auth.html:626, admin.html:364, buddy.js:319 | `role, naam` via auth.html:726 INSERT; `naam` via buddy-dashboard.html:619 UPDATE |
| `student_profiles` | `profile_id, naam, opleiding, sector, opdracht_domein, bbl_mode, onderwijsniveau, schooldag, skills, school, pb_naam, contract_start, contract_end, jaar, beschikbaar_vanaf, duur, postcode, motivatie, opdracht_aard, opdracht_aanleiding, onderzoeksvraag, onderzoeksvraag_context, onderzoeksvraag_type, resultaat_type, resultaat_doelgroep, methode_type, methode_beschrijving, opdracht_eerder_onderzoek, buddy_opt_in, bedrijf, begeleider_profile_id, profiel_zichtbaar_voor_bedrijven, aggregation_consent` | upsert via student-profile.html:1209, bbl-profile.html:582, auth.html:758–759 |
| `company_profiles` | `bedrijfsnaam, sector, website, beschrijving, trust_score, trust_grade, adres, postcode, stad, kvk, contactpersoon, contactemail` — company-dashboard.html:1803 | upsert company-dashboard.html:1835 |
| `school_profiles` | `schoolnaam, contactpersoon, contactemail, adres, postcode` — match-dashboard.html:2786 | via school-dashboard.html |
| `internship_postings` | `id, title, company_name, company_user_id, status, sector, stad, duur, uren_per_week, type, beschrijving, contract_start, contract_end, bbl_mode, vestigingen(naam,stad,postcode,adres)` — company-dashboard.html:1318, bbl-hub.html:2514 | INSERT company-dashboard.html:1932; UPDATE status company-dashboard.html:1979 |
| `internships` | `*` (publiek, read-only via data-import) — vacature-detail.html:732 | Geen (data-ingestie extern) |
| `matches` | `id, party_a, party_b, roc_profile_id, completion_status, status, praktijkbegeleider_profile_id, contract_end_date` — match-dashboard.html:2721, bbl-hub.html:2509 | INSERT bol-profile.html:926; UPDATE status company-dashboard.html:1546 |
| `applications` | `id, student_id, internship_id, status, created_at` — vacature-detail.html:621 | INSERT vacature-detail.html:629 |
| `conversations` | `id, match_id, buddy_pair_id` — chat.html:749, buddy.js:499 | INSERT bij match-accept company-dashboard.html:1552 |
| `messages` | `id, conversation_id, sender_id, body, created_at, read` — chat.html:783, bbl-hub.html:1220 | INSERT chat.html:864, bbl-hub.html:1302 |
| `meetings` | `id, match_id, organizer_id, attendee_id, title, date, time, location, status, note` — chat.html:518, bbl-hub.html:1348 | INSERT bbl-hub.html:1540; UPDATE status bbl-hub.html:1630 |
| `notifications` | `user_id, type, ref_id, ref_type, message, read, read_at, created_at` — utils.js:344 | INSERT utils.js:344, buddy.js:586 |
| `reviews` | `id, reviewer_id, company_profile_id, rating, body, flagged, flag_reason, flagged_by, flagged_at` — admin.html:398, company-dashboard.html:1673 | INSERT mijn-sollicitaties.html; UPDATE admin.html:460 |
| `subscriptions` | `plan, status, max_students, current_period_end, profile_id` — supabase.js:80, begeleider-dashboard.html:619 | upsert auth.html:744, 800; pricing.html:515 |
| `waitlist` | `id, naam, email, type, buddy_type, sector, expertise_tags, anonymous, paused, available_days` — buddy-dashboard.html:358, about.html:875 | INSERT auth.html:780, about.html:875 |
| `buddy_pairs` | `id, requester_id, receiver_id, type, status, reveal_after, created_at` — buddy.js:200, utils.js:542 | INSERT buddy.js:472; UPDATE buddy.js:555 |
| `buddy_requests` | `id, requester_id, receiver_id, type, message, status, decline_reason` — buddy.js:238, buddy-dashboard.html:515 | INSERT buddy.js:408; UPDATE buddy.js:460 |
| `buddy_queue` | `user_id, type, context, created_at` — buddy.js:729 | upsert buddy.js:730 |
| `availability` | `id, user_id, day, hour, status` — calendar.js (impliciet) | upsert via calendar.js |
| `stage_plans` | `id, match_id, hoofdvraag, schoolnoot, school_invited, deelvragen (JSONB)` — match-dashboard.html:2511, 4539 | INSERT match-dashboard.html:4539; UPDATE match-dashboard.html:4558 |
| `stage_leerdoelen` | `id, match_id, progress, notes, created_at` — match-dashboard.html:2512 | UPDATE match-dashboard.html:3813 |
| `stage_tasks` | `id, match_id, title, desc, deadline, assignee, status, priority` — match-dashboard.html:2514 | INSERT match-dashboard.html:3704; UPDATE match-dashboard.html:3695; DELETE match-dashboard.html:3406 |
| `stage_deadlines` | `id, match_id, title, date` — match-dashboard.html:2513 | INSERT match-dashboard.html:3763; UPDATE match-dashboard.html:3755 |
| `stage_reflecties` | `id, match_id, date, ...` — match-dashboard.html:2515 | INSERT match-dashboard.html:3925; UPDATE match-dashboard.html:3917; DELETE match-dashboard.html:3949 |
| `stage_log` | `id, match_id, msg, time, color` — match-dashboard.html:2516 | INSERT match-dashboard.html:4268 |
| `push_subscriptions` | `user_id, endpoint, p256dh, auth_key` — push.js:55 | upsert push.js:55 |
| `vestigingen` | `id, profile_id, naam, stad, postcode, adres` — company-dashboard.html:2640 | INSERT company-dashboard.html:2687; DELETE company-dashboard.html:2705 |
| `bundling_requests` | `id, requester_id, status, notification_id` — admin.html:605 | INSERT admin.html:678 |
| `company_doorstroom` | (kolommen onbekend) — bbl-hub.html:2434 | Alleen SELECT aangetroffen |
| `hub_tasks` | `id, ...` — begeleider-dashboard.html:787 | Alleen SELECT aangetroffen |
| `esg_exports` | `...` — js/esg-export.js:152, 285 | INSERT js/esg-export.js:152 |
| `school_postings` | `id, title, created_by, ...` — school-dashboard.html:1660 | INSERT school-dashboard.html:1743; DELETE school-dashboard.html:1769 |
| `security_reports` | `type, payload` — telemetry.js:57–83 | INSERT via fetch (telemetry.js:74) |

### 2.2 Overlappende betekenis

**onderzoeksvraag in student_profiles vs hoofdvraag in stage_plans**

`student_profiles.onderzoeksvraag` (student-profile.html:667, opgeslagen via upsert) is de onderzoeksvraag die de student invult vóór een match, als onderdeel van zijn profiel.

`stage_plans.hoofdvraag` (match-dashboard.html:4453, 4528) is de onderzoeksvraag die in de context van een specifieke match wordt ingevuld. Dit is match-gebonden en apart van het studentprofiel.

Risico: een student kan twee verschillende onderzoeksvragen hebben: één op het profiel, één per match. Er is geen synchronisatie. Hub.html r.21 beschrijft "bedrijven zien straks jouw onderzoeksvraag" — dit is onduidelijk over welke bron wordt bedoeld. Zie ook SITUATION_REPORT_2026-04-20.md r.209.

**leerdoelen in student_profiles vs stage_leerdoelen**

`student_profiles.skills` (JSONB) wordt gebruikt als leerdoelen-opslagplaats in bbl-dashboard.html r.469–470. Dit is een veld bedoeld voor skills, niet voor leerdoelen.

`stage_leerdoelen` is een aparte tabel, gequery'd in match-dashboard.html:2512, die leerdoelen per match bijhoudt.

Twee parallelle systemen voor hetzelfde concept, geen verbinding tussen beide.

**profiel_zichtbaar_voor_bedrijven vs hub_visibility**

`profiel_zichtbaar_voor_bedrijven` is aangemaakt als kolom op `student_profiles` via RLS_DECISIONS.md r.53. Het veld bestaat in het schema maar wordt **nergens in de applicatiecode gelezen of gebruikt** (grep levert 0 resultaten op in alle HTML en JS bestanden).

`hub_visibility` bestaat alleen in HUB_PHASE1_DESIGN.md (r.391, 434, 437) en SITUATION_REPORT_2026-04-20.md (r.209, 210) als toekomstig concept. De kolom bestaat niet in queries of code.

Conclusie: `company-discover.html:362–365` query't `student_profiles` rechtstreeks zonder filter op `profiel_zichtbaar_voor_bedrijven`, dus alle studenten met een profiel zijn zichtbaar voor bedrijven ongeacht hun opt-in status. RLS-laag kan dit corrigeren via `student_profiles_pool` view (RLS_DECISIONS.md r.63), maar de applicatie query't de ruwe tabel.

### 2.3 Onbekend schema-terrein

De volgende tabellen/kolommen zijn in code aangetroffen maar het schema is niet volledig te reconstrueren:

- `company_doorstroom` — bbl-hub.html:2434, geen kolom-details zichtbaar in beschikbare code.
- `hub_tasks` — begeleider-dashboard.html:787, kolom-structuur onbekend.
- `matches.praktijkbegeleider_profile_id` — bbl-hub.html:2514, niet in andere queries gezien.
- `student_profiles.begeleider_profile_id` — begeleider-dashboard.html:698, maar geen INSERT of CREATE is bevestigd.
- `availability` tabel — gebruikt door calendar.js maar niet direct zichtbaar in geauditeerde code.

---

## 3. Rol- en mode-architectuur

### 3.1 Rollen

De rollen zijn gedefinieerd in `js/roles.js:10–20` via `INTERNLY_ROLES`:

| Roldefinitie | Waarde | Oorsprong |
|---|---|---|
| `STUDENT_HBO` | `'student-hbo'` | roles.js:11 |
| `STUDENT_WO` | `'student-wo'` | roles.js:12 |
| `STUDENT_MBO_BOL` | `'student-mbo-bol'` | roles.js:13 |
| `STUDENT_MBO_BBL` | `'student-mbo-bbl'` | roles.js:14 |
| `STUDENT_ONBEKEND` | `'student-onbekend'` | roles.js:15 |
| `BEDRIJF` | `'bedrijf'` | roles.js:16 |
| `SCHOOL` | `'school'` | roles.js:17 |
| `BEGELEIDER` | `'begeleider'` | roles.js:18 |
| `BUDDY` | `'buddy'` | roles.js:19 |

In de database (profiles.role) bestaan: `student`, `bedrijf`, `school`, `gepensioneerd`, `begeleider`, `admin`. De granulaire INTERNLY_ROLES waarden worden uitsluitend in roles.js en auth.html gebruikt voor post-login routing.

`requireRole()` in utils.js:94 accepteert alleen `['student', 'bedrijf', 'school']` — `gepensioneerd`, `begeleider` en `admin` zijn niet in de allowedRoles validatielijst opgenomen. Pagina's met die rollen gebruiken eigen inline role-checks.

### 3.2 Modes (BOL/BBL) — ELKE plek waar bbl_mode gelezen wordt

| Bestand | Regel | Wat er gebeurt |
|---|---|---|
| `js/utils.js` | 42 | `smartHomeRedirect()`: leest `bbl_mode` van student_profiles voor home redirect |
| `js/utils.js` | 46 | `bblMode = sp.bbl_mode === true` |
| `js/utils.js` | 142 | `getUserMode()`: SELECT `bbl_mode, onderwijsniveau` uit student_profiles |
| `js/utils.js` | 153 | `bbl_mode: sp?.bbl_mode === true` doorgegeven aan detectRole() |
| `js/utils.js` | 158 | Fallback: `(sp?.bbl_mode === true) ? 'bbl' : 'bol'` als detectRole() niet beschikbaar |
| `js/utils.js` | 191 | `requireMode()`: leest bbl_mode opnieuw bij redirect |
| `js/utils.js` | 195 | `routeStudentByMode(sp \|\| { bbl_mode: false })` |
| `js/utils.js` | 397 | `routeStudentByMode()`: check `typeof studentProfile.bbl_mode !== 'boolean'` |
| `js/utils.js` | 403 | `if (studentProfile.bbl_mode === true)` → bbl-hub.html |
| `js/utils.js` | 537 | `renderStudentHeader()`: SELECT `bbl_mode, buddy_opt_in` |
| `js/utils.js` | 559 | `const bblMode = spRes?.data?.bbl_mode === true` voor header |
| `js/roles.js` | 33 | `detectRole()`: `if (bbl_mode === true)` → STUDENT_MBO_BBL |
| `auth.html` | 643 | LOGIN: SELECT `bbl_mode, naam, onderwijsniveau` na login |
| `auth.html` | 647 | `if (sp?.bbl_mode === true) sessionStorage.setItem('internly_role', 'bbl')` |
| `auth.html` | 656 | `if (_sp && typeof _sp.bbl_mode === 'boolean')` voor detectRole() |
| `auth.html` | 758–759 | REGISTER: BBL student upsert met `bbl_mode: true` |
| `auth.html` | 766–770 | REGISTER: BOL student upsert met `bbl_mode: false` |
| `auth.html` | 884 | Al-ingelogd check: SELECT `bbl_mode, naam, onderwijsniveau` |
| `auth.html` | 887 | `if (sp?.bbl_mode === true)` → bbl-hub.html / bbl-profile.html |
| `bbl-hub.html` | 2485 | SELECT student_profiles inclusief `bbl_mode` |
| `bbl-hub.html` | 2491 | `if (sp?.bbl_mode !== true)` → discover.html |
| `bbl-hub.html` | 2514 | SELECT internship_postings met `bbl_mode` kolom |
| `bbl-dashboard.html` | 523 | SELECT student_profiles met `bbl_mode` |
| `bbl-dashboard.html` | 540 | `if (sp?.bbl_mode !== true)` → discover.html |
| `bbl-profile.html` | 574 | Form-save: `bbl_mode: true` in upsert payload |
| `bbl-profile.html` | 647 | `if (sp && sp.bbl_mode !== true)` → student-profile.html |
| `bbl-profile.html` | 658 | `if (sp && sp.bbl_mode)` voor edit-mode |
| `discover.html` | 1179 | SELECT `bbl_mode, onderwijsniveau` |
| `discover.html` | 1184 | `if (sp?.bbl_mode === true)` → bbl-profile.html |
| `matches.html` | 822 | SELECT `bbl_mode, onderwijsniveau` |
| `matches.html` | 823 | `if (sp?.bbl_mode === true)` → bbl-hub.html |
| `mijn-sollicitaties.html` | 678 | SELECT `bbl_mode, onderwijsniveau` |
| `mijn-sollicitaties.html` | 679 | `if (sp?.bbl_mode === true)` → bbl-hub.html |
| `student-profile.html` | 797 | `let _currentBblMode = false` — tracking variabele |
| `student-profile.html` | 1149 | `const isBBL = data.bbl_mode === true` — bij populateForm |
| `student-profile.html` | 1211 | `bbl_mode: newBblMode` in upsert payload |
| `student-profile.html` | 1251 | `routeStudentByMode({ bbl_mode: newBblMode })` |
| `student-profile.html` | 1297 | SELECT inclusief `bbl_mode` |
| `student-profile.html` | 1302 | `if (existing?.bbl_mode === true)` → bbl-profile.html |
| `bol-profile.html` | 792 | `let _currentBblMode = false` |
| `bol-profile.html` | 1144 | `const isBBL = data.bbl_mode === true` |
| `bol-profile.html` | 1206 | `bbl_mode: false` in upsert |
| `bol-profile.html` | 1246 | `routeStudentByMode({ bbl_mode: newBblMode })` |
| `bol-profile.html` | 1299 | SELECT inclusief `bbl_mode` |
| `bol-profile.html` | 1304 | `if (existing?.bbl_mode === true)` → bbl-profile.html |
| `index.html` | 1139 | Auth-gate: SELECT `bbl_mode` |
| `index.html` | 1141 | `bblMode = sp.bbl_mode === true` |

### 3.3 Single source of truth violations

**SSTV-1: Auth.html bypass van utils.js routeStudentByMode()**

`auth.html:656–663` gebruikt `Internly.detectRole()` en `Internly.routeForRole()` (uit roles.js) voor post-login redirect. Dit is een aparte implementatie naast `routeStudentByMode()` uit utils.js.

`roles.js:55` stuurt `STUDENT_MBO_BOL` naar `/bol-profile.html`.
`utils.js:405–407` stuurt `bbl_mode === false` naar `match-dashboard.html`.

Dit zijn twee verschillende bestemmingen voor hetzelfde geval. Een MBO-BOL student logt in via auth.html → Internly.routeForRole → `bol-profile.html`. Maar als dezelfde student ingelogd is en naar index.html gaat → `smartHomeRedirect()` → `getRoleLanding()` → `discover.html` (ROLE_LANDING:12).

Er zijn nu drie routing-functies actief:
1. `routeStudentByMode()` — utils.js:396 — BOL → match-dashboard.html
2. `Internly.routeForRole()` — roles.js:48 — BOL → bol-profile.html
3. `getRoleLanding()` — utils.js:20 — student → discover.html

**SSTV-2: bbl_mode direct gelezen buiten utils.js**

`bbl_mode` wordt op 18 locaties buiten utils.js direct gelezen uit de database (zie tabel §3.2). De CLAUDE.md stelt dat routeStudentByMode() de "ENIGE beslisser" is — maar de leeslogica wordt niet gecentraliseerd. Iedere pagina doet zijn eigen SELECT student_profiles en interpreteert bbl_mode zelf.

**SSTV-3: Dual sessionStorage rol-tracking**

`auth.html:634` zet `sessionStorage.internly_role = role` na login. `bbl-hub.html:2496` en `bbl-dashboard.html:544` zetten `sessionStorage.internly_role = 'bbl'`. `discover.html:1157` zet `sessionStorage.internly_role = 'student'`.

Utils.js:64–66 erkent dit: "sessionStorage.internly_role bestaat parallel als UI-cache... Beide zijn bronnen van waarheid totdat sprint 5b sessionStorage volledig vervangt." Dit is een gedocumenteerde inconsistentie.

### 3.4 Bestaande helpers

| Helper | Bestand | Doel |
|---|---|---|
| `routeStudent(profile, studentProfile)` | utils.js:366 | Post-login routing voor studenten |
| `routeStudentByMode(studentProfile)` | utils.js:396 | Hub-routing op basis van bbl_mode |
| `getRoleLanding(role, bblMode)` | utils.js:20 | URL per rol+mode |
| `requireRole(...roles)` | utils.js:93 | Pagina-guard met DB-check |
| `requireMode(...modes)` | utils.js:170 | Pagina-guard voor BOL/BBL |
| `getUserMode()` | utils.js:114 | Bepaalt 'bol'\|'bbl'\|'non-student'\|'unauthenticated' |
| `smartHomeRedirect()` | utils.js:25 | Home-knop redirect naar juiste hub |
| `detectRole({role, bbl_mode, onderwijsniveau})` | roles.js:25 | Granulaire rol-detectie |
| `routeForRole(roleKey)` | roles.js:48 | URL per INTERNLY_ROLES waarde |
| `fetchUserRole()` | utils.js:72 | DB-lookup met in-memory cache |

---

## 4. Concept-inventarisatie

### Stage Hub

Twee implementaties:

1. **match-dashboard.html** (6141 r.) — volledig functionele multi-party workspace. Geladen met `?match=UUID` voor authenticatie-modus of zonder voor demo. Bevat: planning, leerdoelen, reflecties, taken, deadlines, kalender, afspraken, evaluatie-signing. Heeft geen `<title>Stage Hub</title>` in de HTML-head maar de browser-tab toont "Stage Hub — Internly" (match-dashboard.html:11).

2. **hub.html** (45 r.) — placeholder voor een BOL-specifieke Stage Hub. Toont een bouwbord-card. Bewaard in navigatie via `renderStudentHeader()` (utils.js:474: `<a href="/hub.html">`). Zal bij klik door BOL-studenten bereikbaar zijn maar slechts de placeholder tonen.

### Matchpool

`discover.html` toont vacatures uit de `internships` en `internship_postings` tabellen. `company-discover.html` toont studentprofielen. Matching geschiedt via `matches` tabel met `party_a` (student) en `party_b` (bedrijf), zie §2.2 voor asymmetrie-risico.

### Trust Score

`renderTrustBadge()` in utils.js:290–308 rendert een badge op basis van `grade` (A/B/C) en `score` (getal). De badge wordt getoond op discover.html en company-dashboard.html. Er is **geen automatisch algoritme**: de Trust Score wordt niet berekend door de applicatie. Berekening is een stub — zie CLAUDE.md §"Trust Score auto-algoritme = niet geïmplementeerd". Admin.html biedt een manuele override via company_profiles update (admin.html:526).

### Leerdoelen

Drie parallelle concepten:
1. `student_profiles.skills` — JSONB array, bedoeld als skills, reused als leerdoelen in bbl-dashboard.html:469.
2. `stage_leerdoelen` tabel — per match, in match-dashboard.html.
3. Hardcoded demo-data in match-dashboard.html:2141–2310 (DEMO_PROFILES met info_steps).

### Buddy-systeem

Volledig geïmplementeerd in js/buddy.js (773 r.). Ondersteunt 5 types: `peer`, `insider`, `mentor`, `gepensioneerd`, `school`. DB-tabellen: `buddy_pairs`, `buddy_requests`, `buddy_queue`. Realtime via Supabase Channels. Aanwezig op discover.html en buddy-dashboard.html. `insider` type is BBL-only (buddy.js:65) maar de check moet extern afgedwongen worden — er is geen DB-guard.

### Rollen en modes

Zie §3. `admin` rol bestaat in profiles maar heeft geen eigen dashboard anders dan admin.html (client-side check, geen DB-RLS).

---

## 5. Data-flows

### Signup/login

**Registratie** (auth.html:680–791):
1. `db.auth.signUp()` met email + password + rol in user_metadata.
2. `profiles` INSERT met role, naam, email.
3. Voor bedrijf/school: `subscriptions` upsert met gratis plan.
4. Voor BBL: `student_profiles` upsert met `bbl_mode: true`.
5. Voor BOL: `student_profiles` upsert met `bbl_mode: false`.
6. Voor gepensioneerd: `waitlist` INSERT.
7. Email-bevestiging vereist (geen automatische redirect na registratie — wacht op bevestigingsmail).

**Login** (auth.html:577–678):
1. `db.auth.signInWithPassword()`.
2. SELECT `profiles.role`.
3. Voor student: SELECT `student_profiles.bbl_mode`.
4. Redirect via `Internly.routeForRole()` of `ROUTES[role]`.
5. Push-registratie fire-and-forget.

### Solliciteren

vacature-detail.html:594–650:
1. Auth-check (soft — toont banner, geen redirect).
2. Rolcheck: `prof?.role !== 'student'` → stop.
3. Duplicate-check: SELECT applications WHERE student_id + internship_id.
4. INSERT applications.
5. INSERT notifications voor bedrijf.
6. `setApplying(true)` in sessionStorage.

### Match accepteren

company-dashboard.html:1546–1568:
1. UPDATE matches SET status='accepted' WHERE id + party_b = currentUser.id.
2. SELECT of INSERT conversations WHERE match_id.
3. `createNotification()` voor student.

### Chatten

chat.html:697–864:
1. Laad conversation via match_id of buddy_pair_id.
2. SELECT messages ORDER BY created_at.
3. Realtime channel subscribeert op messages INSERT.
4. INSERT message met conversation_id, sender_id, body.
5. UPDATE messages SET read=true bij lezen.

### Meeting plannen

calendar.js (InternlyCalendar module):
1. User selecteert beschikbaarheid (upsert availability).
2. Aanvragen via `submitMeeting()` — INSERT meetings.
3. `createNotification()` voor attendee via `MEETING_NOTIFICATION_TYPE`.
4. ~~`send-meeting-email` Edge Function~~ — verwijderd, alleen in-app notificatie.

### Review schrijven

mijn-sollicitaties.html (patroon, exacte regels niet geverifieerd):
1. Student schrijft review na stage.
2. INSERT reviews.
3. Trust Score wordt NIET automatisch herberekend — handmatig via admin.

### BBL evaluatie signeren (signOff-keten)

bbl-hub.html:
1. `signOff(party)` → UPDATE meetings SET status='eval_signed_[party]'.
2. `await createNotification(recipientId, 'eval_signed', ...)` (utils.js:329).
3. Bij beide partijen gesigneerd: type wordt 'eval_completed'.
4. Realtime trigger op ontvangende pagina toont toast.

---

## 6. Security en AVG

### 6.1 RLS-status

Per RLS_DECISIONS.md (19–20 april 2026) zijn dertien RLS-lekken gerepareerd op tien tabellen. Vier SECURITY DEFINER helper-functies zijn aangemaakt.

**Tabellen met herschreven RLS** (RLS_DECISIONS.md r.81–127): `profiles`, `student_profiles`, `company_profiles`, `school_profiles`, `reviews`, `availability`, `vestigingen`, `internship_postings`, `internships`, `school_postings`, `waitlist`.

**Tabellen waarvan RLS NIET herschreven is** (RLS_DECISIONS.md r.127): `applications`, `buddy_pairs`, `buddy_queue`, `buddy_requests`, `bundling_requests`, `conversations`, `esg_reports`, `matches`, `meetings`, `messages`, `notifications`, `push_subscriptions`, `stage_deadlines`, `stage_leerdoelen`, `stage_log`, `stage_plans`, `stage_reflecties`, `stage_tasks`, `subscriptions`, `trust_score_history`, `webhook_events`.

Dit zijn 20 tabellen zonder geverifieerde RLS. Hieronder bevinden zich gevoelige tabellen als `messages`, `notifications`, `meetings`, `matches`, en alle `stage_*` tabellen.

### 6.2 Client-side only checks

| Pagina | Check | Risico |
|---|---|---|
| `admin.html:784–785` | `if (prof?.role !== 'admin')` — client-side | Admin-functionaliteit beschikbaar voor elke user die de JS omzeilt; RLS op profiles is aanwezig maar adminfuncties (delete reviews, override trust score) leunen op client-validatie, niet op DB-policies specifiek voor admin-operaties |
| `match-dashboard.html:2732–2739` | `if (user.id === matchRow.party_a)` / `party_b` — client-side party check | Als RLS op matches niet geverifieerd is (§6.1), kan een user match-data opvragen zonder lid te zijn van de match |
| `match-dashboard.html:2712–2714` | `allowedRoles = ['student','begeleider']` — client-side rolfilter | `begeleider` mag match-dashboard zien maar `requireRole()` in utils.js:94 accepteert `begeleider` niet als geldige rol, dus er is geen herbruikbare centrale guard |
| `company-discover.html:513–519` | `if (userRole !== 'bedrijf')` — client-side | Studieprofiel-gegevens zichtbaar als RLS op student_profiles niet strikt genoeg is |
| `bbl-hub.html:2491` | `if (sp?.bbl_mode !== true)` — client-side | BBL-hub zichtbaar voor BOL-student die SQL direct stuurt, afhankelijk van RLS op student_profiles |
| `hub.html:40` | `if (!await requireMode('bol'))` — DB-check via requireMode | Relatief veilig — gebruikt utils.js getUserMode() met DB-lookup |

**Admin.html specifiek**: De check op r.784 is `prof?.role !== 'admin'`. Als de Supabase anon-key wordt gebruikt om direct queries te sturen naar de Supabase REST API buiten de browser, zijn de admin-functies (updateTrustScore, deleteReview, approveBundling) beschikbaar voor iedereen zolang ze als 'admin' gebruiker authenticeren. Er zijn geen Supabase RLS policies bevestigd die specifiek admin-operaties beperken via de service role.

### 6.3 Persoonsgegevens-inventaris

| Gegeven | Tabel/veld | Zichtbaar voor |
|---|---|---|
| E-mailadres | `profiles.email`, `waitlist.email` | Eigen profiel + admin; optioneel via `email_zichtbaar` vlag |
| Naam | `profiles.naam`, `student_profiles.naam` | Via match-relatie (RLS_DECISIONS.md r.83) |
| Postcode | `student_profiles.postcode` | Eigen profiel; niet in student_profiles_pool view |
| Onderzoeksvraag | `student_profiles.onderzoeksvraag`, `stage_plans.hoofdvraag` | Eigen profiel + match-partijen |
| Motivatiebrief | `student_profiles.motivatie` | Eigen profiel + bedrijf via match |
| Studiegegevens | `student_profiles.opleiding, school, jaar` | Bedrijven via company-discover (geen profiel_zichtbaar filter) |
| Skills/leerdoelen | `student_profiles.skills` | Bedrijven via company-discover |
| Beschikbaarheid | `availability` tabel | Match-partijen (RLS) |
| Beoordelingen | `reviews` tabel | Via reviews_public view (anoniem) |
| Push-abonnementen | `push_subscriptions.endpoint, p256dh, auth_key` | Eigen user + admin; RLS niet geverifieerd |
| BBL contractdata | `matches.contract_end_date`, `student_profiles.contract_start/end` | Match-partijen |
| Buddy-identiteit | `buddy_pairs.requester_id/receiver_id` | Beide partijen; insider-type masked tot reveal_after |
| Reflecties | `stage_reflecties` tabel + localStorage | Match-partijen; ook localStorage per user.id |
| `aggregation_consent` | `student_profiles` | Kolom bestaat (RLS_DECISIONS.md r.53) maar UI-toggle is niet geïmplementeerd (RLS_DECISIONS.md r.184) |

**localStorage persoonsgegevens**: Reflectie-drafts worden opgeslagen als `internly_bbl_reflectie_draft_[userId]` (bbl-hub.html:1696) en reflecties als `internly_bbl_reflecties_[userId]` (bbl-hub.html:1855). Dit zijn persoonlijke reflecties die onversleuteld in de browser blijven.

**AVG-openstaand**: postadres Sasubo Holding B.V. ontbreekt in privacybeleid.html (CLAUDE.md §"Open voor Sprint 5"). DPA nog niet ontvangen (memory/project_launch_todos.md).

### 6.4 Marketing-beloftes versus code

| Belofte | Locatie | Code-realiteit |
|---|---|---|
| "Bedrijven zien straks jouw onderzoeksvraag, leerdoelen en aanpak — alleen voor zover jij dat wilt." | hub.html:21–22 | `hub_visibility` veld bestaat niet. `profiel_zichtbaar_voor_bedrijven` bestaat wel maar wordt nergens gelezen in app-code. Zichtbaarheidscontrole is niet gebouwd. |
| "No ghosting" / "Geen ghosting meer" (index.html tagline) | index.html:12 | Ghosting-bestraffing is stub — CLAUDE.md §"Bekende stubs" |
| Trust Score claims op discover.html (badge toont "Betrouwbaar/Gemiddeld/Let op") | utils.js:296–297 | Trust Score wordt handmatig gezet in admin.html; er is geen automatisch algoritme |
| "Vertrouwen" als kernwaarde op index.html | index.html algemeen | RLS op 20 tabellen niet geverifieerd; admin-guard client-side only |
| Pricing — bedrijf kan stageplaatsen publiceren na betaling | pricing.html | `startCheckout()` roept `create-checkout` Edge Function aan — dit bestaat in supabase/functions. Echter: of Mollie actief is en betaling werkt is niet in code bevestigd. Comment r.505: "stub — Mollie-integratie volgt" |
| ESG-export voor bedrijven | company-dashboard.html r.2302–2303 | "beschikbaar vanaf week 9" — stub per CLAUDE.md |

---

## 7. Demo- en mock-functionaliteit

### 7.1 Match-dashboard demo-modus

**Trigger**: match-dashboard.html wordt geopend zonder `?match=UUID` URL-parameter (match-dashboard.html:2109).

**Modus-detectie**: `const MATCH_ID = new URLSearchParams(window.location.search).get('match')` (r.2109). Bij `null` → demo-modus.

**Authenticatie in demo**: De pagina doet wél een `db.auth.getUser()` call (r.2669). Bij ingelogde user wordt de DB-rol geladen en de role-picker overgeslagen (r.2671–2697). Bij uitgelogde user wordt de role-picker getoond (r.2699–2701).

**Role-picker** (`#role-picker`): Toont drie knoppen — Student, Bedrijf, School. Klick roept `startHub(role)` aan (r.1920 en omgeving).

**"Wissel rol" knop**: `#demo-switch-btn` (r.1970) — zichtbaar in demo-modus, verborgen bij auth-modus (r.2694–2695, r.2751).

**Demo-profielen**: `DEMO_PROFILES` array (r.2141–2430) bevat drie fictieve profielen: Vandaag Agency (bedrijf), Hogeschool van Amsterdam (school), Johan de Vries (buddy). Dit zijn hardcoded fictieve data.

**Demo matchpool toggle**: `_demoEnabled` variabele (r.5919), opgeslagen in `localStorage.internly_demo_profiles` (r.5937). Toggle-knop in UI (r.6033–6036). Bij enabled worden DEMO_PROFILES als kaarten gerenderd in de matchpool.

**Demo-gids**: `_guideSteps` (r.5921) combineert alle `info_steps` van DEMO_PROFILES tot een stap-voor-stap walkthrough. Bereikbaar via `openDemoGuide()` (r.6067).

**UI-indicator**: Demo-toggle toont amber achtergrond bar (r.6032). De "Wissel rol" knop is alleen zichtbaar in demo-modus.

### 7.2 Andere demo-zones

| Bestand | Demo-mechanisme |
|---|---|
| `discover.html` | Demo-vacatures toggle (functie `initDemoDiscover()`, r.1148). Zichtbaar bij niet-ingelogde gebruiker. |
| `company-discover.html` | Demo-studenten toggle (`initDemoCompanyDiscover()`, r.508). Hardcoded fictieve student-kaarten. |
| `match-dashboard.html` | `DEMO_PROFILES` met Trust Score-data, beschrijvingen en info-stappen. |

### 7.3 Placeholder functionaliteit

| Functie | Bestand:regel | Status |
|---|---|---|
| `startCheckout()` voor betaalde plannen | pricing.html:505 | Roept `create-checkout` Edge Function aan — of dit werkt hangt af van Mollie-configuratie. Gratis plannen (company_starter, school_freemium) worden direct in DB gezet zonder betaalgateway. |
| `contact(naam)` | company-discover.html:416–418 | Toont toast `"Verzoek verstuurd aan ${naam}"` — geen DB-insert, geen daadwerkelijke notificatie naar student. |
| ESG-export | company-dashboard.html:2302–2303 | "beschikbaar vanaf week 9" tekst in UI. |
| Ghost-bestraffing | Niet aanwezig | Vermeld in CLAUDE.md als niet geïmplementeerd. |
| Trust Score auto-algoritme | Niet aanwezig | Admin-override beschikbaar; auto-berekening ontbreekt. |
| Begeleider-agenda | Niet aanwezig | Sprint 5 backlog. |
| Buddy-kalender | Niet aanwezig | Sprint 5 backlog. |
| `aggregation_consent` UI | Niet aanwezig | Kolom bestaat, toggle niet gebouwd (RLS_DECISIONS.md r.184). |
| `profiel_zichtbaar_voor_bedrijven` toggle | Niet aanwezig | Kolom bestaat, UI-element niet gebouwd (RLS_DECISIONS.md r.181). |

---

## 8. Bekende risico's en silent failures

### 8.1 Risico's uit CLAUDE.md

**AWGB-risico**: `company-discover.html` biedt domein-filter en skills-filter op studentprofielen. CLAUDE.md (Guinan2, 17 april): "filteropties kunnen proxy zijn voor discriminatoire selectie — domein-filter kan niveau of herkomst impliceren." Juridische beoordeling is nog niet gedaan.

**Matches-tabel asymmetrie** (CLAUDE.md §"Architecturele ketens"): `party_a` en `party_b` betekenen iets anders per `match_type`. Bij `student_to_company`: party_a=student, party_b=bedrijf. Bij `school_referral`: party_a=school, party_b=bedrijf. Elke query die op party_a/party_b leunt zonder `match_type` te lezen kan verkeerd interpreteren. Bevestigd risico in match-dashboard.html:2733–2735 (leest party_a als student en party_b als bedrijf zonder match_type check).

**Admin RLS client-side only**: admin.html:784–785 check is JS-only. Zie §6.2.

### 8.2 Nieuwe silent failures gevonden in deze audit

**SF-1: company-discover.html query't student_profiles zonder profiel_zichtbaar filter**

company-discover.html:362–365 query't `student_profiles` rechtstreeks met SELECT op naam, opleiding, jaar, school, beschikbaar_vanaf, opdracht_domein, skills. Er is geen `.eq('profiel_zichtbaar_voor_bedrijven', true)` filter. Alle studenten met een profiel zijn zichtbaar voor alle bedrijven, ongeacht of ze opt-in hebben gegeven.

RLS op student_profiles is herschreven (RLS_DECISIONS.md), maar de migrate naar `student_profiles_pool` view (aanbevolen in RLS_DECISIONS.md r.187) is nog niet uitgevoerd.

**SF-2: hub.html laadt niet telemetry.js**

hub.html laadt: roles.js, utils.js, supabase.js. telemetry.js ontbreekt (hub.html:8–10). Dit is inconsistent met CLAUDE.md: "Publieke info-pagina's laden telemetry.js NIET". hub.html is geen publieke info-pagina — het heeft een requireMode('bol') auth-guard.

**SF-3: sw.js verwijst naar niet-bevestigde icon-bestanden**

sw.js:18–19: `icon: '/icons/icon-192.png'`, `badge: '/icons/badge-72.png'`. Deze bestanden zijn niet in de rootmap aangetroffen. Bij een push-notificatie worden defecte iconen geladen. `favicon_192x192.png` bestaat wél in de root, maar niet onder `/icons/`.

**SF-4: about.html en index.html bevatten inline Supabase URL + anon-key**

about.html:781–783 en index.html:1246–1251 bevatten de hardcoded SUPABASE_URL en SUPABASE_ANON_KEY. Dit is benoemd in LIVETEST_CONDITIONS.md r.11 als WARN (W2), maar het doorbreekt de "single source of truth" uit supabase.js:4. De anon-key is al publiek in de JavaScript-bundle (niet echt een security-risico voor een public anon-key), maar het is een architecturele inconsistentie.

**SF-5: discover.html - BOL redirect is onjuist**

discover.html:1186: `if (sp?.onderwijsniveau === 'MBO_BOL') { window.location.replace('bol-profile.html'); return; }`. Dit stuurt een MBO-BOL student weg bij elke bezoek aan discover.html, ook als ze al een profiel hebben en vacatures willen bekijken. Er is geen onderscheid tussen "heeft nog geen profiel" en "wil vacatures bekijken". Hetzelfde patroon staat in matches.html:824.

**SF-6: requireRole() accepteert 'begeleider' niet**

utils.js:94: `const validRoles = ['student', 'bedrijf', 'school']`. `begeleider` staat er niet in. match-dashboard.html:2712 staat `begeleider` toe in `allowedRoles` maar gebruikt niet `requireRole()` daarvoor. Als iemand ooit `requireRole('begeleider')` aanroept, geeft dit `console.error` en `return false` (utils.js:96), waarna de pagina redirect naar auth.html. Dit is een stil validatieprobleem.

**SF-7: buddy.js _buddyNotify() gebruikt createNotification() niet**

buddy.js:576–588 definieert `_buddyNotify()` die een directe `db.from('notifications').insert()` doet. Dit omzeilt `createNotification()` in utils.js — de tarpit-vertraging (telemetry.js `_yield()`) wordt niet toegepast bij buddy-notificaties. Ook wordt VALID_NOTIFICATION_TYPES niet gevalideerd.

**SF-8: bbl-hub.html en bbl-dashboard.html laden roles.js niet**

Beide bestanden gebruiken `bbl_mode` direct zonder `Internly.detectRole()`. Dit is consistent met CLAUDE.md (BBL-bestanden gebruiken routeStudentByMode direct), maar het betekent dat roles.js overbodig is voor BBL-pagina's terwijl het wel als "centrale definitie" wordt gepresenteerd.

---

## 9. Dependencies en externe services

| Service | URL | Doel | Status |
|---|---|---|---|
| Supabase | `https://qoxgbkbnjsycodcqqmft.supabase.co` | Database, auth, realtime, storage | Actief |
| Supabase Edge Functions | `/functions/v1/create-checkout`, `/functions/v1/send-push-notification` | Mollie-checkout + push delivery | create-checkout aanwezig; send-push-notification aanwezig per HANDOVER.md r.12 |
| Supabase Edge Function `send-meeting-email` | Niet meer aanwezig | E-mailbevestiging bij meeting | Verwijderd; vervangen door in-app notificatie |
| Mollie | `https://api.mollie.com` | Betalingsverwerking | In CSP .htaccess:16; pricing.html stuurt naar create-checkout; of Mollie actief is: niet bevestigd in code |
| Google Fonts | `fonts.googleapis.com`, `fonts.gstatic.com` | Bricolage Grotesque, Outfit, DM Mono, Caveat | Actief |
| Google Translate | `translate.google.com` | Taalwisseling | Geladen via translate.js; 4 talen: nl/en/de/fr |
| Google Maps | `maps.googleapis.com`, `maps.gstatic.com` | In CSP maar geen implementatie aangetroffen in geauditeerde code | Aanwezig in allowlist, gebruik onbevestigd |
| Mollie JS | `js.mollie.com` | Client-side Mollie widget | In CSP en telemetry.js allowlist:389; geen implementatie gevonden |
| Supabase CDN | `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | Client-library | Actief |
| jsPDF | `cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` | PDF-generatie (match-dashboard) | Geladen op match-dashboard.html:16 |
| VAPID push | Browser PushManager | Web Push Notifications | sw.js + push.js aanwezig; Edge Function deployed per HANDOVER.md |

**CSP (.htaccess:16)**: `script-src 'self' 'unsafe-inline'` — inline scripts zijn toegestaan. Dit is een bewuste keuze (alle applicatie-logica staat in inline `<script>` blocks in HTML-bestanden), maar het verlaagt de XSS-bescherming van de CSP.

---

## 10. Bestaande documentatie

| Bestand | Inhoud | Actueel? |
|---|---|---|
| `CLAUDE.md` | Projectinstructies, laadvolgorde, bekende risico's, sprint-backlog | Actueel per 20 april 2026 |
| `HANDOVER.md` | Sessie-log t/m 14 april 2026; verwijst naar `stage-hub.html` (dood bestand) | Deels verouderd — FileZilla-lijst r.30 |
| `RLS_DECISIONS.md` | Volledige RLS-herschrijving 19–20 april 2026; testresultaten | Actueel |
| `SESSION_LOG.md` | Sprint-log | Aanwezig; inhoud niet volledig geauditeerd |
| `LIVETEST_CONDITIONS.md` | Vier condities voor livetest; condities 3–4 wachten op FTP | Actueel per 20 april 2026 |
| `LIVETEST_SCRIPT.md` | Handmatig test-script | Aanwezig |
| `SESSION_REPORT_2026-04-20.md` | Sessie-rapport 20 april | Aanwezig |
| `SITUATION_REPORT_2026-04-20.md` | Architectuurbeschrijving 20 april; hub.html vs match-dashboard uitleg | Actueel |
| `HUB_PHASE1_DESIGN.md` | Ontwerpdocument hub.html fase 1; hub_visibility concept | Toekomstgericht |
| `role-matrix.md` | Rol-matrix per pagina | Aanwezig; exacte inhoud niet geauditeerd |
| `README.md` | Aanwezig | Inhoud niet geauditeerd |
| `hero-audit.md`, `sprint5_findings.md` | Interne audit-notities | Aanwezig |
| `internly_migration.sql` | SQL-migraties | Aanwezig; niet geauditeerd |
| `Internly_Prijsstrategie_2026.md` | Prijsstrategie | Aanwezig |

---

## 11. Open vragen voor Barry

De volgende punten konden niet worden bevestigd uit de code en vragen een antwoord van de projecteigenaar of Supabase Console toegang:

1. **RLS op 20 niet-herschreven tabellen**: Is er RLS actief op `messages`, `notifications`, `meetings`, `matches`, `stage_plans`, `stage_tasks`, `stage_reflecties`, `stage_leerdoelen`, `stage_log`, `stage_deadlines`, `push_subscriptions`? De RLS_DECISIONS.md zegt deze niet te hebben aangeraakt. Zonder RLS kan elke ingelogde user de volledige inhoud van deze tabellen opvragen.

2. **Mollie-integratie actief?**: Is `create-checkout` Edge Function geconfigureerd met werkende Mollie API-sleutels? pricing.html:505 commentaar zegt "stub — Mollie-integratie volgt". De code stuurt wél naar de Edge Function. Wat gebeurt er als een bedrijf nu op "Kies Pro" klikt?

3. **Push-notificaties end-to-end**: Is `send-push-notification` Edge Function actief en heeft het een database trigger op `notifications INSERT`? HANDOVER.md r.12 zegt "deployed" maar de checklist op r.57–60 heeft open punten.

4. **icon bestanden ontbreken**: Zijn `/icons/icon-192.png` en `/icons/badge-72.png` geüpload via FileZilla? sw.js:18–19 verwijst ernaar maar ze zijn niet in de rootmap aangetroffen.

5. **company_doorstroom tabel**: Welke kolommen heeft deze tabel? bbl-hub.html:2434 query't hem maar de SELECT-kolommen zijn niet zichtbaar in de geauditeerde code.

6. **student_profiles_pool view**: Is de view `student_profiles_pool` aangemaakt in Supabase zoals beschreven in RLS_DECISIONS.md r.63? company-discover.html query't nog steeds de ruwe tabel. Is de migratie van plan?

7. **aggregation_consent UI**: RLS_DECISIONS.md r.184 vraagt om een UI-element voor aggregation_consent. Wanneer wordt dit gebouwd? Tot die tijd geven bestaande studenten geen geldige AVG-toestemming voor data-aggregatie in ESG-rapporten.

8. **profiel_zichtbaar_voor_bedrijven**: Zelfde vraag. Kolom bestaat, toggle bestaat niet, filter bestaat niet in app-code. Alle studenten zijn nu zichtbaar in company-discover ongeacht hun wens.

9. **admin rol RLS**: Is er een Supabase policy die admin-operaties (delete review, update trust_score) beperkt tot gebruikers met `is_admin = true` in de DB? Of werken deze operaties voor elke geldige Supabase sessie?

10. **begeleider_profile_id kolom**: Staat dit veld in student_profiles? begeleider-dashboard.html:698 query't `.eq('begeleider_profile_id', userId)` maar het veld staat niet in de student-profile.html save-payload. Geeft dit een stille empty-result in plaats van fout?

11. **STARR SQL-migratie**: CLAUDE.md vermeldt "STARR SQL-migratie uitvoeren (zie HANDOVER.md)" als openstaand item. Is dit uitgevoerd?

12. **DPA en AVG-compliance**: De DPA is aangevraagd maar nog niet ontvangen (memory/project_launch_todos.md). Is er een verwerkersovereenkomst met Supabase? Het postadres in privacybeleid.html ontbreekt.

---

## 12. Afsluiting

### Overzicht bevindingen

**Architectuur**: De codebase heeft een duidelijke centrale structuur (utils.js, supabase.js) maar de bbl_mode routing-logica is verspreid over 12+ bestanden. Drie routing-functies voor dezelfde beslissing coexisteren. roles.js wordt slechts op twee pagina's geladen ondanks dat het als centrale rol-definitie dient.

**Security**: RLS is serieus aangepakt (RLS_DECISIONS.md). Restrisico: 20 tabellen zonder geverifieerde RLS, waaronder de meest gevoelige (messages, stage_*, notifications). Admin-functies zijn client-side gegatewayed.

**AVG**: Twee kritieke openstaande punten — aggregation_consent UI en profiel_zichtbaar toggle — zijn kolommen die bestaan maar geen bijbehorende UI hebben. Studenten kunnen effectief niet beheren wat met hun data gebeurt.

**Demo vs productie**: De scheiding is goed uitgewerkt in match-dashboard.html maar company-discover.html en discover.html tonen hardcoded demo-data die qua stijl niet onderscheidbaar is van echte data.

**Stubs**: contact() in company-discover.html, ESG-export, ghosting-bestraffing, Trust Score algoritme, buddy-kalender, begeleider-agenda zijn niet functioneel maar wel zichtbaar in de UI.

### Prioriteringssuggestie (niet-normatief)

| Prioriteit | Item | Reden |
|---|---|---|
| P0 | RLS verifiëren op messages, matches, notifications, stage_* | Elke ingelogde user kan mogelijk alle data lezen |
| P0 | profiel_zichtbaar_voor_bedrijven filter in company-discover | AVG — studenten hebben geen effectieve opt-out |
| P1 | aggregation_consent UI | AVG — toestemming is juridisch vereist |
| P1 | icon-bestanden aanmaken onder /icons/ | Push-notificaties tonen broken icon |
| P2 | hub.html telemetry.js laden | Inconsistentie met laadbeleid |
| P2 | contact() stub vervangen door echte notificatie | False UX-feedback |
| P3 | routeForRole() (roles.js) harmoniseren met routeStudentByMode() | Drie routing-functies voor hetzelfde concept |

---

*Einde audit. Aangemaakt op basis van directe code-analyse op 21 april 2026.*
