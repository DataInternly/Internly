# MASTER AUDIT — FASE 1 : AUTH & ACCESS CONTROL
Datum: 9 mei 2026
Scope: c:\Projects\Internly\ root + js/ + sql/ + supabase/functions/
Methode: read-only grep + code-review

---

## 1.1 — `requireRole()` vs `guardPage()` inventarisatie

### `guardPage()` callers in HTML
| Status | Aantal |
|---|---|
| Definitie in js/utils.js:287 | 1 |
| **Aanroepen in `*.html`** | **0** |

`guardPage()` is gedefinieerd maar wordt nergens vanuit een pagina aangeroepen. De Run 7C-7G migratie is dus **nog niet gestart**.

### `requireRole()` callers
| Bestand | Lijn (eerste hit) |
|---|---|
| chat.html | requireRole-call aanwezig |
| discover.html | idem |
| matches.html | idem |
| mijn-berichten.html | idem |
| mijn-notities.html | idem |
| mijn-sollicitaties.html | idem |
| student-home.html | idem |

Totaal **7 pagina's** (CLAUDE.md noemt 6 — student-home was extra). Allen rol = `student`.

### Inline `db.auth.getUser()` gebruik
36 HTML-bestanden hebben tenminste één `db.auth.getUser()` call. Hieronder de pagina's die zo'n call gebruiken voor auth-gating (geen public pages):

| Pagina | Rol | Methode |
|---|---|---|
| admin.html | admin | inline check |
| auth.html | n.v.t. | login-flow |
| bbl-dashboard.html | student bbl | inline check |
| bbl-hub.html | student bbl | inline check |
| bbl-profile.html | student bbl | inline check |
| begeleider-dashboard.html | begeleider | inline check |
| bol-profile.html | student bol | inline check |
| buddy-dashboard.html | gepensioneerd | inline check |
| company-dashboard.html | bedrijf | inline check + heeft anti-flicker |
| company-discover.html | bedrijf | inline check |
| international-school-dashboard.html | school intl | inline check |
| international-student-dashboard.html | student intl | inline check |
| match-dashboard.html | student | inline check |
| review-form.html | meerdere | inline check |
| school-dashboard.html | school | inline check + heeft anti-flicker |
| student-profile.html | student | inline check |
| vacature-detail.html | meerdere | inline check |

**Migratie-volgorde (CLAUDE.md plan)**:
| Sprint | Pagina's | Realiteit |
|---|---|---|
| Run 7C | buddy-dashboard, company-dashboard, school-dashboard | NOG NIET GEMIGREERD |
| Run 7D | match-dashboard, bbl-dashboard, bbl-hub | NOG NIET GEMIGREERD |
| Run 7E | mijn-berichten, mijn-notities, mijn-sollicitaties, chat | NOG NIET GEMIGREERD (gebruiken nog requireRole) |
| Run 7F | student-profile, bol-profile, bbl-profile, admin | NOG NIET GEMIGREERD |
| Run 7G | international-* dashboards, begeleider-dashboard, vacature-detail, review-form, discover, matches | NOG NIET GEMIGREERD |

**Status: VERIFY** — `guardPage()` is geïntroduceerd in Run 7B (mei 2026) maar geen enkele pagina is gemigreerd. De helper bestaat alleen op papier. Dit is bewuste tech-debt (B-1 in CLAUDE.md).

**Classificatie: P2** — geen LT-blocker, maar gepland voor post-LT. CLAUDE.md noemt 30-90 min per sprint.

---

## 1.2 — `markAuthReady()` coverage

### Helper-definitie
`js/utils.js:213` — `markAuthReady()` zet `data-auth-ready="true"` en wist `data-auth-pending` op `<body>`.

### Pagina's met `data-auth-pending` of `data-auth-ready`
| Pagina | Status |
|---|---|
| school-dashboard.html | aanwezig |
| company-dashboard.html | aanwezig |
| student-home.html | aanwezig |
| buddy-dashboard.html | aanwezig |

**Slechts 4 pagina's** hebben anti-flicker body-state.

### Pagina's die `markAuthReady()` expliciet aanroepen
| Pagina | Aantal calls |
|---|---|
| js/utils.js | helper-definitie + auto-call vanuit requireRole/guardPage |
| school-dashboard.html | aanwezig |
| company-dashboard.html | aanwezig |
| buddy-dashboard.html | aanwezig |

