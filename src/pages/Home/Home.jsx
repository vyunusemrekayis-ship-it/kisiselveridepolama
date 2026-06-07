import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, TR_M, TR_D, calcChainStreak, swFmt, isGoalActive } from '../../lib/utils';

const PHOTOS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80',
  'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1920&q=80',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80',
];

// Öncelik renk haritası
const PRIORITY_COLORS = {
  high:   { dot: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: '!' },
  medium: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  label: '·' },
  low:    { dot: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: '·' },
};

// Tarih yardımcıları
function getDateKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function getWeekKeys() {
  const keys = [];
  for (let i = 0; i < 7; i++) keys.push(getDateKey(i));
  return keys;
}

function Widget({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 ${onClick ? 'cursor-pointer hover:bg-black/40 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function WidgetTitle({ children, onClick }) {
  return (
    <div onClick={onClick} className={`text-xs uppercase tracking-wider text-white/60 mb-3 font-medium ${onClick ? 'cursor-pointer hover:text-white/80' : ''}`}>
      {children}
    </div>
  );
}

// ── GELİŞMİŞ TODO WİDGET ─────────────────────────────────────────────
function TodoWidget({ onNavigate, getTodos, setTodos }) {
  const today = todayStr();
  const tomorrow = getDateKey(1);

  const [tab, setTab] = useState('today'); // 'today' | 'tomorrow' | 'week'
  const [addInput, setAddInput] = useState('');
  const [addPriority, setAddPriority] = useState('medium');
  const [editingKey, setEditingKey] = useState(null); // { dateKey, idx }
  const [editText, setEditText] = useState('');
  const [showOverdue, setShowOverdue] = useState(() => localStorage.getItem('gn_show_overdue') !== 'false');
  const [, forceUpdate] = useState(0);

  const refresh = () => forceUpdate(n => n + 1);

  // Aktif sekmeye göre görev listesi
  const getTabData = () => {
    const allTodos = getTodos();
    if (tab === 'today') {
      return { items: (allTodos[today] || []).map((t, i) => ({ ...t, dateKey: today, idx: i })) };
    }
    if (tab === 'tomorrow') {
      return { items: (allTodos[tomorrow] || []).map((t, i) => ({ ...t, dateKey: tomorrow, idx: i })) };
    }
    // Bu hafta: tüm günler, date etiketi ile
    const items = [];
    getWeekKeys().forEach(dk => {
      (allTodos[dk] || []).forEach((t, i) => {
        items.push({ ...t, dateKey: dk, idx: i });
      });
    });
    return { items };
  };

  // Gecikmiş görevler (bugünden önceki tarihler, tamamlanmamış)
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

  // Progress hesapla
  const getProgress = () => {
    const allTodos = getTodos();
    if (tab === 'today') {
      const list = allTodos[today] || [];
      if (!list.length) return null;
      const done = list.filter(t => t.done).length;
      return { done, total: list.length, pct: Math.round(done / list.length * 100) };
    }
    if (tab === 'tomorrow') {
      const list = allTodos[tomorrow] || [];
      if (!list.length) return null;
      const done = list.filter(t => t.done).length;
      return { done, total: list.length, pct: Math.round(done / list.length * 100) };
    }
    // Hafta
    let done = 0, total = 0;
    getWeekKeys().forEach(dk => {
      (allTodos[dk] || []).forEach(t => { total++; if (t.done) done++; });
    });
    if (!total) return null;
    return { done, total, pct: Math.round(done / total * 100) };
  };

  const toggle = (e, dateKey, idx) => {
    e.stopPropagation();
    const t = getTodos();
    if (t[dateKey]?.[idx]) t[dateKey][idx].done = !t[dateKey][idx].done;
    setTodos(t);
    refresh();
  };

  const setPriority = (e, dateKey, idx, priority) => {
    e.stopPropagation();
    const t = getTodos();
    if (t[dateKey]?.[idx]) t[dateKey][idx].priority = priority;
    setTodos(t);
    refresh();
  };

  const startEdit = (e, dateKey, idx, text) => {
    e.stopPropagation();
    setEditingKey({ dateKey, idx });
    setEditText(text);
  };

  const saveEdit = (e) => {
    e.stopPropagation();
    if (!editingKey || !editText.trim()) { setEditingKey(null); return; }
    const t = getTodos();
    const { dateKey, idx } = editingKey;
    if (t[dateKey]?.[idx]) t[dateKey][idx].text = editText.trim();
    setTodos(t);
    setEditingKey(null);
    refresh();
  };

  const deleteTodo = (e, dateKey, idx) => {
    e.stopPropagation();
    const t = getTodos();
    if (t[dateKey]) t[dateKey].splice(idx, 1);
    setTodos(t);
    refresh();
  };

  const addTodo = (e) => {
    e.stopPropagation();
    if (!addInput.trim()) return;
    const targetKey = tab === 'tomorrow' ? tomorrow : today;
    const t = getTodos();
    if (!t[targetKey]) t[targetKey] = [];
    t[targetKey].push({ text: addInput.trim(), done: false, priority: addPriority });
    setTodos(t);
    setAddInput('');
    refresh();
  };

  const { items } = getTabData();
  const overdue = getOverdue();
  const progress = getProgress();

  // Sıralama: tamamlanmamışlar önce, sonra öncelik (high > medium > low)
  const PRIO_ORDER = { high: 0, medium: 1, low: 2, undefined: 1 };
  const sorted = [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (PRIO_ORDER[a.priority] ?? 1) - (PRIO_ORDER[b.priority] ?? 1);
  });

  const TR_SHORT = { [today]: 'Bugün', [tomorrow]: 'Yarın' };
  const fmtDate = (dk) => {
    if (TR_SHORT[dk]) return TR_SHORT[dk];
    const [, m, d] = dk.split('-');
    return `${parseInt(d)} ${TR_M[parseInt(m) - 1]}`;
  };

  return (
    <div
      onClick={onNavigate}
      className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors"
    >
      {/* Başlık + Sekmeler */}
      <div className="flex items-center justify-between mb-2" onClick={e => e.stopPropagation()}>
        <div
          onClick={onNavigate}
          className="text-xs uppercase tracking-wider text-white/60 font-medium cursor-pointer hover:text-white/80 transition-colors"
        >
          Görevler ›
        </div>
        <div className="flex gap-1">
          {[['today','Bugün'], ['tomorrow','Yarın'], ['week','Hafta']].map(([key, label]) => (
            <button
              key={key}
              onClick={e => { e.stopPropagation(); setTab(key); }}
              style={{
                background: tab === key ? 'rgba(58,123,213,0.3)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${tab === key ? 'rgba(58,123,213,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: tab === key ? '#93b8f0' : 'rgba(255,255,255,0.4)',
                borderRadius: 6, padding: '2px 7px', fontSize: 10,
                cursor: 'pointer', transition: 'all .15s',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div onClick={e => e.stopPropagation()} className="mb-3">
          <div className="flex justify-between text-[10px] text-white/35 mb-1">
            <span>{progress.done}/{progress.total} tamamlandı</span>
            <span style={{ color: progress.pct === 100 ? '#34d399' : 'rgba(255,255,255,0.35)' }}>
              {progress.pct}%
            </span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress.pct}%`,
              borderRadius: 2,
              background: progress.pct === 100
                ? 'linear-gradient(90deg,#34d399,#10b981)'
                : 'linear-gradient(90deg,#3a7bd5,#5a9bf5)',
              transition: 'width .4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Gecikmiş Uyarı — sadece showOverdue açıksa göster */}
      {showOverdue && tab === 'today' && overdue.length > 0 && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '5px 8px', marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 10, color: '#fca5a5', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
            {overdue.length} gecikmiş görev
          </div>
          {overdue.slice(0, 3).map((t, i) => (
            <div key={i} className="flex items-center gap-1.5" style={{ marginBottom: 2 }}>
              <div
                onClick={e => toggle(e, t.dateKey, t.idx)}
                style={{
                  width: 10, height: 10, borderRadius: 3,
                  border: '1px solid rgba(252,165,165,0.4)',
                  flexShrink: 0, cursor: 'pointer',
                  background: t.done ? '#ef4444' : 'transparent',
                }}
              />
              <span style={{ fontSize: 10, color: 'rgba(252,165,165,0.7)', flex: 1, textDecoration: t.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.text}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(252,165,165,0.4)', flexShrink: 0 }}>
                {fmtDate(t.dateKey)}
              </span>
            </div>
          ))}
          {overdue.length > 3 && (
            <div style={{ fontSize: 9, color: 'rgba(252,165,165,0.4)', marginTop: 2 }}>
              +{overdue.length - 3} daha…
            </div>
          )}
        </div>
      )}

      {/* Görev Listesi — Scroll */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: 200, overflowY: 'auto', marginBottom: sorted.length ? 8 : 0 }}
        className="custom-scroll"
      >
        {sorted.length === 0
          ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '4px 0' }}>Görev yok</div>
          : sorted.map((t, i) => {
            const pc = PRIORITY_COLORS[t.priority || 'medium'];
            const isEditing = editingKey?.dateKey === t.dateKey && editingKey?.idx === t.idx;
            return (
              <div
                key={`${t.dateKey}-${t.idx}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '3px 0',
                  borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                {/* Öncelik dot — tıkla döngü yap */}
                <div
                  onClick={e => {
                    const order = ['high', 'medium', 'low'];
                    const cur = t.priority || 'medium';
                    const next = order[(order.indexOf(cur) + 1) % 3];
                    setPriority(e, t.dateKey, t.idx, next);
                  }}
                  title={`Öncelik: ${t.priority || 'medium'}`}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: pc.dot, flexShrink: 0, cursor: 'pointer',
                    transition: 'background .2s',
                  }}
                />

                {/* Checkbox */}
                <div
                  onClick={e => toggle(e, t.dateKey, t.idx)}
                  style={{
                    width: 12, height: 12, borderRadius: 3,
                    border: t.done ? 'none' : '1px solid rgba(255,255,255,0.3)',
                    background: t.done ? '#3a7bd5' : 'transparent',
                    flexShrink: 0, cursor: 'pointer',
                    transition: 'all .15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {t.done && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                {/* Metin / Edit */}
                {isEditing ? (
                  <input
                    autoFocus
                    value={editText}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(e);
                      if (e.key === 'Escape') { e.stopPropagation(); setEditingKey(null); }
                    }}
                    onBlur={saveEdit}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#e8edf5', outline: 'none',
                      borderRadius: 4, padding: '1px 6px', fontSize: 11,
                      minWidth: 0,
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={e => startEdit(e, t.dateKey, t.idx, t.text)}
                    style={{
                      flex: 1, fontSize: 11, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: t.done ? 'rgba(255,255,255,0.25)' : 'rgba(232,237,245,0.85)',
                      textDecoration: t.done ? 'line-through' : 'none',
                      cursor: 'default',
                    }}
                  >
                    {t.text}
                  </span>
                )}

                {/* Tarih etiketi (hafta modunda) */}
                {tab === 'week' && (
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                    {fmtDate(t.dateKey)}
                  </span>
                )}

                {/* Düzenle butonu */}
                {!isEditing && (
                  <button
                    onClick={e => startEdit(e, t.dateKey, t.idx, t.text)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                      padding: '0 1px', lineHeight: 1, flexShrink: 0, fontSize: 10,
                    }}
                    title="Düzenle"
                  >✎</button>
                )}

                {/* Sil butonu */}
                <button
                  onClick={e => deleteTodo(e, t.dateKey, t.idx)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
                    padding: '0 1px', lineHeight: 1, flexShrink: 0, fontSize: 13,
                  }}
                  title="Sil"
                >×</button>
              </div>
            );
          })
        }
      </div>

      {/* Yeni Görev Ekle */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 4 }}>
        {/* Öncelik seçici */}
        <div style={{ display: 'flex', gap: 3 }}>
          {['high', 'medium', 'low'].map(p => (
            <div
              key={p}
              onClick={e => { e.stopPropagation(); setAddPriority(p); }}
              title={p}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: PRIORITY_COLORS[p].dot,
                cursor: 'pointer', flexShrink: 0,
                opacity: addPriority === p ? 1 : 0.3,
                transition: 'opacity .15s',
                outline: addPriority === p ? `2px solid ${PRIORITY_COLORS[p].dot}` : 'none',
                outlineOffset: 1,
              }}
            />
          ))}
        </div>

        <input
          value={addInput}
          onChange={e => { e.stopPropagation(); setAddInput(e.target.value); }}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') addTodo(e); }}
          onClick={e => e.stopPropagation()}
          placeholder={tab === 'tomorrow' ? 'Yarın için görev ekle...' : 'Görev ekle...'}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(232,237,245,0.8)', outline: 'none',
            borderRadius: 7, padding: '4px 8px', fontSize: 11,
            fontFamily: 'inherit', minWidth: 0,
          }}
        />
        <button
          onClick={addTodo}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(232,237,245,0.5)',
            width: 24, height: 24, borderRadius: 7, fontSize: 14,
            cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity .15s',
          }}
        >+</button>
      </div>
    </div>
  );
}

