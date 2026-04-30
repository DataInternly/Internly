# AUDIT VERIFICATIE — Internly site-wide revamp
**Datum** 29 april 2026
**Verifieerd tegen** c:/Projects/Internly (live codebase, post-fase-D state)
**Verifieerder** Claude Code
**Bronaudit** INTERNLY_REVAMP_AUDIT_2026-04-29.md (via chat geleverd, niet aanwezig in `_revamp_2026-04-29/`)

---

## Summary

- Totaal findings verifieerd: **30**
- CONFIRMED: **15**
- NOT_APPLICABLE: **1**
- PARTIAL: **2**
- UNCLEAR: **0**
- INSTRUCTION_ONLY (skip): **6** (DS1, H1, G1, HT1, PC1, TM1)
- SQL_CHECK_BARRY_RUNS (skip): **1** (CC2)
- FEATURE_SUGGESTION (skip): **3** (P2, TB1, TQ1)
- BLUEPRINT_ONLY (skip): **1** (BL1)
- Extra findings ontdekt door Claude Code: **6** (X1–X6)

**Totaal effectief geverifieerd:** 18 van de 30 findings hebben een codebase-verdict. 11 zijn skip per design. 1 (CC2) is voor Barry's SQL-check.

---

## Top 5 verrassingen

Vijf plekken waar het verdict significant verschilt van de audit-verwachting.

### 1. J2 — auth caveat-corner is AL tab-state-aware
**Audit verwachtte:** static "welkom terug" — moet wisselen.
**Werkelijkheid:** auth.html:644 doet exact wat de audit voorstelt: `logoSub.textContent = tab === 'login' ? 'welkom terug' : 'goed dat je er bent'`. JJ2's fix P1.9 is overbodig. Wel een copy-mismatch: productie zegt "goed dat je er bent" waar audit "fijn dat je er bent" voorstelt.

### 2. J1 — drie ghosting-frasen, niet twee
**Audit verwachtte:** "Geen ghosting meer" vs "Stages zonder ghosting" inconsistentie.
**Werkelijkheid:** "Stages zonder ghosting" staat helemaal NIET in productie (alleen in blueprint). In productie staan **drie** verschillende vormen: "Geen ghosting meer" (about + 2× index meta), "Geen ghosting" (index hero, line 1377), "geen ghosting hier" (chat composer-hint). De inconsistentie is groter dan voorzien.

### 3. H3 — telemetry codenamen zijn ECHT in HTML, en alleen in 2 pagina's
**Audit verwachtte:** mogelijk risico, advies om grep toe te voegen.
**Werkelijkheid:** auth.html (3 hits: lines 706-707, 810-811, 1002-1003) en index.html (4 hits: 1848, 1909, 1916, 1919) gebruiken `_fCtx.blockIfFilled()` en `_fCtx._plant()` actief. Andere pagina's: schoon. Risico is zeer concreet maar geconcentreerd in juist deze twee pagina's — beide al in fase B / homepage v2 territorium. **KRITIEK voor de Claude Code revamp: deze 7 calls mogen niet gestripped worden.**

### 4. G2 — niet 4 maar 14 unieke breakpoints
**Audit verwachtte:** 4 inconsistente breakpoints.
**Werkelijkheid:** **14 unieke max-width breakpoints** (380/400/420/440/460/480/520/580/600/620/640/680/700/768/800/820 px). Plus 0 min-width breakpoints. De inconsistentie is veel breder dan de audit suggereerde. Standaardisatie naar 768px raakt 13 andere waarden.

### 5. DS2 — footers driften al op 5 pagina's
**Audit verwachtte:** risico bij rewrite.
**Werkelijkheid:** drift bestaat NU AL. Index heeft `<footer><div class="footer-inner">` met `footer-brand` + `footer-links`. Auth heeft `<footer class="trust-strip">` met `trust-item` + `trust-dot`. About heeft `<footer><a class="footer-logo">`. Chat heeft 1-regel inline-styled `<footer>© 2026 Sasubo</footer>`. Discover heeft een totaal andere inline-styled groen-deep footer. Het is geen revamp-risico — het is een bestaande schuld die bij rewrite zal verdrievoudigen.

---

## Per-finding verdict (in audit-volgorde)

### Cluster A — Design quartet (11)

