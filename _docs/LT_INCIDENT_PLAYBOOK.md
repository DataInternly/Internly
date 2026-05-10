# LT Incident Playbook
Datum: 11-13 mei 2026
Versie: 1.0 (10 mei 2026, pre-LT)
Eigenaar: Barry · Backup: Pa

---

## Contacten

| Rol | Persoon | Bereikbaar via |
|-----|---------|----------------|
| Tech-lead | Barry | [TODO: telefoon invullen] |
| Bedrijfs-eigenaar | Pa | [TODO: telefoon invullen] |
| Supabase support | — | support@supabase.com (Pro plan SLA) |
| Antagonist hosting | — | [TODO: contact + login invullen] |
| Tester-comms (5 testers) | Pa | [TODO: WhatsApp groep-link] |

> Vóór maandag 9:00 alle TODO-velden invullen.

---

## Incident-categorieën

### Categorie A — Site down (504/timeout/blank)

**Symptoom**: tester ziet "Connection refused" / blanco scherm / 504.

1. Open https://internly.pro in incognito op laptop + telefoon
2. Check Antagonist status pagina (login → Server Status)
3. Check DNS via https://dnschecker.org/#A/internly.pro
4. Bij DNS OK + Apache down → activeer maintenance.html:
   - FTP: hernoem `index.html` naar `index_backup.html`
   - FTP: kopieer `maintenance.html` → `index.html`
5. Communicatie naar testers via WhatsApp groep:
   "We hebben een korte storing — we melden zodra het terug is."
6. Track ETA in maintenance.html `#eta` placeholder

### Categorie B — Database / Supabase down

**Symptoom**: site laadt maar geen data — toasts "Kon niet laden".

1. Open https://status.supabase.com — incident gerapporteerd?
2. Open Supabase dashboard → Database → Logs → recent errors
3. Activeer `503.html` via FTP-overschrijf van `index.html`
4. Geen actie behalve wachten — Supabase Pro = SLA-verzekerd
5. Contact: support@supabase.com bij >30 min uitval

### Categorie C — Data-leak vermoed

**Symptoom**: tester rapporteert data van andere gebruiker, of telemetry SecurityLog spike.

**DIRECT** (binnen 5 min):
1. Pa bellen — geen Slack/email
2. Pauzeer tester-comms (geen aankondigingen tot duidelijkheid)
3. Open Supabase Console → Auth → "Sign out all users" (forceert herauthenticatie)

**Onderzoek** (binnen 1u):
4. Open Supabase tabel `security_logs` (telemetry SecurityLog) — filter laatste uur
5. Vergelijk met Auth-logs voor IP/user-pattern
6. Documenteer findings in `_docs/INCIDENTS_2026-05-11.md`

**Escalatie** (binnen 72u indien bevestigd):
7. AP-melding overweging — https://autoriteitpersoonsgegevens.nl/datalek-melden
8. Tester-comms: transparant, AVG art. 34 (mededeling aan betrokkenen)

### Categorie D — Tester-bug rapport

**Symptoom**: tester WhatsApp/email met "X werkt niet".

1. Verzamel: rol + browser + URL + beschrijving + screenshot/video
2. Reproduceer in incognito op zelfde browser
3. Bug log toevoegen aan `BACKLOG.md` ## LT-bevindingen sectie
4. Triage:
   - **P0 (blocking)**: fix tijdens LT-window, FTP push direct
   - **P1 (annoying)**: fix vandaag, push bij volgende deploy-window
   - **P2 (cosmetic)**: log voor post-LT sprint

---

## Rollback procedures

### Code rollback (single commit terug)
```bash
git revert <hash>
# verifieer git log
git push origin main
```
FTP upload over productie (alleen gewijzigde files).

### Code rollback (terug naar pre-LT snapshot)
```bash
git checkout pre-LT-2026-05-11 -- .
# review changes
git commit -m "rollback: revert to pre-LT snapshot"
git push origin main
```
FTP volledige re-upload.

### DNS / hosting rollback
1. Antagonist DirectAdmin → File Manager → Backups
2. Selecteer pre-LT snapshot (handmatig gemaakt zondag 10 mei)
3. Restore

### Database rollback (Supabase Pro PITR)
1. Supabase dashboard → Database → Backups
2. Point-In-Time Recovery → kies timestamp vóór incident
3. Confirm restore (overschrijft DB!)

---

## Monitoring tabs (open vóór 9:00 maandag)

1. https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/logs/postgres-logs
2. https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/logs/auth-logs
3. https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/reports
4. https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/editor (SecurityLog tabel watching)
5. https://internly.pro/ (smoke check elke 30 min)
6. WhatsApp groep tester-comms

---

## Eerste-uur acties (9:00-10:00 maandag)

| Tijd | Actie | Door |
|------|-------|------|
| 09:00 | Welkom-bericht naar testers (WhatsApp) | Pa |
| 09:05 | Pre-LT snapshot maken: `git tag pre-LT-2026-05-11` (al gedaan) | Barry |
| 09:15 | Eerste smoke-check incognito (3 rollen × 1 flow) | Barry |
| 09:30 | Status-check log-tabs | Barry |
| 09:45 | Eerste tester-feedback verzamelen | Pa |
| 10:00 | 1-uur metrics: aantal signups, aantal errors | Barry |

---

## SLA / Recovery targets (LT-window)

| Categorie | Tester-impact | Doel-resolutie |
|-----------|---------------|----------------|
| A — site down | Test gestopt | < 30 min |
| B — DB down | Functies kapot | < 60 min (Supabase SLA) |
| C — data leak | Privacy-risico | < 5 min mitigatie + 1u onderzoek |
| D — bug | Functie geblokkeerd | P0: < 2u · P1: < 24u · P2: post-LT |

---

## Post-LT debrief (woensdag 13 mei 17:00+)

- [ ] BACKLOG.md ## LT-bevindingen volledig
- [ ] Incident-log opgesteld (indien Cat. A/B/C voorgekomen)
- [ ] Tester-survey verzonden (Pa)
- [ ] Test-data cleanup-SQL geverifieerd vóór run (zie `sql/post-LT-cleanup-DRAFT.sql`)
- [ ] git tag `post-LT-2026-05-13` aanmaken
