import { useState, useRef, useEffect } from 'react';

const LS_KEY = 'gn_radar_cities';

const CATEGORIES = [
  { id: 'all',        label: 'Tümü',         color: '#94a3b8' },
  { id: 'etkinlik',   label: 'Etkinlik',     color: '#f472b6' },
  { id: 'kultur',     label: 'Kültür/Sanat', color: '#a78bfa' },
  { id: 'universite', label: 'Üniversite',   color: '#60a5fa' },
  { id: 'muzik',      label: 'Müzik',        color: '#34d399' },
  { id: 'spor',       label: 'Spor',         color: '#fb923c' },
  { id: 'belediye',   label: 'Belediye',     color: '#38bdf8' },
  { id: 'saglik',     label: 'Sağlık',       color: '#f87171' },
  { id: 'haber',      label: 'Haber',        color: '#facc15' },
];

function getCatMeta(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
}

function loadCities() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveCities(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

// Firebase cache yardımcıları
async function loadCacheFromFirebase(cityKey) {
  if (!window._fbUser || !window._fbDb || !window._fbDoc || !window._fbGetDoc) return null;
  try {
    const { _fbDb: db, _fbDoc: docFn, _fbGetDoc: getDoc } = window;
    const ref = docFn(db, 'users', window._fbUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data();
    const cache = d?.radar_cache;
    if (!cache || !cache[cityKey]) return null;
    return cache[cityKey]; // { items, savedAt }
  } catch (e) {
    console.error('Radar cache yükleme hatası:', e);
    return null;
  }
}

async function saveCacheToFirebase(cityKey, items) {
  if (!window._fbUser || !window._fbDb || !window._fbDoc || !window._fbSetDoc) return;
  try {
    const { _fbDb: db, _fbDoc: docFn, _fbSetDoc: setDoc } = window;
    const ref = docFn(db, 'users', window._fbUser.uid);
    const savedAt = new Date().toISOString();
    await setDoc(ref, {
      radar_cache: {
        [cityKey]: { items, savedAt }
      }
    }, { merge: true });
    return savedAt;
  } catch (e) {
    console.error('Radar cache kayıt hatası:', e);
    return null;
  }
}

// Tarih formatlama: "3 Haziran 2025, 14:32"
function fmtSavedAt(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${dateStr}, ${h}:${m}`;
}

// CSS animasyon pulse için inline style
const pulseStyle = `
@keyframes radarPulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:.5; transform:scale(1.15); }
}
@keyframes radarFade {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes radarSpin {
  to { transform:rotate(360deg); }
}
@keyframes radarSlide {
  from { opacity:0; transform:translateX(-6px); }
  to   { opacity:1; transform:translateX(0); }
}
`;

function Spinner() {
  return (
    <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid rgba(255,255,255,.1)', borderTopColor:'#f472b6', animation:'radarSpin .8s linear infinite', flexShrink:0 }} />
  );
}

function CategoryDot({ id, size = 7 }) {
  const { color } = getCatMeta(id);
  return (
    <span style={{ display:'inline-block', width:size, height:size, borderRadius:'50%', background:color, flexShrink:0 }} />
  );
}

function ItemCard({ item, idx }) {
  const [expanded, setExpanded] = useState(false);
  const cats = Array.isArray(item.categories) ? item.categories : [item.categories || 'haber'];
  const primary = getCatMeta(cats[0]);

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        background:'#141720',
        border:`1px solid ${expanded ? primary.color + '40' : 'rgba(255,255,255,.06)'}`,
        borderRadius:14,
        padding:'14px 16px',
        cursor:'pointer',
        animation:`radarFade .3s ease both`,
        animationDelay:`${Math.min(idx * 40, 400)}ms`,
        transition:'border-color .2s, background .2s',
      }}
    >
      {/* Üst satır */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{ display:'flex', gap:4, paddingTop:3, flexShrink:0 }}>
          {cats.slice(0,2).map(c => <CategoryDot key={c} id={c} />)}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#e8edf5', lineHeight:1.4, marginBottom:4 }}>
            {item.title}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
            {cats.map(c => {
              const m = getCatMeta(c);
              return (
                <span key={c} style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background: m.color + '18', color: m.color, border:`1px solid ${m.color}30` }}>
                  {m.label}
                </span>
              );
            })}
          </div>
        </div>
        <div style={{ color:'rgba(232,237,245,.25)', fontSize:16, flexShrink:0, transition:'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
          ‹
        </div>
      </div>

      {/* Özet */}
      <div style={{ fontSize:12, color:'rgba(232,237,245,.55)', lineHeight:1.6, paddingLeft:18 }}>
        {item.summary}
      </div>

      {/* Detay — expand */}
      {expanded && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.06)', paddingLeft:18, animation:'radarFade .2s ease' }}>
          {item.detail && (
            <div style={{ fontSize:12, color:'rgba(232,237,245,.4)', lineHeight:1.6, marginBottom:10 }}>
              {item.detail}
            </div>
          )}
          {item.source && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <span style={{ fontSize:11, color:'rgba(232,237,245,.25)' }}>Kaynak: {item.source}</span>
              <a
                href={'https://www.google.com/search?q=' + encodeURIComponent(item.title + ' ' + item.source)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:'rgba(232,237,245,.06)', border:'1px solid rgba(232,237,245,.15)', color:'rgba(232,237,245,.6)', textDecoration:'none', transition:'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(232,237,245,.12)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(232,237,245,.06)'}
              >
                Kaynağa Git →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ city }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'rgba(232,237,245,.3)' }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ position:'relative', width:64, height:64, margin:'0 auto' }}>
          <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(244,114,182,.15)', animation:'radarPulse 2s ease infinite' }} />
          <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'2px solid rgba(244,114,182,.25)', animation:'radarPulse 2s ease infinite .4s' }} />
          <div style={{ position:'absolute', inset:16, borderRadius:'50%', border:'2px solid rgba(244,114,182,.4)', animation:'radarPulse 2s ease infinite .8s' }} />
          <div style={{ position:'absolute', inset:24, borderRadius:'50%', background:'rgba(244,114,182,.5)' }} />
        </div>
      </div>
      <div style={{ fontSize:14 }}>{city} için gündem taranıyor…</div>
      <div style={{ fontSize:12, marginTop:4 }}>Şehri seçip "Tara" butonuna bas</div>
    </div>
  );
}

export default function Radar() {
  const [cities, setCities] = useState(loadCities);
  const [activeIdx, setActiveIdx] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [savedAt, setSavedAt] = useState(null); // ISO string
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const searchRef = useRef(null);

  const activeCity = cities[activeIdx];

  // Şehir değiştiğinde Firebase'den cache'i yükle
  useEffect(() => {
    if (!activeCity) { setItems([]); setSavedAt(null); return; }
    setCacheLoading(true);
    setItems([]);
    setSavedAt(null);
    setActiveFilter('all');
    setError('');
    loadCacheFromFirebase(activeCity.name).then(entry => {
      if (entry?.items?.length) {
        setItems(entry.items);
        setSavedAt(entry.savedAt || null);
      }
      setCacheLoading(false);
    });
  }, [activeIdx, activeCity?.name]);

  const suggest = async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=tr`);
      const json = await res.json();
      setSuggestions(json.results || []);
    } catch { setSuggestions([]); }
  };

  const addCity = (r) => {
    const city = {
      name: r.name,
      display: r.name + (r.admin1 ? `, ${r.admin1}` : '') + (r.country_code ? ` · ${r.country_code}` : ''),
      lat: r.latitude,
      lon: r.longitude,
    };
    const list = [...cities.filter(c => !(Math.abs(c.lat - city.lat) < 0.05 && Math.abs(c.lon - city.lon) < 0.05)), city];
    saveCities(list);
    setCities(list);
    setActiveIdx(list.length - 1);
    setShowSearch(false); setSearchQ(''); setSuggestions([]);
    setItems([]); setSavedAt(null);
  };

  const removeCity = (i) => {
    const list = [...cities]; list.splice(i, 1);
    saveCities(list); setCities(list);
    if (activeIdx >= list.length) setActiveIdx(Math.max(0, list.length - 1));
    setItems([]); setSavedAt(null);
  };

  const scan = async () => {
    if (!activeCity) return;

    setLoading(true); setError(''); setItems([]);

    if (!window.ANTHROPIC_KEY && window.loadApiKey) {
      await window.loadApiKey();
    }
    const key = window.ANTHROPIC_KEY;
    if (!key) { setError('Anthropic API anahtarı bulunamadı.'); setLoading(false); return; }

    const today = new Date();
    const todayStr = today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const todayISO = today.toISOString().split('T')[0];
    const cityName = activeCity.name;
    const year = today.getFullYear();
    const weekLater = new Date(today); weekLater.setDate(weekLater.getDate() + 7);
    const weekLaterISO = weekLater.toISOString().split('T')[0];

    const promptLines = [
      'Sen bir Yerel Gelismeler asistanisin. Bugunun tarihi: ' + todayStr + ' (' + todayISO + ').',
      '"' + cityName + '" sehri icin WEB SEARCH kullanarak guncel icerik ara.',
      'KESIN KURALLAR:',
      '1. Sadece ' + todayISO + ' tarihinde veya sonrasinda olan etkinlik/haberler dahil edilecek.',
      '2. ' + weekLaterISO + ' sonrasi baslayan etkinlikler EKLENMEYECEK.',
      '3. Futbol kulubu haberleri (transfer, mac, puan durumu vb.) KESİNLİKLE EKLENMEYECEK.',
      '4. Gecmis tarihli etkinlikler EKLENMEYECEK.',
      'Kural disina cikan sonuclar kesinlikle dahil edilmesin, sonuc az olsa bile.',
      'Arama: "' + cityName + ' etkinlik ' + year + '", "' + cityName + ' konser yaklaşan", "' + cityName + ' haber ' + year + '"',
      'Her sonuc icin "date" alani ekle (YYYY-MM-DD formatinda, bilinmiyorsa null).',
      'SADECE JSON array dondur:',
      '[{"title":"string","summary":"string","date":"YYYY-MM-DD","categories":["etkinlik"],"source":"string"}]',
      'En fazla 15 sonuc. Kategori degerleri: etkinlik, kultur, universite, muzik, spor, belediye, saglik, haber.',
    ];
    const prompt = promptLines.join('\n');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'API hatası');

      let allMessages = [{ role: 'user', content: prompt }];
      let currentData = data;

      while (currentData.stop_reason === 'tool_use') {
        const toolUses = (currentData.content || []).filter(b => b.type === 'tool_use');
        if (!toolUses.length) break;
        const toolResults = toolUses.map(t => ({
          type: 'tool_result',
          tool_use_id: t.id,
          content: '',
        }));
        allMessages = [
          ...allMessages,
          { role: 'assistant', content: currentData.content },
          { role: 'user', content: toolResults },
        ];
        const nextRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
            messages: allMessages,
          }),
        });
        currentData = await nextRes.json();
        if (!nextRes.ok) throw new Error(currentData.error?.message || 'API hatası');
      }

      const textBlocks = (currentData.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');

      if (!textBlocks.trim()) {
        throw new Error('Model metin üretmedi (stop_reason: ' + currentData.stop_reason + '). Konsolu kontrol et.');
      }

      let parsed = [];
      try {
        const clean = textBlocks.split('```json').join('').split('```').join('').trim();
        const match = clean.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('JSON array bulunamadı');
        let jsonStr = match[0];
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          const lastClose = jsonStr.lastIndexOf('},');
          if (lastClose > 0) {
            jsonStr = jsonStr.substring(0, lastClose + 1) + ']';
          } else {
            const lastObj = jsonStr.lastIndexOf('}');
            jsonStr = jsonStr.substring(0, lastObj + 1) + ']';
          }
          parsed = JSON.parse(jsonStr);
        }
      } catch (e) {
        console.error('Radar parse hatası:', e, '\nHam metin:', textBlocks);
        throw new Error('AI yanıtı ayrıştırılamadı. Konsolu kontrol et.');
      }

      if (Array.isArray(parsed)) {
        const clubKeywords = ['trabzonspor', 'beşiktaş', 'galatasaray', 'fenerbahçe', 'transfer', 'fikstür', 'puan durumu', 'süper lig', 'maç sonucu'];
        parsed = parsed.filter(item => {
          const text = ((item.title || '') + ' ' + (item.summary || '')).toLowerCase();
          if (clubKeywords.some(k => text.includes(k))) return false;
          if (item.date) {
            if (item.date < todayISO) return false;
            if (item.date > weekLaterISO) return false;
          }
          return true;
        });
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Sonuç bulunamadı. Daha büyük bir şehir deneyin.');
      }

      // Firebase'e kaydet, savedAt'i al
      const newSavedAt = await saveCacheToFirebase(activeCity.name, parsed);
      setItems(parsed);
      setSavedAt(newSavedAt);
      setActiveFilter('all');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const filtered = activeFilter === 'all'
    ? items
    : items.filter(item => {
        const cats = Array.isArray(item.categories) ? item.categories : [item.categories || 'haber'];
        return cats.includes(activeFilter);
      });

  const catCounts = {};
  items.forEach(item => {
    const cats = Array.isArray(item.categories) ? item.categories : [item.categories || 'haber'];
    cats.forEach(c => { catCounts[c] = (catCounts[c] || 0) + 1; });
  });

  return (
    <div style={{ minHeight:'100vh', padding:'20px 24px' }}>
      <style>{pulseStyle}</style>

      {/* Üst bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4, flex:1, overflowX:'auto', scrollbarWidth:'none' }}>
          {cities.map((c, i) => (
            <button
              key={i}
              onClick={() => { setActiveIdx(i); setActiveFilter('all'); setError(''); }}
              style={{
                padding:'5px 14px', borderRadius:20, fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
                display:'flex', alignItems:'center', gap:6, border:'none', outline:'none',
                border: `1px solid ${i === activeIdx ? 'rgba(244,114,182,.5)' : 'rgba(255,255,255,.08)'}`,
                background: i === activeIdx ? 'rgba(244,114,182,.12)' : 'transparent',
                color: i === activeIdx ? '#e8edf5' : 'rgba(232,237,245,.5)',
              }}
            >
              {c.name}
              <span
                onClick={e => { e.stopPropagation(); removeCity(i); }}
                style={{ opacity:.4, fontSize:13, lineHeight:1, color:'inherit' }}
              >×</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowSearch(s => !s)}
          style={{ padding:'5px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,.08)', background:'transparent', color:'rgba(232,237,245,.5)', fontSize:12, cursor:'pointer', whiteSpace:'nowrap', outline:'none' }}
        >
          + Şehir
        </button>
      </div>

      {/* Şehir arama */}
      {showSearch && (
        <div style={{ background:'#141720', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:14, marginBottom:16, animation:'radarSlide .2s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity=".4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              ref={searchRef}
              autoFocus
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); suggest(e.target.value); }}
              onKeyDown={e => e.key === 'Enter' && suggestions[0] && addCity(suggestions[0])}
              placeholder="Şehir adı..."
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#e8edf5', fontSize:13 }}
            />
          </div>
          {suggestions.map((r, i) => (
            <div
              key={i}
              onClick={() => addCity(r)}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              style={{ padding:'7px 8px', cursor:'pointer', borderRadius:8, fontSize:13, color:'rgba(232,237,245,.7)', transition:'background .1s' }}
            >
              {r.name}{r.admin1 ? `, ${r.admin1}` : ''}{r.country_code ? ` · ${r.country_code}` : ''}
            </div>
          ))}
        </div>
      )}

      {/* Başlık + tara butonu */}
      {activeCity && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:600, color:'#e8edf5', letterSpacing:-.3 }}>
              {activeCity.name}
              <span style={{ fontSize:12, color:'rgba(232,237,245,.3)', fontWeight:400, marginLeft:8 }}>Yerel Gelişmeler</span>
            </div>
            {/* Son tarama bilgisi */}
            {savedAt && !cacheLoading && (
              <div style={{ fontSize:11, color:'rgba(232,237,245,.3)', marginTop:2 }}>
                Son tarama: {fmtSavedAt(savedAt)} · {items.length} sonuç
              </div>
            )}
            {cacheLoading && (
              <div style={{ fontSize:11, color:'rgba(232,237,245,.2)', marginTop:2 }}>
                Yükleniyor…
              </div>
            )}
          </div>
          <button
            onClick={scan}
            disabled={loading}
            style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'8px 18px', borderRadius:20, border:'none', outline:'none', cursor: loading ? 'default' : 'pointer',
              background: loading ? 'rgba(244,114,182,.1)' : 'rgba(244,114,182,.2)',
              color: loading ? 'rgba(244,114,182,.5)' : '#f472b6',
              fontSize:13, fontWeight:500, transition:'all .2s',
            }}
          >
            {loading ? <Spinner /> : (
              <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid currentColor', position:'relative' }}>
                <div style={{ position:'absolute', top:'50%', left:'50%', width:4, height:4, borderRadius:'50%', background:'currentColor', transform:'translate(-50%,-50%)' }} />
              </div>
            )}
            {loading ? 'Taranıyor…' : 'Tara'}
          </button>
        </div>
      )}

      {/* Hata */}
      {error && (
        <div style={{ background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.25)', borderRadius:12, padding:'12px 16px', fontSize:13, color:'#fca5a5', marginBottom:16 }}>
          {error}
        </div>
      )}

      {/* Kategori filtreler */}
      {items.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {CATEGORIES.filter(c => c.id === 'all' || catCounts[c.id]).map(cat => {
            const active = activeFilter === cat.id;
            const count = cat.id === 'all' ? items.length : catCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                style={{
                  padding:'4px 12px', borderRadius:20, fontSize:11, cursor:'pointer', border:'none', outline:'none',
                  border: `1px solid ${active ? cat.color + '60' : 'rgba(255,255,255,.08)'}`,
                  background: active ? cat.color + '18' : 'transparent',
                  color: active ? cat.color : 'rgba(232,237,245,.4)',
                  transition:'all .15s',
                  display:'flex', alignItems:'center', gap:5,
                }}
              >
                {cat.label}
                {count > 0 && <span style={{ fontSize:10, opacity:.7 }}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* İçerik */}
      {!activeCity && !showSearch && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(232,237,245,.3)', fontSize:13 }}>
          Üstten şehir ekle
        </div>
      )}

      {activeCity && !loading && !cacheLoading && items.length === 0 && !error && (
        <EmptyState city={activeCity.name} />
      )}

      {(loading || cacheLoading) && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'60px 0' }}>
          <div style={{ position:'relative', width:64, height:64 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(244,114,182,.1)', animation:'radarPulse 1.5s ease infinite' }} />
            <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'2px solid rgba(244,114,182,.2)', animation:'radarPulse 1.5s ease infinite .3s' }} />
            <div style={{ position:'absolute', inset:16, borderRadius:'50%', border:'2px solid rgba(244,114,182,.35)', animation:'radarPulse 1.5s ease infinite .6s' }} />
            <div style={{ position:'absolute', inset:24, borderRadius:'50%', background:'rgba(244,114,182,.4)', animation:'radarPulse 1.5s ease infinite .9s' }} />
          </div>
          <div style={{ fontSize:13, color:'rgba(232,237,245,.4)' }}>
            {loading ? `${activeCity?.name} taranıyor…` : 'Yükleniyor…'}
          </div>
          {loading && <div style={{ fontSize:11, color:'rgba(232,237,245,.25)' }}>Haber & etkinlik kaynakları aranıyor</div>}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map((item, i) => (
            <ItemCard key={i} item={item} idx={i} />
          ))}
        </div>
      )}

      {items.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', fontSize:13, color:'rgba(232,237,245,.3)' }}>
          Bu kategoride sonuç yok
        </div>
      )}
    </div>
  );
}
