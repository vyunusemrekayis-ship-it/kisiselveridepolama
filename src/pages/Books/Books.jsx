import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { fmtDate, OMDB_KEY, fetchBookInfo, bookInfoCache, isCoverLikelyBlank } from '../../lib/utils';

async function autoFillBookInfo(name) {
  try {
    const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(name)}&limit=1`);
    const data = await res.json();
    if (data.docs?.[0]) {
      const d = data.docs[0];
      return { author: d.author_name?.[0] || '', pages: d.number_of_pages_median || '' };
    }
  } catch {}
  return {};
}

function BookForm({ book, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', author: '', pages: '', start: '', end: '', note: '', old: false, ...book });
  const [loading, setLoading] = useState(false);

  const autoFill = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    const info = await autoFillBookInfo(form.name);
    const author = info.author || form.author;
    if (info.author) setForm(f => ({ ...f, author: info.author }));
    const gInfo = await fetchBookInfo(form.name, author);
    setForm(f => ({ ...f, pages: gInfo.pages || info.pages || f.pages }));
    setLoading(false);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Kitap Adı *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Örn: Dune" />
        </div>
        <div>
          <label className="form-label">Yazar {loading && <span className="text-[10px] text-muted ml-1">yükleniyor...</span>}</label>
          <div className="flex gap-2">
            <input className="form-input" value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} placeholder="Otomatik doldur →" />
            <button onClick={autoFill} className="px-3 py-2 rounded-lg border border-border bg-surface2 text-muted text-xs whitespace-nowrap cursor-pointer">✦</button>
          </div>
        </div>
        <div>
          <label className="form-label">Sayfa</label>
          <input type="number" className="form-input" value={form.pages} onChange={e => setForm(f => ({...f, pages: e.target.value}))} placeholder="300" />
        </div>
        {!form.old && (
          <>
            <div>
              <label className="form-label">Başlangıç</label>
              <input type="date" className="form-input" value={form.start} onChange={e => setForm(f => ({...f, start: e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Bitiş</label>
              <input type="date" className="form-input" value={form.end} onChange={e => setForm(f => ({...f, end: e.target.value}))} />
            </div>
          </>
        )}
      </div>

      {/* Eskiden okudum toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
          <div
            onClick={() => setForm(f => ({ ...f, old: !f.old, start: !f.old ? '' : f.start, end: !f.old ? '' : f.end }))}
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
          <span className="text-xs text-muted">Eskiden okudum (tarihi hatırlamıyorum)</span>
        </label>
      </div>

      <div className="mb-3">
        <label className="form-label">Notlarım</label>
        <textarea className="form-input resize-y min-h-[75px]" value={form.note||''} onChange={e => setForm(f => ({...f, note: e.target.value}))} placeholder="Kitap hakkında düşüncelerim..." />
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name.trim()) { alert('Kitap adı zorunludur'); return; } onSave(form); }}>Kaydet</button>
      </div>
    </div>
  );
}

// Kapak bulunamadığında gösterilen CSS animasyonlu yer tutucu
function BookCoverPlaceholder({ width, height }) {
  return (
    <div className="rounded-t-xl flex items-center justify-center" style={{ width, height, background: 'var(--surface2)' }}>
      <div style={{ width: 40, height: 52, borderRadius: 4, border: '2px solid rgba(58,123,213,0.35)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '15%', height: 2, background: 'rgba(58,123,213,0.55)', animation: 'bookScan 2.2s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 4, animation: 'bookPulse 2.2s ease-in-out infinite' }} />
      </div>
      <style>{`
        @keyframes bookScan { 0%{top:15%} 50%{top:80%} 100%{top:15%} }
        @keyframes bookPulse { 0%,100%{opacity:.35} 50%{opacity:.8} }
      `}</style>
    </div>
  );
}

function BookCard({ book, onEdit, onDelete, onMoveTo }) {
  const cacheKey = book.name + '|' + (book.author || '');
  const cached = bookInfoCache[cacheKey];
  const [info, setInfo] = useState(cached || { cover: null, pages: null });
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    if (cached) return;
    fetchBookInfo(book.name, book.author).then(setInfo);
  }, [book.name, book.author]);

  useEffect(() => {
    if (!info.cover || coverFailed) return;
    isCoverLikelyBlank(info.cover).then(blank => { if (blank) setCoverFailed(true); });
  }, [info.cover]);

  const pages = book.pages || info.pages;

  return (
    <div className="card group" style={{ width: 275 }}>
      {info.cover && !coverFailed
        ? <img src={info.cover} alt={book.name} className="rounded-t-xl block" style={{ width: 275, height: 388, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} onError={() => setCoverFailed(true)} />
        : <BookCoverPlaceholder width={275} height={388} />
      }
      <div className="p-3">
        <div className="font-medium text-sm text-text truncate">{book.name}</div>
        <div className="text-xs text-muted mt-0.5">
          {[book.author, pages ? pages + ' sf.' : ''].filter(Boolean).join(' · ')}
        </div>
        {book.old
          ? <div className="text-xs mt-0.5" style={{ color: 'rgba(232,237,245,0.3)', fontStyle: 'italic' }}>eskiden okudum</div>
          : (book.start || book.end) && (
            <div className="text-xs text-muted mt-0.5">
              {[book.start ? 'Başlangıç: ' + fmtDate(book.start) : '', book.end ? 'Bitiş: ' + fmtDate(book.end) : ''].filter(Boolean).join(' · ')}
            </div>
          )
        }
        {book.note && <div className="mt-2 text-xs text-muted leading-relaxed border-t border-border pt-2">{book.note}</div>}
        <div className="flex gap-1 justify-end mt-2">
          {onMoveTo && (
            <button onClick={onMoveTo} className="text-[13px] text-[#237F52] opacity-80 bg-transparent border-0 cursor-pointer px-1" title="Okudum">✓</button>
          )}
          <button onClick={onEdit} className="text-[13px] text-accent opacity-70 bg-transparent border-0 cursor-pointer px-1">✎</button>
          <button onClick={onDelete} className="text-[13px] text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer px-1">×</button>
        </div>
      </div>
    </div>
  );
}

function ReadlistForm({ book, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', author: '', ...book });
  const [loading, setLoading] = useState(false);

  const autoFill = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    const info = await autoFillBookInfo(form.name);
    if (info.author) setForm(f => ({ ...f, author: info.author }));
    setLoading(false);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Kitap Adı *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Örn: Dune" />
        </div>
        <div>
          <label className="form-label">Yazar {loading && <span className="text-[10px] text-muted ml-1">yükleniyor...</span>}</label>
          <div className="flex gap-2">
            <input className="form-input" value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} placeholder="Otomatik doldur →" />
            <button onClick={autoFill} className="px-3 py-2 rounded-lg border border-border bg-surface2 text-muted text-xs whitespace-nowrap cursor-pointer">✦</button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name.trim()) { alert('Kitap adı zorunludur'); return; } onSave(form); }}>Kaydet</button>
      </div>
    </div>
  );
}

export default function Books() {
  const { db, addBook, updateBook, deleteBook, getReadlist, setReadlist } = useStore();
  const [tab, setTab] = useState('read');
  const [showForm, setShowForm] = useState(false);
  const [showRlForm, setShowRlForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [editingRl, setEditingRl] = useState(null);
  // db.rl reaktif — onSnapshot gelince db güncellenir, rl otomatik güncellenir
  const rl = db.rl || [];
  const refreshRl = () => {};

  // Tarihli kitaplar yeniden eskiye, "eskiden" olanlar en sona
  const allBooks = [...(db.b || [])].map((b, i) => ({ b, i }));
  const datedBooks = allBooks.filter(({ b }) => !b.old).sort((a, b) => {
    const da = a.b.end || a.b.start || ''; const db2 = b.b.end || b.b.start || '';
    if (da && db2) return db2.localeCompare(da);
    if (da) return -1; if (db2) return 1; return 0;
  });
  const oldBooks = allBooks.filter(({ b }) => b.old);

  const handleSaveBook = (form) => {
    if (editingBook !== null) { updateBook(editingBook, form); setEditingBook(null); }
    else addBook(form);
    setShowForm(false);
  };

  const handleSaveRl = (form) => {
    const list = getReadlist();
    if (editingRl !== null) { list[editingRl] = form; setEditingRl(null); }
    else list.push(form);
    setReadlist(list); refreshRl();
    setShowRlForm(false);
  };

  const moveToRead = (i) => {
    const list = getReadlist();
    const b = list[i];
    list.splice(i, 1);
    setReadlist(list); refreshRl();
    setTab('read');
    setShowForm(true);
    setEditingBook({ prefill: b });
  };

  return (
    <div className="animate-fadeIn">
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'read' ? 'active' : ''}`} onClick={() => setTab('read')}>Okuduklarım</button>
        <button className={`tab-btn ${tab === 'readlist' ? 'active' : ''}`} onClick={() => setTab('readlist')}>Okuyacaklarım</button>
      </div>

      {tab === 'read' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="section-title">Kitaplar</h2>
              <span className="badge bg-book-bg text-book-l">{db.b.length} kitap</span>
            </div>
            <button className="btn-primary" onClick={() => { setEditingBook(null); setShowForm(s => !s); }}>+ Kitap Ekle</button>
          </div>

          {showForm && (
            <BookForm
              book={editingBook?.prefill || (editingBook !== null ? db.b[editingBook] : {})}
              onSave={handleSaveBook}
              onCancel={() => { setShowForm(false); setEditingBook(null); }}
            />
          )}

          {datedBooks.length === 0 && oldBooks.length === 0 ? (
            <div className="empty-state"><div className="text-3xl opacity-30 mb-3">📚</div>Henüz kitap eklemediniz</div>
          ) : (
            <>
              {datedBooks.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center mb-6">
                  {datedBooks.map(({ b, i }) => (
                    <BookCard
                      key={i} book={b}
                      onEdit={() => { setEditingBook(i); setShowForm(true); }}
                      onDelete={() => { if (confirm('Silinsin mi?')) deleteBook(i); }}
                    />
                  ))}
                </div>
              )}

              {oldBooks.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs px-3 py-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,237,245,0.35)' }}>
                      Eskiden okuduklarım · {oldBooks.length} kitap
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {oldBooks.map(({ b, i }) => (
                      <BookCard
                        key={i} book={b}
                        onEdit={() => { setEditingBook(i); setShowForm(true); }}
                        onDelete={() => { if (confirm('Silinsin mi?')) deleteBook(i); }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'readlist' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="section-title">Okuyacaklarım</h2>
              <span className="badge bg-book-bg text-book-l">{rl.length} kitap</span>
            </div>
            <button className="btn-primary" onClick={() => { setEditingRl(null); setShowRlForm(s => !s); }}>+ Kitap Ekle</button>
          </div>

          {showRlForm && (
            <ReadlistForm
              book={editingRl !== null ? rl[editingRl] : {}}
              onSave={handleSaveRl}
              onCancel={() => { setShowRlForm(false); setEditingRl(null); }}
            />
          )}

          {rl.length === 0 ? (
            <div className="empty-state"><div className="text-3xl opacity-30 mb-3">📚</div>Okuyacak kitap listesi boş</div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center">
              {rl.map((b, i) => (
                <BookCard
                  key={i} book={b}
                  onEdit={() => { setEditingRl(i); setShowRlForm(true); }}
                  onDelete={() => { const list = getReadlist(); list.splice(i,1); setReadlist(list); refreshRl(); }}
                  onMoveTo={() => moveToRead(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
