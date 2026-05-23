import { COS, RC } from '../data/companies.js';
import { Q1, Q2, Q3, Q4, Q5, Q6 } from '../data/quiz.js';
import { sectorLabel, sectorBg, sectorFg, getDivScore, shuffle, toast, confetti, starPop, sleep } from '../utils.js';
import { saveProgress } from '../db.js';
import { updateSession } from '../auth.js';
import { navigate, hudUp } from '../router.js';

// ── MODULE STATE ───────────────────────────────────────────────────────────────
let _session = null;
let _qShuffled = [];
let _ansHandler = null;
let _nextHandler = null;

// Chapter 4 state
let _open   = {};
let _picked = [];
let _finalVal = 0;
const START   = 1000;

// Chapter 10 state
const _capEtfs   = RC.filter(r => r.cat === 'etf');
const _capStocks = RC.filter(r => r.cat !== 'etf');
let _cap10 = { etf: null, stocks: [] };

// Per-chapter quiz indices
let _q1i = 0, _q2i = 0;
let _q6i = 0, _q7i = 0, _q8i = 0, _q9i = 0;

// ── HELPERS ────────────────────────────────────────────────────────────────────
const gel  = ()  => document.getElementById('screen-game');
const $g   = id  => document.getElementById(id);
const qsg  = sel => document.querySelectorAll(`#screen-game ${sel}`);

function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function addStars(n, anchor) {
  _session.stars = (_session.stars ?? 0) + n;
  updateSession({ stars: _session.stars });
  const chap = Math.min(10, (_session.chaptersDone ?? 0) + 1);
  hudUp(chap, _session.stars);
  if (anchor) starPop(n, anchor);
}

async function saveChapter(n) {
  _session.chaptersDone = Math.max(_session.chaptersDone ?? 0, n);
  updateSession({ chaptersDone: _session.chaptersDone });
  try {
    await saveProgress(_session.profileId, {
      stars:           _session.stars,
      chaptersDone:    _session.chaptersDone,
      customCompanies: _session.customCompanies ?? [],
    });
  } catch (e) {
    console.warn('Progress save failed:', e);
  }
}

function quizOptHTML(shuffled) {
  return shuffled.map((o, i) =>
    `<button class="qopt" onclick="window.__gAns(${i})">${o.t}</button>`
  ).join('');
}

function feedbackHTML(ok, ex, chapNum, isLast) {
  return `
    <div style="padding:12px 15px;border-radius:12px;background:${ok ? '#D1FAE5' : '#FEF3C7'};color:${ok ? '#065F46' : '#92400E'};font-weight:700;font-size:.86rem;line-height:1.5">
      ${ok
        ? '🕷️ Amaze amaze amaze!! Is correct! Rocky do happy-dance with all five arms! '
        : '🤔 Not quite — every smart investor learn from mistakes. Rocky explain! '}${ex}
    </div>
    <div style="margin-top:11px">
      <button class="btn btn-primary" onclick="window.__gNext()">
        ${isLast ? `Finish Chapter ${chapNum} 🎉` : 'Next Question →'}
      </button>
    </div>`;
}

function chapDoneHTML(chapNum, msg, nextFn, nextLabel) {
  return `
    <div class="t-center" style="padding:18px 0">
      <div style="font-size:3rem;margin-bottom:10px">🕷️</div>
      <div class="t-big" style="margin-bottom:8px">Blurt! Chapter ${chapNum} Done!</div>
      <div style="color:#6B7280;font-size:.95rem;margin-bottom:20px">${msg}</div>
      <button class="btn btn-green btn-lg" onclick="${nextFn}">${nextLabel}</button>
    </div>`;
}

// ── MOUNT ──────────────────────────────────────────────────────────────────────
export function mountGame(session) {
  _session = session;

  // Universal quiz handlers (closures capture module-level _ansHandler / _nextHandler)
  window.__gAns  = (i) => { if (_ansHandler) _ansHandler(i); };
  window.__gNext = ()  => { if (_nextHandler) _nextHandler(); };

  // Chapter transition handlers
  window.__g2  = go2;
  window.__g3  = go3;
  window.__g4  = go4;
  window.__g6  = go6;
  window.__g7  = go7;
  window.__g8  = go8;
  window.__g9  = go9;
  window.__g10 = go10;

  // Chapter-specific handlers
  window.__gCh3        = (ok) => ch3ans(ok);
  window.__gToggleOpen = (id) => toggleOpen(id);
  window.__gTogglePick = (id, e) => togglePick(id, e);
  window.__gSubmit     = ()  => submitInvest();
  window.__gCap10Etf   = (id) => pickCap10Etf(id);
  window.__gCap10Stock = (id) => pickCap10Stock(id);
  window.__gFinish     = ()  => finishCap10();
  window.__gAgain      = ()  => navigate('screen-home');
  window.__gBonus      = (id) => renderBonusLesson(id);

  scrollTop();

  const chap = _session.chaptersDone ?? 0;
  if      (chap === 0) renderCh1();
  else if (chap === 1) go2();
  else if (chap === 2) go3();
  else if (chap <= 4)  go4();   // ch3 done but ch5 not yet → re-do investment
  else if (chap === 5) go6();
  else if (chap === 6) go7();
  else if (chap === 7) go8();
  else if (chap === 8) go9();
  else if (chap === 9) go10();
  else                  renderAllDone();
}

