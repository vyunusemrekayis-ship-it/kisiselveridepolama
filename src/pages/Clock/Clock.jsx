import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, isGoalActive } from '../../lib/utils';

// window._sw: Home widget ve Clock arasında paylaşılan tek kaynak
// elapsed: aktif sayacın ms cinsinden değeri (log'dan bağımsız)
if (!window._sw) {
  window._sw = {
    running: false,
    startTime: null,
    elapsed: parseInt(localStorage.getItem('gn_sw_elapsed') || '0'),
    sessionStartLabel: null,
    sessionStartMs: null,
  };
} else if (!window._sw.running) {
  const stored = parseInt(localStorage.getItem('gn_sw_elapsed') || '0');
  if (stored !== window._sw.elapsed) window._sw.elapsed = stored;
}

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

export default function Clock() {
  const { getSwLog, setSwLog, db, updateGoalProgress } = useStore();
  const [swRunning, setSwRunning] = useState(window._sw.running);
  const [displayMs, setDisplayMs] = useState(() => {
    if (window._sw.running && window._sw.startTime) return Date.now() - window._sw.startTime;
    return parseInt(localStorage.getItem('gn_sw_elapsed') || '0');
  });
  const [log, setLog] = useState(getSwLog());
  const [selected, setSelected] = useState(new Set());
  const [transferModal, setTransferModal] = useState(false);
  const [pickedGoal, setPickedGoal] = useState(null);

  // Sayacı her saniye güncelle
  useEffect(() => {
    const t = setInterval(() => {
      if (window._sw.running && window._sw.startTime) {
        const e = Date.now() - window._sw.startTime;
        window._sw.elapsed = e;
        setDisplayMs(e);
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  // Diğer cihazdan başlatılınca sync
  useEffect(() => {
    const handler = () => {
      setSwRunning(true);
      setDisplayMs(Date.now() - window._sw.startTime);
    };
    window.addEventListener('sw_remote_start', handler);
    return () => window.removeEventListener('sw_remote_start', handler);
  }, []);

  // Enter kısayolu
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter') toggleSw();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const toggleSw = () => {
    if (window._sw.running) {
      // Durdur → log'a kaydet
      const elapsed = Date.now() - window._sw.startTime;
      const partDur = Date.now() - (window._sw.sessionStartMs || Date.now());
      window._sw.running = false;
      window._sw.elapsed = elapsed;
      window._sw.startTime = null;
      localStorage.setItem('gn_sw_elapsed', elapsed);
      setSwRunning(false);
      setDisplayMs(elapsed);

      const newLog = getSwLog();
      newLog.unshift({
        id: Date.now(),
        date: todayStr(),
        start: window._sw.sessionStartLabel || '—',
        end: getNowLabel(),
        dur: partDur,
        note: '',
      });
      setSwLog(newLog);
      setLog(newLog);
    } else {
      // Başlat — elapsed'tan devam et
      window._sw.sessionStartLabel = getNowLabel();
      window._sw.sessionStartMs = Date.now();
      window._sw.startTime = Date.now() - window._sw.elapsed;
      window._sw.running = true;
      setSwRunning(true);
      // startTime'ı Firestore'a kaydet — diğer cihaz buradan devam eder
      if (window._fbUser) { import('../../lib/firebase').then(({saveToFirestore}) => { saveToFirestore(window._fbUser.uid, {gn_sw_startTime: window._sw.startTime, gn_sw_running: true}); }); }
    }
  };

  // Sadece aktif sayacı sıfırla — log dokunulmaz
  const resetActive = () => {
    if (window._sw.running) {
      if (!confirm('Aktif sayaç sıfırlansın mı? Kayıtlar silinmez.')) return;
      window._sw.running = false;
      window._sw.startTime = null;
      setSwRunning(false);
    }
    window._sw.elapsed = 0;
    localStorage.setItem('gn_sw_elapsed', '0');
    setDisplayMs(0);
  };

  // Tüm kayıtları sil
  const resetAll = () => {
    if (!confirm('Tüm kayıtlar silinsin mi?')) return;
    window._sw.running = false;
    window._sw.startTime = null;
    window._sw.elapsed = 0;
    localStorage.setItem('gn_sw_elapsed', '0');
    setSwRunning(false);
    setDisplayMs(0);
    setSwLog([]);
    setLog([]);
    setSelected(new Set());
  };

  const updateNote = (id, note) => {
    const newLog = getSwLog().map(e => e.id === id ? { ...e, note } : e);
    setSwLog(newLog);
    setLog(newLog);
  };

  const deleteEntry = (id) => {
    const newLog = getSwLog().filter(e => e.id !== id);
    setSwLog(newLog);
    setLog(newLog);
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const selectAll = () => {
    if (selected.size === log.length) setSelected(new Set());
    else setSelected(new Set(log.map(e => e.id)));
  };

  const selectedMs = log.filter(e => selected.has(e.id)).reduce((s, e) => s + e.dur, 0);
  const selectedHours = parseFloat((selectedMs / 3600000).toFixed(2));

  const activeGoals = (db.g || []).filter(g => isGoalActive(g) && g.track === 'manual' && parseFloat(g.target) > 0);

  const doTransfer = () => {
    if (pickedGoal === null) return;
    const g = db.g[pickedGoal];
    const cur = parseFloat(g.current) || 0;
    updateGoalProgress(pickedGoal, parseFloat((cur + selectedHours).toFixed(2)));
    setTransferModal(false);
    setPickedGoal(null);
    setSelected(new Set());
    alert(`${selectedHours} saat → "${g.name}" hedefine eklendi.`);
  };

  return (
    <div className="animate-fadeIn min-h-screen flex flex-col items-center pt-16 px-4">
      <div className="w-full max-w-2xl">

        {/* Sayaç — sadece aktif elapsed gösterir, log toplamı değil */}
        <div className="text-center mb-6">
          <div className="font-serif leading-none tracking-tighter text-text mb-2" style={{ fontSize:'clamp(52px, 12vw, 86px)', textShadow:'0 2px 32px rgba(58,123,213,.15)' }}>
            {fmtHMS(displayMs)}
          </div>
          <div className="text-xs text-muted2 tracking-widest uppercase">
            {swRunning ? 'Çalışıyor' : 'Duraklatıldı'}
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={toggleSw}
            className={`px-6 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all min-w-[120px] ${
              swRunning
                ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
            }`}
          >
            {swRunning ? 'Durdur' : 'Başlat / Devam'}
          </button>

          <button
            onClick={resetActive}
            title="Aktif sayacı sıfırla (kayıtlar korunur)"
            className="px-4 py-2 rounded-xl border border-border bg-transparent text-muted text-xs cursor-pointer hover:border-border2 hover:text-text transition-all"
          >
            ↺ Sıfırla
          </button>

          <button
            onClick={resetAll}
            className="px-4 py-2 rounded-xl border border-border bg-transparent text-muted text-xs cursor-pointer hover:border-red-500/30 hover:text-red-400 transition-all"
          >
            Tümünü Sil
          </button>
        </div>

        {/* Seçim araç çubuğu */}
        {log.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              onClick={selectAll}
              className="text-xs text-muted hover:text-text cursor-pointer bg-transparent border-0 transition-colors"
            >
              {selected.size === log.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
            </button>

            {selected.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted2">
                  {selected.size} oturum — <span className="text-accent font-medium">{fmtHMS(selectedMs)}</span>
                </span>
                <button
                  onClick={() => { setPickedGoal(null); setTransferModal(true); }}
                  className="px-3 py-1 rounded-lg border border-accent/40 bg-accent/10 text-accent text-xs cursor-pointer hover:bg-accent/20 transition-all"
                >
                  Hedefe Aktar →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Kayıt listesi */}
        {log.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {log.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-2 px-3 py-3 border-b border-border last:border-0 transition-colors ${selected.has(entry.id) ? 'bg-accent/5' : 'hover:bg-surface2'}`}
              >
                <div
                  onClick={() => toggleSelect(entry.id)}
                  className={`w-4 h-4 rounded border flex-shrink-0 cursor-pointer transition-colors flex items-center justify-center text-[10px] ${
                    selected.has(entry.id) ? 'bg-accent border-accent text-white' : 'border-border2'
                  }`}
                >
                  {selected.has(entry.id) ? '✓' : ''}
                </div>

                <div className="text-muted text-sm w-5 text-right flex-shrink-0">{log.length - i}</div>

                <input
                  className="bg-surface2 border border-border rounded-lg px-2 py-1 text-sm text-text outline-none focus:border-accent transition-colors w-32 flex-shrink-0"
                  placeholder="Not..."
                  value={entry.note || ''}
                  onChange={e => updateNote(entry.id, e.target.value)}
                />

                <div className="text-sm text-muted flex-shrink-0 hidden sm:block">{entry.start} – {entry.end}</div>
                <div className="font-serif text-sm text-text flex-shrink-0">{fmtHMS(entry.dur)}</div>
                <div className="text-sm text-muted flex-shrink-0 ml-auto">{entry.date}</div>

                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer text-lg flex-shrink-0"
                >×</button>
              </div>
            ))}
          </div>
        )}

        {log.length === 0 && (
          <div className="text-center text-muted text-sm py-8">Henüz kayıt yok</div>
        )}

        <div className="text-center mt-6 text-[11px] text-muted2">
          Enter → Başlat / Durdur
        </div>
      </div>

      {/* Hedefe Aktar Modal */}
      {transferModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={e => e.target === e.currentTarget && setTransferModal(false)}
        >
          <div className="bg-surface border border-border rounded-2xl p-5 w-[360px] max-w-[92vw] shadow-2xl animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <span className="font-serif text-[16px] text-accent2">Hedefe Aktar</span>
              <button onClick={() => setTransferModal(false)} className="bg-transparent border-0 text-muted cursor-pointer text-xl leading-none">×</button>
            </div>

            <div className="text-sm text-muted mb-4">
              Toplam <span className="text-text font-medium">{fmtHMS(selectedMs)}</span> ({selectedHours} saat) aktarılacak:
            </div>

            {activeGoals.length === 0 ? (
              <div className="text-sm text-muted text-center py-4">Aktif manuel hedef bulunamadı.</div>
            ) : (
              <div className="space-y-2 mb-4 max-h-[240px] overflow-y-auto">
                {activeGoals.map((g) => {
                  const origIdx = db.g.indexOf(g);
                  const cur = parseFloat(g.current) || 0;
                  const tgt = parseFloat(g.target) || 0;
                  const after = parseFloat((cur + selectedHours).toFixed(2));
                  return (
                    <div
                      key={origIdx}
                      onClick={() => setPickedGoal(origIdx)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        pickedGoal === origIdx
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-border2 bg-surface2'
                      }`}
                    >
                      <div>
                        <div className="text-sm text-text">{g.name}</div>
                        <div className="text-xs text-muted mt-0.5">
                          {cur} → <span className="text-accent">{after}</span> / {tgt} {g.unit || ''}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] flex-shrink-0 ${
                        pickedGoal === origIdx ? 'bg-accent border-accent text-white' : 'border-border2'
                      }`}>
                        {pickedGoal === origIdx ? '✓' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button className="btn-cancel" onClick={() => setTransferModal(false)}>İptal</button>
              <button
                className="btn-save"
                onClick={doTransfer}
                disabled={pickedGoal === null}
                style={{ opacity: pickedGoal === null ? 0.4 : 1 }}
              >
                Aktar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
