# RUN 2.2 — Buddy navigatie naar Overzicht/Matches/Profiel

**Datum** 5 mei 2026
**Trigger** Diagnose: HEADER_NAV_BY_ROLE.gepensioneerd had 3 tabs met bare anchors (`#section-X`) — werkten alleen vanaf buddy-dashboard zelf, dood-eind vanaf elke andere pagina.
**Status** GEÏMPLEMENTEERD
**Volume** 1 file, ~10 minuten
**Risico** zeer laag — alleen URL-prefix toevoeging

---

## Fase 1 — Hash-listener diagnose: JA, bestaat al

[buddy-dashboard.html:830-869, 1483](../../buddy-dashboard.html#L830-L869) — volledige hash-aware section-switching:

| Functie | Regel | Doel |
|---|---|---|
| `getActiveSection()` | 830 | Leest `window.location.hash` → returnt section-id |
| `showSection(id)` | 835 | Toggles `.dashboard-section[hidden]` + update header + URL |
| `initSectionFromHash()` | 856 | Init-wrapper |
| `hashchange` listener | 859 | Reageert op runtime hash-wijzigingen |
| Init-call | 1483 | Bij page-load draait `initSectionFromHash()` |
| Click-handler `[data-tab]` | 862-869 | Vangt nav-clicks vóór browser-navigatie |

**Sections:** `data-section="overzicht"` (regel 330), `data-section="matches"` (354), `data-section="profiel"` (471).

**Conclusie:** code accepteert al externe `?#section-X` URL-naar-sectie correct. Alleen de hrefs in HEADER_NAV_BY_ROLE waren incompleet.

**Fase 3 hash-listener-toevoeging:** NIET nodig.

---

## Fase 2 — hrefs aangepast in js/utils.js

Drie wijzigingen in [HEADER_NAV_BY_ROLE.gepensioneerd](../../js/utils.js#L699-L705):

| Tab | Oude href | Nieuwe href |
|---|---|---|
| Overzicht | `#section-overzicht` | `buddy-dashboard.html#section-overzicht` |
| Mijn matches | `#section-matches` | `buddy-dashboard.html#section-matches` |
| Mijn profiel | `#section-profiel` | `buddy-dashboard.html#section-profiel` |

`Mijn berichten` en `Mijn notities` blijven ongewijzigd — die hadden al `mijn-berichten.html` resp. `mijn-notities.html` (volledige paden).

---

## Verificatie

```
=== buddy-dashboard.html#section in js/utils.js ===
700: { id: 'overzicht', ... href: 'buddy-dashboard.html#section-overzicht' }
701: { id: 'matches',   ... href: 'buddy-dashboard.html#section-matches' }
704: { id: 'profiel',   ... href: 'buddy-dashboard.html#section-profiel' }
3 hits (verwacht: 3)                                                       PASS

=== Bare anchors weg ===
grep "href: '#section-" js/utils.js → geen output                           PASS
```

---

## Smoke-test voor Barry

### Test 1 — Externe navigatie naar buddy-dashboard sections
1. Login als buddy Jan
2. Klik op "Mijn notities" tab → opent mijn-notities.html
3. Klik op "Overzicht" tab in mijn-notities header
4. **Verwacht:** browser navigeert naar `buddy-dashboard.html#section-overzicht`
5. buddy-dashboard laadt → `initSectionFromHash` triggert → overzicht-section wordt getoond

### Test 2 — Mijn matches via externe page
1. Login als buddy, ga naar mijn-berichten.html
2. Klik op "Mijn matches" header-tab
3. **Verwacht:** browser → `buddy-dashboard.html#section-matches` → matches-section visible

### Test 3 — Mijn profiel via externe page
1. Login als buddy, ga naar mijn-notities.html
2. Klik op "Mijn profiel" header-tab
3. **Verwacht:** browser → `buddy-dashboard.html#section-profiel` → profiel-section visible

### Test 4 — Buddy via Run 1.8 hybrid header op publieke pagina
1. Login als buddy, klik footer-link "Kennisbank" (Run 1.9 footer-fix)
2. Op kennisbank → buddy-rol-header zichtbaar (Run 1.8 hybrid)
3. Klik "Overzicht" tab in die header
4. **Verwacht:** navigeert naar `buddy-dashboard.html#section-overzicht`, juiste section zichtbaar

### Test 5 — Bestaande buddy-dashboard interne nav blijft werken
1. Login als buddy, op buddy-dashboard
2. Klik op "Mijn matches" header-tab
3. **Verwacht:** click-handler regel 862-869 vangt af → `showSection('matches')` → in-page section-toggle, geen page-reload (handler doet `e.preventDefault()`)
4. URL update naar `buddy-dashboard.html#section-matches` (history.replaceState op regel 850)

---

## Bekende beperking

`gepensioneerd` nav-array heeft **geen kennisbank-tab** (zoals student/student_bbl wel hebben). Niet in Run 2.2 scope. Buddy bereikt kennisbank via Run 1.9 footer-link. Mogelijk gat — productbeslissing voor latere run.

---

## Niet aangeraakt

- `buddy-dashboard.html` — hash-listener was al volledig geïmplementeerd, geen wijzigingen
- `mijn-notities.html`, `mijn-berichten.html` — hrefs al correct
- `js/telemetry.js` — no-go zone

---

**Run 2.2 status: GEÏMPLEMENTEERD — wacht op smoke-test.**
