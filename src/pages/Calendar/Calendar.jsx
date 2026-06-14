import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { TR_M, TR_D, todayStr, getSpecialDays, CAL_LABELS, fmtDate } from '../../lib/utils';

const DEFAULT_SPEC_COLORS = { h:'#c0392b', r:'#7b5ea7', i:'#2874a6', b:'#c0392b', a:'#7b5ea7', custom:'#3a7bd5' };
function loadSpecColors() {
  try { return { ...DEFAULT_SPEC_COLORS, ...JSON.parse(localStorage.getItem('gn_spec_colors') || '{}') }; } catch { return { ...DEFAULT_SPEC_COLORS }; }
}
function saveSpecColors(c) { localStorage.setItem('gn_spec_colors', JSON.stringify(c)); }

const DEFAULT_SPEC_VISIBLE = { h:true, r:true, i:true };
function loadSpecVisible() {
  try { return { ...DEFAULT_SPEC_VISIBLE, ...JSON.parse(localStorage.getItem('gn_spec_visible') || '{}') }; } catch { return { ...DEFAULT_SPEC_VISIBLE }; }
}
function saveSpecVisible(v) { localStorage.setItem('gn_spec_visible', JSON.stringify(v)); }
const COLOR_PALETTE = [
  '#c0392b','#e74c3c','#e67e22','#f39c12','#f1c40f','#2ecc71','#27ae60','#1abc9c',
  '#16a085','#3498db','#2874a6','#2980b9','#8e44ad','#7b5ea7','#9b59b6','#d35400',
  '#e91e63','#ff5722','#795548','#607d8b','#1D9E75','#00897b','#0288d1','#6a1b9a',
  '#4a148c','#311b92','#1a237e','#0d47a1','#006064','#004d40','#33691e','#f57f17',
];

const CAL_THEMES = [
  { name:'Mor',       grad:'135deg,#1e1b4b,#312e81,#1e3a5f', text:'#e0e7ff', today:'rgba(99,102,241,0.35)',  todayB:'rgba(139,92,246,0.4)',  todayT:'#c4b5fd', dotC:'#818cf8' },
  { name:'Mavi',      grad:'135deg,#0c1a3a,#1e3a6e,#0c2a5a', text:'#dbeafe', today:'rgba(37,99,235,0.35)',   todayB:'rgba(59,130,246,0.45)', todayT:'#93c5fd', dotC:'#60a5fa' },
  { name:'Camgöbeği', grad:'135deg,#042f2e,#065f46,#083344', text:'#d1fae5', today:'rgba(16,185,129,0.3)',   todayB:'rgba(52,211,153,0.4)',  todayT:'#6ee7b7', dotC:'#34d399' },
  { name:'Zümrüt',    grad:'135deg,#052e16,#14532d,#064e3b', text:'#dcfce7', today:'rgba(22,163,74,0.3)',    todayB:'rgba(74,222,128,0.4)',  todayT:'#86efac', dotC:'#4ade80' },
  { name:'Kırmızı',   grad:'135deg,#3b0a0a,#7f1d1d,#450a0a', text:'#fee2e2', today:'rgba(220,38,38,0.3)',    todayB:'rgba(248,113,113,0.45)',todayT:'#fca5a5', dotC:'#f87171' },
  { name:'Turuncu',   grad:'135deg,#431407,#7c2d12,#451a03', text:'#ffedd5', today:'rgba(234,88,12,0.3)',    todayB:'rgba(251,146,60,0.45)', todayT:'#fdba74', dotC:'#fb923c' },
  { name:'Sarı',      grad:'135deg,#422006,#78350f,#3d2006', text:'#fef3c7', today:'rgba(202,138,4,0.3)',    todayB:'rgba(250,204,21,0.45)', todayT:'#fde047', dotC:'#facc15' },
  { name:'Pembe',     grad:'135deg,#3b0764,#701a75,#500724', text:'#fce7f3', today:'rgba(219,39,119,0.3)',   todayB:'rgba(244,114,182,0.45)',todayT:'#f9a8d4', dotC:'#f472b6' },
  { name:'Çivit',     grad:'135deg,#1e1b4b,#1e3a5f,#0c2a5a', text:'#e0f2fe', today:'rgba(14,165,233,0.3)',   todayB:'rgba(56,189,248,0.45)', todayT:'#7dd3fc', dotC:'#38bdf8' },
  { name:'Gri',       grad:'135deg,#111827,#1f2937,#030712', text:'#f9fafb', today:'rgba(107,114,128,0.3)', todayB:'rgba(156,163,175,0.4)', todayT:'#d1d5db', dotC:'#9ca3af' },
  { name:'Gül',       grad:'135deg,#3b0a2a,#831843,#4a044e', text:'#fce7f3', today:'rgba(190,24,93,0.3)',    todayB:'rgba(236,72,153,0.45)', todayT:'#f9a8d4', dotC:'#ec4899' },
  { name:'Koyu',      grad:'135deg,#000000,#0a0a0a,#111111', text:'#e8edf5', today:'rgba(255,255,255,0.08)',todayB:'rgba(255,255,255,0.2)', todayT:'#e8edf5', dotC:'#888888' },
];

function loadCalTheme() {
  const i = parseInt(localStorage.getItem('gn_cal_theme') || '0');
  return CAL_THEMES[i] ? i : 0;
}
function saveCalTheme(i) { localStorage.setItem('gn_cal_theme', String(i)); }

