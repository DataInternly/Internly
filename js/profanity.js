/* ============================================================
   Internly Bobba Filter v1.0.0-nl
   Client-side scheldwoord-filter. Vervangt matches door 'bobba'.
   Alleen scheldwoorden — geen emails, telefoon of namen.
   ============================================================ */
(function () {
  'use strict';

  // ─── BOBBA LIJST ───────────────────────────────────────────
  const BOBBA_WORDS = [
    // NL klassiek
    'kut','klote','kanker','tering','godverdomme','godver','verdomme',
    'teringlijer','kankerzooi','kutzooi','klerezooi','klere','klotezooi',
    'tyfus','tyfuslijer','pleuris','pleurislijer',
    // NL beledigingen
    'hoer','slet','kutwijf','kankerhoer','mongool','debiel','sukkel',
    'lul','lulhannes','klootzak','eikel','kutjong',
    // NL seksueel / grof
    'neuken','pijpen','trut','flikker',
    // EN overgewaaid
    'fuck','fucking','shit','bitch','asshole','bastard','cunt','dick',
    'motherfucker','pussy','whore','slut','faggot',
    // Verkleiningen
    'kutje',
  ];

  // ─── WHITELIST ─────────────────────────────────────────────
  const WHITELIST = new Set([
    'klasse','klassiek','klassikaal','assumption','assist',
    'assistent','assistentie','shift','shiftwerk','assessment',
    'kankeronderzoek','kankerstichting',
  ]);

  // ─── LEET-SPEAK MAP ────────────────────────────────────────
  const LEET = {
    '4':'a','@':'a','8':'b','3':'e','€':'e','6':'g',
    '1':'i','!':'i','0':'o','5':'s','$':'s','7':'t',
    '+':'t','2':'z','|':'l',
  };

  // ─── NORMALISATIE ──────────────────────────────────────────
  function normalizeLeet(s) {
    return s.split('').map(c => LEET[c] || c).join('');
  }

  function normalize(word) {
    let w = word.toLowerCase();
    w = w.replace(/[\s._\-*]+/g, '');   // strip separators
    w = normalizeLeet(w);
    w = w.replace(/(.)\1{2,}/g, '$1');  // kuuut → kut
    return w;
  }

  // ─── SEPARATOR-EVASIE COLLAPSE ─────────────────────────────
  // "f.u.c.k" en "k u t" → aaneengesloten token.
  // Lookbehind/ahead voorkomt dat het midden van echte woorden matcht.
  function collapseEvasion(text) {
    return text.replace(
      /(?<![a-zA-Z0-9])([a-zA-Z0-9@$!|€])((?:[\s.,_\-*]+[a-zA-Z0-9@$!|€])+)(?![a-zA-Z0-9])/g,
      match => {
        const parts = match.split(/[\s.,_\-*]+/);
        return parts.every(p => p.length === 1) ? parts.join('') : match;
      }
    );
  }

  // ─── CHECK ÉÉN TOKEN ───────────────────────────────────────
  function isProfane(token) {
    const clean = token.toLowerCase();
    if (WHITELIST.has(clean)) return false;
    const norm = normalize(token);
    if (WHITELIST.has(norm)) return false;
    for (const bad of BOBBA_WORDS) {
      if (norm === bad || norm.includes(bad)) return true;
    }
    return false;
  }

  // ─── HOOFDFUNCTIE ──────────────────────────────────────────
  function filter(text) {
    if (!text || typeof text !== 'string') return text;
    const preprocessed = collapseEvasion(text);
    return preprocessed.replace(/\w+/g, token =>
      isProfane(token) ? 'bobba' : token
    );
  }

  // ─── EXPOSE ────────────────────────────────────────────────
  window.Internly = window.Internly || {};
  window.Internly.profanity = {
    filter,
    isProfane,
    addWord: w => BOBBA_WORDS.push(w.toLowerCase()),
    _normalize: normalize,
    _version: '1.0.0-nl',
  };

})();

/*
── Self-test (plak in DevTools console na laden van de pagina) ──

console.assert(Internly.profanity.filter('dit is kut') === 'dit is bobba', '1');
console.assert(Internly.profanity.filter('KLOTE bedrijf') === 'bobba bedrijf', '2');
console.assert(Internly.profanity.filter('wat een kuuuuut') === 'wat een bobba', '3');
console.assert(Internly.profanity.filter('f.u.c.k') === 'bobba', '4');
console.assert(Internly.profanity.filter('k4nker') === 'bobba', '5');
console.assert(Internly.profanity.filter('goede klasse vandaag') === 'goede klasse vandaag', '6');
console.assert(Internly.profanity.filter('kan je mij assisten?') === 'kan je mij assisten?', '7');
console.assert(Internly.profanity.filter('') === '', '8');
console.assert(Internly.profanity.filter('hallo hoe gaat het') === 'hallo hoe gaat het', '9');
console.assert(Internly.profanity.filter('kut en klote') === 'bobba en bobba', '10');
console.log('[Bobba] self-test klaar — geen fouten = alle 10 assertions slagen');
*/
