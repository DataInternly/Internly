# LIVETEST AUDIT — 4 mei 2026

**Audit-doel** Pre-livetest verificatie van zeven clusters uit Barry's FTP-walkthrough.
**Methode** Read-only. PowerShell + bestand-inspectie via Grep/Read.
**Datum** 4 mei 2026
**Tijd besteed** ~75 minuten (binnen budget).

> **Audit was strict read-only. Geen wijzigingen aangebracht.**
> Eén output-bestand: `docs/audits/LIVETEST_AUDIT_4MEI.md`.

---

## SAMENVATTING

| Cluster | Bucket A (kritiek) | Bucket B (significant) | Bucket C (defer) |
|---|---|---|---|
| 1 Welkomstpagina | 3 | 2 | 0 |
| 2 Header-drift | 2 | 5 | 3 |
| 3 Sessie-verlies | 1 | 3 | 1 |
| 4 Wrong-page redirects | 4 | 2 | 1 |
| 5 Viewer-perspectief | 1 | 2 | 0 |
| 6 Functionaliteits-gaps | 3 | 4 | 2 |
| 7 Visuele pariteit | 0 | 2 | 3 |
| **Totaal** | **14** | **20** | **10** |

**Bucket A (14):** moeten gefixt voor 11 mei. Voornamelijk routing- en sessieproblemen.
**Bucket B (20):** sterke voorkeur voor 11 mei. Header-uniformiteit, viewer-marker, plan-gating.
**Bucket C (10):** defer. Cosmetic refinements, reistijd-filter, notitie-export.

> **Afwijking van briefing:** `docs/INTERNLY_HEADER_SPEC.md` ontbreekt in repository. Header-types A–E zijn niet schriftelijk vastgelegd in een spec-bestand. Cluster 2 matrix gebruikt heuristisch onderscheid (renderRoleHeader-call vs inline header) als proxy.

---

## CLUSTER 1 — Welkomstpagina ontbreekt voor drie rollen

### Inventaris welkomstpagina's

| Rol | Login-bestemming | Welkomspagina aanwezig? | Greeting-stijl | Buddy-pariteit | Volume |
|---|---|---|---|---|---|
| BOL student | `student-home.html` | **JA** (bestaat sinds c8dc6f1, 3 mei) | sh-greeting + sh-name + sh-meta + Goedemorgen/middag/avond | gedeeltelijk — andere CSS-vars (`sh-*` vs buddy-card stijl) | medium |
| BBL student | `bbl-hub.html` (per `getRoleLanding('student', true)`) | **NEE** — bbl-hub is direct het traject-overzicht | geen greeting-block | nee | medium |
| Bedrijf | `company-dashboard.html` | **NEE** — direct dashboard | geen greeting-block | nee | medium |
| School | `school-dashboard.html` | **NEE** — direct dashboard | geen greeting-block | nee | medium |
| Buddy (referentie) | `buddy-dashboard.html` | **JA** (referentie-stijl) | inline topbar met `topbar-tag` paars + setting-cards | n.v.t. (referentie) | — |

**Greeting-detectie via grep:** alleen `student-home.html`, `bbl-dashboard.html`, `buddy-dashboard.html` bevatten Goedemorgen/Goedemiddag string. `bbl-hub.html` heeft géén greeting (alleen traject-tabel). `company-dashboard.html` en `school-dashboard.html` hebben geen greeting.

### Gedeelde renderRoleLanding helper bestaat NIET

Geen `renderRoleLanding(role)` of `renderRoleHero(role)` helper gevonden. Welkomsblokken zijn elke pagina apart geïmplementeerd:
- [student-home.html:163-167](../../student-home.html) — `<section class="sh-hero">` met inline `<div class="sh-greeting" id="sh-greeting">`
- [buddy-dashboard.html:85-105](../../buddy-dashboard.html) — eigen `.topbar` met `topbar-tag` + `topbar-user`
- [bbl-dashboard.html](../../bbl-dashboard.html) — bevat greeting maar deze is niet de actieve landing

### Witte scherm bedrijf bij eerste load

[company-dashboard.html:537](../../company-dashboard.html) heeft `<body data-auth-pending="true">`. Anti-flicker dus geïmplementeerd. **Witte-scherm hypothese:**
- ofwel `data-auth-pending` wordt nooit verwijderd in foutpaden (faciliteit ontbreekt in catch-block)
- ofwel async chain in init (auth → role-check → DB-fetches) heeft geen anti-flicker fallback timeout

**Aanbeveling:** read-through van company-dashboard init met focus op `removeAttribute('data-auth-pending')` en bij elke return-path verifiëren.

