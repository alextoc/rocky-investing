// Fetches live prices from Yahoo Finance for a comma-separated list of tickers.
// Uses Supabase price_cache table to avoid hammering Yahoo (30-min TTL).
import { createClient } from '@supabase/supabase-js';

const CACHE_TTL_MINS = 30;

function supabaseClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

async function fetchFromYahoo(tickers) {
  const results = {};
  // Yahoo Finance bulk quote endpoint
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}&fields=regularMarketPrice,previousClose,currency,marketState`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const data = await res.json();
  for (const q of (data?.quoteResponse?.result ?? [])) {
    results[q.symbol] = {
      ticker:       q.symbol,
      price:        q.regularMarketPrice,
      prev_close:   q.regularMarketPreviousClose,
      currency:     q.currency ?? 'USD',
      change_pct:   q.regularMarketPreviousClose
        ? ((q.regularMarketPrice - q.regularMarketPreviousClose) / q.regularMarketPreviousClose * 100)
        : 0,
      market_state: q.marketState ?? 'REGULAR',
      updated_at:   new Date().toISOString(),
    };
  }
  return results;
}

export async function handler(event) {
  const raw = event.queryStringParameters?.tickers ?? '';
  const requested = raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  if (!requested.length) return { statusCode: 400, body: 'No tickers' };

  const sb = supabaseClient();
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - CACHE_TTL_MINS * 60 * 1000).toISOString();

  // Check cache
  const { data: cached } = await sb
    .from('price_cache')
    .select('*')
    .in('ticker', requested);

  const result = {};
  const stale = [];

  for (const ticker of requested) {
    const hit = cached?.find(r => r.ticker === ticker);
    if (hit && hit.updated_at > staleThreshold) {
      result[ticker] = hit;
    } else {
      stale.push(ticker);
    }
  }

  if (stale.length) {
    try {
      const fresh = await fetchFromYahoo(stale);
      // Upsert into cache
      const rows = Object.values(fresh);
      if (rows.length) {
        await sb.from('price_cache').upsert(rows, { onConflict: 'ticker' });
      }
      Object.assign(result, fresh);
    } catch (e) {
      console.error('Yahoo fetch error:', e.message);
      // Return whatever we have from cache, even if stale
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify(result),
  };
}
