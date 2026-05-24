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
  {
    q:    'Have you or your family heard of this company?',
    hint: 'Do people around you know this brand? Could you find it in a shop or online?',
    yes:  'Well known — people around you know and use this! 🙌',
    no:   'Not many people around you know it yet 🤏',
    idk:  'Not sure how well-known it is',
  },
  {
    q:    'Does it make something useful or important?',
    hint: 'Would people miss it if it disappeared? Or is it more of a nice-to-have?',
    yes:  'Makes something genuinely useful — people really need it! ⚡',
    no:   'Nice to have, but not really essential 🛍️',
    idk:  'Hard to say how important it really is',
  },
  {
    q:    'Do you think MORE people will use this in the future?',
    hint: 'Is it getting bigger and more popular? Will it still be around in 10 years?',
    yes:  'Growing — more people will use it in future! 📈',
    no:   'Might shrink or get left behind 🐢',
    idk:  'Hard to predict — need to learn more',
  },
  {
    q:    'Is it hard for other companies to copy or replace?',
    hint: 'Does it have a famous brand, special technology, or something others can\'t easily match?',
    yes:  'Hard to replace — strong advantage over competitors! 🏰',
    no:   'Others could probably copy or beat it 😬',
    idk:  'Not sure if it has something special',
  },
  {
    q:    'Would you feel good owning a tiny piece of this company?',
    hint: 'Trust your gut! Does this feel like a quality business you\'d be proud of?',
    yes:  'Yes — excited to own a piece of this! 🌟',
    no:   'Not really — something feels off 🤔',
    idk:  'Need to learn more before deciding',
  },
];
const ADD_EMOJIS = ['🏢','🍕','🏪','🎮','🚗','🍦','⚽','🎬','🏥','👗','📱','🎨','🏠','🍜','✈️','🎸'];

