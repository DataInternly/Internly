# The Worm — Supply Chain & Entry Points Audit
**Datum**: 22 april 2026
**Rol**: The Worm — White-hat sentinel. Externe afhankelijkheden zijn vertrouwde vreemden. Ik inventariseer wie we binnengelaten hebben.
**Scope**: Alle externe resources × versie-pinning × SRI dekking × blast radius.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode

Bronnen: grep op `cdn.`, `cdnjs.`, `unpkg.`, `jsdelivr.`, `googleapis.`, `<script src=`, `<link href="http` in alle *.html bestanden.

Productie-bestanden geanalyseerd: alle .html in c:\Projects\Internly\ (excl. BACKUP/).

---

## Externe dependency matrix

| Dependency | Laadt in | CDN provider | Versie | SRI hash | Floating? | Risico |
|-----------|----------|--------------|--------|----------|-----------|--------|
| supabase-js | alle 17 app-pagina's + faq.html + about.html | jsDelivr | @2 | **NEE** | **JA** | **HOOG** |
| jspdf | bbl-hub.html · match-dashboard.html (BACKUP) | cdnjs.cloudflare.com | 2.5.1 | **JA** | nee | LAAG |
| emoji-mart | chat.html | jsDelivr | @5.5.2 | **JA** | nee | LAAG |
| Google Maps JS API | discover.html | googleapis.com | (latest) | **NEE (onmogelijk)** | ja | MIDDEL |
| Google Fonts (CSS) | alle pagina's | fonts.googleapis.com | (latest) | **NEE** | ja | LAAG |

---

## Bevinding 1 — supabase-js @2: floating tag zonder SRI (HOOG)

### Detail
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

- `@2` is een major-version tag, **geen pinned release**. jsDelivr levert bij `@2` automatisch de nieuwste 2.x versie.
- Geen `integrity=` attribuut → browser valideert de inhoud **niet** vóór uitvoering.
- Aanwezig in **alle 17 app-pagina's** + faq.html + about.html = 19 bestanden.

### Blast radius
supabase-js is de auth-client. Het beheert sessietokens, auth-state, en alle DB-communicatie. Een gecompromitteerde versie heeft volledige toegang tot:
- Alle sessietokens van ingelogde gebruikers
- Alle Supabase-queries (leest, schrijft, realtime)
- De anon-key (al in JS beschikbaar)

Dit is het hoogste supply-chain risico in de codebase: één library, maximale blast radius, 0 integriteitsverificatie.

### Referentie incident
De Polyfill.io supply chain aanval (juni 2024): een CDN-bibliotheek die door 100.000+ websites werd gebruikt, werd overgenomen en kwaadaardige code geïnjecteerd. Browsers met de script hadden geen SRI-bescherming → automatische uitvoering.

### Mitigatie (richting)
Pin naar een specifieke release: `@supabase/supabase-js@2.47.10` (of actueel) met bijbehorende SRI hash. Genereer via:
```
curl -s https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10 | openssl dgst -sha384 -binary | openssl base64 -A
```

---

## Bevinding 2 — jspdf 2.5.1: correct gefineerd met SRI (LAAG)

### Detail
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        integrity="sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb"
        crossorigin="anonymous"></script>
```

- Versie gepind: 2.5.1 ✅
- SRI hash aanwezig: sha384 ✅
- Aanwezig in: bbl-hub.html

**Observatie**: De BACKUP/match-dashboard.backup.2026-04-20-0904.html had jspdf ook geladen — maar zonder SRI. De productieversie van match-dashboard.html heeft jspdf **niet** geladen (de backup was uit een eerdere sprint). Geen huidig probleem voor match-dashboard.html in productie.

**Status**: ✅ Correct geïmplementeerd.

---

## Bevinding 3 — emoji-mart @5.5.2: correct gefineerd met SRI (LAAG)

### Detail
```html
<script src="https://cdn.jsdelivr.net/npm/emoji-mart@5.5.2/dist/browser.js"
        integrity="sha384-gGElBOlmyIGNVOeetC2Q0EHG2IzuLtq7wBSnFgnkDTB/yzjOi6HwHkyt8xjsy7SU"
        crossorigin="anonymous"></script>
