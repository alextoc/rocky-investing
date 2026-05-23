import { getWatchlist, removeFromWatchlist } from '../db.js';
import { fetchPrices, formatPrice, formatChangePct, priceClass } from '../prices-client.js';
import { sectorLabel, sectorBg, sectorFg, toast } from '../utils.js';
import { onNavigate, navigate } from '../router.js';

let _session = null;

export function mountWatchlist(session) {
  _session = session;
  onNavigate('screen-watchlist', () => renderWatchlist());
}

async function renderWatchlist() {
  const el = document.getElementById('screen-watchlist');
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading watchlist…</div>`;

  const wl = await getWatchlist(_session.profileId);
  if (!wl.length) {
    el.innerHTML = `
      <div class="card">
        <div class="tutor-row">
          <div class="tutor-emoji">🕷️</div>
          <div class="bubble">
            <div class="bubble-tag">Rocky 🪨</div>
            Watchlist is empty! Rocky suggest: go to Research Lab, find companies you like, add them here!
            Remember Rocky rule — aim for 8 to 12 companies from DIFFERENT sectors!
          </div>
        </div>
      </div>
      <div class="card" style="text-align:center;padding:32px 24px">
        <div style="font-size:3rem;margin-bottom:12px">🔬</div>
        <div style="font-weight:900;font-size:1.1rem;margin-bottom:8px">Nothing here yet!</div>
        <div style="color:#6B7280;font-size:.9rem;margin-bottom:20px">Go to Research Lab and add companies you believe in!</div>
        <button class="btn btn-primary" onclick="window.__nav('screen-lab')">🔬 Open Research Lab</button>
      </div>`;
    return;
  }

  const tickers = wl.map(w => w.ticker);
  const prices  = await fetchPrices(tickers);

  // Sector diversity
  const sectors = [...new Set(wl.map(w => w.sector).filter(Boolean))];
  let rockyComment = '';
  if (wl.length < 3)  rockyComment = `Good start! You watch ${wl.length} compan${wl.length===1?'y':'ies'}. Rocky goal: 8–12 from different sectors. Keep adding — but pick different types!`;
  else if (sectors.length < 3) rockyComment = `Blurt! You watch ${wl.length} companies but only ${sectors.length} sector${sectors.length===1?'':'s'}! If that sector have bad year — all go down together. Rocky suggest adding different types!`;
  else if (wl.length < 8) rockyComment = `Good! ${wl.length} companies, ${sectors.length} different sectors. Rocky goal is 8–12 companies, 5+ sectors. Keep building!`;
  else rockyComment = `${wl.length} companies, ${sectors.length} sectors — Rocky is ${sectors.length >= 5 ? 'very impress! This is excellent diversification! Amaze amaze amaze!' : 'starting to approve! Try to reach 5 different sectors for best protection!'}`;

  el.innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble"><div class="bubble-tag">Rocky 🪨</div>${rockyComment}</div>
      </div>
    </div>
    <div class="card" style="padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div class="sec-title" style="margin:0">My Watchlist 👁</div>
        <div style="font-size:.78rem;font-weight:800;color:#6B7280">${wl.length} companies · ${sectors.length} sectors</div>
      </div>
      ${wl.map(w => watchlistRow(w, prices[w.ticker])).join('')}
      <div style="background:#F8FAFF;border:2px solid #E0E7FF;border-radius:14px;padding:14px 16px;margin-top:4px">
        <div style="font-weight:900;font-size:.9rem;margin-bottom:10px">📊 Sector Coverage</div>
        <div style="height:8px;background:#E0E7FF;border-radius:8px;overflow:hidden;margin-bottom:8px">
          <div style="height:100%;width:${Math.min(100,(wl.length/12)*100)}%;background:linear-gradient(90deg,var(--primary),var(--purple));border-radius:8px;transition:width .6s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.72rem;font-weight:800;color:#9CA3AF;margin-bottom:10px">
          <span>0</span><span style="color:var(--green);font-weight:900">${wl.length}/12 companies</span><span>12 ⭐</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${sectors.map(s => `<span style="font-size:.68rem;font-weight:800;padding:3px 9px;border-radius:10px;background:${sectorBg(s)};color:${sectorFg(s)}">${sectorLabel(s)}</span>`).join('')}
        </div>
        <div style="font-size:.79rem;color:#374151;line-height:1.6;padding-top:10px;border-top:1px solid #E0E7FF;margin-top:10px">
          🕷️ <strong>Real investing:</strong> Trade ASX shares on <strong>CMC Invest</strong> and ETFs on <strong>Vanguard</strong>. Ask a parent! Rocky say: real investing is for <strong>long time</strong> — not short time!
        </div>
      </div>
    </div>
    <button class="btn btn-outline btn-full" onclick="window.__nav('screen-lab')">🔬 Research More Companies</button>`;

  window.__removeWatch = async (ticker) => {
    await removeFromWatchlist(_session.profileId, ticker);
    toast('🕷️ Removed from watchlist.');
    renderWatchlist();
  };
}

function watchlistRow(w, price) {
  const cls = priceClass(price?.change_pct);
  const priceStr = price ? formatPrice(price.price, price.currency) : '—';
  const changeStr = price ? formatChangePct(price.change_pct) : '';
  return `
    <div class="wl-row">
      <span style="font-size:1.7rem">${w.emoji}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.name}</div>
        <div style="font-size:.7rem;color:#9CA3AF">${w.ticker} · <span style="display:inline-block;font-size:.63rem;font-weight:800;padding:1px 6px;border-radius:8px;background:${sectorBg(w.sector)};color:${sectorFg(w.sector)}">${sectorLabel(w.sector)}</span></div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="price-${cls}" style="font-size:.95rem">${priceStr}</div>
        ${changeStr ? `<div class="badge-pct ${cls}">${changeStr}</div>` : '<div class="badge-pct flat">No data</div>'}
      </div>
      <button onclick="window.__removeWatch('${w.ticker}')" style="background:none;border:none;cursor:pointer;font-size:1.1rem;opacity:.4;padding:4px;margin-left:4px" title="Remove">✕</button>
    </div>`;
}
