// ─────────────────────────────────────────────
// financeStore.js  –  tüm finans verisi buradan
// ─────────────────────────────────────────────

export const LS_KEY = 'gn_finance_v2';

export function defaultData() {
  return {
    incomes: [],        // { id, name, amount, note, day }
    expenses: [],       // { id, name, amount, cat, period, dueDay, note }
    subscriptions: [],  // { id, name, amount, period, dueDay, cat, note }
    transactions: {},   // { 'YYYY-MM': [ txObj ] }
    creditCards: [],    // { id, name, limit, debt, minPayment, monthlyPayment, cutDay, dueDay, interestRate }
    goals: [],          // { id, name, target, saved, note }
    investments: [],    // { id, symbol, type, amount, buyPrice, note }
  };
}

export function loadFinance() {
  try { return { ...defaultData(), ...JSON.parse(localStorage.getItem(LS_KEY) || 'null') }; }
  catch { return defaultData(); }
}

export function saveFinance(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// ── Tarih / format yardımcıları ────────────────
export const fmt = (n, decimals = 0) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(+n || 0);

export const fmtCurrency = (n) => '₺' + fmt(n, 0);

export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const todayKey = () => monthKey(new Date());

export const monthLabel = (k) => {
  const [y, m] = k.split('-');
  return new Date(+y, +m - 1).toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
};

export const shortMonth = (k) => {
  const [y, m] = k.split('-');
  return new Date(+y, +m - 1).toLocaleString('tr-TR', { month: 'short' });
};

// ── Aylık tutar hesabı ─────────────────────────
export function monthlyAmount(item) {
  const a = +item.amount || 0;
  if (item.period === 'yearly') return a / 12;
  if (item.period === 'weekly') return a * 4.33;
  return a; // monthly default
}

// ── Toplam sabit gelir / gider ─────────────────
export function calcTotals(data) {
  const totalIncome = data.incomes.reduce((s, i) => s + (+i.amount || 0), 0);
  const totalExpense = data.expenses.reduce((s, e) => s + monthlyAmount(e), 0);
  const totalSubs = data.subscriptions.reduce((s, s2) => s + monthlyAmount(s2), 0);
  return { totalIncome, totalExpense: totalExpense + totalSubs, totalSubs };
}

// ── Son N ay key listesi ───────────────────────
export function lastNMonths(n = 12) {
  const result = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    result.push(monthKey(t));
  }
  return result;
}

// ── Aylık işlem toplamları ─────────────────────
export function monthlyTotals(data, mk) {
  const txs = data.transactions[mk] || [];
  const txIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + (+t.amount || 0), 0);
  const txExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + (+t.amount || 0), 0);
  const { totalIncome, totalExpense } = calcTotals(data);
  return {
    income: totalIncome + txIncome,
    expense: totalExpense + txExpense,
    net: (totalIncome + txIncome) - (totalExpense + txExpense),
    txs,
  };
}

// ── Kredi kartı ödeme tahmini ──────────────────
export function calcPayoff(debt, monthlyPay, interestRate) {
  if (!debt || !monthlyPay) return null;
  const r = interestRate / 100 / 12;
  if (r === 0) {
    const months = Math.ceil(debt / monthlyPay);
    const d = new Date(); d.setMonth(d.getMonth() + months);
    return { months, date: d.toLocaleString('tr-TR', { month: 'long', year: 'numeric' }), interest: 0 };
  }
  if (monthlyPay <= debt * r) return null;
  const months = Math.ceil(-Math.log(1 - (debt * r) / monthlyPay) / Math.log(1 + r));
  const d = new Date(); d.setMonth(d.getMonth() + months);
  return { months, date: d.toLocaleString('tr-TR', { month: 'long', year: 'numeric' }), interest: monthlyPay * months - debt };
}

