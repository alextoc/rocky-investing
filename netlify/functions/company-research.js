// Uses Finnhub API for reliable market data.
// Requires FINNHUB_KEY environment variable (free at finnhub.io).
// Returns 5 kid-friendly data points: price, size, year perf, profitability, analyst sentiment.

function fmtCap(n) {
  if (n == null) return null;
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + ' Trillion';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(1)  + 'M';
  return '$' + n.toLocaleString();
}

function fmtPrice(n, cur) {
  if (n == null) return '?';
  const sym = cur === 'AUD' ? 'A$' : cur === 'GBP' ? '£' : '$';
  return sym + n.toFixed(2);
}

async function fhGet(path, key) {
  const res = await fetch(`https://finnhub.io/api/v1${path}&token=${key}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status} — ${path}`);
  return res.json();
}

function buildPoints(quote, profile, metrics, recs, cur) {
  const points = [];

  // ── 1. TODAY'S PRICE + DAY CHANGE ─────────────────────────────────────────
  const price    = quote?.c;
  const prevClose = quote?.pc;
  const chgPct   = (price != null && prevClose) ? ((price - prevClose) / prevClose * 100) : null;

  let priceGrade = 'info', priceRocky = 'Price data not available.';
  if (price != null && chgPct != null) {
    const arrow = chgPct >= 0 ? '▲' : '▼';
    const abs   = Math.abs(chgPct).toFixed(2);
    priceGrade  = Math.abs(chgPct) < 2 ? 'green' : Math.abs(chgPct) < 5 ? 'yellow' : 'red';
    priceRocky  = chgPct > 3
      ? `Up ${abs}% today — big move! Markets are very excited right now.`
      : chgPct > 0
      ? `Up ${abs}% today — a positive day! Small moves are totally normal.`
      : chgPct < -3
      ? `Down ${abs}% today — big drop! Could be news, or just normal market noise.`
      : `Down ${abs}% today — small dip. Happens all the time, don't panic!`;
    points.push({
      emoji: '📊', title: "Today's Price",
      detail: `${fmtPrice(price, cur)}  ${arrow} ${abs}% today`,
      rocky: priceRocky, grade: priceGrade,
    });
  } else if (price != null) {
    points.push({
      emoji: '📊', title: "Current Price",
      detail: fmtPrice(price, cur),
      rocky: 'Day change data not available right now.',
      grade: 'info',
    });
  } else {
    points.push({ emoji: '📊', title: "Today's Price", detail: 'Unavailable', rocky: 'Try searching the ticker on Google Finance.', grade: 'info' });
  }

  // ── 2. COMPANY SIZE (MARKET CAP) ──────────────────────────────────────────
  // Finnhub marketCapitalization is in millions USD
  const cap    = profile?.marketCapitalization ? profile.marketCapitalization * 1e6 : null;
  const sector = profile?.finnhubIndustry || '';
  let capGrade = 'info', capRocky = 'Market cap data not available.';
  if (cap > 1e12)      { capGrade = 'green';  capRocky = `Worth over a TRILLION dollars — one of the biggest companies on Earth! Very established and trusted worldwide.`; }
  else if (cap > 1e11) { capGrade = 'green';  capRocky = `Worth hundreds of billions — a giant company. Very well established with a strong track record.`; }
  else if (cap > 1e10) { capGrade = 'green';  capRocky = `Large, well-known company worth over $10 billion. Established and trusted by many investors.`; }
  else if (cap > 1e9)  { capGrade = 'yellow'; capRocky = `Medium-sized company worth $1–10 billion. More growth potential but also more risk than giants.`; }
  else if (cap)        { capGrade = 'red';    capRocky = `Smaller company. Higher risk — could grow fast OR struggle. Research extra carefully!`; }
  points.push({
    emoji: '🏰', title: 'Company Size',
    detail: cap ? `${fmtCap(cap)}${sector ? '  ·  ' + sector : ''}` : sector || 'Unavailable',
    rocky: capRocky, grade: capGrade,
  });

  // ── 3. LAST 12 MONTHS PERFORMANCE ────────────────────────────────────────
  // Finnhub returns 52WeekPriceReturnDaily as a percentage (e.g. 45.2 = +45.2%)
  const yrChgPct = metrics?.metric?.['52WeekPriceReturnDaily'];
  const yrHigh   = metrics?.metric?.['52WeekHigh'];
  const yrLow    = metrics?.metric?.['52WeekLow'];
  let perfGrade = 'info', perfRocky = 'Annual performance data not available.';
  if (yrChgPct != null) {
    const pct = yrChgPct.toFixed(1);
    if      (yrChgPct > 50) { perfGrade = 'green';  perfRocky = `Up ${pct}% over the last year — HUGE growth! The market has been very excited about this company. 🚀`; }
    else if (yrChgPct > 15) { perfGrade = 'green';  perfRocky = `Up ${pct}% over the last year — strong! Better than the average market return of ~10-15%.`; }
    else if (yrChgPct > 0)  { perfGrade = 'yellow'; perfRocky = `Up ${pct}% over the last year — slow but positive. About average or slightly below market.`; }
    else                     { perfGrade = 'red';    perfRocky = `Down ${Math.abs(pct)}% over the last year. The market hasn't been happy with this company. Be cautious!`; }
  }
  const rangeText = (yrHigh && yrLow) ? `  ·  Range: ${fmtPrice(yrLow, cur)} – ${fmtPrice(yrHigh, cur)}` : '';
  points.push({
    emoji: '📈', title: 'Last 12 Months',
    detail: yrChgPct != null ? `${yrChgPct >= 0 ? '+' : ''}${yrChgPct.toFixed(1)}%${rangeText}` : 'Annual data unavailable',
    rocky: perfRocky, grade: perfGrade,
  });

  // ── 4. PROFITABILITY (P/E RATIO + EPS) ───────────────────────────────────
  const pe  = metrics?.metric?.peTTM  ?? metrics?.metric?.peAnnual;
  const eps = metrics?.metric?.epsTTM ?? metrics?.metric?.epsAnnual;
  let monGrade = 'info', monRocky = 'Profitability data not available.';
  if (pe != null && pe > 0) {
    if      (pe < 15) { monGrade = 'green';  monRocky = `P/E of ${pe.toFixed(0)} — looks like a bargain! You're paying $${pe.toFixed(0)} for every $1 of annual profit. Cheap!`; }
    else if (pe < 25) { monGrade = 'green';  monRocky = `P/E of ${pe.toFixed(0)} — fair price. Not too cheap, not too expensive. A reasonable deal.`; }
    else if (pe < 50) { monGrade = 'yellow'; monRocky = `P/E of ${pe.toFixed(0)} — a bit pricey. Investors expect big future growth to justify this price!`; }
    else              { monGrade = 'yellow'; monRocky = `Very high P/E of ${pe.toFixed(0)} — investors are betting heavily on future growth. Risky if growth disappoints!`; }
  } else if (pe != null && pe <= 0) {
    monGrade = 'red'; monRocky = `Negative P/E — currently losing money. The company is spending more than it earns. Very risky!`;
  } else if (eps != null) {
    monGrade = eps > 0 ? 'yellow' : 'red';
    monRocky = eps > 0
      ? `Earning ${fmtPrice(eps, cur)} per share but P/E not available. May be growing but not yet fully valued.`
      : `Losing money — negative earnings per share. High risk investment right now.`;
  }
  const epsText = eps != null ? `  ·  Earns ${fmtPrice(Math.abs(eps), cur)}/share` : '';
  points.push({
    emoji: '💰', title: 'Is It Profitable?',
    detail: pe != null ? `P/E Ratio: ${pe > 0 ? pe.toFixed(1) : 'Negative'}${epsText}` : (eps != null ? `EPS: ${fmtPrice(eps, cur)}/share` : 'No profitability data'),
    rocky: monRocky, grade: monGrade,
  });

  // ── 5. ANALYST SENTIMENT ─────────────────────────────────────────────────
  // recs is an array sorted newest-first; each entry has strongBuy/buy/hold/sell/strongSell counts
  const rec   = Array.isArray(recs) && recs.length ? recs[0] : null;
  let expGrade = 'info', expRocky = 'No analyst ratings available for this company.';
  let recLabel = 'No rating', numAna = 0;

  if (rec) {
    const sb = rec.strongBuy   || 0;
    const b  = rec.buy         || 0;
    const h  = rec.hold        || 0;
    const s  = rec.sell        || 0;
    const ss = rec.strongSell  || 0;
    numAna   = sb + b + h + s + ss;
    // Weighted mean: strongBuy=1 … strongSell=5 (same scale as Yahoo recommendationMean)
    const score = numAna > 0 ? (sb*1 + b*2 + h*3 + s*4 + ss*5) / numAna : 3;
    if      (score <= 1.5) { expGrade = 'green';  recLabel = 'Strong Buy';   expRocky = `${numAna} professional analysts gave this a STRONG BUY! Wall Street is very excited! 🚀`; }
    else if (score <= 2.5) { expGrade = 'green';  recLabel = 'Buy';          expRocky = `Analysts say BUY. Professional investors are positive — they think the stock will rise.`; }
    else if (score <= 3.5) { expGrade = 'yellow'; recLabel = 'Hold';         expRocky = `Analysts say HOLD — it's okay but they're not excited. Good time to watch and wait.`; }
    else if (score <= 4.5) { expGrade = 'red';    recLabel = 'Underperform'; expRocky = `Analysts are cautious — they think other stocks might do better. A warning sign!`; }
    else                   { expGrade = 'red';    recLabel = 'Sell';         expRocky = `Analysts say SELL. Experts have serious concerns about this company right now.`; }
  }

  const anaText = numAna > 0 ? `${recLabel}  ·  ${numAna} analysts` : recLabel;
  points.push({
    emoji: '🎯', title: 'What Experts Think',
    detail: rec ? anaText : 'No analyst data',
    rocky: expRocky, grade: expGrade,
  });

  return points;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  const key = process.env.FINNHUB_KEY;
  if (!key) {
    console.error('FINNHUB_KEY env var not set');
    return { statusCode: 200, body: JSON.stringify({ fallback: true }) };
  }

  let ticker, name;
  try { ({ ticker, name } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) }; }

  if (!ticker) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

  try {
    const sym = encodeURIComponent(ticker);

    // All 4 requests run in parallel — fast!
    const [quote, profile, metrics, recs] = await Promise.all([
      fhGet(`/quote?symbol=${sym}`, key),
      fhGet(`/stock/profile2?symbol=${sym}`, key),
      fhGet(`/stock/metric?symbol=${sym}&metric=all`, key),
      fhGet(`/stock/recommendation?symbol=${sym}`, key).catch(() => []),
    ]);

    // No price data = invalid ticker
    if (!quote?.c) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

    const cur         = profile?.currency || 'USD';
    const companyName = profile?.name || name || ticker;
    const points      = buildPoints(quote, profile, metrics, recs, cur);
    const greenCount  = points.filter(p => p.grade === 'green').length;
    const bio         = profile?.description || '';
    const description = bio.length > 300 ? bio.slice(0, 300).replace(/\s\S*$/, '') + '…' : bio;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
      body: JSON.stringify({
        companyName, ticker,
        description,
        sector:   profile?.finnhubIndustry,
        industry: profile?.finnhubIndustry,
        points, greenCount,
      }),
    };
  } catch (e) {
    console.error('company-research error:', e.message);
    return { statusCode: 200, body: JSON.stringify({ fallback: true }) };
  }
}
