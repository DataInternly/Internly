# Run 5 — Mijn notities feature
Datum: 1 mei 2026
Voorwaarden: Run 5a SQL (`buddy_notes` tabel + RLS policies) **moet handmatig in Supabase gedraaid zijn vóór live-test** — CC heeft dat niet kunnen verifiëren. Run 1 (`renderRoleHeader`/`requireRole`) en Run 4 zijn beide gevalideerd vóór start.

## Resultaat

| Stap | Status | Bestand |
|---|---|---|
| 1 — Nav-item enabled (`disabled`/`comingSoon` weg) | APPLIED | [js/utils.js:462](js/utils.js#L462) |
| 2 — `mijn-notities.html` aangemaakt | APPLIED | [mijn-notities.html](mijn-notities.html) (NIEUW, 371 regels) |
| 3 — Verify grep checks | DONE | 4 `buddy_notes` refs (CRUD), nav-item zonder disabled-flag |
| 4 — Smoke-test plan gedocumenteerd | DONE | (zie sectie hieronder) |

## Nieuwe page-statistieken

- **Regels**: 371 (HTML+CSS+JS in één file, conform de andere standalone Internly-pagina's)
- **CRUD operaties** geïmplementeerd:
  - **SELECT** — `loadNotes()` (regel 251): `buddy_notes` ORDER BY `updated_at DESC` met `eq('buddy_id', user.id)` filter
  - **INSERT** — `createNote()` (regel 313): nieuwe notitie met `buddy_id`, default `title='Nieuwe notitie'`, leeg `content`
  - **UPDATE** — `saveActive()` (regel 285) met **800ms debounce** via `scheduleSave()` op input-events; double-filtered op `id` + `buddy_id` voor RLS-defensieve safety
  - **DELETE** — `deleteActive()` (regel 326): met `confirm()` dialog, double-filtered op `id` + `buddy_id`
- **RLS-veilig**: alle operaties filteren expliciet op `buddy_id = user.id` (zelfs UPDATE/DELETE waar RLS dat ook zou doen — defense in depth)
- **Beforeunload save**: hangende debounce-save wordt afgevuurd vóór page-leave zodat geen tekst verloren gaat
- **Auto-open**: bij load opent de meest recent bewerkte notitie automatisch in editor (UX: gebruiker hoeft niet te klikken)
- **Auto-sort**: na elke save wordt de lijst opnieuw gesorteerd op updated_at zodat actieve notitie naar top schuift

## UI/UX details

- **Two-pane layout**: 320px sidebar lijst + flex-grow editor (responsive: 1-kolom op ≤760px met max-height 320px op lijst)
- **Sticky lijst-pane** (top: 80px) — blijft zichtbaar bij scrollen lange notitie
- **Active-state**: paarse linker-border (#7c3aed) + lichte tint background (#ede9fe) op geselecteerde notitie
- **Caret-color**: paars (#7c3aed) op title-input én body-textarea — consistent met de buddy-rol kleur uit Run 4
- **Privacy-disclaimer onderaan**: expliciet "Alleen voor jou zichtbaar" met 🔒-icoon — aangepast aan deze role-aware sweep
- **Empty states**: aparte empty (geen notitie geopend) + lijst-empty (geen notities) + delete-success-empty
- **Time format**: relatieve tijd ("zojuist" / "X min geleden" / "vandaag · HH:MM" / "gisteren · HH:MM" / Nederlandse short-date)

## Onverwachte vondsten

1. **`window.db` was niet expliciet beschikbaar in inline-script** — eerste poging gebruikte `const { db } = window;` uit het instructie-snippet, maar ik heb het simpeler gemaakt door direct `db.from(...)` aan te roepen (db is global vanuit js/supabase.js, lijn 12 — `window.db = db`). Zonder destructure-conflict.
2. **Script-volgorde uitgebreid**: instructie laadde alleen `js/supabase.js` + `js/utils.js`. Toegevoegd: `js/roles.js` (vereist door utils.js voor `getRoleLanding`), supabase CDN, `js/toast.js` (voor `notify()`-fallback). Match nu de volgorde van andere app-pagina's.
3. **`escapeHtml` is global** uit utils.js — gebruikt zonder import voor titel/content render. Defensief tegen XSS in user-content.
4. **`saveActive` retry niet gebouwd** — als netwerk faalt zien gebruikers `notify('Opslaan mislukt')` maar de wijziging blijft in de DOM. Handmatig opnieuw bewerken triggert nieuwe debounce. Acceptabel voor MVP; queue/retry kan later.
5. **Geen markdown/rich-text editor** — bewust kept simple per scope. Plain-text textarea met `white-space: pre-wrap` rendering. Toekomstige variant kan EditorJS of Tiptap toevoegen.
6. **`buddy_notes` schema** wordt aangenomen als: `id`, `buddy_id`, `title`, `content`, `created_at`, `updated_at`. Als Run 5a SQL andere kolomnamen gebruikt (bv. `user_id` ipv `buddy_id`), zal client-side fail. Bij eerste browser-test in console te checken.

## Smoke-test door Barry vereist

**Voorwaarde**: SQL Run 5a uitgevoerd in Supabase met:
- `buddy_notes` tabel (id uuid PK, buddy_id uuid FK→profiles.id, title text, content text, created_at timestamptz, updated_at timestamptz)
- RLS aan met 4 policies: SELECT/INSERT/UPDATE/DELETE allemaal `buddy_id = auth.uid()` 
- Optioneel: trigger om `updated_at` automatisch te updaten bij UPDATE
- Optioneel: seed-rij "Welkom bij je notitieboekje" voor test-buddy

**Smoke-test pad**:

1. Login als `buddy1@internly.pro` (of een andere `gepensioneerd`-rol account)
2. Klik **"Mijn notities"** in nav-header — moet niet meer disabled/grijs zijn
3. Pagina laadt op `mijn-notities.html`, top-nav toont buddy-naam + paarse active-state op "Mijn notities"-tab
4. Lijst links toont 1 notitie (als seed gerund) of empty-state "Nog geen notities. Klik op + Nieuwe."
5. Klik op een bestaande notitie — opent in editor rechts met titel + body
6. Klik **"+ Nieuwe"** — nieuwe notitie verschijnt bovenaan lijst, editor opent leeg met titel "Nieuwe notitie" geselecteerd voor direct typen
7. Type iets in titel of body — na 800ms autosave (geen visueel feedback maar geen errors in console; lijst-tijdstempel update naar "zojuist")
8. Refresh de pagina — nieuwe content nog aanwezig, sortering klopt (laatst bewerkte bovenaan)
9. Klik **"Verwijderen"** op een notitie — `confirm()`-dialog, accept, notitie weg, lijst update, eerstvolgende notitie auto-open
10. Browser console: 0 errors, 0 warnings buiten de gewone Supabase-realtime info

**Negatieve tests**:
- Login als student → klik directe URL `/mijn-notities.html` → `requireRole('gepensioneerd')` redirect naar `discover.html` (student landing). Geen toegang.
- Open DevTools → Network → poging om een andere buddy's notitie te SELECT-en via Supabase REST: RLS policy `buddy_id = auth.uid()` blokkeert.

## Status hele Sprint

| Run | Doel | Status |
|---|---|---|
| Run 1 | Foundation modules (`withSaveLock` + `renderRoleHeader` + `js/profileView.js`) | ✓ APPLIED |
| Run 2 | Buddy dashboard integratie (form-velden + sections + saved-view + top-nav) | ✓ APPLIED |
| Run 2.5 | Nav click-fix + design polish (z-index 110, pill active-state) | ✓ APPLIED |
| Run 3 | mijn-berichten rol-aware + avatar sweep | ✓ APPLIED |
| Run 4 | Buddy Overzicht redesign (greeting + identity-card + setting-cards) | ✓ APPLIED |
| Run 5 | mijn-notities feature | ✓ APPLIED — wacht op Run 5a SQL + browser-test |

Alle CC-werk is af. Resterend: Run 5a SQL handmatig in Supabase + browser-smoke-test door Barry op alle 6 runs (volgorde: Run 1 → Run 2/2.5 → Run 3 → Run 4 → Run 5).
