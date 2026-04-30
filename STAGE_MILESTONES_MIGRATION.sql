-- ═══════════════════════════════════════════════════
-- INTERNLY — STAGE MILESTONES MIGRATION
-- Datum: 30 april 2026
-- Verbindt voortgangsbalken aan echte acties per rol
-- Pré-check: voer eerst uit —
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name LIKE 'stage%';
-- Verwacht: stage_plans, stage_leerdoelen, stage_deadlines,
-- stage_tasks, stage_reflecties, stage_log
-- (stage_milestones ontbreekt — wordt door deze migration aangemaakt)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stage_milestones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      uuid NOT NULL REFERENCES matches(id)
                  ON DELETE CASCADE,
  seq           int  NOT NULL CHECK (seq BETWEEN 1 AND 8),
  category      text NOT NULL
                  CHECK (category IN
                    ('taak','deadline','meeting','document')),
  title         text NOT NULL,
  description   text,
  weight        int  NOT NULL CHECK (weight > 0),
  confirms_by   text NOT NULL
                  CHECK (confirms_by IN
                    ('student','school','bedrijf',
                     'meeting','auto')),
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN
                    ('open','ingediend','bevestigd')),
  submitted_by  uuid REFERENCES profiles(id),
  submitted_at  timestamptz,
  confirmed_by  uuid REFERENCES profiles(id),
  confirmed_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (match_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_stage_milestones_match
  ON stage_milestones(match_id);

ALTER TABLE stage_milestones ENABLE ROW LEVEL SECURITY;

-- Select: student, bedrijf, en school (via schoolnaam match)
DROP POLICY IF EXISTS "sm_select_party"  ON stage_milestones;
DROP POLICY IF EXISTS "sm_select_school" ON stage_milestones;
DROP POLICY IF EXISTS "sm_update_auth"   ON stage_milestones;

CREATE POLICY "sm_select_party" ON stage_milestones
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = stage_milestones.match_id
      AND (m.party_a = auth.uid()
        OR m.party_b = auth.uid())
  )
);

-- Separate school select policy (via student school field)
CREATE POLICY "sm_select_school" ON stage_milestones
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN student_profiles sp ON sp.profile_id = m.party_a
    JOIN school_profiles  sc ON sc.schoolnaam  = sp.school
    WHERE m.id = stage_milestones.match_id
      AND sc.profile_id = auth.uid()
  )
);

-- Update: any authenticated party (app-logic gates who can
-- submit vs confirm — keep RLS simple)
CREATE POLICY "sm_update_auth" ON stage_milestones
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (auth.uid() IS NOT NULL);


-- ── Seed function ──────────────────────────────────────
-- Call after match accepted:
--   SELECT seed_stage_milestones('<match_uuid>',
--                                <profile_naam_ingevuld>);
CREATE OR REPLACE FUNCTION seed_stage_milestones(
  p_match_id uuid,
  p_profiel_compleet boolean DEFAULT false
)
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Voorkom dubbele seed
  IF EXISTS (
    SELECT 1 FROM stage_milestones
    WHERE match_id = p_match_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO stage_milestones
    (match_id, seq, category, title, description,
     weight, confirms_by, status,
     confirmed_at)
  VALUES
    (p_match_id, 1, 'taak',
     'Profiel volledig ingevuld',
     'Vul naam, opleiding, leerdoelen en motivatie in.',
     10, 'auto',
     CASE WHEN p_profiel_compleet THEN 'bevestigd'
          ELSE 'open' END,
     CASE WHEN p_profiel_compleet THEN now()
          ELSE NULL END),
    (p_match_id, 2, 'document',
     'Praktijkovereenkomst (POK) getekend',
     'De POK is ondertekend door student, school en bedrijf.',
     15, 'school', 'open', NULL),
    (p_match_id, 3, 'meeting',
     'Eerste driegesprek gevoerd',
     'Kennismakingsgesprek — school plant via dashboard.',
     10, 'school', 'open', NULL),
    (p_match_id, 4, 'taak',
     'Leerdoelen halverwege behaald',
     'Student geeft aan welke leerdoelen behaald zijn.',
     15, 'school', 'open', NULL),
    (p_match_id, 5, 'deadline',
     'Tussentijds rapport ingeleverd',
     'Student levert voortgangsverslag in bij school.',
     15, 'school', 'open', NULL),
    (p_match_id, 6, 'meeting',
     'Tweede driegesprek gevoerd',
     'Tussentijdse evaluatie met alle drie de partijen.',
     10, 'school', 'open', NULL),
    (p_match_id, 7, 'deadline',
     'Eindverslag ingeleverd',
     'Student levert eindverslag in bij school.',
     15, 'school', 'open', NULL),
    (p_match_id, 8, 'taak',
     'Eindbeoordeling afgerond',
     'Bedrijf rondt beoordeling af, school bevestigt.',
     10, 'bedrijf', 'open', NULL);
END;
$$;

-- Verificatie
SELECT 'stage_milestones migration ready' AS status;
