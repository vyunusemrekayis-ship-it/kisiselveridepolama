// ── AI.JS ──────────────────────────────────────────────────────────
// Tool use ile Claude entegrasyonu
// Sohbet geçmişi + uzun süreli bellek Firebase'de saklanır

// ── DURUM ───────────────────────────────────────────────────────────
let aiMessages = [];      // Mevcut sohbet [{role,content}]
let aiMemory   = [];      // Uzun süreli bellek [string]
let aiLoading  = false;

// ── ARAÇLAR (TOOLS) ─────────────────────────────────────────────────
const AI_TOOLS = [
  {
    name: 'get_todos',
    description: 'Belirli bir tarihteki görevleri (todo) getirir. Tarihi YYYY-MM-DD formatında girin. Bugün için todayStr() değerini kullanın.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih' }
      },
      required: ['date']
    }
  },
  {
    name: 'add_todo',
    description: 'Belirli bir tarihe görev ekler.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih' },
        text: { type: 'string', description: 'Görev metni' }
      },
      required: ['date', 'text']
    }
  },
  {
    name: 'get_notes',
    description: 'Belirli bir tarihteki notları getirir.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih' }
      },
      required: ['date']
    }
  },
  {
    name: 'add_note',
    description: 'Belirli bir tarihe not ekler.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih' },
        text: { type: 'string', description: 'Not metni' }
      },
      required: ['date', 'text']
    }
  },
  {
    name: 'get_weather',
    description: 'Hava durumu bilgisini getirir. Kayıtlı şehirler için mevcut hava durumu ve saatlik tahmin döner.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih (isteğe bağlı, bugün için boş bırakın)' }
      },
      required: []
    }
  },
  {
    name: 'get_goals',
    description: 'Aktif hedefleri getirir. weekly/monthly/yearly filtreleyebilirsiniz.',
    input_schema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['weekly', 'monthly', 'yearly', 'all'], description: 'Dönem filtresi' }
      },
      required: []
    }
  },
  {
    name: 'get_films',
    description: 'İzlenen veya izlenecek filmleri getirir.',
    input_schema: {
      type: 'object',
      properties: {
        list: { type: 'string', enum: ['watched', 'watchlist', 'all'], description: 'Liste türü' }
      },
      required: []
    }
  },
  {
    name: 'get_books',
    description: 'Okunan veya okunacak kitapları getirir.',
    input_schema: {
      type: 'object',
      properties: {
        list: { type: 'string', enum: ['read', 'readlist', 'all'], description: 'Liste türü' }
      },
      required: []
    }
  },
  {
    name: 'get_chains',
    description: 'Zincir kırma alışkanlıklarını ve streak bilgilerini getirir.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_week_summary',
    description: 'Bu haftanın görevlerini, notlarını ve özel günlerini özetler.',
    input_schema: {
      type: 'object',
      properties: {
        offset: { type: 'number', description: 'Bu haftadan kaç hafta önce/sonra (0=bu hafta, -1=geçen hafta)' }
      },
      required: []
    }
  },
  {
    name: 'save_memory',
    description: 'Kullanıcı hakkında önemli bir bilgiyi uzun süreli belleğe kaydeder. Sadece gerçekten önemli, kalıcı bilgiler için kullanın (isim tercihleri, önemli kişiler, kronik alışkanlıklar vb.).',
    input_schema: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Kaydedilecek bilgi' }
      },
      required: ['note']
    }
  }
];

