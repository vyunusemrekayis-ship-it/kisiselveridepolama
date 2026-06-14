import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, TR_M, TR_D, calcChainStreak, swFmt, isGoalActive, getSpecialDays } from '../../lib/utils';

const PHOTOS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80',
  'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1920&q=80',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80',
];

const PRIORITY_COLORS = {
  high:   { dot: '#ef4444' },
  medium: { dot: '#f59e0b' },
  low:    { dot: '#a78bfa' },
};

// Özel gün renkleri — Calendar.jsx ile senkron (localStorage: gn_spec_colors)
const DEFAULT_SPEC_COLORS = { h:'#c0392b', r:'#7b5ea7', i:'#2874a6', b:'#c0392b', a:'#7b5ea7', custom:'#3a7bd5' };
function loadSpecColors() {
  try { return { ...DEFAULT_SPEC_COLORS, ...JSON.parse(localStorage.getItem('gn_spec_colors') || '{}') }; } catch { return { ...DEFAULT_SPEC_COLORS }; }
}

const ALL_WIDGET_IDS = ['todos','goals','stopwatch','chains','books','calendar'];
const WIDGET_LABELS = { todos:'Görevler', goals:'Hedefler', stopwatch:'Kronometre', chains:'Zincir Kırma', books:'Kitaplar', calendar:'Takvim' };

function loadWidgetOrder() {
  try { return JSON.parse(localStorage.getItem('gn_widget_order') || JSON.stringify(ALL_WIDGET_IDS)); } catch { return [...ALL_WIDGET_IDS]; }
}
function loadWidgetVisible() {
  try { return JSON.parse(localStorage.getItem('gn_widget_visible') || JSON.stringify(ALL_WIDGET_IDS)); } catch { return [...ALL_WIDGET_IDS]; }
}
function saveWidgetOrder(order) { localStorage.setItem('gn_widget_order', JSON.stringify(order)); }
function saveWidgetVisible(visible) { localStorage.setItem('gn_widget_visible', JSON.stringify(visible)); }

// ── WIDGET BOYUTLANDIRMA ────────────────────────────────────────────────
// Masaüstü: 4 kolon, mobil: 2 kolon. Her hücre kare-ish bir birim (ROW_UNIT px).
const DESKTOP_COLS = 4;
const MOBILE_COLS = 2;
const ROW_UNIT_DESKTOP = 64;  // px — bir "row" biriminin yüksekliği
const ROW_UNIT_MOBILE = 56;
const GAP = 8; // px — grid gap (Tailwind gap-2)

// Varsayılan boyutlar — { col, row } grid birimi cinsinden
const DEFAULT_SIZES = {
  desktop: {
    todos:    { col: 1, row: 4 },
    goals:    { col: 1, row: 4 },
    stopwatch:{ col: 2, row: 3 },
    chains:   { col: 1, row: 4 },
    books:    { col: 1, row: 4 },
    calendar: { col: 1, row: 4 },
  },
  mobile: {
    todos:    { col: 2, row: 5 },
    goals:    { col: 2, row: 5 },
    stopwatch:{ col: 2, row: 4 },
    chains:   { col: 2, row: 5 },
    books:    { col: 2, row: 5 },
    calendar: { col: 2, row: 5 },
  },
};

const SIZE_LIMITS = {
  desktop: { minCol: 1, maxCol: DESKTOP_COLS, minRow: 2, maxRow: 8 },
  mobile:  { minCol: 1, maxCol: MOBILE_COLS,  minRow: 2, maxRow: 8 },
};

function getWidgetSize(mode, id, sizes) {
  const stored = sizes?.[mode]?.[id];
  const def = DEFAULT_SIZES[mode]?.[id] || { col: 1, row: 4 };
  const lim = SIZE_LIMITS[mode];
  const col = Math.min(lim.maxCol, Math.max(lim.minCol, stored?.col ?? def.col));
  const row = Math.min(lim.maxRow, Math.max(lim.minRow, stored?.row ?? def.row));
  return { col, row };
}

// ── OTOMATİK YERLEŞİM ────────────────────────────────────────────────────
// Kaydedilmiş pozisyonu olmayan widget'lar için, sıraya göre soldan sağa /
// yukarıdan aşağıya boş hücre bulan basit bir "akış" yerleştirici.
// occupied: Set<"col,row"> — bir önceki widget'ların kapladığı hücreler.
function findFreeSlot(occupied, cols, size) {
  let row = 1;
  while (true) {
    for (let col = 1; col <= cols - size.col + 1; col++) {
      let fits = true;
      outer:
      for (let r = 0; r < size.row; r++) {
        for (let c = 0; c < size.col; c++) {
          if (occupied.has(`${col+c},${row+r}`)) { fits = false; break outer; }
        }
      }
      if (fits) return { col, row };
    }
    row++;
    if (row > 200) return { col: 1, row: 1 }; // güvenlik
  }
}

function markOccupied(occupied, position, size) {
  for (let r = 0; r < size.row; r++) {
    for (let c = 0; c < size.col; c++) {
      occupied.add(`${position.col+c},${position.row+r}`);
    }
  }
}

// Tüm widget'lar için pozisyon hesapla: kayıtlı varsa onu kullan, yoksa
// otomatik yerleştir (occupied set'i sırayla güncellenerek çakışma önlenir).
function computeLayout(order, visible, mode, sizes, positions) {
  const cols = mode==='mobile' ? MOBILE_COLS : DESKTOP_COLS;
  const occupied = new Set();
  const layout = {};
  order.filter(id=>visible.includes(id)).forEach(id => {
    const size = getWidgetSize(mode, id, sizes);
    let pos = positions?.[mode]?.[id];
    if (pos) {
      // Kayıtlı pozisyon grid dışına taşıyorsa düzelt
      pos = { col: Math.min(Math.max(1,pos.col), cols - size.col + 1), row: Math.max(1,pos.row) };
      // Kayıtlı pozisyon başka bir widget ile çakışıyorsa (örn. ekran boyutu değişti), boş yer bul
      let conflict = false;
      outer:
      for (let r = 0; r < size.row; r++) {
        for (let c = 0; c < size.col; c++) {
          if (occupied.has(`${pos.col+c},${pos.row+r}`)) { conflict = true; break outer; }
        }
      }
      if (conflict) pos = findFreeSlot(occupied, cols, size);
    } else {
      pos = findFreeSlot(occupied, cols, size);
    }
    layout[id] = { position: pos, size };
    markOccupied(occupied, pos, size);
  });
  return layout;
}

function getDateKey(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}
function getWeekKeys() { return Array.from({length:7},(_,i)=>getDateKey(i)); }

function WidgetTitle({ children }) {
  return <div className="text-xs uppercase tracking-wider text-white/60 mb-3 font-medium">{children}</div>;
}

