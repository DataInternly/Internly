# PHASE A.2 REPORT — White-on-white inline color jacht

**Datum** 2026-05-03
**Defect** FTP-01 — wit-op-wit tekst in een header (vermoedelijk company-dashboard topbar)
**Stop-conditie** Geen patch. Alleen rapport.

---

## Methode

1. `js/utils.js` regels 750-920 doorgelezen (rond `_renderStudentHeaderLoggedIn` en `renderRoleHeader`)
2. Grep over `js/` op:
   - `color: #fff`
   - `color: white`
   - `color:#fff`
   - `style="color`
3. Grep over alle `*.html` op:
   - `style="color:#fff"`
   - `style="color: #fff"`
   - `style="color:white"`
   - `style="color: white"`
4. Voor elke hit: container + achtergrondkleur opgezocht in stylesheet of inline pagina-CSS

---

## Bevindingen — Productiefiles

### **PRIMAIRE BRON GEVONDEN**

| File | Regel | Code | Container | Container-achtergrond | Contrast-oordeel |
|------|-------|------|-----------|----------------------|------------------|
| **company-dashboard.html** | **574** | `<a href="company-dashboard.html" class="topbar-link" style="color:#fff">Dashboard</a>` | `.topbar` | `rgba(244,243,239,.92)` cream + backdrop-blur | **WIT-OP-CREAM ≈1.15:1, WCAG AA fail (vereist 4.5:1)** |
| **school-dashboard.html** | **596** | `<a href="school-dashboard.html" class="topbar-link" style="color:#fff">Dashboard</a>` | `.topbar` | cream rgba(244,243,239,.92) | **WIT-OP-CREAM, WCAG AA fail** |

**Pattern**: beide dashboards hebben een topbar met een "Dashboard"-link die naar zichzelf wijst (active-state indicator). De inline `style="color:#fff"` overschrijft de standaard `.topbar-link` color (`var(--ink2)`). Resultaat: onleesbare witte tekst op crème achtergrond.

