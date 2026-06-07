import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { TR_M, TR_D, todayStr, getSpecialDays, CAL_LABELS, fmtDate } from '../../lib/utils';

const SPEC_COLORS = { h:'#c0392b', r:'#7b5ea7', i:'#2874a6', b:'#c0392b', a:'#7b5ea7', custom:'#3a7bd5' };

// Öncelik renk haritası — Home.jsx ile senkron
const PRIORITY_COLORS = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#6b7280',
};

function getDayData(ds, db, todos, notes, media) {
  const specials = getSpecialDays(ds, db.s || []);
  const dayTodos = todos[ds] || [];
  const dayNotes = Array.isArray(notes[ds]) ? notes[ds] : (notes[ds] ? [notes[ds]] : []);
  const dayMedia = media[ds] || [];
  const films = (db.f||[]).filter(f => f.date === ds);
  const books = (db.b||[]).filter(b => b.start === ds || b.end === ds);
  const dots = [
    specials.some(s=>s.t==='h') && { color:'#c0392b' },
    specials.some(s=>s.t==='r') && { color:'#7b5ea7' },
    specials.some(s=>s.t==='i'||s.t==='b'||s.t==='a'||s.t==='custom') && { color:'#2874a6' },
    films.length && { color:'#a06040' },
  ].filter(Boolean);
  return { specials, dayTodos, dayNotes, dayMedia, films, books, dots };
}

