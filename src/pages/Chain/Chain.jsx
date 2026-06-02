import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, calcChainStreak } from '../../lib/utils';

const COLORS = [
  '#3a7bd5','#237F52','#7b5ea7','#f97316',
  '#c0392b','#0ea5e9','#d4ac0d','#d4537e',
  '#2874a6','#b05a30','#4a7a5a','#6366f1',
];

const DAYS = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

function fmtDate(ds) {
  if (!ds) return '—';
  const [y, m, d] = ds.split('-');
  return `${parseInt(d)}.${m}.${y}`;
}

function ChainForm({ chain, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', color: '#3a7bd5', start: todayStr(), end: '', ...chain });
  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Alışkanlık Adı *</label>
          <input className="form-input" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Kitap oku" />
        </div>
        <div>
          <label className="form-label">Renk</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                className="w-7 h-7 rounded-full cursor-pointer border-2 transition-all flex-shrink-0"
                style={{ background: c, borderColor: form.color === c ? '#fff' : 'transparent' }} />
            ))}
          </div>
        </div>
        <div>
          <label className="form-label">Başlangıç Tarihi</label>
          <input type="date" className="form-input" value={form.start}
            onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
        </div>
        <div>
          <label className="form-label">Bitiş Tarihi <span className="text-muted normal-case">(isteğe bağlı)</span></label>
          <input type="date" className="form-input" value={form.end || ''}
            onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name.trim()) { alert('Ad zorunludur'); return; } onSave(form); }}>Kaydet</button>
      </div>
    </div>
  );
}

