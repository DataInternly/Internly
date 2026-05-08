# PHASE A.1 REPORT — js/account.js redirect-bron

**Datum** 2026-05-03
**Defect** FTP-05 — vanuit bedrijf-account-tab land je bij studenten i.p.v. bij bedrijf
**Stop-conditie** Geen patch. Alleen rapport.

---

## Methode

1. `js/account.js` volledig gelezen (465 regels, één file)
2. Grep binnen het bestand op:
   - `window.location`
   - `location.href`
   - `location.replace`
   - `getRoleLanding`
   - `smartHomeRedirect`
   - `ROLE_LANDING`
3. Cross-referentie naar caller `company-dashboard.html` regel 1540-1543 en omgeving

---

## Bevindingen — Lijst van redirects in js/account.js

| Regel | Code | Trigger-pad | Doel |
|-------|------|-------------|------|
| 138 | `setTimeout(() => { window.location.href = 'index.html'; }, 2500);` | Binnen `requestAccountDeletion()` na succesvolle deletion | `index.html` (publieke landing) |

**Andere matches**: GEEN.

- Geen `getRoleLanding`-call.
- Geen `smartHomeRedirect`-call.
- Geen `ROLE_LANDING`-referentie.
- Geen `location.replace`-call.
- Geen impliciete redirects via Supabase-auth-state-change-handlers.

`renderAccountScreen()` zelf (regels 349-394) bevat ZERO redirects. Het rendert alleen HTML in een container, doet drie DB-fetches (loadContactData, loadSubscription, loadPayments), en returnt een Promise op `requestAnimationFrame`.

De event-handlers (`handleSaveContact`, `handleExportCSV`, `handleCancelSubscription`, `handleDeleteAccount`) bevatten ook geen redirects, behalve de account-deletion flow op regel 138 die naar `index.html` gaat (niet naar studenten).

---

## Cross-check: company-dashboard.html show('account') flow

[company-dashboard.html:1540-1543](company-dashboard.html#L1540-L1543):
```js
if (id === 'account') {
  window._currentUserId = currentUser?.id;
  AccountModule.renderAccountScreen('account-container', 'nl');
}
```

**Geen redirect.** Lokale render in `#account-container`. URL verandert niet.

Andere `window.location`-calls in company-dashboard.html (uit grep):
| Regel | Code | Trigger | Doel |
|-------|------|---------|------|
| 571 | `onclick="event.preventDefault();smartHomeRedirect();"` | Logo-klik | Naar rol-pagina (rol-aware) |
| 714 | `window.location.href='pricing.html'` | Upgrade-CTA | pricing |
| 1385 | `window.location.href = 'chat.html?match=' + ...` | Notif-click op message-type | chat |
| 1451 | `window.location.href = 'auth.html'` | Auth-fail (no user) | auth |
| 1474 | `redirectTo: window.location.origin + '/auth.html'` | OAuth callback | auth |
| 1556, 1665, 1681, 1786 | `window.location.href='pricing.html'` | Diverse upgrade-CTA's | pricing |
| 1563 | `window.location.href = 'mijn-berichten.html'` | Berichten-klik | berichten |
| 1581 | `window.location.href = 'company-discover.html'` | Discover-knop bedrijf | bedrijf-discover |
| 3368 | `window.location.replace('auth.html?expired=1')` | JWT expired guard | auth |
| 3401 | `window.location.href = 'auth.html'` | No-user guard | auth |
| 3408-3410 | `window.location.replace(getRoleLanding(userRole))` | Wrong-role guard | rol-pagina (rol-aware) |
| 3424, 3426 | `URLSearchParams` + `replaceState` | Lees URL params | n/a |
| 3441 | `window.location.reload()` | Plan-update reload | self |

**GEEN directe redirect naar `student-home.html`, `discover.html`, `match-dashboard.html`, of een andere student-specifieke pagina.**

---

## Hypothese over waarom bedrijf-rol bij studenten landt

**Op basis van de code-analyse: AccountModule en company-dashboard.html bevatten GEEN redirect-logica die bedrijf-rol naar student-pagina stuurt.**

Mogelijke werkelijke oorzaken (vereist runtime-verificatie):

### Hypothese 1 — Logo-klik via smartHomeRedirect()
Regel 571: logo-klik triggert `smartHomeRedirect()`. Als deze functie in `js/utils.js` (regel 76+) een sessie-state corruptie heeft of `currentUser.role` verkeerd leest, kan hij naar een student-landing stuwen. **Te verifiëren door `smartHomeRedirect()` body te lezen**.

### Hypothese 2 — Geen redirect, maar visuele verwarring
De gebruiker rapporteerde "land je bij studenten" — dit kan ook betekenen dat het account-form gerenderd wordt **boven of in plaats van** het bedrijf-dashboard, en daardoor verwarrend lijkt op een student-context. **Te verifiëren in DevTools: kijken of `#account-container` zichtbaar is binnen het bedrijf-shell of dat de URL daadwerkelijk wijzigt**.

### Hypothese 3 — Wrong-role guard op company-dashboard.html:3408-3410
```js
window.location.replace(
  typeof getRoleLanding === 'function'
    ? getRoleLanding(userRole)
    : 'auth.html'
);
```
Dit triggert als `userRole !== 'bedrijf'`. Als `currentUser` ergens leeggemaakt wordt vóór deze guard, of als `userRole` per ongeluk een student-waarde krijgt, kan de wrong-role guard naar `student-home.html` redirecten (nieuwe Sessie 2 default).

**Reproduceerbaar test-scenario**:
1. Login als bedrijf
2. Klik Account-tab
3. Sla wijziging op (handleSaveContact)
4. Open DevTools Network-tab vóór klikken
5. Observe: gebeurt er een page-load? Of blijft alles SPA-style?

---

## Conclusie

`js/account.js` is **niet de bron** van FTP-05. De redirect-bron zit elders, mogelijk in:

1. **`js/utils.js` `smartHomeRedirect()`** — moet apart geaudit worden (kort: ~30 regels)
2. **company-dashboard.html wrong-role guard** (regel 3408-3410) — getriggerd door een sessie-state corruptie
3. **Visuele verwarring** zonder daadwerkelijke redirect

**Aanbeveling vóór Fase D start**: vraag gebruiker om Network-tab screenshot tijdens reproductie. Zonder runtime-bewijs blijft FTP-05 een hypothese.

**Voorgestelde vervolgactie**: lees `smartHomeRedirect()` body in js/utils.js (start regel 76) en verificatie van `userRole`-vulling vóór de wrong-role guard. Als beide schoon zijn → FTP-05 is mogelijk geen functionele bug maar een UX-perceptie.

---

## Build-regel checks

- **TQ aanname check**: "AccountModule is rol-agnostisch" — **BEVESTIGD**. AccountModule rendert alleen, redirect zit daar niet.
- **Blara**: Als het bedrijf hun eigen account-tab opent en plotseling op een student-pagina belandt, is dat een breukvlak in mental model. Maar de code suggereert dat dit niet daadwerkelijk gebeurt — mogelijk verwarring met het feit dat AccountModule generieke "Account settings"-tekst toont (taal-onafhankelijk van rol).

---

**Einde A.1 rapport.** Geen wijzigingen aangebracht.
