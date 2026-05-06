# RUN 2 DIAGNOSE — Item 6.7 silent fail

**Datum** 5 mei 2026
**Trigger** Smoke-test toonde DB onveranderd na "Profiel opslaan" klik. Geen visible error.
**Status** READ-ONLY diagnose voltooid — wacht op Barry-beslissing.

---

## Functie-body's (letterlijk)

### saveBuddyProfile — [js/buddy.js:804-862](../../js/buddy.js#L804-L862)

```js
async function saveBuddyProfile(formData) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { notify('Niet ingelogd', false); return; }

  // Run 2 6.7 — split naam-write: profiles.naam is canonical, niet buddy_profiles
  const { naam, ...buddyFields } = formData;

  if (naam) {
    const { error: nameErr } = await db
      .from('profiles')
      .update({ naam })
      .eq('id', user.id);
    if (nameErr) {
      notify('Naam opslaan mislukt — probeer opnieuw', false);
      console.error('[buddy-dash] saveBuddyProfile naam-update fout:', nameErr.message);
      return;
    }
  }

  const payload = {
    profile_id: user.id,
    ...buddyFields,
    avatar_key: window._internlyAvatarKey || null
  };

  const { error } = await db
    .from('buddy_profiles')
    .upsert(payload, { onConflict: 'profile_id' });

  if (error) {
    notify('Profiel opslaan mislukt — probeer opnieuw', false);
    console.error('[buddy-dash] saveBuddyProfile fout:', error.message);
    return;
  }
  notify('Profiel bijgewerkt!', true);

  // Re-fetch + showBuddyOverzicht (regel 840-861) ...
}
```

### collectBuddyProfileData — [js/buddy.js:734-756](../../js/buddy.js#L734-L756)

```js
function collectBuddyProfileData(form) {
  const naam        = (form.querySelector('#bp-naam')?.value        || '').trim();
  const pitch       = (form.querySelector('#bp-pitch')?.value       || '').trim();
  const achtergrond = (form.querySelector('#bp-achtergrond')?.value || '').trim();
  const bio         = (form.querySelector('#bp-bio')?.value         || '').trim();

  return {
    naam:                 naam        || null,
    pitch:                pitch       || null,
    // ... rest
  };
}
```

### populateBuddyProfile — [js/buddy.js:684-722](../../js/buddy.js#L684-L722)

```js
function populateBuddyProfile(form, data) {
  if (!form || !data) return;

  // Run 2 6.7 — naam-input prefill
  const naam = form.querySelector('#bp-naam');
  if (naam && data.naam) naam.value = data.naam;
  // ... rest
}
```

### handleBuddyProfileSubmit — [buddy-dashboard.html:747-757](../../buddy-dashboard.html#L747-L757)

```js
async function handleBuddyProfileSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const data = collectBuddyProfileData(form);
  if (typeof withSaveLock === 'function') {
    await withSaveLock(submitBtn, async () => {
      await saveBuddyProfile(data);
    });
  } else {
    await saveBuddyProfile(data);
  }
}
```

### withSaveLock — [js/utils.js:535-554](../../js/utils.js#L535-L554)

Try/finally wrapper, disabled button tijdens save, errors propageren naar caller. **Geen silent fail.**

---

## Form-markup — [buddy-dashboard.html:489-503](../../buddy-dashboard.html#L489-L503)

```html
<form id="buddy-profile-form" onsubmit="handleBuddyProfileSubmit(event)">
  <div id="avatar-picker-container"></div>

  <!-- ─── Naam (Run 2 6.7 — schrijft naar profiles.naam canonical) ─── -->
  <div class="profile-field" style="margin-top:14px;">
    <label for="bp-naam">Naam</label>
    <input type="text"
           id="bp-naam"
           name="naam"
           maxlength="80"
           required
           placeholder="Hoe je heet — zichtbaar voor studenten">
  </div>
  ...
</form>
```

`required` attribute aanwezig — browser-native validation blokkeert submit bij leeg veld.

