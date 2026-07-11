import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { fmtDate, OMDB_KEY, fetchSeriesPoster, seriesPosterCache } from '../../lib/utils';

function SeriesPlaceholder({ width, height }) {
  return (
    <div className="rounded-t-xl flex items-center justify-center" style={{ width, height, background: 'var(--surface2)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, border: '2px solid rgba(160,96,64,0.35)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '15%', height: 2, background: 'rgba(160,96,64,0.55)', animation: 'seriesScan 2.2s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 6, animation: 'seriesPulse 2.2s ease-in-out infinite' }} />
      </div>
      <style>{`
        @keyframes seriesScan { 0%{top:15%} 50%{top:80%} 100%{top:15%} }
        @keyframes seriesPulse { 0%,100%{opacity:.35} 50%{opacity:.8} }
      `}</style>
    </div>
  );
}

function EmptyStateIcon() {
  return (
    <div style={{ width: 34, height: 34, margin: '0 auto 12px', borderRadius: 8, border: '2px solid rgba(232,237,245,0.15)', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: '20%', height: 2, background: 'rgba(232,237,245,0.2)', animation: 'seriesScan 2.4s ease-in-out infinite' }} />
    </div>
  );
}

function SeriesCard({ serie, onEdit, onDelete, onMoveTo }) {
  const [poster, setPoster] = useState(seriesPosterCache[serie.name] ?? null);

  // serie.name değişirse (örn. React kartı farklı bir kayıt için yeniden kullanırsa) eski afiş
  // görünümde takılı kalmasın diye önce sıfırlanır, sonra cache'ten/API'den yeniden doldurulur.
  useEffect(() => {
    setPoster(seriesPosterCache[serie.name] ?? null);
    if (seriesPosterCache[serie.name]) return;
    fetchSeriesPoster(serie.name).then(url => { if (url) setPoster(url); });
  }, [serie.name]);

  return (
    <div className="card group" style={{ width: 275 }}>
      {poster
        ? <img src={poster} alt={serie.name} className="rounded-t-xl block" style={{ width: 275, height: 388, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
        : <SeriesPlaceholder width={275} height={388} />
      }
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-text truncate">{serie.name}</div>
            <div className="text-xs text-muted mt-0.5">
              {serie.old
                ? <span style={{ color: 'rgba(232,237,245,0.3)', fontStyle: 'italic' }}>eskiden izledim</span>
                : [serie.dir, fmtDate(serie.date)].filter(Boolean).join(' · ')
              }
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {onMoveTo && (
              <button onClick={() => onMoveTo()} className="text-[13px] text-[#237F52] opacity-80 bg-transparent border-0 cursor-pointer px-1" title="Taşı">✓</button>
            )}
            <button onClick={onEdit} className="text-[13px] text-accent opacity-70 bg-transparent border-0 cursor-pointer px-1">✎</button>
            <button onClick={onDelete} className="text-[13px] text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer px-1">×</button>
          </div>
        </div>
        {serie.note && <div className="mt-2 text-xs text-muted leading-relaxed border-t border-border pt-2">{serie.note}</div>}
      </div>
    </div>
  );
}

function SeriesForm({ serie, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', dir: '', date: '', note: '', old: false, ...serie });
  const [dirLoading, setDirLoading] = useState(false);

  const autoFill = async () => {
    if (!form.name.trim()) return;
    setDirLoading(true);
    try {
      const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(form.name)}&type=series&apikey=${OMDB_KEY}`);
      const data = await res.json();
      if (data.Writer && data.Writer !== 'N/A') setForm(f => ({ ...f, dir: data.Writer }));
      else if (data.Director && data.Director !== 'N/A') setForm(f => ({ ...f, dir: data.Director }));
    } catch {}
    setDirLoading(false);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Dizi Adı *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Breaking Bad" />
        </div>
        <div>
          <label className="form-label">Yaratıcı {dirLoading && <span className="text-[10px] text-muted ml-1">yükleniyor...</span>}</label>
          <div className="flex gap-2">
            <input className="form-input" value={form.dir} onChange={e => setForm(f => ({ ...f, dir: e.target.value }))} placeholder="Otomatik doldur →" />
            <button onClick={autoFill} className="px-3 py-2 rounded-lg border border-border bg-surface2 text-muted text-xs whitespace-nowrap cursor-pointer">✦</button>
          </div>
        </div>
        {!form.old && (
          <div>
            <label className="form-label">İzlenme Tarihi</label>
            <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
        )}
      </div>

      {/* Eskiden izledim toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
          <div
            onClick={() => setForm(f => ({ ...f, old: !f.old, date: !f.old ? '' : f.date }))}
            style={{
              width: 36, height: 20, borderRadius: 10,
              background: form.old ? 'rgba(58,123,213,0.5)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${form.old ? '#3a7bd5' : 'rgba(255,255,255,0.15)'}`,
              position: 'relative', transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: form.old ? 17 : 2,
              width: 14, height: 14, borderRadius: '50%',
              background: form.old ? '#3a7bd5' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s',
            }} />
          </div>
          <span className="text-xs text-muted">Eskiden izledim (tarihi hatırlamıyorum)</span>
        </label>
      </div>

      <div className="mb-3">
        <label className="form-label">Notlarım</label>
        <textarea className="form-input resize-y min-h-[75px]" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Dizi hakkında düşüncelerim..." />
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name.trim()) { alert('Dizi adı zorunludur'); return; } onSave(form); }}>Kaydet</button>
      </div>
    </div>
  );
}

