# De Sensei — Architectural Foresight Audit
**Datum**: 22 april 2026
**Rol**: De Sensei — Ik kijk niet naar wat nu kapot is, maar naar wat de architectuur kwetsbaar maakt voor de komende zes maanden.
**Scope**: Vijf architecturele schulden die nu onzichtbaar zijn maar bij groei of feature-uitbreiding blokkades worden.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode

Bronnen: match-dashboard.html (6145 regels), bbl-hub.html (2696 regels), alle productie-HTML-bestanden (17), js/utils.js, js/supabase.js, CLAUDE.md.

Horizon: 6 maanden / sprint 5–8. Geen hypothetische extreem-scenarios — alleen risico's die optreden bij normaal doorontwikkelen van bestaande sprint-plannen.

---

## Schuld 1 — match-dashboard.html: 6145 regels in één bestand

### Huidige staat
match-dashboard.html is het grootste bestand in de codebase (6145 regels). Het bevat:
- Alle CSS voor de Stage Hub (app-shell, sidebar, role-picker, content-areas)
- Role-picker logica (student / bedrijf / school-weergave)
- Alle data-loadfuncties voor alle rollen
- Alle render-functies voor alle rollen
- Event handlers voor alle rollen

### Architectureel patroon
Eén HTML-bestand als volledig SPA voor meerdere rollen. Rol-specifieke views worden via CSS (display: none) geschakeld.

### Risico bij doorontwikkeling

**Sprint 5 scope (CLAUDE.md)**: hasActivePlan() gating voor match-dashboard.html, driegesprek-workflow voltooien, stage-voortgang bijhouden per match.

Elke sprint voegt functies toe voor ≥1 rol. Bij huidig groeipatroon:
- Sprint 5: +300–500 regels (driegesprek, gating)
- Sprint 6: +300–500 regels (Trust Score UI, BBL-90-dag notificaties)
- Sprint 8: +300–500 regels (ESG-export, cohort-rapportage)

Projectie: 8000–9000 regels binnen 6 maanden. Dit is boven de grens waarbij:
- Zoeken en navigeren in de file tijdrovend wordt
- Claude Code-sessies niet het volledige bestand in context kunnen houden
- Regressies in één rol onzichtbaar zijn bij edits in een andere rol

### Signaal dat het moment voor opsplitsing nadert
De huidige sessie kon match-dashboard.html niet volledig lezen in één contextvenster. Pre-flight check bevestigde 6145 regels, maar inhoudelijke audit vereiste gerichte grep-queries in plaats van doorlezen.

### Aanbeveling (richting, geen implementatieverplichting)
Een modulaire structuur waarbij rol-specifieke logica naar aparte JS-modules wordt verplaatst, met match-dashboard.html als dunne shell. Overeenkomstig hoe bbl-hub.html nu functioneert (7 views in één bestand, maar minder rollen). De grens ligt eerder bij "kan Claude Code dit in één sessie correct aanpassen" dan bij "is dit technisch onmogelijk."

**Ernst**: MIDDEL nu, HOOG na sprint 6.

---

## Schuld 2 — unhandledrejection handler: 17× gedupliqeerd

### Huidige staat
Het `unhandledrejection`-event wordt gebruikt als vangnet voor niet-afgehandelde Promise-fouten. Dit patroon is aanwezig in 17 productie-HTML-bestanden:

```
chat.html, company-dashboard.html, mijn-sollicitaties.html,
vacature-detail.html, student-profile.html, school-dashboard.html,
matches.html, match-dashboard.html, discover.html, company-discover.html,
buddy-dashboard.html, bol-profile.html, bbl-profile.html, bbl-hub.html,
bbl-dashboard.html, auth.html, admin.html
```

Elke kopie is een identieke inline `<script>` block (of een identieke listener). Ze zijn buiten utils.js gedefinieerd.

### Relatie tot loop-shield (7/11 principe)
CLAUDE.md's loop-shield controleert: `notify`, `escapeHtml`, `createNotification`, `SUPABASE_URL`. De unhandledrejection-handler staat niet in de loop-shield, maar valt wel onder het principe: één definitie, niet 17.