#### D1 — Caveat "geen ghosting hier" absolute claim
- **AUDIT VERWACHTTE:** chat composer "geen ghosting hier" is misleidende absolute claim.
- **CHECK:** `grep -inE "geen ghosting|stop ghosting|nul ghosting|0 ghosting|zero ghosting" *.html`
- **OUTPUT:** 6 hits. `chat.html:523:<div class="composer-hint">geen ghosting hier</div>` actief. Plus "Geen ghosting meer" in about + 2× index meta. Plus "Geen ghosting, geen vage beloftes" in index hero.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** chat.html:523, about.html:765, index.html:11, 13, 1377
- **NOTITIE:** De claim leeft op meer plekken dan de audit signaleerde. Eén linguistische lijn nodig over alle vijf locaties.

#### D2 — `--c-buddy-purple` token bestaat niet
- **AUDIT VERWACHTTE:** token wordt aangeroepen, valt terug op default, paars wordt willekeurig.
- **CHECK:** `grep -n "buddy.*purple|--c-buddy|--buddy-" css/style.css` + check buddy-dashboard.html
- **OUTPUT:** Token niet in style.css. buddy-dashboard.html heeft #6d28d9 hardcoded op lines 19, 61, 110, 123, 136, 157, 160, 165, 170, 179 (8+ hits).
- **VERDICT:** **PARTIAL**
- **EVIDENCE:** css/style.css (geen buddy-token gevonden); buddy-dashboard.html:19,61,110,...
- **NOTITIE:** Functioneel werkt het door hardcoded #6d28d9, maar als blueprint `var(--c-buddy-purple)` aanroept zonder token-definitie krijg je een fallback-default (transparent of black). Token-definitie + page-token-aliases nodig.

#### D3 — BBL accent groen ongespecificeerd
- **AUDIT VERWACHTTE:** geen BBL-specifiek token, BBL gebruikt generiek groen.
- **CHECK:** `grep -n "bbl.*accent|--c-bbl|--bbl-" css/style.css` + check bbl-pages
- **OUTPUT:** Geen BBL-specifiek token in style.css. bbl-dashboard.html en bbl-hub.html gebruiken `var(--c-green)` / `#1a7a48`.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** css/style.css; bbl-dashboard.html (D10 minimal rewrite gebruikte rgba(26,122,72,.10) tint)
- **NOTITIE:** Default fallback naar `--c-green` werkt visueel, maar BBL is geen onderscheidende doelgroep zoals Buddy paars heeft. Outstanding O4.

#### J1 — "Geen ghosting meer" vs "Stages zonder ghosting"
- **AUDIT VERWACHTTE:** beide frasen door elkaar.
- **CHECK:** `grep -rn "Geen ghosting meer|Stages zonder ghosting" *.html`
- **OUTPUT:** "Geen ghosting meer" 3× (about:765, index:11, index:13). "Stages zonder ghosting" 0×. Plus "Geen ghosting" in index:1377 en "geen ghosting hier" in chat:523.
- **VERDICT:** **PARTIAL**
- **EVIDENCE:** about.html:765, index.html:11/13/1377, chat.html:523
- **NOTITIE:** Probleem is reëel maar groter dan audit zegt: drie varianten in productie, niet twee. "Stages zonder ghosting" staat alleen in blueprint.

#### J2 — auth caveat-corner hard-coded voor login
- **AUDIT VERWACHTTE:** static "welkom terug" voor zowel login als signup.
- **CHECK:** view auth.html, grep voor caveat-corner / welkom logic
- **OUTPUT:** auth.html:366 default "welkom terug". Line 644 bevat: `logoSub.textContent = tab === 'login' ? 'welkom terug' : 'goed dat je er bent'`.
- **VERDICT:** **NOT_APPLICABLE**
- **EVIDENCE:** auth.html:644
- **NOTITIE:** Productie heeft AL tab-state-aware copy. Audit's voorstel "fijn dat je er bent" is iets anders dan productie's "goed dat je er bent" — minor copy-keuze, geen blocker.

