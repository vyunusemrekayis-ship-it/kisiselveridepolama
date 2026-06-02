import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { fmtDate, OMDB_KEY } from '../../lib/utils';

// url string ya da null saklar; Promise yoktur — aynı isim için tek fetch garantili
const posterCache = {};
const posterInFlight = {};

function scoreTitleMatch(title, query) {
  const t = title.toLowerCase().trim();
  const q = query.toLowerCase().trim();
  if (t === q) return 100;
  if (t.startsWith(q) || q.startsWith(t)) return 80;
  const qWords = q.split(/\s+/);
  const tWords = t.split(/\s+/);
  const matches = qWords.filter(w => tWords.includes(w)).length;
  return matches / Math.max(qWords.length, tWords.length) * 60;
}

function fetchPoster(name) {
  if (name in posterCache) return Promise.resolve(posterCache[name]);
  if (posterInFlight[name]) return posterInFlight[name];
  const p = fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(name)}&type=movie&apikey=${OMDB_KEY}`)
    .then(r => r.json())
    .then(data => {
      const results = data.Search;
      if (!results?.length) return null;
      const scored = results.map(x => ({ ...x, score: scoreTitleMatch(x.Title, name) }));
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      return fetch(`https://www.omdbapi.com/?i=${best.imdbID}&apikey=${OMDB_KEY}`)
        .then(r => r.json())
        .then(d => (d.Poster && d.Poster !== 'N/A')
          ? d.Poster.replace(/SX\d+/, 'SX1000').replace('http://', 'https://')
          : null
        );
    })
    .then(url => { posterCache[name] = url; delete posterInFlight[name]; return url; })
    .catch(() => { posterCache[name] = null; delete posterInFlight[name]; return null; });
  posterInFlight[name] = p;
  return p;
}

function FilmCard({ film, onEdit, onDelete, onMoveTo }) {
  const [poster, setPoster] = useState(posterCache[film.name] ?? null);

  useEffect(() => {
    if (poster) return;
    fetchPoster(film.name).then(url => { if (url) setPoster(url); });
  }, [film.name]);

  return (
    <div className="card group" style={{ width: 275 }}>
      {poster
        ? <img src={poster} alt={film.name} className="rounded-t-xl block" style={{ width: 275, height: 388, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
        : <div className="rounded-t-xl flex items-center justify-center text-4xl opacity-40" style={{ width: 275, height: 388, background: 'var(--surface2)' }}>🎬</div>
      }
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-text truncate">{film.name}</div>
            <div className="text-xs text-muted mt-0.5">
              {film.old
                ? <span style={{ color: 'rgba(232,237,245,0.3)', fontStyle: 'italic' }}>eskiden izledim</span>
                : [film.dir, fmtDate(film.date)].filter(Boolean).join(' · ')
              }
              {!film.old && film.dir && !film.date && film.dir}
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
        {film.note && <div className="mt-2 text-xs text-muted leading-relaxed border-t border-border pt-2">{film.note}</div>}
      </div>
    </div>
  );
}

function FilmForm({ film, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', dir: '', date: '', note: '', old: false, ...film });
  const [dirLoading, setDirLoading] = useState(false);

  const autoFill = async () => {
    if (!form.name.trim()) return;
    setDirLoading(true);
    try {
      const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(form.name)}&apikey=${OMDB_KEY}`);
      const data = await res.json();
      if (data.Director && data.Director !== 'N/A') setForm(f => ({ ...f, dir: data.Director }));
    } catch {}
    setDirLoading(false);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Film Adı *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Inception" />
        </div>
        <div>
          <label className="form-label">Yönetmen {dirLoading && <span className="text-[10px] text-muted ml-1">yükleniyor...</span>}</label>
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
        <textarea className="form-input resize-y min-h-[75px]" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Film hakkında düşüncelerim..." />
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name.trim()) { alert('Film adı zorunludur'); return; } onSave(form); }}>Kaydet</button>
      </div>
    </div>
  );
}

function WatchlistForm({ film, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', dir: '', ...film });
  const [loading, setLoading] = useState(false);

  const autoFill = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(form.name)}&apikey=${OMDB_KEY}`);
      const data = await res.json();
      if (data.Director && data.Director !== 'N/A') setForm(f => ({ ...f, dir: data.Director }));
    } catch {}
    setLoading(false);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Film Adı *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Oppenheimer" />
        </div>
        <div>
          <label className="form-label">Yönetmen {loading && <span className="text-[10px] text-muted ml-1">yükleniyor...</span>}</label>
          <div className="flex gap-2">
            <input className="form-input" value={form.dir} onChange={e => setForm(f => ({ ...f, dir: e.target.value }))} placeholder="Otomatik doldur →" />
            <button onClick={autoFill} className="px-3 py-2 rounded-lg border border-border bg-surface2 text-muted text-xs whitespace-nowrap cursor-pointer">✦</button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name.trim()) { alert('Film adı zorunludur'); return; } onSave(form); }}>Kaydet</button>
      </div>
    </div>
  );
}

