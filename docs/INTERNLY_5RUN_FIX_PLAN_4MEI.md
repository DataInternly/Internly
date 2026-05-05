# INTERNLY — 5-RUN FIX PLAN VOOR 11 MEI LIVETEST

**Vastgesteld** 4 mei 2026, 16:30
**Audit-bron** `docs/audits/LIVETEST_AUDIT_4MEI.md`
**Spec-bron** `docs/INTERNLY_HEADER_SPEC.md`
**Eindverantwoordelijk** Picard2 (productbeslissingen door Barry)
**Coördinatie** Hotch2
**Continuïteit** Tom Bomba

---

## DOEL EN SCOPE

44 findings uit audit. 34 in-scope (14 A + 20 B). 10 defer-by-design (C).
**Doel: ≥85% van in-scope fixen in 5 CC-runs vóór 11 mei.**

Productbeslissingen Barry:
- **Cluster 4.6 / 6.3** — optie A: aparte `mijn-abonnement.html`
- **Cluster 1** — optie B: welkomsblok in bestaande dashboards (geen routing-wijziging)

Geforceerde defers (niet in 5 runs):
- **6.6 motivatie-veld op matches** — schema-migratie te risicovol tijdens livetest-week. Workaround: testers schrijven motivatie in eerste chat-bericht. Vermeld in welkomsmail testers.
- **6.1 buddy matchpool feature** — large nieuwe feature, niet veilig in 7 dagen.

---

## VERWACHTE COVERAGE

| Run | A items | B items | Cumulatief |
|---|---|---|---|
| 1 | 3 | 2 | 5/34 = 15% |
| 2 | 3 | 1 | 9/34 = 26% |
| 3 | 3 | 2 | 14/34 = 41% |
| 4 | 2 | 5 | 21/34 = 62% |
| 5 | 2 | 5 | 28/34 = **82%** |

Plus mogelijk 6.4 + 6.8 verifieerbaar tijdens runs (depending on Barry-context) — richting **88%**.

---

## RUN-VOLGORDE EN AFHANKELIJKHEDEN

```
Run 1 (low risk, removes scripts)
  → enables clean public pages
Run 2 (chat is downstream of public pages)
  → enables stable chat flow for routing tests
Run 3 (depends on Run 1+2 for non-broken auth state)
  → enables welkomsblok render on healthy dashboards
Run 4 (header spec touches student pages from R1+R2+R3)
  → stabilizes visual layer
Run 5 (additive — viewer banner + new page)
```

**Tussen elke run: commit + FTP + smoke-test.** Nooit twee runs cumulatief uploaden zonder verificatie. Standing order Tom Bomba.

---

## RUN 1 — TYPE A SCRUB + SESSIONSTORAGE CLEANUP

### Scope (5 items)
- Cluster 3.1 — `smartHomeRedirect()` op publieke pagina's verwijderen [A]
- Cluster 4.4 — `discover.html:1437` sessionStorage cross-pollination [A]
- Cluster 4.7 — bedrijf in discover ziet buddy-context (zelfde root) [A]
- Cluster 3.3 — `kennisbank.html` laadt supabase zonder reden [B]
- Cluster 2.5 — `hoe-het-werkt.html` Type A drift [B]

### Bedward P2 enforcement
Type A pagina's mogen géén `utils.js`, `supabase.js`, `push.js`, `telemetry.js` laden. Alleen `consent.js` waar nodig.

### Files
- `about.html` — strip utils.js + supabase.js + telemetry.js, vervang `smartHomeRedirect`-logo handler door simpele `href="index.html"`
- `pricing.html` — idem
- `faq.html` — idem
- `kennisbank.html` — strip supabase.js, behoud utils.js alleen indien strikt nodig voor translate
- `hoe-het-werkt.html` — Type A header pattern, geen JS-load
- `discover.html:1437` — `sessionStorage.setItem('internly_role', 'student')` → conditional: alleen setten als gebruiker werkelijk student is
- `chat.html` — verifieer dat geen role-overwrite plaatsvindt bij open

