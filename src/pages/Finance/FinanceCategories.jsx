import { useState, useMemo } from 'react';
import {
  EXPENSE_CATS, CAT_MAP, fmt, fmtCurrency,
  monthlyAmount, monthKey, lastNMonths,
} from './financeStore';

// ── Yatay bar ──────────────────────────────────
function HBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s ease' }} />
    </div>
  );
}

// ── Mini SVG donut ─────────────────────────────
function Donut({ slices }) {
  const total = slices.reduce((s, x) => s + x.v, 0);
  if (!total) return null;
  const R = 48, cx = 56, cy = 56, sw = 18;
  let cum = -Math.PI / 2;
  const arcs = slices.map(s => {
    const angle = (s.v / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cum), y1 = cy + R * Math.sin(cum);
    cum += angle;
    const x2 = cx + R * Math.cos(cum), y2 = cy + R * Math.sin(cum);
    return { ...s, d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}` };
  });
  return (
    <svg viewBox="0 0 112 112" style={{ width: 112, flexShrink: 0 }}>
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="butt" />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#e8edf5" fontSize={12} fontWeight={600}>{fmtCurrency(total)}</text>
      <text x={cx} y={cx + 10} textAnchor="middle" fill="rgba(232,237,245,.35)" fontSize={9}>/ay</text>
    </svg>
  );
}

export default function FinanceCategories({ data }) {
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [view, setView] = useState('overview'); // 'overview' | 'trend'

  const months = lastNMonths(6);
  const prevMk = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));

  // Tüm gider + abonelik -> kategori toplamları (sabit recurring)
  const recurringByCat = useMemo(() => {
    const map = {};
    [...data.expenses, ...data.subscriptions].forEach(e => {
      const cat = e.cat || 'other';
      map[cat] = (map[cat] || 0) + monthlyAmount(e);
    });
    return map;
  }, [data.expenses, data.subscriptions]);

  // Seçili aydaki işlemler -> kategori toplamları
  const txByCat = useMemo(() => {
    const map = {};
    (data.transactions[selectedMonth] || [])
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.cat || 'other';
        map[cat] = (map[cat] || 0) + (+t.amount || 0);
      });
    return map;
  }, [data.transactions, selectedMonth]);

  // Birleştir
  const combined = useMemo(() => {
    const allCats = new Set([...Object.keys(recurringByCat), ...Object.keys(txByCat)]);
    return [...allCats].map(cat => ({
      cat,
      label: CAT_MAP[cat]?.label || cat,
      color: CAT_MAP[cat]?.color || '#6b7280',
      amount: (recurringByCat[cat] || 0) + (txByCat[cat] || 0),
    })).sort((a, b) => b.amount - a.amount);
  }, [recurringByCat, txByCat]);

  const total = combined.reduce((s, c) => s + c.amount, 0);
  const maxCat = combined[0]?.amount || 1;

  // Önceki ay aynı kategori
  const prevTxByCat = useMemo(() => {
    const map = {};
    (data.transactions[prevMk] || []).filter(t => t.type === 'expense').forEach(t => {
      const cat = t.cat || 'other';
      map[cat] = (map[cat] || 0) + (+t.amount || 0);
    });
    return map;
  }, [data.transactions, prevMk]);

  // Trend: son 6 ay kategori bazlı
  const trendData = useMemo(() => {
    return EXPENSE_CATS.slice(0, 5).map(cat => ({
      ...cat,
      values: months.map(mk => {
        const tx = (data.transactions[mk] || []).filter(t => t.type === 'expense' && (t.cat || 'other') === cat.id).reduce((s, t) => s + (+t.amount || 0), 0);
        return (recurringByCat[cat.id] || 0) + tx;
      }),
    })).filter(c => c.values.some(v => v > 0));
  }, [months, data.transactions, recurringByCat]);

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="section-title">Kategori Analizleri</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="tab-bar" style={{ marginBottom: 0 }}>
            <button className={`tab-btn ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Genel Bakış</button>
            <button className={`tab-btn ${view === 'trend' ? 'active' : ''}`} onClick={() => setView('trend')}>Trend</button>
          </div>
          <input type="month" className="form-input" style={{ width: 'auto', fontSize: 12 }}
            value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
        </div>
      </div>

      {view === 'overview' ? (
        <>
          {/* Donut + liste */}
          <div style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(232,237,245,.4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Dağılım</div>
            {combined.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(232,237,245,.2)', fontSize: 12 }}>
                Bu ay için kategori verisi yok
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <Donut slices={combined.map(c => ({ v: c.amount, color: c.color }))} />
                <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {combined.slice(0, 6).map(c => (
                    <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                      <span style={{ color: 'rgba(232,237,245,.6)', flex: 1 }}>{c.label}</span>
                      <span style={{ color: '#e8edf5' }}>{fmtCurrency(c.amount)}</span>
                      <span style={{ color: 'rgba(232,237,245,.3)', fontSize: 10 }}>%{total > 0 ? Math.round(c.amount / total * 100) : 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kategori detay listesi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {combined.map(c => {
              const prev = (recurringByCat[c.cat] || 0) + (prevTxByCat[c.cat] || 0);
              const change = prev > 0 ? ((c.amount / prev - 1) * 100) : null;
              const up = change !== null && change > 0;
              return (
                <div key={c.cat} style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: '#e8edf5' }}>{c.label}</span>
                    {change !== null && (
                      <span style={{ fontSize: 11, color: up ? '#f87171' : '#34d399', padding: '1px 6px', borderRadius: 4, background: up ? 'rgba(248,113,113,.1)' : 'rgba(52,211,153,.1)' }}>
                        {up ? '▲' : '▼'} %{Math.abs(change).toFixed(0)} geçen ay
                      </span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: c.color }}>{fmtCurrency(c.amount)}</span>
                  </div>
                  <HBar value={c.amount} max={maxCat} color={c.color} />
                  <div style={{ fontSize: 10, color: 'rgba(232,237,245,.25)', marginTop: 4 }}>
                    Toplam giderin %{total > 0 ? Math.round(c.amount / total * 100) : 0}'i
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Trend görünümü - basit çizgi grafik */
        <div style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(232,237,245,.4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Son 6 Ay Kategori Trendi</div>
          {trendData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(232,237,245,.2)', fontSize: 12 }}>Yeterli veri yok</div>
          ) : (
            <>
              {trendData.map(cat => {
                const maxV = Math.max(...cat.values, 1);
                const W = 300, H = 40;
                const pts = cat.values.map((v, i) => {
                  const x = (i / (cat.values.length - 1)) * W;
                  const y = H - (v / maxV) * (H - 6) - 3;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                });
                return (
                  <div key={cat.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: cat.color }} />
                      <span style={{ fontSize: 12, color: 'rgba(232,237,245,.6)' }}>{cat.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: cat.color }}>{fmtCurrency(cat.values[cat.values.length - 1])}</span>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
                      <polyline points={pts.join(' ')} fill="none" stroke={cat.color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                      {cat.values.map((v, i) => {
                        const x = (i / (cat.values.length - 1)) * W;
                        const y = H - (v / maxV) * (H - 6) - 3;
                        return <circle key={i} cx={x} cy={y} r={2.5} fill={cat.color} />;
                      })}
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {months.map(m => (
                        <span key={m} style={{ fontSize: 9, color: 'rgba(232,237,245,.25)' }}>
                          {new Date(m + '-01').toLocaleString('tr-TR', { month: 'short' })}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