**Impliciete coverage**: pagina's die `requireRole()` gebruiken (7 stuks) krijgen `markAuthReady()` automatisch via de helper. Maar deze pagina's hebben **geen** `data-auth-pending` op de body — dus de anti-flicker doet niets voor hen (er is niks om te wissen).

### GAPS — pagina's met inline-auth zonder anti-flicker
| Pagina | data-auth-pending? | markAuthReady call? |
|---|---|---|
| admin.html | nee | nee |
| bbl-dashboard.html | nee | nee |
| bbl-hub.html | nee | nee |
| bbl-profile.html | nee | nee |
| begeleider-dashboard.html | nee | nee |
| bol-profile.html | nee | nee |
| company-discover.html | nee | nee |
| international-school-dashboard.html | nee | nee |
| international-student-dashboard.html | nee | nee |
| match-dashboard.html | nee | nee |
| review-form.html | nee | nee |
| student-profile.html | nee | nee |
| vacature-detail.html | nee | nee |

**Run 7B noemde de gap voor (b) niet-ingelogde gebruiker en (c) JWT-expiry path.** Dat klopt: vrijwel alle 13 pagina's hebben geen body-state-management. De redirect bij niet-ingelogd gaat door, maar de body kan kort flickeren met de inhoud van de pagina vóór de redirect (omdat er geen `data-auth-pending` is om te beginnen).

**Classificatie: P2** — UX-irritatie maar geen security-issue. Mama-test relevant (zie F4).

---

## 1.3 — RLS Policies (uit `internly_migration.sql`)

### Tabellen geïnspecteerd
| Tabel | RLS enabled? | SELECT-policy | INSERT-policy | UPDATE-policy | WITH CHECK op UPDATE? |
|---|---|---|---|---|---|
| profiles | aanwezig (impliciet via DROP) | `USING (true)` | `WITH CHECK (id = auth.uid())` | `USING (id = auth.uid())` | **NEE** |
| student_profiles | idem | `USING (true)` | `WITH CHECK (profile_id = auth.uid())` | `USING (profile_id = auth.uid())` | **NEE** |
| company_profiles | idem | `USING (true)` | idem | idem | **NEE** |
| school_profiles | idem | `USING (true)` | idem | idem | **NEE** |
| internships | idem | `USING (true)` | n.v.t. | n.v.t. | n.v.t. |
| internship_postings | idem | `status='active' OR created_by=auth.uid()` | `WITH CHECK (created_by=auth.uid())` | `USING (created_by=auth.uid())` | **NEE** |
| matches | idem | party_a/b/initiated_by/praktijkbegeleider | `WITH CHECK (auth.uid() IS NOT NULL)` | `USING (party_a OR party_b)` | **NEE** |
| applications | idem | student_id/profile_id/posting-owner | `WITH CHECK` aanwezig | `USING (...)` | **NEE** |
| conversations | idem | EXISTS-check op matches/buddy_pairs | `WITH CHECK (auth.uid() IS NOT NULL)` | n.v.t. | n.v.t. |
| messages | idem | EXISTS via conversations | `WITH CHECK (sender_id=auth.uid())` | `USING (EXISTS via match)` | **NEE** |
| notifications | idem | `USING (user_id=auth.uid())` | `WITH CHECK (auth.uid() IS NOT NULL)` | `USING (user_id=auth.uid())` | **NEE** |
| buddy_pairs | idem | requester_id OR receiver_id | `WITH CHECK (auth.uid() IS NOT NULL)` | `USING (requester_id OR receiver_id)` | **NEE** |
| buddy_requests | idem | idem | `WITH CHECK (requester_id=auth.uid())` | `USING (receiver_id=auth.uid())` | **NEE** |
| buddy_queue | idem | n.v.t. | n.v.t. | `FOR ALL USING (user_id=auth.uid())` | **NEE** (FOR ALL zonder WITH CHECK) |
| meetings | idem | organizer_id OR attendee_id | `WITH CHECK (organizer_id=auth.uid())` | `USING (organizer OR attendee)` | **NEE** |
| availability | idem | `USING (true)` | `WITH CHECK (user_id=auth.uid())` | n.v.t. | n.v.t. |
| reviews | aanwezig | flagged-gated | match-gated WITH CHECK | reviewer/reviewee/flag | **JA** voor 3 update-policies |
| waitlist | aanwezig | email-gated | `WITH CHECK (true)` | `USING (email-match)` | **NEE** |
| stage_plans | idem | EXISTS via match | n.v.t. | `FOR ALL USING (EXISTS via match)` | **NEE** (FOR ALL) |
| stage_leerdoelen | idem | n.v.t. | n.v.t. | `FOR ALL USING (...)` | **NEE** (FOR ALL) |
| stage_deadlines | idem | n.v.t. | n.v.t. | `FOR ALL USING (...)` | **NEE** (FOR ALL) |
| stage_tasks | idem | n.v.t. | n.v.t. | `FOR ALL USING (...)` | **NEE** (FOR ALL) |
| stage_reflecties | idem | n.v.t. | n.v.t. | `FOR ALL USING (...)` | **NEE** (FOR ALL) |
| stage_log | idem | n.v.t. | n.v.t. | `FOR ALL USING (...)` | **NEE** (FOR ALL) |
| company_doorstroom | idem | `USING (true)` | n.v.t. | `FOR ALL USING (company_id=auth.uid())` | **NEE** |
| push_subscriptions | idem | n.v.t. | n.v.t. | `FOR ALL USING (user_id=auth.uid())` | **NEE** |
| school_postings | idem | active OR created_by | n.v.t. | `FOR ALL USING (created_by=auth.uid())` | **NEE** |
| kb_articles | aanwezig | `published=true` | n.v.t. | n.v.t. | n.v.t. |

