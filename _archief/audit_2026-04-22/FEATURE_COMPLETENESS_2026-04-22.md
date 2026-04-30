# Dax2 — Feature Completeness Audit
**Datum**: 22 april 2026
**Rol**: Dax2 — Ik scoor features eerlijk. Niet wat er in de code staat, maar wat een gebruiker op dag 1 werkend ervaart.
**Scope**: De zeven werkende pijlers uit Jean Goodway's Value Proposition Audit × completeness-score.
**Input van Jean Goodway**: "Internly heeft substantieel meer te bieden dan de homepage suggereert."
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Scoringscriteria

Elke pijler wordt gescoord op vier dimensies:
- **Functional** (40%): Werkt de kernfunctie zoals bedoeld?
- **Discoverable** (20%): Vindt een nieuwe gebruiker de feature zonder instructies?
- **Complete** (25%): Zijn alle deelflows af? (geen stubs, geen broken states)
- **Resilient** (15%): Wat ziet de gebruiker als iets fout gaat?

Score per dimensie: 0–10. Eindscoregewogen gemiddelde.

---

## Pijler 1 — Vacature-discovery (discover.html)

### Functional (40%)
- Zoeken op tekst: ✅
- Filteren op sector / niveau / locatie: ✅
- Reistijdfilter (Google Maps API): ✅ — werkt, maar verborgen achter "Filter op reistijd"-toggle
- Trust badges op kaarten: ✅ — aanwezig, maar geen tooltip
- Responsgarantie-indicator: ✅ — aanwezig als UI-label, niet als afgedwongen mechanisme
- Solliciteer-knop met login-check: ✅
- Publieke toegang: ✅

**Functional score**: 8/10 — alles werkt, Trust Score is een stub.

### Discoverable (20%)
- Reistijdfilter: ⚠️ — verborgen achter toggle, niet in focus bij landing. Blara: Yara ontdekt het toevallig.
- Matchpool-link: ❌ — er is geen link van discover.html naar de swipe-interface.
- Overige filters: ✅ — zichtbaar en intuïtief.

**Discoverable score**: 5/10 — beste feature (reistijdfilter) is verborgen, matchpool niet vindbaar.

### Complete (25%)
- Vier states: loading ⚠️ (geen spinner, zelfde class als empty), empty ✅, error ✅, success ✅
- Trust badge zonder uitleg: ⚠️

**Complete score**: 7/10

### Resilient (15%)
- Error state: ✅ rood, `code`-element, onderscheidend
- Loading vs empty: ⚠️ visueel niet onderscheidend

**Resilient score**: 7/10

### **Totaal discover.html**: 7.1/10

---

## Pijler 2 — Matchpool / swipe-discovery (js/matchpool.js)

### Functional (40%)
- Swipe links / rechts / omhoog: ✅
- Mutual match trigger: ✅
- Undo-toast na swipe: ✅ (Sprint α)
- Conflict-detectie bij undo: ✅ (Sprint α)
- Super-like flow: ✅

**Functional score**: 9/10 — meest complete feature-implementatie.

### Discoverable (20%)
- Vanuit discover.html: ❌ geen link
- Vanuit homepage: ❌ niet gelinkt
- Vanuit navigatie: ⚠️ afhankelijk van rol en of de gebruiker de navigatie begrijpt
- Blara: geen van de drie persona's ontdekt matchpool organisch.

**Discoverable score**: 2/10 — de best-geïmplementeerde feature is de minst-ontdekbare.

### Complete (25%)
- States: loading ⚠️ (lege deck tot data binnenkomt), empty ⚠️ (niet geverifieerd), error ⚠️ (toast, tijdelijk)
- Geen onboarding of uitleg van het "mutual match"-principe.

**Complete score**: 6/10

### Resilient (15%)
- Error-toast aanwezig maar verdwijnt na timeout. Daarna geen visuele indicatie.

**Resilient score**: 5/10

### **Totaal matchpool**: 6.6/10

**Noot van Dax2**: Dit is het meest onderscheidende feature van de codebase (geen enkel Nederlands stageplatform heeft swipe-discovery). Een 6.6 terwijl de kern werkt is puur een discovery- en onboarding-probleem. Dit is oplosbaar zonder nieuwe functionaliteit.

---

## Pijler 3 — Matches & Stage Hub (match-dashboard.html)

### Functional (40%)
- Multi-rol hub (student / bedrijf / school-view): ✅
- Stage-status tracking: ✅
- Deadlines zichtbaar: ✅
- Koppeling aan chat, kalender, evaluatie: ✅
- App-shell met sidebar: ✅

**Functional score**: 8/10

