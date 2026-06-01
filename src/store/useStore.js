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

const lsParse = (key, def) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; } };

function saveDb(db) {
  localStorage.setItem(SK, JSON.stringify(db));
  fsWrite({ main: db });
}

function fsWrite(data) {
  if (window._fbUser) {
    import('../lib/firebase').then(({ saveToFirestore }) => {
      saveToFirestore(window._fbUser.uid, data);
    });
  }
}

export const useStore = create((set, get) => ({
  // ── STATE ──
  db: loadDb(),
  currentPage: 'home',
  sidebarCollapsed: false,
  userProfile: null,

  // Reactive state — onSnapshot gelince bunlar güncellenir, component'ler yeniden render olur
  todos: lsParse('gn_todos', {}),
  notes: lsParse('gn_notes', {}),
  chains: lsParse('gn_chains', []),
  swLog: lsParse('gn_sw_log', []),
  swState: null, // { running, startTime, elapsed }
  finance: lsParse('gn_finance_v2', null),
  aiProfile: lsParse('gn_ai_profile', {}),
  aiMemory: lsParse('gn_ai_memory', []),
  aiSummary: localStorage.getItem('gn_ai_summary') || '',

  // ── NAV ──
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setUserProfile: (profile) => set({ userProfile: profile }),

  // ── RELOAD (onSnapshot'tan çağrılır) ──
  reloadDb: (incoming) => {
    if (incoming) {
      const updates = {};

      if (incoming.main) {
        localStorage.setItem(SK, JSON.stringify(incoming.main));
        updates.db = loadDb();
      }
      if (incoming.gn_todos !== undefined) {
        localStorage.setItem('gn_todos', JSON.stringify(incoming.gn_todos));
        updates.todos = incoming.gn_todos;
      }
      if (incoming.gn_notes !== undefined) {
        localStorage.setItem('gn_notes', JSON.stringify(incoming.gn_notes));
        updates.notes = incoming.gn_notes;
      }
      if (incoming.gn_chains !== undefined) {
        localStorage.setItem('gn_chains', JSON.stringify(incoming.gn_chains));
        updates.chains = incoming.gn_chains;
      }
      if (incoming.gn_sw_log !== undefined) {
        localStorage.setItem('gn_sw_log', JSON.stringify(incoming.gn_sw_log));
        updates.swLog = incoming.gn_sw_log;
      }
      if (incoming.gn_finance_v2 !== undefined) {
        localStorage.setItem('gn_finance_v2', JSON.stringify(incoming.gn_finance_v2));
        updates.finance = incoming.gn_finance_v2;
      }
      if (incoming.gn_ai_profile !== undefined) {
        localStorage.setItem('gn_ai_profile', JSON.stringify(incoming.gn_ai_profile));
        updates.aiProfile = incoming.gn_ai_profile;
      }
      if (incoming.gn_ai_memory !== undefined) {
        localStorage.setItem('gn_ai_memory', JSON.stringify(incoming.gn_ai_memory));
        updates.aiMemory = incoming.gn_ai_memory;
      }
      if (incoming.gn_ai_summary !== undefined) {
        localStorage.setItem('gn_ai_summary', incoming.gn_ai_summary);
        updates.aiSummary = incoming.gn_ai_summary;
      }
      if (incoming.gn_sw_running !== undefined) {
        updates.swState = {
          running: !!incoming.gn_sw_running,
          startTime: incoming.gn_sw_startTime || null,
          elapsed: incoming.gn_sw_elapsed ?? parseInt(localStorage.getItem('gn_sw_elapsed') || '0'),
        };
        if (incoming.gn_sw_elapsed !== undefined) localStorage.setItem('gn_sw_elapsed', String(incoming.gn_sw_elapsed));
        if (incoming.gn_sw_startTime) localStorage.setItem('gn_sw_startTime', String(incoming.gn_sw_startTime));
        else localStorage.removeItem('gn_sw_startTime');
        if (incoming.gn_sw_running) localStorage.setItem('gn_sw_running', '1');
        else localStorage.removeItem('gn_sw_running');
      }

      if (Object.keys(updates).length > 0) set(updates);
    } else {
      // İlk yükleme
      set({
        db: loadDb(),
        todos: lsParse('gn_todos', {}),
        notes: lsParse('gn_notes', {}),
        chains: lsParse('gn_chains', []),
        swLog: lsParse('gn_sw_log', []),
        finance: lsParse('gn_finance_v2', null),
        aiProfile: lsParse('gn_ai_profile', {}),
        aiMemory: lsParse('gn_ai_memory', []),
        aiSummary: localStorage.getItem('gn_ai_summary') || '',
      });
    }
    // window._sw güvenli güncelle
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
  getTodos: () => get().todos,
  setTodos: (todos) => { localStorage.setItem('gn_todos', JSON.stringify(todos)); fsWrite({ gn_todos: todos }); set({ todos }); },
  addTodo: (date, text) => {
    const todos = { ...get().todos };
    if (!todos[date]) todos[date] = [];
    todos[date] = [...todos[date], { text, done: false }];
    localStorage.setItem('gn_todos', JSON.stringify(todos)); fsWrite({ gn_todos: todos }); set({ todos });
  },
  toggleTodo: (date, i) => {
    const todos = JSON.parse(JSON.stringify(get().todos));
    if (todos[date]?.[i]) todos[date][i].done = !todos[date][i].done;
    localStorage.setItem('gn_todos', JSON.stringify(todos)); fsWrite({ gn_todos: todos }); set({ todos });
  },
  deleteTodo: (date, i) => {
    const todos = JSON.parse(JSON.stringify(get().todos));
    if (todos[date]) todos[date].splice(i, 1);
    localStorage.setItem('gn_todos', JSON.stringify(todos)); fsWrite({ gn_todos: todos }); set({ todos });
  },

  // ── NOTES ──
  getNotes: () => get().notes,
  setNotes: (notes) => { localStorage.setItem('gn_notes', JSON.stringify(notes)); fsWrite({ gn_notes: notes }); set({ notes }); },

  // ── CHAINS ──
  getChains: () => get().chains,
  setChains: (chains) => { localStorage.setItem('gn_chains', JSON.stringify(chains)); fsWrite({ gn_chains: chains }); set({ chains }); },

  // ── MEDIA ──
  getMedia: () => { try { return JSON.parse(localStorage.getItem('gn_media') || '{}'); } catch { return {}; } },
  setMedia: (media) => { localStorage.setItem('gn_media', JSON.stringify(media)); },

  // ── STOPWATCH ──
  getSwLog: () => get().swLog,
  setSwLog: (swLog) => { localStorage.setItem('gn_sw_log', JSON.stringify(swLog)); fsWrite({ gn_sw_log: swLog }); set({ swLog }); },

  // ── AI ──
  getAiProfile: () => get().aiProfile,
  setAiProfile: (aiProfile) => { localStorage.setItem('gn_ai_profile', JSON.stringify(aiProfile)); set({ aiProfile }); },
  getAiSummary: () => get().aiSummary,
  setAiSummary: (aiSummary) => { localStorage.setItem('gn_ai_summary', aiSummary); set({ aiSummary }); },
}));
