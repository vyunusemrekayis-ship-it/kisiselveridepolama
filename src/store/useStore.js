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
  window.saveToFirestore?.();
}

// localStorage helpers
const lsGet = (key, def = '{}') => { try { return JSON.parse(localStorage.getItem(key) || def); } catch { return JSON.parse(def); } };
const lsSet = (key, val) => { localStorage.setItem(key, JSON.stringify(val)); window.saveToFirestore?.(); };

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
  reloadDb: () => set({ db: loadDb() }),
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
  getWatchlist: () => lsGet('gn_wl', '[]'),
  setWatchlist: (wl) => lsSet('gn_wl', wl),

  // ── READLIST ──
  getReadlist: () => lsGet('gn_rl', '[]'),
  setReadlist: (rl) => lsSet('gn_rl', rl),

  // ── STOPWATCH ──
  getSwLog: () => lsGet('gn_sw_log', '[]'),
  setSwLog: (log) => lsSet('gn_sw_log', log),
}));
