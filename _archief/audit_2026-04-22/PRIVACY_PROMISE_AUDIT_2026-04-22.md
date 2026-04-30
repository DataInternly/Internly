# Bedward — Privacy Promise Verification Audit
**Datum**: 22 april 2026
**Rol**: Bedward — Als je zegt dat data veilig is, dan bewijs je dat ook.
**Scope**: Privacy-claims op publieke pagina's, telemetry.js gedrag, RLS-status, AVG-verplichtingen vs. implementatie.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode
Verificatie van vier lagen:
1. Wat het platform belooft over privacy
2. Wat telemetry.js daadwerkelijk verzamelt
3. Wat de RLS-beveiliging biedt
4. Wat ontbreekt voor daadwerkelijke AVG-compliance

---

## Laag 1 — Privacy-claims in marketing

### Claim A: "AVG-compliant dataverwerking"
**Locatie**: pricing.html:407 (school Premium feature ✓-checkbox)

AVG-compliance vereist minimaal:
- Verwerkersovereenkomst (DPA) met alle sub-verwerkers ← **ONTBREEKT** (aangevraagd, niet ontvangen)
- Postadres verwerkingsverantwoordelijke in privacybeleid ← **ONTBREEKT** (CLAUDE.md open item)
- Rechtsgrondslag voor elke verwerking gedocumenteerd ← **onbekend**
- Privacy by design in datamodel ← deels (RLS aanwezig)

**Oordeel**: De claim "AVG-compliant dataverwerking" is op dit moment niet aantoonbaar correct.

---

### Claim B: "Je beoordeling blijft anoniem tot na je contract"
**Locatie**: index.html:947–949

**Verificatie**:
- Geen specifieke anonimiseringslogica aangetroffen in de codebase via grep
- Admin RLS = client-side only (CLAUDE.md) → een admin die Supabase Console opent, kan alle reviews zien inclusief wie wat schreef
- Anonimiteit "tot na je contract" impliceert tijdgebonden onthulling — geen functie die dit automatisch regelt aangetroffen

**Oordeel**: De belofte is onverifieerbaar als "beschermd." De technische anonimiteit bestaat niet op DB-niveau.

---

### Claim C: "Geen spam, beloofd"
**Locatie**: index.html:1081
**Tekst**: "Maximaal één mail per maand"

**Verificatie**: Geen backend-limiet aangetroffen. Afhankelijk van handmatige discipline. Technisch niet geborgd.

**Oordeel**: Lage prioriteit — dit is een belofte over intern beleid, geen dataverwerking. Wel misleidend als "beloofd."

---

## Laag 2 — Wat telemetry.js (js/hunters.js) feitelijk verzamelt

Op basis van de codename-tabel in CLAUDE.md:

| Codenaam | Echte naam | Doel |
|----------|-----------|------|
| _sess / ThreatScore | Cumulatieve dreigingsscore | Gedragsbewaking per sessie |
| _tel / SecurityLog | Database-logging | Logt events naar Supabase |
| _fCtx / HoneypotSentinel | Bot-detectie via forms | Leest form-interactie |
| _perf / TimingGuard | Gedragspatroon detectie | Leest timing van gebruikersacties |
| _render / DOMGuard | DOM-injectie bewaking | Inspecteert DOM-mutaties |
| _pol / CSPReporter | CSP-overtreding reporting | Logt CSP-overtredingen |

**Privacy-relevante observaties**:
1. ThreatScore slaat gedragsdata op per sessie — is dit gedrag gedocumenteerd in het privacybeleid als "beveiligingsdoeleinden"?
2. SecurityLog schrijft naar Supabase — welke tabel, welke retentieperiode?
3. TimingGuard detecteert "gedragspatronen" — dit kan als biometrisch-achtige data worden geclassificeerd als het keystroke-timing meet
4. window.__SUPABASE_ANON_KEY is zichtbaar in paginabron (supabase.js) — dit is de publieke key, niet de service_role key, dus acceptabel

**Openstaande vraag**: Is telemetry.js-verzameling vermeld in het privacybeleid? Zonder dit te lezen kan ik geen ja/nee geven, maar het is een kritisch verificatiepunt.

---

## Laag 3 — RLS-status

**Wat CLAUDE.md zegt**:
- "Admin RLS = client-side only"
- Dit betekent: de admin-interface (admin.html) past client-side filters toe, maar op DB-niveau heeft de admin_user waarschijnlijk onbeperkte leesrechten in Supabase Console

**Implicaties**:
1. Elke medewerker met Supabase Console-toegang kan alle user-data zien
2. Dit omvat reviews, chat-berichten, sollicitaties, beoordelingen
3. De belofte "anoniem tot na je contract" is technisch niet geborgd

**Scope van RLS-risico**:
- Niet alle tabellen hebben RLS (niet verifieerbaar zonder Supabase Console)
- SUPABASE_ANON_KEY is public, maar de scope van de anon-key policies is onbekend
- Realtimechannel subscriptions op chat, notifications, matches: RLS bepaalt of een gebruiker berichten van anderen kan ontvangen

---

## Laag 4 — AVG-verplichtingen checklist

| Verplichting | Status |
|-------------|--------|
| Verwerkersovereenkomst (DPA) met Supabase | ❌ Aangevraagd, niet ontvangen |
| Postadres verwerkingsverantwoordelijke in privacybeleid | ❌ Ontbreekt |
| Rechtsgrondslag per verwerking gedocumenteerd | ❓ Niet geverifieerd |
| Recht op inzage (data export) | ❓ Niet geverifieerd |
| Recht op verwijdering (account delete) | ❓ Niet geverifieerd |
| Dataretentiebeleid | ❓ Niet geverifieerd |
| Melding datalekken binnen 72 uur | ❓ Geen procedure aangetroffen |
| Telemetry/gedragsdata vermeld in privacybeleid | ❓ Niet geverifieerd |
| AVG-functionaris of contactpunt | ❓ hallo@internly.pro als enig contact |

❌ = bevestigd ontbrekend · ❓ = niet geverifieerd, risico onbekend

---

## Risico-ranking

### HOOG — Directe actie vereist
1. **DPA Supabase**: Geen DPA = elke verwerking is in strijd met AVG art. 28. Supabase biedt standaard DPA aan via hun dashboard.
2. **"AVG-compliant" verwijderen uit pricing**: Dit is een juridische claim die niet aantoonbaar klopt.
3. **Postadres privacybeleid**: Art. 13 AVG verplicht contactgegevens verwerkingsverantwoordelijke.

### MIDDEL — Voor eerste betalende klant
4. **Anonimiteit reviews op DB-niveau**: Als de belofte "anoniem tot na contract" wordt gemaakt, moet dit via RLS geborgd worden.
5. **Telemetry in privacybeleid**: Gedragsmonitoring (TimingGuard, SecurityLog) moet gedocumenteerd zijn.

### LAAG — Best practice
6. **Retentiebeleid**: Hoe lang worden chat-logs, sollicitaties, evaluaties bewaard?
7. **Verwijderingsflow**: Kan een gebruiker zijn account en data volledig verwijderen?

---

## Aanbeveling aan Guinan2

De combinatie van "AVG-compliant" als feature-claim + ontbrekende DPA + client-side-only Admin RLS is een concreet juridisch risico bij de eerste school of bedrijf die de SLA serieus neemt. Dit moet opgelost worden vóór de eerste betalende klant tekent.

---

*Bedward — 22 april 2026 — READ-ONLY*