### Risico bij doorontwikkeling

Als het foutafhandelingsgedrag verandert — bijvoorbeeld om fouten te loggen naar telemetry.js of om een gebruikersvriendelijkere boodschap te tonen — moeten 17 bestanden worden bijgewerkt. Bij een missed update: inconsistente error-handling.

Dit is geen hypothetisch scenario. CLAUDE.md vermeldt reeds dat telemetry.js (hunters.js) bewakingsfuncties heeft. Het uitbreiden van de onhandledrejection-handler om beveiligingsrelevante fouten te rapporteren is een logische sprint-5-verbetering. Dat vereist dan 17 edits, niet 1.

### Aanbeveling (richting)
Verplaats de unhandledrejection-handler naar js/utils.js of een nieuwe js/error-handler.js, geladen voor alle app-pagina's. Loop-shield voegt het type toe als te monitoren definitie.

**Ernst**: LAAG nu (identieke kopieën, geen drift), HOOG als behavior divergeert.

---

## Schuld 3 — bbl-hub.html: 7-view SPA met gedeeld JS-namespace

### Huidige staat
bbl-hub.html heeft 7 views (Overzicht, Leerdoelen, Chat, Evaluatie, Verlenging, Reflectie, Profiel), alle in één DOM geladen. Views worden zichtbaar gemaakt via `goView(viewId)`. Alle JS-functies leven in één `<script>`-block (of inline in de HTML).

### Patroon
Alle functienamen (bijv. `signOff`, `renewalSign`, `submitReflection`, `buddyInit`) zijn in de globale scope van de pagina. Geen module-boundary, geen namespace.

### Risico bij doorontwikkeling

**Sprint 5 scope**: buddy-kalender, sessie-plannen, begeleider-agenda. Deze functies zullen worden toegevoegd aan bbl-hub.html of een nieuwe BBL-subpagina.

Risico 1: **naamconflicten**. Als sprint 5 een `submit()` functie toevoegt voor de reflectie-flow terwijl er al een `submit()` in de kalender-logica bestaat, overschrijft de tweede de eerste. Geen foutmelding.

Risico 2: **view-overstijgende state**. Als de evaluatieflow een variabele `currentParty` gebruikt en de verlengingsflow dezelfde naam gebruikt voor een andere betekenis: stille bug bij snel wisselen van views.

Risico 3: **19 bare catches (Hal)** maken het onzichtbaar als een functie in de verkeerde view-context wordt aangeroepen.

### Aanbeveling (richting)
Elk view als een IIFE-module met eigen scope, of minimaal: naamruimte via een object (`EvalModule.signOff`, `RenewalModule.sign`). Dit past binnen het bestaande patroon (BuddyModule, InternlyCalendar zijn al objecten).

**Ernst**: LAAG nu (7 views, overzienbaar), MIDDEL na uitbreiding naar 10+ views.

---

## Schuld 4 — Inline SUPABASE_URL: loop-shield uitzondering die kan groeien

### Huidige staat
CLAUDE.md vermeldt: "about.html + index.html: inline SUPABASE_URL opruimen" als sprint-5-werk.

Reden voor de uitzonderingen: index.html heeft een auth gate (toegevoegd 20 april) die db vereist voor anonieme toegang-check. about.html en pricing.html zijn publieke pagina's die toch Supabase-interactie hebben (waitlist-formulier, referral-check).

### Loop-shield definitie
`const SUPABASE_URL` → verwacht 0 buiten supabase.js.

Huidige staat: ≥3 uitzonderingen (index.html, about.html, pricing.html). Elke keer dat een publieke pagina Supabase-functionaliteit nodig heeft, is de verleiding groot om SUPABASE_URL opnieuw inline te definiëren.

### Risico bij doorontwikkeling

De loop-shield werkt via grep. Als de baseline "0 buiten supabase.js" al niet klopt, verliest de grep-controle zijn voorspellende waarde.

Concreter: als sprint 5 een nieuw publiek landingspagina toevoegt (bijv. voor BBL-marketing) die ook een waitlist-formulier heeft, wordt een inline SUPABASE_URL de snelste oplossing. De loop-shield detecteert dit als regressie, maar de drempel "dit mag eigenlijk niet" is al overschreden.

