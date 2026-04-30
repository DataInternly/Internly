# 7/11 — Architecture Consistency Sweep
**Datum**: 22 april 2026
**Rol**: 7/11 — Eén definitie. Eén contract. Nooit twee.
**Scope**: Loop-shield patronen, gedeelde contracten, duplicaat-definities.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode

Loop-shield grep-verwachtingen (per CLAUDE.md):
- `function notify(` → verwacht 0 buiten utils.js
- `function escapeHtml(` → verwacht 0 buiten utils.js
- `const SUPABASE_URL` → verwacht 0 buiten supabase.js
- `function createNotification(` → verwacht 0 buiten utils.js

Extra checks:
- `window.toast =` → verwacht 0 buiten toast.js
- `function hasActivePlan` → verwacht 0 buiten supabase.js
- `function routeStudent` → verwacht 0 buiten utils.js
- `const SUPABASE_URL` in HTML-bestanden → verwacht 0 (of gedocumenteerd als uitzondering)

---

## Resultaten loop-shield

### function notify(
**Gevonden**: 2 resultaten
- `js/utils.js:286` ← correct (enige definitie)
- `js/utils.backup.2026-04-20-0904.js:76` ← backup-bestand

**Oordeel**: ✅ PASS — backup-bestanden in /js/ tellen niet mee. Geen duplicaat in productiecode.

---

### function escapeHtml(
**Gevonden**: 2 resultaten
- `js/utils.js:325` ← correct
- `js/utils.backup.2026-04-20-0904.js:119` ← backup

**Oordeel**: ✅ PASS

---

### function createNotification(
**Gevonden**: 2 resultaten
- `js/utils.js:343` ← correct
- `js/utils.backup.2026-04-20-0904.js:137` ← backup

**Oordeel**: ✅ PASS

**Opmerking**: CLAUDE.md wijst erop dat telemetry.js commentaar met `createNotification` bevat — dit is géén definitie. Grep op functienaam (niet op string) onderscheidt correct.

---

### const SUPABASE_URL
**Gevonden**: 1 resultaat
- `js/supabase.js:6` ← correct

**Oordeel**: ✅ PASS

---

### window.toast =
**Gevonden**: 1 resultaat
- `js/toast.js:203` ← correct

**Oordeel**: ✅ PASS — geen tweede toast-definitie aangetroffen.

---

### function hasActivePlan
**Gevonden**: 1 resultaat
- `js/supabase.js:72` ← correct

**Oordeel**: ✅ PASS — K3-fix uit sprint 4 is geborgd. Lokale kopieën uit company-dashboard.html, school-dashboard.html, begeleider-dashboard.html zijn verwijderd.

---

### function routeStudent
**Gevonden**: 2 resultaten
- `js/utils.js:380` ← correct (+ :410 routeStudentByMode, variatie)
- `js/utils.backup.2026-04-20-0904.js:174` ← backup

**Oordeel**: ✅ PASS

---

## Bekende uitzondering: function calNotify(
**Locatie**: js/calendar.js
**Status**: Gedocumenteerde uitzondering in CLAUDE.md — "lokale variant, targets eigen #cal-notif element"

**Oordeel**: ✅ CORRECT — geen actie nodig. Uitzondering is bewust en gedocumenteerd.

---

## Openstaand architectureel risico: inline SUPABASE_URL in HTML

**Bevinding**: De Supabase URL (`qoxgbkbnjsycodcqqmft`) staat hardcoded in:
- `index.html` (5 matches)
- `about.html` (1 match)
- `pricing.html` (1 match — in startCheckout Edge Function call)

**CLAUDE.md** noemt dit expliciet als open item: "about.html + index.html: inline SUPABASE_URL opruimen"

**Analyse**:
- De anon key is public (bedoeld) — geen security-risico voor de URL zelf
- Het is een architectureel consistentie-probleem: als de Supabase-project-URL ooit verandert, zijn er 3 bestanden + supabase.js die handmatig bijgewerkt moeten worden
- pricing.html gebruikt het in een `fetch()` call → dit is een functionele afhankelijkheid, niet alleen een import

