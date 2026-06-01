# 💰 nGetHaCrypto Updates

> Real-time cryptocurrency dashboard by **Benson Ngetha**

A clean, dark-themed crypto dashboard that pulls live data from free APIs — no backend, no API keys required.

## 🚀 Features

- **Live crypto prices** — Top 24 coins by market cap (CoinGecko)
- **Scrolling ticker** — Real-time market overview strip
- **Trending coins** — What the crypto world is watching right now
- **USD → KES converter** — Instant currency conversion for Kenyan users
- **Sort & filter** — By rank, 24h change, or price
- **Auto-refresh** — Prices update every 60 seconds

## 📡 APIs Used (All Free, No Key Required)

| API | Purpose |
|-----|---------|
| [CoinGecko](https://www.coingecko.com/en/api) | Crypto prices, market data, trending |
| [ExchangeRate-API](https://open.er-api.com) | USD → KES live rate |

## 🗂 Project Structure

```
ngethacrpyto-updates/
├── index.html          # Main entry point
├── src/
│   ├── app.js          # All JS logic & API calls
│   └── styles/
│       └── main.css    # Dark terminal aesthetic styles
├── public/             # Static assets
├── .gitignore
└── README.md
```

## 🛠 Running Locally

No build step needed — pure HTML/CSS/JS.

```bash
# Option 1: Open directly
open index.html

# Option 2: Live server (recommended for VS Code)
# Install the "Live Server" extension, then right-click index.html → "Open with Live Server"

# Option 3: Python simple server
python3 -m http.server 3000
# Visit http://localhost:3000
```

## 📦 Deploying

### GitHub Pages
1. Push to GitHub
2. Go to Settings → Pages
3. Set source to `main` branch, `/ (root)`
4. Your site will be live at `https://<username>.github.io/ngethacrpyto-updates`

### Netlify / Vercel
Just drag and drop the project folder — it works out of the box.

## ⚠️ Notes

- CoinGecko free tier has a rate limit (~10-30 req/min). The app handles this gracefully.
- Prices are indicative; not financial advice.

## 👤 Author

**Benson Ngetha**  
Built with ❤️ and powered by free APIs.

---

*"Don't just watch the market — understand it."*
