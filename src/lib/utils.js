export const TR_M = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
export const TR_D = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

export function todayStr() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
}

export function fmtDate(ds) {
  if (!ds) return '';
  const [y,m,d] = ds.split('-');
  return `${parseInt(d)} ${TR_M[parseInt(m)-1]} ${y}`;
}

export function fmtDateShort(ds) {
  if (!ds) return '';
  const [,m,d] = ds.split('-');
  return `${parseInt(d)} ${TR_M[parseInt(m)-1]}`;
}

export function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

export function moodColor(m) {
  return { 'Harika':'#237F52','İyi':'#3d7a5a','Normal':'#b07a40','Kötü':'#b05a30','Berbat':'#c0392b' }[m] || '#888';
}

export function swFmt(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const csec = Math.floor((ms % 1000) / 10);
  if (h > 0) return { main: `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`, sub: '' };
  return { main: `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`, sub: `.${String(csec).padStart(2,'0')}` };
}

export const OMDB_KEY = '97eb66bc';

export const SP = [
  {k:'01-01',n:'Yılbaşı',t:'h'},{k:'04-23',n:'Ulusal Egemenlik ve Çocuk Bayramı',t:'h'},
  {k:'05-01',n:'Emek ve Dayanışma Bayramı',t:'h'},{k:'05-19',n:"Atatürk'ü Anma, Gençlik ve Spor Bayramı",t:'h'},
  {k:'07-15',n:'Demokrasi ve Millî Birlik Günü',t:'h'},{k:'08-30',n:'Zafer Bayramı',t:'h'},{k:'10-29',n:'Cumhuriyet Bayramı',t:'h'},
  {k:'03-20',n:'Ramazan Bayramı 1.Gün',t:'r',y:[2026]},{k:'03-21',n:'Ramazan Bayramı 2.Gün',t:'r',y:[2026]},{k:'03-22',n:'Ramazan Bayramı 3.Gün',t:'r',y:[2026]},
  {k:'05-27',n:'Kurban Bayramı 1.Gün',t:'r',y:[2026]},{k:'05-28',n:'Kurban Bayramı 2.Gün',t:'r',y:[2026]},{k:'05-29',n:'Kurban Bayramı 3.Gün',t:'r',y:[2026]},{k:'05-30',n:'Kurban Bayramı 4.Gün',t:'r',y:[2026]},
  {k:'02-14',n:'Sevgililer Günü',t:'i'},{k:'03-08',n:'Dünya Kadınlar Günü',t:'i'},{k:'04-22',n:'Dünya Günü',t:'i'},
  {k:'06-01',n:'Dünya Çocuklar Günü',t:'i'},{k:'10-05',n:'Dünya Öğretmenler Günü',t:'i'},{k:'10-31',n:'Cadılar Bayramı',t:'i'},{k:'12-25',n:'Noel',t:'i'},{k:'12-31',n:'Yılbaşı Gecesi',t:'i'},
];

export const CAL_LABELS = { h:'Resmi Tatil', r:'Dini Bayram', i:'Özel Gün', b:'Doğum Günü', a:'Yıl Dönümü', custom:'Kişisel' };

export function getSpecialDays(ds, customDays = []) {
  const [y, m, d] = ds.split('-');
  const mk = `${m}-${d}`;
  const yr = parseInt(y);
  const result = [];
  SP.forEach(s => {
    if (s.k === mk) {
      if (!s.y || s.y.includes(yr)) result.push(s);
    }
  });
  customDays.forEach(s => {
    if (s.k === mk) result.push(s);
  });
  return result;
}

export function goalDateRange(g) {
  const pk = g.periodKey || todayStr();
  const start = new Date(pk + 'T00:00:00');
  const end = new Date(start);
  if (g.period === 'weekly') end.setDate(end.getDate() + 6);
  else if (g.period === 'monthly') { end.setMonth(end.getMonth()+1); end.setDate(end.getDate()-1); }
  else { end.setFullYear(end.getFullYear()+1); end.setDate(end.getDate()-1); }
  return { start, end };
}

export function isGoalActive(g) {
  const { start, end } = goalDateRange(g);
  const td = new Date(todayStr() + 'T00:00:00');
  return td >= start && td <= end;
}

export function calcChainStreak(ch) {
  const doneSet = new Set(ch.done || []);
  const startMs = new Date(ch.start + 'T00:00:00').getTime();
  const todayIdx = Math.floor((Date.now() - startMs) / 86400000);
  let startIdx = -1;
  for (let d = 0; d <= 1; d++) { if (doneSet.has(todayIdx - d)) { startIdx = todayIdx - d; break; } }
  if (startIdx < 0) {
    const maxDone = Math.max(...(ch.done || [-1]));
    if (maxDone >= 0) startIdx = maxDone;
  }
  let streak = 0;
  if (startIdx >= 0) { let i = startIdx; while (i >= 0 && doneSet.has(i)) { streak++; i--; } }
  return { streak, todayIdx, doneSet };
}

