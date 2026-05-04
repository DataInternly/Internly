# WORLDWIDE COMPANY VERIFICATION UI — 1 mei 2026

## FIX 0 — js/utils.js

| Change | Location | Status |
|---|---|---|
| 0A: VALID_NOTIFICATION_TYPES uitgebreid | [js/utils.js:337-339](js/utils.js#L337) | DONE — `verification_approved`, `verification_rejected`, `verification_pending` toegevoegd na `milestone_confirmed` |
| 0A-bis: VERIFICATION_STATES + VERIFICATION_LABELS_NL constants | [js/utils.js:344-361](js/utils.js#L344) | DONE — `Object.freeze`'d, geëxposeerd via `window.VERIFICATION_STATES` en `window.VERIFICATION_LABELS_NL` direct na de array |
| 0B: getNotifText() switch cases | [js/utils.js:388-390](js/utils.js#L388) | DONE — drie nieuwe `case`-regels vóór de `default:`, met emoji + Nederlandse tekst |

---

## FIX 1 — company-dashboard.html

| Sub | Description | Lines | Status |
|---|---|---|---|
| 1A | Form fields (bedrijfstype, land, BTW, tax-id, doc-upload, badge-section, opties) ingevoegd vóór de beschrijving textarea, na het website-row | [company-dashboard.html:1071-1213](company-dashboard.html#L1071) | DONE — divider + sectie-label + 7 nieuwe form-fields |
| 1B | JS-functies (`handleCompanyTypeChange`, `startVatVerification`, `uploadVerificationDoc`, `renderVerificationBadge`) ingevoegd vóór `saveProfile()` | [company-dashboard.html:2712-2900](company-dashboard.html#L2712) | DONE — 4 functies, ~190 regels |
| 1C | `saveProfile()` upsert-payload uitgebreid met `company_type`, `country`, `vat_number`, `tax_id`, `remote_possible`, `accepts_erasmus`; `uploadVerificationDoc()` aangeroepen na succes | [company-dashboard.html:2906-2933](company-dashboard.html#L2906) | DONE |
| 1D | Tweede upsert op [:3522](company-dashboard.html#L3522) (was lijn 3352 vóór 1A insertie) | n.v.t. | **UNCHANGED** — dit is `saveInternational()`, een aparte flow voor `accepts_international`/`visa_sponsorship`/`housing_support`/`languages_required`. Schrijft naar zelfde tabel maar andere kolommen, dus geen overlap met verificatie-velden |
| 1E | Profile load — populate alle 6 nieuwe velden + render verification badge + show/hide sidebar warning | [company-dashboard.html:3424-3469](company-dashboard.html#L3424) | DONE — toegevoegd in de `if (cp) { ... }` block direct na de bestaande `set('p-desc', ...)` calls, vóór `toonBedrijfOverzicht(cp)` |
| 1F | Sidebar verificatie-waarschuwing banner ingevoegd vóór `nav-studenten` button | [company-dashboard.html:633-654](company-dashboard.html#L633) | DONE — banner HTML; show/hide-logica is geïntegreerd in 1E (zelfde init-block, geen aparte init-call vereist) |

**Belangrijke noot bij 1D:** de instructie vroeg expliciet om verificatie van de tweede upsert. Het bestaat nog steeds (regel ~3522 na onze inserties van 1A), maar het is een **separate flow** voor internationale stage-instellingen, niet voor BTW/verificatie-data. Geen wijziging vereist.

---

## FIX 2 — admin.html

| Sub | Description | Lines | Status |
|---|---|---|---|
| 2A | Tab button "🔍 Verificaties" toegevoegd na bundeling-button met `data-screen="verificaties"` + badge-span | [admin.html:265-272](admin.html#L265) | DONE — past bestaande nav-btn pattern aan i.p.v. de instructie's `class="tab-btn"` (admin gebruikt `nav-btn` + `data-screen` patroon) |
| 2B | Tab content panel `<div id="screen-verificaties">` toegevoegd na screen-bundeling | [admin.html:329-345](admin.html#L329) | DONE — past bestaande `<div class="screen" id="screen-XXX">` pattern aan i.p.v. instructie's `<div id="panel-XXX">` |
| 2C | Functies `loadVerificaties()`, `loadVerifyDoc()`, `adminVerify()` toegevoegd na `denyBundeling()` | [admin.html:780-961](admin.html#L780) | DONE — ~180 regels |
| 2D | `show()` switch uitgebreid met `if (name === 'verificaties') loadVerificaties();` | [admin.html:347](admin.html#L347) | DONE |
| 2D-bis | `loadVerificaties()` call in DOMContentLoaded init voor badge-populatie | [admin.html:1044](admin.html#L1044) | DONE — direct na `loadStats()` |

**Architectuur-noot:** instructie noemde `showAdminTab()` en `class="tab-btn"`. admin.html gebruikt het oudere `show()` + `class="nav-btn"` + `data-screen=""` patroon. Ik heb de instructie aangepast aan het bestaande patroon i.p.v. een nieuw paralleltype te introduceren — dit voorkomt CSS-/JS-mismatches en past bij de andere 5 admin-tabs.

---

## DB-VEREISTEN (run vóór UI gebruikt wordt)

De UI verwacht deze kolommen op `company_profiles`. Verifieer via:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'company_profiles'
AND column_name IN (
  'company_type','country','vat_number','tax_id',
  'remote_possible','accepts_erasmus',
  'verification_status','verification_doc',
  'vat_last_attempt_at','verified_at','verified_by',
  'rejection_reason','vat_cache_name','vat_cache_address',
  'vat_cache_verified_at'
);
```

Verwacht: 15 rijen.

Plus tabel `verification_log` met kolommen: `company_id, action, performed_by, notes, created_at`.

Plus storage-bucket: `verification-docs` (private, RLS: alleen eigen company kan uploaden + service-role kan lezen).

Als kolommen ontbreken: schrijven via UI faalt met `column does not exist`. Gebruikers krijgen een toast "Er is iets misgegaan — probeer het opnieuw" en kunnen niet verder.

---

## GEWIJZIGDE BESTANDEN

1. [js/utils.js](js/utils.js) — FIX 0 (3 cases + 3 types + 2 constants)
2. [company-dashboard.html](company-dashboard.html) — FIX 1A-C + 1E + 1F (5 wijzigingen)
3. [admin.html](admin.html) — FIX 2A-D (5 wijzigingen)

**Totaal: 3 bestanden, 13 wijzigingen, 0 SKIPs.**

---

## OPEN BACKLOG VOOR VOLGENDE SESSIE

- DB-migratie schrijven met de 15 kolommen + verification_log tabel + verification-docs bucket + RLS policies
- BTW-input regex client-side validatie (huidige flow accepteert bv. "ABC" en pas server-side wordt het afgekeurd; UX kan beter door direct invoer-format-check)
- Wachtrij-realtime-subscription voor admin: nu moet admin handmatig refreshen om nieuwe pending-rijen te zien
- `vacature-detail.html` + `discover.html` filter: alleen `verification_status='verified'` companies tonen aan studenten (anders is het slot niet sluitend)
- Erasmus+ filter in student `discover.html` zodat `accepts_erasmus=true` zichtbaar wordt
- Country-flag emoji standardisatie: huidige hardcoded list mist veel landen, overweeg een ISO-3166 lookup module
