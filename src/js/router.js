// ── ROUTER ────────────────────────────────────────────────────────────────────
// Manages which screen is visible and updates the nav bar.

const NAV_ITEMS = [
  { id: 'screen-home',      icon: '🏠', label: 'Home' },
  { id: 'screen-game',      icon: '🎓', label: 'Learn' },
  { id: 'screen-lab',       icon: '🔬', label: 'Research' },
  { id: 'screen-watchlist', icon: '👁',  label: 'Watchlist' },
  { id: 'screen-portfolio', icon: '💼', label: 'Portfolio' },
];

let currentScreen = null;
let onNavigateCallbacks = {};

export function onNavigate(screenId, cb) {
  onNavigateCallbacks[screenId] = cb;
}

export function navigate(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  // Show target
  const el = document.getElementById(screenId);
  if (el) el.classList.add('active');
  currentScreen = screenId;

  // Show/hide HUD (only during game)
  document.getElementById('hud').classList.toggle('show', screenId === 'screen-game');

  // Update nav highlight — parent screen has no nav highlight
  const navBar = document.getElementById('nav-bar');
  navBar.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.screen === screenId);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Fire mount callback
  if (onNavigateCallbacks[screenId]) onNavigateCallbacks[screenId]();
}

export function buildNav(session) {
  const navBar = document.getElementById('nav-bar');
  navBar.innerHTML = NAV_ITEMS.map(item => `
    <button class="nav-btn" data-screen="${item.id}" onclick="window.__nav('${item.id}')">
      <span>${item.icon}</span>
      <span>${item.label}</span>
    </button>
  `).join('') + `
    <button class="nav-btn nav-profile" onclick="window.__switchProfile()" title="Switch profile">
      <span style="font-size:1.3rem;line-height:1">${session.avatarEmoji}</span>
      <span>Switch</span>
    </button>`;
  navBar.classList.add('show');
  // Expose globally so inline onclick works
  window.__nav = navigate;
}

export function hudUp(chapter, stars) {
  document.getElementById('sc').textContent = stars;
  document.getElementById('cl').textContent = `Chapter ${chapter} / 10`;
  document.getElementById('pf').style.width = `${chapter / 10 * 100}%`;
}

export function getCurrentScreen() { return currentScreen; }
