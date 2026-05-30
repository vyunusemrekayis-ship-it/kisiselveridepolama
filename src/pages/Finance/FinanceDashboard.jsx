import { useState, useEffect, useRef } from 'react';
import {
  fmt, fmtCurrency, lastNMonths, shortMonth,
  monthlyTotals, calcTotals, monthKey, CAT_MAP,
} from './financeStore';

// ── Mini inline SVG çizgi grafiği ─────────────
function SparkLine({ values, color = '#3a7bd5', height = 36, width = 80 }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]}
        r="2.5" fill={color} />
    </svg>
  );
}

// ── Çizgi grafik (tam genişlik) ────────────────
function LineChart({ months, data }) {
  if (months.length < 2) return (
    <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(232,237,245,.25)', fontSize: 12 }}>
      Grafik için en az 2 aylık veri gerekli
    </div>
  );

  const incomes = months.map(m => data[m]?.income || 0);
  const expenses = months.map(m => data[m]?.expense || 0);
  const allVals = [...incomes, ...expenses];
  const maxV = Math.max(...allVals, 1);
  const minV = Math.min(...allVals, 0);
  const range = maxV - minV || 1;

  const W = 520, H = 130, padL = 48, padR = 12, padT = 10, padB = 28;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const toXY = (vals) => vals.map((v, i) => ({
    x: padL + (i / (vals.length - 1)) * cW,
    y: padT + cH - ((v - minV) / range) * cH,
  }));

  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const toArea = (pts, base) => `${toPath(pts)} L ${pts[pts.length - 1].x} ${base} L ${pts[0].x} ${base} Z`;

  const iPts = toXY(incomes);
  const ePts = toXY(expenses);
  const base = padT + cH;

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map(f => minV + f * range);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="egGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f87171" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid yatay çizgiler */}
      {gridVals.map((v, i) => {
        const y = padT + cH - ((v - minV) / range) * cH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={padL - 5} y={y + 3.5} textAnchor="end" fill="rgba(232,237,245,.28)" fontSize={9}>
              {v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Ay etiketleri */}
      {months.map((mk, i) => (
        <text key={mk} x={padL + (i / (months.length - 1)) * cW} y={H - 6}
          textAnchor="middle" fill="rgba(232,237,245,.3)" fontSize={9}>
          {shortMonth(mk)}
        </text>
      ))}

      {/* Alan dolgular */}
      <path d={toArea(iPts, base)} fill="url(#igGrad)" />
      <path d={toArea(ePts, base)} fill="url(#egGrad)" />

      {/* Çizgiler */}
      <path d={toPath(iPts)} fill="none" stroke="#34d399" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={toPath(ePts)} fill="none" stroke="#f87171" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Noktalar */}
      {iPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#34d399" />)}
      {ePts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#f87171" />)}
    </svg>
  );
}

// ── Yaklaşan ödeme hesabı ──────────────────────
function getUpcoming(data) {
  const today = new Date();
  const todayDay = today.getDate();
  const events = [];

  // Abonelikler
  data.subscriptions.forEach(s => {
    const day = +s.dueDay || 1;
    let daysLeft = day - todayDay;
    if (daysLeft < 0) daysLeft += 30;
    events.push({ name: s.name, amount: +s.amount, daysLeft, type: 'sub', color: '#c084fc' });
  });

  // Sabit giderler
  data.expenses.forEach(e => {
    if (!e.dueDay) return;
    const day = +e.dueDay;
    let daysLeft = day - todayDay;
    if (daysLeft < 0) daysLeft += 30;
    events.push({ name: e.name, amount: +e.amount, daysLeft, type: 'expense', color: CAT_MAP[e.cat]?.color || '#6b7280' });
  });

  // Kredi kartları
  data.creditCards.forEach(c => {
    if (!c.dueDay) return;
    const day = +c.dueDay;
    let daysLeft = day - todayDay;
    if (daysLeft < 0) daysLeft += 30;
    events.push({ name: `${c.name} (KK)`, amount: +c.debt, daysLeft, type: 'card', color: '#f87171' });
  });

  return events.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 6);
}

// ── Akıllı uyarılar ────────────────────────────
function getAlerts(data, monthData) {
  const alerts = [];
  const today = new Date();
  const todayDay = today.getDate();
  const mk = monthKey();
  const prevMk = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const cur = monthData[mk] || { income: 0, expense: 0 };
  const prev = monthData[prevMk] || { income: 0, expense: 0 };

  // Gider artışı
  if (prev.expense > 0 && cur.expense > prev.expense * 1.2) {
    const pct = Math.round((cur.expense / prev.expense - 1) * 100);
    alerts.push({ type: 'warn', msg: `Bu ay giderlerin geçen aya göre %${pct} arttı` });
  }

  // KK son ödeme yakın
  data.creditCards.forEach(c => {
    if (!c.dueDay) return;
    const d = +c.dueDay - todayDay;
    if (d >= 0 && d <= 5) {
      alerts.push({ type: 'danger', msg: `${c.name} son ödeme tarihi ${d === 0 ? 'bugün' : `${d} gün sonra`}` });
    }
  });

  // Abonelik yakın
  data.subscriptions.forEach(s => {
    if (!s.dueDay) return;
    const d = +s.dueDay - todayDay;
    if (d >= 0 && d <= 3) {
      alerts.push({ type: 'info', msg: `${s.name} ödemesi ${d === 0 ? 'bugün' : `${d} gün sonra`} — ₺${fmt(s.amount)}` });
    }
  });

  // Tasarruf oranı düşük
  if (cur.income > 0 && cur.net < cur.income * 0.1) {
    alerts.push({ type: 'warn', msg: 'Tasarruf oranın %10\'un altında, harcamalarını gözden geçir' });
  }

  return alerts.slice(0, 4);
}

// ── Ana bileşen ─────────────────────────────────
export default function FinanceDashboard({ data, onNavigate }) {
  const months = lastNMonths(12);
  const { totalIncome, totalExpense } = calcTotals(data);
  const net = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;
  const totalCardDebt = data.creditCards.reduce((s, c) => s + (+c.debt || 0), 0);

  const monthlyData = {};
  months.forEach(m => { monthlyData[m] = monthlyTotals(data, m); });

  const upcoming = getUpcoming(data);
  const alerts = getAlerts(data, monthlyData);

  const curMk = monthKey();
  const prevMk = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
  const curData = monthlyData[curMk] || { income: totalIncome, expense: totalExpense, net };
  const prevData = monthlyData[prevMk] || { income: totalIncome, expense: totalExpense };
  const incomeChange = prevData.income > 0 ? ((curData.income / prevData.income - 1) * 100).toFixed(1) : null;
  const expenseChange = prevData.expense > 0 ? ((curData.expense / prevData.expense - 1) * 100).toFixed(1) : null;

  // Son işlemler
  const recentTxs = [];
  [...months].reverse().forEach(m => {
    (data.transactions[m] || []).reverse().forEach(tx => recentTxs.push({ ...tx, mk: m }));
  });
  const lastTxs = recentTxs.slice(0, 6);

  const alertColors = {
    danger: { bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.2)', dot: '#f87171' },
    warn:   { bg: 'rgba(251,191,36,.08)',  border: 'rgba(251,191,36,.2)',  dot: '#fbbf24' },
    info:   { bg: 'rgba(96,165,250,.08)',  border: 'rgba(96,165,250,.2)',  dot: '#60a5fa' },
  };

  return (
    <div className="animate-fadeIn">

      {/* Uyarı bandı */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {alerts.map((a, i) => {
            const c = alertColors[a.type];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: c.bg, border: `1px solid ${c.border}`, fontSize: 12, color: '#e8edf5' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0, animation: a.type === 'danger' ? 'pulse 1.5s infinite' : 'none' }} />
                {a.msg}
              </div>
            );
          })}
        </div>
      )}

      {/* KPI ızgara */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Bu Ay Gelir', val: fmtCurrency(curData.income), change: incomeChange, color: '#34d399', sparkVals: months.map(m => monthlyData[m]?.income || 0) },
          { label: 'Bu Ay Gider', val: fmtCurrency(curData.expense), change: expenseChange, color: '#f87171', invert: true, sparkVals: months.map(m => monthlyData[m]?.expense || 0) },
          { label: 'Net Kazanç', val: fmtCurrency(net), color: net >= 0 ? '#34d399' : '#f87171', extra: `Tasarruf: %${savingsRate}` },
          { label: 'Kredi Kartı Borcu', val: fmtCurrency(totalCardDebt), color: totalCardDebt > 0 ? '#f87171' : '#34d399', extra: `${data.creditCards.length} kart` },
        ].map((k, i) => (
          <div key={i} style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
            {/* Arka fon aksan çizgisi */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.color, opacity: 0.4, borderRadius: '10px 10px 0 0' }} />
            <div style={{ fontSize: 10, color: 'rgba(232,237,245,.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: k.color, lineHeight: 1 }}>{k.val}</div>
              {k.sparkVals && <SparkLine values={k.sparkVals} color={k.color} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {k.change !== undefined && k.change !== null && (
                <span style={{ fontSize: 11, color: (k.invert ? +k.change < 0 : +k.change > 0) ? '#34d399' : '#f87171' }}>
                  {+k.change > 0 ? '▲' : '▼'} %{Math.abs(+k.change)} geçen ay
                </span>
              )}
              {k.extra && <span style={{ fontSize: 11, color: 'rgba(232,237,245,.3)' }}>{k.extra}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Çizgi grafik */}
      <div style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(232,237,245,.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gelir / Gider — Son 12 Ay</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(232,237,245,.4)' }}>
              <span style={{ width: 20, height: 2, background: '#34d399', display: 'inline-block', borderRadius: 1 }} /> Gelir
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(232,237,245,.4)' }}>
              <span style={{ width: 20, height: 2, background: '#f87171', display: 'inline-block', borderRadius: 1 }} /> Gider
            </span>
          </div>
        </div>
        <LineChart months={months} data={monthlyData} />
      </div>

      {/* Alt 2 kolon */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Yaklaşan ödemeler */}
        <div style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'rgba(232,237,245,.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Yaklaşan Ödemeler</div>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(232,237,245,.2)', textAlign: 'center', padding: '16px 0' }}>Ödeme bulunamadı</div>
          ) : upcoming.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < upcoming.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#e8edf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
              <span style={{ fontSize: 11, color: e.daysLeft <= 3 ? '#f87171' : 'rgba(232,237,245,.35)', whiteSpace: 'nowrap' }}>
                {e.daysLeft === 0 ? 'bugün' : `${e.daysLeft}g`}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: e.color, whiteSpace: 'nowrap' }}>{fmtCurrency(e.amount)}</span>
            </div>
          ))}
        </div>

        {/* Son işlemler */}
        <div style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'rgba(232,237,245,.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Son İşlemler</div>
            <button onClick={() => onNavigate('analysis')} style={{ background: 'transparent', border: 'none', color: '#3a7bd5', fontSize: 11, cursor: 'pointer' }}>Tümü →</button>
          </div>
          {lastTxs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(232,237,245,.2)', textAlign: 'center', padding: '16px 0' }}>Henüz işlem yok</div>
          ) : lastTxs.map((tx, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < lastTxs.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: tx.type === 'income' ? '#34d399' : '#f87171', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#e8edf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.desc}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: tx.type === 'income' ? '#34d399' : '#f87171' }}>
                {tx.type === 'income' ? '+' : '-'}{fmtCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
