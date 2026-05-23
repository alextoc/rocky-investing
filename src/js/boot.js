// Shared app bootstrapper — called after login (or on page load with existing session)
import { buildNav, navigate } from './router.js';
import { clearSession } from './auth.js';
import { mountLogin } from './screens/login.js';
import { mountHome } from './screens/home.js';
import { mountGame } from './screens/game.js';
import { mountLab } from './screens/lab.js';
import { mountWatchlist } from './screens/watchlist.js';
import { mountPortfolio } from './screens/portfolio.js';
import { mountParent } from './screens/parent.js';

export async function bootApp(session) {
  buildNav(session);

  // Profile switcher — clears session and returns to login screen
  window.__switchProfile = async () => {
    clearSession();
    document.getElementById('nav-bar').classList.remove('show');
    document.getElementById('hud').classList.remove('show');
    await mountLogin();
    navigate('screen-login');
  };

  await mountHome(session);
  mountGame(session);
  mountLab(session);
  mountWatchlist(session);
  mountPortfolio(session);
  mountParent();
  navigate('screen-home');
}
