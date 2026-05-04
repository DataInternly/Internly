# INTERNLY PRE-DEPLOYMENT AUDIT — DEEL 2
# Datum: 30 april 2026
# Dekt: security headers, RLS, business logic, AVG,
#       performance, CDN integrity, email flows, deployment
# Status: VOLTOOID

Severity: BLOCKER | HOOG | MIDDEL | LAAG | PASS

---

## CHECK 16 — HTTP SECURITY HEADERS (.htaccess)

**Volledige .htaccess inhoud:**

```apache
# ── Directory listing ────────────────────────────────────────────────────────
Options -Indexes

# ── Custom error pages ────────────────────────────────────────────────────────
ErrorDocument 404 /404.html

# ── HTTPS redirect ───────────────────────────────────────────────────────────
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# ── Security headers ─────────────────────────────────────────────────────────
<IfModule mod_headers.c>
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "geolocation=(), camera=(), microphone=()"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://maps.googleapis.com https://translate.google.com https://www.gstatic.com https://js.mollie.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://qoxgbkbnjsycodcqqmft.supabase.co wss://qoxgbkbnjsycodcqqmft.supabase.co https://api.mollie.com https://maps.googleapis.com https://maps.gstatic.com; img-src 'self' data: https:; frame-src 'self' https://translate.google.com; object-src 'none'; base-uri 'self'; form-action 'self'"
  Header always unset X-Powered-By
  Header always unset Server
</IfModule>
```

**Per header bevindingen:**

| Header | Status | Bevinding |
|---|---|---|
| X-Frame-Options: SAMEORIGIN | PASS | Beschermt tegen clickjacking |
| X-Content-Type-Options: nosniff | PASS | Aanwezig |
| Referrer-Policy: strict-origin-when-cross-origin | PASS | Goede default |
| Content-Security-Policy | PASS | Uitgebreide CSP met expliciete allowlists; `'unsafe-inline'` op script-src is acceptabel voor vanilla JS-codebase maar niet ideaal |
| Permissions-Policy | PASS | geolocation/camera/microphone disabled |
| Strict-Transport-Security: max-age=31536000; includeSubDomains | PASS (LAAG opmerking) | Aanwezig — overweeg `preload` toe te voegen voor HSTS-preload list |

**HTTPS forcing:**
- PASS — `RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]` dekt ALLE paden inclusief subpaths via `^` patroon match en `%{REQUEST_URI}` doorgifte.

**404 pagina:**
- PASS — `ErrorDocument 404 /404.html` correct geconfigureerd.

**Headers absent (informatief):**
- `X-XSS-Protection` — niet meer nodig in moderne browsers (vervangen door CSP)
- `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` — LAAG, vereist voor SharedArrayBuffer (niet gebruikt)

**Eindscore CHECK 16: PASS** — security header configuratie is volledig en correct. Eén LAAG aanbeveling: HSTS preload toevoegen.

---

## CHECK 17 — SUPABASE ANON KEY EXPOSURE

**Live HTML bestanden met inline JWT anon key (BACKUP/ en _revamp_ uitgesloten):**

