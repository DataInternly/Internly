# MASTER AUDIT — FASE 3 : SECURITY (XSS, SRI, headers, secrets)
Datum: 9 mei 2026
Methode: read-only grep + .htaccess inspectie + sw.js review

---

## 3.1 — `innerHTML` XSS-vectors

### Resultaten — alle hits met template literals
| Locatie | Code | User-input? | Status |
|---|---|---|---|
| bbl-dashboard.html:431,433 | `Jouw recht: vóór <strong>${decisionDateStr}</strong> ...` | NEE — formatNLDate() output | SAFE |
| bbl-hub.html:1199,1202 | `Contract loopt af over <strong>${days} dagen</strong> ...` | NEE — int via Math.ceil | SAFE |
| chat.html:1800 | `Verloopt over <b>${--s}</b>s` | NEE — countdown int | SAFE |
| company-dashboard.html:2844 | `<strong>${filled}/${fields.length}</strong>...<em>${missing.join(', ')}</em>` | NEE — `missing` is hardcoded field names array | SAFE |

**Andere `.innerHTML` patronen onderzocht**: 
- Het project gebruikt veelvuldig `.innerHTML = '<div ...>'` met statische strings — geen XSS-vector
- Voor user-input wordt vrijwel altijd `escapeHtml()` aangeroepen

**Status: PASS** — geen template-literal XSS vector aangetroffen.

**Aanbeveling [P3]**: vervang de 6 template-literals alsnog door `textContent` waar mogelijk; principle of least power.

---

## 3.2 — `escapeHtml()` coverage

### Resultaten
| Locatie | Definitie? |
|---|---|
| `js/utils.js:527` | **enige live definitie** |
| `_archief/`, `_revamp_*/` | archief — niet in scope |

`function escapeHtml(` — **0 hits buiten utils.js**. Loop-shield CLAUDE.md regel gehandhaafd.

**Status: PASS**

---

## 3.3 — SRI (Subresource Integrity)

### Externe scripts in HTML
| Bestand | Source | SRI? | crossorigin? |
|---|---|---|---|
| **49 pagina's** | cdn.jsdelivr.net/.../supabase-js@2.45.4 | ✓ JA | ✓ JA |
| pricing.html:407 | cdn.jsdelivr.net/.../supabase.min.js | ✓ JA | ✓ JA |
| bbl-hub.html:64 | cdnjs.cloudflare.com/.../jspdf.umd.min.js | ✓ JA | ✓ JA |
| match-dashboard.html:19 | cdnjs.cloudflare.com/.../jspdf.umd.min.js | ✓ JA | ✓ JA |
| chat.html:20 | cdn.jsdelivr.net/.../emoji-mart@5.5.2 | ✓ JA | ✓ JA |
| **discover.html:21** | maps.googleapis.com/.../api/js | **❌ NEE** | n.v.t. |