const INDUSTRIES = [
  { id:'tech',      label:'Technology',            emoji:'💻', bg:'#EEF2FF', accent:'#6366F1', tagline:'Apps, gadgets & the internet',
    companies:[
      { name:'Apple',              ticker:'AAPL',    emoji:'🍎', tag:'top',    desc:"Makes iPhone, iPad and Mac — one of the most valuable companies ever!" },
      { name:'Microsoft',          ticker:'MSFT',    emoji:'🪟', tag:'top',    desc:"Runs Windows, Xbox and Office. Also a huge player in AI." },
      { name:'NVIDIA',             ticker:'NVDA',    emoji:'⚡', tag:'rising', desc:"Makes chips that power AI and gaming. Massive growth in recent years!" },
      { name:'Alphabet',           ticker:'GOOGL',   emoji:'🔍', tag:'top',    desc:"Google's parent — owns Search, YouTube, Maps and Android." },
      { name:'Meta',               ticker:'META',    emoji:'📱', tag:'top',    desc:"Owns Facebook, Instagram and WhatsApp. Billions of daily users." },
      { name:'Atlassian',          ticker:'TEAM',    emoji:'🦘', tag:'aussie', desc:"Aussie software company used by millions of businesses worldwide!" },
      { name:'Tesla',              ticker:'TSLA',    emoji:'🚗', tag:'rising', desc:"Electric cars, solar energy and AI robots — the future of transport." },
      { name:'Amazon',             ticker:'AMZN',    emoji:'🛒', tag:'top',    desc:"Online shopping giant that also runs AWS, the world's biggest cloud." },
      { name:'WiseTech Global',    ticker:'WTC.AX',  emoji:'📦', tag:'aussie', desc:"Aussie company making software for global shipping and logistics." },
      { name:'Xero',               ticker:'XRO.AX',  emoji:'💸', tag:'aussie', desc:"NZ/Aussie accounting software loved by small businesses everywhere." },
    ]},
  { id:'food',      label:'Food & Drink',           emoji:'🍔', bg:'#FEF3C7', accent:'#F59E0B', tagline:'Restaurants, groceries & snacks',
    companies:[
      { name:"McDonald's",         ticker:'MCD',     emoji:'🍟', tag:'top',    desc:"World's biggest fast food chain — over 40,000 restaurants globally!" },
      { name:"Domino's",           ticker:'DMP.AX',  emoji:'🍕', tag:'aussie', desc:"Pizza delivery giant listed in Australia — 3,000+ stores across Asia Pacific." },
      { name:'Coca-Cola',          ticker:'KO',      emoji:'🥤', tag:'top',    desc:"The world's most famous drink brand, sold in almost every country." },
      { name:'Woolworths',         ticker:'WOW.AX',  emoji:'🛒', tag:'aussie', desc:"Australia's biggest supermarket chain with stores in every state." },
      { name:'Coles',              ticker:'COL.AX',  emoji:'🏪', tag:'aussie', desc:"Australia's second-biggest supermarket, loved for its fresh food." },
      { name:'Starbucks',          ticker:'SBUX',    emoji:'☕', tag:'top',    desc:"World's biggest coffee chain — 35,000+ stores worldwide." },
      { name:'A2 Milk',            ticker:'A2M.AX',  emoji:'🥛', tag:'rising', desc:"Aussie/NZ company selling special A2 protein milk — big in China!" },
      { name:'Wesfarmers',         ticker:'WES.AX',  emoji:'🔨', tag:'aussie', desc:"Aussie giant that owns Bunnings, Kmart, Target and Officeworks." },
      { name:'Yum! Brands',        ticker:'YUM',     emoji:'🍗', tag:'top',    desc:"Owns KFC, Pizza Hut and Taco Bell — millions of restaurants worldwide." },
      { name:'JB Hi-Fi',           ticker:'JBH.AX',  emoji:'📺', tag:'aussie', desc:"Australia's biggest electronics and entertainment retailer." },
    ]},
  { id:'gaming',    label:'Gaming & Entertainment', emoji:'🎮', bg:'#F0FDF4', accent:'#22C55E', tagline:'Games, movies & streaming',
    companies:[
      { name:'Netflix',            ticker:'NFLX',    emoji:'🎬', tag:'top',    desc:"World's biggest streaming service — 260+ million subscribers!" },
      { name:'Nintendo',           ticker:'NTDOY',   emoji:'🕹️', tag:'top',    desc:"Makes Mario, Zelda and Pokémon — gaming's most loved company." },
      { name:'Roblox',             ticker:'RBLX',    emoji:'🟥', tag:'rising', desc:"Gaming platform huge with kids — over 70 million daily players!" },
      { name:'Electronic Arts',    ticker:'EA',      emoji:'⚽', tag:'top',    desc:"Makes EA Sports FC, The Sims, Apex Legends and Battlefield." },
      { name:'Take-Two',           ticker:'TTWO',    emoji:'🎲', tag:'rising', desc:"Makes Grand Theft Auto — GTA VI is one of the most anticipated games ever." },
      { name:'Walt Disney',        ticker:'DIS',     emoji:'🏰', tag:'top',    desc:"Owns Disney+, Marvel, Star Wars, Pixar and famous theme parks." },
      { name:'Spotify',            ticker:'SPOT',    emoji:'🎵', tag:'rising', desc:"World's biggest music streaming app — 600+ million monthly users." },
      { name:'REA Group',          ticker:'REA.AX',  emoji:'🏠', tag:'aussie', desc:"Owns realestate.com.au — Australians' favourite way to find a home." },
    ]},
  { id:'health',    label:'Healthcare',             emoji:'🏥', bg:'#FFF1F2', accent:'#F43F5E', tagline:'Medicines, hospitals & wellbeing',
    companies:[
      { name:'CSL',                ticker:'CSL.AX',  emoji:'💉', tag:'top',    desc:"Aussie biotech giant making blood products and vaccines worldwide." },
      { name:'ResMed',             ticker:'RMD.AX',  emoji:'😴', tag:'top',    desc:"Aussie company making devices that help people breathe while they sleep." },
      { name:'Johnson & Johnson',  ticker:'JNJ',     emoji:'🩹', tag:'top',    desc:"Makes Band-Aids, medicines and medical devices — trusted 130+ years." },
      { name:'Pfizer',             ticker:'PFE',     emoji:'💊', tag:'top',    desc:"One of the world's biggest drug companies — made the COVID-19 vaccine." },
      { name:'Cochlear',           ticker:'COH.AX',  emoji:'👂', tag:'aussie', desc:"Aussie company making bionic ears for deaf people worldwide!" },
      { name:'Sonic Healthcare',   ticker:'SHL.AX',  emoji:'🔬', tag:'aussie', desc:"Aussie pathology company running medical labs in 8 countries." },
      { name:'Ramsay Health',      ticker:'RHC.AX',  emoji:'🏥', tag:'aussie', desc:"Australia's biggest private hospital operator — 500+ hospitals worldwide." },
      { name:'Moderna',            ticker:'MRNA',    emoji:'🧬', tag:'rising', desc:"Made the mRNA COVID vaccine — now working on cancer treatments!" },
    ]},
  { id:'transport', label:'Transport & Energy',     emoji:'🚀', bg:'#ECFEFF', accent:'#06B6D4', tagline:'Cars, planes, energy & space',
    companies:[
      { name:'Qantas',             ticker:'QAN.AX',  emoji:'✈️', tag:'aussie', desc:"Australia's national airline — flying since 1920." },
      { name:'Uber',               ticker:'UBER',    emoji:'🚕', tag:'rising', desc:"Ride-sharing and food delivery app used in 70+ countries." },
      { name:'Toyota',             ticker:'TM',      emoji:'🚗', tag:'top',    desc:"World's biggest car maker — famous for reliability and the Prius." },
      { name:'Tesla',              ticker:'TSLA',    emoji:'⚡', tag:'rising', desc:"Electric cars, solar panels and AI robots — the future of transport." },
      { name:'Woodside Energy',    ticker:'WDS.AX',  emoji:'⛽', tag:'aussie', desc:"Australia's biggest oil and gas company, moving into clean energy." },
      { name:'AGL Energy',         ticker:'AGL.AX',  emoji:'💡', tag:'aussie', desc:"One of Australia's biggest power companies, transitioning to renewables." },
      { name:'Lyft',               ticker:'LYFT',    emoji:'🛵', tag:'rising', desc:"Uber's main US competitor — also moving into autonomous vehicles." },
      { name:'Virgin Australia',   ticker:'VAH.AX',  emoji:'💜', tag:'aussie', desc:"Australia's second airline, relaunched after Covid and growing again." },
    ]},
  { id:'mining',    label:'Mining & Resources',     emoji:'⛏️', bg:'#FFF7ED', accent:'#F97316', tagline:'Iron ore, gold, lithium & more',
    companies:[
      { name:'BHP',                ticker:'BHP.AX',  emoji:'⛏️', tag:'top',    desc:"Australia's biggest mining company — iron ore, copper and nickel." },
      { name:'Rio Tinto',          ticker:'RIO.AX',  emoji:'🪨', tag:'top',    desc:"Global mining giant with huge iron ore mines in Western Australia." },
      { name:'Fortescue',          ticker:'FMG.AX',  emoji:'🔩', tag:'aussie', desc:"Perth-based iron ore miner — Twiggy Forrest is also building green hydrogen." },
      { name:'Newmont',            ticker:'NEM',     emoji:'🥇', tag:'top',    desc:"World's biggest gold miner — mines on every continent." },
      { name:'Pilbara Minerals',   ticker:'PLS.AX',  emoji:'🔋', tag:'rising', desc:"Mines lithium in WA — essential for electric car batteries!" },
      { name:'Mineral Resources',  ticker:'MIN.AX',  emoji:'💎', tag:'rising', desc:"Fast-growing Aussie miner focused on lithium and iron ore." },
      { name:'South32',            ticker:'S32.AX',  emoji:'🌐', tag:'aussie', desc:"Spun out of BHP — mines aluminium, manganese and silver worldwide." },
      { name:'Northern Star',      ticker:'NST.AX',  emoji:'⭐', tag:'rising', desc:"One of Australia's biggest gold miners, growing fast." },
    ]},
  { id:'banks',     label:'Banks & Finance',        emoji:'🏦', bg:'#F0F9FF', accent:'#0EA5E9', tagline:'Banks, insurance & fintech',
    companies:[
      { name:'Commonwealth Bank',  ticker:'CBA.AX',  emoji:'🏦', tag:'top',    desc:"Australia's biggest bank — used by over 17 million Australians." },
      { name:'NAB',                ticker:'NAB.AX',  emoji:'💳', tag:'top',    desc:"National Australia Bank — one of the Big Four with 30,000+ staff." },
      { name:'Westpac',            ticker:'WBC.AX',  emoji:'🐋', tag:'top',    desc:"Australia's oldest bank, founded in 1817 — one of the Big Four." },
      { name:'ANZ',                ticker:'ANZ.AX',  emoji:'🌏', tag:'top',    desc:"Big Four bank with strong presence in New Zealand and Asia Pacific." },
      { name:'Macquarie',          ticker:'MQG.AX',  emoji:'🦅', tag:'top',    desc:"Australia's global investment bank — known as the Millionaire Factory." },
      { name:'Visa',               ticker:'V',       emoji:'💳', tag:'top',    desc:"Powers most card payments worldwide — over 4 billion cards issued." },
      { name:'PayPal',             ticker:'PYPL',    emoji:'💸', tag:'top',    desc:"Pioneered online payments — used by 400+ million people globally." },
      { name:'Block (Afterpay)',   ticker:'SQ',      emoji:'🔲', tag:'rising', desc:"Owns Afterpay — Australian buy-now-pay-later pioneer used worldwide." },
    ]},
];

