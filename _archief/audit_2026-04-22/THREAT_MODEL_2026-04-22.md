# Hotch2 — Threat Model
**Datum**: 22 april 2026
**Rol**: BAU 2.0 lead. Elke zwakte heeft een actor. Elke actor heeft een motief. Mijn taak is ze matchen.
**Scope**: De 8 bekende zwaktes uit sessies 1–3 × STRIDE × threat actor classification.
**Instructie**: READ-ONLY analyse — geen code-wijzigingen.

---

## Methode

STRIDE per zwakte:
- **S** — Spoofing: kan een actor zich voordoen als iemand anders?
- **T** — Tampering: kan een actor data wijzigen die niet van hen is?
- **I** — Information disclosure: kan een actor data zien die niet bedoeld is voor hen?
- **D** — Denial of service: kan een actor functionaliteit blokkeren?

Actors:
- **Opportunist**: nieuwsgierige gebruiker, geen kwade opzet, browser-devtools
- **Competitor**: concurrent, wil data of advantages stelen
- **Malicious user**: heeft account, misbruikt platform voor eigen gewin
- **External**: geen account, probeert in te breken
- **Insider**: legitieme toegang (Barry, admin-gebruiker, mede-dev)

---

## Zwakte 1 — Admin RLS client-side only

**Definitie**: admin.html voert Trust Score updates, review-beheer en gebruikersoverzicht uit via de standaard Supabase anon-key client. Er is geen server-side authenticatie die controleert of de aanvrager een admin is. De beveiliging bestaat uitsluitend uit "is admin.html geladen in de browser?"

| Actor | S | T | I | D | Waarschijnlijkheid | Impact |
|-------|---|---|---|---|---------------------|--------|
| Opportunist | ✗ | ✓ | ✓ | ✗ | LAAG (weet URL niet) | HOOG |
| Competitor | ✗ | ✓ | ✓ | ✗ | LAAG | HOOG |
| Malicious user | ✗ | ✓ | ✓ | ✗ | MIDDEL (kent URL via inspect) | HOOG |
| External | ✗ | ✓ | ✓ | ✗ | LAAG | HOOG |
| Insider | ✗ | ✓ | ✓ | ✗ | HOOG (heeft toegang) | HOOG |

**Top threat**: Een kwaadwillende gebruiker die admin.html URL ontdekt (via JS source inspect of sitemap) kan direct de Trust Score van elk bedrijf aanpassen naar 0. Geen wachtwoord, geen extra auth — alleen een Supabase query met de publieke anon-key. De operatie laat geen audit-trail na (geen `updated_by` kolom).

**Conditioneel**: Als de `company_profiles`-tabel een RLS-policy heeft die UPDATE beperkt tot `auth.uid() = profile_id` (eigen bedrijf), dan is dit scenario beperkt tot eigen data. Maar de admin-functie vereist cross-user access — wat suggereert dat admin-users mogelijk service-role-level rechten hebben, of dat de RLS dit pad niet dekt.

**Prio**: P1

---

## Zwakte 2 — Trust Score dual-source (geen autoritatieve bron)

**Definitie**: `trust_score` staat in zowel `company_profiles` als `internship_postings`. Beide worden geschreven door admin.html en company-dashboard.html. Geen DB-trigger synchroniseert ze.

| Actor | S | T | I | D | Waarschijnlijkheid | Impact |
|-------|---|---|---|---|---------------------|--------|
| Malicious user (bedrijf) | ✗ | ✓ | ✗ | ✗ | MIDDEL | MIDDEL |
| Insider | ✗ | ✓ | ✗ | ✗ | HOOG | MIDDEL |

**Top threat**: Een kwaadwillend bedrijf ontdekt dat een UPDATE van `internship_postings.trust_score` (voor eigen vacatures) niet gesynchroniseerd wordt met `company_profiles.trust_score`. Als de discover.html leest van `internship_postings`, maar de admin leest van `company_profiles`, kan het bedrijf in de student-view een hogere badge tonen dan de admin ziet. Effectief: Trust Score gaming per doelgroep.

