# SILENT CATCH AUDIT — Internly

**Datum:** 2026-05-10
**Scope:** alle `.js` en `.html` in `c:\Projects\Internly`
**Patroon:** `catch(e) {}`, `catch(_) {}`, `catch(e) { /* … */ }`, en multiline lege catches

## Totalen

- **Totaal silent catches:** 38
- **P0 (gebruikersactie / data-loss-risico):** 2 — moet meteen gefixt worden
- **P1 (achtergrond — feature degradeert stil):** 7 — log toevoegen voor diagnose
- **P2 (cleanup / parsing / browser-quirk — bewust stil):** 29 — meeste acceptabel

## P0 — gebruikersactie of data-loss

### 🔴 [bbl-hub.html:2480](bbl-hub.html#L2480) — renewal-keuze kan partner's keuze wissen

```js
async function studentChoice(keuze) {
  if (!activeMatch?.id) { notify('Koppeling niet geladen — ververs de pagina', false); return; }
  let status = {};
  try {
    const { data: m } = await db
      .from('matches')
      .select('renewal_status')
      .eq('id', activeMatch.id)
      .maybeSingle();
    status = m?.renewal_status || {};
  } catch(e) {}                                      // ← silent
  status.student = keuze;
  const { error } = await db
    .from('matches')
    .update({ renewal_status: status })              // ← overschrijft volledig
    .eq('id', activeMatch.id);
```

**Async-operatie:** Supabase SELECT op `matches.renewal_status` (read-modify-write).
**Risico:** als de SELECT faalt (netwerk, RLS), blijft `status` `{}`. De daaropvolgende UPDATE schrijft `{ student: keuze }` en **wist de bedrijfskeuze die mogelijk al in renewal_status stond**.
**Fix:** in de catch `notify('Kon renewal-status niet laden — probeer opnieuw', false); return;` — niet doorgaan met de write.

### 🔴 [company-dashboard.html:3154](company-dashboard.html#L3154) — push-acceptatie zonder feedback bij falen

```js
async function acceptPush() {
  localStorage.setItem('internly_push_asked', '1');
  const banner = document.getElementById('push-banner');
  if (banner) banner.remove();
  if (currentUser) {
    try { await registerPushNotifications(db, currentUser.id); } catch(_) {}  // ← silent
  }
}
```

**Async-operatie:** `registerPushNotifications` (service worker subscribe + Supabase insert push_subscriptions).
**Risico:** gebruiker klikt "Sta toe", banner verdwijnt, maar als registratie faalt (geen permission, geen serviceworker, DB-fout) krijgt hij geen meldingen — zonder enige melding. Gebruiker denkt dat het werkt.
**Fix:** `console.warn` + `notify('Push aanzetten mislukt — probeer later opnieuw via instellingen', false)`.

## P1 — achtergrondfunctie (silent degrade)

Falt een DB-call hier silently, dan werkt de feature op localStorage-fallback. Geen acute schade, maar wel diagnose-blind als de DB structureel iets mist (RLS, kolom-rename).

### [bbl-dashboard.html:514](bbl-dashboard.html#L514)

```js
try {
  const { data: sp } = await db.from('student_profiles').select('skills')
    .eq('profile_id', userId).maybeSingle();
  progress = sp?.skills || {};
} catch(e) {}
// Lokale fallback
if (!Object.keys(progress).length) {
  try { progress = JSON.parse(localStorage.getItem('internly_ld_' + userId) || '{}'); } catch(e) {}
}
```

**Async-operatie:** Supabase SELECT student_profiles.skills voor BBL-leerdoel-voortgang.
**Fix:** `console.warn('[bbl-dashboard] skills fetch fout:', e?.message)`.

### [bbl-hub.html:1812](bbl-hub.html#L1812)

```js
try {
  const { data: sp } = await db.from('student_profiles').select('skills_progress')
    .eq('profile_id', currentUser.id).maybeSingle();
  progress = sp?.skills_progress || {};
} catch(e) {}
```

**Async-operatie:** Supabase SELECT skills_progress (BBL-progressie).
**Fix:** `console.warn('[bbl-hub] skills_progress fetch fout:', e?.message)`.

### [bbl-hub.html:1933](bbl-hub.html#L1933)

```js
if (raw.startsWith('[Zelfreflectie-STARR] ')) {
  try {
    const parsed = JSON.parse(raw.slice('[Zelfreflectie-STARR] '.length));
    return { ...parsed, savedAt: m.created_at, msgId: m.id };
  } catch(e) {}                                  // ← silent → reflectie wordt als legacy behandeld
}
const text = raw.replace(/^\[Zelfreflectie\] /, '');
return { situatie: '', taak: '', actie: '', resultaat: '', leermoment: text, ... };
```

**Async-operatie:** synchroon, maar parse'd content uit DB-bericht (zelfreflectie STARR-payload).
**Risico:** corrupt JSON-reflectie wordt stilletjes ge-degradeerd naar het legacy-formaat — student verliest STARR-velden zonder waarschuwing.
**Fix:** `console.warn('[bbl-hub] STARR JSON corrupt voor msg', m.id, e)`.

### [bbl-hub.html:2459](bbl-hub.html#L2459)

```js
try {
  const { data: m } = await db.from('matches').select('renewal_status')
    .eq('id', activeMatch.id).maybeSingle();
  if (m?.renewal_status) status = m.renewal_status;
} catch(e) {}
if (!status.student) {
  try { status = JSON.parse(localStorage.getItem('internly_renewal_' + activeMatch.id) || '{}'); } catch(e) {}
}
```

**Async-operatie:** Supabase SELECT renewal_status (read-only — render-pad, geen write).
**Fix:** `console.warn('[bbl-hub] renewal_status read fout:', e?.message)`.

