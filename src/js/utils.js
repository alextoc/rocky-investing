// ── SHARED UTILITIES ──────────────────────────────────────────────────────────

export const $ = id => document.getElementById(id);
export const qs = (sel, root = document) => root.querySelectorAll(sel);

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export function toast(msg, duration = 2800) {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export function starPop(n, anchor) {
  const r = anchor?.getBoundingClientRect() ?? { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 };
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'star-pop';
    el.textContent = '⭐';
    el.style.left = (r.left + r.width/2 + (Math.random()-.5)*60) + 'px';
    el.style.top  = (r.top  + r.height/2) + 'px';
    el.style.animationDelay = (i * .1) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }
}

export function confetti() {
  const cols = ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];
  const wrap = document.createElement('div');
  wrap.className = 'confetti-wrap';
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.className = 'cp';
    p.style.left = Math.random()*100 + '%';
    p.style.background = cols[Math.floor(Math.random()*cols.length)];
    p.style.animationDuration = (1.5 + Math.random()*2.2) + 's';
    p.style.animationDelay = (Math.random()*.6) + 's';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3500);
}

export function shuffle(arr) { return [...arr].sort(() => Math.random() - .5); }

// Sector helpers
export function sectorLabel(s) {
  return { toys:'🎪 Toys', food:'🍎 Food', tech:'💻 Tech', retail:'🛒 Retail',
    energy:'⚡ Energy', property:'🏠 Property', finance:'💰 Finance',
    entertainment:'🎬 Entertainment', etf:'📦 ETF', other:'🔍 My Research' }[s] || s;
}
export function sectorBg(s) {
  return { toys:'#EEF2FF', food:'#ECFDF5', tech:'#F5F3FF', retail:'#FEF3C7',
    energy:'#FEF2F2', property:'#F0F9FF', finance:'#FFFBEB',
    entertainment:'#FDF4FF', etf:'#F8FAFC', other:'#F8FAFF' }[s] || '#F8FAFF';
}
export function sectorFg(s) {
  return { toys:'#4338CA', food:'#059669', tech:'#7C3AED', retail:'#D97706',
    energy:'#DC2626', property:'#0284C7', finance:'#B45309',
    entertainment:'#9333EA', etf:'#475569', other:'#6B7280' }[s] || '#6B7280';
}
export function getDivScore(pickedIds, arr) {
  const sectors = pickedIds.map(id => arr.find(c => c.id === id)?.sector).filter(Boolean);
  return { count: new Set(sectors).size, sectors: [...new Set(sectors)] };
}