const BONUS_LESSONS = [
  {
    id: 'dividends',
    emoji: '💰', title: 'What Are Dividends?',
    teaser: 'Getting paid just for owning shares!',
    content: `
      <p>Imagine you own a tiny piece of a lemonade company. Every time the company makes a profit, they share some of that money with ALL the owners — including you! That shared money is called a <strong>dividend</strong>. 🍋</p>
      <br>
      <p><strong>How it works:</strong> If you own 10 shares of a company that pays $0.50 per share each year, you receive <strong>$5 every year</strong> — just for holding the shares. No work required!</p>
      <br>
      <p><strong>Dividend yield</strong> is the percentage you earn. A 4% yield means if you own $1,000 of shares, you get $40/year in dividends.</p>
      <br>
      <div style="background:#D1FAE5;border-radius:12px;padding:12px 15px;font-size:.85rem;color:#065F46;line-height:1.6">
        <strong>🕷️ Rocky's tip:</strong> In Australia, many dividends come with <strong>franking credits</strong> — bonus tax credits the government gives you! This makes Australian dividends even more valuable for Aussie investors. Bunnings parent Wesfarmers and the big banks (CBA, NAB, ANZ) are famous dividend payers!
      </div>`,
  },
  {
    id: 'compound',
    emoji: '🧮', title: 'The Magic of Compounding',
    teaser: 'How $1,000 becomes $10,000 without you doing anything.',
    content: `
      <p>Here's the most powerful idea in all of investing. <strong>Compounding</strong> means earning returns on your returns.</p>
      <br>
      <p><strong>Example:</strong> You invest $1,000. It grows 10% in year 1 → you now have <strong>$1,100</strong>. In year 2, 10% of $1,100 = $110 → you have <strong>$1,210</strong>. In year 3, 10% of $1,210 = $121 → <strong>$1,331</strong>.</p>
      <br>
      <p>At first it looks small. But after 30 years at 10%/year, that $1,000 becomes <strong>$17,449</strong>! You added $16,449 without putting in a single extra dollar. 🤯</p>
      <br>
      <div style="background:#EEF2FF;border-radius:12px;padding:12px 15px;font-size:.85rem;color:#1E1B4B;line-height:1.6;margin-bottom:10px">
        <strong>⏰ The rule of 72:</strong> Divide 72 by your annual return to find how many years to double your money. At 10%/year → 72 ÷ 10 = <strong>7.2 years to double</strong>!
      </div>
      <div style="background:#D1FAE5;border-radius:12px;padding:12px 15px;font-size:.85rem;color:#065F46;line-height:1.6">
        <strong>🕷️ Rocky say:</strong> Starting at age 7 vs 27 is the difference between retiring rich and retiring okay. TIME is the secret ingredient. Start early, even with tiny amounts. The snowball effect is REAL!
      </div>`,
  },
  {
    id: 'news',
    emoji: '📰', title: 'Reading Stock News',
    teaser: 'How to not panic when headlines scream!',
    content: `
      <p>Every day the news says things like <em>"Markets crash!"</em> or <em>"Tech stocks plunge!"</em> or <em>"Recession fears grip Wall Street!"</em>. This is designed to make you panic. <strong>Don't panic.</strong></p>
      <br>
      <p><strong>What smart investors do with news:</strong></p>
      <br>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
        <div style="display:flex;gap:10px;padding:10px;background:#D1FAE5;border-radius:10px;font-size:.82rem;font-weight:700;color:#065F46"><span>✅</span><span>Ask: does this change the LONG TERM story of the company?</span></div>
        <div style="display:flex;gap:10px;padding:10px;background:#D1FAE5;border-radius:10px;font-size:.82rem;font-weight:700;color:#065F46"><span>✅</span><span>A bad quarter doesn't mean a bad company. Zoom out!</span></div>
        <div style="display:flex;gap:10px;padding:10px;background:#D1FAE5;border-radius:10px;font-size:.82rem;font-weight:700;color:#065F46"><span>✅</span><span>Market drops = SALE on shares. Great time to buy more!</span></div>
        <div style="display:flex;gap:10px;padding:10px;background:#FEE2E2;border-radius:10px;font-size:.82rem;font-weight:700;color:#991B1B"><span>❌</span><span>Never sell because of scary headlines</span></div>
        <div style="display:flex;gap:10px;padding:10px;background:#FEE2E2;border-radius:10px;font-size:.82rem;font-weight:700;color:#991B1B"><span>❌</span><span>Never buy something just because everyone is excited</span></div>
      </div>
      <div style="background:#FEF3C7;border-radius:12px;padding:12px 15px;font-size:.85rem;color:#92400E;line-height:1.6">
        <strong>🕷️ Rocky say:</strong> Warren Buffett — most famous investor on Earth — says: "Be fearful when others are greedy, and greedy when others are fearful." When market crashes, Rocky say: HAPPY DANCE! Everything on sale!
      </div>`,
  },
  {
    id: 'markets',
    emoji: '🌏', title: 'Australia vs USA Markets',
    teaser: 'ASX vs S&P 500 — what's the difference?',
    content: `
      <p>Australia has its own stock market called the <strong>ASX (Australian Securities Exchange)</strong>. The USA has the <strong>NYSE and NASDAQ</strong>. They work the same way — companies list shares, investors buy and sell.</p>
      <br>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="padding:12px;background:#EEF2FF;border-radius:12px">
          <div style="font-weight:900;font-size:.85rem;color:#4338CA;margin-bottom:8px">🇦🇺 ASX (Australia)</div>
          <div style="font-size:.76rem;color:#374151;line-height:1.7">200 big companies<br>Banks &amp; miners dominate<br>Famous for dividends + franking<br>Trades 10am–4pm AEDT<br>Currency: AUD $</div>
        </div>
        <div style="padding:12px;background:#F0FDF4;border-radius:12px">
          <div style="font-weight:900;font-size:.85rem;color:#059669;margin-bottom:8px">🇺🇸 S&amp;P 500 (USA)</div>
          <div style="font-size:.76rem;color:#374151;line-height:1.7">500 biggest companies<br>Tech giants dominate<br>Apple, Google, Amazon<br>Trades overnight (AEDT)<br>Currency: USD $</div>
        </div>
      </div>
      <div style="background:#D1FAE5;border-radius:12px;padding:12px 15px;font-size:.85rem;color:#065F46;line-height:1.6">
        <strong>🕷️ Rocky's strategy:</strong> Smart Aussie investors often use <strong>VAS</strong> (Vanguard ASX 300) for Australian exposure and <strong>VGS</strong> (Vanguard Global) for international. You get the best of both worlds — Aussie dividends AND global tech growth!
      </div>`,
  },
  {
    id: 'mindset',
    emoji: '🧠', title: 'The Investor Mindset',
    teaser: 'The mental game is harder than the math.',
    content: `
      <p>Here's the secret most people don't know: investing knowledge is easy. The hard part is <strong>controlling your emotions</strong>.</p>
      <br>
      <p>When your shares go DOWN 20%, every feeling says "SELL!" But that's the worst thing you can do — you're locking in the loss and missing the recovery.</p>
      <br>
      <p>When your shares go UP and everyone is excited, every feeling says "BUY MORE!" But that's when things are most expensive and risky.</p>
      <br>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
        <div style="display:flex;gap:10px;padding:10px;background:#EEF2FF;border-radius:10px;font-size:.82rem;font-weight:700;color:#4338CA"><span>🧱</span><span><strong>Be boring.</strong> Boring investing beats exciting investing every time.</span></div>
        <div style="display:flex;gap:10px;padding:10px;background:#EEF2FF;border-radius:10px;font-size:.82rem;font-weight:700;color:#4338CA"><span>📅</span><span><strong>Time in market</strong> beats timing the market. Stay invested.</span></div>
        <div style="display:flex;gap:10px;padding:10px;background:#EEF2FF;border-radius:10px;font-size:.82rem;font-weight:700;color:#4338CA"><span>🎯</span><span><strong>Know WHY you own it.</strong> Good reason = easy to hold through dips.</span></div>
        <div style="display:flex;gap:10px;padding:10px;background:#EEF2FF;border-radius:10px;font-size:.82rem;font-weight:700;color:#4338CA"><span>🤏</span><span><strong>Never invest money you might need soon.</strong> Emergency fund first!</span></div>
      </div>
      <div style="background:#FEF3C7;border-radius:12px;padding:12px 15px;font-size:.85rem;color:#92400E;line-height:1.6">
        <strong>🕷️ Rocky say:</strong> Rocky have invested through many market crashes. Every single time, market came back higher than before. Every. Single. Time. The investors who panic and sell are the ones who lose. The ones who stay calm and hold — or buy more — always win. Be the calm one!
      </div>`,
  },
];

function renderAllDone() {
  gel().innerHTML = `
    <div class="badge-card">
      <div class="badge-icon">🏆</div>
      <div class="badge-title">Academy Complete!</div>
      <div class="badge-sub">${_session.username} has mastered all 10 chapters!</div>
    </div>
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Rocky is SO impress!! ${_session.username} learn everything! But Rocky still have more wisdom to share… explore the bonus lessons below whenever you want!
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">📚 Rocky's Bonus Lessons</div>
      <div class="sec-sub">Tap any topic to keep learning!</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
        ${BONUS_LESSONS.map(l => `
          <button onclick="window.__gBonus('${l.id}')" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;border:2px solid #E0E7FF;background:#F8FAFF;cursor:pointer;text-align:left;font-family:inherit;transition:all .18s;width:100%">
            <span style="font-size:1.8rem;width:40px;text-align:center">${l.emoji}</span>
            <div>
              <div style="font-weight:900;font-size:.92rem;color:#1F2937">${l.title}</div>
              <div style="font-size:.75rem;color:#6B7280;font-weight:600;margin-top:2px">${l.teaser}</div>
            </div>
            <span style="margin-left:auto;color:#C7D2FE;font-size:1rem">›</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="card" style="text-align:center;padding:20px">
      <div style="font-size:.85rem;color:#6B7280;margin-bottom:12px">Ready to put it all into practice?</div>
      <button class="btn btn-primary btn-lg btn-full" onclick="window.__nav('screen-home')">Go to My Dashboard →</button>
    </div>`;
}

function renderBonusLesson(id) {
  const lesson = BONUS_LESSONS.find(l => l.id === id);
  if (!lesson) return;
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨 — Bonus Lesson</div>
          ${lesson.emoji} <strong>${lesson.title}</strong>
        </div>
      </div>
    </div>
    <div class="card">
      <div style="font-size:.92rem;line-height:1.75;color:#374151">
        ${lesson.content}
      </div>
    </div>
    <button class="btn btn-outline btn-full" onclick="window.__gAgain2()">← Back to Bonus Lessons</button>`;
  window.__gAgain2 = () => renderAllDone();
  scrollTop();
}

