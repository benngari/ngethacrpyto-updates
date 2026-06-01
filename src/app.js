/**
 * nGetHaCrypto Updates
 * by Benson Ngetha
 *
 * APIs used:
 *  - CoinGecko (free) — crypto prices, market data, trending
 *  - ExchangeRate-API (free) — USD → KES conversion
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const EXCHANGE_BASE  = 'https://open.er-api.com/v6/latest/USD';

let allCoins   = [];
let usdToKes   = null;
let sortKey    = 'market_cap_rank';

/* ─── UTILS ─────────────────────────────────────────── */

const fmt = {
  price(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1)      return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 0.01)   return '$' + n.toFixed(4);
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
    const sign = n >= 0 ? '+' : '';
    return sign + n.toFixed(2) + '%';
  },
  kes(usd) {
    if (!usdToKes || !usd) return '—';
    const val = usd * usdToKes;
    return 'KES ' + val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  time() {
    return new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
};

/* ─── EXCHANGE RATE ──────────────────────────────────── */

async function fetchExchangeRate() {
  try {
    const res  = await fetch(EXCHANGE_BASE);
    const data = await res.json();
    if (data.rates && data.rates.KES) {
      usdToKes = data.rates.KES;
      document.getElementById('convRate').textContent =
        `1 USD = ${usdToKes.toFixed(2)} KES`;
      updateConverter();
    }
  } catch (e) {
    document.getElementById('convRate').textContent = 'Rate unavailable';
    console.error('Exchange rate fetch failed:', e);
  }
}

function updateConverter() {
  const input  = parseFloat(document.getElementById('usdInput').value) || 0;
  const output = document.getElementById('kshOutput');
  if (usdToKes) {
    const val = (input * usdToKes).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    output.textContent = `KES ${val}`;
  } else {
    output.textContent = 'KES —';
  }
}

document.getElementById('usdInput').addEventListener('input', updateConverter);

/* ─── TOP COINS ──────────────────────────────────────── */

async function fetchCoins() {
  try {
    const res  = await fetch(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=24&page=1&sparkline=false&price_change_percentage=24h,7d`
    );
    const data = await res.json();
    allCoins   = data;
    renderCoins();
    renderTicker();
  } catch (e) {
    document.getElementById('coinsGrid').innerHTML =
      `<div class="loading-state"><p>⚠️ Failed to load coin data. CoinGecko may be rate-limiting. Try again shortly.</p></div>`;
    console.error('Coin fetch error:', e);
  }
}

function renderCoins() {
  const grid = document.getElementById('coinsGrid');

  const sorted = [...allCoins].sort((a, b) => {
    if (sortKey === 'market_cap_rank')           return a.market_cap_rank - b.market_cap_rank;
    if (sortKey === 'price_change_percentage_24h') return b.price_change_percentage_24h - a.price_change_percentage_24h;
    if (sortKey === 'current_price')             return b.current_price - a.current_price;
    return 0;
  });

  grid.innerHTML = sorted.map(coin => {
    const pct24  = coin.price_change_percentage_24h;
    const isUp   = pct24 >= 0;
    const arrow  = isUp ? '▲' : '▼';
    const cls    = isUp ? 'up' : 'down';

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
            <span class="change-badge ${cls}">${arrow} ${fmt.pct(pct24)}</span>
          </div>
          <div class="stat-item">
            <div class="stat-label">7d Change</div>
            <span class="change-badge ${coin.price_change_percentage_7d_in_currency >= 0 ? 'up' : 'down'}">
              ${coin.price_change_percentage_7d_in_currency >= 0 ? '▲' : '▼'}
              ${fmt.pct(coin.price_change_percentage_7d_in_currency)}
            </span>
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
      </div>
    `;
  }).join('');
}

/* ─── TICKER ─────────────────────────────────────────── */

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

  // Duplicate for seamless loop
  document.getElementById('tickerInner').innerHTML = items + items;
}

/* ─── TRENDING ───────────────────────────────────────── */

async function fetchTrending() {
  try {
    const res  = await fetch(`${COINGECKO_BASE}/search/trending`);
    const data = await res.json();
    renderTrending(data.coins || []);
  } catch (e) {
    document.getElementById('trendingList').innerHTML =
      `<div class="loading-state"><p>⚠️ Failed to load trending coins.</p></div>`;
    console.error('Trending fetch error:', e);
  }
}

function renderTrending(coins) {
  const list = document.getElementById('trendingList');
  list.innerHTML = coins.map((c, i) => {
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
      </div>
    `;
  }).join('');
}

/* ─── FILTER BUTTONS ─────────────────────────────────── */

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    sortKey = btn.dataset.sort;
    renderCoins();
  });
});

/* ─── LAST UPDATED ───────────────────────────────────── */

function updateTimestamp() {
  document.getElementById('lastUpdated').textContent =
    `Last updated: ${fmt.time()} EAT`;
}

/* ─── INIT & AUTO REFRESH ────────────────────────────── */

async function init() {
  await Promise.all([fetchExchangeRate(), fetchCoins(), fetchTrending()]);
  updateTimestamp();
}

// Refresh coins every 60 seconds
setInterval(async () => {
  await fetchCoins();
  updateTimestamp();
}, 60_000);

// Refresh exchange rate every 10 minutes
setInterval(fetchExchangeRate, 600_000);

init();