const WEEK_DAY_NAMES = ['PT','SA','ÇA','PE','CU','CT','PZ'];

// Öncelik renk haritası — Home.jsx ile senkron
const PRIORITY_COLORS = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#a78bfa',
};

function getDayData(ds, db, todos, notes, media) {
  const specials = getSpecialDays(ds, db.s || []);
  const dayTodos = todos[ds] || [];
  const dayNotes = Array.isArray(notes[ds]) ? notes[ds] : (notes[ds] ? [notes[ds]] : []);
  const dayMedia = media[ds] || [];
  const films = (db.f||[]).filter(f => f.date === ds);
  const books = (db.b||[]).filter(b => b.start === ds || b.end === ds);
  const noteColors = [...new Set(dayNotes.map(n => (typeof n === 'object' && n.color) ? n.color : '#3a7bd5'))];
  const dots = [
    specials.some(s=>s.t==='h') && { color:'#c0392b' },
    specials.some(s=>s.t==='r') && { color:'#7b5ea7' },
    specials.some(s=>s.t==='i'||s.t==='b'||s.t==='a'||s.t==='custom') && { color:'#2874a6' },
    films.length && { color:'#a06040' },
    ...noteColors.map(c => ({ color: c })),
  ].filter(Boolean);
  return { specials, dayTodos, dayNotes, dayMedia, films, books, dots, noteColors };
}

