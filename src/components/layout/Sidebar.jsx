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
  { id: 'radar',    label: 'Yerel Gelişmeler' },
  { id: 'finance',  label: 'Finans' },
];

const COLOR = '#00C2FF';

const ICONS = {
  // Giriş — Set 3 katmanlar
  home: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 12l10 5 10-5"/>
      <path d="M2 17l10 5 10-5"/>
    </svg>
  ),

  // Takvim — spiral halka
  calendar: (active) => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="7" width="22" height="20" rx="2"/>
      <path d="M5 14h22"/>
      <path d="M10 4v6M16 4v6M22 4v6"/>
      <path d="M10 19h4M10 23h8M18 19h4" strokeWidth="1.3"/>
    </svg>
  ),

  // Hedefler — Set 2 checkmark daire
  goals: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),

  // Filmler — play daire
  films: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M10 9l6 3-6 3V9z"
        fill={active ? `${COLOR}25` : 'rgba(232,237,245,.1)'}
        stroke={active ? COLOR : 'rgba(232,237,245,.3)'}/>
    </svg>
  ),

  // Kitaplar — Set 2 açık kitap
  books: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  ),

  // Kronometre — üst tuşlu
  clock: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8"/>
      <path d="M12 9v4.5l3 1.5"/>
      <path d="M10 3h4M12 3v2"/>
      <path d="M19.5 7l-1.5 1.5"/>
    </svg>
  ),

  // Zincir Kırma — kırık link
  chain: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),

  // Hava Durumu — bulut + yağmur
  weather: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 16a4 4 0 00-4-4h-1A6 6 0 104 16"/>
      <path d="M8 20l-1 3M13 20v3M18 20l1 3"/>
    </svg>
  ),

  // Asistan — tam bağlı nöral ağ
  ai: (active) => {
    const c = active ? COLOR : 'rgba(232,237,245,.3)';
    const dim = active ? `${COLOR}60` : 'rgba(232,237,245,.12)';
    const faint = active ? `${COLOR}30` : 'rgba(232,237,245,.07)';
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        {/* merkez */}
        <circle cx="12" cy="12" r="2.2" fill={active ? `${COLOR}25` : 'rgba(232,237,245,.08)'} stroke={c} strokeWidth="1.2"/>
        <circle cx="12" cy="12" r="0.9" fill={c}/>
        {/* köşe düğümleri */}
        <circle cx="5" cy="5" r="1.9" fill={active ? `${COLOR}20` : 'rgba(232,237,245,.07)'} stroke={c} strokeWidth="1.1"/>
        <circle cx="19" cy="5" r="1.9" fill={active ? `${COLOR}20` : 'rgba(232,237,245,.07)'} stroke={c} strokeWidth="1.1"/>
        <circle cx="5" cy="19" r="1.9" fill={active ? `${COLOR}20` : 'rgba(232,237,245,.07)'} stroke={c} strokeWidth="1.1"/>
        <circle cx="19" cy="19" r="1.9" fill={active ? `${COLOR}20` : 'rgba(232,237,245,.07)'} stroke={c} strokeWidth="1.1"/>
        {/* kenar orta düğümleri */}
        <circle cx="12" cy="2.8" r="1.4" fill={dim} stroke={c} strokeWidth="1"/>
        <circle cx="21.2" cy="12" r="1.4" fill={dim} stroke={c} strokeWidth="1"/>
        <circle cx="12" cy="21.2" r="1.4" fill={dim} stroke={c} strokeWidth="1"/>
        <circle cx="2.8" cy="12" r="1.4" fill={dim} stroke={c} strokeWidth="1"/>
        {/* merkez → köşe bağlantıları */}
        <line x1="12" y1="9.8" x2="6.8" y2="6.8" stroke={dim} strokeWidth="1"/>
        <line x1="12" y1="9.8" x2="17.2" y2="6.8" stroke={dim} strokeWidth="1"/>
        <line x1="12" y1="14.2" x2="6.8" y2="17.2" stroke={dim} strokeWidth="1"/>
        <line x1="12" y1="14.2" x2="17.2" y2="17.2" stroke={dim} strokeWidth="1"/>
        {/* merkez → kenar orta */}
        <line x1="12" y1="9.8" x2="12" y2="4.2" stroke={faint} strokeWidth="1"/>
        <line x1="14.2" y1="12" x2="19.8" y2="12" stroke={faint} strokeWidth="1"/>
        <line x1="12" y1="14.2" x2="12" y2="19.8" stroke={faint} strokeWidth="1"/>
        <line x1="9.8" y1="12" x2="4.2" y2="12" stroke={faint} strokeWidth="1"/>
        {/* köşe → kenar orta çapraz bağlar */}
        <line x1="6.8" y1="6.8" x2="4.2" y2="12" stroke={faint} strokeWidth="1"/>
        <line x1="17.2" y1="6.8" x2="19.8" y2="12" stroke={faint} strokeWidth="1"/>
        <line x1="6.8" y1="17.2" x2="4.2" y2="12" stroke={faint} strokeWidth="1"/>
        <line x1="17.2" y1="17.2" x2="19.8" y2="12" stroke={faint} strokeWidth="1"/>
      </svg>
    );
  },

  // Yerel Gelişmeler — iğne + zemin dalgası
  radar: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a6 6 0 00-6 6c0 5 6 10 6 10s6-5 6-10a6 6 0 00-6-6z"/>
      <circle cx="12" cy="8" r="2"
        fill={active ? `${COLOR}25` : 'rgba(232,237,245,.08)'}
        stroke={active ? COLOR : 'rgba(232,237,245,.3)'}/>
      <path d="M7 19c1.5.8 3 1.2 5 1.2s3.5-.4 5-1.2" strokeWidth="1.3"/>
      <path d="M5 22c2 1 4.5 1.5 7 1.5s5-.5 7-1.5"
        strokeWidth="1.1"
        stroke={active ? `${COLOR}80` : 'rgba(232,237,245,.15)'}/>
    </svg>
  ),

  // Finans — $ sembolü daire içinde
  finance: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? COLOR : 'rgba(232,237,245,.3)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v10"/>
      <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.38-2.5 2-2.5 2s-2.5.62-2.5 2a2.5 2.5 0 005 0"/>
    </svg>
  ),
};