### Risico
**Low.** We verwijderen, niet bouwen. Worst case: een logo-klik werkt iets minder slim voor ingelogde users op publieke pagina's — maar redirect via index.html (die wél smart routing doet) lost dat op.

### Post-checks
```powershell
# Bedward P2 verifiëren
$publiek = @("about.html","pricing.html","faq.html","kennisbank.html","hoe-het-werkt.html")
foreach ($p in $publiek) {
  $c = Get-Content $p -Raw
  $hits = @()
  if ($c -match "utils\.js")     { $hits += "utils" }
  if ($c -match "supabase\.js")  { $hits += "supabase" }
  if ($c -match "smartHomeRedirect") { $hits += "smartHomeRedirect" }
  Write-Output "$p violations: $($hits -join ', ')"
}
# Verwacht: alle pagina's GEEN violations
```

### Commit-msg
`fix: Type A scriptload-overtredingen + sessionStorage cross-pollination (audit cluster 3+4)`

### FTP-target
About/pricing/faq/kennisbank/hoe-werkt-het/discover/chat (~7 files)

---

## RUN 2 — CHAT PARSER UNIFICATION + BUDDY PERSISTENCE

### Scope (4 items)
- Cluster 4.3 — buddy → stuur bericht → toont profiel ipv chat [A]
- Cluster 4.2 — BBL → mijn-berichten andere variant [A]
- Cluster 6.7 — buddy-dashboard naamwijziging persisteert niet [A]
- Cluster 1.5 — company-dashboard data-auth-pending fallback [B]

### Files
- `chat.html` — parser ondersteunt **beide** querystring varianten: `buddy_pair_id` én `buddy_pair`. Bij missing/invalid pair: redirect naar `mijn-berichten.html`, niet fallback naar profielview.
- `bbl-hub.html:2813` — wijzig `buddy_pair=` naar `buddy_pair_id=` voor consistentie (defensief, ook al accepteert chat.html beide)
- `buddy-dashboard.html` — vind form-submit handler voor naam-veld, verifieer dat het schrijft naar `profiles.naam` (niet alleen `buddy_profiles.naam`). Voeg expliciete `await` + error-display toe.
- `mijn-berichten.html` — onderzoek of er een variant-template is per rol; visuele drift wegwerken naar Type B-pariteit (matchpool als referentie)
- `company-dashboard.html` — voeg `removeAttribute('data-auth-pending')` in alle catch-blocks van init-chain

### Risico
**Medium.** Chat is kritiek pad. Test grondig met testaccounts vóór FTP.

### Post-checks
```powershell
# Chat parser support beide varianten
Select-String -Path "chat.html" -Pattern "buddy_pair_id|buddy_pair[^_]" |
  Select-Object LineNumber, Line

# Buddy save handler heeft await
Select-String -Path "buddy-dashboard.html" -Pattern "await.*update.*profiles|await.*upsert" |
  Select-Object LineNumber, Line | Select-Object -First 5

# Anti-flicker fallback
Select-String -Path "company-dashboard.html" -Pattern "removeAttribute.*data-auth-pending" |
  Measure-Object | Select-Object Count
# Verwacht: minstens 3 (try-finally pattern)
```

### Smoke test (handmatig)
1. Login als buddy Jan → mijn matches → klik "stuur bericht" op actieve koppeling → moet naar chat.html gaan, NIET naar profiel
2. Login als BBL Daan → header → berichten → moet identieke layout zijn als matchpool-header
3. Login als buddy Jan → wijzig naam in profiel-form → opslaan → refresh → naam moet behouden zijn
4. Login als bedrijf → eerste pagina-load → mag geen wit scherm langer dan 500ms

### Commit-msg
`fix: chat parser eenduidigheid + buddy naam-persistence + anti-flicker fallback`

### FTP-target
chat.html, bbl-hub.html, buddy-dashboard.html, mijn-berichten.html, company-dashboard.html

