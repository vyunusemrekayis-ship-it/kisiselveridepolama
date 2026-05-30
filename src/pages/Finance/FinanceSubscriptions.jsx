import { useState } from 'react';
import { fmt, fmtCurrency, monthlyAmount } from './financeStore';

const PERIOD_LABELS = { monthly: 'Aylık', yearly: 'Yıllık', weekly: 'Haftalık' };

function SubForm({ sub, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', amount: '', period: 'monthly', dueDay: '',
    cat: 'sub', note: '', ...sub,
  });
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div><label className="form-label">Servis Adı *</label>
          <input className="form-input" value={form.name} onChange={e => s('name', e.target.value)} placeholder="Netflix, Spotify, ChatGPT…" /></div>
        <div><label className="form-label">Tutar (₺) *</label>
          <input type="number" className="form-input" value={form.amount} onChange={e => s('amount', e.target.value)} /></div>
        <div><label className="form-label">Periyot</label>
          <select className="form-input" value={form.period} onChange={e => s('period', e.target.value)}>
            <option value="monthly">Aylık</option>
            <option value="yearly">Yıllık</option>
            <option value="weekly">Haftalık</option>
          </select></div>
        <div><label className="form-label">Ödeme Günü (1-31)</label>
          <input type="number" min="1" max="31" className="form-input" value={form.dueDay} onChange={e => s('dueDay', e.target.value)} placeholder="15" /></div>
        <div className="sm:col-span-2"><label className="form-label">Not</label>
          <input className="form-input" value={form.note} onChange={e => s('note', e.target.value)} /></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => {
          if (!form.name.trim() || !form.amount) return;
          onSave({ ...form, id: form.id || Date.now() });
        }}>Kaydet</button>
      </div>
    </div>
  );
}

// Ödeme günü göstergesi
function DueBadge({ dueDay }) {
  if (!dueDay) return null;
  const today = new Date().getDate();
  const d = +dueDay - today;
  const days = d < 0 ? d + 30 : d;
  const color = days <= 3 ? '#f87171' : days <= 7 ? '#fbbf24' : 'rgba(232,237,245,.3)';
  return (
    <span style={{ fontSize: 10, color, padding: '2px 6px', borderRadius: 4, background: `${color}15`, border: `1px solid ${color}30` }}>
      {days === 0 ? 'bugün' : `${days}g`}
    </span>
  );
}

export default function FinanceSubscriptions({ data, onSave }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const subs = data.subscriptions || [];
  const totalMonthly = subs.reduce((s, sub) => s + monthlyAmount(sub), 0);
  const totalYearly = totalMonthly * 12;

  const handleSave = (sub) => {
    const list = [...subs];
    const idx = list.findIndex(s => s.id === sub.id);
    if (idx >= 0) list[idx] = sub; else list.push(sub);
    onSave({ ...data, subscriptions: list });
    setShowForm(false); setEditing(null);
  };

  const handleDelete = (id) => {
    if (!confirm('Silinsin mi?')) return;
    onSave({ ...data, subscriptions: subs.filter(s => s.id !== id) });
  };

  // Ödeme günü sıralı
  const sorted = [...subs].sort((a, b) => {
    const today = new Date().getDate();
    const da = ((+a.dueDay || 1) - today + 31) % 31;
    const db = ((+b.dueDay || 1) - today + 31) % 31;
    return da - db;
  });

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Abonelik Merkezi</h2>
          <p style={{ fontSize: 12, color: 'rgba(232,237,245,.35)', marginTop: 2 }}>
            {subs.length} abonelik · {fmtCurrency(totalMonthly)}/ay · {fmtCurrency(totalYearly)}/yıl
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(s => !s); }}>+ Ekle</button>
      </div>

      {showForm && (
        <SubForm
          sub={editing || {}}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Özet banner */}
      {subs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Aylık Toplam', val: fmtCurrency(totalMonthly), color: '#c084fc' },
            { label: 'Yıllık Toplam', val: fmtCurrency(totalYearly), color: '#f87171' },
            { label: 'Abonelik Sayısı', val: subs.length, color: '#60a5fa' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'rgba(232,237,245,.35)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: k.color }}>{k.val}</div>
            </div>
          ))}
        </div>
      )}

      {subs.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 28, marginBottom: 8, color: 'rgba(232,237,245,.15)' }}>◈</div>
          Henüz abonelik eklenmedi
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((sub) => {
            const monthCost = monthlyAmount(sub);
            return (
              <div key={sub.id} style={{
                background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10,
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                transition: 'border-color .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'}
              >
                {/* Renk dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#c084fc', flexShrink: 0, boxShadow: '0 0 6px rgba(192,132,252,.5)' }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: '#e8edf5' }}>{sub.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(232,237,245,.35)', marginTop: 1 }}>
                    {PERIOD_LABELS[sub.period] || 'Aylık'}
                    {sub.note ? ` · ${sub.note}` : ''}
                  </div>
                </div>

                {sub.dueDay && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ fontSize: 10, color: 'rgba(232,237,245,.3)' }}>Ödeme</div>
                    <DueBadge dueDay={sub.dueDay} />
                  </div>
                )}

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f87171' }}>{fmtCurrency(+sub.amount)}</div>
                  {sub.period !== 'monthly' && (
                    <div style={{ fontSize: 10, color: 'rgba(232,237,245,.3)' }}>{fmtCurrency(monthCost)}/ay</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => { setEditing(sub); setShowForm(true); }}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(232,237,245,.3)', cursor: 'pointer', fontSize: 13, padding: '3px 6px' }}>✎</button>
                  <button onClick={() => handleDelete(sub.id)}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,.4)', cursor: 'pointer', fontSize: 13, padding: '3px 6px' }}>✕</button>
                </div>
              </div>
            );
          })}

          {/* Yıllık analiz notu */}
          {totalYearly > 0 && (
            <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 9, background: 'rgba(192,132,252,.06)', border: '1px solid rgba(192,132,252,.15)', fontSize: 12, color: 'rgba(232,237,245,.5)' }}>
              Bu abonelikler için yılda <strong style={{ color: '#c084fc' }}>{fmtCurrency(totalYearly)}</strong> harcıyorsun
              {totalMonthly > 0 && ` — aylık gelirinle kıyasla`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
