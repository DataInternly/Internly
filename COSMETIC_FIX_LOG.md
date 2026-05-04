# Cosmetic Fix Log — Pakket A

Datum: 2026-05-04
Standing order: Picard2 + Hotch2 + Tom Bomba
Beslissingen vooraf: Sectie 3 = optie B, Sectie 4 = optie A, Sectie 1 = alle 11

---

## Sectie 3 — Icon-paths

**Status:** voltooid

| File | Voor | Na | Regel |
|---|---|---|---|
| manifest.json | `"src": "icons/icon-192.png"` | `"src": "favicon_192x192.png"` | 12 |
| manifest.json | `"src": "icons/icon-512.png"` | `"src": "favicon_512x512.png"` | 17 |
| sw.js | `icon: '/icons/icon-192.png'` | `icon: '/favicon_192x192.png'` | 17 |
| sw.js | `badge: '/icons/badge-72.png'` | `badge: '/favicon_192x192.png'` | 18 |

**Eind-grep sw.js:** `grep -n "icons/" sw.js` → 0 matches. ✓

**Verwacht eind-resultaat:** 404 op `/icons/icon-192.png` en `/icons/badge-72.png` verdwijnen na FTP-upload. Manifest add-to-home-screen flow vindt nu het bestaande `favicon_192x192.png` in root. Push-notificaties tonen icon én badge zonder 404 (Android schaalt 192px terug naar ~24px monochrome voor badge — acceptabel).

**Stop-condities:** geen geraakt. Structuur manifest icons-array matcht audit-verwachting. sw.js regel 17 matchte exact.

**Niet aangeraakt:** js/telemetry.js, geen SQL, geen bestanden in _revamp_ of BACKUP/.

---

## Sectie 6 — Debug-flag plus guard

**Status:** voltooid

| File | Wijziging | Regel |
|---|---|---|
| js/utils.js | `__INTERNLY_DEBUG` flag toegevoegd na credentials-comment, vóór Role routing | 9-16 |
| js/animations/match-celebrate.js | self-test OK log nu achter `&& window.__INTERNLY_DEBUG` guard | 370 |

**Plaatsing utils.js:** debug-flag staat als eerste actieve code, vóór `const ROLE_LANDING`. Comment-block legt uit waarom (opt-in dev-logging) en hoe (toggle in DevTools).

**match-celebrate guard:**
- Voor: `if (!fail) { console.log(...); }` — fired elke pageload
- Na: `if (!fail && window.__INTERNLY_DEBUG) { console.log(...); }` — alleen na opt-in
- `console.error` op regel 366 (FAIL-pad) **onaangetast** ✓ — errors moeten altijd zichtbaar
- profanity.js **niet aangeraakt** ✓ — regel 113 zit in comment-block (`/* ... */`), niet runtime

**Stop-condities:** geen geraakt. Geen bestaande `__INTERNLY_DEBUG` definitie in utils.js. match-celebrate.js regel 370-372 structuur matchte audit-verwachting exact.

**Verwacht eind-resultaat:** DevTools Console op productie toont geen `[match-celebrate] self-test OK` meer. Bij development: zet `window.__INTERNLY_DEBUG = true` in console om de log terug te krijgen.

---

## Sectie 4 — Lang-switcher verbergen

**Status:** voltooid

| File | Wijziging | Regel |
|---|---|---|
| css/style.css | `.lang-btn { display: none !important; }` toegevoegd na bestaande Language Switcher block | 257-264 |

**Plaatsing:** direct na de bestaande `.lang-btn:hover, .lang-btn.active` regel (255), vóór "Hero landing" sectie. Header-comment legt uit waarom (DeepL-migratie wachtend) en waar de refactor-spec staat.

**11 productie-pagina's met lang-btn knoppen** zien de NL/EN/DE/FR knoppen niet meer:
chat, company-dashboard, about, bol-profile, vacature-detail, index, school-dashboard, auth, faq, company-discover, admin.

**TODO_LANG_SWITCHER_CLEANUP.md aangemaakt in eerdere sessie:** ✓ bestaat in project root.

**Stop-condities:** geen geraakt. `.lang-btn` definitie gevonden op verwachte regel 243. Bestaande mobile-specific `display: none` op `[data-lang="de"], [data-lang="fr"]` (regel 1044-1045) is een subset; de nieuwe `!important` op alle .lang-btn overrulet die op desktop én mobile.

**Verwacht eind-resultaat na FTP:** geen taalknoppen zichtbaar op enige pagina. Knoppen-HTML blijft in DOM (geen layout-shift bij toekomstige onhide). switchLang functie in js/translate.js blijft aanroepbaar, alleen niet meer via UI.

**Verificatie 2026-05-04 [late sessie]:** git blame op css/style.css regel 257-264 toont "Not Committed Yet" met timestamp 09:35:23, vóór sessie-start. Regels staan op verwachte plek, inhoud klopt met spec uit CC_PAKKET_A_FIX.md (comment-block + `.lang-btn { display: none !important; }`). Niet door deze sessie geplaatst, geen edit nodig.