---

## RUN 3 — WELKOMSBLOK HELPER + 3 DASHBOARDS + BBL ROUTING

### Scope (5 items)
- Cluster 1.1 — BBL student welkomspagina ontbreekt [A]
- Cluster 1.2 — bedrijf welkomspagina ontbreekt [A]
- Cluster 1.3 — school welkomspagina ontbreekt [A]
- Cluster 1.4 — geen shared `renderRoleLanding()` helper [B]
- Cluster 7.1 — BOL-buddy pariteit visueel [B]

### Aanpak (per Barry beslissing optie B)
**Geen aparte welkomstpagina's.** Welkomsblok als component bovenop bestaande dashboards. Geen routing-wijziging behalve voor BBL.

### Helper specificatie
```js
// js/utils.js — nieuwe shared helper
function renderRoleLanding(role, opts = {}) {
  // role: 'bol', 'bbl', 'bedrijf', 'school', 'buddy'
  // opts: { naam, sub, cards: [{icon, title, sub, href}], badge: {text, variant} }
  // Output: HTML string voor inject in landing-container
  // Greeting: "Goedemorgen/middag/avond [naam] 👋"
  // Cards: 3-4 actie-cards consistent met buddy setting-card patroon
  // Badge: rol-pill rechtsboven (sluit aan op spec §4)
}
```

### Files
- `js/utils.js` — `renderRoleLanding(role, opts)` toevoegen onder bestaande render-helpers
- `js/roles.js` — wijzig `getRoleLanding('student', true)` naar `bbl-dashboard.html` (NIET `bbl-hub.html`). bbl-hub blijft bereikbaar via header-tab "BBL Hub"
- `bbl-dashboard.html` — verifieer dat huidige greeting consistent is met helper-output, of refactor naar helper-call
- `company-dashboard.html` — voeg `<div id="role-landing"></div>` bovenaan, vul met `renderRoleLanding('bedrijf', {...})` bij init
- `school-dashboard.html` — idem met `'school'`
- `student-home.html` — refactor om `renderRoleLanding('bol', {...})` te gebruiken (pariteit, niet vereist maar gewenst per audit cluster 7.1)

### Card-content per rol (Barry kan finetunen)
**Bedrijf cards:**
- 📋 Mijn vacatures → company-dashboard.html#vacatures
- 📩 Aanmeldingen → company-dashboard.html#aanmeldingen
- ⭐ Trust Score → company-dashboard.html#trust
- 📊 ESG-rapportage → company-dashboard.html#esg (alleen Business)

**School cards:**
- 👥 Mijn studenten → school-dashboard.html#studenten
- 🏢 Bedrijven verifiëren → school-dashboard.html#bedrijven
- 🚨 Signalen → school-dashboard.html#signalen
- 📞 Mijn oproepen → school-dashboard.html#oproepen

**BBL cards:**
- 🔧 Naar BBL Traject → bbl-hub.html
- 🤝 Buddy zoeken → matchpool.html?type=buddy
- 📋 Sollicitaties → mijn-sollicitaties.html
- 💬 Berichten → mijn-berichten.html

### Risico
**Medium.** Routing-wijziging voor BBL. Helper-functie wordt op 4 pagina's gebruikt — drift-risico als ze niet allemaal tegelijk worden aangepast.

### Post-checks
```powershell
# Helper bestaat
Select-String -Path "js\utils.js" -Pattern "renderRoleLanding" |
  Select-Object LineNumber

# 4 hosts callen helper
Select-String -Path "company-dashboard.html","school-dashboard.html",
  "bbl-dashboard.html","student-home.html" -Pattern "renderRoleLanding" |
  Select-Object Filename, LineNumber

# BBL routing wijziging
Select-String -Path "js\roles.js" -Pattern "bbl-dashboard|bbl-hub" |
  Select-Object LineNumber, Line
# Verwacht: getRoleLanding returnt bbl-dashboard voor student+bbl=true
```