const TMDB_KEY = '02792d3c2e983660a6da5ad2a30c3ed3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

// ── FİLM POSTERİ — TMDB (Films.jsx ve Home.jsx ortak kullanır) ───────────
export const posterCache = {};
const posterInFlight = {};

export function fetchPoster(name) {
  if (name in posterCache) return Promise.resolve(posterCache[name]);
  if (posterInFlight[name]) return posterInFlight[name];
  const p = fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(name)}&api_key=${TMDB_KEY}`)
    .then(r => r.json())
    .then(data => {
      const path = data.results?.[0]?.poster_path;
      const url = path ? `${TMDB_IMG}${path}` : null;
      posterCache[name] = url;
      delete posterInFlight[name];
      return url;
    })
    .catch(() => { posterCache[name] = null; delete posterInFlight[name]; return null; });
  posterInFlight[name] = p;
  return p;
}

// ── DİZİ POSTERİ — TMDB (Series.jsx ve Home.jsx ortak kullanır) ──────────
export const seriesPosterCache = {};
const seriesPosterInFlight = {};

export function fetchSeriesPoster(name) {
  if (name in seriesPosterCache) return Promise.resolve(seriesPosterCache[name]);
  if (seriesPosterInFlight[name]) return seriesPosterInFlight[name];
  const p = fetch(`https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(name)}&api_key=${TMDB_KEY}`)
    .then(r => r.json())
    .then(data => {
      const path = data.results?.[0]?.poster_path;
      const url = path ? `${TMDB_IMG}${path}` : null;
      seriesPosterCache[name] = url;
      delete seriesPosterInFlight[name];
      return url;
    })
    .catch(() => { seriesPosterCache[name] = null; delete seriesPosterInFlight[name]; return null; });
  seriesPosterInFlight[name] = p;
  return p;
}

// ── KİTAP KAPAĞI + SAYFA SAYISI — Google Books (Books.jsx ve Home.jsx ortak kullanır) ───
export const bookInfoCache = {};
const bookInfoInFlight = {};

function normalizeTr(s) {
  return s
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

const GOOGLE_BOOKS_KEY = 'AIzaSyDEwMWaEbg8J6OAzfM-IwIRyhCqg2HCYzU';

// Google'ın döndürdüğü küçük thumbnail'ı yüksek çözünürlüğe çeker (zoom değerini artırır, kıvrım efektini kaldırır)
function upscaleCover(url) {
  if (!url) return null;
  // zoom=3 bazı eski taramalarda desteklenmiyor ve görseli kırıyor; zoom=2 daha güvenli ve yine de zoom=1'den net
  return url.replace('http://', 'https://').replace(/zoom=\d/, 'zoom=2').replace(/&edge=curl/, '');
}

// Bir sonuç listesinden hem kapağı hem sayfa sayısını çıkarır
function pickInfo(data) {
  const items = data.items || [];
  const withCover = items.find(it => it.volumeInfo?.imageLinks?.thumbnail || it.volumeInfo?.imageLinks?.smallThumbnail);
  const item = withCover || items[0];
  if (!item) return { cover: null, pages: null };
  const img = item.volumeInfo?.imageLinks;
  const thumb = img?.thumbnail || img?.smallThumbnail;
  return { cover: upscaleCover(thumb), pages: item.volumeInfo?.pageCount || null };
}

// Aynı anda çok fazla Google Books isteği gönderilirse Google bazen 503 döndürüyor —
// istekleri sıraya koyup aralarına gecikme bırakıyoruz, ayrıca 503 gelirse otomatik tekrar deniyoruz.
// (Google Books API'de saniyelik gizli bir hız sınırı var, günlük kotayla ilgisi yok — bu yüzden
// bekleme süreleri kısa dosya boyutuna göre değil, bu limite göre ayarlanmış durumda.)
let _googleBooksQueue = Promise.resolve();
function queuedGoogleFetch(url) {
  const run = async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(url);
      if (res.status === 503 && attempt < 3) {
        await new Promise(r => setTimeout(r, 2500 * (attempt + 1)));
        continue;
      }
      return res.json();
    }
  };
  const result = _googleBooksQueue.then(run, run);
  _googleBooksQueue = result.catch(() => {}).then(() => new Promise(res => setTimeout(res, 2000)));
  return result;
}

export function fetchBookInfo(name, author) {
  const key = name + '|' + (author || '');
  if (key in bookInfoCache) return Promise.resolve(bookInfoCache[key]);
  if (bookInfoInFlight[key]) return bookInfoInFlight[key];

  const searchGoogle = (q) => queuedGoogleFetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&key=${GOOGLE_BOOKS_KEY}`);

  // Google'da hiç kapak yoksa son çare: Open Library, ISBN üzerinden (sadece kapak, sayfa sayısı bu yoldan gelmez).
  // Open Library kapağı olmayan ISBN'lerde çok küçük bir placeholder görsel döndürür,
  // bunu content-length'e bakarak eliyoruz.
  const tryOpenLibrary = async (title) => {
    try {
      const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=3`);
      const data = await res.json();
      for (const doc of data.docs || []) {
        const isbn = doc.isbn?.[0];
        if (!isbn) continue;
        const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
        const len = parseInt(head?.headers?.get('content-length') || '0');
        if (head?.ok && len > 2000) return { cover: url, pages: doc.number_of_pages_median || null };
      }
    } catch {}
    return { cover: null, pages: null };
  };

  const p = (async () => {
    try {
      let info = { cover: null, pages: null };
      if (author) {
        info = pickInfo(await searchGoogle(`intitle:${encodeURIComponent(name)}+inauthor:${encodeURIComponent(author)}`));
      }
      if (!info.cover) {
        const info2 = pickInfo(await searchGoogle(`intitle:${encodeURIComponent(name)}`));
        info = { cover: info2.cover || info.cover, pages: info.pages || info2.pages };
      }
      if (!info.cover) {
        const norm = normalizeTr(name);
        if (norm !== name) {
          const info3 = pickInfo(await searchGoogle(`intitle:${encodeURIComponent(norm)}`));
          info = { cover: info3.cover || info.cover, pages: info.pages || info3.pages };
        }
      }
      if (!info.cover) {
        const info4 = await tryOpenLibrary(name);
        info = { cover: info4.cover || info.cover, pages: info.pages || info4.pages };
      }
      bookInfoCache[key] = info;
      return info;
    } catch {
      // Geçici hata (503, ağ vb.) — kalıcı önbelleğe YAZMIYORUZ ki sonraki mount tekrar denesin
      return { cover: null, pages: null };
    } finally {
      delete bookInfoInFlight[key];
    }
  })();
  bookInfoInFlight[key] = p;
  return p;
}

// ── SIRT RENGİ — kapaktan otomatik baskın 2 renk + oranını çıkarır (Home.jsx kullanır) ───
export const spineColorCache = {};
const spineColorInFlight = {};

function relLuminance(r, g, b) {
  const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');

// Kapak görseli CORS izni vermiyorsa canvas "tainted" olur ve getImageData hata fırlatır —
// bu durumda null dönüp Home.jsx'teki sabit renkli sırta düşülür, sayfa kırılmaz.
export function extractSpineColors(coverUrl) {
  if (!coverUrl) return Promise.resolve(null);
  if (coverUrl in spineColorCache) return Promise.resolve(spineColorCache[coverUrl]);
  if (spineColorInFlight[coverUrl]) return spineColorInFlight[coverUrl];

  const p = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = 24, H = 32;
        const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
        const targetRatio = W / H;
        const srcRatio = iw / ih;
        let sx, sy, sw, sh;
        if (srcRatio > targetRatio) { sh = ih; sw = ih * targetRatio; sx = (iw - sw) / 2; sy = 0; }
        else { sw = iw; sh = iw / targetRatio; sx = 0; sy = (ih - sh) / 2; }
        // Kenarlardaki olası ince beyaz boşluğu/çerçeveyi de dışarıda bırakmak için %8 içeri kırp
        const insetX = sw * 0.08, insetY = sh * 0.08;
        sx += insetX; sy += insetY; sw -= insetX * 2; sh -= insetY * 2;

        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;

        // Renkleri 32'lik kovalara yuvarlayıp frekans sayıyoruz
        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue; // saydam pikselleri atla
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i + 1] / 32) * 32;
          const b = Math.round(data[i + 2] / 32) * 32;
          const key = `${r},${g},${b}`;
          buckets.set(key, (buckets.get(key) || 0) + 1);
        }
        const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) { spineColorCache[coverUrl] = null; resolve(null); return; }

        // Saf beyaz/siyah genelde kapaktaki başlık yazısıdır, arka plan rengi değil — mümkünse hariç tut
        const isTextLike = (r, g, b) => (r > 245 && g > 245 && b > 245) || (r < 12 && g < 12 && b < 12);
        let candidates = sorted.filter(([k]) => { const [r, g, b] = k.split(',').map(Number); return !isTextLike(r, g, b); });
        if (candidates.length < 2) candidates = sorted; // gerçekten düz siyah/beyaz kapaksa filtreleme devre dışı

        const [k1, c1] = candidates[0];
        const [r1, g1, b1] = k1.split(',').map(Number);
        let k2 = null, c2 = 0;
        for (let i = 1; i < candidates.length; i++) {
          const [kk, cc] = candidates[i];
          const [r2, g2, b2] = kk.split(',').map(Number);
          const dist = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
          if (dist > 60) { k2 = kk; c2 = cc; break; } // ikinci renk yeterince farklı olmalı
        }
        const [r2, g2, b2] = k2 ? k2.split(',').map(Number) : [r1, g1, b1];

        const total = c1 + c2 || 1;
        let ratioA = Math.round((c1 / total) * 100);
        ratioA = Math.min(80, Math.max(20, ratioA)); // aşırı ince/kalın bant olmasın

        const colorA = toHex(r1, g1, b1), colorB = toHex(r2, g2, b2);
        const result = {
          colorA, colorB, ratioA,
          textOnA: relLuminance(r1, g1, b1) > 0.45 ? '#20242c' : '#f2ede2',
          textOnB: relLuminance(r2, g2, b2) > 0.45 ? '#20242c' : '#f2ede2',
        };
        spineColorCache[coverUrl] = result;
        resolve(result);
      } catch {
        spineColorCache[coverUrl] = null;
        resolve(null);
      } finally {
        delete spineColorInFlight[coverUrl];
      }
    };
    img.onerror = () => {
      spineColorCache[coverUrl] = null;
      delete spineColorInFlight[coverUrl];
      resolve(null);
    };
    // Google'ın kapak sunucusu CORS izni vermiyor; wsrv.nl görseli CORS başlığıyla yeniden sunuyor
    img.src = `https://wsrv.nl/?url=${encodeURIComponent(coverUrl)}&w=48&h=64&fit=cover`;
  });
  spineColorInFlight[coverUrl] = p;
  return p;
}

