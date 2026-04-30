# TQ — Unspoken Assumptions Audit
**Datum**: 22 april 2026
**Rol**: TQ — Ik maak het impliciete expliciet, want impliciete aannames zijn stille bugs.
**Scope**: Alle aannames over gebruikers, devices, verbindingen, concepten, gedrag, rollen en waar waarde vandaan komt.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Categorie 1 — Devices & browsers

### Aanname A1: Gebruikers hebben een moderne browser
**Bewijs**: CSS gebruikt `clip-path`, `backdrop-filter`, CSS Grid, `clamp()`, CSS custom properties. Geen polyfills aangetroffen.
**Risico**: Edge 18 (legacy), Safari < 14, Firefox ESR: sommige animaties vallen weg. Functionaliteit werkt waarschijnlijk (graceful degradation bij meeste CSS), maar de premium uitstraling niet.
**Populatie die dit raakt**: Joke (iPad 3 jaar oud) runt Safari ~15-16 — waarschijnlijk ok. Marc (Windows, Edge) — Edge is nu Chromium-based, ok.
**Oordeel**: LAAG risico, maar niet getest.

### Aanname A2: Gebruikers gebruiken Chrome of een Chromium-browser
**Bewijs**: Google Maps API geladen op discover.html (`key=AIzaSy...`) — werkt in alle browsers. Supabase realtime via WebSocket — ok in alle moderne browsers.
**Specifiek risico**: BroadcastChannel (js/push.js:69 heeft explicit catch) — goed afgedekt.
**Oordeel**: LAAG — goed afgedekt via try/catch.

### Aanname A3: Schermgrootte ≥ 320px
**Bewijs**: `min-width: 240px` op search-bar (discover.html), `minmax(280px, 1fr)` op pricing-grid. `@media(max-width:420px)` in index.html voor nieuwsbriefformulier.
**Risico**: Geen expliciete 320px breakpoint aangetroffen. Standaard voor mobile-first webdev, acceptabel.
**Oordeel**: OK

### Aanname A4: Desktop en mobile hebben hetzelfde feature-set
**Bewijs**: Geen mobile-only of desktop-only feature-branches aangetroffen. Responsive CSS via media queries.
**Risico**: Swipe-interface (matchpool.js) is touch-first. Werkt via pointer events, maar de UX van swipen met muis op desktop is onbekend zonder test.
**Oordeel**: MIDDEL — matchpool swipe UX op desktop niet getest.

---

## Categorie 2 — Verbinding

### Aanname B1: Gebruikers hebben stabiele verbinding
**Bewijs**: Geen offline-mode, geen service worker geconfigureerd (manifest.json bestaat maar PWA-functionaliteit is minimal).
**Risico**: Yara in de bus op 4G: pagina laadt, maar real-time chat en notificaties kunnen vallen. Supabase realtime vereist WebSocket — bij verbindingsverlies wordt dit niet afgehandeld met user-feedback.
**Oordeel**: MIDDEL — geen offline-state communicatie. Gebruiker ziet een lege pagina of hangende spinner als verbinding wegvalt midden in een actie.

### Aanname B2: Realtime subscriptions zijn altijd actief
**Bewijs**: startNotifSubscription() wordt op elke app-pagina aangeroepen. Geen reconnect-logica aangetroffen buiten Supabase's eigen client-reconnect.
**Risico**: Als de WebSocket verbinding verbreekt (tunnelrit), ontvangt de gebruiker geen notificaties totdat de pagina herladen wordt. Er is geen visuele indicator dat notificaties "offline" zijn.
**Oordeel**: MIDDEL — stille degradatie.

### Aanname B3: Supabase CDN is altijd bereikbaar
**Bewijs**: Supabase-js geladen van CDN (versie @2, geen SRI hash voor de supabase-js CDN). Geen fallback.
**Risico**: Als CDN tijdelijk onbereikbaar is (corporate firewall, CDN-storing), laadt de hele applicatie niet. Marc's corporate netwerk kan CDN-domeinen blokkeren.
**Oordeel**: MIDDEL — geen fallback, CDN-blokkeringen zijn reëel in corporate omgevingen.

---

## Categorie 3 — Begrijpen van concepten

