import { getHoldings, deleteHolding, getPredictions } from '../db.js';
import { fetchPrices, formatPrice, formatChangePct, priceClass } from '../prices-client.js';
import { sectorLabel, sectorBg, sectorFg, toast } from '../utils.js';
import { onNavigate } from '../router.js';

let _session = null;

export function mountPortfolio(session) {
  _session = session;
  onNavigate('screen-portfolio', () => renderPortfolio());
}

async function renderPortfolio() {
  const el = document.getElementById('screen-portfolio');

  if ((_session.chaptersDone ?? 0) < 10) {
    el.innerHTML = `
      <div class="unlock-gate">
        <div class="lock-icon">💼</div>
        <h3>Portfolio unlocks after Chapter 10!</h3>
        <p>Complete Rocky's full Academy first. Then your real portfolio dashboard will be waiting here — live prices, gains, everything!</p>
      </div>`;
    return;
  }

  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading portfolio…</div>`;
  const [holdings, allPredictions] = await Promise.all([
    getHoldings(_session.profileId),
    getPredictions(_session.profileId),    // all weeks, no filter
  ]);
  const tickers = [...new Set(holdings.map(h => h.ticker))];
  const prices  = tickers.length ? await fetchPrices(tickers) : {};
  renderFull(el, holdings, prices, allPredictions);
}

function renderFull(el, holdings, prices, allPredictions = []) {
  let totalValue = 0, totalCost = 0;
  for (const h of holdings) {
    const p = prices[h.ticker]?.price ?? h.buy_price;
    totalValue += h.quantity * p;
    totalCost  += h.quantity * h.buy_price;
  }
  const gain = totalValue - totalCost;
  const pct  = totalCost > 0 ? gain / totalCost * 100 : 0;
  const won  = gain >= 0;

  // Sector breakdown
  const sectorMap = {};
  for (const h of holdings) {
    const val = h.quantity * (prices[h.ticker]?.price ?? h.buy_price);
    sectorMap[h.sector] = (sectorMap[h.sector] ?? 0) + val;
  }

  el.innerHTML = `
    <div class="portfolio-total">
      <div class="port-total-label">💼 ${_session.username}'s Portfolio</div>
      <div class="port-total-val">${formatPrice(totalValue,'AUD')}</div>
      <div class="port-total-gain">${won ? '▲' : '▼'} ${won?'+':''}${formatPrice(Math.abs(gain),'AUD')} (${won?'+':''}${pct.toFixed(1)}%) total</div>
    </div>

    ${holdings.length === 0 ? `
    <div class="card" style="text-align:center;padding:32px">
      <div style="font-size:2.5rem;margin-bottom:10px">📭</div>
      <div style="font-weight:900;margin-bottom:8px">No holdings yet</div>
      <div style="font-size:.85rem;color:#6B7280">When your parent records a purchase, it will appear here with live price tracking!</div>
    </div>` : `
    <div class="card">
      <div class="sec-title">My Holdings</div>
      ${holdings.map(h => holdingCard(h, prices[h.ticker])).join('')}
    </div>

    <div class="card">
      <div class="sec-title">Sector Breakdown</div>
      ${Object.entries(sectorMap).sort((a,b)=>b[1]-a[1]).map(([sec, val]) => {
        const pctW = totalValue > 0 ? (val/totalValue*100) : 0;
        return `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:.82rem;font-weight:800">${sectorLabel(sec)}</span>
              <span style="font-size:.82rem;font-weight:900">${formatPrice(val,'AUD')} (${pctW.toFixed(0)}%)</span>
            </div>
            <div style="height:10px;background:#E0E7FF;border-radius:8px;overflow:hidden">
              <div style="height:100%;width:${pctW}%;background:${sectorBg(sec)};border:2px solid ${sectorFg(sec)};border-radius:8px;transition:width .8s"></div>
            </div>
          </div>`;
      }).join('')}
    </div>`}

    ${buildPredictionHistory(allPredictions)}

    <div class="card" style="text-align:center">
      <div style="font-size:.82rem;color:#6B7280;margin-bottom:10px">
        Parent can add new purchases from the <strong>Parent Portal</strong>
      </div>
      <button class="btn btn-outline" onclick="window.__nav('screen-parent')">🔐 Parent Portal</button>
    </div>`;

  window.__deleteHolding = async (id) => {
    if (!confirm('Remove this holding?')) return;
    await deleteHolding(id);
    toast('Holding removed.');
    renderPortfolio();
  };
}

// ── Phase 2: Prediction history ────────────────────────────────────────────────
function buildPredictionHistory(allPredictions) {
  const resolved = allPredictions.filter(p => p.resolved);
  if (!resolved.length) return '';

  // Group by week_start
  const byWeek = {};
  for (const p of resolved) {
    (byWeek[p.week_start] = byWeek[p.week_start] ?? []).push(p);
  }
  const weeks = Object.keys(byWeek).sort((a, b) => b.localeCompare(a)).slice(0, 6); // last 6 weeks

  // Compute streak: consecutive weeks with > 50% correct
  let streak = 0;
  for (const wk of weeks) {
    const wPreds   = byWeek[wk];
    const correct  = wPreds.filter(p => p.correct).length;
    if (correct / wPreds.length > 0.5) streak++;
    else break;
  }

  const totalCorrect = resolved.filter(p => p.correct).length;
  const totalStars   = resolved.reduce((s, p) => s + (p.stars_awarded ?? 0), 0);

  return `
    <div class="card">
      <div class="sec-title">🎯 Prediction History</div>
      <div class="sec-sub">Track record from Monday predictions</div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
        <div class="stat-box">
          <div class="stat-num">${totalCorrect}/${resolved.length}</div>
          <div class="stat-lbl">All Time</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:var(--gold)">⭐${totalStars}</div>
          <div class="stat-lbl">Stars Earned</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:var(--green)">${streak}🔥</div>
          <div class="stat-lbl">Week Streak</div>
        </div>
      </div>

      ${weeks.map(wk => {
        const wPreds  = byWeek[wk];
        const correct = wPreds.filter(p => p.correct).length;
        const stars   = wPreds.reduce((s, p) => s + (p.stars_awarded ?? 0), 0);
        const pct     = Math.round(correct / wPreds.length * 100);
        return `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:.8rem;font-weight:900">Week of ${wk}</span>
              <span style="font-size:.78rem;font-weight:900;color:${pct>=50?'#10B981':'#EF4444'}">
                ${correct}/${wPreds.length} correct · ⭐${stars}
              </span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">
              ${wPreds.map(p => `
                <div style="display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:8px;font-size:.75rem;font-weight:800;background:${p.correct?'#D1FAE5':'#FEE2E2'};color:${p.correct?'#065F46':'#991B1B'}">
                  ${p.emoji ?? '📈'} ${p.name ?? p.ticker} ${p.direction==='up'?'↑':'↓'} ${p.correct?'✅':'❌'}
                </div>`).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function holdingCard(h, price) {
  const current = price?.price ?? h.buy_price;
  const value   = h.quantity * current;
  const cost    = h.quantity * h.buy_price;
  const gain    = value - cost;
  const pct     = (current - h.buy_price) / h.buy_price * 100;
  const cls     = priceClass(pct);

  return `
    <div class="holding-card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <div style="font-size:2rem;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:${sectorBg(h.sector)};border-radius:12px">${h.emoji}</div>
        <div style="flex:1">
          <div style="font-weight:900">${h.name}</div>
          <div style="font-size:.72rem;color:#9CA3AF">${h.ticker} · ${h.exchange} · <span style="font-size:.63rem;font-weight:800;padding:1px 6px;border-radius:8px;background:${sectorBg(h.sector)};color:${sectorFg(h.sector)}">${sectorLabel(h.sector)}</span></div>
        </div>
        <button onclick="window.__deleteHolding('${h.id}')" style="background:none;border:none;cursor:pointer;opacity:.3;font-size:.9rem;padding:4px">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div style="padding:8px;background:#F8FAFF;border-radius:10px;text-align:center">
          <div style="font-size:.62rem;font-weight:900;color:#9CA3AF;margin-bottom:2px">SHARES</div>
          <div style="font-weight:900;font-size:.9rem">${h.quantity}</div>
        </div>
        <div style="padding:8px;background:#F8FAFF;border-radius:10px;text-align:center">
          <div style="font-size:.62rem;font-weight:900;color:#9CA3AF;margin-bottom:2px">BOUGHT AT</div>
          <div style="font-weight:900;font-size:.9rem">${formatPrice(h.buy_price, h.currency)}</div>
        </div>
        <div style="padding:8px;background:${cls==='up'?'#D1FAE5':cls==='dn'?'#FEE2E2':'#F8FAFF'};border-radius:10px;text-align:center">
          <div style="font-size:.62rem;font-weight:900;color:#9CA3AF;margin-bottom:2px">NOW</div>
          <div class="price-${cls}" style="font-weight:900;font-size:.9rem">${formatPrice(current, h.currency)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6">
        <div style="font-size:.8rem;color:#6B7280">Bought ${h.buy_date} · ${h.note || 'No note'}</div>
        <div style="text-align:right">
          <div style="font-weight:900" class="price-${cls}">${formatPrice(value,'AUD')}</div>
          <div class="badge-pct ${cls}">${gain>=0?'+':''}${formatPrice(Math.abs(gain),'AUD')} (${pct>=0?'+':''}${pct.toFixed(1)}%)</div>
        </div>
      </div>
    </div>`;
}
