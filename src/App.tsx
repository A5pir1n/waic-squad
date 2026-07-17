import { lazy, Suspense, useState } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import type { Session } from './lib/types';
import { loadSession } from './lib/session';
import { TeamProvider } from './lib/store';
import { Join } from './pages/Join';
import { Exhibitors } from './pages/Exhibitors';
import { Parties } from './pages/Parties';
import { Forums } from './pages/Forums';
import { Team } from './pages/Team';
import { VenuePage } from './pages/VenuePage';
import { IconMap, IconBooth, IconGlass, IconForum, IconTeam } from './components/ui/icons';

const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })));

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);

  if (!session) return <Join onJoin={setSession} />;

  return (
    <TeamProvider session={session}>
      <HashRouter>
        <div className="app-shell">
          <main className="app-view" id="app-view">
            <Routes>
              <Route path="/" element={
                <Suspense fallback={<div className="map-loading">正在点亮上海…</div>}>
                  <MapPage />
                </Suspense>
              } />
              <Route path="/exhibitors" element={<Exhibitors />} />
              <Route path="/forums" element={<Forums />} />
              <Route path="/parties" element={<Parties />} />
              <Route path="/team" element={<Team />} />
              <Route path="/venue/:venueId" element={<VenuePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <TabBar />
        </div>
      </HashRouter>
    </TeamProvider>
  );
}

const TABS = [
  { path: '/', label: '地图', icon: IconMap },
  { path: '/exhibitors', label: '展商', icon: IconBooth },
  { path: '/forums', label: '论坛', icon: IconForum },
  { path: '/parties', label: '夜场', icon: IconGlass },
  { path: '/team', label: '小队', icon: IconTeam },
];

function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="主导航">
      {TABS.map((t) => {
        const active = t.path === '/' ? pathname === '/' || pathname.startsWith('/venue') : pathname.startsWith(t.path);
        return (
          <button key={t.path} className={active ? 'active' : ''} onClick={() => navigate(t.path)}>
            <t.icon size={21} />
            {t.label}
            <span className="tab-dot" />
          </button>
        );
      })}
    </nav>
  );
}