### [buddy-dashboard.html:1126](buddy-dashboard.html#L1126)

```js
try {
  const { data: wl } = await db.from('waitlist').select('anonymous, paused')
    .eq('id', waitlistRow.id).maybeSingle();
  if (wl) { anon = wl.anonymous !== false; paused = !!wl.paused; }
} catch(e) {}
```

**Async-operatie:** Supabase SELECT waitlist (anoniem/pause-toggles).
**Fix:** `console.warn('[buddy] waitlist toggle-fetch fout:', e?.message)`.

### [buddy-dashboard.html:1327](buddy-dashboard.html#L1327)

```js
try { if (typeof buddyInit === 'function') buddyInit(); } catch(e) {}
```

**Async-operatie:** module-init (synchroon, maar synchroon kan async-init binnenin starten).
**Fix:** `console.error('[buddy-dashboard] buddyInit fout:', e)` — als dit faalt is de hele buddy-flow stuk.

### [bbl-hub.html:1257](bbl-hub.html#L1257)

```js
try { meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata; } catch(e) {}
```

**Async-operatie:** synchrone JSON.parse op chat-message metadata.
**Risico:** corrupt metadata leidt tot ontbrekende meeting-knoppen of evaluatie-status zonder spoor.
**Fix:** `console.warn('[bbl-hub] metadata parse fout msg', msg.id, e)`.

## P2 — bewust stil (cleanup, parse-fallbacks, browser-quirks)

Deze 29 zijn meestal acceptabel. localStorage kan altijd falen (quota / private mode), `removeChannel` op `beforeunload` is niet gegarandeerd uit te voeren, en autoplay-policies maken `Audio.play()` rejection normaal.

### Categorie A — localStorage parse/write (18 stuks)

Allemaal hetzelfde patroon: `JSON.parse(localStorage.getItem(...))` of `localStorage.setItem/removeItem` in een one-liner. Gracefully fallen ze terug op default-waardes.

| Bestand | Regels |
|---|---|
| [bbl-dashboard.html](bbl-dashboard.html#L517) | 517 |
| [bbl-hub.html](bbl-hub.html) | 1773, 1791, 1817, 1821, 1849, 1886, 1952, 2129, 2130, 2316, 2323, 2461 |
| [chat.html](chat.html) | 1170, 1179, 1193 (3× motivatie-storage in één try) |
| [mijn-sollicitaties.html](mijn-sollicitaties.html#L798) | 798 |

**Aanbeveling:** laten staan. localStorage-falen tijdens private-mode of quota is bekend gedrag; een notify zou de gebruiker overspoelen.

### Categorie B — realtime cleanup op unmount (7 stuks)

`db.removeChannel(...)` of `subscription.unsubscribe()` in `beforeunload`/cleanup-pad. Als de pagina toch al weggaat is een fout zinloos om te tonen.

| Bestand | Regel | Wat |
|---|---|---|
| [bbl-hub.html](bbl-hub.html#L1339) | 1339, 2986 | `db.removeChannel(realtimeSub)` |
| [buddy-dashboard.html](buddy-dashboard.html#L1305) | 1305 | `db.removeChannel(realtimeSub)` |
| [discover.html](discover.html#L1513) | 1513 | `db.removeChannel(notifSubscription)` |
| [js/buddy.js](js/buddy.js#L133) | 133 | `BuddyModule.db?.removeChannel(...)` |
| [matchpool.html](matchpool.html#L491) | 491 | `db.removeAllChannels()` |
| [js/utils.js](js/utils.js#L160) | 160 | `sub?.unsubscribe()` in `_waitForSession` |

**Aanbeveling:** laten staan.

### Categorie C — bewust gedocumenteerd (3 stuks)

Met expliciete commentaar-regel die de policy uitlegt.

| Bestand | Regel | Reden |
|---|---|---|
| [sw.js](sw.js#L44) | 44-46 | Malformed URL → fallback naar `/` |
| [js/telemetry.js](js/telemetry.js#L343) | 343-345 | "Nooit de pagina laten breken vanwege telemetry" |
| [js/telemetry.js](js/telemetry.js#L283) | 283 | Disabled-tak van honeypot, telemetry mag falen |

**Aanbeveling:** laten staan.

### Categorie D — restjes

| Bestand | Regel | Wat |
|---|---|---|
| [js/animations/match-celebrate.js](js/animations/match-celebrate.js#L90) | 90 | `Audio.play()` autoplay-policy reject — bewust silent |
| [js/supabase.js](js/supabase.js#L118) | 118 | `sessionStorage.clear()` in clearUserState |
| [js/supabase.js](js/supabase.js#L158) | 158 | `clearUserState()` in idle-timeout — geen gebruiker meer om te tonen |
| [js/utils.js](js/utils.js#L452) | 452 | `setApplying(false)` in logout-error-path — alleen UI-reset |

**Aanbeveling:** laten staan.

## Conclusie & vervolgactie

- **2 P0-gevallen** vereisen een fix in sprint 5: bbl-hub.html:2480 (data-loss bij renewal-write) en company-dashboard.html:3154 (silent push-failure).
- **7 P1-gevallen** verdienen een `console.warn` met module-prefix — kost samen <30 minuten en geeft live-tester / sentry-achtige diagnose-grip.
- **29 P2-gevallen** zijn acceptabel of expliciet bedoeld; geen actie nodig.

### Voorgestelde sprint 5 mini-batch

1. bbl-hub.html:2480 — vervang lege catch door notify + early return
2. company-dashboard.html:3154 — log + notify bij falen push-registratie
3. P1-bulk: 7 × `console.warn(...)` toevoegen met `[module]`-prefix volgens [js/buddy.js:126](js/buddy.js#L126)-stijl
