import { useState } from 'react';
import {
  fmt, fmtCurrency, monthlyAmount, monthKey,
  EXPENSE_CATS, CAT_MAP, calcPayoff,
} from './financeStore';

// ── Küçük form yardımcıları ────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────
// GELİR SEKMESI
// ────────────────────────────────────────────
function IncomeForm({ inc, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', amount: '', note: '', day: '', ...inc });
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label="Gelir Adı *"><input className="form-input" value={form.name} onChange={e => s('name', e.target.value)} placeholder="Maaş, Freelance…" /></Field>
        <Field label="Tutar (₺/ay) *"><input type="number" className="form-input" value={form.amount} onChange={e => s('amount', e.target.value)} /></Field>
        <Field label="Maaş Günü"><input type="number" min="1" max="31" className="form-input" value={form.day} onChange={e => s('day', e.target.value)} placeholder="15" /></Field>
        <Field label="Not"><input className="form-input" value={form.note} onChange={e => s('note', e.target.value)} /></Field>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name || !form.amount) return; onSave({ ...form, id: form.id || Date.now() }); }}>Kaydet</button>
      </div>
    </div>
  );
}

export function FinanceIncomes({ data, onSave }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const incomes = data.incomes || [];
  const total = incomes.reduce((s, i) => s + (+i.amount || 0), 0);

  const handleSave = (inc) => {
    const list = [...incomes];
    const idx = list.findIndex(x => x.id === inc.id);
    if (idx >= 0) list[idx] = inc; else list.push(inc);
    onSave({ ...data, incomes: list });
    setShowForm(false); setEditing(null);
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Gelirler</h2>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(s => !s); }}>+ Ekle</button>
      </div>
      {showForm && <IncomeForm inc={editing || {}} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />}
      {incomes.length === 0 ? <div className="empty-state">Henüz gelir eklenmedi</div> : (
        <>
          {incomes.map((inc, i) => (
            <div key={inc.id} style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,.5)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e8edf5' }}>{inc.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,237,245,.35)' }}>
                  {inc.day ? `Her ayın ${inc.day}. günü` : 'Aylık'}
                  {inc.note ? ` · ${inc.note}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#34d399' }}>{fmtCurrency(+inc.amount)}</div>
              <button onClick={() => { setEditing(inc); setShowForm(true); }} style={{ background: 'transparent', border: 'none', color: 'rgba(232,237,245,.25)', cursor: 'pointer', padding: '2px 5px', fontSize: 13 }}>✎</button>
              <button onClick={() => { if (!confirm('Silinsin mi?')) return; onSave({ ...data, incomes: incomes.filter((_, j) => j !== i) }); }} style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,.4)', cursor: 'pointer', padding: '2px 5px', fontSize: 13 }}>✕</button>
            </div>
          ))}
          <div style={{ textAlign: 'right', color: '#34d399', fontWeight: 600, fontSize: 14, padding: '4px 6px' }}>Toplam: {fmtCurrency(total)}/ay</div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// GİDER SEKMESI
// ────────────────────────────────────────────
function ExpenseForm({ exp, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', amount: '', cat: 'other', period: 'monthly', dueDay: '', note: '', ...exp });
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label="Gider Adı *"><input className="form-input" value={form.name} onChange={e => s('name', e.target.value)} placeholder="Kira, Fatura…" /></Field>
        <Field label="Tutar (₺) *"><input type="number" className="form-input" value={form.amount} onChange={e => s('amount', e.target.value)} /></Field>
        <Field label="Periyot">
          <select className="form-input" value={form.period} onChange={e => s('period', e.target.value)}>
            <option value="monthly">Aylık</option>
            <option value="yearly">Yıllık</option>
            <option value="weekly">Haftalık</option>
          </select>
        </Field>
        <Field label="Kategori">
          <select className="form-input" value={form.cat} onChange={e => s('cat', e.target.value)}>
            {EXPENSE_CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Ödeme Günü"><input type="number" min="1" max="31" className="form-input" value={form.dueDay} onChange={e => s('dueDay', e.target.value)} /></Field>
        <Field label="Not"><input className="form-input" value={form.note} onChange={e => s('note', e.target.value)} /></Field>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name || !form.amount) return; onSave({ ...form, id: form.id || Date.now() }); }}>Kaydet</button>
      </div>
    </div>
  );
}

export function FinanceExpenses({ data, onSave }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const expenses = data.expenses || [];
  const total = expenses.reduce((s, e) => s + monthlyAmount(e), 0);

  const handleSave = (exp) => {
    const list = [...expenses];
    const idx = list.findIndex(x => x.id === exp.id);
    if (idx >= 0) list[idx] = exp; else list.push(exp);
    onSave({ ...data, expenses: list });
    setShowForm(false); setEditing(null);
  };

  const byCat = EXPENSE_CATS.filter(c => expenses.some(e => e.cat === c.id));

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Sabit Giderler</h2>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(s => !s); }}>+ Ekle</button>
      </div>
      {showForm && <ExpenseForm exp={editing || {}} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />}
      {expenses.length === 0 ? <div className="empty-state">Henüz gider eklenmedi</div> : (
        <>
          {byCat.map(cat => (
            <div key={cat.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: cat.color }} />
                <span style={{ fontSize: 10, color: 'rgba(232,237,245,.4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{cat.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: cat.color }}>
                  {fmtCurrency(expenses.filter(e => e.cat === cat.id).reduce((s, e) => s + monthlyAmount(e), 0))}/ay
                </span>
              </div>
              {expenses.filter(e => e.cat === cat.id).map(exp => (
                <div key={exp.id} style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e8edf5' }}>{exp.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,237,245,.3)' }}>
                      {exp.period === 'monthly' ? 'Aylık' : exp.period === 'yearly' ? 'Yıllık' : 'Haftalık'}
                      {exp.dueDay ? ` · Her ayın ${exp.dueDay}. günü` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>{fmtCurrency(+exp.amount)}</div>
                    {exp.period !== 'monthly' && <div style={{ fontSize: 10, color: 'rgba(232,237,245,.3)' }}>{fmtCurrency(monthlyAmount(exp))}/ay</div>}
                  </div>
                  <button onClick={() => { setEditing(exp); setShowForm(true); }} style={{ background: 'transparent', border: 'none', color: 'rgba(232,237,245,.25)', cursor: 'pointer', padding: '2px 5px', fontSize: 13 }}>✎</button>
                  <button onClick={() => { if (!confirm('Silinsin mi?')) return; onSave({ ...data, expenses: expenses.filter(x => x.id !== exp.id) }); }} style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,.4)', cursor: 'pointer', padding: '2px 5px', fontSize: 13 }}>✕</button>
                </div>
              ))}
            </div>
          ))}
          <div style={{ textAlign: 'right', color: '#f87171', fontWeight: 600, fontSize: 14, padding: '4px 6px' }}>Toplam: {fmtCurrency(total)}/ay</div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// KREDİ KARTI SEKMESI
// ────────────────────────────────────────────
function CardForm({ card, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', limit: '', debt: '', minPayment: '', monthlyPayment: '', cutDay: '', dueDay: '', interestRate: '4.5', ...card });
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label="Kart Adı *"><input className="form-input" value={form.name} onChange={e => s('name', e.target.value)} placeholder="Garanti, Akbank…" /></Field>
        <Field label="Limit (₺)"><input type="number" className="form-input" value={form.limit} onChange={e => s('limit', e.target.value)} /></Field>
        <Field label="Mevcut Borç (₺) *"><input type="number" className="form-input" value={form.debt} onChange={e => s('debt', e.target.value)} /></Field>
        <Field label="Asgari Ödeme (₺)"><input type="number" className="form-input" value={form.minPayment} onChange={e => s('minPayment', e.target.value)} /></Field>
        <Field label="Aylık Ödeme Kapasitesi (₺)"><input type="number" className="form-input" value={form.monthlyPayment} onChange={e => s('monthlyPayment', e.target.value)} /></Field>
        <Field label="Aylık Faiz (%)"><input type="number" step="0.1" className="form-input" value={form.interestRate} onChange={e => s('interestRate', e.target.value)} /></Field>
        <Field label="Hesap Kesim Günü"><input type="number" min="1" max="31" className="form-input" value={form.cutDay} onChange={e => s('cutDay', e.target.value)} /></Field>
        <Field label="Son Ödeme Günü"><input type="number" min="1" max="31" className="form-input" value={form.dueDay} onChange={e => s('dueDay', e.target.value)} /></Field>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.name || !form.debt) return; onSave({ ...form, id: form.id || Date.now() }); }}>Kaydet</button>
      </div>
    </div>
  );
}

export function FinanceCreditCards({ data, onSave }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const cards = data.creditCards || [];

  const handleSave = (card) => {
    const list = [...cards];
    const idx = list.findIndex(c => c.id === card.id);
    if (idx >= 0) list[idx] = card; else list.push(card);
    onSave({ ...data, creditCards: list });
    setShowForm(false); setEditing(null);
  };

  const totalDebt = cards.reduce((s, c) => s + (+c.debt || 0), 0);

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">Kredi Kartları</h2>
          {cards.length > 0 && <p style={{ fontSize: 12, color: 'rgba(232,237,245,.35)', marginTop: 2 }}>Toplam borç: <span style={{ color: '#f87171' }}>{fmtCurrency(totalDebt)}</span></p>}
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(s => !s); }}>+ Kart Ekle</button>
      </div>
      {showForm && <CardForm card={editing || {}} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />}
      {cards.length === 0 ? <div className="empty-state">Henüz kart eklenmedi</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map(card => {
            const payoff = calcPayoff(+card.debt, +card.monthlyPayment, +card.interestRate);
            const debtRatio = card.limit ? Math.min(+card.debt / +card.limit, 1) : null;
            const today = new Date().getDate();
            const dueDays = card.dueDay ? ((+card.dueDay - today + 31) % 31) : null;
            const cutDays = card.cutDay ? ((+card.cutDay - today + 31) % 31) : null;

            return (
              <div key={card.id} style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 16 }}>
                {/* Başlık */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#e8edf5' }}>{card.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,237,245,.35)', marginTop: 2, display: 'flex', gap: 10 }}>
                      {card.dueDay && <span>Son ödeme: {card.dueDay}. gün {dueDays !== null && <span style={{ color: dueDays <= 5 ? '#f87171' : 'inherit' }}>({dueDays === 0 ? 'bugün' : `${dueDays}g`})</span>}</span>}
                      {card.cutDay && <span>Kesim: {card.cutDay}. gün {cutDays !== null && `(${cutDays === 0 ? 'bugün' : `${cutDays}g`})`}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => { setEditing(card); setShowForm(true); }} style={{ background: 'transparent', border: 'none', color: 'rgba(232,237,245,.25)', cursor: 'pointer', fontSize: 13, padding: '2px 5px' }}>✎</button>
                    <button onClick={() => { if (!confirm('Silinsin mi?')) return; onSave({ ...data, creditCards: cards.filter(c => c.id !== card.id) }); }} style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,.4)', cursor: 'pointer', fontSize: 13, padding: '2px 5px' }}>✕</button>
                  </div>
                </div>

                {/* KPI satırı */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Borç', val: fmtCurrency(+card.debt), color: '#f87171' },
                    { label: 'Aylık Ödeme', val: card.monthlyPayment ? fmtCurrency(+card.monthlyPayment) : '—', color: '#3a7bd5' },
                    { label: 'Kalan Limit', val: card.limit ? fmtCurrency(+card.limit - +card.debt) : '—', color: '#34d399' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: `${k.color}08`, border: `1px solid ${k.color}18`, borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: 'rgba(232,237,245,.3)', textTransform: 'uppercase', marginBottom: 2 }}>{k.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: k.color }}>{k.val}</div>
                    </div>
                  ))}
                </div>

                {/* Asgari + taksit */}
                {(card.minPayment) && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    {card.minPayment && (
                      <div style={{ fontSize: 12, color: 'rgba(232,237,245,.4)', padding: '4px 10px', background: 'rgba(255,255,255,.04)', borderRadius: 6 }}>
                        Asgari ödeme: <span style={{ color: '#fbbf24' }}>{fmtCurrency(+card.minPayment)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Kullanım bar */}
                {debtRatio !== null && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(232,237,245,.3)', marginBottom: 3 }}>
                      <span>Limit kullanımı</span>
                      <span>%{Math.round(debtRatio * 100)}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${debtRatio * 100}%`, background: debtRatio > 0.8 ? '#f87171' : debtRatio > 0.5 ? '#fbbf24' : '#34d399', borderRadius: 3, transition: 'width .4s' }} />
                    </div>
                  </div>
                )}

                {/* Ödeme tahmini */}
                {payoff ? (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.15)' }}>
                    <div style={{ fontSize: 11, color: 'rgba(232,237,245,.4)', marginBottom: 2 }}>Ödeme Tahmini</div>
                    <div style={{ fontSize: 13, color: '#34d399', fontWeight: 500 }}>
                      ~{payoff.months} ayda kapanır · <strong>{payoff.date}</strong>
                    </div>
                    {payoff.interest > 0 && (
                      <div style={{ fontSize: 11, color: 'rgba(248,113,113,.7)', marginTop: 2 }}>Toplam faiz: {fmtCurrency(payoff.interest)}</div>
                    )}
                  </div>
                ) : card.debt && card.monthlyPayment ? (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)', fontSize: 12, color: '#f87171' }}>
                    Aylık ödeme faizi karşılamıyor — borç kapanmaz
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// AYLIK ANALİZ SEKMESI
// ────────────────────────────────────────────
function TxForm({ mk, onSave, onCancel }) {
  const [form, setForm] = useState({ desc: '', amount: '', type: 'expense', cat: 'other' });
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label="Açıklama *"><input className="form-input" value={form.desc} onChange={e => s('desc', e.target.value)} /></Field>
        <Field label="Tutar (₺) *"><input type="number" className="form-input" value={form.amount} onChange={e => s('amount', e.target.value)} /></Field>
        <Field label="Tür">
          <select className="form-input" value={form.type} onChange={e => s('type', e.target.value)}>
            <option value="income">Gelir</option>
            <option value="expense">Gider</option>
          </select>
        </Field>
        {form.type === 'expense' && (
          <Field label="Kategori">
            <select className="form-input" value={form.cat} onChange={e => s('cat', e.target.value)}>
              {EXPENSE_CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => { if (!form.desc || !form.amount) return; onSave({ ...form, id: Date.now(), mk, source: 'manual' }); }}>Kaydet</button>
      </div>
    </div>
  );
}

export function FinanceAnalysis({ data, onSave }) {
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [showTxForm, setShowTxForm] = useState(false);

  const txs = data.transactions[selectedMonth] || [];
  const txIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + (+t.amount || 0), 0);
  const txExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + (+t.amount || 0), 0);
  const { totalIncome, totalExpense } = (() => {
    const ti = data.incomes.reduce((s, i) => s + (+i.amount || 0), 0);
    const te = [...data.expenses, ...data.subscriptions].reduce((s, e) => s + monthlyAmount(e), 0);
    return { totalIncome: ti, totalExpense: te };
  })();
  const monthIncome = totalIncome + txIncome;
  const monthExpense = totalExpense + txExpense;
  const monthNet = monthIncome - monthExpense;

  const autoAdd = () => {
    const hasSeed = txs.some(t => t.source === 'auto');
    if (hasSeed) { alert('Bu ay zaten otomatik eklendi.'); return; }
    const autoTxs = [
      ...data.incomes.map(inc => ({ id: Date.now() + Math.random(), desc: inc.name, amount: inc.amount, type: 'income', cat: 'income', mk: selectedMonth, source: 'auto' })),
      ...[...data.expenses, ...data.subscriptions].map(exp => ({ id: Date.now() + Math.random(), desc: exp.name, amount: monthlyAmount(exp).toFixed(2), type: 'expense', cat: exp.cat || 'sub', mk: selectedMonth, source: 'auto' })),
    ];
    onSave({ ...data, transactions: { ...data.transactions, [selectedMonth]: [...txs, ...autoTxs] } });
  };

  const deleteTx = (id) => {
    const list = txs.filter(t => t.id !== id);
    onSave({ ...data, transactions: { ...data.transactions, [selectedMonth]: list } });
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="section-title">Aylık Analiz</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="month" className="form-input" style={{ width: 'auto', fontSize: 12 }}
            value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          <button className="btn-primary" onClick={autoAdd}>⟳ Otomatik Ekle</button>
          <button className="btn-primary" onClick={() => setShowTxForm(s => !s)}>+ Manuel</button>
        </div>
      </div>

      {showTxForm && (
        <TxForm
          mk={selectedMonth}
          onSave={(tx) => { onSave({ ...data, transactions: { ...data.transactions, [selectedMonth]: [...txs, tx] } }); setShowTxForm(false); }}
          onCancel={() => setShowTxForm(false)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Gelir', val: fmtCurrency(monthIncome), color: '#34d399' },
          { label: 'Gider', val: fmtCurrency(monthExpense), color: '#f87171' },
          { label: 'Net', val: fmtCurrency(monthNet), color: monthNet >= 0 ? '#34d399' : '#f87171' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(232,237,245,.35)', textTransform: 'uppercase', marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {txs.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px 0' }}>
          <div style={{ fontSize: 24, color: 'rgba(232,237,245,.1)', marginBottom: 8 }}>₺</div>
          "Otomatik Ekle" ile sabit gelir/giderleri çek veya manuel işlem ekle
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[...txs].reverse().map((tx) => (
            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', background: '#222', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: tx.type === 'income' ? '#34d399' : '#f87171', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#e8edf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.desc}</span>
              {tx.cat && tx.type === 'expense' && (
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: `${CAT_MAP[tx.cat]?.color || '#6b7280'}15`, color: CAT_MAP[tx.cat]?.color || '#6b7280' }}>
                  {CAT_MAP[tx.cat]?.label}
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: tx.type === 'income' ? '#34d399' : '#f87171', whiteSpace: 'nowrap' }}>
                {tx.type === 'income' ? '+' : '-'}{fmtCurrency(tx.amount)}
              </span>
              {tx.source === 'manual' && (
                <button onClick={() => deleteTx(tx.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,.4)', cursor: 'pointer', fontSize: 12, padding: '0 3px', flexShrink: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