**Prio**: P2

---

## Zwakte 3 — party_a/party_b semantische wisseling per match_type

**Definitie**: Bij `school_referral` is `party_a` de school, niet de student. Code die `hubPartyIds.student = matchRow.party_a` schrijft, kent de school-rol een student-identiteit toe.

| Actor | S | T | I | D | Waarschijnlijkheid | Impact |
|-------|---|---|---|---|---------------------|--------|
| Opportunist (school) | ✓ | ✗ | ✓ | ✗ | LAAG | MIDDEL |
| Malicious user (school) | ✓ | ✗ | ✓ | ✗ | LAAG | HOOG |

**Top threat**: Een school-gebruiker met een `school_referral`-match heeft in match-dashboard.html theoretisch toegang tot de "student"-view, die laadt via `hubPartyIds.student` = school's eigen user_id. In de praktijk geeft dit lege profielen (school heeft geen student_profile record). Maar als de code later student-specifieke data ophaalt via dit hubPartyId, kan een school onbedoeld student-data zien.

**Prio**: P3 (laag risico nu, loopt mee met match-dashboard groei)

---

## Zwakte 4 — SUPABASE_ANON_KEY publiek zichtbaar

**Definitie**: De anon-key staat in js/supabase.js (via `<script>` tag), volledig leesbaar voor elke bezoeker via browser-inspect. Dit is standaard Supabase-patroon — de key is bedoeld voor client-side gebruik. De veiligheid hangt volledig af van de RLS-policies op de DB.

| Actor | S | T | I | D | Waarschijnlijkheid | Impact |
|-------|---|---|---|---|---------------------|--------|
| Opportunist | ✗ | ✓ | ✓ | ✓ | HOOG | VARIABEL |
| External attacker | ✗ | ✓ | ✓ | ✓ | MIDDEL | VARIABEL |
| Competitor (scraper) | ✗ | ✗ | ✓ | ✗ | MIDDEL | MIDDEL |

**Top threat**: Elke bezoeker kan de anon-key ophalen en direct Supabase REST API calls maken buiten de browser-interface om. Zij kunnen:
- Alle tabellen proberen te scrapen (resultaat afhankelijk van RLS)
- Writes proberen voor tabellen zonder strikte write-RLS
- Realtime subscriptions aanmaken voor tabellen die ze normaal niet zien
- De key gebruiken in een geautomatiseerd script (scraper, spambot)

De key kan niet worden geroteerd zonder de hele client-side code te updaten. Dit is een structurele eigenschap van het Supabase client-side model, niet per se een bug — maar het verhoogt de impact van elke RLS-gap dramatisch.

**Prio**: P2 (risico zit bij de RLS-configuratie; key-zichtbaarheid is onvermijdelijk)

---

## Zwakte 5 — telemetry.js zelf-monitoring gap

**Definitie**: telemetry.js (hunters.js) monitort DOM-manipulatie, timing-anomalieën, en CSP-overtredingen. Maar telemetry.js zelf heeft geen integriteitscheck — als een script telemetry.js overschrijft of uitschakelt, wordt dat niet gerapporteerd.

| Actor | S | T | I | D | Waarschijnlijkheid | Impact |
|-------|---|---|---|---|---------------------|--------|
| External (XSS) | ✗ | ✓ | ✗ | ✓ | LAAG | HOOG |
| Insider | ✗ | ✓ | ✗ | ✓ | LAAG | HOOG |

**Top threat**: Een aanvaller met XSS-toegang (bijv. via geïnjecteerde content in notifications of chat-berichten) kan `window.__telemetryDisabled = true` zetten of de monitoring-functies overschrijven. Daarna kan de aanvaller ongestoord opereren terwijl de monitoring "groen" rapporteert.

**Aanvullende observatie**: De codenamen (hunters.js, _cfg, _sess, etc.) zijn alleen veilig zolang de vertaaltabel in CLAUDE.md intern blijft. Als een insider de broncode inspecteert, zijn de namen transparant.

