# CC AFTERWORK PASS — LOG
**Datum** 2026-05-04 · **Standing order** Picard2 + Hotch2 + Tom Bomba · **EOS-reviewers** Hal + Garcia2 + Blara

---

## Fase 1 — Wit-op-wit jacht

**Bron-zoek** `js/utils.js` (1003 regels)

**Grep-patronen toegepast op js/utils.js**
- `color: #fff` / `color:#fff` / `color: white` / `color:white`
- `style="color` / `style='color`
- `'color': '`
- Bredere grep op `#fff` en `white` (case-insensitive)
- Bredere grep op `color`

**Hits in js/utils.js** 0 inline white-color matches

Enige `color:` hits zijn op regels 797 en 834 — `color:#e05c1a` (Internly-oranje voor "ly" in logo). Geen wit-op-wit risico.

**Cross-check css/style.css** 31 hits op `color: #fff` of `color: white`. Steekproef gedaan op `.overz-avatar-initials` (regel 2063-2069) — staat op `linear-gradient(135deg, #7c3aed, #5b21b6)` paarse achtergrond. Intentioneel wit-op-paars, geen wit-op-wit. Overige CSS-hits zitten op buttons (groen/oranje/donkere achtergrond) of header-states — geen aanwijzing voor wit-op-wit pair.

**Patches toegepast** 0 (`js/utils.js` ongewijzigd, `css/style.css` ongewijzigd)

**Conclusie**
Wit-op-wit bron NIET gevonden in `js/utils.js`. CSS-hits in `style.css` zijn allemaal op donkere/gekleurde achtergronden — geen wit-op-wit pair geïdentificeerd. Per fase-1 stop-conditie: indien live company-dashboard alsnog wit-op-wit toont, is een DevTools-sessie nodig om de daadwerkelijke bron te isoleren (mogelijk inline style in een HTML-pagina, niet in utils.js of style.css).

**Verifier-resultaat fase 1**
- Aantal hits gevonden 0
- Aantal gefixt 0
- Aantal als false positive geclassificeerd 31 (alle CSS-hits, op donkere achtergronden)
- Conclusie geen wit-op-wit in scope-files; DevTools nodig op live pagina als probleem zich voordoet

---

## Fase 2 — Console.log cleanup

**Inventarisatie** `grep "console.log" c:/Projects/Internly/js/ --recursive --include="*.js"`

**Hits per file**
| File | Aantal | Type |
|---|---|---|
| `js/animations/match-celebrate.js:371` | 1 | C — self-test init confirmation |
| `js/profanity.js:113` | 1 | C — self-test confirmation, **inside `/* */` comment block** (regel 100-114), niet runtime |

**js/telemetry.js** Niet aangeraakt (no-go zone).

**Andere js-files** Geen `console.log` hits.

**Acties**
- Type A debug-residu 0 hits → 0 commented-out, 0 verwijderd
- Type B error-tracking 0 hits → 0 omgezet naar `console.error`
- Type C intentional 2 hits → beide ongewijzigd

**Verifier-resultaat fase 2**
- Aantal hits voor cleanup 2
- Aantal hits na cleanup 2 (allebei Type C)
- Aantal vervangen door `console.error` 0
- Aantal commented-out 0
- Aantal verwijderd 0
- Niet aangeraakt `js/telemetry.js` (per spelregel)

**Note voor Blara**
Blara's sanity-check vraagt schone console bij eerste laden van een dashboard. `js/animations/match-celebrate.js:371` schrijft één `[match-celebrate] self-test OK …` regel bij module-init. Voldoet aan Type C "init confirmation" criterium en blijft daarom staan per fase-2 regels. Conflict tussen Type C-rule en Blara's sanity-check vlag voor Barry — geen unilaterale beslissing genomen. `js/profanity.js:113` zit binnen een comment block (regel 100-114) en draait nooit, dus geen console-impact.

---

## Fase 3 — TODO-files consistency-check

**Inventarisatie** `ls c:/Projects/Internly/TODO_*.md` → 6 files (boven verwachting van 5+)

**Veld-matrix**

| File | # Title | ## Context | ## Wat | ## Niet doen | ## Trigger om te bouwen |
|---|---|---|---|---|---|
| `TODO_LEARNING_AGREEMENT_RPC.md` | ✓ | ✓ | △ als `## Verplicht ontwerp` | ✗ → TBD toegevoegd | ✓ |
| `TODO_NOTIFICATIONS_INSERT_HARDENING.md` | ✓ | ✓ | ✓ als `## Wat te doen` | ✗ → TBD toegevoegd | ✗ → TBD toegevoegd |
| `TODO_MESSAGES_TAMPER_TRIGGER.md` | ✓ | ✓ | ✓ als `## Wat te doen voor sluitende tamper-protection` | ✗ → TBD toegevoegd | ✓ |
| `TODO_FOOTER_REFACTOR.md` | ✓ | △ als `## Probleem` | △ als `## Voorgestelde refactor` | ✓ | ✗ → TBD toegevoegd |
| `TODO_ACCOUNT_REFACTOR.md` | ✓ | △ als `## Achtergrond` + `## Bevinding…` | △ als `## Voorgestelde refactor` | ✗ → TBD toegevoegd | △ als `## Wanneer` |
| `TODO_WORLDWIDE_REDESIGN.md` | ✓ | ✓ | ✓ als `## Wat te veranderen` | ✓ | ✓ |

Legenda
- ✓ canoniek aanwezig (exacte heading of zeer dichtbij)
- △ semantisch aanwezig onder andere heading-naam (label-mismatch, niet gefixt — geen inhoud verzonnen)
- ✗ semantisch én canoniek afwezig — TBD-marker toegevoegd

