# DEAD FILES INVENTORY — Internly
**Scan-datum** 2026-05-04 · **Sessie** CC AFTERWORK PASS · **Standing order** Picard2 + Hotch2 + Tom Bomba

Inventarisatie van kandidaat-files voor delete. **NIETS gedeletet.** Categorisatie alleen. Barry reviewt categorie A voor delete-actie.

---

## Totalen

- **Kandidaat-files gescand** 43
- **Categorie A (veilig)** 40
- **Categorie B (in gebruik)** 0
- **Categorie C (handmatige check)** 7

---

## Scan-bron

```
find c:/Projects/Internly/BACKUP -type f
find c:/Projects/Internly/_revamp_2026-04-29 -type f
find c:/Projects/Internly -maxdepth 4 -name "*.bak" -o -name "*.old" -o -name "*.backup" -o -name "*~"
```

Cross-reference grep:
```
.bak / BACKUP/ / .backup. / _revamp_ / example_auth|chat|dashboard|subpage / kb.js
binnen *.html en *.js (excl. _archief/)
```

---

## A — Veilig om te deleten

Geen referenties gevonden in actieve `*.html` of `*.js`. Backup-naming met datum-stempel.

### A.1 — Root .bak files (3)

| Path | Size | Last modified |
|---|---|---|
| `kennisbank-artikel.html.bak` | 8.4 KB | 2026-05-01 13:03 |
| `kennisbank.html.bak` | 13.1 KB | 2026-05-01 13:03 |
| `js/kb.js.bak` | 15.3 KB | 2026-05-01 13:03 |

Note: actieve `kb.js` wordt nog gebruikt door `kennisbank.html` en `kennisbank-artikel.html`. Alleen de `.bak` varianten zijn dood.

### A.2 — BACKUP/ folder (9)

| Path | Size | Last modified |
|---|---|---|
| `BACKUP/chat.backup.2026-04-20-0904.html` | 46.5 KB | 2026-04-20 09:04 |
| `BACKUP/company-dashboard.backup.2026-04-20.html` | 119.2 KB | 2026-04-20 09:33 |
| `BACKUP/company-discover.backup.2026-04-21-sf1.html` | 21.2 KB | 2026-04-20 09:15 |
| `BACKUP/discover.backup.2026-04-20-0904.html` | 61.0 KB | 2026-04-20 09:04 |
| `BACKUP/index.backup.2026-04-19-p15.html` | 66.8 KB | 2026-04-19 16:56 |
| `BACKUP/index.backup.2026-04-20-tiles.html` | 75.7 KB | 2026-04-20 08:55 |
| `BACKUP/match-dashboard.backup.2026-04-20-0904.html` | 252.9 KB | 2026-04-20 09:04 |
| `BACKUP/matches.backup.2026-04-20-0904.html` | 36.9 KB | 2026-04-20 09:04 |
| `BACKUP/mijn-sollicitaties.backup.2026-04-20-0904.html` | 35.8 KB | 2026-04-20 09:04 |

### A.3 — _revamp_2026-04-29/backups/ (28)

