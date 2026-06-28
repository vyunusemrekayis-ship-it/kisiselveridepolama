import { useState } from 'react';
import './Cinema.css';

const SALONS = [
  {
    id: 'paribu',
    name: 'Paribu Cineverse Forum Trabzon',
    address: 'Çömlekçi Mah. Devlet Sahil Yolu Cad. Forum AVM, Ortahisar/Trabzon',
    phone: '0 (850) 220 09 67',
    bookingUrl: 'https://www.paribucineverse.com/sinemalar/forum-trabzon',
    searchUrl: 'https://www.paribucineverse.com/sinemalar/forum-trabzon',
  },
  {
    id: 'lara',
    name: 'Trabzon Lara Sinema Salonu',
    address: 'Gazipaşa Mahallesi, Kasımoğlu Çk., Trabzon',
    phone: '0 (462) 321 00 06',
    bookingUrl: 'https://biletinial.com/tr-tr/sinema/trabzon?loc=1181',
    searchUrl: 'https://biletinial.com/tr-tr/sinema/trabzon?loc=1181',
  },
  {
    id: 'cinegalaxy',
    name: 'Cinegalaxy Trabzon',
    address: 'Gülbahar Hatun Mah. İnönü Cad. No:8 Varlıbaş Atapark A.V.M, Trabzon',
    phone: '0 (462) 223 18 81',
    bookingUrl: 'https://www.biletiva.com/place/CINE_GALAXY',
    searchUrl: 'https://www.biletiva.com/place/CINE_GALAXY',
  },
];

async function fetchSalonData(salon, headers, today) {
  let messages = [{
    role: 'user',
    content: `Bugün ${today}. Şu sayfayı aç: ${salon.searchUrl}\n\nBu sinemanın bugünkü TÜM filmlerini ve seans saatlerini listele. Hiçbir filmi atlama.`
  }];

  let rawText = '';
  let iterations = 0;

  while (iterations < 8) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages,
      }),
    });
    const d = await r.json();
    const toolUses = (d.content || []).filter(b => b.type === 'tool_use' || b.type === 'server_tool_use');

    if (toolUses.length === 0 || d.stop_reason === 'end_turn') {
      rawText = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      break;
    }

    messages = [
      ...messages,
      { role: 'assistant', content: d.content },
      { role: 'user', content: toolUses.map(t => ({ type: 'tool_result', tool_use_id: t.id, content: 'Tamamlandı.' })) },
    ];
    iterations++;
  }

  if (!rawText) return [];

  // Ham metni JSON'a dönüştür
  const r2 = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: 'Verilen sinema bilgisini JSON formatına dönüştür. Sadece JSON döndür, başka hiçbir şey yazma.',
      messages: [{
        role: 'user',
        content: `Bu sinema bilgisini JSON formatına dönüştür. TÜM filmleri dahil et:\n\n${rawText}\n\nFormat:\n[{"title":"Film Adı","times":["14:00","16:30"],"format":"2D Türkçe Dublaj","genre":"Aksiyon"}]`
      }],
    }),
  });
  const d2 = await r2.json();
  const jsonText = (d2.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const match = jsonText.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]); } catch { return []; }
}

export default function Cinema() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);

  const fetchAll = async () => {
    if (Object.values(loading).some(Boolean)) return;
    setError(null);
    setFetched(true);

    if (!window.ANTHROPIC_KEY && window.loadApiKey) await window.loadApiKey();
    if (!window.ANTHROPIC_KEY) { setError('API anahtarı bulunamadı.'); return; }

    const today = new Date().toLocaleDateString('tr-TR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': window.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };

    SALONS.forEach(async (salon) => {
      setLoading(l => ({ ...l, [salon.id]: true }));
      try {
        const films = await fetchSalonData(salon, headers, today);
        setResults(r => ({ ...r, [salon.id]: films }));
      } catch {
        setResults(r => ({ ...r, [salon.id]: [] }));
      }
      setLoading(l => ({ ...l, [salon.id]: false }));
    });
  };

  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  const anyLoading = Object.values(loading).some(Boolean);

  return (
    <div className="cinema-page">
      <header className="cinema-header">
        <h1>Trabzon Sinemaları</h1>
        <p className="cinema-updated">{today}</p>
        <button className="fetch-all-btn" onClick={fetchAll} disabled={anyLoading}>
          {anyLoading ? 'Aranıyor...' : fetched ? 'Yenile' : 'Seansları Getir'}
        </button>
        {error && <p className="cinema-error" style={{marginTop:'0.5rem'}}>{error}</p>}
      </header>

      <div className="cinema-grid">
        {SALONS.map(salon => {
          const films = results[salon.id] || [];
          const isLoading = loading[salon.id];
          return (
            <section key={salon.id} className="cinema-card">
              <div className="cinema-card__head">
                <h2>{salon.name}</h2>
                <a
                  className="cinema-address"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.name)}`}
                  target="_blank" rel="noreferrer"
                >
                  📍 {salon.address}
                </a>
                <span className="cinema-phone">{salon.phone}</span>
              </div>

              {isLoading && (
                <div className="cinema-loading">
                  <div className="cinema-spinner" />
                  <span>Aranıyor...</span>
                </div>
              )}

              {!isLoading && fetched && films.length === 0 && (
                <p className="cinema-empty">Bugün için seans bilgisi bulunamadı.</p>
              )}

              {!isLoading && films.length > 0 && (
                <ul className="film-list">
                  {films.map((film, i) => (
                    <li key={i} className="film-row">
                      <div className="film-poster film-poster--placeholder" />
                      <div className="film-info">
                        <h3>{film.title}</h3>
                        {film.genre && <p className="film-genre">{film.genre}</p>}
                        {film.format && <span className="format-badge">{film.format}</span>}
                        {film.times?.length > 0 && (
                          <div className="time-chips">
                            {film.times.map((t, j) => (
                              <a key={j} className="time-chip" href={salon.bookingUrl} target="_blank" rel="noreferrer">{t}</a>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <a className="booking-link" href={salon.bookingUrl} target="_blank" rel="noreferrer">
                Bilet Al →
              </a>
            </section>
          );
        })}
      </div>
    </div>
  );
}
