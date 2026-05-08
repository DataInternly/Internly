# TODO — Rol-aware back-navigation helper

## Context
Audit 2026-05-04. Vier files hebben hardcoded student-paden als
fallback voor terug-navigatie:

- [company-dashboard.html:726](company-dashboard.html#L726) → `goBack('discover.html')`
- [school-dashboard.html:708](school-dashboard.html#L708) → `goBack('discover.html')`
- [begeleider-dashboard.html:513](begeleider-dashboard.html#L513) → `goBack('discover.html')`
- [chat.html:482](chat.html#L482) → `<a href="matches.html">` plus mobile-tabs 507-518

Symptoom: bedrijf, school of begeleider klikt terug en belandt op
een student-pagina. FTP-walkthrough item #11 op systeem-niveau.

## Wat
Bouw helper `getRoleAwareBack(role, fallback)` in `js/utils.js` die:
- role leest via `getCurrentRole()` of via parameter
- terugkeert naar `getRoleLanding(role)` als geen meaningful history
- consistent gedrag over alle dashboards

Refactor de vier call-sites naar de helper.

## Niet doen
- Geen fix tijdens atomic-pass van 2026-05-04
- Per-call-site-fix is daar gedaan voor company-dashboard.html en chat.html
- Drift voor school-dashboard.html en begeleider-dashboard.html gelogd in deze TODO

## Trigger om te bouwen
Bij volgende router-state refactor, samen met
TODO_ACCOUNT_REFACTOR.md.