// ── Kişisel Özel Gün Modal ──────────────────────────────────────────
function CustomDayModal({ onClose, onAdd, onUpdate, customDays, onDelete, initialEditIdx }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[9]);
  const [colorOpen, setColorOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);

  const resetForm = () => {
    setName(''); setDate(''); setDesc(''); setColor(COLOR_PALETTE[9]); setEditingIdx(null);
  };

  const startEdit = (i) => {
    const s = customDays[i];
    if (!s) return;
    const yr = new Date().getFullYear();
    setName(s.n || '');
    setDesc(s.desc || '');
    setColor(s.color || COLOR_PALETTE[9]);
    setDate(`${yr}-${s.k}`);
    setEditingIdx(i);
  };

  useEffect(() => {
    if (initialEditIdx !== null && initialEditIdx !== undefined) startEdit(initialEditIdx);
  }, [initialEditIdx]);

  const submit = () => {
    if (!name.trim() || !date.trim()) return;
    const [, m, d] = date.split('-');
    const day = { n: name.trim(), k: `${m}-${d}`, t: 'custom', desc: desc.trim(), color };
    if (editingIdx !== null) onUpdate(editingIdx, day);
    else onAdd(day);
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background:'rgba(0,0,0,.65)' }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="animate-slideUp bg-surface border border-border rounded-2xl p-5 w-[360px] max-w-[92vw] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="font-serif text-[16px] text-accent2">Kişisel Özel Günler</span>
          <button onClick={onClose} className="bg-transparent border-0 text-muted cursor-pointer text-xl leading-none">×</button>
        </div>
        <div className="max-h-[200px] overflow-y-auto mb-4 space-y-1">
          {customDays.length === 0
            ? <div className="text-xs text-muted text-center py-3">Henüz özel gün yok</div>
            : customDays.map((s, i) => (
              <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${editingIdx===i ? 'bg-surface3' : 'bg-surface2 hover:bg-surface3'}`} onClick={() => startEdit(i)}>
                <div className="flex items-center gap-2 min-w-0">
                  <div style={{ width:10, height:10, borderRadius:'50%', background: s.color || DEFAULT_SPEC_COLORS[s.t] || '#3a7bd5', flexShrink:0 }} />
                  <span className="truncate">{s.n}</span>
                  <span className="text-xs text-muted flex-shrink-0">{s.k}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if (editingIdx===i) resetForm(); onDelete(i); }} className="text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer flex-shrink-0">×</button>
              </div>
            ))
          }
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          {editingIdx !== null && (
            <div className="flex items-center justify-between text-xs text-accent mb-1">
              <span>Düzenleniyor: {customDays[editingIdx]?.n}</span>
              <button onClick={resetForm} className="text-muted bg-transparent border-0 cursor-pointer underline">Vazgeç</button>
            </div>
          )}
          <input className="form-input" placeholder="Başlık *" value={name} onChange={e => setName(e.target.value)} />
          <textarea className="form-input resize-none text-sm" rows={2} placeholder="Açıklama (isteğe bağlı)" value={desc} onChange={e => setDesc(e.target.value)} />

          <div style={{ position:'relative' }}>
            <div onClick={() => setColorOpen(v => !v)}
              className="form-input"
              style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <div style={{ width:18, height:18, borderRadius:6, background:color, flexShrink:0, border:'1px solid rgba(255,255,255,0.15)' }} />
              <span className="text-sm text-muted">Renk seç</span>
            </div>
            {colorOpen && (
              <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:'#1a1d28', border:'1px solid rgba(255,255,255,0.12)', borderRadius:14, padding:12, display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:6, marginTop:6, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
                {COLOR_PALETTE.map(c => (
                  <div key={c} onClick={() => { setColor(c); setColorOpen(false); }}
                    style={{ width:22, height:22, borderRadius:6, background:c, cursor:'pointer', border: color===c ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent', transition:'transform .12s', boxSizing:'border-box' }}
                    onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'}
                    onMouseLeave={e=>e.currentTarget.style.transform=''}
                  />
                ))}
              </div>
            )}
          </div>

          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          <button className="btn-save w-full" onClick={submit}>{editingIdx !== null ? 'Güncelle' : 'Ekle'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Media Viewer ────────────────────────────────────────────────────
function MediaViewer({ media, ds, onClose, idx }) {
  const [cur, setCur] = useState(idx);
  const item = media[cur];
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background:'rgba(0,0,0,.9)' }} onClick={e => e.target===e.currentTarget && onClose()}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white bg-transparent border-0 cursor-pointer text-3xl">×</button>
      {cur > 0 && <button onClick={() => setCur(c=>c-1)} className="absolute left-4 text-white/60 hover:text-white bg-transparent border-0 cursor-pointer text-3xl">‹</button>}
      {cur < media.length-1 && <button onClick={() => setCur(c=>c+1)} className="absolute right-12 text-white/60 hover:text-white bg-transparent border-0 cursor-pointer text-3xl">›</button>}
      <div className="max-w-[90vw] max-h-[90vh]">
        {item.type === 'video'
          ? <video src={item.data} controls className="max-w-full max-h-[85vh] rounded-xl" />
          : <img src={item.data} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
        }
      </div>
    </div>
  );
}

export default function Calendar() {
  const { db, setDb, getTodos, setTodos, getNotes, setNotes, getMedia, setMedia, addSpecialDay, deleteSpecialDay, todos: storeTodos, notes: storeNotes } = useStore();
  const today = todayStr();
  const [viewDate, setViewDate] = useState(new Date());
  const [selected, setSelected] = useState(today);
  const [todos, setLocalTodos] = useState(getTodos());
  const [notes, setLocalNotes] = useState(getNotes());

  // onSnapshot gelince store güncellenir, local state de güncellenir
  useEffect(() => { setLocalTodos(storeTodos); }, [storeTodos]);
  useEffect(() => { setLocalNotes(storeNotes); }, [storeNotes]);
  const [media, setLocalMedia] = useState(getMedia());
  const [todoInput, setTodoInput] = useState('');
  const [todoPriority, setTodoPriority] = useState('medium'); // YENİ
  const [noteInput, setNoteInput] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [noteColor, setNoteColor] = useState('#3a7bd5');
  const [noteColorOpen, setNoteColorOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null); // { idx, text }
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editCustomIdx, setEditCustomIdx] = useState(null);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [mediaEditMode, setMediaEditMode] = useState(false);
  const [showOverdue, setShowOverdue] = useState(() => localStorage.getItem('gn_show_overdue') !== 'false');
  const [specColors, setSpecColors] = useState(loadSpecColors);
  const [specVisible, setSpecVisible] = useState(loadSpecVisible);
  const [colorPicker, setColorPicker] = useState(null);
  const [legendEditMode, setLegendEditMode] = useState(false);
  const [calThemeIdx, setCalThemeIdx] = useState(loadCalTheme);
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const fileInputRef = useRef(null);
  const calTheme = CAL_THEMES[calThemeIdx];

  const pickCalTheme = (i) => { setCalThemeIdx(i); saveCalTheme(i); setThemePanelOpen(false); };

  const toggleSpecVisible = (key) => {
    const next = { ...specVisible, [key]: !specVisible[key] };
    setSpecVisible(next);
    saveSpecVisible(next);
  };

  const updateSpecColor = (key, color) => {
    const next = { ...specColors, [key]: color };
    if (key === 'h') next.b = color;
    if (key === 'i') { next.a = color; next.custom = color; }
    setSpecColors(next);
    saveSpecColors(next);
    setColorPicker(null);
  };

  // Renk seçici dışına tıklanınca kapat
  useEffect(() => {
    if (!colorPicker) return;
    const handler = () => setColorPicker(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [colorPicker]);

  // Tema paneli dışına tıklanınca kapat
  useEffect(() => {
    if (!themePanelOpen) return;
    const handler = () => setThemePanelOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [themePanelOpen]);

  // Not renk paneli dışına tıklanınca kapat
  useEffect(() => {
    if (!noteColorOpen) return;
    const handler = () => setNoteColorOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [noteColorOpen]);

  const refreshData = () => {
    setLocalTodos(getTodos());
    setLocalNotes(getNotes());
    setLocalMedia(getMedia());
  };

  // Calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }

  const selData = getDayData(selected, db, todos, notes, media);

  // Todos
  const addTodoLocal = () => {
    if (!todoInput.trim()) return;
    const t = getTodos();
    if (!t[selected]) t[selected] = [];
    t[selected].push({ text: todoInput.trim(), done: false, priority: todoPriority }); // priority eklendi
    setTodos(t); setTodoInput(''); refreshData();
  };
  const toggleTodoLocal = (i) => {
    const t = getTodos();
    if (t[selected]?.[i]) t[selected][i].done = !t[selected][i].done;
    setTodos(t); refreshData();
  };
  const deleteTodoLocal = (i) => {
    const t = getTodos();
    if (t[selected]) t[selected].splice(i, 1);
    setTodos(t); refreshData();
  };
  const saveTodoEdit = (i, text) => {
    if (!text.trim()) return;
    const t = getTodos();
    if (t[selected]?.[i]) t[selected][i].text = text.trim();
    setTodos(t); setEditingTodo(null); refreshData();
  };
  // Öncelik dropdown'dan doğrudan ayarla
  const setPriorityLocal = (i, priority) => {
    const t = getTodos();
    if (!t[selected]?.[i]) return;
    t[selected][i].priority = priority;
    setTodos(t); refreshData();
  };


  // Gecikmiş görevler
  const getOverdue = () => {
    const allTodos = getTodos();
    const items = [];
    Object.entries(allTodos).forEach(([dk, list]) => {
      if (dk >= today) return;
      (list || []).forEach((t, i) => {
        if (!t.done) items.push({ ...t, dateKey: dk, idx: i });
      });
    });
    return items.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  };

  const toggleOverdueTodo = (dateKey, idx) => {
    const t = getTodos();
    if (t[dateKey]?.[idx]) t[dateKey][idx].done = !t[dateKey][idx].done;
    setTodos(t); refreshData();
  };
  // Notes
  const saveNote = () => {
    if (!noteInput.trim()) return;
    const n = getNotes();
    if (!Array.isArray(n[selected])) n[selected] = [];
    if (editingNote !== null) {
      n[selected][editingNote.idx] = { ...n[selected][editingNote.idx], text: noteInput.trim(), color: noteColor };
      setEditingNote(null);
    } else {
      n[selected].push({ text: noteInput.trim(), color: noteColor });
    }
    setNotes(n); setNoteInput(''); setNoteColor('#3a7bd5'); refreshData();
  };
  const deleteNote = (i) => {
    const n = getNotes();
    if (n[selected]) n[selected].splice(i, 1);
    setNotes(n); refreshData();
  };

  // Media
  const addMedia = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const m = getMedia();
    if (!m[selected]) m[selected] = [];
    let loaded = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        m[selected].push({ type: file.type.startsWith('video') ? 'video' : 'image', data: ev.target.result, name: file.name });
        loaded++;
        if (loaded === files.length) { setMedia(m); refreshData(); }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };
  const deleteMedia = (i) => {
    const m = getMedia();
    if (m[selected]) { m[selected].splice(i, 1); if (!m[selected].length) delete m[selected]; }
    setMedia(m); refreshData();
  };

  // Search
  const doSearch = () => {
    if (!searchQ.trim()) { setSearchResults(null); return; }
    const term = searchQ.toLowerCase();
    const results = [];
    Object.entries(notes).forEach(([ds, nts]) => {
      const arr = Array.isArray(nts) ? nts : [nts];
      arr.forEach(n => {
        const text = typeof n === 'object' ? n.text : n;
        if (text?.toLowerCase().includes(term)) results.push({ type:'note', text, ds });
      });
    });
    Object.entries(todos).forEach(([ds, list]) => {
      (list||[]).forEach(t => {
        if (t.text?.toLowerCase().includes(term)) results.push({ type:'todo', text:t.text, ds, done:t.done });
      });
    });
    setSearchResults(results.slice(0, 20));
  };

  // Custom days
  const handleAddCustomDay = (day) => { addSpecialDay(day); refreshData(); };
  const handleDeleteCustomDay = (i) => { deleteSpecialDay(i); refreshData(); };
  const handleUpdateCustomDay = (i, day) => {
    const list = [...(db.s || [])];
    list[i] = day;
    setDb({ ...db, s: list });
    refreshData();
  };
  const customDays = db.s || [];

  return (
    <div className="animate-fadeIn">
      {showCustomModal && (
        <CustomDayModal
          customDays={customDays}
          onClose={() => { setShowCustomModal(false); setEditCustomIdx(null); }}
          onAdd={handleAddCustomDay}
          onUpdate={handleUpdateCustomDay}
          onDelete={handleDeleteCustomDay}
          initialEditIdx={editCustomIdx}
        />
      )}
      {mediaViewer !== null && (
        <MediaViewer
          media={selData.dayMedia}
          ds={selected}
          idx={mediaViewer}
          onClose={() => setMediaViewer(null)}
        />
      )}

      <div className="flex flex-col gap-5">
        {/* Takvim */}
        <div>
          <div className="flex flex-wrap gap-2 mb-4 justify-end items-center">
            {/* Gecikmiş görevler toggle */}
            {(() => {
              const overdueCount = getOverdue().length;
              if (!overdueCount) return null;
              return (
                <button
                  onClick={() => setShowOverdue(v => {
                    const next = !v;
                    localStorage.setItem('gn_show_overdue', next ? 'true' : 'false');
                    window.dispatchEvent(new Event('gn_overdue_changed'));
                    return next;
                  })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: showOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${showOverdue ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 8, padding: '5px 10px',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all .2s',
                  }}
                >
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: showOverdue ? '#ef4444' : 'rgba(255,255,255,0.25)',
                    flexShrink: 0,
                    boxShadow: showOverdue ? '0 0 5px #ef4444' : 'none',
                    transition: 'all .2s',
                  }} />
                  <span style={{ fontSize: 11, color: showOverdue ? '#fca5a5' : 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                    Gecikmiş görevleri göster {overdueCount > 0 ? `(${overdueCount})` : ''}
                  </span>
                </button>
              );
            })()}
            <input className="form-input w-[220px]" placeholder="Not veya görev ara..." value={searchQ}
              onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key==='Enter' && doSearch()} />
            <button className="btn-primary" onClick={doSearch}>Ara</button>
            {searchResults && <button className="btn-cancel" onClick={() => setSearchResults(null)}>×</button>}
          </div>

          {searchResults && (
            <div className="bg-surface border border-border rounded-xl p-3 mb-4 animate-slideUp">
              {searchResults.length === 0
                ? <div className="text-sm text-muted">Sonuç bulunamadı.</div>
                : searchResults.map((r, i) => (
                  <div key={i} onClick={() => { setSelected(r.ds); const [y,m] = r.ds.split('-'); setViewDate(new Date(parseInt(y), parseInt(m)-1, 1)); setSearchResults(null); }}
                    className="p-2 rounded-lg cursor-pointer hover:bg-surface2 transition-colors">
                    <div className="text-xs text-muted">{r.type==='note'?'📝':r.done?'✅':'☐'} {fmtDate(r.ds)}</div>
                    <div className="text-sm text-text">{r.text}</div>
                  </div>
                ))
              }
            </div>
          )}

          <div style={{ borderRadius:24, overflow:'hidden', background:'#0d1018' }}>
            {/* Başlık */}
            <div style={{ position:'relative', padding:'24px 24px 20px', background:`linear-gradient(${calTheme.grad})`, transition:'background .4s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative', zIndex:2 }}>
                <div>
                  <div style={{ fontSize:20, fontWeight:300, letterSpacing:'-.3px', color:calTheme.text }}>{TR_M[month]} {year}</div>
                  <div style={{ fontSize:13, marginTop:6, color:calTheme.text, opacity:.55 }}>
                    {String(parseInt(today.split('-')[2])).padStart(2,'0')}.{today.split('-')[1]}.{today.split('-')[0]} · {TR_D[new Date(today+'T12:00:00').getDay()]}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center', position:'relative' }}>
                  <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
                    style={{ width:34, height:34, borderRadius:10, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)', color:calTheme.text, opacity:.7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, cursor:'pointer' }}>‹</button>
                  <button onClick={(e) => { e.stopPropagation(); setThemePanelOpen(v=>!v); }}
                    style={{ fontSize:11, padding:'6px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.08)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:calTheme.text, opacity:.8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:`linear-gradient(${calTheme.grad})`, border:'1.5px solid rgba(255,255,255,0.4)' }} />
                    Tema
                  </button>
                  <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
                    style={{ width:34, height:34, borderRadius:10, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)', color:calTheme.text, opacity:.7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, cursor:'pointer' }}>›</button>

                  {themePanelOpen && (
                    <div onClick={e=>e.stopPropagation()}
                      style={{ position:'absolute', top:'100%', right:0, zIndex:50, background:'#161a26', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:14, display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginTop:8, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
                      {CAL_THEMES.map((t, i) => (
                        <div key={i} onClick={() => pickCalTheme(i)} title={t.name}
                          style={{ width:32, height:32, borderRadius:10, cursor:'pointer', border: i===calThemeIdx ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent', background:`linear-gradient(${t.grad})`, transition:'transform .15s' }}
                          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
                          onMouseLeave={e=>e.currentTarget.style.transform=''}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gün isimleri + Grid */}
            <div style={{ padding:'20px 20px 24px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', rowGap:4 }}>
                {WEEK_DAY_NAMES.map((d, i) => (
                  <div key={d} style={{ textAlign:'center', fontSize:10, padding:'0 0 12px', letterSpacing:'.07em', fontWeight:500, color:'rgba(232,237,245,0.25)' }}>{d}</div>
                ))}
                {(() => {
                  const trailing = (7 - (cells.length % 7)) % 7;
                  const allCells = [...cells, ...Array(trailing).fill(null)];
                  return allCells.map((ds, i) => {
                    const colIndex = i % 7;
                    const isWeekend = colIndex >= 5;
                    if (!ds) return <div key={`e-${i}`} style={{ padding:'13px 0 10px', opacity:.18 }} />;
                    const d = parseInt(ds.split('-')[2]);
                    const isToday = ds === today;
                    const isSel = ds === selected;
                    const _specs = getSpecialDays(ds, db.s || []);
                    const customSpecsWithColor = _specs.filter(s => s.t==='custom' && s.color);
                    const dayNotesForCell = Array.isArray(notes[ds]) ? notes[ds] : (notes[ds] ? [notes[ds]] : []);
                    const noteColorsForCell = [...new Set(dayNotesForCell.map(n => (typeof n === 'object' && n.color) ? n.color : '#3a7bd5'))];
                    const dots = [
                      specVisible.h && _specs.some(s=>s.t==='h'||s.t==='b') && { color: specColors.h || '#c0392b' },
                      specVisible.r && _specs.some(s=>s.t==='r') && { color: specColors.r || '#7b5ea7' },
                      specVisible.i && _specs.some(s=>(s.t==='i'||s.t==='a'||s.t==='custom') && !s.color) && { color: specColors.i || '#2874a6' },
                      ...customSpecsWithColor.map(s => specVisible.i ? { color: s.color } : null),
                      (db.f||[]).some(f=>f.date===ds) && { color:'#a06040' },
                      ...noteColorsForCell.map(c => ({ color: c })),
                    ].filter(Boolean);
                    const isPast = ds < today;
                    const hasOverdue = showOverdue && isPast && (todos[ds] || []).some(t => !t.done);
                    const allDots = hasOverdue ? [{ color: '#ef4444', overdue: true }, ...dots] : dots;
                    const isInMonth = ds.startsWith(`${year}-${String(month+1).padStart(2,'0')}`);
                    return (
                      <div key={ds} onClick={() => setSelected(ds)}
                        style={{
                          textAlign:'center', padding:'13px 0 14px', fontSize:14, borderRadius:14, cursor:'pointer', position:'relative',
                          color: !isInMonth ? 'rgba(232,237,245,0.15)' : 'rgba(232,237,245,0.55)',
                          background: isToday ? calTheme.today : isSel ? 'rgba(255,255,255,0.06)' : 'transparent',
                          border: isToday ? `1px solid ${calTheme.todayB}` : '1px solid transparent',
                          fontWeight: isToday ? 700 : 400,
                          transition:'background .12s',
                        }}>
                        <span style={{ color: isToday ? calTheme.todayT : undefined }}>{d}</span>
                        {allDots.length > 0 && (
                          <div style={{ position:'absolute', bottom:3, left:'50%', transform:'translateX(-50%)', display:'flex', gap:3 }}>
                            {allDots.slice(0,4).map((dot, di) => (
                              <div key={di} style={{ width:5, height:5, borderRadius:'50%', background:dot.color, boxShadow: dot.overdue ? '0 0 5px #ef4444' : `0 0 3px ${dot.color}` }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border" style={{position:'relative'}}>
            <div className="flex flex-wrap gap-3 items-center">
              {[
                { key:'h', label:'Resmi Tatil' },
                { key:'r', label:'Dini Bayram' },
                { key:'i', label:'Özel Gün' },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-1.5" style={{position:'relative', opacity: specVisible[item.key] ? 1 : 0.35, transition:'opacity .15s'}}>
                  <div
                    onClick={(e) => { e.stopPropagation(); legendEditMode && setColorPicker(colorPicker===item.key ? null : item.key); }}
                    style={{ width:12, height:12, borderRadius:'50%', background:specColors[item.key]||'#888', flexShrink:0, cursor: legendEditMode ? 'pointer' : 'default', border:'2px solid rgba(255,255,255,0.15)', transition:'transform .15s' }}
                    title={legendEditMode ? 'Rengi değiştir' : ''}
                  />
                  <span className="text-[11px] text-muted">{item.label}</span>

                  {legendEditMode && (
                    <button
                      onClick={() => toggleSpecVisible(item.key)}
                      title={specVisible[item.key] ? 'Gizle' : 'Göster'}
                      style={{
                        display:'flex', alignItems:'center', justifyContent:'center',
                        width:20, height:20, borderRadius:6, border:'1px solid rgba(255,255,255,0.12)',
                        background: specVisible[item.key] ? 'rgba(255,255,255,0.05)' : 'rgba(239,68,68,0.12)',
                        color: specVisible[item.key] ? 'rgba(232,237,245,0.4)' : '#f87171',
                        cursor:'pointer', fontSize:11, flexShrink:0,
                      }}
                    >
                      {specVisible[item.key] ? '◉' : '◯'}
                    </button>
                  )}

                  {colorPicker === item.key && (
                    <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:22,left:0,zIndex:100,background:'#1a1d28',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,padding:12,display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:6,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',width:220}}>
                      <div style={{gridColumn:'1/-1',fontSize:10,color:'rgba(232,237,245,0.35)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:2}}>{item.label} rengi</div>
                      {COLOR_PALETTE.map(c => (
                        <div key={c} onClick={() => updateSpecColor(item.key, c)}
                          style={{width:20,height:20,borderRadius:6,background:c,cursor:'pointer',border:specColors[item.key]===c?'2px solid rgba(255,255,255,0.8)':'2px solid transparent',transition:'transform .12s',boxSizing:'border-box'}}
                          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'}
                          onMouseLeave={e=>e.currentTarget.style.transform=''}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {(db.s || []).filter(s => s.t==='custom' && s.color && s.n).map((s, i) => (
                <div key={`custom-${i}`} className="flex items-center gap-1.5" style={{opacity: specVisible.i ? 1 : 0.35, transition:'opacity .15s'}}>
                  <div style={{ width:12, height:12, borderRadius:'50%', background:s.color, flexShrink:0, border:'2px solid rgba(255,255,255,0.15)' }} />
                  <span className="text-[11px] text-muted">{s.n}</span>
                </div>
              ))}

              {legendEditMode && (
                <button onClick={() => setShowCustomModal(true)}
                  className="text-[11px] text-accent border border-accent/30 bg-transparent px-2 py-0.5 rounded-lg cursor-pointer hover:bg-accent/10 transition-colors">
                  + Özel Gün
                </button>
              )}

              <button
                onClick={() => { setLegendEditMode(v => !v); if (legendEditMode) setColorPicker(null); }}
                className="ml-auto text-[11px] bg-transparent px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                style={{
                  border: `1px solid ${legendEditMode ? 'rgba(58,123,213,0.4)' : 'rgba(255,255,255,0.12)'}`,
                  color: legendEditMode ? '#7ab8f5' : 'rgba(232,237,245,0.4)',
                  background: legendEditMode ? 'rgba(58,123,213,0.1)' : 'transparent',
                }}
              >
                {legendEditMode ? 'Bitti' : 'Düzenle'}
              </button>
            </div>
          </div>
        </div>

        {/* Gün paneli */}
        <div className="border-t border-border pt-5">
          <div className="font-serif text-[15px] text-accent2 mb-4">
            {TR_D[new Date(selected+'T12:00:00').getDay()]}, {fmtDate(selected)}
          </div>


          {/* Gecikmiş görevler — toggle açıksa ve seçili gün geçmişteyse */}
          {showOverdue && selected < today && (() => {
            const dayOverdue = (todos[selected] || [])
              .map((t, i) => ({ ...t, idx: i }))
              .filter(t => !t.done);
            if (!dayOverdue.length) return null;
            return (
              <div style={{ marginBottom: 12, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', overflow: 'hidden', background: 'rgba(239,68,68,0.04)' }}>
                <div style={{ padding: '5px 10px', borderBottom: '1px solid rgba(239,68,68,0.12)', fontSize: 10, color: 'rgba(252,165,165,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                  Tamamlanmamış — {dayOverdue.length} görev
                </div>
                {dayOverdue.map((t, i) => {
                  const prioColor = { high:'#ef4444', medium:'#f59e0b', low:'#6b7280' }[t.priority||'medium'];
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      borderBottom: i < dayOverdue.length - 1 ? '1px solid rgba(239,68,68,0.08)' : 'none',
                    }}>
                      <div
                        onClick={() => toggleOverdueTodo(selected, t.idx)}
                        style={{ width: 14, height: 14, borderRadius: 4, border: '1px solid rgba(252,165,165,0.35)', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: prioColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: 'rgba(252,165,165,0.85)' }}>{t.text}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {selData.specials.filter(s => {
            if ((s.t==='h'||s.t==='b') && !specVisible.h) return false;
            if ((s.t==='r') && !specVisible.r) return false;
            if ((s.t==='i'||s.t==='a'||s.t==='custom') && !specVisible.i) return false;
            return true;
          }).map((s, i) => {
            const c = (s.t==='custom' && s.color) ? s.color : (specColors[s.t]||'#3a7bd5');
            const dbIdx = s.t==='custom' ? (db.s||[]).findIndex(x => x === s) : -1;
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-sm"
                style={{ background:`${c}15`, borderLeft:`3px solid ${c}` }}>
                <span className="flex-1">{s.n}</span>
                {s.desc && <span className="text-xs text-muted2 mr-2">{s.desc}</span>}
                <span className="text-xs text-muted">{CAL_LABELS[s.t]}</span>
                {dbIdx !== -1 && (
                  <button onClick={() => { setEditCustomIdx(dbIdx); setShowCustomModal(true); }}
                    className="text-accent opacity-60 hover:opacity-100 bg-transparent border-0 cursor-pointer text-xs px-0.5 transition-opacity"
                    title="Düzenle">✎</button>
                )}
              </div>
            );
          })}

          {selData.films.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-sm"
              style={{ background:'rgba(160,96,64,.08)', borderLeft:'3px solid #a06040' }}>
              🎬 {f.name}
            </div>
          ))}

          {selData.books.map((b, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-sm"
              style={{ background:'rgba(74,122,90,.08)', borderLeft:'3px solid #4a7a5a' }}>
              📚 {b.name} {b.start===selected ? '· Başlangıç' : '· Bitiş'}
            </div>
          ))}

          {/* Görevler */}
          <div className="mb-4">
            <div className="text-xs text-muted uppercase tracking-wider mb-2">Görevler</div>
            {selData.dayTodos.map((t, i) => {
              const pColor = PRIORITY_COLORS[t.priority || 'medium'];
              return (
              <div key={i} className="flex items-center gap-2 py-1.5 px-2 group rounded-md"
                style={{ borderLeft: `3px solid ${pColor}`, background: 'rgba(255,255,255,0.025)', opacity: t.done ? 0.55 : 1 }}>

                <button onClick={() => toggleTodoLocal(i)}
                  className={`w-[18px] h-[18px] rounded-[4px] border flex-shrink-0 flex items-center justify-center text-[11px] cursor-pointer transition-all ${t.done ? 'bg-[#237F52] border-[#237F52] text-white' : 'border-border2 bg-transparent text-transparent'}`}>✓</button>

                {editingTodo?.idx === i ? (
                  <input
                    autoFocus
                    className="form-input flex-1 py-1 text-sm"
                    value={editingTodo.text}
                    onChange={e => setEditingTodo(et => ({ ...et, text: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveTodoEdit(i, editingTodo.text);
                      if (e.key === 'Escape') setEditingTodo(null);
                    }}
                    onBlur={() => saveTodoEdit(i, editingTodo.text)}
                  />
                ) : (
                  <span className={`flex-1 text-sm ${t.done ? 'line-through text-muted' : 'text-text'}`}>{t.text}</span>
                )}

                <select
                  value={t.priority || 'medium'}
                  onChange={e => setPriorityLocal(i, e.target.value)}
                  className="bg-transparent border border-border2 rounded-md text-xs px-1 py-0.5 cursor-pointer flex-shrink-0"
                  style={{ color: pColor }}
                >
                  <option value="high" style={{ color: '#ef4444' }}>Yüksek</option>
                  <option value="medium" style={{ color: '#f59e0b' }}>Orta</option>
                  <option value="low" style={{ color: '#a78bfa' }}>Düşük</option>
                </select>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {editingTodo?.idx !== i && (
                    <button
                      onClick={() => setEditingTodo({ idx: i, text: t.text })}
                      className="text-accent opacity-60 hover:opacity-100 bg-transparent border-0 cursor-pointer text-xs px-0.5 transition-opacity"
                      title="Düzenle"
                    >✎</button>
                  )}
                  <button onClick={() => deleteTodoLocal(i)} className="text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer text-base opacity-40 hover:opacity-100 transition-opacity">×</button>
                </div>
              </div>
              );
            })}

            {/* Görev ekle — öncelik dropdown + input */}
            <div className="flex gap-2 mt-2 items-center">
              <select
                value={todoPriority}
                onChange={e => setTodoPriority(e.target.value)}
                className="form-input py-2 text-sm flex-shrink-0"
                style={{ width: 92, color: PRIORITY_COLORS[todoPriority] }}
              >
                <option value="high" style={{ color: '#ef4444' }}>Yüksek</option>
                <option value="medium" style={{ color: '#f59e0b' }}>Orta</option>
                <option value="low" style={{ color: '#a78bfa' }}>Düşük</option>
              </select>
              <input className="form-input flex-1 py-2 text-sm min-w-0" placeholder="Görev ekle..." value={todoInput}
                onChange={e => setTodoInput(e.target.value)} onKeyDown={e => e.key==='Enter' && addTodoLocal()} />
              <button className="btn-save py-2 px-3 text-sm flex-shrink-0" onClick={addTodoLocal}>+</button>
            </div>
          </div>

          {/* Notlar */}
          <div className="mb-4">
            <div className="text-xs text-muted uppercase tracking-wider mb-2">Notlar</div>
            {selData.dayNotes.map((n, i) => {
              const text = typeof n === 'object' ? n.text : n;
              const noteC = (typeof n === 'object' && n.color) ? n.color : '#3a7bd5';
              return (
                <div key={i} className="flex items-start gap-2 py-2 px-2 mb-1.5 rounded-md"
                  style={{ borderLeft: `3px solid ${noteC}`, background: 'rgba(255,255,255,0.025)' }}>
                  <div className="flex-1 text-sm text-text leading-relaxed">{text}</div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setNoteInput(text); setNoteColor(noteC); setEditingNote({idx:i,text}); }} className="text-accent opacity-60 bg-transparent border-0 cursor-pointer text-xs">✎</button>
                    <button onClick={() => deleteNote(i)} className="text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer">×</button>
                  </div>
                </div>
              );
            })}
            <div className="mt-2">
              <textarea className="form-input resize-y min-h-[70px] text-sm"
                placeholder={editingNote ? 'Notu düzenle...' : 'Not ekle...'}
                value={noteInput} onChange={e => setNoteInput(e.target.value)} />
              <div className="flex gap-2 justify-between items-center mt-2">
                <div style={{ position:'relative' }}>
                  <div onClick={e => { e.stopPropagation(); setNoteColorOpen(v => !v); }}
                    style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'4px 8px', borderRadius:8, border:'1px solid var(--color-border-tertiary, rgba(255,255,255,0.1))' }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', background:noteColor, flexShrink:0, border:'1px solid rgba(255,255,255,0.15)' }} />
                    <span className="text-xs text-muted">Renk</span>
                  </div>
                  {noteColorOpen && (
                    <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:'100%', left:0, zIndex:50, background:'#1a1d28', border:'1px solid rgba(255,255,255,0.12)', borderRadius:14, padding:12, display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:6, marginBottom:6, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
                      {COLOR_PALETTE.map(c => (
                        <div key={c} onClick={() => { setNoteColor(c); setNoteColorOpen(false); }}
                          style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', border: noteColor===c ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent', transition:'transform .12s', boxSizing:'border-box' }}
                          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'}
                          onMouseLeave={e=>e.currentTarget.style.transform=''}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {editingNote && <button className="btn-cancel py-1 px-3 text-xs" onClick={() => { setEditingNote(null); setNoteInput(''); setNoteColor('#3a7bd5'); }}>İptal</button>}
                  <button className="btn-save py-1 px-3 text-xs" onClick={saveNote}>{editingNote ? 'Güncelle' : 'Kaydet'}</button>
                </div>
              </div>
            </div>
          </div>

          {/* Medya */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted uppercase tracking-wider">Medya</div>
              <div className="flex gap-2">
                {selData.dayMedia.length > 0 && (
                  <button onClick={() => setMediaEditMode(m => !m)}
                    className="text-xs px-2 py-0.5 rounded-lg border border-border bg-surface2 text-muted cursor-pointer">
                    {mediaEditMode ? 'Bitti' : 'Düzenle'}
                  </button>
                )}
                <label className="text-xs px-2 py-0.5 rounded-lg border border-border bg-surface2 text-muted cursor-pointer">
                  + Ekle
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={addMedia} className="hidden" />
                </label>
              </div>
            </div>
            {selData.dayMedia.length === 0
              ? <div className="text-xs text-muted">Henüz medya yok.</div>
              : (
                <div className="flex flex-wrap gap-2">
                  {selData.dayMedia.map((m, i) => (
                    <div key={i} className="relative">
                      {m.type === 'video'
                        ? <video src={m.data} className="w-[80px] h-[80px] object-cover rounded-lg cursor-pointer" onClick={() => setMediaViewer(i)} />
                        : <img src={m.data} alt="" className="w-[80px] h-[80px] object-cover rounded-lg cursor-pointer" onClick={() => setMediaViewer(i)} />
                      }
                      {mediaEditMode && (
                        <button onClick={() => deleteMedia(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center cursor-pointer border-0">×</button>
                      )}
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}
