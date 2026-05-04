# INTERNLY IMPLEMENTATIE-AUDIT — 3 mei 2026

**Type:** read-only verificatieaudit
**Scope:** CC3 (sessie-fix) + CC2 (cookie consent) + CC2b (consent dekking) + CC1 (Mollie webhook)
**Git HEAD:** `74731fe` (fix/consent-coverage: telemetry conditioneel + consent.js op alle pagina's)

---

## PRE-FLIGHT

### Laatste 8 commits

```
74731fe fix/consent-coverage: telemetry conditioneel + consent.js op alle pagina's
928f251 fix/cookie-consent: AVG-banner + cookiebeleid + algemene voorwaarden
6e84561 fix/session-race: _waitForSession singleton + SIGNED_OUT redirect + begeleider AccountModule
9e13b04 Routing canon B2: getRoleLanding() overal, requireRole uitgebreid, BBL-conflict opgelost
3f18476 Pre-deployment: audit fixes + security hardening 30 apr 2026
0c7565c [cta] primary CTA text 'Maak nu een profiel aan' to signup tab
2a0021b [polish] JSDoc on renderStudentHeader + warn when container missing
f3836a5 [P1] auth.html: ?mode=signup opens register tab
```

### .md-bestanden in root (na opruim-sessie eerder vandaag)

- `CLAUDE.md`
- `README.md`
- `SESSION_LOG.md`

> Andere recente .md's verplaatst naar `_docs\` (4) en `_archief\` (40 nieuw + 2 pre-existing). Zie eerdere opruim-sessie.

### Edge Functions aanwezig

- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/vat-verify/index.ts`
- `supabase/functions/mollie-webhook/index.ts` ← herschreven in CC1 (uncommitted op werkkopie)

### Pre-flight bevinding: CC1 niet gecommit

`git diff HEAD~3 --name-only` toont `supabase/functions/mollie-webhook/index.ts` als gewijzigd, maar de drie commits sinds HEAD~3 (CC3/CC2/CC2b) raken die file niet aan. **Conclusie:** CC1 mollie-webhook herschrijving + pricing.html JS-comment-update zitten op de werkkopie maar zijn nog niet gecommit en niet gedeployed naar Supabase.

---

## SECTIE A — CC3: SESSIE-VERLIES FIX

### A-01 | _waitForSession() in utils.js — **PASS**

| Check | Bewijs (regel + fragment) |
|---|---|
| Functie gedefinieerd | `js/utils.js:135` `function _waitForSession() {` |
| Singleton variabele | `js/utils.js:134` `let __sessionReadyPromise = null;` |
| Cache-check | `js/utils.js:136` `if (__sessionReadyPromise) return __sessionReadyPromise;` |
| INITIAL_SESSION-event | `js/utils.js:155` `if (event === 'INITIAL_SESSION' \|\| event === 'SIGNED_IN' \|\| event === 'TOKEN_REFRESHED') {` |
| Fallback `getSession()` | `js/utils.js:165-167` (uit eerdere read) `client.auth.getSession().then(...)` |
| Hard timeout 3 seconden | `js/utils.js:170` `setTimeout(() => _resolve(null), 3000);` |
| `window.awaitSession` | `js/utils.js:174` `window.awaitSession = _waitForSession;` |

### A-02 | PUBLIC_PAGES array — **PASS**

`js/utils.js:32-39` bevat de array:

```javascript
const PUBLIC_PAGES = [
  'index.html', 'about.html', 'kennisbank.html', 'kennisbank-artikel.html',
  'privacybeleid.html', 'algemene-voorwaarden.html', 'cookiebeleid.html',
  'spelregels.html', 'faq.html', 'hoe-het-werkt.html', 'pricing.html',
  'stagebegeleiding.html', '404.html', 'auth.html', 'internly-worldwide.html',
  'la-sign.html', 'preview.html', 'esg-rapportage.html', 'esg-export.html',
  'internly_simulator.html'
];
```

| Vereiste pagina | Aanwezig |
|---|---|
| index.html | ✓ |
| about.html | ✓ |
| auth.html | ✓ |
| privacybeleid.html | ✓ |
| spelregels.html | ✓ |
| faq.html | ✓ |
| cookiebeleid.html | ✓ |
| algemene-voorwaarden.html | ✓ |

`_isPublicPage()` helper: `js/utils.js:40-45` — controleert pad-suffix tegen array.

### A-03 | SIGNED_OUT redirect met isPublic — **PASS**

`js/utils.js:417-426`:

```javascript
client.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    __cachedUserRole = null;
    __cachedUserId   = null;
    __sessionReadyPromise = null; // reset zodat volgende login opnieuw wacht
    if (!_isPublicPage()) {
      window.location.replace('auth.html');
    }
  }
});
```

| Check | Bewijs |
|---|---|
| `SIGNED_OUT` afgehandeld | regel 418 |
| `USER_DELETED` afgehandeld | regel 418 (gecombineerd) |
| `__sessionReadyPromise` reset | regel 421 |
| Redirect alleen als private pagina | regel 422 `if (!_isPublicPage())` |

### A-04 | fetchUserRole + guardPage gebruiken _waitForSession — **PASS**

| Functie | Definitie | _waitForSession-aanroep |
|---|---|---|
| `fetchUserRole()` | `js/utils.js:176` | `js/utils.js:183` `await _waitForSession();` |
| `guardPage()` | `js/utils.js:264` | `js/utils.js:294` `await _waitForSession();` |
| `requireRole()` | `js/utils.js:216` | indirect — delegeert naar `fetchUserRole()` |

Backwards-compat: returnwaarden ongewijzigd. `requireRole(...)` retourneert `boolean`, `guardPage()` retourneert `{user, profile, role}|null`. Beide zijn ongewijzigd t.o.v. pre-CC3 signatuur.

### A-05 | Begeleider AccountModule — **PASS**

| Check | Bewijs (begeleider-dashboard.html) |
|---|---|
| `<script src="js/account.js">` | regel 20 |
| `<div id="account-container">` | regel 687 |
| Sidebar nav-item "Instellingen" | regel 502 `<button class="nav-btn" id="nav-account" onclick="show('account')">` |
| Mobile bottom-tab "Account" | regel 470 `<button class="mt-tab" id="mt-account" onclick="show('account')">` |
| `AccountModule.renderAccountScreen(` | regels 726, 733 |
| Lazy-load (eenmalig init) | regel 721 + `_accountRendered` flag |
| `window._currentUserId` set | regel 1291 `window._currentUserId = user.id; // CC-3: AccountModule contract` |

### A-06 | Inline getUser() op vier dashboards — **OPEN (verwacht)**

| Bestand | Inline `db.auth.getUser()` / `db.auth.getSession()` calls | `awaitSession`/`_waitForSession` workaround |
|---|---|---|
| company-dashboard.html | 5 | 0 |
| school-dashboard.html | 5 | 0 |
| bbl-hub.html | 1 | 0 |

**Totaal:** 11 inline calls op de drie bekende dashboards. Geen `window.awaitSession`-workaround toegepast.

> **Verwacht:** dashboard-migratie naar `guardPage()` is buiten scope CC3 en blijft op de backlog (zie [_docs/BACKLOG_AUDIT_2026-05-03.md](_docs/BACKLOG_AUDIT_2026-05-03.md)).

---

## SECTIE B — CC2: COOKIE CONSENT

### B-01 | js/consent.js structuur — **PASS**

| Check | Bewijs |
|---|---|
| Bestand aanwezig | `js/consent.js` (252 regels — instructie verwachtte ~232; verschil komt door extra inline JSDoc) |
| `window.InternlyConsent` geëxposeerd | regel 197 `window.InternlyConsent = {` |
| `init()` | regel 198 |
| `hasConsent(category)` | regel 206 |
| `onAccept(category, callback)` | regel 213 |
| `showPreferences()` | regel 227 |
| Categorieën `necessary`/`functional`/`analytics` | regels 129-131 in `categories: { ... }` configuratie + regel 30 `_pending` map |
| Auto-init op DOMContentLoaded | regel 247 `window.InternlyConsent.init();` |

### B-02 | CDN library en Internly-kleuren — **PASS**

| Check | Bewijs (js/consent.js) |
|---|---|
| CDN URL `cdn.jsdelivr.net/gh/orestbida/cookieconsent@v3` | regel 26 `'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@' + CC_VERSION + '/dist/'` met `CC_VERSION = 'v3.0.1'` (regel 25) |
| Oranje `#e05c1a` als primair | regel 43 `--cc-btn-primary-bg: #e05c1a;` |
| Groen `#1a7a48` als toggle | regel 50 `--cc-toggle-on-bg: #1a7a48;` |
| Beige `#f4f3ef` als bg | regel 40 `--cc-bg: #f4f3ef;` |
| `'Outfit'` font | regels 58, 60 `'Outfit', system-ui, sans-serif` |

### B-03 | translate.js achter functional consent — **PASS**

| Check | Bewijs (js/translate.js) |
|---|---|
| `_initTranslate()` privé-helper | regel 49 `function _initTranslate() {` |
| Google Translate-script laadt IN `_initTranslate()` | regels 63-65 (script-element wordt pas in `_initTranslate()` aangemaakt) |
| `hasConsent('functional')` check | regel 97 `if (window.InternlyConsent.hasConsent('functional')) {` |
| `onAccept('functional', ...)` callback | regel 100 `window.InternlyConsent.onAccept('functional', _initTranslate);` |
| `switchLang()` blijft publiek | regel 16 `window.switchLang = function (lang) {` |
| `googleTranslateElementInit` global | regel 38 `window.googleTranslateElementInit = function () {` |

### B-04 | index.html telemetry conditioneel — **PASS**

| Check | Bewijs (index.html) |
|---|---|
| Geen directe `<script src="js/telemetry.js">` | bevestigd: `data-internly-tel` patroon op regels 1844-1856 i.p.v. directe tag |
| `data-internly-tel` op dynamisch script | regel 1844 `if (document.querySelector('script[data-internly-tel]'))` + regel 1847 `s.dataset.internlyTel = '1';` |
| `hasConsent('analytics')` check | regel 1852 `if (window.InternlyConsent.hasConsent('analytics')) {` |
| `onAccept('analytics', ...)` callback | regel 1855 `window.InternlyConsent.onAccept('analytics', _internlyLoadTelemetry);` |
| consent.js geladen vóór conditioneel blok | regel 1825 `<script src="js/consent.js" defer></script>` (vóór de inline `<script>` op regel 1827+) |
| Pre-load shim `_fCtx` behouden | regels 1827-1838 (oude shim voor TIER-2 callers) |

### B-05 | Wettelijke pagina's — **PASS**

#### `cookiebeleid.html` (497 regels)

| Check | Bewijs |
|---|---|
| Bestand aanwezig | ja |
| Cookie-tabel (5 rijen) | regel 404 `<table class="cookie-tabel">` met rijen voor `internly_cc`, `sb-*-auth-token`, `internly_lang`, `Google Translate`, `internly_telemetry` |
| "Cookie-instellingen wijzigen" knop | regel 455 `<button type="button" class="cc-prefs-btn"` |
| `showPreferences()` aanroep | regel 456 `onclick="window.InternlyConsent && window.InternlyConsent.showPreferences()"` |
| Geen supabase.js geladen | bevestigd — geen `js/supabase.js` script-tag |
| Geen auth-guard | bevestigd — geen `requireRole`/`guardPage`/`getSession` aanwezig |

#### `algemene-voorwaarden.html` (475 regels)

| Check | Bewijs |
|---|---|
| Bestand aanwezig | ja |
| KVK 80201822 | regels 342, 448 `KVK: 80201822` |
| Sasubo Holding B.V. | meermaals (340, 341, 342, 350, 359, 360, 381, 388, 396, 397, 398, 399, 401, 408, 409, 416, 417, 426, 433, 441, 443, 446, 467) |
| Arrondissement Gelderland | regel 442 `bevoegde rechter in het Arrondissement Gelderland, locatie Arnhem` |
| Aansprakelijkheidsbeperking | regels 396-401, sectie 5; absoluut max € 1.000 op regel 398 |
| Geen supabase.js | bevestigd — geen `js/supabase.js` script-tag |

### B-06 | Footer-uitbreiding op vijf pagina's — **PASS**

Per pagina alle 4 patronen aanwezig (`cookiebeleid.html` + `algemene-voorwaarden.html` + `showPreferences` + `js/consent.js`):

| Bestand | CookieLink | AVLink | ConsentKnop | ConsentJs |
|---|---|---|---|---|
| index.html | ✓ | ✓ | ✓ | ✓ |
| about.html | ✓ | ✓ | ✓ | ✓ |
| pricing.html | ✓ | ✓ | ✓ | ✓ |
| privacybeleid.html | ✓ | ✓ | ✓ | ✓ |
| spelregels.html | ✓ | ✓ | ✓ | ✓ |

Verificatie via `Grep -c` per bestand: telkens 4 unieke matches (1 per patroon).

---

## SECTIE C — CC2b: CONSENT DEKKING

### C-01 | Telemetry conditioneel — **PASS**

| Metric | Aantal |
|---|---|
| Directe `<script src="js/telemetry.js">` in **root** HTML | **0** ✓ |
| Directe tags resterend (alleen in BACKUP/_revamp_*/backups) | 26 (buiten scope) |
| Conditionele `data-internly-tel` blokken in root HTML | **26** (= 25 Cat-X + Cat-Y pricing) |

Locaties van resterende directe tags zijn allemaal in `BACKUP/` en `_revamp_2026-04-29/backups/` — niet productie-relevant.

### C-02 | consent.js dekking — **PASS**

40 root-pagina's met `<script src="js/consent.js">`:

```
admin · algemene-voorwaarden · auth · about · bbl-dashboard · bbl-hub ·
bbl-profile · begeleider-dashboard · bol-profile · buddy-dashboard · chat ·
company-dashboard · company-discover · cookiebeleid · discover · esg-export ·
esg-rapportage · faq · hoe-het-werkt · index · international-school-dashboard ·
international-student-dashboard · internly-worldwide · kennisbank · kennisbank-artikel ·
la-sign · match-dashboard · matches · matchpool · mijn-berichten · mijn-notities ·
mijn-sollicitaties · pricing · privacybeleid · review-form · school-dashboard ·
spelregels · stagebegeleiding · student-profile · vacature-detail
```

Drie bestanden zonder consent.js (volgens uitzondering — geverifieerd via `Glob`):
- `404.html` ✓ (uitzondering: error pagina)
- `preview.html` ✓ (uitzondering: intern preview)
- `internly_simulator.html` ✓ (uitzondering: intern tool)

**Som:** 43 root-HTML-bestanden = 40 met consent + 3 uitzonderingen. Geen onverwacht ontbrekende bestanden.

### C-03 | Codename-check — **PASS**

Pattern: `ThreatScore|SecurityLog|DOMGuard|HUNTERS_CONFIG|IntegrityPulse|HoneypotSentinel|CanaryToken|CSPReporter|TimingGuard`

**Resultaat:** 0 hits in `*.html`. ✓

---

## SECTIE D — CC1: MOLLIE WEBHOOK

> **Belangrijk vooraf:** CC1-werk staat op de werkkopie maar is **nog niet gecommit en niet gedeployed**. De checks D-01 t/m D-04 + D-06 verwijzen naar de werkkopie. D-05 is alleen via SQL-uitvoer in Supabase Console te verifiëren — niet beschikbaar in deze sessie.

### D-01 | Edge Function herschreven — **PASS (op werkkopie)**

| Check | Bewijs |
|---|---|
| Bestandsgrootte | `supabase/functions/mollie-webhook/index.ts` = **405 regels** (was 203) |
| `processed_webhooks` tabel-referentie | regels 358, 392 |
| `https://api.mollie.com/v2` | regels 55, 75 |
| `MOLLIE_API_KEY` via env | regel 19 `Deno.env.get('MOLLIE_API_KEY')` |
| Idempotency-mention in comment | regel 8 |

### D-02 | Security posture — **PASS (op werkkopie)**

| Check | Bewijs |
|---|---|
| Alleen POST → 405 anders | regels 322-324 `if (req.method !== 'POST') { return new Response('Method not allowed', { status: 405 })` |
| Content-type-check | regel 327-330 (form-encoded of JSON, anders 400) |
| Try/catch over hoofdlogica | regel 400 `} catch (err) {` (rond hele Deno.serve) |
| Always 200 op interne fout | regel 402 `return new Response('Internal error', { status: 200 })` |
| API key alleen via env | regel 19 (`Deno.env.get`) — geen hardcoded keys |
| Env-vars-check op missende config | regel 335 `if (!MOLLIE_API_KEY \|\| !SUPABASE_URL \|\| !SUPABASE_SERVICE_KEY)` → 200 |

### D-03 | Mollie API terug-fetch — **PASS (op werkkopie)**

| Check | Bewijs |
|---|---|
| Fetch naar `/v2/payments/{id}` voor `tr_` | regel 110 prefix-check + path-routing (`type === 'payment' ? '/payments/${id}'`) regio rond regel 380 |
| Fetch naar `/v2/subscriptions/{id}` voor `sub_` | regel 111 + path-routing (`type === 'subscription' ? '/subscriptions/${id}'`) |
| Fetch naar `/v2/orders/{id}` voor `ord_` (extra) | regel 112 + path-routing (`/orders/${id}`) |
| Authorization header via env | regel 56 `'Authorization': \`Bearer ${MOLLIE_API_KEY}\`` |

### D-04 | Idempotency + status-mapping — **PASS (op werkkopie)**

| Check | Bewijs |
|---|---|
| Lookup vóór verwerking | regel 358 `.from('processed_webhooks').select('id').eq('mollie_id', id).maybeSingle()` |
| INSERT na verwerking | regel 392 `.from('processed_webhooks').insert({ mollie_id: id, event_type: type })` |
| `paid` → `active` | regel 154-168 |
| `failed`/`expired`/`canceled` → `past_due` | regel 187-189 |
| `refunded`/`charged_back` → `cancelled` | regel 204-206 |
| Subscription handler `sub_` (active/canceled/suspended/completed) | regel 218-258 |

> **Spelling-nuance:** code gebruikt `cancelled` (BR-Engels, dubbele L) consistent met `js/account.js:232` (`cancelled: 'red'`). Instructie schrijft `canceled` (US-Engels). Functioneel identiek; bewuste keuze om consistent te blijven met bestaande DB-waarden.

### D-05 | processed_webhooks tabel — **NIET VERIFIEERBAAR**

SQL Editor niet beschikbaar in deze sessie. Verwacht state-of-tabel:

```sql
SELECT EXISTS (...) AS tabel_aanwezig;  -- verwacht: true
-- Kolommen: id (uuid), mollie_id (text NOT NULL), event_type (text), processed_at (timestamptz)
-- Unieke index op mollie_id
```

**Tot SQL-uitvoer:** webhook returnt 200 OK maar logt `processed_webhooks insert fout` en verwerkt elke webhook elke keer opnieuw. CC1 SQL is een **harde deployment-prerequisite**.

### D-06 | Verouderd commentaar pricing.html — **PASS**

`pricing.html:692`:
```
// ── Mollie checkout flow — create-checkout Edge Function actief ─────────────
```

`Mollie-integratie volgt — stub` is verwijderd. Nieuwe regel aanwezig.

> **Vorm-nuance:** instructie suggereert HTML-comment `<!-- ... -->`, maar de regel staat binnen een `<script>`-blok dus is een JS-comment `// ...`. Functioneel correct.

---

## EINDRAPPORT

```
═══════════════════════════════════════════════════════════════════════
INTERNLY IMPLEMENTATIE-AUDIT — 3 mei 2026
Git HEAD: 74731fe
═══════════════════════════════════════════════════════════════════════

SECTIE A — CC3 SESSIE-FIX
  A-01 _waitForSession singleton:     PASS
  A-02 PUBLIC_PAGES array:            PASS
  A-03 SIGNED_OUT redirect:           PASS
  A-04 guardPage race-vrij:           PASS
  A-05 Begeleider AccountModule:      PASS
  A-06 Inline getUser open items:     OPEN (11 calls — 5+5+1; verwacht, migratie volgt)

SECTIE B — CC2 COOKIE CONSENT
  B-01 consent.js structuur:          PASS  (252 regels)
  B-02 CDN + Internly-kleuren:        PASS
  B-03 translate.js achter consent:   PASS
  B-04 index.html telemetry cond.:    PASS
  B-05 Wettelijke pagina's:           PASS  (cookiebeleid 497r, av 475r)
  B-06 Footer vijf pagina's:          PASS  (4/4 elementen op alle 5)

SECTIE C — CC2b CONSENT DEKKING
  C-01 Telemetry conditioneel:        PASS  (0 directe tags in root)
  C-02 consent.js dekking:            PASS  (40 root-pagina's + 3 uitzonderingen)
  C-03 Codename-check:                PASS  (0 hits)

SECTIE D — CC1 MOLLIE WEBHOOK (op werkkopie — niet gecommit)
  D-01 Edge Function herschreven:     PASS  (405 regels)
  D-02 Security posture:              PASS
  D-03 Mollie API terug-fetch:        PASS
  D-04 Idempotency + mapping:         PASS  (cancelled spelling: bewust BR)
  D-05 processed_webhooks tabel:      NIET VERIFIEERBAAR (SQL nodig)
  D-06 Commentaar pricing.html:       PASS

───────────────────────────────────────────────────────────────────────
TOTAAL PASS:              17
TOTAAL FAIL:               0
TOTAAL PARTIAL:            0
TOTAAL OPEN:               1   (A-06: dashboard-migratie buiten scope CC3)
TOTAAL NIET VERIFIEERBAAR: 1   (D-05: SQL nodig)
TOTAAL CHECKS:            19

KRITIEKE BEVINDINGEN:
  Geen FAIL of KRITIEK.

OPEN ITEMS VOOR VERVOLG:
  1. Dashboard-migratie naar guardPage()
     Bestanden: company-dashboard.html, school-dashboard.html, bbl-hub.html
                (+ begeleider-dashboard, indien nog niet)
     Reden: 11 inline db.auth.getUser()-calls profiteren niet van CC3 race-fix.
     Mitigatie tot migratie: callers kunnen `await window.awaitSession()` toevoegen
     vóór hun inline getUser-call.

  2. CC1 commit + deploy
     Bestand: supabase/functions/mollie-webhook/index.ts (uncommitted)
              pricing.html:692 (uncommitted JS-comment)
     Vereiste stappen:
       a. SQL in Supabase SQL Editor:
          CREATE TABLE IF NOT EXISTS processed_webhooks (
            id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            mollie_id    text UNIQUE NOT NULL,
            event_type   text NOT NULL,
            processed_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_webhooks_mollie_id
            ON processed_webhooks (mollie_id);
       b. supabase functions deploy mollie-webhook --no-verify-jwt
       c. git commit + push van werkkopie-wijzigingen

  3. _fCtx-shim ontbreekt op 4 dashboards (CC2b-restpunt)
     Bestanden: auth.html, la-sign.html,
                international-{student,school}-dashboard.html
     Reden: deze pagina's roepen _fCtx._guard/_init/_plant aan zonder
            typeof-guard. Bij analytics-weigering: ReferenceError mogelijk.
     Mitigatie: hetzij _fCtx pre-load shim toevoegen (zoals index.html),
                hetzij callers wikkelen in `if (typeof _fCtx !== 'undefined')`.

KLAAR VOOR FTP-UPLOAD: JA voor CC3 + CC2 + CC2b
                       NEE voor CC1 — eerst SQL + commit + deploy

═══════════════════════════════════════════════════════════════════════
```

---

**Audit uitgevoerd zonder enige wijziging aan code, configuratie of database. Alle bewijs uitsluitend door read-only greps en line-counts.**
