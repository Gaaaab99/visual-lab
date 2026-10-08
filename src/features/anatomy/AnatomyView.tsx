import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Aperture, Eye, Layers, Palette, ScanEye, ScanLine, Search, Sun, Tag } from 'lucide-react';
import type { ConditionId } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { SagittalSection } from './SagittalSection';
import { FundusView } from './FundusView';
import { RetinaLayers } from './RetinaLayers';
import { StructurePanel } from './StructurePanel';
import { MODE_DESCRIPTION, MODE_LABEL, STRUCTURES, STRUCTURE_BY_ID, structuresForMode, type AnatomyMode, type StructureId } from './structures';
import type { DiagramProps } from './Hotspot';

interface Props {
  onOpenPathology: (pathologyId: string) => void;
  onSimulate: (conditionId: ConditionId) => void;
}

const MODES: { id: AnatomyMode; icon: typeof Eye }[] = [
  { id: 'sagittal', icon: Eye },
  { id: 'fundus', icon: Aperture },
  { id: 'oct', icon: ScanLine },
];

export function AnatomyView({ onOpenPathology, onSimulate }: Props) {
  const [mode, setMode] = useState<AnatomyMode>('sagittal');
  const [selected, setSelected] = useState<StructureId | null>(null);
  const [hovered, setHovered] = useState<StructureId | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showLight, setShowLight] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [query, setQuery] = useState('');

  const modeStructures = useMemo(() => structuresForMode(mode), [mode]);
  const selectedStructure = selected ? STRUCTURE_BY_ID[selected] : null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return STRUCTURES;
    return STRUCTURES.filter((s) => `${s.name} ${s.latin ?? ''} ${s.group} ${s.function} ${s.imaging.join(' ')}`.toLowerCase().includes(term));
  }, [query]);

  const switchMode = (m: AnatomyMode) => {
    setMode(m);
    setHovered(null);
    if (selected && !STRUCTURE_BY_ID[selected].views.includes(m)) setSelected(null);
  };

  const pick = (id: StructureId) => {
    const s = STRUCTURE_BY_ID[id];
    if (!s.views.includes(mode)) setMode(s.views[0]);
    setSelected((cur) => (cur === id ? null : id));
  };

  const pickFromList = (id: StructureId) => {
    const s = STRUCTURE_BY_ID[id];
    if (!s.views.includes(mode)) setMode(s.views[0]);
    setSelected(id);
  };

  const diagramProps: DiagramProps = { selected, hovered, onSelect: pick, onHover: setHovered, showLabels };
  const hoveredStructure = hovered ? STRUCTURE_BY_ID[hovered] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Atlante anatomico"
        title="Anatomia interattiva dell’occhio"
        description="Esplora il bulbo oculare in sezione, il fondo oculare e gli strati retinici come appaiono all’OCT. Ogni struttura rimanda a funzione, valori normali, esami e patologie correlate."
        icon={<ScanEye size={22} />}
      />

      {/* Barra strumenti */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full flex-wrap gap-1 rounded-2xl border border-white/[0.06] bg-ink-850/70 p-1" role="tablist" aria-label="Vista anatomica">
          {MODES.map(({ id, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={mode === id}
              onClick={() => switchMode(id)}
              className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition sm:text-sm ${mode === id ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {mode === id && <motion.span layoutId="anatomy-mode-pill" className="absolute inset-0 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/40" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <Icon size={15} className="relative" />
              <span className="relative">{MODE_LABEL[id]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Toggle on={showLabels} onClick={() => setShowLabels((v) => !v)} icon={<Tag size={14} />} label="Etichette" />
          {mode === 'sagittal' && <Toggle on={showLight} onClick={() => setShowLight((v) => !v)} icon={<Sun size={14} />} label="Percorso della luce" />}
          {mode === 'oct' && <Toggle on={!grayscale} onClick={() => setGrayscale((v) => !v)} icon={<Palette size={14} />} label={grayscale ? 'Scala di grigi' : 'Pseudocolore'} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Colonna disegno */}
        <div className="min-w-0 space-y-4">
          <div className="panel relative overflow-hidden p-3 sm:p-5">
            <div className="pointer-events-none absolute left-4 top-4 z-10 h-7">
              <AnimatePresence>
                {hoveredStructure && (
                  <motion.span
                    key={hoveredStructure.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="chip absolute whitespace-nowrap border-cyan-400/30 bg-ink-900/90 text-cyan-100 shadow-lg"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: hoveredStructure.color }} />
                    {hoveredStructure.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="pt-6 sm:pt-4"
              >
                {mode === 'sagittal' && <SagittalSection {...diagramProps} showLight={showLight} />}
                {mode === 'fundus' && <FundusView {...diagramProps} />}
                {mode === 'oct' && <RetinaLayers {...diagramProps} grayscale={grayscale} />}
              </motion.div>
            </AnimatePresence>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">{MODE_DESCRIPTION[mode]}</p>
          </div>

          {/* Legenda */}
          <div className="panel p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Layers size={14} className="text-cyan-300/80" /> Legenda · {MODE_LABEL[mode]}
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {modeStructures.map((s, i) => {
                const active = selected === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => pick(s.id)}
                      onMouseEnter={() => setHovered(s.id)}
                      onMouseLeave={() => setHovered(null)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                        active ? 'bg-cyan-500/10 text-white ring-1 ring-cyan-400/40' : 'text-slate-300 hover:bg-white/[0.04]'
                      }`}
                    >
                      {mode !== 'oct' && (
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-cyan-400 text-ink-900' : 'bg-ink-700 text-cyan-100'}`}>{i + 1}</span>
                      )}
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-white/10" style={{ background: s.color }} />
                      <span className="truncate">{s.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {mode === 'fundus' && (
              <div className="mt-3 flex flex-wrap gap-4 border-t border-white/5 pt-3 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-[3px] w-8 rounded bg-red-500" /> Arteriole: sottili, chiare, riflesso parietale
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-[5px] w-8 rounded bg-red-900" /> Venule: più spesse e scure
                </span>
              </div>
            )}
            {mode === 'sagittal' && showLight && (
              <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3 text-xs text-slate-400">
                <span className="h-[2px] w-8 rounded bg-yellow-300" /> Raggi luminosi: rifrazione su cornea (≈ 43 D) e cristallino (≈ 20 D), fuoco sulla fovea in emmetropia.
              </div>
            )}
          </div>
        </div>

        {/* Colonna laterale */}
        <div className="min-w-0 space-y-4">
          <StructurePanel structure={selectedStructure} onClose={() => setSelected(null)} onOpenPathology={onOpenPathology} onSimulate={onSimulate} />

          <div className="panel p-4">
            <label className="label" htmlFor="anatomy-search">
              Tutte le strutture ({STRUCTURES.length})
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input id="anatomy-search" className="input pl-9" placeholder="Cerca struttura, esame…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <ul className="mt-3 max-h-80 space-y-0.5 overflow-y-auto pr-1">
              {filtered.length === 0 && <li className="px-2 py-3 text-xs text-slate-500">Nessuna struttura trovata.</li>}
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => pickFromList(s.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                      selected === s.id ? 'bg-cyan-500/10 ring-1 ring-cyan-400/40' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-white/10" style={{ background: s.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-200">{s.name}</span>
                      <span className="block truncate text-[11px] text-slate-500">{s.group}</span>
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">{s.views.map((v) => (v === 'sagittal' ? 'Sez.' : v === 'fundus' ? 'Fondo' : 'OCT')).join(' · ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`btn px-3 py-1.5 text-xs ${on ? 'border border-cyan-400/40 bg-cyan-400/10 text-cyan-100' : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/40'}`}
    >
      {icon}
      {label}
    </button>
  );
}
