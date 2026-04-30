# Sprint α — Toast + Optimistic UI + Empty States — Rapport
**Datum**: 22 april 2026
**Uitvoerder**: Claude Code (claude-sonnet-4-6)

---

## Fase 1 — Toast-systeem (B1)

**Afgerond**: 22 april 2026

**Nieuwe bestanden**:
- `js/toast.js` — 5-type toast module (success / successUndoable / info / warning / error)
  - Self-creating `#_iToastStack` container
  - Max 3 concurrent toasts
  - Undo-knop (successUndoable), Sluiten + Opnieuw (error/warning)
  - ARIA: `role="status/alert"`, `aria-live="polite/assertive"`, `aria-atomic="true"`
  - `prefers-reduced-motion` support (fade i.p.v. slide)
  - `.undo-flash` keyframe animatie (voor Fase 2)

**Gewijzigde bestanden**:
- `js/utils.js` — `notify()` is nu lazy wrapper om `window.toast`:
  - `ok === true` → `toast.success()`
  - `ok === false` → `toast.error()`
  - `ok === null/undefined` → `toast.info()`
  - Fallback naar `#notif` als toast.js niet geladen is (backward compat)
  - `TOAST_TIMEOUT_MS` bewaard als constante (backward compat)
- Alle **23 HTML-pagina's** kregen `<script src="js/toast.js"></script>` vóór telemetry.js

**notify() aanroepen gemigreerd**: 244 van 244 — via de lazy wrapper (alle bestaande aanroepen werken automatisch)

**Test verwachting**:
| Type | Aanroep | Visueel |
|------|---------|---------|
| success | `notify('...', true)` | Groen, 3.2s, ✓ icoon |
| error | `notify('...', false)` | Rood, persistent + Sluiten knop, ✕ icoon |
| info | `notify('...')` | Blauw, 4s, ℹ icoon |
| successUndoable | `toast.successUndoable(...)` | Grijs, 7s, Ongedaan maken knop |
| warning | `toast.warning(...)` | Oranje, 5s, Sluiten + Opnieuw |

---

## Fase 2 — Optimistic UI + Conflict-detection (B2)

**Afgerond**: 22 april 2026

**Nieuwe bestanden**:
- `js/optimistic.js` — thin helper module:
  - `optimistic.do(label, dbFn, undoFn, opts)` — voert DB call uit, toont undo toast, rollback bij error
  - `optimistic.hideEl(el)` — slide-out animatie, retourneert restore functie

**Acties geïmplementeerd**:

| # | Actie | Bestand | Undo-window | Implementatie |
|---|-------|---------|-------------|---------------|
| 1 | Sollicitatie terugnemen | mijn-sollicitaties.html | 7s | Nieuw "Terugnemen" knop op wacht-cards; DELETE application; undo = re-INSERT + reload + undo-flash |
| 2 | Vacature pauzeren | company-dashboard.html | 7s | `setStatus('paused')` nu optimistic; undo = UPDATE status → 'active' + undo-flash |
| 3 | Notificatie wegklikken | — | Deferred | Notif-functies zijn page-local verspreid over alle HTML-files; centraliseren = Sprint 5 werk (verboden lijst: unhandledrejection centralisatie) |
| 4 | Vacature wegswipen | js/matchpool.js | 4s | Undo-toast toegevoegd ná swipe; swipe-ID gecaptured via `.select('id')`; undo = DELETE swipe; bij match-conflict: info toast |
| 5 | Bericht versturen | chat.html | n.v.t. (retry) | `data-status="pending"` styling (opacity); op failure: `data-status="failed"` (rode rand) + retry-knop in bubble + `toast.error()` met retry |

**Garcia2's conflict-detection**: bestaande page-load patterns fetchen altijd live van DB — geen stale UI-state bij page-refresh. Geen extra refresh-logic nodig voor de geïmplementeerde acties.

