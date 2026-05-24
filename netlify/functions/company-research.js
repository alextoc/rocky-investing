// Yahoo Finance with cookie+crumb auth — same technique used by yfinance Python library.
// Avoids the "Unauthorized" block by first getting a session cookie from Yahoo.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getYahooCookiesAndCrumb() {
  // Step 1: Hit Yahoo Finance to receive a session cookie (B cookie)
  const homeRes = await fetch('https://finance.yahoo.com/', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    redirect: 'follow',
  });

  // Collect all Set-Cookie values
  const rawCookie = homeRes.headers.get('set-cookie') || '';
  // Each cookie is separated by commas but paths also contain commas — split on "; " boundaries
  const cookies = rawCookie.split(/,(?=[^ ])/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');

  // Step 2: Get the crumb (a CSRF-like token Yahoo requires since 2023)
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, 'Cookie': cookies },
  });
  const crumb = (await crumbRes.text()).trim();

  return { cookies, crumb };
}

async function fetchYahooQuote(ticker, cookies, crumb) {
  const fields = [
    'regularMarketPrice', 'regularMarketChangePercent',
    'marketCap', 'trailingPE', 'epsTrailingTwelveMonths',
    'fiftyTwoWeekChange', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow',
    'shortName', 'longName', 'sector', 'currency',
    'recommendationMean', 'numberOfAnalystOpinions', 'averageAnalystRating',
  ].join(',');

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}&fields=${fields}&crumb=${encodeURIComponent(crumb)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Cookie': cookies } });
  if (!res.ok) throw new Error(`Yahoo v7 HTTP ${res.status}`);
  const json = await res.json();
  return json?.quoteResponse?.result?.[0] || null;
}