### Smoke test (handmatig)
1. BBL Daan login → moet op bbl-dashboard landen met greeting
2. Klik in header op "BBL Hub" → naar bbl-hub.html
3. Bedrijf login → ziet welkomsblok bovenaan dashboard
4. School login → ziet welkomsblok bovenaan dashboard

### Commit-msg
`feat: shared renderRoleLanding helper + welkomsblokken bedrijf/school/BBL`

### FTP-target
js/utils.js, js/roles.js, bbl-dashboard.html, company-dashboard.html, school-dashboard.html, student-home.html

---

## RUN 4 — HEADER SPEC ENFORCEMENT (CLUSTER 2)

### Scope (7 items)
- Cluster 2.2 — mijn-berichten visuele drift [A]
- Cluster 2.6 — kennisbank.html mist header [A]
- Cluster 2.1 — matchpool render bevestigen [B]
- Cluster 2.3 — bbl-hub hybride header [B]
- Cluster 2.4 — buddy-dashboard double header [B]
- Cluster 2.7 — privacybeleid (overlap met R1, finalisatie) [B]
- Plus: alle Type A pagina's krijgen consistent Type A markup [B]

### Spec-referentie
`docs/INTERNLY_HEADER_SPEC.md` is platform-wet. Geef CC dit document expliciet mee in de instructie.

### Files
- `mijn-berichten.html` — verwijder eventuele inline header-overrides, alleen `renderStudentHeader({ activeTab: 'berichten', ... })` per Type B
- `buddy-dashboard.html` — **verwijder legacy `<div class="topbar">`** per spec §1 Type E ("De role-header IS de enige header")
- `bbl-hub.html` — verwijder eigen inline strip, alleen `renderStudentHeader` per Type B
- `matchpool.html` — bevestig dat `js/matchpool.js:292` `renderStudentHeader` aanroept met `activeTab: 'matchpool'`
- `kennisbank.html` — voeg Type A `<nav class="public-nav">` markup toe per spec §1 Type A
- `hoe-het-werkt.html` — Type A markup standaardiseren (vervolg op R1)
- `about.html`, `pricing.html`, `faq.html` — Type A markup verifiëren
- `css/style.css` — `.role-pill` varianten toevoegen per spec §4 (indien ontbrekend)

### Risico
**Medium-large.** Veel files. Gebruik spec als checklist. Per file één verificatie-grep.

### Post-checks (uit spec §7)
```powershell
# TYPE B: alle student-pagina's renderStudentHeader
Select-String -Path "discover.html","matchpool.html","mijn-sollicitaties.html",
  "mijn-berichten.html","student-profile.html","match-dashboard.html",
  "student-home.html","bbl-hub.html","bbl-dashboard.html" `
  -Pattern "renderStudentHeader" | Select-Object Filename, LineNumber

# Geen blauw in student-nav
Select-String -Path "match-dashboard.html","css\style.css" -Pattern "#1756a8" |
  Select-Object Filename, LineNumber, Line

# role-pill aanwezig
Select-String -Path "discover.html","matchpool.html","mijn-sollicitaties.html",
  "mijn-berichten.html","match-dashboard.html","student-home.html" `
  -Pattern "role-pill" | Select-Object Filename, LineNumber

# Geen dubbele headers in buddy
$buddy = Get-Content "buddy-dashboard.html" -Raw
$topbarCount = ([regex]::Matches($buddy, 'class="topbar"')).Count
Write-Output "buddy-dashboard topbar-count: $topbarCount"
# Verwacht: 0 (legacy verwijderd)
```

### Commit-msg
`refactor: header spec enforcement (cluster 2 systematic)`

### FTP-target
~10 files

---

## RUN 5 — VIEWER-BANNER + MIJN-ABONNEMENT.HTML + RESTBUGS

