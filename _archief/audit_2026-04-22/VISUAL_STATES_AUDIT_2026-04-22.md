# Dolly + Polly — Visual States Coverage Audit
**Datum**: 22 april 2026
**Rol**: Dolly + Polly — Elke data-laadpagina heeft vier staten. Als er één ontbreekt, ziet de gebruiker iets dat er niet voor bedoeld is.
**Scope**: Alle pagina's die dynamische data laden × vier states (loading, empty, error, success).
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode

Voor elke pagina: grep op aanwezigheid van loading-indicators, empty-state HTML, error-handling in render-functies, en success-state structuur.

States-definitie:
- **Loading**: Gebruiker wacht op data (spinner, skeleton, "Laden..." tekst)
- **Empty**: Data geladen, maar er zijn geen items
- **Error**: Fetch of DB-call mislukt
- **Success**: Data aanwezig en gerenderd

Visuele onderscheidbaarheid: een loading-state die eruitziet als een empty-state is een mislukking.

---

## discover.html

| State | Aanwezig | Bewijs | Visueel onderscheidend |
|-------|----------|--------|----------------------|
| Loading | ✅ | state-box met Laden-indicator (impliciet bij fetch) | ⚠️ Zelfde `.state-box` klasse als empty |
| Empty (geen vacatures) | ✅ | line 703: "Nog geen vacatures beschikbaar." + icoon 📭 | ✅ |
| Empty (filter-resultaat) | ✅ | line 876: "Geen vacatures gevonden voor deze filters." + wis-filters knop | ✅ |
| Error | ✅ | `.state-box.error` met rode kleur, `code`-element | ✅ Rood onderscheidt van empty |
| Success | ✅ | vacancy cards grid | ✅ |

**Oordeel**: ✅ GOED — vier states aanwezig, maar loading-state gebruikt dezelfde `.state-box` class als empty. Als loading-text snel verdwijnt, is er geen visueel verschil tussen "laden" en "leeg".

**Aanbeveling**: Voeg een spinner toe aan de loading state om hem te onderscheiden van empty.

---

## mijn-sollicitaties.html

| State | Aanwezig | Bewijs | Visueel onderscheidend |
|-------|----------|--------|----------------------|
| Loading | ⚠️ | Niet expliciet gevonden — waarschijnlijk lege container tot data binnenkomt | ❌ Geen indicator |
| Empty | ✅ | Sprint α: `.empty-state` component met CTA | ✅ |
| Error | ⚠️ | notify('Fout bij laden', false) → toast | ⚠️ Toast verdwijnt — daarna ziet de pagina er leeg uit |
| Success | ✅ | Application cards | ✅ |

**Oordeel**: ⚠️ GEDEELTELIJK — loading ontbreekt. Error-toast is tijdelijk; na 3.2s ziet de gebruiker een lege pagina alsof er geen sollicitaties zijn.

---

## chat.html

| State | Aanwezig | Bewijs | Visueel onderscheidend |
|-------|----------|--------|----------------------|
| Loading | ⚠️ | Waarschijnlijk lege berichten-container | ❌ Geen indicator |
| Empty (lege conversatie) | ✅ | Sprint α: `.empty-state` component: "Begin met een open vraag." | ✅ |
| Error | ✅ | Sprint α: `data-status="failed"` op message bubble + rode rand + retry-knop | ✅ Rood en retry onderscheidt |
| Pending | ✅ | Sprint α: `data-status="pending"` op message bubble → opacity .55 | ✅ Visueel gedimmed |
| Success | ✅ | Message bubbles | ✅ |

**Oordeel**: ✅ GOED — chat.html heeft de beste state-coverage na Sprint α. Opvallend: heeft zelfs een pending-state die andere pagina's missen.

---

## company-dashboard.html

| State | Aanwezig | Bewijs | Visueel onderscheidend |
|-------|----------|--------|----------------------|
| Loading | ⚠️ | Niet expliciet aangetroffen voor posting-list of matches | ❌ |
| Empty (geen vacatures) | ⚠️ | Onbekend — geen expliciete empty state gevonden voor de vacature-lijst | ❌ |
| Empty (geen matches) | ✅ | Sprint α: `.empty-state` component voor matches-sectie | ✅ |
| Error | ⚠️ | notify() toast → tijdelijk | ⚠️ Verdwijnt na timeout |
| Success | ✅ | Posting cards, match cards | ✅ |

**Oordeel**: ⚠️ GEDEELTELIJK — matches-empty gedaan in Sprint α. Vacatures-loading en -empty nog open.

---

## school-dashboard.html

| State | Aanwezig | Bewijs | Visueel onderscheidend |
|-------|----------|--------|----------------------|
| Loading | ✅ | line 888: `.empty` div met ⏳ "Laden…"; line 1261–1262: `showLoading()` helper; line 1494 | ✅ Spinner-emoj onderscheidt van empty |
| Empty (geen schoolnaam) | ✅ | line 1253: `.empty-state` met 🏫 icoon | ✅ |
| Error | ✅ | line 1293: `console.error` + line 1505: `⚠️` in `.empty` div | ⚠️ ⚠️-tekst in dezelfde `.empty` div als loading — visueel onderscheid alleen via icoon |
| Success | ✅ | Student-lijst, signalen, cohort-data | ✅ |

**Oordeel**: ✅ GOED — school-dashboard heeft de beste loading-implementatie. Error-state gebruikt dezelfde container als loading (⚠️ vs ⏳), wat onderscheidend genoeg is.

---

## match-dashboard.html (Stage Hub)

