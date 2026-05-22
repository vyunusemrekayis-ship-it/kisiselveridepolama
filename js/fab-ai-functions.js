// ── FLOATING AI PANEL ───────────────────────────────────────────────

let fabOpen = false;
let fabSpeaking = false;
let fabRecognition = null;
let fabSynth = window.speechSynthesis || null;

function fabAiToggle() {
  fabOpen = !fabOpen;
  const panel = document.getElementById('fab-ai-panel');
  const btn   = document.getElementById('fab-ai');
  const icon  = document.getElementById('fab-ai-icon');

  if (fabOpen) {
    panel.style.display = 'flex';
    btn.classList.add('open');
    // Kapatma ikonu
    icon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>';
    fabSyncMessages();
    setTimeout(() => {
      const inp = document.getElementById('fab-input');
      if (inp) inp.focus();
    }, 80);
  } else {
    panel.style.display = 'none';
    btn.classList.remove('open');
    icon.innerHTML = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" fill="none"/>';
  }
}

// Mevcut aiMessages'ı fab panele yansıt
function fabSyncMessages() {
  const container = document.getElementById('fab-messages');
  if (!container) return;
  container.innerHTML = '';

  if (!aiMessages.length) {
    container.innerHTML = `
      <div class="fab-welcome">
        <div class="fab-welcome-title">Merhaba</div>
        <div>Ne yardımcı olabilirim?</div>
      </div>`;
    return;
  }

  aiMessages.forEach(msg => {
    if (msg.role === 'user') {
      const t = typeof msg.content === 'string' ? msg.content
        : msg.content.filter(b => b.type === 'text').map(b => b.text).join(' ');
      if (t) fabRenderMsg('user', t);
    } else if (msg.role === 'assistant') {
      const blocks = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }];
      const t = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n');
      if (t) fabRenderMsg('assistant', t);
    }
  });

  container.scrollTop = container.scrollHeight;
  fabUpdateStatus(false);
}

