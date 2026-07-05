import { useStore } from '../../store/useStore';

const PAGE_TITLES = {
  home:     'Giriş',
  chain:    'Zincir Kırma',
  clock:    'Kronometre',
  calendar: 'Takvim',
  films:    'Filmler',
  series:   'Diziler',
  books:    'Kitaplar',
  goals:    'Hedefler',
  ai:       'Asistan',
  weather:  'Hava Durumu',
  radar:    'Yerel Gelişmeler',
  finance:  'Finans',
  cinema:   'Sinema',
};

export function MobileHeader({ onMenuClick }) {
  const { currentPage } = useStore();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border flex items-center gap-3 px-4 h-[52px]">
      <button onClick={onMenuClick} className="bg-transparent border-0 text-muted cursor-pointer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <span className="font-serif text-accent2 text-[15px]">{PAGE_TITLES[currentPage] || 'Lonas'}</span>
    </header>
  );
}

export default MobileHeader;
