/**
 * nGetHaCrypto Updates
 * by Benson Ngetha
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const EXCHANGE_BASE  = 'https://open.er-api.com/v6/latest/USD';

let allCoins  = [];
let usdToKes  = null;
let sortKey   = 'market_cap_rank';
let chartInst = null;

/* ─── LOCALSTORAGE ───────────────────────────── */
let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
let portfolio = JSON.parse(localStorage.getItem('portfolio') || '[]');

function saveWatchlist() { localStorage.setItem('watchlist', JSON.stringify(watchlist)); }
function savePortfolio() { localStorage.setItem('portfolio', JSON.stringify(portfolio)); }

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
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d`
    );
    allCoins = await res.json();
    renderCoins();
    renderTicker();
    renderWatchlist();
    renderPortfolio();
    populatePortfolioSelect();
  } catch (e) {
    document.getElementById('coinsGrid').innerHTML =
      `<div class="loading-state"><p>⚠️ Failed to load coin data. Try again shortly.</p></div>`;
  }
}

function coinCardHTML(coin, extra = '') {
  const pct24 = coin.price_change_percentage_24h;
  const pct7  = coin.price_change_percentage_7d_in_currency;
  const isUp  = pct24 >= 0;
  const isWatched = watchlist.includes(coin.id);

  return `
    <div class="coin-card" onclick="openChart('${coin.id}', '${coin.name}', '${coin.symbol}', '${coin.image}', ${coin.current_price}, ${pct24})">
      <div class="coin-header">
        <img class="coin-img" src="${coin.image}" alt="${coin.name}" loading="lazy" />
        <div class="coin-name-block">
          <div class="coin-name">${coin.name}</div>
          <div class="coin-symbol">${coin.symbol}</div>
        </div>
        <span class="coin-rank">#${coin.market_cap_rank}</span>
        <button class="star-btn ${isWatched ? 'starred' : ''}" onclick="event.stopPropagation(); toggleWatch('${coin.id}')" title="${isWatched ? 'Remove from watchlist' : 'Add to watchlist'}">
          ${isWatched ? '⭐' : '☆'}
        </button>
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
      <div class="card-hint">📈 Click for chart</div>
      ${extra}
    </div>`;
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

  grid.innerHTML = sorted.map(coin => coinCardHTML(coin)).join('');
}

/* ─── WATCHLIST ──────────────────────────────── */
function toggleWatch(coinId) {
  if (watchlist.includes(coinId)) {
    watchlist = watchlist.filter(id => id !== coinId);
  } else {
    watchlist.push(coinId);
  }
  saveWatchlist();
  renderCoins();
  renderWatchlist();
}

function renderWatchlist() {
  const section = document.getElementById('watchlistSection');
  const grid    = document.getElementById('watchlistGrid');

  if (!watchlist.length) {
    section.style.display = 'none';
    return;
  }

  const watched = allCoins.filter(c => watchlist.includes(c.id));
  if (!watched.length) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  grid.innerHTML = watched.map(coin => coinCardHTML(coin)).join('');
}

/* ─── PORTFOLIO ──────────────────────────────── */
function populatePortfolioSelect() {
  const sel = document.getElementById('portfolioCoinSelect');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Select a coin...</option>' +
    allCoins.map(c => `<option value="${c.id}">${c.name} (${c.symbol.toUpperCase()})</option>`).join('');
  sel.value = cur;
}

document.getElementById('togglePortfolio').addEventListener('click', () => {
  const panel = document.getElementById('portfolioPanel');
  const btn   = document.getElementById('togglePortfolio');
  const open  = panel.style.display === 'none';
  panel.style.display = open ? 'block' : 'none';
  btn.textContent     = open ? 'Hide ▲' : 'Show ▼';
});

document.getElementById('portfolioAddBtn').addEventListener('click', () => {
  const coinId = document.getElementById('portfolioCoinSelect').value;
  const amount = parseFloat(document.getElementById('portfolioAmount').value);

  if (!coinId || !amount || amount <= 0) return;

  const existing = portfolio.find(p => p.id === coinId);
  if (existing) {
    existing.amount = amount;
  } else {
    portfolio.push({ id: coinId, amount });
  }

  savePortfolio();
  renderPortfolio();
  document.getElementById('portfolioAmount').value = '';
  document.getElementById('portfolioCoinSelect').value = '';
});

function renderPortfolio() {
  const list = document.getElementById('portfolioList');
  if (!portfolio.length) {
    list.innerHTML = `<p class="p-empty">No coins added yet. Add your first coin below!</p>`;
    document.getElementById('ptUsd').textContent = '$0.00';
    document.getElementById('ptKes').textContent = 'KES 0.00';
    return;
  }

  let totalUsd = 0;

  list.innerHTML = portfolio.map(entry => {
    const coin = allCoins.find(c => c.id === entry.id);
    if (!coin) return '';
    const value    = coin.current_price * entry.amount;
    const valueKes = usdToKes ? value * usdToKes : null;
    const pct24    = coin.price_change_percentage_24h;
    totalUsd += value;

    return `
      <div class="p-item">
        <img class="p-img" src="${coin.image}" alt="${coin.name}" />
        <div class="p-info">
          <div class="p-name">${coin.name}</div>
          <div class="p-amount">${entry.amount} ${coin.symbol.toUpperCase()}</div>
        </div>
        <div class="p-values">
          <div class="p-usd">${fmt.price(value)}</div>
          <div class="p-kes-val">${valueKes ? 'KES ' + valueKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div>
          <span class="change-badge ${pct24 >= 0 ? 'up' : 'down'}">${pct24 >= 0 ? '▲' : '▼'} ${fmt.pct(pct24)}</span>
        </div>
        <button class="p-remove" onclick="removeFromPortfolio('${coin.id}')">✕</button>
      </div>`;
  }).join('');

  const totalKes = usdToKes ? totalUsd * usdToKes : null;
  document.getElementById('ptUsd').textContent = fmt.price(totalUsd);
  document.getElementById('ptKes').textContent = totalKes
    ? 'KES ' + totalKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';
}

function removeFromPortfolio(coinId) {
  portfolio = portfolio.filter(p => p.id !== coinId);
  savePortfolio();
  renderPortfolio();
}

/* ─── CHART MODAL ────────────────────────────── */
async function openChart(id, name, symbol, image, price, pct24) {
  const modal = document.getElementById('chartModal');
  const isUp  = pct24 >= 0;

  document.getElementById('modalCoinImg').src            = image;
  document.getElementById('modalCoinName').textContent   = name;
  document.getElementById('modalCoinSym').textContent    = symbol.toUpperCase();
  document.getElementById('modalCoinPrice').textContent  = fmt.price(price);
  document.getElementById('modalCoinKes').textContent    = fmt.kes(price);
  document.getElementById('modalCoinPct').textContent    = fmt.pct(pct24);
  document.getElementById('modalCoinPct').className      = 'modal-pct ' + (isUp ? 'up' : 'down');
  document.getElementById('chartLoading').style.display  = 'flex';
  document.getElementById('priceChart').style.display    = 'none';

  document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.range-btn[data-days="7"]').classList.add('active');

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  await loadChart(id, 7);
  modal.dataset.coinId = id;
}

async function loadChart(coinId, days) {
  document.getElementById('chartLoading').style.display = 'flex';
  document.getElementById('priceChart').style.display   = 'none';

  try {
    const res    = await fetch(`${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
    const data   = await res.json();
    const prices = data.prices;

    const labels = prices.map(p => {
      const d = new Date(p[0]);
      return days <= 1
        ? d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
    });

    const values = prices.map(p => p[1]);
    const isUp   = values[values.length - 1] >= values[0];
    const color  = isUp ? '#00e676' : '#ff4d4d';

    document.getElementById('chartLoading').style.display = 'none';
    document.getElementById('priceChart').style.display   = 'block';

    if (chartInst) chartInst.destroy();

    const ctx = document.getElementById('priceChart').getContext('2d');
    chartInst = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: color,
          backgroundColor: color + '18',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => fmt.price(ctx.parsed.y) }
        }},
        scales: {
          x: { grid: { color: '#2a2a3a' }, ticks: { color: '#6b6b8a', maxTicksLimit: 7 }},
          y: { grid: { color: '#2a2a3a' }, ticks: { color: '#6b6b8a', callback: v => fmt.price(v) }}
        }
      }
    });
  } catch (e) {
    document.getElementById('chartLoading').innerHTML =
      '<p style="color:var(--muted)">⚠️ Chart unavailable. Try again.</p>';
  }
}

function closeModal() {
  document.getElementById('chartModal').style.display = 'none';
  document.body.style.overflow = '';
  if (chartInst) { chartInst.destroy(); chartInst = null; }
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('range-btn')) {
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const days   = e.target.dataset.days;
    const coinId = document.getElementById('chartModal').dataset.coinId;
    loadChart(coinId, days);
  }
});

document.getElementById('chartModal').addEventListener('click', e => {
  if (e.target === document.getElementById('chartModal')) closeModal();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res  = await fetch(`${COINGECKO_BASE}/search/trending`, { signal: controller.signal });
    clearTimeout(timeout);
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
      `<div class="loading-state"><p>⚠️ Trending unavailable right now. Refresh to retry.</p></div>`;
  }
}

/* ─── FILTERS ────────────────────────────────── */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.id === 'togglePortfolio') return;
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