// ── FORMATTING ────────────────────────────────────────────────────────────────

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
  const cur = q.currency || 'USD';

  // ── 1. TODAY'S PRICE ─────────────────────────────────────────────────────
  const price  = q.regularMarketPrice;
  const chgPct = q.regularMarketChangePercent;
  if (price != null && chgPct != null) {
    const arrow = chgPct >= 0 ? '▲' : '▼';
    const abs   = Math.abs(chgPct).toFixed(2);
    const grade = Math.abs(chgPct) < 2 ? 'green' : Math.abs(chgPct) < 5 ? 'yellow' : 'red';
    const rocky = chgPct > 3  ? `Up ${abs}% today — big move! Markets are very excited right now.`
                : chgPct > 0  ? `Up ${abs}% today — a positive day! Small moves are totally normal.`
                : chgPct < -3 ? `Down ${abs}% today — big drop! Could be news, or just normal market noise.`
                :               `Down ${abs}% today — small dip. Happens all the time, don't panic!`;
    points.push({ emoji:'📊', title:"Today's Price", detail:`${fmtPrice(price, cur)}  ${arrow} ${abs}% today`, rocky, grade });
  } else if (price != null) {
    points.push({ emoji:'📊', title:'Current Price', detail:fmtPrice(price, cur), rocky:'Day change data not available right now.', grade:'info' });
  } else {
    points.push({ emoji:'📊', title:"Today's Price", detail:'Unavailable', rocky:'Try searching the ticker on Google Finance.', grade:'info' });
  }

  // ── 2. COMPANY SIZE ───────────────────────────────────────────────────────
  const cap    = q.marketCap;
  const sector = q.sector || '';
  let capGrade = 'info', capRocky = 'Market cap data not available.';
  if      (cap > 1e12) { capGrade = 'green';  capRocky = `Worth over a TRILLION dollars — one of the biggest companies on Earth! Very established and trusted worldwide.`; }
  else if (cap > 1e11) { capGrade = 'green';  capRocky = `Worth hundreds of billions — a giant company. Very well established with a strong track record.`; }
  else if (cap > 1e10) { capGrade = 'green';  capRocky = `Large, well-known company worth over $10 billion. Established and trusted by many investors.`; }
  else if (cap > 1e9)  { capGrade = 'yellow'; capRocky = `Medium-sized company worth $1–10 billion. More growth potential but also more risk than giants.`; }
  else if (cap)        { capGrade = 'red';    capRocky = `Smaller company. Higher risk — could grow fast OR struggle. Research extra carefully!`; }
  points.push({ emoji:'🏰', title:'Company Size', detail: cap ? `${fmtCap(cap)}${sector ? '  ·  ' + sector : ''}` : sector || 'Unavailable', rocky:capRocky, grade:capGrade });

  // ── 3. LAST 12 MONTHS ────────────────────────────────────────────────────
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
  const rangeText = (yrHigh && yrLow) ? `  ·  Range: ${fmtPrice(yrLow, cur)} – ${fmtPrice(yrHigh, cur)}` : '';
  points.push({
    emoji:'📈', title:'Last 12 Months',
    detail: yrChg != null ? `${yrChg >= 0 ? '+' : ''}${(yrChg * 100).toFixed(1)}%${rangeText}` : 'Annual data unavailable',
    rocky:perfRocky, grade:perfGrade,
  });

  // ── 4. PROFITABILITY ─────────────────────────────────────────────────────
  const pe  = q.trailingPE;
  const eps = q.epsTrailingTwelveMonths;
  let monGrade = 'info', monRocky = 'Profitability data not available.';
  if (pe != null && pe > 0) {
    if      (pe < 15) { monGrade = 'green';  monRocky = `P/E of ${pe.toFixed(0)} — looks like a bargain! You're paying $${pe.toFixed(0)} for every $1 of annual profit.`; }
    else if (pe < 25) { monGrade = 'green';  monRocky = `P/E of ${pe.toFixed(0)} — fair price. Not too cheap, not too expensive. A reasonable deal.`; }
    else if (pe < 50) { monGrade = 'yellow'; monRocky = `P/E of ${pe.toFixed(0)} — a bit pricey. Investors expect big future growth to justify this price!`; }
    else              { monGrade = 'yellow'; monRocky = `Very high P/E of ${pe.toFixed(0)} — investors are betting heavily on future growth. Risky if growth disappoints!`; }
  } else if (pe != null && pe <= 0) {
    monGrade = 'red'; monRocky = `Negative P/E — currently losing money. The company spends more than it earns. Very risky!`;
  } else if (eps != null) {
    monGrade = eps > 0 ? 'yellow' : 'red';
    monRocky = eps > 0 ? `Earning ${fmtPrice(eps, cur)} per share — profitable, but P/E not available.`
                       : `Losing money — negative earnings per share. High risk right now.`;
  }
  const epsText = eps != null ? `  ·  Earns ${fmtPrice(Math.abs(eps), cur)}/share` : '';
  points.push({
    emoji:'💰', title:'Is It Profitable?',
    detail: pe != null ? `P/E Ratio: ${pe > 0 ? pe.toFixed(1) : 'Negative'}${epsText}` : (eps != null ? `EPS: ${fmtPrice(eps, cur)}/share` : 'No profitability data'),
    rocky:monRocky, grade:monGrade,
  });

  // ── 5. ANALYST SENTIMENT ─────────────────────────────────────────────────
  const recMean = q.recommendationMean;
  const numAna  = q.numberOfAnalystOpinions;
  const recKey  = (q.averageAnalystRating || '').toLowerCase();
  let expGrade = 'info', expRocky = 'No analyst ratings available for this company.';
  let recLabel = 'No rating';
  if (recMean != null) {
    if      (recMean <= 1.5) { expGrade = 'green';  recLabel = 'Strong Buy';   expRocky = `${numAna || 'Multiple'} analysts gave this a STRONG BUY! Wall Street is very excited! 🚀`; }
    else if (recMean <= 2.5) { expGrade = 'green';  recLabel = 'Buy';          expRocky = `Analysts say BUY — they think the stock will rise.`; }
    else if (recMean <= 3.5) { expGrade = 'yellow'; recLabel = 'Hold';         expRocky = `Analysts say HOLD — it's okay but they're not excited. Good time to watch and wait.`; }
    else if (recMean <= 4.5) { expGrade = 'red';    recLabel = 'Underperform'; expRocky = `Analysts are cautious — they think other stocks might do better. A warning sign!`; }
    else                     { expGrade = 'red';    recLabel = 'Sell';         expRocky = `Analysts say SELL. Experts have serious concerns about this company right now.`; }
  } else if (recKey.includes('buy')) {
    expGrade = 'green'; recLabel = 'Buy'; expRocky = 'Analysts are positive — they expect the stock to rise.';
  } else if (recKey.includes('hold')) {
    expGrade = 'yellow'; recLabel = 'Hold'; expRocky = 'Analysts say hold — not exciting, but not bad either.';
  } else if (recKey.includes('sell')) {
    expGrade = 'red'; recLabel = 'Sell'; expRocky = 'Analysts have concerns — they think the stock may fall.';
  }
  const anaText = numAna ? `${recLabel}  ·  ${numAna} analysts` : recLabel;
  points.push({
    emoji:'🎯', title:'What Experts Think',
    detail: recMean != null || recKey ? anaText : 'No analyst data',
    rocky:expRocky, grade:expGrade,
  });

  return points;
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  let ticker, name;
  try { ({ ticker, name } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) }; }

  if (!ticker) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

  try {
    // Get Yahoo session cookie + crumb, then fetch quote data
    const { cookies, crumb } = await getYahooCookiesAndCrumb();
    const q = await fetchYahooQuote(ticker, cookies, crumb);

    if (!q) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

    const companyName = q.longName || q.shortName || name || ticker;
    const points      = buildPoints(q);
    const greenCount  = points.filter(p => p.grade === 'green').length;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
      body: JSON.stringify({ companyName, ticker: q.symbol || ticker, description:'', sector:q.sector, points, greenCount }),
    };
  } catch (e) {
    console.error('company-research error:', e.message);
    return { statusCode: 200, body: JSON.stringify({ fallback: true }) };
  }
}
