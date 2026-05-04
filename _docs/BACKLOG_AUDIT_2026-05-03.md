# INTERNLY — BACKLOG AUDIT 2026-05-03

```
═══════════════════════════════════════════════════════════════════════
INTERNLY BACKLOG AUDIT — 3 mei 2026
Commit: 9e13b04 (2026-04-30 14:29:36 +0200)
Laatste branch: main
═══════════════════════════════════════════════════════════════════════
```

> **Werkwijze:** read-only. SQL Editor niet uitgevoerd (geen DB-toegang vanuit Claude). Schema-bewijs komt uit [internly_migration.sql](internly_migration.sql), [AVATAR_MIGRATION.sql](AVATAR_MIGRATION.sql), [BACKLOG_MIGRATION.sql](BACKLOG_MIGRATION.sql), [STAGE_MILESTONES_MIGRATION.sql](STAGE_MILESTONES_MIGRATION.sql) en [sql/migrations.sql](sql/migrations.sql). Bewijs in productie-DB moet handmatig geverifieerd worden.

---

## PRE-FLIGHT INVENTARIS

**HTML in root (geen subdirs, 41 bestanden, sortering alfabetisch):**
404.html · about.html · admin.html · auth.html · bbl-dashboard.html · bbl-hub.html · bbl-profile.html · begeleider-dashboard.html · bol-profile.html · buddy-dashboard.html · chat.html · company-dashboard.html · company-discover.html · discover.html · esg-export.html · esg-rapportage.html · faq.html · hoe-het-werkt.html · index.html · international-school-dashboard.html · international-student-dashboard.html · internly-worldwide.html · internly_simulator.html · kennisbank-artikel.html · kennisbank.html · la-sign.html · match-dashboard.html · matches.html · matchpool.html · mijn-berichten.html · mijn-notities.html · mijn-sollicitaties.html · preview.html · pricing.html · privacybeleid.html · review-form.html · school-dashboard.html · spelregels.html · stagebegeleiding.html · student-profile.html · vacature-detail.html

**JS-bestanden:** [js/account.js](js/account.js) · [js/avatar.js](js/avatar.js) · [js/buddy.js](js/buddy.js) · [js/calendar.js](js/calendar.js) · [js/esg-export.js](js/esg-export.js) · [js/esg-inject.js](js/esg-inject.js) · [js/info.js](js/info.js) · [js/kb.js](js/kb.js) · [js/matchpool.js](js/matchpool.js) · [js/milestones.js](js/milestones.js) · [js/optimistic.js](js/optimistic.js) · [js/profanity.js](js/profanity.js) · [js/profileView.js](js/profileView.js) · [js/push.js](js/push.js) · [js/reistijd.js](js/reistijd.js) · [js/reviews.js](js/reviews.js) · [js/roles.js](js/roles.js) · [js/supabase.js](js/supabase.js) · [js/swipes.js](js/swipes.js) · [js/telemetry.js](js/telemetry.js) · [js/toast.js](js/toast.js) · [js/translate.js](js/translate.js) · [js/utils.js](js/utils.js) · [js/welcome-overlay.js](js/welcome-overlay.js)

**CSS-bestanden:** [css/style.css](css/style.css) (één bestand)

**Edge Functions:** send-push-notification · create-checkout · mollie-webhook · vat-verify

**Schema-conclusies uit migratie-SQL:**
- `student_profiles`: `profile_id, opleiding, niveau, sector, beschikbaar_van, beschikbaar_tot, skills, bio, avatar_url, bbl_mode, naam, school, schooldag, postcode, opdracht_domein, motivatie, pb_naam, contract_start, contract_end, jaar, skills_progress, skills_toelichting, buddy_opt_in, zoekt_buddy, avatar_key`
- `company_profiles`: `profile_id, bedrijfsnaam, sector, contactpersoon, website, beschrijving, logo_url, trust_score, trust_grade, avatar_key, avatar_url`
- `internship_postings`: `title, company_name, trust_score, trust_grade, status, sector, description, location, company_user_id, created_by, hours_per_week, bbl_mode, contract_start, contract_end` (geen `postcode` — alleen `location text`)

> **Schema-gat**: `subscriptions` en `payments` tabellen worden door [js/account.js](js/account.js) en [supabase/functions/create-checkout/index.ts](supabase/functions/create-checkout/index.ts) gelezen, maar staan NIET in [internly_migration.sql](internly_migration.sql). Idem voor `profiles.deletion_requested`, `profiles.deletion_requested_at`, `profiles.telefoon`, `profiles.taal_voorkeur`, `profiles.email_notificaties`. Deze zijn geïmplementeerd in code maar de canon-migratie moet aangevuld of er bestaat een aparte migratie buiten beeld. Zie OUT_OF_SCOPE_CRITICAL.

---

## SECTIE A — BACKLOG FUNCTIONEEL

### A-01 | ACCOUNT-DASHBOARD ALLE ROLLEN
**STATUS: GEDEELTELIJK**