```

- Versie gepind: 5.5.2 ✅
- SRI hash aanwezig: sha384 ✅
- Aanwezig in: chat.html

**Status**: ✅ Correct geïmplementeerd. Goed patroon — dit is wat supabase-js ook zou moeten hebben.

---

## Bevinding 4 — Google Maps JS API: geen SRI (MIDDEL)

### Detail
```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyC6ozhZf1wVjSq6aBMhOmW1u3nfr1UsGMc&libraries=places" defer></script>
```

- Aanwezig in: discover.html
- SRI is technisch onmogelijk: de Google Maps API laadt dynamisch submodules. SRI werkt niet voor dynamisch gegenereerde scripts.
- **API key volledig zichtbaar** in HTML: `AIzaSyC6ozhZf1wVjSq6aBMhOmW1u3nfr1UsGMc`

### API key risico's
Een Google Maps API key zonder restricties kan worden misbruikt voor:
- Quota-uitputting: een aanvaller maakt honderdduizenden Maps-requests → Barry's billing rekening loopt op
- Gebruik in andere projecten / apps

**Wat te verifiëren in Google Cloud Console** (Barry moet dit zelf doen — niet toegankelijk via code-grep):
1. **Referrer-restrictie**: is de key beperkt tot `*.internly.pro/*`? Zonder dit kan iedereen de key gebruiken.
2. **API-restricties**: is de key beperkt tot "Maps JavaScript API" en "Places API"? Zonder dit kan de key ook Geocoding API, Directions API, etc. aanroepen — hogere kosten per request.
3. **Quota per dag**: is er een maximumlimiet ingesteld?

**Status**: ⚠️ Onverifieerbaar via code — Barry moet Google Cloud Console checken.

---

## Bevinding 5 — Google Fonts: geen SRI (LAAG)

CSS stylesheets via `<link href="https://fonts.googleapis.com/css2?...">`.

- SRI is technisch mogelijk voor CSS, maar ongebruikelijk voor Google Fonts (content wisselt per request op basis van user-agent).
- CSS-risico is lager dan JS: een kwaadaardige stylesheet kan UI manipuleren maar geen JS uitvoeren.
- Alle pagina's laden fonts van Google — dit is een aanzienlijke afhankelijkheid voor uptime (als Google Fonts down is, valt de typografie terug op system fonts).

**Status**: LAAG risico, geen actie vereist.

---

## Ongebruikte / dode afhankelijkheden

| Locatie | Dependency | Status |
|---------|-----------|--------|
| BACKUP/match-dashboard.backup.*.html | jspdf (zonder SRI) | BACKUP — niet in productie, geen actief risico |
| BACKUP/ overige | supabase-js @2 (zonder SRI) | BACKUP — niet in productie |

Productie-code heeft geen detecteerbare dode externe dependencies.

---

## Fallback-logica

**Vraag**: als jsDelivr down is, werkt de site nog?

**Antwoord**: **Nee.** Alle 17 app-pagina's laden supabase-js van jsDelivr. Geen fallback aangetroffen (geen lokale kopie, geen tweede CDN als alternatief). Als jsDelivr 5 minuten down is, is de volledige app niet te gebruiken voor actieve sessies die de pagina herladen.

Supabase Auth (sessie-validatie) werkt ook niet zonder de client-library.

**Risico**: MIDDEL — jsDelivr heeft >99.9% uptime maar is geen Supabase-gecontroleerde infrastructuur.

---

## Samenvatting

| Bevinding | Ernst | Actie |
|-----------|-------|-------|
| supabase-js floating @2 zonder SRI | **HOOG** | Pin versie + SRI hash toevoegen aan alle 19 bestanden |
| Google Maps key zonder verifieerbare restricties | **MIDDEL** | Barry verifieert Google Cloud Console |
| jspdf met SRI | ✅ LAAG | Geen actie |
| emoji-mart met SRI | ✅ LAAG | Geen actie |
| Geen fallback voor jsDelivr | **MIDDEL** | Overweeg lokale copy voor supabase-js |

### De kern
De supabase-js floating-tag is het enige supply-chain risico met hoge impact. Het is ook de meest tijdrovende fix (19 bestanden). De juiste aanpak: pin naar een specifieke versie, genereer één SRI hash, en update alle bestanden in één sessie. De loop-shield zou dit daarna bewaken.

---

*The Worm — 22 april 2026 — READ-ONLY*