### Discoverable (20%)
- Naam "Stage Hub" niet herkenbaar als feature-naam voor nieuwe gebruikers (Blara: Marc herkent het niet).
- Routing naar match-dashboard.html is automatisch na match — gebruiker hoeft het niet te vinden.

**Discoverable score**: 7/10

### Complete (25%)
- Loading state: ❌ (Dolly+Polly: meest zwakke pagina voor states)
- Empty state (geen stage gekoppeld): ❌
- Error state: ❌
- Role-picker toont totdat auth-check klaar is: ⚠️

**Complete score**: 3/10 — de centrale BOL-hub heeft de slechtste state-coverage.

### Resilient (15%)
- Geen error recovery. Bij DB-fout: lege app-shell.

**Resilient score**: 2/10

### **Totaal match-dashboard**: 5.5/10

---

## Pijler 4 — BBL-trajectoverzicht (bbl-hub.html)

### Functional (40%)
- 7 views: ✅
- Leerdoelen aanmaken/bijwerken/voortgang: ✅
- Evaluatie driepartijen-ondertekening: ✅ (met bekende atomiciteit-issues)
- Verlenging 90-dagenregel UI: ✅
- Reflectieverslag DRAFT-flow: ✅
- Wettelijke termijnen: ✅

**Functional score**: 8/10 — meest volledige implementatie in de codebase.

### Discoverable (20%)
- BBL-gebruikers worden direct gerouteerd naar bbl-hub.html. Discovery is niet het probleem.
- Maar: 7 views zonder duidelijke progressie-indicator. Gebruiker weet niet in welke volgorde de views te gebruiken.

**Discoverable score**: 7/10

