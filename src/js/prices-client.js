// ── PRICES CLIENT ─────────────────────────────────────────────────────────────
// Fetches live prices from our Netlify Function, which proxies Yahoo Finance
// and caches results in Supabase for 30 minutes.

const LOCAL_CACHE = new Map(); // in-memory, cleared on page refresh
const CACHE_TTL = 5 * 60 * 1000; // 5 min in-browser cache

export async function fetchPrices(tickers) {
  if (!tickers.length) return {};

  // Separate tickers into fresh (cached recently) vs stale
  const now = Date.now();
  const fresh = {};
  const stale = [];
  for (const t of tickers) {
    const cached = LOCAL_CACHE.get(t);
    if (cached && now - cached.ts < CACHE_TTL) {
      fresh[t] = cached.data;
    } else {
      stale.push(t);
    }
  }

  if (!stale.length) return fresh;

  try {
    const res = await fetch(`/api/prices?tickers=${encodeURIComponent(stale.join(','))}`);
    if (!res.ok) throw new Error('Price fetch failed');
    const data = await res.json();
    for (const [ticker, info] of Object.entries(data)) {
      LOCAL_CACHE.set(ticker, { ts: now, data: info });
      fresh[ticker] = info;
    }
  } catch (e) {
    console.warn('Price fetch error:', e.message);
    // Return whatever we have from local cache even if stale
    for (const t of stale) {
      const cached = LOCAL_CACHE.get(t);
      if (cached) fresh[t] = cached.data;
    }
  }

  return fresh;
}

export function formatPrice(price, currency = 'AUD') {
  if (price == null) return '—';
  const sym = currency === 'USD' ? '$' : 'A$';
  return `${sym}${Number(price).toFixed(2)}`;
}

export function formatChangePct(pct) {
  if (pct == null) return '';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${Number(pct).toFixed(2)}%`;
}

export function priceClass(pct) {
  if (pct == null || Math.abs(pct) < 0.01) return 'flat';
  return pct > 0 ? 'up' : 'dn';
}
