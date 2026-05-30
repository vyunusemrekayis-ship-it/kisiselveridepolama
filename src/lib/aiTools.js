// ─────────────────────────────────────────────────────────────────
// aiTools.js  –  AI araç tanımları ve executor
// Yeni bir modül eklenince sadece bu dosyaya ekleme yapılır.
// Ai.jsx ve FloatingAi.jsx buradan import eder.
// ─────────────────────────────────────────────────────────────────

import { calcChainStreak } from './utils';
import { loadFinance, saveFinance, monthlyAmount, monthKey } from '../pages/Finance/financeStore';

// ── Araç şemaları ──────────────────────────────────────────────────
export const AI_TOOLS = [
  { type: 'web_search_20250305', name: 'web_search' },

  // ── Görevler ──
  { name: 'get_todos', description: 'Belirli bir tarihteki görevleri getirir.', input_schema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['date'] } },
  { name: 'add_todo', description: 'Belirli bir tarihe görev ekler.', input_schema: { type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } }, required: ['date', 'text'] } },

  // ── Notlar ──
  { name: 'get_notes', description: 'Belirli bir tarihteki notları getirir.', input_schema: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } },
  { name: 'add_note', description: 'Belirli bir tarihe not ekler.', input_schema: { type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } }, required: ['date', 'text'] } },

  // ── Hava durumu ──
  { name: 'get_weather', description: 'Kayıtlı şehrin hava durumu bilgisini getirir.', input_schema: { type: 'object', properties: {}, required: [] } },

  // ── Hedefler ──
  { name: 'get_goals', description: 'Aktif hedefleri getirir.', input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['weekly', 'monthly', 'yearly', 'all'] } }, required: [] } },

  // ── Film / Kitap ──
  { name: 'get_films', description: 'İzlenen veya izlenecek filmleri getirir.', input_schema: { type: 'object', properties: { list: { type: 'string', enum: ['watched', 'watchlist', 'all'] } }, required: [] } },
  { name: 'get_books', description: 'Okunan veya okunacak kitapları getirir.', input_schema: { type: 'object', properties: { list: { type: 'string', enum: ['read', 'readlist', 'all'] } }, required: [] } },

  // ── Alışkanlık zinciri ──
  { name: 'get_chains', description: 'Zincir kırma alışkanlıklarını ve serilerini getirir.', input_schema: { type: 'object', properties: {}, required: [] } },

  // ── Hafta özeti ──
  { name: 'get_week_summary', description: 'Bir haftanın görev/not özetini getirir. offset=0 bu hafta, offset=1 geçen hafta.', input_schema: { type: 'object', properties: { offset: { type: 'number' } }, required: [] } },

  // ── Bellek ──
  { name: 'save_memory', description: 'Kullanıcı hakkında önemli bir bilgiyi kalıcı belleğe kaydeder.', input_schema: { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] } },

  // ── Finans ──────────────────────────────────────────────────────
  { name: 'get_finance_summary', description: 'Aylık gelir, gider, net bakiye ve tasarruf oranını getirir.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_finance_month', description: 'Belirli bir ayın işlemlerini ve toplamlarını getirir. month: YYYY-MM formatında.', input_schema: { type: 'object', properties: { month: { type: 'string', description: 'YYYY-MM, boş bırakılırsa bu ay' } }, required: [] } },
  { name: 'get_subscriptions', description: 'Tüm abonelikleri ve aylık toplam maliyeti getirir.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_credit_cards', description: 'Kredi kartı borçlarını, limitleri ve ödeme tahminlerini getirir.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_category_spending', description: 'Kategori bazlı harcama dağılımını getirir.', input_schema: { type: 'object', properties: { month: { type: 'string', description: 'YYYY-MM, boş bırakılırsa bu ay' } }, required: [] } },
  { name: 'get_investments', description: 'Yatırım portföyünü getirir.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'add_finance_transaction', description: 'Belirli bir aya manuel işlem ekler.', input_schema: { type: 'object', properties: { month: { type: 'string', description: 'YYYY-MM' }, desc: { type: 'string' }, amount: { type: 'number' }, type: { type: 'string', enum: ['income', 'expense'] }, cat: { type: 'string' } }, required: ['month', 'desc', 'amount', 'type'] } },
];