---

## Sectie 1 — Favicon-uitrol (11 pagina's)

**Status:** voltooid

**Categorie A — alleen `<link rel="manifest">` toegevoegd (3 pagina's):**

| Pagina | Voor | Na | Regel |
|---|---|---|---|
| algemene-voorwaarden.html | favicon.ico + .svg + apple-touch | + manifest | 10 |
| cookiebeleid.html | favicon.ico + .svg + apple-touch | + manifest | 10 |
| privacybeleid.html | favicon.ico + .svg + apple-touch | + manifest | 10 |

**Categorie B — volledig 4-regel favicon-template toegevoegd (8 pagina's):**

| Pagina | Voor | Na | Plaats |
|---|---|---|---|
| 404.html | geen | 4 favicon-regels | tussen viewport en theme-color |
| esg-export.html | geen | 4 favicon-regels | na viewport |
| esg-rapportage.html | geen | 4 favicon-regels | na viewport |
| hoe-het-werkt.html | geen | 4 favicon-regels | tussen viewport en description |
| internly-worldwide.html | geen | 4 favicon-regels | tussen viewport en description |
| mijn-notities.html | geen | 4 favicon-regels | na viewport |
| preview.html | geen | 4 favicon-regels | na viewport |
| student-home.html | geen | 4 favicon-regels | na viewport |

**Template (letterlijk gekopieerd uit spec):**
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/favicon_180x180.png">
<link rel="manifest" href="/manifest.json">
```

**Indentatie-conventie:** matcht bestaande viewport-indent per pagina. esg-export.html en mijn-notities.html gebruiken column-0 (geen indent in head). Andere pagina's 2-space indent.

**Stop-condities:** geen geraakt. Alle 11 pagina's hadden een vindbare `<head>`-sectie met viewport-anker. Geen fragmentatie of onverwachte structuur tegengekomen.

**Eind-grep:** `Grep "rel=\"manifest\"" *.html` → 45 matches (alle 11 doelen + 34 al gedaan in eerdere sessies). Alle doelpagina's bevestigd aanwezig.

---

## Sectie 2 — OG-meta uitrol (8 pagina's)

**Status:** voltooid

| Pagina | og:title | Plaats van OG-block |
|---|---|---|
| kennisbank.html | Kennisbank — Internly | tussen `<title>` en `<link rel="preconnect">` |
| kennisbank-artikel.html | Internly Kennisbank | tussen `<title id="article-title-tag">` en preconnect |
| privacybeleid.html | Privacybeleid — Internly | tussen `<title>` en `<meta name="description">` |
| algemene-voorwaarden.html | Algemene Voorwaarden — Internly | tussen `<title>` en description |
| cookiebeleid.html | Cookiebeleid — Internly | tussen `<title>` en description |
| hoe-het-werkt.html | Hoe het werkt — Internly | tussen `<title>` en preconnect |
| internly-worldwide.html | Internly Worldwide | tussen `<title>` en preconnect |
| 404.html | Pagina niet gevonden — Internly | tussen `<title>` en preconnect |

**Per pagina toegevoegd (7 regels):**
- og:title (uit spec-tabel)
- og:description (uit spec-tabel)
- og:image → `https://internly.pro/og-image.png`
- og:url → `https://internly.pro/<filename>`
- og:type → `website`
- og:site_name → `Internly`
- twitter:card → `summary_large_image`

**Bestaande `<meta name="description">` behouden:** ✓ — OG is aanvulling, geen vervanging. Description-meta staat na OG-block (of vóór, voor de twee kennisbank-pagina's waar description al boven title stond).

**Stop-condities:** geen geraakt. Geen pagina had al deels OG-tags. og:image-pad `https://internly.pro/og-image.png` consistent op alle 8.

**Eind-grep:** `Grep "og:title" *.html` → 15 matches (alle 8 doelen + 7 al gedaan: about, pricing, index, blog, stagebegeleiding, faq, spelregels). Alle publieke info-pagina's hebben nu OG-tags.

**kennisbank-artikel.html nuance:** dit is een dynamische artikel-template. og:title is gezet op de statische fallback "Internly Kennisbank". Voor dynamische OG-injectie per artikel zou js/kb.js moeten meeschrijven (niet in scope van deze run, geen TODO geopend — overleggen of nodig).

---

## Eind-checklist deze sessie

| Item | Status |
|---|---|
| Sectie 3 (manifest + sw.js) | voltooid in eerdere sessie vandaag |
| Sectie 6 (debug-flag + guard) | voltooid in eerdere sessie vandaag |
| Sectie 4 (lang-switcher) | voltooid in eerdere sessie vandaag, geverifieerd hier |
| Sectie 1 (favicon, 11 pagina's) | voltooid deze sessie |
| Sectie 2 (OG-meta, 8 pagina's) | voltooid deze sessie |
| js/telemetry.js | niet aangeraakt ✓ |
| SQL | geen wijzigingen ✓ |
| _revamp_2026-04-29/ of BACKUP/ | niet aangeraakt ✓ |