### Complete (25%)
- 19 bare catches: ❌ — fouten worden geslokt in kritische flows
- Loading states per view: ❌
- Empty state leerdoelen: ⚠️ (niet geverifieerd)
- Renewal_status race condition: ❌
- BBL zonder actieve stage: ⚠️ (structureel paradox #2)

**Complete score**: 4/10

### Resilient (15%)
- 19 bare catches maken het vrijwel onmogelijk dat de gebruiker feedback krijgt bij een fout.
- Signoff faling: gedeeltelijk gedekt (try/catch met user-bericht — gefixt april 2026), maar overige flows niet.

**Resilient score**: 3/10

### **Totaal bbl-hub**: 6.0/10

**Noot van Dax2**: Dit is strategisch het meest waardevolle feature (uniek in de markt), maar de lage Complete en Resilient scores zijn een risico. Een BBL-student die de evaluatie niet kan afronden door een stille fout, verliest vertrouwen in het hele platform.

---

## Pijler 5 — Chat (chat.html)

### Functional (40%)
- Real-time berichten via Supabase WebSocket: ✅
- Berichtengeschiedenis: ✅
- Afspraken plannen via kalender: ✅
- Optimistic UI (pending/failed state): ✅ (Sprint α)
- Emoji-ondersteuning: ✅
- Push-notificaties: ✅ (js/push.js)

**Functional score**: 9/10

### Discoverable (20%)
- Chat wordt bereikbaar na een match — gebruiker wordt er naartoe geleid.
- Geen standalone discovery-probleem.

**Discoverable score**: 8/10

### Complete (25%)
- Loading state: ❌ (geen indicator bij initieel laden berichten)
- Empty state (lege conversatie): ✅ (Sprint α: "Begin met een open vraag.")
- Error state (failed message): ✅ (Sprint α: rode rand + retry-knop)
- Pending state: ✅ (Sprint α: opacity .55)

**Complete score**: 7/10 — beste state-coverage na school-dashboard.

### Resilient (15%)
- Failed message met retry: ✅
- WebSocket-verbindingsverlies: ⚠️ geen visuele indicator

**Resilient score**: 7/10

### **Totaal chat**: 8.1/10

**Noot van Dax2**: Chat is de meest complete feature na Sprint α. De 8.1 is terecht — dit is dagelijkse gebruikswaarde die de retention drijft.

---

## Pijler 6 — Buddy-systeem (buddy-dashboard.html + js/buddy.js)

### Functional (40%)
- Buddy-profiel: ✅
- Buddy-koppeling aanvragen/accepteren/weigeren: ✅
- buddy_pairs tabel in DB: ✅
- Notificaties (buddy_request/accepted/declined): ✅

Maar: buddy-typen completeness:
| Type | Status |
|------|--------|
| peer | ✅ functioneel |
| gepensioneerd | ✅ functioneel |
| school | ✅ functioneel |
| mentor | ⚠️ "fase 2" — UI aanwezig, pagina ontbreekt |
| insider | ⚠️ reveal-logica niet geïmplementeerd (Morgan2: reveal_after = null, geen trigger) |

**Functional score**: 7/10 — 3/5 typen volledig functioneel.

### Discoverable (20%)
- Blara: geen van de drie persona's ontdekt het buddy-systeem organisch.
- Jean Goodway: buddy-strip op homepage te subtiel.

**Discoverable score**: 2/10

### Complete (25%)
- Loading state: ❌ (bare catch op buddyInit)
- Empty state: ⚠️ niet geverifieerd
- Error state: ❌ (lege pagina bij init-fout)
- Insider-reveal flow: ❌

**Complete score**: 4/10

### Resilient (15%)
- buddyInit bare catch: bij een fout ziet de gebruiker een lege pagina.

**Resilient score**: 2/10

### **Totaal buddy**: 4.6/10

**Noot van Dax2**: De buddy-score is misleidend laag door discovery en resilience. De kern werkt. Maar een feature die niemand vindt én een lege pagina toont bij init-fout, verdient geen hogere score.

---

## Pijler 7 — School-monitoring (school-dashboard.html)

### Functional (40%)
- Cohort-overzicht: ✅
- Signalen (>14 dagen inactief): ✅
- Stage-voortgang per student: ✅
- Buddy-koppeling vanuit school-dashboard: ✅

Stubs:
- Driegesprek-workflow: ⚠️ deels aanwezig
- Exportrapportages: ❌ stub
- Cohort-rapportage: ❌ stub

**Functional score**: 6/10 — basismonitoring werkt, geavanceerde features zijn stubs.

### Discoverable (20%)
- School-dashboard is de directe landing na login voor school-gebruikers. Discovery niet het probleem.
- Maar: signalen-sectie (meest waardevolle feature) is niet prominent — Blara: Joke ontdekt het pas na profielinvulling.

**Discoverable score**: 6/10

### Complete (25%)
- Loading state: ✅ (beste in de codebase — spinner-emoji, showLoading() helper)
- Empty state: ✅
- Error state: ✅ (zelfde container als loading, maar onderscheidend via icoon)
- Driegesprek: ⚠️ deels
- Export: ❌

**Complete score**: 6/10

### Resilient (15%)
- Best-geïmplementeerde pagina voor states. Errors zijn zichtbaar.

**Resilient score**: 8/10

### **Totaal school-dashboard**: 6.3/10

---

## Overzichtstabel

| Pijler | Functional | Discoverable | Complete | Resilient | **Totaal** |
|--------|-----------|-------------|---------|----------|-----------|
| discover.html | 8.0 | 5.0 | 7.0 | 7.0 | **7.1** |
| matchpool | 9.0 | 2.0 | 6.0 | 5.0 | **6.6** |
| match-dashboard | 8.0 | 7.0 | 3.0 | 2.0 | **5.5** |
| bbl-hub | 8.0 | 7.0 | 4.0 | 3.0 | **6.0** |
| chat | 9.0 | 8.0 | 7.0 | 7.0 | **8.1** |
| buddy | 7.0 | 2.0 | 4.0 | 2.0 | **4.6** |
| school-dashboard | 6.0 | 6.0 | 6.0 | 8.0 | **6.3** |

**Platform gemiddeld**: 6.3/10

---

## Patronen

**Hoogste Functional, laagste Discoverable**: matchpool (9.0 vs 2.0) en buddy (7.0 vs 2.0).
Conclusie: de meest onderscheidende features van Internly zijn technisch sterk maar onzichtbaar.

**Laagste Complete + Resilient**: match-dashboard.html (3.0 + 2.0).
Conclusie: de centrale hub voor BOL-studenten is het fragielst bij edge cases.

**Beste overall**: chat.html (8.1). Dit is de enige feature die door alle persona's na discovery als waardevol wordt ervaren.

---

## Prioritering op basis van ROI

| Actie | Pijler | Score-impact |
|-------|--------|-------------|
| Matchpool link toevoegen vanuit discover.html | matchpool | +3–4 op Discoverable |
| Loading/empty/error states toevoegen aan match-dashboard | match-dashboard | +4–5 op Complete + Resilient |
| Buddy-systeem prominent op homepage | buddy | +3–4 op Discoverable |
| bbl-hub bare catches oplossen | bbl-hub | +2–3 op Resilient |
| Insider-reveal trigger implementeren | buddy | +1–2 op Complete |

De hoogste ROI-actie is de matchpool-link: 1 HTML-link, +3–4 punten op de meest onderscheidende feature.

---

*Dax2 — 22 april 2026 — READ-ONLY*