// Google bazı kitaplar için (bölge/lisans kısıtı vb.) 200 döner ama içeriği "image not available"
// yazan sahte bir görseldir — onError bunu yakalayamaz çünkü yükleme teknik olarak başarılıdır.
// Görsel neredeyse tamamen beyazsa (gerçek kapaklarda nadir) sahte kabul ediyoruz.
export function isCoverLikelyBlank(coverUrl) {
  if (!coverUrl) return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = 16, H = 16;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;
        let lightCount = 0, total = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          total++;
          if (data[i] > 205 && data[i + 1] > 205 && data[i + 2] > 205) lightCount++;
        }
        resolve(total > 0 && (lightCount / total) > 0.88);
      } catch {
        resolve(false); // emin değilsek kapağı geçerli say
      }
    };
    img.onerror = () => resolve(false); // gerçek ağ hatası zaten onError ile ayrı ele alınıyor
    img.src = `https://wsrv.nl/?url=${encodeURIComponent(coverUrl)}&w=16&h=16&fit=cover`;
  });
}

// ── HAVA DURUMU KODU → İKON/RENK (Weather.jsx ile aynı WMO eşlemesi) ─────
// Home.jsx'teki Hava Durumu widget'ı bu basitleştirilmiş eşlemeyi kullanır.
export function wxc(code, isDay) {
  const d = [
    { c:[0],           t:'Açık',           bg:'sunny'   },
    { c:[1,2],         t:'Az Bulutlu',      bg:'partly'  },
    { c:[3],           t:'Çok Bulutlu',     bg:'cloudy'  },
    { c:[45,48],       t:'Sisli',           bg:'fog'     },
    { c:[51,53,55],    t:'Çiseleme',        bg:'drizzle' },
    { c:[61,63,65],    t:'Yağmurlu',        bg:'rain'    },
    { c:[71,73,75,77], t:'Karlı',           bg:'snow'    },
    { c:[80,81,82],    t:'Sağanak',         bg:'shower'  },
    { c:[85,86],       t:'Yoğun Kar',       bg:'heavysnow'},
    { c:[95],          t:'Fırtına',         bg:'storm'   },
    { c:[96,99],       t:'Dolu',            bg:'hail'    },
  ];
  const m = d.find(x => x.c.includes(code)) || d[0];
  const night = !isDay;
  if (night && m.bg === 'sunny')  return { ...m, bg:'night',        t:'Açık Gece' };
  if (night && m.bg === 'partly') return { ...m, bg:'night-partly', t:'Parçalı Bulutlu Gece' };
  if (night && m.bg === 'rain')   return { ...m, bg:'night-rain',   t:'Gece Yağmuru' };
  if (night && m.bg === 'shower') return { ...m, bg:'night-shower', t:'Gece Sağanağı' };
  if (night && m.bg === 'drizzle')return { ...m, bg:'night-drizzle',t:'Gece Çiselemesi' };
  if (night && m.bg === 'snow')   return { ...m, bg:'night-snow',   t:'Gece Karı' };
  if (night && m.bg === 'cloudy') return { ...m, bg:'night-cloudy', t:'Bulutlu Gece' };
  if (night && m.bg === 'storm')  return { ...m, bg:'night-storm',  t:'Gece Fırtınası' };
  if (night && m.bg === 'hail')   return { ...m, bg:'night-hail',   t:'Gece Dolulu Fırtına' };
  return m;
}

