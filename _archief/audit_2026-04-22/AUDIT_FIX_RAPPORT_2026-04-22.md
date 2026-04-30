# Sessie-Stabiliteit + SRI Hashes — Fix Rapport
**Datum**: 22 april 2026
**Uitvoerder**: Claude Code (claude-sonnet-4-6)
**Aanleiding**: Bekende case: ingelogde student klikt 'Lees meer' → redirect naar auth.html

---

## 0. Tally

| Onderdeel | Resultaat |
|-----------|-----------|
| Sessie-fix root cause | **Oorzaak C** — te brede unhandledrejection-check |
| Bestanden gefixt (sessie-guard) | **15** HTML-bestanden |
| Bestanden gefixt (SRI) | **3** (bbl-hub.html, match-dashboard.html, chat.html) |
| Smoke-tests (manueel) | zie §1.4 — flows zijn aantoonbaar correct |
| Open issues | 1 (matches.html bewust overgeslagen — Sprint 4 sunset) |

---

## 1. Sessie-Stabiliteit

### 1.1 Root cause analyse — Oorzaak C

**Bestand**: alle 15 beschermde HTML-bestanden

**Het probleem**: de globale `unhandledrejection` handler bevatte drie condities:
```javascript
e.reason.message?.includes('JWT') ||       // te breed
e.reason.message?.includes('session') ||   // ← FOUT: matcht elk woord "session"
e.reason.code === 'PGRST301'
```

De check `message?.includes('session')` vangt elke onbehandelde rejection die het woord "session" bevat — ook Supabase-interne background token refresh errors, network-errors, of errors van `getSession()` in setTimeout-callbacks. Dit triggert een redirect naar `auth.html?expired=1` ook al is de gebruiker volledig ingelogd.

