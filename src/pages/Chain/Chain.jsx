import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, calcChainStreak } from '../../lib/utils';

function ChainForm({ chain, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', color: '#3a7bd5', start: todayStr(), ...chain });
  const COLORS = ['#3a7bd5','#237F52','#b05a30','#7b5ea7','#2874a6','#c0392b','#d4ac0d'];

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Alışkanlık Adı *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Örn: Kitap oku" />
        </div>
        <div>
          <label className="form-label">Başlangıç Tarihi</label>
          <input type="date" className="form-input" value={form.start} onChange={e => setForm(f => ({...f, start: e.target.value}))} />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Renk</label>
        <div className="flex gap-2 mt-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setForm(f => ({...f, color: c}))}
              className="w-7 h-7 rounded-full cursor-pointer border-2 transition-all"
              style={{ background: c, borderColor: form.color === c ? '#fff' : 'transparent' }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name.trim()) { alert('Ad zorunludur'); return; } onSave(form); }}>Kaydet</button>
      </div>
    </div>
  );
}

function ChainCard({ chain, onDelete, onMark, onEdit }) {
  const { streak, todayIdx, doneSet } = calcChainStreak(chain);
  const isTodayDone = doneSet.has(todayIdx);

  // Son 30 günü göster
  const days = [];
  for (let i = 29; i >= 0; i--) {
    days.push({ idx: todayIdx - i, isToday: i === 0 });
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: chain.color || '#3a7bd5' }} />
          <div>
            <div className="font-medium text-sm text-text">{chain.name}</div>
            <div className="text-xs text-muted mt-0.5">
              {streak > 0 ? `${streak} gün serisi 🔥` : 'Seri yok'}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="text-[12px] text-accent opacity-60 bg-transparent border-0 cursor-pointer px-0.5">✎</button>
          <button onClick={onDelete} className="text-[12px] text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer px-0.5">×</button>
        </div>
      </div>

      {/* 30-day grid */}
      <div className="flex gap-[3px] flex-wrap mb-3">
        {days.map(({ idx, isToday }) => {
          const done = doneSet.has(idx);
          return (
            <div
              key={idx}
              title={isToday ? 'Bugün' : ''}
              className={`w-[18px] h-[18px] rounded-sm transition-all ${isToday ? 'ring-1 ring-white/30' : ''}`}
              style={{ background: done ? (chain.color || '#3a7bd5') : 'rgba(255,255,255,0.06)' }}
            />
          );
        })}
      </div>

      <button
        onClick={onMark}
        className={`w-full py-2 rounded-xl text-sm font-medium cursor-pointer border transition-all ${
          isTodayDone
            ? 'border-[#237F52]/40 bg-[#237F52]/10 text-[#237F52]'
            : 'border-border bg-transparent text-muted hover:border-border2'
        }`}
      >
        {isTodayDone ? '✓ Bugün yapıldı' : 'Bugün yaptım'}
      </button>
    </div>
  );
}

export default function Chain() {
  const { getChains, setChains } = useStore();
  const [chains, setLocalChains] = useState(getChains());
  const [showForm, setShowForm] = useState(false);
  const [editingChain, setEditingChain] = useState(null);

  const save = (newChains) => {
    setChains(newChains);
    setLocalChains(newChains);
  };

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

  const handleMark = (i) => {
    const list = JSON.parse(JSON.stringify(chains));
    const ch = list[i];
    const startMs = new Date(ch.start + 'T00:00:00').getTime();
    const todayIdx = Math.floor((Date.now() - startMs) / 86400000);
    const doneSet = new Set(ch.done || []);
    if (doneSet.has(todayIdx)) doneSet.delete(todayIdx);
    else doneSet.add(todayIdx);
    ch.done = Array.from(doneSet);
    save(list);
  };

  const handleDelete = (i) => {
    if (!confirm('Silinsin mi?')) return;
    const list = [...chains];
    list.splice(i, 1);
    save(list);
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-5">
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {chains.map((ch, i) => (
            <ChainCard
              key={i} chain={ch}
              onMark={() => handleMark(i)}
              onDelete={() => handleDelete(i)}
              onEdit={() => { setEditingChain(i); setShowForm(true); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
