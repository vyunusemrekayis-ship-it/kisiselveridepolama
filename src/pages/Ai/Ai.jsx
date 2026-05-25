import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { todayStr, calcChainStreak } from '../../lib/utils';

const AI_TOOLS = [
  { name: 'get_todos', description: 'Belirli bir tarihteki görevleri getirir.', input_schema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['date'] } },
  { name: 'add_todo', description: 'Belirli bir tarihe görev ekler.', input_schema: { type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } }, required: ['date', 'text'] } },
  { name: 'get_notes', description: 'Belirli bir tarihteki notları getirir.', input_schema: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } },
  { name: 'add_note', description: 'Belirli bir tarihe not ekler.', input_schema: { type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } }, required: ['date', 'text'] } },
  { name: 'get_weather', description: 'Hava durumu bilgisini getirir.', input_schema: { type: 'object', properties: { date: { type: 'string' } }, required: [] } },
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
    switch(name) {
      case 'get_todos': {
        const todos = getTodos();
        const list = todos[input.date] || [];
        if (!list.length) return `${input.date} tarihinde görev yok.`;
        return JSON.stringify({ date: input.date, total: list.length, done: list.filter(t=>t.done).length, items: list.map(t=>({text:t.text,done:t.done})) });
      }
      case 'add_todo': {
        storeAddTodo(input.date, input.text);
        return `"${input.text}" görevi ${input.date} tarihine eklendi.`;
      }
      case 'get_notes': {
        const notes = getNotes();
        const n = notes[input.date];
        if (!n || (Array.isArray(n) && !n.length)) return `${input.date} tarihinde not yok.`;
        const arr = Array.isArray(n) ? n : [n];
        return JSON.stringify({ date: input.date, notes: arr.map(x => typeof x==='object' ? x.text : x) });
      }
      case 'add_note': {
        const notes = getNotes();
        if (!Array.isArray(notes[input.date])) notes[input.date] = [];
        notes[input.date].push({ text: input.text, color: '#3a7bd5' });
        setNotes(notes);
        return `"${input.text}" notu ${input.date} tarihine eklendi.`;
      }
      case 'get_weather': {
        const wxCities = JSON.parse(localStorage.getItem('gn_wx_cities') || '[]');
        if (!wxCities.length) return 'Hava durumu için şehir kaydedilmemiş.';
        return JSON.stringify({ message: `${wxCities[0].name} için hava durumu: Güncel veri için hava durumu sayfasını kontrol edin.`, city: wxCities[0].name });
      }
      case 'get_goals': {
        let goals = db.g || [];
        if (input.period && input.period !== 'all') goals = goals.filter(g => g.period === input.period);
        return JSON.stringify(goals.map(g => ({ name: g.name, period: g.period, target: g.target, current: g.current||0, unit: g.unit||'', done: g.done })));
      }
      case 'get_films': {
        const list = input.list || 'all';
        const result = {};
        if (list === 'watched' || list === 'all') result.watched = (db.f||[]).map(f=>({name:f.name,dir:f.dir,date:f.date}));
        if (list === 'watchlist' || list === 'all') result.watchlist = getWatchlist().map(f=>({name:f.name}));
        return JSON.stringify(result);
      }
      case 'get_books': {
        const list = input.list || 'all';
        const result = {};
        if (list === 'read' || list === 'all') result.read = (db.b||[]).map(b=>({name:b.name,author:b.author}));
        if (list === 'readlist' || list === 'all') result.readlist = getReadlist().map(b=>({name:b.name,author:b.author}));
        return JSON.stringify(result);
      }
      case 'get_chains': {
        const chains = getChains();
        return JSON.stringify(chains.map(ch => {
          const { streak } = calcChainStreak(ch);
          return { name: ch.name, streak };
        }));
      }
      case 'get_week_summary': {
        const offset = input.offset || 0;
        const now = new Date();
        now.setDate(now.getDate() - offset * 7);
        const monday = new Date(now);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        const todos = getTodos();
        const weekDone = [], weekTodo = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday); d.setDate(d.getDate() + i);
          const ds = d.toISOString().split('T')[0];
          (todos[ds]||[]).forEach(t => (t.done ? weekDone : weekTodo).push({ date: ds, text: t.text }));
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
  } catch(e) { return `Hata: ${e.message}`; }
}