| State | Aanwezig | Bewijs | Visueel onderscheidend |
|-------|----------|--------|----------------------|
| Loading | ⚠️ | Role-picker scherm toont totdat auth-check klaar is; geen data-loading indicator zichtbaar | ❌ |
| Empty (geen stage gekoppeld) | ⚠️ | Role-picker biedt keuze maar geen "je hebt nog geen stage" state | ❌ |
| Error | ⚠️ | Niet aangetroffen | ❌ |
| Success | ✅ | App-shell met sidebar en content-sectie | ✅ |

**Oordeel**: ❌ ZWAK — match-dashboard.html is de centrale hub voor BOL-studenten maar heeft geen expliciete loading, empty of error states voor het geval de stage-data niet laadt.

---

## bbl-hub.html

| State | Aanwezig | Bewijs | Visueel onderscheidend |
|-------|----------|--------|----------------------|
| Loading | ⚠️ | Niet expliciet aangetroffen voor de zeven views | ❌ |
| Empty (geen leerdoelen) | ⚠️ | Vermoedelijk aanwezig in leerdoelen-view, niet geverifieerd | ❓ |
| Error | ⚠️ | bbl-hub heeft 19 bare `catch(e) {}` — errors worden geslokt | ❌ Stille failure |
| Success | ✅ | Evaluatie, leerdoelen, verlengings-view, reflectie | ✅ |

**Oordeel**: ❌ ZWAK — bbl-hub.html is de meest kritieke pagina voor BBL-studenten maar heeft de slechtste error-coverage (19 bare catches). Een DB-fout bij het laden van evaluatiedata is voor de gebruiker onzichtbaar.

---

## buddy-dashboard.html

| State | Aanwezig | Bewijs | Visueel onderscheidend |
|-------|----------|--------|----------------------|
| Loading | ⚠️ | buddy-dashboard.html:745 `try { buddyInit() } catch(e) {}` — als init faalt: lege pagina | ❌ |
| Empty | ⚠️ | Niet expliciet aangetroffen | ❓ |
| Error | ❌ | Bare catch op buddyInit() | ❌ |
| Success | ✅ | Buddy-profiel, verzoeken, paren | ✅ |

**Oordeel**: ❌ ZWAK — bij een initfout ziet de gebruiker een lege pagina zonder uitleg.

---

## matchpool.html / js/matchpool.js

| State | Aanwezig | Bewijs | Visueel onderscheidend |
|-------|----------|--------|----------------------|
| Loading | ⚠️ | Vermoedelijk deck is leeg totdat data binnenkomt | ❓ |
| Empty (geen vacatures om te swipen) | ⚠️ | Niet expliciet geverifieerd | ❓ |
| Error | ⚠️ | toast.error in Sprint α swipe-flow | ⚠️ Toast is tijdelijk |
| Success | ✅ | Swipe-cards | ✅ |

**Oordeel**: ⚠️ NIET GEVERIFIEERD — vereist dieper lezen van matchpool.js en de bijbehorende HTML.

---

## Overzichtstabel

| Pagina | Loading | Empty | Error | Success | Algemeen oordeel |
|--------|---------|-------|-------|---------|-----------------|
| discover.html | ⚠️ | ✅ | ✅ | ✅ | ⚠️ GOED MAAR |
| mijn-sollicitaties.html | ❌ | ✅ | ⚠️ | ✅ | ⚠️ GEDEELTELIJK |
| chat.html | ❌ | ✅ | ✅ | ✅ | ✅ GOED |
| company-dashboard.html | ❌ | ⚠️ | ⚠️ | ✅ | ⚠️ GEDEELTELIJK |
| school-dashboard.html | ✅ | ✅ | ✅ | ✅ | ✅ GOED |
| match-dashboard.html | ❌ | ❌ | ❌ | ✅ | ❌ ZWAK |
| bbl-hub.html | ❌ | ⚠️ | ❌ | ✅ | ❌ ZWAK |
| buddy-dashboard.html | ❌ | ⚠️ | ❌ | ✅ | ❌ ZWAK |
| matchpool | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ ONBEKEND |

---

## Barry's meegave: werkende features met zwakke visuele presentatie

| Feature | Uitstraling | Risico |
|---------|-------------|--------|
| Buddy-systeem | dashboard start met mogelijk lege pagina bij init-fout | Gebruiker denkt dat buddy niet werkt |
| BBL Hub (7 views) | geen loading-states per view | Views lijken "kapot" terwijl data nog laadt |
| Stage Hub (match-dashboard) | geen empty-state voor "je hebt nog geen actieve stage" | Nieuwe gebruiker ziet lege app-shell |
| Reistijdfilter (discover) | mooi, maar visueel verborgen achter toggle | Waardevolle feature wordt niet ontdekt |
| Trust badges | aanwezig op vacature-cards, maar geen uitleg | Badge wordt gezien maar niet begrepen |

---

## Prioritering

| Prioriteit | Pagina | Ontbrekende state | Ernst |
|-----------|--------|-------------------|-------|
| P1 | bbl-hub.html | Error state voor DB-failures | HOOG (evaluaties, verlenging) |
| P1 | match-dashboard.html | Loading + empty + error | HOOG (centrale hub BOL-studenten) |
| P2 | buddy-dashboard.html | Loading + error op buddyInit | MIDDEL |
| P2 | mijn-sollicitaties.html | Loading state | MIDDEL |
| P3 | company-dashboard.html | Loading + empty voor vacatures | LAAG |
| P3 | discover.html | Loading-spinner (onderscheid van empty) | LAAG |

---

*Dolly + Polly — 22 april 2026 — READ-ONLY*