// ── Kişisel Özel Gün Modal ──────────────────────────────────────────
function CustomDayModal({ onClose, onAdd, customDays, onDelete }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('custom');

  const add = () => {
    if (!name.trim() || !date.trim()) return;
    const [, m, d] = date.split('-');
    onAdd({ n: name.trim(), k: `${m}-${d}`, t: type, desc: desc.trim() });
    setName(''); setDate(''); setDesc('');
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
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface2 text-sm">
                <div>
                  <span style={{ color: SPEC_COLORS[s.t] || '#3a7bd5' }}>●</span>
                  <span className="ml-2">{s.n}</span>
                  <span className="text-xs text-muted ml-2">{s.k}</span>
                </div>
                <button onClick={() => onDelete(i)} className="text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer">×</button>
              </div>
            ))
          }
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <input className="form-input" placeholder="Başlık *" value={name} onChange={e => setName(e.target.value)} />
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          <textarea className="form-input resize-none text-sm" rows={2} placeholder="Açıklama (isteğe bağlı)" value={desc} onChange={e => setDesc(e.target.value)} />
          <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
            <option value="custom">Kişisel</option>
            <option value="b">Doğum Günü</option>
            <option value="a">Yıl Dönümü</option>
            <option value="i">Özel Gün</option>
          </select>
          <button className="btn-save w-full" onClick={add}>Ekle</button>
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
  const { db, getTodos, setTodos, getNotes, setNotes, getMedia, setMedia, addSpecialDay, deleteSpecialDay, todos: storeTodos, notes: storeNotes } = useStore();
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
  const [editingTodo, setEditingTodo] = useState(null); // { idx, text }
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [mediaEditMode, setMediaEditMode] = useState(false);
  const [showOverdue, setShowOverdue] = useState(() => localStorage.getItem('gn_show_overdue') !== 'false');
  const fileInputRef = useRef(null);

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
  // YENİ: öncelik döngüsü
  const cyclePriorityLocal = (i) => {
    const order = ['high', 'medium', 'low'];
    const t = getTodos();
    if (!t[selected]?.[i]) return;
    const cur = t[selected][i].priority || 'medium';
    t[selected][i].priority = order[(order.indexOf(cur) + 1) % 3];
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
      n[selected][editingNote.idx] = { ...n[selected][editingNote.idx], text: noteInput.trim() };
      setEditingNote(null);
    } else {
      n[selected].push({ text: noteInput.trim(), color: '#3a7bd5' });
    }
    setNotes(n); setNoteInput(''); refreshData();
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
  const customDays = db.s || [];

  return (
    <div className="animate-fadeIn">
      {showCustomModal && (
        <CustomDayModal
          customDays={customDays}
          onClose={() => setShowCustomModal(false)}
          onAdd={handleAddCustomDay}
          onDelete={handleDeleteCustomDay}
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

          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} className="w-8 h-8 rounded-lg border border-border bg-transparent text-muted cursor-pointer flex items-center justify-center">‹</button>
            <div className="font-serif text-[18px] text-accent2">{TR_M[month]} {year}</div>
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} className="w-8 h-8 rounded-lg border border-border bg-transparent text-muted cursor-pointer flex items-center justify-center">›</button>
          </div>

          <div className="grid grid-cols-7 border-l border-border">
            {['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map((d, i) => (
              <div key={d} className={`text-center text-[10px] uppercase tracking-wider py-1 border-r border-border ${i >= 5 ? 'text-[#1D9E75]' : 'text-muted'}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-border">
            {(() => {
              const trailing = (7 - (cells.length % 7)) % 7;
              const allCells = [...cells, ...Array(trailing).fill(null)];
              return allCells.map((ds, i) => {
                if (!ds) return <div key={`e-${i}`} className="border-r border-t border-b border-border min-h-[42px]" />;
                const d = parseInt(ds.split('-')[2]);
                const isToday = ds === today;
                const isSel = ds === selected;
                const { dots } = getDayData(ds, db, todos, notes, media);
                const colIndex = i % 7;
                const isWeekend = colIndex >= 5;
                const isPast = ds < today;
                const hasOverdue = showOverdue && isPast && (todos[ds] || []).some(t => !t.done);
                const allDots = hasOverdue ? [{ color: '#ef4444', overdue: true }, ...dots] : dots;
                return (
                  <div key={ds} onClick={() => setSelected(ds)}
                    className={`min-h-[42px] p-[4px_2px] flex flex-col items-center cursor-pointer border-r border-t border-b border-border transition-all hover:bg-surface2 ${isSel ? 'bg-surface3' : ''}`}
                    style={isWeekend && !isSel ? { borderTop: '2px solid rgba(29,158,117,.55)', borderLeft: '2px solid rgba(29,158,117,.55)', borderRadius: '6px 0 0 0' } : undefined}>
                    <div className={`w-[26px] h-[26px] flex items-center justify-center text-sm rounded-full transition-all ${isToday ? 'bg-accent text-white font-medium' : isSel ? 'text-text font-medium' : isWeekend ? 'text-[#1D9E75]' : 'text-muted'}`}>{d}</div>
                    <div className="flex gap-[2px] mt-[2px] flex-wrap justify-center">
                      {allDots.slice(0,4).map((dot, di) => (
                        <div key={di} style={{ width:4, height:4, borderRadius:'50%', background:dot.color, boxShadow: dot.overdue ? '0 0 4px #ef4444' : 'none' }} />
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
            {[
              { color:'#c0392b', label:'Resmi Tatil' },
              { color:'#7b5ea7', label:'Dini Bayram' },
              { color:'#2874a6', label:'Özel Gün' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div style={{ width:8, height:8, borderRadius:'50%', background:item.color, flexShrink:0 }} />
                <span className="text-[11px] text-muted">{item.label}</span>
              </div>
            ))}
            <button onClick={() => setShowCustomModal(true)}
              className="ml-auto text-[11px] text-accent border border-accent/30 bg-transparent px-2 py-0.5 rounded-lg cursor-pointer hover:bg-accent/10 transition-colors">
              + Özel Gün
            </button>
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

          {selData.specials.map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-sm"
              style={{ background:`${SPEC_COLORS[s.t]||'#3a7bd5'}15`, borderLeft:`3px solid ${SPEC_COLORS[s.t]||'#3a7bd5'}` }}>
              <span className="flex-1">{s.n}</span>
              <span className="text-xs text-muted">{CAL_LABELS[s.t]}</span>
            </div>
          ))}

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
            {selData.dayTodos.map((t, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 group">
                {/* Öncelik dot — tıklayınca döngü */}
                <div
                  onClick={() => cyclePriorityLocal(i)}
                  title={`Öncelik: ${t.priority || 'medium'} (değiştirmek için tıkla)`}
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: PRIORITY_COLORS[t.priority || 'medium'],
                    flexShrink: 0, cursor: 'pointer',
                    transition: 'background .2s',
                  }}
                />

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
            ))}

            {/* Görev ekle — öncelik seçici + input */}
            <div className="flex gap-2 mt-2 items-center">
              {/* Öncelik seçici */}
              <div className="flex gap-1.5 flex-shrink-0">
                {['high', 'medium', 'low'].map(p => (
                  <div
                    key={p}
                    onClick={() => setTodoPriority(p)}
                    title={p}
                    style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: PRIORITY_COLORS[p],
                      cursor: 'pointer', flexShrink: 0,
                      opacity: todoPriority === p ? 1 : 0.3,
                      outline: todoPriority === p ? `2px solid ${PRIORITY_COLORS[p]}` : 'none',
                      outlineOffset: 1,
                      transition: 'opacity .15s',
                    }}
                  />
                ))}
              </div>
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
              return (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                  <div className="flex-1 text-sm text-text leading-relaxed">{text}</div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setNoteInput(text); setEditingNote({idx:i,text}); }} className="text-accent opacity-60 bg-transparent border-0 cursor-pointer text-xs">✎</button>
                    <button onClick={() => deleteNote(i)} className="text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer">×</button>
                  </div>
                </div>
              );
            })}
            <div className="mt-2">
              <textarea className="form-input resize-y min-h-[70px] text-sm"
                placeholder={editingNote ? 'Notu düzenle...' : 'Not ekle...'}
                value={noteInput} onChange={e => setNoteInput(e.target.value)} />
              <div className="flex gap-2 justify-end mt-2">
                {editingNote && <button className="btn-cancel py-1 px-3 text-xs" onClick={() => { setEditingNote(null); setNoteInput(''); }}>İptal</button>}
                <button className="btn-save py-1 px-3 text-xs" onClick={saveNote}>{editingNote ? 'Güncelle' : 'Kaydet'}</button>
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
