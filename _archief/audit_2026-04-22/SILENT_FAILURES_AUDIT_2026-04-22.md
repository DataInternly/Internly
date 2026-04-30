# Hal — Silent Failures Audit
**Datum**: 22 april 2026
**Rol**: Hal — Een fout die je niet ziet, is een fout die je niet kunt oplossen.
**Scope**: js/ bestanden + HTML-ingebedde scripts. Alle try/catch-blokken geanalyseerd op stille swallowing.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode

Grep-analyse op:
- `catch\s*\(\w+\)\s*\{[\s]*\}` — volledig lege catch-blokken
- `catch.*\{[^}]*\}` — catch-blokken met minimale actie
- Vergelijking: 120 try-blokken vs. 102 catch-blokken (18 uncaught scenarios)

Classificatie:
- ✅ **ACCEPTABEL** — lege catch is bewust (cleanup, audio, non-critical)
- ⚠️ **TWIJFELACHTIG** — kan informatie verbergen die nuttig zou zijn
- ❌ **PROBLEMATISCH** — fout in kritisch pad, geen feedback aan gebruiker, geen logging

---

## Bevindingen per bestand

---

### js/animations/match-celebrate.js:90
```javascript
try { new Audio(src).play().catch(function () {}); } catch (_) {}
```
**Oordeel**: ✅ ACCEPTABEL — audio-afspelen is niet-kritisch. Browsers blokkeren autoplay routinematig. Geen gebruikersfeedback nodig.

---

### js/buddy.js:187
```javascript
try { BuddyModule.db?.removeChannel(BuddyModule._realtimeSub); } catch(e) {}
```
**Oordeel**: ✅ ACCEPTABEL — cleanup op page-unload. Als removeChannel faalt, is de pagina al verlaten. Geen actie mogelijk.

---

### js/utils.js:235
```javascript
if (typeof setApplying === 'function') { try { setApplying(false); } catch (_) {} }
```
**Oordeel**: ✅ ACCEPTABEL — optionele state-reset. setApplying is een page-local functie die mogelijk niet bestaat. Defensive wrapper.

---

### js/buddy.js:699
```javascript
try { context = JSON.parse(widget.dataset.context || '{}'); } catch (e) { /* ignore */ }
```
**Oordeel**: ⚠️ TWIJFELACHTIG — als een widget een malformed JSON context heeft, wordt dit stilletjes genegeerd. Gebruiker ziet mogelijk een lege widget zonder uitleg. Lage prioriteit maar console.warn zou helpen bij debugging.

---

### js/supabase.js:51
```javascript
if (client) await client.auth.signOut().catch(() => {});
```
**Oordeel**: ✅ ACCEPTABEL — logout bij session-timeout. Als signOut faalt (bijv. al uitgelogd), is dit niet kritisch. Redirect naar auth.html volgt sowieso.

---

### js/telemetry.js:82
```javascript
}).catch(() => {}); // async
```
**Oordeel**: ⚠️ TWIJFELACHTIG — telemetry-logging swaalt fouten. Als SecurityLog (de DB-write) faalt, weet niemand het. Telemetry die zichzelf niet logt als het faalt, is blind geworden. Voor security-monitoring is dit een zwak punt: een aanvaller die de SecurityLog-table blokkeert, verdwijnt uit het zicht.

---

### js/push.js:69
```javascript
} catch(_) { /* BroadcastChannel not available — ignore */ }
```
**Oordeel**: ✅ ACCEPTABEL — BroadcastChannel is niet beschikbaar in Safari. De comment legt het uit. Non-critical feature.

---

### bbl-dashboard.html:472
```javascript
} catch(e) {}
```
**Oordeel**: ❌ PROBLEMATISCH — lege catch in onbekende context (zou context van de omringende functie vereisen). Zonder weten welke functie dit is, kan dit een DB-read zijn die faalt zonder user-feedback. Vereist nader onderzoek.

---

### bbl-dashboard.html:475
```javascript
try { progress = JSON.parse(localStorage.getItem('internly_ld_' + userId) || '{}'); } catch(e) {}
```
**Oordeel**: ✅ ACCEPTABEL — JSON.parse op localStorage met lege object als fallback. Standaard defensief patroon.

---

### bbl-hub.html — meerdere localStorage JSON.parse catches (lines 1730, 1758, 1795, 2038, 2039)
```javascript
try { toelichtingen = JSON.parse(localStorage.getItem('...') || '{}'); } catch(e) {}
```
**Oordeel**: ✅ ACCEPTABEL (patroon) — allemaal localStorage JSON-parse met lege object fallback. Consistent patroon, acceptabel.

---

### bbl-hub.html:1682, 1700, 1721, 1726
```javascript
} catch(e) {}
```
**Oordeel**: ❌ PROBLEMATISCH — vier lege catch-blokken in bbl-hub.html in de buurt van de signOff-functie en evaluatie-opslaan-logica. Zonder de precieze context te kennen: als een van deze een DB-write omsluit (evaluatie, verlenging, ondertekening), dan kan een fout volledig onzichtbaar zijn voor de gebruiker.