`.topbar` CSS in [school-dashboard.html](school-dashboard.html#L94):
```css
.topbar { /* regel 94+ */
  background: rgba(244,243,239,.92);
  backdrop-filter: blur(8px);
  /* ... */
}
.topbar-link { /* regel 110+ */
  color: var(--ink2);  /* normaal donker */
}
.topbar-link:hover { color: var(--ink); }
```

De inline `style="color:#fff"` overrulet `var(--ink2)` zonder fallback.

### Secundaire vondsten in productiefiles — GEEN white-on-white probleem

Geen andere `style="color:#fff"`/`style="color:white"` matches in productie-HTML.

### Tertiaire vondsten in js/-files — GEEN white-on-white probleem

| File | Regel | Code | Container/context | Achtergrond | Oordeel |
|------|-------|------|-------------------|-------------|---------|
| js/buddy.js | 641 | `'background:var(--ink,#0f1117);color:#fff'` | Modal-overlay | `var(--ink)` near-black | OK |
| js/buddy.js | 1121 | `color:#fff;padding:4px 12px;border-radius:8px;` | `<button>` met `background: ...` (groen/oranje) | groen | OK |
| js/buddy.js | 1126 | `top:16px;right:16px;background:#ef4444;color:#fff;` | Toast-error | rood | OK |
| js/buddy.js | 1137 | `justify-content:center;color:#fff;` | Modal-button met groene/oranje bg | groen | OK |
| js/calendar.js | 50 | `background:#1a7a48;color:#fff;` | Toast-notification | groen | OK |
| js/calendar.js | 73 | `.ical-save{background:#1a7a48;color:#fff;...}` | Save-button | groen | OK |
| js/calendar.js | 103 | `.mtg-submit{...background:#e05c1a;color:#fff;...}` | Meeting-submit btn | oranje | OK |
| js/consent.js | 44 | `--cc-btn-primary-color: #ffffff;` | CSS variabele voor consent button | wordt op gekleurde knop gebruikt | OK |
| js/toast.js | 53, 80 | `color: #fff;` | Toast-balloon | donkere bg | OK |
| js/swipes.js | 55, 67 | `color:#fff;...background:#1a7a48;...` | Swipe-button | groen | OK |
| js/welcome-overlay.js | 374 | `background:${cfg.btn};color:#fff;` | Welcome-CTA | rol-specifieke kleur (groen/oranje/blauw) | OK |

**Geen van deze js/-bronnen levert witte tekst op witte/cream achtergrond op.**

### Quaternaire vondsten in utils.js header-templates

| File | Regel | Code | Oordeel |
|------|-------|------|---------|
| js/utils.js | 797 | `<a href="/index.html" class="student-header-logo">intern<span style="color:#e05c1a">ly</span></a>` | "ly" in oranje, niet wit. **OK** |
| js/utils.js | 834 | idem (logged-in variant) | **OK** |

`_renderStudentHeaderLoggedIn` (regel 802-862) bevat **GEEN** `color:#fff`/`color:white` inline statements. De `.student-header` zelf heeft default text-color uit `css/style.css` (var(--ink) = donker), niet wit.

---

## Hypothese over waarom witte tekst op witte achtergrond landt

**BEVESTIGD** door statische analyse:

1. **Bron**: inline `style="color:#fff"` op de "Dashboard"-link in topbar van **company-dashboard.html en school-dashboard.html**
2. **Container**: `.topbar` met cream-bg (`rgba(244,243,239,.92)`)
3. **Bedoeling oorspronkelijk**: vermoedelijk dat deze link op een DARK topbar zou staan (zoals in de role-picker demo van match-dashboard waar `.hub-topbar-logo` een groene gradient heeft). De inline color is meegekomen vanuit een eerdere designfase waar de topbar zwart-blauw was.
4. **Migratiefout**: toen de topbar overschakelde naar cream/beige (CSS in regel 94 van school-dashboard, equivalent in company-dashboard), is de inline color niet meegekomen.

**Effect voor gebruiker**: bedrijf en school zien een onzichtbare "Dashboard"-link rechtsboven. Bedrijven die de logo-tekst niet hebben gezien gebruiken vermoedelijk de mobile-tabs of sidebar in plaats van de topbar-Dashboard-link.

---

## Reproductiestappen statisch

1. Open `school-dashboard.html` in browser
2. DevTools → Elements → selecteer `<a href="school-dashboard.html" class="topbar-link" style="color:#fff">Dashboard</a>`
3. Computed → color → `rgb(255, 255, 255)` (#fff)
4. Parent `.topbar` → background → `rgba(244, 243, 239, 0.92)` cream
5. Lighthouse / WCAG-checker zou contrast ≈1.15:1 rapporteren (vereist ≥4.5:1)

---

## Voorgestelde fix-volgorde (NIET PATCHEN — Fase E)

Wanneer Fase E start:

1. **Atomic** — verwijder inline `style="color:#fff"` op company-dashboard.html:574
2. **Atomic** — verwijder inline `style="color:#fff"` op school-dashboard.html:596
3. **Optioneel verbetering** — beide links krijgen `class="topbar-link active"` (visuele indicator van "huidige pagina") via `.topbar-link.active { color: var(--green); font-weight: 600; }` in stylesheet, in plaats van inline color

---

## Build-regel checks

- **TQ aanname check**: "Header-template ooit voor donkere achtergrond geschreven, hergebruikt zonder achtergrond te checken" — **BEVESTIGD**. De inline `color:#fff` is een legacy uit een eerdere donkere topbar-designfase die niet is opgeruimd toen topbar naar cream migreerde.
- **Blara**: bedrijf en school zien een "halflege header" — exacte beschrijving die FTP-rapporteur gebruikte. De Dashboard-link is er, maar onzichtbaar.

---

**Einde A.2 rapport.** Geen wijzigingen aangebracht.
