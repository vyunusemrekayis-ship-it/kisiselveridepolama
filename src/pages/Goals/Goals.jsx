import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, fmtDate, goalDateRange, isGoalActive } from '../../lib/utils';

const PERIODS = [
  { id: 'weekly', label: 'Haftalık' },
  { id: 'monthly', label: 'Aylık' },
  { id: 'yearly', label: 'Yıllık' },
];

function GoalForm({ goal, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', period: 'weekly', target: '', unit: '',
    track: 'manual', note: '', periodKey: todayStr(), ...goal
  });

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Hedef Adı *</label>
          <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Örn: 5 km koş" />
        </div>
        <div>
          <label className="form-label">Periyot</label>
          <select className="form-input" value={form.period} onChange={e => setForm(f => ({...f, period: e.target.value}))}>
            {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Hedef Değer</label>
          <input type="number" className="form-input" value={form.target} onChange={e => setForm(f => ({...f, target: e.target.value}))} placeholder="10" />
        </div>
        <div>
          <label className="form-label">Birim</label>
          <input className="form-input" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} placeholder="km, saat, kitap..." />
        </div>
        <div>
          <label className="form-label">Takip</label>
          <select className="form-input" value={form.track} onChange={e => setForm(f => ({...f, track: e.target.value}))}>
            <option value="manual">Manuel</option>
            <option value="book">Otomatik – Kitap</option>
            <option value="film">Otomatik – Film</option>
          </select>
        </div>
        <div>
          <label className="form-label">Başlangıç Tarihi</label>
          <input type="date" className="form-input" value={form.periodKey} onChange={e => setForm(f => ({...f, periodKey: e.target.value}))} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name.trim()) { alert('Hedef adı zorunludur'); return; } onSave(form); }}>Kaydet</button>
      </div>
    </div>
  );
}

