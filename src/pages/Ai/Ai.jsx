import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { calcChainStreak } from '../../lib/utils';
import { AI_TOOLS, executeTool } from '../../lib/aiTools';

const MESSAGES_KEY = 'gn_ai_messages';
function loadMessages() { try { return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]'); } catch { return []; } }
function saveMessages(msgs) { localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs.slice(-100))); }

function getDailyContext(db, store) {
  const today = new Date().toISOString().split('T')[0];
  const todos = store.getTodos();
  const todayTodos = todos[today] || [];
  const done = todayTodos.filter(t => t.done).length;
  const total = todayTodos.length;
  const chains = store.getChains();
  const streaks = chains.map(ch => { const { streak } = calcChainStreak(ch); return `${ch.name}: ${streak} gün`; });
  const activeGoals = (db.g || []).filter(g => !g.done);
  const parts = [];
  if (total > 0) parts.push(`Bugün ${done}/${total} görev tamamlandı`);
  if (streaks.length > 0) parts.push(`Alışkanlıklar: ${streaks.slice(0,3).join(', ')}`);
  if (activeGoals.length > 0) parts.push(`${activeGoals.length} aktif hedef var`);
  return parts.length > 0 ? '\n\nGünlük Durum:\n' + parts.join('\n') : '';
}

function analyzeTone(messages) {
  const recentUserMsgs = messages.filter(m => m.role === 'user').slice(-5).map(m => m.content).join(' ');
  const wordCount = recentUserMsgs.split(' ').length;
  const hasQuestionMarks = (recentUserMsgs.match(/\?/g) || []).length;
  const stressWords = ['stres', 'yorgun', 'zor', 'kötü', 'sıkıldım', 'bunaldım', 'sinir'];
  const energyWords = ['harika', 'süper', 'mükemmel', 'güzel', 'iyi', 'başardım', 'yaptım'];
  const isStressed = stressWords.some(w => recentUserMsgs.toLowerCase().includes(w));
  const isEnergetic = energyWords.some(w => recentUserMsgs.toLowerCase().includes(w));
  const isShort = wordCount < 15;
  const isCurious = hasQuestionMarks > 2;
  if (isStressed) return 'Kullanıcı stresli görünüyor — empatik ve sakinleştirici ol.';
  if (isEnergetic) return 'Kullanıcı enerjik — aynı enerjiyle karşılık ver.';
  if (isShort) return 'Kullanıcı kısa yazıyor — sen de kısa ve net cevap ver.';
  if (isCurious) return 'Kullanıcı meraklı — detaylı ve bilgilendirici ol.';
  return '';
}

function buildSystemPrompt(db, userProfile, store, messages) {
  const today = new Date();
  const mem = JSON.parse(localStorage.getItem('gn_ai_memory') || '[]');
  const memStr = mem.length ? '\n\nKalıcı Bellek:\n' + mem.map(m => `- ${m.note} (${m.date})`).join('\n') : '';
  const profile = store.getAiProfile();
  const profileStr = Object.keys(profile).length > 0 ? '\n\nKullanıcı Profili:\n' + Object.entries(profile).map(([k,v]) => `- ${k}: ${v}`).join('\n') : '';
  const summary = store.getAiSummary();
  const summaryStr = summary ? '\n\nÖnceki Konuşmaların Özeti:\n' + summary : '';
  const dailyCtx = getDailyContext(db, store);
  const toneHint = messages.length > 2 ? analyzeTone(messages) : '';
  const toneStr = toneHint ? '\n\nTon: ' + toneHint : '';
  return `Sen "${userProfile?.name || 'Kullanıcı'}" adlı kişinin kişisel dijital günlük asistanısın.
Bugün: ${today.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Film: ${db.f?.length || 0} | Kitap: ${db.b?.length || 0} | Hedef: ${db.g?.length || 0}
${profileStr}${memStr}${summaryStr}${dailyCtx}${toneStr}

Yeteneklerin: takvim/görev/not/film/kitap/hedef/alışkanlık/finans verilerine erişim, internet araştırması (web_search), yeni görev/not/işlem ekleme.
İnternetten bilgi istendiğinde (araştır, bul, haber, güncel) web_search kullan ve sonuçları özetle.
Finans soruları için get_finance_summary, get_finance_month, get_subscriptions, get_credit_cards, get_category_spending, get_investments araçlarını kullan.
Konuşmada kullanıcı hakkında yeni bir şey öğrenirsen (şehir, meslek, ilgi alanı, rutin) save_memory ile kaydet.
Türkçe konuş. Samimi, akıllı ve kişisel ol.
Sadece asistan değil, dijital bir arkadaşsın — şaka yapabilir, laf sokabilir, konuyu sorgulayabilirsin.
Kullanıcı konuyu değiştirirse hemen adapte ol, eski konuya takılma.
Bazen sen de soru sor, merak et. Robotik değil, insan gibi ol.`;
}

