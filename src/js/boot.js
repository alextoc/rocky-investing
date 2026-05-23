// Shared app bootstrapper — called after login (or on page load with existing session)
import { buildNav, navigate } from './router.js';
import { mountHome } from './screens/home.js';
import { mountGame } from './screens/game.js';
import { mountLab } from './screens/lab.js';
import { mountWatchlist } from './screens/watchlist.js';
import { mountPortfolio } from './screens/portfolio.js';
import { mountParent } from './screens/parent.js';

export async function bootApp(session) {
  buildNav(session);
  await mountHome(session);
  mountGame(session);       // renders starting chapter into screen-game (hidden until user navigates there)
  mountLab(session);
  mountWatchlist(session);
  mountPortfolio(session);
  mountParent();
  navigate('screen-home');
}
