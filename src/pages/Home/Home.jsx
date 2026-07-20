import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, TR_M, TR_D, calcChainStreak, swFmt, isGoalActive, getSpecialDays, fetchPoster, posterCache, fetchSeriesPoster, seriesPosterCache, fetchBookInfo, bookInfoCache, extractSpineColors, spineColorCache, wxc, buildWeatherAlerts } from '../../lib/utils';
import { WxIcon, WindCompass, degToCompass, wxBackground, BgPrecip } from '../../lib/WxIcon';

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

const PRIO_CYCLE = { high: 'medium', medium: 'low', low: 'high' };
const PRIO_LABEL = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };

const PRIORITY_COLORS = {
  high:   { dot: '#ef4444', bg: 'rgba(239,68,68,0.14)' },
  medium: { dot: '#f5a524', bg: 'rgba(245,165,36,0.14)' },
  low:    { dot: '#64748b', bg: 'rgba(100,116,139,0.14)' },
};

const DEFAULT_SPEC_COLORS = { h:'#c0392b', r:'#7b5ea7', i:'#2874a6', b:'#c0392b', a:'#7b5ea7', custom:'#3a7bd5' };
function loadSpecColors() {
  try { return { ...DEFAULT_SPEC_COLORS, ...JSON.parse(localStorage.getItem('gn_spec_colors') || '{}') }; } catch { return { ...DEFAULT_SPEC_COLORS }; }
}

const ALL_WIDGET_IDS = ['todos','goals','stopwatch','chains','books','calendar','films','series','weather'];
const WIDGET_LABELS = { todos:'Görevler', goals:'Hedefler', stopwatch:'Kronometre', chains:'Zincir Kırma', books:'Kitaplar', calendar:'Takvim', films:'Filmler', series:'Diziler', weather:'Hava Durumu' };

function loadWidgetOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem('gn_widget_order') || JSON.stringify(ALL_WIDGET_IDS));
    const missing = ALL_WIDGET_IDS.filter(id => !saved.includes(id));
    return missing.length ? [...saved, ...missing] : saved;
  } catch { return [...ALL_WIDGET_IDS]; }
}
function loadWidgetVisible() {
  try {
    const saved = JSON.parse(localStorage.getItem('gn_widget_visible') || JSON.stringify(ALL_WIDGET_IDS));
    const missing = ALL_WIDGET_IDS.filter(id => !saved.includes(id));
    return missing.length ? [...saved, ...missing] : saved;
  } catch { return [...ALL_WIDGET_IDS]; }
}
function saveWidgetOrder(order) { localStorage.setItem('gn_widget_order', JSON.stringify(order)); }
function saveWidgetVisible(visible) { localStorage.setItem('gn_widget_visible', JSON.stringify(visible)); }

const DESKTOP_COLS = 4;
const MOBILE_COLS = 2;
const ROW_UNIT_DESKTOP = 64;
const ROW_UNIT_MOBILE = 56;
const GAP = 8;

const DEFAULT_SIZES = {
  desktop: {
    todos:    { col: 1, row: 4 },
    goals:    { col: 1, row: 4 },
    stopwatch:{ col: 2, row: 3 },
    chains:   { col: 1, row: 4 },
    books:    { col: 1, row: 4 },
    calendar: { col: 1, row: 4 },
    films:    { col: 1, row: 4 },
    series:   { col: 1, row: 4 },
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
    series:   { col: 2, row: 5 },
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
    if (row > 200) return { col: 1, row: 1 };
  }
}

function markOccupied(occupied, position, size) {
  for (let r = 0; r < size.row; r++) {
    for (let c = 0; c < size.col; c++) {
      occupied.add(`${position.col+c},${position.row+r}`);
    }
  }
}

