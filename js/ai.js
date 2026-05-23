// ── AI.JS ──────────────────────────────────────────────────────────

let aiMessages = [];
let aiMemory   = [];
let aiLoading  = false;

const AI_TOOLS = [
  { name: 'get_todos', description: 'Belirli bir tarihteki görevleri getirir.', input_schema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['date'] } },
  { name: 'add_todo', description: 'Belirli bir tarihe görev ekler.', input_schema: { type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } }, required: ['date', 'text'] } },
  { name: 'get_notes', description: 'Belirli bir tarihteki notları getirir.', input_schema: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } },
  { name: 'add_note', description: 'Belirli bir tarihe not ekler.', input_schema: { type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } }, required: ['date', 'text'] } },
  { name: 'get_weather', description: 'Hava durumu bilgisini getirir.', input_schema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD, isteğe bağlı' } }, required: [] } },
  { name: 'get_goals', description: 'Aktif hedefleri getirir.', input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['weekly','monthly','yearly','all'] } }, required: [] } },
  { name: 'get_films', description: 'İzlenen veya izlenecek filmleri getirir.', input_schema: { type: 'object', properties: { list: { type: 'string', enum: ['watched','watchlist','all'] } }, required: [] } },
  { name: 'get_books', description: 'Okunan veya okunacak kitapları getirir.', input_schema: { type: 'object', properties: { list: { type: 'string', enum: ['read','readlist','all'] } }, required: [] } },
  { name: 'get_chains', description: 'Zincir kırma alışkanlıklarını getirir.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_week_summary', description: 'Bu haftanın özetini getirir.', input_schema: { type: 'object', properties: { offset: { type: 'number' } }, required: [] } },
  { name: 'save_memory', description: 'Önemli bir bilgiyi kalıcı belleğe kaydeder.', input_schema: { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] } }
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
        if (!cities.length) return 'Hava durumu için şehir kaydedilmemiş.';
        const city = cities[0];
        const targetDate = input.date || new Date().toISOString().split('T')[0];
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=3`;
        const res = await fetch(url);
        const data = await res.json();
        const cur = data.current;
        const wmo = {0:'Açık',1:'Az bulutlu',2:'Parçalı bulutlu',3:'Çok bulutlu',61:'Yağmurlu',63:'Orta yağmurlu',65:'Yoğun yağmurlu',71:'Karlı',80:'Sağanak',95:'Fırtınalı'};
        return JSON.stringify({ city: city.name, current_temp: cur.temperature_2m, feels_like: cur.apparent_temperature, condition: wmo[cur.weather_code] || 'Bilinmiyor', wind: cur.wind_speed_10m, humidity: cur.relative_humidity_2m });
      }
      case 'get_goals': {
        let goals = db.g || [];
        if (input.period && input.period !== 'all') goals = goals.filter(g => g.period === input.period);
        const active = goals.filter(g => typeof isGoalActive === 'function' ? isGoalActive(g) : true);
        return JSON.stringify(active.map(g => ({ name: g.name, period: g.period, target: g.target, current: g.current || 0, unit: g.unit || '', done: g.done })));
      }
      case 'get_films': {
        const list = input.list || 'all';
        const result = {};
        if (list === 'watched' || list === 'all') result.watched = (db.f || []).map(f => ({ name: f.name, dir: f.dir, date: f.date }));
        if (list === 'watchlist' || list === 'all') result.watchlist = (typeof getWl === 'function' ? getWl() : []).map(f => ({ name: f.name }));
        return JSON.stringify(result);
      }
      case 'get_books': {
        const list = input.list || 'all';
        const result = {};
        if (list === 'read' || list === 'all') result.read = (db.b || []).map(b => ({ name: b.name, author: b.author }));
        if (list === 'readlist' || list === 'all') result.readlist = (typeof getRl === 'function' ? getRl() : []).map(b => ({ name: b.name, author: b.author }));
        return JSON.stringify(result);
      }
      case 'get_chains': {
        const chains = typeof getCh === 'function' ? getCh() : [];
        return JSON.stringify(chains.map(ch => {
          const doneSet = new Set(ch.done || []);
          const startMs = new Date(ch.start + 'T00:00:00').getTime();
          const todayIdx = Math.floor((Date.now() - startMs) / 86400000);
          let streak = 0, idx = doneSet.has(todayIdx) ? todayIdx : (doneSet.has(todayIdx-1) ? todayIdx-1 : -1);
          while (idx >= 0 && doneSet.has(idx)) { streak++; idx--; }
          return { name: ch.name, streak, doneToday: doneSet.has(todayIdx) };
        }));
      }
      case 'get_week_summary': {
        const offset = input.offset || 0;
        const today = new Date(); today.setDate(today.getDate() + offset * 7);
        const dow = (today.getDay() + 6) % 7;
        const mon = new Date(today); mon.setDate(today.getDate() - dow);
        const days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(mon); d.setDate(mon.getDate() + i);
          const ds = d.toISOString().split('T')[0];
          const todos = (getTodos()[ds] || []).map(t => t.text + (t.done ? ' ✓' : ''));
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
      default: return `Bilinmeyen araç: ${name}`;
    }
  } catch (e) { return `Araç hatası (${name}): ${e.message}`; }
}

// ── FIREBASE ─────────────────────────────────────────────────────────
async function aiLoadFromFirebase() {
  try {
    await waitForFirebase();
    const uid = window._fbUser?.uid; if (!uid) return;
    const snap = await window._fbGetDoc(window._fbDoc(window._fbDb, 'users', uid));
    if (snap.exists()) {
      const d = snap.data();
      if (d.ai_memory) aiMemory = d.ai_memory;
      if (d.ai_messages) aiMessages = d.ai_messages;
    }
  } catch (e) { console.error('AI yükleme:', e); }
}

async function aiSaveMemoryToFirebase() {
  try {
    await waitForFirebase();
    const uid = window._fbUser?.uid; if (!uid) return;
    await window._fbSetDoc(window._fbDoc(window._fbDb, 'users', uid), { ai_memory: aiMemory }, { merge: true });
  } catch (e) { console.error('AI bellek kayıt:', e); }
}

async function aiSaveMessagesToFirebase() {
  try {
    await waitForFirebase();
    const uid = window._fbUser?.uid; if (!uid) return;
    await window._fbSetDoc(window._fbDoc(window._fbDb, 'users', uid), { ai_messages: aiMessages.slice(-40) }, { merge: true });
  } catch (e) { console.error('AI mesaj kayıt:', e); }
}

// ── SİSTEM PROMPT ─────────────────────────────────────────────────────
function aiSystemPrompt() {
  const today = new Date();
  const ds = todayStr();
  const dayName = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][today.getDay()];
  const dateStr = today.getDate() + ' ' + ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][today.getMonth()] + ' ' + today.getFullYear();
  const userName = window._userProfile?.name || 'Kullanıcı';
  const mem = aiMemory.length ? `\n\nUzun süreli bellek:\n${aiMemory.map((m,i) => `${i+1}. ${m}`).join('\n')}` : '';
  return `Siz ${userName}'ın kişisel asistanısınız. Kişisel günlük web sitesine entegre edildiniz.\n\nBugün: ${dayName}, ${dateStr} (${ds})\n\nYetenekleriniz: takvim, hava durumu, hedefler, filmler, kitaplar, zincir alışkanlıkları, hafıza.\n\nKurallar:\n- Her zaman Türkçe\n- Kısa ve net\n- "Siz" ile hitap\n- Aksiyon öncesi onay al${mem}`;
}

