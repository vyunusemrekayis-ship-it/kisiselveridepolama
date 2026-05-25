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
      className={`bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:bg-black/40 transition-colors' : ''} ${className}`}
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

// Stopwatch access
if (!window._sw) window._sw = { running: false, startTime: null, elapsed: parseInt(localStorage.getItem('gn_sw_elapsed')||'0'), interval: null };

export default function Home() {
  const { db, setCurrentPage, getTodos, getChains } = useStore();
  const [time, setTime] = useState(new Date());
  const [bgPhoto, setBgPhoto] = useState('');
  const [swElapsed, setSwElapsed] = useState(window._sw.elapsed);
  const [swRunning, setSwRunning] = useState(window._sw.running);
  const [goalPeriod, setGoalPeriod] = useState('weekly');

  useEffect(() => {
    const idx = Math.floor(Math.random() * PHOTOS.length);
    setBgPhoto(PHOTOS[idx]);

  }, []);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Stopwatch sync
  useEffect(() => {
    if (swRunning) {
      const t = setInterval(() => {
        const e = window._sw.startTime ? Date.now() - window._sw.startTime : window._sw.elapsed;
        setSwElapsed(e);
      }, 100);
      return () => clearInterval(t);
    }
  }, [swRunning]);

  const toggleSw = (e) => {
    e.stopPropagation();
    if (window._sw.running) {
      window._sw.elapsed = Date.now() - window._sw.startTime;
      window._sw.running = false; window._sw.startTime = null;
      localStorage.setItem('gn_sw_elapsed', window._sw.elapsed);
      setSwRunning(false);
    } else {
      window._sw.startTime = Date.now() - window._sw.elapsed;
      window._sw.running = true;
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

  const { main: swMain } = swFmt(window._sw.running && window._sw.startTime ? Date.now() - window._sw.startTime : window._sw.elapsed);

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
          <div className="font-serif text-[72px] md:text-[96px] font-normal leading-none tracking-tighter text-white" style={{ textShadow:'0 2px 24px rgba(0,0,0,.6)' }}>
            {hh}:{mm}
          </div>
          <div className="text-sm font-light tracking-[4px] uppercase mt-3 text-white/70">
            {TR_D[time.getDay()]}, {time.getDate()} {TR_M[time.getMonth()]} {time.getFullYear()}
          </div>
        </div>

        {/* Widgets grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">

          {/* Todos */}
          <Widget onClick={() => setCurrentPage('calendar')}>
            <WidgetTitle>Bugünün Görevleri ›</WidgetTitle>
            {todos.length === 0
              ? <div className="text-xs text-white/30">Görev yok</div>
              : todos.slice(0,4).map((t,i) => (
                <div key={i} className={`flex items-center gap-2 text-sm py-0.5 ${t.done ? 'line-through text-white/30' : 'text-white/80'}`}>
                  <div className={`w-3 h-3 rounded border flex-shrink-0 ${t.done ? 'bg-[#237F52] border-[#237F52]' : 'border-white/30'}`} />
                  <span className="truncate">{t.text}</span>
                </div>
              ))
            }
          </Widget>

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
