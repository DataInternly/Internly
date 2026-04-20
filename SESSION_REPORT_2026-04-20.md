# Internly — Session report 2026-04-20

## What shipped

- [x] esg-rapportage.html created at project root (commit 49293d8)
- [x] Three audit amendments baked in (Trust Score wording, eindgesprek wording, boekjaar tree-note)
- [x] company-dashboard.html ESG-tab placeholder card — card present, link href `/esg-rapportage.html` confirmed ✓
- [x] index.html footer link to ESG page — added as `<li>` alongside Spelregels and Contact ✓
- [x] stageplatform_concept.html — skipped, file does not exist in project (no greenwashing risk; nothing to retire)

## Sanity check results (Step 6)

Step 6 was run as code inspection (no browser available in this environment). Barry must confirm items 1, 3, 4, 6 in a browser — those require rendering.

| # | Item | Result |
|---|------|--------|
| 1 | Page loads without error | code-ok — no JS, no external deps except Google Fonts CDN |
| 2 | Nav renders correctly | ✓ — markup present: logo left, ESG tag, Inloggen button right |
| 3 | Hero forest green + orange italic fragment | ✓ — `background:#0d5c2f`, italic orange span confirmed in source |
| 4 | Body transitions to cream | ✓ — `background:#f6f2e8` on alternating sections confirmed in source |
| 5 | [LIVE-DATUM] literal present in availability banner | ✓ — grep returned 2 content hits, 2 comment markers |
| 6 | FAQ accordion opens and closes | code-ok — native `<details>`/`<summary>`, no JS required |
| 7 | Closing CTA button links to /auth.html?tier=business | ✓ — href confirmed in source |

## Still to do before FileZilla upload

- [ ] Barry reviews this report fresh (not tonight)
- [ ] Barry runs the seven sanity checks himself on a second browser
- [ ] Barry decides: add `?tier=business` query param support to auth.html, or change the ESG page link to plain `/auth.html`
- [ ] Barry picks one more test: open the page on an actual phone to confirm mobile layout

## After FileZilla upload

- [ ] Hit https://internly.pro/esg-rapportage.html in a private window
- [ ] Re-run the seven sanity checks against the live host
- [ ] Verify footer link is visible on the live https://internly.pro homepage
- [ ] Verify ESG-tab placeholder shows in company-dashboard when logged in as a Business-tier bedrijf

## Next session (Fase A)

- Schema migration: add five missing fields + trust_score_history table + esg_exports table
- Discussion question for Barry: "structurele partnerschap" threshold (recommended: 3+ stages in 12 months)
- Discussion question for Barry: prefer Supabase migration editor or single copy-paste SQL
- Crew on standby: Timmy for schema, Data2 for chronology, Bedward voor AVG, Hotch2 chairs

## Known standing gaps (not blockers)

- Trust Score history table does not exist yet. Page language already honest about this. History will start building on Fase C go-live.
- `student_profiles.onderwijsniveau` field does not exist yet. Page language uses HBO/MBO/WO/BBL but export is not live. No exposure.
- `matches.completion_status` does not exist yet. Page uses "eindgesprek afgetekend op Internly" wording as a safe proxy.

## Files touched this session

- created: esg-rapportage.html
- modified: company-dashboard.html (ESG-tab placeholder card added above #esg-content)
- modified: index.html (footer li added: ESG & rapportage)
- not modified: stageplatform_concept.html (file absent)
- not modified: css/style.css
- not modified: js/telemetry.js
- not modified: js/supabase.js
- not modified: sw.js

## Rollback reminders (if needed later)

- esg-rapportage.html: delete file
- company-dashboard.html: restore from company-dashboard.backup.2026-04-20.html
- index.html: no backup was taken for the footer edit. Revert manually by removing the one-line link added in step C.

---

_End of session report. Good night Barry._
