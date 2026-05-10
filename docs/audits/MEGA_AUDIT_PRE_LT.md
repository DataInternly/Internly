# MEGA PRE-LT AUDIT — 10 mei 2026
LT-deadline: maandag 11 mei 9:00 (T-21u)
Methode: read-only mechanische scan + bestaande audits geconsulteerd
Scope: alle .html / .js / .css / .htaccess / .json in project-root + js/ + css/

---

## Categorie A — Security Headers
Status: ⚠ ATTENTION

Bevindingen:
- [.htaccess:8-10] HTTPS-redirect aanwezig en `R=301` ✓
- [.htaccess:14-21] HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP allemaal aanwezig ✓
- [.htaccess:14] X-Frame-Options "SAMEORIGIN" ✓
- [.htaccess:16] HSTS `max-age=31536000; includeSubDomains` — geen `preload` directive (acceptabel, optioneel voor productie)
- [.htaccess:19] CSP staat `'unsafe-inline'` toe voor zowel `script-src` als `style-src` — gerechtvaardigd door inline-architectuur, maar verzwakt CSP
- [.htaccess] **GEEN compressie** (mod_deflate / brotli) geconfigureerd — match-dashboard.html is 278KB ongecompresseerd
- [.htaccess] **GEEN Cache-Control headers** voor static vs HTML — browser cached HTML standaard, kan stale-asset issues veroorzaken na FTP push
- [.htaccess:5] ErrorDocument 404 → /404.html ✓
- [.htaccess:20-21] X-Powered-By + Server unset ✓
- [.htaccess:19] CSP heeft geen `report-uri` / `report-to` — overtredingen nu lokaal gelogd via CSPReporter maar niet centraal verzameld
- [.htaccess] geen `frame-ancestors` directive (X-Frame-Options dekt het, modern browsers prefereren CSP)

Fix-suggesties:
- [LT-blocker NEE / week 1] mod_deflate aan voor html/css/js/json — 5-10 min op Antagonist (voeg `<IfModule mod_deflate.c>` blok toe). Verwachte 70-80% reductie van 278KB → 60KB transferred.
- [week 1] Cache-Control voor static assets (`.css`, `.js`, `.png`, `.svg`): `max-age=31536000, immutable`. Voor `.html`: `no-cache, must-revalidate`. ~10 min.
- [week 2+] CSP `report-uri` toevoegen + endpoint inrichten — niet LT-kritiek.
- [week 2+] HSTS preload submission via hstspreload.org — pas na minimaal 1 maand stabiele runtime.

---

## Categorie B — Navigation Integrity
Status: ⚠ ATTENTION

