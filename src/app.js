/**
 * nGetHaCrypto Updates
 * by Benson Ngetha
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const EXCHANGE_BASE  = 'https://open.er-api.com/v6/latest/USD';

let allCoins = [];
let usdToKes = null;
let sortKey  = 'market_cap_rank';

/* ─── UTILS ─────────────────────────────────── */
const fmt = {
  price(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1)    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 0.01) return '$' + n.toFixed(4);
    return '$' + n.toFixed(8);
  },
  bigNum(n) {
    if (!n) return '—';
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
    return '$' + n.toLocaleString();
  },
  pct(n) {
    if (n === null || n === undefined) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  },
  kes(usd) {
    if (!usdToKes || !usd) return '—';
    return 'KES ' + (usd * usdToKes).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  time() {
    return new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
};

/* ─── EXCHANGE RATE ──────────────────────────── */
async function fetchExchangeRate() {
  try {
    const res  = await fetch(EXCHANGE_BASE);
    const data = await res.json();
    if (data.rates && data.rates.KES) {
      usdToKes = data.rates.KES;
      document.getElementById('convRate').textContent = `1 USD = ${usdToKes.toFixed(2)} KES`;
      updateConverter();
    }
  } catch (e) {
    document.getElementById('convRate').textContent = 'Rate unavailable';
  }
}

function updateConverter() {
  const input = parseFloat(document.getElementById('usdInput').value) || 0;
  const out   = document.getElementById('kshOutput');
  out.textContent = usdToKes
    ? 'KES ' + (input * usdToKes).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : 'KES —';
}

document.getElementById('usdInput').addEventListener('input', updateConverter);

/* ─── COINS ──────────────────────────────────── */
async function fetchCoins() {
  try {
    const res = await fetch(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=24&page=1&sparkline=false&price_change_percentage=24h,7d`
    );
    allCoins = await res.json();
    renderCoins();
    renderTicker();
  } catch (e) {
    document.getElementById('coinsGrid').innerHTML =
      `<div class="loading-state"><p>⚠️ Failed to load coin data. Try again shortly.</p></div>`;
  }
}

function renderCoins(coins = null) {
  const grid   = document.getElementById('coinsGrid');
  const source = coins || allCoins;

  const sorted = [...source].sort((a, b) => {
    if (sortKey === 'market_cap_rank')             return a.market_cap_rank - b.market_cap_rank;
    if (sortKey === 'price_change_percentage_24h') return b.price_change_percentage_24h - a.price_change_percentage_24h;
    if (sortKey === 'current_price')               return b.current_price - a.current_price;
    return 0;
  });

  grid.innerHTML = sorted.map(coin => {
    const pct24 = coin.price_change_percentage_24h;
    const pct7  = coin.price_change_percentage_7d_in_currency;
    const isUp  = pct24 >= 0;

    return `
      <div class="coin-card">
        <div class="coin-header">
          <img class="coin-img" src="${coin.image}" alt="${coin.name}" loading="lazy" />
          <div class="coin-name-block">
            <div class="coin-name">${coin.name}</div>
            <div class="coin-symbol">${coin.symbol}</div>
          </div>
          <span class="coin-rank">#${coin.market_cap_rank}</span>
        </div>
        <div class="coin-price">${fmt.price(coin.current_price)}</div>
        <div class="coin-stats">
          <div class="stat-item">
            <div class="stat-label">24h Change</div>
            <span class="change-badge ${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'} ${fmt.pct(pct24)}</span>
          </div>
          <div class="stat-item">
            <div class="stat-label">7d Change</div>
            <span class="change-badge ${pct7 >= 0 ? 'up' : 'down'}">${pct7 >= 0 ? '▲' : '▼'} ${fmt.pct(pct7)}</span>
          </div>
          <div class="stat-item">
            <div class="stat-label">Market Cap</div>
            <div class="stat-value">${fmt.bigNum(coin.market_cap)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">24h Vol</div>
            <div class="stat-value">${fmt.bigNum(coin.total_volume)}</div>
          </div>
          <div class="stat-item" style="grid-column: span 2;">
            <div class="stat-label">Price in KES</div>
            <div class="stat-value" style="color: var(--accent2);">${fmt.kes(coin.current_price)}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ─── TICKER ─────────────────────────────────── */
function renderTicker() {
  if (!allCoins.length) return;
  const items = allCoins.slice(0, 12).map(c => {
    const isUp = c.price_change_percentage_24h >= 0;
    return `<span class="ticker-item">
      <span class="ticker-name">${c.symbol.toUpperCase()}</span>
      <span class="ticker-price">${fmt.price(c.current_price)}</span>
      <span class="ticker-change ${isUp ? 'up' : 'down'}">${fmt.pct(c.price_change_percentage_24h)}</span>
    </span>`;
  }).join('');
  document.getElementById('tickerInner').innerHTML = items + items;
}

/* ─── TRENDING ───────────────────────────────── */
async function fetchTrending() {
  try {
    const res  = await fetch(`${COINGECKO_BASE}/search/trending`);
    const data = await res.json();
    const list = document.getElementById('trendingList');
    list.innerHTML = (data.coins || []).map((c, i) => {
      const item = c.item;
      return `
        <div class="trending-item">
          <span class="trending-rank">${i + 1}</span>
          <img class="trending-img" src="${item.small}" alt="${item.name}" loading="lazy" />
          <div class="trending-info">
            <div class="trending-name">${item.name}</div>
            <div class="trending-sym">${item.symbol}</div>
          </div>
          <span class="trending-score">🔥 Score: ${item.score + 1}</span>
        </div>`;
    }).join('');
  } catch (e) {
    document.getElementById('trendingList').innerHTML =
      `<div class="loading-state"><p>⚠️ Failed to load trending.</p></div>`;
  }
}

/* ─── FILTERS ────────────────────────────────── */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    sortKey = btn.dataset.sort;
    const query = document.getElementById('coinSearch').value.trim();
    filterAndRender(query);
  });
});

/* ─── SEARCH ─────────────────────────────────── */
const searchInput = document.getElementById('coinSearch');
const searchClear = document.getElementById('searchClear');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim();
  searchClear.style.display = query ? 'block' : 'none';
  filterAndRender(query);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  filterAndRender('');
});

function filterAndRender(query) {
  if (!query) { renderCoins(); return; }
  const q        = query.toLowerCase();
  const filtered = allCoins.filter(c =>
    c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
  );
  if (!filtered.length) {
    document.getElementById('coinsGrid').innerHTML =
      `<div class="no-results">😕 No coins found for "<strong>${query}</strong>"</div>`;
    return;
  }
  renderCoins(filtered);
}

/* ─── THEME ──────────────────────────────────── */
const themeBtn   = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.body.classList.add('light');
  themeBtn.textContent = '🌙 Dark';
}
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight        = document.body.classList.contains('light');
  themeBtn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

/* ─── TIMESTAMP ──────────────────────────────── */
function updateTimestamp() {
  document.getElementById('lastUpdated').textContent = `Last updated: ${fmt.time()} EAT`;
}

/* ─── INIT ───────────────────────────────────── */
async function init() {
  await Promise.all([fetchExchangeRate(), fetchCoins(), fetchTrending()]);
  updateTimestamp();
}

setInterval(async () => { await fetchCoins(); updateTimestamp(); }, 60_000);
setInterval(fetchExchangeRate, 600_000);

init();