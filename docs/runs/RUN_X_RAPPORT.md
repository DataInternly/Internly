# RUN X — Backlog-reductie bundel

**Datum** 5 mei 2026
**Doel** 7 niet-impactvolle items af van backlog (5 documentatie + 2 kleine code-comments)
**Status** **5 KLAAR — 2 GEFLAGD voor Barry**
**Volume** ~30 minuten CC werk, geen runtime-risico
**Coördinatie** ná bundle-commit Run 1+1.5+1.6, vóór Run 2

---

## Items voltooid

| # | Item | Resultaat | Locatie |
|---|---|---|---|
| 1 | INTERNLY_HEADER_SPEC.md in docs/ | **GEFLAGD** | Barry moet handmatig plaatsen |
| 2 | INTERNLY_5RUN_FIX_PLAN_4MEI.md in docs/ | **GEFLAGD** | Barry moet handmatig plaatsen |
| 3 | CLAUDE.md clearUserState sectie | KLAAR | [CLAUDE.md:335-367](../../CLAUDE.md#L335-L367) |
| 4 | HANDOVER.md run-statussen | KLAAR | [HANDOVER.md](../../HANDOVER.md) — herschreven |
| 5 | Bedward smartHomeRedirect sign-off | KLAAR | [CLAUDE.md:370-391](../../CLAUDE.md#L370-L391) |
| 6 | Cluster 4.1 code-comment | KLAAR | [bbl-hub.html:2562-2565](../../bbl-hub.html#L2562-L2565) |
| 7 | Cluster 6.8 + 6.4 + 6.7 + 4.5 in repro-lijst | KLAAR | [HANDOVER.md § OPEN REPRO-VRAGEN](../../HANDOVER.md) |

---

## Item-detail

### Item 1 — INTERNLY_HEADER_SPEC.md

**Status:** ONTBREEKT in `docs/` directory.

```
$ test -f docs/INTERNLY_HEADER_SPEC.md
spec ✗ flag
```

**Actie voor Barry:** plaats het file handmatig in `c:\Projects\Internly\docs\`. Zonder dit document kan Run 4 (header-spec enforcement) niet starten.

### Item 2 — INTERNLY_5RUN_FIX_PLAN_4MEI.md

**Status:** ONTBREEKT in `docs/` directory.

```
$ test -f docs/INTERNLY_5RUN_FIX_PLAN_4MEI.md
plan ✗ flag
```

**Actie voor Barry:** zelfde patroon als Item 1.

### Item 3 — CLAUDE.md clearUserState sectie

Sectie "## ClearUserState helper (Run 1.6)" toegevoegd op [CLAUDE.md:335](../../CLAUDE.md#L335). Documenteert:
- PROTECTED_KEYS lijst (4 keys)
- Wanneer aanroepen (4 momenten)
- Patroon voor logout én pre-login
- Waarschuwing tegen handmatige `localStorage.clear()`

### Item 4 — HANDOVER.md update

[HANDOVER.md](../../HANDOVER.md) volledig herschreven met:
- Run 1, 1.5 v2, 1.6, 1.7, X statussen op één plek
- "Open repro-vragen" sectie (Item 7)
- "Volgende stappen" sectie
- "Backlog post-livetest" met 8 deferreed items

### Item 5 — Bedward smartHomeRedirect sign-off

Sectie "## smartHomeRedirect — waar wel en waar niet" toegevoegd op [CLAUDE.md:370](../../CLAUDE.md#L370). Documenteert:
- Verboden lijst (19 publieke pagina's, Bedward P2-overtreding)
- Toegestaan lijst (12 ingelogde pagina's)
- Reden per categorie
- Sign-off Bedward 5 mei 2026

### Item 6 — Cluster 4.1 code-comment in bbl-hub

[bbl-hub.html:2562-2565](../../bbl-hub.html#L2562-L2565) — comment-block toegevoegd bij `renderStudentHeader({ activeTab: 'discover' })`-aanroep. Waarom hier en niet bij een statische `matchpool.html` href: bbl-hub heeft geen statische matchpool-link — die wordt dynamisch gerenderd via `HEADER_NAV_BY_ROLE.student_bbl` ([js/utils.js:694](../../js/utils.js#L694)) waar de href correct staat. Comment legt vast dat audit cluster 4.1 ("tussensprong") een paint-cycle artefact is en geen routing-bug.

### Item 7 — Open repro-vragen sectie

[HANDOVER.md](../../HANDOVER.md) sectie "## OPEN REPRO-VRAGEN (post-livetest)" — bevat 4 audit-items zonder reproductie:
1. Cluster 6.8 — "maak profiel aan" message conditie onbekend
2. Cluster 6.4 — "zoekstagiaires" UI-string onvindbaar in code
3. Cluster 6.7 — buddy-naam-update form-submit handler onlokaliseerbaar
4. Cluster 4.5 — bedrijf "vorige pagina" vanaf abonnement (niet kritisch voor 11 mei)

---

## Verificatie

```
=== Item 1+2 (docs/) ===
spec ✗ flag
plan ✗ flag

=== Item 3 (CLAUDE.md) ===
335: ## ClearUserState helper (Run 1.6)
342: PROTECTED_KEYS — NIET wissen:                                    PASS

=== Item 5 (CLAUDE.md) ===
370: ## smartHomeRedirect — waar wel en waar niet (Bedward sign-off ...)
391: Sign-off Bedward 5 mei 2026: ...                                 PASS

=== Item 4 (HANDOVER.md) ===
51: ## RUN X STATUS — 5 mei 2026
55:   - Item 3 ... KLAAR
58:   - Item 6 ... KLAAR                                              PASS

=== Item 6 (bbl-hub) ===
2564: Audit cluster 4.1: door Barry gemelde
2565: "tussensprong" is een paint-cycle artefact ...                  PASS

=== Item 7 (HANDOVER) ===
68: ## OPEN REPRO-VRAGEN (post-livetest)
70: 1. Cluster 6.8 — ...
76: 2. Cluster 6.4 — ...                                              PASS
```

---

## Backlog-status na Run X

**Verkleind van:** ~10 open backlog-items naar ~8 (na deze run).

**Nog open in HANDOVER.md § Backlog post-livetest:**
- PUBLIC_PAGES consolidatie via js/config.js
- internly_saved_vacatures user-prefix migratie
- Multi-tab logout-sync (BroadcastChannel)
- kb-shared-footer als canonical voor alle ingelogde pagina's
- Bredere migratie renderRoleHeader → renderStudentHeader
- Schema audit-pass over alle pagina's
- guardPage migratie 11 dashboards
- Anon-key rotatie

**Open repro-vragen:** 4 items, allemaal afhankelijk van Barry-input tijdens of na livetest 11 mei.

---

## Voorgestelde commit (eigen commit, niet bundelen met Run 1.7)

```
chore: Run X — backlog-reductie bundel (Cat A + Cat B, 5 items)

- CLAUDE.md: clearUserState helper documentatie (Run 1.6 follow-up)
- CLAUDE.md: Bedward smartHomeRedirect sign-off (publiek/ingelogd splitsing)
- HANDOVER.md: run-statussen 1+1.5+1.6+1.7+X + open repro-vragen + backlog
- bbl-hub.html: comment cluster 4.1 (paint-cycle artefact, geen routing-bug)

Items 1+2 (docs/INTERNLY_HEADER_SPEC + 5RUN_FIX_PLAN) GEFLAGD —
Barry plaatst handmatig.

Geen runtime-impact. Documentatie + meta-cleanup.
Voorbereiding voor Run 2.
```

### FTP-target

Alleen `bbl-hub.html` (één regel comment-toevoeging).

`docs/`, `CLAUDE.md`, `HANDOVER.md` blijven lokaal/git only.

---

**Run X status: KLAAR — 5 van 7 items gedaan, 2 geflagd voor Barry. Geen commit zonder Barry's go.**
