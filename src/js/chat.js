// Phase 3 — Rocky AI Chat panel
// Floating 🕷️ button → slide-up chat panel → Netlify function → Anthropic API

let _session  = null;
let _messages = [];
let _loading  = false;

export function mountChat(session) {
  _session = session;
  _messages = [{
    role: 'rocky',
    text: `Blurt! Hello ${session.username}! Rocky is here and very excite to answer ALL your investing questions! What do you want to know today?`,
  }];
  injectDOM();
  window.__chatOpen  = openChat;
  window.__chatClose = closeChat;
  window.__chatSend  = sendMsg;
  window.__chatKey   = (e) => { if (e.key === 'Enter' && !e.shiftKey) sendMsg(); };
}

// ── DOM injection ──────────────────────────────────────────────────────────────
function injectDOM() {
  // Tear down any stale elements from a previous session
  document.getElementById('chat-fab')?.remove();
  document.getElementById('chat-panel')?.remove();

  // Floating action button
  const fab = document.createElement('button');
  fab.id    = 'chat-fab';
  fab.title = 'Ask Rocky!';
  fab.setAttribute('aria-label', 'Ask Rocky the investing tutor');
  fab.innerHTML = '🕷️';
  fab.onclick   = openChat;
  document.body.appendChild(fab);

  // Panel
  const panel = document.createElement('div');
  panel.id = 'chat-panel';
  panel.innerHTML = `
    <div id="chat-overlay"></div>
    <div id="chat-box" role="dialog" aria-label="Rocky AI Tutor chat">
      <div id="chat-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.6rem;animation:float 3s ease-in-out infinite">🕷️</span>
          <div>
            <div style="font-weight:900;font-size:.95rem">Ask Rocky!</div>
            <div style="font-size:.65rem;opacity:.75;font-weight:700">AI Investing Tutor · 3-sentence answers</div>
          </div>
        </div>
        <button id="chat-close-btn" aria-label="Close chat" onclick="window.__chatClose()">✕</button>
      </div>
      <div id="chat-messages" role="log" aria-live="polite"></div>
      <div id="chat-input-row">
        <input
          id="chat-input"
          type="text"
          placeholder="Ask anything about investing…"
          onkeydown="window.__chatKey(event)"
          maxlength="200"
          autocomplete="off"
        />
        <button id="chat-send" onclick="window.__chatSend()">Send 🚀</button>
      </div>
    </div>`;
  document.body.appendChild(panel);
  document.getElementById('chat-overlay').onclick = closeChat;
}

// ── Open / close ───────────────────────────────────────────────────────────────
function openChat() {
  const panel = document.getElementById('chat-panel');
  if (!panel) return;
  panel.style.display = 'block';
  document.getElementById('chat-fab').style.display = 'none';
  renderMessages();
  setTimeout(() => document.getElementById('chat-input')?.focus(), 280);
}

function closeChat() {
  const panel = document.getElementById('chat-panel');
  if (!panel) return;
  panel.style.display = 'none';
  document.getElementById('chat-fab').style.display = 'flex';
}

// ── Render messages ────────────────────────────────────────────────────────────
function renderMessages() {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  el.innerHTML = _messages.map(m => `
    <div class="chat-msg ${m.role}">
      <div class="chat-avatar">${m.role === 'rocky' ? '🕷️' : (_session?.avatarEmoji ?? '👤')}</div>
      <div class="chat-bubble">${escHtml(m.text)}</div>
    </div>`).join('');

  if (_loading) {
    el.innerHTML += `
      <div class="chat-msg rocky">
        <div class="chat-avatar">🕷️</div>
        <div class="chat-bubble">
          <div class="chat-typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>`;
  }
  el.scrollTop = el.scrollHeight;
}

// ── Send message ───────────────────────────────────────────────────────────────
async function sendMsg() {
  if (_loading) return;
  const input = document.getElementById('chat-input');
  const text  = input?.value?.trim();
  if (!text) return;

  input.value = '';
  _messages.push({ role: 'user', text });
  _loading = true;

  const sendBtn = document.getElementById('chat-send');
  if (sendBtn) sendBtn.disabled = true;

  renderMessages();

  try {
    const res  = await fetch('/.netlify/functions/rocky-chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: text, context: buildContext() }),
    });
    const data = await res.json();
    _messages.push({ role: 'rocky', text: data.reply || "Blurt! Rocky got confused! Try asking again?" });
  } catch {
    _messages.push({ role: 'rocky', text: "Blurt! Rocky's connection broke! Check your internet and try again!" });
  }

  _loading = false;
  if (sendBtn) sendBtn.disabled = false;
  renderMessages();
  document.getElementById('chat-input')?.focus();
}

// ── Context builder ────────────────────────────────────────────────────────────
function buildContext() {
  // window.__portfolioContext is set by home.js when the dashboard loads
  if (window.__portfolioContext) return window.__portfolioContext;
  return `Kid: ${_session?.username ?? 'unknown'}, chapters done: ${_session?.chaptersDone ?? 0}/10, stars earned: ${_session?.stars ?? 0}.`;
}

// ── Utility ────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