// ── API ÇAĞRISI (ortak) ───────────────────────────────────────────────
async function aiCallAPI(onText, onTypingLabel) {
  await window.loadApiKey();
  if (!window.ANTHROPIC_KEY) { onText('API anahtarı bulunamadı. Firebase\'de `config/app` dökümanına `anthropicKey` ekleyin.'); return; }

  let iterations = 0;
  while (iterations++ < 8) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': window.ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1000, system: aiSystemPrompt(), tools: AI_TOOLS, messages: aiMessages })
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
    const data = await res.json();
    aiMessages.push({ role: 'assistant', content: data.content });

    if (data.stop_reason === 'end_turn') {
      const txt = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
      if (txt) onText(txt);
      break;
    }
    if (data.stop_reason === 'tool_use') {
      const toolUses = data.content.filter(b => b.type === 'tool_use');
      const toolResults = [];
      for (const tool of toolUses) {
        if (onTypingLabel) onTypingLabel(aiToolLabel(tool.name));
        const result = await aiExecuteTool(tool.name, tool.input);
        toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: result });
      }
      aiMessages.push({ role: 'user', content: toolResults });
      continue;
    }
    break;
  }
}

function aiToolLabel(name) {
  const labels = { get_todos:'Takvim okunuyor...', add_todo:'Görev ekleniyor...', get_notes:'Notlar okunuyor...', add_note:'Not ekleniyor...', get_weather:'Hava durumu alınıyor...', get_goals:'Hedefler okunuyor...', get_films:'Filmler okunuyor...', get_books:'Kitaplar okunuyor...', get_chains:'Alışkanlıklar okunuyor...', get_week_summary:'Hafta özeti hazırlanıyor...', save_memory:'Belleğe kaydediliyor...' };
  return labels[name] || `${name} çalışıyor...`;
}

