// Strategy:
//  - Yahoo Finance v8/finance/chart  → price + day change + 52-week data (no auth, works for ALL exchanges)
//  - Finnhub                         → market cap, P/E, analyst ratings for US tickers (free tier)
//  - STATIC_ASX                      → market cap, P/E, analyst for ASX tickers (Finnhub blocks non-US)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Pre-baked fundamentals for ASX stocks (capB = USD billions, rec = analyst mean 1–5)
// Updated: May 2025
const STATIC_ASX = {
  'WTC.AX': { capB:18,  pe:80,   rec:2.0, sector:'Technology' },
  'XRO.AX': { capB:14,  pe:70,   rec:2.2, sector:'Technology' },
  'DMP.AX': { capB:2,   pe:18,   rec:3.0, sector:'Food' },
  'WOW.AX': { capB:25,  pe:22,   rec:3.2, sector:'Retail' },
  'COL.AX': { capB:16,  pe:20,   rec:2.8, sector:'Retail' },
  'A2M.AX': { capB:2.5, pe:22,   rec:2.8, sector:'Food' },
  'WES.AX': { capB:40,  pe:26,   rec:3.0, sector:'Retail' },
  'JBH.AX': { capB:4,   pe:14,   rec:2.5, sector:'Retail' },
  'REA.AX': { capB:15,  pe:55,   rec:2.0, sector:'Technology' },
  'CSL.AX': { capB:80,  pe:30,   rec:1.8, sector:'Healthcare' },
  'RMD.AX': { capB:30,  pe:28,   rec:2.0, sector:'Healthcare' },
  'COH.AX': { capB:11,  pe:48,   rec:2.5, sector:'Healthcare' },
  'SHL.AX': { capB:8,   pe:18,   rec:2.5, sector:'Healthcare' },
  'RHC.AX': { capB:6,   pe:25,   rec:2.8, sector:'Healthcare' },
  'QAN.AX': { capB:5.5, pe:12,   rec:3.0, sector:'Transportation' },
  'WDS.AX': { capB:24,  pe:14,   rec:2.5, sector:'Energy' },
  'AGL.AX': { capB:4,   pe:10,   rec:3.2, sector:'Energy' },
  'VAH.AX': { capB:1.2, pe:null, rec:null, sector:'Transportation' },
  'BHP.AX': { capB:85,  pe:14,   rec:2.2, sector:'Mining' },
  'RIO.AX': { capB:65,  pe:10,   rec:2.0, sector:'Mining' },
  'FMG.AX': { capB:32,  pe:9,    rec:3.2, sector:'Mining' },
  'PLS.AX': { capB:3,   pe:null, rec:2.8, sector:'Mining' },
  'MIN.AX': { capB:2.5, pe:null, rec:2.5, sector:'Mining' },
  'S32.AX': { capB:10,  pe:12,   rec:2.2, sector:'Mining' },
  'NST.AX': { capB:10,  pe:20,   rec:2.0, sector:'Mining' },
  'CBA.AX': { capB:128, pe:22,   rec:3.5, sector:'Banking' },
  'NAB.AX': { capB:65,  pe:16,   rec:3.0, sector:'Banking' },
  'WBC.AX': { capB:50,  pe:14,   rec:2.8, sector:'Banking' },
  'ANZ.AX': { capB:45,  pe:13,   rec:2.5, sector:'Banking' },
  'MQG.AX': { capB:52,  pe:20,   rec:2.0, sector:'Banking' },
};

// ── DATA FETCHERS ─────────────────────────────────────────────────────────────

async function getChartData(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d`;
  const res  = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Chart HTTP ${res.status}`);
  const json   = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result?.meta?.regularMarketPrice) return null;

  const meta   = result.meta;
  const closes = (result.indicators?.quote?.[0]?.close || []).filter(c => c != null);
  const today  = closes[closes.length - 1];
  const prev   = closes[closes.length - 2];
  const dayChangePct   = (today != null && prev != null) ? ((today - prev) / prev * 100) : null;
  const priceOneYrAgo  = meta.chartPreviousClose;
  const yrChangeFrac   = (meta.regularMarketPrice && priceOneYrAgo) ? ((meta.regularMarketPrice - priceOneYrAgo) / priceOneYrAgo) : null;

  return {
    price:    meta.regularMarketPrice,
    dayChangePct,
    yrChangeFrac,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow:  meta.fiftyTwoWeekLow,
    currency: meta.currency || 'USD',
    longName: meta.longName,
    shortName:meta.shortName,
  };
}