// ── CHAPTER 1: WHAT IS A COMPANY ──────────────────────────────────────────────
function renderCh1() {
  _q1i = 0;
  hudUp(1, _session.stars);
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Blurt! <strong>${_session.username}</strong> is here! I am <strong>Rocky</strong> — your investing friend from far away! 🎉<br><br>
          Before we invest real (pretend) money, we must learn basics. First question:
          <strong>What is a company?</strong> Rocky want to know if you know!
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🏪 The Lemonade Stand</div>
      <div style="font-size:.95rem;line-height:1.7;color:#374151">
        <p>Imagine your friend <strong>Mia</strong> makes the BEST lemonade in the neighborhood. 🍋</p><br>
        <p>Everyone wants to buy it! So Mia buys lemons and sugar, makes lemonade, and sells cups for $1 each. If she sells 100 cups, she earns <strong>$100</strong>!</p><br>
        <p>That's a <strong>company</strong> — a team that makes something people want and earns money from it.</p>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🧠 Quick Quiz!</div>
      <div class="sec-sub">Answer 3 questions to earn ⭐ stars</div>
      <div id="q1box"></div>
    </div>`;
  renderQ1();
}

function renderQ1() {
  const q = Q1[_q1i];
  _qShuffled  = shuffle(q.opts);
  _ansHandler = (i) => ansQ1(i);
  _nextHandler = () => nextQ1();
  $g('q1box').innerHTML = `
    <div style="font-size:1.02rem;font-weight:800;margin-bottom:12px;line-height:1.4">${q.q}</div>
    <div class="quiz-grid">${quizOptHTML(_qShuffled)}</div>
    <div id="q1fb" style="margin-top:13px;display:none"></div>`;
}

function ansQ1(i) {
  const q = Q1[_q1i];
  const btns = qsg('.qopt');
  btns.forEach(b => b.disabled = true);
  const ok = _qShuffled[i].ok;
  btns[i].classList.add(ok ? 'correct' : 'wrong');
  if (!ok) _qShuffled.forEach((_, j) => { if (_qShuffled[j].ok) btns[j].classList.add('correct'); });
  const fb = $g('q1fb');
  fb.style.display = 'block';
  fb.innerHTML = feedbackHTML(ok, q.ex, 1, _q1i >= Q1.length - 1);
  if (ok) addStars(1, btns[i]);
}

function nextQ1() {
  _q1i++;
  if (_q1i < Q1.length) { renderQ1(); return; }
  saveChapter(1);
  $g('q1box').innerHTML = chapDoneHTML(1,
    'You know what <strong>company</strong> is — team that makes things and sells things! Is good!',
    'window.__g2()', 'Continue to Chapter 2 →');
  confetti();
}

// ── CHAPTER 2: INVESTING & ASYMMETRIC RISK ────────────────────────────────────
function go2() {
  _q2i = 0;
  hudUp(2, _session.stars);
  scrollTop();
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Is amazing, ${_session.username}! ⭐ Rocky is very excite! Now — exciting part.
          What if <em>you</em> can own piece of company and earn money when it grows?
          This is called <strong>investing!</strong> 💰 Is very smart idea!
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">💰 How Investing Works</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;margin:14px 0">
        ${[['💵','Step 1','#EEF2FF','#4338CA','You give money to a company'],
           ['📈','Step 2','#F0FDF4','#059669','Company uses it to grow bigger'],
           ['🤑','Step 3','#FFFBEB','#D97706','You get money back — PLUS more!']
          ].map(([ico,lbl,bg,col,txt]) => `
          <div style="text-align:center;padding:14px;background:${bg};border-radius:14px">
            <div style="font-size:1.8rem;margin-bottom:7px">${ico}</div>
            <div style="font-weight:900;font-size:.78rem;color:${col}">${lbl}</div>
            <div style="font-size:.73rem;color:#374151;margin-top:4px;line-height:1.4">${txt}</div>
          </div>`).join('')}
      </div>
      <div style="background:#F8FAFF;border-radius:12px;padding:14px;font-size:.88rem;line-height:1.65;color:#374151;border-left:4px solid var(--primary)">
        <strong>🍋 Remember Mia's lemonade stand?</strong> She wants to open 3 more stands but needs $300. You invest $100 and become part-owner! When she makes $600 profit, you get <strong>$200 back</strong> — doubling your money! 🎉
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🎯 Rocky's Big Secret: Asymmetric Risk!</div>
      <div class="sec-sub">This is why smart investors love investing — the math is on your side!</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:14px">
        <div style="text-align:center;padding:16px;background:#FEE2E2;border-radius:14px;border:2px solid #FCA5A5">
          <div style="font-size:2rem;margin-bottom:8px">📉</div>
          <div style="font-weight:900;font-size:.8rem;color:#991B1B;margin-bottom:6px">WORST CASE</div>
          <div style="font-size:1.5rem;font-weight:900;color:#DC2626">−$100</div>
          <div style="font-size:.72rem;color:#7F1D1D;margin-top:5px;line-height:1.4">The most you can EVER lose is what you put in. That's all!</div>
        </div>
        <div style="text-align:center;padding:16px;background:#D1FAE5;border-radius:14px;border:2px solid #6EE7B7">
          <div style="font-size:2rem;margin-bottom:8px">📈</div>
          <div style="font-weight:900;font-size:.8rem;color:#065F46;margin-bottom:6px">BEST CASE</div>
          <div style="font-size:1.5rem;font-weight:900;color:#059669">+$500+</div>
          <div style="font-size:.72rem;color:#064E3B;margin-top:5px;line-height:1.4">No limit! Great companies can grow 5x, 10x, even more!</div>
        </div>
      </div>
      <div style="background:#EEF2FF;border-radius:12px;padding:13px 16px;font-size:.88rem;color:#1E1B4B;line-height:1.65;border-left:4px solid var(--primary)">
        <strong>🕷️ Rocky say:</strong> Invest $100. If company go bad — lose $100. Is sad but okay. But if pick GREAT company? Get back $500... $1,000! Wins can be MUCH bigger than losses. Rocky call this <strong>asymmetric risk</strong>. Is why investing is most exciting thing in universe! Amaze amaze amaze!
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🧠 Quiz Time!</div>
      <div class="sec-sub">4 questions — you've got this! ⭐</div>
      <div id="q2box"></div>
    </div>`;
  renderQ2();
}

function renderQ2() {
  const q = Q2[_q2i];
  _qShuffled   = shuffle(q.opts);
  _ansHandler  = (i) => ansQ2(i);
  _nextHandler = () => nextQ2();
  $g('q2box').innerHTML = `
    <div style="font-size:1.02rem;font-weight:800;margin-bottom:12px;line-height:1.4">${q.q}</div>
    <div class="quiz-grid">${quizOptHTML(_qShuffled)}</div>
    <div id="q2fb" style="margin-top:13px;display:none"></div>`;
}

function ansQ2(i) {
  const q = Q2[_q2i];
  const btns = qsg('.qopt');
  btns.forEach(b => b.disabled = true);
  const ok = _qShuffled[i].ok;
  btns[i].classList.add(ok ? 'correct' : 'wrong');
  if (!ok) _qShuffled.forEach((_, j) => { if (_qShuffled[j].ok) btns[j].classList.add('correct'); });
  const fb = $g('q2fb');
  fb.style.display = 'block';
  fb.innerHTML = feedbackHTML(ok, q.ex, 2, _q2i >= Q2.length - 1);
  if (ok) addStars(1, btns[i]);
}

function nextQ2() {
  _q2i++;
  if (_q2i < Q2.length) { renderQ2(); return; }
  saveChapter(2);
  $g('q2box').innerHTML = chapDoneHTML(2,
    'You understand <strong>investing</strong> — put money in now, get more money later! Is very smart human thing!',
    'window.__g3()', 'Continue to Chapter 3 →');
  confetti();
}