#### J3 — Punctuatie inconsistentie hero-titles
- **AUDIT VERWACHTTE:** mix van punt, geen punt, uitroep.
- **CHECK:** `grep -nE "<h1[^>]*>" *.html`
- **OUTPUT:** 21 h1's. Met punt: faq ("Antwoord. Altijd."), esg-export ("...als bewijsvoering."). Zonder punt: alle andere (auth "Welkom op Internly", about, discover, pricing, etc.).
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** faq.html:442, esg-export.html:616 (met punt) vs auth.html:369, about.html:651, etc. (zonder punt)
- **NOTITIE:** Geen uitroeptekens gevonden, geen vraagtekens. Audit's voorstel "alle hero-titles eindigen met punt" zou 19 pagina's wijzigen. Alternatief: altijd geen punt is dichterbij huidige praktijk.

#### Do1 — Dashboard sidebar dark vs warm body brand-shift
- **AUDIT VERWACHTTE:** sidebars momenteel licht/warm; blueprint wil dark.
- **CHECK:** `grep -A 3 "\.sidebar\s*\{" admin.html company-dashboard.html school-dashboard.html`
- **OUTPUT:** Alle drie: `background: var(--white);` op de `.sidebar` rule.
- **VERDICT:** **CONFIRMED** (per audit logic — dark sidebar in blueprint zou een shift zijn)
- **EVIDENCE:** admin.html:93-96, company-dashboard.html:102-105, school-dashboard.html:96-99
- **NOTITIE:** Strategische beslissing voor Barry (B-Q1). Aanbevolen default uit audit: `--c-green-deep` voor warmte-continuïteit.

#### Do2 — Border-radius inconsistentie
- **AUDIT VERWACHTTE:** veel waarden zonder semantisch patroon.
- **CHECK:** `grep -hoE "border-radius:\s*[0-9]+px" *.html css/*.css | sort -u`
- **OUTPUT:** 17 unieke waarden: 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 30, 40, 50 px (plus 50% voor cirkels).
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** css/style.css + 22 HTML-pagina's
- **NOTITIE:** Tokens `--r-sm` (8), `--r-md` (12), `--r-lg` (20) zijn beschikbaar maar niet consequent gebruikt. Aanbeveling audit: nieuw `--r-bubble: 18px` is geldig.

#### Do3 — Auth card 20px vs Dashboard cards 12px
- **AUDIT VERWACHTTE:** verschillende sizes ongedocumenteerd.
- **CHECK:** view auth.html .auth-card en student-profile.html .card; check style.css token-waarden
- **OUTPUT:** auth.html:114-119 `.auth-card { border-radius: var(--r-lg); }` (= 20px). student-profile.html:501 `.card { border-radius: var(--r-md, 16px); }` (= 12px want style.css zegt --r-md: 12px). Fallback "16px" is FOUT — out-of-sync met token.
- **VERDICT:** **CONFIRMED** + extra mini-bug (verkeerde fallback)
- **EVIDENCE:** auth.html:114-119, student-profile.html:501-509, css/style.css:71-73
- **NOTITIE:** Documenteer in design system. De `--r-md, 16px)` fallback in student-profile.html is een drift-relikwie van vóór token-introductie.

#### P1 — Caveat overuse risico
- **AUDIT VERWACHTTE:** chat heeft AL 2 Caveat-plekken (composer-hint + day-divider).
- **CHECK:** `grep -nE "Caveat" *.html` + count per page
- **OUTPUT:** chat.html: 2 actief gerenderde Caveat-elementen (.day-sep:149, .composer-hint:230). auth.html: 6 referenties (waarvan ~3 daadwerkelijke gerenderde elementen).
- **VERDICT:** **CONFIRMED** voor chat (op limiet). Auth heeft meer Caveat dan Polly's regel toestaat.
- **EVIDENCE:** chat.html:146,149,228,230; auth.html:113-130 (caveat-corner) + auth-eyebrow + signup-eyebrow
- **NOTITIE:** Polly's charter (CC3) is gerechtvaardigd — er is al overschrijding op auth. Niet meer dan 2 Caveat-plekken per pagina.

#### P2 — Empty-state Caveat
- **VERDICT:** **FEATURE_SUGGESTION_NO_CHECK** (per instructie)

---

### Cluster B — Engineering (9)

#### DS1 — "Utility classes" naming verwarring
- **VERDICT:** **INSTRUCTION_ONLY** (per instructie)