async function getFinnhubFundamentals(ticker, key) {
  const sym = encodeURIComponent(ticker);
  const fh  = (path) => fetch(`https://finnhub.io/api/v1${path}&token=${key}`, { headers:{ 'User-Agent': UA } })
                          .then(r => r.ok ? r.json() : null).catch(() => null);

  const [profile, metrics, recs] = await Promise.all([
    fh(`/stock/profile2?symbol=${sym}`),
    fh(`/stock/metric?symbol=${sym}&metric=all`),
    fh(`/stock/recommendation?symbol=${sym}`),
  ]);

  const rec   = Array.isArray(recs) ? recs[0] : null;
  let recMean = null, numAna = 0;
  if (rec) {
    const { strongBuy:sb=0, buy:b=0, hold:h=0, sell:s=0, strongSell:ss=0 } = rec;
    numAna  = sb + b + h + s + ss;
    recMean = numAna > 0 ? (sb*1 + b*2 + h*3 + s*4 + ss*5) / numAna : null;
  }

  return {
    cap:     profile?.marketCapitalization ? profile.marketCapitalization * 1e6 : null,
    pe:      metrics?.metric?.peTTM ?? metrics?.metric?.peAnnual ?? null,
    eps:     metrics?.metric?.epsTTM ?? null,
    recMean, numAna,
    sector:  profile?.finnhubIndustry || null,
  };
}

// ── DATA POINT BUILDERS ───────────────────────────────────────────────────────

