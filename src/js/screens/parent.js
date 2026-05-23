import { getAllProfiles, getHoldings, addHolding, deleteHolding } from '../db.js';
import { checkParentPin } from '../auth.js';
import { fetchPrices, formatPrice } from '../prices-client.js';
import { lookupTicker } from '../data/tickers.js';
import { sectorLabel, sectorBg, sectorFg, toast } from '../utils.js';
import { onNavigate } from '../router.js';

let _unlocked = false;
let _pinBuffer = '';

export function mountParent() {
  onNavigate('screen-parent', renderParent);
}

function renderParent() {
  _unlocked = false;
  const el = document.getElementById('screen-parent');
  renderPinGate(el);
}

function renderPinGate(el) {
  _pinBuffer = '';
  el.innerHTML = `
    <div class="card">
      <div class="tutor-row">
        <div class="tutor-emoji">🕷️</div>
        <div class="bubble">
          <div class="bubble-tag">Rocky 🪨</div>
          Blurt! Is Parent Portal! Rocky must verify you are the parent. Please enter parent PIN to continue. Children should not see this screen — is for recording real purchases only!
        </div>
      </div>
    </div>
    <div class="card t-center">
      <div style="font-size:2.5rem;margin-bottom:8px">🔐</div>
      <div style="font-size:1.1rem;font-weight:900;margin-bottom:16px">Parent PIN Required</div>
      <div class="pin-display" id="parent-dots">
        ${[0,1,2,3].map(()=>`<div class="pin-dot"></div>`).join('')}
      </div>
      <div id="parent-err" style="color:var(--red);font-size:.82rem;font-weight:800;min-height:22px;margin-bottom:8px"></div>
      <div class="pin-grid">
        ${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(k=>`
          <button class="pin-key ${k===''?'empty':k==='⌫'?'del':''}" onclick="window.__parentKey('${k}')" ${k===''?'disabled style="pointer-events:none"':''}>${k}</button>
        `).join('')}
      </div>
    </div>`;

  window.__parentKey = async (k) => {
    if (k === '') return;
    if (k === '⌫') { _pinBuffer = _pinBuffer.slice(0,-1); }
    else if (_pinBuffer.length < 4) { _pinBuffer += k; }
    document.querySelectorAll('#parent-dots .pin-dot').forEach((d,i) => d.classList.toggle('filled', i < _pinBuffer.length));
    if (_pinBuffer.length === 4) {
      const ok = await checkParentPin(_pinBuffer);
      if (ok) { _unlocked = true; renderPortal(el); }
      else {
        document.getElementById('parent-err').textContent = '❌ Incorrect PIN';
        _pinBuffer = '';
        document.querySelectorAll('#parent-dots .pin-dot').forEach(d => d.classList.remove('filled'));
      }
    }
  };
}