// ── WIDGET SARMALAYICI (taşıma + resize tutamaçlı) ──────────────────────
function WidgetWrapper({ id, size, position, mode, onResizeStart, onMoveStart, isDragging, isDropTarget, children }) {
  return (
    <div
      style={{
        position:'relative',
        gridColumn: position ? `${position.col} / span ${size.col}` : `span ${size.col}`,
        gridRow: position ? `${position.row} / span ${size.row}` : `span ${size.row}`,
        minWidth:0, minHeight:0,
        display:'flex',
        opacity: isDragging ? 0.4 : 1,
        outline: isDropTarget ? '2px solid rgba(58,123,213,0.6)' : 'none',
        outlineOffset: -2,
        borderRadius: 16,
        transition: isDragging ? 'none' : 'opacity .15s, outline-color .15s',
        zIndex: isDragging ? 30 : 1,
      }}
    >
      <div style={{position:'relative',width:'100%',height:'100%',display:'flex'}}>
        <div style={{flex:1,minWidth:0,minHeight:0,display:'flex',flexDirection:'column'}}>
          {children}
        </div>
        {/* Taşıma tutamacı — sağ üst köşe */}
        <div
          onPointerDown={e=>onMoveStart(e,id)}
          title="Sürükleyerek taşı"
          style={{
            position:'absolute', right:2, top:2,
            width:16, height:16,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'grab', zIndex:20,
            color:'rgba(255,255,255,0.25)',
            touchAction:'none',
            background:'rgba(0,0,0,0.2)',
            borderRadius:5,
          }}
          onMouseEnter={e=>{e.currentTarget.style.color='rgba(255,255,255,0.85)';}}
          onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.25)';}}
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="3" cy="2.5" r="1.2"/><circle cx="9" cy="2.5" r="1.2"/>
            <circle cx="3" cy="6" r="1.2"/><circle cx="9" cy="6" r="1.2"/>
            <circle cx="3" cy="9.5" r="1.2"/><circle cx="9" cy="9.5" r="1.2"/>
          </svg>
        </div>
        {/* Resize tutamacı — sağ alt köşe */}
        <div
          onPointerDown={e=>onResizeStart(e,id)}
          title="Sürükleyerek boyutlandır"
          style={{
            position:'absolute', right:2, bottom:2,
            width:18, height:18,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'nwse-resize', zIndex:20,
            color:'rgba(255,255,255,0.35)',
            touchAction:'none',
          }}
          onMouseEnter={e=>{e.currentTarget.style.color='rgba(255,255,255,0.8)';}}
          onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.35)';}}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M9.5 1.5L1.5 9.5M9.5 5.5L5.5 9.5M9.5 9.5L9.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── AKILLI BİLGİ ŞERİDİ ─────────────────────────────────────────────────
function fmtDurShort(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h}s ${m}dk` : `${h}s`;
  return `${m}dk`;
}

function buildTickerMessages({ db, todos, chains, swLog, today, tomorrow }) {
  const msgs = [];

  // Görevler — bugün
  const todayTodos = todos[today] || [];
  if (todayTodos.length) {
    const done = todayTodos.filter(t=>t.done).length;
    const remaining = todayTodos.length - done;
    msgs.push(remaining>0 ? `${todayTodos.length} görevden ${done} tamamlandı, ${remaining} kaldı` : 'Bugünün tüm görevleri tamamlandı');
  } else {
    msgs.push('Bugün için görev yok');
  }
  // Görevler — yarın
  const tomorrowTodos = todos[tomorrow] || [];
  if (tomorrowTodos.length) msgs.push(`Yarın için ${tomorrowTodos.length} görev planlandı`);

  // Hedefler
  const totalBooks = db.b?.length || 0;
  const totalFilms = db.f?.length || 0;
  (db.g || []).filter(isGoalActive).forEach(g => {
    const isBook = g.track==='book', isFilm = g.track==='film';
    const cur = isBook ? totalBooks : isFilm ? totalFilms : (parseFloat(g.current)||0);
    const tgt = parseFloat(g.target)||0;
    if (tgt > 0) {
      if (cur >= tgt) msgs.push(`Hedef tamamlandı: ${g.name}`);
      else {
        const pct = Math.round(Math.min(1, cur/tgt)*100);
        msgs.push(`${g.name}: %${pct}, ${tgt-cur} kaldı`);
      }
    }
  });

  // Zincir Kırma
  (chains || []).forEach(ch => {
    const { streak, todayIdx, doneSet } = calcChainStreak(ch);
    msgs.push(doneSet.has(todayIdx) ? `${ch.name}: ${streak}. gün tamamlandı` : `${ch.name}: ${streak}. gün, bugün henüz işaretlenmedi`);
  });

  // Kronometre — bugün
  const todaySessions = (swLog || []).filter(e => e.date===today);
  if (todaySessions.length) {
    const totalMs = todaySessions.reduce((a,s)=>a+(s.dur||0),0);
    if (totalMs > 0) msgs.push(`Bugün ${fmtDurShort(totalMs)} çalışıldı`);
  }

  // Kitaplar — okunuyor
  (db.b || []).filter(b => b.status==='reading').forEach(b => msgs.push(`"${b.name}" okunuyor`));

  // Takvim — yaklaşan özel günler (7 gün)
  for (let off=0; off<7; off++) {
    const dt = new Date(); dt.setDate(dt.getDate()+off);
    const ds = dt.toISOString().split('T')[0];
    getSpecialDays(ds, db.s || []).forEach(sp => {
      msgs.push(off===0 ? `Bugün özel gün: ${sp.n}` : `${off} gün sonra: ${sp.n}`);
    });
  }

  // Hava durumu — Firestore'dan (db.wx), son 1 saat taze ise
  if (db.wx && db.wx.ts && (Date.now()-db.wx.ts) < 60*60*1000) {
    const { temp, uv, city } = db.wx;
    if (temp !== undefined) msgs.push(`${city || 'Hava'}: ${Math.round(temp)}°C`);
    if (uv !== undefined && uv >= 6) msgs.push(`UV yüksek (${uv}) — güneş kremi ve gözlük öner`);
    if (temp !== undefined && temp <= 5) msgs.push(`Hava soğuk: ${Math.round(temp)}°C, mont gerekebilir`);
  }

  if (!msgs.length) msgs.push('Her şey sakin görünüyor');
  return msgs;
}

function TickerBar({ messages, hh, mm, time, onOpenManager }) {
  const text = messages.join('   ·   ');
  return (
    <div style={{background:'#000',borderRadius:8,height:34,display:'flex',alignItems:'center',overflow:'hidden'}}>
      <div style={{flexShrink:0,padding:'0 14px',borderRight:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'baseline',gap:6}}>
        <span style={{fontFamily:'Lora,serif',fontSize:14,color:'#fff'}}>{hh}:{mm}</span>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',letterSpacing:'0.04em',whiteSpace:'nowrap'}}>{TR_D[time.getDay()]}, {time.getDate()} {TR_M[time.getMonth()]}</span>
      </div>
      <div style={{flex:1,overflow:'hidden',height:'100%',display:'flex',alignItems:'center',minWidth:0}}>
        <div style={{display:'flex',whiteSpace:'nowrap',animation:'tickerScroll 32s linear infinite'}}>
          <span style={{padding:'0 24px',fontSize:12,color:'rgba(255,255,255,0.55)'}}>{text}</span>
          <span style={{padding:'0 24px',fontSize:12,color:'rgba(255,255,255,0.55)'}}>{text}</span>
        </div>
      </div>
      <button onClick={onOpenManager} title="Widget'ları Düzenle" style={{flexShrink:0,width:34,height:34,border:'none',borderLeft:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.45)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background .2s,color .2s'}}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='rgba(255,255,255,0.75)';}}
        onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='rgba(255,255,255,0.45)';}}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      </button>
      <style>{`@keyframes tickerScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

