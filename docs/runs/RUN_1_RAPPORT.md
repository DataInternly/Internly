# RUN 1 RAPPORT — Type A scrub + sessionStorage cleanup

**Datum** 5 mei 2026
**Audit-bron** `docs/audits/LIVETEST_AUDIT_4MEI.md` (bevindingen 3.1 [A], 3.3 [B], 4.4 [A], 4.7 [A], 2.5 [B])
**Plan-bron** Run 1 instructiedocument (CC RUN 1 — TYPE A SCRUB + SESSIONSTORAGE CLEANUP)
**Status** **KLAAR voor smoke-test door Barry** — geen commit, geen FTP zonder go.

> **Spec-bestanden ontbreken:** `docs/INTERNLY_HEADER_SPEC.md` en `docs/INTERNLY_5RUN_FIX_PLAN_4MEI.md` zijn niet aanwezig in de repository. Run 1 is uitgevoerd op basis van het instructiedocument zelf en de audit. Voor Run 4 (header-spec-enforcement) zal de spec eerst geleverd of opgesteld moeten worden.

---

## 1. Samenvatting

| Bestand | Edit | Reden |
|---|---|---|
| `about.html` | logo-handler vervangen | smartHomeRedirect → href="index.html" |
| `pricing.html` | logo-handler vervangen | idem; scripts behouden vanwege subscriptions-flow |
| `faq.html` | scripts gestript + logo-handler vervangen | volledig publieke pagina, geen db-/utils-gebruik |
| `discover.html` | regel 1437 verwijderd | sessionStorage `internly_role` forceer weg |
| `kennisbank.html` | **GEEN edit** | js/kb.js gebruikt utils + db (12 + 2 hits) |
| `hoe-het-werkt.html` | **GEEN edit** | geen scripts om te scrubben; markup-drift is Run 4 scope |
| `chat.html` | **GEEN edit** | geen `internly_role`-overwrite gevonden — clean |

**Totaal:** 4 bestanden gewijzigd, 3 als-clean bevestigd, 0 nieuwe regressies in regressie-check.

---

## 2. Inventarisatie-uitvoer (fase 1)

### 2.1 Publieke pagina's script-load

```
about.html                        utils, supabase, smartHomeRedirect, authCalls
pricing.html                      utils, supabase, tel-conditional, smartHomeRedirect, authCalls
faq.html                          utils, supabase, smartHomeRedirect
kennisbank.html                   utils, supabase, authCalls
hoe-het-werkt.html               (geen scripts)
spelregels.html                   utils
privacybeleid.html               (geen scripts)
cookiebeleid.html                 utils
algemene-voorwaarden.html         utils
```

### 2.2 smartHomeRedirect-handlers (run-1-scope)

```
about.html:632
pricing.html:445
faq.html:419
```

Plus 12 andere pagina's met identieke handler — buiten run-1 scope: admin, bbl-profile, begeleider-dashboard, bol-profile, buddy-dashboard, company-dashboard, company-discover, match-dashboard, review-form, school-dashboard, vacature-detail, international-* (alleen comment-mention).

### 2.3 sessionStorage `internly_role` lezers/schrijvers

| Plaats | Type | Waarde |
|---|---|---|
| auth.html:963 | SET | `role` (echte rol bij login) |
| auth.html:978-979 | SET | `'bbl'` of `'student_international'` |
| auth.html:1255 | REMOVE | bij logout |
| auth.html:1294 | READ | als fallback voor profile.role |
| admin.html:404 | REMOVE | bij logout |
| index.html:1960 | SET | bij rol-selectie |
| bbl-dashboard.html:602 | SET | `'bbl'` |
| bbl-hub.html:2543 | SET | `'bbl'` |
| bbl-profile.html:724 | SET | `'bbl'` |
| **discover.html:1437** | **SET** | `'student'` ← **GEFIXT** |
| discover.html:1450 (nu 1454) | READ | voor push-reg + buddy-section |

**Conclusie:** discover.html line 1437 was de enige forceer die niet rol-conform was. Andere SET's zetten de **echte** rol — dat is correct.

### 2.4 kb.js helper-afhankelijkheden

```
js/kb.js: 12 hits op notify/escapeHtml/formatNLDate/createNotification
js/kb.js: 2 hits op db./supabase
```
→ kennisbank.html MOET utils.js + supabase.js + supabase-js CDN behouden.

### 2.5 about.html / pricing.html db-gebruik

- **about.html:962, 1001** — waitlist-popup gebruikt `window.db` voor `auth.getSession()` en `db.from('waitlist').insert()`. Strip supabase = waitlist breekt.
- **pricing.html:695, 702, 707-739** — free-plan flow gebruikt `db.from('subscriptions').upsert()` en 4× `notify()`. Strip = signup-flow breekt.

→ about.html en pricing.html behouden hun scripts. Alleen logo-handler vervangen.

---

## 3. Per file — wijzigingen + motivatie

### 3.1 about.html

