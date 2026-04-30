# SRI Hashes — Handmatig toepassen (Barry's beslissing)
**Datum berekend**: 22 april 2026
**Status**: Approval-gated — voer niet toe zonder Barry's review

> ⚠️ **WAARSCHUWING**: Een verkeerde SRI-hash breekt de pagina volledig.
> Test ALTIJD in een incognito-venster vóór deployment naar productie.
> Gebruik `.htaccess`-backup voor noodrollback.

---

## Werkwijze

1. Pin elke CDN-import naar een specifieke versie (bijv. `@2.49.4` i.p.v. `@2`)
2. Voeg `integrity="sha384-<hash>" crossorigin="anonymous"` toe aan de script-tag
3. Test lokaal
4. FTP deployen

---

## Berekende hashes (22 april 2026)

### 1. supabase-js

**Huidige URL**: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
*(floating — wisselt bij elke nieuwe release)*

**Aanbevolen aanpak**: Pin naar een specifieke versie. Check de actuele versie via:
```
https://www.npmjs.com/package/@supabase/supabase-js
```

**Hash berekend op audit-moment** (voor versie die @2 op 2026-04-22 serveerde):
```
sha384-DBZI/1Gz1C29oeP5N6ORumbrmMNoaze4Afb4/c3JkFv79Wh3n1DIzbLRVbu6sJQT
```

**Script-tag na pinning + SRI**:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.X.X/dist/umd/supabase.min.js"
        integrity="sha384-DBZI/1Gz1C29oeP5N6ORumbrmMNoaze4Afb4/c3JkFv79Wh3n1DIzbLRVbu6sJQT"
        crossorigin="anonymous"></script>
```
*(Vervang @2.X.X door de exacte gepinde versie en herbereken hash voor die versie)*

**Bestanden**: alle ~28 HTML-bestanden die supabase-js laden

---

### 2. jspdf 2.5.1

**Huidige URL**: `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
*(al gepind op 2.5.1 — hash is stabiel)*

**Hash**:
```
sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb
```

**Script-tag na SRI**:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        integrity="sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb"
        crossorigin="anonymous"></script>
```

**Bestanden**: `bbl-hub.html`, `match-dashboard.html`

---

### 3. emoji-mart 5.5.2

**Huidige URL**: `https://cdn.jsdelivr.net/npm/emoji-mart@5.5.2/dist/browser.js`
*(al gepind op 5.5.2 — hash is stabiel)*

**Hash**:
```
sha384-gGElBOlmyIGNVOeetC2Q0EHG2IzuLtq7wBSnFgnkDTB/yzjOi6HwHkyt8xjsy7SU
```

**Script-tag na SRI**:
```html
<script src="https://cdn.jsdelivr.net/npm/emoji-mart@5.5.2/dist/browser.js"
        integrity="sha384-gGElBOlmyIGNVOeetC2Q0EHG2IzuLtq7wBSnFgnkDTB/yzjOi6HwHkyt8xjsy7SU"
        crossorigin="anonymous"></script>
```

**Bestanden**: `chat.html`

---

## Hoe hash verifiëren

```bash
# Methode 1 — curl + openssl
curl -s "<CDN_URL>" | openssl dgst -sha384 -binary | openssl base64 -A

# Methode 2 — online tool
# https://www.srihash.org — plak de CDN-URL
```

---

## Prioriteits-volgorde

1. **jspdf** — al gepind, hash stabiel, laag risico om toe te voegen
2. **emoji-mart** — al gepind, stabiel
3. **supabase-js** — eerst pinnen naar specifieke versie, dán hash toevoegen

*Aangemaakt: 22 april 2026 — All-Hands Council audit (item 6, The Worm)*