// ── CHAPTER 3: HOW TO PICK COMPANIES ─────────────────────────────────────────
function go3() {
  const ex  = COS[0]; // RocketKids (4 green)
  const bad = COS[3]; // GreenGrow  (3 red)
  hudUp(3, _session.stars);
  scrollTop();
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Blurt! ${_session.username} is on FIRE! 🔥 Rocky is impress. Now — big question.
          How do you know <em>which</em> company to pick? Smart investors look for <strong>clues!</strong>
          Rocky show you what to look for…
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🔍 The 3 Magic Questions</div>
      <div class="sec-sub">Ask these about every company before you invest!</div>
      ${[['❤️','var(--primary)','#EEF2FF','Do people LOVE it?','Are lots of customers buying it? Do they keep coming back?'],
         ['📈','var(--green)','#F0FDF4','Is it GROWING?','Does the company get bigger and more successful every year?'],
         ['🌍','var(--gold)','#FFFBEB','Does EVERYONE need it?','Is it something many people want, not just a few?']
        ].map(([ico,col,bg,q,desc]) => `
        <div style="display:flex;align-items:center;gap:12px;padding:13px;background:${bg};border-radius:12px;border-left:4px solid ${col};margin-bottom:10px">
          <span style="font-size:1.65rem">${ico}</span>
          <div>
            <div style="font-weight:900;font-size:.95rem">${q}</div>
            <div style="font-size:.8rem;color:#6B7280;margin-top:3px">${desc}</div>
          </div>
        </div>`).join('')}
    </div>
    <div class="card">
      <div class="sec-title">🔗 Rocky's Rule: Pick Different Types!</div>
      <div class="sec-sub">Smart investors aim for 8–12 companies from different sectors!</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:13px">
        <div style="padding:13px;background:#FEF2F2;border-radius:12px;border:2px solid #FCA5A5">
          <div style="font-weight:900;font-size:.82rem;color:#991B1B;margin-bottom:8px">❌ Risky: All Same Type</div>
          <div style="font-size:.79rem;color:#374151;line-height:1.7">🍦 Ice cream co.<br>🌱 Farm co.<br>🍔 Restaurant co.</div>
          <div style="margin-top:8px;padding:7px;background:#FEE2E2;border-radius:8px;font-size:.75rem;font-weight:800;color:#991B1B">If food has bad year → ALL THREE lose! 😱</div>
        </div>
        <div style="padding:13px;background:#F0FDF4;border-radius:12px;border:2px solid #6EE7B7">
          <div style="font-weight:900;font-size:.82rem;color:#065F46;margin-bottom:8px">✅ Smart: Mixed Types!</div>
          <div style="font-size:.79rem;color:#374151;line-height:1.7">🚀 Toy co.<br>🎮 Tech co.<br>⚡ Energy co.</div>
          <div style="margin-top:8px;padding:7px;background:#D1FAE5;border-radius:8px;font-size:.75rem;font-weight:800;color:#065F46">If toys slow → tech &amp; energy still fine! 💪</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:#EEF2FF;border-radius:12px;font-size:.86rem;font-weight:700;color:#1E1B4B">
        <span style="font-size:1.5rem">🕷️</span>
        <span>Rocky have five arms! Each arm hold <strong>different type</strong> of company. If one arm drop something — other arms still holding! Goal: <strong>8–12 companies, all different sectors.</strong></span>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🎯 Practice: Pick the Better Company!</div>
      <div class="sec-sub">Read the clues carefully — which one would YOU invest in?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:16px">
        ${[ex, bad].map(c => `
          <div style="border:2px solid #E0E7FF;border-radius:16px;overflow:hidden">
            <div style="padding:13px;background:${c.bg};border-bottom:2px solid #E0E7FF;display:flex;align-items:center;gap:10px">
              <span style="font-size:1.9rem">${c.emoji}</span>
              <div>
                <div style="font-weight:900;font-size:.86rem">${c.name}</div>
                <div style="font-size:.71rem;color:#6B7280">${c.tag}</div>
              </div>
            </div>
            <div style="padding:10px;display:flex;flex-direction:column;gap:6px">
              ${c.clues.map(cl => `
                <div style="display:flex;align-items:flex-start;gap:6px;font-size:.78rem;font-weight:700;padding:6px 8px;border-radius:8px;background:${cl.g ? '#D1FAE5' : '#FEE2E2'};color:${cl.g ? '#065F46' : '#991B1B'}">
                  <span>${cl.g ? '✅' : '❌'}</span><span>${cl.t}</span>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <div style="font-weight:800;font-size:.97rem;margin-bottom:12px;text-align:center">Which company do you pick? 🤔</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn btn-primary ch3-btn" onclick="window.__gCh3(true)">🚀 RocketKids Toys</button>
        <button class="btn btn-outline ch3-btn" onclick="window.__gCh3(false)">🌱 GreenGrow Farms</button>
      </div>
      <div id="ch3fb" style="margin-top:13px;display:none"></div>
    </div>`;
}

function ch3ans(correct) {
  qsg('.ch3-btn').forEach(b => b.disabled = true);
  const fb = $g('ch3fb');
  fb.style.display = 'block';
  fb.innerHTML = `
    <div style="padding:14px 16px;border-radius:12px;background:${correct ? '#D1FAE5' : '#FEF3C7'};color:${correct ? '#065F46' : '#92400E'};font-weight:700;font-size:.88rem;line-height:1.6">
      ${correct
        ? '🕷️ Amaze amaze amaze!! Is correct! Rocky is SO pleased — all five arms are celebrating! RocketKids have 4 green clues — grow everywhere, kids always want new toys. Yes-yes! GreenGrow have 3 red clues — weather, slow growth, too much competition. No-no!'
        : '🤔 Hmm. Look at colors! RocketKids have 4 green ✅ clues — great signs! GreenGrow have 3 red ❌ clues — warning signs. More green = stronger company! Rocky know this!'}
    </div>
    <div style="margin-top:12px">
      <button class="btn btn-green btn-lg btn-full" onclick="window.__g4()">🎮 Now invest REAL (pretend) money! →</button>
    </div>`;
  addStars(correct ? 2 : 1, fb);
  saveChapter(3);
}

// ── CHAPTER 4: INVESTMENT CHALLENGE ──────────────────────────────────────────
function go4() {
  _open   = {};
  _picked = [];
  renderInvest();
}

function renderInvest() {
  hudUp(4, _session.stars);
  scrollTop();
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Blurt! Is <strong>Big Investment Challenge!</strong> 🎯 Rocky is very excite!<br><br>
          You have <strong>one-thousand dollars</strong> to invest. Click each company, read clues,
          then pick <strong>best 3</strong>. We fast-forward five years and see what happen!
          Use clues — Rocky believe in you!
        </div>
      </div>
    </div>
    <div class="budget-row">
      <div>
        <div style="font-size:.76rem;font-weight:900;color:var(--green);margin-bottom:2px">YOUR FUND</div>
        <div style="font-size:.71rem;color:#6B7280">$333 goes to each company you pick</div>
      </div>
      <div class="budget-amt">$1,000 💰</div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-weight:900;font-size:.97rem">Pick 3 Companies:</div>
      <div class="dot-row" id="dots">
        ${[0,1,2].map(i => `<div class="dot ${_picked.length > i ? 'on' : ''}"></div>`).join('')}
        <span style="font-size:.86rem;font-weight:800;margin-left:4px;color:${_picked.length === 3 ? 'var(--green)' : '#6B7280'}">${_picked.length}/3</span>
      </div>
    </div>
    <div id="divscore" style="margin-bottom:10px">${divScoreHTML()}</div>
    <div class="co-grid" id="cogrid">${COS.map(coCard).join('')}</div>
    <button class="btn btn-green btn-lg btn-full" id="invbtn" onclick="window.__gSubmit()" ${_picked.length < 3 ? 'disabled' : ''}>🚀 Invest My $1,000!</button>`;
}

function coCard(c) {
  const sel  = _picked.includes(c.id);
  const open = _open[c.id];
  return `
    <div class="co-card ${sel ? 'picked' : ''}" id="cc-${c.id}" style="${sel ? `border-color:${c.col};box-shadow:0 0 0 3px ${c.col}22,0 14px 36px rgba(0,0,0,.13)` : ''}">
      <div class="co-head" onclick="window.__gToggleOpen('${c.id}')">
        <div class="co-icon" style="background:${c.bg}">${c.emoji}</div>
        <div style="flex:1">
          <div class="co-name">${c.name}</div>
          <div class="co-tag">${c.tag}</div>
          <div style="display:inline-block;font-size:.63rem;font-weight:800;padding:2px 7px;border-radius:10px;margin-top:3px;background:${sectorBg(c.sector)};color:${sectorFg(c.sector)}">${sectorLabel(c.sector)}</div>
        </div>
        <div style="font-size:.95rem;color:#9CA3AF;transition:transform .2s;transform:${open ? 'rotate(180deg)' : 'rotate(0)'}">▼</div>
      </div>
      ${open ? `
        <div class="co-clues">
          ${c.clues.map(cl => `<div class="clue ${cl.g ? 'g' : 'b'}"><span>${cl.g ? '✅' : '❌'}</span><span>${cl.t}</span></div>`).join('')}
        </div>
        <div style="padding:0 14px 13px">
          <button class="btn btn-full" onclick="window.__gTogglePick('${c.id}',event)"
            style="${sel
              ? `background:white;color:${c.col};border:2.5px solid ${c.col}`
              : `background:${c.col};color:white;border:none;box-shadow:0 4px 14px ${c.col}44`}">
            ${sel ? '✓ Selected — Tap to Remove' : '+ Pick This Company!'}
          </button>
        </div>` : ''}
      <div class="co-toggle" onclick="window.__gToggleOpen('${c.id}')">${open ? 'Hide Clues ▲' : 'See Clues & Info ▼'}</div>
    </div>`;
}

function divScoreHTML() {
  if (_picked.length === 0) return `<div style="font-size:.78rem;color:#9CA3AF;font-weight:700;padding:6px 10px">Pick companies from different sectors for best protection!</div>`;
  const d = getDivScore(_picked, COS);
  const pills = d.sectors.map(s =>
    `<span style="display:inline-block;font-size:.65rem;font-weight:800;padding:2px 8px;border-radius:10px;background:${sectorBg(s)};color:${sectorFg(s)}">${sectorLabel(s)}</span>`
  ).join(' ');
  let msg, bg, tc;
  if (_picked.length === 3 && d.count === 3) {
    msg = '⭐ 3 different sectors — Rocky is very impress! Perfect spread!'; bg = '#D1FAE5'; tc = '#065F46';
  } else if (_picked.length === 3 && d.count < 3) {
    const dupe = _picked.map(id => COS.find(c => c.id === id)?.sector).find((s,i,a) => a.indexOf(s) < i);
    msg = `⚠️ Two ${sectorLabel(dupe)} picks! Rocky suggest swapping one for a different sector.`; bg = '#FEF3C7'; tc = '#92400E';
  } else {
    msg = _picked.length === 1 ? 'Good start! Add 2 more — try different sectors!' : 'Two sectors! Add a 3rd — aim for something completely different!';
    bg = '#EEF2FF'; tc = '#4338CA';
  }
  return `<div style="padding:8px 12px;border-radius:10px;background:${bg};color:${tc};font-size:.79rem;font-weight:800;display:flex;align-items:center;flex-wrap:wrap;gap:6px">${pills}<span>${msg}</span></div>`;
}

function toggleOpen(id) {
  _open[id] = !_open[id];
  $g('cogrid').innerHTML = COS.map(coCard).join('');
}

function togglePick(id, e) {
  if (e) e.stopPropagation();
  const idx = _picked.indexOf(id);
  if (idx >= 0) {
    _picked.splice(idx, 1);
  } else {
    if (_picked.length >= 3) { toast('🕷️ Blurt! Only 3 picks allowed! Remove one first. Rocky say so!'); return; }
    _picked.push(id);
  }
  $g('cogrid').innerHTML = COS.map(coCard).join('');
  const invBtn = $g('invbtn');
  if (invBtn) invBtn.disabled = _picked.length < 3;
  const dots = $g('dots');
  if (dots) {
    dots.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('on', i < _picked.length));
    const span = dots.querySelector('span');
    if (span) { span.textContent = `${_picked.length}/3`; span.style.color = _picked.length === 3 ? 'var(--green)' : '#6B7280'; }
  }
  const ds = $g('divscore');
  if (ds) ds.innerHTML = divScoreHTML();
}

