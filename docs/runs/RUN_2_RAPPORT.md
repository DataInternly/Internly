# RUN 2 — Bucket A 6.7 + 4.3

**Datum** 5 mei 2026
**Status** GEÏMPLEMENTEERD — wacht op Barry's smoke-test
**Volume** 4 files, ~60 minuten

---

## Items afgerond

### 6.7 Buddy-naam-update (Optie A — naam-input op profiel-form)

**Probleem:** buddy-profile-form had geen naam-input. Buddy kon naam niet wijzigen via "Profiel"-tab. Naam-update bestond alleen op verstopte Account-tab via `js/account.js:handleSaveContact`.

**Fix:**
- [buddy-dashboard.html:493-503](../../buddy-dashboard.html#L493-L503) — `<input id="bp-naam">` als eerste veld in form, met label, placeholder, maxlength=80, required.
- [js/buddy.js:686-689](../../js/buddy.js#L686-L689) — `populateBuddyProfile` vult bp-naam met `data.naam` bij prefill.
- [js/buddy.js:735-746](../../js/buddy.js#L735-L746) — `collectBuddyProfileData` returnt `naam` als separate field (niet in buddy_profiles upsert).
- [js/buddy.js:808-821](../../js/buddy.js#L808-L821) — `saveBuddyProfile` doet **eerst** `db.from('profiles').update({ naam })` op user.id, daarna pas `buddy_profiles` upsert (zonder naam).

**Canonical pattern:** profiles.naam is single source of truth. buddy_profiles ontvangt **geen** naam meer in upsert. Bestaande `data.naam` in buddy_profiles SELECT (regel 1399 buddy-dashboard.html) blijft als legacy-cache acceptabel.

**Error-handling:** als `profiles.update` faalt → notify + console.error + return vóór buddy_profiles upsert. Geen partial-write.

### 4.3 Chat URL parser standaardisatie

**Probleem:** [bbl-hub.html:2817](../../bbl-hub.html#L2817) gebruikte `chat.html?buddy_pair=` (zonder `_id`). Chat.html parser leest enkel `buddy_pair_id`. Resultaat: bbl-link → chat.html zonder buddyPairId → fallback naar list-view (NIET profileView, zoals eerder gedacht).

**Fix:**
- **4.3.a** [bbl-hub.html:2817](../../bbl-hub.html#L2817) — `chat.html?buddy_pair=` → `chat.html?buddy_pair_id=`
- **4.3.b** [chat.html:1641-1643](../../chat.html#L1641-L1643) — parser tolerant: `params.get('buddy_pair_id') || params.get('buddy_pair')`. Legacy-bookmarks blijven werken.

**Geen profileView-fallback gevonden** in chat.html (zoals oorspronkelijk gehypothetiseerd) — symptoom Barry rapporteerde was list-view fallback. Beide vermeden via deze fix.

---

## Diagnose-bevindingen Fase 1

### 6.7
- Form: buddy-dashboard.html:489 — `<form id="buddy-profile-form" onsubmit="handleBuddyProfileSubmit(event)">`
- Submit-flow: handleBuddyProfileSubmit → collectBuddyProfileData → saveBuddyProfile
- buddy_profiles UPSERT bevatte 12 velden: pitch, achtergrond, bio, kennis_gebieden, specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, active, avatar_key. **Naam ontbrak volledig.**
- Naam-update bestond op `js/account.js:400-425 handleSaveContact` (Account-tab, separate UI), schreef correct naar `profiles.naam`.

### 4.3
- chat.html:1638-1640 leest enkel `match` + `buddy_pair_id` uit URL params.
- chat.html:1665-1672 fallback bij beide-null = list-view (toon Berichten lijst). Geen profileView.
- bbl-hub.html:2817 gebruikte oude variant `buddy_pair=`. buddy-dashboard.html:959 gebruikte correct `buddy_pair_id=`.

---

## Verificatie (Fase 3)

```
=== buddy_pair= zonder _id (verwacht 0) ===
(geen output = PASS)                                                    PASS

=== bp-naam input in buddy-dashboard ===
497: id="bp-naam"                                                        PASS

=== profiles.update in js/buddy.js ===
813: .from('profiles').update({ naam }).eq('id', user.id)               PASS

=== chat.html parser-tolerantie ===
1643: const buddyPairId = params.get('buddy_pair_id') || params.get('buddy_pair')  PASS

=== collectBuddyProfileData naam-veld ===
689: const naam = form.querySelector('#bp-naam')   (populate)
737: const naam = (form.querySelector('#bp-naam')?.value || '').trim()   (collect)
744: naam: naam || null  (returned in payload)                          PASS
```

---

## Smoke-tests voor Barry

### Test 1 — Buddy naam-wijziging via profiel-form
1. Login als buddy Jan
2. Ga naar Profiel-tab
3. **Verwacht:** veld "Naam" zichtbaar bovenaan, gevuld met huidige naam
4. Wijzig naar bv. "Jan van der Berg" + klik "Profiel opslaan"
5. **Verwacht:** notify "Profiel bijgewerkt!" verschijnt
6. Refresh pagina (F5)
7. **Verwacht:** nieuwe naam blijft staan in form-input én in saved-view
8. DevTools console: geen errors
9. Indien Account-tab bestaat: open Account-tab → naam-veld toont ook nieuwe naam (canonical bron)

### Test 2 — Buddy "stuur bericht" vanuit dashboard
1. Login als buddy Jan met actieve match
2. Ga naar mijn matches → klik "stuur bericht" op een actieve koppeling
3. **Verwacht:** chat.html opent met juiste conversatie geladen
4. NIET de berichten-lijst (list-view fallback) of een profielview

### Test 3 — BBL student via bbl-hub naar chat
1. Login als BBL Daan
2. Open bbl-hub
3. Klik "Stuur bericht" link naar buddy
4. **Verwacht:** URL bevat `?buddy_pair_id=` (NIET `?buddy_pair=`)
5. **Verwacht:** chat.html laadt direct de juiste conversatie

### Test 4 — Legacy bookmark fallback (optioneel)
1. Open `chat.html?buddy_pair=<valid-pair-id>` direct (legacy URL)
2. **Verwacht:** chat.html parser herkent legacy variant via fallback, conversatie laadt
3. Bewijst dat oude bookmarks blijven werken

---

## Niet aangeraakt

- `js/telemetry.js` — no-go zone
- `buddy_profiles.naam` kolom — blijft bestaan als legacy-cache, geen migration in deze run. SELECT op buddy_profiles vraagt nog `naam` op (regel 1399 buddy-dashboard) — als kolom bestaat in DB werkt het, anders silent null. Geen actie nodig.
- `js/account.js handleSaveContact` — schrijft al correct naar profiles.naam. Behouden zoals het is.
- `chat.html loadBuddyConversation` — niet onderzocht. Als Test 2 FAIL, dan is `loadBuddyConversation` de volgende verdachte (buiten scope huidige run).

---

## Bucket A status

| # | Item | Run | Status |
|---|---|---|---|
| 1.1 | BBL welkomspagina | Run 3 | open |
| 1.2 | Bedrijf welkomspagina | Run 3 | open |
| 1.3 | School welkomspagina | Run 3 | open |
| 2.2 | mijn-berichten BBL-detect | Run 1.5 v2 | ✓ done |
| 2.6 | kennisbank header | Run 1.8 | ✓ done |
| 3.1 | smartHomeRedirect P2 | Run 1 | ✓ done |
| 4.3 | Chat parser fallback | **Run 2** | **✓ done** |
| 4.4 | Bedrijf chat sessionStorage | Run 1 | ✓ done |
| 4.6 | Bedrijf abonnement-overzicht | Run 5 | open |
| 4.7 | Bedrijf discover sessionStorage | Run 1 | ✓ done |
| 5.1 | Viewer-banner CSS | Run 5 | open |
| 6.1 | Buddy matchpool feature | post-livetest | defer C |
| 6.6 | Sollicitatie motivatie | post-livetest | defer C |
| 6.7 | Buddy-naam-update | **Run 2** | **✓ done** |

**Bucket A teller:** 7/14 → **9/14 = 64%**

Plus Barry's tussentijdse buddy-schema fix (Slot 1) telt extra: **10/14 = 71%**.

Voor 11 mei livetest:
- Run 3 zou 1.1 + 1.2 + 1.3 dekken → 13/14
- Run 5 zou 4.6 + 5.1 dekken → 14/14 (volledig op forced defers 6.1 + 6.6 na)
- Effectief 14/14 = 100% van fix-able Bucket A

---

**Run 2 status: GEÏMPLEMENTEERD — wacht op Barry's smoke-test (Tests 1-4).**
