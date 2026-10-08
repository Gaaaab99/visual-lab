import { AnimatePresence, motion } from 'motion/react';
import { ChevronsLeft, ChevronsRight, CloudOff, Database, X } from 'lucide-react';
import type { ViewId } from '../types';
import { levelFromXp, useApp } from '../context/AppContext';
import { NAV_GROUPS } from './navigation';
import { Logo } from './Logo';

interface Props {
  view: ViewId;
  onNavigate: (v: ViewId) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenProfile: () => void;
}

function NavList({ view, onNavigate, collapsed }: { view: ViewId; onNavigate: (v: ViewId) => void; collapsed: boolean }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((g) => (
        <div key={g.label}>
          {!collapsed ? (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{g.label}</p>
          ) : (
            <div className="mx-auto mb-2 h-px w-6 bg-white/10" />
          )}
          <ul className="space-y-0.5">
            {g.items.map(({ id, label, icon: Icon, shortcut }) => {
              const active = view === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => onNavigate(id)}
                    title={collapsed ? label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${
                      active ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/5 text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_10px_rgb(6_182_212)]" />}
                    <Icon size={18} className={`shrink-0 transition-colors ${active ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {!collapsed && (
                      <>
                        <span className="truncate">{label}</span>
                        {shortcut && <kbd className="ml-auto hidden rounded border border-white/10 px-1.5 font-mono text-[10px] text-slate-600 group-hover:text-slate-400 xl:block">Alt {shortcut}</kbd>}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ProfileCard({ collapsed, onOpenProfile }: { collapsed: boolean; onOpenProfile: () => void }) {
  const { profile, mode } = useApp();
  const lvl = levelFromXp(profile?.xp ?? 0);
  return (
    <div className="border-t border-white/[0.06] p-3">
      {!collapsed && (
        <div className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] ${mode === 'demo' ? 'text-amber-200/80' : 'text-emerald-200/80'}`}>
          {mode === 'demo' ? <CloudOff size={13} /> : <Database size={13} />}
          {mode === 'demo' ? 'Demo offline · localStorage' : 'Firebase connesso'}
        </div>
      )}
      <button
        onClick={onOpenProfile}
        className={`flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-left transition-colors hover:border-cyan-400/30 ${collapsed ? 'justify-center' : ''}`}
        title="Profilo"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-semibold text-white">
          {lvl.level}
          <svg className="absolute -inset-1 h-11 w-11 -rotate-90" viewBox="0 0 44 44" aria-hidden>
            <circle cx="22" cy="22" r="20" fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth="2" />
            <circle cx="22" cy="22" r="20" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeDasharray={`${lvl.progress * 125.6} 125.6`} />
          </svg>
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-white">{profile?.displayName ?? '…'}</span>
            <span className="block truncate text-[10px] text-cyan-300/80">
              {lvl.title} · {profile?.xp ?? 0} XP
            </span>
          </span>
        )}
      </button>
    </div>
  );
}

export function Sidebar({ view, onNavigate, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile, onOpenProfile }: Props) {
  return (
    <>
      {/* desktop */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-ink-950/60 backdrop-blur-xl transition-[width] duration-300 lg:flex ${collapsed ? 'w-[76px]' : 'w-64'}`}
      >
        <div className={`flex h-16 items-center gap-2.5 border-b border-white/[0.06] ${collapsed ? 'justify-center' : 'px-5'}`}>
          <Logo size={34} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight text-white">Visual Lab</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/70">Clinical Ophthalmic</p>
            </div>
          )}
        </div>
        <NavList view={view} onNavigate={onNavigate} collapsed={collapsed} />
        <button
          onClick={onToggleCollapsed}
          className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg py-1.5 text-[11px] text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300"
          aria-label={collapsed ? 'Espandi menu' : 'Comprimi menu'}
        >
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          {!collapsed && 'Comprimi'}
        </button>
        <ProfileCard collapsed={collapsed} onOpenProfile={onOpenProfile} />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onCloseMobile} />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/10 bg-ink-900"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-5">
                <Logo size={32} />
                <p className="text-[15px] font-semibold text-white">Visual Lab</p>
                <button className="ml-auto rounded-lg p-1.5 text-slate-400 hover:text-white" onClick={onCloseMobile} aria-label="Chiudi menu">
                  <X size={18} />
                </button>
              </div>
              <NavList
                view={view}
                onNavigate={(v) => {
                  onNavigate(v);
                  onCloseMobile();
                }}
                collapsed={false}
              />
              <ProfileCard
                collapsed={false}
                onOpenProfile={() => {
                  onCloseMobile();
                  onOpenProfile();
                }}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