**Oordeel**: ⚠️ ARCHITECTUREEL RISICO (laag) — geen directe bug, maar schending van 7/11 principe. Oplossing: laad supabase.js vóór de inline scripts die de URL nodig hebben, en gebruik `window.SUPABASE_URL` (al geëxporteerd via supabase.js als `window.__SUPABASE_ANON_KEY`).

---

## Gerelateerd architectureel patroon: hasActivePlan gating inconsistentie

**Bevinding**: hasActivePlan() is nu correct gedefinieerd op één plek (supabase.js:72). Maar het wordt **niet consistent toegepast**:

Pagina's zonder hasActivePlan-gating (CLAUDE.md Sprint 5 P1):
- discover.html
- matches.html
- mijn-sollicitaties.html
- chat.html
- student-profile.html
- vacature-detail.html

**Oordeel**: ⚠️ ARCHITECTUREEL RISICO (middel) — de functie is gecentraliseerd, maar de toepassing is inconsistent. Dit is Sprint 5 P1. Geen actie in deze sessie.

---

## Script-laadvolgorde consistentie

**Verwachte volgorde** per CLAUDE.md:
1. js/utils.js
2. js/supabase.js (CDN eerst, dan lokaal)
3. js/push.js (optioneel)
4. js/calendar.js (optioneel)
5. js/buddy.js (optioneel)
6. **js/toast.js** (toegevoegd sprint α)
7. **js/optimistic.js** (toegevoegd sprint α)
8. js/telemetry.js (altijd als laatste)

**Verificatie**: Sprint α heeft toast.js aan alle 23 HTML-pagina's toegevoegd. Optimistic.js is toegevoegd aan mijn-sollicitaties.html en company-dashboard.html.

**Open punt**: Is optimistic.js ook aan matchpool.js-pagina's toegevoegd als script-tag? matchpool.js gebruikt `window.toast` direct. Toast.js is geladen, window.optimistic is geladen via bbl-hub.html if needed. Maar de swipe-undo in matchpool.js roept `window.toast` aan — dit werkt als toast.js vóór matchpool.js geladen is.

**Oordeel**: ⚠️ TWIJFELACHTIG — laadvolgorde correct voor geïmplementeerde files, maar de afhankelijkheid van `window.toast` in matchpool.js (een externe JS-module) is impliciet. Als toast.js niet geladen is op een pagina die matchpool.js laadt, is er een stille failure.

---

## Loop-shield samenvatting

| Contract | Definitie | Duplicaten in productie | Status |
|---------|-----------|------------------------|--------|
| notify() | utils.js:286 | 0 | ✅ |
| escapeHtml() | utils.js:325 | 0 | ✅ |
| createNotification() | utils.js:343 | 0 | ✅ |
| SUPABASE_URL | supabase.js:6 | 3 (HTML inline) | ⚠️ |
| window.toast | toast.js:203 | 0 | ✅ |
| hasActivePlan() | supabase.js:72 | 0 | ✅ |
| routeStudent() | utils.js:380 | 0 | ✅ |
| calNotify() | calendar.js | n.v.t. (uitzondering) | ✅ |

**Score**: 7/8 contracts volledig geborgd. 1 structureel risico (inline SUPABASE_URL in HTML).

---

## Aanbevelingen

1. **HTML inline SUPABASE_URL**: Verplaats de Edge Function calls in pricing.html, index.html, about.html naar functies die de URL ophalen uit supabase.js zodra die geladen is. Laagste prioriteit vanwege veiligheidsrisico, maar hoog voor onderhoudbaarheid.

2. **hasActivePlan gating**: Sprint 5 P1 — pas gating toe op de 6 genoemde pagina's.

3. **matchpool.js toast-afhankelijkheid**: Documenteer de impliciete dependency op window.toast in matchpool.js. Voeg een guard toe: `if (window.toast) toast.successUndoable(...)`.

4. **Backup-bestanden**: js/utils.backup.2026-04-20-0904.js bevat volledige functiedefinities. Dit is geen productie-risico (niet geladen door HTML), maar een confusie-risico bij toekomstige greps. Overweeg te verplaatsen naar /BACKUP/.

---

*7/11 — 22 april 2026 — READ-ONLY*
