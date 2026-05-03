// ═══════════════════════════════════════════════════════════════
// Internly rol-contract — centrale rol-detectie en routing
// Gebruikt door: auth.html, student-profile.html, bol-profile.html
// en toekomstige rol-gevoelige pagina's.
// Sinds 29 apr 2026 (fase 2 canon-keuze): resolveStudentDashboard
// hieronder is de canonieke student-router. Voor non-students:
// ROLE_LANDING in js/utils.js. Voor wrappers: zie §Rollen en
// routing in CLAUDE.md.
// ═══════════════════════════════════════════════════════════════

const INTERNLY_ROLES = {
  STUDENT_HBO:       'student-hbo',
  STUDENT_WO:        'student-wo',
  STUDENT_MBO_BOL:   'student-mbo-bol',
  STUDENT_MBO_BBL:   'student-mbo-bbl',
  STUDENT_ONBEKEND:  'student-onbekend',
  BEDRIJF:           'bedrijf',
  SCHOOL:            'school',
  BEGELEIDER:        'begeleider',
  BUDDY:             'buddy'
};

// Detecteer rol uit profiles-rij en student_profiles-rij samen.
// Input: object met { role, bbl_mode, onderwijsniveau }.
// Output: één van INTERNLY_ROLES waarden.
function detectRole({ role, bbl_mode, onderwijsniveau }) {
  if (role === 'bedrijf')       return INTERNLY_ROLES.BEDRIJF;
  if (role === 'school')        return INTERNLY_ROLES.SCHOOL;
  if (role === 'begeleider')    return INTERNLY_ROLES.BEGELEIDER;
  if (role === 'gepensioneerd') return INTERNLY_ROLES.BUDDY;

  if (role === 'student') {
    // bbl_mode is canoniek voor BBL — heeft voorrang op onderwijsniveau
    if (bbl_mode === true) return INTERNLY_ROLES.STUDENT_MBO_BBL;

    // Onderwijsniveau differentieert HBO, WO, BOL
    if (onderwijsniveau === 'MBO_BOL' || onderwijsniveau === 'MBO')
      return INTERNLY_ROLES.STUDENT_MBO_BOL;
    if (onderwijsniveau === 'HBO') return INTERNLY_ROLES.STUDENT_HBO;
    if (onderwijsniveau === 'WO')  return INTERNLY_ROLES.STUDENT_WO;

    return INTERNLY_ROLES.STUDENT_ONBEKEND;
  }

  return INTERNLY_ROLES.STUDENT_ONBEKEND;
}

// Helper: de rij-velden die detectRole nodig heeft. Gebruik deze als
// kolom-whitelist bij elke SELECT die rol-detectie moet doen.
const ROLE_DETECTION_COLUMNS = {
  profiles:         ['role'],
  student_profiles: ['bbl_mode', 'onderwijsniveau']
};

// ═══════════════════════════════════════════════════════════════
// resolveStudentDashboard — single source of truth voor post-login
// student routing. Leest profiles.role + student_profiles.student_type
// + bbl_mode. Retourneert het exacte bestandspad voor redirect.
// Gebruikt door auth.html bij doLogin.
//
// Voor non-student rollen: gebruik getRoleLanding() in js/utils.js
// (delegeert naar ROLE_LANDING).
// ═══════════════════════════════════════════════════════════════
function resolveStudentDashboard(profile, studentProfile) {
  if (!profile || profile.role !== 'student') return null;
  if (!studentProfile) return 'bol-profile.html';
  if (studentProfile?.bbl_mode === true) {
    // Onboarding guard: only redirect to profile-setup
    // if naam is explicitly null or empty string.
    // undefined (no naam key = mock/partial object) → hub.
    const naam = studentProfile?.naam;
    if (naam === null || naam === '') {
      return 'bbl-profile.html';
    }
    return 'bbl-hub.html';
  }
  if (studentProfile.student_type === 'international') {
    return 'international-student-dashboard.html';
  }
  // BOL/HBO/WO student → welkomstpagina (Stage Hub blijft bereikbaar via match-link)
  return 'student-home.html';
}

window.Internly = window.Internly || {};
window.Internly.ROLES                  = INTERNLY_ROLES;
window.Internly.detectRole             = detectRole;
window.Internly.ROLE_DETECTION_COLUMNS = ROLE_DETECTION_COLUMNS;

// Beschikbaar op window voor gebruik in auth.html en andere pagina's
window.resolveStudentDashboard = resolveStudentDashboard;