### Aanname C1: Gebruikers weten wat "BBL" en "BOL" zijn
**Bewijs**: index.html gebruikt "BBL" als tile-label zonder uitleg. De uitleg staat alleen in de lp-role-desc div zodra je op de tile klikt (verborgen tot interactie). auth.html: BBL heeft een apart kaartje met "BBL-traject" als label en de beschrijving "Je werkt al bij een leerbedrijf en wil je traject bijhouden."
**Risico**: Een student die nog niet weet of ze BOL of BBL doet, kiest misschien de verkeerde rol. Na registratie als BBL maar zonder leerbedrijf → bbl-hub.html → lege staat, verwarring.
**Oordeel**: HOOG — fundamentele rol-verwarring heeft impact op de hele user journey.

### Aanname C2: Gebruikers begrijpen "swipen" als interactieparadigma
**Bewijs**: matchpool.js implementeert swipe-interface. Geen onboarding of tutorial aangetroffen.
**Risico**: Joke (64) heeft nooit geswipt. Yara begrijpt swipen van Tinder/Instagram, maar weet niet dat het hier betekent: "Als wij allebei swipen → match". De wederzijdsheid is niet uitgelegd.
**Oordeel**: HOOG voor 60+ gebruikers, LAAG voor jongere gebruikers.

### Aanname C3: Gebruikers begrijpen wat een "Trust Score" is
**Bewijs**: discover.html toont Trust A/B/C badges. Geen tooltip, geen uitlegpagina gelinkt.
**Risico**: Yara ziet "A" en denkt "goed bedrijf" — correct. Maar ze weet niet dat de score momenteel niet automatisch berekend wordt. Ze vertrouwt een label dat niet dynamisch is.
**Oordeel**: MIDDEL — misleidend voor studenten, urgent voor Marc (bedrijf wil weten hoe score te verbeteren).

### Aanname C4: Gebruikers begrijpen het verschil tussen "sollicitatie" en "match"
**Bewijs**: mijn-sollicitaties.html en matches.html zijn aparte pagina's. Geen uitleg van het flow (sollicitatie → acceptatie door bedrijf → match → chat).
**Risico**: Yara solliciteert, denkt dat ze "gematcht" is, maar is eigenlijk in de wachtrij. Ze ziet "Wacht" en begrijpt niet dat het bedrijf nog moet reageren.
**Oordeel**: MIDDEL — verwachtingsverschil leidt tot frustratie.

### Aanname C5: Gebruikers lezen de volledige pagina
**Bewijs**: index.html heeft de CSRD/Stagepact/BBL-uitleg midden op de pagina. De hero is de anti-ghosting boodschap.
**Risico**: Marc scrollt niet ver genoeg om de ESG/CSRD-sectie te zien die juist voor hem relevant is. De waardepropositie voor bedrijven staat under the fold.
**Oordeel**: MIDDEL voor bedrijven — de B2B waardepropositie is onzichtbaar op homepage.

---

## Categorie 4 — Volgorde van handelen

### Aanname D1: Profiel is compleet vóór eerste actie
**Bewijs**: routeStudent() stuurt een student zonder profiel naar student-profile.html. Voor bedrijven: geen vergelijkbare check aangetroffen. company-dashboard.html laadt zonder verplicht bedrijfsprofiel.
**Risico**: Marc plaatst een vacature vóórdat zijn bedrijfsprofiel volledig is → studenten zien een vacature zonder bedrijfsinfo → lage click-through.
**Oordeel**: LAAG — suboptimale UX, geen kritische bug.

### Aanname D2: Gebruikers keren terug na e-mailbevestiging
**Bewijs**: auth.html stuurt een "Controleer je e-mail" bevestiging. Na bevestiging: automatische redirect naar login of een landing-pagina.
**Risico**: Yara bevestigt haar e-mail op haar telefoon in de bus en verliest de context (redirect gaat naar desktop-sessie). Geen state-overdracht.
**Oordeel**: LAAG — dit is standaard e-mail-confirmatie-flow.

### Aanname D3: Bedrijven weten dat studenten actief zijn
**Bewijs**: Geen "student is actief gezien" indicator voor bedrijven in company-dashboard.html.
**Risico**: Marc wacht passief op sollicitaties. Hij weet niet dat er students zijn die zijn vacature bekeken maar niet solliciteerden.
**Oordeel**: LAAG — analytische feature, geen kritische UX-fout.

---

## Categorie 5 — Rollen