// window._sw her zaman var olsun
if (!window._sw) window._sw = { running: false, startTime: null, elapsed: parseInt(localStorage.getItem('gn_sw_elapsed') || '0'), sessionStartLabel: null, sessionStartMs: null };

export default function Home() {
  const { db, setCurrentPage, getTodos, setTodos, getChains, swState } = useStore();
  const [time, setTime] = useState(new Date());
  const [bgPhoto, setBgPhoto] = useState('');
  const [swElapsed, setSwElapsed] = useState(() => parseInt(localStorage.getItem('gn_sw_elapsed') || '0'));
  const [swRunning, setSwRunning] = useState(() => localStorage.getItem('gn_sw_running') === '1');
  const [goalPeriod, setGoalPeriod] = useState('weekly');
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const idx = Math.floor(Math.random() * PHOTOS.length);
    setBgPhoto(PHOTOS[idx]);
  }, []);

  // swState (Firestore'dan remote sync)
  useEffect(() => {
    if (!swState) return;
    if (swState.running && swState.startTime) {
      if (!window._sw) window._sw = {};
      window._sw.running = true;
      window._sw.startTime = swState.startTime;
      setSwRunning(true);
    } else if (swState.running === false) {
      if (!window._sw) window._sw = {};
      window._sw.running = false;
      window._sw.startTime = null;
      if (swState.elapsed !== undefined) {
        window._sw.elapsed = swState.elapsed;
        setSwElapsed(swState.elapsed);
      }
      setSwRunning(false);
    }
  }, [swState]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Stopwatch sync
  useEffect(() => {
    if (swRunning) {
      const t = setInterval(() => {
        const e = window._sw.startTime ?
          Date.now() - window._sw.startTime : window._sw.elapsed;
        setSwElapsed(e);
      }, 100);
      return () => clearInterval(t);
    }
  }, [swRunning]);

  const toggleSw = (e) => {
    e.stopPropagation();
    if (!window._sw) window._sw = { running: false, startTime: null, elapsed: parseInt(localStorage.getItem('gn_sw_elapsed') || '0') };
    if (window._sw.running) {
      const elapsed = Date.now() - window._sw.startTime;
      window._sw.elapsed = elapsed;
      window._sw.running = false;
      window._sw.startTime = null;
      localStorage.setItem('gn_sw_elapsed', elapsed);
      localStorage.removeItem('gn_sw_running');
      localStorage.removeItem('gn_sw_startTime');
      if (window._fbUser) { import('../../lib/firebase').then(({ saveToFirestore }) => { saveToFirestore(window._fbUser.uid, { gn_sw_elapsed: elapsed, gn_sw_running: false, gn_sw_startTime: null }); }); }
      setSwRunning(false);
    } else {
      const startTime = Date.now() - window._sw.elapsed;
      window._sw.startTime = startTime;
      window._sw.running = true;
      localStorage.setItem('gn_sw_running', '1');
      localStorage.setItem('gn_sw_startTime', startTime);
      if (window._fbUser) { import('../../lib/firebase').then(({ saveToFirestore }) => { saveToFirestore(window._fbUser.uid, { gn_sw_startTime: startTime, gn_sw_running: true }); }); }
      setSwRunning(true);
    }
  };

  const resetSw = (e) => {
    e.stopPropagation();
    window._sw.running = false; window._sw.elapsed = 0; window._sw.startTime = null;
    localStorage.setItem('gn_sw_elapsed', '0');
    setSwElapsed(0); setSwRunning(false);
  };

  const hh = String(time.getHours()).padStart(2,'0');
  const mm = String(time.getMinutes()).padStart(2,'0');

  const today = todayStr();
  const chains = getChains().slice(0, 3);

  const goals = (db.g || []).filter(g => g.period === goalPeriod && isGoalActive(g)).slice(0, 4);

  const totalBooks = db.b?.length || 0;
  const totalFilms = db.f?.length || 0;

  const _sw = window._sw || { running: false, startTime: null, elapsed: parseInt(localStorage.getItem('gn_sw_elapsed') || '0') };
  const { main: swMain } = swFmt(_sw.running && _sw.startTime ?
    Date.now() - _sw.startTime : _sw.elapsed);

  // Mini calendar - current week
  const weekDays = [];
  const wd = new Date(time);
  wd.setDate(wd.getDate() - ((wd.getDay() + 6) % 7)); // Monday
  for (let i = 0; i < 7; i++) {
    const d = new Date(wd); d.setDate(d.getDate() + i);
    weekDays.push({ d, isToday: d.toISOString().split('T')[0] === today });
  }

  return (
    <div className="relative min-h-screen -m-5 md:-m-[26px_30px] overflow-hidden">
      {/* Background */}
      {bgPhoto && (
        <div
          style={{ position:'absolute', inset:0, backgroundImage:`url(${bgPhoto})`, backgroundSize:'cover', backgroundPosition:'center', zIndex:0 }}
        />
      )}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(13,15,19,.7) 0%,rgba(13,15,19,.4) 100%)', zIndex:1 }} />

      {/* Content */}
      <div className="relative z-10 p-5 md:p-8 min-h-screen grid grid-rows-[auto_1fr_auto] gap-4">

        {/* Center: Time */}
        <div className="flex flex-col items-center justify-center py-8">
          <div className="font-serif font-normal leading-none tracking-tighter text-white" style={{ fontSize: 'clamp(52px, 18vw, 96px)', textShadow:'0 2px 24px rgba(0,0,0,.6)' }}>
            {hh}:{mm}
          </div>
          <div className="text-sm font-light tracking-[4px] uppercase mt-3 text-white/70">
            {TR_D[time.getDay()]}, {time.getDate()} {TR_M[time.getMonth()]} {time.getFullYear()}
          </div>
        </div>

        {/* Widgets grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">

          {/* Todos — Gelişmiş Widget */}
          <TodoWidget
            onNavigate={() => setCurrentPage('calendar')}
            getTodos={getTodos}
            setTodos={setTodos}
          />

          {/* Goals */}
          <Widget>
            <WidgetTitle>
              <div className="flex items-center justify-between">
                <span onClick={() => setCurrentPage('goals')} className="cursor-pointer">Hedefler</span>
                <div className="flex gap-1">
                  {[['weekly','H'],['monthly','A'],['yearly','Y']].map(([p,l]) => (
                    <button key={p} onClick={() => setGoalPeriod(p)}
                      className={`w-5 h-5 rounded text-[9px] border-0 cursor-pointer transition-all ${goalPeriod===p ? 'bg-accent text-white' : 'bg-white/10 text-white/60'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </WidgetTitle>
            {goals.length === 0
              ? <div className="text-xs text-white/30">Hedef yok</div>
              : goals.map((g, i) => {
                const isBook = g.track==='book'; const isFilm = g.track==='film';
                const cur = isBook ? totalBooks : isFilm ? totalFilms : (parseFloat(g.current)||0);
                const tgt = parseFloat(g.target)||0;
                const pct = tgt ? Math.min(100, Math.round(cur/tgt*100)) : 0;
                return (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs text-white/70 mb-1">
                      <span className="truncate">{g.name}</span>
                      <span className="text-accent ml-2 flex-shrink-0">{cur}/{tgt} {g.unit||''}</span>
                    </div>
                    <div className="h-[3px] bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width:`${pct}%` }} />
                    </div>
                  </div>
                );
              })
            }
          </Widget>

          {/* Stopwatch */}
          <Widget onClick={() => setCurrentPage('clock')}>
            <WidgetTitle>Kronometre</WidgetTitle>
            <div className="font-serif text-3xl text-white mb-3">{swMain}</div>
            <div className="flex gap-2">
              <button
                onClick={toggleSw}
                className={`px-4 py-1.5 rounded-lg text-xs border cursor-pointer transition-all ${swRunning ? 'border-red-400/40 bg-red-400/10 text-red-300' : 'border-white/20 bg-white/10 text-white/70'}`}
              >
                {swRunning ? '⏸' : '▶'}
              </button>
              <button onClick={resetSw} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-white/5 text-white/50 cursor-pointer">↺</button>
            </div>
          </Widget>

          {/* Chains */}
          <Widget onClick={() => setCurrentPage('chain')}>
            <WidgetTitle>Zincir Kırma ›</WidgetTitle>
            {chains.length === 0
              ? <div className="text-xs text-white/30">Alışkanlık yok</div>
              : chains.map((ch, i) => {
                const { streak } = calcChainStreak(ch);
                return (
                  <div key={i} className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div style={{ width:6, height:6, borderRadius:'50%', background: ch.color||'#3a7bd5', flexShrink:0 }} />
                      <span className="text-xs text-white/70 truncate">{ch.name}</span>
                    </div>
                    <span className="text-xs text-accent flex-shrink-0 ml-2">{streak > 0 ? `${streak}🔥` : '—'}</span>
                  </div>
                );
              })
            }
          </Widget>
        </div>

        {/* Bottom mini-calendar */}
        <div className="flex justify-center pb-4">
          <Widget className="w-fit">
            <div className="flex gap-1">
              {weekDays.map(({ d, isToday }, i) => (
                <div key={i} className={`w-8 h-8 flex flex-col items-center justify-center rounded-lg text-xs ${isToday ? 'bg-accent text-white' : 'text-white/50'}`}>
                  <div style={{ fontSize:8 }}>{['Pt','Sa','Ça','Pe','Cu','Ct','Pz'][i]}</div>
                  <div>{d.getDate()}</div>
                </div>
              ))}
            </div>
          </Widget>
        </div>

      </div>
    </div>
  );
}
