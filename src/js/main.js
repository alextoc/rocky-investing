import { getSession } from './auth.js';
import { mountLogin } from './screens/login.js';
import { navigate } from './router.js';
import { bootApp } from './boot.js';

document.addEventListener('DOMContentLoaded', async () => {
  const session = getSession();

  if (session) {
    // ── RETURNING USER — session still valid ──────────────────────────────
    await bootApp(session);
  } else {
    // ── NEW / LOGGED-OUT USER — show login screen ─────────────────────────
    mountLogin();
    navigate('screen-login');
  }
});
