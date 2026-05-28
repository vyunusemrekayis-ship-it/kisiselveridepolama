import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';

const DEFAULT_NAV = [
  { id: 'home',     label: 'Giriş' },
  { id: 'calendar', label: 'Takvim' },
  { id: 'goals',    label: 'Hedefler' },
  { id: 'films',    label: 'Filmler' },
  { id: 'books',    label: 'Kitaplar' },
  { id: 'clock',    label: 'Kronometre' },
  { id: 'chain',    label: 'Zincir Kırma' },
  { id: 'weather',  label: 'Hava Durumu' },
  { id: 'ai',       label: 'Asistan' },
  { id: 'radar',    label: 'Yerel Radar' },
];

// Her sayfanın rengi tamamen farklı
const COLORS = {
  home:     '#60a5fa', // mavi
  calendar: '#f472b6', // pembe
  goals:    '#fb923c', // turuncu
  films:    '#a78bfa', // mor
  books:    '#34d399', // yeşil
  clock:    '#facc15', // sarı
  chain:    '#f87171', // kırmızı
  weather:  '#38bdf8', // açık mavi
  ai:       '#4ade80', // açık yeşil
  radar:    '#f472b6', // pembe
};

// CSS animasyon stilleri
const ANIM_STYLE = `
@keyframes spin-slow { to { transform: rotate(360deg); } }
@keyframes bounce-dot { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes pulse-ring { 0%,100% { opacity:.7; transform:scale(1); } 50% { opacity:1; transform:scale(1.15); } }
@keyframes flicker { 0%,100% { opacity:1; } 50% { opacity:.6; } }
@keyframes sway { 0%,100% { transform:rotate(-8deg); } 50% { transform:rotate(8deg); } }
@keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-2px); } }
@keyframes blink { 0%,90%,100% { opacity:1; } 95% { opacity:0; } }
`;
if (typeof document !== 'undefined' && !document.getElementById('gn-icon-anim')) {
  const s = document.createElement('style'); s.id = 'gn-icon-anim'; s.textContent = ANIM_STYLE; document.head.appendChild(s);
}

