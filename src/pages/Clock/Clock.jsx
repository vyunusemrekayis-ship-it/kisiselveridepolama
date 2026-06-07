import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, isGoalActive } from '../../lib/utils';

const fmtHMS = (ms) => {
  const t = Math.max(0, ms);
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

const getNowLabel = () => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
};

// Timestamp'i HH:MM:SS label'a çevir
const tsToLabel = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
};

const fsSync = (data) => {
  if (!window._fbUser) return;
  import('../../lib/firebase').then(({ saveToFirestore }) => {
    saveToFirestore(window._fbUser.uid, data);
  });
};

export default function Clock() {
  const { getSwLog, setSwLog, db, updateGoalProgress, swState, swLog: storeSwLog } = useStore();

  const initStartTime = parseInt(localStorage.getItem('gn_sw_startTime') || '0');
  const initRunning = localStorage.getItem('gn_sw_running') === '1' && initStartTime > 0;

  const startTimeRef = useRef(initRunning ? initStartTime : null);
  const sessionStartMsRef = useRef(initRunning ? Date.now() : null); // FIX: sayfa açıkken çalışıyorsa set et
  const sessionStartLabelRef = useRef(initRunning ? getNowLabel() : null); // FIX: aynı şekilde label da
  const isLocalSessionRef = useRef(initRunning); // FIX: sayfa açıkken çalışıyorsa local sayılsın

  const [running, setRunning] = useState(initRunning);
  const [displayMs, setDisplayMs] = useState(
    initRunning ? Math.max(0, Date.now() - initStartTime) : parseInt(localStorage.getItem('gn_sw_elapsed') || '0')
  );
  const [log, setLog] = useState(getSwLog());
  const justSavedRef = useRef(false); // toggleSw'den hemen sonra gelen onSnapshot'ı engeller

  // Store'daki swLog değişince (onSnapshot) log state'ini güncelle
  // Ama biz az önce kayıt ekledikten sonra onSnapshot gelirse üzerine yazmasın
  useEffect(() => {
    if (justSavedRef.current) { justSavedRef.current = false; return; }
    setLog(storeSwLog);
  }, [storeSwLog]);
  const [selected, setSelected] = useState(new Set());
  const [transferModal, setTransferModal] = useState(false);
  const [pickedGoal, setPickedGoal] = useState(null);

  // window._sw — Home widget uyumu için
  useEffect(() => {
    if (!window._sw) window._sw = { running: false, startTime: null, elapsed: 0, sessionStartLabel: null, sessionStartMs: null };
    window._sw.running = running;
    window._sw.startTime = startTimeRef.current;
    window._sw.elapsed = displayMs;
  });

  // Sayaç tick
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (startTimeRef.current) setDisplayMs(Math.max(0, Date.now() - startTimeRef.current));
    }, 100);
    return () => clearInterval(t);
  }, [running]);

  // Firestore'dan gelen swState değişikliğini dinle (onSnapshot → reloadDb → swState)
  const prevSwStateRef = useRef(null);
  useEffect(() => {
    if (!swState) return;
    if (swState === prevSwStateRef.current) return;
    prevSwStateRef.current = swState;

    if (swState.running && swState.startTime && !isLocalSessionRef.current) {
      // Başka cihaz başlattı
      startTimeRef.current = swState.startTime;
      // FIX: session start zamanını da kaydet ki bu cihazda durdurulunca süre hesaplanabilsin
      sessionStartMsRef.current = Date.now();
      sessionStartLabelRef.current = tsToLabel(swState.startTime);
      localStorage.setItem('gn_sw_startTime', swState.startTime);
      localStorage.setItem('gn_sw_running', '1');
      setRunning(true);
      setDisplayMs(Math.max(0, Date.now() - swState.startTime));
    } else if (!swState.running && !isLocalSessionRef.current && running) {
      // Başka cihaz durdurdu
      startTimeRef.current = null;
      sessionStartMsRef.current = null;
      sessionStartLabelRef.current = null;
      localStorage.removeItem('gn_sw_startTime');
      localStorage.removeItem('gn_sw_running');
      if (swState.elapsed !== undefined) {
        localStorage.setItem('gn_sw_elapsed', swState.elapsed);
        setDisplayMs(swState.elapsed);
      }
      setRunning(false);
      setLog(getSwLog());
    }
  }, [swState]);

  // Enter kısayolu
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter') toggleSw();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [running]);

  const toggleSw = () => {
    if (running) {
      const elapsed = Math.max(0, Date.now() - startTimeRef.current);
      // FIX: sessionStartMsRef null ise startTimeRef'ten hesapla (fallback)
      const sessionStart = sessionStartMsRef.current || startTimeRef.current || Date.now();
      const partDur = Math.max(0, Date.now() - sessionStart);

      localStorage.setItem('gn_sw_elapsed', elapsed);
      localStorage.removeItem('gn_sw_startTime');
      localStorage.removeItem('gn_sw_running');

      fsSync({ gn_sw_elapsed: elapsed, gn_sw_startTime: null, gn_sw_running: false });

      isLocalSessionRef.current = false;
      startTimeRef.current = null;
      sessionStartMsRef.current = null;
      setRunning(false);
      setDisplayMs(elapsed);

      const newEntry = {
        id: Date.now(),
        date: todayStr(),
        start: sessionStartLabelRef.current || '—',
        end: getNowLabel(),
        dur: partDur,
        note: '',
      };
      sessionStartLabelRef.current = null;
      const currentLog = JSON.parse(localStorage.getItem('gn_sw_log') || '[]');
      const newLog = [newEntry, ...currentLog];
      justSavedRef.current = true;
      setSwLog(newLog);
      setLog(newLog);
    } else {
      const currentElapsed = parseInt(localStorage.getItem('gn_sw_elapsed') || '0');
      const startTime = Date.now() - currentElapsed;

      sessionStartLabelRef.current = getNowLabel();
      sessionStartMsRef.current = Date.now();
      startTimeRef.current = startTime;
      isLocalSessionRef.current = true;

      localStorage.setItem('gn_sw_startTime', startTime);
      localStorage.setItem('gn_sw_running', '1');

      fsSync({ gn_sw_startTime: startTime, gn_sw_running: true });
      setRunning(true);
    }
  };

  const resetActive = () => {
    if (running) {
      if (!confirm('Aktif sayaç sıfırlansın mı? Kayıtlar silinmez.')) return;
      isLocalSessionRef.current = false;
      startTimeRef.current = null;
      sessionStartMsRef.current = null;
      sessionStartLabelRef.current = null;
      localStorage.removeItem('gn_sw_startTime');
      localStorage.removeItem('gn_sw_running');
      fsSync({ gn_sw_startTime: null, gn_sw_running: false, gn_sw_elapsed: 0 });
      setRunning(false);
    }
    localStorage.setItem('gn_sw_elapsed', '0');
    fsSync({ gn_sw_elapsed: 0 });
    setDisplayMs(0);
  };

  const resetAll = () => {
    if (!confirm('Tüm kayıtlar silinsin mi?')) return;
    isLocalSessionRef.current = false;
    startTimeRef.current = null;
    sessionStartMsRef.current = null;
    sessionStartLabelRef.current = null;
    localStorage.setItem('gn_sw_elapsed', '0');
    localStorage.removeItem('gn_sw_startTime');
    localStorage.removeItem('gn_sw_running');
    fsSync({ gn_sw_elapsed: 0, gn_sw_startTime: null, gn_sw_running: false, gn_sw_log: [] });
    setRunning(false);
    setDisplayMs(0);
    setSwLog([]);
    setLog([]);
    setSelected(new Set());
  };

  const updateNote = (id, note) => {
    const newLog = getSwLog().map(e => e.id === id ? { ...e, note } : e);
    setSwLog(newLog); setLog(newLog);
  };

  const deleteEntry = (id) => {
    const newLog = getSwLog().filter(e => e.id !== id);
    setSwLog(newLog); setLog(newLog);
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleSelect = (id) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const selectAll = () => { if (selected.size === log.length) setSelected(new Set()); else setSelected(new Set(log.map(e => e.id))); };

  const selectedMs = log.filter(e => selected.has(e.id)).reduce((s, e) => s + e.dur, 0);
  const selectedHours = parseFloat((selectedMs / 3600000).toFixed(2));
  const activeGoals = (db.g || []).filter(g => isGoalActive(g) && g.track === 'manual' && parseFloat(g.target) > 0);

  const doTransfer = () => {
    if (pickedGoal === null) return;
    const g = db.g[pickedGoal];
    updateGoalProgress(pickedGoal, parseFloat(((parseFloat(g.current) || 0) + selectedHours).toFixed(2)));
    setTransferModal(false); setPickedGoal(null); setSelected(new Set());
    alert(`${selectedHours} saat → "${g.name}" hedefine eklendi.`);
  };

  return (
    <div className="animate-fadeIn min-h-screen flex flex-col items-center pt-16 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="font-serif leading-none tracking-tighter text-text mb-2" style={{ fontSize: 'clamp(52px, 12vw, 86px)', textShadow: '0 2px 32px rgba(58,123,213,.15)' }}>
            {fmtHMS(displayMs)}
          </div>
          <div className="text-xs text-muted2 tracking-widest uppercase">{running ? 'Çalışıyor' : 'Duraklat\u0131ld\u0131'}</div>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={toggleSw}
            className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all bg-accent text-white border border-accent/50 hover:bg-accent/90"
          >
            Başlat / Devam
          </button>
          <button
            onClick={resetActive}
            className="px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-all bg-surface2 border border-border text-muted hover:text-text"
          >
            ↺ Sıfırla
          </button>
          <button
            onClick={resetAll}
            className="px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-all bg-surface2 border border-border text-muted hover:text-red-400"
          >
            Tümünü Sil
          </button>
        </div>

        {log.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={selectAll} className="text-xs text-muted hover:text-text bg-transparent border-0 cursor-pointer transition-colors">
                {selected.size === log.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
              </button>
              {selected.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{fmtHMS(selectedMs)} seçili</span>
                  <button
                    onClick={() => setTransferModal(true)}
                    className="text-xs text-accent hover:text-accent/80 bg-transparent border-0 cursor-pointer transition-colors"
                  >
                    Hedefe Aktar →
                  </button>
                </div>
              )}
            </div>

            {log.map((entry, i) => (
              <div key={entry.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5 transition-colors ${selected.has(entry.id) ? 'bg-accent/5' : 'hover:bg-surface2'}`}>
                <div onClick={() => toggleSelect(entry.id)} className={`w-4 h-4 rounded border flex-shrink-0 cursor-pointer transition-colors flex items-center justify-center text-[10px] ${selected.has(entry.id) ? 'bg-accent border-accent text-white' : 'border-border2'}`}>
                  {selected.has(entry.id) ? '✓' : ''}
                </div>
                <div className="text-muted text-sm w-5 text-right flex-shrink-0">{log.length - i}</div>
                <input className="bg-surface2 border border-border rounded-lg px-2 py-1 text-sm text-text outline-none focus:border-accent transition-colors w-32 flex-shrink-0" placeholder="Not..." value={entry.note || ''} onChange={e => updateNote(entry.id, e.target.value)} />
                <div className="text-sm text-muted flex-shrink-0 hidden sm:block">{entry.start} – {entry.end}</div>
                <div className="font-serif text-sm text-text flex-shrink-0">{fmtHMS(entry.dur)}</div>
                <div className="text-sm text-muted flex-shrink-0 ml-auto">{entry.date}</div>
                <button onClick={() => deleteEntry(entry.id)} className="text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer text-lg flex-shrink-0">×</button>
              </div>
            ))}
          </div>
        )}

        {log.length === 0 && <div className="text-center text-muted text-sm py-8">Henüz kayıt yok</div>}
        <div className="text-center mt-6 text-[11px] text-muted2">Enter → Başlat / Durdur</div>
      </div>

      {transferModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={e => e.target === e.currentTarget && setTransferModal(false)}>
          <div className="bg-surface border border-border rounded-2xl p-5 w-[360px] max-w-[92vw] shadow-2xl animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <span className="font-serif text-[16px] text-accent2">Hedefe Aktar</span>
              <button onClick={() => setTransferModal(false)} className="bg-transparent border-0 text-muted cursor-pointer text-xl leading-none">×</button>
            </div>
            <div className="text-sm text-muted mb-4">Toplam <span className="text-text font-medium">{fmtHMS(selectedMs)}</span> ({selectedHours} saat) aktarılacak:</div>
            {activeGoals.length === 0 ? (
              <div className="text-sm text-muted text-center py-4">Manuel takipli aktif hedef yok</div>
            ) : (
              activeGoals.map((g, i) => (
                <div key={i} onClick={() => setPickedGoal(i)} className={`flex items-center justify-between px-3 py-2.5 rounded-xl mb-1.5 cursor-pointer transition-colors border ${pickedGoal === i ? 'border-accent bg-accent/8' : 'border-border hover:border-border2'}`}>
                  <span className="text-sm text-text">{g.name}</span>
                  <span className="text-xs text-muted">{g.current || 0}/{g.target} {g.unit}</span>
                </div>
              ))
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setTransferModal(false)} className="btn-cancel">İptal</button>
              <button onClick={doTransfer} disabled={pickedGoal === null} className="btn-save">Aktar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
