import { getAllProfiles, createProfile } from '../db.js';
import { hashPIN, saveSession } from '../auth.js';
import { toast } from '../utils.js';
import { bootApp } from '../boot.js';

const AVATARS = ['🦁','🦊','🐻','🐯','🦋','🦄','🐉','🦈','🐼','🦅','🐸','🦖'];
const COLORS  = ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#059669'];

let pinBuffer = '';
let selectedProfile = null;
let createMode = false;
let newName = '';
let newAvatar = AVATARS[0];
let newColor  = COLORS[0];
let newPin1 = '';
let newPin2 = '';

export async function mountLogin() {
  const el = document.getElementById('screen-login');
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading profiles…</div>`;
  const profiles = await getAllProfiles().catch(() => []);
  renderPicker(el, profiles);
}

function renderPicker(el, profiles) {
  createMode = false; selectedProfile = null; pinBuffer = '';
  el.innerHTML = `
    <div class="card hero">
      <span class="hero-emoji">🕷️</span>
      <h1>Rocky's Investing Academy</h1>
      <p>Who's investing today? Pick your profile or create a new one!</p>
    </div>
    <div class="card">
      <div class="sec-title">Who's playing? 👋</div>
      <div class="profile-grid" id="profile-grid">
        ${profiles.map(p => `
          <button class="profile-btn" onclick="window.__loginSelect('${p.id}','${p.username}','${p.avatar_emoji}','${p.avatar_color}')">
            <span class="p-avatar">${p.avatar_emoji}</span>
            <span class="p-name">${p.username}</span>
            <span style="font-size:.7rem;color:#9CA3AF">⭐ ${p.stars} stars</span>
          </button>
        `).join('')}
        <button class="profile-btn add-new" onclick="window.__loginCreate()">
          <span class="p-avatar" style="font-size:2rem">➕</span>
          <span class="p-name" style="color:#9CA3AF">New Investor</span>
        </button>
      </div>
    </div>`;

  window.__loginSelect = (id, username, emoji, color) => renderPinPad(el, { id, username, avatarEmoji: emoji, avatarColor: color });
  window.__loginCreate = () => renderCreateForm(el);
}

function renderPinPad(el, profile) {
  selectedProfile = profile; pinBuffer = '';
  el.innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Blurt! Is <strong>${profile.username}</strong>! Rocky is very excite to see you! Enter PIN to continue!
        </div>
      </div>
    </div>
    <div class="card t-center">
      <div style="font-size:3rem;margin-bottom:8px">${profile.avatarEmoji}</div>
      <div style="font-size:1.1rem;font-weight:900;margin-bottom:4px">${profile.username}</div>
      <div class="pin-display" id="pin-dots">
        ${[0,1,2,3].map(() => `<div class="pin-dot"></div>`).join('')}
      </div>
      <div id="pin-err" style="color:var(--red);font-size:.82rem;font-weight:800;min-height:22px;margin-bottom:8px"></div>
      <div class="pin-grid">
        ${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(k => `
          <button class="pin-key ${k===''?'empty':k==='⌫'?'del':''}"
            onclick="window.__pinKey('${k}')"
            ${k===''?'disabled style="pointer-events:none"':''}>${k}</button>
        `).join('')}
      </div>
      <button class="btn btn-outline btn-full" style="margin-top:16px" onclick="window.__loginBack()">← Back</button>
    </div>`;

  window.__pinKey = async (k) => {
    if (k === '') return;
    if (k === '⌫') { pinBuffer = pinBuffer.slice(0,-1); }
    else if (pinBuffer.length < 4) { pinBuffer += k; }
    updatePinDots();
    if (pinBuffer.length === 4) await checkLogin();
  };
  window.__loginBack = () => mountLogin();
}

function updatePinDots() {
  const dots = document.querySelectorAll('#pin-dots .pin-dot');
  dots.forEach((d, i) => d.classList.toggle('filled', i < pinBuffer.length));
}

async function checkLogin() {
  const hash = await hashPIN(pinBuffer);
  const { data } = await import('../db.js').then(m =>
    m.supabase.from('profiles').select('*').eq('id', selectedProfile.id).single()
  );
  if (data?.pin_hash === hash) {
    const session = saveSession(data);
    await bootApp(session);
  } else {
    document.getElementById('pin-err').textContent = '❌ Wrong PIN — try again!';
    pinBuffer = '';
    updatePinDots();
  }
}