---

## RLS-policies profiles — [internly_migration.sql:540-552](../../internly_migration.sql#L540-L552)

```sql
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());
```

**Geen kolom-restrictie. Geen WITH CHECK.** User mag elk veld in eigen rij bijwerken.

**Maar:** PostgREST silent-row behavior — als USING-clause faalt of er is geen matching rij, returnt UPDATE met 200 OK + 0 rows changed. Geen error in Supabase JS response.

---

## Bevindingen per hypothese

### Hypothese A — RLS-blokkade
**WEERLEGD.** `profiles_update_own` policy `FOR UPDATE USING (id = auth.uid())` laat user UPDATE eigen rij toe. Geen kolom-restrictie. Buddy is een gewone authenticated user.

### Hypothese B — bp-naam input wordt niet correct gelezen
**WEERLEGD.** `collectBuddyProfileData` regel 737 leest `form.querySelector('#bp-naam')?.value` — ID matcht form. Trim correct. Returnt `naam || null` in object. Spread `const { naam, ...buddyFields }` op regel 809 destructureert correct.

### Hypothese C — saveBuddyProfile-flow stopt vóór UPDATE-call
**ONBESLIST — meest waarschijnlijk.**
- `if (naam)` guard op regel 811: als naam=null/empty → skip UPDATE → buddy_profiles upsert gaat door → notify("Profiel bijgewerkt!") — gebruiker ziet success, maar profiles.naam onveranderd.
- HTML5 `required` attribute zou submit moeten blokkeren bij leeg veld → handler zou niet draaien. Tenzij:
  - Form-state heeft een verstopte default-value die als "valid" telt (placeholder is geen value)
  - withSaveLock wrapper interfereert (niet gevonden in code-inspectie)