### Aanname E1: Eén persoon heeft één rol
**Bewijs**: auth.html vraagt bij registratie één rol te kiezen. De role-switcher in match-dashboard.html laat wisselen tussen student/school-view voor admins.
**Risico**: Een directeur van een ROC die ook als persoonlijk begeleider werkt, moet twee accounts aanmaken. Er is geen multi-rol-account.
**Oordeel**: LAAG — bewuste product-beslissing, niet per se een bug.

### Aanname E2: "Begeleider" en "School" zijn verschillende rollen die gebruikers begrijpen
**Bewijs**: auth.html heeft beide opties als aparte role-cards. Teksten: "School/ROC — Beheer je studenten" vs "Begeleider — Begeleid studenten op jouw tempo."
**Risico**: Joke (64, stagebegeleider bij een ROC) kiest "Begeleider" i.p.v. "School" omdat ze zich identificeert als persoon, niet als instelling. Ze mist dan de school-functies (cohort-overzicht, signalen).
**Oordeel**: HOOG voor de begeleider-doelgroep — rol-selectie met grote gevolgen.

---

## Categorie 6 — Waar gebruikers waarde halen (Barry's meegave)

### Aanname F1: Studenten geven het meest om Trust Score / anti-ghosting
**Bewijs**: Dit is de hero-boodschap van de hele homepage. "40 mails. 0 reacties." Trust Score centraal in de how-it-works.
**Wat klopt**: Studenten resoneren met anti-ghosting (zie quotes op homepage). Yara's eerste reactie op de tagline was herkenning.
**Wat NIET klopt**: Na de eerste bezoek-emotie zijn de praktische features (reistijdfilter, chat, buddy) de dagelijkse drijvers. Trust Score is een instap-motivator, niet de dagelijkse waardebeleving.
**Oordeel**: STRATEGISCH RISICO — het platform investeert de meeste marketing-ruimte in een feature (Trust Score/anti-ghosting) die momenteel een stub is, terwijl de werkelijk gebruikte features (chat, sollicitaties, discover) minder aandacht krijgen.

### Aanname F2: Bedrijven kopen vanwege ESG-compliance
**Bewijs**: pricing.html Pro-feature "S1-stagedata voor CSRD-onderbouwing." index.html ESG-band. Waarom nú: CSRD-wetgeving.
**Wat klopt**: CSRD is een reëel motief voor grote bedrijven.
**Wat NIET klopt**: Marc (een MKB HR-medewerker) begrijpt CSRD niet en heeft er geen dagelijks belang bij. De CSRD/ESG-framing werkt voor enterprise maar vervreemdt het MKB dat de eerste doelgroep is.
**Oordeel**: STRATEGISCH RISICO — ESG-framing is over-geïndexeerd voor de huidige gebruikersgroep.

### Aanname F3: Scholen kopen vanwege compliance-rapportage
**Bewijs**: pricing.html school Premium: "Exportrapportages (PDF & CSV)", "BBL-traject volledig ondersteund."
**Wat klopt**: Scholen willen verantwoording afleggen.
**Wat NIET klopt**: Joke's eerste prioriteit is haar studenten snel overzien en signalen krijgen. Niet een exportrapport. De dagelijkse waarde (signalen, overzicht) is ondergeschikt aan de "export" die op de pricing-pagina staat.
**Oordeel**: STRATEGISCH PUNT — presenteer signalen/overzicht als de hero-feature voor scholen, niet de export.

---

## Samenvatting risicoranking

| Aanname | Ernst | Impact | Actie |
|---------|-------|--------|-------|
| C1: BBL/BOL verwarring | HOOG | Verkeerde rol-keuze | Beslisboom toevoegen |
| E2: Begeleider vs School | HOOG | Verkeerde rol, mist functies | Uitleg bij role-picker |
| C2: Swipen onbekend | HOOG voor 60+ | Matchpool onbruikbaar | Korte tutorial |
| F1: Waarde zit in anti-ghosting | STRATEGISCH | Marketing mismatch | Herpositionering (Jean Goodway) |
| B1/B2: Geen offline-handling | MIDDEL | Stille UX-degradatie | Verbindingsstatus tonen |
| C3: Trust Score niet uitgelegd | MIDDEL | Misplaatst vertrouwen | Tooltip bij badge |
| B3: CDN-afhankelijkheid | MIDDEL | Corporate firewall-risico | SRI + fallback |
| C4: Sollicitatie vs match | MIDDEL | Frustratie bij studenten | Flow-uitleg toevoegen |

---

*TQ — 22 april 2026 — READ-ONLY*
