import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useApp } from './context/AppContext';
import { AuthScreen } from './components/AuthScreen';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { ProfileModal } from './components/ProfileModal';
import { Toasts } from './components/Toasts';
import { Logo } from './components/Logo';
import { NAV_ITEMS, VIEW_IDS } from './components/navigation';
import { DashboardView } from './features/dashboard/DashboardView';
import { SimulatorView } from './features/simulator/SimulatorView';
import { createInitialState } from './features/simulator/conditions';
import { ArchiveView } from './features/archive/ArchiveView';
import { CasesView } from './features/cases/CasesView';
import { ReportsView, type DraftRequest } from './features/reports/ReportsView';
const AnatomyView = lazy(() => import('./features/anatomy/AnatomyView').then((m) => ({ default: m.AnatomyView })));
const QuizView = lazy(() => import('./features/quiz/QuizView').then((m) => ({ default: m.QuizView })));
const ToolsView = lazy(() => import('./features/tools/ToolsView').then((m) => ({ default: m.ToolsView })));

function ViewFallback() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-14 w-72 rounded-xl" />
      <div className="skeleton h-[60vh] rounded-2xl" />
    </div>
  );
}
import type { ConditionId, SimulatorState, ViewId, VisualSource } from './types';

function viewFromHash(): ViewId {
  const h = window.location.hash.replace(/^#\/?/, '') as ViewId;
  return VIEW_IDS.includes(h) ? h : 'dashboard';
}

const readCollapsed = () => {
  try {
    return localStorage.getItem('visuallab.sidebar') === 'collapsed';
  } catch {
    return false;
  }
};

export default function App() {
  const { authReady, user } = useApp();
  const [view, setView] = useState<ViewId>(viewFromHash);
  const [focus, setFocus] = useState<{ view: ViewId; id: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileNav, setMobileNav] = useState(false);
  const [simState, setSimState] = useState<SimulatorState>(createInitialState);
  const [source, setSource] = useState<VisualSource>({ kind: 'scene', scene: 'city' });
  const [draftRequest, setDraftRequest] = useState<DraftRequest | null>(null);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const label = NAV_ITEMS.find((n) => n.id === view)?.label;
    document.title = `${label ? `${label} · ` : ''}Visual Lab`;
  }, [view]);

  const navigate = useCallback((v: ViewId, focusId?: string) => {
    setFocus(focusId ? { view: v, id: focusId } : null);
    setView(v);
    if (window.location.hash !== `#/${v}`) window.history.pushState(null, '', `#/${v}`);
    window.scrollTo({ top: 0 });
  }, []);

  // scorciatoie Alt+1..8
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const item = NAV_ITEMS.find((n) => n.shortcut === e.key);
      if (item) {
        e.preventDefault();
        navigate(item.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('visuallab.sidebar', c ? 'expanded' : 'collapsed');
      } catch {
        /* ignore */
      }
      return !c;
    });

  const consumeFocus = useCallback(() => setFocus(null), []);
  const consumeDraft = useCallback(() => setDraftRequest(null), []);
  const newReport = useCallback(() => {
    setDraftRequest({ snapshot: null });
    navigate('reports');
  }, [navigate]);

  const simulate = useCallback(
    (id: ConditionId) => {
      setSimState((s) => ({ ...s, conditions: { ...s.conditions, [id]: { enabled: true, severity: Math.max(55, s.conditions[id].severity) } } }));
      navigate('simulator');
    },
    [navigate],
  );

  if (!authReady)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo size={56} />
        <Loader2 className="animate-spin text-cyan-400" />
      </div>
    );

  if (!user)
    return (
      <>
        <AuthScreen />
        <Toasts />
      </>
    );

  const focusFor = (v: ViewId) => (focus?.view === v ? focus.id : null);
  const openPathology = (id: string) => navigate('archive', id);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        view={view}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
        onOpenProfile={() => setProfileOpen(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav view={view} onNavigate={navigate} onOpenMenu={() => setMobileNav(true)} onNewReport={newReport} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {view === 'dashboard' && <DashboardView onNavigate={navigate} onNewReport={newReport} />}
              {view === 'simulator' && (
                <SimulatorView
                  state={simState}
                  setState={setSimState}
                  source={source}
                  setSource={setSource}
                  onGenerateReport={(snap) => {
                    setDraftRequest({ snapshot: snap });
                    navigate('reports');
                  }}
                  onOpenPathology={openPathology}
                />
              )}
              {view === 'archive' && <ArchiveView focusId={focusFor('archive')} onFocusConsumed={consumeFocus} onSimulate={simulate} onOpenCase={(id) => navigate('cases', id)} />}
              {view === 'cases' && <CasesView focusId={focusFor('cases')} onFocusConsumed={consumeFocus} onOpenPathology={openPathology} />}
              {view === 'reports' && (
                <ReportsView
                  focusId={focusFor('reports')}
                  onFocusConsumed={consumeFocus}
                  draftRequest={draftRequest}
                  onDraftConsumed={consumeDraft}
                  onOpenSimulator={() => navigate('simulator')}
                />
              )}
              <Suspense fallback={<ViewFallback />}>
                {view === 'anatomy' && <AnatomyView onOpenPathology={openPathology} onSimulate={simulate} />}
                {view === 'quiz' && <QuizView onOpenPathology={openPathology} />}
                {view === 'tools' && <ToolsView />}
              </Suspense>
            </motion.div>
        </main>
        <Footer />
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <Toasts />
    </div>
  );
}
