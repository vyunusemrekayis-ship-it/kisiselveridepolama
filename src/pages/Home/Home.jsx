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

const PRIORITY_COLORS = {
  high:   { dot: '#ef4444' },
  medium: { dot: '#f59e0b' },
  low:    { dot: '#6b7280' },
};

const ALL_WIDGET_IDS = ['todos','goals','stopwatch','chains','books'];
const WIDGET_LABELS = { todos:'Görevler', goals:'Hedefler', stopwatch:'Kronometre', chains:'Zincir Kırma', books:'Kitaplar' };

function loadWidgetOrder() {
  try { return JSON.parse(localStorage.getItem('gn_widget_order') || JSON.stringify(ALL_WIDGET_IDS)); } catch { return [...ALL_WIDGET_IDS]; }
}
function loadWidgetVisible() {
  try { return JSON.parse(localStorage.getItem('gn_widget_visible') || JSON.stringify(ALL_WIDGET_IDS)); } catch { return [...ALL_WIDGET_IDS]; }
}
function saveWidgetOrder(order) { localStorage.setItem('gn_widget_order', JSON.stringify(order)); }
function saveWidgetVisible(visible) { localStorage.setItem('gn_widget_visible', JSON.stringify(visible)); }

function getDateKey(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}
function getWeekKeys() { return Array.from({length:7},(_,i)=>getDateKey(i)); }