const ICONS = {
  // Ev — dolu çatı, kapıda ışık
  home: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 4l9 8" stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2.5" />
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2"
        fill={active ? color : 'rgba(232,237,245,.06)'} fillOpacity={active ? '.25' : '1'} />
      {active && (
        <rect x="10" y="15" width="4" height="5" rx="1"
          fill={color} opacity=".9"
          style={{ animation: 'flicker 2.5s ease-in-out infinite' }} />
      )}
    </svg>
  ),

  // Takvim — dolu gövde, bugün belirgin
  calendar: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2.5"
        fill={active ? color : 'rgba(232,237,245,.06)'}
        fillOpacity={active ? '.2' : '1'}
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2" />
      <rect x="3" y="5" width="18" height="5" rx="2.5"
        fill={active ? color : 'rgba(232,237,245,.15)'} fillOpacity={active ? '.5' : '1'} />
      <line x1="8" y1="3" x2="8" y2="7" stroke={active ? color : 'rgba(232,237,245,.5)'} strokeWidth="2.5" />
      <line x1="16" y1="3" x2="16" y2="7" stroke={active ? color : 'rgba(232,237,245,.5)'} strokeWidth="2.5" />
      {active ? (
        <rect x="7" y="13" width="4" height="4" rx="1"
          fill={color}
          style={{ animation: 'pulse-ring 1.8s ease-in-out infinite' }} />
      ) : (
        <rect x="7" y="13" width="4" height="4" rx="1" fill="rgba(232,237,245,.3)" />
      )}
      <rect x="13" y="13" width="4" height="4" rx="1" fill={active ? color : 'rgba(232,237,245,.15)'} opacity=".5" />
    </svg>
  ),

  // Hedef — dolu iç halka, dönen ok
  goals: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9"
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2"
        fill={active ? color : 'transparent'} fillOpacity={active ? '.12' : '1'} />
      <circle cx="12" cy="12" r="5"
        stroke={active ? color : 'rgba(232,237,245,.25)'} strokeWidth="1.5"
        fill={active ? color : 'transparent'} fillOpacity={active ? '.2' : '1'} />
      <circle cx="12" cy="12" r="2.5"
        fill={active ? color : 'rgba(232,237,245,.5)'}
        style={active ? { animation: 'pulse-ring 1.5s ease-in-out infinite' } : {}} />
      {active && (
        <g style={{ transformOrigin: '18px 6px', animation: 'spin-slow 3s linear infinite' }}>
          <line x1="18" y1="2" x2="18" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  ),

  // Film — dolu film şeridi, play animasyonu
  films: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2.5"
        fill={active ? color : 'rgba(232,237,245,.06)'}
        fillOpacity={active ? '.2' : '1'}
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2" />
      <rect x="2" y="7" width="20" height="3.5"
        fill={active ? color : 'rgba(232,237,245,.12)'} fillOpacity={active ? '.4' : '1'} />
      <line x1="7" y1="7" x2="7" y2="10.5" stroke={active ? color : 'rgba(232,237,245,.3)'} strokeWidth="1.5" />
      <line x1="12" y1="7" x2="12" y2="10.5" stroke={active ? color : 'rgba(232,237,245,.3)'} strokeWidth="1.5" />
      <line x1="17" y1="7" x2="17" y2="10.5" stroke={active ? color : 'rgba(232,237,245,.3)'} strokeWidth="1.5" />
      <polygon points="10,13 10,19 17,16"
        fill={active ? color : 'rgba(232,237,245,.35)'}
        style={active ? { animation: 'pulse-ring 1.6s ease-in-out infinite' } : {}} />
    </svg>
  ),

  // Kitap — dolu kapak, sayfalar animasyonlu
  books: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h7a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"
        fill={active ? color : 'rgba(232,237,245,.12)'} fillOpacity={active ? '.3' : '1'}
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="1.8" />
      <path d="M20 4h-7a1 1 0 00-1 1v14a1 1 0 001 1h7a1 1 0 001-1V5a1 1 0 00-1-1z"
        fill={active ? color : 'rgba(232,237,245,.06)'} fillOpacity={active ? '.18' : '1'}
        stroke={active ? color : 'rgba(232,237,245,.3)'} strokeWidth="1.8" />
      {active ? <>
        <line x1="5.5" y1="8" x2="9.5" y2="8" stroke={color} strokeWidth="1.5"
          style={{ animation: 'float 1.8s ease-in-out infinite' }} />
        <line x1="5.5" y1="11" x2="9.5" y2="11" stroke={color} strokeWidth="1.5" opacity=".7"
          style={{ animation: 'float 1.8s ease-in-out infinite .2s' }} />
        <line x1="5.5" y1="14" x2="8" y2="14" stroke={color} strokeWidth="1.5" opacity=".4"
          style={{ animation: 'float 1.8s ease-in-out infinite .4s' }} />
      </> : <>
        <line x1="5.5" y1="8" x2="9.5" y2="8" stroke="rgba(232,237,245,.3)" strokeWidth="1.5" />
        <line x1="5.5" y1="11" x2="9.5" y2="11" stroke="rgba(232,237,245,.2)" strokeWidth="1.5" />
      </>}
    </svg>
  ),

  // Kronometre — dönen ibre animasyonu
  clock: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="8.5"
        fill={active ? color : 'rgba(232,237,245,.06)'} fillOpacity={active ? '.18' : '1'}
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2" />
      <line x1="9" y1="2.5" x2="15" y2="2.5" stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="2.5" x2="12" y2="5" stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="8" x2="12" y2="13"
        stroke={active ? color : 'rgba(232,237,245,.6)'} strokeWidth="2.5" strokeLinecap="round"
        style={active ? { transformOrigin: '12px 13px', animation: 'spin-slow 2s linear infinite' } : {}} />
      <line x1="12" y1="13" x2="15.5" y2="15"
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="13" r="1.5" fill={active ? color : 'rgba(232,237,245,.5)'} />
    </svg>
  ),

  // Zincir — alev, titreşim animasyonu
  chain: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.5 7 7 9.5 7 12a5 5 0 0010 0c0-2.5-1.5-5-5-10z"
        fill={active ? color : 'rgba(232,237,245,.15)'} fillOpacity={active ? '.35' : '1'}
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="1.8"
        style={active ? { animation: 'flicker 1.5s ease-in-out infinite' } : {}} />
      <path d="M12 15c-2 0-3.5-1.5-3.5-3 0 2 1.5 3.5 3.5 5 2-1.5 3.5-3 3.5-5 0 1.5-1.5 3-3.5 3z"
        fill={active ? color : 'rgba(232,237,245,.4)'}
        style={active ? { animation: 'flicker 1.2s ease-in-out infinite .3s' } : {}} />
      {active && (
        <circle cx="12" cy="19" r="1.5" fill={color} opacity=".7"
          style={{ animation: 'bounce-dot 1s ease-in-out infinite' }} />
      )}
    </svg>
  ),

  // Hava Durumu — dönen güneş veya bulut
  weather: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g style={active ? { transformOrigin: '9px 9px', animation: 'spin-slow 6s linear infinite' } : {}}>
        <circle cx="9" cy="9" r="3.5"
          fill={active ? color : 'rgba(232,237,245,.2)'} fillOpacity={active ? '.5' : '1'}
          stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="1.8" />
        <line x1="9" y1="2" x2="9" y2="3.5" stroke={active ? color : 'rgba(232,237,245,.35)'} strokeWidth="2" />
        <line x1="9" y1="14.5" x2="9" y2="16" stroke={active ? color : 'rgba(232,237,245,.35)'} strokeWidth="2" />
        <line x1="2" y1="9" x2="3.5" y2="9" stroke={active ? color : 'rgba(232,237,245,.35)'} strokeWidth="2" />
        <line x1="14.5" y1="9" x2="16" y2="9" stroke={active ? color : 'rgba(232,237,245,.35)'} strokeWidth="2" />
        <line x1="4.1" y1="4.1" x2="5.2" y2="5.2" stroke={active ? color : 'rgba(232,237,245,.25)'} strokeWidth="1.8" />
        <line x1="12.8" y1="4.1" x2="13.9" y2="5.2" stroke={active ? color : 'rgba(232,237,245,.25)'} strokeWidth="1.8" />
      </g>
      <path d="M15 18H11a4.5 4.5 0 01-.5-9 4 4 0 017.5 1.5A3.5 3.5 0 0115 18z"
        fill={active ? color : 'rgba(232,237,245,.12)'} fillOpacity={active ? '.3' : '1'}
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="1.8"
        style={active ? { animation: 'float 2.5s ease-in-out infinite' } : {}} />
    </svg>
  ),

  // AI — göz kırpan robot
  ai: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="4"
        fill={active ? color : 'rgba(232,237,245,.06)'} fillOpacity={active ? '.2' : '1'}
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2" />
      <line x1="9" y1="2" x2="9" y2="6" stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2.5" />
      <line x1="15" y1="2" x2="15" y2="6" stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2.5" />
      <circle cx="9" cy="13" r="2"
        fill={active ? color : 'rgba(232,237,245,.4)'}
        style={active ? { animation: 'blink 3s ease-in-out infinite' } : {}} />
      <circle cx="15" cy="13" r="2"
        fill={active ? color : 'rgba(232,237,245,.4)'}
        style={active ? { animation: 'blink 3s ease-in-out infinite .4s' } : {}} />
      {active && (
        <path d="M8 17.5 Q12 19.5 16 17.5"
          stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round"
          style={{ animation: 'sway 2s ease-in-out infinite' }} />
      )}
    </svg>
  ),

  // Radar — sinyal halkaları, nabız animasyonu
  radar: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9"
        stroke={active ? color : 'rgba(232,237,245,.4)'} strokeWidth="2"
        fill={active ? color : 'transparent'} fillOpacity={active ? '.08' : '1'}
        style={active ? { animation: 'pulse-ring 2s ease-in-out infinite' } : {}} />
      <circle cx="12" cy="12" r="5.5"
        stroke={active ? color : 'rgba(232,237,245,.25)'} strokeWidth="1.5"
        fill={active ? color : 'transparent'} fillOpacity={active ? '.12' : '1'}
        style={active ? { animation: 'pulse-ring 2s ease-in-out infinite .5s' } : {}} />
      <circle cx="12" cy="12" r="2.5"
        fill={active ? color : 'rgba(232,237,245,.5)'}
        style={active ? { animation: 'pulse-ring 2s ease-in-out infinite 1s' } : {}} />
      {active && (
        <line x1="12" y1="3" x2="17" y2="8"
          stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity=".5"
          style={{ transformOrigin:'12px 12px', animation:'spin-slow 3s linear infinite' }} />
      )}
    </svg>
  ),
};