export default function Films() {
  const { db, addFilm, updateFilm, deleteFilm, getWatchlist, setWatchlist } = useStore();
  const [tab, setTab] = useState('watched');
  const [showForm, setShowForm] = useState(false);
  const [showWlForm, setShowWlForm] = useState(false);
  const [editingFilm, setEditingFilm] = useState(null);
  const [editingWl, setEditingWl] = useState(null);
  const wl = db.wl || [];
  const refreshWl = () => {};

  // Tarihli filmler yeniden eskiye, "eskiden" olanlar en sona
  const allFilms = [...(db.f || [])].map((f, i) => ({ f, i }));
  const datedFilms = allFilms.filter(({ f }) => !f.old).sort((a, b) => {
    const da = a.f.date || ''; const db2 = b.f.date || '';
    if (da && db2) return db2.localeCompare(da);
    if (da) return -1; if (db2) return 1; return 0;
  });
  const oldFilms = allFilms.filter(({ f }) => f.old);

  const handleSaveFilm = (form) => {
    if (editingFilm !== null) { updateFilm(editingFilm, form); setEditingFilm(null); }
    else addFilm(form);
    setShowForm(false);
  };

  const handleSaveWl = (form) => {
    const list = getWatchlist();
    if (editingWl !== null) { list[editingWl] = form; setEditingWl(null); }
    else list.push(form);
    setWatchlist(list); refreshWl();
    setShowWlForm(false);
  };

  const moveToWatched = (i) => {
    const list = getWatchlist();
    const f = list[i];
    list.splice(i, 1);
    setWatchlist(list); refreshWl();
    setTab('watched');
    setEditingFilm(null);
    setShowForm(true);
    setTimeout(() => { setEditingFilm({ prefill: f }); }, 0);
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
              <h2 className="section-title">Filmler</h2>
              <span className="badge bg-[rgba(160,96,64,0.1)] text-film-l">{db.f.length} film</span>
            </div>
            <button className="btn-primary" onClick={() => { setEditingFilm(null); setShowForm(s => !s); }}>+ Film Ekle</button>
          </div>

          {showForm && (
            <FilmForm
              film={editingFilm?.prefill || (editingFilm !== null ? db.f[editingFilm] : {})}
              onSave={handleSaveFilm}
              onCancel={() => { setShowForm(false); setEditingFilm(null); }}
            />
          )}

          {datedFilms.length === 0 && oldFilms.length === 0 ? (
            <div className="empty-state"><div className="text-3xl opacity-30 mb-3">🎬</div>Henüz film eklemediniz</div>
          ) : (
            <>
              {datedFilms.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center mb-6">
                  {datedFilms.map(({ f, i }) => (
                    <FilmCard
                      key={i} film={f}
                      onEdit={() => { setEditingFilm(i); setShowForm(true); }}
                      onDelete={() => { if (confirm('Silinsin mi?')) deleteFilm(i); }}
                    />
                  ))}
                </div>
              )}

              {oldFilms.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs px-3 py-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,237,245,0.35)' }}>
                      Eskiden izlediklerim · {oldFilms.length} film
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {oldFilms.map(({ f, i }) => (
                      <FilmCard
                        key={i} film={f}
                        onEdit={() => { setEditingFilm(i); setShowForm(true); }}
                        onDelete={() => { if (confirm('Silinsin mi?')) deleteFilm(i); }}
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
              <span className="badge bg-[rgba(160,96,64,0.1)] text-film-l">{wl.length} film</span>
            </div>
            <button className="btn-primary" onClick={() => { setEditingWl(null); setShowWlForm(s => !s); }}>+ Film Ekle</button>
          </div>

          {showWlForm && (
            <WatchlistForm
              film={editingWl !== null ? wl[editingWl] : {}}
              onSave={handleSaveWl}
              onCancel={() => { setShowWlForm(false); setEditingWl(null); }}
            />
          )}

          {wl.length === 0 ? (
            <div className="empty-state"><div className="text-3xl opacity-30 mb-3">🎬</div>İzleyecek film listesi boş</div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center">
              {wl.map((f, i) => (
                <FilmCard
                  key={i} film={f}
                  onEdit={() => { setEditingWl(i); setShowWlForm(true); }}
                  onDelete={() => { const list = getWatchlist(); list.splice(i, 1); setWatchlist(list); refreshWl(); }}
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