// ── HAVA DURUMU UYARI SİSTEMİ (Weather.jsx ve Home.jsx widget'ı ortak kullanır) ──
// data: Open-Meteo /v1/forecast yanıtı + { air, quake } eklenmiş hali (Weather.jsx'teki "data" state'i ile aynı şekil)
export function buildWeatherAlerts(data) {
  if (!data?.hourly || !data?.daily) return [];
  const alerts = [];
  const h = data.hourly;
  const daily = data.daily;
  const now = new Date().getHours();
  const nowMin = new Date().getMinutes();
  const todayStr = daily.time[0];
  const todayIdx = h.time.findIndex(t => t.startsWith(todayStr));
  if (todayIdx < 0) return [];
  const hh = s => String(s).padStart(2,'0');
  const fmt = hour => `${hh(hour)}:00`;

  const allHours = h.time
    .map((t, i) => ({
      t, i,
      hour: new Date(t).getHours(),
      dayStr: t.split('T')[0],
      temp: (h.temperature_2m||[])[i]??0,
      code: (h.weather_code||[])[i]??0,
      wind: (h.wind_speed_10m||[])[i]??0,
      gust: (h.wind_gusts_10m||[])[i]??0,
      precip: (h.precipitation||[])[i]??0,
      rain: (h.rain||[])[i]??0,
      snow: (h.snowfall||[])[i]??0,
      vis: (h.visibility||[])[i]??10000,
      uv: (h.uv_index||[])[i]??0,
      rainProb: (h.precipitation_probability||[])[i]??0,
      isDay: (h.is_day||[])[i]??1,
    }))
    .filter((x,i) => i >= todayIdx && i < todayIdx + 48);

  const futureHours = allHours.filter(x => x.dayStr > todayStr || x.hour >= now);
  const next24 = futureHours.slice(0, 24);

  const isRainCode  = c => (c >= 51 && c <= 67) || (c >= 80 && c <= 82);
  const isSnowCode  = c => (c >= 71 && c <= 77) || c === 85 || c === 86;
  const isFogCode   = c => c === 45 || c === 48;
  const isStormCode = c => c >= 95;
  const currentCode = data.current?.weather_code ?? 0;
  const currentTemp = data.current?.temperature_2m ?? 0;
  const currentWind = data.current?.wind_speed_10m ?? 0;
  const currentVis  = data.current?.visibility ?? 10000;

  // 1. YAĞMUR PERİYOTLARI
  const rainPeriods = [];
  let inR = false, rStart = null, rDur = 0;
  next24.forEach(x => {
    const wet = isRainCode(x.code) || x.precip > 0.05;
    if (wet && !inR)      { inR = true;  rStart = x.hour; rDur = 1; }
    else if (wet && inR)  { rDur++; }
    else if (!wet && inR) { inR = false; rainPeriods.push({ start:rStart, dur:rDur, end:x.hour }); rDur = 0; }
  });
  if (inR) rainPeriods.push({ start:rStart, dur:rDur, end:null });

  const fmtRange = (startHour, endHour) => {
    if (endHour == null) return `${fmt(startHour)}'den itibaren`;
    return `${fmt(startHour)} – ${fmt(endHour)}`;
  };

  const currentPrecip = data.current?.precipitation ?? 0;
  const currentlyRaining = isRainCode(currentCode) || currentPrecip > 0.05;

  const precipIntensity = currentPrecip >= 10 ? 'çok kuvvetli'
    : currentPrecip >= 5  ? 'kuvvetli'
    : currentPrecip >= 2  ? 'orta şiddetli'
    : currentPrecip >  0  ? 'hafif'
    : null;
  const precipStr = precipIntensity && currentPrecip > 0
    ? ` (${precipIntensity}, ${currentPrecip.toFixed(1)} mm/sa)`
    : '';

  if (currentlyRaining) {
    const stopH = next24.find(x => !isRainCode(x.code) && x.precip <= 0.05);
    if (stopH) {
      const lvl = currentPrecip >= 5 ? 'warning' : (stopH.hour - now >= 6 ? 'warning' : 'info');
      alerts.push({ level:lvl, icon:'🌦', title:`Yağmur ${fmt(stopH.hour)}'de duruyor`, detail:`Şu an yağmur var${precipStr}. ${fmt(stopH.hour)}'e kadar sürecek.` });
    } else {
      const p = rainPeriods[0];
      const lvl = currentPrecip >= 5 ? 'danger' : 'warning';
      if (p) alerts.push({ level:lvl, icon:'🌧', title:'Uzun süreli yağmur', detail:`${fmt(p.start)}'den itibaren kesintisiz yağmur${precipStr}.` });
    }
  } else {
    rainPeriods.forEach(p => {
      const minsUntil = (p.start - now) * 60 - nowMin;
      if (minsUntil <= 0) return;
      const startStr = minsUntil < 60
        ? `${minsUntil} dakika içinde (${fmt(p.start)})`
        : `${fmt(p.start)}'de`;
      const lvl = p.dur >= 6 ? 'warning' : 'info';
      const endStr = p.end != null ? ` – ${fmt(p.end)}'de duruyor` : ' – bitiş belirsiz';
      alerts.push({ level:lvl, icon:'🌧', title:`Yağmur ${startStr} başlıyor`, detail:`${fmtRange(p.start, p.end)}${endStr}.` });
    });
  }

  // 2. KUVVETLİ YAĞIŞ / SEL
  const totalPrecip3h = next24.slice(0, 3).reduce((s, x) => s + x.precip, 0);
  if (totalPrecip3h >= 30) {
    alerts.push({ level:'danger', icon:'🌊', title:'Sel / taşkın riski', detail:`Önümüzdeki 3 saatte ${totalPrecip3h.toFixed(0)} mm yağış bekleniyor. Dere yatakları ve alçak bölgelerden uzak durun.` });
  } else if (totalPrecip3h >= 15) {
    alerts.push({ level:'warning', icon:'💧', title:'Yoğun yağış / taşkın olasılığı', detail:`Önümüzdeki 3 saatte ${totalPrecip3h.toFixed(0)} mm yağış bekleniyor.` });
  }
  const heavyH = next24.find(x => x.precip >= 10);
  const modH   = next24.find(x => x.precip >= 5 && x.precip < 10);
  const lightH = next24.find(x => x.precip >= 2 && x.precip < 5);
  if (heavyH) alerts.push({ level:'danger',  icon:'⛈', title:'Çok kuvvetli yağış', detail:`${fmt(heavyH.hour)}'da saatte ${heavyH.precip.toFixed(1)} mm yağış bekleniyor.` });
  else if (modH)  alerts.push({ level:'warning', icon:'🌧', title:'Kuvvetli yağış', detail:`${fmt(modH.hour)}'da saatte ${modH.precip.toFixed(1)} mm yağış bekleniyor.` });
  else if (lightH) alerts.push({ level:'info',  icon:'🌦', title:'Bastıran yağış', detail:`${fmt(lightH.hour)}'da saatte ${lightH.precip.toFixed(1)} mm yağış bekleniyor.` });

  // 3. GÖK GÜRÜLTÜLÜ SAĞANAK / YILDIRIM
  const stormH = next24.find(x => isStormCode(x.code));
  if (stormH) {
    const dolu = stormH.code >= 96;
    alerts.push({ level:'danger', icon:'⚡', title: dolu ? 'Dolu / yıldırımlı fırtına' : 'Gök gürültülü sağanak', detail:`${fmt(stormH.hour)}'da ${dolu ? 'dolu eşlikli ' : ''}yıldırımlı fırtına bekleniyor. Açık alanda bulunmayın.` });
  }

  // 4. RÜZGAR / FIRTINA
  const gustH    = next24.find(x => x.gust >= 80);
  const stormW   = next24.find(x => x.wind >= 62);
  const strongW  = next24.find(x => x.wind >= 40 && x.wind < 62);
  const modW     = next24.find(x => x.wind >= 28 && x.wind < 40);
  if (gustH)   alerts.push({ level:'danger',  icon:'🌪', title:'Tayfun seviyesi rüzgar', detail:`${fmt(gustH.hour)}'da ${Math.round(gustH.gust)} km/s ani esinti bekleniyor. Ciddi hasar riski.` });
  else if (stormW)  alerts.push({ level:'danger',  icon:'💨', title:'Fırtına seviyesi rüzgar', detail:`${fmt(stormW.hour)}'da ${Math.round(stormW.wind)} km/s rüzgar bekleniyor.` });
  else if (strongW) alerts.push({ level:'warning', icon:'💨', title:'Kuvvetli rüzgar', detail:`${fmt(strongW.hour)}'da ${Math.round(strongW.wind)} km/s rüzgar bekleniyor.` });
  else if (modW)    alerts.push({ level:'info',    icon:'💨', title:'Orta şiddetli rüzgar', detail:`${fmt(modW.hour)}'da ${Math.round(modW.wind)} km/s rüzgar bekleniyor.` });

  // 5. ANİ SICAKLIK DEĞİŞİMLERİ
  for (let i = 0; i < next24.length - 3; i++) {
    const diff = next24[i+3].temp - next24[i].temp;
    if (diff <= -8) {
      alerts.push({ level:'warning', icon:'🌡', title:'Ani sıcaklık düşüşü', detail:`${fmt(next24[i].hour)} → ${fmt(next24[i+3].hour)}: ${Math.round(next24[i].temp)}° → ${Math.round(next24[i+3].temp)}° (${Math.abs(diff).toFixed(0)}° düşüş).` });
      break;
    }
    if (diff >= 8) {
      alerts.push({ level:'info', icon:'🌡', title:'Ani sıcaklık artışı', detail:`${fmt(next24[i].hour)} → ${fmt(next24[i+3].hour)}: ${Math.round(next24[i].temp)}° → ${Math.round(next24[i+3].temp)}° (${diff.toFixed(0)}° artış).` });
      break;
    }
  }

  // 6. KAR YAĞIŞI
  const snowH2 = next24.find(x => isSnowCode(x.code) || x.snow > 0.1);
  if (snowH2) {
    const heavy = snowH2.snow >= 2 || snowH2.code >= 73;
    alerts.push({ level: heavy ? 'warning' : 'info', icon:'❄️', title: heavy ? 'Yoğun kar yağışı' : 'Kar yağışı bekleniyor', detail:`${fmt(snowH2.hour)}'da kar yağışı başlayacak.${heavy ? ' Trafikte dikkatli olun.' : ''}` });
  }

  // 7. BUZLANMA / DON
  const iceH = next24.find(x => x.temp <= 2 && (isRainCode(x.code) || x.precip > 0));
  const donH = next24.find(x => x.temp <= 0);
  if (iceH)      alerts.push({ level:'danger',  icon:'🧊', title:'Buzlanma riski', detail:`${fmt(iceH.hour)}'da ${Math.round(iceH.temp)}°C'de yağış bekleniyor. Yollar kayganlaşabilir.` });
  else if (donH) alerts.push({ level:'warning', icon:'🥶', title:'Don riski', detail:`${fmt(donH.hour)}'da sıcaklık ${Math.round(donH.temp)}°C'ye düşüyor.` });

  // 8. SİS / DÜŞÜK GÖRÜŞ
  const fogH2 = next24.find(x => isFogCode(x.code) || x.vis < 1000);
  if (fogH2 || currentVis < 1000) {
    const visM = fogH2 ? fogH2.vis : currentVis;
    const visStr = visM < 200 ? `${visM} m` : `${(visM/1000).toFixed(1)} km`;
    alerts.push({ level:'warning', icon:'🌫', title:'Sis / düşük görüş', detail: currentVis < 1000 ? `Şu an görüş ${visStr}. Araç kullanırken dikkatli olun.` : `${fmt(fogH2.hour)}'da sis bekleniyor, görüş ${visStr}'ye düşebilir.` });
  }

  // 9. AŞIRI SICAK
  const extremeH = next24.find(x => x.temp >= 40);
  const hotH2    = next24.find(x => x.temp >= 35 && x.temp < 40);
  if (extremeH)    alerts.push({ level:'danger',  icon:'🔥', title:'Aşırı sıcak hava', detail:`${fmt(extremeH.hour)}'da ${Math.round(extremeH.temp)}°C bekleniyor. Güneş çarpması riski çok yüksek.` });
  else if (hotH2)  alerts.push({ level:'warning', icon:'☀️', title:'Yüksek sıcaklık', detail:`${fmt(hotH2.hour)}'da ${Math.round(hotH2.temp)}°C bekleniyor. Bol su için.` });

  // 10. YÜKSEK UV
  const uvExtreme = next24.find(x => x.uv >= 8);
  const uvHigh    = next24.find(x => x.uv >= 6 && x.uv < 8);
  if (uvExtreme)    alerts.push({ level:'warning', icon:'🕶', title:'Çok yüksek UV', detail:`${fmt(uvExtreme.hour)}'da UV indeksi ${uvExtreme.uv.toFixed(0)} bekleniyor. Güneş kremi şart.` });
  else if (uvHigh)  alerts.push({ level:'info',    icon:'🕶', title:'Yüksek UV', detail:`${fmt(uvHigh.hour)}'da UV indeksi ${uvHigh.uv.toFixed(0)} bekleniyor.` });

  // 11. HIZLI HAVA BOZULMASI
  const isClear = currentCode <= 3;
  if (isClear) {
    const det = next24.slice(1, 5).find(x => isRainCode(x.code) || isStormCode(x.code));
    if (det) {
      const detInfo = wxc(det.code, det.isDay);
      alerts.push({ level:'warning', icon:'🌦', title:'Hava hızla bozuluyor', detail:`Şu an: ${Math.round(currentTemp)}°, ${Math.round(currentWind)} km/s → ${fmt(det.hour)}'da ${detInfo.t} bekleniyor.` });
    }
  }

  // 12. HİSSEDİLEN SICAKLIK FARKI
  const feelsDiff = Math.round(currentTemp) - Math.round(data.current?.apparent_temperature ?? currentTemp);
  if (feelsDiff >= 8) {
    alerts.push({ level:'warning', icon:'🌡', title:'Gerçekten daha soğuk hissettiriyor', detail:`Hava ${Math.round(currentTemp)}° ama hissedilen ${Math.round(data.current.apparent_temperature)}° (${feelsDiff}° fark). Rüzgar şilti gerekebilir.` });
  } else if (feelsDiff <= -6) {
    alerts.push({ level:'info', icon:'🌡', title:'Hissedilen sıcaklık yüksek', detail:`Hava ${Math.round(currentTemp)}° ama hissedilen ${Math.round(data.current.apparent_temperature)}°. Nem etkisi yüksek.` });
  }

  // 13. NEM + SICAKLIK (Heat Index — bunaltıcı his)
  const curRH = data.current?.relative_humidity_2m ?? 0;
  if (currentTemp >= 27 && curRH >= 70) {
    const hi = -8.78469475556 + 1.61139411*currentTemp + 2.33854883889*curRH
      - 0.14611605*currentTemp*curRH - 0.012308094*currentTemp*currentTemp
      - 0.0164248277778*curRH*curRH + 0.002211732*currentTemp*currentTemp*curRH
      + 0.00072546*currentTemp*curRH*curRH - 0.000003582*currentTemp*currentTemp*curRH*curRH;
    if (hi >= 40) alerts.push({ level:'danger',  icon:'💦', title:'Aşırı bunaltıcı hava', detail:`Sıcaklık ${Math.round(currentTemp)}°, nem %${curRH} → his indeksi ${Math.round(hi)}°. Güneş çarpması ve dehidrasyon riski çok yüksek.` });
    else if (hi >= 32) alerts.push({ level:'warning', icon:'💦', title:'Bunaltıcı hava (nem + sıcaklık)', detail:`Sıcaklık ${Math.round(currentTemp)}°, nem %${curRH} → vücut ${Math.round(hi)}° gibi hissediyor. Bol su için.` });
  }

  // 14. YAĞMUR OLASILIK TRENDİ
  const probNow  = next24[0]?.rainProb ?? 0;
  const prob3h   = next24[3]?.rainProb ?? 0;
  const prob6h   = next24[6]?.rainProb ?? 0;
  if (probNow <= 30 && prob3h >= 70) {
    alerts.push({ level:'warning', icon:'📈', title:'Yağmur olasılığı hızla artıyor', detail:`Şu an %${probNow} → 3 saat içinde %${prob3h} yağmur ihtimali.` });
  } else if (probNow <= 30 && prob6h >= 70) {
    alerts.push({ level:'info', icon:'📈', title:'Yağmur olasılığı artıyor', detail:`Şu an %${probNow} → 6 saat içinde %${prob6h} yağmur ihtimali.` });
  }

  // 15. DEPREM (USGS)
  if (data.quake?.features?.length) {
    const q = data.quake.features[0];
    const mag = q.properties.mag;
    const place = q.properties.place;
    const qTime = new Date(q.properties.time);
    const hoursAgo = Math.round((Date.now() - qTime) / 3600000);
    const lvl = mag >= 5.5 ? 'danger' : mag >= 4.5 ? 'warning' : 'info';
    const timeStr = hoursAgo < 1 ? 'Az önce' : hoursAgo === 1 ? '1 saat önce' : `${hoursAgo} saat önce`;
    alerts.push({ level:lvl, icon:'🌍', title:`Deprem M${mag.toFixed(1)}`, detail:`${timeStr} — ${place}. Artçı sarsıntılara dikkat.` });
  }

  // 16. HAVA KALİTESİ (PM2.5 / AQI)
  if (data.air?.current) {
    const aqi = data.air.current.us_aqi ?? 0;
    const pm25 = data.air.current.pm2_5 ?? 0;
    if (aqi >= 200)      alerts.push({ level:'danger',  icon:'😷', title:'Çok kötü hava kalitesi', detail:`AQI ${aqi}, PM2.5: ${pm25.toFixed(0)} µg/m³. Dışarı çıkmaktan kaçının.` });
    else if (aqi >= 150) alerts.push({ level:'danger',  icon:'😷', title:'Sağlıksız hava kalitesi', detail:`AQI ${aqi}, PM2.5: ${pm25.toFixed(0)} µg/m³. Hassas gruplar dışarı çıkmamalı.` });
    else if (aqi >= 100) alerts.push({ level:'warning', icon:'😷', title:'Orta düzeyde kirli hava', detail:`AQI ${aqi}, PM2.5: ${pm25.toFixed(0)} µg/m³. Uzun süre dışarıda kalmaktan kaçının.` });
  }

  // Tekrar önleme + sıralama
  const seen = new Set();
  return alerts
    .filter(a => { if(seen.has(a.title)) return false; seen.add(a.title); return true; })
    .sort((a,b) => ({danger:0,warning:1,info:2}[a.level] - {danger:0,warning:1,info:2}[b.level]));
}