Bevindingen:
- [29 HTML files met `href="#"` patterns]: meeste zijn legitieme `onclick="event.preventDefault();smartHomeRedirect()"` topbar-logo's of `showForgotPassword()` modal-triggers — gedrag correct.
- [bbl-profile.html, buddy-dashboard.html, school-dashboard.html, company-dashboard.html, ... — 12 ingelogde pagina's] gebruiken `smartHomeRedirect()` → conform Bedward sign-off 5 mei 2026 ✓.
- [about.html:869, index.html:1807, privacybeleid.html:755, pricing.html:768, spelregels.html:608] `href="#"` voor `InternlyConsent.showPreferences()` → publieke pages gebruiken alleen `return false` zonder redirect — veilig ✓.
- [blog.html:214-219] 6× `<a href="#" class="bl-cat">` zonder JS-handler — placeholders die filter-functionaliteit suggereren maar niet werken. Gebruiker krijgt scroll-to-top bij klik.
- [_revamp_2026-04-29/example_dashboard.html] bevat tientallen `href="#"` — directory is example-pak, niet linked vanuit live nav.
- [company-dashboard.html:1153] `<a id="cpv-website" href="#" target="_blank">` — vermoedelijk dynamisch ingevuld via JS; standaard `display:none`, OK.
- [match-dashboard.html:2118] `<a id="back-to-dash" href="#">` — logica via JS, dynamic class show/hide.
- [auth.html:422] `<a id="alreadyDashBtn" href="#">` zonder `onclick` — gevuld door JS na auth-detectie. Bij JS-fail = scroll-to-top, niet kritiek.
- Externe links: alle 9 `target="_blank"` checks bevatten `rel="noopener noreferrer"` (faq.html:832 alleen `noopener` zonder `noreferrer` — minor).
- Telefoon-numbers / phone-format URLs: geen `tel:` schemes gevonden ✓.
- [robots.txt:3-28] disallow-lijst dekt alle ingelogde pages ✓, sitemap-link aanwezig regel 30 ✓.
- [sitemap.xml] bevat 10 publieke URL's — match met root van publieke nav ✓.

Niet getest (vereist browser):
- Browser-back gedrag op school-dashboard.html / begeleider-dashboard.html `goBack()` (F4.3.A — bekend issue, gelogd in TODO_ROL_AWARE_BACK_NAVIGATION.md, BUG OPEN per [docs/audits/MASTER_AUDIT_F4_UX.md:154-156](docs/audits/MASTER_AUDIT_F4_UX.md#L154-L156)).
- Smart-home-redirect na login per rol — 4 paths in [js/roles.js](js/roles.js).
- Logout flow per rol — `performLogout()` in [js/utils.js:412-455](js/utils.js#L412-L455) redirect naar `/index.html` ✓ (consistent voor alle 4 rollen).

Fix-suggesties:
- [LT-blocker NEE] [blog.html:214-219](blog.html#L214-L219): vervang 6× `<a href="#">` placeholders door `<button type="button" disabled>` of voeg `data-cat=""` filter-handler toe. ~10 min. ATTENTION want gebruiker kan denken dat de filter werkt.
- [week 1] [faq.html:832](faq.html#L832) — voeg `noreferrer` toe aan AP-link (consistentie). ~1 min.
- [week 2+] BUG: school-dashboard.html:709 + begeleider-dashboard.html:513 `goBack('discover.html')` verwijst naar STUDENT-pagina — al gelogd in [TODO_ROL_AWARE_BACK_NAVIGATION.md](docs/todos/) — niet LT-kritiek omdat goBack alleen actief is bij `history.length > 1`.

---

## Categorie C — Error Handling Coverage
Status: ⚠ ATTENTION

Bevindingen:
- `try` / `catch` ratio in js/: 49 / 56 — verwachting matched, sommige `catch` zit in `if/else` zonder bijbehorende `try` (één-arm catch in destructured `{ error }` patroon).
- [admin.html, auth.html, bbl-dashboard, bbl-hub, bbl-profile, bol-profile, buddy-dashboard, chat, company-dashboard, company-discover, discover, match-dashboard, matches, mijn-sollicitaties, school-dashboard, student-profile, vacature-detail] — **17 pages** hebben `window.addEventListener('unhandledrejection', ...)` ✓
- **MISSING `unhandledrejection`** maar wél telemetry.js geladen (10 pages):
  - begeleider-dashboard.html
  - student-home.html
  - review-form.html
  - pricing.html
  - mijn-berichten.html
  - matchpool.html
  - la-sign.html
  - international-student-dashboard.html
  - international-school-dashboard.html
  - index.html
- [_archief/audit_2026-04-22/THREAT_MODEL:148] eerder beschreven als duplicate inline-handler patroon — consolidatie naar [js/utils.js](js/utils.js) ooit gepland, niet uitgevoerd.
- Geen `catch(()=>{})` of `catch(e=>{})` empty stubs gevonden ✓ (silent failures eerder al opgeschoond, F3 audit PASS).
- [pre-browser-test-audit.md:69-89] 6 console-statements zonder `[module]` prefix — bekend ATTENTION, niet blokkerend.
- `notify()` user-friendly + `console.error` in `signOff` keten ✓ ([CLAUDE.md:Architecturele ketens](CLAUDE.md)).

Fix-suggesties:
- [LT-blocker NEE / week 1] Voeg `unhandledrejection` snippet toe aan de 10 missing pages. Optie 1 (snel): copy-paste 8-regelige handler. Optie 2 (correcter): centraliseer in [js/utils.js](js/utils.js) met IIFE die zichzelf attached. Optie 2 ~30 min, refactor — niet LT.
- [week 1] [pre-browser-test-audit.md:81-87] 6 console-statements voorzien van `[module]` prefix. ~5 min via Edit replace_all.
- [week 2+] Audit alle `.then()` chains in [js/buddy.js:18 hits](js/buddy.js) op missing `.catch()` — niet primary-load bottleneck.

---

## Categorie D — Telemetry Architectuur
Status: ✓ PASS

Bevindingen:
- Codenames check: grep op `HUNTERS_CONFIG|ThreatScore|SecurityLog|DOMGuard|IntegrityPulse|HoneypotSentinel|CanaryToken|CSPReporter|TimingGuard` — **0 hits** in *.html ✓ (alle hits in `js/telemetry.js`, `CLAUDE.md`, `docs/audits/`, `_archief/`).
- [js/telemetry.js:613 regels, 25KB] geladen op 27 HTML-pagina's:
  - All dashboards: bbl-dashboard, bbl-hub, bbl-profile, bol-profile, begeleider, buddy, chat, company, company-discover, discover, match-dashboard, matches, matchpool, mijn-berichten, mijn-sollicitaties, school, student-home, student-profile, international-* ✓
  - Auth-flow: auth.html, la-sign.html ✓
  - Login-required forms: review-form.html ✓
  - Public-but-sensitive: index.html (auth gate), pricing.html ✓
  - Admin: admin.html ✓
- NIET geladen op (per Bedward design): about, faq, blog, kennisbank, kennisbank-artikel, hoe-het-werkt, internly-worldwide, stagebegeleiding, security, privacybeleid, spelregels, cookiebeleid, algemene-voorwaarden, esg-rapportage, esg-export, internly_simulator, preview, 404, coming-soon-* ✓
- [.htaccess:19] CSP heeft **geen `report-uri`** — F3.4.B was P3, nog niet uitgevoerd. CSPReporter logt lokaal naar telemetry.SecurityLog. Acceptabel voor LT.
- [js/telemetry.js:448] mollie.com staat in ALLOWED-lijst van DOMGuard ✓.
- Boot sequence: laat na DOMContentLoaded ✓ (`_bootReady()` per CLAUDE.md).

Fix-suggesties:
- [LT-blocker NEE / week 2+] CSP `report-uri /csp-report` endpoint toevoegen + Edge Function voor verzameling. ~2u.
- Geen LT-actie noodzakelijk. Architectuur intact.

---

## Categorie E — PWA Integrity
Status: ⚠ ATTENTION

Bevindingen:
- [manifest.json] valide JSON, alle verplichte velden:
  - `name`, `short_name`, `description`, `start_url`, `display`, `background_color`, `theme_color`, `lang`, `icons` (192/512) ✓
  - **Mist** `scope` field (browsers default naar parent path van start_url) — niet kritiek
  - **Mist** `orientation` (default `any` — OK)
  - **Mist** `categories` field (cosmetic voor app-stores)
  - icons hebben geen `purpose` field — `maskable` icons ontbreken voor adaptieve Android-iconen
- [sw.js:90-94] `skipWaiting()` + `clients.claim()` aanwezig ✓
- [sw.js:8-31] push-handler met fallback voor non-JSON payloads ✓
- [sw.js:38-48] `notificationclick` met origin-validatie tegen protocol-injection ✓
- [sw.js:64-86] `pushsubscriptionchange` re-subscribe via BroadcastChannel ✓
- [sw.js] **GEEN offline fallback** — bij netwerkverlies krijgt gebruiker browser-default offline page
- [sw.js:5] `CACHE_VERSION = 'internly-v1'` gedeclareerd maar **nergens gebruikt** — geen actieve cache, dead constant
- [49 HTML files] alle hebben `apple-touch-icon` link ✓ ([404.html:8](404.html#L8) bv `/favicon_180x180.png`).
- iOS standalone status-bar styling: `<meta name="apple-mobile-web-app-status-bar-style">` niet getest in elke pagina, maar 49 files matched de bredere apple-* check.
- [favicon_192x192.png 4.5KB, favicon_512x512.png 13KB, favicon_180x180.png 4.4KB] — alle zinnig groot ✓.

Fix-suggesties:
- [LT-blocker NEE] Offline fallback page (`offline.html`) + sw.js cache-on-install van [`/index.html`, `/css/style.css`, fonts]. ~30 min. Polish, geen blocker.
- [week 1] Verwijder dead `CACHE_VERSION` constant of implementeer real caching. ~2 min.
- [week 1] Voeg `"scope": "/"` toe aan manifest.json voor stricte PWA-scope. ~1 min.
- [week 2+] Maskable icons toevoegen voor Android-launchers. Ontwerp-werk.

---

## Categorie F — Accessibility (WCAG 2.2 AA)
Status: ❌ FAIL

Bevindingen:
- `<html lang="...">` aanwezig op **alle 49 HTML-files** ✓ (verwacht "nl", actie EN op international-* pages — niet geverifieerd).
- `<img>` zonder `alt` attribute: **0 hits** ✓.
- `<a>` zonder zichtbare tekst (icon-only links): niet mechanisch gegrepd, vereist DOM-walk.
- [49 HTML files met apple-touch-icon] ✓.
- **`aria-label` / `aria-labelledby`** in 18 files (55 occurrences) — onvolledige dekking. Files **zonder** `aria-label`:
  - bbl-dashboard.html, bbl-hub.html, bbl-profile.html, bol-profile.html, buddy-dashboard, admin, auth, etc.
- **`aria-live` / `role="status"` / `role="alert"`**: slechts **2 hits** (`internly-worldwide.html:1`, `la-sign.html:1`) → `notify()` toast en realtime notif-banners zijn **niet aangekondigd door screen-readers**.
- **Skip-links**: 0 hits — geen "skip to content" link gevonden.
- `:focus-visible` styling: 0 hits in style.css. `:focus` aanwezig 15× — basis-focus-ring werkt, maar niet conditioneel voor keyboard-only users.
- [css/style.css:158] expliciete kennis-comment: "wit-op-#FF7E42 = 2.7:1 = AA-fail" — primary brand-orange `#FF7E42` op witte achtergrond **faalt WCAG AA contrast (4.5:1)**. Mitigatie via `--c-orange-deep #e05c1a` voor nieuwe componenten, maar bestaande btn-primary's gebruiken nog `#FF7E42`.
- Form labels: 276 `<label>` tags in 19 files — meeste forms gelabeld; ongelabelede inputs komen voor in inline-stijl checkboxes en filters — niet mechanisch gevalideerd.
- Keyboard navigation: niet verifieerbaar zonder browser-test.

Fix-suggesties:
- [LT-blocker NEE — bekend issue] [css/style.css:158-167] Brand-contrast issue — al gedocumenteerd, oplossing buiten scope LT.
- [week 1] `aria-live="polite"` op `#notif` (toast container in [js/utils.js:notify()](js/utils.js)) → toasts toegankelijk voor screen-readers. ~5 min.
- [week 1] Skip-link snippet `<a href="#main" class="skip-link">Naar hoofdinhoud</a>` + CSS voor focus-zichtbaar — copy-paste in 5 dashboards. ~15 min.
- [week 2+] `:focus-visible` regel in [css/style.css](css/style.css). ~5 min, kosmetische verbetering.
- [week 2+] Lighthouse a11y audit per pagina — verzamel onontdekte issues. ~2u.

---

## Categorie G — Performance / Core Web Vitals
Status: ❌ FAIL

Bevindingen:
- Bundle sizes (ongecompresseerd):
  - [js/utils.js](js/utils.js) — 57KB / 1350 regels — **groot**
  - [js/buddy.js](js/buddy.js) — 49KB
  - [js/telemetry.js](js/telemetry.js) — 25KB
  - [js/calendar.js](js/calendar.js) — 25KB
  - [js/account.js](js/account.js) — 19KB
  - [css/style.css](css/style.css) — 115KB / 2940 regels
  - [match-dashboard.html](match-dashboard.html) — **278KB** (inline scripts)
  - [company-dashboard.html](company-dashboard.html) — 176KB
  - [bbl-hub.html](bbl-hub.html) — 134KB
  - [school-dashboard.html](school-dashboard.html) — 121KB
- `loading="lazy"` op `<img>`: **0 hits** in alle 49 HTML-bestanden ❌
- `<script defer>` of `<script async>` op externe scripts: **53 occurrences in 42 files** — meeste pagina's hebben Supabase CDN + `js/*.js` zonder defer. CDN-script blokkeert parsing.
- `<link rel="preconnect">` aanwezig in 51 files ✓ (waarschijnlijk fonts.googleapis.com).
- Hardcoded grote afbeeldingen: alleen favicons (max 13KB) ✓ — geen content-images in repo.
- [.htaccess] **GEEN compressie** (zie cat. A) — 278KB match-dashboard zonder gzip.
- Inline styles: zwaar gebruikt in alle dashboards — niet kritiek voor perf maar verkleint cache-effectiviteit.

Fix-suggesties:
- [LT-blocker JA — minimaal 1 fix] mod_deflate aan in [.htaccess](.htaccess) (zie cat. A). 5 min, **enorme impact** op perceived performance over mobiel netwerk.
- [LT-blocker NEE / week 1] `defer` toevoegen aan alle externe `<script src="...">` in `<head>` over 42 files. Risico: load-order kan breken (utils → roles → supabase → telemetry per CLAUDE.md). Test 1 pagina eerst. ~30 min.
- [week 2+] `loading="lazy"` op alle `<img>` ondergrens-fold. ~15 min.
- [week 2+] Code-split [js/utils.js](js/utils.js) in core+ui+account modules. Refactor — buiten LT.
- [week 2+] CSS critical-path inline + rest async. Build-pipeline issue (geen build = handmatig).

---

## Categorie H — Cross-Browser Compatibility
Status: ⚠ ATTENTION

Bevindingen:
- Modern JS (optional chaining `?.`, nullish coalescing `??`, async/await): wijdverbreid gebruikt — OK voor Chrome 80+, Safari 14+, Firefox 72+. **Niet IE-compatible** (IE niet gesupport per CLAUDE.md).
- CSS custom properties (`--var`): basis van design-system — 99% browser-support OK.
- `backdrop-filter`: 66 occurrences in 32 files — werkt in Safari 9+ (met `-webkit-` prefix) en Chrome 76+, Firefox 103+. Niet getest of `-webkit-backdrop-filter` consistent meegegeven.
- `100vh`: 48 occurrences in 26 files → **iOS Safari issue**: 100vh = totale hoogte incl. address-bar, niet de visible viewport. Resultaat: full-screen overlays (modals, login screens) hebben overflow op iPhone < iOS 15.4 zonder `-webkit-fill-available` of `dvh`-fallback.
- Geen `dvh` of `svh` units in style.css — modern viewport units niet ingezet.
- `position: fixed` + scroll-lock body: niet mechanisch verifiëerd, vereist iOS-test.

Fix-suggesties:
- [LT-blocker NEE] [css/style.css] zoek-en-vervang `100vh` → `100dvh` in min-height-rules op modal/full-screen elementen. Risico: `dvh` niet gesupport in Safari < 15.4. Veiliger: voeg fallback `min-height: 100vh; min-height: 100dvh;` toe. ~15 min, browser-test vereist.
- [week 1] Verifieer alle `backdrop-filter` regels hebben `-webkit-backdrop-filter` companion. ~10 min.
- Mobiele testers vragen: iOS Safari + Android Chrome dekt 90%+ doelgroep, prioriteit-1 in LT.

---

## Categorie I — Mobile Responsiveness
Status: ⚠ ATTENTION

Bevindingen:
- Geen mechanische test mogelijk — vereist DevTools mobile-mode of fysiek device.
- [css/style.css:16] design-system declaration: "uitsluitend 768px (sidebar/layout), 480px (narrow-card/form), 360px (tiny-screen)". Geen media-query voor 320px viewport.
- [BACKLOG.md:67-68] `B5` en `F6` browser-test verifies open: avatar upload tijdens refresh + 320px mobile-tabs rendering.
- [pre-browser-test-audit.md F4.7.A] check buddy/bbl-profile/chat/match-dashboard bottom-nav bereikbaarheid — gemarkeerd als browser-test-required.
- Touch-target sizes: niet mechanisch verifieerbaar; vereist computed-style inspection.
- Soft-keyboard impact op viewport: zonder `viewport-fit=cover` + `env(safe-area-inset-bottom)` kunnen formulier-velden geblokkeerd raken op iOS. Meta-viewport bevat `viewport-fit=cover` ([404.html:5](404.html#L5)) — verspreiding niet gevalideerd.
- `position: sticky` op header in dashboard pages — kan op iOS Safari 13- gebroken zijn.

Fix-suggesties:
- [LT-blocker JA] **Mama-test op fysiek apparaat** voor 1 student-flow + 1 bedrijf-flow. ~30 min. Niet code-fix, maar verificatie noodzakelijk.
- [week 1] Min-width media-query voor 360px → 320px graceful-degradation toevoegen in [css/style.css](css/style.css). Eenmalig 15 min.
- [BACKLOG.md F5] Debounce match-dashboard meeting buttons (15 min, post-LT acceptabel).

---

## Categorie J — Console Cleanliness
Status: ⚠ ATTENTION

Bevindingen:
- `console.log|warn|debug` in *.html: **95 occurrences in 31 files**. Top hits:
  - match-dashboard.html: 12
  - company-dashboard.html: 10
  - school-dashboard.html: 9
  - chat.html: 8
  - buddy-dashboard.html: 7
  - bbl-hub.html: 5
- Niet alle zijn debug-leftovers; veel zijn legitime `console.error('[module] ...')` patroon.
- [pre-browser-test-audit.md:81-87] 6 statements zonder `[module]` prefix gedocumenteerd, niet blokkerend.
- `TODO|FIXME|XXX|HACK` patterns:
  - [bbl-hub.html:2991] `TODO: vervang met shared renderFooter() (Backlog #8)` — gelogd
  - [css/style.css:279] `Refactor-spec: TODO_LANG_SWITCHER_CLEANUP.md`
  - [international-school-dashboard.html:1010, international-student-dashboard.html:2363] zelfde footer TODO
  - Overige in docs/ — niet productie-code
- `window.debug = ...` / `debugger;` statements: **0 hits** ✓
- Geen `alert()` of `prompt()` debug-leftovers gevonden.

Fix-suggesties:
- [LT-blocker NEE] Productie-build heeft geen impact (geen console-stripping zonder build-step). Ze zijn intentioneel voor ops-debug van LT-incidenten. Geen actie.
- [week 1] [pre-browser-test-audit.md] 6 statements voorzien van `[module]` prefix. ~5 min.
- [week 2+] Wrapper `_log()` helper in [js/utils.js](js/utils.js) die productie/dev-mode stripped. Refactor.

---

## Categorie K — Hardcoded Secrets / Config
Status: ✓ PASS

Bevindingen:
- JWT-formaat regex (`eyJ...eyJ...`) hits: **alleen [js/supabase.js:7](js/supabase.js#L7)** — `SUPABASE_ANON_KEY`, **role: anon** (verifieerbaar in payload, base64-decoded). Per design correct ✓.
- `service_role` / `SERVICE_ROLE`: **0 hits** in client-code (alleen in `supabase/functions/*.ts` Edge Functions, server-side scope) ✓.
- API keys / tokens / passwords in code: geen patterns gedetecteerd.
- Telefoonnumers: `+31` patroon: **0 hits** ✓.
- Email addresses: alleen `@internly.pro` contact-emails (`hallo@`, `data@`, `boekhouding@`) — intentioneel ✓.
- [js/supabase.js:6,10] `SUPABASE_URL` + `__SUPABASE_ANON_KEY` window-exposure → telemetry.js dependency ✓ per [CLAUDE.md](CLAUDE.md).
- Loop-shield grep:
  - `function notify(` → 1 (utils.js:510) ✓
  - `function escapeHtml(` → 1 (utils.js:549) ✓
  - `function createNotification(` → 1 (utils.js:805) ✓
  - `const SUPABASE_URL` → 1 (supabase.js:6) + 2 in `supabase/functions/*.ts` (Deno Edge — andere scope) ✓
- [7 HTML files met inline `qoxgbkbnjsycodcqqmft.supabase.co`]: company-dashboard, internly-worldwide, vacature-detail, student-profile, pricing, discover, bol-profile — 1× per file in inline `fetch()` calls (gedocumenteerde uitzondering per [CLAUDE.md "Open voor Sprint 5"](CLAUDE.md)). Geen const-rebinding, alleen URL-string.

Fix-suggesties:
- Geen LT-actie. ✓ Architectuur is veilig.
- [week 2+] Inline SUPABASE_URL strings consolideren naar window-exposed `SUPABASE_URL`. Cosmetische cleanup, niet security-issue.

---

## Categorie L — Dead Code / Unused Files
Status: ⚠ ATTENTION

Bevindingen:
- `stage-hub.html`: gerefereerd in 11 docs/archief files, **niet aangewezen vanuit live nav of code** ✓ (dood, moet niet worden geüpload).
- Backup directories aanwezig in repo:
  - `_archief/` — 1.4MB (audit reports, log files)
  - `_revamp_2026-04-29/` — 120KB (4 example_*.html files met dode `href="#"` placeholders)
  - `_prod_backup_2026-05-08/` — 0 bytes (lijkt leeg of placeholder)
  - `_docs/` — separate doc folder
- `_revamp_2026-04-29/example_*.html` files **bevatten dode links en kunnen geïndexeerd worden door zoekmachines als ze geüpload worden naar productie** — niet in [robots.txt](robots.txt) disallow.
- `404.html`, `AVATAR_MIGRATION.sql`, `BACKLOG_MIGRATION.sql`, etc. SQL files in root — productie-FTP zou ze niet moeten uploaden.
- Geen `.bak` / `_old` / `.copy` HTML files in root ✓.
- [BACKLOG.md:74] `charCount` lokaal in 3 profile-pagina's — duplicate definitie, post-LT consolidatie gepland.
- [CLAUDE.md "Open voor Sprint 5"] hasActivePlan() gating not active op 6 pagina's — dead code path, niet gevaarlijk.
- [CLAUDE.md "Bekende stubs"] stage-hub.html staat foutief in `_archief/HANDOVER.md` FileZilla-lijst — risico op upload als FileZilla-config niet handmatig wordt geverifieerd.

Fix-suggesties:
- [LT-blocker JA] **Verifieer FTP-upload-script / FileZilla-filterlijst** — sluit alle `_archief/`, `_revamp_*`, `_docs/`, `_prod_backup_*`, `*.sql`, `*.md`, `seed/`, `supabase/`, `sql/` mappen uit. ~10 min handmatig in FileZilla. **Critical** want anders krijgt productie SQL-bestanden, audit-rapporten, en example-pages mee.
- [LT-blocker NEE / week 1] `_revamp_2026-04-29/` toevoegen aan robots.txt disallow als het wel geüpload wordt.
- [week 2+] Dead `stage-hub.html` references uit docs verwijderen.

---

## Categorie M — SEO / Discoverability
Status: ⚠ ATTENTION

Bevindingen:
- [robots.txt] aanwezig, disallow-lijst correct, sitemap-link aanwezig ✓.
- [sitemap.xml] 10 publieke URLs gelijst. **Mist** kennisbank-artikel.html dynamisch, blog.html, security.html. Niet kritiek voor LT.
- `<meta name="description">`: 22 files (alleen publieke + 404) ✓.
- Open Graph tags (`og:title`, `og:description`, `og:image`): **16 files** — alle publieke pages dekken ✓.
- [404.html:15] `og:image https://internly.pro/og-image.png` → **og-image.png bestaat niet in repo-root**. Social-sharing previews tonen broken image.
- `<link rel="canonical">`: slechts **2 files** (kennisbank.html, kennisbank-artikel.html) — alle andere publieke pages missen canonical → kan duplicate-content issue veroorzaken bij www/non-www variant.
- `apple-touch-icon` aanwezig in 49 files ✓.
- `favicon.ico`, `favicon.svg`, `favicon_180x180.png`, `favicon_192x192.png`, `favicon_512x512.png` allemaal aanwezig ✓.
- `<title>` tag: niet mechanisch geverifieerd dat alle 49 pages een unieke title hebben.

Fix-suggesties:
- [LT-blocker NEE] Maak `og-image.png` (1200×630px) — branded preview voor social sharing. ~10 min ontwerp + upload. **Hoge zichtbaarheid voor LT-marketing**.
- [week 1] `<link rel="canonical" href="https://internly.pro/...">` toevoegen aan elke publieke page (12 files). ~10 min.
- [week 2+] Dynamische sitemap-generatie voor kennisbank-artikelen.

---

## Categorie N — Legal / Compliance (NL)
Status: ⚠ ATTENTION

Bevindingen:
- [privacybeleid.html] aanwezig + linked vanaf footer in alle publieke pages ✓.
- [cookiebeleid.html] aanwezig + InternlyConsent banner in 42 HTML-files ✓ (consent.js).
- [algemene-voorwaarden.html] aanwezig — Sasubo Holding B.V., KVK 80201822 vermeld ✓.
- KVK + bedrijfsnaam in 45 HTML files — colofon-info voldoende verspreid ✓.
- [algemene-voorwaarden.html:425] verwerkersovereenkomst beschikbaar via `data@internly.pro` op aanvraag ✓.
- [project_launch_todos.md memory] **Postadres Sasubo Holding ontbreekt nog in privacybeleid.html** — niet gefixt.
- Supabase DPA: per memory "DPA aangevraagd (niet ontvangen)" — **OPEN ITEM**.
- AP supervisory authority disclosure: `autoriteitpersoonsgegevens.nl` link aanwezig in cookiebeleid, faq, privacybeleid ✓.
- Cookie-banner: `js/consent.js` (11KB) geladen — niet getest of analytics cookies daadwerkelijk pas na consent worden gezet.
- AVG right-to-be-forgotten: `deletion_requested` flow geïmplementeerd in [js/account.js](js/account.js) ✓.

Fix-suggesties:
- [LT-blocker JA / NEE — afhankelijk van risico-acceptatie]
  - **Postadres Sasubo Holding** toevoegen aan [privacybeleid.html](privacybeleid.html). ~5 min als adres bekend. AVG-eis art. 13.1.a (identiteit verwerkingsverantwoordelijke).
  - **DPA Supabase**: niet code-fix — proces-blocker. Als Pa's juridisch akkoord vindt dat 5 testers + Supabase EU-region voldoende dekking is, dan GO; anders NO-GO.
- [week 1] Cookie-consent test: zet via DevTools Application > Storage de consent op "deny" en verifieer dat geen analytics-cookies worden gezet.
- [week 2+] Audit consent-banner UX: geen "deny all"-knop = AVG art. 7 risk.

---

## Categorie O — Error Pages
Status: ⚠ ATTENTION

Bevindingen:
- [404.html](404.html) aanwezig + nuttige content (titel, terug-link) ✓ — gerefereerd in [.htaccess:5](.htaccess#L5).
- **`500.html` ontbreekt** — bij Apache 5xx-errors krijgt gebruiker default Apache page.
- **`maintenance.html` ontbreekt** — bij planned downtime is er geen branded fallback.
- **PWA offline fallback page ontbreekt** (zie cat. E).
- [.htaccess:5] alleen `ErrorDocument 404` geconfigureerd; `403`, `500`, `503` ontbreken.
- 404.html laadt `<link rel="stylesheet" href="css/style.css">` — als CSS faalt is page lelijk maar functioneel ✓.

Fix-suggesties:
- [LT-blocker NEE] `500.html` + `503.html` toevoegen + `.htaccess` ErrorDocument-regels. ~15 min. Niet kritiek want testers 5 personen, kans op DB-uitval is laag.
- [week 1] `maintenance.html` voor pre-LT downtime windows. Sjabloon kopie van 404.html. ~10 min.
- [week 2+] `offline.html` voor PWA (zie cat. E).

---

## Categorie P — Loading + Empty States
Status: ⚠ ATTENTION

Bevindingen:
- `skeleton|loading|spinner` keyword-hits: **87 occurrences in 22 files** ✓ — wijdverbreide loading-state CSS aanwezig.
- Top dashboards: bbl-dashboard:15, match-dashboard:20, mijn-berichten:6, international-student-dashboard:7 — meeste pagina's hebben `.skeleton-card` of equivalent.
- Empty-state UI patterns: niet mechanisch verifieerbaar — vereist DOM-render-test per pagina.
- [match-dashboard.html, mijn-sollicitaties.html, etc.] hebben standaard "Geen matches yet" / "Geen sollicitaties" copy — niet alle uniform.
- Retry-knoppen na failed-load: niet mechanisch detecteerbaar; het patroon `notify('Kon niet laden', false)` is wel aanwezig maar zonder UI-retry-button.

Fix-suggesties:
- [LT-blocker NEE] Retry-button helper in [js/utils.js](js/utils.js) (`renderRetry(target, retryFn)`). ~30 min. Polish.
- [week 1] Mama-test verifieer dat empty states begrijpelijk zijn voor non-tech testers.
- [week 2+] Skeleton harmonisatie — sommige pagina's gebruiken spinner, andere skeleton. Cosmetic.

---

## Categorie Q — Forms
Status: ⚠ ATTENTION

Bevindingen:
- `required` attribute: 71 occurrences in 14 files ✓ ([bol-profile.html:11](bol-profile.html), [student-profile.html:11](student-profile.html), etc.).
- `maxlength`: matched onder `required` patroon, dekking acceptabel.
- `autocomplete=` attributes: **slechts 21 occurrences in 11 files** — DEKKING LAAG. Auth-form correct (auth.html:5), maar profile-forms missen `autocomplete="given-name"`, `autocomplete="email"`, `autocomplete="postal-code"`, etc. → trager voor mobiele gebruikers.
- `<label>` tags: 276 in 19 files — meeste form-velden gelabeld ✓.
- [BACKLOG.md F5] match-dashboard meeting buttons missen disable-during-await — race-condition risico bij rapid clicks.
- Submit-buttons disabled tijdens `await`: niet uniform geïmplementeerd, post-LT polish.
- Form-error UI: `notify()` toast aanwezig — geen inline-error-state per veld.

Fix-suggesties:
- [LT-blocker NEE] [BACKLOG.md F5] match-dashboard debounce — 15 min, gepland post-LT.
- [week 1] `autocomplete=` attributes toevoegen aan 11 profile-form pagina's. ~30 min, mama-test verbetering.
- [week 2+] Inline-validation per veld (sub-tekst rood bij ongeldig email). Refactor.

---

## Categorie R — Data Retention + LT-Cleanup
Status: ⚠ ATTENTION

Bevindingen:
- Test-account-emails: `student@internly.pro`, `bedrijf@internly.pro`, `school@internly.pro` per [CLAUDE.md] — productie-data, niet test-pattern. Geen `.test@` suffix-conventie gevonden.
- `deletion_requested` flow geïmplementeerd in [js/account.js](js/account.js) ✓ — testers kunnen zelf account verwijderen na LT.
- AVG right-to-be-forgotten: code-pad aanwezig, niet getest dat alle gerelateerde tabellen daadwerkelijk worden geleegd (matches, applications, messages, etc.).
- [BACKLOG.md] geen expliciete post-LT cleanup-taak gedocumenteerd voor test-data.
- Ghosting-bestraffing: niet geïmplementeerd per [CLAUDE.md "Bekende stubs"] — geen automatische cleanup van inactieve testers.

Fix-suggesties:
- [LT-blocker NEE] Definieer test-account-naam-conventie (bv. `lt2026-test-N@internly.pro`) zodat post-LT cleanup-query één regex-match is. ~5 min beleid + tester-instructie.
- [week 1] Post-LT cleanup-script in [_docs](_docs/) met SQL: DELETE FROM matches WHERE user_id IN (...); DELETE FROM messages WHERE ...; DELETE FROM auth.users WHERE email LIKE 'lt2026-%'; ~30 min draft + Barry-review.
- [week 1] Verifieer `deletion_requested` flow in tester-omgeving — handmatige delete-test van 1 account.
- [BACKLOG.md] Voeg "post-LT data cleanup" item toe.

---

## Categorie S — Disaster Recovery / Rollback
Status: ⚠ ATTENTION

Bevindingen:
- DB rollback: Supabase project `qoxgbkbnjsycodcqqmft` — point-in-time recovery vereist Pro plan; status onbekend in repo. Per [CLAUDE.md] geen melding van Pro-tier.
- Git revert path: alle commits klein en atomair ✓ — `git revert <hash>` triviaal.
- FTP rollback: geen automatische backup; `_prod_backup_2026-05-08/` directory aanwezig (0 bytes) — leeg / placeholder. **GEEN actuele productie-snapshot in repo.**
- DNS / Antagonist hosting: rollback procedure niet gedocumenteerd in repo.
- Communicatie-plan testers: niet gedocumenteerd. Per [CLAUDE.md] alleen contact `hallo@internly.pro`.

Fix-suggesties:
- [LT-blocker NEE — maar STERK aanbevolen]
  - **Maak handmatige snapshot vóór maandag 9:00**: `git tag pre-LT-2026-05-11 && git push --tags` + FTP-download van huidige productie naar `_prod_backup_2026-05-11/`. ~20 min.
  - Verifieer Supabase Pro-plan + PITR enabled in dashboard. Als niet: **upgrade vóór LT**.
  - Schrijf 1-pager `_docs/LT_INCIDENT_PLAYBOOK.md` met: wie belt wie, wanneer revert, hoe testers infomeren. ~30 min.
- [week 1] Automatische dagelijkse Supabase backup-export configureren.
- [week 2+] FTP-deploy script met automatische pre-deploy backup.

---

## Categorie T — Incident Monitoring During LT
Status: ⚠ ATTENTION

Bevindingen:
- [js/telemetry.js] SecurityLog logt naar Supabase tabel — **welke tabel?** Niet uit codenames-namen direct afleidbaar zonder telemetry.js volledig te lezen.
- Geen `error_logs` of `incident_log` tabel-conventie in repo gevonden.
- WhatsApp / Slack / email-alert voor errors: geen webhook-config in code.
- Per [CLAUDE.md] geen monitoring-dashboard URL gedocumenteerd.
- [BACKLOG.md F6 ESG-export "live ESG-export PDF/CSV stub"]: stuborrend = no-op, geen telemetry.
- Anti-bruteforce: HoneypotSentinel + ThreatScore in telemetry.js — **score-thresholds niet gedocumenteerd**, dus testers met legitiem snel-tikken kunnen freeze triggeren.

Fix-suggesties:
- [LT-blocker NEE — maar STERK aanbevolen]
  - **Barry briefing T-21u**: open Supabase dashboard tabel `security_logs` (echte naam in telemetry.js _tel) + browser-tab op live productie-URL. Refresh elke 30 min eerste 4 uur LT. ~15 min set-up.
  - WhatsApp-groep "Internly LT-monitoring" tussen Pa, Barry, Geordi2 — 1× per uur status-check. Proces, niet code.
- [week 1] Supabase Edge Function `lt-status-summary` die elke 5 min `security_logs` aggregeert + posts naar Slack/WhatsApp. ~1u.
- [week 2+] Sentry / Datadog integration. Productizatie.

---

## EINDOORDEEL

### Overzichtstabel

| Categorie | Status | LT-blockers | Week-1 items |
|-----------|--------|-------------|--------------|
| A. Security headers | ⚠ ATTENTION | 0 | 2 (compressie, cache-control) |
| B. Navigation | ⚠ ATTENTION | 0 | 1 (blog placeholders) |
| C. Error handling | ⚠ ATTENTION | 0 | 2 (10 missing handlers, console prefix) |
| D. Telemetry | ✓ PASS | 0 | 0 |
| E. PWA | ⚠ ATTENTION | 0 | 1 (manifest scope) |
| F. Accessibility | ❌ FAIL | 0 | 3 (aria-live, skip-link, focus-visible) |
| G. Performance | ❌ FAIL | 1 (mod_deflate) | 2 (defer scripts, lazy images) |
| H. Cross-browser | ⚠ ATTENTION | 0 | 1 (100vh fallback) |
| I. Mobile | ⚠ ATTENTION | 1 (mama-test) | 2 (320px MQ, debounce) |
| J. Console | ⚠ ATTENTION | 0 | 1 (prefix) |
| K. Secrets | ✓ PASS | 0 | 0 |
| L. Dead code | ⚠ ATTENTION | 1 (FTP-filter) | 1 (robots.txt) |
| M. SEO | ⚠ ATTENTION | 0 | 2 (og-image, canonical) |
| N. Legal | ⚠ ATTENTION | 0/1 (postadres + DPA) | 1 (consent test) |
| O. Error pages | ⚠ ATTENTION | 0 | 2 (500/maintenance) |
| P. Loading states | ⚠ ATTENTION | 0 | 1 (mama-test) |
| Q. Forms | ⚠ ATTENTION | 0 | 1 (autocomplete) |
| R. Data retention | ⚠ ATTENTION | 0 | 2 (cleanup-script) |
| S. Disaster recovery | ⚠ ATTENTION | 0 (sterk aanbevolen pre-LT) | 1 (snapshot) |
| T. Monitoring | ⚠ ATTENTION | 0 (sterk aanbevolen) | 1 (Barry-briefing) |

**Statistiek**:
- ✓ PASS: 2 categorieën (D, K)
- ⚠ ATTENTION: 16 categorieën
- ❌ FAIL: 2 categorieën (F, G)
- Harde LT-blockers: **3** (mod_deflate, mama-test mobile, FTP-filter)

---

### EINDVERDICT: **GO maandag 9:00** mits onderstaande items afgehandeld

#### Pre-LT MUST FIX (vóór maandag 9:00) — 3 items
1. **mod_deflate aan in [.htaccess](.htaccess)** — 5 min, enorme perf-impact (cat. A + G).
2. **FTP-upload-filterlijst verifiëren** — geen `_archief/`, `_revamp_*`, `_docs/`, `_prod_backup_*`, `*.sql`, `*.md`, `seed/`, `supabase/`, `sql/`. ~10 min handmatig in FileZilla. (cat. L)
3. **Mama-test op fysiek apparaat** — 1 student-flow + 1 bedrijf-flow op iPhone + Android. ~30 min. (cat. I)

#### Pre-LT SHOULD FIX (sterk aanbevolen) — 5 items
4. **Pre-LT git tag + FTP-snapshot** voor rollback-pad — `git tag pre-LT-2026-05-11`. ~20 min. (cat. S)
5. **Supabase PITR / Pro-plan verifiëren** — 5 min Supabase dashboard. (cat. S)
6. **Postadres Sasubo Holding in [privacybeleid.html](privacybeleid.html)** — AVG art. 13.1.a — ~5 min als adres bekend. (cat. N)
7. **DPA Supabase — Pa's juridisch akkoord op risico-acceptatie** — proces, niet code. (cat. N)
8. **`og-image.png` aanmaken + uploaden** — social-sharing previews — ~10 min ontwerp. (cat. M)

#### Post-LT WEEK 1 — 12 items, totaal ~3 uur werk
- mod_deflate verifieren in productie + Cache-Control headers (cat. A) — ~10 min
- 10 pagina's `unhandledrejection`-handler toevoegen (cat. C) — ~30 min
- 6 console-statements `[module]` prefix (cat. C/J) — ~5 min
- Manifest `scope` + dead `CACHE_VERSION` (cat. E) — ~5 min
- `aria-live` op `#notif`, skip-links op 5 dashboards (cat. F) — ~20 min
- `defer` op externe scripts in 42 HTML files (cat. G) — ~30 min, browser-test vereist
- `100vh` → `100dvh` fallback (cat. H) — ~15 min
- 360px → 320px media-query (cat. I) — ~15 min
- Canonical-tags op 12 publieke pages (cat. M) — ~10 min
- 500.html + 503.html + maintenance.html (cat. O) — ~25 min
- `autocomplete=` op 11 profile-forms (cat. Q) — ~30 min
- Post-LT data-cleanup SQL-script (cat. R) — ~30 min

#### Post-LT WEEK 2+ (refactor / polish)
- CSS critical-path inline (cat. G)
- `dvh`/`svh` viewport-units project-breed (cat. H)
- Sentry/Datadog incident monitoring (cat. T)
- Maskable PWA icons (cat. E)
- ESG-export feature implementatie (separate item, niet in deze audit)

---

### Top-3 bevindingen

1. **Compressie ontbreekt in [.htaccess](.htaccess)** — match-dashboard.html is 278KB ongecompresseerd. Dit is de enige echte performance-blocker; alle andere perf-issues zijn marginale optimalisaties. Eén `<IfModule mod_deflate.c>` blok lost dit op in 5 minuten en levert 70-80% reductie van transfer-grootte.

2. **FTP-deploy-risico**: 1.4MB+ aan `_archief/`, audit-rapporten, SQL-migraties en `_revamp_2026-04-29/` example-pages staan in repo-root. Zonder strikte FileZilla-filter komen deze op productie en worden ze geïndexeerd. Dit is GEEN code-fix maar een handmatige verificatie pre-deploy.

3. **Accessibility FAIL**: brand-orange `#FF7E42` op witte achtergrond = 2.7:1 contrast (AA-fail), gedocumenteerd in [css/style.css:158](css/style.css#L158) maar niet opgelost. Toasts hebben geen `aria-live` annotatie (alleen 2 hits in totaal). Geen skip-links. Voor 5 testers in LT geen blocker, maar **na LT moet WCAG-conformiteit serieus worden aangepakt** als publicatie-belofte vereist (sommige scholen / SBB-instanties stellen WCAG 2.1 AA verplicht).

---

**Audit afgerond**: 10 mei 2026, ~T-21u
**Methode**: read-only mechanische scan + cross-reference met bestaande audits ([MASTER_AUDIT_F1-F7](docs/audits/), [pre-browser-test-audit.md](docs/audits/pre-browser-test-audit.md), [BACKLOG.md](BACKLOG.md), [CLAUDE.md](CLAUDE.md))
**Niet getest** (vereist browser/device): cat. F (kbd-nav), cat. H (Safari 100vh), cat. I (320px viewport), cat. P (visual empty states)
