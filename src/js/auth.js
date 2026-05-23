// ── PIN HASHING ───────────────────────────────────────────────────────────────
export async function hashPIN(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(pin)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── SESSION (localStorage, 30-day expiry) ─────────────────────────────────────
const SESSION_KEY = 'rocky_session';

export function saveSession(profile) {
  const session = {
    profileId:    profile.id,
    username:     profile.username,
    avatarEmoji:  profile.avatar_emoji,
    avatarColor:  profile.avatar_color,
    stars:        profile.stars,
    chaptersDone: profile.chapters_done,
    customCompanies: profile.custom_companies ?? [],
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() > s.expiresAt) { clearSession(); return null; }
    return s;
  } catch { return null; }
}

export function updateSession(updates) {
  const s = getSession();
  if (!s) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, ...updates }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── PARENT PIN ────────────────────────────────────────────────────────────────
// Validated server-side via /api/auth-parent to keep the PIN out of the browser.
export async function checkParentPin(pin) {
  const res = await fetch('/api/auth-parent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  return res.ok;
}
