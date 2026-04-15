-- ============================================================
-- Internly — Complete Database Migration
-- Run this in Supabase SQL Editor (Database > SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS guards
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. Extensions
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES  (base user table — links to auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  naam       text,
  full_name  text,
  email      text,
  role       text CHECK (role IN ('student','bedrijf','school','buddy')),
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. STUDENT PROFILES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_profiles (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  opleiding       text,
  niveau          text,
  sector          text,
  beschikbaar_van date,
  beschikbaar_tot date,
  skills          jsonb,
  bio             text,
  avatar_url      text,
  bbl_mode        boolean DEFAULT false,
  -- BBL-specific profile fields (bbl-profile.html)
  naam            text,
  school          text,
  schooldag       text,
  postcode        text,
  opdracht_domein text,
  motivatie       text,
  pb_naam         text,
  contract_start  date,
  contract_end    date,
  jaar            int,
  -- BBL hub progress tracking (bbl-hub.html voortgangsview)
  skills_progress   jsonb,
  skills_toelichting jsonb,
  created_at      timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 3. COMPANY PROFILES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_profiles (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id     uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  bedrijfsnaam   text,
  sector         text,
  contactpersoon text,
  website        text,
  beschrijving   text,
  logo_url       text,
  trust_score    numeric(5,2) DEFAULT 0,
  trust_grade    text,
  created_at     timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. SCHOOL PROFILES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_profiles (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id     uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  schoolnaam     text,
  sector         text,
  contactpersoon text,
  beschrijving   text,
  created_at     timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 5. INTERNSHIPS  (pool vacatures — source 1)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS internships (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        text NOT NULL,
  company_name text,
  trust_score  numeric(5,2),
  trust_grade  text,
  sector       text,
  description  text,
  location     text,
  created_at   timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 6. INTERNSHIP POSTINGS  (pool vacatures — source 2)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS internship_postings (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           text NOT NULL,
  company_name    text,
  trust_score     numeric(5,2),
  trust_grade     text,
  status          text DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  sector          text,
  description     text,
  location        text,
  company_user_id uuid REFERENCES profiles(id),
  created_by      uuid REFERENCES profiles(id),
  -- BBL-specific posting fields (bbl-hub, bbl-dashboard)
  hours_per_week  int,
  bbl_mode        boolean DEFAULT false,
  contract_start  date,
  contract_end    date,
  created_at      timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 7. MATCHES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_a                     uuid REFERENCES profiles(id),
  party_b                     uuid REFERENCES profiles(id),
  status                      text DEFAULT 'active'
                                CHECK (status IN ('active','accepted','rejected','pending','ended')),
  type                        text,           -- 'student_posting' | 'company_to_student' | 'school_referral' | 'student_to_company'
  initiated_by                uuid REFERENCES profiles(id),
  match_target                text,           -- 'posting' | 'internship'
  posting_id                  uuid REFERENCES internship_postings(id),
  renewal_status              jsonb,          -- { student: bool, bedrijf: bool }
  praktijkbegeleider_profile_id uuid REFERENCES profiles(id),
  contract_start              date,
  contract_end_date           date,           -- named contract_end_date to match bbl-hub/bbl-dashboard
  created_at                  timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 8. APPLICATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- legacy columns (internships source)
  student_id     uuid REFERENCES profiles(id),
  internship_id  uuid REFERENCES internships(id),
  -- new columns (internship_postings source)
  profile_id     uuid REFERENCES profiles(id),
  posting_id     uuid REFERENCES internship_postings(id),
  -- shared
  status         text DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at     timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 9. BUDDY PAIRS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buddy_pairs (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id uuid REFERENCES profiles(id),
  receiver_id  uuid REFERENCES profiles(id),
  type         text,           -- 'gepensioneerd' | 'werkend' | etc.
  status       text DEFAULT 'active' CHECK (status IN ('active','ended','pending')),
  reveal_after timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 10. CONVERSATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id      uuid REFERENCES matches(id),
  buddy_pair_id uuid REFERENCES buddy_pairs(id),  -- chat.html line 800
  created_at    timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 11. MESSAGES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid REFERENCES profiles(id),
  content         text,
  read            boolean DEFAULT false,
  type            text DEFAULT 'text',  -- 'text' | 'zelfreflectie' | 'meeting_invite' | 'renewal'
  metadata        jsonb,
  created_at      timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 12. NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text,   -- 'new_match' | 'buddy_accepted' | 'meeting_accepted' | 'school_referral' | ...
  ref_id     uuid,
  ref_type   text,   -- 'match' | 'buddy' | 'meeting' | ...
  message    text,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 13. BUDDY REQUESTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buddy_requests (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id uuid REFERENCES profiles(id),
  receiver_id  uuid REFERENCES profiles(id),
  type         text,
  message      text,
  status       text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at   timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 14. BUDDY QUEUE  (matching queue for unmatched buddy seekers)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buddy_queue (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid REFERENCES profiles(id),
  type       text,
  context    jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, type)
);

-- ────────────────────────────────────────────────────────────
-- 15. MEETINGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id  uuid REFERENCES profiles(id),
  attendee_id   uuid REFERENCES profiles(id),
  match_id      uuid REFERENCES matches(id),
  type          text,     -- 'evaluatie' | 'driegesprek' | 'afspraak'
  subject       text,
  proposed_date date,
  time_start    time,
  time_end      time,
  status        text DEFAULT 'openstaand',
  -- status values: 'openstaand' | 'bevestigd' | 'afgewezen' | 'geannuleerd'
  --               | 'student_getekend' | 'bedrijf_getekend' | 'voltooid'
  created_at    timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 16. AVAILABILITY  (calendar availability grid)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week int  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hour_start  int  NOT NULL CHECK (hour_start  BETWEEN 0 AND 23),
  status      text NOT NULL CHECK (status IN ('beschikbaar','voorkeur','bezet')),
  UNIQUE (user_id, day_of_week, hour_start)
);

-- ────────────────────────────────────────────────────────────
-- 17. REVIEWS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id uuid REFERENCES profiles(id),
  reviewee_id uuid REFERENCES profiles(id),
  rating      int  CHECK (rating BETWEEN 1 AND 5),
  body        text,
  flagged     boolean DEFAULT false,
  flag_reason text,
  flagged_by  uuid REFERENCES profiles(id),
  flagged_at  timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 18. WAITLIST
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          text UNIQUE NOT NULL,
  naam           text,
  rol            text,
  type           text,             -- 'buddy_gepensioneerd' | general signups
  buddy_type     text,
  sector         text,
  expertise_tags jsonb,
  available_days jsonb,
  anonymous      boolean DEFAULT true,
  paused         boolean DEFAULT false,
  source         text,             -- page pathname where signup occurred
  created_at     timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 19. STAGE PLANS  (1 per match)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stage_plans (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id          uuid UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  stageopdracht     text,
  hoofdvraag        text,
  onderzoekstype    text,
  context           text,
  methode           text,
  methodeomschrijving text,
  resultaattype     text,
  doelgroep         text,
  deelvragen        jsonb,  -- [{"id":1,"tekst":"..."}]
  schoolnoot        text,
  school_invited    boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 20. STAGE LEERDOELEN  (learning goals per match)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stage_leerdoelen (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  title      text,
  progress   int DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  notes      text,
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 21. STAGE DEADLINES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stage_deadlines (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  title      text,
  date       date,
  type       text,   -- 'deadline' | 'milestone' | 'afspraak'
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 22. STAGE TASKS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stage_tasks (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  title      text,
  "desc"     text,
  deadline   date,
  status     text DEFAULT 'todo' CHECK (status IN ('todo','in-progress','done')),
  assignee   text,
  maker      text,
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 23. STAGE REFLECTIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stage_reflecties (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  period      text,
  date        date,
  "text"      text,
  author_role text CHECK (author_role IN ('student','bedrijf','school')),
  created_at  timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 24. STAGE LOG  (activity log per match)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stage_log (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  msg        text,
  "time"     text,
  color      text CHECK (color IN ('green','blue','orange','red')),
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 25. COMPANY DOORSTROOM  (hiring-to-employment conversion rate)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_doorstroom (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  doorstroom_pct numeric(5,2) DEFAULT 0,
  updated_at     timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 26. PUSH SUBSCRIPTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   text UNIQUE NOT NULL,
  p256dh     text,
  auth       text,
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 27. SCHOOL POSTINGS  (school-placed internship calls)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_postings (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by   uuid REFERENCES profiles(id),
  school_name  text,
  sector       text,
  title        text,
  description  text,
  tags         jsonb,
  match_target text,   -- 'bedrijf' | 'student'
  status       text DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- ADD MISSING COLUMNS  (safe on existing tables)
-- ============================================================

-- applications — posting_id / profile_id for internship_postings source
ALTER TABLE applications ADD COLUMN IF NOT EXISTS profile_id  uuid REFERENCES profiles(id);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS posting_id  uuid REFERENCES internship_postings(id);

-- conversations — buddy_pair_id for buddy chat
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS buddy_pair_id uuid REFERENCES buddy_pairs(id);

-- matches — all extended BBL + posting columns
ALTER TABLE matches ADD COLUMN IF NOT EXISTS type                          text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS initiated_by                  uuid REFERENCES profiles(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_target                  text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS posting_id                    uuid REFERENCES internship_postings(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS renewal_status                jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS praktijkbegeleider_profile_id uuid REFERENCES profiles(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS contract_start                date;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS contract_end_date             date;  -- bbl-hub + bbl-dashboard use this name

-- student_profiles — BBL-specific columns (bbl-profile.html upsert payload)
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS naam             text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS school           text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS schooldag        text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS postcode         text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS opdracht_domein  text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS motivatie        text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS pb_naam          text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS contract_start   date;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS contract_end     date;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS jaar             int;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS skills_progress  jsonb;  -- bbl-hub voortgangsview
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS skills_toelichting jsonb; -- bbl-hub leerdoel toelichtingen

-- internship_postings — BBL-specific posting fields
ALTER TABLE internship_postings ADD COLUMN IF NOT EXISTS hours_per_week int;
ALTER TABLE internship_postings ADD COLUMN IF NOT EXISTS bbl_mode       boolean DEFAULT false;
ALTER TABLE internship_postings ADD COLUMN IF NOT EXISTS contract_start date;
ALTER TABLE internship_postings ADD COLUMN IF NOT EXISTS contract_end   date;

-- waitlist — BBL buddy columns added later
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS buddy_type     text;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS expertise_tags jsonb;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS available_days jsonb;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS anonymous      boolean DEFAULT true;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS paused         boolean DEFAULT false;

-- reviews — moderation columns
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flagged     boolean DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flagged_by  uuid REFERENCES profiles(id);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flagged_at  timestamptz;

-- stage_plans — school invite flag
ALTER TABLE stage_plans ADD COLUMN IF NOT EXISTS school_invited boolean DEFAULT false;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_postings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_pairs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_queue          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_leerdoelen     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_deadlines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_reflecties     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_doorstroom   ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_postings      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_select_all"  ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;

CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);  -- public read (names/roles shown to matches)

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ── student_profiles ─────────────────────────────────────────
DROP POLICY IF EXISTS "sp_select_all"   ON student_profiles;
DROP POLICY IF EXISTS "sp_insert_own"   ON student_profiles;
DROP POLICY IF EXISTS "sp_update_own"   ON student_profiles;

CREATE POLICY "sp_select_all" ON student_profiles
  FOR SELECT USING (true);

CREATE POLICY "sp_insert_own" ON student_profiles
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "sp_update_own" ON student_profiles
  FOR UPDATE USING (profile_id = auth.uid());

-- ── company_profiles ─────────────────────────────────────────
DROP POLICY IF EXISTS "cp_select_all"   ON company_profiles;
DROP POLICY IF EXISTS "cp_insert_own"   ON company_profiles;
DROP POLICY IF EXISTS "cp_update_own"   ON company_profiles;

CREATE POLICY "cp_select_all" ON company_profiles
  FOR SELECT USING (true);

CREATE POLICY "cp_insert_own" ON company_profiles
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "cp_update_own" ON company_profiles
  FOR UPDATE USING (profile_id = auth.uid());

-- ── school_profiles ──────────────────────────────────────────
DROP POLICY IF EXISTS "school_p_select_all"   ON school_profiles;
DROP POLICY IF EXISTS "school_p_insert_own"   ON school_profiles;
DROP POLICY IF EXISTS "school_p_update_own"   ON school_profiles;

CREATE POLICY "school_p_select_all" ON school_profiles
  FOR SELECT USING (true);

CREATE POLICY "school_p_insert_own" ON school_profiles
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "school_p_update_own" ON school_profiles
  FOR UPDATE USING (profile_id = auth.uid());

-- ── internships ──────────────────────────────────────────────
DROP POLICY IF EXISTS "internships_select_all" ON internships;

CREATE POLICY "internships_select_all" ON internships
  FOR SELECT USING (true);  -- public browse

-- ── internship_postings ──────────────────────────────────────
DROP POLICY IF EXISTS "ip_select_active"  ON internship_postings;
DROP POLICY IF EXISTS "ip_insert_own"     ON internship_postings;
DROP POLICY IF EXISTS "ip_update_own"     ON internship_postings;
DROP POLICY IF EXISTS "ip_delete_own"     ON internship_postings;

CREATE POLICY "ip_select_active" ON internship_postings
  FOR SELECT USING (status = 'active' OR created_by = auth.uid());

CREATE POLICY "ip_insert_own" ON internship_postings
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "ip_update_own" ON internship_postings
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "ip_delete_own" ON internship_postings
  FOR DELETE USING (created_by = auth.uid());

-- ── matches ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "matches_select_party"    ON matches;
DROP POLICY IF EXISTS "matches_insert_auth"     ON matches;
DROP POLICY IF EXISTS "matches_update_party"    ON matches;

CREATE POLICY "matches_select_party" ON matches
  FOR SELECT USING (
    party_a = auth.uid() OR
    party_b = auth.uid() OR
    initiated_by = auth.uid() OR
    praktijkbegeleider_profile_id = auth.uid()
  );

CREATE POLICY "matches_insert_auth" ON matches
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "matches_update_party" ON matches
  FOR UPDATE USING (party_a = auth.uid() OR party_b = auth.uid());

-- ── applications ─────────────────────────────────────────────
DROP POLICY IF EXISTS "app_select_own"   ON applications;
DROP POLICY IF EXISTS "app_insert_own"   ON applications;
DROP POLICY IF EXISTS "app_update_own"   ON applications;

CREATE POLICY "app_select_own" ON applications
  FOR SELECT USING (
    student_id = auth.uid() OR
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM internship_postings ip
      WHERE ip.id = applications.posting_id
        AND ip.created_by = auth.uid()
    )
  );

CREATE POLICY "app_insert_own" ON applications
  FOR INSERT WITH CHECK (
    student_id = auth.uid() OR profile_id = auth.uid()
  );

CREATE POLICY "app_update_own" ON applications
  FOR UPDATE USING (
    student_id = auth.uid() OR profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM internship_postings ip
      WHERE ip.id = applications.posting_id
        AND ip.created_by = auth.uid()
    )
  );

-- ── conversations ────────────────────────────────────────────
DROP POLICY IF EXISTS "conv_select_party"  ON conversations;
DROP POLICY IF EXISTS "conv_insert_auth"   ON conversations;

CREATE POLICY "conv_select_party" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = conversations.match_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM buddy_pairs bp
      WHERE bp.id = conversations.buddy_pair_id
        AND (bp.requester_id = auth.uid() OR bp.receiver_id = auth.uid())
    )
  );

CREATE POLICY "conv_insert_auth" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── messages ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "msg_select_party"  ON messages;
DROP POLICY IF EXISTS "msg_insert_own"    ON messages;
DROP POLICY IF EXISTS "msg_update_read"   ON messages;

CREATE POLICY "msg_select_party" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN buddy_pairs bp ON bp.id = c.buddy_pair_id
      WHERE c.id = messages.conversation_id
        AND (bp.requester_id = auth.uid() OR bp.receiver_id = auth.uid())
    )
  );

CREATE POLICY "msg_insert_own" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "msg_update_read" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid())
    )
  );

-- ── notifications ────────────────────────────────────────────
DROP POLICY IF EXISTS "notif_select_own"   ON notifications;
DROP POLICY IF EXISTS "notif_insert_auth"  ON notifications;
DROP POLICY IF EXISTS "notif_update_own"   ON notifications;

CREATE POLICY "notif_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notif_insert_auth" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ── buddy_pairs ──────────────────────────────────────────────
DROP POLICY IF EXISTS "bp_select_party"   ON buddy_pairs;
DROP POLICY IF EXISTS "bp_insert_auth"    ON buddy_pairs;
DROP POLICY IF EXISTS "bp_update_party"   ON buddy_pairs;

CREATE POLICY "bp_select_party" ON buddy_pairs
  FOR SELECT USING (requester_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "bp_insert_auth" ON buddy_pairs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bp_update_party" ON buddy_pairs
  FOR UPDATE USING (requester_id = auth.uid() OR receiver_id = auth.uid());

-- ── buddy_requests ───────────────────────────────────────────
DROP POLICY IF EXISTS "breq_select_party"   ON buddy_requests;
DROP POLICY IF EXISTS "breq_insert_own"     ON buddy_requests;
DROP POLICY IF EXISTS "breq_update_receiver" ON buddy_requests;

CREATE POLICY "breq_select_party" ON buddy_requests
  FOR SELECT USING (requester_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "breq_insert_own" ON buddy_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "breq_update_receiver" ON buddy_requests
  FOR UPDATE USING (receiver_id = auth.uid());

-- ── buddy_queue ──────────────────────────────────────────────
DROP POLICY IF EXISTS "bq_own" ON buddy_queue;

CREATE POLICY "bq_own" ON buddy_queue
  FOR ALL USING (user_id = auth.uid());

-- ── meetings ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "meet_select_party"  ON meetings;
DROP POLICY IF EXISTS "meet_insert_auth"   ON meetings;
DROP POLICY IF EXISTS "meet_update_party"  ON meetings;

CREATE POLICY "meet_select_party" ON meetings
  FOR SELECT USING (organizer_id = auth.uid() OR attendee_id = auth.uid());

CREATE POLICY "meet_insert_auth" ON meetings
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "meet_update_party" ON meetings
  FOR UPDATE USING (organizer_id = auth.uid() OR attendee_id = auth.uid());

-- ── availability ─────────────────────────────────────────────
DROP POLICY IF EXISTS "avail_select_all"  ON availability;
DROP POLICY IF EXISTS "avail_write_own"   ON availability;
DROP POLICY IF EXISTS "avail_delete_own"  ON availability;

CREATE POLICY "avail_select_all" ON availability
  FOR SELECT USING (true);  -- calendar.js loads other user's slots too

CREATE POLICY "avail_write_own" ON availability
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "avail_delete_own" ON availability
  FOR DELETE USING (user_id = auth.uid());

-- ── reviews ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "rev_select_public"   ON reviews;
DROP POLICY IF EXISTS "rev_insert_own"      ON reviews;
DROP POLICY IF EXISTS "rev_update_reviewer" ON reviews;
DROP POLICY IF EXISTS "rev_delete_admin"    ON reviews;

CREATE POLICY "rev_select_public" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "rev_insert_own" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "rev_update_reviewer" ON reviews
  FOR UPDATE USING (
    reviewer_id = auth.uid() OR
    reviewee_id = auth.uid()  -- for flagging by reviewee
  );

CREATE POLICY "rev_delete_admin" ON reviews
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email = 'hallo@internly.pro')
  );

-- ── waitlist ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "wl_insert_public"  ON waitlist;
DROP POLICY IF EXISTS "wl_select_own"     ON waitlist;
DROP POLICY IF EXISTS "wl_update_own"     ON waitlist;
DROP POLICY IF EXISTS "wl_admin_all"      ON waitlist;

CREATE POLICY "wl_insert_public" ON waitlist
  FOR INSERT WITH CHECK (true);  -- public signup

CREATE POLICY "wl_select_own" ON waitlist
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email = 'hallo@internly.pro')
  );

CREATE POLICY "wl_update_own" ON waitlist
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "wl_admin_all" ON waitlist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email = 'hallo@internly.pro')
  );

-- ── stage_plans ──────────────────────────────────────────────
DROP POLICY IF EXISTS "splan_select_match"   ON stage_plans;
DROP POLICY IF EXISTS "splan_write_match"    ON stage_plans;

CREATE POLICY "splan_select_match" ON stage_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_plans.match_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid() OR m.praktijkbegeleider_profile_id = auth.uid())
    )
  );

CREATE POLICY "splan_write_match" ON stage_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_plans.match_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid())
    )
  );

