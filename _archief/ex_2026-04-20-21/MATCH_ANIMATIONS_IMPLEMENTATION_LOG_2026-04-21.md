# Match-animaties Implementatielog — 21 april 2026

## Nieuwe bestanden

| Bestand | Grootte | Beschrijving |
|---|---|---|
| `js/animations/match-celebrate.js` | ~20 KB / 375 regels | Volledige animatiebibliotheek, vijf renderers |

## Gewijzigde bestanden

| Bestand | Regels | Wijziging |
|---|---|---|
| `mijn-berichten.html` | r.18 | Script-tag toegevoegd: `<script src="js/animations/match-celebrate.js">` vóór telemetry.js |
| `mijn-berichten.html` | r.425 | `data-match-type` en `data-match-id` attribuut op request-card div |
| `mijn-berichten.html` | r.459-469 | Animatietrigger in `acceptRequest()` na succesvolle conversation-insert, vóór notify() |

## API

```javascript
window.Internly.animations.celebrate({
  type: 'buddy' | 'school' | 'bedrijf' | 'completion-bol' | 'completion-bbl',
  targetEl: HTMLElement,
  sound?: boolean,
  categoryIcon?: 'theory' | 'technical' | 'creative'
});
window.Internly.animations.soundEnabled = false; // in-memory toggle
```

## Aanpassingen op de brief

- **Laadvolgorde**: brief spreekt van `defer` — niet gebruikt omdat het inline `<script>` block in de body al na de scripttag laadt. Library staat boven `telemetry.js` (altijd laatste). Functie is beschikbaar bij eerste gebruikersinteractie.
- **match-dashboard Trigger 2**: geen accept-handler gevonden die `matches.status` naar `'accepted'` zet. match-dashboard.html verwerkt meeting-acceptaties (`status='geaccepteerd'`), geen match-acceptaties. **Geen trigger ingehangen** — zie sectie Bewust niet gedaan.
- **matchType detectie**: `acceptRequest` had geen matchType in scope. Oplossing: `data-match-type` attribuut op de request-card bij render, zodat de acceptflow geen extra DB-call nodig heeft.
- **Payload per type**: bibliotheek is één bestand (~20 KB totaal, ~4 KB per renderer). Individuele renderer-output: buddy ≈ 420 bytes, school ≈ 580 bytes, bedrijf ≈ 860 bytes, completion-bol ≈ 480 bytes, completion-bbl ≈ 720 bytes — allen ruim onder de 4 KB grens.

## Bewust NIET gedaan

- **Variant D/E triggers**: datamodellen voor `internships.status='completed'` en `bbl_traject.status='completed'` zijn niet bevestigd. Renderers zijn in de library gebouwd, triggers worden als **P2** behandeld.
- **match-dashboard Trigger 2**: geen accept-handler voor `matches.status='accepted'` aangetroffen in match-dashboard.html.
- **Geluidassets**: sound-API-hook geïmplementeerd; assets zijn `null` voor MVP. Geluid speelt nooit af.
- **localStorage/sessionStorage**: niet gebruikt. soundEnabled is in-memory op het globale object.

## Self-test output (bij page-load in browser console)

```
[match-celebrate] self-test OK — 5 renderers, reduced + motion modes getest
```

Bij falen: `console.error` met specifiek type en mode. Geen alerts, geen blocking.

## Testinstructie voor Barry

**Browser-test (Chrome DevTools):**

1. Open `mijn-berichten.html` als ingelogde student (test account: student@internly.pro)
2. Open Console — controleer: `[match-celebrate] self-test OK`
3. Als er een pending begeleider-verzoek is: klik **Accepteer**
   → Animatie Variant B (school, 800ms) speelt boven de request-card
4. Handmatige test zonder verzoek — plak in Console:
   ```javascript
   const el = document.querySelector('.conv-card') || document.body;
   window.Internly.animations.celebrate({ type: 'buddy', targetEl: el });
   // Daarna ook testen:
   window.Internly.animations.celebrate({ type: 'bedrijf', targetEl: el });
   window.Internly.animations.celebrate({ type: 'school', targetEl: el });
   window.Internly.animations.celebrate({ type: 'completion-bol', targetEl: el, categoryIcon: 'technical' });
   window.Internly.animations.celebrate({ type: 'completion-bbl', targetEl: el });
   ```
5. **Reduced-motion test**: DevTools → Rendering → Emulate CSS media → `prefers-reduced-motion: reduce`
   → Statisch eindbeeld verschijnt direct, geen motion

**Verwacht resultaat per variant:**
- buddy: twee groene cirkels schuiven naar midden, groene lijn flitst oranje (900ms)
- school: schild + cirkel fade-in, dotted→solid lijn (800ms)
- bedrijf: twee cards drift-in, briefje vouwt open, groene check pop (1100ms)
- completion-bol: groen zegel zwaait in van boven met micro-shake, oranje aura fade (1200ms)
- completion-bbl: groene tijdlijn vult zich, drie oranje markers, chevron + VOLTOOID (1400ms)