function submitInvest() {
  if (_picked.length < 3) return;
  const btn = $g('invbtn');
  addStars(3, btn);
  doResults();
}

// ── CHAPTER 5: RESULTS ────────────────────────────────────────────────────────
async function doResults() {
  const picks = COS.filter(c => _picked.includes(c.id));
  const each  = Math.floor(START / 3);
  hudUp(5, _session.stars);
  scrollTop();
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Blurt! Here we go, ${_session.username}! 🎢 We fast-forward <strong>five years</strong> and see
          what happen to your one-thousand dollars. Rocky is very excite — maybe nervous too.
          Is okay. Ready? Yes-yes! ⏩
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">📊 Your Portfolio</div>
      <div class="sec-sub">$${each} invested in each company</div>
      ${picks.map(p => `
        <div class="port-row" id="pr-${p.id}">
          <span style="font-size:1.65rem">${p.emoji}</span>
          <div style="flex:1">
            <div style="font-weight:800;font-size:.86rem">${p.name}</div>
            <div style="font-size:.73rem;color:#6B7280">$${each} invested</div>
          </div>
          <div class="port-val" id="pv-${p.id}" style="color:var(--primary)">$${each}</div>
        </div>`).join('')}
      <div style="border-top:2px solid #E0E7FF;padding-top:12px;margin-top:4px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:900;font-size:.95rem">Total Portfolio:</div>
        <div style="font-size:1.3rem;font-weight:900;color:var(--primary)" id="tvtotal">$1,000</div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">⏩ Fast-Forward 5 Years…</div>
      <div class="sec-sub">Each bar shows how your total portfolio changed that year</div>
      <div id="yrbars"></div>
    </div>
    <div id="finalcard"></div>`;

  await sleep(700);
  let vals  = picks.map(() => each);
  let total = START;

  for (let y = 0; y < 5; y++) {
    const oldTotal = total;
    const rets     = picks.map(p => p.ret[y]);
    const newVals  = vals.map((v, i) => v * (1 + rets[i] / 100));
    const newTotal = newVals.reduce((a, b) => a + b, 0);
    const pct      = ((newTotal - oldTotal) / oldTotal * 100).toFixed(1);
    const up       = newTotal >= oldTotal;

    const bar = document.createElement('div');
    bar.className = 'yr-row';
    bar.innerHTML = `
      <div class="yr-lbl">Year ${y + 1}</div>
      <div class="yr-track"><div class="yr-fill ${up ? 'up' : 'dn'}" id="yf${y}" style="width:0%">${up ? '+' : ''}${pct}%</div></div>
      <div class="yr-total ${up ? 't-green' : 't-red'}">$${Math.round(newTotal).toLocaleString()}</div>`;
    $g('yrbars').appendChild(bar);
    await sleep(120);
    const w = Math.max(18, Math.min(100, Math.abs(parseFloat(pct)) * 2 + 28));
    $g('yf' + y).style.width = w + '%';
    await sleep(700);

    vals  = newVals;
    total = newTotal;
    picks.forEach((p, i) => {
      const el = $g('pv-' + p.id);
      if (!el) return;
      const v = Math.round(vals[i]);
      el.textContent = '$' + v.toLocaleString();
      el.style.color = v >= each ? 'var(--green)' : 'var(--red)';
    });
    const tv = $g('tvtotal');
    if (tv) { tv.textContent = '$' + Math.round(total).toLocaleString(); tv.style.color = total >= START ? 'var(--green)' : 'var(--red)'; }
    await sleep(500);
  }

  _finalVal = Math.round(total);
  await saveChapter(5);
  await sleep(400);
  showFinal(picks, each);
}

function showFinal(picks, each) {
  const profit = _finalVal - START;
  const pct    = ((profit / START) * 100).toFixed(0);
  const won    = profit > 0;

  let icon, title, sub;
  if (profit > 900)      { icon = '🏆'; title = 'Master Investor!';  sub = 'Incredible picks — you crushed it!'; }
  else if (profit > 400) { icon = '🌟'; title = 'Smart Investor!';   sub = 'Great research skills!'; }
  else if (profit > 0)   { icon = '📈'; title = 'Junior Investor!';  sub = 'You grew your money — nice work!'; }
  else                   { icon = '💪'; title = 'Brave Investor!';   sub = 'Every investor has tough years — keep learning!'; }

  const missed = COS.filter(c => !_picked.includes(c.id))
    .sort((a, b) => b.ret.reduce((s, r) => s + r, 0) - a.ret.reduce((s, r) => s + r, 0))
    .slice(0, 2);

  const d      = getDivScore(_picked, COS);
  const allDiff = d.count === 3;

  $g('finalcard').innerHTML = `
    <div class="badge-card">
      <div class="badge-icon">${icon}</div>
      <div class="badge-title">${title}</div>
      <div class="badge-sub">${sub}</div>
    </div>
    <div class="card">
      <div class="t-center" style="margin-bottom:14px">
        <div style="font-size:.86rem;color:#6B7280;font-weight:700;margin-bottom:4px">Your $1,000 turned into:</div>
        <div style="font-size:2.6rem;font-weight:900;color:${won ? 'var(--green)' : 'var(--red)'}">$${_finalVal.toLocaleString()}</div>
        <div style="font-size:.95rem;font-weight:800;color:${won ? 'var(--green)' : 'var(--red)'};margin-top:5px">
          ${won ? '🎉 Gained' : '📉 Lost'} $${Math.abs(profit).toLocaleString()} (${won ? '+' : ''}${pct}%)
        </div>
      </div>
      <div class="divider"></div>
      <div style="font-weight:900;font-size:.95rem;margin-bottom:10px">🕷️ Rocky Say:</div>
      <div style="padding:11px 14px;border-radius:12px;background:${allDiff ? '#D1FAE5' : '#FEF3C7'};color:${allDiff ? '#065F46' : '#92400E'};font-size:.85rem;font-weight:700;line-height:1.55;margin-bottom:12px">
        <strong>${allDiff ? '🕷️ Amaze! 3 different sectors picked!' : '⚠️ Some sectors repeated'}</strong><br>
        ${allDiff
          ? 'When one sector has bad year, the others can still grow. This is uncorrelated diversification — Rocky is very impress!'
          : 'Next time, try picking from 3 completely different sectors. One bad sector then cannot hurt all your money at once!'}
        <div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap">
          ${d.sectors.map(s => `<span style="display:inline-block;font-size:.65rem;font-weight:800;padding:2px 8px;border-radius:10px;background:white;color:${sectorFg(s)}">${sectorLabel(s)}</span>`).join('')}
        </div>
      </div>
      ${[
        ['💡', 'Companies with more ✅ green clues (loved, growing, needed by many) is usually perform better! Rocky know this!'],
        ['💡', 'Investing work best over <strong>long time</strong> — five-plus years let money compound and snowball! Is called patience. Rocky learn patience. Is hard.'],
        ['💡', 'Remember Rocky rule: invest small, but pick companies where you can win <strong>much more</strong> than you can lose. Is called asymmetric risk!'],
      ].map(([ico, txt]) => `<div style="display:flex;gap:8px;align-items:flex-start;font-size:.85rem;color:#374151;line-height:1.55;margin-bottom:9px"><span>${ico}</span><span>${txt}</span></div>`).join('')}
      ${missed.length ? `
        <div class="divider"></div>
        <div style="font-weight:900;font-size:.95rem;margin-bottom:9px">🔮 Top Performers You Missed:</div>
        ${missed.map(m => {
          const fv = each * m.ret.reduce((a, r) => a * (1 + r / 100), 1);
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#F0FDF4;border-radius:11px;margin-bottom:8px">
            <span style="font-size:1.45rem">${m.emoji}</span>
            <div style="flex:1">
              <div style="font-weight:800;font-size:.83rem">${m.name}</div>
              <div style="font-size:.73rem;color:#059669;margin-top:2px">Would have turned $${each} → $${Math.round(fv).toLocaleString()}!</div>
            </div>
          </div>`;
        }).join('')}` : ''}
      <div class="divider"></div>
      <div style="background:#EEF2FF;border-radius:12px;padding:14px;text-align:center;margin-bottom:14px">
        <div style="font-size:.8rem;color:#6B7280;margin-bottom:6px">Chapter 5 of 10 complete!</div>
        <div style="font-size:.9rem;font-weight:800;color:#4338CA">Next: The Magic of Compounding ⏩</div>
      </div>
      <button class="btn btn-green btn-lg btn-full" onclick="window.__g6()" style="margin-bottom:10px">Continue to Chapter 6 →</button>
      <button class="btn btn-outline btn-full" onclick="window.__gAgain()">🔄 Go to Dashboard</button>
    </div>`;
  confetti();
  starPop(5, $g('finalcard'));
}