// ── FORMAT ────────────────────────────────────────────────────────────
function aiFormatText(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// ── AI SAYFASI: RENDER ────────────────────────────────────────────────
function aiRenderMessage(role, text) {
  const container = document.getElementById('ai-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  const avatar = document.createElement('div');
  avatar.className = `ai-avatar ${role}`;
  avatar.innerHTML = role === 'assistant'
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
    : (window._userProfile?.name || 'S').charAt(0).toUpperCase();
  const bubble = document.createElement('div');
  bubble.className = 'ai-bubble';
  bubble.innerHTML = aiFormatText(text);
  div.appendChild(avatar); div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function aiShowTyping() {
  const container = document.getElementById('ai-messages');
  if (!container) return null;
  const id = 'typing-' + Date.now();
  const div = document.createElement('div'); div.className = 'ai-msg assistant'; div.id = id;
  const avatar = document.createElement('div'); avatar.className = 'ai-avatar assistant';
  avatar.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  const label = document.createElement('div'); label.className = 'ai-tool-call'; label.id = id+'-label'; label.textContent = 'Düşünülüyor...'; label.style.display = 'none';
  const typing = document.createElement('div'); typing.className = 'ai-typing'; typing.innerHTML = '<span></span><span></span><span></span>';
  wrap.appendChild(label); wrap.appendChild(typing); div.appendChild(avatar); div.appendChild(wrap);
  container.appendChild(div); container.scrollTop = container.scrollHeight;
  return id;
}

function aiUpdateTypingLabel(id, text) {
  const label = document.getElementById(id + '-label');
  if (label) { label.style.display = 'flex'; label.textContent = text; }
}

function aiHideTyping(id) { const el = document.getElementById(id); if (el) el.remove(); }

// ── AI SAYFASI: GÖNDER ────────────────────────────────────────────────
async function aiSend() {
  const input = document.getElementById('ai-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || aiLoading) return;

  input.value = ''; aiAutoResize(input);
  const welcome = document.getElementById('ai-welcome');
  if (welcome) welcome.style.display = 'none';

  aiMessages.push({ role: 'user', content: text });
  aiRenderMessage('user', text);
  if (fabOpen) fabRenderMsg('user', text);

  aiLoading = true;
  const sendBtn = document.getElementById('ai-send-btn');
  if (sendBtn) sendBtn.disabled = true;
  const dot = document.getElementById('ai-status-dot');
  if (dot) dot.classList.add('active');

  const typingId = aiShowTyping();

  try {
    await aiCallAPI(
      (responseText) => {
        aiHideTyping(typingId);
        aiRenderMessage('assistant', responseText);
        if (fabOpen) fabRenderMsg('assistant', responseText);
        fabSpeak(responseText);
      },
      (label) => aiUpdateTypingLabel(typingId, label)
    );
  } catch (e) {
    aiHideTyping(typingId);
    aiRenderMessage('assistant', `Bir hata oluştu: ${e.message}`);
  }

  aiLoading = false;
  if (sendBtn) sendBtn.disabled = false;
  if (dot) dot.classList.remove('active');
  await aiSaveMessagesToFirebase();
}

function aiKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); } }
function aiAutoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }
function aiSuggest(text) { const inp = document.getElementById('ai-input'); if (inp) { inp.value = text; aiSend(); } }

