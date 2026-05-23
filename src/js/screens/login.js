import { getAllProfiles, createProfile } from '../db.js';
import { saveSession } from '../auth.js';
import { toast } from '../utils.js';
import { bootApp } from '../boot.js';

const AVATARS = ['🦁','🦊','🐻','🐯','🦋','🦄','🐉','🦈','🐼','🦅','🐸','🦖'];
const COLORS  = ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#059669'];

let newName   = '';
let newAvatar = AVATARS[0];
let newColor  = COLORS[0];

export async function mountLogin() {
  const el = document.getElementById('screen-login');
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading profiles…</div>`;
  const profiles = await getAllProfiles().catch(() => []);
  renderPicker(el, profiles);
}

function renderPicker(el, profiles) {
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
          <button class="profile-btn" onclick="window.__loginSelect('${p.id}')">
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

  window.__loginSelect = async (id) => {
    const { data } = await import('../db.js').then(m =>
      m.supabase.from('profiles').select('*').eq('id', id).single()
    );
    if (data) {
      const session = saveSession(data);
      await bootApp(session);
    }
  };
  window.__loginCreate = () => renderCreateForm(el);
}

function renderCreateForm(el) {
  newName = ''; newAvatar = AVATARS[0]; newColor = COLORS[0];
  el.innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Amaze amaze amaze! New investor! Rocky is very excite! Tell Rocky your name and pick your look!
        </div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">New Investor 🎉</div>
      <div style="margin-bottom:16px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Your name</label>
        <input id="new-name" class="name-inp" type="text" placeholder="e.g. Liam, Sofia…" maxlength="20" oninput="window.__newName(this.value)"/>
      </div>
      <div style="margin-bottom:20px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:8px">Pick your avatar</label>
        <div class="avatar-grid" id="avatar-grid">
          ${AVATARS.map((a,i) => `<div class="avatar-opt ${i===0?'on':''}" onclick="window.__pickAvatar(${i},'${COLORS[i]}')">${a}</div>`).join('')}
        </div>
      </div>
      <div id="create-err" style="color:var(--red);font-size:.82rem;font-weight:800;min-height:22px;text-align:center;margin-bottom:8px"></div>
      <button class="btn btn-green btn-lg btn-full" onclick="window.__createSubmit()">🕷️ Create My Profile!</button>
      <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="window.__loginBack()">← Back</button>
    </div>`;

  window.__newName = v => { newName = v; };
  window.__pickAvatar = (i, color) => {
    newAvatar = AVATARS[i]; newColor = color;
    document.querySelectorAll('.avatar-opt').forEach((a,j) => a.classList.toggle('on', j===i));
  };
  window.__createSubmit = async () => {
    const errEl = document.getElementById('create-err');
    if (!newName.trim()) { errEl.textContent = '❌ Please enter your name!'; return; }
    errEl.textContent = '';
    try {
      const profile = await createProfile({ username: newName.trim(), avatarEmoji: newAvatar, avatarColor: newColor });
      const session = saveSession(profile);
      toast(`🕷️ Welcome, ${profile.username}! Rocky is very excite!`);
      await bootApp(session);
    } catch (e) {
      errEl.textContent = e.message.includes('unique') ? '❌ That name is taken — try another!' : `❌ Error: ${e.message}`;
    }
  };
  window.__loginBack = () => mountLogin();
}