// ── CHAPTERS 6–9: GENERIC QUIZ HELPER ────────────────────────────────────────
function setupQuizChapter(chapNum, boxId, qData, qi, setQi, nextFn) {
  const q = qData[qi];
  _qShuffled   = shuffle(q.opts);
  _ansHandler  = (i) => {
    const btns = qsg('.qopt');
    btns.forEach(b => b.disabled = true);
    const ok = _qShuffled[i].ok;
    btns[i].classList.add(ok ? 'correct' : 'wrong');
    if (!ok) _qShuffled.forEach((_, j) => { if (_qShuffled[j].ok) btns[j].classList.add('correct'); });
    const fb = $g(`${boxId}fb`);
    fb.style.display = 'block';
    fb.innerHTML = feedbackHTML(ok, q.ex, chapNum, qi >= qData.length - 1);
    if (ok) addStars(1, btns[i]);
  };
  _nextHandler = () => nextFn();
  $g(boxId).innerHTML = `
    <div style="font-size:1.02rem;font-weight:800;margin-bottom:12px;line-height:1.4">${q.q}</div>
    <div class="quiz-grid">${quizOptHTML(_qShuffled)}</div>
    <div id="${boxId}fb" style="margin-top:13px;display:none"></div>`;
}

// ── CHAPTER 6: COMPOUNDING ────────────────────────────────────────────────────
function go6() {
  _q6i = 0;
  hudUp(6, _session.stars);
  scrollTop();
  const rows = [[5, 161], [10, 259], [20, 673], [30, 1745]];
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Blurt! ${_session.username}, Rocky is about to share most powerful secret in universe of money! Is called <strong>compounding</strong>. Einstein call it eighth wonder of world. Rocky agree with Einstein. Is rare agreement!
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">⏰ The Magic of Time</div>
      <div class="sec-sub">$100 invested today, growing at 10% per year…</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        ${rows.map(([yr, val]) => `
          <div style="padding:14px;background:${val < 300 ? '#EEF2FF' : val < 700 ? '#F0FDF4' : '#FEF3C7'};border-radius:14px;border:2px solid ${val < 300 ? '#C7D2FE' : val < 700 ? '#A7F3D0' : '#FDE68A'};text-align:center">
            <div style="font-size:.72rem;font-weight:900;color:#6B7280;margin-bottom:6px">${yr} YEARS</div>
            <div style="font-size:1.55rem;font-weight:900;color:${val < 300 ? '#4338CA' : val < 700 ? '#059669' : '#D97706'}">$${val}</div>
            <div style="font-size:.68rem;color:#9CA3AF;margin-top:4px">from $100 start</div>
          </div>`).join('')}
      </div>
      <div style="background:#EEF2FF;border-radius:12px;padding:13px 16px;font-size:.88rem;color:#1E1B4B;line-height:1.65;border-left:4px solid var(--primary)">
        <strong>🕷️ Rocky say:</strong> ${_session.username}, you are young! This is enormous advantage. Humans who start investing early finish with MUCH more — even if they invest less money! Time is the ingredient nobody can buy back. Start now. Start small. Let compounding do work!
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🧠 Quiz: Compounding!</div>
      <div class="sec-sub">3 questions — you've got this! ⭐</div>
      <div id="q6box"></div>
    </div>`;
  renderQ6();
}

function renderQ6() {
  setupQuizChapter(6, 'q6box', Q3, _q6i, v => { _q6i = v; }, nextQ6);
}

function nextQ6() {
  _q6i++;
  if (_q6i < Q3.length) { renderQ6(); return; }
  saveChapter(6);
  $g('q6box').innerHTML = chapDoneHTML(6,
    'You understand <strong>compounding</strong> — start early, let time do the work! Is most powerful force in universe of money!',
    'window.__g7()', 'Continue to Chapter 7 →');
  confetti();
}

// ── CHAPTER 7: DON'T PANIC ────────────────────────────────────────────────────
function go7() {
  _q7i = 0;
  hudUp(7, _session.stars);
  scrollTop();
  const crashes = [
    ['2000', 'Dot-com bubble',           '-49%', '#FEE2E2', '#DC2626'],
    ['2008', 'Global Financial Crisis',  '-37%', '#FEE2E2', '#DC2626'],
    ['2020', 'COVID Crash',              '-35%', '#FEE2E2', '#DC2626'],
    ['2024', 'Recovery & New Highs',  '+180%+', '#D1FAE5', '#059669'],
  ];
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Important lesson, ${_session.username}! Markets go UP and markets go DOWN. Rocky know this. Rocky have seen many things. Key rule: <strong>do not panic!</strong> Rocky explain why panic is enemy of investor…
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">📉 Famous Market Crashes</div>
      <div class="sec-sub">Every single one recovered. Every. Single. One.</div>
      <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:14px">
        ${crashes.map(([yr, name, pct, bg, col]) => `
          <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;background:${bg};border-radius:12px">
            <div style="font-weight:900;font-size:.88rem;width:40px;flex-shrink:0;color:${col}">${yr}</div>
            <div style="flex:1;font-size:.82rem;font-weight:700;color:#374151">${name}</div>
            <div style="font-weight:900;font-size:1rem;color:${col}">${pct}</div>
          </div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="padding:13px;background:#FEE2E2;border-radius:12px;border:2px solid #FCA5A5">
          <div style="font-weight:900;font-size:.82rem;color:#991B1B;margin-bottom:6px">😱 The Panic Investor</div>
          <div style="font-size:.78rem;color:#374151;line-height:1.6">Sees crash → sells everything → locks in loss → misses recovery → loses</div>
        </div>
        <div style="padding:13px;background:#D1FAE5;border-radius:12px;border:2px solid #6EE7B7">
          <div style="font-weight:900;font-size:.82rem;color:#065F46;margin-bottom:6px">😎 The Patient Investor</div>
          <div style="font-size:.78rem;color:#374151;line-height:1.6">Sees crash → holds (maybe buys more!) → waits → recovers → wins big</div>
        </div>
      </div>
      <div style="background:#EEF2FF;border-radius:12px;padding:13px 16px;font-size:.88rem;color:#1E1B4B;line-height:1.65;border-left:4px solid var(--primary)">
        <strong>🕷️ Rocky say:</strong> Warren Buffett — famous human investor — say "be greedy when others are fearful." Rocky translate: when everyone panic and sell, <em>that</em> is when brave investor buy! Asymmetric risk protect you — you cannot lose more than you invest. So hold! Wait! Is not comfortable but is correct!
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🧠 Quiz: Don't Panic!</div>
      <div class="sec-sub">3 questions ⭐</div>
      <div id="q7box"></div>
    </div>`;
  renderQ7();
}

function renderQ7() {
  setupQuizChapter(7, 'q7box', Q4, _q7i, v => { _q7i = v; }, nextQ7);
}

function nextQ7() {
  _q7i++;
  if (_q7i < Q4.length) { renderQ7(); return; }
  saveChapter(7);
  $g('q7box').innerHTML = chapDoneHTML(7,
    'You understand <strong>patience</strong> — markets crash but always recover. Patient investors always win! Rocky is very proud.',
    'window.__g8()', 'Continue to Chapter 8 →');
  confetti();
}

// ── CHAPTER 8: MOATS ──────────────────────────────────────────────────────────
function go8() {
  _q8i = 0;
  hudUp(8, _session.stars);
  scrollTop();
  const moatCos = [
    { emoji:'🍎', name:'Apple',       moat:'Ecosystem moat', desc:"iPhone + iPad + Mac + App Store all work together. Switching is very painful!",     strength:5 },
    { emoji:'🏠', name:'REA Group',   moat:'Monopoly moat',  desc:'Almost every Australian uses realestate.com.au. No real competitor!',              strength:5 },
    { emoji:'🍔', name:"McDonald's",  moat:'Brand moat',     desc:'70 million customers trust the golden arches everywhere on Earth.',                strength:4 },
    { emoji:'🟥', name:'Roblox',      moat:'Network moat',   desc:'More players → more game creators → more players. Still growing!',                strength:3 },
  ];
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Question: why does McDonald's beat local burger shop even when local burger is tastier? Rocky think about this for long time. Answer: <strong>moat!</strong> Is concept from Warren Buffett — human Rocky respect very much!
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🏰 The 3 Types of Moats</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
        ${[
          ['🏷️','Brand Moat',     "People pay MORE just for the name. Apple, McDonald's, Nike.", '#EEF2FF','#4338CA'],
          ['🌐','Network Moat',   'More users = more valuable. Roblox: more players = more games = more players!', '#F0FDF4','#059669'],
          ['🔒','Necessity Moat', 'People HAVE to use it. Woolworths (food!), banks, electricity companies.', '#FFFBEB','#D97706'],
        ].map(([ico, name, desc, bg, col]) => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:${bg};border-radius:12px;border-left:4px solid ${col}">
            <span style="font-size:1.5rem">${ico}</span>
            <div>
              <div style="font-weight:900;font-size:.9rem;color:${col}">${name}</div>
              <div style="font-size:.8rem;color:#374151;margin-top:3px;line-height:1.45">${desc}</div>
            </div>
          </div>`).join('')}
      </div>
      <div style="font-weight:900;font-size:.92rem;margin-bottom:10px">Moat Strength of Real Companies:</div>
      ${moatCos.map(c => `
        <div style="display:flex;align-items:center;gap:11px;padding:10px 12px;background:#F8FAFF;border-radius:11px;margin-bottom:8px">
          <span style="font-size:1.5rem">${c.emoji}</span>
          <div style="flex:1">
            <div style="font-weight:800;font-size:.84rem">${c.name} <span style="font-size:.7rem;color:#9CA3AF;font-weight:600">— ${c.moat}</span></div>
            <div style="font-size:.73rem;color:#6B7280;margin-top:2px">${c.desc}</div>
          </div>
          <div style="font-size:.85rem">${'⭐'.repeat(c.strength)}<span style="opacity:.2">${'⭐'.repeat(5 - c.strength)}</span></div>
        </div>`).join('')}
    </div>
    <div class="card">
      <div class="sec-title">🧠 Quiz: Moats!</div>
      <div class="sec-sub">3 questions ⭐</div>
      <div id="q8box"></div>
    </div>`;
  renderQ8();
}

function renderQ8() {
  setupQuizChapter(8, 'q8box', Q5, _q8i, v => { _q8i = v; }, nextQ8);
}

function nextQ8() {
  _q8i++;
  if (_q8i < Q5.length) { renderQ8(); return; }
  saveChapter(8);
  $g('q8box').innerHTML = chapDoneHTML(8,
    `You understand <strong>moats</strong> — the invisible walls that protect great companies! Rocky is very impress with your progress, ${_session.username}!`,
    'window.__g9()', 'Continue to Chapter 9 →');
  confetti();
}

// ── CHAPTER 9: ETFs vs STOCKS ─────────────────────────────────────────────────
function go9() {
  _q9i = 0;
  hudUp(9, _session.stars);
  scrollTop();
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          ${_session.username}, you now know: asymmetric risk, diversification, compounding, patience, moats! Rocky is very impress. Now — the big question. <strong>ETF or individual stock?</strong> Rocky explain difference and how to use both!
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">⚖️ ETF vs Individual Stock</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div style="padding:14px;background:#EEF2FF;border-radius:14px;border:2px solid #C7D2FE">
          <div style="font-weight:900;font-size:.9rem;color:#4338CA;margin-bottom:10px">📦 ETF (e.g. VAS, VGS)</div>
          <div style="font-size:.79rem;color:#374151;line-height:1.7">
            ✅ Instant diversification<br>✅ Very low fees<br>✅ Grows with whole market<br>✅ Almost no research needed<br>⚠️ Average market returns<br>⚠️ Can't beat the market
          </div>
        </div>
        <div style="padding:14px;background:#F0FDF4;border-radius:14px;border:2px solid #A7F3D0">
          <div style="font-weight:900;font-size:.9rem;color:#059669;margin-bottom:10px">📈 Individual Stock</div>
          <div style="font-size:.79rem;color:#374151;line-height:1.7">
            ✅ Can beat the market!<br>✅ Asymmetric upside<br>✅ Own great businesses<br>⚠️ Requires your research<br>⚠️ More risk per company<br>⚠️ Need diversification
          </div>
        </div>
      </div>
      <div style="font-weight:900;font-size:.95rem;margin-bottom:10px">🕷️ Rocky's Two-Basket Strategy:</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#FFFBEB;border-radius:12px;border-left:4px solid var(--gold)">
          <span style="font-size:1.4rem">🧱</span>
          <div>
            <div style="font-weight:900;font-size:.86rem">Foundation Basket (ETFs)</div>
            <div style="font-size:.78rem;color:#6B7280;margin-top:2px">VAS + VGS → safe, boring, reliable. Maybe 60–80% of your money. Rocky recommend for beginners!</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#F0FDF4;border-radius:12px;border-left:4px solid var(--green)">
          <span style="font-size:1.4rem">🚀</span>
          <div>
            <div style="font-weight:900;font-size:.86rem">Upside Basket (Individual Stocks)</div>
            <div style="font-size:.78rem;color:#6B7280;margin-top:2px">Your best researched picks → asymmetric upside. Maybe 20–40%. Use Research Lab to choose!</div>
          </div>
        </div>
      </div>
      <div style="background:#EEF2FF;border-radius:12px;padding:12px 15px;font-size:.85rem;color:#1E1B4B;line-height:1.6">
        <strong>🕷️ Rocky say:</strong> ETF is like buying whole forest. One tree falls — forest still stands. Individual stock is like betting one tree grows to sky. Maybe it does! But pick carefully. Use BOTH baskets. Is best strategy Rocky know in this galaxy.
      </div>
    </div>
    <div class="card">
      <div class="sec-title">🧠 Quiz: ETFs vs Stocks!</div>
      <div class="sec-sub">3 questions ⭐</div>
      <div id="q9box"></div>
    </div>`;
  renderQ9();
}