function computeLayout(order, visible, mode, sizes, positions) {
  const cols = mode==='mobile' ? MOBILE_COLS : DESKTOP_COLS;
  const occupied = new Set();
  const layout = {};
  order.filter(id=>visible.includes(id)).forEach(id => {
    const size = getWidgetSize(mode, id, sizes);
    let pos = positions?.[mode]?.[id];
    if (pos) {
      pos = { col: Math.min(Math.max(1,pos.col), cols - size.col + 1), row: Math.max(1,pos.row) };
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
  series:    '#6c63ff',
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
              <div key={`${t.dateKey}-${t.idx}`} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 6px',marginBottom:2,borderRadius:5,borderLeft:`4px solid ${pc.dot}`,background:t.done?'rgba(255,255,255,0.025)':pc.bg,opacity:t.done?0.5:1}}>
                <div onClick={e=>toggle(e,t.dateKey,t.idx)} style={{width:12,height:12,borderRadius:3,border:t.done?'none':'1px solid rgba(255,255,255,0.3)',background:t.done?'#3a7bd5':'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {t.done&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                {isEditing
                  ? <input autoFocus value={editText} onClick={e=>e.stopPropagation()} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveEdit(e);if(e.key==='Escape'){e.stopPropagation();setEditingKey(null);}}} onBlur={saveEdit} style={{flex:1,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#e8edf5',outline:'none',borderRadius:4,padding:'1px 6px',fontSize:11,minWidth:0}}/>
                  : <span onDoubleClick={e=>startEdit(e,t.dateKey,t.idx,t.text)} style={{flex:1,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.done?'rgba(255,255,255,0.25)':'rgba(232,237,245,0.85)',textDecoration:t.done?'line-through':'none',cursor:'default'}}>{t.text}</span>
                }
                <button onClick={e=>{e.stopPropagation();setPrio(e,t.dateKey,t.idx,PRIO_CYCLE[t.priority||'medium']);}} style={{background:pc.dot,border:'none',color:'#0a0a0a',fontSize:10,fontWeight:700,borderRadius:7,padding:'4px 6px',cursor:'pointer',flexShrink:0,fontFamily:'inherit',lineHeight:1}}>{PRIO_LABEL[t.priority||'medium']}</button>
                {tab==='yesterday'&&<span style={{fontSize:9,color:'rgba(255,255,255,0.25)',flexShrink:0}}>{fmtDate(t.dateKey)}</span>}
                {!isEditing&&<button onClick={e=>startEdit(e,t.dateKey,t.idx,t.text)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',padding:'0 1px',lineHeight:1,flexShrink:0,fontSize:10}}>✎</button>}
                <button onClick={e=>delTodo(e,t.dateKey,t.idx)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.25)',cursor:'pointer',padding:'0 1px',lineHeight:1,flexShrink:0,fontSize:13}}>×</button>
              </div>
            );
          })
        }
      </div>
      <div onClick={e=>e.stopPropagation()} style={{display:'flex',gap:5,alignItems:'center',marginTop:4}}>
        <button onClick={e=>{e.stopPropagation();setAddPriority(PRIO_CYCLE[addPriority]);}} style={{background:PRIORITY_COLORS[addPriority].dot,border:'none',color:'#0a0a0a',fontSize:10,fontWeight:700,borderRadius:7,padding:'4px 4px',cursor:'pointer',flexShrink:0,fontFamily:'inherit',width:62,lineHeight:1}}>{PRIO_LABEL[addPriority]}</button>
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
  const [areaRef, area] = useElementSize();
  const cols = Math.max(1, Math.min(goals.length, 4));
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
  const liveSession = swRunning ? { id: '__live__', start: window._sw.sessionStartLabel || '—', live: true } : null;
  const displaySessions = liveSession ? [liveSession, ...todaySessions] : todaySessions;
  const ROW_H = 25;
  const [bodyRef, body] = useElementSize();
  const baseH = isNarrow ? 110 : 90;
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
          <div style={{marginBottom: displaySessions.length?12:0}}>
            <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 1.5"/><path d="M10 3h4"/></svg>}>Kronometre</WidgetTitle>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
              <div style={{fontSize:clockFontSize,color:swRunning?'#34d399':'#e8edf5',fontFamily:'Lora,serif',letterSpacing:-1,fontVariantNumeric:'tabular-nums',transition:'color .3s'}}>{fmt(swElapsed)}</div>
              {controls}
            </div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',marginBottom: displaySessions.length?12:0}}>
            <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 1.5"/><path d="M10 3h4"/></svg>}>Kronometre</WidgetTitle>
            <div style={{display:'flex',alignItems:'center',gap:14,justifySelf:'center'}}>
              <div style={{fontSize:clockFontSize,color:swRunning?'#34d399':'#e8edf5',fontFamily:'Lora,serif',letterSpacing:-1,fontVariantNumeric:'tabular-nums',transition:'color .3s'}}>{fmt(swElapsed)}</div>
              {controls}
            </div>
            <div/>
          </div>
        )}
        {displaySessions.length>0 && (
          <>
            <div style={{height:1,background:'rgba(255,255,255,0.06)',marginBottom:10}}/>
            <div onClick={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()} style={{display:'flex',flexDirection:'column',gap:7,flex:1,maxHeight: displaySessions.length>MAX_VISIBLE ? ROW_H*MAX_VISIBLE : 'none',overflowY: 'auto',paddingRight:6,cursor:'default',minHeight:0}} className="sw-session-scroll">
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
  const [bodyRef, body] = useElementSize();
  const baseH = 130;
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
// Kapak bulunursa gerçek kapaktan kırpılmış dar bir "sırt" gösterir (genişlik sayfa sayısına göre değişken kalır),
// bulunamazsa mevcut renkli/isimli SVG sırta düşer.
// Sayfa sayısına göre sırt genişliği/yüksekliği ve başlık metnini hesaplar
function computeSpineGeom(name, pages, { minP, maxP, minH, maxH, minW, maxW }) {
  const p = pages || 200;
  const r = Math.min(1, Math.max(0, (p - minP) / (maxP - minP)));
  const W = Math.round(minW + r * (maxW - minW));
  const H = Math.round(minH + r * (maxH - minH));
  const fs = Math.max(7, Math.min(W * 0.32, 16));
  const lineH = fs * 1.4, maxTW = H - 14;
  const words = name.split(' ');
  const lines = []; let cur = '';
  const cpp = Math.floor(maxTW / (fs * 0.58));
  words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (t.length <= cpp) { cur = t; } else { if (cur) lines.push(cur); cur = w; } });
  if (cur) lines.push(cur);
  const totalTH = lines.length * lineH;
  const startY = H / 2 - totalTH / 2 + fs * 0.85;
  const tspans = lines.map((l, i) => `<tspan x="${W/2}" y="${startY + i*lineH}">${l}</tspan>`).join('');
  return { W, H, fs, tspans };
}

// Gerçek kitap sırtı fotoğrafı hiçbir ücretsiz kaynakta yok (yayınevleri sadece ön kapak sağlıyor).
// Bu yüzden kalınlığı sayfa sayısına göre değişen, renkli + başlık etiketli bir sırt çiziyoruz —
// gerçek bir kitapçı rafındaki sırt etiketiyle aynı mantık.
function BookSpine({ book, geomParams, color, isReading }) {
  const cacheKey = book.name + '|' + (book.author || '');
  const cached = bookInfoCache[cacheKey];
  const [info, setInfo] = useState(cached || { cover: null, pages: null });
  useEffect(() => {
    if (cached) return;
    fetchBookInfo(book.name, book.author).then(setInfo);
  }, [book.name, book.author]);

  const cachedSpine = info.cover ? spineColorCache[info.cover] : undefined;
  const [spineColors, setSpineColors] = useState(cachedSpine ?? null);
  useEffect(() => {
    if (!info.cover) return;
    if (cachedSpine !== undefined) return;
    extractSpineColors(info.cover).then(setSpineColors);
  }, [info.cover]);

  const pages = parseInt(book.pages) || info.pages || 200;
  const { W, H, fs, tspans } = computeSpineGeom(book.name, pages, geomParams);
  const hoverIn = e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.filter = 'brightness(1.15)'; };
  const hoverOut = e => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; };

  // Kapaktan renk çıkarılabildiyse: baskınlık oranına göre iki bantlı sırt
  if (spineColors) {
    const { colorA, colorB, ratioA, textOnA } = spineColors;
    const titleFs = Math.max(9, Math.min(W * 0.34, 14));
    return (
      <div title={book.name} onMouseEnter={hoverIn} onMouseLeave={hoverOut}
        style={{ width: W, height: H, borderRadius: 3, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', transition: 'transform .2s, filter .2s', display: 'flex', flexDirection: 'column', outline: isReading ? '1.5px solid rgba(255,255,255,0.3)' : 'none' }}>
        <div style={{ flex: `0 0 ${ratioA}%`, minHeight: 0, background: colorA, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ writingMode: 'vertical-rl', color: textOnA, fontSize: titleFs, fontWeight: 500, fontFamily: 'system-ui,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '100%' }}>{book.name}</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, background: colorB }} />
      </div>
    );
  }

  // Kapak yok ya da renk çıkarılamadıysa (CORS engeli vb.): sabit renkli eski sırt
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{ flexShrink: 0, borderRadius: 3, cursor: 'pointer', transition: 'transform .2s,filter .2s', display: 'block', background: color, outline: isReading ? '1.5px solid rgba(255,255,255,0.3)' : 'none' }}
      title={book.name} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
      <text transform={`rotate(-90 ${W/2} ${H/2})`} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={fs} fontFamily="system-ui,sans-serif" fontWeight="500" dangerouslySetInnerHTML={{__html: tspans}} />
    </svg>
  );
}

function BookWidget({ books, onNavigate, size }) {
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
  const maxH = Math.round(stripH);
  const minH = Math.round(maxH * 0.6);
  const minW = Math.round(minH * (30/75));   // aşırı ince görünmesin diye artırıldı
  const maxW = Math.round(maxH * (52/125));
  const geomParams = { minP, maxP, minH, maxH, minW, maxW };
  const readCount = books.length;

  return (
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors overflow-hidden h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <WidgetTitle accent="#3a7bd5" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a7bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>}>Kitaplar ›</WidgetTitle>
        <div style={{fontSize:11,color:'rgba(232,237,245,0.35)',marginTop:-8}}><span style={{fontSize:15,color:'#4a7a5a',fontFamily:'Lora,serif',marginRight:3,fontWeight:700}}>{readCount}</span>okundu</div>
      </div>
      {books.length===0
        ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',padding:'8px 0'}}>Kitap yok</div>
        : <div ref={stripRef} style={{display:'flex',alignItems:'flex-end',gap:4,flex:1,minHeight:0,overflowX:'auto',paddingBottom:4,borderBottom:'1px solid rgba(255,255,255,0.05)',scrollbarWidth:'none'}}>
            {books.map((b,i)=>(<BookSpine key={i} book={b} geomParams={geomParams} color={b.color||'#2a3a5a'} isReading={b.status==='reading'} />))}
          </div>
      }
    </div>
  );
}