**Specifiek risico**: De signOff-keten (CLAUDE.md) was eerder fire-and-forget. Deze catches maken hetzelfde patroon mogelijk: DB-write faalt, gebruiker denkt dat evaluatie opgeslagen is, maar dat is niet zo.

---

### bbl-hub.html:1842, 1861
```javascript
} catch(e) {}
```
**Oordeel**: ❌ PROBLEMATISCH — zelfde probleem als hierboven. Context onbekend zonder lezen van omringende code.

---

### bbl-hub.html:2225, 2232
```javascript
} catch(e) {}
try { localStorage.removeItem('internly_bbl_reflectie_draft_' + currentUser.id); } catch(e) {}
```
**Oordeel**: ✅ ACCEPTABEL voor :2232 (localStorage-cleanup). Line :2225 vereist context-check.

---

### bbl-hub.html:2368, 2389
```javascript
} catch(e) {}
```
**Oordeel**: ⚠️ TWIJFELACHTIG — in of nabij de verlengings-flow (renewal). Als een DB-write hier faalt, kan de student denken dat de verlenging is aangevraagd terwijl dat niet zo is.

---

### buddy-dashboard.html:651
```javascript
} catch(e) {}
```
**Oordeel**: ⚠️ TWIJFELACHTIG — context onbekend. Vereist reading van omringende functie.

---

### buddy-dashboard.html:724
```javascript
if (realtimeSub) { try { db.removeChannel(realtimeSub); } catch(e) {} }
```
**Oordeel**: ✅ ACCEPTABEL — realtime-channel cleanup op page-unload.

---

### buddy-dashboard.html:745
```javascript
try { if (typeof buddyInit === 'function') buddyInit(); } catch(e) {}
```
**Oordeel**: ⚠️ TWIJFELACHTIG — als buddyInit() faalt (bijv. DB-verbinding), ziet de gebruiker een lege pagina zonder melding. Zou minstens een console.error moeten hebben.

---

### company-dashboard.html:2315
```javascript
try { await registerPushNotifications(db, currentUser.id); } catch(_) {}
```
**Oordeel**: ✅ ACCEPTABEL — push-registratie is optioneel. Als het faalt, is de rest van het dashboard functioneel.

---

### discover.html:1216
```javascript
try { await db.removeChannel(notifSubscription); } catch(e) {}
```
**Oordeel**: ✅ ACCEPTABEL — realtime cleanup.

---

## De 18 uncaught scenarios (try zonder catch)

Grep: 120 try-blokken, 102 catch-blokken → 18 try-blokken zonder bijbehorende catch.

**Verklaring mogelijkheden**:
1. `try { ... } finally { ... }` — finally zonder catch is geldig, exception propageeert
2. Geneste try-catch waar de outer catch de inner try's dekt
3. Onbedoeld ontbrekende catch-blokken

**Risico**: Als een uncaught async exception in een try-blok (bijv. `await db.from(...).insert(...)`) een rejection produceert die niet gevangen wordt, gaat dit naar de global `unhandledrejection` handler — die in de sprint-fix net is aangescherpt. Dit is dus nu minder gevaarlijk dan vóór de fix, maar nog steeds suboptimaal.

---

## Samenvatting

| Classificatie | Aantal | Bestanden |
|--------------|--------|-----------|
| ✅ ACCEPTABEL | ~15 | utils.js, supabase.js, push.js, calendar.js, match-celebrate.js, bbl-hub.html (localStorage) |
| ⚠️ TWIJFELACHTIG | 5 | buddy.js:699, telemetry.js:82, buddy-dashboard.html:651+745, bbl-hub.html:2368 |
| ❌ PROBLEMATISCH | 4+ | bbl-hub.html:1682, 1700, 1721, 1726, 1842, 1861, bbl-dashboard.html:472 |

---

## Aanbevelingen (prioriteit)

### DIRECT (vóór volgende livetest)
1. **bbl-hub.html lines 1682, 1700, 1721, 1726**: Lees de omringende functie. Als het DB-writes zijn (signOff, evaluatie, verlenging), voeg minstens `console.error('[bbl-hub]', e)` toe. Beter: `toast.error('Opslaan mislukt')`.

### BINNENKORT
2. **telemetry.js:82**: Voeg `console.warn('[telemetry] DB-log mislukt')` toe zodat telemetry-failures traceerbaar zijn.
3. **buddy-dashboard.html:745**: Wrap buddyInit() met echte error-feedback: `catch(e) { notify('Dashboard kon niet laden', false); }`.
4. **bbl-hub.html:2368 (renewal flow)**: Controleer of dit een DB-write is. Zo ja: user-feedback toevoegen.

### ONDERZOEK VEREIST
5. **bbl-dashboard.html:472**: Lees de omringende functie om context te bepalen.
6. **De 18 uncaught try-blokken**: Identificeer welke try/finally zijn en welke ontbrekende catches zijn.

---

*Hal — 22 april 2026 — READ-ONLY*
