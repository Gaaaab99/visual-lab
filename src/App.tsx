import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useApp } from './context/AppContext';
import { AuthScreen } from './components/AuthScreen';
import { TopNav } from './components/TopNav';
import { Footer } from './components/Footer';
import { ProfileModal } from './components/ProfileModal';
import { Toasts } from './components/Toasts';
import { Logo } from './components/Logo';
import { SimulatorView } from './features/simulator/SimulatorView';
import { createInitialState } from './features/simulator/conditions';
import { ArchiveView } from './features/archive/ArchiveView';
import { CasesView } from './features/cases/CasesView';
import { ReportsView } from './features/reports/ReportsView';
import type { ConditionId, SimulationSnapshot, SimulatorState, ViewId, VisualSource } from './types';

const VIEWS: ViewId[] = ['simulator', 'archive', 'cases', 'reports'];

function viewFromHash(): ViewId {
  const h = window.location.hash.replace(/^#\/?/, '') as ViewId;
  return VIEWS.includes(h) ? h : 'simulator';
}

export default function App() {
  const { authReady, user } = useApp();
  const [view, setView] = useState<ViewId>(viewFromHash);
  const [focus, setFocus] = useState<{ view: ViewId; id: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [simState, setSimState] = useState<SimulatorState>(createInitialState);
  const [source, setSource] = useState<VisualSource>({ kind: 'scene', scene: 'city' });
  const [pendingSnapshot, setPendingSnapshot] = useState<SimulationSnapshot | null>(null);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((v: ViewId, focusId?: string) => {
    setFocus(focusId ? { view: v, id: focusId } : null);
    setView(v);
    if (window.location.hash !== `#/${v}`) window.history.pushState(null, '', `#/${v}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const consumeFocus = useCallback(() => setFocus(null), []);
  const consumeSnapshot = useCallback(() => setPendingSnapshot(null), []);

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

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav view={view} onNavigate={navigate} onOpenProfile={() => setProfileOpen(true)} />
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
            {view === 'simulator' && (
              <SimulatorView
                state={simState}
                setState={setSimState}
                source={source}
                setSource={setSource}
                onGenerateReport={(snap) => {
                  setPendingSnapshot(snap);
                  navigate('reports');
                }}
                onOpenPathology={(id) => navigate('archive', id)}
              />
            )}
            {view === 'archive' && <ArchiveView focusId={focusFor('archive')} onFocusConsumed={consumeFocus} onSimulate={simulate} onOpenCase={(id) => navigate('cases', id)} />}
            {view === 'cases' && <CasesView focusId={focusFor('cases')} onFocusConsumed={consumeFocus} onOpenPathology={(id) => navigate('archive', id)} />}
            {view === 'reports' && (
              <ReportsView
                focusId={focusFor('reports')}
                onFocusConsumed={consumeFocus}
                pendingSnapshot={pendingSnapshot}
                onSnapshotConsumed={consumeSnapshot}
                onOpenSimulator={() => navigate('simulator')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <Toasts />
    </div>
  );
}
