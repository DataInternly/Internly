# All-Hands Council Audit Rapport
**Datum**: 22 april 2026
**Aanleiding**: Internly All-Hands Council — planeet Iros
**Uitvoerder**: Claude Code (claude-sonnet-4-6)
**Op basis van**: 19 items over vier prioriteitsniveaus

---

## 0. Tally

| Categorie | Aantal |
|-----------|--------|
| ✅ Auto-fixes uitgevoerd (nieuwe documenten) | **4** |
| 🔶 Approval-drafts klaarstaan | **1 SQL-draft** |
| 📋 Manual / deferred items | **10** |
| 🛑 CRITICAL flags | **0** |
| Nieuwe bestanden aangemaakt | SMOKE_TEST_CHECKLIST.md, MIGRATIONS_HARD_WON.md, DEAD_CODE_REPORT_2026-04-22.md, SRI_HASHES_TODO.md, SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql |

---

## 1. Per-item bevindingen

---

### 🔴 CRITICAL (0 items)
Geen CRITICAL issues aangetroffen in deze audit.

---

### 🟠 HIGH items

#### Item 9 — Duplicate RLS policies (7/11)
**Status**: ⚠️ Bevestigd — significant meer duplicaten dan Layer 3 al rapporteerde

Layer 3 identificeerde al matches (6) + notifications (4). All-Hands audit onthult:

| Tabel | Policies | Duplicaat-paren |
|-------|---------|----------------|
| `buddy_requests` | **8** | 3 sets duplicaten (INSERT×2, SELECT×2, UPDATE×3) |
| `matches` | 6 | 3 paren (Layer 3 al gedocumenteerd) |
| `profiles` | 5 | mogelijk paar (own insert profile + profiles_insert_own) |
| `messages` | 5 | mogelijk paar (own update messages + messages_participants) |
| `meetings` | 4 | mogelijk paar (meet_update_party + meeting parties) |
| `notifications` | 4 | Layer 3 al gedocumenteerd |

**Meest urgente cleanup**: `buddy_requests` — 4 van 8 policies zijn redundant.
**Draft klaar**: `SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql`
**Actie voor Barry**: review en activeer de draft.

#### Item 6 — SRI-hashes op CDN-links (The Worm)
**Status**: ⚠️ Geen enkel CDN-script heeft SRI-hash

26 HTML-bestanden laden supabase-js zonder `integrity=` attribuut.
Hashes berekend en klaar in `SRI_HASHES_TODO.md`:
- jspdf 2.5.1: `sha384-OLBgp1...` (stabiel, al gepind)
- emoji-mart 5.5.2: `sha384-gGElBOlm...` (stabiel, al gepind)
- supabase-js@2: vereist eerst pinnen naar specifieke versie

**Actie voor Barry**: review `SRI_HASHES_TODO.md` en voeg toe per bestand.

---

### 🟡 MEDIUM items

#### Item 16 — match-dashboard.html splitsing (De Sensei)
**Status**: 🚨 FLAG — **6141 regels** — urgenter dan verwacht

```
match-dashboard.html:  6141 regels  ← must-split
company-dashboard.html: 2940 regels  ← op de grens
bbl-hub.html:          2692 regels
school-dashboard.html: 2443 regels
discover.html:         1403 regels
```

match-dashboard.html op 6141 is significant onderhoudsprobleem. Aanbeveling:
opsplitsen in minimaal 3 bestanden (hub-shell.html + hub-stage.js + hub-eval.js).
**Niet nu uitvoeren** — vereist Sprint-planning en testing.

#### Item 17 — Dead code in utils.js (De Sensei)
**Status**: 3 verwijderbare functies geïdentificeerd

| Functie | Externe usages | Status |
|---------|---------------|--------|
| `fetchUserRole` | 0 | Dood — veilig te verwijderen |
| `getUnreadTotal` | 0 | Dood — veilig te verwijderen |
| `getUserMode` | 0 | Dood — veilig te verwijderen |
| `requireMode` | 1 | Kandidaat voor verwijdering afhankelijk van caller |

**Rapport**: `DEAD_CODE_REPORT_2026-04-22.md`
**Actie**: Sprint 5 cleanup — geen urgentie.

#### Item 7 — Rate-limit signup (Unsub Knob)
**Status**: ❌ Niet aanwezig

auth.html bevat alleen `db.auth.signUp()` — geen captcha, geen rate-limit, geen bot-protection.
Supabase Auth heeft ingebouwde rate-limiting (server-side), maar er is geen frontend-drempel.
**Aanbeveling**: Cloudflare Turnstile toevoegen aan signup-formulier.
**Actie voor Barry**: beslissing of dit pre-livetest vereist is.