-- ── stage_leerdoelen ─────────────────────────────────────────
DROP POLICY IF EXISTS "sleer_match_party" ON stage_leerdoelen;

CREATE POLICY "sleer_match_party" ON stage_leerdoelen
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_leerdoelen.match_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid() OR m.praktijkbegeleider_profile_id = auth.uid())
    )
  );

-- ── stage_deadlines ──────────────────────────────────────────
DROP POLICY IF EXISTS "sdead_match_party" ON stage_deadlines;

CREATE POLICY "sdead_match_party" ON stage_deadlines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_deadlines.match_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid() OR m.praktijkbegeleider_profile_id = auth.uid())
    )
  );

-- ── stage_tasks ──────────────────────────────────────────────
DROP POLICY IF EXISTS "stask_match_party" ON stage_tasks;

CREATE POLICY "stask_match_party" ON stage_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_tasks.match_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid() OR m.praktijkbegeleider_profile_id = auth.uid())
    )
  );

-- ── stage_reflecties ─────────────────────────────────────────
DROP POLICY IF EXISTS "srefl_match_party" ON stage_reflecties;

CREATE POLICY "srefl_match_party" ON stage_reflecties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_reflecties.match_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid() OR m.praktijkbegeleider_profile_id = auth.uid())
    )
  );