### Scope (7 items)
- Cluster 5.1 — geen viewer-banner CSS-class [A]
- Cluster 4.6 / 6.3 — bedrijf abonnement-overzicht (mijn-abonnement.html) [A]
- Cluster 5.2 — match-dashboard tabs zichtbaar voor bedrijf maar acties uit [B]
- Cluster 5.3 — backlog item 11 planning-knop [B]
- Cluster 4.5 — pricing.html context-aware back [B]
- Cluster 6.4 — zoekstagiaires plan-gating (afhankelijk van Barry-input) [B]
- Cluster 6.8 — "maak profiel aan" verkeerd getoond (afhankelijk van repro) [B]

### Files
- `css/style.css` — `.viewer-banner` class met variant per rol-context
- `match-dashboard.html` — conditionele `.viewer-banner` boven content wanneer `currentUser !== student-eigenaar`
- **NEW** `mijn-abonnement.html` — pagina met huidig plan, billing-datum, gebruik-stats, upgrade-knop. Leest uit `subscriptions` tabel (per memory backlog item 1). Type C header (sidebar bedrijf) of Type B-variant.
- `company-dashboard.html` — alle 7 abonnement-knoppen (regels 714, 1556, 1665, 1681, 1786, 3185, 3226, 3631) wijzigen naar `mijn-abonnement.html` ipv `pricing.html#section-bedrijf`
- `pricing.html` — context-aware back-knop (als `?from=company-dashboard` in querystring, terug naar dashboard)
- `student-home.html` — verifieer condition voor "maak profiel aan" (zou alleen moeten triggeren bij missing naam, NIET na invullen)

### Mijn-abonnement.html minimum-content (Run 5)
- Huidig plan-naam ("Bedrijf Pro" / "Bedrijf Business" / "Gratis")
- Volgende factuurdatum (uit subscriptions.next_billing_date)
- Aantal actieve vacatures vs plan-limiet
- Upgrade-link naar pricing
- Annulering link (mailto:boekhouding@internly.pro voor 11 mei, Mollie self-service later)
- Footer met factuurarchief-placeholder ("binnenkort")

### Risico
**Low-medium.** Additieve fixes. Nieuwe pagina is greenfield. Viewer-banner is CSS-only + één conditional.

### Post-checks
```powershell
# Viewer-banner aanwezig
Select-String -Path "css\style.css" -Pattern "viewer-banner" |
  Select-Object LineNumber, Line | Select-Object -First 5

# Match-dashboard gebruikt het
Select-String -Path "match-dashboard.html" -Pattern "viewer-banner" |
  Select-Object LineNumber, Line

# Mijn-abonnement bestaat
Test-Path "mijn-abonnement.html"

# Company-dashboard knoppen alle naar mijn-abonnement
Select-String -Path "company-dashboard.html" -Pattern "pricing\.html.*section-bedrijf" |
  Measure-Object | Select-Object Count
# Verwacht: 0 (alle 7 vervangen)
```

### Smoke test (handmatig)
1. Bedrijf login → klik abonnement → moet naar mijn-abonnement.html, NIET pricing
2. Pricing.html van bedrijf-context geopend → klik back → moet terug naar company-dashboard
3. Bedrijf in match-dashboard → moet viewer-banner zien ("Je bekijkt de stage van [student]")
4. Student profiel ingevuld → klik "Mijn profiel" → moet detail-view tonen, NIET "maak profiel aan"

### Commit-msg
`feat: mijn-abonnement.html + viewer-banner + remaining audit fixes`

### FTP-target
css/style.css, match-dashboard.html, mijn-abonnement.html (NEW), company-dashboard.html, pricing.html, student-home.html

---

## TIJDPLANNING