async function aiClearHistory() {
  if (!confirm('Sohbet geçmişi silinsin mi?')) return;
  aiMessages = [];
  const container = document.getElementById('ai-messages');
  if (container) container.innerHTML = `
    <div class="ai-welcome" id="ai-welcome">
      <div class="ai-welcome-icon"><div class="ai-pulse-ring"></div><div class="ai-pulse-core"></div></div>
      <div class="ai-welcome-text">Merhaba. Size nasıl yardımcı olabilirim?</div>
      <div class="ai-welcome-sub">Takvim, hedefler, hava durumu ve daha fazlası için sorabilirsiniz.</div>
      <div class="ai-suggestions">
        <button class="ai-suggestion" onclick="aiSuggest('Bugün planım ne?')">Bugün planım ne?</button>
        <button class="ai-suggestion" onclick="aiSuggest('Bu hafta hedeflerim nerede?')">Bu hafta hedeflerim nerede?</button>
        <button class="ai-suggestion" onclick="aiSuggest('Yarın hava nasıl?')">Yarın hava nasıl?</button>
        <button class="ai-suggestion" onclick="aiSuggest('Son izlediğim filmler neler?')">Son filmlerim neler?</button>
      </div>
    </div>`;
  fabSyncMessages();
  await aiSaveMessagesToFirebase();
}

async function aiDelMemory(i) { aiMemory.splice(i, 1); await aiSaveMemoryToFirebase(); }

// ── AI SAYFASI: MİKROFON ─────────────────────────────────────────────
let aiPageRecognition = null;
function aiPageMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Chrome önerilir.'); return; }
  const btn = document.getElementById('ai-mic-btn');
  if (aiPageRecognition) { aiPageRecognition.stop(); return; }
  aiPageRecognition = new SR();
  aiPageRecognition.lang = 'tr-TR'; aiPageRecognition.continuous = false; aiPageRecognition.interimResults = false;
  if (btn) btn.classList.add('listening');
  aiPageRecognition.onresult = (e) => {
    const t = e.results[0][0].transcript;
    const inp = document.getElementById('ai-input');
    if (inp) { inp.value = t; aiAutoResize(inp); }
    aiPageRecognition = null; if (btn) btn.classList.remove('listening');
    setTimeout(() => aiSend(), 100);
  };
  aiPageRecognition.onerror = aiPageRecognition.onend = () => { aiPageRecognition = null; if (btn) btn.classList.remove('listening'); };
  aiPageRecognition.start();
}

// ── AI SAYFASI: INIT ──────────────────────────────────────────────────
async function initAi() {
  await aiLoadFromFirebase();
  const container = document.getElementById('ai-messages');
  if (!container) return;
  if (aiMessages.length) {
    container.innerHTML = '';
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
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
  }
}

// ════════════════════════════════════════════════════════════════════
// ── FLOATING PANEL (her sayfada) ─────────────────────────────────────
// ════════════════════════════════════════════════════════════════════

let fabOpen = false;
let fabRecognition = null;
const fabSynth = window.speechSynthesis || null;

