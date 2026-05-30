import { useState, useEffect, useCallback } from 'react';
import {
  fmt, fmtCurrency, INVESTMENT_TYPES, INV_MAP,
  fetchCryptoPrice, fetchForexPrice, fetchPriceViaAI,
  fetchCryptoHistory, loadPriceHistory, savePricePoint, CRYPTO_IDS,
} from './financeStore';

// ── Sembol eşleştirme sözlüğü ─────────────────────────────────────
const SMART_MAP = {
  'bitcoin':{'symbol':'BTC','type':'crypto','name':'Bitcoin'},
  'btc':{'symbol':'BTC','type':'crypto','name':'Bitcoin'},
  'ethereum':{'symbol':'ETH','type':'crypto','name':'Ethereum'},
  'eth':{'symbol':'ETH','type':'crypto','name':'Ethereum'},
  'solana':{'symbol':'SOL','type':'crypto','name':'Solana'},
  'sol':{'symbol':'SOL','type':'crypto','name':'Solana'},
  'xrp':{'symbol':'XRP','type':'crypto','name':'XRP'},
  'ripple':{'symbol':'XRP','type':'crypto','name':'XRP'},
  'doge':{'symbol':'DOGE','type':'crypto','name':'Dogecoin'},
  'dogecoin':{'symbol':'DOGE','type':'crypto','name':'Dogecoin'},
  'bnb':{'symbol':'BNB','type':'crypto','name':'BNB'},
  'ada':{'symbol':'ADA','type':'crypto','name':'Cardano'},
  'cardano':{'symbol':'ADA','type':'crypto','name':'Cardano'},
  'avax':{'symbol':'AVAX','type':'crypto','name':'Avalanche'},
  'link':{'symbol':'LINK','type':'crypto','name':'Chainlink'},
  'matic':{'symbol':'MATIC','type':'crypto','name':'Polygon'},
  'polygon':{'symbol':'MATIC','type':'crypto','name':'Polygon'},
  'altin':{'symbol':'XAU','type':'gold','name':'Altın (gram)'},
  'altın':{'symbol':'XAU','type':'gold','name':'Altın (gram)'},
  'gold':{'symbol':'XAU','type':'gold','name':'Altın (gram)'},
  'xau':{'symbol':'XAU','type':'gold','name':'Altın (gram)'},
  'dolar':{'symbol':'USD','type':'forex','name':'Dolar (USD)'},
  'usd':{'symbol':'USD','type':'forex','name':'Dolar (USD)'},
  'euro':{'symbol':'EUR','type':'forex','name':'Euro (EUR)'},
  'eur':{'symbol':'EUR','type':'forex','name':'Euro (EUR)'},
  'apple':{'symbol':'AAPL','type':'stock','name':'Apple'},
  'aapl':{'symbol':'AAPL','type':'stock','name':'Apple'},
  'tesla':{'symbol':'TSLA','type':'stock','name':'Tesla'},
  'tsla':{'symbol':'TSLA','type':'stock','name':'Tesla'},
  'nvidia':{'symbol':'NVDA','type':'stock','name':'NVIDIA'},
  'nvda':{'symbol':'NVDA','type':'stock','name':'NVIDIA'},
  'microsoft':{'symbol':'MSFT','type':'stock','name':'Microsoft'},
  'msft':{'symbol':'MSFT','type':'stock','name':'Microsoft'},
  'google':{'symbol':'GOOGL','type':'stock','name':'Google'},
  'amazon':{'symbol':'AMZN','type':'stock','name':'Amazon'},
  'meta':{'symbol':'META','type':'stock','name':'Meta'},
  'netflix':{'symbol':'NFLX','type':'stock','name':'Netflix'},
  'spotify':{'symbol':'SPOT','type':'stock','name':'Spotify'},
  'thyao':{'symbol':'THYAO.IS','type':'stock','name':'Türk Hava Yolları'},
  'thy':{'symbol':'THYAO.IS','type':'stock','name':'Türk Hava Yolları'},
  'garan':{'symbol':'GARAN.IS','type':'stock','name':'Garanti BBVA'},
};
function smartResolve(text) { return SMART_MAP[text.toLowerCase().trim()] || null; }

