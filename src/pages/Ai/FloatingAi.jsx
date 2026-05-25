import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, calcChainStreak } from '../../lib/utils';

// ── Araçlar ────────────────────────────────────────────────────────────
const AI_TOOLS = [
  { name: 'get_todos', description: 'Belirli bir tarihteki görevleri getirir.', input_schema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['date'] } },
  { name: 'add_todo', description: 'Belirli bir tarihe görev ekler.', input_schema: { type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } }, required: ['date', 'text'] } },
  { name: 'get_notes', description: 'Belirli bir tarihteki notları getirir.', input_schema: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } },
  { name: 'add_note', description: 'Belirli bir tarihe not ekler.', input_schema: { type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } }, required: ['date', 'text'] } },
  { name: 'get_goals', description: 'Aktif hedefleri getirir.', input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['weekly','monthly','yearly','all'] } }, required: [] } },
  { name: 'get_films', description: 'İzlenen veya izlenecek filmleri getirir.', input_schema: { type: 'object', properties: { list: { type: 'string', enum: ['watched','watchlist','all'] } }, required: [] } },
  { name: 'get_books', description: 'Okunan veya okunacak kitapları getirir.', input_schema: { type: 'object', properties: { list: { type: 'string', enum: ['read','readlist','all'] } }, required: [] } },
  { name: 'get_chains', description: 'Zincir kırma alışkanlıklarını getirir.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_week_summary', description: 'Bu haftanın özetini getirir.', input_schema: { type: 'object', properties: { offset: { type: 'number' } }, required: [] } },
  { name: 'save_memory', description: 'Önemli bir bilgiyi kalıcı belleğe kaydeder.', input_schema: { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] } },
];

function executeTool(name, input, store) {
  const { db, getTodos, setTodos, addTodo: storeAddTodo, getNotes, setNotes, getChains, getWatchlist, getReadlist } = store;
  try {
    switch (name) {
      case 'get_todos': {
        const todos = getTodos();
        const list = todos[input.date] || [];
        if (!list.length) return `${input.date} tarihinde görev yok.`;
        return JSON.stringify({ date: input.date, total: list.length, done: list.filter(t => t.done).length, items: list.map(t => ({ text: t.text, done: t.done })) });
      }
      case 'add_todo': storeAddTodo(input.date, input.text); return `"${input.text}" görevi eklendi.`;
      case 'get_notes': {
        const notes = getNotes();
        const n = notes[input.date];
        if (!n || (Array.isArray(n) && !n.length)) return `${input.date} tarihinde not yok.`;
        const arr = Array.isArray(n) ? n : [n];
        return JSON.stringify({ date: input.date, notes: arr.map(x => typeof x === 'object' ? x.text : x) });
      }
      case 'add_note': {
        const notes = getNotes();
        if (!Array.isArray(notes[input.date])) notes[input.date] = [];
        notes[input.date].push({ text: input.text, color: '#3a7bd5' });
        setNotes(notes);
        return `"${input.text}" notu eklendi.`;
      }
      case 'get_goals': {
        let goals = db.g || [];
        if (input.period && input.period !== 'all') goals = goals.filter(g => g.period === input.period);
        return JSON.stringify(goals.map(g => ({ name: g.name, period: g.period, target: g.target, current: g.current || 0, unit: g.unit || '', done: g.done })));
      }
      case 'get_films': {
        const result = {};
        const list = input.list || 'all';
        if (list === 'watched' || list === 'all') result.watched = (db.f || []).map(f => ({ name: f.name, dir: f.dir, date: f.date }));
        if (list === 'watchlist' || list === 'all') result.watchlist = getWatchlist().map(f => ({ name: f.name }));
        return JSON.stringify(result);
      }
      case 'get_books': {
        const result = {};
        const list = input.list || 'all';
        if (list === 'read' || list === 'all') result.read = (db.b || []).map(b => ({ name: b.name, author: b.author }));
        if (list === 'readlist' || list === 'all') result.readlist = getReadlist().map(b => ({ name: b.name, author: b.author }));
        return JSON.stringify(result);
      }
      case 'get_chains': {
        const chains = getChains();
        return JSON.stringify(chains.map(ch => { const { streak } = calcChainStreak(ch); return { name: ch.name, streak }; }));
      }
      case 'get_week_summary': {
        const offset = input.offset || 0;
        const now = new Date(); now.setDate(now.getDate() - offset * 7);
        const monday = new Date(now); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        const todos = getTodos(); const weekDone = [], weekTodo = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday); d.setDate(d.getDate() + i);
          const ds = d.toISOString().split('T')[0];
          (todos[ds] || []).forEach(t => (t.done ? weekDone : weekTodo).push({ date: ds, text: t.text }));
        }
        return JSON.stringify({ week_start: monday.toISOString().split('T')[0], done: weekDone, pending: weekTodo, total_films: db.f?.length, total_books: db.b?.length });
      }
      case 'save_memory': {
        const mem = JSON.parse(localStorage.getItem('gn_ai_memory') || '[]');
        mem.push({ note: input.note, date: todayStr() });
        localStorage.setItem('gn_ai_memory', JSON.stringify(mem));
        return `Belleğe kaydedildi: "${input.note}"`;
      }
      default: return 'Bilinmeyen araç.';
    }
  } catch (e) { return `Hata: ${e.message}`; }
}

function buildSystemPrompt(db, userProfile) {
  const today = new Date();
  const mem = JSON.parse(localStorage.getItem('gn_ai_memory') || '[]');
  const memStr = mem.length ? '\n\nKalıcı Bellek:\n' + mem.map(m => `- ${m.note} (${m.date})`).join('\n') : '';
  return `Sen kişisel dijital günlük uygulamasının yapay zeka asistanısın.
Bugün: ${today.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Kullanıcı: ${userProfile?.name || 'Kullanıcı'}
Film: ${db.f?.length || 0} | Kitap: ${db.b?.length || 0} | Hedef: ${db.g?.length || 0}${memStr}
Türkçe yanıt ver. Kısa, net ve samimi ol. Araçları gerektiğinde kullan.`;
}

// ── TTS ────────────────────────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'tr-TR';
  utt.rate = 1.05;
  // Türkçe ses varsa seç
  const voices = window.speechSynthesis.getVoices();
  const trVoice = voices.find(v => v.lang.startsWith('tr'));
  if (trVoice) utt.voice = trVoice;
  window.speechSynthesis.speak(utt);
}

function stopSpeak() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ── STT ────────────────────────────────────────────────────────────────
function useSpeechRecognition(onResult) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Tarayıcınız sesli girişi desteklemiyor.');
    const rec = new SR();
    rec.lang = 'tr-TR';
    rec.interimResults = false;
    rec.onresult = e => { onResult(e.results[0][0].transcript); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => { recRef.current?.stop(); setListening(false); };

  return { listening, start, stop };
}

// ── Mesaj balonu ───────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div style={{
        maxWidth: '85%', padding: '8px 12px',
        borderRadius: isUser ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
        background: isUser ? 'rgba(58,123,213,0.2)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isUser ? 'rgba(58,123,213,.3)' : 'rgba(255,255,255,.08)'}`,
        fontSize: 13, lineHeight: 1.55, color: '#e8edf5', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Ana bileşen ────────────────────────────────────────────────────────
export default function FloatingAi() {
  const store = useStore();
  const { db, userProfile } = store;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  const scroll = () => setTimeout(() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' }), 50);

  const { listening, start: startListen, stop: stopListen } = useSpeechRecognition(text => {
    setInput(text);
    // Otomatik gönder
    setTimeout(() => sendMsg(text), 100);
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Ses listesi yüklenince Türkçe ses hazır olsun
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
  }, []);

  const sendMsg = async (overrideText) => {
    const userText = (overrideText ?? input).trim();
    if (!userText || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);
    scroll();

    try {
      if (!window.ANTHROPIC_KEY && window.loadApiKey) await window.loadApiKey();
      if (!window.ANTHROPIC_KEY) {
        const errMsg = { role: 'assistant', content: 'API anahtarı bulunamadı.' };
        setMessages(m => [...m, errMsg]);
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': window.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      };

      let apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      let response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers,
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1000, system: buildSystemPrompt(db, userProfile), tools: AI_TOOLS, messages: apiMessages }),
      });
      let data = await response.json();

      while (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter(b => b.type === 'tool_use');
        const toolResults = toolUses.map(t => ({ type: 'tool_result', tool_use_id: t.id, content: executeTool(t.name, t.input, store) }));
        apiMessages = [...apiMessages, { role: 'assistant', content: data.content }, { role: 'user', content: toolResults }];
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers,
          body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1000, system: buildSystemPrompt(db, userProfile), tools: AI_TOOLS, messages: apiMessages }),
        });
        data = await response.json();
      }

      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      setMessages([...newMessages, { role: 'assistant', content: text }]);
      scroll();
      if (ttsEnabled) speak(text);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Bağlantı hatası: ' + e.message }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Overlay: panel açıkken arka planı karart */}
      {open && (
        <div
          className="fixed inset-0 z-[998]"
          style={{ background: 'rgba(0,0,0,.35)' }}
          onClick={() => { setOpen(false); stopSpeak(); }}
        />
      )}

      {/* Chat paneli */}
      {open && (
        <div
          className="fixed z-[999] flex flex-col"
          style={{
            bottom: 80, right: 20,
            width: 360, maxWidth: 'calc(100vw - 32px)',
            height: 520, maxHeight: 'calc(100vh - 120px)',
            background: 'rgba(16,19,28,.97)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,.6)',
            animation: 'slideUp .2s ease',
          }}
        >
          {/* Panel başlık */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#237F52', animation: 'pulse 2s infinite', boxShadow: '0 0 8px rgba(35,127,82,.5)' }} />
              <span className="text-sm font-medium text-text">Asistan</span>
            </div>
            <div className="flex items-center gap-2">
              {/* TTS toggle */}
              <button
                onClick={() => { setTtsEnabled(v => !v); if (ttsEnabled) stopSpeak(); }}
                title={ttsEnabled ? 'Sesi kapat' : 'Sesi aç'}
                className="bg-transparent border-0 cursor-pointer p-1 rounded-lg hover:bg-surface2 transition-colors"
                style={{ color: ttsEnabled ? '#3a7bd5' : 'rgba(232,237,245,.3)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {ttsEnabled
                    ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                    : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
                  }
                </svg>
              </button>
              {messages.length > 0 && (
                <button onClick={() => { setMessages([]); stopSpeak(); }} className="bg-transparent border-0 cursor-pointer text-muted hover:text-red-400 transition-colors p-1 text-xs">
                  Temizle
                </button>
              )}
              <button onClick={() => { setOpen(false); stopSpeak(); }} className="bg-transparent border-0 cursor-pointer text-muted hover:text-text transition-colors p-1 text-lg leading-none">×</button>
            </div>
          </div>

          {/* Mesajlar */}
          <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin' }}>
            {messages.length === 0 && (
              <div className="py-8 text-center">
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(58,123,213,.1)', border: '1px solid rgba(58,123,213,.2)', margin: '0 auto 12px', animation: 'pulse 3s ease-in-out infinite' }} />
                <div className="text-xs text-muted mb-4">Size nasıl yardımcı olabilirim?</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {['Bugün planım ne?', 'Bu hafta hedeflerim?', 'Son filmlerim?'].map(s => (
                    <button key={s} onClick={() => sendMsg(s)}
                      className="px-2.5 py-1 rounded-xl border border-border bg-surface2 text-[11px] text-muted cursor-pointer hover:border-border2 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {loading && (
              <div className="flex justify-start mb-2">
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 3px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(232,237,245,.4)', animation: `pulse 1.2s ease-in-out infinite ${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="flex items-end gap-2 bg-surface border border-border rounded-2xl px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                placeholder="Bir şey sorun..."
                rows={1}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e8edf5', fontSize: 13, lineHeight: 1.5, resize: 'none', fontFamily: "'DM Sans',sans-serif", maxHeight: 100, overflowY: 'auto' }}
              />
              {/* Mikrofon butonu */}
              <button
                onClick={listening ? stopListen : startListen}
                title={listening ? 'Durdur' : 'Sesli konuş'}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none', flexShrink: 0,
                  background: listening ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.08)',
                  color: listening ? '#f87171' : 'rgba(232,237,245,.5)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s',
                  animation: listening ? 'pulse 1s ease-in-out infinite' : 'none',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
              {/* Gönder butonu */}
              <button
                onClick={() => sendMsg()}
                disabled={loading || !input.trim()}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none', flexShrink: 0,
                  background: input.trim() && !loading ? '#3a7bd5' : 'rgba(255,255,255,.08)',
                  color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating buton */}
      <button
        onClick={() => { setOpen(v => !v); if (open) stopSpeak(); }}
        className="fixed z-[999]"
        style={{
          bottom: 20, right: 20,
          width: 52, height: 52,
          borderRadius: '50%',
          border: 'none',
          background: open ? 'rgba(58,123,213,.9)' : 'rgba(16,19,28,.95)',
          boxShadow: open ? '0 0 0 3px rgba(58,123,213,.3), 0 8px 24px rgba(0,0,0,.5)' : '0 0 0 1px rgba(255,255,255,.1), 0 8px 24px rgba(0,0,0,.5)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .25s',
        }}
        title="Asistan"
      >
        {open
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(232,237,245,.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="6" width="16" height="12" rx="4" fill="rgba(232,237,245,.1)"/>
              <circle cx="9" cy="12" r="1.5" fill="rgba(232,237,245,.8)"/>
              <circle cx="15" cy="12" r="1.5" fill="rgba(232,237,245,.8)"/>
              <line x1="9" y1="3" x2="9" y2="6" strokeWidth="2"/>
              <line x1="15" y1="3" x2="15" y2="6" strokeWidth="2"/>
              <line x1="9" y1="18" x2="9" y2="21" strokeWidth="2"/>
              <line x1="15" y1="18" x2="15" y2="21" strokeWidth="2"/>
            </svg>
        }
      </button>
    </>
  );
}