// ── Executor ──────────────────────────────────────────────────────
export function executeTool(name, input, store) {
  const { db, getTodos, addTodo: storeAddTodo, getNotes, setNotes, getChains, getWatchlist, getReadlist } = store;

  try {
    switch (name) {

      // ── Görevler ──
      case 'get_todos': {
        const todos = getTodos();
        const list = todos[input.date] || [];
        if (!list.length) return `${input.date} tarihinde görev yok.`;
        return JSON.stringify({ date: input.date, total: list.length, done: list.filter(t => t.done).length, items: list.map(t => ({ text: t.text, done: t.done })) });
      }
      case 'add_todo': storeAddTodo(input.date, input.text); return `"${input.text}" görevi eklendi.`;

      // ── Notlar ──
      case 'get_notes': {
        const notes = getNotes();
        const n = notes[input.date];
        if (!n || (Array.isArray(n) && !n.length)) return `${input.date} tarihinde not yok.`;
        const arr = Array.isArray(n) ? n : [n];
        return JSON.stringify({ date: input.date, notes: arr.map(x => typeof x === 'object' ? x.text : x) });
      }
      case 'add_note': {
        const notes = getNotes();
        if (!Array.isArray(notes[input.date])) notes[input.date] = [];
        notes[input.date].push({ text: input.text, color: '#3a7bd5' });
        setNotes(notes);
        return `"${input.text}" notu eklendi.`;
      }

      // ── Hava durumu ──
      case 'get_weather': {
        const wxCities = JSON.parse(localStorage.getItem('gn_wx_cities') || '[]');
        if (!wxCities.length) return 'Hava durumu için şehir kaydedilmemiş.';
        return JSON.stringify({ city: wxCities[0].name });
      }

      // ── Hedefler ──
      case 'get_goals': {
        let goals = db.g || [];
        if (input.period && input.period !== 'all') goals = goals.filter(g => g.period === input.period);
        return JSON.stringify(goals.map(g => ({ name: g.name, period: g.period, target: g.target, current: g.current || 0, unit: g.unit || '', done: g.done })));
      }

      // ── Filmler ──
      case 'get_films': {
        const result = {};
        const list = input.list || 'all';
        if (list === 'watched' || list === 'all') result.watched = (db.f || []).map(f => ({ name: f.name, dir: f.dir, date: f.date }));
        if (list === 'watchlist' || list === 'all') result.watchlist = getWatchlist().map(f => ({ name: f.name }));
        return JSON.stringify(result);
      }

      // ── Kitaplar ──
      case 'get_books': {
        const result = {};
        const list = input.list || 'all';
        if (list === 'read' || list === 'all') result.read = (db.b || []).map(b => ({ name: b.name, author: b.author }));
        if (list === 'readlist' || list === 'all') result.readlist = getReadlist().map(b => ({ name: b.name, author: b.author }));
        return JSON.stringify(result);
      }

      // ── Alışkanlık zinciri ──
      case 'get_chains': {
        const chains = getChains();
        return JSON.stringify(chains.map(ch => { const { streak } = calcChainStreak(ch); return { name: ch.name, streak }; }));
      }

      // ── Hafta özeti ──
      case 'get_week_summary': {
        const offset = input.offset || 0;
        const now = new Date(); now.setDate(now.getDate() - offset * 7);
        const monday = new Date(now); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        const todos = getTodos();
        const weekDone = [], weekTodo = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday); d.setDate(d.getDate() + i);
          const ds = d.toISOString().split('T')[0];
          (todos[ds] || []).forEach(t => (t.done ? weekDone : weekTodo).push({ date: ds, text: t.text }));
        }
        return JSON.stringify({ week_start: monday.toISOString().split('T')[0], done: weekDone, pending: weekTodo, total_films: db.f?.length, total_books: db.b?.length });
      }

      // ── Bellek ──
      case 'save_memory': {
        const mem = JSON.parse(localStorage.getItem('gn_ai_memory') || '[]');
        mem.push({ note: input.note, date: new Date().toISOString().split('T')[0] });
        localStorage.setItem('gn_ai_memory', JSON.stringify(mem));
        return `Belleğe kaydedildi: "${input.note}"`;
      }

      // ── Finans: Genel özet ──
      case 'get_finance_summary': {
        const fin = loadFinance();
        const totalIncome = fin.incomes.reduce((s, i) => s + (+i.amount || 0), 0);
        const totalExpense = [...fin.expenses, ...fin.subscriptions].reduce((s, e) => s + monthlyAmount(e), 0);
        const net = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;
        const totalCardDebt = fin.creditCards.reduce((s, c) => s + (+c.debt || 0), 0);
        const totalSubs = fin.subscriptions.reduce((s, sub) => s + monthlyAmount(sub), 0);
        return JSON.stringify({
          monthly_income: totalIncome,
          monthly_expense: totalExpense,
          net,
          savings_rate_pct: savingsRate,
          total_card_debt: totalCardDebt,
          subscription_monthly: totalSubs,
          income_sources: fin.incomes.map(i => ({ name: i.name, amount: +i.amount })),
        });
      }

      // ── Finans: Aylık işlemler ──
      case 'get_finance_month': {
        const fin = loadFinance();
        const mk = input.month || monthKey();
        const txs = fin.transactions[mk] || [];
        const totalIncome = fin.incomes.reduce((s, i) => s + (+i.amount || 0), 0);
        const totalExpense = [...fin.expenses, ...fin.subscriptions].reduce((s, e) => s + monthlyAmount(e), 0);
        const txIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + (+t.amount || 0), 0);
        const txExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + (+t.amount || 0), 0);
        return JSON.stringify({
          month: mk,
          income: totalIncome + txIncome,
          expense: totalExpense + txExpense,
          net: (totalIncome + txIncome) - (totalExpense + txExpense),
          transactions: txs.map(t => ({ desc: t.desc, amount: +t.amount, type: t.type, cat: t.cat })),
        });
      }

      // ── Finans: Abonelikler ──
      case 'get_subscriptions': {
        const fin = loadFinance();
        const subs = fin.subscriptions || [];
        const totalMonthly = subs.reduce((s, sub) => s + monthlyAmount(sub), 0);
        return JSON.stringify({
          total_monthly: totalMonthly,
          total_yearly: totalMonthly * 12,
          subscriptions: subs.map(s => ({
            name: s.name,
            amount: +s.amount,
            period: s.period,
            monthly_equiv: monthlyAmount(s),
            due_day: s.dueDay,
          })),
        });
      }

      // ── Finans: Kredi kartları ──
      case 'get_credit_cards': {
        const fin = loadFinance();
        const cards = fin.creditCards || [];
        return JSON.stringify({
          total_debt: cards.reduce((s, c) => s + (+c.debt || 0), 0),
          cards: cards.map(c => {
            const r = +c.interestRate / 100 / 12;
            const pay = +c.monthlyPayment;
            const debt = +c.debt;
            let payoffMonths = null;
            if (pay > 0 && debt > 0) {
              if (r === 0) payoffMonths = Math.ceil(debt / pay);
              else if (pay > debt * r) payoffMonths = Math.ceil(-Math.log(1 - (debt * r) / pay) / Math.log(1 + r));
            }
            return {
              name: c.name,
              debt,
              limit: +c.limit || null,
              usage_pct: c.limit ? Math.round(debt / +c.limit * 100) : null,
              monthly_payment: pay,
              min_payment: +c.minPayment || null,
              due_day: c.dueDay,
              cut_day: c.cutDay,
              interest_rate_monthly: +c.interestRate,
              payoff_months: payoffMonths,
            };
          }),
        });
      }

      // ── Finans: Kategori harcamaları ──
      case 'get_category_spending': {
        const fin = loadFinance();
        const mk = input.month || monthKey();
        const txs = fin.transactions[mk] || [];
        const map = {};
        [...fin.expenses, ...fin.subscriptions].forEach(e => {
          const cat = e.cat || 'other';
          map[cat] = (map[cat] || 0) + monthlyAmount(e);
        });
        txs.filter(t => t.type === 'expense').forEach(t => {
          const cat = t.cat || 'other';
          map[cat] = (map[cat] || 0) + (+t.amount || 0);
        });
        const total = Object.values(map).reduce((s, v) => s + v, 0);
        const categories = Object.entries(map).map(([cat, amount]) => ({
          cat, amount, pct: total > 0 ? Math.round(amount / total * 100) : 0,
        })).sort((a, b) => b.amount - a.amount);
        return JSON.stringify({ month: mk, total, categories });
      }

      // ── Finans: Yatırımlar ──
      case 'get_investments': {
        const fin = loadFinance();
        const invs = fin.investments || [];
        return JSON.stringify({
          count: invs.length,
          investments: invs.map(i => ({
            name: i.name,
            symbol: i.symbol,
            type: i.type,
            amount: +i.amount || null,
            buy_price: +i.buyPrice || null,
            note: i.note,
          })),
        });
      }

      // ── Finans: İşlem ekle ──
      case 'add_finance_transaction': {
        const fin = loadFinance();
        const mk = input.month || monthKey();
        const tx = {
          id: Date.now(),
          desc: input.desc,
          amount: input.amount,
          type: input.type,
          cat: input.cat || 'other',
          mk,
          source: 'ai',
        };
        const updated = {
          ...fin,
          transactions: {
            ...fin.transactions,
            [mk]: [...(fin.transactions[mk] || []), tx],
          },
        };
        saveFinance(updated);
        return `${mk} ayına "${input.desc}" (${input.type === 'income' ? '+' : '-'}₺${input.amount}) eklendi.`;
      }

      default: return 'Bilinmeyen araç.';
    }
  } catch (e) {
    return `Hata: ${e.message}`;
  }
}
