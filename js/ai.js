// ── AI.JS ─────────────────────────────────────────────────────────

// Samsun koordinatları (weather.js ile uyumlu)
const AI_LAT = 41.2867;
const AI_LON = 36.33;

let aiMessages = []; // Aktif sohbet geçmişi
let aiIsLoading = false;
let aiMemory = {}; // Firebase'den yüklenen uzun dönem hafıza

// ── TOOLS TANIMI ──────────────────────────────────────────────────

const AI_TOOLS = [
  {
    name: 'get_todos',
    description: 'Belirli bir tarih veya tarih aralığı için takvim görevlerini (todos) getirir.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih. Boş bırakılırsa bugün.' },
        range_days: { type: 'number', description: 'Kaç günlük aralık. Örn: 7 = önümüzdeki 7 gün.' }
      }
    }
  },
  {
    name: 'add_todo',
    description: 'Takvime yeni bir görev (todo) ekler.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih.' },
        text: { type: 'string', description: 'Görevin metni.' }
      },
      required: ['date', 'text']
    }
  },
  {
    name: 'get_notes',
    description: 'Belirli bir tarih veya tarih aralığı için takvim notlarını getirir.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih.' },
        range_days: { type: 'number', description: 'Kaç günlük aralık.' }
      }
    }
  },
  {
    name: 'add_note',
    description: 'Takvime yeni bir not ekler.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih.' },
        text: { type: 'string', description: 'Not metni.' }
      },
      required: ['date', 'text']
    }
  },
  {
    name: 'get_weather',
    description: 'Belirli tarih ve saat için hava durumu bilgisi getirir (Open-Meteo API).',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD formatında tarih.' },
        hour: { type: 'number', description: 'Saat (0-23). Boş bırakılırsa günlük özet.' }
      }
    }
  },
  {
    name: 'get_goals',
    description: 'Hedefleri getirir. Aktif, haftalık, aylık veya yıllık filtre uygulanabilir.',
    input_schema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['weekly', 'monthly', 'yearly', 'all'], description: 'Dönem filtresi.' },
        active_only: { type: 'boolean', description: 'Sadece aktif dönemdeki hedefler.' }
      }
    }
  },
  {
    name: 'get_films',
    description: 'İzlenen filmler ve izleme listesini getirir.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['watched', 'watchlist', 'all'], description: 'Film listesi türü.' },
        limit: { type: 'number', description: 'Kaç film getirilsin. Varsayılan 10.' }
      }
    }
  },
  {
    name: 'get_books',
    description: 'Okunan kitaplar ve okuma listesini getirir.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['read', 'readlist', 'all'], description: 'Kitap listesi türü.' },
        limit: { type: 'number', description: 'Kaç kitap getirilsin. Varsayılan 10.' }
      }
    }
  },
  {
    name: 'get_chains',
    description: 'Zincir kırma alışkanlıklarını ve streak bilgilerini getirir.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'update_memory',
    description: 'Kullanıcı hakkında önemli bir bilgiyi uzun dönem hafızaya kaydeder (tercihler, önemli bilgiler, alışkanlıklar vb.).',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Hafıza anahtarı (örn: "meslek", "sehir", "tercihler").' },
        value: { type: 'string', description: 'Kaydedilecek değer.' }
      },
      required: ['key', 'value']
    }
  }
];

// ── TOOL ÇALIŞTIRICILARI ──────────────────────────────────────────

