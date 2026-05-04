# BOL SOLLICITATIE FLOW + BUNDEL A — 30 apr 2026

## BUNDEL A

| Fix | File:Line | Status | Notes |
|---|---|---|---|
| A1 | [school-dashboard.html:1306](school-dashboard.html#L1306) | DONE | `avatar_key` toegevoegd aan `student_profiles` SELECT (bundle-active query) |
| A1 | [school-dashboard.html:1312](school-dashboard.html#L1312) | DONE | `avatar_key` toegevoegd aan `student_profiles` SELECT (school-name query) |
| A1 | [match-dashboard.html:2882](match-dashboard.html#L2882) | DONE | `avatar_key` toegevoegd aan `student_profiles` SELECT in `loadMatchFromDB` |
| A1 | [chat.html:983](chat.html#L983) | DONE | `avatar_key` toegevoegd aan `profiles` SELECT (otherParty resolve) |
| A1 | [chat.html:1246](chat.html#L1246) | DONE | `avatar_key` toegevoegd aan `profiles` SELECT in `renderConversationList` |
| A1 | [mijn-berichten.html:553](mijn-berichten.html#L553) | DONE | `avatar_key` toegevoegd aan `profiles` SELECT (pending-requests fromProfiles) |
| A1 | [mijn-berichten.html:620](mijn-berichten.html#L620) | DONE | `avatar_key` toegevoegd aan `profiles` SELECT (otherProfiles batch) |
| A1 | [mijn-berichten.html:702](mijn-berichten.html#L702) | DONE | `avatar_key` toegevoegd aan `profiles` SELECT (zoek modal) |
| A2 | [bbl-dashboard.html:535](bbl-dashboard.html#L535) | DONE | Role guard ingevoegd direct na !user check; non-student → `getRoleLanding(role)` |
| A2 | [bbl-hub.html:2485](bbl-hub.html#L2485) | DONE | Zelfde role guard ingevoegd direct na !user check |
| A3 | [internly-worldwide.html:12](internly-worldwide.html#L12) | DONE | `<script src="js/supabase.js"></script>` toegevoegd na CDN-script |
| A3 | [internly-worldwide.html:1656-1668](internly-worldwide.html#L1656) | DONE | Inline `SUPA_KEY` constante verwijderd; gebruikt nu `window.db` (al gemaakt door js/supabase.js) met fallback via `window.__SUPABASE_ANON_KEY` |
| A4 | [company-dashboard.html:633-636](company-dashboard.html#L633) | DONE | `<span class="nav-badge" id="badge-studenten">` toegevoegd binnen `nav-studenten` knop |
| A4 | [company-dashboard.html:1660-1689](company-dashboard.html#L1660) | DONE | `updateStudentenBadge(count)` + `loadStudentenBadge(userId)` helpers toegevoegd vóór `loadCompanyStudenten` |
| A4 | [company-dashboard.html:~1697](company-dashboard.html#L1697) | DONE | `updateStudentenBadge((matchRows||[]).length)` aangeroepen in `loadCompanyStudenten` direct na de fetch |
| A4 | [company-dashboard.html:~3065](company-dashboard.html#L3065) | DONE | `loadStudentenBadge(user.id)` aangeroepen in DOMContentLoaded init flow direct na `loadUnreadBadge` |

---

## BOL FIX 1 — MOTIVATIEBRIEF

**Modal location:** [vacature-detail.html:843-895](vacature-detail.html#L843) — modal HTML ingevoegd direct onder `.btn-row`.

**Functions added:** [vacature-detail.html:898-922](vacature-detail.html#L898) — `openMotivatieModal()`, `sluitMotivatieModal()`, `updateMotivatieCount()`, `verstuurSollicitatie()`.

**Button changed:** [vacature-detail.html:838-840](vacature-detail.html#L838) — `onclick="handleSave()"` → `onclick="openMotivatieModal()"`. Label van `🔖 Opslaan voor later` → `🔖 Solliciteer →`.

**handleSave signature:** [vacature-detail.html:923](vacature-detail.html#L923) — `handleSave()` → `handleSave(motivatieText)`. `motivatie` lokaal afgeleid via `(typeof motivatieText === 'string') ? motivatieText : ''`.

**Motivatie saved as:** **localStorage** (geen `motivatie` kolom in [internly_migration.sql:147-158](internly_migration.sql#L147) `applications` tabel). Twee keys:
- `internly_motiv_pending_internship_<v.id>` voor de legacy `internships` source
- `internly_motiv_pending_posting_<v.id>` voor de modern `internship_postings` source

**Auto-post als eerste chatbericht:** [chat.html:1027-1067](chat.html#L1027) — nieuwe async functie `maybePostPendingMotivatie(mId)` aangeroepen direct na conversation init. Logica:
1. Alleen voor student aan `party_a` kant
2. Alleen als `messages` count = 0 (eerste opening)
3. Format: `'💬 Motivatie student: ' + motivatie`
4. Bij succes: localStorage entry verwijderd

**Original apply function:** `handleSave()` op [vacature-detail.html:923](vacature-detail.html#L923).

---

## BOL FIX 2 — STATUS LABELS

| File | Function added | Location | Before → After |
|---|---|---|---|
| [mijn-sollicitaties.html](mijn-sollicitaties.html) | `statusLabelStudent(status)` | [:248-257](mijn-sollicitaties.html#L248) | `<span class="tag green">✓ Uitgenodigd</span>` → `<span class="tag green">${statusLabelStudent(_rawStatus)}</span>` (zelfde voor wacht/afgewezen tags) |
| [company-dashboard.html](company-dashboard.html) | `statusLabel` map herschreven | [:1595-1602](company-dashboard.html#L1595) | `{pending:'In behandeling', accepted:'Geaccepteerd', rejected:'Afgewezen', active:'Actief'}` → `{pending:'📩 Nieuwe aanmelding', accepted:'✓ Geaccepteerd', active:'🎯 Stage loopt', rejected:'✕ Afgewezen', ended:'✓ Stage afgerond'}` |
| [school-dashboard.html](school-dashboard.html) | `statusLabelSchool(status)` helper + `faseLabel` map herschreven | [:1463-1471](school-dashboard.html#L1463) helper, [:1486-1492](school-dashboard.html#L1486) map | `{actief:'Stage loopt', risico:'⚠ Let op', zoekend:'Zoekend'}` → `{actief:'🎯 Stage loopt', risico:'⚠ Stage loopt — let op', zoekend:'👁 Sollicitatie'}` (school-dashboard gebruikt afgeleide statussen, dus `statusLabelSchool` is helper voor toekomstige flows met raw DB-status) |

**Note over school-dashboard:** dashboard gebruikt afgeleide statussen `actief`/`risico`/`zoekend` (computed uit progress%) i.p.v. raw DB-status. De `faseLabel` mapping is geüpdatet met nieuwe iconografie (🎯/⚠/👁). De `statusLabelSchool` functie is OOK toegevoegd voor toekomstige flows die met raw DB-status willen werken.

**STATUS_NL update:** [mijn-sollicitaties.html:237-247](mijn-sollicitaties.html#L237) — `active` en `ended` toegevoegd, beide gemapt naar `'uitgenodigd'` zodat de bestaande renderlogica blijft werken voor stages-in-uitvoering en afgeronde stages.

---

## BOL FIX 3 — CHAT TEMPLATES

**Templates button:** [chat.html:531-537](chat.html#L531) — `<button id="templates-btn" onclick="toggleTemplates()">📋</button>` toegevoegd in `.input-bar` direct na de mineBtn.

**Panel:** [chat.html:516-526](chat.html#L516) — `<div id="chat-templates">` ingevoegd boven de `.input-bar`. Bevat `<div id="chat-templates-list">` waar `loadChatTemplates(role)` knoppen in injecteert.

**Functions added:** [chat.html:1027-1095](chat.html#L1027) — `CHAT_TEMPLATES` constant + `loadChatTemplates(role)`, `toggleTemplates()`, `useTemplate(btn)`.

**Templates per rol:**
- **student (3):** Uitnodiging gesprek bevestigen / Vraag stellen over stage / Beschikbaarheid doorgeven
- **bedrijf (3):** Uitnodiging kennismakingsgesprek / Extra informatie vragen / Afwijzing met terugkoppeling
- **school:** geen templates (button wordt verborgen voor school via `loadChatTemplates(role)` als rol niet in CHAT_TEMPLATES staat — zelfde gedrag voor begeleider/buddy/admin)

**Role detection:** `_profRow.role` op [chat.html:1494](chat.html#L1494). `loadChatTemplates(_profRow?.role)` aangeroepen op [chat.html:1505](chat.html#L1505) direct na de student profile-guard.

**Template-knop click:** vult `msgInput.value` met template-tekst, sluit panel, dispatcht `input` event om eventuele char-counters te updaten.

---

## GEWIJZIGDE BESTANDEN

1. [school-dashboard.html](school-dashboard.html) — A1 (×2 SELECT) + BOL Fix 2
2. [match-dashboard.html](match-dashboard.html) — A1 (×1 SELECT)
3. [chat.html](chat.html) — A1 (×2 SELECT) + BOL Fix 1 (motivatie auto-post) + BOL Fix 3 (templates)
4. [mijn-berichten.html](mijn-berichten.html) — A1 (×3 SELECT)
5. [bbl-dashboard.html](bbl-dashboard.html) — A2 (role guard)
6. [bbl-hub.html](bbl-hub.html) — A2 (role guard)
7. [internly-worldwide.html](internly-worldwide.html) — A3 (delegate naar js/supabase.js)
8. [company-dashboard.html](company-dashboard.html) — A4 (badge + helpers + init call) + BOL Fix 2 (status map)
9. [vacature-detail.html](vacature-detail.html) — BOL Fix 1 (motivatiebrief modal + handleSave signature)
10. [mijn-sollicitaties.html](mijn-sollicitaties.html) — BOL Fix 2 (statusLabelStudent + STATUS_NL extension)

**Totaal: 10 bestanden gewijzigd, geen SKIPs.**

---

## OPEN ACTIES BUITEN SCOPE (toekomstige fase)

- `motivatie` kolom toevoegen aan [internly_migration.sql](internly_migration.sql) `applications` tabel — daarna kan localStorage-fallback uit chat.html en vacature-detail.html verwijderd worden, en kan motivatie direct visible zijn voor bedrijf in de match-card vóór accept (G uit audit).
- school-dashboard `statusLabelSchool` daadwerkelijk gebruiken: vereist herziening van afgeleide-status logica in `loadStudenten` zodat raw DB-status doorgegeven wordt naar `renderStudentenRows`.
- chat.html `_profRow` op pagina-niveau cachen zodat rol-detectie niet 2× hoeft (één keer voor profile guard, één keer voor templates).
- Templates uitbreiden voor `school` en `begeleider` rollen (bv. driegesprek-uitnodiging, voortgangs-checkin) — momenteel verborgen knop.