function fabRenderMsg(role, text) {
  const container = document.getElementById('fab-messages');
  if (!container) return;

  // Karşılama mesajını kaldır
  const welcome = container.querySelector('.fab-welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = `fab-msg ${role}`;

  const avatar = document.createElement('div');
  avatar.className = `fab-avatar ${role}`;
  if (role === 'assistant') {
    avatar.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  } else {
    const n = window._userProfile?.name || 'S';
    avatar.textContent = n.charAt(0).toUpperCase();
  }

  const bubble = document.createElement('div');
  bubble.className = 'fab-bubble';
  bubble.innerHTML = aiFormatText(text);

  div.appendChild(avatar);
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function fabShowTyping() {
  const container = document.getElementById('fab-messages');
  if (!container) return null;
  const welcome = container.querySelector('.fab-welcome');
  if (welcome) welcome.remove();

  const id = 'fab-typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'fab-msg assistant';
  div.id = id;

  const avatar = document.createElement('div');
  avatar.className = 'fab-avatar assistant';
  avatar.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  const typing = document.createElement('div');
  typing.className = 'fab-typing';
  typing.innerHTML = '<span></span><span></span><span></span>';

  div.appendChild(avatar);
  div.appendChild(typing);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function fabHideTyping(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

function fabUpdateStatus(loading) {
  const dot = document.getElementById('fab-status-dot');
  if (!dot) return;
  if (loading) { dot.classList.add('active'); }
  else { dot.classList.remove('active'); }
}

// ── FAB GÖNDERME ─────────────────────────────────────────────────────
async function fabAiSend() {
  const input = document.getElementById('fab-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || aiLoading) return;

  input.value = '';
  fabAiResize(input);

  aiMessages.push({ role: 'user', content: text });
  fabRenderMsg('user', text);

  // AI sayfası açıksa orada da göster
  const aiContainer = document.getElementById('ai-messages');
  if (aiContainer) aiRenderMessage('user', text);

  await fabAiRun();
}

async function fabAiRun() {
  aiLoading = true;
  document.getElementById('fab-send').disabled = true;
  fabUpdateStatus(true);

  const typingId = fabShowTyping();
  // AI sayfası açıksa orada da typing
  const pageTypingId = document.getElementById('ai-messages') ? aiShowTyping() : null;

  try {
    await window.loadApiKey();
    if (!window.ANTHROPIC_KEY) {
      fabHideTyping(typingId);
      if (pageTypingId) aiHideTyping(pageTypingId);
      fabRenderMsg('assistant', 'API anahtarı bulunamadı.');
      aiLoading = false;
      document.getElementById('fab-send').disabled = false;
      fabUpdateStatus(false);
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
        fabHideTyping(typingId);
        if (pageTypingId) aiHideTyping(pageTypingId);
        const textBlocks = data.content.filter(b => b.type === 'text');
        if (textBlocks.length) {
          const responseText = textBlocks.map(b => b.text).join('\n');
          fabRenderMsg('assistant', responseText);
          if (document.getElementById('ai-messages')) aiRenderMessage('assistant', responseText);
          // Sesli yanıt
          fabSpeak(responseText);
        }
        break;
      }

      if (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter(b => b.type === 'tool_use');
        const toolResults = [];
        for (const tool of toolUses) {
          const result = await aiExecuteTool(tool.name, tool.input);
          toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: result });
        }
        aiMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      break;
    }

  } catch (e) {
    fabHideTyping(typingId);
    if (pageTypingId) aiHideTyping(pageTypingId);
    fabRenderMsg('assistant', `Bir hata oluştu: ${e.message}`);
  }

  aiLoading = false;
  const sendBtn = document.getElementById('fab-send');
  if (sendBtn) sendBtn.disabled = false;
  fabUpdateStatus(false);
  await aiSaveMessagesToFirebase();
}

// ── SES: KONUŞMA TANIMA ──────────────────────────────────────────────
function fabAiMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Tarayıcınız ses tanımayı desteklemiyor. Chrome önerilir.');
    return;
  }

  const btn = document.getElementById('fab-mic');

  if (fabRecognition) {
    fabRecognition.stop();
    fabRecognition = null;
    btn.classList.remove('listening');
    return;
  }

  fabRecognition = new SpeechRecognition();
  fabRecognition.lang = 'tr-TR';
  fabRecognition.continuous = false;
  fabRecognition.interimResults = false;

  btn.classList.add('listening');

  fabRecognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    const input = document.getElementById('fab-input');
    if (input) {
      input.value = transcript;
      fabAiResize(input);
    }
    fabRecognition = null;
    btn.classList.remove('listening');
    // Otomatik gönder
    setTimeout(() => fabAiSend(), 100);
  };

  fabRecognition.onerror = () => {
    fabRecognition = null;
    btn.classList.remove('listening');
  };

  fabRecognition.onend = () => {
    fabRecognition = null;
    btn.classList.remove('listening');
  };

  fabRecognition.start();
}

// ── SES: METİN OKUMA ─────────────────────────────────────────────────
function fabSpeak(text) {
  if (!fabSynth) return;
  // HTML taglarını temizle
  const clean = text.replace(/<[^>]+>/g, '').replace(/\*\*/g, '').replace(/`/g, '').trim();
  if (!clean) return;

  // Önceki konuşmayı durdur
  fabSynth.cancel();

  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = 'tr-TR';
  utt.rate = 1.05;
  utt.pitch = 1.0;

  // Türkçe ses seç (varsa)
  const voices = fabSynth.getVoices();
  const trVoice = voices.find(v => v.lang.startsWith('tr')) || null;
  if (trVoice) utt.voice = trVoice;

  utt.onstart = () => { fabSpeaking = true; };
  utt.onend = () => { fabSpeaking = false; };

  fabSynth.speak(utt);
}

// ── YARDIMCI ─────────────────────────────────────────────────────────
function fabAiKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    fabAiSend();
  }
}

function fabAiResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

// AI sayfası açıkken mesajları fab ile senkron tut
// initAi çağrıldığında (sayfa değiştiğinde) fabSyncMessages de çalışsın
const _origInitAi = window.initAi;