async function callAI(messages, db, userProfile, store, onActivity) {
  if (!window.ANTHROPIC_KEY && window.loadApiKey) await window.loadApiKey();
  if (!window.ANTHROPIC_KEY) throw new Error('API anahtarı bulunamadı.');
  const headers = { 'Content-Type': 'application/json', 'x-api-key': window.ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
  const summary = store.getAiSummary();
  const recentCount = summary ? 20 : 30;
  let apiMessages = messages.slice(-recentCount).map(m => ({ role: m.role, content: m.content }));
  const system = buildSystemPrompt(db, userProfile, store, messages);
  let response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system, tools: AI_TOOLS, messages: apiMessages }) });
  let data = await response.json();
  while (data.stop_reason === 'tool_use') {
    const toolUses = data.content.filter(b => b.type === 'tool_use');
    if (onActivity) onActivity(toolUses.map(t => t.name === 'web_search' ? '🔍 İnternette arıyor...' : '⚙️ Veri alıyor...').join(' '));
    const toolResults = toolUses.map(t => ({ type: 'tool_result', tool_use_id: t.id, content: executeTool(t.name, t.input, store) }));
    apiMessages = [...apiMessages, { role: 'assistant', content: data.content }, { role: 'user', content: toolResults }];
    response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system, tools: AI_TOOLS, messages: apiMessages }) });
    data = await response.json();
    if (onActivity) onActivity('');
  }
  return data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
}

