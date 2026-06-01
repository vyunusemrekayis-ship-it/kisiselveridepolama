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

// Todos widget — başlık + dış alan navigate eder, iç etkileşimler etkilemez
function TodoWidget({ todos, today, onNavigate, getTodos, setTodos }) {
  const [localTodos, setLocalTodos] = useState(todos);
  const [addInput, setAddInput] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef(null);

  // todos değişince senkronize et
  useEffect(() => { setLocalTodos(todos); }, [todos]);

  const refresh = () => {
    const t = getTodos();
    setLocalTodos(t[today] || []);
  };

  const toggle = (e, i) => {
    e.stopPropagation();
    const t = getTodos();
    if (t[today]?.[i]) t[today][i].done = !t[today][i].done;
    setTodos(t);
    refresh();
  };

  const startEdit = (e, i, text) => {
    e.stopPropagation();
    setEditingIdx(i);
    setEditText(text);
  };

  const saveEdit = (e, i) => {
    e.stopPropagation();
    if (!editText.trim()) return;
    const t = getTodos();
    if (t[today]?.[i]) t[today][i].text = editText.trim();
    setTodos(t);
    setEditingIdx(null);
    refresh();
  };

  const deleteTodo = (e, i) => {
    e.stopPropagation();
    const t = getTodos();
    if (t[today]) t[today].splice(i, 1);
    setTodos(t);
    refresh();
  };

  const addTodo = (e) => {
    e.stopPropagation();
    if (!addInput.trim()) return;
    const t = getTodos();
    if (!t[today]) t[today] = [];
    t[today].push({ text: addInput.trim(), done: false });
    setTodos(t);
    setAddInput('');
    refresh();
  };

  const handleInputKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') addTodo(e);
  };

  const handleEditKeyDown = (e, i) => {
    e.stopPropagation();
    if (e.key === 'Enter') saveEdit(e, i);
    if (e.key === 'Escape') { e.stopPropagation(); setEditingIdx(null); }
  };

  return (
    <div
      onClick={onNavigate}
      className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-black/40 transition-colors"
    >
      {/* Başlık — tıklama navigate */}
      <div className="text-xs uppercase tracking-wider text-white/60 mb-3 font-medium">
        Bugünün Görevleri ›
      </div>

      {/* Görev listesi */}
      {localTodos.length === 0
        ? <div className="text-xs text-white/30">Görev yok</div>
        : localTodos.slice(0, 4).map((t, i) => (
          <div
            key={i}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-2 text-sm py-0.5 group"
          >
            {/* Checkbox */}
            <div
              onClick={e => toggle(e, i)}
              className={`w-3 h-3 rounded border flex-shrink-0 cursor-pointer transition-colors ${t.done ? 'bg-[#237F52] border-[#237F52]' : 'border-white/30 hover:border-white/60'}`}
            />
            {/* Görev metni veya edit input */}
            {editingIdx === i ? (
              <input
                autoFocus
                value={editText}
                onClick={e => e.stopPropagation()}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => handleEditKeyDown(e, i)}
                onBlur={e => saveEdit(e, i)}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#e8edf5', outline: 'none' }}
                className="flex-1 rounded px-1.5 py-0.5 text-xs min-w-0"
              />
            ) : (
              <>
                <span className={`flex-1 truncate select-none text-xs ${t.done ? 'line-through text-white/30' : 'text-white/80'}`}>
                  {t.text}
                </span>
                <button
                  onClick={e => startEdit(e, i, t.text)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0, fontSize: 11 }}
                  className="transition-opacity hover:text-white/70"
                  title="Düzenle"
                >✎</button>
                <button
                  onClick={e => deleteTodo(e, i)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0, fontSize: 14 }}
                  className="transition-opacity hover:text-red-400"
                  title="Sil"
                >×</button>
              </>
            )}
          </div>
        ))
      }

      {/* Görev ekle input */}
      <div
        onClick={e => e.stopPropagation()}
        className="flex gap-1.5 mt-3"
      >
        <input
          ref={inputRef}
          value={addInput}
          onChange={e => { e.stopPropagation(); setAddInput(e.target.value); }}
          onKeyDown={handleInputKeyDown}
          onClick={e => e.stopPropagation()}
          placeholder="Görev ekle..."
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(232,237,245,0.8)', outline: 'none' }}
          className="flex-1 rounded-lg px-2.5 py-1 text-xs min-w-0 placeholder-white/25 transition-colors"
        />
        <button
          onClick={addTodo}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(232,237,245,0.5)' }}
          className="w-6 h-6 rounded-lg text-sm leading-none cursor-pointer flex-shrink-0 flex items-center justify-center hover:opacity-80 transition-opacity"
        >+</button>
      </div>
    </div>
  );
}

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
  const todos = getTodos()[today] || [];
  const chains = getChains().slice(0, 3);

  const goals = (db.g || []).filter(g => g.period === goalPeriod && isGoalActive(g)).slice(0, 4);

  const totalBooks = db.b?.length || 0;
  const totalFilms = db.f?.length || 0;

  const { main: swMain } = swFmt(window._sw.running && window._sw.startTime ?
    Date.now() - window._sw.startTime : window._sw.elapsed);

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

          {/* Todos */}
          <TodoWidget
            todos={todos}
            today={today}
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
