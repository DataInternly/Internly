# Cosmetic Pre-Check Audit — Internly

Datum: 2026-05-04
Modus: READ-ONLY · geen patches · geen wijzigingen aan productie-files
Standing order: Picard2 + Hotch2 + Tom Bomba

---

## Sectie 1 — Favicon-links

**Totaal HTML-pagina's in project root:** 45

**Met volledige icon-set (icon + apple-touch-icon + manifest):** 34
- match-dashboard, chat, company-dashboard, about, pricing, bol-profile, matches, matchpool, mijn-berichten, mijn-sollicitaties, vacature-detail, kennisbank-artikel, index, blog, discover, school-dashboard, international-school-dashboard, international-student-dashboard, la-sign, auth, stagebegeleiding, kennisbank, faq, student-profile, review-form, company-discover, buddy-dashboard, begeleider-dashboard, bbl-profile, bbl-hub, bbl-dashboard, admin, spelregels, internly_simulator

**Met alleen icon + apple-touch (manifest ontbreekt):** 3
- algemene-voorwaarden.html
- cookiebeleid.html
- privacybeleid.html

**Zonder enige icon-tag:** 8
- 404.html
- esg-export.html
- esg-rapportage.html
- hoe-het-werkt.html
- internly-worldwide.html
- mijn-notities.html
- preview.html
- student-home.html