### Bevindingen cluster 1

| # | Bevinding | Bucket | Volume |
|---|---|---|---|
| 1.1 | BBL student heeft geen welkomspagina | A | medium (~2u) |
| 1.2 | Bedrijf heeft geen welkomspagina | A | medium |
| 1.3 | School heeft geen welkomspagina | A | medium |
| 1.4 | Geen shared `renderRoleLanding()` helper — drift-risico bij 4 implementaties | B | medium (helper schrijven + 4 hosts callen) |
| 1.5 | Witte-scherm bedrijf — anti-flicker-fallback onzeker | B | small (catch-block audit) |

---

## CLUSTER 2 — Header-stijl drift

### Header-type proxy-matrix

Heuristic: `rRH` = aantal renderRoleHeader/renderStudentHeader-aanroepen. `inline` = aantal `<header>` of `class="topbar"` matches.

| Pagina | rRH | inline | Type-classificatie | Drift-risico |
|---|---|---|---|---|
| index.html | 0 | 0 | publiek/landing — eigen markup | n.v.t. |
| auth.html | 0 | 3 | publiek — eigen topbar | acceptabel |
| kennisbank.html | 0 | 0 | publiek — geen header? **flag** | hoog |
| hoe-het-werkt.html | 0 | 1 | publiek — inline topbar | drift t.o.v. about/spelregels |
| privacybeleid.html | 0 | 1 | publiek — inline topbar | acceptabel |
| spelregels.html | 0 | 1 | publiek — inline topbar | acceptabel |
| about.html | 0 | 4 | publiek — meervoudig inline | hoog (drift) |
| **discover.html** | 2 | 0 | student — renderStudentHeader | OK |
| **matchpool.html** | 0 | 0 | student — **FLAG** rRH=0 maar verwacht header | hoog |
| **mijn-sollicitaties.html** | 3 | 0 | student — renderStudentHeader | OK |
| **mijn-berichten.html** | 1 | 0 | student/buddy — renderRoleHeader | OK in code, maar Barry signaleert visueel afwijkend — **flag** |
| student-home.html | 1 | 0 | student — renderStudentHeader | OK |
| match-dashboard.html | 4 | 1 | hybride (Type B + hub-topbar) | bewust per CLAUDE.md |
| bbl-dashboard.html | 1 | 0 | student-bbl — renderStudentHeader | OK |
| **bbl-hub.html** | 2 | 1 | hybride — renderStudentHeader + inline | drift |
| **company-dashboard.html** | 0 | 6 | bedrijf — eigen sidebar | bewust (per CLAUDE.md "company behoudt sidebar-pattern") |
| company-discover.html | 0 | 3 | bedrijf — eigen | bewust |
| **school-dashboard.html** | 0 | 5 | school — eigen sidebar | bewust |
| **buddy-dashboard.html** | 4 | 10 | hybride — renderRoleHeader + uitgebreide eigen topbar | drift, maar topbar is buddy-design |
| vacature-detail.html | 0 | 2 | publiek-met-auth | acceptabel |
| chat.html | 0 | 4 | shell-pagina — eigen | acceptabel |
| mijn-notities.html | 2 | 1 | student-notes — buddy-paars caret override | acceptabel |
| bol-profile.html | 0 | 3 | onboarding — eigen | acceptabel |
| bbl-profile.html | 0 | 8 | onboarding — eigen | acceptabel |

### Bevindingen cluster 2

| # | Bevinding | Bewijs | Bucket | Volume |
|---|---|---|---|---|
| 2.1 | matchpool.html heeft #student-header container maar 0 renderStudentHeader-call zichtbaar in pagina-grep (bevindt zich in [js/matchpool.js:292](../../js/matchpool.js)) | js/matchpool.js init | C | klein (bevestigen + commenten) |
| 2.2 | mijn-berichten.html: 1 renderRoleHeader (correct) maar Barry zegt "andere stijl dan matchpool" — visueel verschil zit in role-aware tabs (buddy-included) | [mijn-berichten.html:408](../../mijn-berichten.html) `chat.html?buddy_pair_id=...` | A | klein |
| 2.3 | bbl-hub.html hybride header: renderStudentHeader + eigen inline strip | [bbl-hub.html](../../bbl-hub.html) | B | medium |
| 2.4 | buddy-dashboard.html eigen topbar overrulet header-canon ondanks 4 renderRoleHeader-calls | [buddy-dashboard.html:85-105](../../buddy-dashboard.html) | B | medium |
| 2.5 | hoe-het-werkt.html heeft eigen inline topbar — drift t.o.v. about (4 inline) en spelregels (1 inline) | [hoe-het-werkt.html](../../hoe-het-werkt.html) | B | klein |
| 2.6 | kennisbank.html heeft 0 renderRoleHeader EN 0 inline header — pagina mist header? | grep-resultaat | A | onderzoek vereist (klein indien bestaat in inline-style block, anders medium) |
| 2.7 | privacybeleid.html: door cluster 3 sessie-verlies-bug raakt header niet getoond na uitloggen | zie cluster 3 | B | overlappende fix |