// MiniChain: başlangıç gününden bugüne kadar sırayla büyüyen zincir
// onExpand: "Tüm Zinciri Gör" butonuna tıklanınca çağrılır
function MiniChain({ chain, color, onExpand }) {
  const { todayIdx, doneSet } = calcChainStreak(chain);
  const startMs = new Date(chain.start + 'T00:00:00').getTime();

  // Başlangıçtan bugüne kadar olan günleri göster (max 30, scroll ile görülebilir)
  const totalVisible = todayIdx + 1; // 0'dan todayIdx dahil
  const nodes = [];
  for (let i = 0; i < totalVisible; i++) {
    nodes.push({ idx: i, isToday: i === todayIdx, done: doneSet.has(i) });
  }

  return (
    <div>
      <div
        className="flex items-center overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {nodes.length === 0 ? (
          <div className="text-xs text-muted italic">Henüz gün yok</div>
        ) : (
          nodes.map((n, i) => {
            const d = new Date(startMs + n.idx * 86400000);
            return (
              <div key={n.idx} className="flex items-center flex-shrink-0">
                <div
                  className="flex flex-col items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    width: 28, height: 28,
                    border: `2px solid ${n.done ? color : n.isToday ? color : 'rgba(255,255,255,0.18)'}`,
                    background: n.done ? color : 'transparent',
                    color: n.done ? '#fff' : n.isToday ? color : 'rgba(232,237,245,0.45)',
                    boxShadow: n.isToday && !n.done ? `0 0 0 2px rgba(255,255,255,0.12)` : 'none',
                    fontSize: 9, fontWeight: 500, lineHeight: 1,
                  }}
                >
                  <span>{d.getDate()}</span>
                  <span style={{ fontSize: 6.5, opacity: 0.7, marginTop: 1 }}>{DAYS[d.getDay()]}</span>
                </div>
                {i < nodes.length - 1 && (
                  <div style={{
                    width: 8, height: 3, flexShrink: 0, borderRadius: 1.5,
                    background: n.done && nodes[i + 1]?.done ? color + '55' : 'rgba(255,255,255,0.1)',
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Tüm Zinciri Gör butonu */}
      <button
        onClick={e => { e.stopPropagation(); onExpand(); }}
        className="mt-2 text-xs cursor-pointer bg-transparent border-0 transition-opacity"
        style={{
          color: color,
          opacity: 0.7,
          padding: '2px 0',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
      >
        Tüm Zinciri Gör ›
      </button>
    </div>
  );
}

function BigChain({ chain, onToggleDay }) {
  const { doneSet } = calcChainStreak(chain);
  const color = chain.color || '#3a7bd5';
  const startMs = new Date(chain.start + 'T00:00:00').getTime();
  const endMs = chain.end ? new Date(chain.end + 'T00:00:00').getTime() : startMs + 364 * 86400000;
  const totalDays = Math.round((endMs - startMs) / 86400000) + 1;
  const todayDs = todayStr();
  // Her node 42px + 8px connector = 50px. Container ~(vw - sidebar - padding) ≈ vw - 280px
  const nodeW = 50;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const sidebarW = isMobile ? 0 : (document.querySelector('aside')?.offsetWidth || 220);
  const padding = isMobile ? 32 : 60;
  const available = typeof window !== 'undefined' ? Math.max(window.innerWidth - sidebarW - padding, 280) : 800;
  const ROW = Math.max(7, Math.floor(available / nodeW));
  const rows = Math.ceil(totalDays / ROW);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
            {Array.from({ length: ROW }, (_, c) => {
              const dayIdx = r * ROW + c;
              if (dayIdx >= totalDays) return null;
              const d = new Date(startMs + dayIdx * 86400000);
              // Yerel saat dilimine göre tarih hesapla (UTC farkından kaçın)
              const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              const isToday = ds === todayDs;
              const isFuture = ds > todayDs;
              const done = doneSet.has(dayIdx);
              const nextDone = doneSet.has(dayIdx + 1);

              return (
                <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <div
                    onClick={() => !isFuture && onToggleDay(dayIdx)}
                    style={{
                      width: 42, height: 42, borderRadius: '50%',
                      cursor: isFuture ? 'default' : 'pointer',
                      border: `2px solid ${done ? color : isToday ? color : isFuture ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)'}`,
                      background: done ? color : 'transparent',
                      // Gelecek günler: border soluk AMA yazı okunabilir olsun
                      color: done ? '#fff' : isToday ? color : isFuture ? 'rgba(232,237,245,0.35)' : 'rgba(232,237,245,0.55)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: 11, fontWeight: 600, lineHeight: 1,
                      boxShadow: isToday ? '0 0 0 3px rgba(255,255,255,0.15)' : 'none',
                      // Gelecek günler için opacity kaldırıldı, renk ile ayırt ediliyor
                      opacity: 1,
                      transition: 'background .12s, border-color .12s',
                    }}>
                    <span>{d.getDate()}</span>
                    <span style={{ fontSize: 8, opacity: 0.65, marginTop: 1.5 }}>{DAYS[d.getDay()]}</span>
                  </div>
                  {c < ROW - 1 && dayIdx < totalDays - 1 && (
                    <div style={{
                      width: 8, height: 4, flexShrink: 0, borderRadius: 2,
                      background: done && nextDone ? color + '45' : isFuture ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Chain() {
  const { getChains, setChains, chains: storeChains } = useStore();
  const [chains, setLocalChains] = useState(getChains());

  useEffect(() => { setLocalChains(storeChains); }, [storeChains]);
  const [showForm, setShowForm] = useState(false);
  const [editingChain, setEditingChain] = useState(null);
  const [selectedChain, setSelectedChain] = useState(null);

  const save = (newChains) => { setChains(newChains); setLocalChains(newChains); };

  const handleSave = (form) => {
    const list = [...chains];
    if (editingChain !== null) {
      list[editingChain] = { ...list[editingChain], ...form };
      setEditingChain(null);
    } else {
      list.push({ ...form, done: [] });
    }
    save(list);
    setShowForm(false);
  };

  const handleMarkToday = (i) => {
    const list = JSON.parse(JSON.stringify(chains));
    const ch = list[i];
    const startMs = new Date(ch.start + 'T00:00:00').getTime();
    const idx = Math.floor((Date.now() - startMs) / 86400000);
    const doneSet = new Set(ch.done || []);
    doneSet.has(idx) ? doneSet.delete(idx) : doneSet.add(idx);
    ch.done = Array.from(doneSet);
    save(list);
  };

  const handleToggleDay = (chainIdx, dayIdx) => {
    const list = JSON.parse(JSON.stringify(chains));
    const ch = list[chainIdx];
    const doneSet = new Set(ch.done || []);
    doneSet.has(dayIdx) ? doneSet.delete(dayIdx) : doneSet.add(dayIdx);
    ch.done = Array.from(doneSet);
    save(list);
  };

  const handleDelete = (i) => {
    if (!confirm('Silinsin mi?')) return;
    const list = [...chains]; list.splice(i, 1);
    if (selectedChain === i) setSelectedChain(null);
    else if (selectedChain !== null && selectedChain > i) setSelectedChain(selectedChain - 1);
    save(list);
  };

  // Özet
  let todayDone = 0, maxStreak = 0;
  chains.forEach(ch => {
    const { streak, todayIdx, doneSet } = calcChainStreak(ch);
    if (doneSet.has(todayIdx)) todayDone++;
    if (streak > maxStreak) maxStreak = streak;
  });
  const totalDaysAll = chains.reduce((s, ch) => {
    const sMs = new Date(ch.start + 'T00:00:00').getTime();
    const eMs = ch.end ? new Date(ch.end + 'T00:00:00').getTime() : Date.now();
    return s + Math.max(1, Math.round((eMs - sMs) / 86400000) + 1);
  }, 0);
  const totalDone = chains.reduce((s, ch) => s + (ch.done?.length || 0), 0);
  const pctAll = totalDaysAll > 0 ? Math.round(totalDone / totalDaysAll * 100) : 0;

  const sel = selectedChain !== null && selectedChain < chains.length ? chains[selectedChain] : null;
  const selData = sel ? calcChainStreak(sel) : null;

  return (
    <div className="animate-fadeIn">

      {/* Başlık */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Zincir Kırma</h2>
        <button className="btn-primary" onClick={() => { setEditingChain(null); setShowForm(s => !s); }}>+ Alışkanlık Ekle</button>
      </div>

      {showForm && (
        <ChainForm
          chain={editingChain !== null ? chains[editingChain] : {}}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingChain(null); }}
        />
      )}

      {chains.length === 0 ? (
        <div className="empty-state"><div className="text-3xl opacity-30 mb-3">🔗</div>Henüz alışkanlık eklemediniz</div>
      ) : (
        <>
          {/* Özet bant */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 bg-surface border border-border rounded-xl overflow-hidden mb-4">
            {[
              { v: chains.length, l: 'takip edilen' },
              { v: todayDone, l: 'bugün yapıldı', c: '#4ade80' },
              { v: maxStreak, l: 'en uzun seri', c: '#f97316' },
              { v: pctAll + '%', l: 'genel başarı' },
            ].map((item, i) => (
              <div key={i} className="px-5 py-3" style={{ borderRight: i < 3 ? '0.5px solid rgba(255,255,255,0.07)' : 'none' }}>
                <div className="text-xl font-medium" style={{ color: item.c || '#e8edf5' }}>{item.v}</div>
                <div className="text-xs text-muted mt-0.5">{item.l}</div>
              </div>
            ))}
          </div>

          {/* Alışkanlık listesi — kartlar */}
          <div className="flex flex-col gap-px bg-border rounded-xl overflow-hidden mb-4">
            {chains.map((ch, i) => {
              const { todayIdx, doneSet } = calcChainStreak(ch);
              const isTodayDone = doneSet.has(todayIdx);
              const color = ch.color || '#3a7bd5';
              const isSelected = selectedChain === i;

              return (
                <div key={i}
                  onClick={() => setSelectedChain(isSelected ? null : i)}
                  className="cursor-pointer transition-colors"
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.04)' : '#0d0f13',
                    borderLeft: `3px solid ${isSelected ? color : 'transparent'}`,
                    padding: '12px 16px',
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text truncate">{ch.name}</div>
                        <div className="text-xs text-muted mt-0.5">
                          {fmtDate(ch.start)}{ch.end ? ` → ${fmtDate(ch.end)}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={e => { e.stopPropagation(); handleMarkToday(i); }}
                        className={`px-2.5 py-1 rounded-full text-xs border cursor-pointer transition-all ${
                          isTodayDone
                            ? 'border-[#237F52]/40 bg-[#237F52]/10 text-[#4ade80]'
                            : 'border-border text-muted hover:border-border2'
                        }`}
                      >{isTodayDone ? '✓ Yapıldı' : 'Bugün yaptım'}</button>
                      <button onClick={e => { e.stopPropagation(); setEditingChain(i); setShowForm(true); }}
                        className="text-xs text-accent opacity-60 hover:opacity-100 bg-transparent border-0 cursor-pointer">✎</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(i); }}
                        className="text-xs text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer">×</button>
                    </div>
                  </div>
                  <MiniChain
                    chain={ch}
                    color={color}
                    onExpand={() => setSelectedChain(i)}
                  />
                </div>
              );
            })}
          </div>

          {/* Detay paneli — tıklandığında tam genişlikte açılır */}
          {sel && selData && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden animate-slideUp"
              style={{ borderTopColor: sel.color || '#3a7bd5', borderTopWidth: 2 }}>

              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <div className="text-sm font-medium text-text">{sel.name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {fmtDate(sel.start)}{sel.end ? ` → ${fmtDate(sel.end)}` : ''} · {sel.done?.length || 0} tamamlandı
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex gap-6">
                    {[
                      { v: selData.streak, l: 'mevcut seri' },
                      { v: sel.done?.length || 0, l: 'toplam gün' },
                      { v: (() => {
                        const sMs = new Date(sel.start + 'T00:00:00').getTime();
                        const eMs = sel.end ? new Date(sel.end + 'T00:00:00').getTime() : Date.now();
                        const t = Math.max(1, Math.round((eMs - sMs) / 86400000) + 1);
                        return Math.round((sel.done?.length || 0) / t * 100) + '%';
                      })(), l: 'tamamlama' },
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <div className="text-base font-medium text-text">{s.v}</div>
                        <div className="text-xs text-muted">{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setSelectedChain(null)}
                    className="text-muted2 hover:text-text bg-transparent border-0 cursor-pointer text-lg leading-none">×</button>
                </div>
              </div>

              <div className="px-6 pt-3 pb-1">
                <div className="h-[3px] bg-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    background: sel.color || '#3a7bd5',
                    width: (() => {
                      const sMs = new Date(sel.start + 'T00:00:00').getTime();
                      const eMs = sel.end ? new Date(sel.end + 'T00:00:00').getTime() : Date.now();
                      const t = Math.max(1, Math.round((eMs - sMs) / 86400000) + 1);
                      return Math.min(100, Math.round((sel.done?.length || 0) / t * 100)) + '%';
                    })()
                  }} />
                </div>
              </div>

              <div className="px-6 py-5">
                <BigChain chain={sel} onToggleDay={(dayIdx) => handleToggleDay(selectedChain, dayIdx)} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
