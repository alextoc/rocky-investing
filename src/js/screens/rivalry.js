// Phase 1a — Sibling Rivalry Screen
import { onNavigate } from '../router.js';
import { getAllProfiles, getHoldings } from '../db.js';
import { fetchPrices } from '../prices-client.js';

let _session = null;

export function mountRivalry(session) {
  _session = session;
  onNavigate('screen-rivalry', () => renderRivalry());
}

async function renderRivalry() {
  const el = document.getElementById('screen-rivalry');
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading rivalry…</div>`;

  try {
    const profiles = await getAllProfiles();

    if (!profiles.length) {
      el.innerHTML = `<div class="card" style="text-align:center;padding:32px">
        <div style="font-size:3rem;margin-bottom:12px">🕷️</div>
        <div style="font-weight:900;margin-bottom:8px">No profiles found!</div>
        <div style="font-size:.88rem;color:#6B7280">Rocky needs players for a rivalry! Ask parent to create profiles.</div>
      </div>`;
      return;
    }

    // Fetch all holdings in parallel
    const holdingsPerProfile = await Promise.all(profiles.map(p => getHoldings(p.id)));

    // Get all unique tickers across all profiles
    const allTickers = [...new Set(holdingsPerProfile.flat().map(h => h.ticker))];
    const prices = allTickers.length ? await fetchPrices(allTickers) : {};

    // Compute portfolio stats per profile
    const stats = profiles.map((p, i) => {
      const holdings = holdingsPerProfile[i];
      let totalValue = 0, totalCost = 0;
      for (const h of holdings) {
        const price = prices[h.ticker]?.price ?? h.buy_price;
        totalValue += h.quantity * price;
        totalCost  += h.quantity * h.buy_price;
      }
      const gain    = totalValue - totalCost;
      const gainPct = totalCost > 0 ? (gain / totalCost * 100) : 0;
      return { profile: p, holdings, totalValue, totalCost, gain, gainPct };
    });

    // Find leader: by portfolio gain% (only profiles with holdings), else by stars
    const withHoldings = stats.filter(s => s.totalCost > 0);
    let leaderIdx = -1;
    if (withHoldings.length > 0) {
      const maxPct = Math.max(...withHoldings.map(s => s.gainPct));
      leaderIdx = stats.findIndex(s => s.gainPct === maxPct && s.totalCost > 0);
    }
    if (leaderIdx === -1) {
      const maxStars = Math.max(...stats.map(s => s.profile.stars));
      leaderIdx = stats.findIndex(s => s.profile.stars === maxStars);
    }

    el.innerHTML = `
      <div class="card">
        <div class="tutor-row">
          <div class="tutor-emoji">🕷️</div>
          <div class="bubble">
            <div class="bubble-tag">Rocky ⚔️ Rivalry Report</div>
            ${getRockyRivalryComment(stats, leaderIdx)}
          </div>
        </div>
      </div>

      <div class="rivalry-grid">
        ${stats.map((s, i) => rivalryCard(s, i === leaderIdx)).join('')}
      </div>

      <div class="card">
        <div class="sec-title">⭐ Stars Leaderboard</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
          ${[...stats]
              .sort((a, b) => b.profile.stars - a.profile.stars)
              .map((s, i) => `
            <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;background:${i===0?'linear-gradient(135deg,#FEF3C7,#FDE68A)':'white'};border-radius:12px;border:2px solid ${i===0?'#F59E0B':'#E0E7FF'}">
              <div style="font-size:1.5rem;width:30px;text-align:center">${i===0?'🏆':i===1?'🥈':'🥉'}</div>
              <div style="font-size:1.5rem">${s.profile.avatar_emoji}</div>
              <div style="flex:1;font-weight:900;font-size:.92rem;text-transform:capitalize">${s.profile.username}</div>
              <div style="font-weight:900;color:#D97706;font-size:.95rem">⭐ ${s.profile.stars}</div>
            </div>
          `).join('')}
        </div>
      </div>`;

  } catch (err) {
    console.error('Rivalry render error:', err);
    el.innerHTML = `<div class="card" style="text-align:center;padding:32px">
      <div style="font-size:2rem;margin-bottom:8px">😬</div>
      <div style="font-weight:900;margin-bottom:6px">Rocky had trouble loading!</div>
      <div style="font-size:.82rem;color:#6B7280">${err.message}</div>
      <button class="btn btn-outline" style="margin-top:16px" onclick="window.__nav('screen-rivalry')">Try Again</button>
    </div>`;
  }
}

function rivalryCard(stat, isLeader) {
  const { profile, holdings, totalValue, totalCost, gain, gainPct } = stat;
  const won   = gain >= 0;
  const isMe  = profile.id === _session?.profileId;
  const hasMoney = totalCost > 0;

  return `
    <div class="rivalry-card${isLeader ? ' leader' : ''}${isMe ? ' is-me' : ''}">
      ${isLeader ? `<div class="leader-crown">👑 Leading!</div>` : ''}
      <div style="text-align:center;margin-bottom:14px;padding-top:${isLeader?'12px':'0'}">
        <div style="font-size:3.2rem;margin-bottom:4px">${profile.avatar_emoji}</div>
        <div style="font-weight:900;font-size:1rem;text-transform:capitalize">
          ${profile.username}
          ${isMe ? `<span style="font-size:.68rem;background:#EEF2FF;color:var(--primary);padding:2px 7px;border-radius:8px;font-weight:900;margin-left:4px">YOU</span>` : ''}
        </div>
        <div style="font-size:.68rem;color:#9CA3AF;margin-top:2px">Ch.${profile.chapters_done ?? 0}/10</div>
      </div>

      ${hasMoney ? `
        <div style="text-align:center;background:${isLeader?'linear-gradient(135deg,#4F46E5,#7C3AED)':'#F8FAFF'};border-radius:14px;padding:13px;${isLeader?'color:white':''}">
          <div style="font-size:.6rem;font-weight:900;${isLeader?'opacity:.7':'color:#9CA3AF'}">PORTFOLIO</div>
          <div style="font-size:1.55rem;font-weight:900;margin:3px 0">A$${totalValue.toFixed(2)}</div>
          <div style="font-size:.82rem;font-weight:800;color:${isLeader?'rgba(255,255,255,.85)':won?'#10B981':'#EF4444'}">
            ${won ? '▲' : '▼'} ${won?'+':''}${gainPct.toFixed(1)}%
          </div>
        </div>
      ` : `
        <div style="text-align:center;background:#F8FAFF;border-radius:14px;padding:13px;color:#9CA3AF">
          <div style="font-size:1.2rem;margin-bottom:2px">💼</div>
          <div style="font-size:.75rem;font-weight:800">No portfolio yet</div>
        </div>
      `}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
        <div style="text-align:center;padding:9px;background:#F8FAFF;border-radius:10px;border:2px solid #E0E7FF">
          <div style="font-size:1.1rem;font-weight:900;color:var(--primary)">${holdings.length}</div>
          <div style="font-size:.6rem;font-weight:800;color:#9CA3AF">Holdings</div>
        </div>
        <div style="text-align:center;padding:9px;background:#FEF3C7;border-radius:10px;border:2px solid #FDE68A">
          <div style="font-size:1.1rem;font-weight:900;color:#D97706">⭐${profile.stars}</div>
          <div style="font-size:.6rem;font-weight:800;color:#92400E">Stars</div>
        </div>
      </div>
    </div>`;
}

function getRockyRivalryComment(stats, leaderIdx) {
  if (stats.length === 1) {
    return `Rocky see only ONE competitor! Blurt! Rivalry need TWO players! Ask parent to add sibling or friend — then the BATTLE truly begins! One-player rivalry is just… practicing alone.`;
  }
  const allNone = stats.every(s => s.totalCost === 0);
  if (allNone) {
    const top = [...stats].sort((a, b) => b.profile.stars - a.profile.stars)[0];
    return `Nobody has portfolio yet — Rocky judge by STARS for now! ${top.profile.username} leads with ${top.profile.stars} stars! But who will be FIRST to start investing and take the real lead?! GO GO GO!`;
  }
  const leader = stats[leaderIdx];
  const others = stats.filter((_, i) => i !== leaderIdx);
  const gap = leader.gainPct - Math.max(0, ...others.map(s => s.gainPct));
  if (leader.gainPct > 15) {
    return `WOW WOW WOW! ${leader.profile.username} is CRUSHING it at +${leader.gainPct.toFixed(1)}%! Absolutely amaze performance! ${others.map(s => s.profile.username).join(' and ')}, time to study harder — the gap is growing FAST!`;
  }
  if (gap < 2) {
    return `INCREDIBLY CLOSE! Rocky is on the edge of seat! ${stats.map(s => s.profile.username).join(' vs ')} — only ${Math.abs(gap).toFixed(1)}% separates them! Every single percentage point matters right now!`;
  }
  return `${leader.profile.username} is currently in the lead! Rocky say: in the long run, the most PATIENT and most DIVERSIFIED investor always wins! The race is far from over — keep going!`;
}