async function aiRunTool(name, input) {
  switch (name) {

    case 'get_todos': {
      const todos = getTodos();
      const date = input.date || todayStr();
      const days = input.range_days || 1;
      const result = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(date + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        const list = todos[ds] || [];
        if (list.length || days === 1) result[ds] = list;
      }
      return JSON.stringify(result);
    }

    case 'add_todo': {
      const todos = getTodos();
      const date = input.date || todayStr();
      if (!todos[date]) todos[date] = [];
      todos[date].push({ text: input.text, done: false });
      setTodos(todos);
      if (typeof renderCal === 'function' && _currentPage === 'calendar') renderCal();
      if (typeof renderHomeWidgets === 'function' && _currentPage === 'home') renderHomeWidgets();
      return JSON.stringify({ success: true, date, text: input.text });
    }

    case 'get_notes': {
      const notes = getCalNotes();
      const date = input.date || todayStr();
      const days = input.range_days || 1;
      const result = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(date + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        const nts = notes[ds] || [];
        if (nts.length || days === 1) result[ds] = nts;
      }
      return JSON.stringify(result);
    }

    case 'add_note': {
      const notes = getCalNotes();
      const date = input.date || todayStr();
      if (!Array.isArray(notes[date])) notes[date] = [];
      notes[date].push({ text: input.text, color: '#3a7bd5' });
      setCalNotes(notes);
      if (typeof renderCal === 'function' && _currentPage === 'calendar') renderCal();
      return JSON.stringify({ success: true, date, text: input.text });
    }

    case 'get_weather': {
      try {
        const date = input.date || todayStr();
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${AI_LAT}&longitude=${AI_LON}&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&timezone=Europe/Istanbul&start_date=${date}&end_date=${date}`;
        const res = await fetch(url);
        const data = await res.json();
        if (input.hour !== undefined && input.hour !== null) {
          const idx = data.hourly.time.findIndex(t => t.includes('T' + String(input.hour).padStart(2,'0') + ':00'));
          if (idx >= 0) {
            return JSON.stringify({
              datetime: data.hourly.time[idx],
              temp: data.hourly.temperature_2m[idx],
              precip_prob: data.hourly.precipitation_probability[idx],
              wind: data.hourly.windspeed_10m[idx],
              code: data.hourly.weathercode[idx]
            });
          }
        }
        return JSON.stringify({
          date,
          temp_max: data.daily.temperature_2m_max[0],
          temp_min: data.daily.temperature_2m_min[0],
          precip_prob: data.daily.precipitation_probability_max[0],
          code: data.daily.weathercode[0]
        });
      } catch(e) {
        return JSON.stringify({ error: 'Hava durumu alınamadı: ' + e.message });
      }
    }

    case 'get_goals': {
      let goals = db.g || [];
      if (input.period && input.period !== 'all') {
        goals = goals.filter(g => g.period === input.period);
      }
      if (input.active_only) {
        goals = goals.filter(g => typeof isGoalActive === 'function' ? isGoalActive(g) : true);
      }
      return JSON.stringify(goals.map(g => ({
        name: g.name,
        period: g.period,
        target: g.target,
        current: g.current || 0,
        unit: g.unit || '',
        done: g.done || false,
        track: g.track || ''
      })));
    }

    case 'get_films': {
      const type = input.type || 'all';
      const limit = input.limit || 10;
      const result = {};
      if (type === 'watched' || type === 'all') {
        result.watched = (db.f || []).slice(0, limit).map(f => ({
          name: f.name, dir: f.dir || '', date: f.date || '', note: f.note || ''
        }));
      }
      if (type === 'watchlist' || type === 'all') {
        const wl = JSON.parse(localStorage.getItem('gn_wl') || '[]');
        result.watchlist = wl.slice(0, limit).map(f => ({ name: f.name, dir: f.dir || '' }));
      }
      return JSON.stringify(result);
    }

    case 'get_books': {
      const type = input.type || 'all';
      const limit = input.limit || 10;
      const result = {};
      if (type === 'read' || type === 'all') {
        result.read = (db.b || []).slice(0, limit).map(b => ({
          name: b.name, author: b.author || '', pages: b.pages || '', note: b.note || ''
        }));
      }
      if (type === 'readlist' || type === 'all') {
        const rl = JSON.parse(localStorage.getItem('gn_rl') || '[]');
        result.readlist = rl.slice(0, limit).map(b => ({ name: b.name, author: b.author || '' }));
      }
      return JSON.stringify(result);
    }

    case 'get_chains': {
      const chains = JSON.parse(localStorage.getItem('gn_chains') || '[]');
      return JSON.stringify(chains.map(ch => {
        const doneSet = new Set(ch.done || []);
        const startMs = new Date(ch.start + 'T00:00:00').getTime();
        const todayIdx = Math.floor((Date.now() - startMs) / 86400000);
        let streak = 0;
        let checkIdx = todayIdx;
        if (!doneSet.has(checkIdx)) checkIdx--;
        while (checkIdx >= 0 && doneSet.has(checkIdx)) { streak++; checkIdx--; }
        return { name: ch.name, streak, start: ch.start };
      }));
    }

    case 'update_memory': {
      aiMemory[input.key] = input.value;
      await aiSaveMemory();
      return JSON.stringify({ success: true, key: input.key, value: input.value });
    }

    default:
      return JSON.stringify({ error: 'Bilinmeyen tool: ' + name });
  }
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────

function aiSystemPrompt() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const memoryStr = Object.keys(aiMemory).length
    ? '\n\nKullanıcı hafızası:\n' + Object.entries(aiMemory).map(([k,v]) => `- ${k}: ${v}`).join('\n')
    : '';

  return `Sen kişisel bir dijital asistansın. Kullanıcıyla Türkçe konuşuyorsun ve "Siz" ile hitap ediyorsun.

Bugün: ${dateStr}, Saat: ${timeStr}
Konum: Samsun, Türkiye${memoryStr}

Görevlerin:
- Kullanıcının takvimi, hedefleri, filmleri, kitapları ve alışkanlıklarına erişebilir ve bunları düzenleyebilirsin.
- Hava durumu için Open-Meteo API'sini kullanıyorsun (Samsun koordinatları zaten tanımlı).
- Kullanıcı hakkında öğrendiğin önemli bilgileri (meslek, tercihler, önemli kişiler vb.) update_memory ile kaydet.
- Yanıtların kısa, net ve yardımcı olsun. Gereksiz uzatma.
- Bir işlem yaptığında (görev ekleme vb.) kullanıcıya kısaca bildir.
- Tarihleri Türkçe formatla (ör: "15 Ocak Çarşamba").
- Hava durumu kodlarını anlaşılır Türkçe'ye çevir (0=açık, 1-3=parçalı bulutlu, 51-67=yağmurlu, 71-77=karlı, 80-82=sağanak, 95=fırtınalı vb.)`;
}

// ── ANA MESAJ GÖNDERME ────────────────────────────────────────────

async function aiSend() {
  const input = document.getElementById('ai-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || aiIsLoading) return;

  input.value = '';
  aiAutoResize(input);
  aiHideWelcome();
  aiAddUserMessage(text);
  await aiChat(text);
}

async function aiChat(userText) {
  aiIsLoading = true;
  aiSetStatus(true);
  aiSetSendDisabled(true);

  aiMessages.push({ role: 'user', content: userText });

  // Typing göster
  const typingId = aiShowTyping();

  try {
    await window.loadApiKey && window.loadApiKey();
    if (!window.ANTHROPIC_KEY) throw new Error('API key bulunamadı.');

    let response = await aiCallAPI(aiMessages);
    aiRemoveTyping(typingId);

    // Tool use döngüsü
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const textBlocks = response.content.filter(b => b.type === 'text' && b.text.trim());

      // Varsa metin yanıtı göster
      if (textBlocks.length) {
        aiAddAssistantMessage(textBlocks.map(b => b.text).join('\n'));
      }

      // Tool çağrılarını çalıştır
      const toolResults = [];
      for (const tb of toolUseBlocks) {
        const callEl = aiShowToolCall(tb.name, false);
        try {
          const result = await aiRunTool(tb.name, tb.input);
          aiMarkToolDone(callEl);
          toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: result });
        } catch (e) {
          aiMarkToolDone(callEl);
          toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify({ error: e.message }), is_error: true });
        }
      }

      // Mesaj geçmişine ekle
      aiMessages.push({ role: 'assistant', content: response.content });
      aiMessages.push({ role: 'user', content: toolResults });

      // Yeni typing
      const t2 = aiShowTyping();
      response = await aiCallAPI(aiMessages);
      aiRemoveTyping(t2);
    }

    // Son metin yanıtı
    const finalText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    if (finalText) {
      aiAddAssistantMessage(finalText);
      aiMessages.push({ role: 'assistant', content: response.content });
    }

    // Firebase'e sohbet geçmişini kaydet (son 40 mesaj)
    if (aiMessages.length > 40) aiMessages = aiMessages.slice(-40);
    await aiSaveHistory();

  } catch (e) {
    aiRemoveTyping(typingId);
    aiShowError(e.message || 'Bir hata oluştu.');
    console.error('AI Hata:', e);
  }

  aiIsLoading = false;
  aiSetStatus(false);
  aiSetSendDisabled(false);
}