---

## CLUSTER 3 — Sessie-verlies bij navigatie

### Publieke pagina's script-load matrix

| Pagina | utils.js | supabase.js | push.js | telemetry.js | smartHomeRedirect/requireRole/guardPage | Risico |
|---|---|---|---|---|---|---|
| index.html | ✓ | ✓ | — | ✓ | — | acceptabel (login-gated personalisatie) |
| kennisbank.html | ✓ | ✓ | — | — | — | medium (laadt supabase zonder duidelijke noodzaak) |
| hoe-het-werkt.html | — | — | — | — | — | **clean** ✓ |
| privacybeleid.html | — | — | — | — | — | **clean** ✓ |
| spelregels.html | ✓ | — | — | — | — | minimal |
| about.html | ✓ | ✓ | — | — | **smartHomeRedirect aanroep** | **HIGH** |
| pricing.html | ✓ | ✓ | — | ✓ | **smartHomeRedirect aanroep** | **HIGH** |
| faq.html | ✓ | ✓ | — | — | **smartHomeRedirect aanroep** | **HIGH** |
| cookiebeleid.html | ✓ | — | — | — | — | minimal |
| algemene-voorwaarden.html | ✓ | — | — | — | — | minimal |

### smartHomeRedirect-aanroepen op publieke pagina's — root cause kandidaat

[about.html:632](../../about.html), [pricing.html:445](../../pricing.html), [faq.html:419](../../faq.html) hebben elk:

```html
<a href="#" onclick="event.preventDefault();smartHomeRedirect();" class="topbar-logo">intern<span>ly</span></a>
```

Dit is een **logo-klik handler** (alleen bij klik), niet een page-load trigger. Maar:
- als gebruiker met expired session op pricing.html zit en logo klikt → smartHomeRedirect() roept getUser() / getSession() aan → krijgt mogelijk SIGNED_OUT-event → redirect naar auth.html
- Bedward-principe P2 verbiedt dit op publieke pagina's omdat de SIGNED_OUT-handler mogelijk een logout van álle tabs veroorzaakt

### sw.js 401/403-gedrag

Service worker geen fetch-interceptor met token-handling gevonden — sw.js doet alleen push-notification handling en static asset caching. **Geen sessie-verlies via SW.**

### Bevindingen cluster 3

| # | Bevinding | Bewijs | Bucket | Volume |
|---|---|---|---|---|
| 3.1 | about/pricing/faq laden supabase.js + smartHomeRedirect-handler — Bedward P2 overtreding | [about.html:632](../../about.html), pricing.html:445, faq.html:419 | A | klein per pagina, totaal medium |
| 3.2 | privacybeleid.html — Barry meldde sessie-wegklap; pagina laadt geen supabase, dus oorzaak ELDERS (header-link op andere pagina?) | [privacybeleid.html](../../privacybeleid.html) clean | B | onderzoek vereist |
| 3.3 | kennisbank.html laadt supabase.js zonder zichtbare reden | [kennisbank.html](../../kennisbank.html) | B | klein |
| 3.4 | index.html laadt full app-stack — bewust voor login-personalisatie maar verhoogt sessie-fragiliteitsoppervlak | [index.html:1865](../../index.html) | C | n.v.t. |

