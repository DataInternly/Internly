-- ═══════════════════════════════════════════════════════════════════════════
-- Internly — SQL-migraties (uitvoeren in Supabase SQL-editor)
-- Volgorde is van belang. Draai elke blok één keer.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. BBL-modus vlag op student_profiles ───────────────────────────────────
-- Geeft aan of een student via BBL-traject werkt (leerbedrijf + school).
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS bbl_mode   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS schooldag  TEXT;       -- bijv. 'maandag' — blokkeert kalenderdag in bbl-hub.html


-- ── 2. Buddy opt-in op student_profiles ─────────────────────────────────────
-- Student geeft toestemming om in de buddy-zoeklijst te verschijnen.
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS buddy_opt_in BOOLEAN DEFAULT false;


-- ── 3. Voortgang leerdoelen op student_profiles ──────────────────────────────
-- JSONB-map van { "leerdoel-tekst": true/false }.
-- bbl-hub.html en bbl-dashboard.html lezen dit ook uit localStorage als fallback.
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS skills_progress JSONB DEFAULT '{}'::jsonb;


-- ── 4. Verlengingsstatus op matches ─────────────────────────────────────────
-- Slaat de verlengingskeuze op: { "choice": "ja"|"nee"|"weet_niet", "signed_at": "ISO" }
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS renewal_status    JSONB,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE;


-- ── 5. Praktijkbegeleider koppeling op matches ──────────────────────────────
-- Verwijst naar het profiel van de praktijkbegeleider (bedrijfskant).
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS praktijkbegeleider_profile_id UUID REFERENCES profiles(id);


-- ── 6. Buddy: beschikbare dagen op waitlist ──────────────────────────────────
-- Array van dag-namen: ['Maandag','Woensdag']. Opgeslagen door buddy-dashboard.html.
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS available_days TEXT[],
  ADD COLUMN IF NOT EXISTS buddy_type     TEXT,        -- 'gepensioneerd' | 'peer' | 'mentor' etc.
  ADD COLUMN IF NOT EXISTS anonymous      BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS paused         BOOLEAN DEFAULT false;


-- ── 7. Buddy-gesprekken in conversations ────────────────────────────────────
-- Zodat chat.html?buddy_pair_id=... een eigen conversatierij kan aanmaken.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS buddy_pair_id UUID REFERENCES buddy_pairs(id);

-- Index voor snelle lookup
CREATE INDEX IF NOT EXISTS conversations_buddy_pair_id_idx
  ON conversations (buddy_pair_id);


-- ── 8. buddy_queue: wachtrij voor automatische matching ─────────────────────
-- Optioneel — voor toekomstige automatische koppeling (fase 3).
CREATE TABLE IF NOT EXISTS buddy_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buddy_type   TEXT NOT NULL,           -- 'gepensioneerd' | 'peer' | ...
  sector       TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  matched_at   TIMESTAMPTZ,
  pair_id      UUID REFERENCES buddy_pairs(id)
);

CREATE INDEX IF NOT EXISTS buddy_queue_student_idx ON buddy_queue (student_id);
CREATE INDEX IF NOT EXISTS buddy_queue_matched_idx  ON buddy_queue (matched_at) WHERE matched_at IS NULL;


-- ── 9. Notification typen uitbreiden (referentie) ───────────────────────────
-- De notifications-tabel bestaat al. Nieuwe ref_type waarden die worden gebruikt:
--   ref_type = 'buddy'   → buddy-koppeling accepted/declined
--   ref_type = 'meeting' → BBL-afspraak uitnodiging
-- Geen schema-wijziging nodig als ref_type TEXT is (geen ENUM).
-- Controleer: SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'notifications' AND column_name = 'ref_type';


-- ── RLS-beleid voor nieuwe kolommen ─────────────────────────────────────────
-- buddy_pairs en buddy_requests: gebruikers mogen alleen eigen rijen lezen/schrijven.
-- Pas aan op basis van je bestaande RLS-structuur.

-- Voorbeeld (alleen als je nog geen policies hebt):
/*
ALTER TABLE buddy_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buddy_pairs_select" ON buddy_pairs
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "buddy_pairs_insert" ON buddy_pairs
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "buddy_pairs_update" ON buddy_pairs
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

ALTER TABLE buddy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buddy_requests_select" ON buddy_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "buddy_requests_insert" ON buddy_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "buddy_requests_update" ON buddy_requests
  FOR UPDATE USING (auth.uid() = receiver_id);
*/