// ── FİLMLER ────────────────────────────────────────────────────────────
function FilmPoster({ film, width, height }) {
  const [poster, setPoster] = useState(posterCache[film.name] ?? null);
  const iconSize = Math.max(16, Math.round((width||58) * 0.38));
  useEffect(() => {
    if (poster) return;
    fetchPoster(film.name).then(url => { if (url) setPoster(url); });
  }, [film.name]);
  return poster
    ? <img src={poster} alt={film.name} title={film.name} style={{width,height,objectFit:'cover',borderRadius:4,flexShrink:0,display:'block'}}/>
    : <div title={film.name} style={{width,height,borderRadius:4,flexShrink:0,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 9l6 3-6 3V9z"/></svg>
      </div>;
}

function FilmWidget({ films, onNavigate, size }) {
  const sorted = [...films].sort((a, b) => {
    const da = a.date || '', db2 = b.date || '';
    if (da && db2) return db2.localeCompare(da);
    if (da) return -1; if (db2) return 1; return 0;
  });
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
  const ASPECT = 58/84;
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

// ── DİZİLER ────────────────────────────────────────────────────────────
function SeriesPoster({ series, width, height }) {
  const [poster, setPoster] = useState(seriesPosterCache[series.name] ?? null);
  const iconSize = Math.max(16, Math.round((width||58) * 0.38));
  useEffect(() => {
    if (poster) return;
    fetchSeriesPoster(series.name).then(url => { if (url) setPoster(url); });
  }, [series.name]);
  return poster
    ? <img src={poster} alt={series.name} title={series.name} style={{width,height,objectFit:'cover',borderRadius:4,flexShrink:0,display:'block'}}/>
    : <div title={series.name} style={{width,height,borderRadius:4,flexShrink:0,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M8 2l4 3 4-3"/></svg>
        <div style={{position:'absolute',left:0,right:0,top:'20%',height:1,background:'rgba(108,99,255,0.35)',animation:'seriesWidgetScan 2.4s ease-in-out infinite'}}/>
      </div>;
}

function SeriesWidget({ series, onNavigate, size }) {
  const sorted = [...series].sort((a, b) => {
    const da = a.date || '', db2 = b.date || '';
    if (da && db2) return db2.localeCompare(da);
    if (da) return -1; if (db2) return 1; return 0;
  });
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
  const ASPECT = 58/84;
  const posterH = Math.round(stripH);
  const posterW = Math.round(posterH * ASPECT);

  return (
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-surface3 transition-colors overflow-hidden h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <WidgetTitle accent="#6c63ff" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" fill="#6c63ff" fillOpacity=".3"/><path d="M8 2l4 3 4-3"/></svg>}>Diziler ›</WidgetTitle>
        <div style={{fontSize:11,color:'rgba(232,237,245,0.35)',marginTop:-8}}><span style={{fontSize:15,color:'#6c63ff',fontFamily:'Lora,serif',marginRight:3,fontWeight:700}}>{series.length}</span>izlendi</div>
      </div>
      {series.length===0
        ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',padding:'8px 0'}}>Dizi yok</div>
        : <div ref={stripRef} style={{display:'flex',alignItems:'stretch',gap:7,flex:1,minHeight:0,overflowX:'auto',overflowY:'hidden',paddingBottom:2,scrollbarWidth:'none'}}>
            {sorted.map((s,i)=>(<SeriesPoster key={i} series={s} width={posterW} height={posterH}/>))}
          </div>
      }
      <style>{`
        @keyframes seriesWidgetScan { 0%{top:15%} 50%{top:78%} 100%{top:15%} }
      `}</style>
    </div>
  );
}


// Uyarı şeridinde göstermek için: emoji yok, seviye kelimesi de yok —
// renk zaten seviyeyi anlatıyor, başına ayrıca renkli bir nokta konuyor (aşağıda).
function wxShortAlertText(a) {
  return a.title;
}

function WeatherWidget({ onNavigate, size }) {
  const { wxCities } = useStore();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  // wxCities Firestore'dan (başka bir cihazdan) güncellendiğinde ya da
  // Weather sayfasında sıra değiştirildiğinde otomatik yeniden çeker.
  const city = wxCities?.[0];

  useEffect(() => {
    if (!city) { setStatus('no-city'); return; }

    let cancelled = false;
    let retryTimer = null;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,uv_index,visibility,is_day,precipitation&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,precipitation_probability,precipitation,rain,snowfall,wind_speed_10m,wind_gusts_10m,visibility,uv_index,is_day,shortwave_radiation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=2`;
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=pm2_5,pm10,us_aqi&timezone=auto`;

    // Başarısız olursa kullanıcıya buton göstermeden 8sn sonra otomatik olarak yeniden dener.
    const load = () => {
      setStatus(prev => (prev === 'ok' ? prev : 'loading'));
      Promise.allSettled([fetch(url), fetch(airUrl)]).then(async ([wRes, aRes]) => {
        if (cancelled) return;
        try {
          if (wRes.status !== 'fulfilled' || !wRes.value.ok) throw new Error('http');
          const w = await wRes.value.json();
          if (!w.current || !w.daily || !w.hourly) throw new Error('data');
          const air = aRes.status === 'fulfilled' && aRes.value.ok ? await aRes.value.json() : null;
          setData({ ...w, city, air });
          setStatus('ok');
        } catch {
          if (cancelled) return;
          setStatus('error');
          retryTimer = setTimeout(load, 8000);
        }
      });
    };

    load();
    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
  }, [city?.lat, city?.lon]);

  if (status === 'no-city') return (
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-4 cursor-pointer hover:bg-surface3 transition-colors h-full w-full flex flex-col items-center justify-center">
      <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>Hava durumu için şehir ekle</div>
    </div>
  );
  if (status === 'loading') return (
    <div className="bg-surface2 border border-white/[0.08] rounded-2xl p-4 h-full w-full flex items-center justify-center">
      <div style={{width:20,height:20,border:'2px solid rgba(255,255,255,.1)',borderTopColor:'#3a7bd5',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
    </div>
  );
  if (status === 'error' || !data) return (
    <div onClick={onNavigate} className="bg-surface2 border border-white/[0.08] rounded-2xl p-4 cursor-pointer h-full w-full flex items-center justify-center">
      <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>Hava verisi yüklenemedi</div>
    </div>
  );

  const c = data.current || {};
  const maxTemp = data.daily?.temperature_2m_max?.[0];
  const minTemp = data.daily?.temperature_2m_min?.[0];
  const info = wxc(c.weather_code, c.is_day);
  const feelsDelta = c.apparent_temperature != null ? Math.round(c.apparent_temperature) - Math.round(c.temperature_2m) : 0;
  const windDeg = c.wind_direction_10m ?? 0;

  // o anki saatin ışık seviyesi (0-1), gerçek güneş ışınımı verisinden
  let brightness = c.is_day ? 0.7 : 0.05;
  if (data.hourly?.time && data.hourly?.shortwave_radiation) {
    const now = new Date();
    const idx = data.hourly.time.findIndex(t => {
      const d = new Date(t);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate() && d.getHours() === now.getHours();
    });
    if (idx >= 0) {
      const rad = data.hourly.shortwave_radiation[idx] ?? 0;
      brightness = Math.max(0.04, Math.min(1, rad / 800));
    }
  }

  const alerts = buildWeatherAlerts(data).slice(0, 5);
  const hasAlert = alerts.length > 0;
  const scrolling = alerts.length >= 3;
  const alertColors = { danger: '#f87171', warning: '#fb923c', info: '#9ca3af' };

  return (
    <div onClick={onNavigate} className="rounded-2xl cursor-pointer transition-colors h-full w-full flex flex-col overflow-hidden relative"
      style={{ background: wxBackground(info.bg, brightness) }}>
      <BgPrecip bg={info.bg}/>
      {hasAlert && (
        <div style={{position:'relative',background:'rgba(0,0,0,0.22)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'5px 14px',display:'flex',alignItems:'center',gap:7,overflow:'hidden',flexShrink:0}}>
          {scrolling ? (
            <div style={{display:'flex',gap:16,whiteSpace:'nowrap',animation:'wxWidgetScroll 16s linear infinite',fontSize:10,fontWeight:500}}>
              {[...alerts,...alerts].map((a,i)=>(
                <span key={i} style={{display:'inline-flex',alignItems:'center',gap:5,color:alertColors[a.level]}}>
                  <span style={{width:5,height:5,borderRadius:'50%',background:alertColors[a.level],flexShrink:0,display:'inline-block'}}/>
                  {wxShortAlertText(a)}
                </span>
              ))}
            </div>
          ) : (
            <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:10,fontWeight:500}}>
              {alerts.map((a,i)=>(
                <span key={i} style={{display:'inline-flex',alignItems:'center',gap:5,color:alertColors[a.level]}}>
                  <span style={{width:5,height:5,borderRadius:'50%',background:alertColors[a.level],flexShrink:0,display:'inline-block'}}/>
                  {wxShortAlertText(a)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{position:'relative',padding:'16px 16px 14px',flex:1,display:'flex',flexDirection:'column',minHeight:0,justifyContent:'center'}}>
        <div className="flex items-center justify-between mb-2">
          <WidgetTitle accent="#ffffff" icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16a4 4 0 00-4-4h-1A6 6 0 104 16"/><path d="M8 20l-1 3M13 20v3M18 20l1 3"/></svg>}>{data.city?.name?.split(',')[0]} ›</WidgetTitle>
          {(maxTemp!=null && minTemp!=null) && (
            <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:-8}}>Y:<span style={{color:'#fca5a5'}}>{Math.round(maxTemp)}°</span> D:<span style={{color:'#93c5fd'}}>{Math.round(minTemp)}°</span></div>
          )}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <WxIcon bg={info.bg} size={76}/>
          <div>
            <div style={{fontSize:38,fontWeight:600,color:'#fff',lineHeight:1.05,textShadow:'0 1px 4px rgba(0,0,0,.25)'}}>{Math.round(c.temperature_2m)}°</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.75)'}}>
              {info.t}{Math.abs(feelsDelta) >= 2 && ` · Hissedilen ${Math.round(c.apparent_temperature)}°`}
            </div>
          </div>
        </div>

        <div style={{display:'flex',gap:16,marginTop:12,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.18)',alignItems:'center'}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>Nem %{Math.round(c.relative_humidity_2m ?? 0)}</div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <WindCompass deg={windDeg} size={18}/>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>{Math.round(c.wind_speed_10m ?? 0)} km/s {degToCompass(windDeg)}</span>
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>UV {Math.round(c.uv_index ?? 0)}</div>
        </div>
      </div>
      <style>{`
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
    if (specials.length) upcoming.push({ ds, specials, isToday: ds===today });
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
        {WD.map(w=>(<div key={w} style={{textAlign:'center',fontSize:8,color:'rgba(232,237,245,0.25)',letterSpacing:'.05em',paddingBottom:4}}>{w}</div>))}
        {cells.map((ds,i)=>{
          if (!ds) return <div key={`e-${i}`}/>;
          const day = parseInt(ds.split('-')[2]);
          const isToday = ds===today;
          const dayDots = getDayDots(ds);
          return (
            <div key={ds} style={{display:'flex',alignItems:'center',justifyContent:'center',height:cellHeight,borderRadius:6,fontSize:cellFontSize,position:'relative',background: isToday?'rgba(123,94,167,0.35)':'transparent',color: isToday?'#c4b5fd':'rgba(232,237,245,0.6)',fontWeight: isToday?700:400,boxShadow: isToday?'0 0 0 1.5px rgba(123,94,167,0.6)':'none'}}>
              {day}
              {dayDots.length>0 && (
                <div style={{position:'absolute',bottom:2,left:'50%',transform:'translateX(-50%)',display:'flex',gap:2}}>
                  {dayDots.slice(0,3).map((dot,di)=>(<div key={di} style={{width:3,height:3,borderRadius:'50%',background:dot.color}}/>))}
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
              <span style={{fontSize:10,color:u.isToday?'#7ab8f5':'rgba(232,237,245,0.35)',fontWeight:u.isToday?600:400,flexShrink:0,width:42}}>{u.isToday?'Bugün':fmtShort(u.ds)}</span>
              <span style={{fontSize:11,color:'rgba(232,237,245,0.7)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{u.specials[0]?.n}</span>
              {u.specials.length > 1 && (<span style={{fontSize:9,color:'rgba(232,237,245,0.25)',flexShrink:0}}>+{u.specials.length - 1}</span>)}
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
if (!window._sw) window._sw = { running:false, startTime:null, elapsed:parseInt(localStorage.getItem('gn_sw_elapsed')||'0'), sessionStartLabel:null, sessionStartMs:parseInt(localStorage.getItem('gn_sw_segStart')||'0')||null };

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
  const [resizing, setResizing] = useState(null);
  const [liveSize, setLiveSize] = useState(null);
  const [moving, setMoving] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return ()=>window.removeEventListener('resize', onResize);
  },[]);

  useEffect(()=>{
    if(!swState) return;
    if(swState.running&&swState.startTime){
      if(!window._sw)window._sw={};
      const segStart = swState.segStart || swState.startTime;
      window._sw.running=true;
      window._sw.startTime=swState.startTime;
      window._sw.sessionStartMs=segStart;
      if (segStart) localStorage.setItem('gn_sw_segStart', segStart);
      window._sw.sessionStartLabel=segStart ? new Date(segStart).toTimeString().slice(0,8) : null;
      setSwRunning(true);
    }
    else if(swState.running===false){
      if(!window._sw)window._sw={};
      window._sw.running=false;
      window._sw.startTime=null;
      window._sw.sessionStartMs=null;
      localStorage.removeItem('gn_sw_segStart');
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
      localStorage.setItem('gn_sw_elapsed',elapsed); localStorage.removeItem('gn_sw_running'); localStorage.removeItem('gn_sw_startTime'); localStorage.removeItem('gn_sw_segStart');
      if(window._fbUser){import('../../lib/firebase').then(({saveToFirestore})=>{saveToFirestore(window._fbUser.uid,{gn_sw_elapsed:elapsed,gn_sw_running:false,gn_sw_startTime:null,gn_sw_segStart:null});});}
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
      const segStart=Date.now();
      const getNow=()=>{const n=new Date();return`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;};
      window._sw.startTime=startTime; window._sw.running=true;
      window._sw.sessionStartMs=segStart; window._sw.sessionStartLabel=getNow();
      localStorage.setItem('gn_sw_running','1'); localStorage.setItem('gn_sw_startTime',startTime); localStorage.setItem('gn_sw_segStart',segStart);
      if(window._fbUser){import('../../lib/firebase').then(({saveToFirestore})=>{saveToFirestore(window._fbUser.uid,{gn_sw_startTime:startTime,gn_sw_running:true,gn_sw_segStart:segStart});});}
      setSwRunning(true);
    }
  };

  const resetSw = (e) => {
    e.stopPropagation();
    window._sw.running=false; window._sw.elapsed=0; window._sw.startTime=null; window._sw.sessionStartMs=null;
    localStorage.setItem('gn_sw_elapsed','0'); localStorage.removeItem('gn_sw_segStart'); setSwElapsed(0); setSwRunning(false);
  };

  const handleWidgetToggle = (id) => {
    const nv = widgetVisible.includes(id) ? widgetVisible.filter(v=>v!==id) : [...widgetVisible,id];
    setWidgetVisible(nv); saveWidgetVisible(nv);
  };
  const handleWidgetReorder = (newOrder) => { setWidgetOrder(newOrder); saveWidgetOrder(newOrder); };

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

  const layout = computeLayout(widgetOrder, widgetVisible, mode, widgetSizes, widgetPositions);
  if (liveSize) {
    const lp = layout[liveSize.id];
    if (lp) lp.size = { col: liveSize.col, row: liveSize.row };
  }

  const positionFor = (id) => layout[id]?.position || { col:1, row:1 };

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
          let targetId = null;
          for (const wid of Object.keys(layout)) {
            if (wid === movingId) continue;
            const p = layout[wid].position, s = layout[wid].size;
            if (curr.col >= p.col && curr.col < p.col + s.col && curr.row >= p.row && curr.row < p.row + s.row) {
              targetId = wid; break;
            }
          }
          const newPositions = { ...(widgetPositions[mode] || {}) };
          Object.keys(layout).forEach(wid => { if(!newPositions[wid]) newPositions[wid] = layout[wid].position; });
          if (targetId) {
            const a = newPositions[movingId] || layout[movingId].position;
            const b = newPositions[targetId] || layout[targetId].position;
            newPositions[movingId] = b;
            newPositions[targetId] = a;
          } else {
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

  const today=todayStr();
  const chains=getChains();

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
      case 'series': content = <SeriesWidget series={db.sr||[]} onNavigate={()=>setCurrentPage('series')} size={size}/>; break;
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
      {/* Widget ayar butonu — sağ üst köşe */}
      <div style={{position:'absolute',top:12,right:12,zIndex:20}}>
        <button
          onClick={()=>setShowManager(true)}
          title="Widget'ları Düzenle"
          style={{width:34,height:34,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.45)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background .2s,color .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='rgba(255,255,255,0.75)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='rgba(255,255,255,0.45)';}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
        </button>
      </div>

      <div className="relative z-10 p-3 md:p-5 min-h-screen">
        {/* Widget grid */}
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
