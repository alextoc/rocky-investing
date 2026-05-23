// ── GAME COMPANIES (used in Chapter 3-5 investment challenge) ─────────────────
export const COS = [
  { id:'rocket', name:'RocketKids Toys',  emoji:'🚀', col:'#4F46E5', bg:'#EEF2FF', tag:'The #1 toy maker for kids!',            sector:'toys',
    clues:[{t:'Sold in 50 countries 🌍',g:true},{t:'Kids always want newest toys ⭐',g:true},{t:'Brand new toys every year 🆕',g:true},{t:'Gets bigger every year 📈',g:true}], ret:[22,18,25,15,20] },
  { id:'scoops', name:'Scoops Ice Cream', emoji:'🍦', col:'#EC4899', bg:'#FDF2F8', tag:'Yummy ice cream at 500 stores!',         sector:'food',
    clues:[{t:"Everyone loves ice cream! ❤️",g:true},{t:'Only sells well in summer ☀️',g:false},{t:"Prices haven't risen in 5 years 💰",g:false},{t:'Many competitors sell ice cream 🍨',g:false}], ret:[8,-3,11,-5,6] },
  { id:'play',   name:'PlayZone Games',   emoji:'🎮', col:'#8B5CF6', bg:'#F5F3FF', tag:'Video games for 50 million players!',   sector:'tech',
    clues:[{t:'50 million active players! 👥',g:true},{t:'Kids play for hours every day ⏰',g:true},{t:'Releasing new games constantly 🆕',g:true},{t:'Growing faster than any competitor 🚀',g:true}], ret:[30,15,28,35,25] },
  { id:'farm',   name:'GreenGrow Farms',  emoji:'🌱', col:'#059669', bg:'#ECFDF5', tag:'Fresh fruits & veggies from 100 farms!', sector:'food',
    clues:[{t:'Everyone needs food to eat! 🍎',g:true},{t:'Bad weather can wipe out crops 🌧️',g:false},{t:'Business growing very slowly 🐢',g:false},{t:'Lots of other farms sell same things 🌾',g:false}], ret:[4,-8,5,-3,3] },
  { id:'pets',   name:'Pawsome Pets',     emoji:'🐾', col:'#D97706', bg:'#FFFBEB', tag:'Food & toys for 10 million pets!',       sector:'retail',
    clues:[{t:'Pets need food EVERY day 🐕',g:true},{t:'Families love their pets ❤️',g:true},{t:'Makes steady reliable money 💵',g:true},{t:'Not growing very quickly 📊',g:false}], ret:[8,10,7,12,9] },
  { id:'sun',    name:'SunPower Energy',  emoji:'☀️', col:'#DC2626', bg:'#FEF2F2', tag:'Powering homes with sunlight!',          sector:'energy',
    clues:[{t:'Everyone needs electricity! ⚡',g:true},{t:'Saves the planet 🌍',g:true},{t:'Growing super fast 📈',g:true},{t:'Governments pay them to grow 🏛️',g:true}], ret:[35,28,40,25,45] },
];