**Canonical-template snippet** (uit [index.html:6-9](index.html#L6-L9)):
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/favicon_180x180.png">
<link rel="manifest" href="/manifest.json">
```

**Hal:** Gevonden — de canonical template bestaat letterlijk in 34 pagina's. Niet gevonden in 11 pagina's; reden bij 8 pagina's is dat ze recent zijn aangemaakt of intern (preview, esg-*, student-home, mijn-notities, internly-worldwide, hoe-het-werkt, 404). Bij 3 pagina's (algemene-voorwaarden, cookiebeleid, privacybeleid) ontbreekt alleen de manifest-link.

---

## Sectie 2 — OG meta tags

**Matrix** (publieke pagina's):

| Pagina | og:title | og:description | og:image | og:url | og:type |
|---|---|---|---|---|---|
| index.html | ✓ | ✓ | ✓ | ✓ | ✓ |
| about.html | ✓ | ✓ | ✓ | ✓ | ✓ |
| pricing.html | ✓ | ✓ | ✓ | ✓ | ✓ |
| faq.html | ✓ | ✓ | ✓ | ✓ | ✓ |
| spelregels.html | ✓ | ✓ | ✓ | ✓ | ✓ |
| stagebegeleiding.html | ✓ | ✓ | ✓ | ✓ | ✓ |
| blog.html | ✓ | ✓ | ✓ | ✓ | ✓ |
| kennisbank.html | — | — | — | — | — |
| kennisbank-artikel.html | — | — | — | — | — |
| privacybeleid.html | — | — | — | — | — |
| algemene-voorwaarden.html | — | — | — | — | — |
| cookiebeleid.html | — | — | — | — | — |
| hoe-het-werkt.html | — | — | — | — | — |
| internly-worldwide.html | — | — | — | — | — |
| 404.html | — | — | — | — | — |

**Pagina's met volledige set (5/5):** index, about, pricing, faq, spelregels, stagebegeleiding, blog (7 pagina's)

**Pagina's met deels:** geen — pagina's hebben òf alle vijf, òf nul.

**Pagina's zonder OG-tags:** kennisbank, kennisbank-artikel, privacybeleid, algemene-voorwaarden, cookiebeleid, hoe-het-werkt, internly-worldwide, 404 (8 pagina's)

**Canonical-template snippet** (uit [index.html:12-17](index.html#L12-L17)):
```html
<meta property="og:title" content="Internly — Eerlijk stages vinden">
<meta property="og:description" content="Op Internly weet je vooraf hoe betrouwbaar een bedrijf is. Geen ghosting meer.">
<meta property="og:image" content="https://internly.pro/og-image.png">
<meta property="og:url" content="https://internly.pro/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Internly">
<meta name="twitter:card" content="summary_large_image">
```

**Geordi2:** Template is letterlijk te kopiëren. Per pagina moet content van og:title / og:description / og:url specifiek worden aangepast. og:image kan generiek blijven (`/og-image.png`).

---

## Sectie 3 — Icon-bestanden

**Iconen-folder bestaat:** **NEE** — er is geen `icons/` directory in project root.

**Bestaande iconen** (in project root):
| Bestand | Pad |
|---|---|
| favicon.ico | `/favicon.ico` |
| favicon.svg | `/favicon.svg` |
| favicon_16x16.png | `/favicon_16x16.png` |
| favicon_32x32.png | `/favicon_32x32.png` |
| favicon_48x48.png | `/favicon_48x48.png` |
| favicon_180x180.png | `/favicon_180x180.png` |
| favicon_192x192.png | `/favicon_192x192.png` |
| favicon_512x512.png | `/favicon_512x512.png` |
| favicon_512.svg | `/favicon_512.svg` |

**Manifest.json status:** bestaat ([manifest.json](manifest.json)).
```json
"icons": [
  { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
  { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
]
```

**Tweede referentie:** [sw.js:17](sw.js#L17) — service worker push-notification fallback icon: `'/icons/icon-192.png'`.

**Ontbrekende iconen** (gerefereerd, niet op disk):
- `/icons/icon-192.png` — referentie [manifest.json:12](manifest.json#L12) en [sw.js:17](sw.js#L17). Bestand op disk: `/favicon_192x192.png` (192x192, identieke afmeting). Pad-mismatch.
- `/icons/icon-512.png` — referentie [manifest.json:17](manifest.json#L17). Bestand op disk: `/favicon_512x512.png`. Pad-mismatch.

**Hypothese 404-bron:**
- 404 op `/icons/icon-192.png` komt van `manifest.json` referentie
- Browsers vragen dit op tijdens add-to-home-screen flow
- Push-notificaties via sw.js zouden ook 404 geven op het icon-veld
- Twee oplossingen mogelijk:
  - **A:** kopieer `favicon_192x192.png` → `icons/icon-192.png` + idem voor 512 (twee nieuwe paden, manifest blijft ongewijzigd)
  - **B:** wijzig manifest.json + sw.js om naar bestaande `/favicon_192x192.png` en `/favicon_512x512.png` te wijzen (geen nieuwe bestanden, twee regels code)

**Blara:** 404-bron geïdentificeerd. Pad `icons/icon-192.png` mist het bestand `icon-192.png` in folder `icons/`. Equivalent bestand `favicon_192x192.png` bestaat in root maar wordt niet gevonden onder die naam.

---

## Sectie 4 — Lang-switcher footprint

**Aantal productie-pagina's met `class="lang-btn"` knoppen:** 11
- chat, company-dashboard, about, bol-profile, vacature-detail, index, school-dashboard, auth, faq, company-discover, admin

**Anomalie:** student-profile.html heeft een `switchLang()`-aanroep (lokaal gedefinieerd) maar **geen** `class="lang-btn"` knoppen op de pagina. Dode functie of HTML-renderfout.

**switchLang functie locatie:**
- **Globaal:** [js/translate.js:16](js/translate.js#L16) — `window.switchLang = function (lang) { ... }`. Werkt mits InternlyConsent functional consent geeft. Slaat keuze op in localStorage en triggert Google Translate widget.
- **Lokaal per pagina:** elk van de 11 pagina's heeft een EIGEN `function switchLang(lang) { ... }` (bv. [about.html:1080](about.html#L1080)). Inhoud lijkt op de globale variant maar is een duplicaat.

**.lang-btn CSS in style.css:**
- [css/style.css:243](css/style.css#L243) — base styling
- [css/style.css:252](css/style.css#L252) — `:hover, .active`
- [css/style.css:1018](css/style.css#L1018) — mobile size override
- [css/style.css:1041](css/style.css#L1041) — touch min-height
- [css/style.css:1044-1045](css/style.css#L1044-L1045) — **DE en FR worden verborgen op mobiel** (`display: none`)

**HTML snippet van een knoppen-groep** (uit [about.html:639-642](about.html#L639-L642)):
```html
<button onclick="switchLang('nl')" class="lang-btn" data-lang="nl">NL</button>
<button onclick="switchLang('en')" class="lang-btn" data-lang="en">EN</button>
<button onclick="switchLang('de')" class="lang-btn" data-lang="de">DE</button>
<button onclick="switchLang('fr')" class="lang-btn" data-lang="fr">FR</button>
```

**Werkstatus:** functie bestaat, knoppen reageren, Google Translate widget werkt mits functional consent. Niet "kapot" — wel afhankelijk van een externe service en cookie-consent.

**Aanbeveling voor fix-run:** drie opties, productbeslissing nodig:
- **A** (snelst, omkeerbaar): `display:none` op `.lang-btn` in CSS — verbergt knoppen op alle 11 pagina's met één regel. Geen HTML-aanrakingen.
- **B:** verwijder de knoppen-groep uit alle 11 HTML-pagina's. Verwijder ook de 11 lokale `switchLang()`-duplicaten + js/translate.js.
- **C:** wachten op DeepL-sessie en helemaal vervangen.

Aanbeveling: **A** voor pre-livetest 11 mei (verbergt UI zonder code-risico), **C** voor langere termijn.

---

## Sectie 5 — Buddy paars-codering

**Aantal verschillende paars-tinten in actief gebruik:** 7

**CSS-variabele aanwezig:** ✓ — gedefinieerd op [css/style.css:53-56](css/style.css#L53-L56):
```css
--c-buddy-purple:       #6d28d9;
--c-buddy-purple-bg:    #ede9fe;
--c-buddy-purple-mid:   #7c3aed;
--c-buddy-purple-light: #f8f7ff;
```
**Probleem:** systeem bestaat maar wordt niet consistent gebruikt — drift overal.

**Locaties met hex/rgb-waarde:**

| Bestand | Regel | Kleur-waarde | Context |
|---|---|---|---|
| auth.html | 263 | `#6d28d9` | role-card buddy-role border |
| auth.html | 264 | `#6d28d9` | role-check background |
| auth.html | 621 | `#6d28d9` | infobox border-left + `#f5f3ff` background |
| bbl-hub.html | 2851 | `#6d28d9` + `#ede9fe` | tag styling (gebruikt CSS-var maar hardcoded fallback) |
| bbl-profile.html | 449 | `#7c3aed` | accent-color toggle |
| bol-profile.html | 793 | `#7c3aed` | accent-color toggle |
| buddy-dashboard.html | 19 | `#6d28d9` | meta theme-color |
| buddy-dashboard.html | 93 | `rgba(109,40,217,.10)` | hardcoded — equivalent rgba van #6d28d9 |
| buddy-dashboard.html | 218 | `rgba(109,40,217,.4)` | avail-day border |
| buddy-dashboard.html | 235 | `rgba(109,40,217,.1)` | profile-section bg |
| buddy-dashboard.html | 414 | `#ede9fe` (fallback) | hardcoded met var(--c-buddy-purple-bg) wrapper |
| buddy-dashboard.html | 415 | `#7c3aed` (fallback) | OPLET: var heet `--c-buddy-purple` (donker #6d28d9), maar fallback is `#7c3aed` (medium) — inconsistent |
| buddy-dashboard.html | 446 | `#7c3aed → #6d28d9` | gradient |
| chat.html | 1532 | `#7c3aed` + `#ede9fe` | buddy-tag pill |
| discover.html | 491-503 | `#7c3aed` + `#ede9fe` | buddy color-codering blok (negeert CSS-var) |
| css/style.css | 1619 | `rgba(109,40,217,.10)` + `var(--c-buddy-purple)` | role-pill--buddy |
| css/style.css | 2066 | `#7c3aed → #5b21b6` gradient | overz-summary-meta |
| css/style.css | 2073-2107 | `#7c3aed`, `#5b21b6` | overz-avatar styling (5+ regels) |
| css/style.css | 2102, 2135 | `#5b21b6` + `#f5f3ff` | overz badge / link |
| css/style.css | 2303-2325 | `#7c3aed`, `#5b21b6` | role-header (gepensioneerd) gradient + bell-count |
| css/style.css | 2489-2490 | `var(--accent, #7c3aed)` | LET OP: `--accent` fallback is paars in deze regel — semantisch fout (--accent is oranje #e05c1a) |
| kennisbank.html | 43 | `#7c3aed` + `#f3e8ff` | eigen --kb-purple system |
| kennisbank.html | 360-1131 | `var(--kb-purple)` | 7+ usages — competing system |
| mijn-notities.html | 117, 126 | `#7c3aed` | caret-color override (intentioneel — notes = buddy domein) |

**Tinten samengevat:**
1. `#6d28d9` (donker, deepest) — primair in auth, buddy-dashboard, theme
2. `#7c3aed` (medium) — meest gebruikte, ~15 locaties — fallback in CSS-var-systeem maar vaak hardcoded
3. `#5b21b6` (donkerder dan #6d28d9) — gradient companion in style.css
4. `#ede9fe` (licht-paars bg) — in CSS-var
5. `#f8f7ff` (lichter bg) — in CSS-var
6. `#f5f3ff` (variant licht bg) — in auth en style.css 2102, 2135
7. `#f3e8ff` (kennisbank eigen variant)

**Meest gebruikte tint:** `#7c3aed` (medium) — kandidaat voor canonical "buddy main color".

**Garcia2:** Dit is exact de 7/11-test. CSS-var-systeem bestaat sinds eerder maar wordt door 5+ bestanden genegeerd. Drift = bevestigd. `--c-buddy-purple` (#6d28d9) en `--c-buddy-purple-mid` (#7c3aed) zijn beide actief in gebruik — geen single source of truth.

**Aanbeveling fix-run** (Pakket B, na livetest):
1. Productbeslissing: kiezen tussen `#6d28d9` (donker) en `#7c3aed` (medium) als `--buddy-accent` canonical
2. CSS-var-systeem behouden, maar consolideren naar 2 vars: `--buddy-accent` (main) + `--buddy-accent-bg` (light bg)
3. Refactor 5 bestanden: auth, buddy-dashboard, discover, chat, kennisbank
4. style.css regels 2066-2325 zijn lifecycle role-header voor gepensioneerd — refactoren naar `--buddy-accent` met `--buddy-accent-deep` voor gradient companion
5. Verwijder de paarse `#7c3aed` fallback in `var(--accent, #7c3aed)` op style.css:2489-2490 — `--accent` is oranje, deze fallback is bug

---

## Sectie 6 — Console.log guards

**[js/animations/match-celebrate.js:371](js/animations/match-celebrate.js#L371)** snippet:
```js
// 4. API correct geëxporteerd?
if (!window.Internly || typeof window.Internly.animations.celebrate !== 'function') {
  console.error('[match-celebrate] self-test FAIL: window.Internly.animations.celebrate niet beschikbaar');
  fail = true;
}

if (!fail) {
  console.log('[match-celebrate] self-test OK — 5 renderers, reduced + motion modes getest');
}
```
**Status:** UNCONDITIONAL — fires elke pagina-load waar match-celebrate.js geladen is. Niet achter een debug-flag.

**[js/profanity.js:113](js/profanity.js#L113)** snippet:
```js
/*
── Self-test (plak in DevTools console na laden van de pagina) ──

console.assert(...);
console.assert(...);
... (10 assertions)
console.log('[Bobba] self-test klaar — geen fouten = alle 10 assertions slagen');
*/
```
**Status:** **IN COMMENT** (lines 100-114 wrapped in `/* ... */`). Niet runtime. Geen actie nodig.

**Bestaande debug-flag:** **NEE** — `__INTERNLY_DEBUG`, `INTERNLY_DEBUG`, `window.__DEBUG`, `debugMode` allen 0 hits in productie-code.

**Aanbeveling fix-run** (Pakket A):
1. Introduceer `window.__INTERNLY_DEBUG = false` als default in [js/utils.js](js/utils.js) (top of file, na strict mode comment)
2. Wikkel match-celebrate.js:370-372 met:
   ```js
   if (!fail && window.__INTERNLY_DEBUG) {
     console.log('[match-celebrate] self-test OK — ...');
   }
   ```
3. profanity.js:113 ongewijzigd laten — zit in comment.
4. Toekomst-handhaving: alle nieuwe `console.log` in productie-JS moet achter `__INTERNLY_DEBUG` flag.

---

## Sectie 7 — Cursor-branding

**caret-color hits:** 1 in style.css + 2 in mijn-notities.html

[css/style.css:1363-1376](css/style.css#L1363-L1376):
```css
/* ── Brand polish — caret + text-selection (1 mei 2026 Sprint Tickoff) ──── */
input:not([type="hidden"]),
textarea,
select {
  caret-color: var(--accent);
}
::selection {
  background: var(--accent-tint);
  color: var(--ink);
}
::-moz-selection {
  background: var(--accent-tint);
  color: var(--ink);
}
```

[mijn-notities.html:117](mijn-notities.html#L117) en [mijn-notities.html:126](mijn-notities.html#L126):
```css
caret-color: #7c3aed;
```
**Notitie:** lokale override naar buddy-paars in mijn-notities. Hardcoded, niet via var. Consistent met "notes = buddy-domein" thema.

**::selection hits:** 1 (de globale in style.css:1369)

**Status:** **VOLLEDIG AANWEZIG** — al geïmplementeerd op 1 mei 2026 (Sprint Tickoff).

**Jean Goodway:** caret-color in style.css gebruikt `var(--accent)` ✓ — niet hardcoded. ::selection gebruikt `var(--accent-tint)` ✓. Lokaal in mijn-notities.html gebruikt hardcoded `#7c3aed` — kandidaat voor refactor naar `var(--c-buddy-purple-mid)` of `var(--buddy-accent)` zodra Sectie 5 een canonical heeft.

**Aanbeveling fix-run:** geen actie voor de globale styling. Mijn-notities.html refactor naar CSS-var meeloopt met Sectie 5 buddy-paars consolidatie (Pakket B).

---

## Synthese — fix-volgorde aanbeveling

| Sectie | Type werk | Volume | Aanbeveling timing |
|---|---|---|---|
| 1 favicon | template-uitrol over 11 pagina's (3 missen alleen manifest, 8 missen alles) | klein | **Pakket A** |
| 2 OG meta | aanvullen op 8 pagina's met 5-tag set | mid | **Pakket A** |
| 3 icon-192 | 2 regels in manifest.json + 1 regel in sw.js (optie B) | klein | **Pakket A** |
| 4 lang-switcher | display:none in CSS (optie A) | mini | **Pakket A** |
| 5 buddy paars | productbeslissing + refactor 5 bestanden + CSS consolidatie | mid | **Pakket B** (na livetest) |
| 6 console.log | flag in utils.js + 1 guard rond match-celebrate:371 | klein | **Pakket A** |
| 7 cursor | geen actie (al aanwezig) — mijn-notities.html refactor meeloopt met Sectie 5 | nul | **Pakket B** |

### Pakket A — pre-livetest 11 mei (één run, geen productbeslissingen)

Bevat: 1 (favicon), 2 (OG), 3 (icon-paths), 4 (lang-switcher hide), 6 (debug-flag).
Inschatting: ~30 min. Alle wijzigingen zijn deterministisch en omkeerbaar. Geen productbeslissing nodig (Sectie 4 keuze A is conservatief default).

**Volgorde binnen Pakket A:**
1. Sectie 3 eerst (manifest.json + sw.js) — voorkomt 404 in console tijdens livetest
2. Sectie 6 (utils.js + match-celebrate.js) — debug-flag intro op één plek
3. Sectie 4 (style.css) — één CSS-regel
4. Sectie 1 + 2 — bulk-toevoeging op 8-11 pagina's, deze volgens template

### Pakket B — na livetest

Bevat: 5 (buddy paars consolidatie) + 7 (mijn-notities.html refactor — meeloop).
Vereist: productbeslissing welke paars-tint canonical wordt (`#6d28d9` of `#7c3aed`).

### Beslissingen die je vooraf moet nemen

1. **Sectie 4:** akkoord met "verberg via display:none" voor pre-livetest, of liever de knoppen direct uit HTML?
2. **Sectie 5:** welke paars-tint wordt canonical? (post-livetest beslissing acceptabel)
3. **Sectie 3:** optie A (kopieer bestanden naar icons/) of optie B (wijzig manifest paden)? Default: B.
4. **Sectie 1:** voor de 8 pagina's zonder enige icon-tag — alle 8 op de canonical template, of alleen de publieke pagina's (404, hoe-het-werkt, internly-worldwide) en interne (esg-*, mijn-notities, preview, student-home) skippen?

### Bestanden die in Pakket A worden geraakt

- manifest.json
- sw.js
- js/utils.js
- js/animations/match-celebrate.js
- css/style.css
- 11 pagina's voor favicon-templating
- 8 pagina's voor OG-templating

**Niet geraakt:** js/telemetry.js. Niet geraakt: HTML-bestanden in `_revamp_2026-04-29/backups/` of `BACKUP/`.

---

## Stop-condities check

- Sectie 5 vond 7 paars-tinten — onder de 10-tint stop-conditie. **Ga door, niet stoppen.**
- js/telemetry.js niet geraakt. ✓
- Geen productie-patches gemaakt. ✓
- COSMETIC_AUDIT.md is de enige output.