**Prio**: P3

---

## Zwakte 6 — CDN zonder SRI voor supabase-js @2 (floating tag)

**Definitie**: supabase-js wordt geladen via `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` zonder `integrity`-attribuut. De `@2` tag is een floating major version — de exacte inhoud kan wijzigen.

| Actor | S | T | I | D | Waarschijnlijkheid | Impact |
|-------|---|---|---|---|---------------------|--------|
| External (supply chain) | ✗ | ✓ | ✓ | ✓ | ZEER LAAG | KRITIEK |
| Competitor | ✗ | ✗ | ✗ | ✗ | N.v.t. | N.v.t. |

**Top threat**: Als jsdelivr of het supabase-js npm-pakket wordt gecompromitteerd (supply chain attack), kan kwaadaardige JavaScript worden geladen in alle 17 app-pagina's. Zonder SRI hash is er geen browser-level verificatie. Omdat supabase-js de auth-client is die sessietokens beheert, is de impact maximaal: alle sessiedata en Supabase queries zouden via de kwaadaardige library kunnen lopen.

**Kanttekening**: Supply chain attacks op grote CDNs zijn zeldzaam maar niet hypothetisch (Polyfill.io incident, 2024).

**Prio**: P2 (lage kans, maximale impact)

---

## Zwakte 7 — Inline SUPABASE_URL in 3 publieke pagina's

**Definitie**: index.html, about.html, pricing.html bevatten SUPABASE_URL direct inline als `const SUPABASE_URL = '...'`. Dit is een loop-shield uitzondering die kan groeien.

| Actor | S | T | I | D | Waarschijnlijkheid | Impact |
|-------|---|---|---|---|---------------------|--------|
| Opportunist | ✗ | ✗ | ✓ | ✗ | HOOG | LAAG |

**Top threat**: Niet zozeer een directe aanval als wel een configuratie-drift risico. Als de inline URL-kopieën achterblijven bij een Supabase-projectmigratie, verbreken publieke pagina's hun DB-verbinding zonder foutmelding — terwijl app-pagina's (die supabase.js laden) correct migreren.

**Prio**: P4 (drift-risico, geen actieve dreiging)

---

## Zwakte 8 — 17× gedupliqeerde unhandledrejection handler

**Definitie**: Identieke `window.addEventListener('unhandledrejection', ...)` inline handlers in alle 17 app-HTML bestanden.

| Actor | S | T | I | D | Waarschijnlijkheid | Impact |
|-------|---|---|---|---|---------------------|--------|
| Opportunist | ✗ | ✗ | ✓ | ✗ | LAAG | LAAG |

**Top threat**: Geen directe aanval-vector. Maar als de handler wordt uitgebreid om fouten te loggen naar een externe service (bijv. een toekomstige Sentry-integratie), moeten alle 17 bestanden worden bijgewerkt. Een vergeten update creëert een inconsistente logging-dekking.

**Prio**: P4 (architecturele schuld, geen actieve dreiging)

---

## Top 5 dreigingen — Prioriteit × impact

| Rank | Zwakte | Actor | Scenario | Waarschijnlijkheid | Impact | Prio |
|------|--------|-------|----------|---------------------|--------|------|
| 1 | Admin RLS client-side | Malicious user | Trust Score manipulatie via admin.html URL | MIDDEL | HOOG | **P1** |
| 2 | ANON_KEY + slechte RLS | External/scraper | Notifications INSERT voor willekeurige user_id | MIDDEL | HOOG | **P1** |
| 3 | CDN zonder SRI | Supply chain | supabase-js compromis → alle sessies gekapt | ZEER LAAG | KRITIEK | **P2** |
| 4 | trust_score dual-source | Malicious bedrijf | Trust Score gaming per doelgroep | MIDDEL | MIDDEL | **P2** |
| 5 | party_a/party_b paradox | Malicious school | Student-identiteit in hub-context | LAAG | MIDDEL | **P3** |

---

*Hotch2 — BAU 2.0 — 22 april 2026 — READ-ONLY*
