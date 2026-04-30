# Dead Code Report — js/utils.js
**Datum**: 22 april 2026
**Methode**: grep-count van elke export buiten utils.js (excl. BACKUP/ en EX/ mappen)

---

## Functies met 0 usages buiten utils.js — KANDIDATEN VOOR VERWIJDERING

| Functie | Externe usages | Notitie |
|---------|---------------|---------|
| `fetchUserRole` | 0 | Waarschijnlijk vervangen door inline `db.from('profiles').select('role')` calls |
| `getUnreadTotal` | 0 | Notification-aggregate — mogelijk nooit aangesloten |
| `getUserMode` | 0 | Mogelijk vervangen door `requireRole` flow |

**Aanbeveling**: Verifieer handmatig dat geen dynamische aanroepen bestaan (bijv. `window['get' + 'UserMode']()`). Daarna: veilig te verwijderen bij volgende refactor-sprint.

---

## Functies met 1-4 usages — BEOORDEEL CASE-BY-CASE

| Functie | Externe usages | Notitie |
|---------|---------------|---------|
| `requireMode` | 1 | Weinig gebruikt — check of de ene caller dit echt nodig heeft |
| `goBack` | 4 | Terug-navigatie helper — legitiem utility |
| `isApplying` | 4 | Sollicitatie-state flag — legitiem |
| `ROLE_LANDING` | 2 | Constante, intern gebruikt in utils.js |
| `TOAST_TIMEOUT_MS` | 2 | Timeout constante — nuttig om gecentraliseerd te houden |

---

## Hoge usages — NIET AANRAKEN

| Functie | Externe usages |
|---------|---------------|
| `escapeHtml` | 418 |
| `notify` | 247 |
| `createNotification` | 31 |
| `getDisplayName` | 26 |
| `performLogout` | 16 |
| `smartHomeRedirect` | 16 |
| `renderStudentHeader` | 10 |
| `routeStudent` | 10 |
| `renderTrustBadge` | 10 |
| `renderStudentHeader` | 10 |
| `getRoleLanding` | 5 |
| `requireRole` | 6 |
| `routeStudentByMode` | 6 |
| `setApplying` | 6 |
| `getNotifText` | 7 |
| `formatNLDate` | 9 |

---

## Aanbeveling

1. **Sprint 5 cleanup**: verwijder `fetchUserRole`, `getUnreadTotal`, `getUserMode` na handmatige verificatie
2. **Geen actie nu**: alle hoge-usage functies zijn actief in de codebase
3. **Monitor**: `requireMode` (1 usage) — als de ene caller verdwijnt, ook `requireMode` verwijderen

*Aangemaakt: 22 april 2026 — All-Hands Council audit (item 17, De Sensei)*
