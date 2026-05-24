-- Phase 2: Predictions game table
-- Run this in the Supabase SQL editor at: https://supabase.com/dashboard

CREATE TABLE IF NOT EXISTS predictions (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ticker              TEXT NOT NULL,
  name                TEXT,
  emoji               TEXT,
  direction           TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  price_at_prediction NUMERIC,
  week_start          DATE NOT NULL,       -- Monday's date (YYYY-MM-DD)
  resolved            BOOLEAN DEFAULT false,
  correct             BOOLEAN,
  stars_awarded       INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, ticker, week_start)  -- one prediction per stock per week
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Permissive policy (same pattern as other tables in this project)
CREATE POLICY "All predictions accessible" ON predictions
  FOR ALL USING (true);