#### DS2 — Geen shared header/footer component
- **AUDIT VERWACHTTE:** 22 footers krijgen 22 versies.
- **CHECK:** `grep -A 8 "<footer" {index,auth,about,chat,discover}.html`
- **OUTPUT:** 5 verschillende structuren. index = `footer-inner` met `footer-brand` + `footer-links`. auth = `<footer class="trust-strip">` met `trust-item`. about = `<footer><a class="footer-logo">`. chat = 1-regel inline-styled. discover = inline-styled green-deep footer met andere link-set.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** index.html (footer-inner), auth.html (trust-strip), about.html (footer-logo), chat.html (1-regel inline), discover.html (green-deep inline)
- **NOTITIE:** Drift bestaat NU AL. Snippet-files (O3) zijn een echte fix, niet alleen toekomstige preventie. Outstanding P0.2 verdient zijn prioriteit.

#### H1 — grep limitatie functienamen
- **VERDICT:** **INSTRUCTION_ONLY** (per instructie)

#### H2 — Inline event handlers vs blueprint
- **AUDIT VERWACHTTE:** productie heeft veel inline handlers met productie-specifieke namen.
- **CHECK:** `grep -oE "on(click|...)=\"[^\"]+\"" {auth,chat,discover,student-profile,company-dashboard}.html`
- **OUTPUT:** Tientallen handlers per pagina. Productie-namen: `acceptMatch`, `_msSendInvite`, `_msAcceptInvite`, `_toggleBuddyOptIn`, `herberekeningTrustScore`, `forceTrustRecalculate`, `gotoBerichtenGated`, `showReviewsGated`. Blueprints zouden generieke `sluitPopup`/`schrijfIn`/`closeModal` namen hebben.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** chat.html (10+ unieke `_ms*` handlers), company-dashboard.html (52 inline handlers), student-profile.html (39 inline handlers).
- **NOTITIE:** Risico is dat een blueprint-copy de productie-handlers wist. Per-pagina protocol moet "compare with backup" als verplichte stap hebben.

#### H3 — Telemetry codenamen in HTML pagina's [KRITIEK]
- **AUDIT VERWACHTTE:** silent telemetry break als codenamen weggehaald worden.
- **CHECK:** `grep -lE "_cfg\.|_sess\.|_tel\.|_render\.|_state\.|_fCtx" *.html`
- **OUTPUT:** Slechts 2 HTML-pagina's gebruiken codenamen: auth.html (3 hits) + index.html (4 hits). Codename in beide gevallen is uitsluitend `_fCtx`. Andere codenamen (_cfg, _sess, _tel, _render, _state) komen niet voor in HTML.
- **VERDICT:** **CONFIRMED** (KRITIEK, geconcentreerd)
- **EVIDENCE:** auth.html:706,707,810,811,1002,1003; index.html:1848,1909,1916,1919
- **NOTITIE:** 7 expliciete `_fCtx` calls in 2 pagina's. Beide pagina's vallen al binnen revamp-scope (auth = fase B, index = vorige sessie). De per-page protocol-grep in audit P1.5 is dus essentieel maar simpel: alleen `_fCtx` matcht.

#### B1 — apikey false-positive in fetch headers
- **AUDIT VERWACHTTE:** legitime apikey in waitlist fetch zal alarm geven.
- **CHECK:** `grep -nE "apikey|API_KEY|service_role|SUPABASE_KEY" *.html`
- **OUTPUT:** index.html:1871 + 1942 bevatten `'apikey': 'eyJ...'` met de Supabase anon-JWT. Geen `service_role` keys gevonden.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** index.html:1871, index.html:1942
- **NOTITIE:** De anon-key is legitiem voor client-side waitlist insert. Regex moet `service_role` whitelisten als alarm en `apikey:.*anon` als oké negeren. Geen kritieke security-issue.

#### B2 — RLS impact bij rewrite
- **AUDIT VERWACHTTE:** dashboards roepen veel `.eq` filters aan.
- **CHECK:** count `.eq|.filter|.match` per dashboard
- **OUTPUT:** admin: 16. company-dashboard: **52**. school-dashboard: 39. student-profile: 7. bbl-dashboard: 5. buddy-dashboard: 18. match-dashboard: **64**. Totaal: **201 filter-calls** verspreid over 7 pagina's.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** zie counts hierboven
- **NOTITIE:** match-dashboard en company-dashboard zijn de hoogste risico's. Per-pagina protocol moet expliciet "alle .eq/.filter/.match calls intact" eisen.