**Morgan2's undo-flash**: `.undo-flash` CSS keyframe aanwezig in toast.js (geïnjecteerd) en global via de animatie. Terugkerende rijen na undo krijgen de class toegevoegd.

**Confirm() dialogs verwijderd**: `setStatus('paused')` in company-dashboard.html heeft geen confirm() meer.
`delPosting()` behoudt zijn confirm modal — dit is een destructieve DELETE, valt onder "behoud confirm voor permanent verwijderen".

**Test scenarios**:
| # | Test | Verwacht |
|---|------|----------|
| 1 | Trek sollicitatie in, klik undo binnen 7s | Row terug, undo-flash, DB pending |
| 2 | Trek sollicitatie in, wacht 8s | Row weg, DB deleted |
| 3 | Trek sollicitatie in, refresh pagina | DB-staat wint: row weg |
| 4 | Pauzeer vacature, klik undo binnen 7s | Kaart terug, status active, undo-flash |
| 5 | Verbinding verbroken, verstuur bericht | Bubble grijs (pending), dan rood (failed) + retry-knop |
| 6 | Swipe links, klik undo binnen 4s | Swipe deleted, kaart terug in deck |
| 7 | Swipe rechts (mutual match aangemaakt), klik undo | Info toast: match al aangemaakt, undo niet mogelijk |

---

## Fase 3 — Empty States (C2, C3, C4, C6)

**Afgerond**: 22 april 2026

**CSS toegevoegd**: `css/style.css` — `.empty-state`, `.es-icon`, `.es-primary`, `.es-secondary`, `.es-cta`, `.es-ghost`, `.btn-group`

| C# | Pagina | Locatie | Implementatie |
|----|--------|---------|---------------|
| C2 | mijn-sollicitaties.html | Nul applications | "Nog geen sollicitaties verstuurd." + missie-tie-in + link naar vacatures |
| C3 | company-dashboard.html | Nul matches voor bedrijf | "Nog geen aanmeldingen op je vacature." + responsgarantie tip + "Nieuwe vacature plaatsen" knop |
| C4 | chat.html | Lege conversatie (messages.length === 0) | "Begin met een open vraag." + voorbeeld-vraag. Geen knop — chat-input is de actie |
| C6 | 404.html | Bestaand bestand | Copy geüpdatet naar neutralere taal (JJ2's feedback: geen ghosting-referentie). "Naar vacatures" + "Naar home" |

**ErrorDocument**: `.htaccess` — `ErrorDocument 404 /404.html` toegevoegd.

---

## Open issues

| Issue | Reden |
|-------|-------|
| Notificatie wegklikken (actie #3) | Page-local functies verspreid over alle files; centraliseren is Sprint 5 (unhandledrejection handler centralisatie staat al op de lijst) |
| `confirm()` in delPosting() bewaard | Vacature permanent verwijderen valt onder "altijd confirm" per spec |
| chat.html `optimistic` lokale variabele hernoemd → `optimisticMsg` | Voorkwam naamconflict met `window.optimistic` module |

---

## Aanbevelingen voor volgende sprint (Sprint β)

1. **Notif centraliseren** (actie #3): verplaats `loadNotifications()`, `markAllRead()`, `toggleNotifDropdown()` naar `js/utils.js` — dan kan notificatie wegklikken ook optimistic worden
2. **supabase-js pinnen**: kies specifieke versie, voeg SRI toe — dan is de CDN-chain volledig gehard
3. **Skeleton screens** (A1/A2): card-loading state vervangt spinner tekst
4. **Inline form-validatie** (B3): real-time validatie op auth.html + formulieren
5. **js/toast.js + js/optimistic.js toevoegen aan SMOKE_TEST_CHECKLIST.md** voor post-FTP verificatie

---

*Sprint α — 22 april 2026 — 7/11 + Garcia2 + Morgan2 + JJ2 + Dax2 + Bedward + Hal*