async function aiCallAPI(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': window.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: aiSystemPrompt(),
      tools: AI_TOOLS,
      messages
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API hatası: ${res.status}`);
  }
  return res.json();
}

// ── UI YARDIMCILARI ───────────────────────────────────────────────

function aiHideWelcome() {
  const el = document.getElementById('ai-welcome');
  if (el) el.style.display = 'none';
}

function aiAddUserMessage(text) {
  const el = document.getElementById('ai-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'ai-msg user';
  div.innerHTML = `
    <div class="ai-msg-avatar"><div class="ai-msg-avatar-user"></div></div>
    <div class="ai-msg-body">
      <div class="ai-msg-bubble">${aiEsc(text).replace(/\n/g, '<br>')}</div>
    </div>`;
  el.appendChild(div);
  aiScrollBottom();
}

function aiAddAssistantMessage(text) {
  const el = document.getElementById('ai-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'ai-msg assistant';
  div.innerHTML = `
    <div class="ai-msg-avatar"><div class="ai-msg-avatar-dot"></div></div>
    <div class="ai-msg-body">
      <div class="ai-msg-bubble">${aiFormatText(text)}</div>
    </div>`;
  el.appendChild(div);
  aiScrollBottom();
}

function aiShowTyping() {
  const el = document.getElementById('ai-messages');
  if (!el) return null;
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'ai-msg assistant';
  div.id = id;
  div.innerHTML = `
    <div class="ai-msg-avatar"><div class="ai-msg-avatar-dot"></div></div>
    <div class="ai-msg-body">
      <div class="ai-typing"><span></span><span></span><span></span></div>
    </div>`;
  el.appendChild(div);
  aiScrollBottom();
  return id;
}

function aiRemoveTyping(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

function aiShowToolCall(toolName, done) {
  const el = document.getElementById('ai-messages');
  if (!el) return null;
  const labels = {
    get_todos: 'Görevler okunuyor',
    add_todo: 'Görev ekleniyor',
    get_notes: 'Notlar okunuyor',
    add_note: 'Not ekleniyor',
    get_weather: 'Hava durumu alınıyor',
    get_goals: 'Hedefler okunuyor',
    get_films: 'Filmler okunuyor',
    get_books: 'Kitaplar okunuyor',
    get_chains: 'Zincirler okunuyor',
    update_memory: 'Hafızaya kaydediliyor'
  };
  const id = 'tool-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'ai-msg assistant';
  div.innerHTML = `
    <div class="ai-msg-avatar"><div class="ai-msg-avatar-dot"></div></div>
    <div class="ai-msg-body">
      <div class="ai-tool-call">
        <div class="ai-tool-call-spinner" id="${id}-icon"></div>
        <span>${labels[toolName] || toolName}</span>
      </div>
    </div>`;
  el.appendChild(div);
  aiScrollBottom();
  return id;
}

function aiMarkToolDone(id) {
  if (!id) return;
  const icon = document.getElementById(id + '-icon');
  if (icon) {
    icon.className = 'ai-tool-call-done';
  }
}

function aiShowError(msg) {
  const el = document.getElementById('ai-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'ai-error';
  div.textContent = 'Hata: ' + msg;
  el.appendChild(div);
  aiScrollBottom();
}

function aiScrollBottom() {
  const el = document.getElementById('ai-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

function aiSetStatus(active) {
  const dot = document.getElementById('ai-status-dot');
  if (dot) dot.className = 'ai-status-dot' + (active ? ' active' : '');
}

function aiSetSendDisabled(disabled) {
  const btn = document.getElementById('ai-send-btn');
  if (btn) btn.disabled = disabled;
}

function aiAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function aiKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    aiSend();
  }
}

function aiSuggest(text) {
  const input = document.getElementById('ai-input');
  if (input) {
    input.value = text;
    aiAutoResize(input);
    input.focus();
  }
}

function aiEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function aiFormatText(text) {
  // Basit markdown: **bold**, *italic*, satır sonu, madde işaretleri
  let html = aiEsc(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  if (!html.startsWith('<')) html = '<p>' + html + '</p>';
  return html;
}

// ── FIREBASE HAFIZA & GEÇMİŞ ─────────────────────────────────────

async function aiLoadData() {
  try {
    await waitForFirebase(3000);
    const uid = window._fbUser?.uid;
    if (!uid) return;
    const ref = window._fbDoc(window._fbDb, 'users', uid);
    const snap = await window._fbGetDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      if (d.ai_memory) aiMemory = d.ai_memory;
      if (d.ai_history && Array.isArray(d.ai_history)) {
        aiMessages = d.ai_history;
        aiRenderHistory();
      }
    }
  } catch (e) {
    console.error('AI veri yüklenemedi:', e);
  }
}

async function aiSaveHistory() {
  try {
    await waitForFirebase(2000);
    const uid = window._fbUser?.uid;
    if (!uid) return;
    const ref = window._fbDoc(window._fbDb, 'users', uid);
    await window._fbSetDoc(ref, { ai_history: aiMessages }, { merge: true });
  } catch (e) {
    console.error('AI geçmiş kaydedilemedi:', e);
  }
}

async function aiSaveMemory() {
  try {
    await waitForFirebase(2000);
    const uid = window._fbUser?.uid;
    if (!uid) return;
    const ref = window._fbDoc(window._fbDb, 'users', uid);
    await window._fbSetDoc(ref, { ai_memory: aiMemory }, { merge: true });
  } catch (e) {
    console.error('AI hafıza kaydedilemedi:', e);
  }
}

function aiRenderHistory() {
  const el = document.getElementById('ai-messages');
  if (!el) return;

  // Sadece kullanıcı ve asistan text mesajlarını göster
  const visible = aiMessages.filter(m =>
    m.role === 'user' && typeof m.content === 'string'
    || m.role === 'assistant' && Array.isArray(m.content) && m.content.some(b => b.type === 'text')
    || m.role === 'assistant' && typeof m.content === 'string'
  );

  if (!visible.length) return;
  aiHideWelcome();

  visible.forEach(m => {
    if (m.role === 'user' && typeof m.content === 'string') {
      aiAddUserMessage(m.content);
    } else if (m.role === 'assistant') {
      const text = Array.isArray(m.content)
        ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : m.content;
      if (text && text.trim()) aiAddAssistantMessage(text.trim());
    }
  });
}

async function aiClearHistory() {
  if (!confirm('Sohbet geçmişi temizlensin mi?')) return;
  aiMessages = [];
  const el = document.getElementById('ai-messages');
  if (el) {
    el.innerHTML = '';
    // Welcome'ı geri ekle
    el.innerHTML = `
      <div class="ai-welcome" id="ai-welcome">
        <div class="ai-welcome-icon">
          <div class="ai-pulse-ring"></div>
          <div class="ai-pulse-core"></div>
        </div>
        <div class="ai-welcome-text">Merhaba. Size nasıl yardımcı olabilirim?</div>
        <div class="ai-welcome-sub">Takvim, hedefler, hava durumu ve daha fazlası için sorabilirsiniz.</div>
        <div class="ai-suggestions">
          <button class="ai-suggestion" onclick="aiSuggest('Bugün planım ne?')">Bugün planım ne?</button>
          <button class="ai-suggestion" onclick="aiSuggest('Bu hafta hedeflerim nerede?')">Bu hafta hedeflerim nerede?</button>
          <button class="ai-suggestion" onclick="aiSuggest('Yarın hava nasıl?')">Yarın hava nasıl?</button>
          <button class="ai-suggestion" onclick="aiSuggest('Son izlediğim filmler neler?')">Son filmlerim neler?</button>
        </div>
      </div>`;
  }
  await aiSaveHistory();
}

// ── INIT ──────────────────────────────────────────────────────────

function initAi() {
  aiLoadData();
}
