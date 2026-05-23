// Fetches Yahoo Finance quoteSummary for a ticker and returns
// 5 kid-friendly research data points.

function fmt(n) {
  if (n == null) return null;
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'M';
  return n.toLocaleString();
}

function buildPoints(profile, summary, fin, price) {
  const points = [];

  // ── 1. WHAT THEY DO ────────────────────────────────────────────────────────
  const sector    = profile.sector || '';
  const employees = profile.fullTimeEmployees;
  let desc = profile.longBusinessSummary || '';
  if (desc.length > 220) desc = desc.slice(0, 220).replace(/\s\S*$/, '') + '…';
  const empText = employees
    ? (employees > 50000 ? `Giant company — ${fmt(employees)} employees worldwide!`
      : employees > 10000 ? `Large company with ${fmt(employees)} employees.`
      : `${fmt(employees)} employees — smaller but focused company.`)
    : '';
  points.push({
    emoji: '🏢', title: 'What They Do',
    detail: desc || `A ${sector} company.`,
    rocky: empText || (sector ? `This is a ${sector} company.` : 'Business summary not available.'),
    grade: 'info',
  });

  // ── 2. HOW BIG IS IT ───────────────────────────────────────────────────────
  const cap = price.marketCap?.raw;
  let capGrade = 'info', capRocky = 'Market cap data not available.';
  if (cap > 1e12)  { capGrade = 'green';  capRocky = 'MEGA company — one of the biggest in the world! Very established, usually safer.'; }
  else if (cap > 1e10) { capGrade = 'green';  capRocky = 'Large, well-known company. Established and trusted by many investors.'; }
  else if (cap > 1e9)  { capGrade = 'yellow'; capRocky = 'Medium-size company. Good growth potential but more risk than giants.'; }
  else if (cap)        { capGrade = 'red';    capRocky = 'Smaller company — higher risk, but could grow very fast! Research carefully.'; }
  points.push({
    emoji: '🏰', title: 'How Big Is It?',
    detail: cap ? `Market value: $${fmt(cap)}` : 'Market cap unavailable',
    rocky: capRocky,
    grade: capGrade,
  });

  // ── 3. MAKING MONEY ────────────────────────────────────────────────────────
  const rev    = fin.totalRevenue?.raw;
  const margin = fin.profitMargins?.raw;
  let monGrade = 'info', monRocky = 'Financial data not available.';
  if (margin != null) {
    if      (margin > 0.25) { monGrade = 'green';  monRocky = `Keeps ${(margin*100).toFixed(0)}¢ from every dollar earned — very profitable! 💰`; }
    else if (margin > 0.10) { monGrade = 'green';  monRocky = `${(margin*100).toFixed(0)}% profit margin — solid and healthy business.`; }
    else if (margin > 0.02) { monGrade = 'yellow'; monRocky = `Thin ${(margin*100).toFixed(0)}% margin — making money but not much per dollar.`; }
    else if (margin > 0)    { monGrade = 'yellow'; monRocky = `Very thin margins (${(margin*100).toFixed(1)}%). Needs to improve profitability.`; }
    else                    { monGrade = 'red';    monRocky = `Currently losing money — spending more than it earns. High risk! 📉`; }
  }
  const monDetail = [rev ? `Revenue: $${fmt(rev)}/yr` : '', margin != null ? `Profit margin: ${(margin*100).toFixed(1)}%` : ''].filter(Boolean).join(' · ');
  points.push({
    emoji: '💰', title: 'Making Money?',
    detail: monDetail || 'Financial data unavailable',
    rocky: monRocky,
    grade: monGrade,
  });

  // ── 4. IS THE PRICE FAIR ───────────────────────────────────────────────────
  const pe = summary.trailingPE?.raw;
  let priceGrade = 'info', priceRocky = 'P/E data not available — check if earnings are positive.';
  if (pe != null) {
    if      (pe < 0)  { priceGrade = 'red';    priceRocky = `Negative P/E — company is losing money. Very risky!`; }
    else if (pe < 15) { priceGrade = 'green';  priceRocky = `P/E of ${pe.toFixed(0)} — looks like a bargain! You pay $${pe.toFixed(0)} for every $1 of profit.`; }
    else if (pe < 25) { priceGrade = 'green';  priceRocky = `P/E of ${pe.toFixed(0)} — fair price. Not too cheap, not too expensive.`; }
    else if (pe < 40) { priceGrade = 'yellow'; priceRocky = `P/E of ${pe.toFixed(0)} — a bit expensive. Growth must be strong to justify!`; }
    else              { priceGrade = 'red';    priceRocky = `P/E of ${pe.toFixed(0)} — very expensive! Company needs to grow very fast to justify this price.`; }
  }
  points.push({
    emoji: '🏷️', title: 'Is the Price Fair?',
    detail: pe != null ? `P/E Ratio: ${pe.toFixed(1)}` : 'P/E data unavailable',
    rocky: priceRocky,
    grade: priceGrade,
  });

  // ── 5. IS IT GROWING ───────────────────────────────────────────────────────
  const revG = fin.revenueGrowth?.raw;
  const epsG = fin.earningsGrowth?.raw;
  const g    = revG ?? epsG;
  let growGrade = 'info', growRocky = 'Growth data not available — check their recent annual report.';
  if (g != null) {
    const pct = (g * 100).toFixed(0);
    if      (g > 0.3)  { growGrade = 'green';  growRocky = `Growing at ${pct}%/year — ROCKET GROWTH! 🚀`; }
    else if (g > 0.1)  { growGrade = 'green';  growRocky = `Growing at ${pct}%/year — healthy and steady. 📈`; }
    else if (g > 0)    { growGrade = 'yellow'; growRocky = `Slow growth at ${pct}%/year. Stable but not exciting.`; }
    else               { growGrade = 'red';    growRocky = `Revenue shrinking ${Math.abs(pct)}% this year — not a good sign! 📉`; }
  }
  points.push({
    emoji: '📈', title: 'Is It Growing?',
    detail: g != null ? `Revenue growth: ${g > 0 ? '+' : ''}${(g*100).toFixed(1)}%/year` : 'Growth data unavailable',
    rocky: growRocky,
    grade: growGrade,
  });

  return points;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  let ticker, name;
  try { ({ ticker, name } = JSON.parse(event.body || '{}')); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) }; }

  if (!ticker) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

  const modules = 'assetProfile,summaryDetail,financialData,price';
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

    const json = await res.json();
    const r    = json?.quoteSummary?.result?.[0];
    if (!r) return { statusCode: 200, body: JSON.stringify({ fallback: true }) };

    const profile = r.assetProfile   || {};
    const summary = r.summaryDetail  || {};
    const fin     = r.financialData  || {};
    const price   = r.price          || {};

    const companyName  = price.longName || price.shortName || name || ticker;
    const points       = buildPoints(profile, summary, fin, price);
    const greenCount   = points.filter(p => p.grade === 'green').length;
    const infoCount    = points.filter(p => p.grade === 'info').length;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify({ companyName, points, greenCount, infoCount }),
    };
  } catch (e) {
    console.error('company-research error:', e.message);
    return { statusCode: 200, body: JSON.stringify({ fallback: true }) };
  }
}
