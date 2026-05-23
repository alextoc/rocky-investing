import { navigate, onNavigate } from '../router.js';
import { getWatchlist, getHoldings } from '../db.js';
import { fetchPrices, formatPrice, formatChangePct, priceClass } from '../prices-client.js';
import { sectorLabel, sectorBg, sectorFg } from '../utils.js';
import { mountGame } from './game.js';

let _session = null;

export async function mountHome(session) {
  _session = session;
  onNavigate('screen-home', () => renderHome(session));
  await renderHome(session);
}

async function renderHome(session) {
  const el = document.getElementById('screen-home');
  const chapDone = session.chaptersDone ?? 0;

  if (chapDone >= 10) {
    // ── FULL DASHBOARD ──────────────────────────────────────────────────────
    el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading your dashboard…</div>`;
    const [holdings, watchlist] = await Promise.all([
      getHoldings(session.profileId),
      getWatchlist(session.profileId),
    ]);
    const allTickers = [...new Set([
      ...holdings.map(h => h.ticker),
      ...watchlist.map(w => w.ticker),
    ])];
    const prices = allTickers.length ? await fetchPrices(allTickers) : {};
    renderDashboard(el, session, holdings, watchlist, prices);
  } else {
    // ── ACADEMY HOME ────────────────────────────────────────────────────────
    renderAcademyHome(el, session);
  }
}

function renderAcademyHome(el, session) {
  const tips = [
    "Rocky say: best time to invest was long time ago. Second best time is right now! Start early, win big!",
    "Blurt! Spread money across 8–12 different sectors. If one falls, the others carry you!",
    "Amaze amaze amaze — $100 growing 10% per year becomes $1,745 after 30 years! Compounding is magic!",
    "Rocky observe: most successful investors is not the smartest — is the most PATIENT. Patience wins!",
    "Question: before you invest, ask — do YOU use this company? Does everyone need it? Yes? Good sign!",
  ];
  const tip = tips[Math.floor(Math.random() * tips.length)];
  const chap = (session.chaptersDone ?? 0) + 1;

  el.innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          ${session.chaptersDone === 0
            ? `Blurt! Welcome, <strong>${session.username}</strong>! Rocky is very excite you are here! 🎉 10 chapters of investing wisdom await! Let us begin your journey!`
            : `Welcome back, <strong>${session.username}</strong>! Rocky remember you! ⭐ Chapter ${chap} of 10 is waiting. Keep going — you is becoming real investor!`
          }
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">Your Progress 📊</div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-num">⭐ ${session.stars}</div><div class="stat-lbl">Stars Earned</div></div>
        <div class="stat-box"><div class="stat-num">📚 ${session.chaptersDone}/10</div><div class="stat-lbl">Chapters Done</div></div>
        <div class="stat-box"><div class="stat-num">${session.chaptersDone >= 3 ? '🔬 Open' : '🔒 Ch.3'}</div><div class="stat-lbl">Research Lab</div></div>
        <div class="stat-box"><div class="stat-num">${session.chaptersDone >= 10 ? '💼 Live' : '🔒 Ch.10'}</div><div class="stat-lbl">Portfolio</div></div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">What do we do today? 🤔</div>
      <div class="action-grid">
        <button class="action-btn" onclick="window.__goLearn()">
          <span class="ab-icon">🎓</span>
          <span class="ab-title">Continue Learning</span>
          <span class="ab-sub">Chapter ${chap} of 10 — let's go!</span>
        </button>
        <button class="action-btn" onclick="window.__nav('screen-lab')">
          <span class="ab-icon">🔬</span>
          <span class="ab-title">Research Lab</span>
          <span class="ab-sub">${session.chaptersDone >= 3 ? 'Investigate real companies!' : `Unlocks at Chapter 3`}</span>
        </button>
        <button class="action-btn" onclick="window.__nav('screen-watchlist')">
          <span class="ab-icon">👁</span>
          <span class="ab-title">My Watchlist</span>
          <span class="ab-sub">Track companies you like</span>
        </button>
        <button class="action-btn" onclick="window.__showTip()">
          <span class="ab-icon">🪨</span>
          <span class="ab-title">Rocky's Tip</span>
          <span class="ab-sub">Today's wisdom from Rocky!</span>
        </button>
      </div>
    </div>
    <div class="card" style="background:linear-gradient(135deg,#EEF2FF,#F5F3FF);border:2px solid #C7D2FE">
      <div style="font-size:.72rem;font-weight:900;color:#7C3AED;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">🕷️ Rocky's Tip</div>
      <div style="font-size:.9rem;line-height:1.65;color:#1E1B4B">${tip}</div>
    </div>`;

  window.__goLearn = () => {
    mountGame(_session);
    navigate('screen-game');
  };
  window.__showTip = () => {
    const t = tips[Math.floor(Math.random() * tips.length)];
    document.querySelector('.card:last-child div:last-child').textContent = t;
  };
}

function renderDashboard(el, session, holdings, watchlist, prices) {
  // ── Portfolio total ──────────────────────────────────────────────────────
  let totalValue = 0, totalCost = 0;
  for (const h of holdings) {
    const p = prices[h.ticker];
    const currentPrice = p?.price ?? h.buy_price;
    totalValue += h.quantity * currentPrice;
    totalCost  += h.quantity * h.buy_price;
  }
  const gain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? (gain / totalCost * 100) : 0;
  const won = gain >= 0;

  el.innerHTML = `
    <div class="portfolio-total">
      <div class="port-total-label">💼 ${session.username}'s Portfolio</div>
      <div class="port-total-val">A$${totalValue.toFixed(2)}</div>
      <div class="port-total-gain">${won ? '▲' : '▼'} ${won?'+':''}A$${Math.abs(gain).toFixed(2)} (${won?'+':''}${gainPct.toFixed(1)}%) since purchase</div>
    </div>

    ${holdings.length ? `
    <div class="card">
      <div class="sec-title">💼 My Holdings</div>
      <div class="sec-sub">Real investments tracked live</div>
      ${holdings.map(h => holdingRow(h, prices[h.ticker])).join('')}
      <button class="btn btn-outline btn-full btn-sm" style="margin-top:8px" onclick="window.__nav('screen-portfolio')">View Full Portfolio →</button>
    </div>` : `
    <div class="card" style="text-align:center;padding:24px">
      <div style="font-size:2.5rem;margin-bottom:10px">💼</div>
      <div style="font-weight:900;margin-bottom:6px">No holdings yet</div>
      <div style="font-size:.85rem;color:#6B7280;margin-bottom:16px">When you invest real money, your dad records it here and you can track it live!</div>
      <button class="btn btn-outline" onclick="window.__nav('screen-lab')">🔬 Research Companies First</button>
    </div>`}

    ${watchlist.length ? `
    <div class="card">
      <div class="sec-title">👁 Watchlist Highlights</div>
      <div class="sec-sub">Companies you're keeping an eye on</div>
      ${watchlist.slice(0,4).map(w => watchlistRow(w, prices[w.ticker])).join('')}
      <button class="btn btn-outline btn-full btn-sm" style="margin-top:8px" onclick="window.__nav('screen-watchlist')">Full Watchlist →</button>
    </div>` : ''}

    <div class="card" style="background:#EEF2FF;border:2px solid #C7D2FE">
      <div style="font-size:.72rem;font-weight:900;color:#7C3AED;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">🕷️ Rocky Says</div>
      <div style="font-size:.88rem;line-height:1.65;color:#1E1B4B">${getDashboardRockyComment(holdings, watchlist, gainPct)}</div>
    </div>`;

  window.__goLearn = () => { mountGame(_session); navigate('screen-game'); };
}

function holdingRow(h, price) {
  const current = price?.price ?? h.buy_price;
  const gain = (current - h.buy_price) * h.quantity;
  const pct = (current - h.buy_price) / h.buy_price * 100;
  const cls = priceClass(pct);
  return `
    <div class="holding-card">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:2rem;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:${sectorBg(h.sector)};border-radius:12px">${h.emoji}</div>
        <div style="flex:1">
          <div style="font-weight:900;font-size:.9rem">${h.name}</div>
          <div style="font-size:.72rem;color:#9CA3AF">${h.ticker} · ${h.quantity} shares @ A$${Number(h.buy_price).toFixed(2)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:900;font-size:.95rem" class="price-${cls}">A$${(current * h.quantity).toFixed(2)}</div>
          <div class="badge-pct ${cls}">${gain >= 0 ? '+' : ''}A$${Math.abs(gain).toFixed(2)} (${pct >= 0?'+':''}${pct.toFixed(1)}%)</div>
        </div>
      </div>
    </div>`;
}

function watchlistRow(w, price) {
  const cls = priceClass(price?.change_pct);
  return `
    <div class="wl-row">
      <span style="font-size:1.8rem">${w.emoji}</span>
      <div style="flex:1">
        <div style="font-weight:800;font-size:.86rem">${w.name}</div>
        <div style="font-size:.7rem;color:#9CA3AF">${w.ticker}</div>
      </div>
      <div style="text-align:right">
        <div class="price-${cls}" style="font-size:.95rem">${price ? formatPrice(price.price, price.currency) : '—'}</div>
        ${price ? `<div class="badge-pct ${cls}">${formatChangePct(price.change_pct)}</div>` : ''}
      </div>
    </div>`;
}

function getDashboardRockyComment(holdings, watchlist, gainPct) {
  if (!holdings.length && !watchlist.length) return 'Rocky suggest: start in Research Lab! Investigate companies, add best ones to Watchlist. Then ask parent to help you invest!';
  if (!holdings.length) return `You watch ${watchlist.length} companies — very good! Next step: pick your favourite and ask parent to invest real money!`;
  if (gainPct > 15) return `Amaze amaze amaze! Your portfolio is up ${gainPct.toFixed(1)}%! Rocky is very impress! This is asymmetric risk working for you!`;
  if (gainPct > 0) return `Your portfolio is up ${gainPct.toFixed(1)}% — Rocky approve! Patience is working! Keep holding, keep watching!`;
  if (gainPct > -10) return `Small dip of ${Math.abs(gainPct).toFixed(1)}% — Rocky say: do not panic! Every great company has dips. Patient investors win in the end!`;
  return `Rocky remind you: markets always recover. Every single major crash in history recovered. Hold steady, ${Math.abs(gainPct).toFixed(1)}% down is temporary!`;
}