### Bevindingen

#### **F1.3.A — UPDATE policies missen WITH CHECK** [P1]
21 van de 23 UPDATE-policies hebben alleen `USING` zonder `WITH CHECK`. Concreet risico:
- Een geauthenticeerde user kan rijen die hij mag updaten zo wijzigen dat ze _eigenaar wisselen_:
  - `matches`: party_a/party_b kunnen veranderen door een party. Theorie: party_a wijzigt party_b naar arbitraire UUID → match wordt overgedragen.
  - `notifications`: `user_id` kan worden gewijzigd → een gebruiker kan eigen notif "doorgeven" aan een andere user.
  - `profiles`: `id` kan worden veranderd, maar id is PK dus wordt door FK-constraints geblokkeerd in de meeste gevallen.
  - `student_profiles` / `company_profiles` / `school_profiles`: `profile_id` kan worden gewijzigd → profile-overdracht.
- **Reviews zijn correct geconfigureerd** (3 update-policies hebben WITH CHECK).
- Klassiek Supabase-anti-pattern. Reproducibility: `update().eq('id', X).set({party_a: 'andere-uuid'})` zou werken.

**Mitigatie kosten**: ~30-45 min DDL toevoegen `WITH CHECK (...)` aan elk update-policy.

**Classificatie: P1** — exploitabel maar vereist authenticated user en specifieke kennis. Niet "data-leak naar publiek" maar wel "authenticated user kan integriteit breken". Pre-LT fix.

#### **F1.3.B — `FOR ALL` policies zonder WITH CHECK** [P1]
8 policies gebruiken `FOR ALL USING (...)` zonder `WITH CHECK`:
`bq_own` (buddy_queue), `splan_write_match`, `sleer_match_party`, `sdead_match_party`, `stask_match_party`, `srefl_match_party`, `slog_match_party`, `cdoor_write_own`, `push_own`, `sp2_write_own`.

`FOR ALL` covers SELECT/INSERT/UPDATE/DELETE. Zonder WITH CHECK kan een INSERT met `match_id` van een andere user theoretisch slagen, maar de USING-clause op match check zou alsnog blokkeren bij UPDATE. Voor INSERT geldt de WITH CHECK-clause (afwezig dus impliciet `true`).

Concreet voor `splan_write_match`: een user die in `match.party_a` zit kan een stage_plan invoegen voor een andere `match_id` waar hij geen toegang toe heeft, mits er WHERE-clause iets zou matchen. PostgreSQL gebruikt USING als WITH CHECK fallback bij INSERT alleen voor `FOR ALL` policies vanaf v15+ — onzeker welke versie Supabase draait. **VERIFY NEEDED.**

**Classificatie: P1** — vraag Supabase-versie checken; default-gedrag verschilt per PG-versie.

#### **F1.3.C — `profiles` SELECT publiek** [P2]
`profiles_select_all` is `FOR SELECT USING (true)`. Iedereen (zelfs anon) kan **alle profielen** lezen, inclusief `email` als die kolom bestaat (zie reviews_delete_admin policy die `WHERE email='hallo@internly.pro'` checkt — email-kolom bestaat dus).

**Risico**: PII-leak via `https://platform/rest/v1/profiles?select=*` met de anon-key. Een attacker kan email-list bouwen voor alle gebruikers.

