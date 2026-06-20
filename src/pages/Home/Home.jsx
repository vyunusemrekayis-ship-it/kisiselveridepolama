import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, TR_M, TR_D, calcChainStreak, swFmt, isGoalActive, getSpecialDays, fetchPoster, posterCache, wxc, buildWeatherAlerts } from '../../lib/utils';

// ── Widget'ın gerçek piksel boyutunu (genişlik/yükseklik) ölçen ortak hook ──
// Resize tutamacıyla widget büyütülüp küçültüldüğünde, içerik buna göre
// dinamik ölçeklenebilsin diye kullanılır (sabit boşluk kalmaması için).
function useElementSize() {
  const ref = useRef(null);
  const [el, setEl] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0]?.contentRect || {};
      if (width && height) setEl({ width, height });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return [ref, el];
}


const PRIORITY_COLORS = {
  high:   { dot: '#d97a72' },
  medium: { dot: '#f59e0b' },
  low:    { dot: '#a78bfa' },
};


// Özel gün renkleri — Calendar.jsx ile senkron (localStorage: gn_spec_colors)
const DEFAULT_SPEC_COLORS = { h:'#c0392b', r:'#7b5ea7', i:'#2874a6', b:'#c0392b', a:'#7b5ea7', custom:'#3a7bd5' };
function loadSpecColors() {
  try { return { ...DEFAULT_SPEC_COLORS, ...JSON.parse(localStorage.getItem('gn_spec_colors') || '{}') }; } catch { return { ...DEFAULT_SPEC_COLORS }; }
}

const ALL_WIDGET_IDS = ['todos','goals','stopwatch','chains','books','calendar','films','weather'];
const WIDGET_LABELS = { todos:'Görevler', goals:'Hedefler', stopwatch:'Kronometre', chains:'Zincir Kırma', books:'Kitaplar', calendar:'Takvim', films:'Filmler', weather:'Hava Durumu' };

function loadWidgetOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem('gn_widget_order') || JSON.stringify(ALL_WIDGET_IDS));
    // Eski kayıtlarda henüz olmayan yeni widget'ları (örn. films) sona ekle
    const missing = ALL_WIDGET_IDS.filter(id => !saved.includes(id));
    return missing.length ? [...saved, ...missing] : saved;
  } catch { return [...ALL_WIDGET_IDS]; }
}
function loadWidgetVisible() {
  try {
    const saved = JSON.parse(localStorage.getItem('gn_widget_visible') || JSON.stringify(ALL_WIDGET_IDS));
    // Eski kayıtlarda henüz olmayan yeni widget'lar varsayılan olarak görünür sayılsın
    const missing = ALL_WIDGET_IDS.filter(id => !saved.includes(id));
    return missing.length ? [...saved, ...missing] : saved;
  } catch { return [...ALL_WIDGET_IDS]; }
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
    films:    { col: 1, row: 4 },
    weather:  { col: 2, row: 3 },
  },
  mobile: {
    todos:    { col: 2, row: 5 },
    goals:    { col: 2, row: 5 },
    stopwatch:{ col: 2, row: 4 },
    chains:   { col: 2, row: 5 },
    books:    { col: 2, row: 5 },
    calendar: { col: 2, row: 5 },
    films:    { col: 2, row: 5 },
    weather:  { col: 2, row: 4 },
  },
};