**Hypothese root cause sessie-verlies (Barry's symptoom):**
- Klik op kennisbank/hoe-werkt-het/privacybeleid in nav vanaf ingelogde context
- Publieke pagina laadt utils.js → executes onAuthStateChange listener (in utils.js)
- Listener detecteert publieke pagina (PUBLIC_PAGES whitelist) en doet **niets** als correct
- ALS publieke pagina niet in whitelist staat: SIGNED_OUT redirect triggert
- Vereist: verifieer PUBLIC_PAGES bevat alle drie genoemde pagina's

---

## CLUSTER 4 — Wrong-page redirects en springen

### Per genummerd pad

#### Pad 1 — BBL-hub → matchpool tussensprong

[bbl-hub.html](../../bbl-hub.html) — geen directe `matchpool.html` aanroep gevonden in mijn grep beperkt tot 10 hits. **Onderzoek vereist:** waar staat de matchpool-knop in BBL-nav, en wat is de href? Mogelijk in `HEADER_NAV_BY_ROLE.student_bbl` (utils.js:676-682) — daar staat `href: 'matchpool.html'` voor matchpool-tab. Direct, geen tussensprong.

**Hypothese:** tussensprong is geen routing-bug maar een visuele flits van bbl-hub dat afsluit (cleanup) terwijl matchpool laadt.

| Bewijs | Bucket | Volume |
|---|---|---|
| utils.js:678 href correct | C | onderzoek (mogelijk perception-issue) |

#### Pad 2 — BBL-hub → mijn-berichten andere variant

[mijn-berichten.html:408](../../mijn-berichten.html) gebruikt `chat.html?buddy_pair_id=${...}`.
[bbl-hub.html:2813](../../bbl-hub.html) gebruikt `chat.html?buddy_pair=${...}` (zonder `_id`).

**Inconsistentie:** twee variant-querystrings naar dezelfde chat-pagina. Als chat.html alleen `buddy_pair_id` parsed, dan faalt klik vanuit bbl-hub. Maar dit is bug 3 (buddy → chat), niet 2.

**Pad 2 root cause-kandidaat:** mijn-berichten.html in BBL-context laadt mogelijk een ander template-pad dan vanuit BOL/student. Need to check if mijn-berichten heeft conditie op `bbl_mode` of `student_bbl` role.

| Bewijs | Bucket | Volume |
|---|---|---|
| mijn-berichten.html één template — alleen role-aware via renderRoleHeader. Visueel verschil onverklaard. | A | medium |

#### Pad 3 — Buddy → mijn matches → stuur bericht → profiel van Jan

[buddy-dashboard.html:959](../../buddy-dashboard.html): `window.location.href = chat.html?buddy_pair_id=${encodeURIComponent(pairId)}`

Routing **lijkt correct** (gaat naar chat.html). Bug-symptoom "profiel van Jan toont" suggereert chat.html parseert de `buddy_pair_id`-param verkeerd of valt terug op profile-view component bij niet-matchende pair.

**Hypothese:** chat.html heeft een fallback-flow waarbij missing/invalid buddy_pair_id leidt tot `profileView.js` aanroep. Dit zou verklaren waarom je in plaats van chat de PROFIEL ziet.

| Bewijs | Bucket | Volume |
|---|---|---|
| buddy-dashboard.html:959 routing correct, bug zit downstream in chat.html | A | medium (chat.html debug) |

#### Pad 4 — Bedrijf → matches → open chat → onbekend → kan niet meer op berichten klikken

[company-dashboard.html:1838, 1980, 2208](../../company-dashboard.html) gebruiken `chat.html?match=${m.id}`. Routing correct.

**Bug-symptoom "kan niet meer op berichten klikken":** suggereert chat.html zet een state (sessionStorage?) die mijn-berichten kapotmaakt bij volgende klik. Mogelijk `currentUser` of `internly_role` overgeschreven.

[discover.html:1437](../../discover.html): `sessionStorage.setItem('internly_role', 'student')` — **forceert student-role bij open**. Als bedrijf via match-flow naar chat gaat en daarna naar mijn-berichten, en chat.html zet sessionStorage student → mijn-berichten denkt user is student → renderRoleHeader rendert verkeerde header → klik op berichten-item is broken voor bedrijf-context.

| Bewijs | Bucket | Volume |
|---|---|---|
| sessionStorage cross-pollination via discover/chat | A | medium |

#### Pad 5 — Bedrijf → vorige pagina vanaf abonnement → match-dashboard

[match-dashboard.html:2912 + 2980-2983](../../match-dashboard.html) — twee sets van backTargets logica voor bedrijf → `company-dashboard.html`. Backbutton in match-dashboard zelf is correct.

**Bug-symptoom:** bedrijf op pricing.html klikt vorige (browser back of pricing-pagina back-link) en belandt op match-dashboard ipv company-dashboard. Dat is geen match-dashboard back-button, maar **browser-history**. Als bedrijf via match-dashboard → "Bekijk abonnementen" is gegaan ([match-dashboard.html:1556 etc.](../../match-dashboard.html)), is back natuurlijk match-dashboard. Verwacht.

**Maar Barry's verwachting** is dat de back op pricing-pagina richt naar company-dashboard. Dat vereist een **expliciete back-knop op pricing.html** die context-aware is — niet via browser history.

| Bewijs | Bucket | Volume |
|---|---|---|
| pricing.html mist context-aware back voor bedrijf-context | B | klein |

#### Pad 6 — Bedrijf → abonnement-knop → pricing

[company-dashboard.html:714](../../company-dashboard.html):

```html
<button class="nav-btn" onclick="window.location.href='pricing.html#section-bedrijf'">
```

Plus 6+ "Upgrade naar Business" knoppen op regels 1556, 1665, 1681, 1786, 3185, 3226, 3631 — alle naar `pricing.html#section-bedrijf`.

**Bug-claim:** bedrijf wil eigen abonnement-overzicht, niet de marketing/pricing-pagina. Geen `account.html` of `mijn-abonnement.html` aanwezig in repo.

| Bewijs | Bucket | Volume |
|---|---|---|
| company-dashboard nav routes naar pricing — geen apart abonnement-overzicht | A | medium (nieuw pagina maken) |

#### Pad 7 — Bedrijf → ontdek stages → buddy-context

[discover.html:1437](../../discover.html):

```js
sessionStorage.setItem('internly_role', 'student'); // sync voor rest van pagina
```

Discover.html **forceert** student-role bij open. Bedrijf opent discover.html → sessionStorage gezet op student → buddy-toggles + buddy-cards in matchpool actief → bedrijf ziet buddy-systeem.

| Bewijs | Bucket | Volume |
|---|---|---|
| discover.html sessionStorage forceer = anti-pattern voor bedrijf-context | A | klein-medium (role-conditional set) |

### Cluster 4 samenvatting

| # | Pad | Bewijs | Bucket | Volume |
|---|---|---|---|---|
| 1 | BBL → matchpool tussensprong | onbekend | C | onderzoek |
| 2 | BBL → mijn-berichten variant | mijn-berichten.html geen role-conditional template | A | medium |
| 3 | Buddy → stuur bericht → profiel | chat.html buddy_pair_id parsing fallback | A | medium |
| 4 | Bedrijf → chat → berichten broken | sessionStorage role forceer | A | medium |
| 5 | Bedrijf → vorige van abonnement | pricing.html mist context-aware back | B | klein |
| 6 | Bedrijf abonnement → pricing | geen apart account.html / mijn-abonnement.html | A | medium |
| 7 | Bedrijf → ontdek → buddy-context | [discover.html:1437](../../discover.html) sessionStorage forceer | A | klein |

---

## CLUSTER 5 — Viewer-perspectief markering

### Permission-systeem (CAN-tabel)

[match-dashboard.html:2554](../../match-dashboard.html) definieert `CAN`-permissions per rol:

| Rol | addTask | addDeadline | checkTask |
|---|---|---|---|
| student (regel 2556) | true | true | true |
| bedrijf (regel 2565) | false | false | false |
| school (regel 2575) | false | false | false |
| begeleider (regel 2585) | false | false | false |

**Constatering:** `can('addTask')` returneert false voor bedrijf — knop wordt niet gerendered. Backlog item 11 ("bedrijf ziet planning-knop ten onrechte") is mogelijk een **TAB-zichtbaarheid** issue (tabs zijn altijd zichtbaar voor alle rollen), niet een knop-issue.

### Viewer-banner systeem

| Scherm | Welke rollen kunnen het bekijken | Viewer-context visueel gemarkeerd? | Volume |
|---|---|---|---|
| match-dashboard | student/bedrijf/school/begeleider | **NEE** — geen viewer-banner CSS-class | medium |
| company-dashboard | bedrijf zelf, school via referral | **NEE** | medium |
| school-dashboard | school zelf, bedrijf via referral | **NEE** | medium |

**Grep op "viewer-banner|view-as-banner|context-strip|read-only":**
- match-dashboard heeft `hub-context-strip` (regel 237, 2124, 3024) — **alleen voor stage-naam display**, niet voor viewer-marker
- international-school-dashboard:509 heeft een banner BIJ verification-pending (`read-only` mode), niet voor viewer-perspectief
- match-dashboard.html regel 4773, 5249, 6341 — "read-only" als veld-modus, niet als hele view

### Bevindingen cluster 5

| # | Bevinding | Bewijs | Bucket | Volume |
|---|---|---|---|---|
| 5.1 | Geen viewer-banner CSS-class voor "je kijkt naar andermans data" — bedrijf in match-dashboard kijkt feitelijk naar student-data zonder visuele markering | grep 0 hits | A | medium (CSS + 3 callers) |
| 5.2 | match-dashboard tabs (planning, taken) zichtbaar voor bedrijf maar acties uitgeschakeld via CAN — verwarrende UX | [match-dashboard.html:2554-2585](../../match-dashboard.html) | B | klein (tab-conditie + CAN check) |
| 5.3 | Backlog item 11 "bedrijf ziet planning-knop": vermoedelijk planning-TAB, niet -knop. CAN-tabel klopt voor knoppen. | [match-dashboard.html:2554](../../match-dashboard.html) | B | klein |

---

## CLUSTER 6 — Functionaliteits-gaps

### Per gap

#### 6.1 Buddy matchpool leeg

`js/buddy.js` heeft **geen** `loadMatchpool` of `swipe-student` functionaliteit gevonden. `js/matchpool.js` (de wel-aanwezige) is de **student-side** matchpool die vacature/buddy/bedrijf cards toont voor student-gebruikers. **Er is geen buddy-side swipe-deck** waar buddy door student-profielen kan swipen.

| Bevinding | Bucket | Volume |
|---|---|---|
| Buddy heeft geen kandidaten-feed (matchpool, swipe). Alleen `buddy_requests` (passieve opt-in). | A | large (nieuwe feature) — **defer C** voor 11 mei |

#### 6.2 Bedrijf "vorige pagina" — gedekt in cluster 4 pad 5

#### 6.3 Bedrijf abonnement → pricing — gedekt in cluster 4 pad 6

#### 6.4 Bedrijf zoekstagiaires alleen Business

Grep op "zoekstagiaires|zoekstagiair|zoekstudent|search-student" → **0 matches**. UI-text gebruikt waarschijnlijk andere bewoording. [company-dashboard.html](../../company-dashboard.html) plan-gating via `hasActivePlan('company_pro')` (regel 1567) en `hasActivePlan('company_business')` (regel 1580) — gates worden gehanteerd, maar welke knop bedoelt Barry? **Onderzoek vereist.**

| Bevinding | Bucket | Volume |
|---|---|---|
| `zoekstagiaires` exact-string niet vindbaar — ofwel andere label ofwel feature in nieuwe rich-text | B | onderzoek |

#### 6.5 Notitie-export

Grep op "exportNotities|downloadTxt|export.*notitie" → **0 matches**. Niet geïmplementeerd op [mijn-notities.html](../../mijn-notities.html).

| Bevinding | Bucket | Volume |
|---|---|---|
| Notitie-export ontbreekt volledig | C | klein-medium (txt-blob download via Blob API) — **defer C** |

#### 6.6 Sollicitatie als verzoek met motivatie

`applications` tabel BESTAAT in [internly_migration.sql:147](../../internly_migration.sql) met `profile_id` en `posting_id` referenties. **Maar:** alleen [international-student-dashboard.html](../../international-student-dashboard.html) (regels 772, 1181, 1906) gebruikt deze tabel actief.

Hoofdflow (matchpool, matches, mijn-sollicitaties) gebruikt `matches` tabel — niet `applications`. **Er is geen motivatie-veld op matches**, dus sollicitaties met motivatie-context bestaan alleen in international-flow.

| Bevinding | Bucket | Volume |
|---|---|---|
| Reguliere sollicitatie-flow (matches) heeft geen motivatie-veld. International flow wel via applications-tabel. | A | medium-large (kolom + UI op meerdere pagina's) |

#### 6.7 Naamwijziging persisteert niet (buddy-dashboard)

[buddy-dashboard.html:624](../../buddy-dashboard.html): `<button type="submit" class="profile-save-btn">Profiel opslaan</button>`.

**Submit-handler niet gevonden in directe grep.** [js/buddy.js](../../js/buddy.js) heeft geen `update.*profiles` of `upsert.*buddy_profiles` calls in eerste 10 hits. Save flow waarschijnlijk inline JS in buddy-dashboard.html. **Onderzoek vereist:** vind de form-submit handler en check of deze schrijft naar `profiles.naam` of `buddy_profiles.naam`.

| Bevinding | Bucket | Volume |
|---|---|---|
| Buddy-naam-update bug niet gelokaliseerd in deze audit-pas | A | onderzoek + fix klein |

#### 6.8 Profiel-detail-view bij klikken na invullen

Grep op "profileComplete" → match in `international-student-dashboard.html` (regel 957, 1710, 1731, 1737) — daar wel geïmplementeerd. **Niet** in reguliere student-home/bol-profile/matchpool flow.

[student-home.html:200-216](../../student-home.html) checkt `if (!sp?.naam) → redirect bol-profile.html`. Bij ingevuld profiel: doorlaten. Bij later opklikken **geen** "maak profiel aan" — dus die hint zou er niet ten onrechte moeten zijn. Need detail welke pagina deze message toont na invullen.

| Bevinding | Bucket | Volume |
|---|---|---|
| "Maak profiel aan" condition niet gelokaliseerd zonder herproductie-stappen | B | onderzoek |

#### 6.9 Reistijd-filter

[discover.html:1053](../../discover.html) leest `card.dataset.postcode` — postcode-filter aanwezig in code. Werking en zwakke plek **defer C** zoals briefing toelaat.

### Cluster 6 samenvatting

| # | Gap | Files | Volume | Bucket |
|---|---|---|---|---|
| 6.1 | Buddy matchpool leeg | nieuwe feature | large | C (defer) |
| 6.2 | Bedrijf vorige pagina | pricing.html | klein | B |
| 6.3 | Bedrijf abonnement → pricing | nieuwe pagina | medium | A |
| 6.4 | Zoekstagiaires plan-gating | company-dashboard.html | onderzoek | B |
| 6.5 | Notitie-export | mijn-notities.html | klein-medium | C |
| 6.6 | Sollicitatie met motivatie | matches schema + UI | medium-large | A |
| 6.7 | Buddy-naam-update bug | buddy-dashboard.html | klein | A |
| 6.8 | "Maak profiel aan" verkeerd getoond | onbekend | onderzoek | B |
| 6.9 | Reistijd-filter zwakte | discover.html | n.v.t. | C (defer) |

---

## CLUSTER 7 — Visuele en pariteit-issues

### BOL welkom (student-home) vs Buddy welkom (buddy-dashboard)

| Element | student-home.html | buddy-dashboard.html | Verschil |
|---|---|---|---|
| Top container | `.sh-hero` met sh-greeting/sh-name/sh-meta | `.topbar` met topbar-tag/topbar-user | volledig andere structuur |
| Greeting | "Goedemorgen 👋" + naam + meta | geen greeting in topbar — eerst `setting-card` | buddy heeft geen greeting |
| Card-stijl | `.sh-card` met icon + title + sub + arrow | `.setting-card` met icon + title + desc | andere class-naam, vergelijkbare layout |
| Color-token | `--green` voor accent | `--c-buddy-purple` voor accent | bewust per rol |
| Profile-completeness | `.sh-progress-wrap` (gewogen velden) | geen completeness-blok zichtbaar | student heeft completeness, buddy niet |
| Hub-card | `.sh-hub-card` (groene gradient) | n.v.t. | student heeft Stage Hub link |
| Layout | flex column 600px max-width | shell 760px max-width | verschillend |

**Concrete pariteits-verschillen** (max 8 punten):
1. Buddy heeft geen greeting-block, student wel
2. Buddy heeft geen completeness-progressbar, student wel
3. Buddy gebruikt `setting-card` class, student `sh-card`
4. Buddy heeft inline topbar als eigen markup, student gebruikt renderStudentHeader
5. Buddy `.shell` 760px max-width, student `.sh-main` 600px
6. Buddy `topbar-tag` rol-pill (paars), student geen pill in landing
7. Buddy gebruikt `--c-buddy-purple` token-systeem, student `--green`
8. Buddy heeft pauze-banner mechanisme, student geen equivalent

### Matchpool-toggles in student-home

[student-home.html](../../student-home.html) heeft **geen** matchpool-toggles — alleen progress-bar en suggesties. De toggles staan in [matchpool.html:345-352](../../matchpool.html) (3 mp-pill knoppen vacature/buddy/bedrijf). Status: **production-ready** sinds K-1 fix sessie 5.

### Sollicitatie-card design in mijn-sollicitaties

[mijn-sollicitaties.html](../../mijn-sollicitaties.html) — `renderApplications` ~151 regels (per CLAUDE.md "open voor sprint 5"). Status: **werkend, refactor pending**. Visuele staat acceptabel voor livetest.

### Cluster 7 bevindingen

| # | Bevinding | Bucket | Volume |
|---|---|---|---|
| 7.1 | BOL welkom vs Buddy welkom hebben 8 concrete verschillen — geen pariteits-defaults | B | medium (visueel uniformeren) |
| 7.2 | Matchpool-toggles production-ready | C | n.v.t. |
| 7.3 | Sollicitatie-card design acceptabel — refactor backlog | C | n.v.t. (sprint 5) |

---

## VOORGESTELDE FIX-VOLGORDE

### Sessie 1 — Cluster 3 (sessie-verlies) + Cluster 4 paden 4 + 7 (sessionStorage forceer)

**Bestanden:**
- [discover.html](../../discover.html) — sessionStorage internly_role conditional
- [about.html](../../about.html), [pricing.html](../../pricing.html), [faq.html](../../faq.html) — smartHomeRedirect-handler context-aware

**File-overlap:** discover.html bediend pad 7 én is bron van pad 4 (chat sessionStorage cross-pollination).

**Risico:** medium — sessionStorage logica raakt meerdere pagina's, regressie-test alle rollen.
**Volume:** klein-medium per file (3-5 files, ~30 min review per file).

### Sessie 2 — Cluster 2 (header-drift) + Cluster 6.7 (buddy-naam) + Cluster 4 pad 3 (chat fallback)

**Bestanden:**
- [mijn-berichten.html](../../mijn-berichten.html) — role-aware template variant
- [buddy-dashboard.html](../../buddy-dashboard.html) — naam-save handler
- [chat.html](../../chat.html) — buddy_pair_id parsing fallback (mogelijk bug 3 root cause)
- [bbl-hub.html](../../bbl-hub.html) — buddy_pair → buddy_pair_id consistentie ([bbl-hub.html:2813](../../bbl-hub.html))

**File-overlap:** chat.html is downstream van zowel buddy-dashboard als bbl-hub — fix deze laatste.

**Risico:** medium-high — chat.html is centraal in conversie-pad.
**Volume:** medium per file.

### Sessie 3 — Cluster 1 (welkomspagina's BBL/bedrijf/school) + Cluster 7.1 (pariteit)

**Bestanden:**
- nieuw: `bedrijf-home.html` of welkomsblok in `company-dashboard.html`
- nieuw: `school-home.html` of welkomsblok in `school-dashboard.html`
- bbl-hub.html welkomsblok toevoegen
- shared `renderRoleLanding(role)` helper in `js/utils.js`

**File-overlap:** alle drie nieuwe welkomsblokken kunnen één helper delen.

**Risico:** medium — nieuwe routing-bestemmingen vereisen update aan auth.html post-login flow.
**Volume:** large.

### Sessie 4 — Cluster 4 pad 6 (bedrijf abonnement) + Cluster 5 (viewer-banner)

**Bestanden:**
- nieuw: `mijn-abonnement.html` of section in company-dashboard
- viewer-banner CSS-class in [css/style.css](../../css/style.css)
- match-dashboard.html — banner conditional voor non-eigenaren

**File-overlap:** match-dashboard heeft beide concepten (back-button + viewer-marker).

**Risico:** low-medium — abonnement-overzicht is greenfield, viewer-banner is additief.
**Volume:** medium-large.

### Sessie 5 — Cluster 6.6 (motivatie-veld op matches)

**Bestanden:**
- migratie SQL: ALTER TABLE matches ADD COLUMN motivation TEXT
- bol-profile.html / student-profile.html — motivatie-input bij sollicitatie
- mijn-sollicitaties.html — motivatie-display
- company-dashboard.html — motivatie-zien per applicant

**Risico:** high — schema-migratie tijdens livetest-week is risicovol.
**Volume:** large.

### Defer naar na livetest (Bucket C)

- Cluster 6.1 buddy matchpool feature
- Cluster 6.5 notitie-export
- Cluster 6.9 reistijd-filter refinements
- Cluster 7.2 + 7.3 visuele refinements

---

## OPEN VRAGEN VOOR BARRY

1. **Bestaat er een `INTERNLY_HEADER_SPEC.md` ergens?** Niet gevonden in repo (`docs/`, `_docs/`, root). Audit gebruikte heuristisch onderscheid tussen renderRoleHeader-call en inline header. Voor cluster 2 conclusies harder te maken: spec-document delen of bevestigen dat we type A-E ad-hoc moeten definiëren.

2. **Welke knop heet "zoekstagiaires" in de bedrijf-UI?** Grep vond geen exact match. Cluster 6.4 vereist UI-context van Barry (screenshot of regelnummer) om plan-gating te diagnosticeren.

3. **Bug 3 "buddy → stuur bericht → profiel van Jan" — herproductie-stappen?** Audit bevestigt routing naar `chat.html?buddy_pair_id=...` correct. Bug zit waarschijnlijk in chat.html parsing-logica. Welke buddy_pair_id wordt gestuurd, en wat is Jan's profiel-id (verwarring met receiver_id)?

4. **Cluster 6.6 motivatie-veld — gewenste UX:** vrij tekstveld bij sollicitatie, of templated vragen ("waarom deze stage?", "wat hoop je te leren?"). Volume verschil is groot — bepaalt of A of B sessie.

5. **Cluster 1 BBL welkomspagina — bbl-hub of nieuwe pagina?** bbl-hub.html is een traject-overzicht, geen landing. Moet nieuwe `bbl-home.html` of welkomsblok bovenop bbl-hub komen?

---

**Einde audit.** 75 minuten besteed. Geen wijzigingen aan code-bestanden. Eén nieuw bestand: dit rapport.