### Hypothese D — populate haalt naam uit verkeerde bron
**ONBESLIST — bevestigend bewijs aanwezig.**
- `populateBuddyProfile` regel 689-690: `if (naam && data.naam) naam.value = data.naam`
- `data` komt uit buddy_profiles SELECT ([buddy-dashboard.html:1399](../../buddy-dashboard.html#L1399))
- Als `buddy_profiles.naam` null is in DB → input blijft leeg → user moet naam typen → required-attr blokkeert submit als leeg
- **MAAR:** als gebruiker WEL naam invoerde, zou submit doorgaan en hypothese C verklaring nodig hebben
- Re-fetch op regel 849-852 valt al terug op profiles.naam: `if (!refreshed.naam) { profiles.select('naam') ... }` — maar pas NA save. Prefill heeft geen vergelijkbare fallback.

### Hypothese E (NIEUW) — profiles UPDATE matcht 0 rijen, silent success
**ONBESLIST — sterk verdacht.**
- PostgREST/Supabase v2: `.update({ naam }).eq('id', user.id)` zonder `.select()` returnt geen row-count. Als 0 rows matchen (profiles-entry voor user.id ontbreekt of RLS-USING-clause filtert weg) → geen `error` → code denkt success → buddy_profiles.upsert gaat door → notify("Profiel bijgewerkt!").
- Profiles-row voor buddy testaccount Jan ontbreekt mogelijk (auto-insert trigger niet gedraaid? handmatige seed gemist?)
- De update is een silent no-op. **DB onveranderd. Geen visible error.** Exact wat Barry observeerde.

### Hypothese F (NIEUW) — Re-fetch overschrijft cache met oude data
**WEERLEGD.** Re-fetch (regel 842-861) leest uit DB en vult `showBuddyOverzicht`. Render-laag, niet write-laag. Kan render-bug veroorzaken maar NIET DB-onveranderd.

---

## Meest waarschijnlijke root cause

**Hypothese E (silent 0-rows update).** De UPDATE-call slaagt zonder error maar raakt geen rij omdat ofwel (a) profiles-entry voor de buddy-user mist, ofwel (b) een edge-case in RLS de USING-clause faalt zonder error te signaleren. Code gaat door naar buddy_profiles.upsert (die wel werkt) en notify "Profiel bijgewerkt!". DB-`profiles.naam` blijft onveranderd, maar gebruiker ziet success-melding.

**Plus mogelijk Hypothese D als secundair:** als prefill bp-naam leeg liet (data.naam=null uit buddy_profiles), gebruiker typt nieuwe naam → submit werkt voor buddy_profiles maar profiles is onbestaand/onbereikbaar → silent fail.

---

## Voorgestelde fix

**Defensief: forceer expliciete row-count check.** Voeg `.select()` toe aan de UPDATE en valideer dat ≥1 rij geraakt is.

**Patch op [js/buddy.js:811-821](../../js/buddy.js#L811-L821):**

```js
if (naam) {
  const { data: updated, error: nameErr } = await db
    .from('profiles')
    .update({ naam })
    .eq('id', user.id)
    .select('id, naam');                    // <-- NIEUW: returnt geüpdatet rijen

  if (nameErr) {
    notify('Naam opslaan mislukt — probeer opnieuw', false);
    console.error('[buddy-dash] saveBuddyProfile naam-update fout:', nameErr.message);
    return;
  }
  if (!updated || updated.length === 0) {  // <-- NIEUW: silent 0-rows guard
    notify('Naam niet opgeslagen — profiel ontbreekt', false);
    console.error('[buddy-dash] profiles UPDATE raakte 0 rijen voor user', user.id,
                  '— profiles-entry ontbreekt of RLS blokkeert');
    return;
  }
}
```

**Optioneel — prefill-robustness (Hypothese D mitigatie):**

Pas [buddy-dashboard.html:1407-1413](../../buddy-dashboard.html#L1407-L1413) aan om naam uit profiles als fallback te lezen vóór prefill:

```js
// Run 2.1 — prefill bp-naam met profiles.naam fallback
if (bpRow && (!bpRow.naam) && profile?.naam) {
  bpRow.naam = profile.naam;
}
if (bpRow && typeof prefillBuddyForm === 'function') {
  prefillBuddyForm(bpRow);
}
```

Eis: `profile` (uit eerdere profiles-fetch) beschikbaar in init-scope. Verifieer voor patch.

---

## Smoke-test om fix te verifieren

1. **DevTools open + Network tab.** Login als buddy Jan.
2. Open Profiel-tab, wijzig naam, klik "Profiel opslaan".
3. **Verwacht na fix:**
   - **Als profiles-entry bestaat:** notify "Profiel bijgewerkt!" + DB profiles.naam = nieuwe waarde.
   - **Als profiles-entry mist:** notify "Naam niet opgeslagen — profiel ontbreekt" + console.error met user.id + GEEN buddy_profiles upsert (return vóór).
4. Inspect Network response van `/rest/v1/profiles?id=eq.<user-id>` PATCH — body bevat array met 1 of 0 rijen.

**Geen smoke met huidige code mogelijk** — die geeft success-feedback ongeacht resultaat.

---

## Vraag voor Barry

1. **Bestaat er een profiles-row voor buddy Jan testaccount (`jan.buddy@internly.pro`)?** Quick check in Supabase Console:
   ```sql
   SELECT id, naam, role FROM profiles
   WHERE id = (SELECT id FROM auth.users WHERE email = 'jan.buddy@internly.pro');
   ```
   - Geen rij → Hypothese E bevestigd, profiles-row missen is root cause
   - Wel rij → andere hypothese (mogelijk RLS-edge-case of caching)

2. **Wil je dat ik de defensieve fix toepas (Optie 1: alleen `.select() + 0-rows-guard`) of beide (Optie 2: + prefill-fallback)?**

3. **Schema-fix nodig?** Als profiles-row mist, is dat een data-issue voor 1 testaccount of breder gat (signup-trigger ontbreekt)?

---

**Diagnose-status: COMPLEET — geen code-wijzigingen.**