| Dag | Run | Tussen-status |
|---|---|---|
| Maandag 4 mei (vandaag) | Plan opstellen + Run 1 instructie schrijven | — |
| Dinsdag 5 mei | Run 1 uitvoeren + smoke + FTP | Type A clean |
| Woensdag 6 mei | Run 2 uitvoeren + smoke + FTP | Chat stable |
| Donderdag 7 mei | Run 3 uitvoeren + smoke + FTP | Welkomstblokken live |
| Vrijdag 8 mei | Run 4 uitvoeren + smoke + FTP | Header consistent |
| Zaterdag 9 mei | Run 5 uitvoeren + smoke + FTP | Eindfase |
| Zondag 10 mei | Buffer + finale smoke + welkomsmail testers | — |
| Maandag 11 mei | **LIVETEST** | — |

**Buffer is essentieel.** Eén run loopt 100% gegarandeerd uit. Plan zondag voor recovery, niet voor extra werk.

---

## DEFER LIJST — WAT NA 11 MEI

### Bucket C uit audit (10 items, by design)
- 1.x cosmetic refinements
- 4.1 BBL → matchpool perceptie (mogelijk geen bug)
- 6.5 notitie-export (backlog #7)
- 6.9 reistijd-filter perfectionering
- 7.2, 7.3 visuele refinements

### Forced defers (kritiek maar niet veilig in 7 dagen)
- **6.6 motivatie-veld op matches** — schema-migratie. Workaround: testers schrijven motivatie in eerste chat-bericht. Documenteer in welkomsmail.
- **6.1 buddy matchpool feature** — large nieuwe feature. Buddy testaccount Jan kan matchpool-tab klikken en lege staat zien met "Binnenkort"-tekst.

### Nieuwe backlog-toevoegingen uit audit
- Index-spec audit (memory backlog #9 al genoteerd, blijft prioriteit na livetest)
- ESG-tab uitbreiding voor Business
- Footer-helper renderFooter(role) — backlog #8

### Direct tijdens livetest documenteren (niet fixen)
- 6.4 zoekstagiaires plan-gating — Barry geeft UI-context, dan na 11 mei fixen
- 6.8 "maak profiel aan" condition — Barry geeft repro-stappen, dan fixen
- Alle nieuwe observaties van 5–8 testers tijdens 11 mei

---

## RISICO-REGISTER

| Risico | Kans | Impact | Mitigatie |
|---|---|---|---|
| Run 2 chat-bug niet gereproduceerbaar | midden | hoog | Smoke-test elk pad voor FTP |
| Run 3 helper-drift over 4 pagina's | midden | midden | Eén CC-sessie alle 4 hosts tegelijk |
| Run 4 header-refactor breekt CSS | midden | midden | Per-file commit, niet bundelen |
| Run 5 nieuwe pagina mijn-abonnement.html crasht zonder subscriptions-tabel | hoog | hoog | Lege-state als fallback, eerst data-load met try/catch |
| FTP-conflict door eerdere niet-gecommitte files | hoog | midden | Standing order Tom Bomba: commit voor elke run |
| Test-account data corrupt door run | laag | hoog | Backup van auth.users + profiles vóór elke run |
| Sessie loopt uit, geen tijd voor smoke | midden | hoog | Buffer-zondag 10 mei is geen werk-dag, alleen smoke |

---

## STANDING ORDERS PER RUN

Voor elke CC-sessie:
1. Lees relevante bestanden EERST. Geen str_replace zonder voorafgaand `view`.
2. SQL en CC-instructies NOOIT mengen.
3. Eén commit per run met duidelijke commit-msg.
4. FTP pas nadat smoke-test slaagt.
5. Testaccount-data niet aanraken.
6. Bij twijfel: stop en flag, niet doorbouwen.
7. Na elke run: Tom Bomba update `HANDOVER.md` met run-status en next-step.

---

## BIJLAGEN

- `docs/audits/LIVETEST_AUDIT_4MEI.md` — bron-audit
- `docs/INTERNLY_HEADER_SPEC.md` — platform-wet voor Run 4
- `CLAUDE.md` — laadvolgorde en build-rules
- `RLS_DECISIONS.md` — security-context

---

**Plan-status: definitief.** Eerste actie: schrijf CC-instructie voor Run 1.