// ── Değişim badge ──────────────────────────────
function ChangeBadge({ change }) {
  if (change === null || change === undefined) return <span style={{ color: 'rgba(232,237,245,.25)', fontSize: 11 }}>—</span>;
  const up = change >= 0;
  return (
    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 500, background: up ? 'rgba(52,211,153,.1)' : 'rgba(248,113,113,.1)', color: up ? '#34d399' : '#f87171' }}>
      {up ? '▲' : '▼'} %{Math.abs(change).toFixed(2)}
    </span>
  );
}

function Spinner({ size = 16 }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid rgba(255,255,255,.1)`, borderTopColor: '#3a7bd5', animation: 'spin .8s linear infinite', flexShrink: 0 }} />;
}

// ── Mini çizgi grafik (SVG) ────────────────────
function MiniChart({ history, color, height = 52 }) {
  if (!history || history.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(232,237,245,.2)', borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 8, marginTop: 8 }}>
        Grafik verisi birikiyor…
      </div>
    );
  }

  const prices = history.map(h => h.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const W = 400, H = height;
  const pad = 4;

  const pts = history.map((h, i) => {
    const x = pad + (i / (history.length - 1)) * (W - pad * 2);
    const y = H - pad - ((h.price - minP) / range) * (H - pad * 2);
    return [x.toFixed(1), y.toFixed(1)];
  });

  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length-1][0]} ${H} L ${pts[0][0]} ${H} Z`;

  const first = prices[0], last = prices[prices.length - 1];
  const pct = ((last - first) / first * 100).toFixed(1);
  const up = last >= first;
  const lineColor = up ? '#34d399' : '#f87171';

  // Tarih etiketleri
  const labels = [];
  if (history.length >= 7) {
    [0, Math.floor(history.length / 2), history.length - 1].forEach(i => {
      const d = new Date(history[i].ts);
      labels.push({ x: pts[i][0], label: `${d.getDate()}/${d.getMonth()+1}` });
    });
  }

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'rgba(232,237,245,.3)' }}>{history.length} gün</span>
        <span style={{ fontSize: 11, color: up ? '#34d399' : '#f87171', fontWeight: 500 }}>
          {up ? '▲' : '▼'} %{Math.abs(+pct)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad_${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={lineColor} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad_${color.replace('#','')})`}/>
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Son nokta */}
        <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={lineColor}/>
        {/* Tarih etiketleri */}
        {labels.map((l, i) => (
          <text key={i} x={l.x} y={H + 12} textAnchor="middle" fill="rgba(232,237,245,.25)" fontSize="9">{l.label}</text>
        ))}
      </svg>
    </div>
  );
}

// ── Fiyat çekici hook ──────────────────────────
function useLivePrice(inv) {
  const [price, setPrice] = useState(null);
  const [change, setChange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState(() => loadPriceHistory(inv.symbol));
  const [histLoading, setHistLoading] = useState(false);

  const fetchPrice = useCallback(async () => {
    if (!inv?.symbol) return;
    setLoading(true); setError(false);
    try {
      let result = null;
      if (inv.type === 'crypto') {
        result = await fetchCryptoPrice(inv.symbol);
      } else if (inv.type === 'forex' || inv.type === 'gold') {
        result = await fetchForexPrice(inv.type === 'gold' ? 'XAU' : inv.symbol);
        // Forex/altın CORS ile çalışmıyorsa AI'ya sor
        if (!result) result = await fetchPriceViaAI(inv.symbol, inv.type, inv.name);
      } else if (inv.type === 'stock') {
        // Hisse için direkt AI kullan
        result = await fetchPriceViaAI(inv.symbol, inv.type, inv.name);
      }
      if (result) {
        setPrice(result.price);
        setChange(result.change24h);
        // Fiyatı geçmişe kaydet
        savePricePoint(inv.symbol, result.price);
        setHistory(loadPriceHistory(inv.symbol));
      } else setError(true);
    } catch { setError(true); }
    setLoading(false);
  }, [inv?.symbol, inv?.type, inv?.name]);

  // Kripto için 30 günlük geçmiş çek
  const fetchHistory = useCallback(async () => {
    if (inv.type !== 'crypto') return;
    const local = loadPriceHistory(inv.symbol);
    // Yeterli lokal veri varsa çekme
    if (local.length >= 25) { setHistory(local); return; }
    setHistLoading(true);
    const h = await fetchCryptoHistory(inv.symbol);
    if (h?.length) {
      // CoinGecko verisini localStorage'a yaz
      const PRICE_HISTORY_KEY = 'gn_inv_history';
      try {
        const all = JSON.parse(localStorage.getItem(PRICE_HISTORY_KEY) || '{}');
        all[inv.symbol.toUpperCase()] = h.slice(-90);
        localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(all));
      } catch {}
      setHistory(h);
    } else {
      setHistory(local);
    }
    setHistLoading(false);
  }, [inv?.symbol, inv?.type]);

  useEffect(() => { fetchPrice(); fetchHistory(); }, [fetchPrice, fetchHistory]);

  return { price, change, loading, error, history, histLoading, refresh: fetchPrice };
}

// ── AI ile ekleme paneli ───────────────────────
function AiAddPanel({ onAdd, onClose }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const ask = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setResult(null);
    const words = input.toLowerCase().split(/\s+/);
    let matched = null;
    for (const w of words) { matched = smartResolve(w); if (matched) break; }
    if (matched) {
      const nums = (input.match(/[\d.,]+/g) || []).map(n => parseFloat(n.replace(',','.'))).filter(n => !isNaN(n));
      setResult({ ...matched, amount: nums[0] || '', buyPrice: nums[1] || '' });
      setLoading(false); return;
    }
    if (!window.ANTHROPIC_KEY && window.loadApiKey) await window.loadApiKey();
    if (!window.ANTHROPIC_KEY) { setError('API anahtarı bulunamadı.'); setLoading(false); return; }
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': window.ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 300,
          messages: [{ role: 'user', content: `Kullanıcı şunu yazdı: "${input}"\nBu bir yatırım ekleme isteği. Şu JSON formatında yanıt ver, başka hiçbir şey yazma:\n{"name":"...", "symbol":"...", "type":"crypto|stock|gold|forex|other", "amount":"...", "buyPrice":""}\n\nKurallar:\n- type: kripto→crypto, hisse→stock, altın/gümüş→gold, döviz→forex\n- symbol: kripto sembolü (BTC,ETH...), hisse Yahoo kodu (AAPL,THYAO.IS...), altın→XAU, döviz→USD/EUR\n- amount/buyPrice: sayı yoksa boş string\n- Türkçe isimler için doğru symbol bul (altın→XAU, apple→AAPL)` }],
        }),
      });
      const d = await res.json();
      const text = d.content?.[0]?.text || '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
      setResult(parsed);
    } catch { setError('Anlaşılamadı, lütfen manuel ekle.'); }
    setLoading(false);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div style={{ fontSize: 12, color: 'rgba(232,237,245,.5)', marginBottom: 10 }}>
        Doğal dille yatırım ekle — "5 Apple hissesi 180 dolardan" veya sadece "altın"
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="form-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="bitcoin, 2 adet · apple · 100 dolar" autoFocus />
        <button onClick={ask} disabled={loading || !input.trim()} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: loading ? 'rgba(58,123,213,.3)' : '#3a7bd5', color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, opacity: !input.trim() ? 0.4 : 1 }}>
          {loading ? <Spinner size={12} /> : '✦'} Analiz Et
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>{error}</div>}
      {result && (
        <div style={{ background: 'rgba(58,123,213,.08)', border: '1px solid rgba(58,123,213,.2)', borderRadius: 9, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(232,237,245,.4)', marginBottom: 8 }}>Tespit edildi — kontrol et ve ekle:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[{label:'İsim',key:'name'},{label:'Sembol',key:'symbol'},{label:'Tür',key:'type'},{label:'Miktar',key:'amount'},{label:'Alış Fiyatı (₺)',key:'buyPrice'}].map(f => (
              <div key={f.key}>
                <label className="form-label">{f.label}</label>
                {f.key === 'type' ? (
                  <select className="form-input" value={result[f.key]||''} onChange={e => setResult(r=>({...r,[f.key]:e.target.value}))}>
                    {INVESTMENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                ) : (
                  <input className="form-input" value={result[f.key]||''} onChange={e=>setResult(r=>({...r,[f.key]:e.target.value}))}/>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn-cancel" onClick={()=>setResult(null)}>Düzelt</button>
            <button className="btn-save" onClick={()=>{ if(!result.name||!result.symbol)return; onAdd({...result,id:Date.now()}); }}>Ekle</button>
          </div>
        </div>
      )}
      <div className="flex justify-end"><button className="btn-cancel" onClick={onClose}>İptal</button></div>
    </div>
  );
}

// ── Manuel form ────────────────────────────────
function InvForm({ inv, onSave, onCancel }) {
  const [form, setForm] = useState({ name:'',symbol:'',type:'crypto',amount:'',buyPrice:'',note:'',...inv });
  const s = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleNameChange = (val) => {
    s('name',val);
    const r = smartResolve(val);
    if (r) setForm(f=>({...f,name:r.name,symbol:r.symbol,type:r.type}));
  };
  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-slideUp">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div><label className="form-label">İsim *</label><input className="form-input" value={form.name} onChange={e=>handleNameChange(e.target.value)} placeholder="Bitcoin, Apple, Altın…"/></div>
        <div><label className="form-label">Tür</label>
          <select className="form-input" value={form.type} onChange={e=>s('type',e.target.value)}>
            {INVESTMENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select></div>
        <div><label className="form-label">Sembol</label><input className="form-input" value={form.symbol} onChange={e=>s('symbol',e.target.value.toUpperCase())} placeholder="BTC, AAPL, XAU…"/>{form.name&&smartResolve(form.name)&&<div style={{fontSize:10,color:'#34d399',marginTop:3}}>✓ Otomatik eşleştirildi</div>}</div>
        <div><label className="form-label">Miktar</label><input type="number" className="form-input" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0.5"/></div>
        <div><label className="form-label">Alış Fiyatı (₺)</label><input type="number" className="form-input" value={form.buyPrice} onChange={e=>s('buyPrice',e.target.value)}/></div>
        <div><label className="form-label">Not</label><input className="form-input" value={form.note} onChange={e=>s('note',e.target.value)}/></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={()=>{ if(!form.name.trim()||!form.symbol.trim())return; onSave({...form,id:form.id||Date.now()}); }}>Kaydet</button>
      </div>
    </div>
  );
}

// ── Yatırım kartı ──────────────────────────────
function InvRow({ inv, onEdit, onDelete }) {
  const { price, change, loading, error, history, histLoading, refresh } = useLivePrice(inv);
  const [showChart, setShowChart] = useState(false);

  const currentVal = price && inv.amount ? price * +inv.amount : null;
  const costBasis = inv.buyPrice && inv.amount ? +inv.buyPrice * +inv.amount : null;
  const pnl = currentVal !== null && costBasis !== null ? currentVal - costBasis : null;
  const pnlPct = costBasis && pnl !== null ? (pnl / costBasis) * 100 : null;
  const typeColor = INV_MAP[inv.type]?.color || '#94a3b8';
  const hasHistory = history && history.length >= 2;

  return (
    <div style={{ background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '14px 16px', transition: 'border-color .15s' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.13)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.07)'}
    >
      {/* Üst satır */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
        <div style={{ width:28, height:28, borderRadius:7, background:`${typeColor}15`, border:`1px solid ${typeColor}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:typeColor }}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontWeight:500, fontSize:14, color:'#e8edf5' }}>{inv.name}</span>
            <span style={{ fontSize:10, color:'rgba(232,237,245,.3)', padding:'1px 5px', background:'rgba(255,255,255,.05)', borderRadius:4 }}>{inv.symbol}</span>
            <span style={{ fontSize:10, color:typeColor, padding:'1px 5px', background:`${typeColor}12`, borderRadius:4 }}>{INV_MAP[inv.type]?.label}</span>
          </div>
          <div style={{ fontSize:11, color:'rgba(232,237,245,.3)', marginTop:1 }}>
            {inv.amount ? `${inv.amount} adet` : ''}{inv.note ? ` · ${inv.note}` : ''}
          </div>
        </div>
        <div style={{ display:'flex', gap:4, flexShrink:0 }}>
          {/* Grafik toggle */}
          {hasHistory && (
            <button onClick={()=>setShowChart(v=>!v)} title="Grafik" style={{ background: showChart ? `${typeColor}20` : 'transparent', border: showChart ? `1px solid ${typeColor}40` : 'none', color: showChart ? typeColor : 'rgba(232,237,245,.25)', cursor:'pointer', fontSize:11, padding:'3px 7px', borderRadius:5 }}>
              {histLoading ? '…' : '↗'}
            </button>
          )}
          <button onClick={refresh} title="Yenile" style={{ background:'transparent', border:'none', color:'rgba(232,237,245,.25)', cursor:'pointer', fontSize:14, padding:'3px 5px', display:'inline-block', animation:loading?'spin .8s linear infinite':'none' }}>↻</button>
          <button onClick={()=>onEdit(inv)} style={{ background:'transparent', border:'none', color:'rgba(232,237,245,.25)', cursor:'pointer', fontSize:13, padding:'3px 5px' }}>✎</button>
          <button onClick={()=>onDelete(inv.id)} style={{ background:'transparent', border:'none', color:'rgba(248,113,113,.35)', cursor:'pointer', fontSize:13, padding:'3px 5px' }}>✕</button>
        </div>
      </div>

      {/* Fiyat bilgileri */}
      <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:10, color:'rgba(232,237,245,.3)', marginBottom:2 }}>Anlık Fiyat</div>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}><Spinner size={12}/><span style={{ fontSize:12, color:'rgba(232,237,245,.35)' }}>Yükleniyor…</span></div>
          ) : error ? (
            <span style={{ fontSize:12, color:'rgba(248,113,113,.5)' }}>Bağlanamadı</span>
          ) : price !== null ? (
            <span style={{ fontSize:16, fontWeight:700, color:typeColor }}>{fmtCurrency(price)}</span>
          ) : (
            <span style={{ fontSize:12, color:'rgba(232,237,245,.25)' }}>—</span>
          )}
        </div>
        {!loading && !error && change !== null && (
          <div><div style={{ fontSize:10, color:'rgba(232,237,245,.3)', marginBottom:2 }}>24s</div><ChangeBadge change={change}/></div>
        )}
        {currentVal !== null && (
          <div><div style={{ fontSize:10, color:'rgba(232,237,245,.3)', marginBottom:2 }}>Toplam Değer</div><span style={{ fontSize:14, fontWeight:500, color:'#e8edf5' }}>{fmtCurrency(currentVal)}</span></div>
        )}
        {pnl !== null && (
          <div>
            <div style={{ fontSize:10, color:'rgba(232,237,245,.3)', marginBottom:2 }}>Kâr / Zarar</div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:13, fontWeight:500, color:pnl>=0?'#34d399':'#f87171' }}>{pnl>=0?'+':''}{fmtCurrency(pnl)}</span>
              {pnlPct !== null && <ChangeBadge change={pnlPct}/>}
            </div>
          </div>
        )}
        {inv.buyPrice && (
          <div style={{ marginLeft:'auto' }}>
            <div style={{ fontSize:10, color:'rgba(232,237,245,.3)', marginBottom:2 }}>Alış</div>
            <span style={{ fontSize:12, color:'rgba(232,237,245,.4)' }}>{fmtCurrency(+inv.buyPrice)}</span>
          </div>
        )}
      </div>

      {/* Grafik */}
      {showChart && (
        <MiniChart history={history} color={typeColor} />
      )}

      {/* Grafik yok — bilgi */}
      {!hasHistory && !loading && price !== null && (
        <div style={{ marginTop:8, fontSize:10, color:'rgba(232,237,245,.2)', borderTop:'1px solid rgba(255,255,255,.04)', paddingTop:6 }}>
          {inv.type === 'crypto' ? 'Grafik yükleniyor…' : 'Grafik verisi birikiyor — her gün fiyat kaydedilir'}
        </div>
      )}
    </div>
  );
}

