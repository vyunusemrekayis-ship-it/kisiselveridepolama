import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { fmtDate, OMDB_KEY, esc } from '../../lib/utils';

const posterCache = {};

async function fetchPoster(name) {
  if (posterCache[name] !== undefined) return posterCache[name];
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(name)}&apikey=${OMDB_KEY}`);
    const data = await res.json();
    const url = (data.Poster && data.Poster !== 'N/A') ? data.Poster.replace(/SX\d+/, 'SX1000').replace('http://','https://') : null;
    posterCache[name] = url;
    return url;
  } catch { posterCache[name] = null; return null; }
}

function FilmCard({ film, onEdit, onDelete, onMoveTo, type }) {
  const [poster, setPoster] = useState(posterCache[film.name]);

  useEffect(() => {
    if (!poster && posterCache[film.name] === undefined) {
      fetchPoster(film.name).then(url => { if (url) setPoster(url); });
    }
  }, [film.name]);

  return (
    <div className="card group" style={{width:275}}>
      {poster
        ? <img src={poster} alt={film.name} className="rounded-t-xl block" style={{width:275,height:388,objectFit:'cover',objectPosition:'center top',display:'block'}} />
        : <div className="rounded-t-xl flex items-center justify-center text-4xl opacity-40" style={{width:275,height:388,background:'var(--surface2)'}}>🎬</div>
      }
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-text truncate">{film.name}</div>
            {(film.dir || film.date) && (
              <div className="text-xs text-muted mt-0.5">
                {[film.dir, fmtDate(film.date)].filter(Boolean).join(' · ')}
              </div>
            )}
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

function FilmForm({ film, onSave, onCancel, title }) {
  const [form, setForm] = useState({ name: '', dir: '', date: '', note: '', ...film });
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
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Örn: Inception" />
        </div>
        <div>
          <label className="form-label">Yönetmen {dirLoading && <span className="text-[10px] text-muted ml-1">yükleniyor...</span>}</label>
          <div className="flex gap-2">
            <input className="form-input" value={form.dir} onChange={e => setForm(f => ({...f, dir: e.target.value}))} placeholder="Otomatik doldur →" />
            <button onClick={autoFill} className="px-3 py-2 rounded-lg border border-border bg-surface2 text-muted text-xs whitespace-nowrap cursor-pointer">✦</button>
          </div>
        </div>
        <div>
          <label className="form-label">İzlenme Tarihi</label>
          <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Notlarım</label>
        <textarea className="form-input resize-y min-h-[75px]" value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} placeholder="Film hakkında düşüncelerim..." />
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
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Örn: Oppenheimer" />
        </div>
        <div>
          <label className="form-label">Yönetmen {loading && <span className="text-[10px] text-muted ml-1">yükleniyor...</span>}</label>
          <div className="flex gap-2">
            <input className="form-input" value={form.dir} onChange={e => setForm(f => ({...f, dir: e.target.value}))} placeholder="Otomatik doldur →" />
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
  const [editingFilm, setEditingFilm] = useState(null); // {index, data}
  const [editingWl, setEditingWl] = useState(null);
  const [wl, setWlState] = useState(getWatchlist());

  const refreshWl = () => setWlState(getWatchlist());

  const sorted = [...(db.f || [])].map((f, i) => ({ f, i })).sort((a, b) => {
    const da = a.f.date || ''; const db2 = b.f.date || '';
    if (da && db2) return db2.localeCompare(da);
    if (da) return -1; if (db2) return 1; return 0;
  });

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
    // pre-fill form with watchlist item
    setTimeout(() => {
      setEditingFilm({ prefill: f });
    }, 0);
  };

  return (
    <div className="animate-fadeIn">
      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'watched' ? 'active' : ''}`} onClick={() => setTab('watched')}>İzlediklerim</button>
        <button className={`tab-btn ${tab === 'watchlist' ? 'active' : ''}`} onClick={() => setTab('watchlist')}>İzleyeceklerim</button>
      </div>

      {/* Watched */}
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

          {sorted.length === 0 ? (
            <div className="empty-state"><div className="text-3xl opacity-30 mb-3">🎬</div>Henüz film eklemediniz</div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center">
              {sorted.map(({ f, i }) => (
                <FilmCard
                  key={i} film={f}
                  onEdit={() => { setEditingFilm(i); setShowForm(true); }}
                  onDelete={() => { if (confirm('Silinsin mi?')) deleteFilm(i); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watchlist */}
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
                  onDelete={() => { const list = getWatchlist(); list.splice(i,1); setWatchlist(list); refreshWl(); }}
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
