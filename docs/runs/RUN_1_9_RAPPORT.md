# RUN 1.9 — Shared footer op 4 dashboards

**Datum** 5 mei 2026
**Trigger** Barry's smoke-test Run 1.8-bis: bedrijf had geen UI-route naar publieke pagina's. Run 1.8-bis minibar werkt op publieke pagina's, maar er was geen klikpath om er te komen.
**Aanpak** Vervang minimale 1-regel footer in 4 dashboards door kb-shared-footer block uit bbl-hub.html (Run 1.5 v2 Issue 2 template).
**Status** GEÏMPLEMENTEERD — wacht op Barry's smoke-test
**Volume** 4 files, ~30 minuten

---

## Files gewijzigd: 4

| File | Was | Werd |
|---|---|---|
| company-dashboard.html | minimale 1-regel © Sasubo footer (regel 3931) | kb-shared-footer block met 10 links |
| school-dashboard.html | idem (regel 2704) | kb-shared-footer block met 10 links |
| begeleider-dashboard.html | minimale (regel 701, padding 10/14 ipv 8/12) | kb-shared-footer block met 10 links |
| buddy-dashboard.html | minimale (regel 1478) | kb-shared-footer block met 10 links |

---

## Inventarisatie vooraf (Fase 1)

```
company-dashboard:    bestaat | minimale 1-regel footer
school-dashboard:     bestaat | minimale 1-regel footer
begeleider-dashboard: bestaat | minimale 1-regel footer (lichte padding-afwijking)
buddy-dashboard:      bestaat | minimale 1-regel footer
bbl-hub footer-template: gevonden — regels 2928-2946 (19 regels HTML)
CSS kb-shared-footer:    aanwezig — css/style.css:2592-2633 (alle subclasses gestyled)
```

**Geen kritieke links te verliezen** in de oude minimale footer (alleen © Sasubo).

---

## Footer-template bron

[bbl-hub.html:2928-2946](../../bbl-hub.html#L2928-L2946) — kb-shared-footer block (Run 1.5 v2 Issue 2). Identieke 10 links + brand + tagline overgenomen, geen wijzigingen per Barry's instructie "exact bbl-hub footer-template, geen extra links".

---

## Verificatie (Fase 3)

```
=== kb-shared-footer per dashboard ===
company:    kb-shared=2 (class + closing comment match), footer-links=1   PASS
school:     kb-shared=2, footer-links=1                                   PASS
begeleider: kb-shared=2, footer-links=1                                   PASS
buddy:      kb-shared=2, footer-links=1                                   PASS

=== Tag balance ===
company:    footer 1/1 | body 1/1 | scripts 22/22                         PASS
school:     footer 1/1 | body 1/1 | scripts 17/17                         PASS
begeleider: footer 1/1 | body 1/1 | scripts 13/13                         PASS
buddy:      footer 1/1 | body 1/1 | scripts 15/15                         PASS
```

CSS `kb-shared-footer` styling al aanwezig in [css/style.css:2592-2633](../../css/style.css#L2592-L2633) — geen extra werk nodig.

---

## Verschillen tegengekomen

**Geen functionele verschillen.** Alleen één cosmetische afwijking:
- begeleider-dashboard had `padding:10px 0 14px` ipv standaard `8px 0 12px`. Vervangen — irrelevant want oude footer is volledig weg.

Geen complicaties met script-volgorde, body-structuur of CSS-collisions.

---

## Smoke-test voor Barry

### Test 10 — Bedrijf footer aanwezig
1. Login als bedrijf
2. Open company-dashboard
3. Scroll naar onder
4. **Verwacht:** rijke footer zichtbaar met "intern·ly" brand + 10 links + © Sasubo + tagline

### Test 11 — Bedrijf naar publieke pagina via footer
1. Op company-dashboard → klik footer-link "Over ons"
2. **Verwacht:** about.html opent met **mini-bar bovenaan** (Run 1.8-bis): "Ingelogd als [naam]" + "BEDRIJF" pill + "→ Dashboard" + "Uitloggen"
3. NIET de publieke header met "Inloggen" knop

### Test 12 — Bedrijf naar kennisbank via footer
1. Op company-dashboard → klik footer-link "Kennisbank"
2. **Verwacht:** kennisbank.html opent met mini-bar bovenaan
3. Klik "→ Dashboard" → terug naar company-dashboard

### Test 13 — School + begeleider + buddy footer
1. Login als school → scroll dashboard → footer zichtbaar
2. Login als begeleider → scroll → footer zichtbaar
3. Login als buddy → scroll → footer zichtbaar
4. Per rol: klik "Over ons" → mini-bar met juiste rol-pill

### Test 14 — Geen layout-breuk
1. Bekijk elke dashboard op desktop én mobiel
2. **Verwacht:** footer overspant volledige breedte (niet ingeklemd door sidebar)
3. CSS responsive werkt — links wrappen op kleine schermen

---

## Buiten scope (backlog)

Per plan-spec NIET in deze run:
- Kennisbank-tab in bedrijf-header / school-sidebar / begeleider-sidebar (Run 4 — header-spec enforcement)
- `renderFooter(role)` helper (post-livetest backlog)
- Footer op niet-dashboard ingelogde pagina's (mijn-aanmeldingen.html, mijn-sollicitaties.html, etc.) — separate footer-uniformity run

---

## Niet aangeraakt

- `bbl-hub.html` — al kb-shared-footer (Run 1.5 v2 Issue 2)
- `js/utils.js`, `js/supabase.js` — geen logica-wijziging
- `css/style.css` — kb-shared-footer styling al aanwezig
- `js/telemetry.js` — no-go zone

---

**Run 1.9 status: GEÏMPLEMENTEERD — wacht op Barry's smoke-test 10-14.**
