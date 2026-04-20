window.ESG = (function () {

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatPeriod(year) {
    return `1 januari ${year} \u2013 31 december ${year}`;
  }

  function computeExportId(hash) {
    return 'ESG-' + hash.slice(0, 8).toUpperCase();
  }

  async function _sha256(obj) {
    const buf = new TextEncoder().encode(JSON.stringify(obj));
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ── Data queries ──────────────────────────────────────────────────────────

  async function fetchDatapoints(profileId, year) {
    const yStart = `${year}-01-01`;
    const yEnd   = `${year}-12-31`;

    const [qAccepted, qAll, qReviews, qMeetings, qPostings, qCompany] = await Promise.all([
      db.from('matches')
        .select('id, party_a')
        .eq('party_b', profileId)
        .eq('status', 'accepted')
        .gte('created_at', yStart)
        .lte('created_at', yEnd),

      db.from('matches')
        .select('id, status')
        .eq('party_b', profileId)
        .gte('created_at', yStart)
        .lte('created_at', yEnd),

      db.from('reviews')
        .select('rating')
        .eq('reviewee_id', profileId)
        .gte('created_at', yStart)
        .lte('created_at', yEnd),

      db.from('meetings')
        .select('id, type, status')
        .eq('organizer_id', profileId)
        .eq('status', 'voltooid')
        .gte('proposed_date', yStart)
        .lte('proposed_date', yEnd),

      db.from('internship_postings')
        .select('sector, tags')
        .eq('created_by', profileId)
        .eq('status', 'active'),

      db.from('company_profiles')
        .select('id, bedrijfsnaam, trust_score')
        .eq('profile_id', profileId)
        .maybeSingle(),
    ]);

    const accepted   = qAccepted.data  || [];
    const allMatches = qAll.data        || [];
    const reviews    = qReviews.data    || [];
    const meetings   = qMeetings.data   || [];
    const postings   = qPostings.data   || [];
    const company    = qCompany.data    || {};

    // DP.01 — onderwijsniveau breakdown
    const niveauBreakdown = { MBO: 0, HBO: 0, WO: 0, BBL: 0, onbekend: 0 };
    if (accepted.length > 0) {
      const studentIds = [...new Set(accepted.map(m => m.party_a).filter(Boolean))];
      const { data: spRows } = await db
        .from('student_profiles')
        .select('profile_id, onderwijsniveau')
        .in('profile_id', studentIds);
      (spRows || []).forEach(sp => {
        const niv = sp.onderwijsniveau || 'onbekend';
        if (niv in niveauBreakdown) niveauBreakdown[niv]++;
        else niveauBreakdown.onbekend++;
      });
    }

    // DP.02 — response rate
    const totaalSollicitaties = allMatches.length;
    const beantwoord = allMatches.filter(m => m.status !== 'pending').length;
    const responsRatio = totaalSollicitaties > 0
      ? Math.round((beantwoord / totaalSollicitaties) * 100)
      : 0;

    // DP.04 — ratings
    const aantalBeoordelingen = reviews.length;
    const gemRating = aantalBeoordelingen > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / aantalBeoordelingen
      : 0;
    const bar1 = reviews.filter(r => r.rating <= 2).length;
    const bar2 = reviews.filter(r => r.rating === 3).length;
    const bar3 = reviews.filter(r => r.rating >= 4).length;

    // DP.05 — meetings by type
    const aantalGesprekken = meetings.length;
    const mRespons     = meetings.filter(m => ['intake', 'kennismaking'].includes(m.type)).length;
    const mLeerdoel    = meetings.filter(m => m.type === 'voortgang').length;
    const mAfspraken   = meetings.filter(m => m.type === 'evaluatie').length;
    const mBegeleiding = meetings.filter(
      m => !['intake', 'kennismaking', 'voortgang', 'evaluatie'].includes(m.type)
    ).length;

    // DP.06 — sectoren
    const allTags = postings.flatMap(p => {
      const parts = [];
      if (p.sector) parts.push(p.sector);
      if (Array.isArray(p.tags)) parts.push(...p.tags);
      return parts;
    });
    const sectoren = [...new Set(allTags)].filter(Boolean);

    return {
      _companyProfilesId: company.id || null,
      companyNaam: company.bedrijfsnaam || '',
      year,
      dp01: { total: accepted.length, ...niveauBreakdown },
      dp02: { total: totaalSollicitaties, beantwoord, ratio: responsRatio },
      dp03: { score: company.trust_score ?? null },
      dp04: { avg: gemRating, count: aantalBeoordelingen, bar1, bar2, bar3 },
      dp05: { count: aantalGesprekken, respons: mRespons, leerdoel: mLeerdoel, afspraken: mAfspraken, begeleiding: mBegeleiding },
      dp06: { sectoren },
    };
  }

  // ── Save to esg_exports ───────────────────────────────────────────────────

  async function saveExport(dp, userId) {
    const hash = await _sha256({ cid: dp._companyProfilesId, year: dp.year, dp, ts: Date.now() });
    const row = {
      company_profile_id: dp._companyProfilesId,
      boekjaar:           dp.year,
      period_start:       `${dp.year}-01-01`,
      period_end:         `${dp.year}-12-31`,
      dp01_count:         dp.dp01.total,
      dp02_pct:           dp.dp02.ratio,
      dp03_score:         dp.dp03.score,
      dp04_avg:           dp.dp04.count > 0 ? parseFloat(dp.dp04.avg.toFixed(2)) : null,
      dp05_count:         dp.dp05.count,
      dp06_list:          dp.dp06.sectoren,
      created_by:         userId,
      event_hash:         hash,
    };
    const { error } = await db.from('esg_exports').insert(row);
    if (error) throw error;
    return hash;
  }

  // ── Build session payload for esg-inject.js ───────────────────────────────

  function _buildSessionData(dp, exportId, exportDate) {
    const scoreCtx = dp.dp03.score !== null
      ? 'Momentopname op exportdatum. Gebaseerd op beoordelingen, responssnelheid en gespreksvoltooiing.'
      : 'Nog niet berekend \u2014 score verschijnt zodra er voldoende platformactiviteit is.';

    return {
      company: { naam: dp.companyNaam },
      period:  { text: formatPeriod(dp.year), year: String(dp.year) },
      export:  { date: exportDate, id: exportId },
      dp01: {
        value: String(dp.dp01.total),
        hbo:   String(dp.dp01.HBO),
        mbo:   String(dp.dp01.MBO),
        wo:    String(dp.dp01.WO),
        bbl:   String(dp.dp01.BBL),
      },
      dp02: {
        value:      dp.dp02.ratio + '%',
        total:      String(dp.dp02.total),
        beantwoord: String(dp.dp02.beantwoord),
        ratio:      dp.dp02.ratio + '%',
      },
      dp03: {
        value:   dp.dp03.score !== null ? dp.dp03.score.toFixed(1) : '\u2014',
        context: scoreCtx,
      },
      dp04: {
        value: dp.dp04.count > 0 ? dp.dp04.avg.toFixed(1) + ' / 5' : '\u2014',
        count: String(dp.dp04.count),
        bar1:  String(dp.dp04.bar1),
        bar2:  String(dp.dp04.bar2),
        bar3:  String(dp.dp04.bar3),
      },
      dp05: {
        value:       String(dp.dp05.count),
        respons:     String(dp.dp05.respons),
        leerdoel:    String(dp.dp05.leerdoel),
        afspraken:   String(dp.dp05.afspraken),
        begeleiding: String(dp.dp05.begeleiding),
      },
      dp06: {
        value: String(dp.dp06.sectoren.length),
        list:  dp.dp06.sectoren.join(', ') || '\u2014',
      },
    };
  }

  // ── PDF ───────────────────────────────────────────────────────────────────

  async function downloadPDF(profileId, year, userId) {
    const dp = await fetchDatapoints(profileId, year);
    const hash = await saveExport(dp, userId);
    const exportId = computeExportId(hash);
    const exportDate = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const sessionData = _buildSessionData(dp, exportId, exportDate);
    sessionStorage.setItem('internly_esg_export_data', JSON.stringify(sessionData));
    window.open('/esg-export.html', '_blank');
    return exportId;
  }

  // ── CSV ───────────────────────────────────────────────────────────────────

  async function downloadCSV(profileId, year, userId) {
    const dp = await fetchDatapoints(profileId, year);
    const hash = await saveExport(dp, userId);
    const exportId = computeExportId(hash);
    const today = new Date().toISOString().slice(0, 10);

    const rows = [
      ['Export ID', exportId],
      ['Bedrijf', dp.companyNaam],
      ['Boekjaar', dp.year],
      ['Exportdatum', today],
      [],
      ['Datapunt', 'Omschrijving', 'Waarde'],
      ['DP.01', 'Totaal stagiairs (ESRS S1)', dp.dp01.total],
      ['DP.01', 'HBO', dp.dp01.HBO],
      ['DP.01', 'MBO', dp.dp01.MBO],
      ['DP.01', 'WO', dp.dp01.WO],
      ['DP.01', 'BBL', dp.dp01.BBL],
      ['DP.01', 'Onbekend', dp.dp01.onbekend],
      ['DP.02', 'Responspercentage (%)', dp.dp02.ratio],
      ['DP.02', 'Totaal sollicitaties', dp.dp02.total],
      ['DP.02', 'Beantwoord', dp.dp02.beantwoord],
      ['DP.03', 'Trust Score (momentopname)', dp.dp03.score ?? ''],
      ['DP.04', 'Gemiddelde beoordeling', dp.dp04.count > 0 ? dp.dp04.avg.toFixed(2) : ''],
      ['DP.04', 'Aantal beoordelingen', dp.dp04.count],
      ['DP.04', 'Beoordelingen 1-2 (laag)', dp.dp04.bar1],
      ['DP.04', 'Beoordelingen 3 (gemiddeld)', dp.dp04.bar2],
      ['DP.04', 'Beoordelingen 4-5 (hoog)', dp.dp04.bar3],
      ['DP.05', 'Begeleidingsgesprekken totaal (ESRS S1-13)', dp.dp05.count],
      ['DP.05', 'Intake/kennismaking', dp.dp05.respons],
      ['DP.05', 'Voortgangsgesprekken', dp.dp05.leerdoel],
      ['DP.05', 'Evaluaties', dp.dp05.afspraken],
      ['DP.05', 'Overig', dp.dp05.begeleiding],
      ['DP.06', 'Aantal vertegenwoordigde sectoren', dp.dp06.sectoren.length],
      ['DP.06', 'Sectoren', dp.dp06.sectoren.join('; ')],
    ];

    const esc = c => '"' + String(c).replace(/"/g, '""') + '"';
    const csv = rows.map(r => r.length ? r.map(esc).join(',') : '').join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `internly-esg-${dp.year}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return exportId;
  }

  // ── History ───────────────────────────────────────────────────────────────

  async function loadHistory(profileId) {
    const { data: cp } = await db
      .from('company_profiles')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (!cp?.id) return [];

    const { data, error } = await db
      .from('esg_exports')
      .select('id, boekjaar, created_at, event_hash, dp01_count, dp02_pct, dp04_avg')
      .eq('company_profile_id', cp.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return data || [];
  }

  return { fetchDatapoints, saveExport, downloadPDF, downloadCSV, loadHistory, computeExportId, formatPeriod };
})();