// ── REAL COMPANIES (Research Lab) ─────────────────────────────────────────────
// unlock_chapter: visible in lab from this chapter onwards (0 = always)
export const RC = [
  // ── TIER 1: unlock at Chapter 3 ─────────────────────────────────────────
  { id:'wes',  name:'Wesfarmers',         ticker:'WES.AX',  emoji:'🛒', col:'#DC2626', bg:'#FEF2F2', cat:'aus',    sector:'retail',        unlock_chapter:3,
    tag:'Owns Kmart, Bunnings & Officeworks!',
    intro:'Question: where does your family buy lego, tools, and socks? Yes-yes — Wesfarmers own Kmart AND Bunnings AND Officeworks! Is very clever. If one shop has slow day, other shops help!',
    clues:[{t:'Owns Kmart, Bunnings AND Officeworks 🛒',g:true},{t:'Australians shop here every single week ❤️',g:true},{t:'Always growing into new businesses 📈',g:true},{t:'People always need tools and socks 🌍',g:true},{t:'Amazon growing fast in Australia too 📦',g:false}],
    verdict:'Blurt! Rocky like Wesfarmers very much! Is stable, is trusted, is growing. Amaze amaze amaze!', rating:4 },

  { id:'wow',  name:'Woolworths',         ticker:'WOW.AX',  emoji:'🛍️', col:'#10B981', bg:'#ECFDF5', cat:'aus',    sector:'food',          unlock_chapter:3,
    tag:"Australia's biggest supermarket!",
    intro:'Question: where does your family buy food? Woolworths sell food to millions of Australian families every. single. week. Humans must eat — this is fact Rocky know for certain!',
    clues:[{t:'Millions of Australians shop here weekly 🛒',g:true},{t:'People always need food — this is forever! 🍎',g:true},{t:'Online delivery service growing fast 📦',g:true},{t:'Coles is very strong competitor nearby 🏪',g:false},{t:'Food profit margins are thin 📊',g:false}],
    verdict:'Rocky say: everyone need food. Is simple truth! Woolworths is steady, reliable. Is not exciting — but boring can be very good in investing!', rating:3 },

  { id:'jbh',  name:'JB Hi-Fi',           ticker:'JBH.AX',  emoji:'🎵', col:'#F59E0B', bg:'#FFFBEB', cat:'aus',    sector:'retail',        unlock_chapter:3,
    tag:"Australia's favourite electronics store!",
    intro:'If your family want new TV, new game, new headphones — you go to JB Hi-Fi! Rocky understand this. Shiny electronics is very important to humans!',
    clues:[{t:'Every Australian knows JB Hi-Fi 🇦🇺',g:true},{t:'Sells TVs, games, phones — things humans love 🎮',g:true},{t:'Makes good profit every year 💵',g:true},{t:'Online shopping means fewer store visits 💻',g:false},{t:'Harvey Norman also competes for customers 🏪',g:false}],
    verdict:'Rocky think JB Hi-Fi is good but must watch online trend. Is not perfect — but is still good! Rocky give cautious approval.', rating:3 },

  { id:'cba',  name:'Commonwealth Bank',  ticker:'CBA.AX',  emoji:'🏦', col:'#F59E0B', bg:'#FFFBEB', cat:'aus',    sector:'finance',       unlock_chapter:3,
    tag:"Australia's biggest bank!",
    intro:"CBA is where many Australians keep their money! Banks earn by lending money and charging interest. CBA also pay dividends — give investors extra money every year! Rocky like this very much.",
    clues:[{t:'Millions of Australians bank with CBA 💰',g:true},{t:'Pays dividends — bonus money yearly! 💵',g:true},{t:'Very stable for many decades 📈',g:true},{t:'NAB, ANZ, Westpac all compete hard 🏦',g:false},{t:'Bad economy can cause loans to go wrong 📉',g:false}],
    verdict:'Rocky think: banks is boring but important! CBA pays dividends — like getting bonus money while you wait. Rocky approve!', rating:4 },

  { id:'mcd',  name:"McDonald's",         ticker:'MCD',     emoji:'🍔', col:'#F59E0B', bg:'#FFFBEB', cat:'global', sector:'food',          unlock_chapter:3,
    tag:'Feeds 70 million people daily!',
    intro:"Question: have you eaten McDonald's? Rocky observe McDonald's on every street in every country on Earth! 70 million customers EVERY DAY. Rocky find this extraordinary.",
    clues:[{t:'40,000 restaurants in 100+ countries 🌍',g:true},{t:'70 million customers EVERY single day! 🍔',g:true},{t:'Owns the land — very valuable property! 🏠',g:true},{t:'Pays dividends every year for decades 💵',g:true},{t:'Healthy eating trend reducing some sales 🥗',g:false}],
    verdict:"Rocky is very impress! McDonald's is everywhere on Earth — probably in space soon! Is very stable, very profitable. Rocky approve strongly!", rating:4 },

  { id:'ntdoy',name:'Nintendo',           ticker:'NTDOY',   emoji:'🎮', col:'#DC2626', bg:'#FEF2F2', cat:'global', sector:'tech',          unlock_chapter:3,
    tag:'Makes Switch, Mario & Zelda!',
    intro:'Rocky know Nintendo! Mario, Zelda, Pokemon — characters children love for FORTY YEARS! This is extraordinary! Rocky know things that last long time. Nintendo characters last as long as stars!',
    clues:[{t:'Mario and Zelda loved for 40+ years ❤️',g:true},{t:'Nintendo Switch sold 140 million units! 🎮',g:true},{t:'Characters in movies, parks, merchandise 🌍',g:true},{t:'New console coming — exciting times! 🆕',g:true},{t:'Sony and Microsoft compete hard 🕹️',g:false}],
    verdict:'Blurt!! Rocky love Nintendo! Characters never get old! Rocky observe humans play Mario for decades. Is amazing thing. Amaze amaze amaze!', rating:5 },

  { id:'dis',  name:'Disney',             ticker:'DIS',     emoji:'🏰', col:'#4F46E5', bg:'#EEF2FF', cat:'global', sector:'entertainment', unlock_chapter:3,
    tag:'Movies, theme parks & Disney+!',
    intro:'Disney own Marvel, Star Wars, Pixar, Disney princesses — Rocky cannot count all characters! Plus Disney+ streaming, plus theme parks. Is enormous entertainment empire!',
    clues:[{t:'Owns Marvel, Star Wars, Pixar AND Disney 🎬',g:true},{t:'Disney+ has 150 million subscribers 📺',g:true},{t:'Theme parks make huge money every year 🏰',g:true},{t:'Disney+ took long time to become profitable 📉',g:false},{t:'Making movies is very expensive 💸',g:false}],
    verdict:'Rocky think Disney is powerful but complicated! So many businesses at once. But characters are forever — Rocky believe this strongly!', rating:3 },

  { id:'rblx', name:'Roblox',             ticker:'RBLX',    emoji:'🟥', col:'#DC2626', bg:'#FEF2F2', cat:'global', sector:'tech',          unlock_chapter:3,
    tag:'The game where YOU make the games!',
    intro:'Question: do you play Roblox? Rocky study Roblox — is not just game, is PLATFORM where children make their OWN games! 70 million people play every day. Rocky find concept fascinating!',
    clues:[{t:'70 million daily players — mostly kids! 🎮',g:true},{t:'Kids spend real Robux on virtual things 💰',g:true},{t:'Players CREATE games too — is unique! 🆕',g:true},{t:'Company still not making profit yet 📉',g:false},{t:'Kids grow up and might move to other games 🎂',g:false}],
    verdict:'Rocky think Roblox is interesting but risky! Very popular NOW — but must prove it can make profit. Is exciting bet, not safe bet. Understand difference!', rating:2 },

  // ── TIER 2: unlock at Chapter 5 ─────────────────────────────────────────
  { id:'aapl', name:'Apple',              ticker:'AAPL',    emoji:'🍎', col:'#374151', bg:'#F9FAFB', cat:'global', sector:'tech',          unlock_chapter:5,
    tag:'Makes iPhone, iPad & Mac!',
    intro:'Question: how many of your friends have iPhone? Yes-yes! Apple make products that humans love SO much they stand in line for hours to buy new ones! Rocky study Apple for long time. Is extraordinary!',
    clues:[{t:'Over 1 billion iPhones in use right now! 📱',g:true},{t:'People buy new iPhone every 2-3 years 🔄',g:true},{t:'App Store makes huge extra money 💰',g:true},{t:'Growing services: TV, Music, iCloud 📈',g:true},{t:'Stock price is very expensive to buy 💸',g:false}],
    verdict:'Amaze amaze amaze! Apple is extraordinary! Rocky study many companies — Apple is very special. Humans loyal to Apple like Rocky loyal to Grace. Is rare thing!', rating:5 },

  { id:'msft', name:'Microsoft',          ticker:'MSFT',    emoji:'🪟', col:'#0078D4', bg:'#EFF6FF', cat:'global', sector:'tech',          unlock_chapter:5,
    tag:'Makes Xbox, Windows & Cloud!',
    intro:'Microsoft is EVERYWHERE! School computer probably run Windows. Xbox is Microsoft. Video calls on Teams — Microsoft! And Azure cloud business is growing very fast. Rocky is very impress!',
    clues:[{t:'Used by millions of schools and offices 💼',g:true},{t:'Azure cloud computing growing super fast ☁️',g:true},{t:'Xbox + Game Pass gaming business 🎮',g:true},{t:'Owns LinkedIn, GitHub, and AI investments 🤝',g:true},{t:'Very large — harder to grow quickly 📊',g:false}],
    verdict:'Amaze amaze amaze! Microsoft is extraordinary! Rocky think Microsoft is one of best companies on Earth. Everywhere, grow everywhere, profit everywhere!', rating:5 },

  { id:'rea',  name:'REA Group',          ticker:'REA.AX',  emoji:'🏠', col:'#8B5CF6', bg:'#F5F3FF', cat:'aus',    sector:'property',      unlock_chapter:5,
    tag:'Runs realestate.com.au!',
    intro:'When Australian families want to buy or rent house, they go to realestate.com.au. REA Group OWN this website! Is clever — they not build houses, they just help people FIND houses. Almost no competitors!',
    clues:[{t:'realestate.com.au used by almost everyone 🏠',g:true},{t:'Very few competitors in Australia 🌍',g:true},{t:'Expanding into Asia and other countries 📈',g:true},{t:'Makes huge profits — mostly software 💰',g:true},{t:'Property market can slow down sometimes 📉',g:false}],
    verdict:'Blurt! Rocky is very impress with REA Group! Own the website everyone use for houses. Is like owning only map in whole city! Amaze amaze amaze!', rating:5 },

  { id:'tsla', name:'Tesla',              ticker:'TSLA',    emoji:'⚡', col:'#DC2626', bg:'#FEF2F2', cat:'global', sector:'tech',          unlock_chapter:5,
    tag:'Electric cars and clean energy!',
    intro:'Rocky see many Teslas on road now! Elon Musk build company from nothing. Electric cars getting cheaper every year. Rocky think about energy independence — Tesla is very relevant to this!',
    clues:[{t:'Leading electric car brand worldwide 🚗',g:true},{t:'Growing into energy storage & solar ☀️',g:true},{t:'Supercharger network — hard to copy 🔌',g:true},{t:'Very expensive stock price 💸',g:false},{t:'Traditional car companies catching up 🏭',g:false}],
    verdict:'Rocky think Tesla is exciting but risky! Very innovative, but competition is growing. Is not boring — which Rocky both like and worry about. Is interesting bet!', rating:3 },

  { id:'spot', name:'Spotify',            ticker:'SPOT',    emoji:'🎵', col:'#1DB954', bg:'#F0FFF4', cat:'global', sector:'entertainment', unlock_chapter:5,
    tag:'600 million listeners, all the music ever made!',
    intro:'Question: where does your family listen to music? Rocky observe: Spotify have 600 million users! Artists post music there. Podcasts too! Rocky even find astrophage research podcast there.',
    clues:[{t:'600 million active users worldwide 🎧',g:true},{t:'Growing podcasts and audiobooks business 📚',g:true},{t:'Very hard to switch once you build playlists 🎵',g:true},{t:'Music labels take most of the money 💸',g:false},{t:'Apple Music and YouTube compete hard 📱',g:false}],
    verdict:'Rocky like Spotify — 600 million users is extraordinary! But paying artists and labels takes most money. Rocky is cautious. Is interesting to watch!', rating:3 },

  // ── TIER 3: unlock at Chapter 8 (Moats) ─────────────────────────────────
  { id:'nvda', name:'Nvidia',             ticker:'NVDA',    emoji:'🤖', col:'#76B900', bg:'#F0FFF4', cat:'global', sector:'tech',          unlock_chapter:8,
    tag:'The chips that power AI and gaming!',
    intro:'Rocky study AI very much! Every AI system — including ones Rocky use to communicate — runs on Nvidia chips. Is extraordinary position! AI is future. Nvidia make the engines of AI. Rocky is very impress.',
    clues:[{t:'Powers almost all AI training worldwide 🤖',g:true},{t:'Gaming GPUs loved by players everywhere 🎮',g:true},{t:'Extremely profitable — huge profit margins 💰',g:true},{t:'Growing very fast every single year 📈',g:true},{t:'Stock price already very high and expensive 💸',g:false}],
    verdict:'Amaze amaze amaze! Nvidia is extraordinary! Rocky see AI revolution — Nvidia make all the picks and shovels. This is like selling pickaxes in gold rush! Rocky is very impress.', rating:5 },

  { id:'googl',name:'Alphabet (Google)',  ticker:'GOOGL',   emoji:'🔍', col:'#4285F4', bg:'#EFF6FF', cat:'global', sector:'tech',          unlock_chapter:8,
    tag:'Google, YouTube, Android & AI!',
    intro:'Question: how many times per day does your family say "Google it"? Google is used by 90% of all internet searches on Earth! Plus YouTube, Gmail, Android, Google Maps. Is extraordinarily embedded in human life!',
    clues:[{t:'90% of all internet searches use Google 🔍',g:true},{t:'YouTube: 2 billion users monthly 📺',g:true},{t:"Android powers 70% of world's phones 📱",g:true},{t:'Google Cloud growing very fast ☁️',g:true},{t:'Advertising business can slow in recessions 📉',g:false}],
    verdict:'Rocky think Alphabet is extraordinary! Google, YouTube, Android — human life runs on these things! Rocky study many companies. Alphabet is one of best. Amaze amaze amaze!', rating:5 },

  { id:'nflx', name:'Netflix',            ticker:'NFLX',    emoji:'🍿', col:'#E50914', bg:'#FEF2F2', cat:'global', sector:'entertainment', unlock_chapter:8,
    tag:'200 million subscribers, all the shows!',
    intro:'Rocky watch Netflix sometimes when learning human culture. Is remarkable — one subscription gives access to more entertainment than any human ever had in all of history! Is extraordinary thing.',
    clues:[{t:'280 million subscribers worldwide 📺',g:true},{t:'Growing in games and live events too 🎮',g:true},{t:'Password sharing crackdown added many subscribers 💰',g:true},{t:'Disney+, Prime Video, Apple TV+ all competing 📱',g:false},{t:'Content costs billions every year 💸',g:false}],
    verdict:'Rocky think Netflix is impressive! Hundreds of millions of subscribers — very powerful habit. But competition is fierce. Rocky cautiously optimistic!', rating:3 },

  { id:'atm',  name:'Atlassian',          ticker:'TEAM',    emoji:'⚙️', col:'#0052CC', bg:'#EFF6FF', cat:'aus',    sector:'tech',          unlock_chapter:8,
    tag:'Australian software used by millions of companies!',
    intro:"Rocky is very proud of Atlassian! Is Australian company — from Sydney! Makes Jira and Confluence — software that almost every tech company on Earth uses. Rocky think this is extraordinary achievement for small country!",
    clues:[{t:'Used by 300,000+ companies worldwide 💼',g:true},{t:'Sticky product — very hard to switch from 🔒',g:true},{t:'Australian-founded, now global leader 🇦🇺',g:true},{t:'Growing revenue every single year 📈',g:true},{t:'Expensive — must continue growing fast 💸',g:false}],
    verdict:"Blurt! Atlassian is extraordinary! Rocky very proud — is Australian company ruling the world of software collaboration. Amaze amaze amaze!", rating:4 },

  // ── ETFs: unlock at Chapter 9 ────────────────────────────────────────────
  { id:'vas',  name:'VAS — Aus Shares ETF',   ticker:'VAS.AX', emoji:'🇦🇺', col:'#DC2626', bg:'#FEF2F2', cat:'etf', sector:'etf', unlock_chapter:9,
    tag:'Own a tiny piece of 300 Aus companies!',
    intro:'VAS is not one company — is 300 Australian companies at once! Woolworths, CBA, Wesfarmers — all in one! Rocky think this is very wise strategy. Is called diversification. Rocky approve!',
    clues:[{t:'Own tiny piece of 300 companies at once 🇦🇺',g:true},{t:'If one struggles, 299 others help 🛡️',g:true},{t:'Very low fees — more money stays with you! 💰',g:true},{t:"Grows with all of Australia's economy 📈",g:true},{t:'Is not exciting — very slow and steady 🐢',g:false}],
    verdict:"Rocky say: VAS is not exciting. Rocky know. But slow and steady is very smart! Is like not putting all eggs in one basket. Rocky respect this strategy much!", rating:4 },

  { id:'vgs',  name:'VGS — Global Shares ETF', ticker:'VGS.AX', emoji:'🌍', col:'#4F46E5', bg:'#EEF2FF', cat:'etf', sector:'etf', unlock_chapter:9,
    tag:'Own tiny pieces of 1,500 global companies!',
    intro:"VGS contain Apple, Microsoft, Nintendo, McDonald's — and 1,496 other companies from whole world! Is like buying entire planet's economy! Rocky think this is extraordinarily clever for minimum effort!",
    clues:[{t:'1,500 companies from 23 countries! 🌍',g:true},{t:'Includes Apple, Microsoft, all the big ones ✅',g:true},{t:'Extremely low fees — Vanguard is famous for this 💰',g:true},{t:'Grows with whole world economy 📈',g:true},{t:'Value also changes with Australian dollar 💱',g:false}],
    verdict:'Blurt! VGS is extraordinary! Own 1,500 companies for almost no fee! Rocky study many strategies — this one is very hard to argue with. Amaze amaze amaze!', rating:5 },

  { id:'ndq',  name:'NDQ — NASDAQ 100 ETF',   ticker:'NDQ.AX', emoji:'💻', col:'#8B5CF6', bg:'#F5F3FF', cat:'etf', sector:'etf', unlock_chapter:9,
    tag:'The 100 biggest tech companies!',
    intro:'NDQ contain Apple, Microsoft, Google, Amazon, Netflix, Tesla — top 100 tech companies from USA! Is like buying all best tech companies at once! Available on ASX — easy to buy in Australia!',
    clues:[{t:'Apple, Google, Amazon, Netflix all included 💻',g:true},{t:'Tech companies grow very fast 📈',g:true},{t:'Available on ASX — easy to buy in Australia! 🇦🇺',g:true},{t:'Tech companies can fall hard in bad times 📉',g:false},{t:'More risky than VAS or VGS 😬',g:false}],
    verdict:'Rocky think NDQ is exciting but more risky! Tech companies grow fast but also fall fast. Is good for PART of portfolio — not all of it!', rating:3 },
];