function SeriesWatchlistForm({ serie, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', dir: '', ...serie });
  const [loading, setLoading] = useState(false);

  const autoFill = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(form.name)}&type=series&apikey=${OMDB_KEY}`);
      const data = await res.json();
      if (data.Writer && data.Writer !== 'N/A') setForm(f => ({ ...f, dir: data.Writer }));
      else if (data.Director && data.Director !== 'N/A') setForm(f => ({ ...f, dir: data.Director }));
    } catch {}
    setLoading(false);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Dizi Adı *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: The Last of Us" />
        </div>
        <div>
          <label className="form-label">Yaratıcı {loading && <span className="text-[10px] text-muted ml-1">yükleniyor...</span>}</label>
          <div className="flex gap-2">
            <input className="form-input" value={form.dir} onChange={e => setForm(f => ({ ...f, dir: e.target.value }))} placeholder="Otomatik doldur →" />
            <button onClick={autoFill} className="px-3 py-2 rounded-lg border border-border bg-surface2 text-muted text-xs whitespace-nowrap cursor-pointer">✦</button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name.trim()) { alert('Dizi adı zorunludur'); return; } onSave(form); }}>Kaydet</button>
      </div>
    </div>
  );
}

export default function Series() {
  const { db, addSeries, updateSeries, deleteSeries, getSeriesWatchlist, setSeriesWatchlist } = useStore();
  const [tab, setTab] = useState('watched');
  const [showForm, setShowForm] = useState(false);
  const [showWlForm, setShowWlForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState(null);
  const [editingWl, setEditingWl] = useState(null);
  const wl = db.srwl || [];
  const refreshWl = () => {};

  const allSeries = [...(db.sr || [])].map((f, i) => ({ f, i }));
  const datedSeries = allSeries.filter(({ f }) => !f.old).sort((a, b) => {
    const da = a.f.date || ''; const db2 = b.f.date || '';
    if (da && db2) return db2.localeCompare(da);
    if (da) return -1; if (db2) return 1; return 0;
  });
  const oldSeries = allSeries.filter(({ f }) => f.old);

  const handleSaveSeries = (form) => {
    if (editingSeries !== null) { updateSeries(editingSeries, form); setEditingSeries(null); }
    else addSeries(form);
    setShowForm(false);
  };

  const handleSaveWl = (form) => {
    const list = getSeriesWatchlist();
    if (editingWl !== null) { list[editingWl] = form; setEditingWl(null); }
    else list.push(form);
    setSeriesWatchlist(list); refreshWl();
    setShowWlForm(false);
  };

  const moveToWatched = (i) => {
    const list = getSeriesWatchlist();
    const f = list[i];
    list.splice(i, 1);
    setSeriesWatchlist(list); refreshWl();
    setTab('watched');
    setEditingSeries(null);
    setShowForm(true);
    setTimeout(() => { setEditingSeries({ prefill: f }); }, 0);
  };

  return (
    <div className="animate-fadeIn">
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'watched' ? 'active' : ''}`} onClick={() => setTab('watched')}>İzlediklerim</button>
        <button className={`tab-btn ${tab === 'watchlist' ? 'active' : ''}`} onClick={() => setTab('watchlist')}>İzleyeceklerim</button>
      </div>

      {tab === 'watched' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="section-title">Diziler</h2>
              <span className="badge bg-[rgba(160,96,64,0.1)] text-film-l">{db.sr.length} dizi</span>
            </div>
            <button className="btn-primary" onClick={() => { setEditingSeries(null); setShowForm(s => !s); }}>+ Dizi Ekle</button>
          </div>

          {showForm && (
            <SeriesForm
              serie={editingSeries?.prefill || (editingSeries !== null ? db.sr[editingSeries] : {})}
              onSave={handleSaveSeries}
              onCancel={() => { setShowForm(false); setEditingSeries(null); }}
            />
          )}

          {datedSeries.length === 0 && oldSeries.length === 0 ? (
            <div className="empty-state"><EmptyStateIcon />Henüz dizi eklemediniz</div>
          ) : (
            <>
              {datedSeries.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center mb-6">
                  {datedSeries.map(({ f, i }) => (
                    <SeriesCard
                      key={f.id ?? i} serie={f}
                      onEdit={() => { setEditingSeries(i); setShowForm(true); }}
                      onDelete={() => { if (confirm('Silinsin mi?')) deleteSeries(i); }}
                    />
                  ))}
                </div>
              )}

              {oldSeries.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs px-3 py-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,237,245,0.35)' }}>
                      Eskiden izlediklerim · {oldSeries.length} dizi
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {oldSeries.map(({ f, i }) => (
                      <SeriesCard
                        key={f.id ?? i} serie={f}
                        onEdit={() => { setEditingSeries(i); setShowForm(true); }}
                        onDelete={() => { if (confirm('Silinsin mi?')) deleteSeries(i); }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'watchlist' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="section-title">İzleyeceklerim</h2>
              <span className="badge bg-[rgba(160,96,64,0.1)] text-film-l">{wl.length} dizi</span>
            </div>
            <button className="btn-primary" onClick={() => { setEditingWl(null); setShowWlForm(s => !s); }}>+ Dizi Ekle</button>
          </div>

          {showWlForm && (
            <SeriesWatchlistForm
              serie={editingWl !== null ? wl[editingWl] : {}}
              onSave={handleSaveWl}
              onCancel={() => { setShowWlForm(false); setEditingWl(null); }}
            />
          )}

          {wl.length === 0 ? (
            <div className="empty-state"><EmptyStateIcon />İzleyecek dizi listesi boş</div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center">
              {wl.map((f, i) => (
                <SeriesCard
                  key={f.id ?? i} serie={f}
                  onEdit={() => { setEditingWl(i); setShowWlForm(true); }}
                  onDelete={() => { const list = getSeriesWatchlist(); list.splice(i, 1); setSeriesWatchlist(list); refreshWl(); }}
                  onMoveTo={() => moveToWatched(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