function renderCreateForm(el) {
  createMode = true; newPin1 = ''; newPin2 = ''; newAvatar = AVATARS[0]; newColor = COLORS[0];
  el.innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Amaze amaze amaze! New investor! Rocky is very excite! Tell Rocky your name and pick a PIN so only YOU can log in!
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">New Investor 🎉</div>
      <div style="margin-bottom:16px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Your name</label>
        <input id="new-name" class="name-inp" type="text" placeholder="e.g. Liam, Sofia…" maxlength="20" oninput="window.__newName(this.value)"/>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:8px">Pick your avatar</label>
        <div class="avatar-grid" id="avatar-grid">
          ${AVATARS.map((a,i) => `<div class="avatar-opt ${i===0?'on':''}" onclick="window.__pickAvatar(${i},'${COLORS[i]}')">${a}</div>`).join('')}
        </div>
      </div>
      <div style="margin-bottom:8px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Set your PIN</label>
        <div class="pin-display" id="pin-dots1">${[0,1,2,3].map(()=>`<div class="pin-dot"></div>`).join('')}</div>
      </div>
      <div style="margin-bottom:8px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Confirm PIN</label>
        <div class="pin-display" id="pin-dots2">${[0,1,2,3].map(()=>`<div class="pin-dot"></div>`).join('')}</div>
      </div>
      <div id="create-err" style="color:var(--red);font-size:.82rem;font-weight:800;min-height:22px;text-align:center;margin-bottom:8px"></div>
      <div class="pin-grid">
        ${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(k=>`
          <button class="pin-key ${k===''?'empty':k==='⌫'?'del':''}" onclick="window.__createKey('${k}')" ${k===''?'disabled style="pointer-events:none"':''}>${k}</button>
        `).join('')}
      </div>
      <button class="btn btn-green btn-lg btn-full" style="margin-top:16px" onclick="window.__createSubmit()">🕷️ Create My Profile!</button>
      <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="window.__loginBack()">← Back</button>
    </div>`;

  window.__newName = v => { newName = v; };
  window.__pickAvatar = (i, color) => {
    newAvatar = AVATARS[i]; newColor = color;
    document.querySelectorAll('.avatar-opt').forEach((a,j) => a.classList.toggle('on', j===i));
  };
  window.__createKey = k => {
    if (k === '') return;
    const filling1 = newPin1.length < 4;
    if (k === '⌫') {
      if (!filling1) newPin2 = newPin2.slice(0,-1);
      else newPin1 = newPin1.slice(0,-1);
    } else {
      if (filling1) newPin1 += k;
      else if (newPin2.length < 4) newPin2 += k;
    }
    document.querySelectorAll('#pin-dots1 .pin-dot').forEach((d,i) => d.classList.toggle('filled', i < newPin1.length));
    document.querySelectorAll('#pin-dots2 .pin-dot').forEach((d,i) => d.classList.toggle('filled', i < newPin2.length));
  };
  window.__createSubmit = async () => {
    const errEl = document.getElementById('create-err');
    if (!newName.trim())        { errEl.textContent = '❌ Please enter your name!'; return; }
    if (newPin1.length < 4)     { errEl.textContent = '❌ Please set a 4-digit PIN!'; return; }
    if (newPin2 !== newPin1)    { errEl.textContent = '❌ PINs don\'t match — try again!'; newPin2=''; document.querySelectorAll('#pin-dots2 .pin-dot').forEach(d=>d.classList.remove('filled')); return; }
    errEl.textContent = '';
    try {
      const pinHash = await hashPIN(newPin1);
      const profile = await createProfile({ username: newName.trim(), pinHash, avatarEmoji: newAvatar, avatarColor: newColor });
      const session = saveSession(profile);
      toast(`🕷️ Welcome, ${profile.username}! Rocky is very excite!`);
      await bootApp(session);
    } catch (e) {
      errEl.textContent = e.message.includes('unique') ? '❌ That name is taken — try another!' : `❌ Error: ${e.message}`;
    }
  };
  window.__loginBack = () => mountLogin();
}