**Verzachting**: code-side gebruik vrijwel altijd select op specifieke kolommen (`'id, naam, role'`) — zie F2.4. Maar de RLS staat het toe.

**Mitigatie**: `USING (true)` vervangen door:
```sql
USING (
  auth.uid() IS NOT NULL  -- alleen authenticated
  OR id = auth.uid()       -- of eigen rij
)
-- + een aparte view "public_profiles" met alleen veilige kolommen voor publieke browse
```
Of preciezer: kolom-niveau RLS via column privileges.

**Classificatie: P2** — geen LT-blocker, GDPR/AVG-risico op middellange termijn.

#### **F1.3.D — `auth.uid()` niet `(select auth.uid())`** [P3]
Supabase-best-practice: `(select auth.uid())` zorgt dat de waarde 1× per query wordt berekend i.p.v. per row. Performance-impact alleen merkbaar bij grote tabellen (>10k rows).

**Classificatie: P3** — performance optimization, post-LT.

#### **F1.3.E — Geen views met `security_invoker`** [INFO]
Geen views aangetroffen in migrations.sql of internly_migration.sql. Niets te checken.

#### **F1.3.F — `availability` SELECT public** [P3]
`avail_select_all USING (true)` betekent dat iedereen alle availability-slots kan lezen. Comment in migrate-bestand zegt "calendar.js loads other user's slots too" — dus per design. Acceptable, maar exposeert wel "deze user is op X tijdstip beschikbaar" naar anon.

**Classificatie: P3** — design-keuze, verifieer met PO.

#### **F1.3.G — `profiles` UPDATE kan `role` wijzigen** [P0]
`profiles_update_own USING (id = auth.uid())` zonder WITH CHECK. Een student kan zijn eigen profiel updaten en `role` wijzigen naar `admin`. Daarna heeft hij toegang tot admin.html (client-side guard) — én op DB-niveau zou hij potentieel admin-policies triggeren als die op `profile.role` zouden checken.

**Inspectie**: geen RLS-policy refereert `profile.role` direct (admin-checks gebruiken email). Maar admin.html client-side guard checkt `profile.role === 'admin'`. Een aanvaller die zijn rol wijzigt heeft direct toegang tot admin-UI en alle queries die admin doet.

**Reproducibility**: 
```js
await db.from('profiles').update({ role: 'admin' }).eq('id', myUid);
```
Werkt zonder WITH CHECK = `(role IN ('student','bedrijf','school','gepensioneerd','begeleider'))`.

**Classificatie: P0** — auth-bypass mogelijk via DB. **MUST FIX VÓÓR LT.**

**Mitigatie kosten**: 5 min DDL:
```sql
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role IN (SELECT role FROM profiles WHERE id = auth.uid())
  );
-- of harder: blokkeer role-wijziging via aparte trigger
```

---

## 1.4 — Logout flows

### Inventarisatie wrappers
| Pagina | Wrapper | Locatie |
|---|---|---|
| bbl-dashboard.html | `function signOut() { performLogout(); }` | :417 |
| bbl-hub.html | idem | :1171 |
| bbl-profile.html | idem | :559 |
| bol-profile.html | idem | :1394 |
| buddy-dashboard.html | idem | :744 |
| company-dashboard.html | idem | :1545 |
| company-discover.html | idem | :662 |
| discover.html | idem | :1180 |
| matches.html | idem | :715 |
| mijn-sollicitaties.html | idem (let op: indented binnen IIFE) | :788 |
| school-dashboard.html | idem | :1262 |
| student-profile.html | idem | :1635 |
| begeleider-dashboard.html | `function doSignOut() { performLogout(); }` | :793 |
| international-school-dashboard.html | `async function signOut() {...}` | :996 |
| international-student-dashboard.html | `async function signOut() {...}` | :2349 |

**Totaal 15 wrappers** (CLAUDE.md noemde "3 redundante" in audit-prompt — onderschat). Allen redundant: `performLogout()` is window-global.

### Direct `performLogout()` aanroep zonder wrapper
| Pagina | Locatie |
|---|---|
| chat.html | :492 — `<button onclick="performLogout()" style="...">↪ Uit</button>` |
| match-dashboard.html | :2217 — idem `↪ Uit` inline-styled |
| company-dashboard.html | :596 — `<button class="topbar-logout" onclick="performLogout()" title="Uitloggen">🚪 Uitloggen</button>` |
| school-dashboard.html | :618 — idem |

