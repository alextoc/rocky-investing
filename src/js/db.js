import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── PROFILES ──────────────────────────────────────────────────────────────────
export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,avatar_emoji,avatar_color,stars,chapters_done')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getProfileByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.trim().toLowerCase())
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function createProfile({ username, avatarEmoji, avatarColor }) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ username: username.trim().toLowerCase(), avatar_emoji: avatarEmoji, avatar_color: avatarColor })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveProgress(profileId, { stars, chaptersDone, customCompanies }) {
  const { error } = await supabase
    .from('profiles')
    .update({ stars, chapters_done: chaptersDone, custom_companies: customCompanies, updated_at: new Date().toISOString() })
    .eq('id', profileId);
  if (error) throw error;
}

// ── WATCHLIST ─────────────────────────────────────────────────────────────────
export async function getWatchlist(profileId) {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('profile_id', profileId)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addToWatchlist(profileId, { ticker, name, emoji, sector }) {
  const { data, error } = await supabase
    .from('watchlist')
    .upsert({ profile_id: profileId, ticker, name, emoji, sector }, { onConflict: 'profile_id,ticker' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeFromWatchlist(profileId, ticker) {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('profile_id', profileId)
    .eq('ticker', ticker);
  if (error) throw error;
}

export async function isWatched(profileId, ticker) {
  const { count } = await supabase
    .from('watchlist')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('ticker', ticker);
  return (count ?? 0) > 0;
}

// ── HOLDINGS ──────────────────────────────────────────────────────────────────
export async function getHoldings(profileId) {
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('profile_id', profileId)
    .order('buy_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addHolding(profileId, holding) {
  const { data, error } = await supabase
    .from('holdings')
    .insert({ profile_id: profileId, ...holding })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHolding(holdingId) {
  const { error } = await supabase
    .from('holdings')
    .delete()
    .eq('id', holdingId);
  if (error) throw error;
}

// ── PRICE CACHE ───────────────────────────────────────────────────────────────
export async function getCachedPrices(tickers) {
  if (!tickers.length) return {};
  const { data } = await supabase
    .from('price_cache')
    .select('*')
    .in('ticker', tickers);
  const map = {};
  for (const row of (data ?? [])) map[row.ticker] = row;
  return map;
}
