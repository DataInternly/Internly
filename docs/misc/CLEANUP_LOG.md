# Cleanup pass — 2026-05-03

**Sessie** CC Cleanup Pass · post-audit P2-resten + FTP-walkthrough atomic fixes
**Standing order** Picard2 + Hotch2 + Tom Bomba
**EOS-reviewers** Blara + TQ + Hal + Garcia2

---

## Fase 1 — Public-footer atomic patches

### 1.1 — pricing.html Blog-link
- **Status**: geen actie nodig, **al aanwezig**
- **Verificatie**: [pricing.html:760](pricing.html#L760) bevat `<li><a href="blog.html">Blog</a></li>`
- **Verificatie**: [pricing.html:759](pricing.html#L759) bevat `<li><a href="kennisbank.html">Kennisbank</a></li>`
- **Reden al aanwezig**: eerdere CC Sessie B.1 (zie [TODO_FOOTER_REFACTOR.md:14](TODO_FOOTER_REFACTOR.md#L14)) heeft deze atomic fix al uitgevoerd

### 1.2 — about.html Kennisbank-link
- **Status**: geen actie nodig, **al aanwezig**
- **Verificatie**: [about.html:862](about.html#L862) bevat `<a href="kennisbank.html">Kennisbank</a>`
- **Verificatie**: [about.html:863](about.html#L863) bevat `<a href="https://internly.pro/blog">Blog</a>`
- **Reden al aanwezig**: eerdere CC Sessie B.2 (zie [TODO_FOOTER_REFACTOR.md:15](TODO_FOOTER_REFACTOR.md#L15)) heeft deze atomic fix al uitgevoerd
- **Drift gesignaleerd**: about.html footer heeft fundamenteel andere structuur dan index/pricing (`<div class="footer-links">` + flat `<a>` ipv `<ul>` met `<li>`-items, plus externe `https://internly.pro/blog` URL ipv interne `blog.html`). Niet gepatcht — past niet bij "geen invasieve wijzigingen". Drift staat al gelogd in [TODO_FOOTER_REFACTOR.md:15](TODO_FOOTER_REFACTOR.md#L15) en [TODO_FOOTER_REFACTOR.md:23](TODO_FOOTER_REFACTOR.md#L23)

### 1.x — internly-worldwide.html (TQ-check toegevoegd door Barry)
- **Status**: **gepatcht in deze sessie**
- **Bevinding**: Worldwide-footer (regels 1572-1578) bevatte alleen `How it works (NL)`, `Find an internship`, `Sign in` in Platform-kolom. Geen Blog, geen Kennisbank. Bevestigt FTP-walkthrough klacht over Engelstalige footer.
- **Patch**: Blog + Kennisbank toegevoegd aan Platform-kolom met `(NL)` suffix consistent met bestaande `How it works (NL)` patroon
- **Resultaat na patch**: [internly-worldwide.html:1574-1580](internly-worldwide.html#L1574-L1580)
  ```
  How it works (NL)
  Find an internship
  Knowledge base (NL)   ← nieuw
  Blog (NL)             ← nieuw
  Sign in
  ```
- **Niet gedaan**: volledige harmonisatie met index.html-link-set (Worldwide is bewust een minimal English-versie). Volledige harmonisatie hoort thuis in TODO_FOOTER_REFACTOR.md.

### 1.3 — Footer-jaar verificatie
- **Status**: **verified, geen actie nodig**
- **Grep `Internly 200X`**: 0 hits in *.html
- **Grep `© 20XX`**: alle production-files tonen `© 2026`
- **Files met © 2026 (sample)**: index.html:1812, about.html:871, pricing.html:773, faq.html:992, auth.html:692, all dashboards, admin.html, kennisbank.html, blog.html, internly-worldwide.html:1570, plus alle international-* dashboards
- **Niet gepatcht** (intentioneel): files in `BACKUP/` en `_revamp_2026-04-29/backups/` — die zijn archives, niet productie

---

## Fase 2 — TODO-files

### Nieuw aangemaakt deze sessie
- [TODO_LEARNING_AGREEMENT_RPC.md](TODO_LEARNING_AGREEMENT_RPC.md) — SECURITY DEFINER RPC ontwerp voor LA-signing flow, gekoppeld aan dropped la_token_unauth_update policy
- [TODO_NOTIFICATIONS_INSERT_HARDENING.md](TODO_NOTIFICATIONS_INSERT_HARDENING.md) — notif_insert_auth spam-vector, Pad A documentatie + grep-stappenplan
- [TODO_MESSAGES_TAMPER_TRIGGER.md](TODO_MESSAGES_TAMPER_TRIGGER.md) — prevent_message_tampering() trigger sjabloon voor sluitende kolom-restriction op messages
- [TODO_WORLDWIDE_REDESIGN.md](TODO_WORLDWIDE_REDESIGN.md) — visueel redesign Worldwide-pagina (groen globe-silhouet, stedenkaart dotted lines, blauw terugdringen). Toegevoegd na Barry-prompt punt 2; stond niet in oorspronkelijke fase-2 lijst

### Al aanwezig — niet overschreven
- [TODO_ACCOUNT_REFACTOR.md](TODO_ACCOUNT_REFACTOR.md) — bestaat al (rijke versie, 95 regels, gemaakt in eerdere sessie 2026-05-03 Fase A.1). Inhoud is uitgebreider dan instructie-template — overschrijven zou werk verliezen
- [TODO_FOOTER_REFACTOR.md](TODO_FOOTER_REFACTOR.md) — bestaat al (rijke versie, 82 regels, gemaakt in eerdere sessie 2026-05-03 Fase B). Bevat al meer detail (per-pagina lijst, drift-analyse, niet-doen-sectie) dan instructie-template

---

## Fase 3 — SQL P2-cleanup (door Barry handmatig in Supabase Console)

CC heeft GEEN SQL uitgevoerd. Build-regel 5 — filesystem en SQL strikt gescheiden. Barry runt blokken handmatig:

- **3.1** subscriptions: drie duplicate SELECT-policies droppen (`"eigen subscription lezen"`, `sub_own`, `sub_own_select`); `subscriptions_select_own` blijft canonical
- **3.2** matches: duplicate INSERT-policy `"own insert matches"` droppen; `matches_insert_party` blijft
- **3.3** push_subscriptions: duplicate FOR ALL `push_own` droppen; `"user manages own subscriptions"` blijft
- **3.4** applications: rol public → authenticated, FOR ALL gesplitst in expliciete CRUD-policies (`applications_select_own`, `applications_insert_own`, `applications_update_own`, `applications_delete_own`)
- **3.5** Eind-verifier op `pg_policies` group-by-`tablename,cmd` met `count(*) > 1`

Risico bij 3.4: als bedrijf-context ergens applications query't (bv. via posting), kan een nieuwe bedrijf-select-policy nodig zijn. Plak error in Supabase als die optreedt.

---

## Niet aangeraakt in deze sessie

- `js/telemetry.js` — codenames-bestand, alleen via CLAUDE.md vertaaltabel benaderbaar (spelregel 1)
- `match-dashboard.html` bedrijf viewer-perspectief — Fase F in CC_FIX_PLAN
- `renderGreetingHero` shared contract — Fase C in CC_FIX_PLAN
- `AccountModule` role-guard implementatie — Fase D in CC_FIX_PLAN, geparkeerd in TODO_ACCOUNT_REFACTOR.md
- White-on-white header bron — Fase E in CC_FIX_PLAN, wacht op DevTools-sessie

---

## Geblokkeerd, vereist menselijke beslissing

Geen blocker tegengekomen. Pre-sessie checklist heeft fase 1.1 + 1.2 herkend als "al gedaan" voordat patches werden uitgevoerd. Single nieuwe atomic patch (Worldwide-footer Blog + Kennisbank) is uitgevoerd binnen scope.

---

## Eind-overzicht git status verwacht

Modified deze sessie:
- `internly-worldwide.html` — 2 regels toegevoegd in footer Platform-kolom

Nieuw deze sessie:
- `CLEANUP_LOG.md`
- `TODO_LEARNING_AGREEMENT_RPC.md`
- `TODO_NOTIFICATIONS_INSERT_HARDENING.md`
- `TODO_MESSAGES_TAMPER_TRIGGER.md`
- `TODO_WORLDWIDE_REDESIGN.md`

Niet aangeraakt (al aanwezig):
- `TODO_ACCOUNT_REFACTOR.md`
- `TODO_FOOTER_REFACTOR.md`
- `pricing.html`
- `about.html`