function renderQ9() {
  setupQuizChapter(9, 'q9box', Q6, _q9i, v => { _q9i = v; }, nextQ9);
}

function nextQ9() {
  _q9i++;
  if (_q9i < Q6.length) { renderQ9(); return; }
  saveChapter(9);
  $g('q9box').innerHTML = chapDoneHTML(9,
    `You understand <strong>ETFs vs stocks</strong> — use both baskets! Rocky is SO impress with ${_session.username}. One chapter remains…`,
    'window.__g10()', 'Final Chapter 10 →');
  confetti();
}

// ── CHAPTER 10: BUILD YOUR PORTFOLIO (CAPSTONE) ───────────────────────────────
function go10() {
  _cap10 = { etf: null, stocks: [] };
  render10();
}

function render10() {
  const etfOk    = _cap10.etf !== null;
  const stocksOk = _cap10.stocks.length >= 2;
  const allOk    = etfOk && stocksOk;
  const stockDiv = getDivScore(_cap10.stocks, _capStocks);

  hudUp(10, _session.stars);
  scrollTop();
  gel().innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Blurt! ${_session.username}! This is <strong>final chapter</strong>! You learn everything Rocky know about investing. Now — build your REAL portfolio! If you had $1,000 to invest TODAY, what would you pick? Rocky help you construct!
        </div>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="sec-title" style="margin:0">Step 1: Pick your ETF foundation 🧱</div>
        ${etfOk ? '<span style="font-size:.8rem;font-weight:900;color:var(--green)">✓ Done!</span>' : ''}
      </div>
      <div class="sec-sub">Choose 1 ETF as your safe base (~60% of portfolio)</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${_capEtfs.map(c => {
          const sel = _cap10.etf === c.id;
          return `<div onclick="window.__gCap10Etf('${c.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:2.5px solid ${sel ? c.col : '#E0E7FF'};background:${sel ? c.bg : 'white'};cursor:pointer;transition:all .18s">
            <span style="font-size:1.7rem">${c.emoji}</span>
            <div style="flex:1">
              <div style="font-weight:800;font-size:.86rem">${c.name}</div>
              <div style="font-size:.73rem;color:#6B7280">${c.tag}</div>
            </div>
            <div style="width:22px;height:22px;border-radius:50%;border:2.5px solid ${sel ? c.col : '#CBD5E1'};background:${sel ? c.col : 'white'};display:flex;align-items:center;justify-content:center;font-size:.7rem;color:white">${sel ? '✓' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="sec-title" style="margin:0">Step 2: Pick 2–3 individual stocks 🚀</div>
        ${stocksOk ? `<span style="font-size:.8rem;font-weight:900;color:var(--green)">✓ ${_cap10.stocks.length} picked!</span>` : ''}
      </div>
      <div class="sec-sub">Choose companies you believe in (from different sectors!)</div>
      ${_cap10.stocks.length > 0 ? `
        <div style="margin-bottom:10px;padding:9px 12px;border-radius:10px;background:${stockDiv.count === _cap10.stocks.length ? '#D1FAE5' : '#FEF3C7'};font-size:.79rem;font-weight:800;color:${stockDiv.count === _cap10.stocks.length ? '#065F46' : '#92400E'}">
          ${stockDiv.count === _cap10.stocks.length ? '⭐ All different sectors!' : '⚠️ Try adding a different sector!'} — ${stockDiv.sectors.map(s => sectorLabel(s)).join(' + ')}
        </div>` : ''}
      <div class="rc-grid">
        ${_capStocks.map(c => {
          const sel = _cap10.stocks.includes(c.id);
          return `<div onclick="window.__gCap10Stock('${c.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:2.5px solid ${sel ? c.col : '#E0E7FF'};background:${sel ? c.bg : 'white'};cursor:pointer;transition:all .18s">
            <span style="font-size:1.6rem">${c.emoji}</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:800;font-size:.8rem">${c.name}</div>
              <div style="font-size:.62rem;color:#9CA3AF">${c.ticker}</div>
              <div style="display:inline-block;font-size:.6rem;font-weight:800;padding:1px 5px;border-radius:6px;background:${sectorBg(c.sector)};color:${sectorFg(c.sector)}">${sectorLabel(c.sector)}</div>
            </div>
            <div style="width:20px;height:20px;border-radius:50%;border:2.5px solid ${sel ? c.col : '#CBD5E1'};background:${sel ? c.col : 'white'};display:flex;align-items:center;justify-content:center;font-size:.65rem;color:white;flex-shrink:0">${sel ? '✓' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    ${allOk ? `
    <div class="card" style="text-align:center;padding:20px">
      <div style="font-size:.86rem;font-weight:800;color:#6B7280;margin-bottom:12px">Your $1,000 Portfolio:</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">
        ${(() => { const etf = _capEtfs.find(c => c.id === _cap10.etf); return `<div style="padding:10px 16px;background:${etf?.bg||'#EEF2FF'};border-radius:12px;font-size:.82rem;font-weight:900">${etf?.emoji} ${etf?.name} <span style="opacity:.6">$600</span></div>`; })()}
        ${_cap10.stocks.map(id => { const c = _capStocks.find(x => x.id === id); return `<div style="padding:10px 16px;background:${c.bg};border-radius:12px;font-size:.82rem;font-weight:900">${c.emoji} ${c.name} <span style="opacity:.6">$${Math.round(400 / _cap10.stocks.length)}</span></div>`; }).join('')}
      </div>
      <button class="btn btn-gold btn-lg btn-full" onclick="window.__gFinish()">🏆 Complete My Portfolio!</button>
    </div>` : `
    <div class="card" style="background:#F8FAFF;border:2px dashed #C7D2FE;text-align:center;padding:18px;color:#9CA3AF;font-weight:800;font-size:.88rem">
      ${!etfOk ? 'Pick your ETF above to continue…' : 'Pick at least 2 stocks above to continue…'}
    </div>`}`;
}

function pickCap10Etf(id) {
  _cap10.etf = _cap10.etf === id ? null : id;
  render10();
}

function pickCap10Stock(id) {
  const idx = _cap10.stocks.indexOf(id);
  if (idx >= 0) {
    _cap10.stocks.splice(idx, 1);
  } else {
    if (_cap10.stocks.length >= 3) { toast('🕷️ Rocky say: 2–3 stocks is enough! Remove one first.'); return; }
    _cap10.stocks.push(id);
  }
  render10();
}

async function finishCap10() {
  await saveChapter(10);
  const etf    = _capEtfs.find(c => c.id === _cap10.etf);
  const stocks = _cap10.stocks.map(id => _capStocks.find(c => c.id === id));
  const div    = getDivScore(_cap10.stocks, _capStocks);
  const perfect = div.count === _cap10.stocks.length;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="badge-card" style="margin-top:16px">
      <div class="badge-icon">🏆</div>
      <div class="badge-title">Master Investor!</div>
      <div class="badge-sub">${_session.username} has completed Rocky's Investing Academy</div>
    </div>
    <div class="card">
      <div class="sec-title">🕷️ Rocky's Final Assessment</div>
      <div style="font-size:.9rem;line-height:1.7;color:#374151;margin-bottom:14px">
        ${perfect
          ? `Amaze amaze amaze!! ${_session.username} pick ETF foundation <strong>${etf?.name}</strong> PLUS ${stocks.length} stocks from ${div.count} <em>different</em> sectors! Is perfect asymmetric portfolio! Rocky is very proud — all five arms celebrating! 🕷️🎉`
          : `Very good, ${_session.username}! ETF foundation <strong>${etf?.name}</strong> gives safety. Individual stocks give upside. Next time, try picking stocks from completely different sectors for even better protection!`}
      </div>
      <div style="background:#EEF2FF;border-radius:12px;padding:13px 15px;font-size:.84rem;line-height:1.65;color:#1E1B4B">
        <strong>📋 Rocky's 10 Rules You Now Know:</strong><br>
        ✅ Companies sell things to make money<br>
        ✅ Investing = owning part of a company<br>
        ✅ Read clues to find great companies<br>
        ✅ Asymmetric risk — wins bigger than losses<br>
        ✅ 8–12 uncorrelated companies for safety<br>
        ✅ Compounding — start early, wait long<br>
        ✅ Don't panic — markets always recover<br>
        ✅ Find companies with strong moats<br>
        ✅ ETF foundation + stock upside<br>
        ✅ Build your real portfolio and hold!
      </div>
      <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn btn-primary btn-full" onclick="window.__nav('screen-lab')">🔬 Research Lab</button>
        <button class="btn btn-green btn-full" onclick="window.__nav('screen-home')">💼 My Dashboard</button>
      </div>
    </div>`;

  gel().appendChild(wrap);
  window.scrollTo({ top: 9999, behavior: 'smooth' });
  confetti();
  starPop(10, wrap);
}