const SIZE_LIMITS = {
  desktop: { minCol: 1, maxCol: DESKTOP_COLS, minRow: 1, maxRow: 60 },
  mobile:  { minCol: 1, maxCol: MOBILE_COLS,  minRow: 1, maxRow: 60 },
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

const WIDGET_ACCENT = {
  todos:     '#3a7bd5',
  goals:     '#f59e0b',
  stopwatch: '#34d399',
  chains:    '#f97316',
  books:     '#4a7a5a',
  calendar:  '#7b5ea7',
  films:     '#a06040',
  weather:   '#38bdf8',
};

function WidgetTitle({ children, accent = '#3a7bd5', icon }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:12}}>
      {icon && <div style={{width:20,height:20,borderRadius:6,background:`${accent}22`,border:`1px solid ${accent}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{icon}</div>}
      <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.07em',color:accent,fontWeight:600,flex:1}}>{children}</div>
    </div>
  );
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
  const today = todayStr(), tomorrow = getDateKey(1), yesterday = getDateKey(-1);
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
    return { items: (all[yesterday]||[]).map((t,i)=>({...t,dateKey:yesterday,idx:i})) };
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
    const dk = tab==='today'?today:(tab==='tomorrow'?tomorrow:yesterday);
    const list = all[dk]||[];
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
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2" onClick={e=>e.stopPropagation()}>
        <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}>Görevler ›</WidgetTitle>
        <div className="flex gap-1" style={{marginBottom:8}}>
          {[['yesterday','Dün'],['today','Bugün'],['tomorrow','Yarın']].map(([key,label])=>(
            <button key={key} onClick={e=>{e.stopPropagation();setTab(key);}} style={{background:tab===key?'rgba(58,123,213,0.3)':'rgba(255,255,255,0.04)',border:`1px solid ${tab===key?'rgba(58,123,213,0.5)':'rgba(255,255,255,0.08)'}`,color:tab===key?'#93b8f0':'rgba(255,255,255,0.35)',borderRadius:6,padding:'2px 7px',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{label}</button>
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
        <div onClick={e=>e.stopPropagation()} style={{background:'rgba(217,122,114,0.08)',border:'1px solid rgba(217,122,114,0.2)',borderRadius:8,padding:'5px 8px',marginBottom:8}}>
          <div style={{fontSize:10,color:'#e3a39d',fontWeight:500,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:4}}>{overdue.length} gecikmiş görev</div>
          {overdue.slice(0,3).map((t,i)=>(
            <div key={i} className="flex items-center gap-1.5" style={{marginBottom:2}}>
              <div onClick={e=>toggle(e,t.dateKey,t.idx)} style={{width:10,height:10,borderRadius:3,border:'1px solid rgba(217,122,114,0.4)',flexShrink:0,cursor:'pointer',background:t.done?'#d97a72':'transparent'}}/>
              <span style={{fontSize:10,color:'rgba(217,122,114,0.8)',flex:1,textDecoration:t.done?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.text}</span>
              <span style={{fontSize:9,color:'rgba(217,122,114,0.45)',flexShrink:0}}>{fmtDate(t.dateKey)}</span>
            </div>
          ))}
          {overdue.length>3 && <div style={{fontSize:9,color:'rgba(217,122,114,0.45)',marginTop:2}}>+{overdue.length-3} daha…</div>}
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
                  <option value="high" style={{color:'#d97a72'}}>Yüksek</option>
                  <option value="medium" style={{color:'#f59e0b'}}>Orta</option>
                  <option value="low" style={{color:'#a78bfa'}}>Düşük</option>
                </select>
                {tab==='yesterday'&&<span style={{fontSize:9,color:'rgba(255,255,255,0.25)',flexShrink:0}}>{fmtDate(t.dateKey)}</span>}
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
          <option value="high" style={{color:'#d97a72'}}>Yüksek</option>
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
function GoalsWidget({ db, onNavigate, size }) {
  const [period, setPeriod] = useState('weekly');
  const totalBooks = db.b?.length || 0;
  const totalFilms = db.f?.length || 0;
  const goals = (db.g || []).filter(g => g.period === period && isGoalActive(g)).slice(0, 4);
  // Ring boyutu, içerik alanının GERÇEK piksel boyutuna göre hesaplanır (ResizeObserver) —
  // widget büyütülünce ringler boşluk kalmadan alanı doldurur.
  const [areaRef, area] = useElementSize();
  const cols = Math.max(1, Math.min(goals.length, 4));
  // Her ring hücresi yaklaşık kare; genişlik ve yükseklikten küçük olanı baz al
  const cellW = area.width ? area.width / cols - 8 : 64;
  const cellH = area.height || 64;
  const SVG_SIZE = Math.max(36, Math.round(Math.min(cellW, cellH)));
  const R = Math.round(SVG_SIZE * 0.4375), CX = SVG_SIZE/2, CY = SVG_SIZE/2, STROKE = Math.max(3, Math.round(SVG_SIZE * 0.078)), CIRC = 2 * Math.PI * R;
  const fontSize = Math.max(9, Math.round(SVG_SIZE * 0.17));
  const labelFontSize = Math.max(9, Math.round(SVG_SIZE * 0.155));
  const valueFontSize = Math.max(9, Math.round(SVG_SIZE * 0.17));

  return (
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}>Hedefler ›</WidgetTitle>
        <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
          {[['weekly','H'],['monthly','A'],['yearly','Y']].map(([p,l])=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{width:30,height:30,borderRadius:8,border:`1px solid ${period===p?'rgba(58,123,213,0.5)':'rgba(255,255,255,0.1)'}`,background:period===p?'rgba(58,123,213,0.15)':'rgba(255,255,255,0.05)',color:period===p?'#7ab8f5':'rgba(232,237,245,0.5)',fontSize:12,fontWeight:600,cursor:'pointer'}}>{l}</button>
          ))}
        </div>
      </div>
      {goals.length === 0
        ? <div className="text-xs text-white/30">Hedef yok</div>
        : (
          <div ref={areaRef} style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:8,flex:1,alignItems:'center',justifyItems:'center',minHeight:0}}>
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
                  <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
                    <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE}/>
                    <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={STROKE}
                      strokeDasharray={CIRC} strokeDashoffset={done?0:offset}
                      strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`}/>
                    {done
                      ? <path d="M22 32 L29 39 L42 25" fill="none" stroke="#3a7bd5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${CX-32} ${CY-32})`}/>
                      : <text x={CX} y={CY+fontSize*0.36} textAnchor="middle" fill={color} fontSize={fontSize} fontFamily="Lora,serif">{Math.round(pct*100)}%</text>
                    }
                  </svg>
                  <div style={{fontSize:valueFontSize,color:done?'#34d399':'rgba(232,237,245,0.55)',fontFamily:'Lora,serif'}}>{cur}/{tgt}</div>
                  <div style={{fontSize:labelFontSize,color:'rgba(232,237,245,0.3)',textAlign:'center',maxWidth:SVG_SIZE,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</div>
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
function StopwatchWidget({ swElapsed, swRunning, swLog, onToggle, onReset, onNavigate, isNarrow, size }) {
  const fmt = (ms) => {
    const t = Math.max(0,ms);
    const h=Math.floor(t/3600000), m=Math.floor((t%3600000)/60000), s=Math.floor((t%60000)/1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const today = todayStr();
  const todaySessions = (swLog||[]).filter(e=>e.date===today);
  const SESS_COLORS = ['#3a7bd5','#7b5ea7','#34d399','#fb923c','#f87171','#60a5fa','#e879f9','#facc15'];
  const liveSession = swRunning ? {
    id: '__live__',
    start: window._sw.sessionStartLabel || '—',
    live: true,
  } : null;
  const displaySessions = liveSession ? [liveSession, ...todaySessions] : todaySessions;
  const ROW_H = 25; // her seans satırının yaklaşık yüksekliği (gap dahil)
  // Boyut büyüdükçe sayaç yazısı ve görünür seans sayısı, konteynerin GERÇEK piksel
  // yüksekliğine göre büyür (ResizeObserver) — sabit boşluk kalmaz.
  const [bodyRef, body] = useElementSize();
  const baseH = isNarrow ? 110 : 90; // yaklaşık varsayılan içerik yüksekliği
  const heightScale = Math.max(0.7, Math.min(2.8, (body.height || baseH) / baseH));
  const clockFontSize = Math.round((isNarrow ? 26 : 30) * heightScale);
  const MAX_VISIBLE = Math.max(2, Math.round(4 * heightScale));

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
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer hover:bg-surface3 transition-colors h-full w-full flex flex-col">
      <div ref={bodyRef} style={{padding:'14px 16px',flex:1,display:'flex',flexDirection:'column',minHeight:0}}>

        {isNarrow ? (
          // ── DAR DÜZEN: etiket üstte, sayaç+kontroller altında tam genişlik ──
          <div style={{marginBottom: displaySessions.length?12:0}}>
            <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 1.5"/><path d="M10 3h4"/></svg>}>Kronometre</WidgetTitle>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
              <div style={{fontSize:clockFontSize,color:swRunning?'#34d399':'#e8edf5',fontFamily:'Lora,serif',letterSpacing:-1,fontVariantNumeric:'tabular-nums',transition:'color .3s'}}>{fmt(swElapsed)}</div>
              {controls}
            </div>
          </div>
        ) : (
          // ── GENİŞ DÜZEN: Kronometre solda, zaman + kontroller ortada ──
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',marginBottom: displaySessions.length?12:0}}>
            <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 1.5"/><path d="M10 3h4"/></svg>}>Kronometre</WidgetTitle>
            <div style={{display:'flex',alignItems:'center',gap:14,justifySelf:'center'}}>
              <div style={{fontSize:clockFontSize,color:swRunning?'#34d399':'#e8edf5',fontFamily:'Lora,serif',letterSpacing:-1,fontVariantNumeric:'tabular-nums',transition:'color .3s'}}>{fmt(swElapsed)}</div>
              {controls}
            </div>
            <div/>
          </div>
        )}

        {/* Bugünkü seans listesi — 4'ten fazlaysa kaydırılabilir */}
        {displaySessions.length>0 && (
          <>
            <div style={{height:1,background:'rgba(255,255,255,0.06)',marginBottom:10}}/>
            <div
              onClick={e=>e.stopPropagation()}
              onWheel={e=>e.stopPropagation()}
              style={{
                display:'flex',flexDirection:'column',gap:7,
                flex:1,
                maxHeight: displaySessions.length>MAX_VISIBLE ? ROW_H*MAX_VISIBLE : 'none',
                overflowY: 'auto',
                paddingRight:6,
                cursor:'default',
                minHeight:0,
              }}
              className="sw-session-scroll"
            >
              {displaySessions.map((s,i)=>{
                const color = SESS_COLORS[i%SESS_COLORS.length];
                const isOngoing = !!s.live;
                const liveDur = isOngoing && window._sw.sessionStartMs ? (Date.now()-window._sw.sessionStartMs) : (s.dur||0);
                const durMin = Math.round(liveDur/60000);
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
function ChainWidget({ chains, onNavigate, size }) {
  const SEGS = 20;
  // Widget büyüdükçe, konteynerin GERÇEK piksel yüksekliğine göre (ResizeObserver)
  // daha fazla alışkanlık satırı ve daha büyük yazı gösterilir, boşluk dağıtılır.
  const [bodyRef, body] = useElementSize();
  const baseH = 130; // 4 alışkanlık satırı için yaklaşık varsayılan yükseklik
  const heightScale = Math.max(0.7, Math.min(3, (body.height || baseH) / baseH));
  const maxVisible = Math.max(2, Math.round(4 * heightScale));
  const nameFontSize = Math.max(10, Math.round(12 * heightScale));
  const streakFontSize = Math.max(10, Math.round(12 * heightScale));
  const segHeight = Math.max(3, Math.round(3 * heightScale));
  return (
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors h-full w-full flex flex-col overflow-hidden">
      <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>}>Zincir Kırma ›</WidgetTitle>
      {chains.length===0
        ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>Alışkanlık yok</div>
        : <div ref={bodyRef} style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between',minHeight:0}}>
        {chains.slice(0,maxVisible).map((ch,i)=>{
          const { streak } = calcChainStreak(ch);
          const target = ch.target||30;
          const filled = Math.round((streak/target)*SEGS);
          return (
            <div key={i}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:ch.color||'#3a7bd5',flexShrink:0}}/>
                <span style={{fontSize:nameFontSize,color:'rgba(232,237,245,0.85)',flex:1,fontWeight:500}}>{ch.name}</span>
                <span style={{fontSize:streakFontSize,color:streak>0?(ch.color||'#f97316'):'rgba(232,237,245,0.3)',fontFamily:'Lora,serif',fontWeight:streak>0?700:400}}>{streak} gün</span>
              </div>
              <div style={{display:'flex',gap:3}}>
                {Array.from({length:SEGS},(_,j)=>(
                  <div key={j} style={{flex:1,height:segHeight,borderRadius:2,background:j<filled?(ch.color||'#3a7bd5'):'rgba(255,255,255,0.08)'}}/>
                ))}
              </div>
            </div>
          );
        })}
        </div>

      }
    </div>
  );
}

// ── KİTAPLAR ─────────────────────────────────────────────────────────────
function BookWidget({ books, onNavigate, size }) {
  // Kitap sırtı boyutu, şerit konteynerinin GERÇEK piksel yüksekliğine göre hesaplanır (ResizeObserver) —
  // widget büyütülünce dikey boşluk kalmadan sırtlar tam doldurur. Sayfa sayısına göre de orantılı genişler.
  const stripRef = useRef(null);
  const [stripH, setStripH] = useState(75);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect?.height;
      if (h && h > 0) setStripH(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const minP=80,maxP=1400;
  // Konteyner yüksekliğine göre min/maks kitap sırtı yüksekliği — oran sabit (75:125 ~ 0.6)
  const maxH = Math.round(stripH);
  const minH = Math.round(maxH * 0.6);
  const minW = Math.round(minH * (24/75));
  const maxW = Math.round(maxH * (46/125));
  const readCount = books.length;
  const spines = books.map(b=>{
    const p=parseInt(b.pages)||200;
    const r=Math.min(1,Math.max(0,(p-minP)/(maxP-minP)));
    const W=Math.round(minW+r*(maxW-minW)), H=Math.round(minH+r*(maxH-minH));
    const fs=Math.max(7,Math.min(W*0.32, 16));
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
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors overflow-hidden h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>}>Kitaplar ›</WidgetTitle>
        <div style={{fontSize:11,color:'rgba(232,237,245,0.35)',marginTop:-8}}><span style={{fontSize:15,color:'#4a7a5a',fontFamily:'Lora,serif',marginRight:3,fontWeight:700}}>{readCount}</span>okundu</div>
      </div>
      {books.length===0
        ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',padding:'8px 0'}}>Kitap yok</div>
        : <div ref={stripRef} style={{display:'flex',alignItems:'flex-end',gap:4,flex:1,minHeight:0,overflowX:'auto',paddingBottom:4,borderBottom:'1px solid rgba(255,255,255,0.05)',scrollbarWidth:'none'}}>
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

// ── FİLMLER ────────────────────────────────────────────────────────────
function FilmWidget({ films, onNavigate, size }) {
  // En yeni izlenen solda: tarihli olanlar tarihe göre yeniden eskiye, tarihsiz ("eskiden izledim") en sona
  const sorted = [...films].sort((a, b) => {
    const da = a.date || '', db2 = b.date || '';
    if (da && db2) return db2.localeCompare(da);
    if (da) return -1; if (db2) return 1; return 0;
  });
  // Poster boyutu, şerit konteynerinin GERÇEK piksel yüksekliğine göre hesaplanır (ResizeObserver) —
  // böylece widget büyütülünce dikey boşluk kalmadan posterler tam doldurur.
  const stripRef = useRef(null);
  const [stripH, setStripH] = useState(84);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect?.height;
      if (h && h > 0) setStripH(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ASPECT = 58/84; // poster en/boy oranı
  const posterH = Math.round(stripH);
  const posterW = Math.round(posterH * ASPECT);

  return (
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors overflow-hidden h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 9l6 3-6 3V9z" fill="#3a7bd5" fillOpacity=".3"/></svg>}>Filmler ›</WidgetTitle>
        <div style={{fontSize:11,color:'rgba(232,237,245,0.35)',marginTop:-8}}><span style={{fontSize:15,color:'#a06040',fontFamily:'Lora,serif',marginRight:3,fontWeight:700}}>{films.length}</span>izlendi</div>
      </div>
      {films.length===0
        ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',padding:'8px 0'}}>Film yok</div>
        : <div ref={stripRef} style={{display:'flex',alignItems:'stretch',gap:7,flex:1,minHeight:0,overflowX:'auto',overflowY:'hidden',paddingBottom:2,scrollbarWidth:'none'}}>
            {sorted.map((f,i)=>(<FilmPoster key={i} film={f} width={posterW} height={posterH}/>))}
          </div>
      }
    </div>
  );
}

function FilmPoster({ film, width, height }) {
  const [poster, setPoster] = useState(posterCache[film.name] ?? null);
  const iconSize = Math.max(16, Math.round((width||58) * 0.38));

  useEffect(() => {
    if (poster) return;
    fetchPoster(film.name).then(url => { if (url) setPoster(url); });
  }, [film.name]);

  return poster
    ? <img
        src={poster}
        title={film.name}
        style={{width,height,objectFit:'cover',borderRadius:5,flexShrink:0,display:'block',transition:'transform .2s,filter .2s',cursor:'pointer'}}
        onClick={e=>e.stopPropagation()}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.filter='brightness(1.15)';}}
        onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.filter='';}}
      />
    : <div
        title={film.name}
        style={{width,height,borderRadius:5,flexShrink:0,background:'#2a2d35',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'transform .2s,filter .2s'}}
        onClick={e=>e.stopPropagation()}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.filter='brightness(1.15)';}}
        onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.filter='';}}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M10 9l6 3-6 3V9z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)"/></svg>
      </div>;
}

// ── HAVA DURUMU ──────────────────────────────────────────────────────────
// Gün döngüsüne göre arka plan paleti: gece / şafak / gündüz / akşam üstü.
// sunrise/sunset "HH:MM" string olarak gelir, şu anki dakika cinsinden konum
// gün doğumu/batımına ne kadar yakınsa o paletin ağırlığı artar (kademeli geçiş).
function wxPalette(nowMin, sunriseMin, sunsetMin) {
  const TWILIGHT = 45; // dakika — şafak/akşam üstü paleti bu pencere içinde aktif
  const night   = ['#0a1128', '#1b2a4a', '#2d3561'];
  const dawn    = ['#f4a896', '#e0758a', '#7a5d99'];
  const day     = ['#5fa8e0', '#3a7bc8', '#2c5a9e'];
  const dusk    = ['#e8985c', '#c4577a', '#4a3a6e'];
  const dSunrise = Math.abs(nowMin - sunriseMin);
  const dSunset  = Math.abs(nowMin - sunsetMin);
  if (dSunrise <= TWILIGHT) return dawn;
  if (dSunset  <= TWILIGHT) return dusk;
  if (nowMin > sunriseMin && nowMin < sunsetMin) return day;
  return night;
}

// Hava durumu ikonu — Weather.jsx'teki WxIcon ile birebir aynı (görsel tutarlılık için
// buraya kopyalandı; animasyonlu, detaylı SVG kompozisyonu).
function WxIcon({ bg, size = 28 }) {
  const s = size;

  const css = `
    @keyframes wxSpin{to{transform:rotate(360deg)}}
    @keyframes wxBob{0%,100%{transform:translateY(0)}50%{transform:translateY(${-s*.05}px)}}
    @keyframes wxDrift{0%,100%{transform:translateX(0)}50%{transform:translateX(${s*.05}px)}}
    @keyframes wxDrizzle{0%{transform:translateY(0);opacity:0}15%{opacity:.55}85%{opacity:.55}100%{transform:translateY(${s*.22}px);opacity:0}}
    @keyframes wxRain{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(${s*.3}px);opacity:0}}
    @keyframes wxShower{0%{transform:translateY(0);opacity:0}8%{opacity:1}92%{opacity:1}100%{transform:translateY(${s*.34}px);opacity:0}}
    @keyframes wxSplash{0%{transform:scale(.2);opacity:.9}100%{transform:scale(1.8);opacity:0}}
    @keyframes wxSnow{0%{transform:translateY(-${s*.04}px);opacity:0}15%{opacity:.85}85%{opacity:.85}100%{transform:translateY(${s*.32}px);opacity:0}}
    @keyframes wxHSnow{0%{transform:translateY(-${s*.04}px);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateY(${s*.36}px);opacity:0}}
    @keyframes wxFog1{0%,100%{transform:translateX(0);opacity:.55}50%{transform:translateX(${s*.1}px);opacity:.8}}
    @keyframes wxFog2{0%,100%{transform:translateX(0);opacity:.4}50%{transform:translateX(${-s*.08}px);opacity:.7}}
    @keyframes wxFog3{0%,100%{transform:translateX(0);opacity:.45}50%{transform:translateX(${s*.12}px);opacity:.75}}
    @keyframes wxBolt{0%,60%,100%{opacity:0}62%,64%{opacity:1}63%,65%{opacity:.3}67%{opacity:1}68%{opacity:0}}
    @keyframes wxHail{0%{transform:translateY(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(${s*.28}px);opacity:0}}
    @keyframes wxTwinkle{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:.2;transform:scale(.7)}}
  `;

  const Sun = ({ cx=s*.5, cy=s*.45, rs=s*.18 }) => (
    <g style={{ animation:`wxSpin 12s linear infinite`, transformOrigin:`${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={rs} fill="#fde68a"/>
      {[0,45,90,135,180,225,270,315].map((deg,i) => {
        const rad = deg*Math.PI/180;
        return <line key={i}
          x1={cx+(rs+s*.04)*Math.cos(rad)} y1={cy+(rs+s*.04)*Math.sin(rad)}
          x2={cx+(rs+s*.11)*Math.cos(rad)} y2={cy+(rs+s*.11)*Math.sin(rad)}
          stroke="#fbbf24" strokeWidth={s*.028} strokeLinecap="round" opacity=".85"/>;
      })}
    </g>
  );

  const Moon = ({ cx=s*.52, cy=s*.44 }) => (
    <g>
      <circle cx={cx} cy={cy} r={s*.2} fill="#fef3c7"/>
      <circle cx={cx+s*.11} cy={cy-s*.07} r={s*.16} fill="#0d1117"/>
    </g>
  );

  const Stars = () => (
    <g>
      {[[s*.12,s*.12],[s*.82,s*.15],[s*.9,s*.55],[s*.08,s*.62],[s*.45,s*.08]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={s*.025} fill="#fde68a"
          style={{ animation:`wxTwinkle 2s ease-in-out infinite ${i*.4}s` }}/>
      ))}
    </g>
  );

  const Cloud = ({ x=0, y=s*.38, w=s*.9, fill='rgba(185,210,232,.88)', op=1 }) => {
    const ch = w*.38;
    return (
      <g opacity={op} style={{ animation:`wxDrift 5s ease-in-out infinite` }}>
        <ellipse cx={x+w*.25} cy={y} rx={w*.17} ry={ch*.55} fill={fill}/>
        <ellipse cx={x+w*.48} cy={y-ch*.18} rx={w*.24} ry={ch*.68} fill={fill}/>
        <ellipse cx={x+w*.72} cy={y} rx={w*.17} ry={ch*.5} fill={fill}/>
        <rect x={x+w*.08} y={y} width={w*.84} height={ch*.52} fill={fill}/>
      </g>
    );
  };

  const RainLines = ({ xs, color='#3b82f6', sw=1.8, len=s*.28, anim='wxRain', dur='1.2s', delays=[0,.3,.6,.15] }) => (
    <g>
      {xs.map((x,i) => (
        <line key={i} x1={x} y1={s*.58} x2={x-len*.15} y2={s*.58+len}
          stroke={color} strokeWidth={sw} strokeLinecap="round" opacity="0"
          style={{ animation:`${anim} ${dur} ease-in infinite ${delays[i]||0}s` }}/>
      ))}
    </g>
  );

  const SnowFlakes = ({ xs, yBase=s*.62, fontSize=s*.28, anim='wxSnow', dur='2.4s', delays=[0,.8,1.6,.3] }) => (
    <g>
      {xs.map((x,i) => (
        <text key={i} x={x} y={yBase+(i%2)*s*.08} fontSize={fontSize}
          fill="#bae6fd" textAnchor="middle" opacity="0"
          style={{ animation:`${anim} ${dur} ease-in-out infinite ${delays[i]||0}s` }}>*</text>
      ))}
    </g>
  );

  const SnowAccum = ({ cx=s*.5, y=s*.92 }) => (
    <g>
      <ellipse cx={cx} cy={y} rx={s*.38} ry={s*.06} fill="#c8e6f8" opacity=".28"/>
      <ellipse cx={cx} cy={y-.01*s} rx={s*.28} ry={s*.04} fill="#daeefa" opacity=".32"/>
    </g>
  );

  const Lightning = ({ x=s*.46, y=s*.6, delay='0s' }) => (
    <g style={{ animation:`wxBolt 2.5s ease-in-out infinite ${delay}` }}>
      <polygon points={`${x},${y} ${x-s*.1},${y+s*.16} ${x+s*.02},${y+s*.16} ${x-s*.08},${y+s*.32}`}
        fill="#fbbf24" stroke="#fde68a" strokeWidth={s*.018} strokeLinejoin="round"/>
    </g>
  );

  const HailBalls = ({ xs }) => (
    <g>
      {xs.map((x,i) => (
        <circle key={i} cx={x} cy={s*.5} r={s*.04} fill="#bae6fd" stroke="rgba(147,197,253,.8)" strokeWidth={s*.016} opacity="0"
          style={{ animation:`wxHail 1.1s ease-in infinite ${[0,.2,.42,.1,.32][i]||0}s` }}/>
      ))}
    </g>
  );

  const FogLayers = ({ dark=false }) => {
    const base = dark ? 'rgba(50,70,90,' : 'rgba(130,155,178,';
    const layers = [
      { y:s*.3,  w:s*.7,  x:s*.05, op:.55, anim:'wxFog1', dur:'3.5s' },
      { y:s*.42, w:s*.55, x:s*.2,  op:.65, anim:'wxFog2', dur:'4.2s' },
      { y:s*.54, w:s*.8,  x:s*.02, op:.6,  anim:'wxFog1', dur:'5s'   },
      { y:s*.65, w:s*.6,  x:s*.15, op:.5,  anim:'wxFog3', dur:'3.8s' },
      { y:s*.76, w:s*.75, x:s*.05, op:.45, anim:'wxFog2', dur:'4.5s' },
    ];
    return (
      <g>
        {layers.map((l,i) => (
          <rect key={i} x={l.x} y={l.y} width={l.w} height={s*.055} rx={s*.028}
            fill={`${base}${l.op})`}
            style={{ animation:`${l.anim} ${l.dur} ease-in-out infinite ${i*.2}s` }}/>
        ))}
      </g>
    );
  };

  const SplashRings = ({ xs }) => (
    <g>
      {xs.map((x,i) => (
        <ellipse key={i} cx={x} cy={s*.9} rx={s*.08} ry={s*.03}
          fill="none" stroke="#60a5fa" strokeWidth={s*.02} opacity="0"
          style={{ animation:`wxSplash ${.65}s ease-out infinite ${[.1,.34,.21][i]||0}s` }}/>
      ))}
    </g>
  );

  const CL  = 'rgba(185,210,232,.88)';
  const CM  = 'rgba(100,135,160,.92)';
  const CDK = 'rgba(42,58,76,.95)';
  const CNK = 'rgba(28,40,55,.95)';

  const icons = {
    'sunny': (<Sun/>),
    'partly': (
      <>
        <g style={{ animation:`wxBob 3s ease-in-out infinite` }}>
          <Sun cx={s*.65} cy={s*.3} rs={s*.15}/>
        </g>
        <Cloud x={s*.03} y={s*.5} w={s*.85} fill={CL}/>
      </>
    ),
    'cloudy': (
      <>
        <Cloud x={s*.05} y={s*.28} w={s*.82} fill={CM} op={.55}/>
        <Cloud x={0}     y={s*.48} w={s*.98} fill={CL}/>
      </>
    ),
    'fog': (
      <>
        <circle cx={s*.5} cy={s*.12} r={s*.1} fill="#fde68a" opacity=".1"/>
        <FogLayers/>
      </>
    ),
    'drizzle': (
      <>
        <Cloud x={0} y={s*.3} w={s*.98} fill={CL} op={.8}/>
        <RainLines xs={[s*.25,s*.5,s*.74]} color="#93c5fd" sw={s*.03} len={s*.16} anim="wxDrizzle" dur="2.8s" delays={[0,.9,1.7]}/>
      </>
    ),
    'rain': (
      <>
        <Cloud x={0} y={s*.28} w={s*.98} fill={CM}/>
        <RainLines xs={[s*.18,s*.34,s*.54,s*.72]} color="#3b82f6" sw={s*.045} len={s*.28} anim="wxRain" dur="1.2s" delays={[0,.3,.6,.15]}/>
      </>
    ),
    'shower': (
      <>
        <Cloud x={0} y={s*.22} w={s*.98} fill={CDK}/>
        <Cloud x={s*.05} y={s*.36} w={s*.85} fill={CDK} op={.6}/>
        <RainLines xs={[s*.12,s*.26,s*.42,s*.58,s*.74]} color="#1d4ed8" sw={s*.06} len={s*.34} anim="wxShower" dur=".65s" delays={[0,.13,.26,.07,.2]}/>
        <SplashRings xs={[s*.14,s*.44,s*.74]}/>
      </>
    ),
    'snow': (
      <>
        <Cloud x={0} y={s*.3} w={s*.98} fill={CL} op={.85}/>
        <SnowFlakes xs={[s*.22,s*.5,s*.76]} fontSize={s*.28} anim="wxSnow" dur="2.4s" delays={[0,.8,1.6]}/>
      </>
    ),
    'heavysnow': (
      <>
        <Cloud x={0}     y={s*.2} w={s*.98} fill={CDK}/>
        <Cloud x={s*.05} y={s*.34} w={s*.85} fill={CDK} op={.65}/>
        <SnowFlakes xs={[s*.14,s*.32,s*.52,s*.72]} fontSize={s*.3} anim="wxHSnow" dur="1.3s" delays={[0,.22,.45,.11]}/>
        <SnowFlakes xs={[s*.22,s*.62]} yBase={s*.75} fontSize={s*.26} anim="wxHSnow" dur="1.3s" delays={[.33,.55]}/>
        <SnowAccum/>
      </>
    ),
    'storm': (
      <>
        <Cloud x={0} y={s*.2} w={s*.98} fill={CDK}/>
        <RainLines xs={[s*.15,s*.72]} color="#3b82f6" sw={s*.04} len={s*.24} anim="wxRain" dur="1.1s" delays={[0,.3]}/>
        <Lightning x={s*.38} delay="0s"/>
        <Lightning x={s*.6}  delay="1.4s"/>
      </>
    ),
    'hail': (
      <>
        <Cloud x={0} y={s*.2} w={s*.98} fill={CDK}/>
        <HailBalls xs={[s*.12,s*.28,s*.48,s*.66,s*.86]}/>
      </>
    ),
    'night-hail': (
      <>
        <Cloud x={0} y={s*.2} w={s*.98} fill={CNK}/>
        <HailBalls xs={[s*.12,s*.28,s*.48,s*.66,s*.86]}/>
      </>
    ),
    'night': (
      <>
        <Stars/>
        <Moon/>
      </>
    ),
    'night-partly': (
      <>
        <Stars/>
        <g style={{ animation:`wxBob 4s ease-in-out infinite` }}>
          <Moon cx={s*.64} cy={s*.28}/>
        </g>
        <Cloud x={s*.03} y={s*.5} w={s*.85} fill={CNK}/>
      </>
    ),
    'night-cloudy': (
      <>
        <Stars/>
        <Cloud x={s*.05} y={s*.28} w={s*.82} fill={CNK} op={.5}/>
        <Cloud x={0}     y={s*.48} w={s*.98} fill={CNK}/>
      </>
    ),
    'night-drizzle': (
      <>
        <Stars/>
        <Cloud x={0} y={s*.3} w={s*.98} fill={CNK} op={.9}/>
        <RainLines xs={[s*.25,s*.5,s*.74]} color="#93c5fd" sw={s*.03} len={s*.16} anim="wxDrizzle" dur="2.8s" delays={[0,.9,1.7]}/>
      </>
    ),
    'night-rain': (
      <>
        <Cloud x={0} y={s*.28} w={s*.98} fill={CNK}/>
        <RainLines xs={[s*.18,s*.34,s*.54,s*.72]} color="#3b82f6" sw={s*.045} len={s*.28} anim="wxRain" dur="1.2s" delays={[0,.3,.6,.15]}/>
      </>
    ),
    'night-shower': (
      <>
        <Cloud x={0}     y={s*.22} w={s*.98} fill={CNK}/>
        <Cloud x={s*.05} y={s*.36} w={s*.85} fill={CNK} op={.6}/>
        <RainLines xs={[s*.12,s*.26,s*.42,s*.58,s*.74]} color="#1d4ed8" sw={s*.06} len={s*.34} anim="wxShower" dur=".65s" delays={[0,.13,.26,.07,.2]}/>
        <SplashRings xs={[s*.14,s*.44,s*.74]}/>
      </>
    ),
    'night-snow': (
      <>
        <Stars/>
        <Cloud x={0} y={s*.3} w={s*.98} fill={CNK} op={.9}/>
        <SnowFlakes xs={[s*.22,s*.5,s*.76]} fontSize={s*.28} anim="wxSnow" dur="2.4s" delays={[0,.8,1.6]}/>
      </>
    ),
    'night-storm': (
      <>
        <Cloud x={0} y={s*.2} w={s*.98} fill={CNK}/>
        <RainLines xs={[s*.15,s*.72]} color="#3b82f6" sw={s*.04} len={s*.24} anim="wxRain" dur="1.1s" delays={[0,.3]}/>
        <Lightning x={s*.38} delay="0s"/>
        <Lightning x={s*.6}  delay="1.4s"/>
      </>
    ),
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow:'visible', flexShrink:0 }}>
      <defs><style>{css}</style></defs>
      {icons[bg] || icons['cloudy']}
    </svg>
  );
}

// Acil uyarı metnini widget şeridi için kısaltır: UV/sıcaklık gibi sayısal uyarılarda
// rakamı koruyup gerekçeyi kısa tutar, tekrarlı "Yüksek UV" gibi boş başlıkları önler.
function wxShortAlertText(a) {
  const m = a.detail?.match(/(UV indeksi|AQI)\s*([\d.]+)/i);
  if (a.title.includes('UV') && m) return `UV ${parseFloat(m[2]).toFixed(0)} — güneş kremi şart`;
  if (a.title.includes('hava kalitesi') && m) return `AQI ${m[2]} — ${a.title.toLowerCase()}`;
  const tempM = a.detail?.match(/(-?\d+)\s*°C/);
  if ((a.title.includes('Don') || a.title.includes('sıcak')) && tempM) return `${a.title} (${tempM[1]}°C)`;
  return a.title;
}

function WeatherWidget({ onNavigate, size }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | no-city | error
  const [stripRef, strip] = useElementSize();

  useEffect(() => {
    let cities = [];
    try { cities = JSON.parse(localStorage.getItem('gn_wx_cities') || '[]'); } catch {}
    const city = cities[0];
    if (!city) { setStatus('no-city'); return; }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,uv_index,visibility,is_day,precipitation&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,precipitation_probability,precipitation,rain,snowfall,wind_speed_10m,wind_gusts_10m,visibility,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=2`;
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=pm2_5,pm10,us_aqi&timezone=auto`;
    const quakeUrl = `https://earthquake.usgs.gov/fdsnws/event/1.1/query?format=geojson&latitude=${city.lat}&longitude=${city.lon}&maxradiuskm=300&minmagnitude=3.5&limit=5&orderby=time`;

    Promise.allSettled([fetch(url), fetch(airUrl), fetch(quakeUrl)]).then(async ([wRes, aRes, qRes]) => {
      try {
        if (wRes.status !== 'fulfilled') { setStatus('error'); return; }
        const w = await wRes.value.json();
        const air = aRes.status === 'fulfilled' ? await aRes.value.json() : null;
        const quake = qRes.status === 'fulfilled' ? await qRes.value.json() : null;
        setData({ ...w, city, air, quake });
        setStatus('ok');
      } catch { setStatus('error'); }
    });
  }, []);

  if (status === 'no-city') {
    return (
      <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors h-full w-full flex flex-col">
        <WidgetTitle accent="#3a7bd5">Hava Durumu ›</WidgetTitle>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>Şehir eklenmedi</div>
      </div>
    );
  }
  if (status === 'loading' || status === 'error' || !data) {
    return (
      <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors h-full w-full flex flex-col">
        <WidgetTitle accent="#3a7bd5">Hava Durumu ›</WidgetTitle>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>{status==='error'?'Yüklenemedi':'Yükleniyor...'}</div>
      </div>
    );
  }

  const cur = data.current || {};
  const hourly = data.hourly || {};
  const daily = data.daily || {};
  const now = new Date();

  const maxTemp = daily.temperature_2m_max?.[0];
  const minTemp = daily.temperature_2m_min?.[0];

  // Bugün, şu andan gece yarısına kadar olan saatler — hem tarih hem saat eşleşmeli,
  // yoksa forecast_days=2 nedeniyle yarının aynı saatleri de listeye girip tekrar gösterilir.
  const nowHour = now.getHours();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const hourlyList = (hourly.time||[])
    .map((t,i)=>({ date:t.split('T')[0], hour:new Date(t).getHours(), temp:hourly.temperature_2m?.[i], code:hourly.weather_code?.[i], isDay:hourly.is_day?.[i] }))
    .filter(h => h.date === todayDateStr && h.hour >= nowHour);

  const alerts = buildWeatherAlerts(data).slice(0, 5);
  const hasAlert = alerts.length > 0;
  const alertColors = { danger:'#f87171', warning:'#fb923c', info:'#9ca3af' };

  // Saatlik şerit boyutu, konteynerin gerçek genişliğine göre (ResizeObserver) ölçeklenir
  const colW = Math.max(34, Math.min(54, strip.width ? strip.width / 6.2 : 42));
  const iconSize = Math.round(colW * 0.42);

  return (
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl cursor-pointer hover:bg-surface3 transition-colors h-full w-full flex flex-col overflow-hidden">
      {hasAlert && (
        <div style={{background:'rgba(0,0,0,0.25)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'5px 14px',display:'flex',alignItems:'center',gap:7,overflow:'hidden',flexShrink:0}}>
          <div style={{display:'flex',gap:16,whiteSpace:'nowrap',animation:'wxWidgetScroll 16s linear infinite',fontSize:10,fontWeight:500}}>
            {[...alerts,...alerts].map((a,i)=>(<span key={i} style={{color:alertColors[a.level]}}>{a.icon} {wxShortAlertText(a)}</span>))}
          </div>
        </div>
      )}
      <div style={{padding:'12px 14px',flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
        <div className="flex items-center justify-between mb-2">
          <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16a4 4 0 00-4-4h-1A6 6 0 104 16"/><path d="M8 20l-1 3M13 20v3M18 20l1 3"/></svg>}>{data.city?.name?.split(',')[0]} ›</WidgetTitle>
          {(maxTemp!=null && minTemp!=null) && (
            <div style={{fontSize:11,color:'rgba(232,237,245,0.4)',marginTop:-8}}>Y:<span style={{color:'#f87171'}}>{Math.round(maxTemp)}°</span> D:<span style={{color:'#93c5fd'}}>{Math.round(minTemp)}°</span></div>
          )}
        </div>
        <div ref={stripRef} style={{display:'flex',gap:0,overflowX:'auto',flex:1,minHeight:0,scrollbarWidth:'none'}}>
          {hourlyList.map((h,i)=>{
            const isNow = i===0;
            const info = wxc(h.code, h.isDay);
            return (
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,flexShrink:0,width:colW,position:'relative'}}>
                {isNow && <div style={{position:'absolute',top:'8%',left:'50%',transform:'translateX(-50%)',background:'rgba(58,123,213,0.18)',border:'1px solid rgba(58,123,213,0.35)',borderRadius:10,width:colW*0.82,height:'84%'}}/>}
                <div style={{fontSize:10,color: isNow?'#93c5fd':'rgba(232,237,245,0.4)',fontWeight: isNow?700:400,position:'relative'}}>{isNow?'Şimdi':`${String(h.hour).padStart(2,'0')}:00`}</div>
                <div style={{position:'relative'}}><WxIcon bg={info.bg} size={isNow?iconSize+4:iconSize}/></div>
                <div style={{fontSize: isNow?13:12,color:'#e8edf5',fontWeight: isNow?700:400,position:'relative'}}>{Math.round(h.temp)}°</div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes wxWidgetPulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        @keyframes wxWidgetScroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
      `}</style>
    </div>
  );
}

// ── TAKVİM ────────────────────────────────────────────────────────────────
function CalendarWidget({ db, getTodos, getNotes, onNavigate, size }) {
  const today = todayStr();
  const [y, m] = today.split('-').map(Number);
  const firstDay = new Date(y, m-1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  // Gün hücresi boyutu, takvim grid'inin GERÇEK piksel genişliğine göre hesaplanır (ResizeObserver) —
  // widget genişletilince hücreler orantılı büyür.
  const [gridRef2, grid] = useElementSize();
  const cellWidthCalc = grid.width ? grid.width / 7 : 28;
  const cellHeight = Math.max(18, Math.round(cellWidthCalc * 0.78));
  const cellFontSize = Math.max(9, Math.round(cellWidthCalc * 0.36));
  const maxUpcoming = Math.max(2, Math.round((size?.row || 4) / 4 * 3));

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
  for (let off = 0; off < 14 && upcoming.length < maxUpcoming; off++) {
    const dt = new Date(); dt.setDate(dt.getDate()+off);
    const ds = dt.toISOString().split('T')[0];
    const specials = getSpecialDays(ds, db.s || []);
    if (specials.length) {
      upcoming.push({ ds, specials, isToday: ds===today });
    }
  }

  const WD = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];
  const fmtShort = (ds) => { const [,mo,da]=ds.split('-'); return `${parseInt(da)} ${TR_M[parseInt(mo)-1]}`; };

  return (
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}>Takvim ›</WidgetTitle>
        <div style={{fontSize:11,color:'#7b5ea7',fontWeight:600,marginTop:-8}}>{TR_M[m-1]}</div>
      </div>

      <div ref={gridRef2} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',rowGap:3,marginBottom:10}}>
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
              height:cellHeight,borderRadius:6,fontSize:cellFontSize,position:'relative',
              background: isToday?'rgba(123,94,167,0.35)':'transparent',
              color: isToday?'#c4b5fd':'rgba(232,237,245,0.6)',
              fontWeight: isToday?700:400,
              boxShadow: isToday?'0 0 0 1.5px rgba(123,94,167,0.6)':'none',
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
                {u.specials[0]?.n}
              </span>
              {u.specials.length > 1 && (
                <span style={{fontSize:9,color:'rgba(232,237,245,0.25)',flexShrink:0}}>+{u.specials.length - 1}</span>
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

  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return ()=>window.removeEventListener('resize', onResize);
  },[]);

  useEffect(()=>{
    if(!swState) return;
    if(swState.running&&swState.startTime){
      if(!window._sw)window._sw={};
      window._sw.running=true;
      window._sw.startTime=swState.startTime;
      // FIX: bu cihaz durdurunca seans süresini (toplam değil) doğru hesaplayabilsin diye
      window._sw.sessionStartMs=Date.now();
      const n=new Date();
      window._sw.sessionStartLabel=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
      setSwRunning(true);
    }
    else if(swState.running===false){
      if(!window._sw)window._sw={};
      window._sw.running=false;
      window._sw.startTime=null;
      window._sw.sessionStartMs=null;
      if(swState.elapsed!==undefined){window._sw.elapsed=swState.elapsed;setSwElapsed(swState.elapsed);}
      setSwRunning(false);
    }
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
    window._sw.running=false; window._sw.elapsed=0; window._sw.startTime=null; window._sw.sessionStartMs=null;
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
      case 'todos': content = <TodoWidget onNavigate={()=>setCurrentPage('calendar')} getTodos={getTodos} setTodos={setTodos} size={size}/>; break;
      case 'goals': content = <GoalsWidget db={db} onNavigate={()=>setCurrentPage('goals')} size={size}/>; break;
      case 'stopwatch': content = <StopwatchWidget swElapsed={swElapsed} swRunning={swRunning} swLog={swLog} onToggle={toggleSw} onReset={resetSw} onNavigate={()=>setCurrentPage('clock')} isNarrow={isNarrow} size={size}/>; break;
      case 'chains': content = <ChainWidget chains={chains} onNavigate={()=>setCurrentPage('chain')} size={size}/>; break;
      case 'books': content = <BookWidget books={db.b||[]} onNavigate={()=>setCurrentPage('books')} size={size}/>; break;
      case 'calendar': content = <CalendarWidget db={db} getTodos={getTodos} getNotes={getNotes} onNavigate={()=>setCurrentPage('calendar')} size={size}/>; break;
      case 'films': content = <FilmWidget films={db.f||[]} onNavigate={()=>setCurrentPage('films')} size={size}/>; break;
      case 'weather': content = <WeatherWidget onNavigate={()=>setCurrentPage('weather')} size={size}/>; break;
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
    <div className="relative min-h-screen -m-5 md:-m-[26px_30px] overflow-hidden bg-bg">
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