#### Item 15 — Inline-JS naar modules refactor (Bismarck)
**Status**: Defer — significant werk

match-dashboard.html alleen al heeft ~6000 regels inline JS. Dit is structurele schuld.
**Niet in scope voor deze audit** — aparte sprint.

---

### 🟢 NICE-TO-HAVE items

#### Item 1 — Smoke test checklist (Geordi2)
**Status**: ✅ Aangemaakt — `SMOKE_TEST_CHECKLIST.md`
Bevat alle 8 Geordi2-scenario's + extra checks (auth guard, console clean, FTP-volgorde).

#### Item 8 — Smoke-test-checklist
**Status**: ✅ Opgelost via item 1.

#### Item 13 — Onboarding mini-tour (Blara)
**Status**: Niet aanwezig in productie-app.
`internly_simulator.html` bevat een onboarding-scene maar dat is een apart demo-bestand.
**Defer**: Sprint 5+ — vereist design-werk.

#### Item 14 — Data-export + account-delete (Guinan2 / AVG)
**Status**: Gedeeltelijk
- ESG-export voor bedrijven: ✅ aanwezig (sessionStorage → print flow)
- Gebruiker-data-export (AVG art. 20): ❌ niet aanwezig
- Account-delete flow (AVG art. 17): ❌ niet aanwezig
**Aanbeveling**: voor livetest met echte gebruikers vereist.

#### Item 18 — Migratie-versiehistorie (Tom Bomba)
**Status**: ✅ Aangemaakt — `MIGRATIONS_HARD_WON.md`
`internly_migration.sql` bestond al (initieel schema). Nieuw log-bestand gedocumenteerd
met Sprint 2, Layer 3 hardening, kolomnaam-correcties.

---

## 2. Items die al opgelost waren

| Item | Status | Bewijs |
|------|--------|--------|
| Item 3 — Privacyverklaring | ✅ Opgelost | `privacybeleid.html` bestaat, gelinkt vanuit `auth.html:438` |
| Item 5 — CSP in .htaccess | ✅ Aanwezig | CSP-header aanwezig (Layer 3 al gedocumenteerd — uses `'unsafe-inline'`) |
| Item 10 — Mollie CSP | ⏸ Deferred | Mollie niet actief — stub. Geen actie. |
| Item 19 — Wisdom-mode | ⏸ Deferred | Research project — Sprint 5+ |

---

## 3. Manual checks — Barry's actielijst

| # | Item | Actie |
|---|------|-------|
| 1 | **Email confirmation** | Supabase Dashboard → Authentication → Settings → check "Confirm email" = ON |
| 2 | **FTP status** | Controleer of alle Sprint 3 bestanden geüpload zijn na smoke-test |
| 3 | **Rate-limit signup** | Beslissing: Cloudflare Turnstile toevoegen vóór livetest? |
| 4 | **Brand-vocab** | Jean Goodway / Barry — definitie 'stage' vs 'stage-plek' vs 'stageplaats' |
| 5 | **AVG data-export** | Tijdlijn voor account-delete + data-export UI bepalen |

---

## 4. Aanbevolen volgorde voor Barry

```
1. Lees dit rapport (5 min)
2. Voer manual checks uit (email-confirmation, FTP) (10 min)
3. Review SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql → go/no-go (15 min)
4. Review SRI_HASHES_TODO.md → wanneer SRI toevoegen? (10 min)
5. Geordi2's smoke-test uitvoeren na FTP (SMOKE_TEST_CHECKLIST.md) (8 min)
6. Eerste echte gebruikers uitnodigen
```

---

## 5. Aangemaakt in deze audit

| Bestand | Doel |
|---------|------|
| [`SMOKE_TEST_CHECKLIST.md`](SMOKE_TEST_CHECKLIST.md) | 10-stappen smoke-test voor elke FTP upload |
| [`MIGRATIONS_HARD_WON.md`](MIGRATIONS_HARD_WON.md) | Schema-wijzigingen log voor toekomstige migraties |
| [`DEAD_CODE_REPORT_2026-04-22.md`](DEAD_CODE_REPORT_2026-04-22.md) | utils.js dead functions — Sprint 5 cleanup kandidaten |
| [`SRI_HASHES_TODO.md`](SRI_HASHES_TODO.md) | SRI hashes voor 3 CDN-dependencies (manual apply) |
| [`SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql`](SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql) | Commented-out DROP POLICY statements — requires approval |

---

*All-Hands Council Audit — 22 april 2026*
*Crew: Picard2, Bedward, Hal, 7/11, De Sensei, Geordi2, Guinan2, Unsub Knob, The Worm, Polly, Jean Goodway, Blara, Bismarck, Dax2, Tom Bomba*