const LS_ORDER_KEY = 'gn_nav_order';

function loadOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_ORDER_KEY) || '[]');
    if (saved.length >= DEFAULT_NAV.length - 2)
      return [...new Set([...saved, ...DEFAULT_NAV.map(i => i.id)])].filter(id => DEFAULT_NAV.find(n => n.id === id));
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
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
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
                  ? `rgba(0,194,255,0.08)`
                  : isDragOver ? 'rgba(255,255,255,.04)' : 'transparent',
                borderLeft: !sidebarCollapsed && active && !editMode
                  ? `2px solid ${COLOR}`
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
                background: active && !editMode ? `rgba(0,194,255,0.1)` : 'rgba(255,255,255,.04)',
                border: `1px solid ${active && !editMode ? 'rgba(0,194,255,0.25)' : 'rgba(255,255,255,.07)'}`,
                transition: 'all .2s ease',
              }}>
                {ICONS[item.id]?.(active && !editMode)}
              </div>

              {!sidebarCollapsed && (
                <>
                  <span style={{
                    flex: 1,
                    fontSize: 13,
                    color: active && !editMode ? COLOR : 'rgba(232,237,245,.55)',
                    fontWeight: active && !editMode ? 500 : 400,
                    userSelect: 'none',
                    transition: 'color .15s',
                  }}>{item.label}</span>

                  {!editMode && badges[item.id] != null && badges[item.id] > 0 && (
                    <span style={{
                      fontSize: 11,
                      padding: '1px 7px',
                      borderRadius: 10,
                      background: active ? `rgba(0,194,255,0.15)` : 'rgba(255,255,255,.06)',
                      color: active ? COLOR : 'rgba(232,237,245,.35)',
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
                  background: COLOR,
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