// ── TODO ──────────────────────────────────────────────────────────────────
function TodoWidget({ onNavigate, getTodos, setTodos }) {
  const today = todayStr(), tomorrow = getDateKey(1);
  const [tab, setTab] = useState('today');
  const [addInput, setAddInput] = useState('');
  const [addPriority, setAddPriority] = useState('medium');
  const [editingKey, setEditingKey] = useState(null);
  const [editText, setEditText] = useState('');
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n+1);
  const [showOverdue, setShowOverdue] = useState(() => localStorage.getItem('gn_show_overdue') !== 'false');

  useEffect(() => {
    const handler = () => setShowOverdue(localStorage.getItem('gn_show_overdue') !== 'false');
    window.addEventListener('storage', handler);
    // aynı sekme için custom event
    window.addEventListener('gn_overdue_changed', handler);
    return () => { window.removeEventListener('storage', handler); window.removeEventListener('gn_overdue_changed', handler); };
  }, []);

  const getTabData = () => {
    const all = getTodos();
    if (tab==='today') return { items: (all[today]||[]).map((t,i)=>({...t,dateKey:today,idx:i})) };
    if (tab==='tomorrow') return { items: (all[tomorrow]||[]).map((t,i)=>({...t,dateKey:tomorrow,idx:i})) };
    const items = [];
    getWeekKeys().forEach(dk => { (all[dk]||[]).forEach((t,i) => items.push({...t,dateKey:dk,idx:i})); });
    return { items };
  };
  const getOverdue = () => {
    const all = getTodos(), items = [];
    Object.entries(all).forEach(([dk,list]) => {
      if (dk>=today) return;
      (list||[]).forEach((t,i) => { if(!t.done) items.push({...t,dateKey:dk,idx:i}); });
    });
    return items.sort((a,b)=>b.dateKey.localeCompare(a.dateKey));
  };
  const getProgress = () => {
    const all = getTodos();
    const list = tab==='week' ? getWeekKeys().flatMap(dk=>all[dk]||[]) : (all[tab==='today'?today:tomorrow]||[]);
    if (!list.length) return null;
    const done = list.filter(t=>t.done).length;
    return { done, total:list.length, pct:Math.round(done/list.length*100) };
  };
  const toggle = (e,dk,idx) => { e.stopPropagation(); const t=getTodos(); if(t[dk]?.[idx]) t[dk][idx].done=!t[dk][idx].done; setTodos(t); refresh(); };
  const setPrio = (e,dk,idx,p) => { e.stopPropagation(); const t=getTodos(); if(t[dk]?.[idx]) t[dk][idx].priority=p; setTodos(t); refresh(); };
  const startEdit = (e,dk,idx,txt) => { e.stopPropagation(); setEditingKey({dk,idx}); setEditText(txt); };
  const saveEdit = (e) => { e.stopPropagation(); if(!editingKey||!editText.trim()){setEditingKey(null);return;} const t=getTodos(); if(t[editingKey.dk]?.[editingKey.idx]) t[editingKey.dk][editingKey.idx].text=editText.trim(); setTodos(t); setEditingKey(null); refresh(); };
  const delTodo = (e,dk,idx) => { e.stopPropagation(); const t=getTodos(); if(t[dk]) t[dk].splice(idx,1); setTodos(t); refresh(); };
  const addTodo = (e) => { e.stopPropagation(); if(!addInput.trim()) return; const dk=tab==='tomorrow'?tomorrow:today; const t=getTodos(); if(!t[dk]) t[dk]=[]; t[dk].push({text:addInput.trim(),done:false,priority:addPriority}); setTodos(t); setAddInput(''); refresh(); };

  const { items } = getTabData();
  const overdue = getOverdue();
  const progress = getProgress();
  const PRIO_ORDER = {high:0,medium:1,low:2};
  const sorted = [...items].sort((a,b) => { if(a.done!==b.done) return a.done?1:-1; return (PRIO_ORDER[a.priority]??1)-(PRIO_ORDER[b.priority]??1); });
  const TR_SHORT = {[today]:'Bugün',[tomorrow]:'Yarın'};
  const fmtDate = (dk) => { if(TR_SHORT[dk]) return TR_SHORT[dk]; const [,m,d]=dk.split('-'); return `${parseInt(d)} ${TR_M[parseInt(m)-1]}`; };

  return (
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2" onClick={e=>e.stopPropagation()}>
        <div onClick={onNavigate} className="text-xs uppercase tracking-wider text-white/60 font-medium cursor-pointer hover:text-white/80">Görevler ›</div>
        <div className="flex gap-1">
          {[['today','Bugün'],['tomorrow','Yarın'],['week','Hafta']].map(([key,label])=>(
            <button key={key} onClick={e=>{e.stopPropagation();setTab(key);}} style={{background:tab===key?'rgba(58,123,213,0.3)':'rgba(255,255,255,0.06)',border:`1px solid ${tab===key?'rgba(58,123,213,0.5)':'rgba(255,255,255,0.1)'}`,color:tab===key?'#93b8f0':'rgba(255,255,255,0.4)',borderRadius:6,padding:'2px 7px',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{label}</button>
          ))}
        </div>
      </div>
      {progress && (
        <div onClick={e=>e.stopPropagation()} className="mb-3">
          <div className="flex justify-between text-[10px] text-white/35 mb-1"><span>{progress.done}/{progress.total} tamamlandı</span><span style={{color:progress.pct===100?'#34d399':'rgba(255,255,255,0.35)'}}>{progress.pct}%</span></div>
          <div style={{height:3,background:'rgba(255,255,255,0.1)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',width:`${progress.pct}%`,borderRadius:2,background:progress.pct===100?'linear-gradient(90deg,#34d399,#10b981)':'linear-gradient(90deg,#3a7bd5,#5a9bf5)',transition:'width .4s ease'}}/></div>
        </div>
      )}
      {showOverdue && tab==='today' && overdue.length>0 && (
        <div onClick={e=>e.stopPropagation()} style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'5px 8px',marginBottom:8}}>
          <div style={{fontSize:10,color:'#fca5a5',fontWeight:500,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:4}}>{overdue.length} gecikmiş görev</div>
          {overdue.slice(0,3).map((t,i)=>(
            <div key={i} className="flex items-center gap-1.5" style={{marginBottom:2}}>
              <div onClick={e=>toggle(e,t.dateKey,t.idx)} style={{width:10,height:10,borderRadius:3,border:'1px solid rgba(252,165,165,0.4)',flexShrink:0,cursor:'pointer',background:t.done?'#ef4444':'transparent'}}/>
              <span style={{fontSize:10,color:'rgba(252,165,165,0.7)',flex:1,textDecoration:t.done?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.text}</span>
              <span style={{fontSize:9,color:'rgba(252,165,165,0.4)',flexShrink:0}}>{fmtDate(t.dateKey)}</span>
            </div>
          ))}
          {overdue.length>3 && <div style={{fontSize:9,color:'rgba(252,165,165,0.4)',marginTop:2}}>+{overdue.length-3} daha…</div>}
        </div>
      )}
      <div onClick={e=>e.stopPropagation()} style={{flex:1,overflowY:'auto',marginBottom:sorted.length?8:0,minHeight:0}} className="custom-scroll">
        {sorted.length===0 ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',padding:'4px 0'}}>Görev yok</div>
          : sorted.map((t,i)=>{
            const pc=PRIORITY_COLORS[t.priority||'medium'];
            const isEditing=editingKey?.dk===t.dateKey&&editingKey?.idx===t.idx;
            return (
              <div key={`${t.dateKey}-${t.idx}`} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 6px',marginBottom:2,borderRadius:5,borderLeft:`3px solid ${pc.dot}`,background:'rgba(255,255,255,0.025)',opacity:t.done?0.5:1}}>
                <div onClick={e=>toggle(e,t.dateKey,t.idx)} style={{width:12,height:12,borderRadius:3,border:t.done?'none':'1px solid rgba(255,255,255,0.3)',background:t.done?'#3a7bd5':'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {t.done&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                {isEditing
                  ? <input autoFocus value={editText} onClick={e=>e.stopPropagation()} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveEdit(e);if(e.key==='Escape'){e.stopPropagation();setEditingKey(null);}}} onBlur={saveEdit} style={{flex:1,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#e8edf5',outline:'none',borderRadius:4,padding:'1px 6px',fontSize:11,minWidth:0}}/>
                  : <span onDoubleClick={e=>startEdit(e,t.dateKey,t.idx,t.text)} style={{flex:1,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.done?'rgba(255,255,255,0.25)':'rgba(232,237,245,0.85)',textDecoration:t.done?'line-through':'none',cursor:'default'}}>{t.text}</span>
                }
                <select
                  value={t.priority||'medium'}
                  onChange={e=>setPrio(e,t.dateKey,t.idx,e.target.value)}
                  onClick={e=>e.stopPropagation()}
                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:pc.dot,fontSize:9,fontWeight:500,borderRadius:5,padding:'1px 3px',cursor:'pointer',flexShrink:0,fontFamily:'inherit'}}
                >
                  <option value="high" style={{color:'#ef4444'}}>Yüksek</option>
                  <option value="medium" style={{color:'#f59e0b'}}>Orta</option>
                  <option value="low" style={{color:'#a78bfa'}}>Düşük</option>
                </select>
                {tab==='week'&&<span style={{fontSize:9,color:'rgba(255,255,255,0.25)',flexShrink:0}}>{fmtDate(t.dateKey)}</span>}
                {!isEditing&&<button onClick={e=>startEdit(e,t.dateKey,t.idx,t.text)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',padding:'0 1px',lineHeight:1,flexShrink:0,fontSize:10}}>✎</button>}
                <button onClick={e=>delTodo(e,t.dateKey,t.idx)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.25)',cursor:'pointer',padding:'0 1px',lineHeight:1,flexShrink:0,fontSize:13}}>×</button>
              </div>
            );
          })
        }
      </div>
      <div onClick={e=>e.stopPropagation()} style={{display:'flex',gap:5,alignItems:'center',marginTop:4}}>
        <select
          value={addPriority}
          onChange={e=>{e.stopPropagation();setAddPriority(e.target.value);}}
          onClick={e=>e.stopPropagation()}
          style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',color:PRIORITY_COLORS[addPriority].dot,fontSize:10,fontWeight:500,borderRadius:7,padding:'4px 4px',cursor:'pointer',flexShrink:0,fontFamily:'inherit',width:62}}
        >
          <option value="high" style={{color:'#ef4444'}}>Yüksek</option>
          <option value="medium" style={{color:'#f59e0b'}}>Orta</option>
          <option value="low" style={{color:'#a78bfa'}}>Düşük</option>
        </select>
        <input value={addInput} onChange={e=>{e.stopPropagation();setAddInput(e.target.value);}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')addTodo(e);}} onClick={e=>e.stopPropagation()} placeholder={tab==='tomorrow'?'Yarın için görev ekle...':'Görev ekle...'} style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(232,237,245,0.8)',outline:'none',borderRadius:7,padding:'4px 8px',fontSize:11,fontFamily:'inherit',minWidth:0}}/>
        <button onClick={addTodo} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(232,237,245,0.5)',width:24,height:24,borderRadius:7,fontSize:14,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
      </div>
    </div>
  );
}

