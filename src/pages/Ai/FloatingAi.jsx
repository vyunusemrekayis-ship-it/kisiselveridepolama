import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { AI_TOOLS, executeTool } from '../../lib/aiTools';

const MESSAGES_KEY = 'gn_ai_messages';
function loadMessages() { try { return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]'); } catch { return []; } }
function saveMessages(msgs) { localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs.slice(-100))); }

function buildSystemPrompt(db, userProfile) {
  const today = new Date();
  const mem = JSON.parse(localStorage.getItem('gn_ai_memory') || '[]');
  const memStr = mem.length ? '\n\nKalıcı Bellek:\n' + mem.map(m => `- ${m.note} (${m.date})`).join('\n') : '';
  return `Sen "${userProfile?.name || 'Kullanıcı'}" adlı kişinin kişisel dijital günlük asistanısın.
Bugün: ${today.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Film: ${db.f?.length || 0} | Kitap: ${db.b?.length || 0} | Hedef: ${db.g?.length || 0}
${memStr}
Yeteneklerin: takvim/görev/not/film/kitap/hedef/alışkanlık/finans verilerine erişim, internet araştırması (web_search), yeni görev/not/işlem ekleme.
Finans soruları için get_finance_summary, get_finance_month, get_subscriptions, get_credit_cards, get_category_spending, get_investments araçlarını kullan.
İnternetten bilgi istendiğinde web_search kullan.
Türkçe konuş. Samimi, akıllı ve kişisel ol.
Sadece asistan değil, dijital bir arkadaşsın — şaka yapabilir, laf sokabilir, konuyu sorgulayabilirsin.
Kullanıcı konuyu değiştirirse hemen adapte ol. Bazen sen de soru sor. Robotik değil, insan gibi ol.`;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'tr-TR'; utt.rate = 1.05;
  const trVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('tr'));
  if (trVoice) utt.voice = trVoice;
  window.speechSynthesis.speak(utt);
}
function stopSpeak() { window.speechSynthesis?.cancel(); }