**Bewijs:**
- [js/account.js](js/account.js) is een complete shared module met `renderAccountScreen()`, `handleSaveContact()`, `handleExportCSV()`, `handleDeleteAccount()`, `handleCancelSubscription()`. Bevat zowel NL als EN labels.
- Geïntegreerd in 8 dashboards via `AccountModule.renderAccountScreen('account-container', 'nl|en')`:
  - [bbl-dashboard.html:579](bbl-dashboard.html#L579), [buddy-dashboard.html:1315](buddy-dashboard.html#L1315), [company-dashboard.html:1515](company-dashboard.html#L1515), [international-school-dashboard.html:635](international-school-dashboard.html#L635), [international-student-dashboard.html:1160](international-student-dashboard.html#L1160), [match-dashboard.html:3103](match-dashboard.html#L3103), [school-dashboard.html:1225](school-dashboard.html#L1225)
- Geen aparte account-dashboard.html — modulair geïntegreerd in elk dashboard via container `#account-container`. Dat is op zich correct.
- CSV-export betalingen: [js/account.js:87-116](js/account.js#L87-L116) — werkt mits `payments` tabel rijen heeft.
- Account-verwijderen: [js/account.js:121-140](js/account.js#L121-L140) — schrijft `deletion_requested = true` op profiles.

**Wat ontbreekt voor KLAAR:**
1. `begeleider-dashboard.html` heeft GEEN AccountModule integratie (grep mist dit bestand) — begeleider kan geen accountinstellingen openen.
2. `subscriptions` en `payments` tabellen ontbreken in canon migratie ([internly_migration.sql](internly_migration.sql)) — runtime werkt op aanname dat ze bestaan in productie-DB.
3. Mollie-koppeling: `mollie_subscription_id` en `mollie_customer_id` worden gelezen ([js/account.js:32](js/account.js#L32)) maar zie E-01 voor compleetheid.

**Context voor implementatie:**
- Account-renderer is herbruikbaar en goed geschreven (NL + EN, plan-status kleuren, CSV-download).
- Voeg toe aan begeleider-dashboard.html (1 script-tag + 1 container + 1 init-call).
- Verifieer in Supabase Console dat `subscriptions`, `payments`, `profiles.deletion_requested`, `profiles.deletion_requested_at`, `profiles.telefoon`, `profiles.taal_voorkeur`, `profiles.email_notificaties` daadwerkelijk bestaan.

---

### A-02 | EINDVERSLAG-FLOW BOL + BBL
**STATUS: GEDEELTELIJK**

**Bewijs:**
- Reflectieverslag-PDF-export aanwezig in:
  - [match-dashboard.html:3875](match-dashboard.html#L3875) (knop) en [match-dashboard.html:4536](match-dashboard.html#L4536) (`doc.save('reflectieverslag-...pdf')`)
  - [bbl-hub.html:938](bbl-hub.html#L938) (knop "Exporteer reflectieverslag (PDF)") en [bbl-hub.html:2183](bbl-hub.html#L2183) (`doc.save('bbl-reflectieverslag-...pdf')`)
- `stage_reflecties` tabel met STARR-kolommen aanwezig (zie [internly_migration.sql:371-379](internly_migration.sql#L371-L379) en HANDOVER session 14 apr 2026).
- jsPDF is in beide pagina's geladen.

**Wat ontbreekt voor KLAAR:**
1. **Geen DRAFT-watermerk** in PDF-output. 0 hits voor `DRAFT|watermerk|watermark` in HTML.
2. **Geen "definitief"-knop** die een eindstaat triggert. PDF kan altijd opnieuw geëxporteerd worden — er is geen `is_final` of `submitted_at` op `stage_reflecties`.
3. **Geen automatische `createNotification`** naar bedrijf en school bij definitief.
4. **Geen calendar-entry** (`stage_deadlines` of `meetings` insert) bij definitief.
5. Geen aparte `eindverslag.html` — de flow zit binnen de Hub, wat OK is, maar de afronding is niet gemarkeerd.

**Context voor implementatie:**
- Schema-uitbreiding nodig: `ALTER TABLE stage_reflecties ADD COLUMN is_final BOOLEAN DEFAULT false, ADD COLUMN submitted_at TIMESTAMPTZ;`
- PDF-renderer in match-dashboard regel 4536 en bbl-hub regel 2183 moet conditioneel een DRAFT-stempel tekenen wanneer `is_final = false`.
- Knop "Verslag definitief maken" → update DB + 2× createNotification (school via `student_profiles.school` lookup, bedrijf via match.party_b) + insert `stage_deadlines` of `meetings` rij.

---

### A-03 | BUG SESSIE-VERLIES
**STATUS: GEDEELTELIJK** (vermoedelijk grotendeels KLAAR)

**Bewijs:**
- `requireRole()` gedefinieerd op [js/utils.js:135](js/utils.js#L135).
- `onAuthStateChange` met `SIGNED_OUT` / `USER_DELETED` handler op [js/utils.js:230-232](js/utils.js#L230-L232).
- `smartHomeRedirect()` op [js/utils.js:55](js/utils.js#L55).
- HANDOVER documenteert geen lopend defect; CLAUDE.md noemt onder "open ontwerpvragen" niets over auth-races.

**Wat ontbreekt voor KLAAR:**
1. Bevestigen dat `await requireRole(...)` gebruikt wordt in elk beschermde dashboard (grep `requireRole` op alle dashboards).
2. Onbekend of de SIGNED_OUT-redirect een `isPublic`-array hanteert — zonder die check zou logout op een publieke pagina ook redirecten. (Niet gevonden in initiële grep — diepere read van utils.js:225-240 nodig.)

**Context voor implementatie:**
- Lees [js/utils.js:55-100](js/utils.js#L55-L100) voor smartHomeRedirect-implementatie en [js/utils.js:135-200](js/utils.js#L135-L200) voor requireRole-signatuur.
- Risico: nog onbekend hoe het in-memory cache (regel 95-noot in CLAUDE.md "The Doctor — paradox") interacteert met logout.

---

### A-04 | TELL-A-FRIEND KNOP
**STATUS: OPEN**

**Bewijs:** 0 hits in alle HTML/JS voor `tell.*friend|deel|share.*sheet|WhatsApp|navigator\.share`.

**Context voor implementatie:**
- Nieuwe knop op een dashboard-overzicht (bijv. student match-dashboard, company-dashboard).
- Gebruikt `navigator.share()` als fallback naar copy-link.
- Per-rol copy: student deelt platform met klasgenoot, bedrijf met collega-MKB, school met andere docent.

---

### A-05 | PROFILE EDIT-TO-VIEW + AVATAR UPLOAD
**STATUS: GEDEELTELIJK**

**Bewijs:**
- [js/avatar.js](js/avatar.js) bevat `INTERNLY_AVATARS` (14 vaste SVG-avatars), `renderAvatarPicker()`, `getAvatarSvg()`. Geen Supabase Storage upload — kiest uit 14 vaste avatars (designkeuze).
- [AVATAR_MIGRATION.sql](AVATAR_MIGRATION.sql) voegt `avatar_key` + `avatar_url` toe aan `student_profiles`, `company_profiles`, `school_profiles`, `buddy_queue`, `bbl_student_profiles` (conditioneel) — kolom `avatar_key` ook op `profiles` via [BACKLOG_MIGRATION.sql:11](BACKLOG_MIGRATION.sql#L11).
- [js/profileView.js](js/profileView.js) bestaat (onbekend wat erin zit — niet gelezen).

**Wat ontbreekt voor KLAAR:**
1. Edit-to-view toggle: niet bevestigd op student-profile.html, company-dashboard.html, school-dashboard.html.
2. Echte file-upload naar Supabase Storage staat NIET in avatar.js — alleen SVG-picker. Mogelijk is dat de gewenste flow.
3. AVATAR_MIGRATION.sql moet handmatig op productie-DB gedraaid zijn (vermeld in code als TODO).

**Context voor implementatie:**
- Lees [js/profileView.js](js/profileView.js) en daarna [student-profile.html](student-profile.html) regio rond profielweergave.
- Beslis: SVG-picker volstaat (klaar) of ook foto-upload nodig (extra werk + Storage bucket + RLS).

---

### A-06 | PDF-EXPORT BUDDY-NOTITIES
**STATUS: OPEN**

**Bewijs:**
- [mijn-notities.html](mijn-notities.html) bestaat (nieuw aangemaakt 30 apr 2026) — 0 hits voor `pdf|export|download|jsPDF` (case-insensitief).
- [buddy-dashboard.html](buddy-dashboard.html) heeft 0 directe hits voor "notities + pdf".

**Context voor implementatie:**
- Voeg jsPDF CDN toe aan mijn-notities.html.
- Notities-tabel-naam onbekend — grep `buddy_notes|notities` nodig om te bepalen waar notities zijn opgeslagen.
- 1× "📄 PDF" knop bovenaan notities-lijst, A4-renderer met bullet-list.

---

### A-07 | SHARED FOOTER renderFooter(role)
**STATUS: OPEN**

**Bewijs:**
- `renderFooter` ontbreekt in [js/utils.js](js/utils.js).
- Aantal `<footer>` blokken per HTML-bestand: 70+ unieke footer-blokken (1-2 per bestand). Pricing.html heeft expliciet `<!-- TODO: vervang met shared renderFooter() (Backlog #8) -->` op [pricing.html:726](pricing.html#L726).

**Context voor implementatie:**
- Toevoegen aan [js/utils.js](js/utils.js) naast bestaande `renderStudentHeader()`.
- Argumenten: `role` (bepaalt zichtbare links — bv. ESG link alleen voor bedrijf).
- Alle 70+ footers vervangen door `renderFooter(role)` aanroep + 1 container-div.

---

## SECTIE B — MATCHPOOL & NAVIGATIE

### B-01 | MATCHPOOL ALS TOP-LEVEL NAV TAB
**STATUS: KLAAR (voor student); GEDEELTELIJK (voor bedrijf/buddy inbox-variant)**

**Bewijs:**
- [matchpool.html](matchpool.html) bestaat als top-level pagina.
- [js/matchpool.js](js/matchpool.js) implementeert volledige swipe-flow voor BOL-studenten met round-robin pools (vacatures/buddies/bedrijven), undo-toast, swipes-tabel.
- Bedrijf en buddy: "Interesse in jou"-inbox is geïmplementeerd in [js/swipes.js](js/swipes.js) — gedeeld door company-dashboard en buddy-dashboard.

**Wat ontbreekt voor KLAAR:**
- HEADER_NAV_BY_ROLE inclusie: [js/utils.js:472](js/utils.js#L472) — verifieer of "Matchpool" tab erin staat voor `student`-rol (niet uit grep af te leiden).
- buddy-dashboard.html grep mist `matchpool|swipe|deck` — mogelijk is alleen swipes.js geïntegreerd, niet een eigen matchpool-tab.

**Context voor implementatie:**
- Lees [js/utils.js:472-510](js/utils.js#L472-L510) (HEADER_NAV_BY_ROLE) — zie of student matchpool al heeft.
- Bedrijf/buddy inbox bestaat al (swipes.js); UX-vraag: krijgt deze een eigen "Interesse in jou" tab in de header?

---

### B-02 | SHARED HEADER renderHeader(role) IN UTILS.JS
**STATUS: GEDEELTELIJK**

**Bewijs:**
- `HEADER_NAV_BY_ROLE` op [js/utils.js:472](js/utils.js#L472) — centraal nav-config-object.
- `renderStudentHeader({ containerId, activeTab })` op [js/utils.js:661](js/utils.js#L661) — alleen voor student.
- GEEN `renderBedrijfHeader`, `renderSchoolHeader`, `renderBegeleiderHeader`, `renderBuddyHeader`. Andere rollen renderen eigen header inline in hun HTML-bestand.

**Context voor implementatie:**
- Generaliseer `renderStudentHeader` tot `renderHeader(role, opts)` of voeg per rol een `_render*Header`-helper toe.
- Lees [js/utils.js:472-710](js/utils.js#L472-L710) — bouwblokken zijn er, alleen de bedrijf/school/buddy-renderers ontbreken.
- Footer (A-07) en Header (B-02) kunnen samen in één refactor.

---

## SECTIE C — TECHNISCHE SCHULD

### C-01 | SRI HASHES NIET TOEGEPAST
**STATUS: OPEN**

**Bewijs:** 12 hits voor `integrity=|crossorigin=` over 6 bestanden (bbl-hub.html, chat.html, match-dashboard.html — 2 hits elk; rest alleen via backups). Tegenover 70+ HTML-bestanden met externe scripts. SRI is dus niet structureel toegepast.

**Context:** Geen `SRI_HASHES_TODO.md` of equivalent gevonden.

---

### C-02 | SUPABASE-JS FLOATING @2 PIN
**STATUS: OPEN**

**Bewijs:** Alle ingelogde HTML-bestanden gebruiken `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` (floating major). Voorbeelden:
- [admin.html:17](admin.html#L17), [auth.html:18](auth.html#L18), [bbl-dashboard.html:23](bbl-dashboard.html#L23), [company-dashboard.html:17](company-dashboard.html#L17), enz. (20+ bestanden)

**Context:** Pin op een exacte versie (bv. `@supabase/supabase-js@2.45.4`) + voeg SRI hash toe (combineer met C-01).

---

### C-03 | hasActivePlan() RETURNS ALWAYS TRUE
**STATUS: KLAAR**

**Bewijs:**
- CLAUDE.md regels 99-100: "hasActivePlan() bevraagt subscriptions-tabel actief — _archief HANDOVER zegt 'altijd true/stub' — dat is ONJUIST".
- [begeleider-dashboard.html:1249](begeleider-dashboard.html#L1249) gebruikt `await hasActivePlan('begeleider_starter')` met fallback naar pricing.html — gedraagt zich als echte gate.

**Restpunt:** Lees [js/supabase.js](js/supabase.js) zelf om de bron te bevestigen (niet expliciet uitgelezen).

---

### C-04 | BUDDY-DASHBOARD HIDDEN DIVS + DODE INIT
**STATUS: KLAAR**

**Bewijs:**
- 0 hits voor `welcome-head|welcome-sub|welcomeMsg` in [buddy-dashboard.html](buddy-dashboard.html).
- POLISH_RUN_REPORT.md regels 13-15 documenteren dat de cleanup is uitgevoerd. `welcomeMsg`-pattern blijft alleen in bbl-dashboard.html (regel 261, 510) en begeleider-dashboard.html (regel 490, 1015, 1264) waar het ACTIEF gebruikt wordt — geen dead code.

---

### C-05 | SETTING-CARD-FULL CLASS ONGEDEFINIEERD IN CSS
**STATUS: GEDEELTELIJK** (intentional gap)

**Bewijs:**
- HTML: [buddy-dashboard.html:674](buddy-dashboard.html#L674) gebruikt `class="setting-card setting-card-full"`.
- CSS: 0 hits voor `setting-card-full` in [css/style.css](css/style.css).
- RUN4_OVERZICHT_REDESIGN_REPORT.md regel 78: "intentional, het is een hook voor toekomstige full-width-grid layouts. Voor nu rendert het identiek aan andere setting-cards."

**Context:** Niet urgent. Beslissing nodig: implementeer full-width regel of verwijder de ongebruikte modifier-class.

---

### C-06 | TRUST_SCORE_SPEC.MD ONTBREEKT
**STATUS: OPEN**

**Bewijs:**
- Bestand TRUST_SCORE_SPEC.md bestaat NIET in root.
- `trust_score numeric(5,2) DEFAULT 0` op [internly_migration.sql:68](internly_migration.sql#L68) (`company_profiles`).
- `renderTrustBadge(grade, score, showHint, wrapClass)` op [js/utils.js:285](js/utils.js#L285) — alleen UI-renderer, geen rekenkern.
- Geen `calculateTrust|trustGrade` functie in [js/](js/) bestanden gevonden.
- HANDOVER (14 apr): manuele setting via admin.html ("Trust Score overrides per company"). Geen automatische berekening.

**Context voor implementatie:** Spec moet vastleggen welke signalen meewegen (rating-gewogen-gemiddelde, response-days, meeting-completion-rate) en met welk gewicht. CLAUDE.md sectie "Trust Score basis (sprint 5)" beschrijft de tabellen al. Daarna een Edge Function `recompute-trust-score` of database-trigger op `reviews INSERT`.

---

### C-07 | ABOUT.HTML SMARTHOMEREDIRECT AANROEP
**STATUS: OPEN**

**Bewijs:**
- [about.html:632](about.html#L632): `<a href="#" onclick="event.preventDefault();smartHomeRedirect();" class="topbar-logo">`. Logo-klik triggert auth-redirect.
- [about.html:947](about.html#L947): laadt `@supabase/supabase-js@2` script. Een publieke info-pagina hoort dit niet te doen volgens CLAUDE.md.
- CLAUDE.md regel "about.html + index.html: inline SUPABASE_URL opruimen" als open Sprint 5-werk.

**Context voor implementatie:**
- Vervang `smartHomeRedirect()` door `href="index.html"` of `href="match-dashboard.html"` afhankelijk van auth-state.
- Verwijder Supabase script-tag van about.html als de pagina geen DB-aanroepen doet.

---

### C-08 | OV REISTIJD-CHECK
**STATUS: GEDEELTELIJK**

**Bewijs:**
- [js/reistijd.js](js/reistijd.js) bestaat (52 regels) — `REISTIJD.berekenOV`, `valideer`, `normaliseer` via Google Maps DistanceMatrixService.
- Geladen in [discover.html:22](discover.html#L22) `<script src="js/reistijd.js" defer>`.
- `student_profiles.postcode TEXT` aanwezig in [internly_migration.sql:456](internly_migration.sql#L456).
- [bol-profile.html:555](bol-profile.html#L555): label "Jouw postcode (voor reistijdfilter)" aanwezig.
- BACKUP/discover.backup.2026-04-20-0904.html had volledige UI (filter-knop, slider, badges) — die UI lijkt niet in actuele [discover.html](discover.html) terug te vinden.
- `internship_postings` heeft GEEN `postcode` of `plaats` kolom — alleen `location text`. Dat blokkeert routekaartfunctionaliteit met postcode-precisie.

**Wat ontbreekt voor KLAAR:**
1. UI-filter "max reistijd OV" op [discover.html](discover.html) (mogelijk verloren in revamp).
2. `internship_postings.postcode` kolom toevoegen (of parsen uit `location`-veld).
3. Reistijd-badge op vacature-kaart in discover én op vacature-detail.

**Context voor implementatie:**
- Google Maps API-sleutel nodig (zit niet in env-files in repo).
- Migratie: `ALTER TABLE internship_postings ADD COLUMN IF NOT EXISTS postcode text, ADD COLUMN IF NOT EXISTS plaats text;`
- BACKUP/discover.backup.2026-04-20-0904.html (regel 515-790) bevat de volledige eerdere implementatie als referentie.

---

## SECTIE D — LEGAL / COMPLIANCE

### D-01 | WETTELIJKE PAGINA'S (AVG)
**STATUS: GEDEELTELIJK**

**Bewijs:**
- [privacybeleid.html](privacybeleid.html) bestaat (Mollie wordt expliciet genoemd op regel 641-644).
- [spelregels.html](spelregels.html) bestaat.
- ONTBREKEN: `algemene-voorwaarden.html` (0 hits) · `cookiebeleid.html` (0 hits) · `cookieverklaring.html` (0 hits).
- Geen `consents` of `cookie_consents` of `gdpr_log` tabel in canon-migratie ([internly_migration.sql](internly_migration.sql) — 0 hits).
- CLAUDE.md/MEMORY noemt: "Postadres Sasubo Holding ontbreekt in privacybeleid.html" als open punt.

**Context voor implementatie:**
- Twee pagina's bouwen: `algemene-voorwaarden.html` (B2B-voorwaarden Sasubo Holding) en `cookiebeleid.html` (lijst categorieën die telemetry.js + Google Translate gebruiken).
- Postadres invullen in privacybeleid.

---

### D-02 | COOKIE CONSENT BANNER
**STATUS: OPEN**

**Bewijs:** 0 hits voor `cookie.*banner|cookieBanner|cookieConsent|acceptCookies|CookieFirst|Cookiebot` in alle HTML/JS.

**Context voor implementatie:**
- Zelf bouwen of third-party (Cookiebot, CookieFirst). Met granulaire opt-in (functioneel altijd, analytics opt-in, marketing opt-in) — per AVG verplicht.
- Schakel `js/translate.js` (Google Translate, externe data) en `js/telemetry.js` (gedragstracking) achter consent.
- Tabel: `consents (id, profile_id, category text, granted bool, created_at)`.

---

### D-03 | AVG DATA-EXPORT + ACCOUNT-DELETE UI
**STATUS: GEDEELTELIJK**

**Bewijs:**
- Account-delete: [js/account.js:121-140](js/account.js#L121-L140) — UI-knop in [js/account.js:318-345](js/account.js#L318-L345) (renderDeleteSection).
- `deletion_requested` + `deletion_requested_at` worden geschreven naar `profiles` — 30-dagen-bericht aan gebruiker. Maar de KOLOMMEN staan NIET in [internly_migration.sql](internly_migration.sql) (0 hits).
- Geen JSON data-export van eigen gegevens — alleen CSV-export van betalingen.

**Wat ontbreekt voor KLAAR:**
1. Migratie verifiëren: `profiles.deletion_requested boolean`, `profiles.deletion_requested_at timestamptz`.
2. "Exporteer mijn data als JSON" knop ontbreekt — in renderDeleteSection bijvoorbeeld een tweede knop. Implementeer als `db.from('profiles').select(...)` + alle gerelateerde tabellen → JSON.zip.
3. Achterliggende cron/Edge Function die accounts daadwerkelijk anonymiseert/verwijdert na 30 dagen — niet aanwezig.

---

## SECTIE E — NIEUWE ITEMS

### E-01 | MOLLIE INTEGRATIE
**STATUS: GEDEELTELIJK** (bijna klaar, security-block open)

**Bewijs:**
- Edge Function [supabase/functions/create-checkout/index.ts](supabase/functions/create-checkout/index.ts) — 122 regels, bouwt Mollie Customer + Payment + upserts `subscriptions` rij. Volledig functioneel.
- Edge Function [supabase/functions/mollie-webhook/index.ts](supabase/functions/mollie-webhook/index.ts) bestaat.
- [pricing.html:667-715](pricing.html#L667-L715): `startCheckout(plan)` is GEEN stub meer — roept `create-checkout` Edge Function aan en redirect naar Mollie checkoutUrl. Comment regel 665 ("stub — Mollie-integratie volgt") is verouderd.
- [js/account.js](js/account.js) leest `subscriptions.plan, status, mollie_subscription_id, next_billing_date` en `payments.id, mollie_id, amount, currency, status, description, paid_at`.
- Plannen: `company_pro €59`, `company_business €169`, `school_premium €249/jr`, `school_premium_monthly €29`, `begeleider_starter €49`, `begeleider_pro €79`. Free plans: `company_starter`, `school_freemium`.
- API-sleutel: in Edge Function via `Deno.env.get('MOLLIE_API_KEY')` — geen sleutel in repo (test_ of live_ niet vindbaar). Goed.

**Wat ontbreekt voor KLAAR:**
1. **K4 SECURITY-BLOCKER**: mollie-webhook heeft GEEN signature-verificatie ([SECURITY_AUDIT_2026-05-01.md:242-248](SECURITY_AUDIT_2026-05-01.md#L242-L248)). MOLLIE_WEBHOOK_SECRET env var + HMAC-check moeten worden toegevoegd voor go-live.
2. **Schema-gat**: `subscriptions` en `payments` tabellen ontbreken in [internly_migration.sql](internly_migration.sql). Aparte canon-migratie nodig.
3. Admin-pagina ([admin.html](admin.html)) toont geen subscription-monitor / failed-payment-queue.
4. `pricing.html:665` commentaar is verouderd ("Mollie-integratie volgt" — is allang gestart).

**Context voor implementatie:**
- Verifieer in Supabase: bestaan `subscriptions(profile_id PK, plan, status, mollie_customer_id, mollie_subscription_id, mollie_payment_id, next_billing_date, max_students)` en `payments(id, profile_id, mollie_id, amount, currency, status, description, paid_at, created_at)`?
- K4 fix: 1-2 uur. Lees [supabase/functions/mollie-webhook/index.ts](supabase/functions/mollie-webhook/index.ts), voeg HMAC-Signature header check toe.

---

### E-02 | VERTALINGEN
**STATUS: GEDEELTELIJK**

**Bewijs:**
- [js/translate.js](js/translate.js) — 47 regels, integreert Google Translate widget. Persistente taalkeuze in `localStorage.internly_lang`. Geladen door auth.html, discover.html, matches.html, mijn-sollicitaties.html, company-discover.html (per JSDoc).
- `profiles.taal_voorkeur` kolom — gelezen door [js/account.js:24](js/account.js#L24) en geschreven op regel 413. (Niet expliciet in [internly_migration.sql](internly_migration.sql) — schema-gat.)
- International dashboards bestaan: [international-student-dashboard.html](international-student-dashboard.html) en [international-school-dashboard.html](international-school-dashboard.html) — beide gebruiken `'en'` als lang voor AccountModule.
- AccountModule heeft volledige NL+EN string-pakket ingebouwd (PLAN_LABELS in beide talen, alle UI-labels via `nl ?` ternair).
- Telemetry.js whitelist `translate.google.com`, `translate.googleapis.com`, `translate.gstatic.com` (regel 440-442).
- Geen aparte `js/translations.js` of `js/i18n.js` — voor non-account UI is de aanpak: Google Translate-widget plus enkele hardcoded NL strings.

**Wat ontbreekt voor KLAAR:**
1. International dashboards: zoek op hardcoded NL-strings (bv. button-labels in JS-template-strings) die Google Translate niet kan vertalen omdat ze runtime-gerenderd zijn.
2. auth.html mist taalkeuze bij registratie — first-time international users zien NL-eerst.
3. Geen consent-flow voor Google Translate (privacy: stuurt content naar Google) — koppelen aan D-02 cookie consent.
4. `profiles.taal_voorkeur` schema bevestigen.

**Context voor implementatie:**
- Hybride aanpak werkt: Google Translate voor publieke pagina's, hardcoded EN voor logged-in app-pagina's via de `nl ? 'NL' : 'EN'` ternair die account.js hanteert.
- Eigen i18n-laag (object met keys → translations) loont alleen als Google Translate niet voldoet voor app-internals.
- auth.html: voeg `<select id="signup-lang">` toe en zet keuze in profiles.taal_voorkeur bij registratie.

---

## SECTIE F — TOEKOMSTIGE ITEMS

- **F-01 ESG export**: AANWEZIG — [js/esg-export.js](js/esg-export.js) (296 regels, 6 datapunten DP.01-DP.06, PDF + CSV download), [esg-export.html](esg-export.html), [esg-rapportage.html](esg-rapportage.html), tabel `esg_exports`. Geïntegreerd in company-dashboard.
- **F-02 Minesweeper chat feature**: AANWEZIG — [chat.html:1701-1705](chat.html#L1701-L1705) bevat realtime broadcast channel `minesweeper-{convId}` met events `invite`, `invite_accepted`. Werkende stubbed implementatie.
- **F-03 Buddy waitlist op site**: AANWEZIG — [auth.html](auth.html), [buddy-dashboard.html](buddy-dashboard.html), [js/buddy.js](js/buddy.js), `waitlist` tabel met `buddy_type, available_days, paused, anonymous` kolommen.
- **F-04 Matching intelligence calculateMatchScore**: AFWEZIG — alleen JSDoc-mention in [js/buddy.js:208](js/buddy.js#L208) ("Returns an array of profile objects, ordered by match score") — geen echte implementatie van een match-score-functie.

---

## EINDRAPPORT

```
═══════════════════════════════════════════════════════════════════════
                            STATUS PER ITEM
═══════════════════════════════════════════════════════════════════════
```

**OPEN (nog niet gestart):**
- A-04 (Tell-a-friend)
- A-06 (PDF buddy-notities)
- A-07 (renderFooter)
- C-01 (SRI hashes)
- C-02 (supabase-js floating @2)
- C-06 (TRUST_SCORE_SPEC.md)
- C-07 (about.html smartHomeRedirect + Supabase script)
- D-02 (Cookie consent banner)
- F-04 (calculateMatchScore)

**GEDEELTELIJK (werk begonnen, niet af):**
- A-01 (Account-dashboard) — module af, begeleider-dashboard mist integratie + schema-gat
- A-02 (Eindverslag-flow) — PDF werkt, geen DRAFT-watermerk + geen definitief-trigger
- A-03 (Sessie-verlies) — code aanwezig, full audit nodig
- A-05 (Profile edit-to-view + avatar) — picker af, edit-toggle onbevestigd
- B-01 (Matchpool als top-level) — student-pagina af, bedrijf/buddy-inbox-tab open
- B-02 (renderHeader) — student-renderer + nav-config af, andere rollen open
- C-05 (setting-card-full) — bewust open
- C-08 (OV reistijd) — JS-helper af, UI-filter en internship_postings.postcode open
- D-01 (Wettelijke pagina's) — privacybeleid + spelregels af, voorwaarden + cookiebeleid open
- D-03 (AVG data-export + delete) — delete-flow af, JSON-export + cron-anonymisatie open
- E-01 (Mollie) — Edge Functions + checkout-flow af, K4 webhook-signature blocker
- E-02 (Vertalingen) — Google Translate widget + EN account.js af, taalkeuze auth.html open
- F-02 (Minesweeper) — broadcast channel werkt, full UI niet bevestigd
- F-03 (Buddy waitlist) — DB + UI aanwezig, scope van "op site" onduidelijk

**KLAAR (volledig geïmplementeerd):**
- C-03 (hasActivePlan — geen stub meer)
- C-04 (buddy-dashboard welcome divs verwijderd)
- F-01 (ESG export)

---

### MEEST URGENTE ITEMS VOOR 11 MEI TEST

1. **E-01 K4 Mollie webhook signature** — beveiligingsblocker voor go-live betalingen. Tijdens livetest zonder signature kan elke externe partij subscriptions activeren.
2. **D-02 Cookie consent banner** — wettelijk verplicht; livetest met externe gebruikers is een AVG-incident zonder banner. Koppel aan D-01 (cookiebeleid pagina).
3. **A-03 Sessie-verlies bevestigen** — als een gebruiker na uitloggen op een beschermde pagina blijft hangen tijdens livetest, is dat de eerste bug die getest wordt. Verifieer SIGNED_OUT-redirect doet wat het moet doen op alle 14 dashboards.

---

### CONTEXT SAMENVATTING VOOR IMPLEMENTATIE

| Item | Schema-werk | Bestand-werk | Aanpak |
|---|---|---|---|
| A-01 | Verifieer subscriptions/payments/profiles.deletion_* | begeleider-dashboard.html: voeg AccountModule toe | 1 sessie |
| A-02 | `stage_reflecties.is_final boolean, submitted_at timestamptz` | match-dashboard.html + bbl-hub.html: knop "definitief" + watermerk in PDF | 1 sessie |
| A-04 | Geen | Voeg knop toe aan dashboard-headers | 1 sessie |
| A-06 | Onbekend (notities-tabel grep nodig) | mijn-notities.html: jsPDF + render | 1 sessie |
| A-07 + B-02 | Geen | js/utils.js: renderFooter + renderHeader varianten; vervang in 70+ HTML-bestanden | 2 sessies (header & footer samen) |
| C-01 + C-02 | Geen | Pin alle CDN-versies + integrity attributen genereren via build-script | 1 sessie |
| C-06 | Geen (eerst spec) | Schrijf TRUST_SCORE_SPEC.md → daarna Edge Function | 2 sessies |
| C-07 | Geen | about.html: vervang smartHomeRedirect onclick + verwijder Supabase script | 30 min |
| C-08 | `internship_postings.postcode + plaats` | discover.html: herstel filter-UI uit BACKUP, koppel reistijd.js | 1 sessie |
| D-01 | `consents` tabel | algemene-voorwaarden.html + cookiebeleid.html bouwen + postadres in privacybeleid | 1 sessie |
| D-02 | `consents` tabel | Cookie-banner JS + UI in alle pagina's via shared module | 1 sessie |
| D-03 | bevestig deletion_* | account.js: extra "exporteer JSON" knop | 30 min + cron Edge Function (1 sessie) |
| E-01 | Bevestig subscriptions/payments | mollie-webhook: HMAC-signature check | 2 uur |
| E-02 | Bevestig profiles.taal_voorkeur | auth.html: signup taal-selector | 30 min |
| F-04 | Geen | js/buddy.js: implementeer calculateMatchScore | 1 sessie |

---

### KRITIEKE BEVINDINGEN BUITEN SCOPE (OUT_OF_SCOPE_CRITICAL)

1. **Schema-gat in canon-migratie.** [internly_migration.sql](internly_migration.sql) bevat NIET: tabellen `subscriptions`, `payments`, `swipes`, `buddy_profiles`, `esg_exports`; kolommen `profiles.telefoon, taal_voorkeur, email_notificaties, deletion_requested, deletion_requested_at`; `internship_postings.is_active_profile, duration, start_date, tags`; `student_profiles.onderwijsniveau`. Code verwacht ze allemaal. Aparte migraties moeten bestaan in productie of zijn handmatig uitgevoerd. **Risico**: nieuwe omgeving opzetten via internly_migration.sql faalt op runtime. **Actie**: consolideer alle veld-toevoegingen in canon migratie of documenteer in MIGRATIONS_HARD_WON.md welke handmatige stappen nodig zijn.

2. **Pricing.html commentaar verouderd.** [pricing.html:665](pricing.html#L665) zegt "Mollie-integratie volgt" maar de functie roept de echte Edge Function aan. CLAUDE.md regel 110 noemt het ook nog stub. Consistente boodschap nodig: Mollie is GROTENDEELS LIVE, alleen signature open.

3. **`hours_per_week int` op internship_postings versus seed-data.** Schema-veld bestaat, maar grep naar gebruikers (UI/forms die hours_per_week renderen of bewerken) niet uitgevoerd in deze audit. Mogelijk dood schema-veld.

4. **AVATAR_MIGRATION + STAGE_MILESTONES_MIGRATION + BACKLOG_MIGRATION** zijn losse migratiebestanden in root, niet geïntegreerd in [internly_migration.sql](internly_migration.sql). Bij her-deploy makkelijk te vergeten. **Actie**: voeg bovenaan elk los migratiebestand een `RAN AT: <timestamp>` comment toe na uitvoering, of consolideer.

5. **`begeleider-dashboard.html` mist AccountModule.** Inconsistentie t.o.v. andere 8 dashboards. Begeleider-rol kan accountinstellingen niet zelf beheren — ondergeschoven kindje.

6. **TodoWrite reminders genegeerd.** De auditor (deze sessie) heeft TodoWrite niet gebruikt; bij vervolg-implementatie raadzaam wel.

7. **bbl-dashboard.html en begeleider-dashboard.html** gebruiken nog `welcomeMsg`-pattern actief — geen bug, maar inconsistentie t.o.v. buddy-dashboard.html. Opname in CLAUDE.md voor latere consolidatie aanbevolen ([RUN7_AUDIT_REPORT.md:117](RUN7_AUDIT_REPORT.md#L117)).

8. **profileView.js / welcome-overlay.js niet ingelezen** in deze audit — onbekend wat hun scope dekt. Volgende audit: meelopen.

═══════════════════════════════════════════════════════════════════════
**Einde audit.** Geen wijzigingen aangebracht aan codebase. Alleen leesoperaties uitgevoerd. Schrijf-actie: alleen dit rapport.
═══════════════════════════════════════════════════════════════════════
