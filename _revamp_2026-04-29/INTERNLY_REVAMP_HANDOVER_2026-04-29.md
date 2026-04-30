# Site-wide revamp — overdracht en plan

**Datum** 29 april 2026
**Status** Voorbeelden klaar voor Barry's review — daarna Claude Code instructie

---

## Wat ligt op tafel

| Bestand | Inhoud | Voor wie |
|--------|--------|----------|
| `INTERNLY_DESIGN_SYSTEM_2026-04-29.md` | Tokens, pagina-archetypes, componentregels, veiligheidsregels per crew-rol, implementatie-volgorde | Barry leest, Claude Code consumeert als spec |
| `example_chat.html` | Chat-pagina met dotted journal achtergrond in oranje spectrum | Blueprint voor `chat.html` |
| `example_auth.html` | Sign-in/signup met focused card op warme achtergrond | Blueprint voor `auth.html` |
| `example_dashboard.html` | Sidebar-nav + main-content met stats, activity, trust widget | Blueprint voor admin/student/company/school/bbl/buddy dashboards |
| `example_subpage.html` | Mini-hero + reading-frame + CTA-band + footer | Blueprint voor about/kennisbank/pricing/faq/privacy/spelregels/esg |

**Dekking:** 5 archetypes. **Detail** (vacature-detail) is een variant op de sub-pagina reading-frame met een sticky toepassings-CTA — geen aparte blueprint nodig. **Lijst** (discover, mijn-sollicitaties, matches, company-discover, bbl-hub) is de dashboard-shell met een filter-toolbar en grid in plaats van stat-cards — geen aparte blueprint nodig. Beide krijgen expliciete instructies in de Claude Code prompt.

---

## Reviewlijst voor Barry

Loop deze door voor je goedkeurt:

### Design system (sectie 1–8)
- Stoor je niet aan tokens-namen `--c-green`, `--s4`, etc — naming is wijzigbaar
- Klopt het pagina-archetype-tabel met je mentale beeld van de site?
- Is fase A→D in de juiste volgorde voor jouw prioriteiten?

### Chat-pagina
- Open `example_chat.html` lokaal in je browser
- Scroll de page op en neer — de dotted journal moet vast blijven (`background-attachment: fixed`)
- Klopt de intensiteit? Te subtiel verhoog je `0.07` → `0.10` op de dot-rgba. Te hard verlaag je naar `0.05`
- De berichten-bubbles zijn semi-transparant (94% wit) zodat het patroon doorschemert. Vind je dat te druk? Dan worden ze 100% wit
- "Geen ghosting hier" Caveat naast de send-knop — past dat? Of te veel?

### Auth-pagina
- Tab-toggle login/signup zit erin als visuele state
- Caveat-corner "welkom terug" rechtsboven de card — past dat?
- Trust-strip onderaan (DPA, GDPR, BV) — genoeg of te veel?

### Dashboard
- Donkere sidebar in `--c-ink` — klopt dat met je smaak? Alternatief is groen (zoals huidige homepage hero)
- Trust-widget rechts met groot getal en Caveat-noot — past dat bij hoe je trust wil presenteren aan de student?
- Vier stats bovenin — is dat de juiste informatie-dichtheid voor de eerste blik?

### Sub-pagina (about)
- Mini-hero is veel kleiner dan homepage-hero met opzet — goed of te klein?
- Reading-frame met max 760px — leesbaarheid checken op je laptop én mobiel
- Pull-quote, three-up cards, CTA-band — verkeer je het ritme als kalm of opdringerig?

---

## Hoe de Claude Code instructie eruit gaat zien (na approval)

De instructie wordt één markdown-file met deze structuur:

```
TAAK
Pas de site-wide revamp toe op alle pagina's volgens de bijgevoegde voorbeelden.

ATTACHMENTS (jij hangt ze aan in Claude Code)
- INTERNLY_DESIGN_SYSTEM_2026-04-29.md (= de spec)
- example_chat.html (= chat archetype)
- example_auth.html (= auth archetype)
- example_dashboard.html (= dashboard archetype)
- example_subpage.html (= marketing/info archetype)

WERKWIJZE — fase voor fase

FASE A — fundering
1. Lees alle attachments
2. Lees c:/Projects/Internly/css/style.css
3. Voeg sectie 1 (tokens) uit de design system toe aan style.css onder een commentaar-blok "DESIGN TOKENS — site-wide revamp 2026-04-29"
4. Voeg gedeelde componentregels (sectie 3) toe als utility classes
5. Verifieer: niets in style.css dat al bestond, is verwijderd. Backup eerst.

FASE B — high-traffic pagina's (één voor één, niet bulk)
Voor elke pagina hieronder:
1. Backup: cp [pagina].html [pagina].backup.2026-04-29.html
2. Lees de huidige pagina
3. Identificeer welk archetype past (chat, auth, dashboard, subpage, detail, lijst)
4. Bepaal welke JS-functies, ID's, classes worden aangeroepen door externe scripts (utils.js, supabase.js, page-specifieke js)
5. Schrijf een nieuwe versie waarbij ALLE behoud-criteria overeind blijven
6. Toon diff voor goedkeuring vóór je naar de volgende pagina gaat

Pagina's in deze fase:
- auth.html        → archetype Auth
- chat.html        → archetype Chat (dotted journal achtergrond — kritiek)
- discover.html    → archetype Lijst (dashboard-shell + filter-toolbar + grid)
- student-profile.html → archetype Dashboard

[ENZOVOORTS voor fase C en D]

REGELS PER PAGINA — non-negotiable
A. Alle JS-imports blijven in dezelfde volgorde
B. Geen id's of classes wijzigen die door JS worden gebruikt (eerst grep over alle .js files)
C. Geen Supabase queries veranderen
D. Geen routing veranderen — als de huidige pagina een redirect heeft naar X, blijft die zo
E. Inline event handlers (onclick=, onsubmit=) blijven naar dezelfde functienamen wijzen
F. Form-input id's en name's blijven exact gelijk
G. Achtergrondtreatment volgt de design system tabel (sectie 5)
H. Pagina-archetype is bepaald door functie, niet door esthetiek — een chat pagina krijgt chat-treatment

INTEGRITEITS-CHECK PER PAGINA
Na rewrite, draai per pagina:
- grep alle aangeroepen ID's → moet allemaal 1 zijn
- grep alle aangeroepen functies → moet allemaal 1 zijn
- grep dat alle script imports er zijn
- grep dat geen credentials inline staan
Rapporteer per pagina: passed checks, failed checks, file size before/after
```