function buildSystemPrompt(db, userProfile) {
  const today = new Date();
  const mem = JSON.parse(localStorage.getItem('gn_ai_memory') || '[]');
  const memStr = mem.length ? '\n\nKalıcı Bellek:\n' + mem.map(m => `- ${m.note} (${m.date})`).join('\n') : '';
  return `Sen kişisel dijital günlük uygulamasının yapay zeka asistanısın. Kullanıcıya yardımcı ol.
Bugün: ${today.toLocaleDateString('tr-TR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
Kullanıcı: ${userProfile?.name || 'Kullanıcı'}
Film sayısı: ${db.f?.length || 0} | Kitap sayısı: ${db.b?.length || 0} | Hedef sayısı: ${db.g?.length || 0}
${memStr}
Türkçe yanıt ver. Kısa, net ve samimi ol. Araçları gerektiğinde kullan.`;
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'rgba(58,123,213,0.2)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isUser ? 'rgba(58,123,213,.3)' : 'rgba(255,255,255,.07)'}`,
        fontSize: 14,
        lineHeight: 1.6,
        color: '#e8edf5',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function Ai() {
  const store = useStore();
  const { db, userProfile } = store;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  const scroll = () => { setTimeout(() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' }), 50); };

  const send = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);
    scroll();

    try {
      // API key yükle
      if (!window.ANTHROPIC_KEY && window.loadApiKey) await window.loadApiKey();
      if (!window.ANTHROPIC_KEY) {
        setMessages(m => [...m, { role: 'assistant', content: 'API anahtarı bulunamadı. Firebase config/app dökümanına anthropicKey ekleyin.' }]);
        setLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': window.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      };

      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      let response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          system: buildSystemPrompt(db, userProfile),
          tools: AI_TOOLS,
          messages: apiMessages,
        }),
      });

      let data = await response.json();

      // Tool use loop
      while (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter(b => b.type === 'tool_use');
        const toolResults = toolUses.map(t => ({
          type: 'tool_result',
          tool_use_id: t.id,
          content: executeTool(t.name, t.input, store),
        }));

        const nextMessages = [
          ...apiMessages,
          { role: 'assistant', content: data.content },
          { role: 'user', content: toolResults },
        ];

        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 1000,
            system: buildSystemPrompt(db, userProfile),
            tools: AI_TOOLS,
            messages: nextMessages,
          }),
        });
        data = await response.json();
      }

      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      const updatedMessages = [...newMessages, { role: 'assistant', content: text }];
      setMessages(updatedMessages);
      scroll();
    } catch(e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Bağlantı hatası: ' + e.message }]);
    }
    setLoading(false);
  };

  const SUGGESTIONS = ['Bugün planım ne?', 'Bu hafta hedeflerim nerede?', 'Yarın hava nasıl?', 'Son filmlerim neler?'];

  return (
    <div className="flex flex-col animate-fadeIn" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#237F52', animation:'pulse 2s infinite', boxShadow:'0 0 8px rgba(35,127,82,.5)' }} />
          <span className="section-title text-base">Asistan</span>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-xs text-muted hover:text-red-400 cursor-pointer bg-transparent border-0 flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Temizle
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 && (
          <div className="py-12 text-center animate-fadeIn">
            <div className="relative inline-block mb-5">
              <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(58,123,213,.1)', border:'1px solid rgba(58,123,213,.2)', margin:'0 auto', animation:'pulse 3s ease-in-out infinite' }} />
              <div style={{ position:'absolute', inset:6, borderRadius:'50%', background:'rgba(58,123,213,.2)', animation:'pulse 3s ease-in-out infinite .5s' }} />
            </div>
            <div className="text-sm text-muted mb-1">Merhaba. Size nasıl yardımcı olabilirim?</div>
            <div className="text-xs text-muted2 mb-5">Takvim, hedefler, hava durumu ve daha fazlası için sorabilirsiniz.</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-surface2 text-xs text-muted cursor-pointer hover:border-border2 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {loading && (
          <div className="flex justify-start mb-3">
            <div style={{ padding:'12px 16px', borderRadius:'16px 16px 16px 4px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,.07)', display:'flex', gap:4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(232,237,245,.4)', animation:`pulse 1.2s ease-in-out infinite ${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 bg-surface border border-border rounded-2xl p-1">
        <div className="flex items-end gap-2 px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Bir şey sorun..."
            rows={1}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#e8edf5', fontSize:14, lineHeight:1.5, resize:'none', fontFamily:"'DM Sans',sans-serif", maxHeight:150, overflowY:'auto' }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ width:34, height:34, borderRadius:10, border:'none', background: input.trim() && !loading ? '#3a7bd5' : 'rgba(255,255,255,.08)', color:'#fff', cursor: input.trim() && !loading ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', flexShrink:0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div className="text-[10px] text-muted2 px-3 pb-2">Enter ile gönder · Shift+Enter yeni satır</div>
      </div>
    </div>
  );
}
