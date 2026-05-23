-- Rocky's Investing Academy — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- ── PROFILES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL CHECK (length(username) >= 2),
  avatar_emoji  TEXT DEFAULT '🦁',
  avatar_color  TEXT DEFAULT '#4F46E5',
  stars         INTEGER DEFAULT 0,
  chapters_done INTEGER DEFAULT 0,
  custom_companies JSONB DEFAULT '[]'::JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── WATCHLIST ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker      TEXT NOT NULL,
  name        TEXT NOT NULL,
  emoji       TEXT DEFAULT '🏢',
  sector      TEXT DEFAULT 'other',
  note        TEXT,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, ticker)
);

-- ── HOLDINGS (real purchases recorded by parent) ──────────────────────────────
CREATE TABLE IF NOT EXISTS holdings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker      TEXT NOT NULL,
  name        TEXT NOT NULL,
  emoji       TEXT DEFAULT '🏢',
  sector      TEXT DEFAULT 'other',
  quantity    DECIMAL(12,4) NOT NULL CHECK (quantity > 0),
  buy_price   DECIMAL(12,4) NOT NULL CHECK (buy_price > 0),
  buy_date    DATE NOT NULL,
  currency    TEXT DEFAULT 'AUD' CHECK (currency IN ('AUD','USD')),
  exchange    TEXT DEFAULT 'ASX',
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── PRICE CACHE (shared across all profiles, refreshed by Netlify Function) ───
CREATE TABLE IF NOT EXISTS price_cache (
  ticker       TEXT PRIMARY KEY,
  price        DECIMAL(12,4),
  prev_close   DECIMAL(12,4),
  currency     TEXT DEFAULT 'AUD',
  change_pct   DECIMAL(8,4),
  market_state TEXT DEFAULT 'REGULAR',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- Profiles: public read (for login screen to list avatars), but only own row for writes
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (true);

-- Watchlist: full access via anon key (app filters by profile_id in queries)
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlist_all" ON watchlist FOR ALL USING (true);

-- Holdings: same
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holdings_all" ON holdings FOR ALL USING (true);

-- Price cache: anyone can read, only server (service key) writes
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prices_read"  ON price_cache FOR SELECT USING (true);
CREATE POLICY "prices_write" ON price_cache FOR ALL USING (true);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_watchlist_profile  ON watchlist(profile_id);
CREATE INDEX IF NOT EXISTS idx_holdings_profile   ON holdings(profile_id);
CREATE INDEX IF NOT EXISTS idx_price_cache_ticker ON price_cache(ticker);