const TAG_META = {
  top:    { label:'🌟 Top Performer', bg:'#D1FAE5', color:'#065F46' },
  rising: { label:'🚀 Rising Star',   bg:'#EDE9FE', color:'#5B21B6' },
  aussie: { label:'🦘 Aussie Star',   bg:'#FEF3C7', color:'#92400E' },
};

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
      <div style="margin-top:16px;padding-top:14px;border-top:2px solid #E0E7FF;display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-primary btn-full" onclick="window.__goBrowse()">🏭 Browse by Industry</button>
        <button class="btn btn-outline btn-full" onclick="window.__goAddCompany()">🔍 Research a Specific Company</button>
      </div>`}
    </div>`;

  window.__setLabCat    = k => { _labCat = k; doRenderLab(); };
  window.__goBrowse     = () => renderSectorPicker();
  window.__backToLab    = () => doRenderLab();
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
  window.__goAddCompany = () => { _addState = { step:0, name:'', ticker:'', emoji:'🏢', answers: Array(ADD_Q.length).fill(null) }; renderAddCompany(); };
  window.__deleteCustom = id => {
    _custom = _custom.filter(c => c.id !== id);
    _session.customCompanies = _custom;
    import('../db.js').then(m => m.saveProgress(_session.profileId, { stars: _session.stars, chaptersDone: _session.chaptersDone, customCompanies: _custom }));
    doRenderLab();
  };
}