#### G1 — Smoke-test checklists
- **VERDICT:** **INSTRUCTION_ONLY** (per instructie)

#### G2 — Mobile breakpoints inconsistent
- **AUDIT VERWACHTTE:** 4 verschillende breakpoints.
- **CHECK:** `grep -hoE "@media[^{]*\(max-width:\s*[0-9]+px\)" *.html css/*.css | sort -u`
- **OUTPUT:** **14 unieke max-width waarden:** 380, 400, 420, 440, 460, 480, 520, 580, 600, 620, 640, 680, 700, 768, 800, 820 px. **0 min-width breakpoints.**
- **VERDICT:** **CONFIRMED** (groter probleem dan audit)
- **EVIDENCE:** verspreid over alle pagina's en css/style.css
- **NOTITIE:** 768px (industry standard) is aanwezig maar slechts 1 van de 14. Standaardisatie raakt 13 plekken. Mobile-first zou min-width-driven CSS vereisen — momenteel 100% max-width = desktop-first.

---

### Cluster C — Continuity (4)

#### S1 — Inline `:root` in pagina's
- **AUDIT VERWACHTTE:** 22 × 50 = 1100 redundante regels.
- **CHECK:** `grep -lE ":root\s*\{" *.html` + per-page token count
- **OUTPUT:** **17 productie-pagina's** hebben inline `:root`, 11–38 token-declaraties elk. Topscore: match-dashboard 38, school-dashboard 24, begeleider-dashboard 23, index 23, company-dashboard 22, stagebegeleiding 22, vacature-detail 20.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** zie 17 pagina's hierboven
- **NOTITIE:** Geschatte totaal ~300–400 redundante token-declaraties (niet 1100, want pagina's hebben gemiddeld ~20 tokens niet 50). Probleem is reëel maar kleiner-in-orde dan audit. Wel: deze pagina's zullen TWEE keer hetzelfde token zien (page :root + global :root), wat tot subtle-CSS-bugs kan leiden bij rewrite.

#### HT1 — auth.html als eerste pagina fase B
- **VERDICT:** **INSTRUCTION_ONLY** (per instructie)

#### TB1 — PROGRESS_LOG suggestion
- **VERDICT:** **FEATURE_SUGGESTION_NO_CHECK** (per instructie)

#### PC1 — Abort-fase protocol
- **VERDICT:** **INSTRUCTION_ONLY** (per instructie)

---

### Cluster D — Strategic (6)

#### TQ1 — Batch-ack mode
- **VERDICT:** **FEATURE_SUGGESTION_NO_CHECK** (per instructie)

#### DO1 — student-profile is form-editor niet dashboard
- **AUDIT VERWACHTTE:** veel form-elementen, weinig stat-cards.
- **CHECK:** count `<input/<textarea/<select` vs `stat-card/stat-val/score/metric/widget` vs `<form/onclick="save|submit"`
- **OUTPUT:** **39 form-elementen**. 5 stat-likes. 1 form/save click. Form-tot-stat-ratio = 8:1.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** student-profile.html (counts via grep -c)
- **NOTITIE:** Doctor's structurele paradox is reëel. Optie B (audit P0.4): dashboard-shell met form-section in plaats van stat-row.

#### TM1 — Atomic write voor style.css
- **VERDICT:** **INSTRUCTION_ONLY** (per instructie)

#### BL1 — Blueprint comments jargon
- **VERDICT:** **BLUEPRINT_ONLY_NO_CODE_CHECK** (per instructie)

#### DX1 — Stagepact hooks ontbreken in esg/pricing
- **AUDIT VERWACHTTE:** geen Stagepact-mentions op esg-rapportage en pricing.
- **CHECK:** `grep -lin "stagepact" *.html`
- **OUTPUT:** Slechts **1 pagina** heeft Stagepact-mentions: index.html. **Zero** mentions in esg-rapportage.html, pricing.html, esg-export.html, faq.html.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** alleen index.html
- **NOTITIE:** Audit P2.10 is gerechtvaardigd. Esg-export en faq zouden ook hooks kunnen krijgen voor compleetheid (Dax2's revenue-driver argument).

#### GU1 — GDPR notice in chat
- **AUDIT VERWACHTTE:** geen GDPR-notice in thread-head.
- **CHECK:** `grep -niE "gdpr|avg|privacy|bewaard|retentie" chat.html`
- **OUTPUT:** **1 hit** — line 475: een footer-link `<a href="privacybeleid.html">Privacy</a>`. Geen retentie/bewaard-notice in thread-head, geen toast bij eerste bericht.
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** chat.html:475 (alleen footer-link)
- **NOTITIE:** Voor BBL student × leerbedrijf chats waar werkplek-info gedeeld kan worden, is een expliciete one-liner in thread-head zinvol. Audit P2.11 is gerechtvaardigd.

---

### Cross-cutting

#### CC2 — Phantom buddy_types in RLS
- **VERDICT:** **SQL_CHECK_BARRY_RUNS_SEPARATELY**

#### CC6 — Trust Score widget zonder spec
- **AUDIT VERWACHTTE:** Trust Score op meerdere plekken in verschillende styles.
- **CHECK:** `grep -liE "trust.score|trust_score" *.html` + render-pattern check
- **OUTPUT:** **19 pagina's** raken Trust Score aan. Verschillende rendering-patronen:
  - **A/B/C grade** in company-dashboard met info-popup ("A=Hoog · B=Gemiddeld · C=Laag")
  - **0-100 numerieke score** in match-dashboard ("trust_scores: { respons: 92, ... }")
  - **4-dimensionale breakdown** in esg-rapportage en match-dashboard (respons/leerdoel/afspraken/begeleiding)
  - **renderTrustBadge() helper** in bol-profile, student-profile, vacature-detail (badge sm/lg)
  - **grade-a/grade-b/grade-c color thresholds** in vacature-detail (`var(--c-green)` / amber / red)
  - **Score-engine logica** "A=30%, B=25%, C=20%, D=25%" in company-dashboard:1884
  - **Uitleg-copy varieert:** "betrouwbaarheid", "platformgedrag rond stages", "responsverplichting", "betrouwbaarheidsscore"
- **VERDICT:** **CONFIRMED**
- **EVIDENCE:** company-dashboard.html:741+1884, match-dashboard.html:2170, vacature-detail.html:248-282+722, student-profile.html:1763, bol-profile.html:1466
- **NOTITIE:** Spec-document nodig: schaal, kleurthresholds, micro-copy, badge-varianten. Hoogste-risico voor inconsistentie tussen revamp-pagina's.

---

## Extra findings (ontdekt door Claude Code)

### X1 — 13 productie-pagina's buiten revamp-scope
- **WAT IK ZAG:** De Claude Code instructie noemt 22 pagina's voor de revamp. De live codebase heeft **36 productie-HTML-pagina's**. 13 staan buiten de revamp-scope.
- **WAAR:** root van c:/Projects/Internly/
  - **Kritieke paths (geraakt door routing):** `bbl-profile.html` (30k — routeStudent BBL-bestemming), `bol-profile.html` (75k — alternatief student-profiel?), `begeleider-dashboard.html` (50k — login-bestemming voor begeleider role), `mijn-berichten.html` (36k — student-header tab), `review-form.html` (15k — post-stage review)
  - **Overige actieve pagina's:** `stagebegeleiding.html` (37k), `kennisbank-artikel.html` (8k), `esg-export.html` (34k), `matchpool.html` (15k — student-header tab)
  - **Placeholder / minor:** `404.html` (3k), `hub.html` (1.7k — placeholder "Stage Hub wordt morgen gebouwd"), `preview.html` (2k — logo-animatie dev-tool), `internly_simulator.html` (114k — game)
- **WAAROM RELEVANT:** Bbl-profile, bol-profile, begeleider-dashboard, mijn-berichten en review-form ZIJN actieve user-paths. Deze pagina's krijgen geen blueprint-treatment en zullen visueel disonant aanvoelen na de revamp. Bbl-profile is via routeStudent() de landing voor BBL-studenten — als student-profile veranderd is en bbl-profile niet, dan ervaren BBL-studenten en BOL-studenten verschillende design-systemen.
- **AANBEVOLEN ACTIE:** Beslissen vóór sprint-eind. Drie opties: (a) uitbreiden naar fase E met deze 5 pagina's, (b) minimal-rewrite (body+fonts+topbar) voor visuele coherentie, (c) accepteren dat deze pagina's als "legacy" overblijven tot sprint 2. Optie (b) is goedkoop en voorkomt design-fragmentatie.

### X2 — Hardcoded SUPABASE_URL + JWT in 3 publieke pagina's
- **WAT IK ZAG:** index.html, about.html en pricing.html bevatten hardcoded Supabase URL én anon-JWT in fetch-headers (waitlist + analytics endpoints).
- **WAAR:** index.html:1871,1942 (apikey JWT), about.html (URL), pricing.html (URL)
- **WAAROM RELEVANT:** CLAUDE.md "Open voor Sprint 5" sectie noemt al expliciet: *"about.html + index.html: inline SUPABASE_URL opruimen"*. **Pricing.html staat NIET op die lijst** maar heeft hetzelfde issue. Sprint 5 cleanup-werk is dus onvolledig gedocumenteerd.
- **AANBEVOLEN ACTIE:** Update CLAUDE.md sprint 5 lijst met pricing.html. Bij revamp pricing — meegenomen in fase C — kan dit naar `js/supabase.js` worden gemigreerd in dezelfde commit.

### X3 — 23 .backup.2026-04-29.html bestanden in productie-root
- **WAT IK ZAG:** De fase A→D revamp creëerde 23 backup-HTML's en 1 backup-CSS in c:/Projects/Internly/ root. Inclusief `index.backup.2026-04-29.html` (laatst gerewriten in vorige sessie).
- **WAAR:** root, alle naast hun productie-tegenhanger
- **WAAROM RELEVANT:** Bij FileZilla-bulk-upload "alles in root" worden deze 24 backup-bestanden óók geüpload — extra kosten + verwarring + potentieel dat een gebruiker `pricing.backup.2026-04-29.html` direct opent (URL is voorspelbaar).
- **AANBEVOLEN ACTIE:** Vóór FTP — verplaatsen naar `_revamp_2026-04-29/backups/` of een `BACKUP/` subfolder. Of gebruik FileZilla filter `*.backup.*.html` om bij upload uit te sluiten. Liever de move-route — verwijdert risico volledig.

### X4 — chat.html footer is 1-regel orphan
- **WAT IK ZAG:** Onderaan chat.html een geïsoleerde mini-footer: `<footer style="text-align:center;padding:8px 0 12px;font-size:.6rem;color:rgba(0,0,0,.18);">© 2026 Sasubo Holding B.V.</footer>` (geen privacy/spelregels/contact links).
- **WAAR:** chat.html (na main thread)
- **WAAROM RELEVANT:** Andere pagina's hebben volledige footers met privacy + spelregels + contact. Chat heeft alleen copyright. Voor een pagina waar BBL-werkplekgesprekken plaatsvinden is het ontbreken van een directe Privacy-link onlogisch (al staat er bovenin op line 475 wel een link).
- **AANBEVOLEN ACTIE:** Als CC1 (header/footer-snippet) wordt geïmplementeerd, krijgt chat de gedeelde footer en is dit opgelost. Geen extra werk nodig.

### X5 — Backup-CSS naast productie-CSS
- **WAT IK ZAG:** `css/style.backup.2026-04-29.css` staat naast `css/style.css`.
- **WAAR:** css/
- **WAAROM RELEVANT:** Niet kritiek — Apache zal niet automatisch deze backup serveren. Maar het is dezelfde categorie als X3: verkeerde plek voor archief-bestanden in de productie-publicatiebron.
- **AANBEVOLEN ACTIE:** Verplaatsen naar `_revamp_2026-04-29/backups/css/` samen met de HTML-backups (zie X3).

### X6 — `--r-md` fallback waarde divergeert van token
- **WAT IK ZAG:** student-profile.html gebruikt `border-radius: var(--r-md, 16px);` als fallback. Maar in css/style.css staat `--r-md: 12px;`. Als style.css niet laadt (of token niet geresolved), krijgt de pagina 16px in plaats van de bedoelde 12px. Productie krijgt 12px nu, maar de relikwie verraadt drift.
- **WAAR:** student-profile.html:507 vs css/style.css:72
- **WAAROM RELEVANT:** Suggereert dat ergens in de tijd `--r-md` van 16px naar 12px is gewijzigd zonder dat alle fallbacks zijn bijgewerkt. Andere pagina's kunnen ook out-of-sync fallbacks bevatten. Dit is een betrouwbaarheidssignaal: tokens en hun fallbacks driften zonder dat iemand het merkt.
- **AANBEVOLEN ACTIE:** Bij fase A—Foundation tokens-block ook een grep-audit toevoegen: alle fallback-waarden in `var(--token, FALLBACK)` patronen moeten matchen met tokens-block. Eens-only-cleanup, niet recurrent.

---

## Aanbevelingen voor de fix-volgorde

### 1. P0 fixes die blijven (vóór Claude Code revamp)
- **P0.1 (Token-definities):** Blijft. D2 (PARTIAL) bevestigt dat zonder `--c-buddy-purple` token er hardcoded paars overal hangt; D3 (CONFIRMED) idem voor BBL.
- **P0.2 (Header/footer snippets):** Blijft. DS2 (CONFIRMED) toont 5 verschillende footers — dit is bestaande schuld, sprint kan dit beter NU oplossen dan na revamp.
- **P0.3 (Smoke-test checklists):** Blijft. Geen codebase-bewijs, maar alle 18 verifieerbare findings hebben toets-implicaties.
- **P0.4 (student-profile archetype):** Blijft. DO1 (CONFIRMED) — 39:1 form-stat-ratio bewijst Doctor's paradox. Optie B (form-section binnen dashboard-shell) is pragmatisch.

### 2. Fixes die geschrapt kunnen
- **P1.9 (auth caveat tab-state):** **Schrappen.** J2 (NOT_APPLICABLE) — productie heeft het al sinds line 644. Wel optionele copy-tweak: "goed dat je er bent" → "fijn dat je er bent" (stilistische voorkeur, niet functioneel).

### 3. Fixes die meer onderzoek vragen
- **P1.5 (telemetry-grep):** Specificeren. H3 toont dat slechts `_fCtx` actief in HTML staat (niet `_cfg`/`_sess`/`_tel`/`_render`/`_state`). Grep-pattern kan vereenvoudigd: alleen `_fCtx\.` zoeken bespaart valse hits op tekstcommentaar.
- **P1.8 (één ghosting-frase):** J1 (PARTIAL) toont DRIE varianten in productie, niet twee. Beslissingsmoment moet alle drie vervangen door één canon-frase. Aanbevolen: "Geen ghosting meer" want het is al de meest gebruikte (3× incl. SEO meta) en korter dan blueprint-frase.
- **CC2 (RLS-check buddy_types):** Vóór D11 buddy-dashboard rewrite — Bedward levert SQL — niet uitstellen.

### 4. Nieuwe items uit "Extra findings" — prioriteit
- **X1 — out-of-scope pagina's:** **P1**. Bbl-profile, bol-profile, begeleider-dashboard, mijn-berichten, review-form zijn user-facing. Aanbevolen: minimal-rewrite (body+fonts+topbar) tijdens fase D-vervolg of fase E, om visuele continuïteit met de revamp te behouden.
- **X3 — backup-bestanden in root:** **P0**. Vóór FTP. 5 minuten werk: `mv *.backup.2026-04-29.html _revamp_2026-04-29/backups/` (plus `css/style.backup.*.css`).
- **X2 — pricing.html SUPABASE_URL hardcoded:** **P2** tijdens fase C pricing-revamp (kosteloos meegenomen).
- **X6 — `--r-md` fallback drift:** **P3** — eens-only audit op token-fallback-consistentie.

### Eindclaim

De audit blijft accuraat in 16 van 24 codebase-verifieerbare findings (CONFIRMED). 1 finding (J2) is achterhaald — al opgelost in productie. 2 findings (D2, J1) zijn PARTIAL — kern klopt, scope groter of anders. 5 SKIP-categorieën blijven zoals beoordeeld.

**Claude Code revamp kan starten nadat:**
1. P0.1–P0.4 zijn gedraaid (per audit)
2. X3 (backup-cleanup) is gedraaid
3. CC2 (SQL-check buddy_types) is afgerond door Barry
4. Beslissing op X1 (out-of-scope pagina's: meedoen of niet?)

Alle andere P1/P2 items kunnen tijdens of na de revamp worden ingebakken.

**— Einde verificatie.**