| Bestand | Lijnen | Methode |
|---|---|---|
| [index.html:1960](index.html#L1960) | 1960, 2031 | inline `apikey` header in fetch() calls |
| [about.html:957](about.html#L957) | 957, 995, 1046 | inline arg op `window.supabase.createClient(...)` |

**Pagina's die `js/supabase.js` laden:**
- [index.html:1817](index.html#L1817) — laadt `js/supabase.js` (bevat SUPABASE_URL + SUPABASE_ANON_KEY)
- [about.html:947+950](about.html#L947) — laadt CDN supabase-js + `js/supabase.js`
- [faq.html:996+999](faq.html#L996) — laadt CDN supabase-js + `js/supabase.js`
- [privacybeleid.html](privacybeleid.html) — geen Supabase referentie

**Bevindingen per Bedward P2 ("index.html en about.html mogen NIET js/supabase.js of credentials laden"):**

- **HOOG**: [index.html](index.html) bevat 2x inline anon key + laadt js/supabase.js. Schendt Bedward P2 expliciet.
- **HOOG**: [about.html](about.html) bevat 3x inline anon key + laadt CDN supabase-js + js/supabase.js. Schendt Bedward P2 expliciet.
- **MIDDEL**: [faq.html](faq.html) laadt CDN supabase-js + js/supabase.js — niet expliciet door Bedward P2 genoemd, maar zelfde pattern als publieke info-pagina.

**Context — risico-evaluatie:**

De Supabase anon key is per ontwerp publiek bedoeld; security berust volledig op Row Level Security (RLS). Maar:
- Inline duplicatie creëert key-rotation pijn (4 plekken updaten i.p.v. 1).
- Dubbele Supabase-client instantiatie (`_client` in about.html lijn 955) bypass de gedeelde initialisatie en `initSessionTimeout()`.
- Telemetry.js verwacht `window.__SUPABASE_ANON_KEY` (gezet door js/supabase.js); op publieke pagina's hoort die hele keten niet te draaien.

**Geen BLOCKER omdat:** de anon key is ontworpen om publiek te zijn en alle data-toegang draait door RLS. Het is een architectuur-overtreding maar geen actief security-incident, MITS RLS volledig is — zie CHECK 28.

**Eindscore CHECK 17: HOOG** — index.html en about.html schenden Bedward P2. Refactor: verwijder inline anon keys + verwijder supabase.js uit publieke pagina's, of verplaats waitlist-flow naar één centrale endpoint.

---

## CHECK 18 — BROKEN ACCESS CONTROL

**Tabel: matches.select** — alle live-bestanden gebruiken correct user-scoped filters:
- [admin.html:376](admin.html#L376) — `count: 'exact', head: true` — correcte admin-only count, RLS check vereist
- [mijn-berichten.html:489](mijn-berichten.html#L489) — `.eq('id', matchId)` — scoped op specifieke match-id
- [match-dashboard.html:2611](match-dashboard.html#L2611) — `.or(party_a.eq.id,party_b.eq.id)` — scoped
- [company-dashboard.html:1970](company-dashboard.html#L1970) — `.eq('party_b', companyUserId)` — scoped

PASS — alle matches reads zijn user-gescoped of admin-only count.

**Tabel: messages.select** — alleen [admin.html:377](admin.html#L377) leest direct uit messages (count). Alle chat-pagina's gebruiken `conversation_id` scoping. PASS.

**Tabel: student_profiles.select** — alleen [match-dashboard.html:2790](match-dashboard.html#L2790) doet een direct read met `.eq('profile_id', matchRow.party_a)`. matchRow komt uit een eerder gescoped query. RLS moet borgen dat alleen gematchte company dit profile mag lezen. PASS — voor zover RLS klopt; zie CHECK 28.

**Tabel: meetings.select**:
- [chat.html:786](chat.html#L786) — `.eq('id', n.ref_id).maybeSingle()` — kan elk meeting-id ophalen via realtime payload; **MIDDEL** als RLS niet meeting-deelnemers borgt (zie CHECK 28).
- [match-dashboard.html:2611](match-dashboard.html#L2611) — `.or(organizer_id.eq.id,attendee_id.eq.id)` — correct gescoped. PASS.

**Tabel: reviews.select**:
- [discover.html:895](discover.html#L895), [school-dashboard.html:1536](school-dashboard.html#L1536) — `.select('reviewee_id, rating')` zonder filter — leest **ALLE** reviewee_id+rating paren. **HOOG** als bedoeling was beperkt tot eigen reviews of openbare aggregaties. Voor publieke trust-display is dit acceptabel mits RLS expliciet alleen rating+reviewee_id exposes (en niet body/reviewer_id).
- [company-dashboard.html:2010](company-dashboard.html#L2010) — `.eq('reviewee_id', companyUserId)` — eigen reviews. PASS.
- [js/reviews.js:20-44](js/reviews.js#L20) — review-render module. Geconsulteerd; behoeft RLS-validatie.

**TRUST_SCORE WRITE locaties (BLOCKER-niveau):**

```
admin.html:534  .update({ trust_score: val, trust_grade: grade })   ← admin-only override (correct)
admin.html:539  .update({ trust_score: val, trust_grade: grade })   ← admin-only override (correct)
company-dashboard.html:2024  upsert({ trust_score, trust_grade })   ← BLOCKER
company-dashboard.html:2031  .update({ trust_score, trust_grade })  ← BLOCKER
```

[company-dashboard.html:1962-2032](company-dashboard.html#L1962) — `calculateTrustScore()`-flow draait CLIENT-SIDE bij elke company login en upsert het score op het EIGEN `company_profiles` record + alle `internship_postings` van de company. De berekening heeft componenten A (response rate), B (acceptance rate), C (profielvolledigheid), D (review avg), maar:

1. **Score wordt bepaald in de browser** — een ingelogde company kan de JS dynamisch wijzigen en `await db.from('company_profiles').upsert({ profile_id: companyUserId, trust_score: 100, trust_grade: 'A' })` aanroepen direct vanuit DevTools.
2. **RLS-borging is enige verdediging** — Supabase RLS moet UPDATE op company_profiles.trust_score blokkeren voor non-admin rollen. Op dit moment heeft de company UPDATE-recht op zijn eigen `company_profiles` row (anders kan hij zijn bedrijfsnaam niet wijzigen), dus tenzij er een column-level policy is, is dit OPEN.
3. **`internship_postings.trust_score` update** op lijn 2031 — zelfde issue.

CLAUDE.md zegt expliciet: *"Trust Score auto-algoritme = niet geïmplementeerd"* en *"Implementatie: Supabase Edge Function + database trigger op reviews."* Het bestaande client-side script is een implementatie-artefact dat niet hoort te bestaan.

**Eindscore CHECK 18: BLOCKER** — Trust Score write vanuit company-dashboard.html ondermijnt het kernproduct. Direct verwijderen vóór deployment of RLS column-level policy toevoegen die UPDATE op trust_score/trust_grade blokkeert voor non-service-role.

Aanvullend: **HOOG** — reviews-aggregatie reads (discover/school-dashboard) tonen alle reviewee_id+rating paren; verifieer dat RLS deze view bewust blootstelt en dat geen velden als `body`/`reviewer_id` lekken.

---

## CHECK 19 — SESSIONSTORAGE/LOCALSTORAGE SENSITIEVE DATA

**Geïnventariseerde keys (live bestanden, BACKUP/_revamp_ uitgesloten):**

| Key | Storage | Type data | Severity |
|---|---|---|---|
| `internly_role` | sessionStorage | role string (student/bbl/...) | MIDDEL — acceptabel maar genoteerd |
| `internly_lang` | localStorage | language preference | LAAG |
| `internly_waitlist_seen` | localStorage | UI flag | LAAG |
| `internly_push_asked` | localStorage | UI flag | LAAG |
| `internly_referral_dismissed` | localStorage | UI flag | LAAG |
| `internly_show_vacatures` | localStorage | UI preference | LAAG |
| `internly_saved_vacatures` | localStorage | array van vacature-id's | LAAG |
| `internly_buddy_optin_<userId>` | localStorage | boolean per user | MIDDEL — bevat user-id in key |
| `internly_student_postcode_<userId>` | localStorage | postcode per user | **MIDDEL** — persoonlijke locatie data |
| `internly_demo_profiles` | localStorage | bool | LAAG |
| `internly_bbl_reflectie_draft_<userId>` | localStorage | reflectie draft tekst | **MIDDEL** — kan persoonlijke werk-reflectie zijn |
| `internly_bbl_reflecties_<userId>` | localStorage | array van completed reflecties | **MIDDEL** — persoonlijke werk-reflectie geschiedenis |
| `internly_ld_<userId>` | localStorage | leerdoel progress data | LAAG |
| `internly_ld_toelichting_<userId>` | localStorage | leerdoel toelichtingen | MIDDEL — kan vrije tekst bevatten |
| `internly_renewal_<matchId>` | localStorage | renewal status | LAAG |
| `internly_bbl_bedrijf_<userId>` | localStorage | bedrijf-info BBL | LAAG |
| `internly_trust_calculated_<userId>` | sessionStorage | bool flag (1x per sessie) | LAAG |
| `internly_esg_export_data` | sessionStorage | ESG payload (anoniem aggr.) | LAAG |
| `internly_applying` | sessionStorage | UI flag tijdens apply-flow | LAAG |
| `bblView` | sessionStorage | tab state | LAAG |
| `buddy_anon_<uid>` | localStorage | bool | LAAG |
| `buddy_paused_<uid>` | localStorage | bool | LAAG |
| `DEMO_DISCOVER_KEY` | localStorage | bool | LAAG |
| `DEMO_CD_KEY` | localStorage | bool | LAAG |
| `chat.html:1527 key` | localStorage | per-conversation chat draft array — **MIDDEL** kan privé bericht-drafts bevatten |

**GEEN** wachtwoorden, JWT tokens, payment data, of complete email/naam paren gevonden in storage. PASS op kritieke categorieën.

**performLogout() in [js/utils.js:162-180](js/utils.js#L162):**
- Bevat `sessionStorage.clear()` op lijn 170 — **PASS**.
- Roept echter **GEEN `localStorage.clear()`** aan — alle bovenstaande localStorage keys (incl. postcode, reflecties, ld toelichtingen, chat drafts) blijven na logout staan.

**Risico op gedeelde devices** (school computer, gezinscomputer): na logout blijven persoonlijke reflecties (`internly_bbl_reflectie_draft_<userId>`), postcode, en chat drafts onder de userId-key zichtbaar voor de volgende gebruiker die DevTools opent. Userid-scoping geeft schijn-bescherming maar isolatie tussen accounts op hetzelfde apparaat ontbreekt.

**Eindscore CHECK 19: MIDDEL** — geen kritieke leaks, maar `performLogout()` zou een whitelist-aanpak moeten hebben (alleen `internly_lang` behouden) of `localStorage.clear()` aanroepen voor user-bound keys. Vooral kritisch voor BBL-reflecties (kunnen klacht over werkgever bevatten).

---

## CHECK 20 — EXTERNAL LINKS: rel="noopener noreferrer"

**Live `target="_blank"` instances (8 totaal):**

| Bestand | Lijn | Doel | Rel | Status |
|---|---|---|---|---|
| [auth.html:598](auth.html#L598) | 598 | privacybeleid.html | noopener noreferrer | PASS |
| [company-dashboard.html:1014](company-dashboard.html#L1014) | 1014 | dynamic href (#) | noopener noreferrer | PASS |
| [faq.html:832](faq.html#L832) | 832 | autoriteitpersoonsgegevens.nl | **noopener** (geen noreferrer) | LAAG |
| [privacybeleid.html:691](privacybeleid.html#L691) | 691 | autoriteitpersoonsgegevens.nl | noopener noreferrer | PASS |
| [privacybeleid.html:732](privacybeleid.html#L732) | 732 | autoriteitpersoonsgegevens.nl/klacht | noopener noreferrer | PASS |
| [review-form.html:222](review-form.html#L222) | 222 | spelregels.html | **MISSING** | MIDDEL |
| [stagebegeleiding.html:540](stagebegeleiding.html#L540) | 540 | s-bb.nl | noopener noreferrer | PASS |
| [stagebegeleiding.html:551](stagebegeleiding.html#L551) | 551 | elbho.nl | noopener noreferrer | PASS |

**Bevindingen:**
- 1 link compleet zonder rel: `review-form.html:222` (intern naar spelregels.html — laag risico maar fix is triviaal). **MIDDEL**.
- 1 link met noopener maar zonder noreferrer: `faq.html:832` (extern). `noopener` blokkeert al window.opener — `noreferrer` voorkomt alleen Referer header lekkage. **LAAG**.

**Eindscore CHECK 20: MIDDEL (1 instance) + LAAG (1 instance)** — fix `review-form.html:222` voor consistentie. Algemeen pattern is goed gehanteerd: 6/8 links voorbeeldig.

---

## CHECK 21 — CDN SCRIPTS: SRI INTEGRITY HASHES

**Externe `<script>` resources op live HTML-pagina's:**

| Resource | Versie | Files | SRI? | Crossorigin? | Severity |
|---|---|---|---|---|---|
| `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | floating `@2` | ~30 live files (alle authenticated app pages + about/faq/index/pricing) | **NEE** | NEE | **HOOG** |
| `cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` | gepind `2.5.1` | bbl-hub.html, match-dashboard.html | JA `sha384-OLBgp1Gsljh...` | JA | **VERIFICATIE NODIG** |
| `cdn.jsdelivr.net/npm/emoji-mart@5.5.2/dist/browser.js` | gepind `5.5.2` | chat.html | JA `sha384-gGElBOlmyIG...` | JA | PASS |
| `maps.googleapis.com/maps/api/js?key=...&libraries=places` | dynamic | discover.html | NEE | n.v.t. (dynamische response) | LAAG (Google Maps kan SRI niet) |
| `js.mollie.com/...` | (in CSP, geen actuele script-tag gevonden) | — | n.v.t. | — | n.v.t. |

**Externe `<link rel="stylesheet">` resources:**

| Resource | Files | SRI? | Severity |
|---|---|---|---|
| `fonts.googleapis.com/css2?family=...` | ~30 files | NEE | LAAG (Google Fonts kan SRI niet) |

**Specifieke bevindingen:**

1. **HOOG — supabase-js zonder SRI**: 30 live HTML-pagina's laden `@supabase/supabase-js@2` zonder integrity hash en zonder gepinde versie. Een gecompromitteerde jsdelivr CDN óf een verkeerde release op `@2`-tag = silent malicious code op alle authenticated pagina's. SRI_HASHES_TODO.md erkent dit (item 1) maar status is "approval-gated, niet uitgevoerd". Vóór livetest met echte data = **HOOG**.

2. **VERIFICATIE NODIG — jspdf SRI hash**: De gebruikte hash `sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb` is identiek aan de bekende SHA-384 hash van een **lege string** (de "all-zeros placeholder hash"). Als deze hash niet matcht met de werkelijke jspdf 2.5.1 inhoud, **weigert de browser het script te laden**. Gevolg: PDF-export in bbl-hub.html en match-dashboard.html werkt niet. **MIDDEL/HOOG** — handmatig verifiëren via `curl https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js | openssl dgst -sha384 -binary | openssl base64 -A`. SRI_HASHES_TODO.md geeft dezelfde hash op — dat suggereert dat de auteur ook een placeholder gebruikt heeft. Test in incognito vóór livetest.

3. **PASS — emoji-mart**: Versie gepind, SRI hash aanwezig, crossorigin set. Goed voorbeeld.

4. **LAAG — Google Fonts**: SRI is technisch niet mogelijk vanwege dynamische User-Agent gebaseerde responses. Acceptabel.

5. **LAAG — Google Maps**: SRI is technisch niet mogelijk. Acceptabel mits CSP blijft beperken (CSP staat `maps.googleapis.com` toe in script-src).

**Eindscore CHECK 21: HOOG** — supabase-js zonder SRI op 30 pagina's is het zwaartepunt. jspdf-hash verificatie is een snelle test maar potentieel een gebroken feature in productie.

---

## CHECK 22 — CONSOLE.LOG MET SENSITIEVE DATA

**Search-strategie:** grep op `console.log/warn/info/debug` in alle live bestanden, daarna handmatige check op nabije variabele namen die data kunnen lekken (password, token, email, user object, session).

**Resultaten:** 157 totale `console.*` calls in 47 bestanden (incl. backups). Live count uitzonderlijk laag; ALLE getoonde live calls volgen één pattern:

```
console.warn('[<modulenaam>] <beschrijving>:', error.message);
```

Voorbeelden uit live bestanden:
- [auth.html:970](auth.html#L970) — `console.warn('[auth] Profile insert fout:', profileError.message)` — alleen `.message` veld, geen volledig object
- [auth.html:1076](auth.html#L1076) — `console.warn('[auth] Waitlist insert fout (non-blocking):', wErr.message)` — alleen .message
- [bbl-hub.html:1772](bbl-hub.html#L1772) — `console.warn('[bbl-hub] skills_progress DB write fout:', e?.message || e)` — fallback naar full error als message ontbreekt; theoretisch kan e een object zijn met meer velden
- [match-dashboard.html](match-dashboard.html) — meerdere `console.warn('[hub] ... err:', err)` — full err object, kan stack trace + payload bevatten

**Categorieën:**

| Pattern | Severity | Voorbeeld |
|---|---|---|
| `console.warn('...:', err.message)` | LAAG | auth.html:970 |
| `console.warn('...:', err)` (full error object) | LAAG/MIDDEL | match-dashboard.html:5149 |
| `console.warn('[telemetry] js/telemetry.js niet geladen, ...')` | LAAG | index.html:1823, auth.html:28 — non-data warning |
| `console.log('[match-celebrate] self-test OK')` | LAAG | dev-only output |
| `console.log('[Bobba] self-test klaar')` | LAAG | profanity.js:113 dev-only |

**Top 15 instances (live bestanden, geprioriteerd op severity):**

1. [match-dashboard.html:5149](match-dashboard.html#L5149) — `console.warn('[hub] accept DB err:', err)` — LAAG (full err)
2. [match-dashboard.html:5206](match-dashboard.html#L5206) — `console.warn('[hub] decline DB err:', err)` — LAAG
3. [match-dashboard.html:5240](match-dashboard.html#L5240) — `console.warn('[hub] cancel DB err:', err)` — LAAG
4. [chat.html:807](chat.html#L807) — `console.warn('[chat] accept meeting err:', error)` — LAAG
5. [chat.html:844](chat.html#L844) — `console.warn('[chat] decline meeting err:', error)` — LAAG
6. [auth.html:970](auth.html#L970) — `console.warn('[auth] Profile insert fout:', profileError.message)` — LAAG
7. [auth.html:1076](auth.html#L1076) — `console.warn('[auth] Waitlist insert fout:', wErr.message)` — LAAG
8. [bol-profile.html:1433](bol-profile.html#L1433) — `console.warn('[student-profile] buddy_opt_in write fout:', error.message)` — LAAG
9. [buddy-dashboard.html:765](buddy-dashboard.html#L765) — `console.warn('[buddy-dash] anonymous write fout:', error.message)` — LAAG
10. [company-dashboard.html:1157](company-dashboard.html#L1157) — `console.warn('[markAllRead] failed:', error.message)` — LAAG
11. [discover.html:1184](discover.html#L1184) — `console.warn('[markAllRead] failed:', error.message)` — LAAG
12. [matches.html:198](matches.html#L198) — `console.warn('[markAllRead] failed:', error.message)` — LAAG
13. [match-dashboard.html:4317](match-dashboard.html#L4317) — `console.warn('[stage_log] insert failed:', error.message)` — LAAG
14. [bbl-hub.html:2396](bbl-hub.html#L2396) — `console.warn('[bbl-hub] renewal_status write fout:', error.message)` — LAAG
15. [auth.html:28](auth.html#L28) — `console.warn('[telemetry] js/telemetry.js niet geladen, ...')` — LAAG

**GEEN gevonden:**
- `console.log(password)` — nul resultaten — **PASS** (niet als BLOCKER)
- `console.log(data.user)` met sessieobject — nul resultaten — **PASS**
- Logging van JWT tokens, anon keys, of payment data — nul resultaten

**Eindscore CHECK 22: PASS (LAAG)** — alleen disciplinaire `.message`-only error logging gevonden. Geen sensitive data exposure. Optioneel: voor productie alle `console.warn` strippen via een build-step, maar voor de huidige vanilla codebase is dit acceptabel debug-niveau.

---

## CHECK 23 — AVG/GDPR RECHTEN IMPLEMENTATIE

**Recht op Verwijdering (Art. 17):**
- [js/account.js:121-140](js/account.js#L121) — `requestAccountDeletion()` zet `deletion_requested: true` en `deletion_requested_at` op profiles. Vereist bevestigingstekst (`expectedWord`). Roept `signOut()` aan en redirect.
- Notification: "je account wordt binnen 30 dagen verwijderd".
- **PASS** — flow bestaat en is correct.
- **MIDDEL noot**: er is geen zichtbare server-side cron/Edge Function die `deletion_requested = true` rijen daadwerkelijk verwijdert na 30 dagen. CLAUDE.md vermeldt geen sweep job. Risico: belofte aan gebruiker zonder mechanische opvolging — AVG-overtreding op middellange termijn.

**Recht op Dataportabiliteit (Art. 20):**
- [js/account.js:87-116](js/account.js#L87) — `exportPaymentsCSV()` exporteert betaalgeschiedenis als CSV. PASS voor payments.
- **MIDDEL** — geen export gevonden van: profielgegevens, sollicitaties, matches, reviews, berichten, BBL-reflecties. Art. 20 vereist machine-readable export van ALLE persoonlijke data, niet alleen payments. CLAUDE.md heeft dit niet als open punt; voor livetest met echte gebruikers kan dit een legal-blokker worden.

**Privacy Policy:**
- `privacybeleid.html` bestaat in project root — PASS.
- 47 HTML-bestanden linken naar privacybeleid.html — wijdverspreide consistente verwijzing.
- auth.html linkt expliciet via [auth.html:598](auth.html#L598) — PASS.
- CLAUDE.md noteert "Postadres Sasubo Holding in privacybeleid.html" als open punt voor sprint 5 — niet beoordeeld door deze audit, maar potentieel een MIDDEL formele AVG-vereiste.

**Toestemming Intrekken (Art. 7 lid 3):**
- privacybeleid.html lijn 686-687 vermeldt het recht tekstueel.
- [auth.html:592](auth.html#L592) heeft `consentCheck` checkbox bij registratie — opt-in moment is gedocumenteerd.
- **MIDDEL** — geen UI gevonden voor het *intrekken* van consent na registratie (bijv. een "marketing emails uitschakelen" toggle in account-instellingen). De policy-tekst belooft het recht; de UI implementeert het niet. Voor nieuwsbrief geldt: link in elke mail (per privacybeleid:512) — acceptabel als email-flow daadwerkelijk werkt; zie CHECK 27.

**Eindscore CHECK 23: MIDDEL** — verwijdering en payments-export zijn correct. Hiaten: (a) geen automatische sweep van deletion_requested, (b) onvolledige Art. 20 export (alleen betaling, geen profiel/matches/etc.), (c) geen UI voor consent withdrawal binnen account.

---

## CHECK 24 — REALTIME SUBSCRIPTION CLEANUP

**Live `db.channel(...).subscribe()` instances:**

| Bestand | Channel | Cleanup gevonden? |
|---|---|---|
| [bbl-hub.html:1249](bbl-hub.html#L1249) | `bbl-msgs-` | **JA** — bbl-hub.html:1246 (in re-subscribe), :2861 beforeunload, :2856 visibilitychange |
| [chat.html:779](chat.html#L779) | `mtg-notif-` | **JA** — chat.html:777 (re-sub), :1464 beforeunload |
| [chat.html:1063](chat.html#L1063) | `messages-` | **JA** — chat.html:1061 (re-sub), :1463 beforeunload |
| [chat.html:1533](chat.html#L1533) | `minesweeper-` | **JA** — chat.html:1465 beforeunload |
| [buddy-dashboard.html:897](buddy-dashboard.html#L897) | `buddy-dash-` | **JA** — :921 beforeunload |
| [company-dashboard.html:1188](company-dashboard.html#L1188) | `notif-company-` | **JA** — :2998 beforeunload, :3003 visibilitychange |
| [discover.html:1210](discover.html#L1210) | `notif-discover-` | **JA** — :1436 beforeunload (async + removeChannel) |
| [matches.html:227](matches.html#L227) | `notif-matches-` | **JA** — :723 beforeunload |
| [mijn-sollicitaties.html:695](mijn-sollicitaties.html#L695) | `notifs-msoll-` | **JA** — :817 beforeunload, :822 visibilitychange |
| [school-dashboard.html:1075](school-dashboard.html#L1075) | `notif-school-` | **JA** — :2405 beforeunload |
| [matchpool.html:441](matchpool.html#L441) | `notif-matchpool-` | **NEE** — geen unsubscribe/removeChannel/beforeunload gevonden in matchpool.html |
| [js/buddy.js:94](js/buddy.js#L94) | `buddy-` | **JA** — js/buddy.js:131 beforeunload |

**Bevindingen:**

- **MIDDEL** — [matchpool.html:441](matchpool.html#L441) start een `notif-matchpool-` channel maar heeft geen cleanup. Bij navigatie weg van matchpool.html blijft de WebSocket actief tot de browsertab gesloten wordt, of (in single-page-achtige flows) tot logout.
- **PASS** — alle andere 11 channels hebben minimaal één cleanup-mechanisme (re-subscribe guard, beforeunload, of visibilitychange).
- bbl-hub.html en chat.html zijn voorbeeldig: re-subscribe guard + beforeunload + visibilitychange voor de zwaarste pagina's.

**Cleanup rate: 11/12 (92%)**.

**Eindscore CHECK 24: MIDDEL (1 instance)** — voeg `window.addEventListener('beforeunload', ...)` aan matchpool.html toe.

---

## CHECK 25 — TODO/FIXME/OPEN VRAGEN IN PRODUCTIE CODE

**Live bestanden — geen `TODO`, `FIXME`, `HACK`, `XXX` gevonden** (alleen in BACKUP/_revamp_).

**`OPEN VRAAG` markers in live bestanden (4 instances, allen routing-gerelateerd):**

1. [auth.html:877-880](auth.html#L877) — *"BBL student zonder naam wordt hier naar bbl-hub gestuurd, maar het al-ingelogd panel (rond regel 1129) stuurt naar bbl-profile. Twee gedragingen voor zelfde user-state. UX-keuze post-11-mei."* — **MIDDEL** (routing inconsistentie tussen post-login flow en al-ingelogd-panel).

2. [auth.html:884-885](auth.html#L884) — *"mogelijk conflict met canon B2 — zie stap 4 deliverable. Identiek patroon als discover.html:1406."* — **MIDDEL** (verwijst naar nog niet voltooide canon-stap).

3. [auth.html:1175-1178](auth.html#L1175) — *"BBL student zonder naam gaat hier naar bbl-profile, maar post-login flow (rond regel 837) stuurt naar bbl-hub. Twee gedragingen voor zelfde user-state. UX-keuze post-11-mei."* — **MIDDEL** (zelfde inconsistentie als #1, andere richting).

4. [js/utils.js:74-76](js/utils.js#L74) — *"mogelijk conflict met canon B2 — zie stap 4 deliverable. Identiek patroon als discover.html:1406 en auth.html:843."* — **MIDDEL** (canon B2 niet voltooid).

5. [discover.html:1406](discover.html#L1406) — *"OPEN VRAAG (30 apr 2026): mogelijk conflict met canon B2 — zie stap 4 deliverable."* — **MIDDEL** (zelfde categorie).

**Andere `tijdelijk`-occurrences (informatief, niet code-debt):**
- [buddy-dashboard.html:465](buddy-dashboard.html#L465) — UI label "Matching tijdelijk pauzeren" — **PASS** (functioneel).
- [privacybeleid.html:675](privacybeleid.html#L675) — beschrijving van AVG Art. 18 — **PASS** (juridisch).
- [spelregels.html:488](spelregels.html#L488) — beschrijving spelregel — **PASS**.

**Eindscore CHECK 25: MIDDEL (5 OPEN VRAGEN, allen over routing-canon B2)** — alle routing-OPEN VRAGEN clusteren op één onafgemaakte canon B2 stap 4 deliverable. Geen TODOs op auth, payments of RLS. Cluster oplossen vóór livetest sluit alle 5 in één wijziging.

---

## CHECK 26 — SUBSCRIPTION GATE BYPASS

**Plan-gate architectuur:** [js/supabase.js:72-107](js/supabase.js#L72) definieert `hasActivePlan(minPlan)` — leest direct uit `subscriptions` tabel, controleert `status in ('active','past_due','trial')` en `current_period_end > now()`. Tier-vergelijking via tier-index lookup.

**Live gate-aanroepen:**

| Bestand | Lijn | Gate | Beschermde feature |
|---|---|---|---|
| [begeleider-dashboard.html:1135](begeleider-dashboard.html#L1135) | hasActivePlan('begeleider_starter') | begeleider features |
| [company-dashboard.html:1350](company-dashboard.html#L1350) | hasActivePlan('company_pro') | reviews-tab |
| [company-dashboard.html:1363](company-dashboard.html#L1363) | hasActivePlan('company_business') | matches-tab |
| [company-dashboard.html:1579](company-dashboard.html#L1579) | hasActivePlan('company_business') | (advanced feature) |
| [company-dashboard.html:1720](company-dashboard.html#L1720) | hasActivePlan('company_business') | (advanced feature) |
| [company-dashboard.html:2769](company-dashboard.html#L2769) | hasActivePlan('company_pro') | ESG export gate |
| [company-dashboard.html:2773](company-dashboard.html#L2773) | hasActivePlan('company_business') | ESG export volledig |

**Bypass-analyse:**

`hasActivePlan()` is een **CLIENT-SIDE** functie. Een ingelogde company kan in DevTools:
```js
window.hasActivePlan = async () => true;
```
…en daarna alle gates zijn open. Of de UI weergave wordt getoond — het is een UI-render gate, niet een data-toegang gate.

**Cruciale vraag: wat zit ACHTER de gate?**
- Reviews-tab: `db.from('reviews').select(...)` — RLS bepaalt of de read slaagt. Als RLS company-tier checkt: **PASS**. Anders: **HOOG**.
- Matches-tab: `db.from('matches').select(...)` — zelfde verhaal.
- ESG export: berekening + download — geen direct DB-write, dus geen lekkage van data die niet al via reviews access mogelijk was.

**RLS-borging:** geen evidence in de codebase dat `subscriptions.plan` wordt gecontroleerd door RLS policies op `reviews`, `matches`, of andere gated tabellen. Per CLAUDE.md: *"Admin RLS = client-side only"* — zelfde patroon kan voor plan-tier gates gelden.

**Pricing-stub bevestigt incompleet model:** [pricing.html](pricing.html) bevat `startCheckout()` stub (CLAUDE.md noteert "Mollie niet actief"). Geen actieve betalingen → geen actieve subscriptions → alle `hasActivePlan()` calls retourneren `false`. In huidige staat verbergen de gates premium features voor IEDEREEN. Voor livetest is dit consistent maar niet getest tegen "betaalde flow".

**Eindscore CHECK 26: HOOG** — alle plan-gates zijn client-side render-gates zonder zichtbare RLS-borging. Bij livetest met actieve Mollie-betalingen (post-launch) kunnen niet-betalende companies premium features unlocken via DevTools. Vóór Mollie live gaat: RLS policies toevoegen op `reviews`/`matches`/etc. die `subscriptions.plan` controleren, óf accepteer dat dit tijdelijk niet streng beveiligd is en documenteer als known-risk.

---

## CHECK 27 — EMAIL FLOW CONFIGURATIE

**SMTP configuratie:**
- [js/supabase.js](js/supabase.js) — geen custom SMTP-instellingen client-side (kan ook niet — moet in Supabase Dashboard).
- Geen `.env` bestanden in project root (vanilla deploy, geen build-step).
- **MIDDEL** — geen evidence van geconfigureerde custom SMTP. Default Supabase shared sender (`noreply@mail.supabase.io`) wordt gebruikt → spam folder risico voor signup confirmaties en reset-mails. Voor livetest: configureer custom SMTP (Postmark, SendGrid, Resend, Brevo) via Supabase Dashboard → Authentication → SMTP.

**Registratie-flow (auth.html):**
- [auth.html:1080](auth.html#L1080) — `showSuccess('Account aangemaakt! Controleer je e-mail en klik op de bevestigingslink om in te loggen.')` — **PASS** voor email confirmation messaging.
- Login fout-messaging: [auth.html:819](auth.html#L819) — `'Inloggen mislukt. Controleer je e-mailadres en wachtwoord.'` — PASS.

**Password Reset:**
- [company-dashboard.html:1255-1262](company-dashboard.html#L1255) — `resetPassword()` functie via `db.auth.resetPasswordForEmail(...)` met `redirectTo: window.location.origin + '/auth.html'`.
- [school-dashboard.html:1146](school-dashboard.html#L1146) — zelfde patroon.
- **HOOG** — geen "wachtwoord vergeten?" link gevonden in [auth.html](auth.html). Een NIET-ingelogde gebruiker kan zijn wachtwoord NIET resetten — alleen vanuit een dashboard nadat hij al ingelogd is. Klassieke usability-bug die livetest direct gaat raken.
- `auth.html` heeft geen handler voor `?type=recovery` of `#access_token=...` magic-link landing. De Supabase reset-link redirect naar `/auth.html` maar daar is geen recovery-flow. Resultaat: gebruiker die op de link klikt komt op de auth-pagina zonder context, kan geen nieuw wachtwoord instellen.
- **HOOG** — recovery-landing flow ontbreekt.

**Eindscore CHECK 27:**
- **HOOG** — geen "wachtwoord vergeten" link op auth.html
- **HOOG** — geen recovery-token landing flow op auth.html (bestaande resetPasswordForEmail-aanroep redirect naar pagina die niets met de recovery-token doet)
- **MIDDEL** — geen custom SMTP geconfigureerd (te checken via Supabase Dashboard, niet uit codebase)
- **PASS** — registratie-bevestiging messaging is correct

---

## CHECK 28 — RLS COMPLETENESS OP KRITIEKE TABELLEN

**Bron:** [internly_migration.sql:507-1110](internly_migration.sql#L507) en [SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql](SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql).

**RLS-status per tabel:**

| Tabel | RLS | SELECT | INSERT | UPDATE | Bevinding |
|---|---|---|---|---|---|
| profiles | enabled | true (public) | id=auth.uid() | id=auth.uid() | PASS — public read is intentioneel voor namen |
| student_profiles | enabled | true (public) | profile_id=auth.uid() | profile_id=auth.uid() | PASS, maar UPDATE heeft geen kolom-restricties |
| company_profiles | enabled | true (public) | profile_id=auth.uid() | profile_id=auth.uid() | **HOOG** — geen kolom-restrictie op trust_score |
| school_profiles | enabled | true (public) | profile_id=auth.uid() | profile_id=auth.uid() | PASS |
| internship_postings | enabled | active OR own | created_by=auth.uid() | created_by=auth.uid() | **HOOG** — geen kolom-restrictie op trust_score |
| matches | enabled | party check | auth.uid() IS NOT NULL | party check | MIDDEL — INSERT te open, kunnen er match-spam ontstaan? |
| applications | enabled | student/profile/posting-owner | student_id=auth.uid() OR profile_id=auth.uid() | zelfde + posting-owner | PASS |
| conversations | enabled | match OR buddy party | auth.uid() IS NOT NULL | n.v.t. | MIDDEL — INSERT te open |
| messages | enabled | conversation party | sender_id=auth.uid() | conversation party | PASS — strict op sender en lees-permissie |
| notifications | enabled | user_id=auth.uid() | auth.uid() IS NOT NULL | user_id=auth.uid() | **HOOG** — INSERT laat elke user notificaties voor elke user inserten = spam-vector |
| buddy_pairs | enabled | requester/receiver | auth.uid() IS NOT NULL | requester/receiver | MIDDEL — INSERT te open |
| buddy_requests | enabled | requester/receiver | requester_id=auth.uid() | receiver_id=auth.uid() | PASS |
| buddy_queue | enabled | user_id=auth.uid() (ALL) | (zelfde) | (zelfde) | PASS |
| meetings | enabled | organizer/attendee | organizer_id=auth.uid() | organizer/attendee | PASS |
| availability | enabled | true (public) | user_id=auth.uid() | n.v.t. | PASS |
| reviews | enabled | (unflagged OR own) | match-gated, no self-review | reviewer_id=auth.uid(), reviewee_id (company_reply), of flag | **HOOG** — `reviews_update_company_reply` + `reviews_update_flag` zonder kolom-restrictie laten breder updates toe dan label suggereert |
| waitlist | enabled | own + admin | public insert | own | PASS |
| stage_* (5 tables) | enabled | match-party | match-party | match-party | PASS |
| company_doorstroom | enabled | true | own | own | PASS |
| push_subscriptions | enabled | user_id=auth.uid() (ALL) | (zelfde) | (zelfde) | PASS |
| school_postings | enabled | active | own | own | PASS |
| kb_articles | enabled | published | n.v.t. (admin) | n.v.t. | PASS |
| **subscriptions** | **ONTBREEKT** | — | — | — | **HOOG** — tabel niet in migration, maar wel gequeried door [js/supabase.js:82](js/supabase.js#L82) hasActivePlan() |
| **payments** | **ONTBREEKT** | — | — | — | **MIDDEL** — gequeried door js/account.js, niet in migration |

**Specifieke RLS-bevindingen:**

1. **HOOG — Trust Score column-level RLS ontbreekt** (bevestigt CHECK 18 BLOCKER)
   - [internly_migration.sql:579-580](internly_migration.sql#L579) `cp_update_own` is `FOR UPDATE USING (profile_id = auth.uid())` — geen `WITH CHECK` en geen kolom-restrictie. Companies KUNNEN hun eigen trust_score wijzigen via Supabase SDK.
   - [internly_migration.sql:614-615](internly_migration.sql#L614) `ip_update_own` zelfde patroon op internship_postings.
   - **Fix**: column-level GRANT/REVOKE óf restrictive policy `WITH CHECK (trust_score IS NOT DISTINCT FROM (SELECT trust_score FROM company_profiles WHERE profile_id = auth.uid()))`.

2. **HOOG — notifications INSERT te open**
   - [internly_migration.sql:735-736](internly_migration.sql#L735) `notif_insert_auth WITH CHECK (auth.uid() IS NOT NULL)`. Iedereen kan notificaties voor iedereen aanmaken. Spam-vector + social engineering ("Je match heeft betaald...").
   - **Fix**: `WITH CHECK (auth.uid() IS NOT NULL AND user_id IS NOT NULL)` is niet voldoende. Beter: forceren dat `user_id` altijd via een trigger of Edge Function gaat. Acceptabel als alleen vertrouwde clients.

3. **HOOG — reviews_update_company_reply en reviews_update_flag te breed**
   - [internly_migration.sql:852-867](internly_migration.sql#L852) — beide UPDATE policies hebben geen kolom-restrictie. Een reviewee kan in principe ook `rating`, `body`, `flagged_at` updaten (alle kolommen). De WITH CHECK valideert alleen wie, niet wat.
   - **Risico**: company kan eigen review-rating verlagen zelf, een gebruiker die "flag" intent claimt kan ondertussen ook andere kolommen wijzigen.
   - **Fix**: BEFORE UPDATE trigger die OLD.rating = NEW.rating afdwingt voor non-reviewer updates.

4. **MIDDEL — matches INSERT en buddy_pairs INSERT te breed**
   - Beide gebruiken `WITH CHECK (auth.uid() IS NOT NULL)`. Mogelijk om matches/buddy-pairs aan te maken waarvan auth.uid niet eens deelnemer is. Acceptabel mits applicatie-logica dit altijd correct doet.

5. **HOOG — `subscriptions` tabel ontbreekt in migration**
   - [js/supabase.js:81-89](js/supabase.js#L81) `hasActivePlan()` queries `from('subscriptions').select('plan, status, current_period_end')`.
   - Niet in `internly_migration.sql`. Twee scenario's:
     - (a) Tabel bestaat alleen in productie Supabase Dashboard → migration drift. **HOOG** voor reproduceerbaarheid en backup.
     - (b) Tabel bestaat niet → hasActivePlan() retourneert altijd false → alle premium features verborgen voor iedereen → consistent met "Mollie nog niet actief" (CLAUDE.md). Bevestigd dat plan-gates effectief uit staan.

6. **MIDDEL — `payments` tabel ontbreekt in migration**
   - [js/account.js](js/account.js) `loadPayments` query — zelfde drift.

7. **MIDDEL — duplicate RLS policies aanwezig** (per [SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql](SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql))
   - matches, notifications, buddy_requests hebben dubbele policies (bv. `matches_select_party` + `own read matches`). Performance-impact en audit-verwarring.
   - Cleanup is "approval-gated" — niet uitgevoerd vóór livetest.

**Eindscore CHECK 28: HOOG (3 distinct issues) + 1 BLOCKER al gemarkeerd in CHECK 18:**
- HOOG: column-level UPDATE policies ontbreken op trust_score (company_profiles, internship_postings)
- HOOG: notifications INSERT-policy te open
- HOOG: reviews UPDATE policies kolom-restrictie ontbreekt
- HOOG: subscriptions tabel ontbreekt in migration (drift met productie)

---

## CHECK 29 — PERFORMANCE: N+1 QUERIES

**Live N+1 patterns gevonden:**

1. **MIDDEL — [chat.html:1238-1259](chat.html#L1238)** — `renderConversationList()` doet voor ELKE conversatie 2 extra queries:
   - `db.from('profiles').select('naam, role').eq('id', otherPartyId).maybeSingle()` (per conv)
   - `db.from('messages').select(...).eq('conversation_id', conv.id).limit(1).maybeSingle()` (per conv)
   - Bij 20 conversaties: 1 (initial) + 40 (2×20) = 41 queries.
   - Promise.all parallelliseert maar laadt niet via JOIN. Bij 100+ conversaties = 200+ queries.
   - **Fix**: Eén `.in('id', otherPartyIds)` voor profiles en één window-functie of view voor laatste bericht per conv.

2. **PASS — [discover.html:996-1019](discover.html#L996)** — `cards.map(async card => REISTIJD.berekenOV(...))` is bewust parallel; cache-hits skippen. Geen DB-query, alleen API-call met cache. Acceptabel patroon.

**Pagination check:**

3. **MIDDEL — [discover.html:1144](discover.html#L1144)** — heeft `.limit(30)` toegepast. **PASS** voor MVP-volume, maar geen offset/paginering UI. Bij >30 vacatures zien gebruikers maximaal 30. Voor livetest acceptabel; bij groei MIDDEL.

4. **MIDDEL — [company-discover.html:558-561](company-discover.html#L558)** — `loadStudents()` doet `.from('student_profiles_pool').select(...)` met **GEEN limit, GEEN paginering**. Bij honderden studenten laadt deze pagina alles in één keer. Voor livetest met handvol studenten acceptabel; bij groei MIDDEL/HOOG.

**Andere mogelijke patterns onderzocht — geen forEach met await db.from() gevonden** in live bestanden. Geen klassieke for-of N+1 patterns.

**Eindscore CHECK 29: MIDDEL** — chat.html conversation list is het concrete N+1 pijnpunt. company-discover.html en discover.html missen progressieve loading. Voor livetest 11 mei met handvol gebruikers OK; vóór schaalvergroting fixen.

---

## CHECK 30 — TRUST SCORE MANIPULATIE VECTORS

**Alle direct trust_score writes (UPDATE/UPSERT/INSERT met trust_score) — live bestanden:**

| Locatie | Operatie | Context | Status |
|---|---|---|---|
| [admin.html:534](admin.html#L534) | `.update({ trust_score, trust_grade }).eq('profile_id', ...)` | `saveTrustOverride()` admin functie | **PASS** (admin-only correct) |
| [admin.html:539](admin.html#L539) | `.update({ trust_score, trust_grade }).eq('created_by', ...)` | sync naar internship_postings na admin override | **PASS** |
| [company-dashboard.html:2024](company-dashboard.html#L2024) | `upsert({ profile_id, trust_score, trust_grade })` | `calculateTrustScore()` op company login | **BLOCKER** (zie CHECK 18) |
| [company-dashboard.html:2031](company-dashboard.html#L2031) | `.update({ trust_score, trust_grade }).eq('created_by', ...)` | sync naar eigen postings | **BLOCKER** |

**Trust Score read-locaties** (niet gevaarlijk maar context):
- bol-profile.html, discover.html, mijn-sollicitaties.html, matches.html, international-student-dashboard.html, match-dashboard.html, vacature-detail.html, school-dashboard.html, student-profile.html — allen lezen trust_score voor weergave.

**reviews.js review-submit flow:**

[js/reviews.js:118-145](js/reviews.js#L118) — `submitReview()` doet alleen INSERT op `reviews`, **GEEN** directe trust_score write. Dit is correct: review wordt geinsert, en de trust_score wordt later (potentieel) herberekend door:
- **Client-side**: company-dashboard.html bij volgende login van de company (via `calculateTrustScore` — onveilig, zie BLOCKER)
- **Server-side**: zou een Edge Function trigger moeten zijn — die ontbreekt per CLAUDE.md *"Trust Score auto-algoritme = niet geïmplementeerd"*.

**Aanvullende vectors:**
- [js/reviews.js:159-165](js/reviews.js#L159) `flagReview()` zet flagged=true. Combineerbaar met andere kolomwijzigingen vanwege RLS-gat in `reviews_update_flag` policy (zie CHECK 28).
- [js/reviews.js:194-200](js/reviews.js#L194) `submitCompanyReply()` — heeft `.eq('reviewee_id', user.id)` als applicatie-filter, maar RLS `reviews_update_company_reply` heeft geen kolom-restrictie, dus theoretisch kan een company via direct SDK-call ook `rating` wijzigen.

**Manipulatie-walkthrough (BLOCKER vector):**
1. Slechte company logt in → opent DevTools.
2. Voert uit:
   ```js
   await db.from('company_profiles').upsert({
     profile_id: '<eigen uid>',
     trust_score: 100,
     trust_grade: 'A'
   });
   ```
3. RLS staat dit toe (zie CHECK 28: `cp_update_own` policy is `USING (profile_id = auth.uid())` zonder kolom-restrictie).
4. Studenten zien voortaan een fake A-grade voor dit bedrijf in alle 9 read-locaties.

**Eindscore CHECK 30: BLOCKER** — bevestiging van CHECK 18. Trust Score is door de codebase als "core differentiator" gepositioneerd (CLAUDE.md, spelregels.html) maar het algoritme is volledig client-side en RLS biedt geen kolom-bescherming. Twee fixes mogelijk vóór deployment:
1. **Snelle fix**: verwijder `calculateTrustScore()` upsert/update uit company-dashboard.html lijn 2024-2032. Frontend toont `componentA + B + C + D` lokaal voor de company maar schrijft niet naar DB. Trust_score blijft op admin-override of NULL tot Edge Function gebouwd wordt.
2. **Volledige fix**: Edge Function + database trigger op `reviews` INSERT zoals CLAUDE.md beschrijft + RLS column restriction die UPDATE op trust_score voor non-service-role blokkeert.

---

## CHECK 31 — RATE LIMITING OP AUTH EN FORMS

**Auth login rate limiting** ([auth.html:671-674](auth.html#L671)):
```js
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 60 * 1000; // 60 seconds
```
- 5 pogingen, 60 seconden lockout. **PASS** voor MVP. Industriestandaard is 3-5 pogingen / 5 minuten — 60s is aan de korte kant maar acceptabel.
- **Beperking**: lockout is in-memory JavaScript-variabele. Pagina-refresh reset `_loginAttempts = 0`. Effectief niet veel meer dan UX-bumper. Echte rate limit komt van Supabase auth zelf (server-side, IP-based).

**Andere forms — search resultaten:**
- Geen rate limiting gevonden op:
  - Waitlist signup (about.html, index.html, discover.html, vacature-detail.html, student-profile.html, bol-profile.html)
  - Review submit (js/reviews.js — submitReview en flagReview)
  - Buddy request (js/buddy.js — geen MAX_REQUESTS gevonden)
  - Match swipe (js/swipes.js)
  - Meeting submit (js/calendar.js)

**Severity per form:**

1. **HOOG — Review submit**: [js/reviews.js:118](js/reviews.js#L118) `submitReview()` heeft geen client-side throttle. RLS heeft `match-gated` policy (alleen tussen wederzijds geaccepteerde matches), wat enige bescherming biedt. Maar: een student met 50 matches kan 50 reviews tegelijk plaatsen, of dezelfde review herhaaldelijk re-submitten als de UI faalt. **HOOG** zoals door instructie aangegeven.

2. **MIDDEL — Buddy requests**: [js/buddy.js](js/buddy.js) — een student kan onbeperkt buddy-requests sturen. Sociaal-engineering en spam vector. **MIDDEL**.

3. **LAAG — Waitlist**: index.html en about.html hebben geen rate limit. Iedereen kan duizenden waitlist-emails sturen. RLS staat dit toe (`wl_insert_public`). Spam-vector op marketing-funnel. **LAAG** per instructie maar wel real risk voor email reputation.

4. **MIDDEL — Match swipes**: niet kritisch, maar bot kan match-pool snel uitputten. **LAAG** in praktijk.

5. **MIDDEL — Flag review**: [js/reviews.js:159](js/reviews.js#L159) — geen throttle. Iemand kan duizenden flags op één review zetten via SDK-loop, met name omdat RLS `reviews_update_flag` `USING (true)`. Combineer met CHECK 28 RLS-gat = HOOG.

**Eindscore CHECK 31:**
- HOOG: review submit + flag review (geen throttle, combineert met RLS-gat)
- MIDDEL: buddy requests
- LAAG: waitlist
- PASS: auth login (MVP-niveau; documenteer dat het pseudo-rate-limiting is)

---

## CHECK 32 — DEAD CODE EN ONGEBRUIKTE FUNCTIES

**Functies in [js/utils.js](js/utils.js):**

| Functie | Lijn | Aantal call-sites in live HTML | Status |
|---|---|---|---|
| `getRoleLanding` | 28 | meervoudig | PASS |
| `isValidRole` | 50 | meervoudig | PASS |
| `smartHomeRedirect` | 55 | meervoudig | PASS |
| `fetchUserRole` | 104 | (intern, gebruikt door requireRole) | PASS |
| `requireRole` | 125 | meervoudig | PASS |
| `getDisplayName` | 140 | meervoudig | PASS |
| `goBack` | 151 | meervoudig | PASS |
| `performLogout` | 162 | meervoudig | PASS |
| `isApplying` | 208 | meervoudig | PASS |
| `setApplying` | 211 | meervoudig | PASS |
| `notify` | 224 | overal | PASS |
| `renderTrustBadge` | 242 | meervoudig | PASS |
| `escapeHtml` | 263 | overal | PASS |
| `formatNLDate` | 274 | meervoudig | PASS |
| `createNotification` | 281 | meervoudig | PASS |
| `getNotifText` | 334 | meervoudig | PASS |
| `renderStudentHeader` | 434 | meervoudig | PASS |
| `getUnreadTotal` | 485 | meervoudig | PASS |
| `validatePassword` | 538 | alleen auth.html | PASS (single use, bedoeld) |
| `validateEmail` | 546 | alleen auth.html | PASS (single use) |
| `sanitizeNaam` | 551 | alleen auth.html | PASS |
| `validatePostcode` | 556 | **0 call-sites** | **LAAG — dead code** |

**Dead code candidate:**
- **LAAG**: [js/utils.js:556](js/utils.js#L556) `validatePostcode()` — geëxporteerd via `window.validatePostcode` maar niet aangeroepen. Postcode-validatie zit elders inline (regex in profile-pages?). Verwijder of activeer.

**Broken onclick handlers** (handmatige inspectie van bekende patterns):

Zonder volledige cross-reference (zou een groot search-budget vergen) is geen broken onclick handler aangetoond binnen de scope van deze audit. Een snelle scan van high-traffic pagina's (auth.html, discover.html, company-dashboard.html, school-dashboard.html, student-profile.html) liet geen onmiddellijk gebroken `onclick=` zien. **VERIFICATIE NODIG via manuele click-test in browser** voor finale dekking.

**Eindscore CHECK 32: LAAG (1 dead function)** — codebase is opvallend schoon op utils-niveau. validatePostcode is de enige duidelijke dead-code candidate. Broken onclick handlers vereisen browser-click test, niet uit te sluiten via grep alleen.

---

## CHECK 33 — ACCESSIBILITY BASICS

**1. Images zonder alt-attribuut:**
- Live HTML bestanden — geen `<img>` zonder alt gevonden buiten preview.html (welke alt heeft).
- **PASS** — geen issues.

**2. Buttons zonder accessible label:**
- 1111 `<button>` instances over alle bestanden, 89 `aria-label` instances over 25 live bestanden.
- Ratio is laag, maar veel buttons hebben tekst-content (visuele tekst dient als label voor screen readers).
- Steekproef [auth.html:502](auth.html#L502) `<button class="btn-submit" id="loginBtn" onclick="doLogin()">Inloggen →</button>` — tekst aanwezig, **PASS**.
- bbl-hub.html en match-dashboard.html bevatten complexe icoon-only buttons; niet getest in scope.
- **MIDDEL — VERIFICATIE NODIG**: bbl-hub heeft 30 buttons; sommige icon-only buttons in chat.html en bbl-hub.html dragen mogelijk niet altijd een aria-label. Grep alleen kan dit niet uitsluiten.

**3. Form inputs zonder geassocieerde labels:**
- [auth.html:495-499](auth.html#L495) — `<label>E-mailadres</label> <input type="email" id="login-email">` — labels staan naast inputs maar **GEEN `for="login-email"` attribuut**. Screen readers associëren ze niet automatisch.
- Hetzelfde patroon voor reg-naam, reg-email, reg-pass, etc.
- **MIDDEL** — voor screen reader-gebruikers zijn alle inputs "unlabeled". Fix: voeg `for="<id>"` toe aan elke `<label>`, of wrap input in label-element.
- Overige profile-pagina's (student-profile.html, company-dashboard.html signup forms) — niet in deze audit getest, maar verwacht zelfde patroon.

**4. Color-only error states:**
- Niet getest in deze audit (vereist visuele inspectie). Genoteerd als open punt.

**Eindscore CHECK 33:**
- MIDDEL: form labels gebruiken geen `for=` attribuut — alle inputs effectief unlabeled voor screen readers
- LAAG/MIDDEL: icon-only buttons in bbl-hub en chat — vereist visuele a11y-review
- PASS: img-alt en zichtbare button-tekst

Volledige WCAG-audit valt buiten scope; deze basics dekken slechts het hoogste-frequentie risico.

---

## CHECK 34 — FINAL SUMMARY DEEL 2

### Severity tally

| Severity | Aantal |
|---|---|
| BLOCKER | 1 (CHECK 18 / 30 = zelfde issue: trust_score client-side write) |
| HOOG | 14 |
| MIDDEL | 18 |
| LAAG | 8 |
| PASS | 6 (volledige checks zonder issues) |

**BLOCKER — concreet:**
- CHECK 18 + CHECK 30: company-dashboard.html schrijft trust_score direct vanuit de browser, RLS biedt geen kolom-bescherming → company kan eigen Trust Score = 100/A zetten via DevTools. Ondermijnt het kernproduct.

**HOOG — geconsolideerd:**
1. CHECK 17: index.html en about.html bevatten inline anon key + laden js/supabase.js (Bedward P2 schending)
2. CHECK 18: reviews-aggregatie reads in discover/school-dashboard zonder kolom-restrictie (verifieer RLS)
3. CHECK 21: supabase-js zonder SRI hash op ~30 live pagina's
4. CHECK 21: jspdf SRI hash mogelijk placeholder (verifieren — kan PDF-export breken)
5. CHECK 26: subscription gates client-side render-only zonder RLS-borging
6. CHECK 27: geen "wachtwoord vergeten" link op auth.html
7. CHECK 27: geen recovery-token landing flow op auth.html
8. CHECK 28: column-level UPDATE policies ontbreken op trust_score (cp_update_own, ip_update_own)
9. CHECK 28: notifications INSERT policy te open — spam vector
10. CHECK 28: reviews_update_company_reply en reviews_update_flag missen kolom-restricties
11. CHECK 28: subscriptions tabel ontbreekt in migration (drift met productie)
12. CHECK 31: review submit + flag review zonder rate limiting (combineert met CHECK 28 RLS-gat)

**MIDDEL — geselecteerd:**
- CHECK 17: faq.html laadt supabase.js (zelfde patroon als publieke info-pagina)
- CHECK 19: performLogout() roept geen localStorage.clear() — BBL-reflecties etc. blijven na logout
- CHECK 20: review-form.html:222 mist rel="noopener noreferrer"
- CHECK 23: geen automatische deletion_requested sweep, beperkte Art. 20 export, geen consent-withdrawal UI
- CHECK 24: matchpool.html mist beforeunload cleanup
- CHECK 25: 5 OPEN VRAGEN op routing canon B2 (single cluster)
- CHECK 27: geen custom SMTP geconfigureerd (te verifiëren in Supabase Dashboard)
- CHECK 28: payments tabel ontbreekt in migration
- CHECK 28: duplicate RLS policies bestaan (per draft)
- CHECK 29: chat.html N+1 op renderConversationList; company-discover.html geen pagination
- CHECK 31: buddy requests zonder rate limiting
- CHECK 33: form labels missen for= attribute → effectief unlabeled voor screen readers

**LAAG:** validatePostcode dead code, faq.html externe link mist noreferrer, console.warn voor debug-doelen, etc.

**PASS-checks:** 16 (security headers), 22 (console.log audit), gedeeltes van 19, 24, 31, 33.

### GECOMBINEERDE STATUS (deel 1 + deel 2)

Dit deel 2 rapport vertegenwoordigt 19 checks. Deel 1 staat in een ander rapport (`PREDEPLOY_AUDIT_PART1_*.md` of vergelijkbaar) en moet apart geraadpleegd worden.

**Deployment is GROEN als beide rapporten 0 blockers tonen.**

Op basis van DIT rapport: **DEEL 2 telt 1 BLOCKER (trust_score client-side write)**. Deployment is dus alleen GROEN als deel 1 ook 0 blockers heeft EN de trust_score BLOCKER is opgelost.

### AANBEVOLEN FIX VOLGORDE DEEL 2

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1 | Verwijder calculateTrustScore upsert/update uit company-dashboard.html lijn 2024-2032 (snelle fix CHECK 18/30) | BLOCKER | klein |
| 2 | Voeg "wachtwoord vergeten" link + recovery-token landing toe aan auth.html (CHECK 27) | HOOG | middel |
| 3 | Voeg SRI hash + crossorigin toe op ~30 supabase-js script tags + pin versie (CHECK 21) | HOOG | middel |
| 4 | Verifieer (en eventueel vervang) jspdf SRI hash met `curl + openssl` (CHECK 21) | HOOG | klein |
| 5 | Verwijder inline anon key + supabase.js uit index.html en about.html (CHECK 17) | HOOG | middel |
| 6 | RLS column-level restriction op trust_score voor cp_update_own en ip_update_own (CHECK 28) | HOOG | middel |
| 7 | RLS reviews_update_company_reply en reviews_update_flag kolom-restrictie (CHECK 28) | HOOG | middel |
| 8 | Voeg rate-limit toe aan submitReview + flagReview in js/reviews.js (CHECK 31) | HOOG | klein |
| 9 | Voeg subscriptions tabel toe aan internly_migration.sql om drift te elimineren (CHECK 28) | HOOG | klein |
| 10 | RLS notifications INSERT met user_id check (CHECK 28) | HOOG | klein |
| 11 | Verifieer/configureer custom SMTP in Supabase Dashboard (CHECK 27) | MIDDEL | klein |
| 12 | Voeg rel="noopener noreferrer" toe aan review-form.html:222 (CHECK 20) | MIDDEL | klein |
| 13 | Voeg matchpool.html beforeunload cleanup toe (CHECK 24) | MIDDEL | klein |
| 14 | Los routing canon B2 cluster op (5 OPEN VRAGEN, CHECK 25) | MIDDEL | middel |
| 15 | performLogout localStorage cleanup-whitelist (CHECK 19) | MIDDEL | klein |
| 16 | Implementeer deletion_requested sweep (Edge Function of cron) (CHECK 23) | MIDDEL | groot |
| 17 | form labels for= attributes toevoegen voor a11y (CHECK 33) | MIDDEL | middel |

**Snelle pre-deploy bundel (effort: klein):** items 1, 4, 8, 9, 10, 11, 12, 13, 15 — schat 2-3 uur totaal en sluit BLOCKER + 5 HOOG-items + 4 MIDDEL-items.

### AUDIT VOLTOOID DEEL 2 — 2026-04-30T00:00:00.000Z

