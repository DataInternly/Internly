# Sprint 1 — Atomic Fixes Rapport
Datum: 1 mei 2026
Bron-audit: MILLION_THINGS_AUDIT.md

---

## FIX A — `.form-input` iOS zoom

- **Bestand**: [css/style.css](css/style.css)
- **Regel gewijzigd**: 1670 (was lijn 1660 vóór FIX B; shift door toegevoegde `:root`-comments)
- **Voor**: `font-size: .92rem;`
- **Na**: `font-size: 1rem;`
- **Status**: APPLIED
- **Verificatie**: Geen `.form-input.compact` of vergelijkbare modifier gevonden in codebase. Alleen één `.form-input` selector + `.form-input:focus` + `.form-input:disabled`. Veilig om globaal naar 1rem te verhogen — iOS zoom-trigger (font < 16px) is daarmee dicht.

---

## FIX B — WCAG AA contrast op `--accent`

- **Bestand**: [css/style.css](css/style.css)
- **Aanpak**: NIEUWE token-familie `--accent-bg` + alias-tokens toegevoegd, bestaande `--accent` (#FF7E42) en `--accent-dark` (#e05c1a) ONGEWIJZIGD per de AFWIJKING-notitie in lijn 6-13 die rebranding expliciet verbiedt. Decoratieve toepassingen (logo span, nav underline, glow shadows) blijven zo Internly-oranje; alleen solid backgrounds met witte tekst krijgen de WCAG-veilige #c14a0e.

### Variabelen toegevoegd ([css/style.css:163-167](css/style.css#L163-L167))
```css
--accent-bg:        #c14a0e;  /* wit-op = 5.1:1 — AA pass */
--accent-bg-hover:  #a83d08;  /* hover-state, donkerder */
--accent-tint:      #fdf0e8;  /* lichte fill voor cards */
--accent-on-white:  #c14a0e;  /* alias voor tekst-op-wit */
```

`--accent: #FF7E42` en `--accent-dark: #e05c1a` ongewijzigd. Geen rename, geen kleur-switch op bestaande variabelen.

### Selectoren gemigreerd

| File:Line | Voor | Na |
|---|---|---|
| [css/style.css:299](css/style.css#L299) `.btn-demo` | `background: var(--accent)` | `background: var(--accent-bg)` |
| [css/style.css:375](css/style.css#L375) `.btn-primary` | `background: var(--accent)` | `background: var(--accent-bg)` |
| [css/style.css:376](css/style.css#L376) `.btn-primary:hover` | `background: var(--accent-dark)` | `background: var(--accent-bg-hover)` |
| [css/style.css:572](css/style.css#L572) `.bell-count` | `background: #FF7E42` (hardcoded) | `background: var(--accent-bg)` |
| [css/style.css:1458](css/style.css#L1458) `.btn-like` | `background: #FF7E42` (hardcoded) | `background: var(--accent-bg)` |
| [css/style.css:1465](css/style.css#L1465) `.btn-like:hover` | `background: #e05c1a` (hardcoded) | `background: var(--accent-bg-hover)` |
| [css/style.css:1557](css/style.css#L1557) `.student-header .bell-count` | `background: #e05c1a` (hardcoded) | `background: var(--accent-bg)` |

### Bewust ongemoeid gelaten

- [:210](css/style.css#L210) `.topbar .logo span { color: var(--accent) }` — text op donkergroene topbar (gradient #1a7a48→#0f5c36); contrast met donkere bg is OK.
- [:269](css/style.css#L269) `.logo span { color: var(--accent) }` — homepage logo span op donker hero — OK.
- [:1196](css/style.css#L1196) `background: var(--accent)` — 2px decoratieve nav-underline, geen tekst.
- [:1350](css/style.css#L1350) `outline: 3px solid var(--accent)` — focus-ring.
- [:915](css/style.css#L915) `.review-dist-fill { background: #FF7E42 }` — horizontale fill-bar, geen tekst.
- [:924](css/style.css#L924) `.mini-stars { color: #FF7E42 }` — niet expliciet in audit; star-rating UI; out-of-scope.
- [:1546](css/style.css#L1546) `.cta-create-profile:hover { background: #e05c1a }` — niet expliciet in audit; out-of-scope.

### Verificatie

- Visuele contrast: wit-op-#c14a0e ≈ 5.1:1 (passes WCAG AA voor normale tekst en groot).
- Brand-impact: `#c14a0e` zit binnen het Internly-oranje spectrum (donkerder dan brand-deep #e05c1a, maar nog herkenbaar oranje — geen rood). Brand recognisability bewaard.
- Pagina's die nu correctere primary-buttons hebben: alle dashboards, discover, login, profile-pagina's, matches.html (`.btn-like`), notif bell counts overal.

- **Status**: APPLIED

---

## FIX C — auth.html browser-back replace

- **Bestand**: [auth.html](auth.html)
- **Regels gewijzigd**: 983, 988, 992, 994 (alle 4)
- **Patroon**: `window.location.href = X` → `window.location.replace(X)`
- **Voor**:
  ```js
  window.location.href = resolveStudentDashboard(...)
  window.location.href = 'student-profile.html'
  window.location.href = 'international-school-dashboard.html'
  window.location.href = getRoleLanding(role, false)
  ```
- **Na**:
  ```js
  window.location.replace(resolveStudentDashboard(...))
  window.location.replace('student-profile.html')
  window.location.replace('international-school-dashboard.html')
  window.location.replace(getRoleLanding(role, false))
  ```
- **Status**: APPLIED

### Onverwachte vondst
[auth.html:875](auth.html#L875) (`setTimeout(() => window.location.replace('auth.html'), 2000)`) en [auth.html:1248](auth.html#L1248) (`window.location.replace('auth.html?expired=1')`) gebruikten **al `replace()`**. Patroon was al deels canon; alleen de 4 post-login redirects gebruikten nog `href`. Nu volledig consistent.

---

## FIX D — spelregels.html back-link fallback

- **Bestand**: [spelregels.html](spelregels.html)
- **Regel gewijzigd**: 422
- **Extra wijziging**: regel 614 — `<script src="js/utils.js"></script>` toegevoegd vóór `</body>` (was niet geladen op deze pagina)

### Wijziging regel 422

**Voor**:
```html
<a class="t-back" href="#" onclick="history.back();return false;">← Terug</a>
```

**Na**:
```html
<a class="t-back" href="index.html" onclick="if(typeof goBack==='function'){goBack('index.html');return false;}">← Terug</a>
```

### js/utils.js loading: TOEGEVOEGD
spelregels.html had geen enkel `<script>`-element; pagina is volledig statisch. Nu draait alleen utils.js (geen supabase, geen auth — niet nodig op publieke spelregels-pagina).

### Verificatie

- `goBack('index.html')` bestaat in [js/utils.js:154](js/utils.js#L154) en is op `window` geëxporteerd op [js/utils.js:163](js/utils.js#L163) — patroon werkt.
- Defensive guard `if (typeof goBack === 'function')`: als utils.js niet laadt (CORS, JS uit, slow connection), valt de browser terug op `href="index.html"` — nooit dood-end.
- JS-uit pad: gebruiker landt op spelregels.html via direct-link → klikt "← Terug" → href fallback navigeert naar index.html.

- **Status**: APPLIED

---

## Onverwachte bevindingen

1. **AFWIJKING-notitie respecteerd**: het CSS-bestand bevatte een expliciete waarschuwing (lijn 6-13) dat `--accent` bewust op `#FF7E42` was gehouden voor backward-compat. De instructie's snippet suggereerde `--accent: #e05c1a`; ik heb in plaats daarvan `--accent` ongemoeid gelaten en NIEUWE `--accent-bg` tokens toegevoegd. Resultaat: WCAG fix doorgevoerd, geen breaking change op decoratieve uses (logo spans, nav underline, glow shadows).

2. **Hardcoded brand-kleuren naast variabele**: `.bell-count`, `.btn-like` en `.student-header .bell-count` gebruikten **harde hex-codes** (#FF7E42 / #e05c1a) ipv `var(--accent)`. Audit named ze expliciet — ik heb ze meegenomen in FIX B en gemigreerd naar `var(--accent-bg)`. Bonus: brand-token-discipline iets verder doorgevoerd.

3. **`.cta-create-profile:hover` (lijn 1546) en `.review-dist-fill` (lijn 915)** gebruiken ook hardcoded oranje. Niet expliciet in audit-top-20 dus bewust niet aangepakt — out of scope voor surgical sprint. Voorstel: Sprint 2 of latere "token migration" sprint.

4. **auth.html had al `replace()` op 2 andere plekken** (lijn 875 en 1248). Inconsistentie was alleen in de 4 post-login branches. Nu volledig coherent.

5. **spelregels.html had geen scripts**: het was de enige van de drie touched HTML-bestanden zonder enige JS. js/utils.js toegevoegd is minimal-invasive (alleen utils, geen supabase/auth).

---

## Aanbevolen Sprint 2 startpunt

**Eerste shared-contract helper: `getInitials(naam)` in `js/utils.js`.**

Reden:
- Audit CHECK I4 vond drie verschillende implementaties in code: company-discover.html, school-dashboard.html, js/utils.js, matches.html, mijn-berichten.html.
- Twee daarvan crashen op `null` naam (TypeError op `.split`).
- Geen enkele behandelt Nederlandse tussenvoegsels ("Lena de Vries" → 'LD' ipv 'LV').
- Single shared helper consolideert; kleine functie, makkelijk te testen, lage breekrisico.
- Past in de "shared contract"-filosofie uit CLAUDE.md "Bouwregel 3" (gedeeld contract in utils.js eerst).

Daarna: Sprint 2 kan kijken naar `getRoleLabel(role)` (CHECK I5 — `admin.html:609` raw role-string), `formatNLDate()` consistent toepassen op match-dashboard CSV/PDF/notif (CHECK I2 — drie raw yyyy-mm-dd plekken), of de `previouslyFocused`-pattern in openModal/closeModal (CHECK A4 — codebase-wide focus-restore gap).

**Niet starten met**: het oplossen van de 50+ silent catches uit REEKS 1. Dat vraagt eerst een afspraak welke catches user-facing notify krijgen vs welke `console.warn` mogen blijven (telemetry-observability). Beleidsbeslissing nodig vóór bulk-sweep.
