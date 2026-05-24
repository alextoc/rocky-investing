import { navigate, onNavigate } from '../router.js';
import { getWatchlist, getHoldings, getPredictions, savePrediction, resolvePrediction, saveProgress } from '../db.js';
import { fetchPrices, formatPrice, formatChangePct, priceClass } from '../prices-client.js';
import { sectorLabel, sectorBg, sectorFg } from '../utils.js';
import { mountGame } from './game.js';

let _session = null;

export async function mountHome(session) {
  _session = session;
  onNavigate('screen-home', () => renderHome(session));
  await renderHome(session);
}

// ── AEDT helpers ──────────────────────────────────────────────────────────────
// Using fixed UTC+11 offset (AEDT summer). Off by 1hr in winter; fine for kids' app.
function aedtNow() {
  return new Date(Date.now() + 11 * 3600000);
}
function getWeekStartMonday() {
  const d   = aedtNow();
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
// ISO week key  e.g. "2026-W21"
function getWeekKey() {
  const d  = aedtNow();
  const th = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  th.setUTCDate(th.getUTCDate() + 4 - (th.getUTCDay() || 7));
  const yr  = th.getUTCFullYear();
  const wn  = Math.ceil(((th - new Date(Date.UTC(yr, 0, 1))) / 86400000 + 1) / 7);
  return `${yr}-W${wn}`;
}
function isMondayAEDT() { return aedtNow().getUTCDay() === 1; }

// prediction window status
// 'predict'  = Monday before 10am AEDT (open for predictions)
// 'score'    = Friday 4pm AEDT through Sunday (scoring time)
// 'locked'   = everything else (Tue–Fri 4pm)
function getWeekStatus() {
  const d   = aedtNow();
  const day = d.getUTCDay();
  const hr  = d.getUTCHours();
  if (day === 1 && hr < 10) return 'predict';
  if ((day === 5 && hr >= 16) || day === 6 || day === 0) return 'score';
  return 'locked';
}

// ── Phase 1b: weekly baseline (localStorage) ──────────────────────────────────
function getWeeklyBaseline() {
  try {
    const raw = localStorage.getItem('weeklyBaseline');
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d.weekKey === getWeekKey() ? d.prices : null;
  } catch { return null; }
}
function saveWeeklyBaseline(prices, holdings) {
  const snap = {};
  for (const h of holdings) {
    if (prices[h.ticker]?.price) snap[h.ticker] = prices[h.ticker].price;
  }
  if (!Object.keys(snap).length) return;
  localStorage.setItem('weeklyBaseline', JSON.stringify({ weekKey: getWeekKey(), prices: snap }));
}

// ── Phase 2: score predictions ────────────────────────────────────────────────
async function scorePredictions(profileId, unresolved, prices) {
  let starsEarned = 0;
  for (const pred of unresolved) {
    const curr = prices[pred.ticker]?.price;
    if (!curr || !pred.price_at_prediction) continue;
    const actual   = curr >= pred.price_at_prediction ? 'up' : 'down';
    const correct  = actual === pred.direction;
    const stars    = correct ? 2 : 0;
    starsEarned   += stars;
    await resolvePrediction(pred.id, { correct, starsAwarded: stars });
  }
  return starsEarned;
}

// ── renderHome ────────────────────────────────────────────────────────────────
async function renderHome(session) {
  const el      = document.getElementById('screen-home');
  const chapDone = session.chaptersDone ?? 0;

  if (chapDone >= 10) {
    // ── FULL DASHBOARD ────────────────────────────────────────────────────────
    el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading your dashboard…</div>`;

    const weekStart = getWeekStartMonday();
    const [holdings, watchlist, predictions] = await Promise.all([
      getHoldings(session.profileId),
      getWatchlist(session.profileId),
      getPredictions(session.profileId, weekStart),
    ]);

    const allTickers = [...new Set([
      ...holdings.map(h => h.ticker),
      ...watchlist.map(w => w.ticker),
    ])];
    const prices = allTickers.length ? await fetchPrices(allTickers) : {};

    // Phase 1b: save Monday baseline
    if (isMondayAEDT()) saveWeeklyBaseline(prices, holdings);

    // Phase 2: auto-score on Friday/weekend
    let resolvedPreds = predictions;
    const weekStatus  = getWeekStatus();
    if (weekStatus === 'score') {
      const unresolved = predictions.filter(p => !p.resolved);
      if (unresolved.length) {
        const earned = await scorePredictions(session.profileId, unresolved, prices);
        if (earned > 0) {
          session.stars = (session.stars ?? 0) + earned;
          await saveProgress(session.profileId, {
            stars:           session.stars,
            chaptersDone:    session.chaptersDone,
            customCompanies: session.customCompanies,
          });
        }
        resolvedPreds = await getPredictions(session.profileId, weekStart);
      }
    }

    // Phase 3: set portfolio context for Rocky AI
    window.__portfolioContext = buildPortfolioContext(session, holdings, prices);

    renderDashboard(el, session, holdings, watchlist, prices, resolvedPreds, weekStatus, weekStart);
  } else {
    // ── ACADEMY HOME ──────────────────────────────────────────────────────────
    renderAcademyHome(el, session);
  }
}

function buildPortfolioContext(session, holdings, prices) {
  const lines = [
    `Kid: ${session.username}, chapters: ${session.chaptersDone}/10, stars: ${session.stars}.`,
  ];
  if (holdings.length) {
    const hLines = holdings.map(h => {
      const p   = prices[h.ticker]?.price ?? h.buy_price;
      const pct = ((p - h.buy_price) / h.buy_price * 100).toFixed(1);
      return `${h.name} (${h.ticker}) ${pct}%`;
    });
    lines.push('Holdings: ' + hLines.join(', ') + '.');
  }
  return lines.join(' ');
}

// ── Academy Home (chapters < 10) ──────────────────────────────────────────────
function renderAcademyHome(el, session) {
  const tips = [
    "Rocky say: best time to invest was long time ago. Second best time is right now! Start early, win big!",
    "Blurt! Spread money across 8–12 different sectors. If one falls, the others carry you!",
    "Amaze amaze amaze — $100 growing 10% per year becomes $1,745 after 30 years! Compounding is magic!",
    "Rocky observe: most successful investors is not the smartest — is the most PATIENT. Patience wins!",
    "Question: before you invest, ask — do YOU use this company? Does everyone need it? Yes? Good sign!",
  ];
  const tip  = tips[Math.floor(Math.random() * tips.length)];
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
        <button class="action-btn" onclick="window.__nav('screen-rivalry')">
          <span class="ab-icon">⚔️</span>
          <span class="ab-title">Rivalry</span>
          <span class="ab-sub">See who's winning!</span>
        </button>
      </div>
    </div>
    <div class="card" style="background:linear-gradient(135deg,#EEF2FF,#F5F3FF);border:2px solid #C7D2FE">
      <div style="font-size:.72rem;font-weight:900;color:#7C3AED;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">🕷️ Rocky's Tip</div>
      <div style="font-size:.9rem;line-height:1.65;color:#1E1B4B">${tip}</div>
    </div>`;

  window.__goLearn = () => { mountGame(_session); navigate('screen-game'); };
}

// ── Full dashboard (chapters >= 10) ───────────────────────────────────────────
function renderDashboard(el, session, holdings, watchlist, prices, predictions, weekStatus, weekStart) {
  let totalValue = 0, totalCost = 0;
  for (const h of holdings) {
    const p = prices[h.ticker]?.price ?? h.buy_price;
    totalValue += h.quantity * p;
    totalCost  += h.quantity * h.buy_price;
  }
  const gain    = totalValue - totalCost;
  const gainPct = totalCost > 0 ? (gain / totalCost * 100) : 0;
  const won     = gain >= 0;

  const weeklyCard     = buildWeeklyReportCard(holdings, prices);
  const predictionsCard = buildPredictionsCard(session, holdings, prices, predictions, weekStatus, weekStart);

  el.innerHTML = `
    <div class="portfolio-total">
      <div class="port-total-label">💼 ${session.username}'s Portfolio</div>
      <div class="port-total-val">A$${totalValue.toFixed(2)}</div>
      <div class="port-total-gain">${won ? '▲' : '▼'} ${won?'+':''}A$${Math.abs(gain).toFixed(2)} (${won?'+':''}${gainPct.toFixed(1)}%) since purchase</div>
    </div>

    ${weeklyCard}

    ${predictionsCard}

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

  // Prediction save handler
  window.__savePred = async (ticker, name, emoji, direction, price) => {
    await savePrediction(session.profileId, {
      ticker, name, emoji, direction,
      priceAtPrediction: price,
      weekStart,
    });
    await renderHome(session); // refresh with new state
  };
}

// ── Phase 1b: Weekly Rocky Report ────────────────────────────────────────────
function buildWeeklyReportCard(holdings, prices) {
  if (!holdings.length) return '';
  const baseline = getWeeklyBaseline();
  if (!baseline) return ''; // no baseline yet for this week

  const rows = [];
  let totalChg = 0, count = 0;

  for (const h of holdings) {
    const base = baseline[h.ticker];
    const curr = prices[h.ticker]?.price;
    if (!base || !curr) continue;
    const chg = (curr - base) / base * 100;
    totalChg += chg; count++;
    rows.push({ name: h.name, ticker: h.ticker, emoji: h.emoji, chg });
  }

  if (!rows.length) return '';
  const avg = totalChg / count;

  return `
    <div class="card" style="background:linear-gradient(135deg,#F0FDF4,#ECFDF5);border:2px solid #BBF7D0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div class="sec-title" style="margin-bottom:2px">📅 This Week</div>
          <div style="font-size:.75rem;color:#6B7280;font-weight:700">Change since Monday's open</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:1.7rem;font-weight:900;color:${avg>=0?'#10B981':'#EF4444'}">${avg>=0?'+':''}${avg.toFixed(1)}%</div>
          <div style="font-size:.68rem;font-weight:800;color:#9CA3AF">avg across holdings</div>
        </div>
      </div>
      ${rows.map(r => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #BBF7D0">
          <span style="font-size:1.4rem">${r.emoji}</span>
          <span style="flex:1;font-weight:800;font-size:.86rem">${r.name}</span>
          <span class="badge-pct ${r.chg>=0?'up':'dn'}">${r.chg>=0?'+':''}${r.chg.toFixed(1)}%</span>
        </div>
      `).join('')}
      <div style="margin-top:10px;font-size:.82rem;color:#065F46;font-weight:700;line-height:1.5">
        🕷️ ${getWeeklyRockyComment(avg, rows)}
      </div>
    </div>`;
}

function getWeeklyRockyComment(avg, rows) {
  const best = rows.reduce((a, b) => a.chg > b.chg ? a : b);
  const wrst = rows.reduce((a, b) => a.chg < b.chg ? a : b);
  if (avg > 5)  return `AMAZE week! Up ${avg.toFixed(1)}% overall — ${best.name} is leading the charge! Rocky is very impress!`;
  if (avg > 0)  return `Good week! Up ${avg.toFixed(1)}% — ${best.name} was the star performer. Patience is paying off!`;
  if (avg > -5) return `Small dip of ${Math.abs(avg).toFixed(1)}% — Rocky say: this is completely normal! Every great company has dips. Hold steady!`;
  return `Tough week — down ${Math.abs(avg).toFixed(1)}%. Rocky remind you: every single market crash in history has recovered. Patient investors win!`;
}

// ── Phase 2: Predictions card ─────────────────────────────────────────────────
function buildPredictionsCard(session, holdings, prices, predictions, weekStatus, weekStart) {
  if (!holdings.length) return '';

  const resolved   = predictions.filter(p => p.resolved);
  const unresolved = predictions.filter(p => !p.resolved);
  const allDone    = predictions.length > 0 && unresolved.length === 0;

  // ── Results view (scored predictions)
  if (allDone && weekStatus === 'score') {
    const correct    = resolved.filter(p => p.correct).length;
    const total      = resolved.length;
    const starsTotal = resolved.reduce((s, p) => s + (p.stars_awarded ?? 0), 0);
    return `
      <div class="card" style="background:linear-gradient(135deg,#FEF3C7,#FDE68A);border:2px solid #F59E0B">
        <div style="font-size:.72rem;font-weight:900;color:#92400E;letter-spacing:1px;margin-bottom:6px">🏆 PREDICTION RESULTS — THIS WEEK</div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
          <div style="text-align:center">
            <div style="font-size:2.2rem;font-weight:900;color:#92400E">${correct}/${total}</div>
            <div style="font-size:.7rem;font-weight:800;color:#B45309">correct</div>
          </div>
          <div style="flex:1;font-size:.9rem;font-weight:800;color:#78350F">
            ${correct === total ? `Perfect score! 🎉 Rocky is incredibly amaze!` :
              correct > total / 2 ? `Nice work! ${starsTotal} stars earned! You beat the odds!` :
              `Good try! Keep watching the markets — you'll get better each week!`}
          </div>
          <div style="text-align:center;background:white;border-radius:12px;padding:8px 12px">
            <div style="font-size:1.4rem;font-weight:900;color:#F59E0B">⭐${starsTotal}</div>
            <div style="font-size:.65rem;font-weight:800;color:#9CA3AF">earned</div>
          </div>
        </div>
        ${resolved.map(p => `
          <div class="pred-result-row ${p.correct ? 'correct' : 'wrong'}">
            <span style="font-size:1.3rem">${p.emoji ?? '📈'}</span>
            <span style="flex:1;font-weight:800;font-size:.84rem">${p.name ?? p.ticker}</span>
            <span style="font-size:.82rem;font-weight:900;margin-right:6px">${p.direction === 'up' ? '↑ Up' : '↓ Down'}</span>
            <span style="font-size:1.1rem">${p.correct ? '✅' : '❌'}</span>
          </div>
        `).join('')}
      </div>`;
  }

  // ── Locked view (predictions made, waiting for Friday)
  if (predictions.length > 0 && weekStatus === 'locked') {
    return `
      <div class="card" style="background:linear-gradient(135deg,#EEF2FF,#F5F3FF);border:2px solid #C7D2FE">
        <div style="font-size:.72rem;font-weight:900;color:#4338CA;letter-spacing:1px;margin-bottom:6px">🔒 PREDICTIONS LOCKED</div>
        <div style="font-size:.9rem;font-weight:800;color:#1E1B4B;margin-bottom:12px">
          Rocky is watching the markets! Results revealed Friday 4pm AEDT 🕵️
        </div>
        ${predictions.map(p => `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:white;border-radius:10px;margin-bottom:7px;border:2px solid ${p.direction==='up'?'#BBF7D0':'#FCA5A5'}">
            <span style="font-size:1.3rem">${p.emoji ?? '📈'}</span>
            <span style="flex:1;font-weight:800;font-size:.84rem">${p.name ?? p.ticker}</span>
            <span style="font-size:.88rem;font-weight:900;color:${p.direction==='up'?'#10B981':'#EF4444'}">${p.direction==='up'?'↑ Going UP':'↓ Going DOWN'}</span>
          </div>
        `).join('')}
      </div>`;
  }

  // ── Predict view (Monday before 10am, or no predictions yet for this week on predict days)
  if (weekStatus === 'predict') {
    // Map existing predictions for quick lookup
    const existingMap = {};
    for (const p of predictions) existingMap[p.ticker] = p.direction;

    return `
      <div class="card" style="border:2px solid #C7D2FE">
        <div style="font-size:.72rem;font-weight:900;color:#4338CA;letter-spacing:1px;margin-bottom:4px">🎯 MONDAY PREDICTIONS</div>
        <div style="font-size:.86rem;color:#6B7280;font-weight:700;margin-bottom:14px">
          Will each stock go UP or DOWN this week? Predict before 10am to earn ⭐ stars!
        </div>
        ${holdings.map(h => {
          const curr = prices[h.ticker]?.price;
          const vote = existingMap[h.ticker];
          return `
            <div class="pred-row${vote==='up'?' voted-up':vote==='down'?' voted-down':''}">
              <span style="font-size:1.4rem">${h.emoji}</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:900;font-size:.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.name}</div>
                <div style="font-size:.7rem;color:#9CA3AF">${curr ? `A$${curr.toFixed(2)} now` : h.ticker}</div>
              </div>
              <div class="pred-btns">
                <button class="pred-btn up${vote==='up'?' active':''}"
                  onclick="window.__savePred('${h.ticker}','${h.name.replace(/'/g,"\\'")}','${h.emoji}','up',${curr ?? h.buy_price})">
                  ↑ Up
                </button>
                <button class="pred-btn down${vote==='down'?' active':''}"
                  onclick="window.__savePred('${h.ticker}','${h.name.replace(/'/g,"\\'")}','${h.emoji}','down',${curr ?? h.buy_price})">
                  ↓ Down
                </button>
              </div>
            </div>`;
        }).join('')}
        <div style="font-size:.78rem;color:#9CA3AF;margin-top:8px;font-weight:700">🔒 Predictions lock Monday 10am AEDT · ⭐ 2 stars per correct prediction</div>
      </div>`;
  }

  return ''; // no card for other days with no predictions
}

// ── Holding row (dashboard mini view) ────────────────────────────────────────
function holdingRow(h, price) {
  const current = price?.price ?? h.buy_price;
  const gain    = (current - h.buy_price) * h.quantity;
  const pct     = (current - h.buy_price) / h.buy_price * 100;
  const cls     = priceClass(pct);
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
  if (gainPct > 0)  return `Your portfolio is up ${gainPct.toFixed(1)}% — Rocky approve! Patience is working! Keep holding, keep watching!`;
  if (gainPct > -10) return `Small dip of ${Math.abs(gainPct).toFixed(1)}% — Rocky say: do not panic! Every great company has dips. Patient investors win in the end!`;
  return `Rocky remind you: markets always recover. Every single major crash in history recovered. Hold steady, ${Math.abs(gainPct).toFixed(1)}% down is temporary!`;
}
