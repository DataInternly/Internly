// ═══════════════════════════════════════════════════════════════
// Internly rol-contract — centrale rol-detectie en routing
// Gebruikt door: auth.html, student-profile.html, bol-profile.html
// en toekomstige rol-gevoelige pagina's.
// BBL-bestanden (bbl-hub, bbl-dashboard, bbl-profile) blijven hun
// eigen routing via js/utils.js routeStudentByMode gebruiken —
// die functie wordt NIET gewijzigd in deze sessie.
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

// Post-login bestemming per rol. Volgt role-matrix.md §3.
function routeForRole(roleKey) {
  switch (roleKey) {
    case INTERNLY_ROLES.BEDRIJF:          return '/company-dashboard.html';
    case INTERNLY_ROLES.SCHOOL:           return '/school-dashboard.html';
    case INTERNLY_ROLES.BEGELEIDER:       return '/begeleider-dashboard.html';
    case INTERNLY_ROLES.BUDDY:            return '/buddy-dashboard.html';
    case INTERNLY_ROLES.STUDENT_MBO_BBL:  return '/bbl-hub.html';
    case INTERNLY_ROLES.STUDENT_MBO_BOL:  return '/bol-profile.html';
    case INTERNLY_ROLES.STUDENT_HBO:      return '/match-dashboard.html';
    case INTERNLY_ROLES.STUDENT_WO:       return '/match-dashboard.html';
    case INTERNLY_ROLES.STUDENT_ONBEKEND: return '/student-profile.html';
    default:                              return '/student-profile.html';
  }
}

// Helper: de rij-velden die detectRole nodig heeft. Gebruik deze als
// kolom-whitelist bij elke SELECT die rol-detectie moet doen.
const ROLE_DETECTION_COLUMNS = {
  profiles:         ['role'],
  student_profiles: ['bbl_mode', 'onderwijsniveau']
};

window.Internly = window.Internly || {};
window.Internly.ROLES                  = INTERNLY_ROLES;
window.Internly.detectRole             = detectRole;
window.Internly.routeForRole           = routeForRole;
window.Internly.ROLE_DETECTION_COLUMNS = ROLE_DETECTION_COLUMNS;
