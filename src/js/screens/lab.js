import { RC } from '../data/companies.js';
import { TICKER_MAP, lookupTicker } from '../data/tickers.js';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../db.js';
import { sectorLabel, sectorBg, sectorFg, toast } from '../utils.js';
import { onNavigate } from '../router.js';

let _session   = null;
let _labCat    = 'all';
let _labOpen   = {};
let _watching  = new Set();
let _custom    = [];
let _addState  = null;

const ADD_Q = [
  { q:'Does your family actually USE this company?',     yes:'You and your family use and trust it 💙',          no:"You don't actually use this company yourself 🤔" },
  { q:'Do LOTS of people you know use it?',             yes:'Very popular — lots of people love it ❤️',         no:'Not many people around you use it yet 🤏' },
  { q:'Is it GROWING bigger and more popular?',         yes:'Growing bigger and more popular every year 📈',    no:'Not growing much right now 🐢' },
  { q:'Do people NEED it, or just want it?',            yes:'People genuinely NEED it — essential! ⚡',         no:'Nice to have, but not a real necessity 🛍️' },
  { q:'Is it HARD for competitors to copy or beat?',    yes:'Strong moat — hard to replace! 🏰',               no:'Competitors could probably copy or beat it 😬' },
];
const ADD_EMOJIS = ['🏢','🍕','🏪','🎮','🚗','🍦','⚽','🎬','🏥','👗','📱','🎨','🏠','🍜','✈️','🎸'];

export function mountLab(session) {
  _session = session;
  _labCat  = 'all';
  onNavigate('screen-lab', () => renderLab());
}

async function renderLab() {
  const el = document.getElementById('screen-lab');
  if ((_session.chaptersDone ?? 0) < 3) {
    el.innerHTML = `
      <div class="unlock-gate">
        <div class="lock-icon">🔬</div>
        <h3>Research Lab unlocks after Chapter 3!</h3>
        <p>Complete the first 3 chapters with Rocky, then you'll learn how to read company clues and investigate real companies!</p>
      </div>`;
    return;
  }
  // Load watchlist IDs
  const wl = await getWatchlist(_session.profileId);
  _watching = new Set(wl.map(w => w.ticker));
  _custom   = _session.customCompanies ?? [];
  doRenderLab();
}