// ── Kategori listesi ───────────────────────────
export const EXPENSE_CATS = [
  { id: 'market',  label: 'Market',    color: '#34d399' },
  { id: 'food',    label: 'Yemek',     color: '#fb923c' },
  { id: 'trans',   label: 'Ulaşım',    color: '#60a5fa' },
  { id: 'edu',     label: 'Eğitim',    color: '#a78bfa' },
  { id: 'tech',    label: 'Teknoloji', color: '#38bdf8' },
  { id: 'clothes', label: 'Giyim',     color: '#f472b6' },
  { id: 'health',  label: 'Sağlık',    color: '#f87171' },
  { id: 'ent',     label: 'Eğlence',   color: '#fbbf24' },
  { id: 'rent',    label: 'Kira/Fatura', color: '#94a3b8' },
  { id: 'sub',     label: 'Abonelik',  color: '#c084fc' },
  { id: 'other',   label: 'Diğer',     color: '#6b7280' },
];
export const CAT_MAP = Object.fromEntries(EXPENSE_CATS.map(c => [c.id, c]));

// ── Yatırım tipleri ────────────────────────────
export const INVESTMENT_TYPES = [
  { id: 'crypto', label: 'Kripto',  color: '#fbbf24' },
  { id: 'stock',  label: 'Hisse',   color: '#3a7bd5' },
  { id: 'gold',   label: 'Altın',   color: '#f59e0b' },
  { id: 'forex',  label: 'Döviz',   color: '#34d399' },
  { id: 'other',  label: 'Diğer',   color: '#94a3b8' },
];
export const INV_MAP = Object.fromEntries(INVESTMENT_TYPES.map(t => [t.id, t]));

// ── Canlı fiyat API'leri ───────────────────────
// Kripto + Döviz: public API, key gerekmez
export async function fetchCryptoPrice(symbol) {
  try {
    const id = CRYPTO_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=try&include_24hr_change=true`);
    const d = await r.json();
    const entry = d[id];
    if (!entry) return null;
    return { price: entry.try, change24h: entry.try_24h_change };
  } catch { return null; }
}

export async function fetchForexPrice(symbol) {
  const TROY_OZ_TO_GRAM = 31.1035;
  try {
    const r = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${symbol.toLowerCase()}.json`);
    const d = await r.json();
    const rawRate = d[symbol.toLowerCase()]?.try;
    if (!rawRate) return null;
    const price = symbol.toUpperCase() === 'XAU' ? rawRate / TROY_OZ_TO_GRAM : rawRate;
    return { price, change24h: null };
  } catch { return null; }
}

export const CRYPTO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin',
  SOL: 'solana', ADA: 'cardano', DOGE: 'dogecoin',
  XRP: 'ripple', AVAX: 'avalanche-2', DOT: 'polkadot',
  MATIC: 'matic-network', LINK: 'chainlink', UNI: 'uniswap',
};