// ── Ana bileşen ─────────────────────────────────
export default function FinanceInvestments({ data, onSave }) {
  const [mode, setMode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  const invs = data.investments || [];

  const handleSave = (inv) => {
    const list = [...invs];
    const idx = list.findIndex(i => i.id === inv.id);
    if (idx >= 0) list[idx] = inv; else list.push(inv);
    onSave({ ...data, investments: list });
    setMode(null); setEditing(null);
  };

  const handleDelete = (id) => {
    if (!confirm('Silinsin mi?')) return;
    onSave({ ...data, investments: invs.filter(i => i.id !== id) });
  };

  const filtered = filter === 'all' ? invs : invs.filter(i => i.type === filter);
  const countByType = INVESTMENT_TYPES.map(t => ({ ...t, count: invs.filter(i => i.type === t.id).length }));
  const totalCost = invs.reduce((s, i) => s + ((+i.buyPrice||0)*(+i.amount||0)), 0);

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="section-title">Yatırım Takibi</h2>
          <p style={{ fontSize:12, color:'rgba(232,237,245,.35)', marginTop:2 }}>
            {invs.length} varlık · Canlı fiyatlar{totalCost>0?` · Maliyet: ${fmtCurrency(totalCost)}`:''}
          </p>
        </div>
        {!mode && !editing && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setMode('ai')} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(58,123,213,.5)', background:'rgba(58,123,213,.1)', color:'#3a7bd5', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="2.2" fill="rgba(58,123,213,.2)" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="12" cy="12" r="0.9" fill="currentColor"/>
                <circle cx="5" cy="5" r="1.9" fill="rgba(58,123,213,.1)" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="19" cy="5" r="1.9" fill="rgba(58,123,213,.1)" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="5" cy="19" r="1.9" fill="rgba(58,123,213,.1)" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="19" cy="19" r="1.9" fill="rgba(58,123,213,.1)" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="12" cy="2.8" r="1.4" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="0.9"/>
                <circle cx="21.2" cy="12" r="1.4" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="0.9"/>
                <circle cx="12" cy="21.2" r="1.4" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="0.9"/>
                <circle cx="2.8" cy="12" r="1.4" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="0.9"/>
                <line x1="12" y1="9.8" x2="6.8" y2="6.8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
                <line x1="12" y1="9.8" x2="17.2" y2="6.8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
                <line x1="12" y1="14.2" x2="6.8" y2="17.2" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
                <line x1="12" y1="14.2" x2="17.2" y2="17.2" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
                <line x1="12" y1="9.8" x2="12" y2="4.2" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25"/>
                <line x1="14.2" y1="12" x2="19.8" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25"/>
                <line x1="12" y1="14.2" x2="12" y2="19.8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25"/>
                <line x1="9.8" y1="12" x2="4.2" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25"/>
                <line x1="6.8" y1="6.8" x2="4.2" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.12"/>
                <line x1="17.2" y1="6.8" x2="19.8" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.12"/>
                <line x1="6.8" y1="17.2" x2="4.2" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.12"/>
                <line x1="17.2" y1="17.2" x2="19.8" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.12"/>
              </svg>
              AI ile Ekle
            </button>
            <button className="btn-primary" onClick={()=>setMode('manual')}>+ Manuel</button>
          </div>
        )}
      </div>

      {mode === 'ai' && <AiAddPanel onAdd={inv=>handleSave(inv)} onClose={()=>setMode(null)}/>}
      {(mode === 'manual' || editing) && <InvForm inv={editing||{}} onSave={handleSave} onCancel={()=>{ setMode(null); setEditing(null); }}/>}

      <div className="tab-bar" style={{ marginBottom:16, flexWrap:'wrap' }}>
        <button className={`tab-btn ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>Tümü ({invs.length})</button>
        {countByType.filter(t=>t.count>0).map(t=>(
          <button key={t.id} className={`tab-btn ${filter===t.id?'active':''}`} onClick={()=>setFilter(t.id)}>{t.label} ({t.count})</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize:24, marginBottom:8, color:'rgba(232,237,245,.1)' }}>◈</div>
          {filter==='all'?(
            <div>
              <div style={{ marginBottom:8 }}>Henüz yatırım eklenmedi</div>
              <div style={{ fontSize:11, color:'rgba(232,237,245,.2)' }}>"AI ile Ekle" → "altın", "apple", "bitcoin 2 adet" gibi yazabilirsin</div>
            </div>
          ):'Bu kategoride yatırım yok'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(inv=>(
            <InvRow key={inv.id} inv={inv} onEdit={inv=>{ setEditing(inv); setMode('manual'); }} onDelete={handleDelete}/>
          ))}
        </div>
      )}

      {invs.length > 0 && (
        <div style={{ marginTop:12, padding:'10px 14px', borderRadius:9, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', fontSize:12, color:'rgba(232,237,245,.35)' }}>
          Kripto: CoinGecko (30 gün) · Hisse/Altın: Anthropic web_search · Her kart üzerindeki ↗ ile grafik açılır
        </div>
      )}
    </div>
  );
}