function WidgetTitle({ children }) {
  return <div className="text-xs uppercase tracking-wider text-white/60 mb-3 font-medium">{children}</div>;
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
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors">
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
      <div onClick={e=>e.stopPropagation()} style={{maxHeight:200,overflowY:'auto',marginBottom:sorted.length?8:0}} className="custom-scroll">
        {sorted.length===0 ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',padding:'4px 0'}}>Görev yok</div>
          : sorted.map((t,i)=>{
            const pc=PRIORITY_COLORS[t.priority||'medium'];
            const isEditing=editingKey?.dk===t.dateKey&&editingKey?.idx===t.idx;
            return (
              <div key={`${t.dateKey}-${t.idx}`} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:i<sorted.length-1?'1px solid rgba(255,255,255,0.04)':'none'}}>
                <div onClick={e=>{const o=['high','medium','low'];const cur=t.priority||'medium';setPrio(e,t.dateKey,t.idx,o[(o.indexOf(cur)+1)%3]);}} style={{width:6,height:6,borderRadius:'50%',background:pc.dot,flexShrink:0,cursor:'pointer'}}/>
                <div onClick={e=>toggle(e,t.dateKey,t.idx)} style={{width:12,height:12,borderRadius:3,border:t.done?'none':'1px solid rgba(255,255,255,0.3)',background:t.done?'#3a7bd5':'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {t.done&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                {isEditing
                  ? <input autoFocus value={editText} onClick={e=>e.stopPropagation()} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveEdit(e);if(e.key==='Escape'){e.stopPropagation();setEditingKey(null);}}} onBlur={saveEdit} style={{flex:1,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#e8edf5',outline:'none',borderRadius:4,padding:'1px 6px',fontSize:11,minWidth:0}}/>
                  : <span onDoubleClick={e=>startEdit(e,t.dateKey,t.idx,t.text)} style={{flex:1,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.done?'rgba(255,255,255,0.25)':'rgba(232,237,245,0.85)',textDecoration:t.done?'line-through':'none',cursor:'default'}}>{t.text}</span>
                }
                {tab==='week'&&<span style={{fontSize:9,color:'rgba(255,255,255,0.25)',flexShrink:0}}>{fmtDate(t.dateKey)}</span>}
                {!isEditing&&<button onClick={e=>startEdit(e,t.dateKey,t.idx,t.text)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',padding:'0 1px',lineHeight:1,flexShrink:0,fontSize:10}}>✎</button>}
                <button onClick={e=>delTodo(e,t.dateKey,t.idx)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.25)',cursor:'pointer',padding:'0 1px',lineHeight:1,flexShrink:0,fontSize:13}}>×</button>
              </div>
            );
          })
        }
      </div>
      <div onClick={e=>e.stopPropagation()} style={{display:'flex',gap:5,alignItems:'center',marginTop:4}}>
        <div style={{display:'flex',gap:3}}>
          {['high','medium','low'].map(p=><div key={p} onClick={e=>{e.stopPropagation();setAddPriority(p);}} style={{width:8,height:8,borderRadius:'50%',background:PRIORITY_COLORS[p].dot,cursor:'pointer',flexShrink:0,opacity:addPriority===p?1:0.3,outline:addPriority===p?`2px solid ${PRIORITY_COLORS[p].dot}`:'none',outlineOffset:1}}/>)}
        </div>
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
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors">
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
function StopwatchWidget({ swElapsed, swRunning, swLog, onToggle, onReset, onNavigate }) {
  const fmt = (ms) => {
    const t = Math.max(0,ms);
    const h=Math.floor(t/3600000), m=Math.floor((t%3600000)/60000), s=Math.floor((t%60000)/1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const today = todayStr();
  const todaySessions = (swLog||[]).filter(e=>e.date===today);
  const SESS_COLORS = ['#3a7bd5','#7b5ea7','#34d399','#fb923c','#f87171'];

  return (
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:bg-black/40 transition-colors">
      <div style={{padding:'14px 16px 0'}}>
        <div className="text-xs uppercase tracking-wider text-white/60 font-medium mb-4">Kronometre</div>
        <div style={{fontSize:34,color:'#e8edf5',fontFamily:'Lora,serif',letterSpacing:-2,fontVariantNumeric:'tabular-nums',textAlign:'center',marginBottom:12}}>{fmt(swElapsed)}</div>
      </div>
      <div style={{height:56,position:'relative',overflow:'hidden'}}>
        <svg width="200%" height="56" viewBox="0 0 800 56" preserveAspectRatio="none"
          style={{position:'absolute',bottom:0,left:0,animation:'swWave1 6s linear infinite'}}>
          <defs>
            <linearGradient id="swGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a3a6a" stopOpacity="0.65"/>
              <stop offset="100%" stopColor="#0d1a35" stopOpacity="0.9"/>
            </linearGradient>
          </defs>
          <path d="M0 28 Q100 8 200 28 Q300 48 400 28 Q500 8 600 28 Q700 48 800 28 L800 56 L0 56 Z" fill="url(#swGrad)"/>
          <path d="M0 28 Q100 8 200 28 Q300 48 400 28 Q500 8 600 28 Q700 48 800 28" fill="none" stroke="rgba(58,123,213,0.25)" strokeWidth="1.5"/>
        </svg>
        <svg width="200%" height="56" viewBox="0 0 800 56" preserveAspectRatio="none"
          style={{position:'absolute',bottom:0,left:0,animation:'swWave2 9s linear infinite',opacity:0.4}}>
          <path d="M0 32 Q100 12 200 32 Q300 52 400 32 Q500 12 600 32 Q700 52 800 32 L800 56 L0 56 Z" fill="rgba(58,123,213,0.12)"/>
        </svg>
        <style>{`@keyframes swWave1{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes swWave2{from{transform:translateX(-50%)}to{transform:translateX(0%)}}`}</style>
      </div>
      <div style={{padding:'12px 16px 14px'}}>
        <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:todaySessions.length?12:0}}>
          <button onClick={e=>{e.stopPropagation();onToggle(e);}} style={{width:40,height:40,borderRadius:11,border:swRunning?'1px solid rgba(239,68,68,0.4)':'1px solid rgba(255,255,255,0.15)',background:swRunning?'rgba(239,68,68,0.1)':'rgba(255,255,255,0.07)',color:swRunning?'#f87171':'rgba(232,237,245,0.7)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}>
            {swRunning?'⏸':'▶'}
          </button>
          <button onClick={e=>{e.stopPropagation();onReset(e);}} style={{width:40,height:40,borderRadius:11,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'rgba(232,237,245,0.55)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>↺</button>
        </div>
        {todaySessions.length>0 && (
          <div onClick={e=>e.stopPropagation()} style={{borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:10,display:'flex',flexDirection:'column',gap:6,maxHeight:120,overflowY:'auto',scrollbarWidth:'none'}}>
            {todaySessions.map((s,i)=>(
              <div key={s.id||i} style={{display:'flex',alignItems:'center',gap:7}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:SESS_COLORS[i%SESS_COLORS.length],flexShrink:0}}/>
                <span style={{fontSize:11,color:'rgba(232,237,245,0.45)',flex:1}}>{s.start} – {s.end}</span>
                <span style={{fontSize:11,color:'rgba(232,237,245,0.6)',fontFamily:'Lora,serif',fontVariantNumeric:'tabular-nums'}}>{fmt(s.dur)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ZİNCİR ────────────────────────────────────────────────────────────────
function ChainWidget({ chains, onNavigate }) {
  const SEGS = 20;
  return (
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors">
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
    <div onClick={onNavigate} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 cursor-pointer hover:bg-black/40 transition-colors overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-white/60 font-medium">Kitaplar ›</div>
        <div style={{fontSize:11,color:'rgba(232,237,245,0.3)'}}><span style={{fontSize:14,color:'rgba(232,237,245,0.65)',fontFamily:'Lora,serif',marginRight:3}}>{readCount}</span>okundu</div>
      </div>
      {books.length===0
        ? <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',padding:'8px 0'}}>Kitap yok</div>
        : <div style={{display:'flex',alignItems:'flex-end',gap:4,height:130,overflowX:'auto',paddingBottom:4,borderBottom:'1px solid rgba(255,255,255,0.05)',scrollbarWidth:'none'}}>
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
  const { db, setCurrentPage, getTodos, setTodos, getChains, swState, swLog } = useStore();
  const [time, setTime] = useState(new Date());
  const [bgPhoto, setBgPhoto] = useState('');
  const [swElapsed, setSwElapsed] = useState(()=>parseInt(localStorage.getItem('gn_sw_elapsed')||'0'));
  const [swRunning, setSwRunning] = useState(()=>localStorage.getItem('gn_sw_running')==='1');
  const [widgetOrder, setWidgetOrder] = useState(loadWidgetOrder);
  const [widgetVisible, setWidgetVisible] = useState(loadWidgetVisible);
  const [showManager, setShowManager] = useState(false);

  useEffect(()=>{ const idx=Math.floor(Math.random()*PHOTOS.length); setBgPhoto(PHOTOS[idx]); },[]);

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

  const hh=String(time.getHours()).padStart(2,'0'), mm=String(time.getMinutes()).padStart(2,'0');
  const today=todayStr();
  const chains=getChains();
  const weekDays=[];
  const wd=new Date(time); wd.setDate(wd.getDate()-((wd.getDay()+6)%7));
  for(let i=0;i<7;i++){ const d=new Date(wd);d.setDate(d.getDate()+i); weekDays.push({d,isToday:d.toISOString().split('T')[0]===today}); }

  const renderWidget = (id) => {
    if (!widgetVisible.includes(id)) return null;
    switch(id) {
      case 'todos': return <TodoWidget key="todos" onNavigate={()=>setCurrentPage('calendar')} getTodos={getTodos} setTodos={setTodos}/>;
      case 'goals': return <GoalsWidget key="goals" db={db} onNavigate={()=>setCurrentPage('goals')}/>;
      case 'stopwatch': return <StopwatchWidget key="stopwatch" swElapsed={swElapsed} swRunning={swRunning} swLog={swLog} onToggle={toggleSw} onReset={resetSw} onNavigate={()=>setCurrentPage('clock')}/>;
      case 'chains': return <ChainWidget key="chains" chains={chains} onNavigate={()=>setCurrentPage('chain')}/>;
      case 'books': return <BookWidget key="books" books={db.b||[]} onNavigate={()=>setCurrentPage('books')}/>;
      default: return null;
    }
  };

  return (
    <div className="relative min-h-screen -m-5 md:-m-[26px_30px] overflow-hidden">
      {bgPhoto&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${bgPhoto})`,backgroundSize:'cover',backgroundPosition:'center',zIndex:0}}/>}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(13,15,19,.7) 0%,rgba(13,15,19,.4) 100%)',zIndex:1}}/>

      <div className="relative z-10 p-5 md:p-8 min-h-screen grid grid-rows-[auto_1fr_auto] gap-4">

        {/* Saat */}
        <div className="flex flex-col items-center justify-center py-8">
          <div className="font-serif font-normal leading-none tracking-tighter text-white" style={{fontSize:'clamp(52px,18vw,96px)',textShadow:'0 2px 24px rgba(0,0,0,.6)'}}>
            {hh}:{mm}
          </div>
          <div className="text-sm font-light tracking-[4px] uppercase mt-3 text-white/70">
            {TR_D[time.getDay()]}, {time.getDate()} {TR_M[time.getMonth()]} {time.getFullYear()}
          </div>
          {/* Düzenle butonu */}
          <button onClick={()=>setShowManager(true)} style={{marginTop:16,padding:'5px 16px',borderRadius:20,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.06)',color:'rgba(232,237,245,0.45)',fontSize:11,cursor:'pointer',letterSpacing:'0.05em',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='rgba(232,237,245,0.7)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='rgba(232,237,245,0.45)';}}>
            Widget'ları Düzenle
          </button>
        </div>

        {/* Widget grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
          {widgetOrder.map(id => renderWidget(id))}
        </div>

        {/* Mini takvim */}
        <div className="flex justify-center pb-4">
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4 w-fit">
            <div className="flex gap-1">
              {weekDays.map(({d,isToday},i)=>(
                <div key={i} className={`w-8 h-8 flex flex-col items-center justify-center rounded-lg text-xs ${isToday?'bg-accent text-white':'text-white/50'}`}>
                  <div style={{fontSize:8}}>{['Pt','Sa','Ça','Pe','Cu','Ct','Pz'][i]}</div>
                  <div>{d.getDate()}</div>
                </div>
              ))}
            </div>
          </div>
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