function GoalCard({ goal, index, totalBooks, totalFilms, onEdit, onDelete, onToggle, onProgress }) {
  const isBookGoal = goal.track === 'book';
  const isFilmGoal = goal.track === 'film';
  const target = parseFloat(goal.target) || 0;
  const current = isBookGoal ? totalBooks : isFilmGoal ? totalFilms : (parseFloat(goal.current) || 0);
  const hasTarget = target > 0;
  const pct = hasTarget ? Math.min(100, Math.round(current / target * 100)) : 0;
  const isDone = hasTarget ? current >= target : goal.done;

  // İki ayrı input state: ekle (delta) ve düzelt (mutlak)
  const [addVal, setAddVal] = useState('');
  const handleAdd = () => {
    const delta = parseFloat(addVal);
    if (isNaN(delta)) return;
    onProgress(parseFloat((current + delta).toFixed(4)));
    setAddVal('');
  };

  return (
    <div className={`card p-3 ${isDone ? 'border-[#237F52]/30' : ''}`}>
      <div className="flex items-start gap-3">
        {!hasTarget ? (
          <button
            onClick={onToggle}
            className={`w-5 h-5 rounded-[5px] border flex-shrink-0 mt-0.5 flex items-center justify-center text-xs cursor-pointer transition-all ${
              isDone ? 'bg-[#237F52] border-[#237F52] text-white' : 'border-border2 bg-transparent text-transparent'
            }`}
          >✓</button>
        ) : (
          <div className={`w-5 h-5 rounded-[5px] border flex-shrink-0 mt-0.5 flex items-center justify-center text-xs ${
            isDone ? 'bg-[#237F52] border-[#237F52] text-white' : 'border-border2 text-transparent'
          }`}>✓</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className={`text-sm font-medium ${isDone ? 'line-through text-muted' : 'text-text'}`}>{goal.name}</div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={onEdit} className="text-[12px] text-accent opacity-60 hover:opacity-100 bg-transparent border-0 cursor-pointer px-0.5 transition-opacity">✎</button>
              <button onClick={onDelete} className="text-[12px] text-muted2 hover:text-red-400 bg-transparent border-0 cursor-pointer px-0.5 transition-colors">×</button>
            </div>
          </div>

          {hasTarget && (
            <>
              <div className="flex items-center justify-between mt-1.5 mb-1">
                <div className="text-xs text-muted">{current}/{target} {goal.unit || ''}</div>
                <div className="text-xs text-accent">{pct}%</div>
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full bg-[#237F52] transition-all" style={{ width: `${pct}%` }} />
              </div>

              {goal.track === 'manual' && (
                <div className="space-y-1.5 mt-2">
                  {/* Tek input, iki buton */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <input
                      type="number"
                      className="form-input py-1 text-xs w-20"
                      value={addVal}
                      onChange={e => setAddVal(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      placeholder="0"
                    />
                    <span className="text-xs text-muted flex-shrink-0">{goal.unit || ''}</span>
                    <button
                      onClick={handleAdd}
                      className="ml-auto px-2.5 py-1 rounded-lg border border-accent/40 bg-accent/10 text-accent text-xs cursor-pointer hover:bg-accent/20 transition-all flex-shrink-0"
                    >+ Ekle</button>
                    <button
                      onClick={() => { const v = parseFloat(addVal); if (!isNaN(v)) { onProgress(v); setAddVal(''); } }}
                      className="px-2.5 py-1 rounded-lg border border-border bg-surface2 text-muted text-xs cursor-pointer hover:border-border2 hover:text-text transition-all flex-shrink-0"
                    >Düzelt</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Goals() {
  const { db, addGoal, updateGoal, deleteGoal, toggleGoal, updateGoalProgress } = useStore();
  const [tab, setTab] = useState('weekly');
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const totalBooks = db.b?.length || 0;
  const totalFilms = db.f?.length || 0;

  const handleSave = (form) => {
    if (editingGoal !== null) { updateGoal(editingGoal, form); setEditingGoal(null); }
    else addGoal(form);
    setShowForm(false);
  };

  const goalsForPeriod = db.g.filter(g => g.period === tab);
  const active = goalsForPeriod.filter(g => isGoalActive(g));
  const past = goalsForPeriod.filter(g => !isGoalActive(g));

  const pastGroups = {};
  past.forEach((g) => {
    const origIdx = db.g.indexOf(g);
    const key = g.periodKey || todayStr();
    if (!pastGroups[key]) pastGroups[key] = [];
    pastGroups[key].push({ g, i: origIdx });
  });

  const [openAccordions, setOpenAccordions] = useState({});
  const toggleAccordion = (key) => setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));

  const fmtD = (d) => {
    const [y,m,dd] = d.toISOString().split('T')[0].split('-');
    return `${parseInt(dd)} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][parseInt(m)-1]} ${y}`;
  };

  return (
    <div className="animate-fadeIn">
      <div className="tab-bar">
        {PERIODS.map(p => (
          <button key={p.id} className={`tab-btn ${tab === p.id ? 'active' : ''}`} onClick={() => setTab(p.id)}>{p.label}</button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Hedefler</h2>
        <button className="btn-primary" onClick={() => { setEditingGoal(null); setShowForm(s => !s); }}>+ Hedef Ekle</button>
      </div>

      {showForm && (
        <GoalForm
          goal={editingGoal !== null ? { ...db.g[editingGoal] } : { period: tab }}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingGoal(null); }}
        />
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs px-3 py-1 rounded-xl bg-[rgba(58,106,158,0.1)] text-event-l">Aktif</span>
            {active[0] && (() => {
              const { start, end } = goalDateRange(active[0]);
              return <span className="text-xs text-muted">{fmtD(start)} – {fmtD(end)}</span>;
            })()}
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {active.map(g => {
              const origIdx = db.g.indexOf(g);
              return (
                <GoalCard
                  key={origIdx} goal={g} index={origIdx}
                  totalBooks={totalBooks} totalFilms={totalFilms}
                  onEdit={() => { setEditingGoal(origIdx); setShowForm(true); }}
                  onDelete={() => { if (confirm('Silinsin mi?')) deleteGoal(origIdx); }}
                  onToggle={() => toggleGoal(origIdx)}
                  onProgress={(val) => updateGoalProgress(origIdx, val)}
                />
              );
            })}
          </div>
        </div>
      )}

      {active.length === 0 && (
        <div className="empty-state mb-6">
          <div className="text-3xl opacity-30 mb-3">🎯</div>
          Bu periyot için aktif hedef yok
        </div>
      )}

      {Object.keys(pastGroups).sort((a,b) => b.localeCompare(a)).map(key => {
        const group = pastGroups[key];
        const { start, end } = goalDateRange(group[0].g);
        const isOpen = openAccordions[key];
        return (
          <div key={key} className="mb-2">
            <button
              onClick={() => toggleAccordion(key)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface2 border border-border text-sm text-muted cursor-pointer"
            >
              <span>{fmtD(start)} – {fmtD(end)}</span>
              <span>{isOpen ? '▾' : '▸'} {group.length} hedef</span>
            </button>
            {isOpen && (
              <div className="pt-2 grid gap-3 grid-cols-1 sm:grid-cols-2">
                {group.map(({ g, i }) => (
                  <GoalCard
                    key={i} goal={g} index={i}
                    totalBooks={totalBooks} totalFilms={totalFilms}
                    onEdit={() => { setEditingGoal(i); setShowForm(true); }}
                    onDelete={() => { if (confirm('Silinsin mi?')) deleteGoal(i); }}
                    onToggle={() => toggleGoal(i)}
                    onProgress={(val) => updateGoalProgress(i, val)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