async function renderPortal(el) {
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading…</div>`;
  const profiles = await getAllProfiles();
  renderMain(el, profiles);
}

function renderMain(el, profiles) {
  el.innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:2rem">🔐</span>
        <div>
          <div class="sec-title" style="margin:0">Parent Portal</div>
          <div style="font-size:.8rem;color:#6B7280">Record real purchases — kids see them live with market prices</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="sec-title">📥 Record a Purchase</div>
      <div class="sec-sub">Fill in the details from your broker confirmation</div>

      <div style="margin-bottom:12px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">For which investor?</label>
        <select id="p-kid" class="name-inp" style="text-align:left;font-size:.95rem;padding:12px 16px;cursor:pointer">
          ${profiles.map(p => `<option value="${p.id}">${p.avatar_emoji} ${p.username}</option>`).join('')}
        </select>
      </div>

      <div style="margin-bottom:12px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Company name or ticker</label>
        <div style="display:flex;gap:8px">
          <input id="p-search" class="name-inp" style="text-align:left;font-size:.95rem" type="text" placeholder="e.g. Apple, VGS.AX, Nintendo…"/>
          <button class="btn btn-primary btn-sm" onclick="window.__parentSearch()" style="white-space:nowrap">Find Ticker</button>
        </div>
        <div id="p-ticker-result"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>
          <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Number of shares</label>
          <input id="p-qty" class="name-inp" style="text-align:left;font-size:.95rem" type="number" min="0.001" step="0.001" placeholder="e.g. 5"/>
        </div>
        <div>
          <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Price per share (A$)</label>
          <input id="p-price" class="name-inp" style="text-align:left;font-size:.95rem" type="number" min="0.01" step="0.01" placeholder="e.g. 94.20"/>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Purchase date</label>
        <input id="p-date" class="name-inp" style="text-align:left;font-size:.95rem" type="date" value="${new Date().toISOString().split('T')[0]}"/>
      </div>

      <div style="margin-bottom:16px">
        <label style="font-size:.82rem;font-weight:800;color:#6B7280;display:block;margin-bottom:6px">Note (optional)</label>
        <input id="p-note" class="name-inp" style="text-align:left;font-size:.95rem" type="text" placeholder="e.g. Birthday gift, first investment…"/>
      </div>

      <div id="p-preview" style="margin-bottom:14px"></div>
      <div id="p-err" style="color:var(--red);font-size:.82rem;font-weight:800;min-height:18px;margin-bottom:8px"></div>
      <button class="btn btn-green btn-lg btn-full" onclick="window.__parentSave()">✅ Record Purchase</button>
    </div>

    <div class="card" id="all-holdings-card">
      <div class="sec-title">📋 All Holdings</div>
      <div id="all-holdings"><div class="loading-spinner"><div class="spinner"></div></div></div>
    </div>`;

  // Ticker search state
  let foundTicker = null;

  window.__parentSearch = async () => {
    const q = document.getElementById('p-search').value.trim();
    if (!q) return;
    const res = document.getElementById('p-ticker-result');
    res.innerHTML = `<div style="font-size:.8rem;color:#9CA3AF;margin-top:8px">🔍 Searching…</div>`;

    // Try local map first
    const local = lookupTicker(q);
    if (local && local.private) {
      foundTicker = null;
      res.innerHTML = `<div class="ticker-result private">⚠️ <strong>${q}</strong> appears to be a private company — not on the stock market. ${local.note || ''}</div>`;
      return;
    }
    if (local && local.ticker) {
      foundTicker = local;
      res.innerHTML = `<div class="ticker-result found">✅ Found: <strong>${local.ticker}</strong> on ${local.exchange} (${local.currency}) ${local.note ? `<br><span style="font-size:.75rem;opacity:.8">${local.note}</span>` : ''}</div>`;
      updatePreview();
      return;
    }

    // Fall back to API search
    try {
      const r = await fetch(`/api/ticker-search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (data.found) {
        foundTicker = { ticker: data.ticker, exchange: data.exchange, currency: data.currency };
        res.innerHTML = `<div class="ticker-result found">✅ Found: <strong>${data.ticker}</strong> — ${data.name} (${data.exchange})</div>`;
        document.getElementById('p-search').value = data.ticker;
      } else {
        foundTicker = null;
        res.innerHTML = `<div class="ticker-result unknown">❓ Couldn't find a ticker for "${q}". Try entering the ticker directly (e.g. AAPL, VGS.AX).</div>`;
      }
    } catch {
      res.innerHTML = `<div class="ticker-result unknown">❓ Search unavailable — enter ticker manually.</div>`;
    }
    updatePreview();
  };

  function updatePreview() {
    const qty   = parseFloat(document.getElementById('p-qty')?.value);
    const price = parseFloat(document.getElementById('p-price')?.value);
    const prev  = document.getElementById('p-preview');
    if (!prev) return;
    if (foundTicker && qty > 0 && price > 0) {
      prev.innerHTML = `
        <div style="padding:12px 14px;background:#D1FAE5;border-radius:12px;font-size:.88rem;font-weight:700;color:#065F46">
          ✅ <strong>${qty} shares</strong> of <strong>${foundTicker.ticker}</strong> at ${foundTicker.currency === 'USD' ? 'US$' : 'A$'}${price.toFixed(2)} = Total: A$${(qty * price).toFixed(2)}
        </div>`;
    } else {
      prev.innerHTML = '';
    }
  }
  document.getElementById('p-qty')?.addEventListener('input', updatePreview);
  document.getElementById('p-price')?.addEventListener('input', updatePreview);

  window.__parentSave = async () => {
    const errEl = document.getElementById('p-err');
    const profileId = document.getElementById('p-kid').value;
    const qty   = parseFloat(document.getElementById('p-qty').value);
    const price = parseFloat(document.getElementById('p-price').value);
    const date  = document.getElementById('p-date').value;
    const note  = document.getElementById('p-note').value.trim();
    const search = document.getElementById('p-search').value.trim().toUpperCase();

    // Allow manual ticker entry if search wasn't used
    const ticker = foundTicker?.ticker || (search.match(/^[A-Z0-9.]{1,10}$/) ? search : null);
    if (!ticker)   { errEl.textContent = '❌ Please search for and confirm the company ticker first.'; return; }
    if (!qty || qty <= 0)   { errEl.textContent = '❌ Please enter a valid number of shares.'; return; }
    if (!price || price <= 0) { errEl.textContent = '❌ Please enter a valid price per share.'; return; }
    if (!date)     { errEl.textContent = '❌ Please enter the purchase date.'; return; }

    errEl.textContent = '';

    // Determine emoji + sector from RC data or generic
    const { RC } = await import('../data/companies.js');
    const known = RC.find(r => r.ticker === ticker);

    const holding = {
      ticker,
      name:     known?.name || ticker,
      emoji:    known?.emoji || '🏢',
      sector:   known?.sector || 'other',
      quantity: qty,
      buy_price: price,
      buy_date:  date,
      currency:  foundTicker?.currency || 'AUD',
      exchange:  foundTicker?.exchange || 'ASX',
      note,
    };

    try {
      await addHolding(profileId, holding);
      toast(`✅ Recorded ${qty} × ${ticker} for ${profiles.find(p=>p.id===profileId)?.username}!`);
      foundTicker = null;
      document.getElementById('p-search').value  = '';
      document.getElementById('p-ticker-result').innerHTML = '';
      document.getElementById('p-qty').value    = '';
      document.getElementById('p-price').value  = '';
      document.getElementById('p-note').value   = '';
      document.getElementById('p-preview').innerHTML = '';
      loadAllHoldings(profiles);
    } catch (e) {
      errEl.textContent = `❌ Error: ${e.message}`;
    }
  };

  loadAllHoldings(profiles);
}