function doRenderLab() {
  const el = document.getElementById('screen-lab');
  const chapDone = _session.chaptersDone ?? 0;
  const availableRC = RC.filter(c => c.unlock_chapter <= chapDone);

  const cats = [
    { k:'all',    label:'All 🌐' },
    { k:'aus',    label:'🇦🇺 Australian' },
    { k:'global', label:'🌍 Global' },
    { k:'etf',    label:'📦 ETFs', locked: chapDone < 9 },
    { k:'custom', label:`⭐ Mine${_custom.length ? ` (${_custom.length})` : ''}` },
  ];

  const filtered = _labCat === 'custom' ? _custom
    : _labCat === 'all'   ? availableRC
    : availableRC.filter(c => c.cat === _labCat);

  // Locked companies (not yet unlocked)
  const lockedCount = RC.filter(c => c.unlock_chapter > chapDone && c.cat !== 'etf').length;
  const nextUnlock  = [...new Set(RC.filter(c => c.unlock_chapter > chapDone).map(c => c.unlock_chapter))].sort()[0];

  el.innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Welcome to <strong>Rocky's Research Lab!</strong> 🔬 Click any company to see clues and Rocky's analysis.
          Add to Watchlist to track it! ${lockedCount > 0 ? `<br><br>⭐ <strong>${lockedCount} more companies</strong> unlock as you complete chapters!` : 'You have unlocked all companies! Amaze amaze amaze!'}
        </div>
      </div>
    </div>

    ${lockedCount > 0 ? `
    <div style="padding:12px 16px;background:#FEF3C7;border-radius:14px;border:2px solid #FDE68A;font-size:.82rem;font-weight:800;color:#92400E">
      🔒 ${lockedCount} companies unlock at Chapter ${nextUnlock} — keep learning with Rocky!
    </div>` : ''}

    <div class="card" style="padding:18px">
      <div class="cat-row">
        ${cats.map(c => `<button class="cat-pill ${_labCat===c.k?'on':''}" onclick="window.__setLabCat('${c.k}')" ${c.locked?'disabled style="opacity:.5"':''}>${c.label}</button>`).join('')}
      </div>

      ${_labCat === 'custom' ? renderCustomTab() : `
      <div class="rc-grid">
        ${filtered.length ? filtered.map(c => rcCard(c)).join('') : `<div style="grid-column:1/-1;color:#9CA3AF;text-align:center;padding:24px;font-weight:800">No companies in this category yet — complete more chapters to unlock!</div>`}
      </div>
      <div style="margin-top:16px;padding-top:14px;border-top:2px solid #E0E7FF;text-align:center">
        <button class="btn btn-outline" onclick="window.__goAddCompany()">🔍 Research Your Own Company</button>
        <div style="font-size:.75rem;color:#9CA3AF;margin-top:6px">Know a great company not on this list? Rocky want to investigate!</div>
      </div>`}
    </div>`;

  window.__setLabCat    = k => { _labCat = k; doRenderLab(); };
  window.__toggleLabOpen = id => { _labOpen[id] = !_labOpen[id]; doRenderLab(); };
  window.__toggleWatch  = async (ticker, name, emoji, sector, e) => {
    e?.stopPropagation();
    if (_watching.has(ticker)) {
      await removeFromWatchlist(_session.profileId, ticker);
      _watching.delete(ticker);
      toast('🕷️ Removed from watchlist.');
    } else {
      await addToWatchlist(_session.profileId, { ticker, name, emoji, sector });
      _watching.add(ticker);
      toast('📊 Added to Watchlist! Rocky is pleased!');
    }
    doRenderLab();
  };
  window.__goAddCompany = () => { _addState = { step:0, name:'', ticker:'', emoji:'🏢', answers:[] }; renderAddCompany(); };
  window.__deleteCustom = id => {
    _custom = _custom.filter(c => c.id !== id);
    _session.customCompanies = _custom;
    import('../db.js').then(m => m.saveProgress(_session.profileId, { stars: _session.stars, chaptersDone: _session.chaptersDone, customCompanies: _custom }));
    doRenderLab();
  };
}

function renderCustomTab() {
  return `
    <button class="btn btn-primary btn-full" style="margin-bottom:14px" onclick="window.__goAddCompany()">🔍 Research Your Own Company +</button>
    ${_custom.length === 0
      ? `<div style="text-align:center;padding:24px;color:#9CA3AF;font-weight:800">No custom companies yet!<br><span style="font-size:.8rem;font-weight:600">Click above to research any company you know!</span></div>`
      : `<div class="rc-grid">${_custom.map(c => `
          <div style="position:relative">
            ${rcCard(c)}
            <button onclick="if(confirm('Remove ${c.name}?'))window.__deleteCustom('${c.id}')" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.08);border:none;border-radius:6px;cursor:pointer;font-size:.7rem;padding:3px 7px;color:#6B7280;font-weight:800;z-index:10">✕</button>
          </div>`).join('')}</div>`}`;
}

function rcCard(c) {
  const watching = _watching.has(c.ticker);
  const open     = _labOpen[c.id];
  const greens   = c.clues.filter(x => x.g).length;
  const total    = c.clues.length;
  const stars_html = '⭐'.repeat(c.rating) + '<span style="opacity:.25">' + '⭐'.repeat(5-c.rating) + '</span>';

  return `<div class="rc-card ${watching?'watching':''}" id="rc-${c.id}">
    <div class="rc-head" onclick="window.__toggleLabOpen('${c.id}')">
      <div class="rc-icon" style="background:${c.bg}">${c.emoji}</div>
      <div style="flex:1">
        <div class="co-name">${c.name}</div>
        <div class="rc-ticker">${c.ticker} <span style="display:inline-block;font-size:.6rem;font-weight:800;padding:1px 6px;border-radius:8px;background:${sectorBg(c.sector)};color:${sectorFg(c.sector)};vertical-align:middle">${sectorLabel(c.sector)}</span></div>
        <div class="co-tag">${c.tag}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div style="font-size:.7rem;font-weight:800;padding:3px 8px;border-radius:20px;background:${greens/total>=0.7?'#D1FAE5':greens/total>=0.5?'#FEF3C7':'#FEE2E2'};color:${greens/total>=0.7?'#065F46':greens/total>=0.5?'#92400E':'#991B1B'}">${greens}/${total} green</div>
        <div style="font-size:.78rem;color:#9CA3AF;transition:transform .2s;transform:${open?'rotate(180deg)':'rotate(0)'}">▼</div>
      </div>
    </div>
    ${open ? `<div class="rc-body">
      <div class="rc-intro">"${c.intro}"</div>
      <div class="co-clues" style="padding:0;margin-bottom:8px">
        ${c.clues.map(cl => `<div class="clue ${cl.g?'g':'b'}"><span>${cl.g?'✅':'❌'}</span><span>${cl.t}</span></div>`).join('')}
      </div>
      <div class="rc-verdict">🕷️ ${c.verdict}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:.78rem;font-weight:800;color:#6B7280">Rocky's Rating:</div>
        <div>${stars_html}</div>
      </div>
      <button class="btn btn-full btn-sm ${watching?'btn-outline':'btn-green'}" onclick="window.__toggleWatch('${c.ticker}','${c.name.replace(/'/g,"\\'")}','${c.emoji}','${c.sector}',event)">
        ${watching ? '👁 On Watchlist — Remove' : '+ Add to Watchlist 📊'}
      </button>
    </div>` : ''}
  </div>`;
}

// ── ADD CUSTOM COMPANY FLOW ───────────────────────────────────────────────────
function renderAddCompany() {
  const el = document.getElementById('screen-lab');
  if (!_addState) return;

  if (_addState.step === 0) {
    el.innerHTML = `
      <div class="card">
        <div class="tutor-row">
          <div class="tutor-emoji">🕷️</div>
          <div class="bubble">
            <div class="bubble-tag">Rocky 🪨</div>
            Blurt! ${_session.username} want to research own company?! Rocky is VERY excite! Tell Rocky — what company you thinking about? Rocky ask five questions and give verdict!
          </div>
        </div>
      </div>
      <div class="card">
        <div class="sec-title">🔍 What Company?</div>
        <div style="margin-bottom:14px">
          <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Company Name *</label>
          <input id="add-name" class="name-inp" style="text-align:left;font-size:.95rem" type="text" placeholder="e.g. Lego, Spotify, Bunnings…" maxlength="40" value="${_addState.name}" oninput="_addState.name=this.value"/>
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Ticker (Rocky will try to find it!)</label>
          <div style="display:flex;gap:8px">
            <input id="add-ticker" class="name-inp" style="text-align:left;font-size:.95rem" type="text" placeholder="Leave blank — Rocky will look it up!" maxlength="12" value="${_addState.ticker}" oninput="_addState.ticker=this.value.toUpperCase()"/>
            <button class="btn btn-primary btn-sm" onclick="window.__addFindTicker()" style="white-space:nowrap">🔍 Find</button>
          </div>
          <div id="add-ticker-result"></div>
        </div>
        <div>
          <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:8px">Pick an emoji</label>
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            ${ADD_EMOJIS.map(e => `<button onclick="_addState.emoji='${e}';document.querySelectorAll('.add-emoji-btn').forEach(b=>b.style.borderColor=b.dataset.e==='${e}'?'var(--primary)':'#E0E7FF');this.style.borderColor='var(--primary)'" class="add-emoji-btn" data-e="${e}" style="width:42px;height:42px;border-radius:10px;border:2.5px solid ${_addState.emoji===e?'var(--primary)':'#E0E7FF'};background:${_addState.emoji===e?'#EEF2FF':'white'};font-size:1.4rem;cursor:pointer">${e}</button>`).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-primary btn-lg btn-full" onclick="window.__addStartInterview()">🕷️ Start Rocky's Interview →</button>
      <button class="btn btn-outline btn-full" onclick="doRenderLab()">← Back to Research Lab</button>`;

    window.__addFindTicker = async () => {
      const name = document.getElementById('add-name').value.trim() || _addState.ticker;
      if (!name) return;
      const res = document.getElementById('add-ticker-result');
      const local = lookupTicker(name);
      if (local?.private) {
        res.innerHTML = `<div class="ticker-result private" style="margin-top:8px">⚠️ ${name} appears to be a <strong>private company</strong>! ${local.note || ''}<br>Rocky say: you can still research it — but you cannot buy shares yet!</div>`;
        _addState.ticker = '';
        return;
      }
      if (local?.ticker) {
        _addState.ticker = local.ticker;
        res.innerHTML = `<div class="ticker-result found" style="margin-top:8px">✅ Found: <strong>${local.ticker}</strong> on ${local.exchange}!</div>`;
        document.getElementById('add-ticker').value = local.ticker;
        return;
      }
      try {
        const r   = await fetch(`/api/ticker-search?q=${encodeURIComponent(name)}`);
        const data = await r.json();
        if (data.found) {
          _addState.ticker = data.ticker;
          res.innerHTML = `<div class="ticker-result found" style="margin-top:8px">✅ Found: <strong>${data.ticker}</strong> — ${data.name}!</div>`;
          document.getElementById('add-ticker').value = data.ticker;
        } else {
          res.innerHTML = `<div class="ticker-result private" style="margin-top:8px">🤔 Rocky cannot find a stock ticker for this. It may be private or not yet listed!</div>`;
        }
      } catch { res.innerHTML = `<div class="ticker-result unknown" style="margin-top:8px">Could not search — enter ticker manually if you know it.</div>`; }
    };
    window.__addStartInterview = () => {
      const name = (document.getElementById('add-name').value || _addState.name).trim();
      if (!name) { document.getElementById('add-name').style.borderColor = '#EF4444'; return; }
      _addState.name = name; _addState.step = 1;
      renderAddCompany();
    };

  } else if (_addState.step <= ADD_Q.length) {
    const q   = ADD_Q[_addState.step - 1];
    const pct = Math.round((_addState.step-1) / ADD_Q.length * 100);
    el.innerHTML = `
      <div class="card">
        <div class="tutor-row">
          <div class="tutor-emoji">🕷️</div>
          <div class="bubble">
            <div class="bubble-tag">Rocky 🪨 — Question ${_addState.step} of ${ADD_Q.length}</div>
            Rocky investigating <strong>${_addState.name}</strong>!<br><br><strong>${q.q}</strong>
          </div>
        </div>
      </div>
      <div class="card">
        <div style="height:8px;background:#E0E7FF;border-radius:8px;overflow:hidden;margin-bottom:18px">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--primary),var(--purple));border-radius:8px;transition:width .5s"></div>
        </div>
        ${_addState.answers.length > 0 ? `
        <div style="font-size:.78rem;font-weight:800;color:#9CA3AF;margin-bottom:8px">Rocky's notes so far:</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:18px">
          ${_addState.answers.map((a,i)=>`<div style="display:flex;gap:7px;align-items:flex-start;padding:7px 10px;border-radius:8px;font-size:.78rem;font-weight:700;background:${a?'#D1FAE5':'#FEE2E2'};color:${a?'#065F46':'#991B1B'}"><span>${a?'✅':'❌'}</span><span>${a?ADD_Q[i].yes:ADD_Q[i].no}</span></div>`).join('')}
        </div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:13px">
          <button class="btn btn-green btn-lg" onclick="window.__addAns(true)">✅ Yes!</button>
          <button class="btn btn-lg" onclick="window.__addAns(false)" style="background:white;color:#DC2626;border:2.5px solid #DC2626;font-family:inherit;font-weight:800;font-size:1rem;border-radius:12px;cursor:pointer">❌ No</button>
        </div>
      </div>`;
    window.__addAns = yes => { _addState.answers.push(yes); _addState.step++; renderAddCompany(); };

  } else {
    // Results
    const score  = _addState.answers.filter(Boolean).length;
    const clues  = ADD_Q.map((q,i) => ({ t: _addState.answers[i] ? q.yes : q.no, g: _addState.answers[i] }));
    const rating = score>=5?5:score>=4?4:score>=3?3:score>=2?2:1;
    const verdicts = {
      5:`Amaze amaze amaze!! ${_addState.name} is extraordinary — all five green clues! Rocky say: add to watchlist right now!`,
      4:`Blurt! ${_addState.name} very strong — four green clues. Rocky is impress! Worth watching carefully.`,
      3:`${_addState.name} is mixed — three green, two red. Is okay but not amazing. Watch carefully before committing.`,
      2:`Only two green clues for ${_addState.name}. Rocky is cautious. Maybe watch and wait.`,
      1:`Rocky is honest: ${_addState.name} has mostly red clues right now. Maybe watch and wait before investing.`,
    };
    el.innerHTML = `
      <div class="card">
        <div class="tutor-row">
          <div class="tutor-emoji">🕷️</div>
          <div class="bubble"><div class="bubble-tag">Rocky 🪨 — Verdict!</div>Rocky finish investigating <strong>${_addState.name}</strong>! Here is what Rocky found:</div>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
          <div style="font-size:2.6rem;width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:#F8FAFF;border-radius:14px;border:2px solid #E0E7FF">${_addState.emoji}</div>
          <div>
            <div style="font-weight:900;font-size:1.05rem">${_addState.name}</div>
            ${_addState.ticker ? `<div style="font-size:.72rem;color:#9CA3AF;font-weight:900;margin-top:2px">${_addState.ticker}</div>` : ''}
            <div style="margin-top:4px">${'⭐'.repeat(rating)}<span style="opacity:.2">${'⭐'.repeat(5-rating)}</span></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:12px">
          ${clues.map(cl=>`<div class="clue ${cl.g?'g':'b'}"><span>${cl.g?'✅':'❌'}</span><span>${cl.t}</span></div>`).join('')}
        </div>
        <div class="rc-verdict">🕷️ ${verdicts[score]||verdicts[1]}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
          <button class="btn btn-green btn-full" onclick="window.__addSaveWatch()">💾 Save & Watch!</button>
          <button class="btn btn-outline btn-full" onclick="doRenderLab()">Back to Lab</button>
        </div>
        <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="window.__goAddCompany()">🔄 Research Another</button>
      </div>`;

    window.__addSaveWatch = async () => {
      const newCo = {
        id: 'custom_' + Date.now(), name: _addState.name, ticker: _addState.ticker || '—',
        emoji: _addState.emoji, col:'#6B7280', bg:'#F8FAFF', cat:'custom', sector:'other',
        tag:`Researched by ${_session.username}!`,
        intro:`${_addState.name} was researched by ${_session.username} using Rocky's five-question method.`,
        clues, verdict: verdicts[score]||verdicts[1], rating, unlock_chapter: 0,
      };
      _custom.push(newCo);
      _session.customCompanies = _custom;
      await import('../db.js').then(m => m.saveProgress(_session.profileId, { stars: _session.stars, chaptersDone: _session.chaptersDone, customCompanies: _custom }));
      if (newCo.ticker && newCo.ticker !== '—') {
        await addToWatchlist(_session.profileId, { ticker: newCo.ticker, name: newCo.name, emoji: newCo.emoji, sector: 'other' });
      }
      toast(`🕷️ ${newCo.name} saved to Research Lab!`);
      _labCat = 'custom';
      doRenderLab();
    };
  }
}
