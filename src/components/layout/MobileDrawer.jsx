import { useEffect } from 'react';
import { useStore } from '../../store/useStore';

const NAV = [
  { id: 'home',     label: 'Giriş' },
  { id: 'calendar', label: 'Takvim' },
  { id: 'goals',    label: 'Hedefler' },
  { id: 'films',    label: 'Filmler' },
  { id: 'series',   label: 'Diziler' },
  { id: 'books',    label: 'Kitaplar' },
  { id: 'clock',    label: 'Kronometre' },
  { id: 'chain',    label: 'Zincir Kırma' },
  { id: 'weather',  label: 'Hava Durumu' },
  { id: 'ai',       label: 'Asistan' },
  { id: 'radar',    label: 'Yerel Gelişmeler' },
  { id: 'finance',  label: 'Finans' },
  { id: 'cinema',   label: 'Sinema' },
];

export default function MobileDrawer({ open, onClose }) {
  const { setCurrentPage, currentPage } = useStore();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 transition-opacity duration-250"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose}
      />
      <div
        className="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-border z-[70] flex flex-col transition-transform duration-250"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="font-serif text-accent2">Günlüğüm</span>
          <button onClick={onClose} className="bg-transparent border-0 text-muted text-xl cursor-pointer">×</button>
        </div>
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {NAV.map(item => (
            <div
              key={item.id}
              onClick={() => { setCurrentPage(item.id); onClose(); }}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              {item.label}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