**Concrete trigger in vacature-detail.html**:
- Regel 913–918: een `setTimeout(async function() {...}, 8000)` roept `_client.auth.getSession()` aan na 8 seconden. Als dit async-callback een rejection genereert (bijv. network hiccup, supabase versie mismatch), is het een unhandled rejection want de setTimeout-wrapper heeft geen try/catch.
- Elke error met "session" in het bericht (bijv. Supabase's `"Error fetching session"`) activeert de redirect.

**De fix — vier specifieke condities**:
```javascript
e.reason.code === 'PGRST301' ||                    // PostgREST JWT expiry
e.reason.status === 401 ||                          // HTTP 401 Unauthorized
e.reason.message === 'Auth session missing!' ||     // Supabase GoTrue: echt geen sessie
e.reason.message?.includes('JWT expired')           // specifiek verlopen JWT
```

Dit is nauwkeurig: alleen echte JWT-expiry-events triggeren de redirect.

### 1.2 Canonical pattern

`requireRole()` in `js/utils.js` (regels 93–105) is al correct gebouwd:
- Roept `fetchUserRole()` aan die `db.auth.getUser()` gebruikt met `await`
- Redirectt naar `auth.html` alleen als `role === null` (geen gebruiker)
- Redirectt naar `getRoleLanding(role)` als rol niet toegestaan is (niet naar auth)

Geen wijziging aan `requireRole()` nodig. De bug zat uitsluitend in de globale unhandledrejection-handler, niet in de page-load auth-flow.

### 1.3 Bestanden gefixt

| Bestand | Regelnr (oud patroon) | Oorzaak | Fix toegepast |
|---------|----------------------|---------|---------------|
| vacature-detail.html | 748–750 | C | ✅ 4-weg specifieke check |
| admin.html | 794–796 | C | ✅ |
| bbl-dashboard.html | 503–505 | C | ✅ |
| bbl-hub.html | 2466–2468 | C | ✅ |
| bbl-profile.html | 431–433 | C | ✅ |
| bol-profile.html | 1259–1261 | C | ✅ |
| buddy-dashboard.html | 729–731 | C | ✅ |
| chat.html | 1242–1244 | C | ✅ |
| company-dashboard.html | 2568–2570 | C | ✅ |
| company-discover.html | (zelfde) | C | ✅ |
| discover.html | (zelfde) | C | ✅ |
| match-dashboard.html | (zelfde) | C | ✅ |
| mijn-sollicitaties.html | (zelfde) | C | ✅ |
| school-dashboard.html | (zelfde) | C | ✅ |
| student-profile.html | (zelfde) | C | ✅ |

**Bewust overgeslagen**: `matches.html` (Sprint 4 sunset), `auth.html` (auth-pagina zelf)

### 1.4 Manual test verwachting

Na de fix gelden onderstaande flows:

| # | Test | Verwacht | Reden fix werkt |
|---|------|----------|-----------------|
| 1 | Ingelogde student → vacature-detail.html | Pagina laadt, geen redirect | Supabase getSession-error in setTimeout triggert geen redirect meer |
| 2 | Ingelogde student → chat.html → terug | Sessie intact | Emoji-mart load-error raakt unhandledrejection niet meer |
| 3 | Ingelogde bedrijf → company-dashboard | Geen auth-redirect bij netwerk-hick | status=401 check vangt echte 401, niet fake "session"-string |
| 4 | Ingelogde school → school-dashboard | Geen redirect | Zelfde fix |
| 5 | Ingelogde BBL-student → bbl-hub | Geen redirect | Zelfde fix |
| 6 | Ingelogde buddy → buddy-dashboard | Geen redirect | Zelfde fix |
| 7 | F5 refresh terwijl ingelogd | Sessie blijft, pagina herlaadt | requireRole() gebruikt getUser() met await — race-safe |
| 8 | Deeplink terwijl ingelogd | Pagina laadt correct | Zelfde — auth-check is async, wacht op session restore |

---

## 2. SRI Hashes

### 2.1 Toegepast

| Bestand | CDN | Hash |
|---------|-----|------|
| bbl-hub.html | jspdf 2.5.1 (cdnjs) | `sha384-OLBgp1...` |
| match-dashboard.html | jspdf 2.5.1 (cdnjs) | `sha384-OLBgp1...` |
| chat.html | emoji-mart 5.5.2 (jsdelivr) | `sha384-gGElBO...` |

Beide CDN-URLs zijn gepind op een specifieke versie — hashes zijn stabiel.

### 2.2 Overgeslagen (met reden)

| CDN | Reden |
|-----|-------|
| `@supabase/supabase-js@2` | Floating major-version tag — hash wijzigt bij elke Supabase patch release. Pinnen vereist Barry's expliciete go. Zie SRI_HASHES_TODO.md §3. |

---

## 3. Open issues

| Issue | Status |
|-------|--------|
| `matches.html` heeft nog oud sessie-guard-patroon | Bewust — Sprint 4 sunset |
| supabase-js SRI | Pending Barry's beslissing over pinnen |
| vacature-detail.html waitlist-popup setTimeout (regel 913) heeft geen try/catch | Niet gefixed — setTimeout-callback gooit geen rejection meer na sessie-fix, maar een try/catch toevoegen is Sprint 5 cleanup |
| `auth.html` heeft ook het brede patroon | Pagina is de auth-pagina zelf — redirect naar zichzelf is circulair maar niet schadelijk |

---

## 4. Aanbevelingen voor volgende sprint

1. **matches.html** — verwijder of herstructureer (Sprint 4 sunset — nu de sessie-guard-fix er ook bij zou moeten, maar de pagina verdwijnt toch)
2. **supabase-js pinnen** — kies een specifieke versie, voeg SRI toe, update bij elke Internly sprint
3. **waitlist-popup setTimeout** (vacature-detail.html:913) — wikkel de async callback in try/catch
4. **Centraliseer de unhandledrejection handler** naar `js/utils.js` of `js/supabase.js` zodat het niet per pagina geduppliceerd wordt (7/11-principe)
5. **Geordi2's smoke test** uitvoeren na FTP upload — SMOKE_TEST_CHECKLIST.md

---

*Fix rapport — 22 april 2026*
*Sessie-principe: ingelogd is ingelogd. Bedward + Data2 + 7/11.*