async function loadAllHoldings(profiles) {
  const container = document.getElementById('all-holdings');
  if (!container) return;
  const allHoldings = await Promise.all(
    profiles.map(p => getHoldings(p.id).then(h => h.map(x => ({...x, _username: p.username, _emoji: p.avatar_emoji}))))
  );
  const flat = allHoldings.flat().sort((a,b) => b.created_at?.localeCompare(a.created_at ?? '') ?? 0);
  if (!flat.length) { container.innerHTML = `<div style="color:#9CA3AF;font-size:.85rem;text-align:center;padding:16px">No holdings recorded yet.</div>`; return; }

  const tickers = [...new Set(flat.map(h => h.ticker))];
  const prices  = await fetchPrices(tickers);

  container.innerHTML = flat.map(h => {
    const p = prices[h.ticker]?.price ?? h.buy_price;
    const gain = (p - h.buy_price) * h.quantity;
    const cls  = gain >= 0 ? 'up' : 'dn';
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:2px solid #E0E7FF;border-radius:12px;margin-bottom:8px">
        <span style="font-size:1.4rem">${h.emoji}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:.84rem">${h._emoji} ${h._username} · ${h.name} (${h.ticker})</div>
          <div style="font-size:.72rem;color:#9CA3AF">${h.quantity} shares @ ${formatPrice(h.buy_price, h.currency)} · ${h.buy_date}</div>
        </div>
        <div style="text-align:right">
          <div class="price-${cls}" style="font-weight:900;font-size:.88rem">${formatPrice(p * h.quantity, 'AUD')}</div>
          <div class="badge-pct ${cls}">${gain>=0?'+':''}${formatPrice(Math.abs(gain),'AUD')}</div>
        </div>
        <button onclick="if(confirm('Delete this holding?'))window.__parentDelete('${h.id}')" style="background:none;border:none;cursor:pointer;opacity:.3;font-size:.85rem;padding:4px">✕</button>
      </div>`;
  }).join('');

  window.__parentDelete = async (id) => {
    await deleteHolding(id);
    toast('Holding deleted.');
    loadAllHoldings(profiles);
  };
}
