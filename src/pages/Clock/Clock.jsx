import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { swFmt, todayStr } from '../../lib/utils';

if (!window._sw) {
  window._sw = { running: false, startTime: null, sessionStartLabel: null };
}

export default function Clock() {
  const { getSwLog, setSwLog } = useStore();
  const [tick, setTick] = useState(0);
  const [swRunning, setSwRunning] = useState(window._sw.running);
  const [log, setLog] = useState(getSwLog());

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter') toggleSw();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (swRunning) {
      const t = setInterval(() => setTick(n => n + 1), 1000);
      return () => clearInterval(t);
    }
  }, [swRunning]);

  const getNowLabel = () => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
  };

  const fmtHMS = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const toggleSw = () => {
    if (window._sw.running) {
      // Durdur → oturumu kaydet
      const elapsed = Date.now() - window._sw.startTime;
      window._sw.running = false;
      window._sw.startTime = null;
      setSwRunning(false);

      const newLog = getSwLog();
      newLog.unshift({
        id: Date.now(),
        date: todayStr(),
        start: window._sw.sessionStartLabel || '—',
        end: getNowLabel(),
        dur: elapsed,
        note: '',
      });
      setSwLog(newLog);
      setLog(newLog);
    } else {
      // Başlat
      window._sw.sessionStartLabel = getNowLabel();
      window._sw.startTime = Date.now();
      window._sw.running = true;
      setSwRunning(true);
    }
  };

  const resetAll = () => {
    if (!confirm('Tüm kayıtlar silinsin mi?')) return;
    window._sw.running = false;
    window._sw.startTime = null;
    setSwRunning(false);
    setTick(0);
    setSwLog([]);
    setLog([]);
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
  };

  // Toplam süre = geçmiş kayıtlar + aktif oturum
  const logTotal = log.reduce((s, e) => s + e.dur, 0);
  const activeElapsed = swRunning && window._sw.startTime ? Date.now() - window._sw.startTime : 0;
  const totalMs = logTotal + activeElapsed;

  return (
    <div className="animate-fadeIn min-h-screen flex flex-col items-center pt-16 px-4">
      <div className="w-full max-w-2xl">

        {/* Sayaç */}
        <div className="text-center mb-6">
          <div className="font-serif leading-none tracking-tighter text-text mb-2" style={{ fontSize:'86px', textShadow:'0 2px 32px rgba(58,123,213,.15)' }}>
            {fmtHMS(totalMs)}
          </div>
          <div className="text-xs text-muted2 tracking-widest uppercase">Toplam Süre</div>
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
            onClick={resetAll}
            className="px-4 py-2 rounded-xl border border-border bg-transparent text-muted text-xs cursor-pointer hover:border-border2 hover:text-text transition-all"
          >
            Reset
          </button>
        </div>

        {/* Kayıt sayısı */}
        {log.length > 0 && (
          <div className="text-center mb-5 text-xs text-muted2">
            {log.length} oturum kaydedildi
          </div>
        )}

        {/* Kayıt listesi */}
        {log.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {log.map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface2 transition-colors">
                {/* Numara */}
                <div className="text-muted text-sm w-5 text-right flex-shrink-0">{log.length - i}</div>

                {/* Not alanı */}
                <input
                  className="bg-surface2 border border-border rounded-lg px-2 py-1 text-sm text-text outline-none focus:border-accent transition-colors w-32 flex-shrink-0"
                  placeholder="Not..."
                  value={entry.note || ''}
                  onChange={e => updateNote(entry.id, e.target.value)}
                />

                {/* Saat aralığı */}
                <div className="text-sm text-muted flex-shrink-0 hidden sm:block">{entry.start} – {entry.end}</div>

                {/* Süre */}
                <div className="font-serif text-sm text-text flex-shrink-0">{fmtHMS(entry.dur)}</div>

                {/* Tarih */}
                <div className="text-sm text-muted flex-shrink-0 ml-auto">{entry.date}</div>

                {/* Sil */}
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer text-lg flex-shrink-0"
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Kısayol */}
        <div className="text-center mt-6 text-[11px] text-muted2">
          Enter → Başlat / Durdur
        </div>

      </div>
    </div>
  );
}