| Path | Size | Last modified |
|---|---|---|
| `_revamp_2026-04-29/backups/about.backup.2026-04-29.html` | 36.6 KB | 2026-04-29 10:59 |
| `_revamp_2026-04-29/backups/admin.backup.2026-04-29.html` | 36.9 KB | 2026-04-29 13:14 |
| `_revamp_2026-04-29/backups/auth.backup.2026-04-29.html` | 39.5 KB | 2026-04-29 10:19 |
| `_revamp_2026-04-29/backups/bbl-dashboard.backup.2026-04-29.html` | 27.7 KB | 2026-04-29 13:05 |
| `_revamp_2026-04-29/backups/bbl-hub.backup.2026-04-29.html` | 121.2 KB | 2026-04-29 12:39 |
| `_revamp_2026-04-29/backups/buddy-dashboard.backup.2026-04-29.html` | 36.2 KB | 2026-04-29 13:12 |
| `_revamp_2026-04-29/backups/chat.backup.2026-04-29.html` | 71.8 KB | 2026-04-29 10:30 |
| `_revamp_2026-04-29/backups/company-dashboard.backup.2026-04-29.html` | 132.2 KB | 2026-04-29 13:01 |
| `_revamp_2026-04-29/backups/company-discover.backup.2026-04-29.html` | 21.8 KB | 2026-04-29 12:34 |
| `_revamp_2026-04-29/backups/discover.backup.2026-04-29.html` | 59.8 KB | 2026-04-29 10:40 |
| `_revamp_2026-04-29/backups/esg-rapportage.backup.2026-04-29.html` | 32.3 KB | 2026-04-29 12:11 |
| `_revamp_2026-04-29/backups/faq.backup.2026-04-29.html` | 38.6 KB | 2026-04-29 11:19 |
| `_revamp_2026-04-29/backups/index.backup.2026-04-29.html` | 79.2 KB | 2026-04-29 09:24 |
| `_revamp_2026-04-29/backups/kennisbank.backup.2026-04-29.html` | 8.7 KB | 2026-04-29 11:09 |
| `_revamp_2026-04-29/backups/match-dashboard.backup.2026-04-29.html` | 259.9 KB | 2026-04-29 12:44 |
| `_revamp_2026-04-29/backups/matches.backup.2026-04-29.html` | 31.2 KB | 2026-04-29 12:24 |
| `_revamp_2026-04-29/backups/mijn-sollicitaties.backup.2026-04-29.html` | 37.0 KB | 2026-04-29 12:29 |
| `_revamp_2026-04-29/backups/pricing.backup.2026-04-29.html` | 23.9 KB | 2026-04-29 11:13 |
| `_revamp_2026-04-29/backups/privacybeleid.backup.2026-04-29.html` | 25.4 KB | 2026-04-29 11:59 |
| `_revamp_2026-04-29/backups/school-dashboard.backup.2026-04-29.html` | 106.9 KB | 2026-04-29 13:03 |
| `_revamp_2026-04-29/backups/spelregels.backup.2026-04-29.html` | 16.7 KB | 2026-04-29 12:07 |
| `_revamp_2026-04-29/backups/student-profile.backup.2026-04-29.html` | 74.9 KB | 2026-04-29 10:53 |
| `_revamp_2026-04-29/backups/style.backup.2026-04-29.css` | 45.6 KB | 2026-04-29 09:59 |
| `_revamp_2026-04-29/backups/vacature-detail.backup.2026-04-29.html` | 47.3 KB | 2026-04-29 12:18 |
| `_revamp_2026-04-29/backups/js/roles.backup.2026-04-21-routing.js` | 3.5 KB | 2026-04-20 11:41 |
| `_revamp_2026-04-29/backups/js/utils.backup.2026-04-20-0904.js` | 11.8 KB | 2026-04-20 09:04 |
| `_revamp_2026-04-29/backups/js/utils.backup.2026-04-29.js` | 27.5 KB | 2026-04-22 16:13 |

### A — Optionele delete-suggesties (NIET uitgevoerd)

```
rm c:/Projects/Internly/kennisbank-artikel.html.bak
rm c:/Projects/Internly/kennisbank.html.bak
rm c:/Projects/Internly/js/kb.js.bak
rm -r c:/Projects/Internly/BACKUP/
rm -r c:/Projects/Internly/_revamp_2026-04-29/backups/
```

---

## B — In gebruik

Geen kandidaat-files met actieve referenties gevonden.

---

## C — Handmatige check

Geen backup-naming, maar wel binnen archief-folder. Zelfreferentie binnen `_revamp_2026-04-29/INTERNLY_REVAMP_HANDOVER_2026-04-29.md`. Mogelijk bewust archief.

| Path | Size | Last modified | Reden ambiguïteit |
|---|---|---|---|
| `_revamp_2026-04-29/example_auth.html` | 9.2 KB | 2026-04-29 07:49 | Design-voorbeeld in revamp-folder |
| `_revamp_2026-04-29/example_chat.html` | 13.6 KB | 2026-04-29 07:49 | Design-voorbeeld in revamp-folder |
| `_revamp_2026-04-29/example_dashboard.html` | 17.0 KB | 2026-04-29 07:49 | Design-voorbeeld in revamp-folder |
| `_revamp_2026-04-29/example_subpage.html` | 14.2 KB | 2026-04-29 07:49 | Design-voorbeeld in revamp-folder |
| `_revamp_2026-04-29/AUDIT_VERIFICATION_REPORT.md` | 27.8 KB | 2026-04-29 13:29 | Audit-document, mogelijk historisch belang |
| `_revamp_2026-04-29/INTERNLY_DESIGN_SYSTEM_2026-04-29.md` | 11.2 KB | 2026-04-29 07:49 | Design-systeem documentatie |
| `_revamp_2026-04-29/INTERNLY_REVAMP_HANDOVER_2026-04-29.md` | 8.9 KB | 2026-04-29 07:49 | Handover-document |

---

**Disclaimer** Barry reviewt categorie A voor delete-actie. Files niet aangeraakt in deze sessie.
