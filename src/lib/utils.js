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

// ── FİLM POSTERİ (Films.jsx ve Home.jsx ortak kullanır) ──────────────────
// url string ya da null saklar; Promise yoktur — aynı isim için tek fetch garantili
export const posterCache = {};
const posterInFlight = {};

export function fetchPoster(name) {
  if (name in posterCache) return Promise.resolve(posterCache[name]);
  if (posterInFlight[name]) return posterInFlight[name];
  const p = fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(name)}&apikey=${OMDB_KEY}`)
    .then(r => r.json())
    .then(data => {
      const url = (data.Poster && data.Poster !== 'N/A')
        ? data.Poster.replace(/SX\d+/, 'SX1000').replace('http://', 'https://')
        : null;
      posterCache[name] = url;
      delete posterInFlight[name];
      return url;
    })
    .catch(() => { posterCache[name] = null; delete posterInFlight[name]; return null; });
  posterInFlight[name] = p;
  return p;
}