async function summarizeIfNeeded(messages, store) {
  if (messages.length % 20 !== 0 || messages.length === 0 || !window.ANTHROPIC_KEY) return;
  try {
    const headers = { 'Content-Type': 'application/json', 'x-api-key': window.ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    const lastMsgs = messages.slice(-20).map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${m.content}`).join('\n');
    const prevSummary = store.getAiSummary();
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: `Aşağıdaki konuşmayı 3-5 madde halinde özetle. Sadece özeti yaz.\n\n${prevSummary ? 'Önceki özet:\n' + prevSummary + '\n\n' : ''}Son konuşma:\n${lastMsgs}` }] }) });
    const data = await res.json();
    const summary = data.content?.[0]?.text || '';
    if (summary) store.setAiSummary(summary);
  } catch(e) { console.warn('Özet hatası:', e); }
}

async function updateProfileIfNeeded(messages, store) {
  if (messages.length % 10 !== 0 || messages.length === 0 || !window.ANTHROPIC_KEY) return;
  try {
    const headers = { 'Content-Type': 'application/json', 'x-api-key': window.ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    const userMsgs = messages.filter(m => m.role === 'user').slice(-10).map(m => m.content).join('\n');
    const existingProfile = store.getAiProfile();
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, messages: [{ role: 'user', content: `Kullanıcının mesajlarından onun hakkında öğrenilebilecek bilgileri JSON olarak çıkar.\nMevcut profil: ${JSON.stringify(existingProfile)}\nYeni mesajlar: ${userMsgs}\n\nSadece JSON döndür. Örnek: {"şehir": "Trabzon", "meslek": "öğrenci"}\nYeni bilgi yoksa mevcut profili döndür.` }] }) });
    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';
    try { const newProfile = JSON.parse(text.replace(/```json|```/g, '').trim()); if (Object.keys(newProfile).length > 0) store.setAiProfile(newProfile); } catch {}
  } catch(e) { console.warn('Profil güncelleme hatası:', e); }
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

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div style={{ maxWidth:'75%', padding:'10px 14px', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isUser ? 'rgba(58,123,213,0.2)' : 'rgba(255,255,255,0.05)', border:`1px solid ${isUser ? 'rgba(58,123,213,.3)' : 'rgba(255,255,255,.07)'}`, fontSize:14, lineHeight:1.6, color:'#e8edf5', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function Ai() {
  const store = useStore();
  const { db, userProfile } = store;
  const [messages, setMessages] = useState(() => loadMessages());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [toolActivity, setToolActivity] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
  }, []);

  useEffect(() => {
    const handler = () => setMessages(loadMessages());
    window.addEventListener('gn_ai_updated', handler);
    return () => window.removeEventListener('gn_ai_updated', handler);
  }, []);

  const scroll = () => setTimeout(() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' }), 50);

  const { listening, start: startListen, stop: stopListen } = useSpeechRecognition(text => {
    setInput(text); setTimeout(() => send(text), 100);
  });

  const send = async (overrideText) => {
    const userText = (overrideText ?? input).trim();
    if (!userText || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages); saveMessages(newMessages);
    setLoading(true); setToolActivity(''); scroll();
    try {
      const text = await callAI(newMessages, db, userProfile, store, (activity) => setToolActivity(activity));
      const finalMessages = [...newMessages, { role: 'assistant', content: text }];
      setMessages(finalMessages); saveMessages(finalMessages);
      window.dispatchEvent(new Event('gn_ai_updated'));
      scroll();
      if (ttsEnabled) speak(text);
      summarizeIfNeeded(finalMessages, store);
      updateProfileIfNeeded(finalMessages, store);
    } catch(e) {
      const err = [...newMessages, { role: 'assistant', content: 'Hata: ' + e.message }];
      setMessages(err); saveMessages(err);
    }
    setLoading(false); setToolActivity('');
  };

  const clearMessages = () => { setMessages([]); saveMessages([]); stopSpeak(); window.dispatchEvent(new Event('gn_ai_updated')); };

  const profile = store.getAiProfile();
  const summary = store.getAiSummary();
  const hasProfileData = Object.keys(profile).length > 0 || !!summary;

  const SUGGESTIONS = ['Bugün planım ne?', 'Bu hafta hedeflerim?', 'Bu ay ne kadar harcadım?', 'Aboneliklerim kaç lira?', 'Güncel haberler?'];

  return (
    <div className="flex flex-col animate-fadeIn" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#237F52', animation:'pulse 2s infinite', boxShadow:'0 0 8px rgba(35,127,82,.5)' }} />
          <span className="section-title text-base">Asistan</span>
          {hasProfileData && (
            <button onClick={() => setShowProfile(v => !v)} className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted hover:text-text transition-colors bg-transparent cursor-pointer">
              {showProfile ? 'gizle' : 'profil'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setTtsEnabled(v => !v); if (ttsEnabled) stopSpeak(); }} title={ttsEnabled ? 'Sesi kapat' : 'Sesi aç'} className="bg-transparent border-0 cursor-pointer p-1 rounded-lg hover:bg-surface2 transition-colors" style={{ color: ttsEnabled ? '#3a7bd5' : 'rgba(232,237,245,.3)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ttsEnabled ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></> : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>}
            </svg>
          </button>
          {messages.length > 0 && (
            <button onClick={clearMessages} className="text-xs text-muted hover:text-red-400 cursor-pointer bg-transparent border-0 flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              Temizle
            </button>
          )}
        </div>
      </div>

      {showProfile && hasProfileData && (
        <div className="mb-4 p-3 rounded-xl border border-border bg-surface2 animate-slideUp text-xs">
          {Object.keys(profile).length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-muted2 mb-1">Öğrendikleri</div>
              {Object.entries(profile).map(([k,v]) => (
                <div key={k} className="flex gap-2 mb-0.5"><span className="text-muted2">{k}:</span><span className="text-text">{String(v)}</span></div>
              ))}
            </div>
          )}
          {summary && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted2 mb-1">Konuşma Özeti</div>
              <div className="text-muted leading-relaxed">{summary}</div>
            </div>
          )}
        </div>
      )}

      <div ref={messagesRef} className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 && (
          <div className="py-12 text-center animate-fadeIn">
            <div className="relative inline-block mb-5">
              <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(58,123,213,.1)', border:'1px solid rgba(58,123,213,.2)', margin:'0 auto', animation:'pulse 3s ease-in-out infinite' }} />
              <div style={{ position:'absolute', inset:6, borderRadius:'50%', background:'rgba(58,123,213,.2)', animation:'pulse 3s ease-in-out infinite .5s' }} />
            </div>
            <div className="text-sm text-muted mb-1">Merhaba{userProfile?.name ? ', ' + userProfile.name.split(' ')[0] : ''}.</div>
            <div className="text-xs text-muted2 mb-5">Takvim, hedefler, finans, internet araştırması ve daha fazlası.</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="px-3 py-1.5 rounded-xl border border-border bg-surface2 text-xs text-muted cursor-pointer hover:border-border2 transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {toolActivity && (
          <div className="flex justify-start mb-2">
            <div style={{ padding:'8px 12px', borderRadius:'12px', background:'rgba(58,123,213,0.08)', border:'1px solid rgba(58,123,213,.15)', fontSize:12, color:'rgba(232,237,245,.5)', display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#3a7bd5', animation:'pulse 1s infinite' }} />
              {toolActivity}
            </div>
          </div>
        )}
        {loading && !toolActivity && (
          <div className="flex justify-start mb-3">
            <div style={{ padding:'12px 16px', borderRadius:'16px 16px 16px 4px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,.07)', display:'flex', gap:4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(232,237,245,.4)', animation:`pulse 1.2s ease-in-out infinite ${i*0.2}s` }} />)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 bg-surface border border-border rounded-2xl p-1">
        <div className="flex items-end gap-2 px-3 py-2">
          <textarea
            ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Bir şey sorun... (Enter: gönder, Shift+Enter: yeni satır)"
            rows={1}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#e8edf5', fontSize:14, lineHeight:1.5, resize:'none', fontFamily:"'DM Sans',sans-serif", maxHeight:150, overflowY:'auto' }}
          />
          <button onClick={listening ? stopListen : startListen} title={listening ? 'Durdur' : 'Sesli konuş'} style={{ width:34, height:34, borderRadius:10, border:'none', flexShrink:0, background: listening ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.08)', color: listening ? '#f87171' : 'rgba(232,237,245,.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', animation: listening ? 'pulse 1s infinite' : 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
          <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width:34, height:34, borderRadius:10, border:'none', flexShrink:0, background: input.trim() && !loading ? '#3a7bd5' : 'rgba(255,255,255,.06)', color: input.trim() && !loading ? '#fff' : 'rgba(232,237,245,.25)', cursor: input.trim() && !loading ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