// ── ARAÇ UYGULAMA ────────────────────────────────────────────────────
async function aiExecuteTool(name, input) {
  try {
    switch (name) {

      case 'get_todos': {
        const todos = getTodos();
        const list = todos[input.date] || [];
        if (!list.length) return `${input.date} tarihinde görev yok.`;
        const done = list.filter(t => t.done).length;
        return JSON.stringify({ date: input.date, total: list.length, done, items: list.map(t => ({ text: t.text, done: t.done })) });
      }

      case 'add_todo': {
        const todos = getTodos();
        if (!todos[input.date]) todos[input.date] = [];
        todos[input.date].push({ text: input.text, done: false });
        setTodos(todos);
        if (typeof renderCal === 'function' && window._currentPage === 'calendar') renderCal();
        if (typeof renderHomeWidgets === 'function' && window._currentPage === 'home') renderHomeWidgets();
        return `"${input.text}" görevi ${input.date} tarihine eklendi.`;
      }

      case 'get_notes': {
        const notes = getCalNotes();
        const list = notes[input.date];
        if (!list || (Array.isArray(list) && !list.length)) return `${input.date} tarihinde not yok.`;
        const arr = Array.isArray(list) ? list : [list];
        return JSON.stringify({ date: input.date, notes: arr.map(n => typeof n === 'object' ? n.text : n) });
      }

      case 'add_note': {
        const notes = getCalNotes();
        if (!Array.isArray(notes[input.date])) notes[input.date] = [];
        notes[input.date].push({ text: input.text, color: '#3a7bd5' });
        setCalNotes(notes);
        if (typeof renderCal === 'function' && window._currentPage === 'calendar') renderCal();
        return `"${input.text}" notu ${input.date} tarihine eklendi.`;
      }

      case 'get_weather': {
        const cities = JSON.parse(localStorage.getItem('gn_wx_cities') || '[]');
        if (!cities.length) return 'Hava durumu için şehir kaydedilmemiş. Hava Durumu sayfasından şehir ekleyebilirsiniz.';
        const city = cities[0];
        const targetDate = input.date || new Date().toISOString().split('T')[0];
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=3`;
          const res = await fetch(url);
          const data = await res.json();
          const cur = data.current;
          const wmo = {0:'Açık',1:'Az bulutlu',2:'Parçalı bulutlu',3:'Çok bulutlu',45:'Sisli',48:'Yoğun sisli',51:'Hafif çiseleme',53:'Orta çiseleme',55:'Yoğun çiseleme',61:'Hafif yağmurlu',63:'Orta yağmurlu',65:'Yoğun yağmurlu',71:'Hafif karlı',73:'Orta karlı',75:'Yoğun karlı',80:'Hafif sağanak',81:'Orta sağanak',82:'Şiddetli sağanak',95:'Fırtınalı',99:'Dolulu fırtına'};
          const desc = wmo[cur.weather_code] || 'Bilinmiyor';
          let dayInfo = '';
          if (input.date && data.hourly) {
            const hours = data.hourly.time.filter(t => t.startsWith(targetDate));
            if (hours.length) {
              const temps = hours.map((t, i) => {
                const idx = data.hourly.time.indexOf(t);
                return `${t.split('T')[1]}: ${data.hourly.temperature_2m[idx]}°C`;
              });
              dayInfo = ` | ${targetDate} saatlik: ${temps.slice(6,22).join(', ')}`;
            }
          }
          return JSON.stringify({
            city: city.name,
            current_temp: cur.temperature_2m,
            feels_like: cur.apparent_temperature,
            condition: desc,
            wind: cur.wind_speed_10m,
            humidity: cur.relative_humidity_2m,
            date: targetDate,
            hourly_note: dayInfo || 'Saatlik veri için tarih belirtin'
          });
        } catch(e) {
          return `Hava durumu alınamadı: ${e.message}`;
        }
      }

      case 'get_goals': {
        let goals = db.g || [];
        const period = input.period || 'all';
        if (period !== 'all') goals = goals.filter(g => g.period === period);
        const active = goals.filter(g => typeof isGoalActive === 'function' ? isGoalActive(g) : true);
        return JSON.stringify(active.map(g => ({
          name: g.name,
          period: g.period,
          target: g.target,
          current: g.current || 0,
          unit: g.unit || '',
          done: g.done,
          track: g.track || ''
        })));
      }

      case 'get_films': {
        const list = input.list || 'all';
        const result = {};
        if (list === 'watched' || list === 'all') result.watched = (db.f || []).map(f => ({ name: f.name, dir: f.dir, date: f.date, note: f.note }));
        if (list === 'watchlist' || list === 'all') result.watchlist = (getWl ? getWl() : []).map(f => ({ name: f.name, dir: f.dir }));
        return JSON.stringify(result);
      }

      case 'get_books': {
        const list = input.list || 'all';
        const result = {};
        if (list === 'read' || list === 'all') result.read = (db.b || []).map(b => ({ name: b.name, author: b.author, pages: b.pages, note: b.note }));
        if (list === 'readlist' || list === 'all') result.readlist = (getRl ? getRl() : []).map(b => ({ name: b.name, author: b.author }));
        return JSON.stringify(result);
      }

      case 'get_chains': {
        const chains = getCh ? getCh() : [];
        return JSON.stringify(chains.map(ch => {
          const doneSet = new Set(ch.done || []);
          const startMs = new Date(ch.start + 'T00:00:00').getTime();
          const todayIdx = Math.floor((Date.now() - startMs) / 86400000);
          let streak = 0;
          let idx = doneSet.has(todayIdx) ? todayIdx : (doneSet.has(todayIdx - 1) ? todayIdx - 1 : -1);
          while (idx >= 0 && doneSet.has(idx)) { streak++; idx--; }
          return { name: ch.name, streak, doneToday: doneSet.has(todayIdx) };
        }));
      }

      case 'get_week_summary': {
        const offset = input.offset || 0;
        const today = new Date();
        today.setDate(today.getDate() + offset * 7);
        const dow = (today.getDay() + 6) % 7;
        const mon = new Date(today); mon.setDate(today.getDate() - dow);
        const days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(mon); d.setDate(mon.getDate() + i);
          const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          const todos = (getTodos()[ds] || []).map(t => t.text + (t.done ? ' (tamamlandı)' : ''));
          const notesRaw = getCalNotes()[ds];
          const notes = notesRaw ? (Array.isArray(notesRaw) ? notesRaw : [notesRaw]).map(n => typeof n === 'object' ? n.text : n) : [];
          if (todos.length || notes.length) days.push({ date: ds, todos, notes });
        }
        return JSON.stringify({ week_start: mon.toISOString().split('T')[0], days });
      }

      case 'save_memory': {
        aiMemory.push(input.note);
        await aiSaveMemoryToFirebase();
        return `Belleğe kaydedildi: "${input.note}"`;
      }

      default:
        return `Bilinmeyen araç: ${name}`;
    }
  } catch (e) {
    return `Araç hatası (${name}): ${e.message}`;
  }
}

// ── FIREBASE HAFIZA ──────────────────────────────────────────────────
async function aiLoadFromFirebase() {
  try {
    await waitForFirebase();
    const uid = window._fbUser?.uid;
    if (!uid) return;
    const ref = window._fbDoc(window._fbDb, 'users', uid);
    const snap = await window._fbGetDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      if (d.ai_memory) aiMemory = d.ai_memory;
      if (d.ai_messages) aiMessages = d.ai_messages;
    }
  } catch (e) { console.error('AI Firebase yükleme:', e); }
}

async function aiSaveMemoryToFirebase() {
  try {
    await waitForFirebase();
    const uid = window._fbUser?.uid;
    if (!uid) return;
    const ref = window._fbDoc(window._fbDb, 'users', uid);
    await window._fbSetDoc(ref, { ai_memory: aiMemory }, { merge: true });
  } catch (e) { console.error('AI bellek kayıt:', e); }
}

async function aiSaveMessagesToFirebase() {
  try {
    await waitForFirebase();
    const uid = window._fbUser?.uid;
    if (!uid) return;
    const toSave = aiMessages.slice(-40);
    const ref = window._fbDoc(window._fbDb, 'users', uid);
    await window._fbSetDoc(ref, { ai_messages: toSave }, { merge: true });
  } catch (e) { console.error('AI mesaj kayıt:', e); }
}

// ── SİSTEM PROMPT ────────────────────────────────────────────────────
function aiSystemPrompt() {
  const today = new Date();
  const ds = todayStr();
  const dayName = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][today.getDay()];
  const dateStr = today.getDate() + ' ' + ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][today.getMonth()] + ' ' + today.getFullYear();

  let memorySection = '';
  if (aiMemory.length) {
    memorySection = `\n\nUzun süreli bellek (önceki konuşmalardan öğrendiklerim):\n${aiMemory.map((m,i) => `${i+1}. ${m}`).join('\n')}`;
  }

  // ── Kullanıcı adını dinamik al ───────────────────────────────────
  const userName = window._userProfile?.name || 'Kullanıcı';
  // ─────────────────────────────────────────────────────────────────

  return `Siz ${userName}'ın kişisel asistanısınız. Kişisel günlük web sitesine entegre edildiniz.

Bugün: ${dayName}, ${dateStr} (${ds})

Yetenekleriniz:
- Takvim: görev ve not okuma/yazma
- Hava durumu: anlık ve saatlik tahmin
- Hedefler: okuma ve ilerleme takibi
- Filmler ve kitaplar: liste görüntüleme
- Zincir kırma alışkanlıkları: streak takibi
- Hafıza: önemli bilgileri kalıcı saklama

Kurallar:
- Her zaman Türkçe cevap verin
- "Siz" ile hitap edin
- Kısa ve net olun
- Aksiyon alırken (todo/not ekleme) onay aldıktan sonra yapın
- Birden fazla araç gerektiren durumlarda sırasıyla kullanın
- Önemli kişisel bilgileri (alışkanlıklar, tercihler) save_memory ile kaydedin${memorySection}`;
}

// ── ANA MESAJ GÖNDERME ───────────────────────────────────────────────
async function aiSend() {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if (!text || aiLoading) return;

  input.value = '';
  aiAutoResize(input);
  aiHideEmpty();
  aiHideQuick();

  aiMessages.push({ role: 'user', content: text });
  aiRenderMessage('user', text);

  await aiRun();
}

async function aiRun() {
  aiLoading = true;
  document.getElementById('ai-send').disabled = true;

  const typingId = aiShowTyping();

  try {
    await window.loadApiKey();
    if (!window.ANTHROPIC_KEY) {
      aiHideTyping(typingId);
      aiRenderMessage('assistant', 'API anahtarı bulunamadı. Lütfen Firebase\'de `config/app` dökümanına `anthropicKey` ekleyin.');
      aiLoading = false;
      document.getElementById('ai-send').disabled = false;
      return;
    }

    let iterations = 0;
    const MAX_ITER = 8;

    while (iterations < MAX_ITER) {
      iterations++;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': window.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20251001',
          max_tokens: 1000,
          system: aiSystemPrompt(),
          tools: AI_TOOLS,
          messages: aiMessages
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      aiMessages.push({ role: 'assistant', content: data.content });

      if (data.stop_reason === 'end_turn') {
        aiHideTyping(typingId);
        const textBlocks = data.content.filter(b => b.type === 'text');
        if (textBlocks.length) {
          aiRenderMessage('assistant', textBlocks.map(b => b.text).join('\n'));
        }
        break;
      }

      if (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter(b => b.type === 'tool_use');
        const toolResults = [];

        for (const tool of toolUses) {
          aiUpdateTypingLabel(typingId, aiToolLabel(tool.name));
          const result = await aiExecuteTool(tool.name, tool.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: result
          });
        }

        aiMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      break;
    }

  } catch (e) {
    aiHideTyping(typingId);
    aiRenderMessage('assistant', `Bir hata oluştu: ${e.message}`);
  }

  aiLoading = false;
  document.getElementById('ai-send').disabled = false;
  await aiSaveMessagesToFirebase();
}

function aiToolLabel(name) {
  const labels = {
    get_todos: 'Takvim okunuyor...',
    add_todo: 'Görev ekleniyor...',
    get_notes: 'Notlar okunuyor...',
    add_note: 'Not ekleniyor...',
    get_weather: 'Hava durumu alınıyor...',
    get_goals: 'Hedefler okunuyor...',
    get_films: 'Filmler okunuyor...',
    get_books: 'Kitaplar okunuyor...',
    get_chains: 'Alışkanlıklar okunuyor...',
    get_week_summary: 'Hafta özeti hazırlanıyor...',
    save_memory: 'Belleğe kaydediliyor...'
  };
  return labels[name] || `${name} çalışıyor...`;
}

// ── RENDER ────────────────────────────────────────────────────────────
function aiRenderMessage(role, text) {
  const container = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;

  const avatar = document.createElement('div');
  avatar.className = `ai-avatar ${role}`;

  if (role === 'assistant') {
    avatar.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  } else {
    avatar.textContent = 'S';
  }

  const bubble = document.createElement('div');
  bubble.className = 'ai-bubble';
  bubble.innerHTML = aiFormatText(text);

  div.appendChild(avatar);
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function aiFormatText(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function aiShowTyping() {
  const container = document.getElementById('ai-messages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'ai-msg assistant';
  div.id = id;

  const avatar = document.createElement('div');
  avatar.className = 'ai-avatar assistant';
  avatar.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '6px';

  const label = document.createElement('div');
  label.className = 'ai-tool-call';
  label.id = id + '-label';
  label.textContent = 'Düşünülüyor...';
  label.style.display = 'none';

  const typing = document.createElement('div');
  typing.className = 'ai-typing';
  typing.innerHTML = '<span></span><span></span><span></span>';

  wrap.appendChild(label);
  wrap.appendChild(typing);
  div.appendChild(avatar);
  div.appendChild(wrap);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function aiUpdateTypingLabel(id, text) {
  const label = document.getElementById(id + '-label');
  if (label) {
    label.style.display = 'flex';
    label.textContent = text;
  }
}

function aiHideTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function aiHideEmpty() {
  const el = document.getElementById('ai-empty');
  if (el) el.style.display = 'none';
}

function aiHideQuick() {
  const el = document.getElementById('ai-quick');
  if (el) el.style.display = 'none';
}

function aiQuick(text) {
  const input = document.getElementById('ai-input');
  if (input) { input.value = text; aiSend(); }
}

function aiKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    aiSend();
  }
}

function aiAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function aiClearChat() {
  if (!confirm('Sohbet geçmişi silinsin mi?')) return;
  aiMessages = [];
  const container = document.getElementById('ai-messages');
  container.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'ai-empty';
  empty.id = 'ai-empty';
  empty.innerHTML = `
    <div class="ai-empty-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <div class="ai-empty-title">Merhaba</div>
    <div class="ai-empty-sub">Size nasıl yardımcı olabilirim? Takvim, hedefler, filmler, kitaplar veya hava durumu hakkında sorabilirsiniz.</div>`;
  container.appendChild(empty);
  document.getElementById('ai-quick').style.display = 'flex';
  aiSaveMessagesToFirebase();
}

// ── BELLEK YÖNETİMİ ──────────────────────────────────────────────────
function aiShowMemory() {
  const panel = document.getElementById('ai-memory-panel');
  if (panel) panel.style.display = 'block';
  aiRenderMemory();
}

function aiHideMemory() {
  const panel = document.getElementById('ai-memory-panel');
  if (panel) panel.style.display = 'none';
}

function aiRenderMemory() {
  const list = document.getElementById('ai-memory-list');
  if (!list) return;
  if (!aiMemory.length) {
    list.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:6px 0">Henüz bellek yok.</div>';
    return;
  }
  list.innerHTML = aiMemory.map((m, i) => `
    <div class="ai-memory-item">
      <span>${esc(m)}</span>
      <button class="ai-memory-del" onclick="aiDelMemory(${i})">×</button>
    </div>`).join('');
}

async function aiAddMemory() {
  const input = document.getElementById('ai-memory-input');
  const text = input.value.trim();
  if (!text) return;
  aiMemory.push(text);
  input.value = '';
  await aiSaveMemoryToFirebase();
  aiRenderMemory();
}

async function aiDelMemory(i) {
  aiMemory.splice(i, 1);
  await aiSaveMemoryToFirebase();
  aiRenderMemory();
}

// ── INIT ─────────────────────────────────────────────────────────────
async function initAi() {
  await aiLoadFromFirebase();

  if (aiMessages.length) {
    aiHideEmpty();
    aiHideQuick();
    aiMessages.forEach(msg => {
      if (msg.role === 'user') {
        const text = typeof msg.content === 'string' ? msg.content : msg.content.filter(b => b.type === 'text').map(b => b.text).join(' ');
        if (text) aiRenderMessage('user', text);
      } else if (msg.role === 'assistant') {
        const blocks = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }];
        const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n');
        if (text) aiRenderMessage('assistant', text);
      }
    });
    setTimeout(() => {
      const c = document.getElementById('ai-messages');
      if (c) c.scrollTop = c.scrollHeight;
    }, 50);
  }
}
