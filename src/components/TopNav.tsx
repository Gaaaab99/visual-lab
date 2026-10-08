import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CornerDownLeft, FilePlus2, FileText, Menu, Microscope, Search, Stethoscope, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PATHOLOGIES } from '../data/pathologies';
import { CASES } from '../data/cases';
import type { ViewId } from '../types';
import { NAV_GROUPS, NAV_ITEMS } from './navigation';

interface Result {
  key: string;
  view: ViewId;
  id?: string;
  title: string;
  meta: string;
  icon: LucideIcon;
  group: string;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

interface Props {
  view: ViewId;
  onNavigate: (view: ViewId, focusId?: string) => void;
  onOpenMenu: () => void;
  onNewReport: () => void;
}

export function TopNav({ view, onNavigate, onOpenMenu, onNewReport }: Props) {
  const { reports } = useApp();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<Result[]>(() => {
    const term = norm(q.trim());
    if (!term) return NAV_ITEMS.map((n) => ({ key: `n-${n.id}`, view: n.id, title: n.label, meta: n.description, icon: n.icon, group: 'Vai a' }));
    const out: Result[] = [];
    for (const n of NAV_ITEMS) if (norm(`${n.label} ${n.description}`).includes(term)) out.push({ key: `n-${n.id}`, view: n.id, title: n.label, meta: n.description, icon: n.icon, group: 'Sezioni' });
    for (const p of PATHOLOGIES)
      if (norm(`${p.name} ${p.category} ${p.icd10} ${p.symptoms.join(' ')}`).includes(term))
        out.push({ key: `p-${p.id}`, view: 'archive', id: p.id, title: p.name, meta: `${p.category} · ICD-10 ${p.icd10}`, icon: Stethoscope, group: 'Patologie' });
    for (const c of CASES)
      if (norm(`${c.title} ${c.diagnosis} ${c.modality}`).includes(term))
        out.push({ key: `c-${c.id}`, view: 'cases', id: c.id, title: c.title, meta: c.modality, icon: Microscope, group: 'Casi clinici' });
    for (const r of reports)
      if (norm(`${r.patientName} ${r.patientCode} ${r.diagnosis}`).includes(term))
        out.push({ key: `r-${r.id}`, view: 'reports', id: r.id, title: r.patientName, meta: r.diagnosis || r.patientCode, icon: FileText, group: 'Referti' });
    return out.slice(0, 12);
  }, [q, reports]);

  const choose = (r: Result) => {
    onNavigate(r.view, r.id);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const group = NAV_GROUPS.find((g) => g.items.some((i) => i.id === view));
  const item = NAV_ITEMS.find((i) => i.id === view);

  let lastGroup = '';
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-900/75 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button className="rounded-lg p-2 text-slate-300 hover:bg-white/5 lg:hidden" onClick={onOpenMenu} aria-label="Apri menu">
          <Menu size={20} />
        </button>
        <div className="hidden min-w-0 items-center gap-2 text-sm md:flex">
          <span className="text-slate-500">{group?.label}</span>
          <span className="text-slate-600">/</span>
          <span className="truncate font-medium text-slate-100">{item?.label}</span>
        </div>

        <div className="relative ml-auto w-full max-w-md">
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
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              }
              if (e.key === 'Enter' && results[active]) choose(results[active]);
              if (e.key === 'Escape') inputRef.current?.blur();
            }}
            placeholder="Cerca patologie, casi, pazienti, sezioni…"
            className="input h-10 pl-9 pr-16"
            aria-label="Ricerca globale"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:block">Ctrl K</kbd>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-ink-850/98 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
              >
                {results.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">Nessun risultato per “{q}”</p>}
                {results.map((r, i) => {
                  const header = r.group !== lastGroup ? r.group : null;
                  lastGroup = r.group;
                  return (
                    <div key={r.key}>
                      {header && <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{header}</p>}
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => choose(r)}
                        onMouseEnter={() => setActive(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${i === active ? 'bg-cyan-400/10' : ''}`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i === active ? 'bg-cyan-400/15 text-cyan-200' : 'bg-white/[0.04] text-slate-400'}`}>
                          <r.icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white">{r.title}</span>
                          <span className="block truncate text-xs text-slate-500">{r.meta}</span>
                        </span>
                        {i === active ? <CornerDownLeft size={14} className="text-cyan-300" /> : <ArrowRight size={14} className="text-slate-600" />}
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="btn-primary hidden shrink-0 sm:inline-flex" onClick={onNewReport}>
          <FilePlus2 size={16} /> <span className="hidden xl:inline">Nuovo referto</span>
        </button>
      </div>
    </header>
  );
}
