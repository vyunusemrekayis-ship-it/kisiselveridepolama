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
};

// Daha sade, net, tanınabilir ikonlar
const ICONS = {
  // Ev — klasik çatı + kapı
  home: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 4l9 8" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}20` : 'none'} />
    </svg>
  ),
  // Takvim — grid + kırmızı üst bar
  calendar: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}15` : 'none'} />
      <path d="M3 10h18" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="8" y1="3" x2="8" y2="7" stroke={active ? color : 'currentColor'} strokeWidth="2.5" />
      <line x1="16" y1="3" x2="16" y2="7" stroke={active ? color : 'currentColor'} strokeWidth="2.5" />
      {active && <>
        <rect x="7" y="13" width="3" height="3" rx="0.5" fill={color} opacity=".8" />
        <rect x="14" y="13" width="3" height="3" rx="0.5" fill={color} opacity=".5" />
      </>}
    </svg>
  ),
  // Hedef — ok + hedef merkezi
  goals: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}10` : 'none'} />
      <circle cx="12" cy="12" r="5"
        stroke={active ? color : 'currentColor'} strokeWidth="1.5"
        fill={active ? `${color}15` : 'none'} />
      <circle cx="12" cy="12" r="2" fill={active ? color : 'currentColor'} />
      {active && <>
        <line x1="12" y1="3" x2="12" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="21" y1="12" x2="18" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>}
    </svg>
  ),
  // Film — klasik klapör
  films: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}15` : 'none'} />
      <path d="M2 7l4-4h12l4 4"
        stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="7" y1="3" x2="7" y2="7" stroke={active ? color : 'currentColor'} strokeWidth="1.5" />
      <line x1="12" y1="3" x2="12" y2="7" stroke={active ? color : 'currentColor'} strokeWidth="1.5" />
      <line x1="17" y1="3" x2="17" y2="7" stroke={active ? color : 'currentColor'} strokeWidth="1.5" />
      {active && <polygon points="10,12 10,18 16,15" fill={color} opacity=".8" />}
    </svg>
  ),
  // Kitap — açık sayfa + yazı çizgileri
  books: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2z"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}15` : 'none'} />
      <path d="M12 20V6a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2h-6a2 2 0 01-2-2z"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}10` : 'none'} />
      {active && <>
        <line x1="5" y1="9" x2="9" y2="9" stroke={color} strokeWidth="1.5" opacity=".8" />
        <line x1="5" y1="12" x2="9" y2="12" stroke={color} strokeWidth="1.5" opacity=".6" />
        <line x1="15" y1="9" x2="19" y2="9" stroke={color} strokeWidth="1.5" opacity=".8" />
        <line x1="15" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1.5" opacity=".6" />
      </>}
    </svg>
  ),
  // Kronometre — yuvarlak + akrep + start düğmesi üstte
  clock: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="8"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}15` : 'none'} />
      <line x1="12" y1="9" x2="12" y2="13" stroke={active ? color : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="13" x2="15" y2="15" stroke={active ? color : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="3" x2="15" y2="3" stroke={active ? color : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="3" x2="12" y2="5" stroke={active ? color : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {active && <circle cx="12" cy="13" r="1.5" fill={color} />}
    </svg>
  ),
  // Zincir kırma — takvim + ateş (alışkanlık streak)
  chain: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C9 6 7 8 7 11a5 5 0 0010 0c0-3-2-5-5-9z"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}20` : 'none'} />
      <path d="M12 14c-1.5 0-3-1-3-3 0 1.5 1.5 3 3 4.5C13.5 14 15 12.5 15 11c0 2-1.5 3-3 3z"
        fill={active ? color : 'currentColor'} opacity={active ? '.8' : '.4'} />
      {active && <circle cx="12" cy="18" r="1.5" fill={color} opacity=".6" />}
    </svg>
  ),
  // Hava Durumu — güneş + bulut
  weather: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="3"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}20` : 'none'} />
      <line x1="9" y1="3" x2="9" y2="1.5" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="9" y1="15" x2="9" y2="16.5" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="3" y1="9" x2="1.5" y2="9" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="15" y1="9" x2="16.5" y2="9" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="4.9" y1="4.9" x2="3.8" y2="3.8" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="13.1" y1="4.9" x2="14.2" y2="3.8" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <path d="M14 16h-1a4 4 0 10-1-7.9A4.5 4.5 0 1014 16z"
        stroke={active ? color : 'currentColor'} strokeWidth="1.8"
        fill={active ? `${color}15` : 'none'} />
    </svg>
  ),
  // AI Asistan — beyin / robot yüz
  ai: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="12" rx="4"
        stroke={active ? color : 'currentColor'} strokeWidth="2"
        fill={active ? `${color}15` : 'none'} />
      <circle cx="9" cy="12" r="1.5" fill={active ? color : 'currentColor'} />
      <circle cx="15" cy="12" r="1.5" fill={active ? color : 'currentColor'} />
      <line x1="9" y1="3" x2="9" y2="6" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="15" y1="3" x2="15" y2="6" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="9" y1="18" x2="9" y2="21" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      <line x1="15" y1="18" x2="15" y2="21" stroke={active ? color : 'currentColor'} strokeWidth="2" />
      {active && <path d="M9 12h6" stroke={color} strokeWidth="1.5" opacity=".5" />}
    </svg>
  ),
};

const LS_ORDER_KEY = 'gn_nav_order';

function loadOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_ORDER_KEY) || '[]');
    if (saved.length === DEFAULT_NAV.length) return saved;
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
