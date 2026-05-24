# Rocky's Investing Academy

A kids' investing education app built for Alex's children (7-year-old son). Live at **rockyinvest.netlify.app** · Code at **github.com/alextoc/rocky-investing**

## What it is
A Synthesis.com-style gamified investing app where kids learn investing concepts through lessons with Rocky the spider, research real companies, and build a watchlist. Built with vanilla JS (ES modules), hosted on Netlify with serverless functions, Supabase for data.

## Tech Stack
- **Frontend:** Single-page app, vanilla JS ES modules, `src/js/screens/` for each screen
- **Backend:** Netlify Functions in `netlify/functions/` (Node 18, ESM)
- **Database:** Supabase (PostgreSQL) — tables: `profiles`, `progress`, `watchlist`, `price_cache`
- **APIs:** Yahoo Finance v8 chart (no auth, price data), Finnhub (US stock fundamentals, key in `FINNHUB_KEY` env var)
- **Deploy:** Push to `main` → Netlify auto-deploys

## Key Files
- `src/js/screens/lab.js` — Research Lab (industry browser, company research flow)
- `src/js/screens/game.js` — Lessons with Rocky (10 chapters + 5 bonus lessons)
- `src/js/screens/login.js` — Profile select/create (no PIN)
- `src/js/boot.js` — App entry point after login
- `src/js/router.js` — Nav bar (5 screens + Switch Profile button)
- `netlify/functions/company-research.js` — Fetches 5 data points for a stock
- `netlify/functions/prices.js` — Live prices for watchlist (cached in Supabase)
- `src/js/data/companies.js` — Pre-curated RC (Rocky's Companies) list
- `src/js/data/tickers.js` — Local ticker lookup map

## Features Built
1. **Login** — Pick or create a profile (name + emoji avatar, no PIN)
2. **Lessons (Game)** — 10 chapters teaching investing basics + 5 bonus lessons after completion
3. **Research Lab** — Browse 7 industries (Tech, Food, Gaming, Health, Transport, Mining, Banks), each with 8-10 curated companies. Click Research → live data cards
4. **Watchlist** — Track companies, see live prices
5. **Portfolio** — Track paper investments
6. **Switch Profile** — Nav bar button to switch between kids' profiles

## Research Lab Flow
1. **Browse by Industry** → pick sector → see 5 companies (paginated)
2. Each company card: emoji, name, ticker, tag (🌟 Top Performer / 🚀 Rising Star / 🦘 Aussie Star), 1-line desc
3. Tap **Research** → fetches live data → shows 5 data cards:
   - 📊 Today's Price (Yahoo Finance v8 chart, no auth)
   - 🏰 Company Size (Finnhub for US / static pre-baked for ASX)
   - 📈 Last 12 Months (Yahoo Finance v8 chart)
   - 💰 Is It Profitable? (Finnhub for US / static for ASX)
   - 🎯 What Experts Think (Finnhub for US / static for ASX)
4. Rocky gives a green/yellow/red grade + kid-friendly explanation for each
5. Save to My Lab + Watchlist

## Company Research Data Sources
- **US tickers** (AAPL, MSFT etc): Yahoo v8 chart for price/performance + Finnhub for fundamentals
- **ASX tickers** (QAN.AX etc): Yahoo v8 chart for price/performance + pre-baked static data in `STATIC_ASX` object inside `company-research.js`
- Finnhub free tier blocks non-US exchanges, Yahoo Finance v7/v10 now require crumb auth

## Netlify Environment Variables
- `FINNHUB_KEY` — Finnhub API key (US stock fundamentals)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key (server-side only)
- `PARENT_PIN` — Parent dashboard PIN (2211, never in client code)

## Supabase Config
- Anon key lives in `src/js/config.js` (safe — it's the public key)
- Service key only in Netlify env vars

## Important Patterns
- All onclick handlers in HTML must use `window.__handlerName()` — ES module scope prevents direct function access
- `renderAddCompany()` must be `async` (uses await)
- Single quotes with apostrophes inside strings → use double quotes or template literals
- After login, `bootApp(session)` in `boot.js` mounts all screens

## What's Working
- ✅ Live prices on watchlist
- ✅ Industry browser with 7 sectors
- ✅ Company research with live data cards (US and ASX)
- ✅ Profile switching
- ✅ 10 chapters + 5 bonus lessons
- ✅ Deployed at rockyinvest.netlify.app