### F3.3.A — Google Maps API zonder SRI [P3]
`discover.html:21`:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyC6ozhZf1wVjSq6aBMhOmW1u3nfr1UsGMc&libraries=places" defer></script>
```

Geen `integrity=` attribuut. Google Maps loader serveert **dynamisch gegenereerde JS** waarvan de SHA-hash per request wijzigt — SRI is technisch niet mogelijk voor dit script. Industry-standaard is om Google Maps zonder SRI te laden (alle Google Maps loaders doen dit zo).

**Mitigatie**: niet van toepassing — design-beperking van het Google Maps API. De Google Maps key zelf is publiek-bedoeld (gebonden aan domein-restricties in Google Cloud Console).

**VERIFY**: zijn HTTP referrer-restrictions actief op deze API key in Google Cloud Console? Zonder restricties kan iemand de key voor eigen apps gebruiken.

**Classificatie: P3** — design-beperking, sociaal-engineering risico op API-key (verifieer GC Console restrictions).

### F3.3.B — Google Fonts zonder SRI [INFO]
`<link href="https://fonts.googleapis.com/css2?...">` — geen integrity. Google Fonts CSS wijzigt ook per request (browser-specific). Same design-limitation. **NO ACTION**.

**Status: PASS** voor hash-verifiable scripts; design-limitations gedocumenteerd.

---

## 3.4 — `.htaccess` + security headers

### Bevindingen — `.htaccess` volledig geïnspecteerd
| Header | Status | Waarde |
|---|---|---|
| HTTPS-redirect | ✓ JA | 301 force |
| Directory listing | ✓ disabled | `Options -Indexes` |
| **X-Frame-Options** | ✓ JA | `SAMEORIGIN` |
| **X-Content-Type-Options** | ✓ JA | `nosniff` |
| **Strict-Transport-Security** | ✓ JA | `max-age=31536000; includeSubDomains` |
| **Referrer-Policy** | ✓ JA | `strict-origin-when-cross-origin` |
| **Permissions-Policy** | ✓ JA | `geolocation=(), camera=(), microphone=()` |
| **Content-Security-Policy** | ✓ JA | uitgebreid (zie hieronder) |
| `X-Powered-By` unset | ✓ JA | |
| `Server` unset | ✓ JA | |

### CSP-analyse
```
default-src 'self';
script-src 'self' 'unsafe-inline' 
  https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 
  https://maps.googleapis.com https://translate.google.com 
  https://www.gstatic.com https://js.mollie.com;
style-src 'self' 'unsafe-inline' 
  https://fonts.googleapis.com https://www.gstatic.com;
font-src 'self' https://fonts.gstatic.com data:;
connect-src 'self' 
  https://qoxgbkbnjsycodcqqmft.supabase.co 
  wss://qoxgbkbnjsycodcqqmft.supabase.co 
  https://api.mollie.com 
  https://maps.googleapis.com https://maps.gstatic.com;
img-src 'self' data: https:;
frame-src 'self' https://translate.google.com;
object-src 'none';
base-uri 'self';
form-action 'self'
```

#### F3.4.A — `script-src 'unsafe-inline'` [P2]
Inline `<script>...</script>` blocks zijn aanwezig in vrijwel alle HTML-files. Zonder 'unsafe-inline' breekt het hele platform. Migratie naar 'nonce-...' of 'hash-...' is een major refactor.

**Mitigatie alternatieven** (post-LT):
- Genereer nonces per request (vereist server-side rendering — niet mogelijk met FileZilla static hosting)
- Hash elke inline-script (broos: elke wijziging breekt CSP)
- Verplaats inline JS naar externe `.js` bestanden (uren werk, voor 50+ pagina's)

**Realistic outcome**: 'unsafe-inline' blijft. Compenseer door strikte input-validatie en `escapeHtml()` discipline.

**Classificatie: P2** — design-beperking; gedocumenteerd risico.

#### F3.4.B — Geen CSP-violation reporting [P3]
Geen `report-uri` of `report-to` directive. Bij CSP-violations krijg je geen telemetry. CLAUDE.md noemt CSPReporter (`_pol`) als telemetry-component — die zou hier kunnen helpen, maar zonder `report-uri` in CSP komen er geen browser-rapporten binnen.

**Mitigatie**: voeg toe `report-uri https://qoxgbkbnjsycodcqqmft.supabase.co/functions/v1/csp-report` (Edge Function te bouwen).

**Classificatie: P3** — observability gap, geen security-gat.

#### F3.4.C — `img-src https:` overal toegestaan [P3]
`img-src 'self' data: https:` betekent dat **elke** HTTPS-image geladen kan worden. Dit is breed (acceptable voor user-uploaded avatars via Supabase Storage), maar staat ook tracking-pixels van willekeurige domeinen toe.

**Mitigatie**: vervang door whitelist van Supabase storage URLs.

**Classificatie: P3**

**Status: PASS** — kernbescherming aanwezig (HSTS, XCTO, XFO, CSP). Verbeteringen P2/P3.

