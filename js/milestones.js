// ── js/milestones.js ─────────────────────────────────
// Gedeelde milestone logica — Internly
// Vereist: js/supabase.js geladen, db beschikbaar als window.db
// ─────────────────────────────────────────────────────

'use strict';

// ── Ophalen ───────────────────────────────────────────
async function getMilestones(matchId) {
  if (!window.db) throw new Error('[milestones] db niet beschikbaar');
  const { data, error } = await window.db
    .from('stage_milestones')
    .select(
      'id, seq, category, title, description, weight,' +
      'confirms_by, status, submitted_at, confirmed_at,' +
      'submitted_by, confirmed_by'
    )
    .eq('match_id', matchId)
    .order('seq', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── Voortgang berekenen ───────────────────────────────
function calcProgress(milestones) {
  return milestones
    .filter(m => m.status === 'bevestigd')
    .reduce((sum, m) => sum + m.weight, 0);
}

// ── Volgende stap voor rol ────────────────────────────
// role: 'student' | 'school' | 'bedrijf'
function getNextMilestone(milestones, role) {
  return milestones.find(m => {
    if (m.status !== 'open' && m.status !== 'ingediend') return false;
    if (m.status === 'ingediend') {
      // school moet bevestigen
      return role === 'school';
    }
    // open: wie moet actie nemen?
    if (m.confirms_by === 'auto') return false;
    if (m.confirms_by === 'meeting') {
      return role === 'school'; // school plant driegesprek
    }
    if (m.confirms_by === 'school') {
      // student triggert deadline/taak, school bevestigt
      // als ingediend=false en student, student mag submitten
      return role === 'student' &&
        ['deadline','taak'].includes(m.category);
    }
    if (m.confirms_by === 'bedrijf') {
      return role === 'bedrijf';
    }
    return false;
  }) || null;
}

// ── Indienen (student of bedrijf triggert) ────────────
async function submitMilestone(milestoneId, userId, matchId) {
  if (!window.db) throw new Error('[milestones] db niet beschikbaar');

  const { error } = await window.db
    .from('stage_milestones')
    .update({
      status:       'ingediend',
      submitted_by: userId,
      submitted_at: new Date().toISOString()
    })
    .eq('id', milestoneId);

  if (error) throw error;

  // Notificatie naar school via createNotification
  if (typeof createNotification === 'function') {
    // school_profile_id ophalen via match → student → school
    const { data: matchRow } = await window.db
      .from('matches')
      .select('party_a')
      .eq('id', matchId)
      .maybeSingle();

    if (matchRow) {
      const { data: sp } = await window.db
        .from('student_profiles')
        .select('school')
        .eq('profile_id', matchRow.party_a)
        .maybeSingle();

      if (sp?.school) {
        const { data: schoolRow } = await window.db
          .from('school_profiles')
          .select('profile_id')
          .eq('schoolnaam', sp.school)
          .maybeSingle();

        if (schoolRow?.profile_id) {
          await createNotification(
            schoolRow.profile_id,
            'milestone_submitted',
            matchId,
            'match',
            'Een student heeft een stap ingediend. Bevestig in het dashboard.'
          ).catch(e =>
            console.warn('[milestones] notif school fout:', e.message)
          );
        }
      }
    }
  }
}

// ── Bevestigen (school of bedrijf confirmeert) ────────
async function confirmMilestone(milestoneId, userId, studentId) {
  if (!window.db) throw new Error('[milestones] db niet beschikbaar');

  const { error } = await window.db
    .from('stage_milestones')
    .update({
      status:       'bevestigd',
      confirmed_by: userId,
      confirmed_at: new Date().toISOString()
    })
    .eq('id', milestoneId);

  if (error) throw error;

  // Notificatie naar student
  if (typeof createNotification === 'function' && studentId) {
    await createNotification(
      studentId,
      'milestone_confirmed',
      milestoneId,
      'milestone',
      'Een stap in jouw stagevoortgang is bevestigd.'
    ).catch(e =>
      console.warn('[milestones] notif student fout:', e.message)
    );
  }
}

// ── Exporteer als window globals ──────────────────────
window.getMilestones     = getMilestones;
window.calcProgress      = calcProgress;
window.getNextMilestone  = getNextMilestone;
window.submitMilestone   = submitMilestone;
window.confirmMilestone  = confirmMilestone;