-- ── stage_log ────────────────────────────────────────────────
DROP POLICY IF EXISTS "slog_match_party" ON stage_log;

CREATE POLICY "slog_match_party" ON stage_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_log.match_id
        AND (m.party_a = auth.uid() OR m.party_b = auth.uid() OR m.praktijkbegeleider_profile_id = auth.uid())
    )
  );

-- ── company_doorstroom ───────────────────────────────────────
DROP POLICY IF EXISTS "cdoor_select_all"  ON company_doorstroom;
DROP POLICY IF EXISTS "cdoor_write_own"   ON company_doorstroom;

CREATE POLICY "cdoor_select_all" ON company_doorstroom
  FOR SELECT USING (true);

CREATE POLICY "cdoor_write_own" ON company_doorstroom
  FOR ALL USING (company_id = auth.uid());

-- ── push_subscriptions ───────────────────────────────────────
DROP POLICY IF EXISTS "push_own" ON push_subscriptions;

CREATE POLICY "push_own" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- ── school_postings ──────────────────────────────────────────
DROP POLICY IF EXISTS "sp2_select_active"  ON school_postings;
DROP POLICY IF EXISTS "sp2_write_own"      ON school_postings;

CREATE POLICY "sp2_select_active" ON school_postings
  FOR SELECT USING (status = 'active' OR created_by = auth.uid());