// ── HEDEFLER ──────────────────────────────────────────────────────────────
function GoalsWidget({ db, onNavigate }) {
  const [period, setPeriod] = useState('weekly');
  const totalBooks = db.b?.length || 0;
  const totalFilms = db.f?.length || 0;
  const goals = (db.g || []).filter(g => g.period === period && isGoalActive(g)).slice(0, 4);
  const R = 28, CX = 32, CY = 32, STROKE = 5, CIRC = 2 * Math.PI * R;

  return (
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div onClick={onNavigate} className="text-xs uppercase tracking-wider text-white/60 font-medium cursor-pointer hover:text-white/80">Hedefler ›</div>
        <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
          {[['weekly','H'],['monthly','A'],['yearly','Y']].map(([p,l])=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{width:30,height:30,borderRadius:8,border:`1px solid ${period===p?'rgba(58,123,213,0.5)':'rgba(255,255,255,0.1)'}`,background:period===p?'rgba(58,123,213,0.15)':'rgba(255,255,255,0.05)',color:period===p?'#7ab8f5':'rgba(232,237,245,0.5)',fontSize:12,fontWeight:600,cursor:'pointer'}}>{l}</button>
          ))}
        </div>
      </div>
      {goals.length === 0
        ? <div className="text-xs text-white/30">Hedef yok</div>
        : (
          <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(goals.length,4)},1fr)`,gap:8}}>
            {goals.map((g,i)=>{
              const isBook=g.track==='book', isFilm=g.track==='film';
              const cur = isBook?totalBooks:isFilm?totalFilms:(parseFloat(g.current)||0);
              const tgt = parseFloat(g.target)||0;
              const pct = tgt?Math.min(1,cur/tgt):0;
              const done = cur>=tgt && tgt>0;
              const offset = CIRC*(1-pct);
              const color = done?'#34d399':(g.color||'#3a7bd5');
              return (
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE}/>
                    <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={STROKE}
                      strokeDasharray={CIRC} strokeDashoffset={done?0:offset}
                      strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`}/>
                    {done
                      ? <path d="M22 32 L29 39 L42 25" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      : <text x={CX} y={CY+4} textAnchor="middle" fill={color} fontSize="11" fontFamily="Lora,serif">{Math.round(pct*100)}%</text>
                    }
                  </svg>
                  <div style={{fontSize:11,color:done?'#34d399':'rgba(232,237,245,0.55)',fontFamily:'Lora,serif'}}>{cur}/{tgt}</div>
                  <div style={{fontSize:10,color:'rgba(232,237,245,0.3)',textAlign:'center',maxWidth:64,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ── KRONOMETRE ────────────────────────────────────────────────────────────
function StopwatchWidget({ swElapsed, swRunning, swLog, onToggle, onReset, onNavigate, isNarrow }) {
  const fmt = (ms) => {
    const t = Math.max(0,ms);
    const h=Math.floor(t/3600000), m=Math.floor((t%3600000)/60000), s=Math.floor((t%60000)/1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const today = todayStr();
  const todaySessions = (swLog||[]).filter(e=>e.date===today);
  const SESS_COLORS = ['#3a7bd5','#7b5ea7','#34d399','#fb923c','#f87171','#60a5fa','#e879f9','#facc15'];
  const ROW_H = 25; // her seans satırının yaklaşık yüksekliği (gap dahil)
  const MAX_VISIBLE = 4;

  const controls = (
    <div style={{display:'flex',gap:6}}>
      <button onClick={e=>{e.stopPropagation();onToggle(e);}} style={{width:28,height:28,borderRadius:8,border:swRunning?'1px solid rgba(239,68,68,0.4)':'1px solid rgba(255,255,255,0.15)',background:swRunning?'rgba(239,68,68,0.1)':'rgba(255,255,255,0.07)',color:swRunning?'#f87171':'rgba(232,237,245,0.7)',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',lineHeight:1,flexShrink:0}}>
        {swRunning?'⏸':'▶'}
      </button>
      <button onClick={e=>{e.stopPropagation();onReset(e);}} style={{width:28,height:28,borderRadius:8,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.07)',color:'rgba(232,237,245,0.7)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',lineHeight:1,flexShrink:0}}>
        ↺
      </button>
    </div>
  );

  return (
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:bg-black/40 transition-colors h-full w-full flex flex-col">
      <div style={{padding:'14px 16px',flex:1,display:'flex',flexDirection:'column',minHeight:0}}>

        {isNarrow ? (
          // ── DAR DÜZEN: etiket üstte, sayaç+kontroller altında tam genişlik ──
          <div style={{marginBottom: todaySessions.length?12:0}}>
            <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em',color:'rgba(255,255,255,0.6)',fontWeight:500,marginBottom:8}}>Kronometre</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
              <div style={{fontSize:26,color:'#e8edf5',fontFamily:'Lora,serif',letterSpacing:-1,fontVariantNumeric:'tabular-nums'}}>{fmt(swElapsed)}</div>
              {controls}
            </div>
          </div>
        ) : (
          // ── GENİŞ DÜZEN: Kronometre solda, zaman + kontroller ortada ──
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',marginBottom: todaySessions.length?12:0}}>
            <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em',color:'rgba(255,255,255,0.6)',fontWeight:500}}>Kronometre</div>
            <div style={{display:'flex',alignItems:'center',gap:14,justifySelf:'center'}}>
              <div style={{fontSize:30,color:'#e8edf5',fontFamily:'Lora,serif',letterSpacing:-1,fontVariantNumeric:'tabular-nums'}}>{fmt(swElapsed)}</div>
              {controls}
            </div>
            <div/>
          </div>
        )}

        {/* Bugünkü seans listesi — 4'ten fazlaysa kaydırılabilir */}
        {todaySessions.length>0 && (
          <>
            <div style={{height:1,background:'rgba(255,255,255,0.06)',marginBottom:10}}/>
            <div
              onClick={e=>e.stopPropagation()}
              onWheel={e=>e.stopPropagation()}
              style={{
                display:'flex',flexDirection:'column',gap:7,
                flex:1,
                maxHeight: todaySessions.length>MAX_VISIBLE ? ROW_H*MAX_VISIBLE : 'none',
                overflowY: 'auto',
                paddingRight:6,
                cursor:'default',
                minHeight:0,
              }}
              className="sw-session-scroll"
            >
              {todaySessions.map((s,i)=>{
                const color = SESS_COLORS[i%SESS_COLORS.length];
                const isOngoing = i===0 && swRunning;
                const durMin = Math.round((s.dur||0)/60000);
                return (
                  <div key={s.id||i} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color: isOngoing?'#34d399':'rgba(255,255,255,0.45)',flexShrink:0}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background: isOngoing?'#34d399':color,display:'inline-block',flexShrink:0,animation: isOngoing?'swPulse 1.5s ease-in-out infinite':'none'}}/>
                    <span>{s.start} – {isOngoing?'devam ediyor':(s.end||'—')}</span>
                    <span style={{marginLeft:'auto',color: isOngoing?'#34d399':'rgba(255,255,255,0.3)'}}>{durMin}dk</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
      <style>{`
        @keyframes swPulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sw-session-scroll::-webkit-scrollbar{width:3px}
        .sw-session-scroll::-webkit-scrollbar-track{background:transparent}
        .sw-session-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px}
      `}</style>
    </div>
  );
}

// ── ZİNCİR ────────────────────────────────────────────────────────────────
function ChainWidget({ chains, onNavigate }) {
  const SEGS = 20;
  return (
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors h-full w-full flex flex-col overflow-hidden">
      <WidgetTitle>Zincir Kırma ›</WidgetTitle>
      {chains.length===0
        ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>Alışkanlık yok</div>
        : chains.slice(0,4).map((ch,i)=>{
          const { streak } = calcChainStreak(ch);
          const target = ch.target||30;
          const filled = Math.round((streak/target)*SEGS);
          return (
            <div key={i} style={{marginBottom:i<Math.min(chains.length,4)-1?12:0}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:ch.color||'#3a7bd5',flexShrink:0}}/>
                <span style={{fontSize:12,color:'rgba(232,237,245,0.75)',flex:1}}>{ch.name}</span>
                <span style={{fontSize:12,color:'rgba(232,237,245,0.4)',fontFamily:'Lora,serif'}}>{streak} gün</span>
              </div>
              <div style={{display:'flex',gap:3}}>
                {Array.from({length:SEGS},(_,j)=>(
                  <div key={j} style={{flex:1,height:3,borderRadius:2,background:j<filled?(ch.color||'#3a7bd5'):'rgba(255,255,255,0.08)'}}/>
                ))}
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

// ── KİTAPLAR ─────────────────────────────────────────────────────────────
function BookWidget({ books, onNavigate }) {
  const minP=80,maxP=1400,minW=24,maxW=46,minH=75,maxH=125;
  const readCount = books.length;
  const spines = books.map(b=>{
    const p=parseInt(b.pages)||200;
    const r=Math.min(1,Math.max(0,(p-minP)/(maxP-minP)));
    const W=Math.round(minW+r*(maxW-minW)), H=Math.round(minH+r*(maxH-minH));
    const fs=Math.max(7,Math.min(10,W*0.32));
    const lineH=fs*1.4, maxTW=H-14;
    const words=b.name.split(' ');
    const lines=[];let cur='';
    const cpp=Math.floor(maxTW/(fs*0.58));
    words.forEach(w=>{ const t=cur?cur+' '+w:w; if(t.length<=cpp){cur=t;}else{if(cur)lines.push(cur);cur=w;} });
    if(cur)lines.push(cur);
    const totalTH=lines.length*lineH;
    const startY=H/2-totalTH/2+fs*0.85;
    const tspans=lines.map((l,i)=>`<tspan x="${W/2}" y="${startY+i*lineH}">${l}</tspan>`).join('');
    return {W,H,color:b.color||'#2a3a5a',tspans,fs,isReading:b.status==='reading',name:b.name};
  });

  return (
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors overflow-hidden h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-white/60 font-medium">Kitaplar ›</div>
        <div style={{fontSize:11,color:'rgba(232,237,245,0.3)'}}><span style={{fontSize:14,color:'rgba(232,237,245,0.65)',fontFamily:'Lora,serif',marginRight:3}}>{readCount}</span>okundu</div>
      </div>
      {books.length===0
        ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',padding:'8px 0'}}>Kitap yok</div>
        : <div style={{display:'flex',alignItems:'flex-end',gap:4,flex:1,minHeight:75,overflowX:'auto',paddingBottom:4,borderBottom:'1px solid rgba(255,255,255,0.05)',scrollbarWidth:'none'}}>
            {spines.map((s,i)=>(
              <svg key={i} width={s.W} height={s.H} viewBox={`0 0 ${s.W} ${s.H}`}
                style={{flexShrink:0,borderRadius:3,cursor:'pointer',transition:'transform .2s,filter .2s',display:'block',background:s.color,outline:s.isReading?'1.5px solid rgba(255,255,255,0.3)':'none'}}
                title={s.name}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.filter='brightness(1.3)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.filter='';}}>
                <text transform={`rotate(-90 ${s.W/2} ${s.H/2})`} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={s.fs} fontFamily="system-ui,sans-serif" fontWeight="500" dangerouslySetInnerHTML={{__html:s.tspans}}/>
              </svg>
            ))}
          </div>
      }
    </div>
  );
}

// ── TAKVİM ────────────────────────────────────────────────────────────────
function CalendarWidget({ db, getTodos, getNotes, onNavigate }) {
  const today = todayStr();
  const [y, m] = today.split('-').map(Number);
  const firstDay = new Date(y, m-1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  const todos = getTodos();
  const notes = getNotes();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
  }
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailing; i++) cells.push(null);

  const specColors = loadSpecColors();
  const getDayDots = (ds) => {
    if (!ds) return [];
    const dayNotes = Array.isArray(notes[ds]) ? notes[ds] : (notes[ds] ? [notes[ds]] : []);
    const noteColors = [...new Set(dayNotes.map(n => (typeof n === 'object' && n.color) ? n.color : '#3a7bd5'))];
    const specials = getSpecialDays(ds, db.s || []);
    const customSpecsWithColor = specials.filter(s => s.t==='custom' && s.color);
    const specDots = [
      specials.some(s=>s.t==='h'||s.t==='b') && { color: specColors.h },
      specials.some(s=>s.t==='r') && { color: specColors.r },
      specials.some(s=>(s.t==='i'||s.t==='a'||s.t==='custom') && !s.color) && { color: specColors.i },
      ...customSpecsWithColor.map(s => ({ color: s.color })),
    ].filter(Boolean);
    return [...specDots, ...noteColors.map(c => ({ color: c }))];
  };

  const upcoming = [];
  for (let off = 0; off < 14 && upcoming.length < 3; off++) {
    const dt = new Date(); dt.setDate(dt.getDate()+off);
    const ds = dt.toISOString().split('T')[0];
    const dayTodos = (todos[ds]||[]).filter(t=>!t.done);
    const specials = getSpecialDays(ds, db.s || []);
    if (dayTodos.length || specials.length) {
      upcoming.push({ ds, dayTodos, specials, isToday: ds===today });
    }
  }

  const WD = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];
  const fmtShort = (ds) => { const [,mo,da]=ds.split('-'); return `${parseInt(da)} ${TR_M[parseInt(mo)-1]}`; };

  return (
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-white/60 font-medium">Takvim ›</div>
        <div style={{fontSize:11,color:'rgba(232,237,245,0.3)'}}>{TR_M[m-1]}</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',rowGap:3,marginBottom:10}}>
        {WD.map(w=>(
          <div key={w} style={{textAlign:'center',fontSize:8,color:'rgba(232,237,245,0.25)',letterSpacing:'.05em',paddingBottom:4}}>{w}</div>
        ))}
        {cells.map((ds,i)=>{
          if (!ds) return <div key={`e-${i}`}/>;
          const day = parseInt(ds.split('-')[2]);
          const isToday = ds===today;
          const dayDots = getDayDots(ds);
          return (
            <div key={ds} style={{
              display:'flex',alignItems:'center',justifyContent:'center',
              height:22,borderRadius:6,fontSize:10,position:'relative',
              background: isToday?'rgba(58,123,213,0.3)':'transparent',
              color: isToday?'#93b8f0':'rgba(232,237,245,0.55)',
              fontWeight: isToday?600:400,
            }}>
              {day}
              {dayDots.length>0 && (
                <div style={{position:'absolute',bottom:2,left:'50%',transform:'translateX(-50%)',display:'flex',gap:2}}>
                  {dayDots.slice(0,3).map((dot,di)=>(
                    <div key={di} style={{width:3,height:3,borderRadius:'50%',background:dot.color}}/>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:8,flex:1,overflowY:'auto',minHeight:0}} className="custom-scroll">
        {upcoming.length===0
          ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>Yaklaşan etkinlik yok</div>
          : upcoming.map((u,i)=>(
            <div key={u.ds} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:i<upcoming.length-1?'1px solid rgba(255,255,255,0.04)':'none'}}>
              <span style={{fontSize:10,color:u.isToday?'#7ab8f5':'rgba(232,237,245,0.35)',fontWeight:u.isToday?600:400,flexShrink:0,width:42}}>
                {u.isToday?'Bugün':fmtShort(u.ds)}
              </span>
              <span style={{fontSize:11,color:'rgba(232,237,245,0.7)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                {u.specials[0]?.n || u.dayTodos[0]?.text}
              </span>
              {(u.dayTodos.length + u.specials.length) > 1 && (
                <span style={{fontSize:9,color:'rgba(232,237,245,0.25)',flexShrink:0}}>+{u.dayTodos.length + u.specials.length - 1}</span>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── WIDGET YÖNETİCİSİ ────────────────────────────────────────────────────
function WidgetManager({ visible, order, onClose, onToggle, onReorder }) {
  const [dragOver, setDragOver] = useState(null);
  const dragSrc = useRef(null);

  return (
    <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'center',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#141618',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px 20px 0 0',padding:24,width:'100%',maxWidth:600,maxHeight:'70vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div style={{fontSize:13,color:'rgba(232,237,245,0.7)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.08em'}}>Widget'ları Düzenle</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(232,237,245,0.4)',fontSize:20,cursor:'pointer',lineHeight:1}}>×</button>
        </div>
        <div style={{fontSize:10,color:'rgba(232,237,245,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>Sıra & Görünürlük</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {order.map((id,i)=>(
            <div key={id}
              draggable
              onDragStart={()=>{dragSrc.current=i;}}
              onDragOver={e=>{e.preventDefault();setDragOver(i);}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={()=>{if(dragSrc.current!==null&&dragSrc.current!==i){const o=[...order];const [item]=o.splice(dragSrc.current,1);o.splice(i,0,item);onReorder(o);}setDragOver(null);dragSrc.current=null;}}
              onDragEnd={()=>{setDragOver(null);dragSrc.current=null;}}
              style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:12,background:dragOver===i?'rgba(58,123,213,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${dragOver===i?'rgba(58,123,213,0.3)':'rgba(255,255,255,0.07)'}`,cursor:'grab',transition:'all .15s'}}
            >
              <div style={{display:'flex',flexDirection:'column',gap:3,opacity:0.35}}>
                <div style={{width:14,height:1.5,background:'currentColor',borderRadius:1}}/>
                <div style={{width:14,height:1.5,background:'currentColor',borderRadius:1}}/>
                <div style={{width:14,height:1.5,background:'currentColor',borderRadius:1}}/>
              </div>
              <div style={{flex:1,fontSize:13,color:'rgba(232,237,245,0.75)'}}>{WIDGET_LABELS[id]}</div>
              <button onClick={()=>onToggle(id)} style={{padding:'4px 12px',borderRadius:8,border:`1px solid ${visible.includes(id)?'rgba(239,68,68,0.3)':'rgba(58,123,213,0.3)'}`,background:visible.includes(id)?'rgba(239,68,68,0.08)':'rgba(58,123,213,0.08)',color:visible.includes(id)?'#f87171':'#7ab8f5',fontSize:11,cursor:'pointer'}}>
                {visible.includes(id)?'Gizle':'Göster'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── window._sw ────────────────────────────────────────────────────────────
if (!window._sw) window._sw = { running:false, startTime:null, elapsed:parseInt(localStorage.getItem('gn_sw_elapsed')||'0'), sessionStartLabel:null, sessionStartMs:null };

export default function Home() {
  const { db, setCurrentPage, getTodos, setTodos, getNotes, getChains, swState, swLog, widgetSizes, setWidgetSize, widgetPositions, setWidgetPositions } = useStore();
  const [time, setTime] = useState(new Date());
  const [bgPhoto, setBgPhoto] = useState('');
  const [swElapsed, setSwElapsed] = useState(()=>parseInt(localStorage.getItem('gn_sw_elapsed')||'0'));
  const [swRunning, setSwRunning] = useState(()=>localStorage.getItem('gn_sw_running')==='1');
  const [widgetOrder, setWidgetOrder] = useState(loadWidgetOrder);
  const [widgetVisible, setWidgetVisible] = useState(loadWidgetVisible);
  const [showManager, setShowManager] = useState(false);
  const [isMobile, setIsMobile] = useState(()=>typeof window!=='undefined' && window.innerWidth < 640);
  const gridRef = useRef(null);
  const [resizing, setResizing] = useState(null); // { id, startX, startY, startCol, startRow }
  const [liveSize, setLiveSize] = useState(null); // sürüklenirken anlık önizleme: { id, col, row }
  const [moving, setMoving] = useState(null); // { id, startX, startY, colWidth }
  const [dropTarget, setDropTarget] = useState(null); // { col, row } — sürüklenen widget'ın anlık hedef hücresi

  useEffect(()=>{ const idx=Math.floor(Math.random()*PHOTOS.length); setBgPhoto(PHOTOS[idx]); },[]);

  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return ()=>window.removeEventListener('resize', onResize);
  },[]);

  useEffect(()=>{
    if(!swState) return;
    if(swState.running&&swState.startTime){ if(!window._sw)window._sw={}; window._sw.running=true; window._sw.startTime=swState.startTime; setSwRunning(true); }
    else if(swState.running===false){ if(!window._sw)window._sw={}; window._sw.running=false; window._sw.startTime=null; if(swState.elapsed!==undefined){window._sw.elapsed=swState.elapsed;setSwElapsed(swState.elapsed);} setSwRunning(false); }
  },[swState]);

  useEffect(()=>{ const t=setInterval(()=>setTime(new Date()),1000); return()=>clearInterval(t); },[]);

  useEffect(()=>{
    if(swRunning){ const t=setInterval(()=>{ const e=window._sw.startTime?Date.now()-window._sw.startTime:window._sw.elapsed; setSwElapsed(e); },100); return()=>clearInterval(t); }
  },[swRunning]);

  const toggleSw = (e) => {
    e.stopPropagation();
    if(!window._sw) window._sw={running:false,startTime:null,elapsed:parseInt(localStorage.getItem('gn_sw_elapsed')||'0'),sessionStartMs:null,sessionStartLabel:null};
    if(window._sw.running){
      const elapsed=Date.now()-window._sw.startTime;
      const sessionStart=window._sw.sessionStartMs||window._sw.startTime||Date.now();
      const partDur=Math.max(0,Date.now()-sessionStart);
      const getNow=()=>{const n=new Date();return`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;};
      const today=new Date().toISOString().split('T')[0];
      window._sw.elapsed=elapsed; window._sw.running=false; window._sw.startTime=null; window._sw.sessionStartMs=null;
      localStorage.setItem('gn_sw_elapsed',elapsed); localStorage.removeItem('gn_sw_running'); localStorage.removeItem('gn_sw_startTime');
      if(window._fbUser){import('../../lib/firebase').then(({saveToFirestore})=>{saveToFirestore(window._fbUser.uid,{gn_sw_elapsed:elapsed,gn_sw_running:false,gn_sw_startTime:null});});}
      // Log kaydı ekle
      const newEntry={id:Date.now(),date:today,start:window._sw.sessionStartLabel||'—',end:getNow(),dur:partDur,note:''};
      window._sw.sessionStartLabel=null;
      const currentLog=JSON.parse(localStorage.getItem('gn_sw_log')||'[]');
      const newLog=[newEntry,...currentLog];
      localStorage.setItem('gn_sw_log',JSON.stringify(newLog));
      if(window._fbUser){import('../../lib/firebase').then(({saveToFirestore})=>{saveToFirestore(window._fbUser.uid,{gn_sw_log:newLog});});}
      useStore.getState().setSwLog(newLog);
      setSwRunning(false);
    } else {
      const startTime=Date.now()-window._sw.elapsed;
      const getNow=()=>{const n=new Date();return`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;};
      window._sw.startTime=startTime; window._sw.running=true;
      window._sw.sessionStartMs=Date.now(); window._sw.sessionStartLabel=getNow();
      localStorage.setItem('gn_sw_running','1'); localStorage.setItem('gn_sw_startTime',startTime);
      if(window._fbUser){import('../../lib/firebase').then(({saveToFirestore})=>{saveToFirestore(window._fbUser.uid,{gn_sw_startTime:startTime,gn_sw_running:true});});}
      setSwRunning(true);
    }
  };

  const resetSw = (e) => {
    e.stopPropagation();
    window._sw.running=false; window._sw.elapsed=0; window._sw.startTime=null;
    localStorage.setItem('gn_sw_elapsed','0'); setSwElapsed(0); setSwRunning(false);
  };

  const handleWidgetToggle = (id) => {
    const nv = widgetVisible.includes(id) ? widgetVisible.filter(v=>v!==id) : [...widgetVisible,id];
    setWidgetVisible(nv); saveWidgetVisible(nv);
  };
  const handleWidgetReorder = (newOrder) => { setWidgetOrder(newOrder); saveWidgetOrder(newOrder); };

  // ── RESIZE ────────────────────────────────────────────────────────────
  const mode = isMobile ? 'mobile' : 'desktop';
  const cols = isMobile ? MOBILE_COLS : DESKTOP_COLS;
  const rowUnit = isMobile ? ROW_UNIT_MOBILE : ROW_UNIT_DESKTOP;
  const lim = SIZE_LIMITS[mode];

  const handleResizeStart = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const colWidth = (grid.clientWidth - GAP*(cols-1)) / cols;
    const current = getWidgetSize(mode, id, widgetSizes);
    const startX = e.clientX, startY = e.clientY;
    setResizing({ id, startX, startY, startCol: current.col, startRow: current.row, colWidth });
    setLiveSize({ id, col: current.col, row: current.row });
  };

  useEffect(()=>{
    if(!resizing) return;
    const onMove = (e) => {
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      const deltaCol = Math.round(dx / (resizing.colWidth + GAP));
      const deltaRow = Math.round(dy / (rowUnit + GAP));
      const newCol = Math.min(lim.maxCol, Math.max(lim.minCol, resizing.startCol + deltaCol));
      const newRow = Math.min(lim.maxRow, Math.max(lim.minRow, resizing.startRow + deltaRow));
      setLiveSize({ id: resizing.id, col: newCol, row: newRow });
    };
    const onUp = () => {
      setLiveSize(curr => {
        if (curr) setWidgetSize(mode, curr.id, { col: curr.col, row: curr.row });
        return null;
      });
      setResizing(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  },[resizing, rowUnit, lim, mode, setWidgetSize]);

  const sizeFor = (id) => {
    if (liveSize && liveSize.id === id) return { col: liveSize.col, row: liveSize.row };
    return getWidgetSize(mode, id, widgetSizes);
  };

  // ── LAYOUT (pozisyonlar) ─────────────────────────────────────────────
  const layout = computeLayout(widgetOrder, widgetVisible, mode, widgetSizes, widgetPositions);
  // Resize sırasında anlık boyutu layout'a yansıt (pozisyon sabit kalır)
  if (liveSize) {
    const lp = layout[liveSize.id];
    if (lp) lp.size = { col: liveSize.col, row: liveSize.row };
  }

  const positionFor = (id) => layout[id]?.position || { col:1, row:1 };

  // ── TAŞIMA (drag & swap) ─────────────────────────────────────────────
  const handleMoveStart = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const colWidth = (grid.clientWidth - GAP*(cols-1)) / cols;
    setMoving({ id, startX: e.clientX, startY: e.clientY, colWidth, gridRect: grid.getBoundingClientRect() });
  };

  useEffect(()=>{
    if(!moving) return;
    const onMove = (e) => {
      const rect = moving.gridRect;
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const col = Math.min(cols, Math.max(1, Math.floor(relX / (moving.colWidth + GAP)) + 1));
      const row = Math.min(200, Math.max(1, Math.floor(relY / (rowUnit + GAP)) + 1));
      setDropTarget({ col, row });
    };
    const onUp = () => {
      setDropTarget(curr => {
        if (curr) {
          const movingId = moving.id;
          const movingSize = getWidgetSize(mode, movingId, widgetSizes);
          // Hedef hücrede başka bir widget var mı? (movingId hariç)
          let targetId = null;
          for (const wid of Object.keys(layout)) {
            if (wid === movingId) continue;
            const p = layout[wid].position, s = layout[wid].size;
            if (curr.col >= p.col && curr.col < p.col + s.col && curr.row >= p.row && curr.row < p.row + s.row) {
              targetId = wid; break;
            }
          }
          const newPositions = { ...(widgetPositions[mode] || {}) };
          // Tüm widget'ların güncel (otomatik dahil) pozisyonlarını yazalım ki tutarlı kalsın
          Object.keys(layout).forEach(wid => { if(!newPositions[wid]) newPositions[wid] = layout[wid].position; });

          if (targetId) {
            // Yer değiştir (swap)
            const a = newPositions[movingId] || layout[movingId].position;
            const b = newPositions[targetId] || layout[targetId].position;
            newPositions[movingId] = b;
            newPositions[targetId] = a;
          } else {
            // Boş hücreye taşı — grid sınırı kontrolü
            const clampedCol = Math.min(curr.col, cols - movingSize.col + 1);
            newPositions[movingId] = { col: Math.max(1,clampedCol), row: curr.row };
          }
          setWidgetPositions(mode, newPositions);
        }
        return null;
      });
      setMoving(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  },[moving, cols, rowUnit, mode, widgetPositions, widgetSizes, layout, setWidgetPositions]);

  const hh=String(time.getHours()).padStart(2,'0'), mm=String(time.getMinutes()).padStart(2,'0');
  const today=todayStr();
  const tomorrow=getDateKey(1);
  const chains=getChains();
  const tickerMessages = buildTickerMessages({ db, todos:getTodos(), chains, swLog, today, tomorrow });

  const renderWidget = (id) => {
    if (!widgetVisible.includes(id)) return null;
    const size = layout[id]?.size || sizeFor(id);
    const position = positionFor(id);
    const isNarrow = size.col <= 1;
    let content;
    switch(id) {
      case 'todos': content = <TodoWidget onNavigate={()=>setCurrentPage('calendar')} getTodos={getTodos} setTodos={setTodos}/>; break;
      case 'goals': content = <GoalsWidget db={db} onNavigate={()=>setCurrentPage('goals')}/>; break;
      case 'stopwatch': content = <StopwatchWidget swElapsed={swElapsed} swRunning={swRunning} swLog={swLog} onToggle={toggleSw} onReset={resetSw} onNavigate={()=>setCurrentPage('clock')} isNarrow={isNarrow}/>; break;
      case 'chains': content = <ChainWidget chains={chains} onNavigate={()=>setCurrentPage('chain')}/>; break;
      case 'books': content = <BookWidget books={db.b||[]} onNavigate={()=>setCurrentPage('books')}/>; break;
      case 'calendar': content = <CalendarWidget db={db} getTodos={getTodos} getNotes={getNotes} onNavigate={()=>setCurrentPage('calendar')}/>; break;
      default: return null;
    }
    const isDragging = moving?.id === id;
    let isDropTarget = false;
    if (moving && moving.id !== id && dropTarget) {
      const p = position, s = size;
      isDropTarget = dropTarget.col >= p.col && dropTarget.col < p.col + s.col && dropTarget.row >= p.row && dropTarget.row < p.row + s.row;
    }
    return (
      <WidgetWrapper key={id} id={id} size={size} position={position} mode={mode} onResizeStart={handleResizeStart} onMoveStart={handleMoveStart} isDragging={isDragging} isDropTarget={isDropTarget}>
        {content}
      </WidgetWrapper>
    );
  };

  return (
    <div className="relative min-h-screen -m-5 md:-m-[26px_30px] overflow-hidden">
      {bgPhoto&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${bgPhoto})`,backgroundSize:'cover',backgroundPosition:'center',zIndex:0}}/>}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(13,15,19,.7) 0%,rgba(13,15,19,.4) 100%)',zIndex:1}}/>

      <div className="relative z-10 p-3 md:p-5 min-h-screen grid grid-rows-[auto_1fr_auto] gap-3">

        {/* Üst şerit: saat/tarih + akıllı bilgi şeridi + widget ayar ikonu */}
        <TickerBar messages={tickerMessages} hh={hh} mm={mm} time={time} onOpenManager={()=>setShowManager(true)}/>

        {/* Widget grid — sabit kolon sayısı, satır birimi rowUnit px */}
        <div
          ref={gridRef}
          style={{
            display:'grid',
            gridTemplateColumns:`repeat(${cols}, 1fr)`,
            gridAutoRows:`${rowUnit}px`,
            gap:GAP,
            alignItems:'stretch',
            userSelect: (resizing || moving) ? 'none' : 'auto',
            position:'relative',
          }}
        >
          {widgetOrder.map(id => renderWidget(id))}
        </div>

      </div>

      {showManager && (
        <WidgetManager
          visible={widgetVisible}
          order={widgetOrder}
          onClose={()=>setShowManager(false)}
          onToggle={handleWidgetToggle}
          onReorder={handleWidgetReorder}
        />
      )}
    </div>
  );
}
