import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, ClipboardList, CloudOff, Eye, FileText, Microscope, Search, Stethoscope } from 'lucide-react';
import { useApp, levelFromXp } from '../context/AppContext';
import { PATHOLOGIES } from '../data/pathologies';
import { CASES } from '../data/cases';
import type { ViewId } from '../types';
import { Logo } from './Logo';

export const NAV: { id: ViewId; label: string; icon: typeof Eye }[] = [
  { id: 'simulator', label: 'Simulatore', icon: Eye },
  { id: 'archive', label: 'Patologie', icon: BookOpen },
  { id: 'cases', label: 'Casi Clinici', icon: Microscope },
  { id: 'reports', label: 'Pazienti / Referti', icon: ClipboardList },
];

interface Result {
  key: string;
  view: ViewId;
  id: string;
  title: string;
  meta: string;
  icon: typeof Eye;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Props {
  view: ViewId;
  onNavigate: (view: ViewId, focusId?: string) => void;
  onOpenProfile: () => void;
}

export function TopNav({ view, onNavigate, onOpenProfile }: Props) {
  const { profile, reports, mode } = useApp();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<Result[]>(() => {
    const term = norm(q.trim());
    if (term.length < 2) return [];
    const out: Result[] = [];
    for (const p of PATHOLOGIES)
      if (norm(`${p.name} ${p.category} ${p.icd10} ${p.symptoms.join(' ')}`).includes(term))
        out.push({ key: `p-${p.id}`, view: 'archive', id: p.id, title: p.name, meta: `Patologia · ${p.category}`, icon: Stethoscope });
    for (const c of CASES)
      if (norm(`${c.title} ${c.diagnosis} ${c.modality}`).includes(term))
        out.push({ key: `c-${c.id}`, view: 'cases', id: c.id, title: c.title, meta: `Caso clinico · ${c.modality}`, icon: Microscope });
    for (const r of reports)
      if (norm(`${r.patientName} ${r.patientCode} ${r.diagnosis}`).includes(term))
        out.push({ key: `r-${r.id}`, view: 'reports', id: r.id, title: r.patientName, meta: `Referto · ${r.diagnosis || r.patientCode}`, icon: FileText });
    return out.slice(0, 9);
  }, [q, reports]);

  const choose = (r: Result) => {
    onNavigate(r.view, r.id);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const lvl = levelFromXp(profile?.xp ?? 0);
  const initials = (profile?.displayName ?? '?')
    .replace(/^(dr\.?ssa|dr\.?|prof\.?)\s+/i, '')
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6">
        <button onClick={() => onNavigate('simulator')} className="flex shrink-0 items-center gap-2.5" aria-label="Visual Lab home">
          <Logo size={34} />
          <div className="hidden text-left sm:block">
            <p className="text-[15px] font-semibold leading-tight text-white">Visual Lab</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/70">Clinical Ophthalmic</p>
          </div>
        </button>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${view === id ? 'text-white' : 'text-slate-400 hover:text-slate-100'}`}
            >
              {view === id && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-white/[0.06] ring-1 ring-cyan-400/25" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <Icon size={16} className={`relative ${view === id ? 'text-cyan-300' : ''}`} />
              <span className="relative">{label}</span>
            </button>
          ))}
        </nav>

        <div className="relative ml-auto w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setActive((a) => Math.min(results.length - 1, a + 1));
              if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
              if (e.key === 'Enter' && results[active]) choose(results[active]);
              if (e.key === 'Escape') inputRef.current?.blur();
            }}
            placeholder="Cerca patologie, casi, pazienti…"
            className="input h-10 pl-9 pr-12"
            aria-label="Ricerca globale"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 px-1.5 text-[10px] text-slate-500 sm:block">Ctrl K</kbd>
          <AnimatePresence>
            {open && q.trim().length >= 2 && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-white/10 bg-ink-850 shadow-2xl shadow-black/50 sm:left-auto sm:w-96"
              >
                {results.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Nessun risultato per “{q}”</li>}
                {results.map((r, i) => (
                  <li key={r.key}>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(r)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${i === active ? 'bg-cyan-400/10' : ''}`}
                    >
                      <r.icon size={16} className="shrink-0 text-cyan-300" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{r.title}</p>
                        <p className="truncate text-xs text-slate-500">{r.meta}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {mode === 'demo' && (
          <span className="chip hidden whitespace-nowrap border-amber-400/30 bg-amber-400/10 text-amber-200 xl:inline-flex" title="Dati salvati localmente nel browser">
            <CloudOff size={12} /> Demo offline
          </span>
        )}

        <button onClick={onOpenProfile} className="group flex shrink-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 transition hover:border-cyan-400/40" aria-label="Apri profilo">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-semibold text-white">{initials}</span>
          <span className="hidden text-left md:block">
            <span className="block max-w-36 truncate text-xs font-medium text-white">{profile?.displayName ?? '…'}</span>
            <span className="block text-[10px] text-cyan-300/80">
              Lv {lvl.level} · {profile?.xp ?? 0} XP
            </span>
          </span>
        </button>
      </div>

      {/* nav mobile */}
      <nav className="flex gap-1 overflow-x-auto border-t border-white/[0.04] px-3 py-2 lg:hidden">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${view === id ? 'bg-cyan-400/10 text-cyan-200' : 'text-slate-400'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