CREATE POLICY "sp2_write_own" ON school_postings
  FOR ALL USING (created_by = auth.uid());

-- ============================================================
-- INDEXES  (performance for common query patterns)
-- ============================================================

-- matches — most queried table
CREATE INDEX IF NOT EXISTS idx_matches_party_a     ON matches(party_a);
CREATE INDEX IF NOT EXISTS idx_matches_party_b     ON matches(party_b);
CREATE INDEX IF NOT EXISTS idx_matches_status      ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_posting_id  ON matches(posting_id);

-- conversations
CREATE INDEX IF NOT EXISTS idx_conversations_match_id     ON conversations(match_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buddy_pair   ON conversations(buddy_pair_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_conv_id    ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created    ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread     ON messages(conversation_id, read) WHERE read = false;

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- applications
CREATE INDEX IF NOT EXISTS idx_applications_profile_id  ON applications(profile_id);
CREATE INDEX IF NOT EXISTS idx_applications_posting_id  ON applications(posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id  ON applications(student_id);

-- stage hub tables
CREATE INDEX IF NOT EXISTS idx_stage_plans_match      ON stage_plans(match_id);
CREATE INDEX IF NOT EXISTS idx_stage_leerdoelen_match ON stage_leerdoelen(match_id);
CREATE INDEX IF NOT EXISTS idx_stage_deadlines_match  ON stage_deadlines(match_id);
CREATE INDEX IF NOT EXISTS idx_stage_tasks_match      ON stage_tasks(match_id);
CREATE INDEX IF NOT EXISTS idx_stage_reflecties_match ON stage_reflecties(match_id);
CREATE INDEX IF NOT EXISTS idx_stage_log_match        ON stage_log(match_id);

-- buddy
CREATE INDEX IF NOT EXISTS idx_buddy_pairs_users    ON buddy_pairs(requester_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_buddy_requests_recv  ON buddy_requests(receiver_id);

-- meetings
CREATE INDEX IF NOT EXISTS idx_meetings_organizer  ON meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_attendee   ON meetings(attendee_id);
CREATE INDEX IF NOT EXISTS idx_meetings_match      ON meetings(match_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date       ON meetings(proposed_date);

-- availability
CREATE INDEX IF NOT EXISTS idx_availability_user ON availability(user_id);

-- internship_postings
CREATE INDEX IF NOT EXISTS idx_ip_status      ON internship_postings(status);
CREATE INDEX IF NOT EXISTS idx_ip_created_by  ON internship_postings(created_by);

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_flagged  ON reviews(flagged) WHERE flagged = true;

-- ============================================================
-- REALTIME  (enable for live-updating pages)
-- ============================================================
-- Run these in Supabase Dashboard > Database > Replication
-- or uncomment if your Supabase version supports it via SQL:

-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE matches;
-- ALTER PUBLICATION supabase_realtime ADD TABLE buddy_pairs;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. roc_profile_id on matches: the BBL driegesprek feature references
--    a ROC/school contact on a match. Add this column when you are ready
--    to build that flow:
--      ALTER TABLE matches ADD COLUMN IF NOT EXISTS roc_profile_id uuid REFERENCES profiles(id);
--
-- 2. applications deduplication: the code guards against duplicates via
--    .maybeSingle() checks, but you can add a DB-level unique constraint:
--      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_profile_posting
--        ON applications(profile_id, posting_id) WHERE profile_id IS NOT NULL;
--      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_student_internship
--        ON applications(student_id, internship_id) WHERE student_id IS NOT NULL;
--
-- 3. Admin access: admin.html gates on email = 'hallo@internly.pro'.
--    The RLS policies for reviews and waitlist use the same check.
--    This means the admin user must have a row in profiles with that email.