---

## 3.5 — Telemetry codenames

### Resultaten
| Pattern | Hits in client code | Hits in CLAUDE.md/audits |
|---|---|---|
| `HUNTERS_CONFIG` | **0** | 1 (translation table) |
| `ThreatScore` | **0** | 1 (translation table) |
| `SecurityLog` | **0** | 1 (translation table) |
| `HoneypotSentinel` | **0** | 1 (translation table) |
| `CanaryToken` | **0** | 1 (translation table) |
| `DOMGuard` | **0** | 1 (translation table) |
| `CSPReporter` | **0** | 1 (translation table) |
| `TimingGuard` | **0** | 1 (translation table) |
| `IntegrityPulse` | **0** | 1 (translation table) |

**ZERO codenames in `js/telemetry.js`, HTML files, of andere live code.** Alle aliases zijn correct geobfusceerd als `_cfg`, `_sess`, `_tel`, `_render`, `_state`, etc. PASS.

**Status: PASS** — codenames blijven achter de translation table (Bedward-spec gehandhaafd).

---

## 3.6 — Push notification security

### `sw.js` `pushsubscriptionchange` handler
```js
self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    self.registration.pushManager.getSubscription()
      .then(function(oldSub) {
        if (oldSub) return oldSub.unsubscribe();
      })
      .then(function() {
        const bc = new BroadcastChannel('internly-sw');
        bc.postMessage({ type: 'resubscribe_needed' });
        bc.close();
      })
      .catch(function(e) {
        console.warn('[sw] pushsubscriptionchange error:', e);
      })
  );
});
```

**Run 7B-bevinding**: handler verwijderde alleen, niet hercreëerd. **Status anno 9 mei**: het handler unsubscribed nog steeds zonder direct te resubscriben — maar verstuurt nu een `BroadcastChannel('internly-sw')` signaal `{type:'resubscribe_needed'}`. Een open page kan dit oppikken en een nieuwe subscription aanmaken via `registerPushNotifications()`.

#### F3.6.A — Resubscribe afhankelijk van open tab [P2]
**Probleem**: als user push-notif krijgt terwijl alle Internly-tabs gesloten zijn, en de browser rouleert dan zijn VAPID-keys, wordt:
1. Oude subscription unsubscribed
2. BroadcastChannel-message verstuurd, maar **er is geen open tab om hem te ontvangen**
3. User mist alle push-notifs tot volgende page-load

**Mitigatie**: hercreëer subscription **in de service worker zelf** met cached VAPID public key:
```js
.then(() => {
  // store VAPID key in IndexedDB during install, retrieve here
  return self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: cachedVapidKey
  });
})
.then(newSub => {
  // POST direct vanuit SW naar Supabase REST API
  return fetch('https://qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/push_subscriptions', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, ... },
    body: JSON.stringify({ ...newSub.toJSON() })
  });
})
```

Maar dit vereist auth-token in SW — **niet beschikbaar zonder JWT-storage in IndexedDB** (cross-tab security).

**Classificatie: P2** — silent push-loss bij key-rotation + closed tabs. Niet-blocker voor LT (zeldzaam scenario).

### F3.6.B — `send-push-notification` Edge Function geen auth (zie F2.6.A) [P0/P1 - VERIFY]
Reeds gerapporteerd in Fase 2.

---

## 3.7 — Open redirect

### `window.location.href = ...` met variabele
| Locatie | Source | Whitelist? |
|---|---|---|
| auth.html:794-802 | hardcoded paths | OK |
| index.html:1961, 2166-2167 | `selectedRole` uit UI | OK — limited values uit UI |
| buddy-dashboard.html:971 | `pairId` via `encodeURIComponent` | safe — `chat.html?buddy_pair_id=X` |
| company-dashboard.html:1461 | `refId` via `encodeURIComponent` | safe |
| discover.html:1258 | `refId` via `encodeURIComponent` | safe |
| 30+ inline auth-checks | hardcoded `'auth.html'` | OK |