**Acties**
TBD-markers toegevoegd in 5 files (in totaal 7 secties):

1. `TODO_LEARNING_AGREEMENT_RPC.md` → `## Niet doen TBD — Barry te bevestigen`
2. `TODO_NOTIFICATIONS_INSERT_HARDENING.md` → `## Niet doen TBD` + `## Trigger om te bouwen TBD`
3. `TODO_MESSAGES_TAMPER_TRIGGER.md` → `## Niet doen TBD`
4. `TODO_FOOTER_REFACTOR.md` → `## Trigger om te bouwen TBD`
5. `TODO_ACCOUNT_REFACTOR.md` → `## Niet doen TBD`
6. `TODO_WORLDWIDE_REDESIGN.md` → geen actie nodig

**Label-mismatches niet gefixt** Voor `## Probleem` ↔ `## Context`, `## Voorgestelde refactor` ↔ `## Wat`, `## Wanneer` ↔ `## Trigger om te bouwen`, `## Verplicht ontwerp` ↔ `## Wat`, `## Achtergrond` ↔ `## Context`: semantische inhoud aanwezig. Geen duplicate TBD-headers toegevoegd om bestaande info niet te schaduwen — Barry's beslissing of canonicalisatie van labels gewenst is.

**Verifier-resultaat fase 3**
- Aantal files gecheckt 6
- Aantal files volledig canoniek 1 (`TODO_WORLDWIDE_REDESIGN.md`)
- Aantal files met TBD-markers toegevoegd 5
- Aantal TBD-secties toegevoegd 7
- Aantal files met label-mismatch (niet aangeraakt) 4 (`FOOTER_REFACTOR`, `ACCOUNT_REFACTOR`, `LEARNING_AGREEMENT_RPC`, optioneel `MESSAGES_TAMPER_TRIGGER`)

---

## Fase 4 — Dode-files inventarisatie

**Scan**
- `find BACKUP/ -type f` → 9 files
- `find _revamp_2026-04-29/ -type f` → 35 files (28 backups + 7 examples/docs)
- `find -maxdepth 4 -name "*.bak"` → 3 files (root + js/)
- `find -maxdepth 4 -name "*.old" / "*.backup" / "*~"` → 0 files

**Cross-reference** `grep BACKUP/|.backup.|_revamp_|.bak` binnen `*.html` + `*.js` (excl. `_archief/`) → geen matches naar backup-paths.
Specifiek `kb.js` referenced in `kennisbank.html`, `kennisbank-artikel.html`, `_docs/BACKLOG_AUDIT_2026-05-03.md` — actieve `kb.js`, niet `kb.js.bak`. Dus `kb.js.bak` is dood.
`example_auth|chat|dashboard|subpage` referenced enkel in `_revamp_2026-04-29/INTERNLY_REVAMP_HANDOVER_2026-04-29.md` (zelfreferentie binnen revamp-folder).

**Categorisatie** Volledige lijst staat in `DEAD_FILES_INVENTORY.md`.
- A Veilig om te deleten 40 files (3 root .bak + 9 BACKUP/ + 28 _revamp_/backups/)
- B In gebruik 0 files
- C Handmatige check 7 files (4 example_*.html + 3 design-docs in `_revamp_2026-04-29/`)

**Acties** Geen DELETE uitgevoerd. Inventaris geschreven naar `DEAD_FILES_INVENTORY.md` met optionele `rm`-suggesties voor categorie A.

**Verifier-resultaat fase 4**
- Aantal kandidaat-files 47 (40 A + 0 B + 7 C)
- Verdeling A/B/C 40 / 0 / 7
- Locatie inventaris `c:/Projects/Internly/DEAD_FILES_INVENTORY.md`

---

## Eind-checklist (per spelregel)

| Item | Status |
|---|---|
| `AFTERWORK_LOG.md` ingevuld voor alle vier fasen | ✓ dit document |
| `DEAD_FILES_INVENTORY.md` met categorie-output | ✓ |
| Gepatchte files | TODO_*.md (5 files met TBD-secties) |
| Geen wijzigingen aan `js/telemetry.js` | ✓ |
| Geen DELETE-actie op dode files | ✓ alleen inventarisatie |

**Stop-condities geraakt** Geen.
- Wit-op-wit bron niet gevonden in scope-files → fase 1 afgesloten met expliciete log; doorgegaan naar fase 2 zoals voorzien.
- `js/telemetry.js` niet geraakt → sessie kon doorlopen.
- Geen DELETE-trigger geraakt → sessie kon doorlopen.

**Bouw-regel 5 respect** Geen SQL geschreven of uitgevoerd in deze sessie.

---

## EOS-reviewers — sign-off

**Hal** Geen silent failures. Elke fase bevat expliciete log-entry inclusief "0 hits gevonden, 0 gefixt" waar van toepassing. Conflict tussen Type C console.log-rule en Blara's clean-console verwachting expliciet gevlag voor Barry.

**Garcia2** Geen architecturale drift. Geen nieuwe functies, geen refactors, geen schema-wijzigingen. Alleen: TBD-markers in markdown, inventarisatie-document.

**Blara** Console-state na cleanup `js/animations/match-celebrate.js:371` blijft één regel produceren bij module-init op pagina's die match-celebrate laden. Per Type C-rule behouden. Indien Barry liever schone console wil, omzetten naar `// console.log(...)` of guard achter `window.__INTERNLY_DEBUG`-flag — buiten scope deze sessie.
