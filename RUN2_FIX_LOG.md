# RUN2 FIX LOG — Pre-deploy blockers
**Datum** 2026-05-04 · **Standing order** Picard2 + Hotch2 + Tom Bomba · **Modus** SEQUENTIEEL · **Geen js/telemetry.js**

Twee fixes voor de high-severity issues uit `RUN2_PREDEPLOY_AUDIT.md`. Daarna verifier-resultaten.

---

## Fix 1 — js/buddy.js B-6 (loadBuddyProfile SELECT)

**Status:** voltooid

**Locatie:** [js/buddy.js:669-673](js/buddy.js#L669-L673)

**Wijziging:**

| Veld | Voor | Na |
|---|---|---|
| SELECT-clause | `kennis_gebieden, specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, active` (7 kolommen) | `pitch, achtergrond, bio, avatar_key, kennis_gebieden, specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, active` (11 kolommen) |

**Geen logica-wijzigingen elders in `loadBuddyProfile`.** `populateBuddyProfile` (regel 688-695) had al de defensieve null-checks voor de 4 nieuwe velden — werkt nu volledig.

**Geen wijzigingen aan `saveBuddyProfile`** — die had al de juiste re-fetch SELECT op regel 820.

**Verwacht resultaat na deploy:** bij eerste pagina-load van buddy-dashboard worden `pitch`, `achtergrond`, `bio`, `avatar_key` correct uit `buddy_profiles` geladen en in het form pregevuld. Geen lege velden meer voor terugkerende gebruikers.

**Stop-condities:** geen geraakt. SELECT-clause structuur matchte audit-verwachting exact.

---

## Fix 2 — BUDDY_PROFILE_RUN2_MIGRATION.sql (nieuw bestand)

**Status:** voltooid

**Locatie:** [BUDDY_PROFILE_RUN2_MIGRATION.sql](BUDDY_PROFILE_RUN2_MIGRATION.sql) — project-root, nieuw bestand

**Inhoud:** ALTER TABLE buddy_profiles met `ADD COLUMN IF NOT EXISTS` voor 4 kolommen:
- `pitch text`
- `achtergrond text`
- `bio text`
- `avatar_key text`

Plus header-comment-block met datum, context, velden-omschrijving en idempotentie-noot. Eind-statement `SELECT 'buddy_profile_run2_migration_ready'` voor verificatie-feedback.

**Format-consistentie:** matcht stijl van `AVATAR_MIGRATION.sql` en `BACKLOG_MIGRATION.sql` (header-comment + ALTER met IF NOT EXISTS + status-SELECT).

**Doel:** schema-reproduceerbaarheid. Volgens Barry's eerdere SQL-check bestaan de kolommen al in productie — deze migratie is voor traceability en lokale dev-reset, niet voor productie-aanvulling.

**Stop-condities:** geen geraakt. Bestand bestond niet, schone nieuwe write.

---

## Verifier-resultaten

### V.1 — grep op pitch/achtergrond/bio/avatar_key in js/buddy.js

```
671: .select('pitch, achtergrond, bio, avatar_key, kennis_gebieden, ...
       specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, active')
                                                ↑ loadBuddyProfile  ✓ NIEUW
688-695: populateBuddyProfile #bp-pitch / #bp-achtergrond / #bp-bio
725: prefillBuddyForm — data.avatar_key → window._internlyAvatarKey
731-738: collectBuddyProfileData verzamelt pitch/achtergrond/bio
802: saveBuddyProfile payload.avatar_key
820: .select('... pitch, bio, achtergrond, ... avatar_key')
                                                ↑ saveBuddyProfile re-fetch  ✓ ONGEWIJZIGD
855: fetchBuddySeekers — student_profiles.avatar_key (try/catch fallback)
```

**Bevinding:** zowel `loadBuddyProfile` (load-flow) als `saveBuddyProfile` (re-fetch flow) hebben nu de 4 RUN2-velden. Synchronisatie tussen SELECT en render-functies is hersteld (P8 — Kant + Data2).

### V.2 — node --check js/buddy.js

```
buddy.js OK
```

✓ Syntactisch correct.

### V.3 — view BUDDY_PROFILE_RUN2_MIGRATION.sql

| Item | Status |
|---|---|
| Header-comment met datum + context | ✓ regel 1-17 |
| ALTER TABLE buddy_profiles | ✓ regel 19 |
| `ADD COLUMN IF NOT EXISTS pitch text` | ✓ regel 20 |
| `ADD COLUMN IF NOT EXISTS achtergrond text` | ✓ regel 21 |
| `ADD COLUMN IF NOT EXISTS bio text` | ✓ regel 22 |
| `ADD COLUMN IF NOT EXISTS avatar_key text` | ✓ regel 23 |
| Status-SELECT | ✓ regel 25 |
| Idempotent pattern | ✓ alle 4 kolommen |

---

## Eindstatus

| Fix | Status | FTP-blocker geadresseerd? |
|---|---|---|
| B-6 — loadBuddyProfile SELECT | voltooid | ✓ ja |
| BUDDY_PROFILE_RUN2_MIGRATION.sql | voltooid | ✓ ja (reproduceerbaarheid) |

**RUN2 FTP-blockers opgelost.** Coupled set is nu deploy-klaar:

```
js/buddy.js                       (gewijzigd in deze sessie)
js/avatar.js                      (untracked, ongewijzigd)
js/profileView.js                 (untracked, ongewijzigd)
js/welcome-overlay.js             (untracked, ongewijzigd)
BUDDY_PROFILE_RUN2_MIGRATION.sql  (nieuw, niet via FTP — Supabase Console)
```

**Niet aangeraakt:** js/telemetry.js, geen wijzigingen aan andere productie-files (HTML, CSS), geen overige SQL.

**Volgende stap voor jou:**
1. Eventueel `BUDDY_PROFILE_RUN2_MIGRATION.sql` runnen in Supabase SQL Editor (idempotent, no-op als kolommen al bestaan).
2. Coupled FTP-upload van de 4 JS-files naar productie.
3. Smoke-test op buddy-dashboard.html: terugkerende buddy ziet pitch/bio/achtergrond pregevuld in form.

**Medium-severity issues** (B-7 jsonb, B-12 zoekt_buddy migration) zijn niet in deze fix-run aangepakt — die hangen af van DB-schema-bevestiging die jij in Supabase doet.

**Low-severity opruimwerk** (B-1, B-2, B-3, B-8, A-3) blijft post-livetest tech-debt.