function renderCustomTab() {
  return `
    <button class="btn btn-primary btn-full" style="margin-bottom:8px" onclick="window.__goBrowse()">🏭 Browse by Industry — find companies to research!</button>
    <button class="btn btn-outline btn-full" style="margin-bottom:14px" onclick="window.__goAddCompany()">🔍 I know the company name →</button>
    ${_custom.length === 0
      ? `<div style="text-align:center;padding:20px;color:#9CA3AF;font-weight:800;background:#F8FAFF;border-radius:14px">No researched companies yet!<br><span style="font-size:.8rem;font-weight:600">Tap Browse above to get started 👆</span></div>`
      : `<div style="font-size:.75rem;font-weight:800;color:#6B7280;margin-bottom:8px">YOUR RESEARCHED COMPANIES</div>
         <div class="rc-grid">${_custom.map(c => `
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
async function renderAddCompany() {
  const el = document.getElementById('screen-lab');
  if (!_addState) return;

  if (_addState.step === 0) {
    // STEP 0: Company info entry
    el.innerHTML = `
      <div class="card">
        <div class="tutor-row">
          <div class="tutor-emoji">🕷️</div>
          <div class="bubble">
            <div class="bubble-tag">Rocky 🪨</div>
            Blurt! ${_session.username} want to research own company?! Rocky is VERY excite! Tell Rocky — what company you thinking about? Rocky investigate and give verdict!
          </div>
        </div>
      </div>
      <div class="card">
        <div class="sec-title">🔍 What Company?</div>
        <div style="margin-bottom:14px">
          <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Company Name *</label>
          <input id="add-name" class="name-inp" style="text-align:left;font-size:.95rem" type="text" placeholder="e.g. Lego, Spotify, Bunnings…" maxlength="40" value="${_addState.name}"/>
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Ticker (Rocky will try to find it!)</label>
          <div style="display:flex;gap:8px">
            <input id="add-ticker" class="name-inp" style="text-align:left;font-size:.95rem" type="text" placeholder="Leave blank — Rocky will look it up!" maxlength="12" value="${_addState.ticker}"/>
            <button class="btn btn-primary btn-sm" onclick="window.__addFindTicker()" style="white-space:nowrap">🔍 Find</button>
          </div>
          <div id="add-ticker-result"></div>
        </div>
        <div>
          <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:8px">Pick an emoji</label>
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            ${ADD_EMOJIS.map((e,i) => `<button onclick="window.__addPickEmoji(${i})" class="add-emoji-btn" data-i="${i}" style="width:42px;height:42px;border-radius:10px;border:2.5px solid ${_addState.emoji===e?'var(--primary)':'#E0E7FF'};background:${_addState.emoji===e?'#EEF2FF':'white'};font-size:1.4rem;cursor:pointer">${e}</button>`).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-primary btn-lg btn-full" onclick="window.__addStartResearch()">🔬 Research This Company →</button>
      <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="doRenderLab()">← Back to Research Lab</button>`;

    window.__addPickEmoji = i => {
      _addState.emoji = ADD_EMOJIS[i];
      document.querySelectorAll('.add-emoji-btn').forEach((b, j) => {
        b.style.borderColor = j===i ? 'var(--primary)' : '#E0E7FF';
        b.style.background  = j===i ? '#EEF2FF' : 'white';
      });
    };
    window.__addFindTicker = async () => {
      const name = document.getElementById('add-name').value.trim();
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
        const r    = await fetch(`/api/ticker-search?q=${encodeURIComponent(name)}`);
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
    window.__addStartResearch = async () => {
      const name   = document.getElementById('add-name').value.trim();
      let   ticker = document.getElementById('add-ticker').value.trim().toUpperCase();
      if (!name) { document.getElementById('add-name').style.borderColor = '#EF4444'; return; }
      _addState.name = name;

      // Auto-lookup ticker if not already found
      if (!ticker && !_addState.ticker) {
        const local = lookupTicker(name);
        if (local?.private) {
          document.getElementById('add-ticker-result').innerHTML =
            `<div class="ticker-result private" style="margin-top:8px">⚠️ <strong>${name}</strong> is a private company — you can't buy shares yet. Rocky only researches companies listed on the stock market!</div>`;
          return;
        }
        if (local?.ticker) {
          ticker = local.ticker;
        } else {
          try {
            const r    = await fetch(`/api/ticker-search?q=${encodeURIComponent(name)}`);
            const data = await r.json();
            if (data.found) ticker = data.ticker;
          } catch { /* ignore */ }
        }
      }

      // Block if still no ticker — company is not publicly listed
      if (!ticker && !_addState.ticker) {
        document.getElementById('add-ticker-result').innerHTML =
          `<div class="ticker-result private" style="margin-top:8px">🤔 Rocky couldn't find <strong>${name}</strong> on the stock market. Only listed companies can be researched. Try entering the ticker manually if you know it — or search a different company!</div>`;
        return;
      }

      _addState.ticker = ticker || _addState.ticker;
      _addState.step   = 1;
      renderAddCompany();
    };

  } else if (_addState.step === 1) {
    // STEP 1: Fetch real data from Yahoo Finance and display 5 research points
    el.innerHTML = `
      <div class="card">
        <div class="tutor-row">
          <div class="tutor-emoji">🕷️</div>
          <div class="bubble">
            <div class="bubble-tag">Rocky 🪨</div>
            Rocky is researching <strong>${_addState.name}</strong>… give Rocky one moment! 🔬
          </div>
        </div>
      </div>
      <div class="card" style="text-align:center;padding:32px">
        <div class="spinner" style="margin:0 auto 12px"></div>
        <div style="font-size:.88rem;color:#6B7280;font-weight:800">Fetching real data…</div>
      </div>`;

    let resData = null;
    if (_addState.ticker && _addState.ticker !== '—') {
      try {
        const r = await fetch('/api/company-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: _addState.ticker, name: _addState.name }),
        });
        resData = await r.json();
      } catch { /* fall through to checklist */ }
    }

    if (resData && !resData.fallback && resData.points) {
      // ── REAL DATA VIEW ────────────────────────────────────────────────────
      const GRADE_STYLE = {
        green:  { border: '#10B981', bg: '#D1FAE5', dot: '🟢' },
        yellow: { border: '#F59E0B', bg: '#FEF3C7', dot: '🟡' },
        red:    { border: '#EF4444', bg: '#FEE2E2', dot: '🔴' },
        info:   { border: '#C7D2FE', bg: '#EEF2FF', dot: '🔵' },
      };
      const greenCount = resData.greenCount ?? 0;
      const verdicts = {
        5: 'Amaze amaze amaze!! Five green signals — rocky say this is very strong! Highly recommend watchlist!',
        4: 'Blurt! Four green signals — very solid company! Rocky is impress. Worth watching closely.',
        3: 'Three green, some yellow/red. Decent company but do more research before investing.',
        2: 'Only two greens. Rocky is cautious — some concerning signals. Watch and wait.',
        1: 'One green signal. Rocky say: high risk right now. Maybe look for better opportunity.',
        0: 'No strong green signals from data. Rocky say: research more before deciding!',
      };
      el.innerHTML = `
        <div class="card">
          <div class="tutor-row">
            <div class="tutor-emoji">🕷️</div>
            <div class="bubble">
              <div class="bubble-tag">Rocky 🪨</div>
              Rocky found real data for <strong>${resData.companyName || _addState.name}</strong>! Here are 5 important facts. Read each one and decide — is this a good investment?
            </div>
          </div>
        </div>
        <div class="card">
          ${resData.points.map(p => {
            const s = GRADE_STYLE[p.grade] || GRADE_STYLE.info;
            return `
            <div style="margin-bottom:12px;padding:14px;border-radius:14px;border:2px solid ${s.border};background:${s.bg}">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:1.3rem">${p.emoji}</span>
                <div style="font-weight:900;font-size:.9rem;color:#1F2937;flex:1">${p.title}</div>
                <span>${s.dot}</span>
              </div>
              <div style="font-size:.78rem;font-weight:700;color:#374151;margin-bottom:5px">${p.detail}</div>
              <div style="font-size:.75rem;color:#4B5563;font-weight:600;padding:6px 10px;background:rgba(255,255,255,.6);border-radius:8px">🕷️ ${p.rocky}</div>
            </div>`;
          }).join('')}
          <div style="margin:14px 0 10px;padding:14px;background:#F8FAFF;border-radius:14px;border:2px solid #C7D2FE;text-align:center">
            <div style="font-size:.78rem;font-weight:800;color:#6B7280;margin-bottom:4px">Rocky's Signal Score</div>
            <div style="font-size:1.4rem;margin-bottom:4px">${'🟢'.repeat(greenCount)}${'⚪'.repeat(5-greenCount)}</div>
            <div style="font-size:.82rem;font-weight:700;color:#374151">${verdicts[greenCount] || verdicts[0]}</div>
          </div>
          <button class="btn btn-green btn-lg btn-full" onclick="window.__addSaveData()">💾 Save to My Lab + Watchlist!</button>
          <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="window.__addBackToInfo()">← Back</button>
        </div>`;

      window.__addSaveData = async () => {
        const clues = resData.points.map(p => ({ t: `${p.title}: ${p.rocky}`, g: p.grade === 'green' }));
        const score  = greenCount;
        const rating = score >= 4 ? 5 : score >= 3 ? 4 : score >= 2 ? 3 : score >= 1 ? 2 : 1;
        const newCo  = {
          id: 'custom_' + Date.now(), name: _addState.name,
          ticker: _addState.ticker || '—', emoji: _addState.emoji,
          col:'#6B7280', bg:'#F8FAFF', cat:'custom', sector:'other',
          tag:`Researched by ${_session.username}!`,
          intro:`${resData.companyName || _addState.name} — real data research by ${_session.username}.`,
          clues, verdict: verdicts[score] || verdicts[0], rating, unlock_chapter: 0,
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

    } else {
      // ── FALLBACK: live data unavailable (API error) ───────────────────────
      el.innerHTML = `
        <div class="card">
          <div class="tutor-row">
            <div class="tutor-emoji">🕷️</div>
            <div class="bubble">
              <div class="bubble-tag">Rocky 🪨</div>
              Rocky tried to get live data for <strong>${_addState.name}</strong> (${_addState.ticker}) but the market data is not available right now. Try again in a moment!
            </div>
          </div>
        </div>
        <div class="card" style="text-align:center;padding:28px">
          <div style="font-size:2.2rem;margin-bottom:12px">📡</div>
          <div style="font-weight:900;color:#374151;margin-bottom:6px">Live data unavailable</div>
          <div style="font-size:.82rem;color:#6B7280;font-weight:600;margin-bottom:20px">The market data service might be busy. Rocky needs real data to research listed companies — try again!</div>
          <button class="btn btn-primary btn-full" onclick="window.__retryResearch()">🔄 Try Again</button>
          <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="window.__addBackToInfo()">← Back</button>
        </div>`;

      window.__retryResearch = () => renderAddCompany();
    }
    window.__addBackToInfo = () => {
      if (_addState.fromSector) {
        renderSectorCompanies(_addState.fromSector, _addState.fromPage || 0);
      } else {
        _addState.step = 0;
        renderAddCompany();
      }
    };

  } else {
    // STEP 2: Verdict
    const score  = _addState.answers.filter(a => a === 'yes').length;
    const clues  = ADD_Q.map((q, i) => ({
      t: _addState.answers[i] === 'yes' ? q.yes : _addState.answers[i] === 'no' ? q.no : `🤷 ${q.idk}`,
      g: _addState.answers[i] === 'yes',
    }));
    const rating   = score>=5?5:score>=4?4:score>=3?3:score>=2?2:1;
    const idkCount = _addState.answers.filter(a => a === 'idk').length;
    const idkNote  = idkCount > 0 ? ` Rocky also counted ${idkCount} "not sure" answer${idkCount>1?'s':''} — great things to research more!` : '';
    const verdicts = {
      5:`Amaze amaze amaze!! ${_addState.name} — five green signals! Rocky is very impress. Add to watchlist right now!`,
      4:`Blurt! ${_addState.name} very strong — four green signals. Worth watching closely!${idkNote}`,
      3:`${_addState.name} looks decent — three greens. Not amazing but not bad. Keep investigating!${idkNote}`,
      2:`Only two green signals for ${_addState.name}. Rocky is cautious — learn more before investing.${idkNote}`,
      1:`Rocky is honest: ${_addState.name} mostly unclear right now. Do more research first!${idkNote}`,
      0:`Rocky couldn't find clear positives yet. Lots of "not sure" — time to investigate more!${idkNote}`,
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
          ${clues.map((cl,i)=>{const a=_addState.answers[i];return`<div class="clue ${a==='yes'?'g':a==='no'?'b':''}"><span>${a==='yes'?'✅':a==='no'?'❌':'🤷'}</span><span>${cl.t}</span></div>`}).join('')}
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
        intro:`${_addState.name} was researched by ${_session.username} using Rocky's 5-clue method.`,
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

// ── INDUSTRY BROWSER ─────────────────────────────────────────────────────────

function renderSectorPicker() {
  const el = document.getElementById('screen-lab');
  el.innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Blurt! Pick an industry you find interesting — Rocky will show real companies with live data you can research!
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      ${INDUSTRIES.map(s => `
        <button onclick="window.__goBrowseSector('${s.id}')"
          style="text-align:left;padding:16px 12px;border-radius:16px;border:2px solid ${s.accent}50;background:${s.bg};cursor:pointer;font-family:inherit;transition:transform .12s;display:block;width:100%"
          onmousedown="this.style.transform='scale(.96)'" onmouseup="this.style.transform=''" ontouchend="this.style.transform=''">
          <div style="font-size:1.8rem;margin-bottom:5px">${s.emoji}</div>
          <div style="font-weight:900;font-size:.85rem;color:#1F2937;margin-bottom:2px">${s.label}</div>
          <div style="font-size:.7rem;color:#6B7280;font-weight:600;line-height:1.3">${s.tagline}</div>
          <div style="font-size:.65rem;font-weight:800;color:${s.accent};margin-top:6px">${s.companies.length} companies →</div>
        </button>
      `).join('')}
    </div>
    <button class="btn btn-outline btn-full" onclick="window.__backToLab()">← Back to Research Lab</button>`;

  window.__goBrowseSector = id => renderSectorCompanies(id, 0);
}

function renderSectorCompanies(sectorId, page) {
  const el  = document.getElementById('screen-lab');
  const sec = INDUSTRIES.find(s => s.id === sectorId);
  if (!sec) return;

  const start   = page * 5;
  const shown   = sec.companies.slice(start, start + 5);
  const hasMore = start + 5 < sec.companies.length;
  const total   = sec.companies.length;

  el.innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Here are <strong>${sec.label}</strong> companies! Tap <strong>Research</strong> and Rocky will fetch live market data — price, size, performance and what experts think!
        </div>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <button class="btn btn-outline btn-sm" onclick="window.__goBrowse()" style="padding:7px 14px;flex-shrink:0">← Industries</button>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:1.5rem">${sec.emoji}</span>
        <div>
          <div style="font-weight:900;font-size:.92rem;color:#1F2937">${sec.label}</div>
          <div style="font-size:.7rem;color:#6B7280;font-weight:600">${sec.tagline}</div>
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px">
      ${shown.map((co, idx) => {
        const tag = TAG_META[co.tag] || TAG_META.top;
        const safeN = co.name.replace(/'/g, "\\'");
        return `
        <div style="background:white;border-radius:16px;border:2px solid #E0E7FF;padding:14px;display:flex;align-items:center;gap:12px">
          <div style="font-size:1.8rem;width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:#F8FAFF;border-radius:12px;flex-shrink:0">${co.emoji}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:1px">
              <span style="font-weight:900;font-size:.88rem;color:#1F2937">${co.name}</span>
              <span style="font-size:.58rem;font-weight:800;padding:2px 6px;border-radius:20px;background:${tag.bg};color:${tag.color};white-space:nowrap">${tag.label}</span>
            </div>
            <div style="font-size:.68rem;color:#9CA3AF;font-weight:800;letter-spacing:.03em;margin-bottom:3px">${co.ticker}</div>
            <div style="font-size:.76rem;color:#4B5563;font-weight:600;line-height:1.4">${co.desc}</div>
          </div>
          <button onclick="window.__researchFromBrowse('${co.ticker}','${safeN}','${co.emoji}','${sectorId}',${page})"
            class="btn btn-primary btn-sm" style="white-space:nowrap;flex-shrink:0;align-self:center;padding:9px 13px">🔬 Research</button>
        </div>`;
      }).join('')}
    </div>

    ${hasMore
      ? `<button class="btn btn-outline btn-full" onclick="window.__goBrowsePage('${sectorId}',${page+1})">Show 5 more ${sec.label} companies →</button>`
      : `<div style="text-align:center;font-size:.78rem;color:#9CA3AF;font-weight:700;padding:6px 0 10px">All ${total} ${sec.label} companies shown!</div>
         ${page > 0 ? `<button class="btn btn-outline btn-full" onclick="window.__goBrowsePage('${sectorId}',0)">↑ Back to top</button>` : ''}`}
    <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="window.__goBrowse()">← All Industries</button>`;

  window.__goBrowsePage        = (id, pg) => renderSectorCompanies(id, pg);
  window.__researchFromBrowse  = (ticker, name, emoji, sid, pg) => {
    _addState = { step: 1, name, ticker, emoji, answers: Array(ADD_Q.length).fill(null), fromSector: sid, fromPage: pg };
    renderAddCompany();
  };
}

function applyAnswer(i, val) {
  const card = document.querySelector(`.research-q[data-qi="${i}"]`);
  if (!card) return;
  const isYes = val === 'yes', isNo = val === 'no', isIdk = val === 'idk';
  card.style.borderColor = isYes ? '#10B981' : isNo ? '#EF4444' : '#F59E0B';
  card.style.background  = isYes ? '#D1FAE5' : isNo ? '#FEE2E2' : '#FEF3C7';
  const yesBtn = card.querySelector('.yes-btn');
  const noBtn  = card.querySelector('.no-btn');
  const idkBtn = card.querySelector('.idk-btn');
  yesBtn.style.background  = isYes ? '#10B981' : 'white';
  yesBtn.style.color       = isYes ? 'white' : '';
  yesBtn.style.borderColor = isYes ? '#10B981' : '#E0E7FF';
  noBtn.style.background   = isNo ? '#EF4444' : 'white';
  noBtn.style.color        = isNo ? 'white' : '';
  noBtn.style.borderColor  = isNo ? '#EF4444' : '#E0E7FF';
  idkBtn.style.background  = isIdk ? '#F59E0B' : 'white';
  idkBtn.style.color       = isIdk ? 'white' : '';
  idkBtn.style.borderColor = isIdk ? '#F59E0B' : '#E0E7FF';
  const fb = card.querySelector('.q-feedback');
  fb.style.display    = 'block';
  fb.textContent      = isYes ? ADD_Q[i].yes : isNo ? ADD_Q[i].no : `🤷 ${ADD_Q[i].idk}`;
  fb.style.background = isYes ? '#A7F3D0' : isNo ? '#FECACA' : '#FDE68A';
  fb.style.color      = isYes ? '#065F46' : isNo ? '#991B1B' : '#92400E';
}