### Aanbeveling (richting)
Verplaats supabase.js-laden naar de `<head>` van publieke pagina's (in plaats van inline URL herhalen), of maak een aparte `js/public-db.js` voor publieke pages die legitiem Supabase nodig hebben. De loop-shield controle blijft geldig: 0 definities buiten supabase.js en public-db.js.

**Ernst**: LAAG nu, MIDDEL als de lijst van publieke Supabase-pagina's groeit.

---

## Schuld 5 — Geen transactie-abstractie: elke multi-stap operatie schrijft zijn eigen sequentie

### Huidige staat
(Volledig gedocumenteerd in Timmy's Atomic Ops rapport.)

Samenvatting voor architectureel perspectief: er zijn 7 geïdentificeerde multi-stap DB-operaties, allemaal client-side sequentiële writes. Geen `.rpc()` aanroepen. Rollback-logica (waar aanwezig) is handmatig geschreven per operatie in de aanroepende functie.

### Risico bij doorontwikkeling

Sprint 5 voegt nieuwe multi-stap operaties toe:
- Trust Score herberekening (review-INSERT → company_profiles.update + internship_postings.update)
- BBL-90-dag notificatie (cron-job of Edge Function → notifications.insert)
- Eindverslag-notificatie aan school bij eval_completed

Elk van deze zal, op basis van huidig patroon, opnieuw als client-side sequentiële writes worden geïmplementeerd, met eigen ad-hoc rollback. De codebase krijgt meer operaties met inconsistente garanties.

### Het architecturele momentum-probleem
Eén Postgres-functie (.rpc()) toevoegen vereist:
1. SQL-migratie schrijven voor de functie
2. EXECUTE FUNCTION rechten toekennen in Supabase Console
3. Aanroepende JS-code omschrijven naar `.rpc(naam, params)`

Dat is meer werk dan een sequentiële write. Zolang de drempel hoog is, worden nieuwe operaties als sequentiële writes gebouwd. De schuld groeit met elke nieuwe operatie.

### Aanbeveling (richting)
Identificeer één operatie als pilot voor het .rpc()-patroon. renewalSign() is ideaal: het race-condition probleem is reproduceerbaar, de Postgres-fix (jsonb_set met atomic update) is eenvoudig, en de JS-kant wordt eenvoudiger. Een werkende pilot verlaagt de drempel voor alle volgende operaties.

**Ernst**: MIDDEL nu (7 operaties, beheersbaar), HOOG als sprint 5-6 er 5+ bijvoegen zonder patroonwijziging.

---

## Samenvatting: schulden-prioritering op 6-maanden-horizon

| Schuld | Ernst nu | Ernst +6 maanden | Trigger |
|--------|----------|-----------------|---------|
| 1 — match-dashboard.html monoliet | MIDDEL | HOOG | Sprint 6 voegt driegesprek + ESG UI toe |
| 2 — unhandledrejection 17× | LAAG | HOOG | Telemetry-uitbreiding of behavior-wijziging |
| 3 — bbl-hub namespace | LAAG | MIDDEL | Sprint 5 buddy-kalender uitbreiding |
| 4 — inline SUPABASE_URL | LAAG | MIDDEL | Nieuwe publieke pagina met DB-functie |
| 5 — geen transactie-abstractie | MIDDEL | HOOG | Elke sprint voegt multi-stap operaties toe |

### De kern
De vijf schulden zijn niet onafhankelijk. Ze zijn uitingen van hetzelfde patroon: **groei via accumulatie in bestaande bestanden, zonder module-grenzen.** Dit patroon werkt uitstekend tot een bestand te groot wordt om te lezen, een namespace te vol wordt om te beheren, of een duplicaat te veel wordt om consequent te updaten. Op dat punt worden alle vijf schulden tegelijk zichtbaar.

Het advies is niet: herstructureer nu. Het advies is: kies één sprint om één schuld structureel aan te pakken voordat de rest ermee samenhangt.

---

*De Sensei — 22 april 2026 — READ-ONLY*