### Bevinding: 3 stijlen, 3 teksten [P2]
- `🚪 Uitloggen` met `topbar-logout` class — company-dashboard, school-dashboard
- `↪ Uit` inline-styled — chat.html, match-dashboard.html
- `Uit` (vermoedelijk) — buddy-dashboard (verifieer)

**Inconsistentie geconfirmeerd voor mama-test #2.** Zie F4.2.

### Bevinding: 2 international dashboards hebben EIGEN signOut [P3 — UPDATED 9 mei]
international-school-dashboard.html:996 en international-student-dashboard.html:2349 hebben `async function signOut() {...}` — eigen logica i.p.v. delegatie naar `performLogout()`.

**Verificatie 9 mei (post-Fase 1)**: beide functies roepen WEL `clearUserState()` aan (regel 1003 en 2356). Geen cross-account leak risico.

```js
async function signOut() {
  try { await db.auth.signOut(); } catch (err) { console.error(...); }
  if (typeof clearUserState === 'function') clearUserState();
  window.location.href = 'auth.html';
}
```

Verschil met `performLogout()`: gebruikt `window.location.href = 'auth.html'` i.p.v. `.replace('/index.html')`. Cosmetisch, geen functioneel risico.

**Risico downgrade**: P1 → **P3** (cosmetic — kan worden vervangen door `performLogout()` om duplicatie weg te nemen).

### Classificatie
- 15 wrapper-functies: P3 (cosmetic refactor, geen LT-blocker)
- International signOut overrides: **P3** (cosmetic — clearUserState wel aanwezig, geverifieerd 9 mei)

---

## 1.5 — Anon key in code

### Resultaten
| Locatie | Type | Status |
|---|---|---|
| `js/supabase.js:7` | `const SUPABASE_ANON_KEY = 'eyJ...'` | Correct — single source of truth |
| `js/supabase.js:10` | `window.__SUPABASE_ANON_KEY = SUPABASE_ANON_KEY` | Correct — exposed voor telemetry/fallback |
| `bol-profile.html:1718,1754` | refereert `SUPABASE_ANON_KEY` als constant in IIFE | OK — gebruikt parent-scope const |
| `discover.html:1599,1635` | idem | OK |
| `student-profile.html:1963,1999` | idem | OK |
| `vacature-detail.html:1318,1354` | idem | OK |
| `internly-worldwide.html:1700-1709` | gebruikt `window.__SUPABASE_ANON_KEY` als fallback | OK — publieke pagina, gewenst |

**ZERO inline JWT-strings in HTML.** Anon-key is publiek-bedoeld; alle locaties referer aan de centrale const of de window-global. PASS.

**Status: PASS**

---

## 1.6 — Service role key

### Resultaten
| Locatie | Status |
|---|---|
| `*.html` in scope | **0 hits** |
| `js/*.js` in scope | **0 hits** |
| `docs/`, `_archief/`, `_docs/` | hits zijn in audit-rapporten en commentaar — geen executable code |
| Edge Functions (`supabase/functions/`) | **NIET INGEKEKEN** — verwacht: aanwezig (legitimate gebruik) |

**Status: PASS** — geen service_role-leak naar client.

---

## TOP 5 BEVINDINGEN — FASE 1

| # | ID | Severity | Beschrijving | Tijdkost fix |
|---|---|---|---|---|
| 1 | F1.3.G | **P0** | `profiles` UPDATE policy zonder WITH CHECK — gebruiker kan eigen `role` wijzigen naar `admin` | ~10 min DDL |
| 2 | F1.3.A | P1 | 21 UPDATE-policies missen WITH CHECK — eigenaar-overdracht mogelijk | ~30-45 min DDL |
| 3 | F1.3.B | P1 | 8 `FOR ALL` policies zonder WITH CHECK — INSERT-pad onveilig | ~20 min DDL + Supabase-versie verifiëren |
| 4 | F1.3.C | P2 | `profiles` SELECT public — anon kan alle emails uit profiles tabel scrapen | ~20 min DDL + view-redesign |
| 5 | F1.2 | P2 | 13 inline-auth pagina's missen `data-auth-pending` body-state — flicker mogelijk | ~5 min/pagina |

~~F1.4.* international signOut~~ — gedowngraded naar P3 na verificatie 9 mei (clearUserState wordt wel aangeroepen, regel 1003+2356).

**STOP — Fase 1 klaar.** Wacht op "ga door fase 2".
