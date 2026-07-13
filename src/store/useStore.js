import { create } from 'zustand';

const SK = 'gn_db';

const defaultDb = {
  f: [], b: [], g: [], s: [], wl: [], rl: [], sr: [], srwl: [],
};

// Kalıcı benzersiz id üretir — afiş/kart karışması (React key kayması) sorununu önlemek için
function makeId() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Eski kayıtlarda (id alanı olmayan) id eksikse tamamlar, değişiklik varsa true döner
function ensureIds(arr) {
  let changed = false;
  const next = (arr || []).map(item => {
    if (item && !item.id) { changed = true; return { ...item, id: makeId() }; }
    return item;
  });
  return { next, changed };
}

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
    // Migrasyon: film/dizi/kitap kayıtlarına kalıcı id ata (yoksa)
    let anyChanged = false;
    const sr = ensureIds(db.sr); if (sr.changed) anyChanged = true;
    const f = ensureIds(db.f); if (f.changed) anyChanged = true;
    const b = ensureIds(db.b); if (b.changed) anyChanged = true;
    db.sr = sr.next; db.f = f.next; db.b = b.next;
    if (anyChanged) localStorage.setItem(SK, JSON.stringify(db));
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

const defaultWidgetSizes = { desktop: {}, mobile: {} };
const defaultWidgetPositions = { desktop: {}, mobile: {} };

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
  // Widget boyutları — { desktop: { [widgetId]: {col, row} }, mobile: { [widgetId]: {col, row} } }
  widgetSizes: lsParse('gn_widget_sizes', defaultWidgetSizes),
  // Widget pozisyonları — { desktop: { [widgetId]: {col, row} }, mobile: { [widgetId]: {col, row} } } (grid başlangıç hücresi, 1-bazlı)
  widgetPositions: lsParse('gn_widget_positions', defaultWidgetPositions),
  // Hava durumu şehirleri — sıra önemli, ilk şehir widget'larda gösterilir
  wxCities: lsParse('gn_wx_cities', []),

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
      if (incoming.gn_widget_sizes !== undefined) {
        const merged = { ...defaultWidgetSizes, ...incoming.gn_widget_sizes };
        localStorage.setItem('gn_widget_sizes', JSON.stringify(merged));
        updates.widgetSizes = merged;
      }
      if (incoming.gn_widget_positions !== undefined) {
        const mergedPos = { ...defaultWidgetPositions, ...incoming.gn_widget_positions };
        localStorage.setItem('gn_widget_positions', JSON.stringify(mergedPos));
        updates.widgetPositions = mergedPos;
      }
      if (incoming.gn_wx_cities !== undefined) {
        localStorage.setItem('gn_wx_cities', JSON.stringify(incoming.gn_wx_cities));
        updates.wxCities = incoming.gn_wx_cities;
      }
      if (incoming.gn_sw_running !== undefined) {
        const nextSwState = {
          running: !!incoming.gn_sw_running,
          startTime: incoming.gn_sw_startTime || null,
          // segStart: bu çalışma segmentinin gerçek "başlat" anı — hangi cihaz durdurursa dursun
          // log süresi (partDur) doğru hesaplanabilsin diye senkron tutulur (Date.now() ile DOLDURULMAZ)
          segStart: incoming.gn_sw_segStart || null,
          elapsed: incoming.gn_sw_elapsed ?? parseInt(localStorage.getItem('gn_sw_elapsed') || '0'),
        };
        // Gereksiz yeniden render / efekt tetiklemesini önle: değerler aynıysa swState referansını değiştirme.
        const prev = get().swState;
        const changed = !prev || prev.running !== nextSwState.running || prev.startTime !== nextSwState.startTime
          || prev.segStart !== nextSwState.segStart || prev.elapsed !== nextSwState.elapsed;
        if (changed) updates.swState = nextSwState;

        if (incoming.gn_sw_elapsed !== undefined) localStorage.setItem('gn_sw_elapsed', String(incoming.gn_sw_elapsed));
        if (incoming.gn_sw_startTime) localStorage.setItem('gn_sw_startTime', String(incoming.gn_sw_startTime));
        else localStorage.removeItem('gn_sw_startTime');
        if (incoming.gn_sw_segStart) localStorage.setItem('gn_sw_segStart', String(incoming.gn_sw_segStart));
        else localStorage.removeItem('gn_sw_segStart');
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
        widgetSizes: lsParse('gn_widget_sizes', defaultWidgetSizes),
        widgetPositions: lsParse('gn_widget_positions', defaultWidgetPositions),
        wxCities: lsParse('gn_wx_cities', []),
      });
    }
    // window._sw güvenli güncelle
    try { if (window._sw && !window._sw.running) { window._sw.elapsed = parseInt(localStorage.getItem('gn_sw_elapsed') || '0'); } } catch {}
  },

  setDb: (db) => { saveDb(db); set({ db }); },

  // ── FILMS ──
  addFilm: (film) => { const db = get().db; const withId = { ...film, id: film.id || makeId() }; const updated = { ...db, f: [withId, ...db.f] }; saveDb(updated); set({ db: updated }); },
  updateFilm: (i, film) => { const db = get().db; const f = [...db.f]; f[i] = { ...f[i], ...film, id: f[i].id }; const updated = { ...db, f }; saveDb(updated); set({ db: updated }); },
  deleteFilm: (i) => { const db = get().db; const updated = { ...db, f: db.f.filter((_, idx) => idx !== i) }; saveDb(updated); set({ db: updated }); },

  // ── SERIES ──
  addSeries: (series) => { const db = get().db; const withId = { ...series, id: series.id || makeId() }; const updated = { ...db, sr: [withId, ...db.sr] }; saveDb(updated); set({ db: updated }); },
  updateSeries: (i, series) => { const db = get().db; const sr = [...db.sr]; sr[i] = { ...sr[i], ...series, id: sr[i].id }; const updated = { ...db, sr }; saveDb(updated); set({ db: updated }); },
  deleteSeries: (i) => { const db = get().db; const updated = { ...db, sr: db.sr.filter((_, idx) => idx !== i) }; saveDb(updated); set({ db: updated }); },
  getSeriesWatchlist: () => get().db.srwl || [],
  setSeriesWatchlist: (srwl) => { const db = get().db; const updated = { ...db, srwl }; saveDb(updated); set({ db: updated }); },

  // ── BOOKS ──
  addBook: (book) => { const db = get().db; const withId = { ...book, id: book.id || makeId() }; const updated = { ...db, b: [withId, ...db.b] }; saveDb(updated); set({ db: updated }); },
  updateBook: (i, book) => { const db = get().db; const b = [...db.b]; b[i] = { ...b[i], ...book, id: b[i].id }; const updated = { ...db, b }; saveDb(updated); set({ db: updated }); },
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

  // ── WIDGET SIZES ──
  // mode: 'desktop' | 'mobile', sizes: { [widgetId]: { col, row } }
  getWidgetSizes: (mode) => get().widgetSizes[mode] || {},
  setWidgetSize: (mode, widgetId, size) => {
    const widgetSizes = { ...get().widgetSizes };
    widgetSizes[mode] = { ...(widgetSizes[mode] || {}), [widgetId]: size };
    localStorage.setItem('gn_widget_sizes', JSON.stringify(widgetSizes));
    fsWrite({ gn_widget_sizes: widgetSizes });
    set({ widgetSizes });
  },

  // ── WIDGET POSITIONS ──
  // mode: 'desktop' | 'mobile', positions: { [widgetId]: { col, row } } (1-bazlı grid başlangıç hücresi)
  getWidgetPositions: (mode) => get().widgetPositions[mode] || {},
  setWidgetPositions: (mode, positions) => {
    const widgetPositions = { ...get().widgetPositions };
    widgetPositions[mode] = positions;
    localStorage.setItem('gn_widget_positions', JSON.stringify(widgetPositions));
    fsWrite({ gn_widget_positions: widgetPositions });
    set({ widgetPositions });
  },

  // ── HAVA DURUMU ŞEHİRLERİ ──
  getWxCities: () => get().wxCities,
  setWxCities: (wxCities) => { localStorage.setItem('gn_wx_cities', JSON.stringify(wxCities)); fsWrite({ gn_wx_cities: wxCities }); set({ wxCities }); },

  // ── AI ──
  getAiProfile: () => get().aiProfile,
  setAiProfile: (aiProfile) => { localStorage.setItem('gn_ai_profile', JSON.stringify(aiProfile)); set({ aiProfile }); },
  getAiSummary: () => get().aiSummary,
  setAiSummary: (aiSummary) => { localStorage.setItem('gn_ai_summary', aiSummary); set({ aiSummary }); },
}));