**ZERO open-redirect-vectors** aangetroffen. Alle dynamische redirects gaan naar interne paden met `encodeURIComponent` op queryparams.

**Status: PASS**

---

## 3.8 — localStorage / sessionStorage

### Inventarisatie keys
| Key | Type | User-bound? | clearUserState wist? |
|---|---|---|---|
| `internly_consent` | flag | nee | NEE (PROTECTED) |
| `internly_lang` | preference | nee | NEE (PROTECTED) |
| `internly_waitlist_seen` | flag | nee | NEE (PROTECTED) |
| `internly_push_asked` | flag | nee | NEE (PROTECTED) |
| `internly_referral_dismissed` | flag | nee | **JA** (geen suffix) |
| `internly_demo_profiles` | flag | nee | **JA** |
| `internly_show_vacatures` | preference | nee | **JA** |
| `internly_saved_vacatures` | data | nee | **JA** — fix Run 1.6 |
| `internly_bbl_reflectie_draft_<userId>` | data | ja | **JA** |
| `internly_ld_<userId>` | data | ja | **JA** |
| `internly_ld_toelichting_<userId>` | data | ja | **JA** |
| `internly_bbl_reflecties_<userId>` | data | ja | **JA** |
| `internly_bbl_bedrijf_<userId>` | data | ja | **JA** |
| `internly_student_postcode_<userId>` | data | ja | **JA** |
| `internly_buddy_optin_<userId>` | preference | ja | **JA** |
| `internly_renewal_<matchId>` | data | ja | **JA** |
| `sb-qoxgbk*-auth-token` | JWT | ja | **NEE** — Supabase signOut() handles |

### Sensitive-data check
- **Geen JWT** in code-managed localStorage (Supabase manages own keys met `sb-*` prefix)
- **Geen wachtwoorden** opgeslagen
- **Geen API-keys** opgeslagen behalve publieke anon key (per design)
- Profile data in localStorage is alleen draft-state (BBL reflecties, taal-preferences)

**Status: PASS** voor sensitive-data; clearUserState dekt alle account-bound + cross-user-leak-risico keys.

---

## TOP 5 BEVINDINGEN — FASE 3

| # | ID | Severity | Beschrijving | Tijdkost fix |
|---|---|---|---|---|
| 1 | F3.6.B / F2.6.A | **P0/P1 (verifieer)** | `send-push-notification` mogelijk publiek aanroepbaar (verifieer `verify_jwt` setting) | 5 min check + 20 min fix |
| 2 | F3.6.A | P2 | `pushsubscriptionchange` resubscribe alleen bij open tab → silent push-loss bij key rotation + closed tabs | ~1u SW-rewrite |
| 3 | F3.4.A | P2 | CSP `script-src 'unsafe-inline'` — design-beperking van static hosting; XSS-mitigatie hangt op `escapeHtml()` discipline | gedocumenteerd, geen fix |
| 4 | F3.3.A | P3 | Google Maps API key in discover.html — verifieer HTTP referrer restrictions in GC Console | 5 min Console-check |
| 5 | F3.4.B | P3 | Geen CSP `report-uri` — geen telemetry op CSP-violations | 1u Edge Function + 1 regel CSP |

**Andere PASS-bevindingen samenvattend**:
- innerHTML XSS: PASS (alle 6 hits gebruiken interne data)
- escapeHtml singleton: PASS
- SRI op vendor-scripts: PASS (alleen Google Maps niet, design-limitation)
- Security headers in .htaccess: PASS (HSTS, XFO, XCTO, CSP, Permissions-Policy)
- Telemetry codenames: PASS (0 hits in client code)
- Open redirect: PASS (alle dynamische redirects ge-encoded en intern)
- Sensitive data in localStorage: PASS (clearUserState dekt alles)

**STOP — Fase 3 klaar.** Wacht op "ga door fase 4".
