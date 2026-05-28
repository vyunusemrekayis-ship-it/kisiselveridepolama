import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { fmtDate, OMDB_KEY } from '../../lib/utils';

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
  const [form, setForm] = useState({ name: '', author: '', pages: '', start: '', end: '', note: '', ...book });
  const [loading, setLoading] = useState(false);

  const autoFill = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    const info = await autoFillBookInfo(form.name);
    if (info.author) setForm(f => ({ ...f, author: info.author, pages: info.pages || f.pages }));
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
        <div>
          <label className="form-label">Başlangıç</label>
          <input type="date" className="form-input" value={form.start} onChange={e => setForm(f => ({...f, start: e.target.value}))} />
        </div>
        <div>
          <label className="form-label">Bitiş</label>
          <input type="date" className="form-input" value={form.end} onChange={e => setForm(f => ({...f, end: e.target.value}))} />
        </div>
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

function BookCard({ book, onEdit, onDelete, onMoveTo }) {
  return (
    <div className="card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-text truncate">{book.name}</div>
          <div className="text-xs text-muted mt-0.5">
            {[book.author, book.pages ? book.pages + ' sf.' : ''].filter(Boolean).join(' · ')}
          </div>
          {(book.start || book.end) && (
            <div className="text-xs text-muted mt-0.5">
              {[book.start ? 'Başlangıç: ' + fmtDate(book.start) : '', book.end ? 'Bitiş: ' + fmtDate(book.end) : ''].filter(Boolean).join(' · ')}
            </div>
          )}
          {book.note && <div className="mt-2 text-xs text-muted leading-relaxed">{book.note}</div>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
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
  const [rl, setRlState] = useState(getReadlist());

  const refreshRl = () => setRlState(getReadlist());

  const sorted = [...(db.b || [])].map((b, i) => ({ b, i })).sort((a, b) => {
    const da = a.b.end || a.b.start || ''; const db2 = b.b.end || b.b.start || '';
    if (da && db2) return db2.localeCompare(da);
    if (da) return -1; if (db2) return 1; return 0;
  });

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

          {sorted.length === 0 ? (
            <div className="empty-state"><div className="text-3xl opacity-30 mb-3">📚</div>Henüz kitap eklemediniz</div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {sorted.map(({ b, i }) => (
                <BookCard
                  key={i} book={b}
                  onEdit={() => { setEditingBook(i); setShowForm(true); }}
                  onDelete={() => { if (confirm('Silinsin mi?')) deleteBook(i); }}
                />
              ))}
            </div>
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
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
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
