import { create } from 'zustand';

const SK = 'gn_db';

const defaultDb = {
  f: [], b: [], g: [], s: [], wl: [], rl: [],
};

function loadDb() {
  try {
    const db = { ...defaultDb, ...JSON.parse(localStorage.getItem(SK) || '{}') };
    if ((!db.wl || db.wl.length === 0) || (!db.rl || db.rl.length === 0)) {
      try {
        const old = JSON.parse(localStorage.getItem('gunlugum_v3') || '{}');
        if (old.f?.length > 0 && (!db.wl || db.wl.length === 0)) db.wl = old.f;
        if (old.b?.length > 0 && (!db.rl || db.rl.length === 0)) db.rl = old.b;
      } catch {}
    }
    return db;
  } catch { return defaultDb; }
}

function saveDb(db) {
  localStorage.setItem(SK, JSON.stringify(db));
  if (window._fbUser) {
    import("../lib/firebase").then(({ saveToFirestore }) => {
      saveToFirestore(window._fbUser.uid, { main: db });
    });
  }
}

const lsGet = (key, def = '{}') => { try { return JSON.parse(localStorage.getItem(key) || def); } catch { return JSON.parse(def); } };
const lsSet = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
  if (window._fbUser) {
    import("../lib/firebase").then(({ saveToFirestore }) => {
      saveToFirestore(window._fbUser.uid, { [key]: val });
    });
  }
};