---

## Wat er na Barry's approval gebeurt

1. **Barry geeft akkoord** op de vier voorbeelden en design system (eventueel met aanpassingen)
2. **Ik schrijf de Claude Code instructie** — één bestand, scherpe lijst BEHOUDEN/VERVANGEN/VERWIJDEREN per archetype, integriteits-check loops
3. **Barry start een Claude Code sessie**, hangt de vijf bijlagen aan en plakt de instructie
4. **Claude Code werkt fase A → D**, één pagina tegelijk, met diff per pagina
5. **Barry reviewt elke diff** voordat hij door laat lopen
6. **FileZilla upload** per pagina nadat Barry akkoord heeft

**Tijdsinschatting:** Fase A duurt ~30 min in Claude Code. Fase B (4 pagina's) ~2 uur. Fase C (7 sub-pagina's) ~2 uur. Fase D (8 werk-pagina's) ~3 uur. Totaal ~8 uur Claude Code werk verdeeld over 3–4 sessies, plus jouw review-tijd.

---

## Wat het team flagged voor Barry's aandacht

**Deanna2:** "Bewaak dat we niet rebrand'en — de architectuur verandert, het merk niet. Als ik op privacybeleid.html land, moet ik direct weten dat ik op Internly ben, niet op een nieuwe site."

**JJ2:** "Copy-revamp doe ik per pagina apart, niet als onderdeel van deze visuele revamp. Eerst de schil rechtzetten, daarna ronde 2 voor de tekst. Anders verandert er te veel tegelijk en kunnen we niet zien wat een verschil maakte."

**Dolly:** "Tokens-naming kan strenger als je het serieus wil — `--color-bg-page` ipv `--bg-page`. Maar het werkt nu. Pas aan als je nieuwe ontwikkelaars verwacht."

**Polly:** "Caveat is een resource met diminishing returns. Op homepage 4 plekken werkt — op 18 pagina's met elk 4 Caveat-momenten wordt het clownesk. Standaard regel: 1 plek per pagina. 2 alleen als de tweede stilistisch losstaat van de eerste (bijv. composer-hint vs eyebrow boven quotes)."

**De Sensei:** "Een gedeelde header- en footer-component vaststellen voor we beginnen scheelt enorm veel duplicatie. Klein extra werk in fase A — grote winst in fase B–D. Niet overslaan."

**Hal:** "Per pagina audit voor je iets aanraakt. Als de huidige pagina een typeof-check heeft die een feature verbergt bij ontbrekende dependency, los DIE bug eerst op. Niet tegelijk met de revamp — daarmee mengen we issues."

**Bedward:** "auth.html, admin.html, en alle dashboards roepen Supabase aan met user-credentials. Bij rewrite mag de RLS-context niet wijzigen door per ongeluk een SECURITY-context te dumpen. Ik review elke diff voor RLS-implicaties."

**Geordi2:** "Smoke-test elke gerefactorde pagina op: (1) login werkt, (2) data laadt, (3) primaire CTA werkt, (4) navigatie naar andere pagina's werkt, (5) op mobiel layout breekt niet. Per pagina, niet alleen aan het eind."

**7/11:** "Header en footer eerst centraliseren. Daarna kunnen alle 18 pagina's hun eigen content houden zonder dat we per pagina een nieuwe footer schrijven."

**Hotch2:** "Volgorde is niet optioneel. Als Barry begint met de admin-pagina ipv auth, missen we de validatie-laag op de drukst-bezochte pagina. Eerst auth, dan chat, dan discover, dan student-profile. Daarna pas de minder-gebruikte pagina's."

**Tom Bomba:** "Ik log dit hele plan in transcript. Volgende sessie weet ik precies waar we waren."

**Picard2:** "Goedgekeurd voor review. Wacht op Barry's akkoord voor de Claude Code instructie."