const LS_ORDER_KEY = 'gn_nav_order';

function loadOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_ORDER_KEY) || '[]');
    if (saved.length >= DEFAULT_NAV.length - 2) return [...new Set([...saved, ...DEFAULT_NAV.map(i => i.id)])].filter(id => DEFAULT_NAV.find(n => n.id === id));
  } catch {}
  return DEFAULT_NAV.map(i => i.id);
}

export default function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar, db } = useStore();
  const [order, setOrder] = useState(loadOrder);
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const badges = { films: db.f?.length, books: db.b?.length, goals: db.g?.length };
  const sortedItems = order.map(id => DEFAULT_NAV.find(n => n.id === id)).filter(Boolean);

  const onDragStart = (e, idx) => { dragItem.current = idx; setDragging(idx); e.dataTransfer.effectAllowed = 'move'; };
  const onDragEnter = (e, idx) => { dragOverItem.current = idx; setDragOver(idx); };
  const onDragEnd = () => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from !== null && to !== null && from !== to) {
      const newOrder = [...order];
      const [moved] = newOrder.splice(from, 1);
      newOrder.splice(to, 0, moved);
      setOrder(newOrder);
      localStorage.setItem(LS_ORDER_KEY, JSON.stringify(newOrder));
    }
    setDragging(null); setDragOver(null);
    dragItem.current = null; dragOverItem.current = null;
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 flex flex-col z-50 transition-all duration-300 ${sidebarCollapsed ? 'w-[58px]' : 'w-[220px]'}`}
      style={{ background: 'rgba(10,12,18,.95)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(255,255,255,.07)' }}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 border-b border-border ${sidebarCollapsed ? 'px-0 py-[18px] justify-center' : 'px-4 py-[18px]'}`}>
        <button onClick={toggleSidebar}
          className="bg-transparent border-0 text-muted cursor-pointer flex items-center justify-center flex-shrink-0 hover:text-text transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between flex-1">
            <h1 className="font-serif text-[15px] text-accent2 leading-tight">Günlüğüm</h1>
            <button
              onClick={() => setEditMode(e => !e)}
              title="Sıralamayı düzenle"
              className={`bg-transparent border-0 cursor-pointer text-[11px] px-2 py-0.5 rounded-md transition-all ${editMode ? 'text-accent bg-accent/10' : 'text-muted hover:text-text'}`}
            >{editMode ? 'Bitti' : '⠿'}</button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {editMode && !sidebarCollapsed && (
          <div className="text-[10px] text-muted/60 px-2 py-1.5 mb-1 text-center">Sürükleyerek sırala</div>
        )}

        {sortedItems.map((item, idx) => {
          const active = currentPage === item.id;
          const color = COLORS[item.id];
          const isDraggingThis = dragging === idx;
          const isDragOver = dragOver === idx && !isDraggingThis;

          return (
            <div
              key={item.id}
              draggable={editMode}
              onDragStart={e => onDragStart(e, idx)}
              onDragEnter={e => onDragEnter(e, idx)}
              onDragOver={e => e.preventDefault()}
              onDragEnd={onDragEnd}
              onClick={() => !editMode && setCurrentPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: sidebarCollapsed ? '10px 0' : '9px 10px',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                borderRadius: 12,
                marginBottom: 2,
                cursor: editMode ? 'grab' : 'pointer',
                opacity: isDraggingThis ? 0.35 : 1,
                transform: isDragOver ? 'translateY(2px)' : 'none',
                background: active && !editMode
                  ? `linear-gradient(105deg, ${color}22 0%, ${color}0a 100%)`
                  : isDragOver ? 'rgba(255,255,255,.04)' : 'transparent',
                borderLeft: !sidebarCollapsed && active && !editMode
                  ? `2px solid ${color}`
                  : '2px solid transparent',
                transition: 'all .15s ease',
                position: 'relative',
              }}
            >
              {editMode && !sidebarCollapsed && (
                <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 13, flexShrink: 0, userSelect: 'none' }}>⠿</span>
              )}

              {/* İkon kutusu */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: active && !editMode ? `${color}20` : 'rgba(255,255,255,.04)',
                border: `1px solid ${active && !editMode ? `${color}40` : 'rgba(255,255,255,.07)'}`,
                transition: 'all .2s ease',
                boxShadow: active && !editMode ? `0 0 12px ${color}30` : 'none',
              }}>
                {ICONS[item.id]?.(active && !editMode, color)}
              </div>

              {!sidebarCollapsed && (
                <>
                  <span style={{
                    flex: 1,
                    fontSize: 13,
                    color: active && !editMode ? color : 'rgba(232,237,245,.55)',
                    fontWeight: active && !editMode ? 500 : 400,
                    userSelect: 'none',
                    transition: 'color .15s',
                  }}>{item.label}</span>

                  {!editMode && badges[item.id] != null && badges[item.id] > 0 && (
                    <span style={{
                      fontSize: 11,
                      padding: '1px 7px',
                      borderRadius: 10,
                      background: active ? `${color}25` : 'rgba(255,255,255,.06)',
                      color: active ? color : 'rgba(232,237,245,.35)',
                      flexShrink: 0,
                    }}>{badges[item.id]}</span>
                  )}
                </>
              )}

              {/* Collapsed aktif göstergesi */}
              {sidebarCollapsed && active && (
                <div style={{
                  position: 'absolute', right: 0, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3, height: 20, borderRadius: '2px 0 0 2px',
                  background: color,
                }} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-border flex items-center ${sidebarCollapsed ? 'justify-center p-[10px]' : 'justify-end px-4 py-[10px]'}`}>
        <button
          onClick={() => { if (confirm('Çıkış yapmak istediğinize emin misiniz?')) window._fbSignOut?.(window._fbAuth); }}
          className="bg-transparent border border-border rounded-lg text-muted cursor-pointer p-[5px] flex items-center hover:border-red-500/40 hover:text-red-400 transition-colors"
          title="Çıkış Yap"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