function useSpeechRecognition(onResult) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Tarayıcınız sesli girişi desteklemiyor.');
    const rec = new SR(); rec.lang = 'tr-TR'; rec.interimResults = false;
    rec.onresult = e => onResult(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  };
  const stop = () => { recRef.current?.stop(); setListening(false); };
  return { listening, start, stop };
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div style={{ maxWidth:'85%', padding:'8px 12px', borderRadius: isUser ? '14px 14px 3px 14px' : '14px 14px 14px 3px', background: isUser ? 'rgba(58,123,213,0.2)' : 'rgba(255,255,255,0.06)', border:`1px solid ${isUser ? 'rgba(58,123,213,.3)' : 'rgba(255,255,255,.08)'}`, fontSize:13, lineHeight:1.55, color:'#e8edf5', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function FloatingAi() {
  const store = useStore();
  const { db, userProfile } = store;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadMessages());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [toolActivity, setToolActivity] = useState('');

  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  const scroll = () => setTimeout(() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' }), 50);

  useEffect(() => {
    const handler = () => setMessages(loadMessages());
    window.addEventListener('gn_ai_updated', handler);
    return () => window.removeEventListener('gn_ai_updated', handler);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
  }, []);

  const { listening, start: startListen, stop: stopListen } = useSpeechRecognition(text => {
    setInput(text);
    setTimeout(() => sendMsg(text), 100);
  });

  const sendMsg = async (overrideText) => {
    const userText = (overrideText ?? input).trim();
    if (!userText || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    saveMessages(newMessages);
    setLoading(true);
    setToolActivity('');
    scroll();

    try {
      if (!window.ANTHROPIC_KEY && window.loadApiKey) await window.loadApiKey();
      if (!window.ANTHROPIC_KEY) {
        const err = [...newMessages, { role: 'assistant', content: 'API anahtarı bulunamadı.' }];
        setMessages(err); saveMessages(err); setLoading(false); return;
      }

      const headers = { 'Content-Type': 'application/json', 'x-api-key': window.ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
      const summary = store.getAiSummary();
      const recentCount = summary ? 20 : 30;
      let apiMessages = newMessages.slice(-recentCount).map(m => ({ role: m.role, content: m.content }));

      let response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers,
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system: buildSystemPrompt(db, userProfile), tools: AI_TOOLS, messages: apiMessages }),
      });
      let data = await response.json();

      while (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter(b => b.type === 'tool_use');
        setToolActivity(toolUses.map(t => t.name === 'web_search' ? '🔍 İnternette arıyor...' : '⚙️ Veri alıyor...').join(' '));
        const toolResults = toolUses.map(t => ({ type: 'tool_result', tool_use_id: t.id, content: executeTool(t.name, t.input, store) }));
        apiMessages = [...apiMessages, { role: 'assistant', content: data.content }, { role: 'user', content: toolResults }];
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers,
          body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system: buildSystemPrompt(db, userProfile), tools: AI_TOOLS, messages: apiMessages }),
        });
        data = await response.json();
        setToolActivity('');
      }

      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      const finalMessages = [...newMessages, { role: 'assistant', content: text }];
      setMessages(finalMessages);
      saveMessages(finalMessages);
      window.dispatchEvent(new Event('gn_ai_updated'));
      scroll();
      if (ttsEnabled) speak(text);
    } catch (e) {
      const err = [...newMessages, { role: 'assistant', content: 'Bağlantı hatası: ' + e.message }];
      setMessages(err); saveMessages(err);
    }
    setLoading(false);
    setToolActivity('');
  };

  const clearMessages = () => { setMessages([]); saveMessages([]); stopSpeak(); window.dispatchEvent(new Event('gn_ai_updated')); };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[998]" style={{ background: 'rgba(0,0,0,.35)' }} onClick={() => { setOpen(false); stopSpeak(); }} />
      )}

      {open && (
        <div className="fixed z-[999] flex flex-col" style={{ bottom:80, right:20, width:360, maxWidth:'calc(100vw - 32px)', height:520, maxHeight:'calc(100vh - 120px)', background:'rgba(16,19,28,.97)', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, boxShadow:'0 24px 64px rgba(0,0,0,.6)', animation:'slideUp .2s ease' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#237F52', animation:'pulse 2s infinite', boxShadow:'0 0 8px rgba(35,127,82,.5)' }} />
              <span className="text-sm font-medium text-text">Asistan</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setTtsEnabled(v => !v); if (ttsEnabled) stopSpeak(); }} title={ttsEnabled ? 'Sesi kapat' : 'Sesi aç'} className="bg-transparent border-0 cursor-pointer p-1 rounded-lg hover:bg-surface2 transition-colors" style={{ color: ttsEnabled ? '#3a7bd5' : 'rgba(232,237,245,.3)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {ttsEnabled ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></> : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>}
                </svg>
              </button>
              {messages.length > 0 && (
                <button onClick={clearMessages} className="text-[11px] text-muted hover:text-red-400 cursor-pointer bg-transparent border-0">Temizle</button>
              )}
              <button onClick={() => { setOpen(false); stopSpeak(); }} className="bg-transparent border-0 text-muted cursor-pointer text-lg leading-none hover:text-text">×</button>
            </div>
          </div>

          <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
            {messages.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 16px', color:'rgba(232,237,245,.3)', fontSize:13 }}>
                <div style={{ marginBottom:8 }}>Merhaba{userProfile?.name ? ', ' + userProfile.name.split(' ')[0] : ''} 👋</div>
                <div style={{ fontSize:11 }}>Finans, hedefler, takvim ve daha fazlasını sor</div>
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {toolActivity && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:10, background:'rgba(58,123,213,.08)', border:'1px solid rgba(58,123,213,.15)', fontSize:11, color:'rgba(232,237,245,.5)', marginBottom:8 }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:'#3a7bd5', animation:'pulse 1s infinite' }} />
                {toolActivity}
              </div>
            )}
            {loading && !toolActivity && (
              <div style={{ display:'flex', gap:4, padding:'10px 12px', borderRadius:'12px 12px 12px 3px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.07)', width:'fit-content', marginBottom:8 }}>
                {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'rgba(232,237,245,.4)', animation:`pulse 1.2s ease-in-out infinite ${i*0.2}s` }} />)}
              </div>
            )}
          </div>

          <div style={{ padding:'8px 12px', borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <input
              ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMsg(); }}
              placeholder="Mesaj yaz..."
              style={{ flex:1, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'7px 12px', color:'#e8edf5', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif" }}
            />
            <button onClick={listening ? stopListen : startListen} style={{ width:30, height:30, borderRadius:8, border:'none', background: listening ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.08)', color: listening ? '#f87171' : 'rgba(232,237,245,.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, animation: listening ? 'pulse 1s infinite' : 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="2.2" fill="rgba(232,237,245,.12)" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="12" cy="12" r="0.9" fill="currentColor"/>
                <circle cx="5" cy="5" r="1.9" fill="rgba(232,237,245,.06)" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="19" cy="5" r="1.9" fill="rgba(232,237,245,.06)" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="5" cy="19" r="1.9" fill="rgba(232,237,245,.06)" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="19" cy="19" r="1.9" fill="rgba(232,237,245,.06)" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="12" cy="2.8" r="1.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.9"/>
                <circle cx="21.2" cy="12" r="1.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.9"/>
                <circle cx="12" cy="21.2" r="1.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.9"/>
                <circle cx="2.8" cy="12" r="1.4" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.9"/>
                <line x1="12" y1="9.8" x2="6.8" y2="6.8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
                <line x1="12" y1="9.8" x2="17.2" y2="6.8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
                <line x1="12" y1="14.2" x2="6.8" y2="17.2" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
                <line x1="12" y1="14.2" x2="17.2" y2="17.2" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
                <line x1="12" y1="9.8" x2="12" y2="4.2" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25"/>
                <line x1="14.2" y1="12" x2="19.8" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25"/>
                <line x1="12" y1="14.2" x2="12" y2="19.8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25"/>
                <line x1="9.8" y1="12" x2="4.2" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25"/>
                <line x1="6.8" y1="6.8" x2="4.2" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.12"/>
                <line x1="17.2" y1="6.8" x2="19.8" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.12"/>
                <line x1="6.8" y1="17.2" x2="4.2" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.12"/>
                <line x1="17.2" y1="17.2" x2="19.8" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.12"/>
              </svg>
            </button>
            <button onClick={() => sendMsg()} disabled={!input.trim() || loading} style={{ width:30, height:30, borderRadius:8, border:'none', background: input.trim() && !loading ? '#3a7bd5' : 'rgba(255,255,255,.06)', color: input.trim() && !loading ? '#fff' : 'rgba(232,237,245,.2)', cursor: input.trim() && !loading ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="fixed z-[997] flex items-center justify-center"
        style={{ bottom:20, right:20, width:52, height:52, borderRadius:'50%', background: open ? '#222' : '#3a7bd5', border:'1px solid rgba(255,255,255,.15)', boxShadow:'0 4px 20px rgba(0,0,0,.4)', cursor:'pointer', transition:'all .2s' }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="2.2" fill="rgba(255,255,255,.15)" stroke="white" strokeWidth="1.2"/>
            <circle cx="12" cy="12" r="0.9" fill="white"/>
            <circle cx="5" cy="5" r="1.9" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="1.1"/>
            <circle cx="19" cy="5" r="1.9" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="1.1"/>
            <circle cx="5" cy="19" r="1.9" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="1.1"/>
            <circle cx="19" cy="19" r="1.9" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="1.1"/>
            <circle cx="12" cy="2.8" r="1.4" fill="rgba(255,255,255,.5)" stroke="white" strokeWidth="0.9"/>
            <circle cx="21.2" cy="12" r="1.4" fill="rgba(255,255,255,.5)" stroke="white" strokeWidth="0.9"/>
            <circle cx="12" cy="21.2" r="1.4" fill="rgba(255,255,255,.5)" stroke="white" strokeWidth="0.9"/>
            <circle cx="2.8" cy="12" r="1.4" fill="rgba(255,255,255,.5)" stroke="white" strokeWidth="0.9"/>
            <line x1="12" y1="9.8" x2="6.8" y2="6.8" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
            <line x1="12" y1="9.8" x2="17.2" y2="6.8" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
            <line x1="12" y1="14.2" x2="6.8" y2="17.2" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
            <line x1="12" y1="14.2" x2="17.2" y2="17.2" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
            <line x1="12" y1="9.8" x2="12" y2="4.2" stroke="white" strokeWidth="1" strokeOpacity="0.28"/>
            <line x1="14.2" y1="12" x2="19.8" y2="12" stroke="white" strokeWidth="1" strokeOpacity="0.28"/>
            <line x1="12" y1="14.2" x2="12" y2="19.8" stroke="white" strokeWidth="1" strokeOpacity="0.28"/>
            <line x1="9.8" y1="12" x2="4.2" y2="12" stroke="white" strokeWidth="1" strokeOpacity="0.28"/>
            <line x1="6.8" y1="6.8" x2="4.2" y2="12" stroke="white" strokeWidth="1" strokeOpacity="0.13"/>
            <line x1="17.2" y1="6.8" x2="19.8" y2="12" stroke="white" strokeWidth="1" strokeOpacity="0.13"/>
            <line x1="6.8" y1="17.2" x2="4.2" y2="12" stroke="white" strokeWidth="1" strokeOpacity="0.13"/>
            <line x1="17.2" y1="17.2" x2="19.8" y2="12" stroke="white" strokeWidth="1" strokeOpacity="0.13"/>
          </svg>
        )}
      </button>
    </>
  );
}