function fabAiToggle() {
  fabOpen = !fabOpen;
  const panel = document.getElementById('fab-ai-panel');
  const btn   = document.getElementById('fab-ai');
  const icon  = document.getElementById('fab-ai-icon');
  if (!panel || !btn || !icon) return;

  if (fabOpen) {
    panel.style.display = 'flex';
    btn.classList.add('open');
    icon.innerHTML = `<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
    fabSyncMessages();
    setTimeout(() => { const i = document.getElementById('fab-input'); if (i) i.focus(); }, 80);
  } else {
    panel.style.display = 'none';
    btn.classList.remove('open');
    icon.innerHTML = `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
}

function fabSyncMessages() {
  const c = document.getElementById('fab-messages');
  if (!c) return;
  c.innerHTML = '';
  if (!aiMessages.length) {
    c.innerHTML = `<div class="fab-welcome"><div class="fab-welcome-title">Merhaba</div><div>Ne yardımcı olabilirim?</div></div>`;
    return;
  }
  aiMessages.forEach(msg => {
    if (msg.role === 'user') {
      const t = typeof msg.content === 'string' ? msg.content : msg.content.filter(b=>b.type==='text').map(b=>b.text).join(' ');
      if (t) fabRenderMsg('user', t);
    } else if (msg.role === 'assistant') {
      const blocks = Array.isArray(msg.content) ? msg.content : [{type:'text',text:msg.content}];
      const t = blocks.filter(b=>b.type==='text').map(b=>b.text).join('\n');
      if (t) fabRenderMsg('assistant', t);
    }
  });
  c.scrollTop = c.scrollHeight;
  fabUpdateStatus(false);
}

function fabRenderMsg(role, text) {
  const c = document.getElementById('fab-messages');
  if (!c) return;
  c.querySelector('.fab-welcome')?.remove();
  const div = document.createElement('div'); div.className = `fab-msg ${role}`;
  const avatar = document.createElement('div'); avatar.className = `fab-avatar ${role}`;
  avatar.innerHTML = role === 'assistant'
    ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
    : (window._userProfile?.name || 'S').charAt(0).toUpperCase();
  const bubble = document.createElement('div'); bubble.className = 'fab-bubble';
  bubble.innerHTML = aiFormatText(text);
  div.appendChild(avatar); div.appendChild(bubble); c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

function fabShowTyping() {
  const c = document.getElementById('fab-messages');
  if (!c) return null;
  c.querySelector('.fab-welcome')?.remove();
  const id = 'fab-t-' + Date.now();
  const div = document.createElement('div'); div.className = 'fab-msg assistant'; div.id = id;
  const avatar = document.createElement('div'); avatar.className = 'fab-avatar assistant';
  avatar.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  const typing = document.createElement('div'); typing.className = 'fab-typing'; typing.innerHTML = '<span></span><span></span><span></span>';
  div.appendChild(avatar); div.appendChild(typing); c.appendChild(div); c.scrollTop = c.scrollHeight;
  return id;
}

function fabHideTyping(id) { const el = document.getElementById(id); if (el) el.remove(); }
function fabUpdateStatus(on) { const d = document.getElementById('fab-status-dot'); if (d) on ? d.classList.add('active') : d.classList.remove('active'); }

// ── FAB: GÖNDER ───────────────────────────────────────────────────────
async function fabAiSend() {
  const input = document.getElementById('fab-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || aiLoading) return;

  input.value = ''; fabAiResize(input);
  aiMessages.push({ role: 'user', content: text });
  fabRenderMsg('user', text);
  if (document.getElementById('ai-messages')) aiRenderMessage('user', text);

  aiLoading = true;
  const sendBtn = document.getElementById('fab-send');
  if (sendBtn) sendBtn.disabled = true;
  fabUpdateStatus(true);

  const fabTypId = fabShowTyping();
  const pageTypId = document.getElementById('ai-messages') ? aiShowTyping() : null;

  try {
    await aiCallAPI(
      (responseText) => {
        fabHideTyping(fabTypId);
        if (pageTypId) aiHideTyping(pageTypId);
        fabRenderMsg('assistant', responseText);
        if (document.getElementById('ai-messages')) aiRenderMessage('assistant', responseText);
        fabSpeak(responseText);
      },
      () => {}
    );
  } catch (e) {
    fabHideTyping(fabTypId);
    if (pageTypId) aiHideTyping(pageTypId);
    fabRenderMsg('assistant', `Hata: ${e.message}`);
  }

  aiLoading = false;
  if (sendBtn) sendBtn.disabled = false;
  fabUpdateStatus(false);
  await aiSaveMessagesToFirebase();
}

// ── FAB: MİKROFON ─────────────────────────────────────────────────────
function fabAiMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Chrome önerilir.'); return; }
  const btn = document.getElementById('fab-mic');
  if (fabRecognition) { fabRecognition.stop(); return; }
  fabRecognition = new SR();
  fabRecognition.lang = 'tr-TR'; fabRecognition.continuous = false; fabRecognition.interimResults = false;
  if (btn) btn.classList.add('listening');
  fabRecognition.onresult = (e) => {
    const t = e.results[0][0].transcript;
    const inp = document.getElementById('fab-input');
    if (inp) { inp.value = t; fabAiResize(inp); }
    fabRecognition = null; if (btn) btn.classList.remove('listening');
    setTimeout(() => fabAiSend(), 100);
  };
  fabRecognition.onerror = fabRecognition.onend = () => { fabRecognition = null; if (btn) btn.classList.remove('listening'); };
  fabRecognition.start();
}

// ── FAB: SESLİ YANIT ──────────────────────────────────────────────────
function fabSpeak(text) {
  if (!fabSynth) return;
  const clean = text.replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/`/g, '').trim();
  if (!clean) return;
  fabSynth.cancel();
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = 'tr-TR'; utt.rate = 1.05;
  const setVoice = () => { const v = fabSynth.getVoices().find(v => v.lang.startsWith('tr')); if (v) utt.voice = v; fabSynth.speak(utt); };
  fabSynth.getVoices().length ? setVoice() : (fabSynth.onvoiceschanged = setVoice);
}

// ── FAB: YARDIMCI ─────────────────────────────────────────────────────
function fabAiKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fabAiSend(); } }
function fabAiResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }
