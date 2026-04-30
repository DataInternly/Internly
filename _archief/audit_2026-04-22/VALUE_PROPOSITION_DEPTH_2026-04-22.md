# Jean Goodway — Value Proposition Depth Audit
**Datum**: 22 april 2026
**Rol**: Jean Goodway — Internly is meer dan no-ghosting. Ik inventariseer wat er werkelijk staat en wat verdient meer podium.
**Scope**: Alle werkende features vs. marketing-representatie. Herpositioneringsadvies.
**Opdracht van Barry**: "Focus minder op ghosting. Wat biedt Internly nog meer?"
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Stap 1 — Inventaris werkende features per pijler

---

### Pijler 1 — Vacature-discovery (discover.html)

**Wat werkt**:
- Zoeken op tekst (functietitel, beschrijving)
- Filteren op sector, niveau (BBL/MBO/HBO/WO), locatie
- **Reistijdfilter** (js/reistijd.js, Google Maps API integratie): student vult postcode in, instelt max reistijd, filtert automatisch op bereikbare stages
- Trust badges (A/B/C) op vacaturekaarten — visueel aanwezig
- Responsgarantie-indicator (Ja/Nee) per vacature
- Directe "Solliciteer"-knop met login-check
- Publieke toegang (geen login vereist om te zoeken)

**Diepte**: Uitgebreid
**Begunstigde rol**: Studenten (BOL + BBL), ook publiek toegankelijk
**USP vs. concurrenten**: Reistijdfilter is ongewoon specifiek voor stage-platforms. De meeste platforms bieden alleen postcode-filter, niet reistijd.

---

### Pijler 2 — Matchpool / swipe-discovery (js/matchpool.js)

**Wat werkt**:
- Tinder-achtige swipe-interface voor vacatures
- Swipe links (oversla) / rechts (like) / omhoog (super-like)
- Mutual match trigger: als student én bedrijf rechts swipen → automatische match aangemaakt
- Sprint α: undo-toast na swipe (7 seconden om te annuleren)
- Matchpool trekt uit meerdere pools: vacatures + bedrijfsprofielen
- Conflict-detectie: als er al een match is vóór undo, toont info-toast

**Diepte**: Uitgebreid
**Begunstigde rol**: Studenten
**USP vs. concurrenten**: Geen enkel Nederlands stageplatform heeft een swipe-discovery interface. Dit is de meest onderscheidende feature in de codebase.

---

### Pijler 3 — Matches & Stage Hub (match-dashboard.html)

**Wat werkt**:
- Multi-rol hub: student, begeleider en school kunnen verschillende views zien via role-switcher
- Stage-status tracking per match
- Deadlines zichtbaar (deadline-meter voor response-time)
- Koppeling aan chat, kalender, evaluatie vanuit de hub
- App-shell met sidebar navigatie

**Diepte**: Gemiddeld (hub werkt, sommige sub-features zijn stubs)
**Begunstigde rollen**: Studenten, begeleiders, school
**USP**: Geïntegreerde hub voor alle betrokken partijen bij één stage

---

### Pijler 4 — BBL-trajectoverzicht (bbl-hub.html)

**Wat werkt**:
- 7 views: Overzicht, Leerdoelen, Chat, Evaluatie, Verlenging, Reflectie, Profiel
- Leerdoelen: aanmaken, bijwerken, voortgang bijhouden
- Evaluatie: driepartijen-ondertekening (student + bedrijf + school), signOff-keten
- Verlenging: 90-dagenregel weergegeven (bbl-hub.html:960), contractverlenging-flow
- Reflectieverslag: DRAFT-flow met localStorage-persistence, definitief versturen
- Wettelijke termijnen weergegeven als reminder

**Diepte**: Uitgebreid — de meest uitgewerkte feature in de codebase
**Begunstigde rol**: BBL-studenten (en hun leerbedrijf + school)
**USP**: Geen enkel ander platform integreert de BBL-wetgeving (WEB/BPV) direct in de UX. De 90-dagenregel, de evaluatieondertekening, de reflectieflow — dit is uniek.

---

### Pijler 5 — Chat (chat.html)

**Wat werkt**:
- Real-time berichten via Supabase WebSocket
- Berichtengeschiedenis
- Afspraken plannen via kalender (calendar.js geïntegreerd)
- Sprint α: optimistic UI — berichten verschijnen direct (pending-state), foutmelding bij netwerk-probleem (failed-state + retry)
- Emoji-ondersteuning (emoji-mart SRI hash aanwezig)
- Push-notificaties via push.js

**Diepte**: Uitgebreid
**Begunstigde rollen**: Alle rollen die gematcht zijn
**USP**: Real-time + kalenderintegratie in één scherm

---

### Pijler 6 — Buddy-systeem (buddy-dashboard.html + js/buddy.js)

**Wat werkt**:
- Buddy-profielen: gepensioneerde professionals met expertise
- Buddy-koppeling: student vraagt buddy aan, buddy accepteert/weigert
- buddy_pairs tabel in DB
- Notificaties: buddy_request, buddy_accepted, buddy_declined (volledig geregistreerd)
- Chat-integratie met buddy

**Diepte**: Gemiddeld
**Begunstigde rol**: Studenten (met name eerste-stage studenten, kwetsbare groepen)
**USP**: Peer-mentorship van gepensioneerde professionals is volledig absent bij concurrerende platforms. Dit is sociaal onderscheidend.

---

### Pijler 7 — School-monitoring (school-dashboard.html)

**Wat werkt**:
- Cohort-overzicht: alle studenten in één view
- Signalen: studenten met >14 dagen inactiviteit worden geflagd
- Stage-voortgang per student inzichtelijk
- Buddy-koppeling vanuit school-dashboard
- Notificaties sturen naar studenten
- showLoading() helper voor consistente loading-states

**Deels werkend**:
- Driegesprek-workflow: UI deels aanwezig, functie niet volledig geïmplementeerd
- Exportrapportages: stub

**Diepte**: Gemiddeld — monitoring werkt, geavanceerde features zijn stubs
**Begunstigde rol**: School / ROC / begeleiders
**USP**: Real-time signalen bij inactieve studenten zijn praktisch bruikbaar op dag 1.

---

### Pijler 8 — Trust Score & Reputatiesysteem

**Wat werkt**:
- Trust badges (A/B/C) op vacaturekaarten
- Reviews aanmaken (new_review notificatie)
- Trust Score als UI-label zichtbaar

**Wat NIET werkt**:
- Automatische herberekening (algoritme stub)
- Ghosting-bestraffing (niet geïmplementeerd)

**Diepte**: LAAG — de data-structuur bestaat, de berekening niet
**USP**: Potentieel: het eerste objectieve reputatiesysteem voor stage-gevende bedrijven in Nederland. Actueel: een label zonder dynnamische basis.

---

## Stap 2 — Marketing-representatie check

| Pijler | Werkt | Marketing-ruimte (index.html) | Over/ondergerapporteerd |
|--------|-------|-------------------------------|------------------------|
| Trust Score / anti-ghosting | ⚠️ GEDEELTELIJK | VEEL (hero, tagline, how-it-works stap 2+3, ESG-band) | ❌ OVER-gerapporteerd |
| Reistijdfilter | ✅ VOLLEDIG | GEEN | ❌ ONDER-gerapporteerd |
| Matchpool / swipe | ✅ VOLLEDIG | GEEN | ❌ ONDER-gerapporteerd |
| BBL-trajectoverzicht | ✅ UITGEBREID | Klein blok (BBL-sectie in how-it-works) | ⚠️ LICHT ONDER |
| Buddy-systeem | ✅ GEMIDDELD | Kleine strip onderaan role-tiles | ❌ ONDER-gerapporteerd |
| Chat + kalender | ✅ VOLLEDIG | GEEN | ❌ ONDER-gerapporteerd |
| School-monitoring + signalen | ✅ GEMIDDELD | GEEN | ❌ ONDER-gerapporteerd |
| ESG/CSRD-export | ❌ STUB | Grote sectie (ESG-band + Waarom nú) | ❌ OVER-gerapporteerd |
| Driegesprek-workflow | ❌ STUB | Pricing ✓-feature | ❌ OVER-gerapporteerd |

**Score: 5 features onder-gerapporteerd, 3 over-gerapporteerd.**

---

## Stap 3 — Herpositioneringsaanbevelingen

### A. Wat van de homepage kan wegblijven (of met caveat)
1. **"⚡ Responsgarantie"** als how-it-works stap 2: vervang door iets dat wél werkt. Alternatief: "Sollicitaties bijgehouden op één plek."
2. **ESG-band**: verwijder totdat ESG-export live is, of vervang door een "Binnenkort"-formaat.
3. **"Geen uitzonderingen"**: directe tekst-aanpassing (zie Witty).

### B. Features die meer podium verdienen

**B1 — Reistijdfilter**
- Voeg een feature-blok toe: "Zoek stages op reistijd. Jij vult je postcode in, wij filteren automatisch."
- Dit is tastbaar, verifieerbaar en onderscheidend.

**B2 — Matchpool / swipe**
- Voeg een interactieve teaser toe op de homepage (of link naar de simulator): "Of swipe door vacatures zoals je gewend bent."
- De stage-simulator is al aanwezig op de homepage — dit is de plek om matchpool te introduceren.

**B3 — Buddy-systeem**
- De buddy-strip op de homepage is te klein. Geef het een eigen sectie: "Meer dan een stage-platform: een netwerk van mentors."
- Buddy-systeem is het meest sociaal onderscheidende feature en past bij de missie.

**B4 — BBL-hub**
- "Het eerste platform dat de WEB/BPV-wetgeving vertaalt naar een dagelijkse tool voor BBL-studenten" — dit is een niche maar sterke claim.
- Aparte marketing-sectie voor BBL is gerechtvaardigd gezien de uitgebreidheid van de implementatie.

**B5 — School-signalen**
- "Internly signaleert automatisch welke studenten al 14 dagen inactief zijn." Dit is concreet, direct bruikbaar en werkend.
- Voor pricing-pagina: vervang vage "Signalen & alerts" door dit concrete voorbeeld.

### C. Alternatieve hero-copy richting (directioneel)

Huidige hero: anti-ghosting (probleem-georiënteerd, studenten-only framing)
Alternatief: productiviteit en overzicht (platform-georiënteerd, alle rollen)

Voorbeeldrichtingen (geen definitieve copy, slechts richting):
- "Van sollicitatie tot eindverslag — alles op één plek."
- "Het platform dat BBL-studenten, scholen en bedrijven samenbrengt."
- "Swipe, chat, evalueer. De complete stage-tool."

**Dax2's input** (strategisch): De huidige anti-ghosting narrative is een instap-hook voor studenten, niet een lange-termijn retention-driver. De platforms die winnen in EdTech zijn die welke dagelijks gebruikt worden. Dagelijks gebruik komt van chat, Stage Hub en leerdoelen-tracking — niet van Trust Score. De homepage moet de dagelijkse tool-waarde communiceren, niet alleen het initiële pijnpunt.

---

## Conclusie

Internly heeft substantieel meer te bieden dan de homepage suggereert. De meest werkende features (reistijdfilter, matchpool, BBL-hub, buddy, chat) zijn onzichtbaar of verborgen. De meest prominente features (Trust Score, ESG-export) zijn stubs of gedeeltelijk geïmplementeerd.

Dit is een herpositioneringskans, geen schaamtemoment. De technische basis is sterk genoeg om een eerlijkere en sterkere pitch te maken.

---

*Jean Goodway + Dax2 (strategisch) — 22 april 2026 — READ-ONLY*
