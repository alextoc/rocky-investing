// Uses Yahoo Finance /v7/finance/quote — same reliable endpoint as prices.js.
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

function buildPoints(q) {
  const points = [];

  // ── 1. TODAY'S PRICE + DAY CHANGE ─────────────────────────────────────────
  const price  = q.regularMarketPrice;
  const chgPct = q.regularMarketChangePercent;
  const cur    = q.currency;
  let priceGrade = 'info';
  let priceRocky = 'Price data not available.';
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
  const cap    = q.marketCap;
  const sector = q.sector || '';
  let capGrade = 'info', capRocky = 'Market cap data not available.';
  if (cap > 1e12)  { capGrade = 'green';  capRocky = `Worth over a TRILLION dollars — one of the biggest companies on Earth! Very established and trusted worldwide.`; }
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
  const yrChg  = q.fiftyTwoWeekChange;
  const yrHigh = q.fiftyTwoWeekHigh;
  const yrLow  = q.fiftyTwoWeekLow;
  let perfGrade = 'info', perfRocky = 'Annual performance data not available.';
  if (yrChg != null) {
    const pct = (yrChg * 100).toFixed(1);
    if      (yrChg > 0.5)  { perfGrade = 'green';  perfRocky = `Up ${pct}% over the last year — HUGE growth! The market has been very excited about this company. 🚀`; }
    else if (yrChg > 0.15) { perfGrade = 'green';  perfRocky = `Up ${pct}% over the last year — strong! Better than the average market return of ~10-15%.`; }
    else if (yrChg > 0)    { perfGrade = 'yellow'; perfRocky = `Up ${pct}% over the last year — slow but positive. About average or slightly below market.`; }
    else                   { perfGrade = 'red';    perfRocky = `Down ${Math.abs(pct)}% over the last year. The market hasn't been happy with this company. Be cautious!`; }
  }
  const rangeText = (yrHigh && yrLow)
    ? `  ·  Range: ${fmtPrice(yrLow, cur)} – ${fmtPrice(yrHigh, cur)}`
    : '';
  points.push({
    emoji: '📈', title: 'Last 12 Months',
    detail: yrChg != null
      ? `${yrChg >= 0 ? '+' : ''}${(yrChg * 100).toFixed(1)}%${rangeText}`
      : 'Annual data unavailable',
    rocky: perfRocky, grade: perfGrade,
  });

  // ── 4. PROFITABILITY (P/E RATIO + EPS) ───────────────────────────────────
  const pe  = q.trailingPE;
  const eps = q.epsTrailingTwelveMonths;
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
  const recMean = q.recommendationMean;
  const numAna  = q.numberOfAnalystOpinions;
  const recKey  = (q.averageAnalystRating || '').toLowerCase();
  let expGrade = 'info', expRocky = 'No analyst ratings available for this company.';
  let recLabel = 'No rating';

  if (recMean != null) {
    if      (recMean <= 1.5) { expGrade = 'green';  recLabel = 'Strong Buy';     expRocky = `${numAna || 'Multiple'} professional analysts gave this a STRONG BUY! Wall Street is very excited! 🚀`; }
    else if (recMean <= 2.5) { expGrade = 'green';  recLabel = 'Buy';            expRocky = `Analysts say BUY. Professional investors are positive — they think the stock will rise.`; }
    else if (recMean <= 3.5) { expGrade = 'yellow'; recLabel = 'Hold';           expRocky = `Analysts say HOLD — it's okay but they're not excited. Good time to watch and wait.`; }
    else if (recMean <= 4.5) { expGrade = 'red';    recLabel = 'Underperform';   expRocky = `Analysts are cautious — they think other stocks might do better. A warning sign!`; }
    else                     { expGrade = 'red';    recLabel = 'Sell';           expRocky = `Analysts say SELL. Experts have serious concerns about this company right now.`; }
  } else if (recKey.includes('buy')) {
    expGrade = 'green'; recLabel = 'Buy'; expRocky = 'Analysts are positive — they expect the stock to rise.';
  } else if (recKey.includes('hold')) {
    expGrade = 'yellow'; recLabel = 'Hold'; expRocky = 'Analysts say hold — not exciting, but not bad either.';
  } else if (recKey.includes('sell')) {
    expGrade = 'red'; recLabel = 'Sell'; expRocky = 'Analysts have concerns — they think the stock may fall.';
  }

  const anaText = numAna ? `${recLabel}  ·  ${numAna} analysts` : recLabel;
  points.push({
    emoji: '🎯', title: 'What Experts Think',
    detail: recMean != null || recKey ? anaText : 'No analyst data',
    rocky: expRocky, grade: expGrade,
  });

  return points;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  let ticker, name;
  try { ({ ticker, name } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) }; }

  if (!ticker) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

  const fields = [
    'regularMarketPrice', 'regularMarketChangePercent', 'regularMarketChange',
    'marketCap', 'trailingPE', 'epsTrailingTwelveMonths',
    'fiftyTwoWeekChange', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow',
    'shortName', 'longName', 'sector', 'industry', 'currency',
    'recommendationMean', 'numberOfAnalystOpinions', 'averageAnalystRating',
  ].join(',');

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}&fields=${fields}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

    const json = await res.json();
    const q    = json?.quoteResponse?.result?.[0];
    if (!q) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

    // Optional: grab company description from quoteSummary (don't fail if unavailable)
    let description = '';
    try {
      const sUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=assetProfile`;
      const sRes = await fetch(sUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (sRes.ok) {
        const sJson = await sRes.json();
        const bio   = sJson?.quoteSummary?.result?.[0]?.assetProfile?.longBusinessSummary || '';
        description = bio.length > 300 ? bio.slice(0, 300).replace(/\s\S*$/, '') + '…' : bio;
      }
    } catch { /* optional — skip silently */ }

    const companyName = q.longName || q.shortName || name || ticker;
    const points      = buildPoints(q);
    const greenCount  = points.filter(p => p.grade === 'green').length;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
      body: JSON.stringify({
        companyName, ticker: q.symbol || ticker,
        description, sector: q.sector, industry: q.industry,
        points, greenCount,
      }),
    };
  } catch (e) {
    console.error('company-research error:', e.message);
    return { statusCode: 200, body: JSON.stringify({ fallback: true }) };
  }
}