function fmtCap(n) {
  if (!n) return null;
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

function capGrade(cap) {
  if (cap > 1e12) return { grade:'green',  rocky:`Worth over a TRILLION dollars — one of the biggest companies on Earth! Very established and trusted worldwide.` };
  if (cap > 1e11) return { grade:'green',  rocky:`Worth hundreds of billions — a giant company. Very well established with a strong track record.` };
  if (cap > 1e10) return { grade:'green',  rocky:`Large, well-known company worth over $10 billion. Established and trusted by many investors.` };
  if (cap > 1e9)  return { grade:'yellow', rocky:`Medium-sized company worth $1–10 billion. More growth potential but also more risk than giants.` };
  return             { grade:'red',    rocky:`Smaller company. Higher risk — could grow fast OR struggle. Research extra carefully!` };
}

function peGrade(pe) {
  if (pe < 15) return { grade:'green',  rocky:`P/E of ${pe.toFixed(0)} — looks like a bargain! You're paying $${pe.toFixed(0)} for every $1 of annual profit.` };
  if (pe < 25) return { grade:'green',  rocky:`P/E of ${pe.toFixed(0)} — fair price. Not too cheap, not too expensive. A reasonable deal.` };
  if (pe < 50) return { grade:'yellow', rocky:`P/E of ${pe.toFixed(0)} — a bit pricey. Investors expect big future growth to justify this price!` };
  return         { grade:'yellow', rocky:`Very high P/E of ${pe.toFixed(0)} — investors are betting heavily on future growth. Risky if growth disappoints!` };
}

function analystGrade(rec, numAna) {
  const n = numAna ? `${numAna} analysts` : 'Analysts';
  if (rec <= 1.5) return { grade:'green',  label:'Strong Buy',   rocky:`${n} gave this a STRONG BUY! Wall Street is very excited! 🚀` };
  if (rec <= 2.5) return { grade:'green',  label:'Buy',          rocky:`${n} say BUY — they think the stock will rise.` };
  if (rec <= 3.5) return { grade:'yellow', label:'Hold',         rocky:`${n} say HOLD — okay but not exciting. Good time to watch and wait.` };
  if (rec <= 4.5) return { grade:'red',    label:'Underperform', rocky:`${n} are cautious — they think other stocks might do better. A warning sign!` };
  return           { grade:'red',    label:'Sell',         rocky:`${n} say SELL. Experts have serious concerns about this company right now.` };
}

function buildPoints(chart, fund, cur) {
  const pts = [];

  // 1. TODAY'S PRICE
  const { price, dayChangePct } = chart;
  if (price != null && dayChangePct != null) {
    const arrow = dayChangePct >= 0 ? '▲' : '▼';
    const abs   = Math.abs(dayChangePct).toFixed(2);
    const grade = Math.abs(dayChangePct) < 2 ? 'green' : Math.abs(dayChangePct) < 5 ? 'yellow' : 'red';
    const rocky = dayChangePct > 3  ? `Up ${abs}% today — big move! Markets are very excited right now.`
                : dayChangePct > 0  ? `Up ${abs}% today — a positive day! Small moves are totally normal.`
                : dayChangePct < -3 ? `Down ${abs}% today — big drop! Could be news, or just normal market noise.`
                :                    `Down ${abs}% today — small dip. Happens all the time, don't panic!`;
    pts.push({ emoji:'📊', title:"Today's Price", detail:`${fmtPrice(price, cur)}  ${arrow} ${abs}% today`, rocky, grade });
  } else {
    pts.push({ emoji:'📊', title:'Current Price', detail: price ? fmtPrice(price, cur) : 'Unavailable', rocky:'Day change not available right now.', grade:'info' });
  }

  // 2. COMPANY SIZE
  if (fund.cap) {
    const { grade, rocky } = capGrade(fund.cap);
    const sectorTag = fund.sector ? `  ·  ${fund.sector}` : '';
    pts.push({ emoji:'🏰', title:'Company Size', detail:`${fmtCap(fund.cap)}${sectorTag}`, rocky, grade });
  } else {
    pts.push({ emoji:'🏰', title:'Company Size', detail: fund.sector || 'Data not available', rocky:'Market cap data not available for this company.', grade:'info' });
  }

  // 3. LAST 12 MONTHS
  const { yrChangeFrac, fiftyTwoWeekHigh, fiftyTwoWeekLow } = chart;
  if (yrChangeFrac != null) {
    const pct = (yrChangeFrac * 100).toFixed(1);
    const grade = yrChangeFrac > 0.5 ? 'green' : yrChangeFrac > 0.15 ? 'green' : yrChangeFrac > 0 ? 'yellow' : 'red';
    const rocky = yrChangeFrac > 0.5  ? `Up ${pct}% over the last year — HUGE growth! The market has been very excited about this company. 🚀`
                : yrChangeFrac > 0.15 ? `Up ${pct}% over the last year — strong! Better than the average market return of ~10-15%.`
                : yrChangeFrac > 0    ? `Up ${pct}% over the last year — slow but positive. About average or slightly below market.`
                :                       `Down ${Math.abs(pct)}% over the last year. The market hasn't been happy with this company. Be cautious!`;
    const range = (fiftyTwoWeekHigh && fiftyTwoWeekLow) ? `  ·  Range: ${fmtPrice(fiftyTwoWeekLow, cur)} – ${fmtPrice(fiftyTwoWeekHigh, cur)}` : '';
    pts.push({ emoji:'📈', title:'Last 12 Months', detail:`${yrChangeFrac >= 0 ? '+' : ''}${pct}%${range}`, rocky, grade });
  } else {
    pts.push({ emoji:'📈', title:'Last 12 Months', detail:'Annual data unavailable', rocky:'Annual performance data not available.', grade:'info' });
  }

  // 4. PROFITABILITY
  const { pe, eps } = fund;
  if (pe != null && pe > 0) {
    const { grade, rocky } = peGrade(pe);
    const epsText = eps != null ? `  ·  Earns ${fmtPrice(Math.abs(eps), cur)}/share` : '';
    pts.push({ emoji:'💰', title:'Is It Profitable?', detail:`P/E Ratio: ${pe.toFixed(1)}${epsText}`, rocky, grade });
  } else if (pe != null && pe <= 0) {
    pts.push({ emoji:'💰', title:'Is It Profitable?', detail:'P/E: Negative', rocky:`Negative P/E — currently losing money. The company spends more than it earns. Very risky!`, grade:'red' });
  } else if (eps != null) {
    const grade = eps > 0 ? 'yellow' : 'red';
    const rocky = eps > 0 ? `Earning ${fmtPrice(eps, cur)} per share — profitable, but P/E not available.` : `Losing money — negative earnings per share. High risk right now.`;
    pts.push({ emoji:'💰', title:'Is It Profitable?', detail:`EPS: ${fmtPrice(eps, cur)}/share`, rocky, grade });
  } else {
    pts.push({ emoji:'💰', title:'Is It Profitable?', detail:'Data not available', rocky:'Profitability data not available for this company.', grade:'info' });
  }

  // 5. ANALYST SENTIMENT
  if (fund.recMean != null) {
    const { grade, label, rocky } = analystGrade(fund.recMean, fund.numAna);
    const detail = fund.numAna ? `${label}  ·  ${fund.numAna} analysts` : label;
    pts.push({ emoji:'🎯', title:'What Experts Think', detail, rocky, grade });
  } else {
    pts.push({ emoji:'🎯', title:'What Experts Think', detail:'No analyst data', rocky:'No analyst ratings available for this company.', grade:'info' });
  }

  return pts;
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  let ticker, name;
  try { ({ ticker, name } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) }; }
  if (!ticker) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

  try {
    const isASX = ticker.endsWith('.AX');
    const key   = process.env.FINNHUB_KEY;

    // Chart data works for all exchanges — fetch always
    const chart = await getChartData(ticker);
    if (!chart) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

    // Fundamentals: Finnhub for US, static table for ASX, empty for others
    let fund = { cap: null, pe: null, eps: null, recMean: null, numAna: 0, sector: null };
    if (isASX && STATIC_ASX[ticker]) {
      const s = STATIC_ASX[ticker];
      fund = { cap: s.capB ? s.capB * 1e9 : null, pe: s.pe, eps: null, recMean: s.rec, numAna: 0, sector: s.sector };
    } else if (!isASX && key) {
      fund = await getFinnhubFundamentals(ticker, key);
    }

    const cur         = chart.currency;
    const companyName = chart.longName || chart.shortName || name || ticker;
    const points      = buildPoints(chart, fund, cur);
    const greenCount  = points.filter(p => p.grade === 'green').length;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
      body: JSON.stringify({ companyName, ticker, description:'', sector: fund.sector, points, greenCount }),
    };
  } catch (e) {
    console.error('company-research error:', e.message);
    return { statusCode: 200, body: JSON.stringify({ fallback: true }) };
  }
}