export const useStore = create((set, get) => ({
  db: loadDb(),
  currentPage: 'home',
  sidebarCollapsed: false,
  userProfile: null,
  swState: null, // { running, startTime } — Clock sync için
  swLog: JSON.parse(localStorage.getItem('gn_sw_log') || '[]'),

  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setUserProfile: (profile) => set({ userProfile: profile }),

  reloadDb: (incoming) => {
    if (incoming) {
      if (incoming.main) localStorage.setItem(SK, JSON.stringify(incoming.main));
      if (incoming.gn_notes) localStorage.setItem('gn_notes', JSON.stringify(incoming.gn_notes));
      if (incoming.gn_todos) localStorage.setItem('gn_todos', JSON.stringify(incoming.gn_todos));
      if (incoming.gn_chains) localStorage.setItem('gn_chains', JSON.stringify(incoming.gn_chains));
      if (incoming.gn_sw_log !== undefined) {
        localStorage.setItem('gn_sw_log', JSON.stringify(incoming.gn_sw_log));
        set({ swLog: incoming.gn_sw_log });
      }
      if (incoming.gn_finance_v2) localStorage.setItem('gn_finance_v2', JSON.stringify(incoming.gn_finance_v2));
      if (incoming.gn_sw_elapsed !== undefined) localStorage.setItem('gn_sw_elapsed', String(incoming.gn_sw_elapsed));

      // Kronometre remote sync — Clock bunu izler
      if (incoming.gn_sw_running !== undefined) {
        set({ swState: {
          running: !!incoming.gn_sw_running,
          startTime: incoming.gn_sw_startTime || null,
          elapsed: incoming.gn_sw_elapsed ?? parseInt(localStorage.getItem('gn_sw_elapsed') || '0'),
        }});
      }
    }
    set({ db: loadDb() });
    // window._sw varsa güncelle ama yoksa dokunma — Clock kendi init eder
    try { if (window._sw && !window._sw.running) { window._sw.elapsed = parseInt(localStorage.getItem('gn_sw_elapsed') || '0'); } } catch {}
  },
  setDb: (db) => { saveDb(db); set({ db }); },

  // ── FILMS ──
  addFilm: (film) => { const db = get().db; const updated = { ...db, f: [film, ...db.f] }; saveDb(updated); set({ db: updated }); },
  updateFilm: (i, film) => { const db = get().db; const f = [...db.f]; f[i] = film; const updated = { ...db, f }; saveDb(updated); set({ db: updated }); },
  deleteFilm: (i) => { const db = get().db; const updated = { ...db, f: db.f.filter((_, idx) => idx !== i) }; saveDb(updated); set({ db: updated }); },

  // ── BOOKS ──
  addBook: (book) => { const db = get().db; const updated = { ...db, b: [book, ...db.b] }; saveDb(updated); set({ db: updated }); },
  updateBook: (i, book) => { const db = get().db; const b = [...db.b]; b[i] = book; const updated = { ...db, b }; saveDb(updated); set({ db: updated }); },
  deleteBook: (i) => { const db = get().db; const updated = { ...db, b: db.b.filter((_, idx) => idx !== i) }; saveDb(updated); set({ db: updated }); },

  // ── GOALS ──
  addGoal: (goal) => { const db = get().db; const updated = { ...db, g: [...db.g, goal] }; saveDb(updated); set({ db: updated }); },
  updateGoal: (i, goal) => { const db = get().db; const g = [...db.g]; g[i] = goal; const updated = { ...db, g }; saveDb(updated); set({ db: updated }); },
  deleteGoal: (i) => { const db = get().db; const updated = { ...db, g: db.g.filter((_, idx) => idx !== i) }; saveDb(updated); set({ db: updated }); },
  toggleGoal: (i) => { const db = get().db; const g = [...db.g]; g[i] = { ...g[i], done: !g[i].done }; const updated = { ...db, g }; saveDb(updated); set({ db: updated }); },
  updateGoalProgress: (i, current) => { const db = get().db; const g = [...db.g]; g[i] = { ...g[i], current }; const updated = { ...db, g }; saveDb(updated); set({ db: updated }); },

  // ── SPECIAL DAYS ──
  addSpecialDay: (day) => { const db = get().db; const updated = { ...db, s: [...(db.s || []), day] }; saveDb(updated); set({ db: updated }); },
  deleteSpecialDay: (i) => { const db = get().db; const updated = { ...db, s: (db.s || []).filter((_, idx) => idx !== i) }; saveDb(updated); set({ db: updated }); },

  // ── WATCHLIST ──
  getWatchlist: () => get().db.wl || [],
  setWatchlist: (wl) => { const db = get().db; const updated = { ...db, wl }; saveDb(updated); set({ db: updated }); },

  // ── READLIST ──
  getReadlist: () => get().db.rl || [],
  setReadlist: (rl) => { const db = get().db; const updated = { ...db, rl }; saveDb(updated); set({ db: updated }); },

  // ── TODOS ──
  getTodos: () => lsGet('gn_todos', '{}'),
  setTodos: (todos) => lsSet('gn_todos', todos),
  addTodo: (date, text) => { const todos = lsGet('gn_todos', '{}'); if (!todos[date]) todos[date] = []; todos[date].push({ text, done: false }); lsSet('gn_todos', todos); },
  toggleTodo: (date, i) => { const todos = lsGet('gn_todos', '{}'); if (todos[date]?.[i]) todos[date][i].done = !todos[date][i].done; lsSet('gn_todos', todos); },
  deleteTodo: (date, i) => { const todos = lsGet('gn_todos', '{}'); if (todos[date]) todos[date].splice(i, 1); lsSet('gn_todos', todos); },

  // ── NOTES ──
  getNotes: () => lsGet('gn_notes', '{}'),
  setNotes: (notes) => lsSet('gn_notes', notes),

  // ── MEDIA ──
  getMedia: () => lsGet('gn_media', '{}'),
  setMedia: (media) => lsSet('gn_media', media),

  // ── CHAINS ──
  getChains: () => lsGet('gn_chains', '[]'),
  setChains: (chains) => lsSet('gn_chains', chains),

  // ── STOPWATCH ──
  getSwLog: () => lsGet('gn_sw_log', '[]'),
  setSwLog: (log) => { lsSet('gn_sw_log', log); set({ swLog: log }); },

  // ── AI ──
  getAiProfile: () => lsGet('gn_ai_profile', '{}'),
  setAiProfile: (profile) => lsSet('gn_ai_profile', profile),
  getAiSummary: () => { try { return localStorage.getItem('gn_ai_summary') || ''; } catch { return ''; } },
  setAiSummary: (summary) => { localStorage.setItem('gn_ai_summary', summary); },
}));
