import { create } from 'zustand';

const SK = 'gn_db';

const defaultDb = {
  f: [], // films
  b: [], // books
  g: [], // goals
  s: [], // special days
};

function loadDb() {
  try { return { ...defaultDb, ...JSON.parse(localStorage.getItem(SK) || '{}') }; }
  catch { return defaultDb; }
}

function saveDb(db) {
  localStorage.setItem(SK, JSON.stringify(db));
  if (window._fbUser) { import("../lib/firebase").then(({saveToFirestore}) => { saveToFirestore(window._fbUser.uid, {main: db}); }); }
}

// localStorage helpers
const lsGet = (key, def = '{}') => { try { return JSON.parse(localStorage.getItem(key) || def); } catch { return JSON.parse(def); } };
const lsSet = (key, val) => { localStorage.setItem(key, JSON.stringify(val)); if (window._fbUser) { import("../lib/firebase").then(({saveToFirestore}) => { saveToFirestore(window._fbUser.uid, {[key]: val}); }); } };

export const useStore = create((set, get) => ({
  db: loadDb(),
  currentPage: 'home',
  sidebarCollapsed: false,
  userProfile: null,

  // ── PAGE ──
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setUserProfile: (profile) => set({ userProfile: profile }),

  // ── DB RELOAD (Firestore sync) ──
  reloadDb: () => {
    set({ db: loadDb() });
    // elapsed'ı da window._sw'ye yükle
    const elapsed = parseInt(localStorage.getItem('gn_sw_elapsed') || '0');
    if (window._sw) { window._sw.elapsed = elapsed; }
  },
  setDb: (db) => { saveDb(db); set({ db }); },

  // ── FILMS ──
  addFilm: (film) => {
    const db = get().db;
    const updated = { ...db, f: [film, ...db.f] };
    saveDb(updated); set({ db: updated });
  },
  updateFilm: (i, film) => {
    const db = get().db;
    const f = [...db.f]; f[i] = film;
    const updated = { ...db, f };
    saveDb(updated); set({ db: updated });
  },
  deleteFilm: (i) => {
    const db = get().db;
    const f = db.f.filter((_, idx) => idx !== i);
    const updated = { ...db, f };
    saveDb(updated); set({ db: updated });
  },

  // ── BOOKS ──
  addBook: (book) => {
    const db = get().db;
    const updated = { ...db, b: [book, ...db.b] };
    saveDb(updated); set({ db: updated });
  },
  updateBook: (i, book) => {
    const db = get().db;
    const b = [...db.b]; b[i] = book;
    const updated = { ...db, b };
    saveDb(updated); set({ db: updated });
  },
  deleteBook: (i) => {
    const db = get().db;
    const b = db.b.filter((_, idx) => idx !== i);
    const updated = { ...db, b };
    saveDb(updated); set({ db: updated });
  },

  // ── GOALS ──
  addGoal: (goal) => {
    const db = get().db;
    const updated = { ...db, g: [...db.g, goal] };
    saveDb(updated); set({ db: updated });
  },
  updateGoal: (i, goal) => {
    const db = get().db;
    const g = [...db.g]; g[i] = goal;
    const updated = { ...db, g };
    saveDb(updated); set({ db: updated });
  },
  deleteGoal: (i) => {
    const db = get().db;
    const g = db.g.filter((_, idx) => idx !== i);
    const updated = { ...db, g };
    saveDb(updated); set({ db: updated });
  },
  toggleGoal: (i) => {
    const db = get().db;
    const g = [...db.g];
    g[i] = { ...g[i], done: !g[i].done };
    const updated = { ...db, g };
    saveDb(updated); set({ db: updated });
  },
  updateGoalProgress: (i, current) => {
    const db = get().db;
    const g = [...db.g];
    g[i] = { ...g[i], current };
    const updated = { ...db, g };
    saveDb(updated); set({ db: updated });
  },

  // ── SPECIAL DAYS ──
  addSpecialDay: (day) => {
    const db = get().db;
    const updated = { ...db, s: [...(db.s || []), day] };
    saveDb(updated); set({ db: updated });
  },
  deleteSpecialDay: (i) => {
    const db = get().db;
    const s = (db.s || []).filter((_, idx) => idx !== i);
    const updated = { ...db, s };
    saveDb(updated); set({ db: updated });
  },

  // ── TODOS ──
  getTodos: () => lsGet('gn_todos', '{}'),
  setTodos: (todos) => lsSet('gn_todos', todos),
  addTodo: (date, text) => {
    const todos = lsGet('gn_todos', '{}');
    if (!todos[date]) todos[date] = [];
    todos[date].push({ text, done: false });
    lsSet('gn_todos', todos);
  },
  toggleTodo: (date, i) => {
    const todos = lsGet('gn_todos', '{}');
    if (todos[date]?.[i]) todos[date][i].done = !todos[date][i].done;
    lsSet('gn_todos', todos);
  },
  deleteTodo: (date, i) => {
    const todos = lsGet('gn_todos', '{}');
    if (todos[date]) todos[date].splice(i, 1);
    lsSet('gn_todos', todos);
  },

  // ── NOTES ──
  getNotes: () => lsGet('gn_notes', '{}'),
  setNotes: (notes) => lsSet('gn_notes', notes),

  // ── MEDIA ──
  getMedia: () => lsGet('gn_media', '{}'),
  setMedia: (media) => lsSet('gn_media', media),

  // ── CHAINS ──
  getChains: () => lsGet('gn_chains', '[]'),
  setChains: (chains) => lsSet('gn_chains', chains),

  // ── WATCHLIST ──
  getWatchlist: () => { const db = lsGet('gunlugum_v3', '{}'); return db.f || []; },
  setWatchlist: (wl) => { const db = lsGet('gunlugum_v3', '{}'); db.f = wl; lsSet('gunlugum_v3', db); },

  // ── READLIST ──
  getReadlist: () => { const db = lsGet('gunlugum_v3', '{}'); return db.b || []; },
  setReadlist: (rl) => { const db = lsGet('gunlugum_v3', '{}'); db.b = rl; lsSet('gunlugum_v3', db); },

  // ── STOPWATCH ──
  getSwLog: () => lsGet('gn_sw_log', '[]'),
  setSwLog: (log) => {
    lsSet('gn_sw_log', log);
    // elapsed'ı da Firestore'a kaydet
    const elapsed = parseInt(localStorage.getItem('gn_sw_elapsed') || '0');
    if (window._fbUser) { import("../lib/firebase").then(({saveToFirestore}) => { saveToFirestore(window._fbUser.uid, {gn_sw_elapsed: elapsed}); }); }
  },

  // ── AI PROFİL ──
  getAiProfile: () => lsGet('gn_ai_profile', '{}'),
  setAiProfile: (profile) => lsSet('gn_ai_profile', profile),

  // ── AI ÖZET ──
  getAiSummary: () => { try { return localStorage.getItem('gn_ai_summary') || ''; } catch { return ''; } },
  setAiSummary: (summary) => { localStorage.setItem('gn_ai_summary', summary); },
}));
