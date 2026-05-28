import { useState, useRef } from 'react';

const LS_KEY = 'gn_radar_cities';
const CACHE_KEY = 'gn_radar_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 dk

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
function loadCache(cityKey) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entry = all[cityKey];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}
function saveCache(cityKey, data) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    all[cityKey] = { ts: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {}
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
          {/* Kategori etiketleri */}
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

      {/* Özet — her zaman görünür */}
      <div style={{ fontSize:12, color:'rgba(232,237,245,.55)', lineHeight:1.6, paddingLeft:18 }}>
        {item.summary}
      </div>

      {/* Detay — expand */}
      {expanded && item.detail && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.06)', fontSize:12, color:'rgba(232,237,245,.4)', lineHeight:1.6, paddingLeft:18, animation:'radarFade .2s ease' }}>
          {item.detail}
          {item.source && (
            <div style={{ marginTop:8, fontSize:11, color:'rgba(232,237,245,.25)' }}>
              Kaynak: {item.source}
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
        {/* Radar CSS animasyonu */}
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
  const [lastScanned, setLastScanned] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const searchRef = useRef(null);

  const activeCity = cities[activeIdx];

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
    setItems([]); setLastScanned(null);
  };

  const removeCity = (i) => {
    const list = [...cities]; list.splice(i, 1);
    saveCities(list); setCities(list);
    if (activeIdx >= list.length) setActiveIdx(Math.max(0, list.length - 1));
    setItems([]); setLastScanned(null);
  };

  const scan = async () => {
    if (!activeCity) return;
    const cacheKey = activeCity.name;
    const cached = loadCache(cacheKey);
    if (cached) { setItems(cached); setLastScanned(new Date()); setActiveFilter('all'); return; }

    setLoading(true); setError(''); setItems([]);

    // Key henüz yüklenmemişse Firebase'den çek
    if (!window.ANTHROPIC_KEY && window.loadApiKey) {
      await window.loadApiKey();
    }
    const key = window.ANTHROPIC_KEY;
    if (!key) { setError('Anthropic API anahtarı bulunamadı. Firebase config/app dökümanına anthropicKey ekleyin.'); setLoading(false); return; }

    const prompt = `Sen bir Yerel Gelişmeler asistanısın. "${activeCity.name}" şehri için WEB SEARCH aracını kullanarak şu kategorilerde GÜNCEL içerik ara:
- Etkinlikler (konser, tiyatro, sergi, festival, fuar)
- Kültür ve sanat haberleri
- Üniversite etkinlikleri ve duyuruları
- Belediye duyuruları ve projeleri
- Spor müsabakaları
- Sağlık ve sosyal sorumluluk haberleri
- Önemli yerel haberler

Arama sorguları: "${activeCity.name} etkinlik bugün bu hafta", "${activeCity.name} konser tiyatro sergi", "${activeCity.name} belediye duyuru", "${activeCity.name} üniversite etkinlik", "${activeCity.name} haber güncel"

Bulduğun her içerik için JSON array döndür. Kesinlikle sadece JSON döndür, başka hiçbir şey yazma, markdown kullanma.

Format:
[
  {
    "title": "Başlık (kısa, net)",
    "summary": "2-3 cümle özet. Nerede, ne zaman, kim, ücretsiz mi gibi detaylar.",
    "detail": "Daha uzun açıklama (opsiyonel, varsa)",
    "categories": ["etkinlik", "muzik"],
    "source": "Kaynak site adı"
  }
]

Kategori değerleri (birden fazla olabilir): etkinlik, kultur, universite, muzik, spor, belediye, saglik, haber

En az 6, en fazla 20 sonuç döndür. Gerçek ve güncel bilgi kullan. SADECE JSON array döndür, başka HİÇBİR metin yazma, selamlama yapma, açıklama ekleme.`;

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
          max_tokens: 4000,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'API hatası');

      // Web search tool loop — son metin yanıtını bul
      let allMessages = [{ role: 'user', content: prompt }];
      let currentData = data;

      while (currentData.stop_reason === 'tool_use') {
        const toolUses = (currentData.content || []).filter(b => b.type === 'tool_use');
        if (!toolUses.length) break;
        const toolResults = toolUses.map(t => ({
          type: 'tool_result',
          tool_use_id: t.id,
          content: t.type === 'tool_use' ? '{}' : '',
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
            max_tokens: 4000,
            tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
            messages: allMessages,
          }),
        });
        currentData = await nextRes.json();
        if (!nextRes.ok) throw new Error(currentData.error?.message || 'API hatası');
      }

      const textBlocks = (currentData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');

      let parsed = [];
      try {
        const clean = textBlocks.replace(/```json|```/g, '').trim();
        const match = clean.match(/\[[\s\S]*\]/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {
        throw new Error('AI yanıtı ayrıştırılamadı. Konsolu kontrol et.');
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Sonuç bulunamadı. Daha büyük bir şehir deneyin.');
      }

      saveCache(cacheKey, parsed);
      setItems(parsed);
      setLastScanned(new Date());
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

  // Kategorilerde kaç tane var
  const catCounts = {};
  items.forEach(item => {
    const cats = Array.isArray(item.categories) ? item.categories : [item.categories || 'haber'];
    cats.forEach(c => { catCounts[c] = (catCounts[c] || 0) + 1; });
  });

  const fmtTime = (d) => {
    if (!d) return '';
    const h = d.getHours().toString().padStart(2,'0');
    const m = d.getMinutes().toString().padStart(2,'0');
    return `${h}:${m}`;
  };

  return (
    <div style={{ minHeight:'100vh', padding:'20px 24px' }}>
      <style>{pulseStyle}</style>

      {/* Üst bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {/* Şehir sekmeleri */}
        <div style={{ display:'flex', gap:4, flex:1, overflowX:'auto', scrollbarWidth:'none' }}>
          {cities.map((c, i) => (
            <button
              key={i}
              onClick={() => { setActiveIdx(i); setItems([]); setLastScanned(null); setActiveFilter('all'); }}
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
            {lastScanned && (
              <div style={{ fontSize:11, color:'rgba(232,237,245,.3)', marginTop:2 }}>
                Son tarama: {fmtTime(lastScanned)} · {items.length} sonuç
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
                {count > 0 && (
                  <span style={{ fontSize:10, opacity:.7 }}>{count}</span>
                )}
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

      {activeCity && !loading && items.length === 0 && !error && (
        <EmptyState city={activeCity.name} />
      )}

      {loading && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'60px 0' }}>
          <div style={{ position:'relative', width:64, height:64 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(244,114,182,.1)', animation:'radarPulse 1.5s ease infinite' }} />
            <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'2px solid rgba(244,114,182,.2)', animation:'radarPulse 1.5s ease infinite .3s' }} />
            <div style={{ position:'absolute', inset:16, borderRadius:'50%', border:'2px solid rgba(244,114,182,.35)', animation:'radarPulse 1.5s ease infinite .6s' }} />
            <div style={{ position:'absolute', inset:24, borderRadius:'50%', background:'rgba(244,114,182,.4)', animation:'radarPulse 1.5s ease infinite .9s' }} />
          </div>
          <div style={{ fontSize:13, color:'rgba(232,237,245,.4)' }}>{activeCity.name} taranıyor…</div>
          <div style={{ fontSize:11, color:'rgba(232,237,245,.25)' }}>Haber & etkinlik kaynakları aranıyor</div>
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
