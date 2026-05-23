// ── CURATED TICKER LOOKUP TABLE ───────────────────────────────────────────────
// Keys are lowercase search terms. Used before falling back to Yahoo Finance API.
// private: true = not publicly traded (teaching moment for kids)

export const TICKER_MAP = {
  // ── ASX ───────────────────────────────────────────────────────────────────
  'woolworths':         { ticker:'WOW.AX',  exchange:'ASX',    currency:'AUD' },
  'wesfarmers':         { ticker:'WES.AX',  exchange:'ASX',    currency:'AUD' },
  'bunnings':           { ticker:'WES.AX',  exchange:'ASX',    currency:'AUD', note:'Bunnings is owned by Wesfarmers (WES.AX)' },
  'kmart':              { ticker:'WES.AX',  exchange:'ASX',    currency:'AUD', note:'Kmart is owned by Wesfarmers (WES.AX)' },
  'officeworks':        { ticker:'WES.AX',  exchange:'ASX',    currency:'AUD', note:'Officeworks is owned by Wesfarmers (WES.AX)' },
  'coles':              { ticker:'COL.AX',  exchange:'ASX',    currency:'AUD' },
  'jb hi-fi':           { ticker:'JBH.AX',  exchange:'ASX',    currency:'AUD' },
  'jbhifi':             { ticker:'JBH.AX',  exchange:'ASX',    currency:'AUD' },
  'commonwealth bank':  { ticker:'CBA.AX',  exchange:'ASX',    currency:'AUD' },
  'cba':                { ticker:'CBA.AX',  exchange:'ASX',    currency:'AUD' },
  'anz':                { ticker:'ANZ.AX',  exchange:'ASX',    currency:'AUD' },
  'nab':                { ticker:'NAB.AX',  exchange:'ASX',    currency:'AUD' },
  'westpac':            { ticker:'WBC.AX',  exchange:'ASX',    currency:'AUD' },
  'rea group':          { ticker:'REA.AX',  exchange:'ASX',    currency:'AUD' },
  'realestate.com.au':  { ticker:'REA.AX',  exchange:'ASX',    currency:'AUD' },
  'telstra':            { ticker:'TLS.AX',  exchange:'ASX',    currency:'AUD' },
  'qantas':             { ticker:'QAN.AX',  exchange:'ASX',    currency:'AUD' },
  'rio tinto':          { ticker:'RIO.AX',  exchange:'ASX',    currency:'AUD' },
  'bhp':                { ticker:'BHP.AX',  exchange:'ASX',    currency:'AUD' },
  'fortescue':          { ticker:'FMG.AX',  exchange:'ASX',    currency:'AUD' },
  'car group':          { ticker:'CAR.AX',  exchange:'ASX',    currency:'AUD' },
  'carsales':           { ticker:'CAR.AX',  exchange:'ASX',    currency:'AUD' },
  'seek':               { ticker:'SEK.AX',  exchange:'ASX',    currency:'AUD' },
  'afterpay':           { ticker:'SQ2.AX',  exchange:'ASX',    currency:'AUD', note:'Afterpay was acquired by Block Inc. (SQ2.AX on ASX)' },
  'block':              { ticker:'SQ2.AX',  exchange:'ASX',    currency:'AUD' },
  'zip':                { ticker:'ZIP.AX',  exchange:'ASX',    currency:'AUD' },
  'atlassian':          { ticker:'TEAM',    exchange:'NASDAQ', currency:'USD', note:'Atlassian is Australian but listed on NASDAQ as TEAM' },
  'xero':               { ticker:'XRO.AX',  exchange:'ASX',    currency:'AUD' },
  'canva':              { ticker:null, private:true, note:'Canva is a private Australian company — not yet on the stock market!' },
  'guzman y gomez':     { ticker:'GYG.AX',  exchange:'ASX',    currency:'AUD' },
  'gyg':                { ticker:'GYG.AX',  exchange:'ASX',    currency:'AUD' },
  'dominos':            { ticker:'DMP.AX',  exchange:'ASX',    currency:'AUD' },
  "domino's":           { ticker:'DMP.AX',  exchange:'ASX',    currency:'AUD' },
  'macquarie':          { ticker:'MQG.AX',  exchange:'ASX',    currency:'AUD' },
  'sus':                { ticker:'SUN.AX',  exchange:'ASX',    currency:'AUD' },
  'suncorp':            { ticker:'SUN.AX',  exchange:'ASX',    currency:'AUD' },

  // ── US STOCKS ─────────────────────────────────────────────────────────────
  'apple':              { ticker:'AAPL',    exchange:'NASDAQ', currency:'USD' },
  'microsoft':          { ticker:'MSFT',    exchange:'NASDAQ', currency:'USD' },
  'google':             { ticker:'GOOGL',   exchange:'NASDAQ', currency:'USD' },
  'alphabet':           { ticker:'GOOGL',   exchange:'NASDAQ', currency:'USD' },
  'amazon':             { ticker:'AMZN',    exchange:'NASDAQ', currency:'USD' },
  'meta':               { ticker:'META',    exchange:'NASDAQ', currency:'USD' },
  'facebook':           { ticker:'META',    exchange:'NASDAQ', currency:'USD', note:'Facebook changed its name to Meta in 2021' },
  'tesla':              { ticker:'TSLA',    exchange:'NASDAQ', currency:'USD' },
  'nvidia':             { ticker:'NVDA',    exchange:'NASDAQ', currency:'USD' },
  'netflix':            { ticker:'NFLX',    exchange:'NASDAQ', currency:'USD' },
  'disney':             { ticker:'DIS',     exchange:'NYSE',   currency:'USD' },
  "mcdonald's":         { ticker:'MCD',     exchange:'NYSE',   currency:'USD' },
  'mcdonalds':          { ticker:'MCD',     exchange:'NYSE',   currency:'USD' },
  'nintendo':           { ticker:'NTDOY',   exchange:'OTC',    currency:'USD', note:'Nintendo trades on US OTC markets as NTDOY' },
  'roblox':             { ticker:'RBLX',    exchange:'NYSE',   currency:'USD' },
  'spotify':            { ticker:'SPOT',    exchange:'NYSE',   currency:'USD' },
  'snap':               { ticker:'SNAP',    exchange:'NYSE',   currency:'USD' },
  'snapchat':           { ticker:'SNAP',    exchange:'NYSE',   currency:'USD', note:'Snapchat is made by Snap Inc. (SNAP)' },
  'paypal':             { ticker:'PYPL',    exchange:'NASDAQ', currency:'USD' },
  'visa':               { ticker:'V',       exchange:'NYSE',   currency:'USD' },
  'mastercard':         { ticker:'MA',      exchange:'NYSE',   currency:'USD' },
  'costco':             { ticker:'COST',    exchange:'NASDAQ', currency:'USD' },
  'nike':               { ticker:'NKE',     exchange:'NYSE',   currency:'USD' },
  'adidas':             { ticker:'ADDYY',   exchange:'OTC',    currency:'USD' },
  'lululemon':          { ticker:'LULU',    exchange:'NASDAQ', currency:'USD' },
  'hasbro':             { ticker:'HAS',     exchange:'NASDAQ', currency:'USD' },
  'mattel':             { ticker:'MAT',     exchange:'NASDAQ', currency:'USD' },
  'starbucks':          { ticker:'SBUX',    exchange:'NASDAQ', currency:'USD' },
  'uber':               { ticker:'UBER',    exchange:'NYSE',   currency:'USD' },
  'airbnb':             { ticker:'ABNB',    exchange:'NASDAQ', currency:'USD' },
  'shopify':            { ticker:'SHOP',    exchange:'NYSE',   currency:'USD' },
  'salesforce':         { ticker:'CRM',     exchange:'NYSE',   currency:'USD' },
  'palantir':           { ticker:'PLTR',    exchange:'NYSE',   currency:'USD' },
  'coinbase':           { ticker:'COIN',    exchange:'NASDAQ', currency:'USD' },

  // ── PRIVATE COMPANIES (teaching moments) ─────────────────────────────────
  'lego':     { ticker:null, private:true, note:'LEGO Group is privately owned by the Kristiansen family — not on the stock market yet!' },
  'ikea':     { ticker:null, private:true, note:'IKEA is owned by a foundation and is not publicly traded.' },
  'epic games':{ ticker:null, private:true, note:'Epic Games (Fortnite) is private — but some investors like Sony own a piece!' },
  'fortnite': { ticker:null, private:true, parent:'Epic Games', note:"Fortnite is made by Epic Games, which is private." },
  'tiktok':   { ticker:null, private:true, parent:'ByteDance', note:'TikTok is owned by ByteDance, a private Chinese company.' },
  'bytedance':{ ticker:null, private:true, note:'ByteDance (TikTok) is private and based in China.' },
  'spacex':   { ticker:null, private:true, note:'SpaceX is private — Elon Musk has said it may go public one day!' },
  'openai':   { ticker:null, private:true, note:'OpenAI (ChatGPT) is currently a private company.' },

  // ── PARENT COMPANY REDIRECTS ──────────────────────────────────────────────
  'youtube':    { ticker:'GOOGL',   exchange:'NASDAQ', currency:'USD', note:'YouTube is owned by Alphabet (Google) — ticker GOOGL' },
  'instagram':  { ticker:'META',    exchange:'NASDAQ', currency:'USD', note:'Instagram is owned by Meta — ticker META' },
  'whatsapp':   { ticker:'META',    exchange:'NASDAQ', currency:'USD', note:'WhatsApp is owned by Meta — ticker META' },
  'minecraft':  { ticker:'MSFT',    exchange:'NASDAQ', currency:'USD', note:'Minecraft is owned by Microsoft — ticker MSFT' },
  'pokemon':    { ticker:'NTDOY',   exchange:'OTC',    currency:'USD', note:'The Pokémon Company is partly owned by Nintendo (NTDOY)' },
  'chatgpt':    { ticker:null, private:true, note:'ChatGPT is made by OpenAI, which is currently private.' },

  // ── ETFs ──────────────────────────────────────────────────────────────────
  'vas':  { ticker:'VAS.AX', exchange:'ASX', currency:'AUD' },
  'vgs':  { ticker:'VGS.AX', exchange:'ASX', currency:'AUD' },
  'ndq':  { ticker:'NDQ.AX', exchange:'ASX', currency:'AUD' },
  'vanguard': { ticker:'VAS.AX', exchange:'ASX', currency:'AUD', note:'Vanguard Australia offers VAS (local) and VGS (global) ETFs on the ASX' },
};

export function lookupTicker(query) {
  const key = query.trim().toLowerCase();
  if (TICKER_MAP[key]) return TICKER_MAP[key];
  // Try partial match
  for (const [k, v] of Object.entries(TICKER_MAP)) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  return null;
}
