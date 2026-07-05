import { useStore } from '../../store/useStore';
import Sidebar from './Sidebar';
import { lazy, Suspense, useState } from 'react';
import MobileHeader from './MobileHeader';
import MobileDrawer from './MobileDrawer';

const PAGES = {
  home: lazy(() => import('../../pages/Home/Home')),
  calendar: lazy(() => import('../../pages/Calendar/Calendar')),
  goals: lazy(() => import('../../pages/Goals/Goals')),
  films: lazy(() => import('../../pages/Films/Films')),
  series: lazy(() => import('../../pages/Series/Series')),
  books: lazy(() => import('../../pages/Books/Books')),
  clock: lazy(() => import('../../pages/Clock/Clock')),
  chain: lazy(() => import('../../pages/Chain/Chain')),
  weather: lazy(() => import('../../pages/Weather/Weather')),
  ai: lazy(() => import('../../pages/Ai/Ai')),
  radar: lazy(() => import('../../pages/Radar/Radar')),
  finance: lazy(() => import('../../pages/Finance/Finance')),
  cinema: lazy(() => import('../../pages/Cinema/Cinema')),
};

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div style={{ width:28, height:28, border:'2.5px solid rgba(255,255,255,0.1)', borderTopColor:'#3a7bd5', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
    </div>
  );
}

export default function Layout() {
  const { currentPage, sidebarCollapsed } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const PageComponent = PAGES[currentPage] || PAGES.home;

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="block md:hidden">
        <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-250 ${
          sidebarCollapsed ? 'md:ml-[52px]' : 'md:ml-[195px]'
        } pt-[52px] md:pt-0`}
      >
        <div className={`max-w-full min-h-screen ${currentPage === 'weather' || currentPage === 'home' || currentPage === 'radar' ? '' : 'p-5 md:p-[26px_30px]'}`}>
          <Suspense fallback={<Spinner />}>
            <PageComponent key={currentPage} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