export async function fetchStockPrice(symbol) {
  const isTurkish = symbol.endsWith('.IS');
  const usdTry = await getUsdTry();

  // 1. codetabs proxy — en güvenilir CORS proxy
  try {
    const yUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
    const r = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yUrl)}`, { signal: AbortSignal.timeout(7000) });
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (meta?.regularMarketPrice) {
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose;
      return { price: isTurkish ? price : price * usdTry, change24h: prev ? ((price - prev) / prev) * 100 : null };
    }
  } catch {}

  // 2. allorigins — ikinci tercih
  try {
    const yUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`);
    const r = await fetch(`https://api.allorigins.win/get?url=${yUrl}`, { signal: AbortSignal.timeout(7000) });
    const wrap = await r.json();
    const d = JSON.parse(wrap.contents || 'null');
    const meta = d?.chart?.result?.[0]?.meta;
    if (meta?.regularMarketPrice) {
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose;
      return { price: isTurkish ? price : price * usdTry, change24h: prev ? ((price - prev) / prev) * 100 : null };
    }
  } catch {}

  // 3. jsonp.afeld.me proxy
  try {
    const yUrl = encodeURIComponent(`https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
    const r = await fetch(`https://jsonp.afeld.me/?url=${yUrl}`, { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    const q = d?.quoteResponse?.result?.[0];
    if (q?.regularMarketPrice) {
      const price = q.regularMarketPrice;
      const prev = q.regularMarketPreviousClose;
      return { price: isTurkish ? price : price * usdTry, change24h: prev ? ((price - prev) / prev) * 100 : null };
    }
  } catch {}

  // 4. Yahoo Finance v7 doğrudan — bazı tarayıcılarda çalışır
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=regularMarketPrice,regularMarketPreviousClose`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const d = await r.json();
    const q = d?.quoteResponse?.result?.[0];
    if (q?.regularMarketPrice) {
      const price = q.regularMarketPrice;
      const prev = q.regularMarketPreviousClose;
      return { price: isTurkish ? price : price * usdTry, change24h: prev ? ((price - prev) / prev) * 100 : null };
    }
  } catch {}

  return null;
}

async function getUsdTry() {
  try {
    const r = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', { signal: AbortSignal.timeout(4000) });
    const d = await r.json();
    return d?.usd?.try || 38;
  } catch { return 38; }
}

// ── Fiyat geçmişi localStorage ─────────────────
// Her sembol için { ts, price } dizisi saklar
const PRICE_HISTORY_KEY = 'gn_inv_history';

export function loadPriceHistory(symbol) {
  try {
    const all = JSON.parse(localStorage.getItem(PRICE_HISTORY_KEY) || '{}');
    return all[symbol.toUpperCase()] || [];
  } catch { return []; }
}

export function savePricePoint(symbol, price) {
  if (!price || price <= 0) return;
  try {
    const all = JSON.parse(localStorage.getItem(PRICE_HISTORY_KEY) || '{}');
    const key = symbol.toUpperCase();
    const arr = all[key] || [];
    const now = Date.now();
    // Aynı günde birden fazla kayıt olmasın
    const todayStart = new Date().setHours(0,0,0,0);
    const filtered = arr.filter(p => p.ts < todayStart);
    filtered.push({ ts: now, price });
    // En fazla 90 gün sakla
    const cutoff = now - 90 * 24 * 60 * 60 * 1000;
    all[key] = filtered.filter(p => p.ts > cutoff);
    localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(all));
  } catch {}
}

// ── Kripto 30 günlük geçmiş (CoinGecko) ──────────
export async function fetchCryptoHistory(symbol) {
  try {
    const id = CRYPTO_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=try&days=30&interval=daily`,
      { signal: AbortSignal.timeout(8000) }
    );
    const d = await r.json();
    if (!d?.prices?.length) return null;
    // [ [timestamp, price], ... ] → { ts, price }[]
    return d.prices.map(([ts, price]) => ({ ts, price }));
  } catch { return null; }
}

// ── Anthropic web_search ile anlık fiyat ─────────
// Hisse ve altın için CORS sorunu olmadan fiyat çeker
export async function fetchPriceViaAI(symbol, type, name) {
  if (!window.ANTHROPIC_KEY && window.loadApiKey) await window.loadApiKey();
  if (!window.ANTHROPIC_KEY) return null;
  try {
    const query = type === 'gold'
      ? 'gram altın fiyatı TL güncel'
      : type === 'forex'
      ? `${symbol} TRY kur güncel`
      : `${name || symbol} hisse fiyatı USD güncel`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': window.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `"${query}" - Sadece güncel sayısal fiyatı JSON olarak ver: {"price": 123.45, "currency": "TRY"}. Başka hiçbir şey yazma.`,
        }],
      }),
    });
    const data = await r.json();

    // tool_use döngüsünü çalıştır
    let msgs = [{ role: 'user', content: `"${query}" - Sadece güncel sayısal fiyatı JSON olarak ver: {"price": 123.45, "currency": "TRY"}. Başka hiçbir şey yazma.` }];
    let resp = data;
    let iterations = 0;

    while (resp.stop_reason === 'tool_use' && iterations < 3) {
      const toolUses = resp.content.filter(b => b.type === 'tool_use');
      const toolResults = await Promise.all(toolUses.map(async t => {
        const tr = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': window.ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [
              ...msgs,
              { role: 'assistant', content: resp.content },
              { role: 'user', content: [{ type: 'tool_result', tool_use_id: t.id, content: 'Arama yapıldı' }] },
            ],
          }),
        });
        return tr.json();
      }));
      resp = toolResults[0];
      iterations++;
    }

    const text = resp?.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    const match = text.match(/\{[^}]*"price"\s*:\s*([\d.,]+)[^}]*\}/);
    if (match) {
      const price = parseFloat(match[1].replace(',', '.'));
      if (price > 0) {
        // USD hisseleri → TRY'ye çevir
        if (type === 'stock' && !symbol.endsWith('.IS')) {
          const usdTry = await getUsdTry();
          return { price: price * usdTry, change24h: null };
        }
        return { price, change24h: null };
      }
    }
    return null;
  } catch { return null; }
}