**Wijziging:** [about.html:632](../../about.html#L632)
```html
<!-- VOOR -->
<a href="#" onclick="event.preventDefault();smartHomeRedirect();" class="topbar-logo" style="cursor:pointer">intern<span>ly</span></a>

<!-- NA -->
<a href="index.html" class="topbar-logo">intern<span>ly</span></a>
```

**Niet aangepast:** scripts behouden (`utils.js`, `supabase.js`, `roles.js`).
**Motivatie:** about.html heeft een actieve waitlist-flow (regels 957-1024) die `window.db` gebruikt voor email-aanmelding en sessie-check. Volledig strippen zou de waitlist breken. De smartHomeRedirect-bug is volledig opgelost door alleen de logo-handler te vervangen — verdere scrub is niet nodig.

**Afwijking van plan-spec:** Run-1 plan zei "Verwijderen utils + supabase + telemetry + push". Hier afgeweken omdat about.html legitiem db-gebruik heeft (publieke waitlist-flow, geen Bedward P2-overtreding zonder smartHomeRedirect).

### 3.2 pricing.html

**Wijziging:** [pricing.html:445](../../pricing.html#L445) — identiek patroon als about.html.

**Niet aangepast:** scripts behouden.
**Motivatie:** pricing.html heeft de free-plan checkout flow (regels 695-739) met `db.from('subscriptions').upsert()` + `notify()`. Strippen breekt de Mollie/free-flow.

**Afwijking van plan-spec:** zelfde reden als 3.1.

**Bonus voor Run 5 onthouden:** pricing.html heeft straks een context-aware back-knop nodig (cluster 4 pad 5). Niet in Run 1 gedaan.

### 3.3 faq.html

**Wijziging 1:** [faq.html:419](../../faq.html#L419) — logo-handler vervangen.

**Wijziging 2:** [faq.html:996-1000](../../faq.html#L996) — scripts gestript:
```html
<!-- VOOR -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/utils.js"></script>
<script src="js/consent.js" defer></script>
<script src="js/roles.js"></script>
<script src="js/supabase.js"></script>

<!-- NA -->
<!-- Run 1 cluster 3.1 (Bedward P2): supabase + utils + roles gestript.
     faq.html gebruikt geen db-calls of utils-helpers buiten Google Translate. -->
<script src="js/consent.js" defer></script>
```

**Motivatie:** faq.html inline JS (regels 1004-1080+) doet alleen Google Translate widget, lang-switcher, FAQ tab/accordeon — geen db, geen notify/escapeHtml. Volledig strippen veilig. consent.js behouden voor cookie-banner.

### 3.4 kennisbank.html — GEEN EDIT

**Beslissing:** behouden zoals het is.
**Motivatie:** js/kb.js gebruikt 12× utils-helpers (notify/escapeHtml) en 2× db. Strip zou kb.js breken. Plan-spec staat dit toe: "Als één True → utils.js behouden, supabase.js verwijderen", maar bij OOK supabase-gebruik in kb.js is volledige scrub onveilig.

**Open punt voor latere run:** kennisbank.html heeft GEEN smartHomeRedirect-handler (grep bevestigt 0 hits). Dus Bedward P2-risico hier is laag. Als Barry alsnog wil scheiden tussen "kb.js die supabase mag" vs "kennisbank.html zelf clean", is een refactor naar `kb.js` die internally `import` doet pas voor latere session.

### 3.5 hoe-het-werkt.html — GEEN EDIT

**Beslissing:** geen scriptload-edits in Run 1.
**Motivatie:** pagina heeft ZERO scripts in head/body — alleen consent.js defer (regel 765). Niets te scrubben. Header-markup-drift (audit 2.5) is Run 4 scope ("spec-conforme markup van header is voor Run 4").

### 3.6 discover.html

**Wijziging:** [discover.html:1437](../../discover.html#L1437) — regel verwijderd, comment-block toegevoegd:

```js
// VOOR (regel 1437)
sessionStorage.setItem('internly_role', 'student'); // sync voor rest van pagina

// NA
// Run 1 cluster 4.7: sessionStorage forceer verwijderd.
// requireRole('student') op regel 1432 redirect non-students al weg, dus
// we hoeven de rol hier niet te overschrijven. auth.html zet de echte rol
// bij login (regel 963). Cross-pollination naar bedrijf-context bij chat
// → mijn-berichten flow is hiermee voorkomen.
```

**Geval-keuze:** Geval A (volledige verwijdering) gekozen. Motivatie:
- Lijn 1432 doet `requireRole('student')` — non-students zijn al gestopt vóór regel 1437
- Lijn 1454 (was 1450) leest `internly_role` — leest nu wat auth.html zette = de echte rol
- Voor bedrijf zou dat bij login `'bedrijf'` zijn — push-registration en buddy-section worden correct overgeslagen
- Geval B (conditional) is overkill: zou een extra DB-call vereisen om iets te bereiken wat requireRole al doet

### 3.7 chat.html — GEEN EDIT

Grep `internly_role` op chat.html → 0 hits. Geen overwrite, geen wijziging nodig.

---

## 4. Verificatie-output (fase 3)

### Bedward P2-compliance

```
=== smartHomeRedirect in run-1-scope ===
(geen output — 0 hits)                                    PASS

=== logo-handlers (verwacht 3 hits met index.html) ===
about.html:632   href="index.html"                        PASS
pricing.html:445 href="index.html"                        PASS
faq.html:419     href="index.html"                        PASS

=== discover.html internly_role ===
1454:    const role = sessionStorage.getItem('internly_role') || '';
(alleen READ, geen forceer SET)                           PASS

=== faq.html script-load post-strip ===
998: <script src="js/consent.js" defer></script>
1002: <script>     (Google Translate init)
1034: <script defer src="//translate.google.com/...">
1036: <script>     (FAQ tab/accordion)
(geen utils, supabase, roles, supabase-cdn)               PASS

=== Regressie-check ingelogde pagina's ===
all-clear-if-no-warn-above (geen WARN-output)             PASS
```

---

## 5. Smoke-test checklist voor Barry

### Test 1 — Publieke pagina's laden zonder JS-fout

- [ ] Open `about.html` in incognito (niet ingelogd) — DevTools console schoon, waitlist-popup werkt na 8s
- [ ] Open `pricing.html` in incognito — geen errors, "Gratis plan starten" knop reageert
- [ ] Open `faq.html` in incognito — geen errors, FAQ-accordeon werkt, Google Translate widget werkt
- [ ] Open `kennisbank.html` in incognito — geen errors, kb-content rendert
- [ ] Open `hoe-het-werkt.html` in incognito — geen errors

### Test 2 — Ingelogde sessie-behoud

- [ ] Login als BBL student (Daan, daan.bbl@internly.pro)
- [ ] Klik in nav → privacybeleid → moet ingelogd blijven, terug naar dashboard moet werken
- [ ] Klik in nav → kennisbank → moet ingelogd blijven
- [ ] Klik in nav → hoe-het-werkt → moet ingelogd blijven (was clean)
- [ ] Klik in nav → faq → moet ingelogd blijven (faq laadt nu geen supabase, dus geen sessie-trigger)
- [ ] Login als bedrijf — herhaal bovenstaande

### Test 3 — Cross-rol sessionStorage cleanup (Cluster 4 pad 4 + 7)

- [ ] Login als bedrijf (bedrijf@internly.pro)
- [ ] Open `discover.html` in nieuwe tab vanuit bedrijf-context — verifieer dat bedrijf NIET in buddy-systeem belandt (geen buddy-toggles in matchpool)
- [ ] Open een bestaande chat (`chat.html?match=...`) — verifieer geen sessionStorage-overwrite
- [ ] Klik vanuit chat naar mijn-berichten (`mijn-berichten.html`) — moet werken, header moet bedrijf-rol tonen
- [ ] Wisselen tussen chat ↔ mijn-berichten meerdere keren — geen crash, geen verkeerde rol-header

### Test 4 — Logo-klik gedrag

- [ ] Op `about.html` (uitgelogd) → klik logo → moet naar `index.html` gaan, NIET naar dashboard via JS
- [ ] Op `pricing.html` (ingelogd als student) → klik logo → naar `index.html` (NIET smart-redirect)
- [ ] Op `faq.html` (uitgelogd) → klik logo → naar `index.html`
- [ ] Op `index.html` (ingelogd) → smart-redirect via index's eigen scripts werkt nog (niet door deze fix geraakt)

### Test 5 — Logo-klik bug 3.1 specifiek

Originele bug: ingelogde gebruiker op pricing.html klikt logo → smartHomeRedirect → mogelijk SIGNED_OUT → uitlog van alle tabs.

- [ ] Login als student in tab 1
- [ ] Open pricing.html in tab 2 (ingelogd via gedeelde sessie)
- [ ] Klik logo in tab 2 → moet naar index.html zonder uitlog van tab 1
- [ ] Tab 1 moet ingelogd blijven
- [ ] Voor tab 1: ververs pagina → moet nog steeds ingelogd zijn

---

## 6. Open vragen voor Barry

1. **Spec-bestanden ontbreken.** `docs/INTERNLY_HEADER_SPEC.md` en `docs/INTERNLY_5RUN_FIX_PLAN_4MEI.md` waren plan-bronnen volgens Run-1 instructie maar bestaan niet. Run 1 doorgegaan op basis van instructiedoc + audit. Voor Run 4 (header-enforcement) zal de spec moeten worden gemaakt.

2. **Scope-afwijking voor about.html en pricing.html.** Plan-spec adviseerde volledige scrub van utils/supabase. In Run 1 alleen logo-handler vervangen omdat beide pagina's legitieme db-gebruik hebben (waitlist + subscriptions). Akkoord, of moet een andere aanpak (bv. credentials in `js/public-db.js` met beperkte scope) overwogen worden voor Run 2?

3. **kennisbank.html niet aangeraakt.** kb.js is sterk gekoppeld aan utils + db. Akkoord met deze stop, of moet kb.js gerefactored worden (bv. eigen lichte client) als aparte sessie?

4. **12 andere pagina's met smartHomeRedirect-handler** (zie inventarisatie 2.2). Allemaal ingelogde pagina's — Bedward P2 geldt daar niet, dus geen actie. Bevestiging gewenst.

---

## 7. Tom Bomba notitie — voorgesteld commit + FTP-bundle

### Commit-message

```
fix: Type A scriptload-overtredingen + sessionStorage cross-pollination

Audit cluster 3.1 [A], 3.3 [B], 4.4 [A], 4.7 [A], 2.5 [B]

- about.html: logo-handler smartHomeRedirect → href="index.html" (P2 fix)
- pricing.html: idem; scripts behouden (subscriptions-flow gebruikt db)
- faq.html: utils + supabase + roles gestript + logo-handler fix
- discover.html: sessionStorage 'internly_role' forceer (regel 1437) verwijderd
- kennisbank.html, hoe-het-werkt.html, chat.html: geen wijziging nodig

about en pricing scripts behouden i.v.m. legitieme db-flow (waitlist /
subscriptions). Logo-fix elimineert Bedward P2-risico zonder business-flow
te breken. Cluster 3.1 + 4.4 + 4.7 in deze commit; 3.3 (kennisbank
scrub) en 2.5 (hoe-werkt-het header markup) deferred naar latere run.
```

### FTP-bundle (na Barry's go)

```
about.html
pricing.html
faq.html
discover.html
```

**Niet uploaden:**
- `docs/runs/RUN_1_RAPPORT.md` (alleen lokaal/git)
- `HANDOVER.md` (alleen lokaal/git)
- chat.html, kennisbank.html, hoe-het-werkt.html (niet gewijzigd)

---

**Run 1 status: KLAAR voor Barry's smoke-test.** Geen commit zonder go. Geen FTP zonder go.

---

## RUN 1.5 — HOTFIX (5 mei 2026)

**Status:** **STOP bij Issue 1 — diagnose vereist Barry-beslissing voordat edits op `js/supabase.js`.**

### Issue 1 — Auth-listener whitelist (KRITIEK)

**Plan-instructie zei:** "supabase.js auth-listener mist PUBLIC_PAGES whitelist → toevoegen volgens patroon A."

**Diagnose-bevinding contradiceert plan-aanname:**

1. **`js/supabase.js` heeft GEEN `onAuthStateChange` listener.** Het bestand is 107 regels en bevat alleen: client-creatie ([js/supabase.js:11](../../js/supabase.js#L11)), session-timeout helper ([js/supabase.js:33-60](../../js/supabase.js#L33-L60)), `hasActivePlan` helper ([js/supabase.js:72-107](../../js/supabase.js#L72-L107)). **Geen listener om aan te passen.**

2. **De auth-state-change listener zit in `js/utils.js`** op regels 421-437:
   ```js
   window.addEventListener('load', () => {
     ...
     client.auth.onAuthStateChange(event => {
       if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
         ...
         if (!_isPublicPage()) {
           window.location.replace('auth.html');
         }
       }
     });
   });
   ```

3. **`PUBLIC_PAGES` whitelist BESTAAT al** op [js/utils.js:41-48](../../js/utils.js#L41-L48) en bevat `kennisbank.html`, `about.html`, `pricing.html`, `faq.html`, `hoe-het-werkt.html` — **alle pagina's uit Barry's smoke-test FAIL zijn al gewhitelist**. De listener gebruikt `_isPublicPage()` correct — geen redirect op publieke pagina's.

4. **Andere redirect-paden naar auth.html** (de wel-aanwezige):
   | File:line | Trigger | Whitelist-aware? |
   |---|---|---|
   | js/utils.js:238 | `requireRole()` zonder valid role | NEE — maar wordt enkel aangeroepen door beschermde pagina's |
   | js/utils.js:432 | onAuthStateChange SIGNED_OUT | JA (gebruikt `_isPublicPage()`) |
   | js/supabase.js:52 | session-timeout (20 min) | NEE — maar legitiem (tijdslimiet) |
   | js/matchpool.js:284 | `!user` op matchpool init | n.v.t. (matchpool is beschermd) |

   **Geen redirect-pad triggert vanaf kennisbank.html.**

### Daadwerkelijke root cause-hypothese

BBL Daan logt uit op kennisbank, **niet door een redirect**, maar omdat:

1. Bij navigatie van bbl-hub → kennisbank wordt op kennisbank.html `js/supabase.js` opnieuw geladen → nieuwe Supabase client maakt nieuwe `db` aan
2. Supabase JS v2 doet bij client-init een **automatic token refresh** (default `autoRefreshToken: true`)
3. Bij refresh-failure (bv. expired refresh-token of netwerk-glitch) **vuurt SIGNED_OUT event**
4. Listener checkt `_isPublicPage()` → kennisbank IS publiek → **geen redirect** (correct)
5. **MAAR:** Supabase JS v2 wist `localStorage['sb-...auth-token']` als gevolg van de refresh-failure
6. Gebruiker ziet visueel niets — kennisbank blijft normaal
7. Klik terug naar bbl-hub → bbl-hub `requireRole('student')` → `getSession()` returnt null → redirect naar auth.html → **"uitgelogd"**

De whitelist werkt correct — de **session zelf gaat verloren** door automatic refresh op publieke pagina's.

### Voorgestelde fix-paden voor Issue 1 (Barry kiest)

**Optie A — Configureer Supabase client conditioneel** (aanbevolen)

In `js/supabase.js` bij client-creatie:
```js
const _isPublicPage = (() => {
  const path = window.location.pathname;
  if (path === '/' || path === '') return true;
  const page = path.split('/').pop() || 'index.html';
  return ['index.html','about.html','kennisbank.html','kennisbank-artikel.html',
          'privacybeleid.html','algemene-voorwaarden.html','cookiebeleid.html',
          'spelregels.html','faq.html','hoe-het-werkt.html','pricing.html',
          'stagebegeleiding.html','404.html','auth.html','internly-worldwide.html',
          'la-sign.html','preview.html','esg-rapportage.html','esg-export.html',
          'internly_simulator.html'].includes(page);
})();

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: !_isPublicPage,    // op publieke pagina's: geen refresh
    persistSession: true,                  // localStorage blijft leesbaar
    detectSessionInUrl: !_isPublicPage,   // geen URL-parsing op publieke pagina's
  }
});
```

**Effect:** op kennisbank.html wordt geen refresh getriggerd → localStorage session blijft intact → terug naar bbl-hub werkt. Bestaande db-calls (about waitlist, pricing subscriptions, kb getUser) werken nog (read-only session).

**Risico:** medium. PUBLIC_PAGES lijst hier dupliceert die in utils.js. DRY-overtreding maar acceptabel omdat utils.js na supabase.js laadt — geen import mogelijk zonder load-order te breken.

**Optie B — Strip supabase.js van publieke pagina's** (zoals plan-spec)

Verwijder script-tags op kennisbank.html. Refactor kb.js om `db.auth.getUser()` te vervangen door localStorage-key-check (`localStorage.getItem('sb-qoxgbkbnjsycodcqqmft-auth-token') !== null`).

About en pricing krijgen aparte minimal client (`js/public-db.js`) zonder auto-refresh.

**Risico:** hoog. kb.js refactor + nieuwe public-db.js helper + 3 pagina's aanpassen.

**Optie C — Defer naar na livetest**

Documenteer in CLAUDE.md als bekende bug. Workaround: vermijd publieke navigatie tijdens livetest. Risico: livetest zelf wijst op deze bug, slechte indruk.

### Issue 1 status

**GEEN edit aan `js/supabase.js`.** Diagnose toont dat naïve plan-implementatie (whitelist toevoegen) geen effect heeft op de echte bug. Wacht op Barry's keuze tussen optie A / B / C.

### Issue 2 — bbl-hub footer

**Status:** **NIET GESTART.** Per spelregel "Issue 1 eerst. Smoke-test daarna. Pas bij PASS doorgaan naar issue 2 en 3." — Issue 1 nog niet gefixt, dus issue 2 niet aangevangen. Klaar om te starten zodra Barry beslissing neemt op issue 1.

### Issue 3 — mijn-berichten header drift

**Status:** **NIET GESTART.** Zelfde reden als issue 2.

### Open vragen voor Barry — Run 1.5

1. **Welke optie voor Issue 1?** A (autoRefreshToken=false, conservatief), B (volledige strip + kb.js refactor), of C (defer)?

2. **Bevestiging diagnose.** Reproduceerbaar dat na klik naar kennisbank en weer terug naar bbl-hub de gebruiker uitlogt? Als bug zich anders manifesteert, kan diagnose-hypothese onjuist zijn.

3. **Multi-tab gedrag.** Als BBL Daan in tab 1 op bbl-hub zit en tab 2 opent op kennisbank — logt tab 1 dan ook uit? Dit verheldert of de session-loss op kennisbank zelf gebeurt of via cross-tab BroadcastChannel propageert.

### Niet aangeraakt deze sessie

- `js/supabase.js` — onaangetast
- `js/utils.js` — onaangetast (whitelist + listener al correct)
- `js/telemetry.js` — no-go zone, conform regels
- bbl-hub.html — issue 2 niet gestart
- mijn-berichten.html — issue 3 niet gestart

**Run 1.5 status: BLOCKED — wacht op Barry-beslissing voor Issue 1 vóór verder.**

---

## RUN 1.6 — STATE-POLLUTION DIAGNOSE EN CLEANUP (5 mei 2026)

**Status:** **GEÏMPLEMENTEERD na uitkomst C — wacht op Barry's smoke-test.**

### Fase 1 — Storage inventarisatie

#### localStorage write-keys gecategoriseerd

**User-bound (suffix met `_<userId>` of `_<matchId>`) — geen cross-leak risico:**

| Key-pattern | Bestand | Gebruik |
|---|---|---|
| `internly_bbl_reflectie_draft_<userId>` | bbl-hub.html | reflectie-concept |
| `internly_ld_<userId>` | bbl-hub.html, bbl-dashboard.html | leerdoelen-progress |
| `internly_ld_toelichting_<userId>` | bbl-hub.html | leerdoel-toelichtingen |
| `internly_bbl_reflecties_<userId>` | bbl-hub.html | gepubliceerde reflecties |
| `internly_renewal_<matchId>` | bbl-hub.html | verlenging-status |
| `internly_bbl_bedrijf_<userId>` | bbl-profile.html, bbl-hub.html | bedrijfsnaam-cache |
| `internly_student_postcode_<userId>` | bbl-profile, bol-profile, student-profile | postcode-cache |
| `internly_buddy_optin_<userId>` | bol-profile, student-profile | buddy-toggle staat |
| `buddy_anon_<uid>` | buddy-dashboard.html | anoniem-flag |
| `buddy_paused_<uid>` | buddy-dashboard.html | pauze-flag |
| `internly_welcomed_<userId>` | js/welcome-overlay.js | overlay-eens-gezien-flag |

**NOT user-bound — CROSS-LEAK RISICO:**

| Key | Bestand(en) | Risico-niveau |
|---|---|---|
| **`internly_saved_vacatures`** | bol-profile, matches, student-profile, vacature-detail | **HOOG** — student A's saved vacatures zichtbaar bij student B |
| `internly_show_vacatures` | matches.html | medium — UI-filter staat blijft hangen |
| `internly_referral_dismissed` | begeleider, company, school dashboards | medium — dismissed-staat per-account |
| `internly_demo_profiles` | match-dashboard.html | laag — dev-flag |

**Mag-blijven (PROTECTED_KEYS):**

| Key | Reden |
|---|---|
| `internly_consent` | AVG cookie-consent — niet account-bound |
| `internly_lang` | UI-taal — device-pref |
| `internly_waitlist_seen` | publieke flag, niet account-bound |
| `internly_push_asked` | browser-permission flag — device-bound |

#### sb-...-auth-token specifiek (Barry's vraag)

| Vraag | Antwoord |
|---|---|
| **a) Overleeft logout?** | NEE — Supabase JS v2 `signOut()` wist sb-`<projectref>`-auth-token automatisch. Geen handmatige cleanup nodig. RISICO: als signOut() faalt (network/expired refresh), kan key blijven staan tot expiry. |
| **b) Wordt overschreven bij login als andere user?** | JA — `signInWithPassword()` schrijft sb-auth-token over met nieuwe sessie. Standaard Supabase v2 gedrag. |
| **c) Welke pagina's lezen hem?** | Geen direct `localStorage.getItem('sb-...')` in app-code (0 hits). Indirect leest élke pagina die supabase.js laadt — `createClient()` initialiseert vanuit deze key voor session-persistence. |

**Conclusie sb-auth-token:** Supabase JS beheert dit volledig zelfstandig. Niet in scope voor `clearUserState()` — die ruimt **alleen** internly_*/buddy_* keys op, laat sb-* met rust.

### Fase 2 — Logout-handler inventarisatie

| Handler | Locatie | Voor Run 1.6 cleanup | Na Run 1.6 |
|---|---|---|---|
| `performLogout()` | js/utils.js:397-419 | sessionStorage.clear() alleen | + clearUserState() |
| `doSignOut()` | admin.html:402 | sessionStorage.removeItem('internly_role') | + clearUserState() |
| `switchAccount()` | auth.html:1261 | idem | + clearUserState() |
| signOut (intl-school) | international-school-dashboard.html:977 | geen | + clearUserState() |
| signOut (intl-student) | international-student-dashboard.html:2329 | geen | + clearUserState() |
| Account-delete | js/account.js:134 | geen | + clearUserState() |
| Idle timeout (begeleider) | begeleider-dashboard.html:756 | geen | + clearUserState() |
| Idle timeout (supabase) | js/supabase.js:97 | geen | + clearUserState() |

**Login-flow vóór Run 1.6:** `auth.html:923 signInWithPassword` had **GEEN pre-cleanup** — reststate van vorige user bleef staan.

### Fase 3 — Service worker check

[sw.js:88-103](../../sw.js#L88) bevestigt expliciet "platform is server-rendered, no caching". Cache-strategie: alleen install/activate lifecycle met skipWaiting + clients.claim, geen response-caching. BroadcastChannel('internly-sw') alleen voor push-subscriptie resync, niet voor auth.

**Service worker contamineert NIET.** Geen edits aan sw.js.

### Beslissing — Uitkomst C (systemische gap)

Onderbouwing:
1. `performLogout()` doet alleen sessionStorage.clear() — geen localStorage cleanup
2. Login heeft geen pre-cleanup
3. `internly_saved_vacatures` bewezen cross-account leak
4. 5 directe signOut-callers buiten `performLogout()` zonder consistente cleanup
5. `internly_referral_dismissed` ook account-bound zonder cleanup

### Fase 4 — Implementatie

**Nieuwe helper** [js/supabase.js:18-67](../../js/supabase.js#L18-L67):
```js
const PROTECTED_KEYS = [
  'internly_consent', 'internly_lang',
  'internly_waitlist_seen', 'internly_push_asked'
];

function clearUserState() {
  // Verwijder internly_* en buddy_* keys behalve PROTECTED_KEYS
  // sessionStorage.clear()
  // window.currentUser = null; window.currentProfile = null
}
window.clearUserState = clearUserState;
```

**8 callers aangepast:**

| File | Regel | Wijziging |
|---|---|---|
| js/utils.js | 397-419 | performLogout: sessionStorage.clear() → clearUserState() (met fallback) |
| js/supabase.js | 97 | session-timeout: + try/catch clearUserState() |
| auth.html | 925-928 | doLogin: pre-login clearUserState() vóór signInWithPassword |
| auth.html | 1261-1268 | switchAccount: clearUserState() vervangt losse removeItem |
| admin.html | 405 | doSignOut: + clearUserState() |
| begeleider-dashboard.html | 758 | idle-timeout: + clearUserState() |
| international-school-dashboard.html | 984 | signOut: + clearUserState() |
| international-student-dashboard.html | 2336 | signOut: + clearUserState() |
| js/account.js | 136 | account-delete: + clearUserState() |

**Niet aangepast:**
- sw.js — geen response-caching, geen contaminatie-bron
- BroadcastChannel('internly_auth') voor multi-tab logout-sync — plan zegt "alleen toevoegen als expliciet gevraagd". Niet expliciet gevraagd in Run 1.6. Defer naar latere run als nodig.
- js/telemetry.js — no-go

### Fase 5 — Verificatie

**Code-audit (PASS):**

```
=== clearUserState definitie ===
js/supabase.js:45  function clearUserState()
js/supabase.js:67  window.clearUserState = clearUserState;

=== Callers ===
8 unieke caller-files, alle signOut-paden bedekt

=== Pre-login cleanup ===
auth.html:927  in doLogin (signInWithPassword pre-cleanup)
auth.html:1265 in switchAccount

=== signOut() callers — alle gedekt ===
admin.html:403, auth.html:1261, begeleider:756, international-{school,student},
js/account.js:134, js/supabase.js:97 (timeout), js/utils.js:403 (performLogout)
```

### Smoke-test voor Barry

#### Test A — basis cleanup
1. Login als bedrijf
2. DevTools → Application → Local Storage → noteer alle `internly_*` keys
3. Logout
4. **Verwacht:** `internly_*` keys grotendeels weg. `internly_consent`, `internly_lang`, `internly_waitlist_seen`, `internly_push_asked` blijven.

#### Test B — cross-account isolatie (KRITISCH)
1. Login als BOL student
2. Open een vacature en sla op (regel `internly_saved_vacatures` ontstaat)
3. Logout
4. Login als BBL Daan
5. Open mijn-sollicitaties / saved-section
6. **Verwacht:** geen vacatures van BOL student zichtbaar — `internly_saved_vacatures` is gewist tijdens cleanup
7. DevTools localStorage check: `internly_saved_vacatures` ontbreekt of is leeg array

#### Test C — pre-login paranoid clean
1. Login als bedrijf
2. DevTools → manueel: `localStorage.setItem('internly_test_pollutie', 'value')`
3. Logout (pre-login cleanup heeft nog niet gedraaid)
4. Op auth.html: Login als BBL Daan
5. **Verwacht:** `internly_test_pollutie` is verwijderd door pre-login cleanup (regel auth.html:927)

#### Test D — switchAccount flow
1. Login als bedrijf
2. Klik logo → naar auth.html
3. Klik "wissel account" knop
4. **Verwacht:** sessionStorage volledig leeg, internly_*-keys gewist (op protected na)

#### Test E — protected keys blijven
1. Accepteer cookie-consent (cookiebeleid)
2. Wissel taal naar EN
3. Login als willekeurige rol
4. Logout
5. **Verwacht:** `internly_consent` en `internly_lang` blijven staan (gebruiker hoeft niet opnieuw te accepteren of taal te kiezen)

#### Test F — idle-timeout cleanup
1. Login als willekeurige rol
2. Open begeleider-dashboard of een dashboard met session-timeout
3. Wacht 20+ minuten zonder activiteit (of fake via DevTools timer-manipulation)
4. **Verwacht:** redirect naar auth.html?reason=timeout én localStorage gewist

### Open vragen voor Barry — Run 1.6

1. **`internly_saved_vacatures` user-prefix migratie?** Run 1.6 wist deze key bij logout. Maar **tijdens** een sessie, als 2 studenten hetzelfde apparaat delen zonder uit te loggen, zien ze elkaars saved vacatures. Volledige fix: rename naar `internly_saved_vacatures_<userId>`. Buiten Run 1.6 scope (vereist update in 4 callsites). Akkoord met deze beperking, of moet dit nu mee?

2. **Multi-tab logout-sync (BroadcastChannel) gewenst?** Niet geïmplementeerd in Run 1.6 (plan: "alleen als expliciet gevraagd"). Bij livetest 11 mei wisselen mogelijk meerdere testers in dezelfde browser/tab — of gebruiken ze incognito? Als incognito, geen multi-tab issue. Als shared browser zonder incognito, multi-tab logout-sync wel wenselijk. Bevestiging.

3. **`internly_referral_dismissed`** wordt nu gewist bij logout (cross-account-leak preventie). Effect: nieuwe user ziet de referral-banner opnieuw, ook als oude user 'm gedismist had. Akkoord — dat is gewenst gedrag voor cross-account isolatie, maar mogelijk verrassend voor solo-gebruiker die 1× logout doet.

4. **Demo-flags in dev:** `internly_demo_profiles` (match-dashboard) wordt nu gewist bij logout. Demo-modus moet opnieuw worden ingeschakeld na elke login. Voor productie OK; voor dev mogelijk hinderlijk. Acceptabel?

### Niet aangeraakt deze sessie

- `js/telemetry.js` — no-go
- `sw.js` — geen response-caching, niet relevant
- BroadcastChannel multi-tab logout-sync — niet expliciet gevraagd
- `internly_saved_vacatures` user-prefix rename — buiten scope (open vraag 1)

**Run 1.6 status: GEÏMPLEMENTEERD — wacht op Barry's smoke-test.**

---

## BUNDLE-STATUS RUN 1 + 1.5 + 1.6

| Run | Status |
|---|---|
| Run 1 | KLAAR voor smoke-test (about, pricing, faq, discover) |
| Run 1.5 Issue 1 | BLOCKED — wacht op Barry-keuze A/B/C |
| Run 1.5 Issue 2 (footer) | NIET GESTART |
| Run 1.5 Issue 3 (header) | NIET GESTART |
| Run 1.6 | GEÏMPLEMENTEERD — wacht op smoke-test |

**Bundel-commit blocker:** Run 1.5 Issue 1. Zonder beslissing daarop kan deze 3-run-bundel niet samen gepakt worden. Twee opties:

**Optie 1:** Bundel Run 1 + 1.6 nu, defer Run 1.5 als losse run later.
**Optie 2:** Wacht volledig — eerst Run 1.5 Issue 1 beslissen, dan alle drie tegelijk.

Aanbeveling Optie 1 — Run 1 (4 files) + Run 1.6 (8 files) zijn beide implementatie-klaar en bedienen aparte audit-clusters.

---

## RUN 1.5 v2 — IMPLEMENTATIE (Barry koos Optie A)

**Status:** **GEÏMPLEMENTEERD — alle 3 issues. Wacht op smoke-test.**

### Issue 1 — Supabase client config (Optie A)

**File:** [js/supabase.js:11-60](../../js/supabase.js#L11-L60)

`_supabaseIsPublicPage` IIFE toegevoegd vóór `createClient()`. 20 publieke pagina's, identiek aan utils.js:41-48 PUBLIC_PAGES (DRY-flag, zie hieronder). createClient uitgebreid met:

```js
auth: {
  autoRefreshToken:   !_supabaseIsPublicPage,
  persistSession:     true,
  detectSessionInUrl: !_supabaseIsPublicPage,
}
```

**Effect:** op publieke pagina's geen automatic token-refresh meer. Refresh-failures (root cause BBL Daan's uitlog) zijn uitgesloten. `persistSession: true` — sb-auth-token blijft leesbaar voor `getUser()` calls in waitlist (about), subscriptions (pricing), kb.js.

**DRY-flag:** PUBLIC_PAGES lijst nu op 2 plekken (utils.js:41-48 + supabase.js:25-50). Backlog post-livetest: consolideer via js/config.js met laad-volgorde supabase → config → utils. Niet vandaag — load-order breken is risicovol.

### Issue 2 — bbl-hub footer

**File:** [bbl-hub.html:2922-2942](../../bbl-hub.html#L2922-L2942)

**Diagnose:** bbl-hub had wel een `<footer>` — maar de **minimale 1-regel variant** (alleen "© 2026 Sasubo Holding B.V."). Twee patronen in repo:
- **Minimale footer (8 pagina's):** bbl-dashboard, bol-profile, buddy-dashboard, mijn-berichten, mijn-sollicitaties, bbl-hub
- **Rijke `kb-shared-footer` (2 pagina's):** matchpool, mijn-notities — met brand, 10 links, copy, tagline

Barry's klacht "footer ontbreekt" wees op de rijke variant. Fix: vervang minimale footer door kb-shared-footer block. CSS bestaat al globaal in [css/style.css:2592+](../../css/style.css#L2592).

**Wijziging:** -1 regel (oude minimale), +21 regels (kb-shared-footer met 10 footer-links).

### Issue 3 — mijn-berichten header drift

**Diagnose-bevinding: B (verkeerde role gepasseerd)**

[mijn-berichten.html:868](../../mijn-berichten.html#L868) deed `renderRoleHeader(userRole, 'berichten', ...)` met `userRole` uit `profiles.role`. Voor zowel BOL als BBL student is dat `'student'` → `HEADER_NAV_BY_ROLE['student']` → BOL-array (7 items).

[js/utils.js:692](../../js/utils.js#L692) heeft een aparte key `student_bbl` met 5 items (BBL Traject, Matchpool, Berichten, Kennisbank, Buddy). Voor BBL Daan moet die gebruikt worden — anders krijgt hij BOL-tabs (Home, Vacatures, Sollicitaties) die voor BBL geen zin hebben.

**Vergelijking:** matchpool.html gebruikt `renderStudentHeader()` met inline `bbl_mode` detectie. mijn-berichten gebruikt `renderRoleHeader()` zonder die detectie — vandaar de visuele drift.

**Wijziging** [mijn-berichten.html:871-872](../../mijn-berichten.html#L871-L872):

```js
const headerRole = (userRole === 'student' && _isBBL) ? 'student_bbl' : userRole;
await renderRoleHeader(headerRole, 'berichten', { ... });
```

`_isBBL` werd al correct gezet op regel 862. Pure delegatie-fix, één-regel correctie. Strategie B per plan-spec.

**Nuance:** bredere migratie van renderRoleHeader → renderStudentHeader is buiten scope (Run 4 header-spec enforcement).

### Verificatie

```
=== Issue 1 ===
js/supabase.js:25  _supabaseIsPublicPage IIFE
js/supabase.js:55  autoRefreshToken: !_supabaseIsPublicPage
js/supabase.js:56  persistSession: true
js/supabase.js:57  detectSessionInUrl: !_supabaseIsPublicPage  PASS

=== Issue 2 ===
bbl-hub.html:2924  <footer class="kb-shared-footer">
bbl-hub.html:2926-2927  footer-brand + footer-links  PASS

=== Issue 3 ===
mijn-berichten.html:871  const headerRole conditional
mijn-berichten.html:872  renderRoleHeader(headerRole, 'berichten', ...)  PASS

=== PUBLIC_PAGES synchronisatie ===
js/supabase.js: 20 entries
js/utils.js:    20 entries
Lijsten identiek  PASS
```

### Smoke-test voor Barry — Run 1.5 v2

#### Test 1.1 — sessie-behoud BBL → kennisbank (KRITISCH)
1. Login als BBL Daan
2. DevTools → Application → Local Storage → noteer `sb-qoxgbkbnjsycodcqqmft-auth-token`
3. Klik header → kennisbank
4. Wacht 5s, ververs storage
5. **Verwacht:** sb-auth-token nog aanwezig
6. Klik logo/terug → bbl-hub
7. **Verwacht:** ingelogd, dashboard laadt

#### Test 1.2 — andere publieke pagina's
Herhaal Test 1.1 voor: about, pricing, faq, hoe-het-werkt, privacybeleid. Per pagina sb-auth-token blijft, terug naar dashboard zonder uitlog.

#### Test 1.3 — authenticated ongebroken
Login bedrijf → company-dashboard → autoRefresh werkt nog (zichtbaar via DevTools Network token-refresh elke ~50 min). Console schoon.

#### Test 1.4 — waitlist + subscriptions ongebroken
- about.html waitlist-popup + email submit werkt
- pricing.html "Gratis plan starten" werkt

#### Test 2 — bbl-hub footer
1. Login BBL Daan, scroll naar onder bbl-hub
2. **Verwacht:** rijke footer met "intern**ly**" brand + 10 links (about, kennisbank, hoe-het-werkt, worldwide, prijzen, FAQ, privacy, spelregels, ESG, contact) + tagline
3. Klik footer-link kennisbank → opent + blijft ingelogd

#### Test 3.1 — header BBL student
Login BBL Daan → klik berichten → **Verwacht:** 5 tabs (BBL Traject, Matchpool, Berichten, Kennisbank, Buddy)

#### Test 3.2 — header BOL student
Login BOL student → klik berichten → **Verwacht:** 7 tabs (Home, Matchpool, Vacatures, Sollicitaties, Berichten, Kennisbank, Buddy)

#### Test 3.3 — header buddy
Login buddy → klik mijn-berichten → **Verwacht:** Type E paars (Overzicht, Mijn matches, Mijn berichten, Mijn notities, Mijn profiel)

### Open vragen Run 1.5 v2

1. **PUBLIC_PAGES DRY-overtreding — wanneer consolideren?** Lijst op 2 plekken nu. Run na livetest of eerder?

2. **Bredere migratie renderRoleHeader → renderStudentHeader?** Andere student-pagina's met `renderRoleHeader('student', ...)` zonder bbl-check hebben dezelfde drift. Audit-follow-up?

3. **kb-shared-footer als canonical voor álle ingelogde pagina's?** bol-profile, buddy-dashboard, mijn-berichten, mijn-sollicitaties, bbl-dashboard hebben nog minimale footer. Run 4 of separate footer-uniformity run?

### Niet aangeraakt deze sessie

- js/utils.js PUBLIC_PAGES lijst (alleen gedupliceerd in supabase.js)
- js/telemetry.js — no-go
- sw.js — irrelevant voor Issue 1-3
- 7 andere pagina's met renderRoleHeader zonder bbl-detect — buiten scope

**Run 1.5 v2 status: GEÏMPLEMENTEERD — wacht op Barry's smoke-test.**

---

## BUNDLE-STATUS UPDATE — Run 1 + 1.5 v2 + 1.6

| Run | Status |
|---|---|
| Run 1 | KLAAR voor smoke (about, pricing, faq, discover) |
| Run 1.5 v2 Issue 1 | KLAAR voor smoke (js/supabase.js — passive client config) |
| Run 1.5 v2 Issue 2 | KLAAR voor smoke (bbl-hub.html — rijke footer) |
| Run 1.5 v2 Issue 3 | KLAAR voor smoke (mijn-berichten.html — BBL-header) |
| Run 1.6 | KLAAR voor smoke (clearUserState + 8 callers) |

**Alle 3 runs implementatie-klaar.** Eén bundel-commit mogelijk na smoke-PASS.

### Volledige FTP-bundle (na alle smokes PASS) — 14 files

```
js/supabase.js          (Run 1.5 v2 + 1.6)
js/utils.js             (Run 1.6)
js/account.js           (Run 1.6)
auth.html               (Run 1.6)
admin.html              (Run 1.6)
begeleider-dashboard.html               (Run 1.6)
international-school-dashboard.html     (Run 1.6)
international-student-dashboard.html    (Run 1.6)
about.html              (Run 1)
pricing.html            (Run 1)
faq.html                (Run 1)
discover.html           (Run 1)
bbl-hub.html            (Run 1.5 v2)
mijn-berichten.html     (Run 1.5 v2)
```

---

## RUN 1.7 — BBL-HUB SCHEMA-MISMATCH HOTFIX (5 mei 2026)

**Status:** **STOP — diagnose toont schema-versie-mismatch, geen code-bug.** Geen edits aan bbl-hub.html. Wacht op Barry-beslissing.

### Fase 1 — Bug A diagnose (`messages.type does not exist`)

**Foutregel:** [bbl-hub.html:1249-1251](../../bbl-hub.html#L1249-L1251)
```js
.from('messages')
.select('id, sender_id, content, created_at, read, type, metadata')
```

**Schema-source** [internly_migration.sql:187-194](../../internly_migration.sql#L187-L194):
```sql
CREATE TABLE IF NOT EXISTS messages (
  ...
  type      text DEFAULT 'text',  -- 'text' | 'zelfreflectie' | 'meeting_invite' | 'renewal'
  metadata  jsonb,
);
```

**Migration zegt: type EN metadata bestaan.** Beide kolommen zijn gedefinieerd in source.

**Andere callers van messages.type in bbl-hub:**
| Regel | Operatie | Functioneel doel |
|---|---|---|
| 1251 | SELECT type, metadata | render-loop |
| 1857 | `.eq('type', 'zelfreflectie')` | zelfreflectie-overview filter |
| 2243 | INSERT `type: 'zelfreflectie'` | reflectie-create |
| 1191 | render: `if (msg.type === 'meeting_invite' && msg.metadata)` | meeting-invite tile |

**Functioneel belang:** Zelfreflectie-STARR (BBL-specifiek) + meeting-invite rendering hangen aan `type` en `metadata`.

### Fase 2 — Bug B diagnose (`meetings.match_id does not exist`)

**Foutregel:** [bbl-hub.html:1426-1429](../../bbl-hub.html#L1426-L1429)
```js
.from('meetings')
.select('*')
.or(`organizer_id.eq.${currentUser.id},attendee_id.eq.${currentUser.id}`)
.eq('match_id', activeMatch.id)
```

**Schema-source** [internly_migration.sql:240-254](../../internly_migration.sql#L240-L254):
```sql
CREATE TABLE IF NOT EXISTS meetings (
  ...
  match_id uuid REFERENCES matches(id),
  ...
);
```

Plus index op [internly_migration.sql:1052](../../internly_migration.sql#L1052):
```sql
CREATE INDEX IF NOT EXISTS idx_meetings_match ON meetings(match_id);
```

**match_id is dubbel bevestigd in source: kolom + index.**

**9 andere callers van `meetings.match_id` (en conversations.match_id):**
| Plaats | Regel |
|---|---|
| chat.html | 815, 1056 |
| match-dashboard.html | 2702, 2703, 2704, 2787 |
| js/milestones.js | 18 |
| js/reviews.js | 104 |
| company-dashboard.html | 1998 (conversations.match_id) |

Alle gebruiken hetzelfde patroon zonder gerapporteerde errors → **kolom bestaat in productie DB**.

### Fase 3 — Bredere mini-audit bbl-hub

33 unieke `.from(...)` aanroepen in bbl-hub. Per tabel:

| Tabel | Aantal queries | Schema-mismatch? |
|---|---|---|
| messages | 4 (1250, 1297, 1332, 1854, 2239) | **JA** — type/metadata ontbreken in user-DB |
| meetings | 6 (1378, 1401, 1426, 1570, 2296, 2359) | **JA** — match_id ontbreekt; INSERT op 1579 zou ook falen |
| matches | 3 (2390, 2411, 2421) | onbekend — geen specifieke kolom-error gemeld |
| conversations | 3 (2647, 2658, 2659) | onbekend — gebruikt `match_id` (regel 2650), mogelijk dezelfde mismatch |
| student_profiles | 6 (1743, 1792, 1797, 1829, 1834, 2531) | OK |
| profiles | 3 (2515, 2597, 2610) | OK |
| company_doorstroom, buddy_pairs, buddy_requests, buddy_profiles | 5 totaal | OK |

**Mogelijke 3e mismatch:** [bbl-hub.html:2650](../../bbl-hub.html#L2650) `conversations.match_id`. Niet expliciet door Barry gemeld maar identiek patroon.

### Beslissing — STOP per plan-regel

Plan-spec: **"Bij Optie A2 of B2 (schema-migratie): STOP en rapporteer."**

Code-fix-opties:

**Bug A — Optie A1 (NIET aanbevolen):**
- Verwijder `type, metadata` uit SELECT (1251)
- Verwijder `.eq('type', 'zelfreflectie')` filter (1857) → reflecties niet onderscheidbaar
- Verwijder `type: 'zelfreflectie'` uit INSERT (2243)
- Verwijder meeting-invite rendering (1191) → tiles worden gewone berichten
- **Functioneel verlies:** zelfreflectie-feature kapot, meeting-invite UX kapot

**Bug B — Optie B1 (NIET aanbevolen):**
- Verwijder `.eq('match_id', ...)` (1429)
- Verwijder `match_id` uit INSERT (1579)
- **Functioneel verlies:** meetings van alle matches gemixed, INSERT verliest match-koppeling

**Schema-migratie (Optie A2 + B2) is veiliger** — bevestigt alleen wat de source-of-truth al stelt.

### Voorgestelde SQL voor Supabase Console (NIET door CC uitgevoerd)

```sql
-- Run 1.7 schema-sync — alleen uitvoeren als ALTER TABLE bevestigt dat
-- de kolommen ontbreken op de target-DB. Idempotent via IF NOT EXISTS.

-- Bug A: messages.type + metadata
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type     text DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Bug B: meetings.match_id + index
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES matches(id);
CREATE INDEX IF NOT EXISTS idx_meetings_match ON meetings(match_id);

-- Mogelijk 3e mismatch (niet bevestigd door Barry):
-- ALTER TABLE conversations ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES matches(id);
-- CREATE INDEX IF NOT EXISTS idx_conversations_match ON conversations(match_id);

-- Post-migratie verificatie:
SELECT column_name FROM information_schema.columns
WHERE table_name='messages' AND column_name IN ('type','metadata');
SELECT column_name FROM information_schema.columns
WHERE table_name='meetings' AND column_name='match_id';
```

### Open vragen Run 1.7

1. **Localhost vs productie DB-state?** Test 1.1 PASS bewees dat productie-Supabase werkt voor sessie-flow. Errors van Bug A+B zijn gemeld bij localhost-smoke. Hypothese: localhost-Supabase (dev-tenant of remote-pointed) heeft oudere migratie-staat. **Waar precies optreden — localhost of productie internly.pro?**

2. **Welke route?**
   - **Optie 1 — schema-sync alleen op localhost:** Barry voert SQL uit op localhost-Supabase. Productie ongewijzigd. Code blijft als-is. Risico: laag.
   - **Optie 2 — schema-sync ook op productie:** ter zekerheid `ALTER TABLE` met `IF NOT EXISTS` — geen kwaad als kolommen al bestaan. Risico: laag-medium.
   - **Optie 3 — code-degradatie:** zelfreflectie + meeting-invite uitschakelen in bbl-hub. Functioneel verlies. **Niet aanbevolen voor livetest.**

3. **3e mismatch?** Test conversations-load op localhost — als die ook faalt, voeg `conversations.match_id` toe aan migratie.

### Run 1.7 status

**STOP — geen edits aan bbl-hub.html.** Diagnose voltooid. Beslissing en migratie-uitvoer liggen bij Barry.

### Niet aangeraakt deze sessie

- bbl-hub.html — geen edits
- internly_migration.sql — alleen gelezen voor schema-bron
- Supabase Console / DB — niet aangeraakt (CC voert geen SQL uit)
- js/telemetry.js — no-go zone

---

## BUNDLE-STATUS UPDATE — Run 1 + 1.5 v2 + 1.6 + 1.7

| Run | Status |
|---|---|
| Run 1 | KLAAR voor smoke (4 files) |
| Run 1.5 v2 (3 issues) | KLAAR voor smoke (3 files) |
| Run 1.6 (clearUserState) | KLAAR voor smoke (8 files) |
| Run 1.7 (bbl-hub schema) | **GEBLOKKEERD** — Barry-beslissing schema-migratie of code-degradatie |

**Run 1.7 blokkeert NIET de bundle-commit van Run 1+1.5+1.6:**
- **Bij Optie 1 of 2 (schema-sync):** geen code-wijziging in bbl-hub, bundle gaat door zoals gepland
- **Bij Optie 3 (code-degradatie):** voeg bbl-hub.html toe aan FTP-bundle, codepatches eerst uitvoeren

Aanbeveling: **Optie 1 of 2** — code blijft schoon, schema komt in lijn met source-of-truth zoals oorspronkelijk bedoeld.
