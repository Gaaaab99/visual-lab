import { useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRightLeft, Calculator, Gauge, Glasses, Grid3x3, Info, Palette, Repeat, Type, Wrench, type LucideIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { AcuityConverter } from './AcuityConverter';
import { OptotypeChart } from './OptotypeChart';
import { IopCorrection } from './IopCorrection';
import { VertexDistance } from './VertexDistance';
import { CylinderTools } from './CylinderTools';
import { IolCalculator } from './IolCalculator';
import { IshiharaTest } from './IshiharaTest';
import { AmslerGrid } from './AmslerGrid';

type ToolId = 'acuity' | 'optotype' | 'iop' | 'vertex' | 'cyl' | 'iol' | 'ishihara' | 'amsler';

interface ToolDef {
  id: ToolId;
  label: string;
  short: string;
  desc: string;
  icon: LucideIcon;
  Component: ComponentType;
}

const TOOLS: ToolDef[] = [
  { id: 'acuity', label: 'Acuità visiva', short: 'Acuità', desc: 'Decimale, Snellen, LogMAR, MAR', icon: Glasses, Component: AcuityConverter },
  { id: 'optotype', label: 'Ottotipo', short: 'Ottotipo', desc: 'Tavola Sloan con punteggio ETDRS', icon: Type, Component: OptotypeChart },
  { id: 'iop', label: 'IOP e pachimetria', short: 'IOP/CCT', desc: 'Correzione per spessore corneale', icon: Gauge, Component: IopCorrection },
  { id: 'vertex', label: 'Distanza al vertice', short: 'Vertice', desc: 'Occhiale → lente a contatto', icon: ArrowRightLeft, Component: VertexDistance },
  { id: 'cyl', label: 'Trasposizione', short: 'Cilindro', desc: '±cilindro ed equivalente sferico', icon: Repeat, Component: CylinderTools },
  { id: 'iol', label: 'Calcolo IOL', short: 'IOL', desc: 'Formula SRK/II', icon: Calculator, Component: IolCalculator },
  { id: 'ishihara', label: 'Test di Ishihara', short: 'Ishihara', desc: 'Screening discromatopsie', icon: Palette, Component: IshiharaTest },
  { id: 'amsler', label: 'Griglia di Amsler', short: 'Amsler', desc: 'Metamorfopsie e scotomi', icon: Grid3x3, Component: AmslerGrid },
];

export function ToolsView() {
  const [active, setActive] = useState<ToolId>('acuity');
  const tool = TOOLS.find((t) => t.id === active) ?? TOOLS[0];
  const Active = tool.Component;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calcolatori e test"
        title="Strumenti clinici"
        icon={<Wrench size={22} />}
        description="Convertitori, calcolatori e test visivi interattivi per la pratica e lo studio oftalmologico."
      />

      <nav aria-label="Strumenti" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const on = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              aria-current={on ? 'page' : undefined}
              className={`group relative flex min-w-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition ${on ? 'border-cyan-400/40 text-white' : 'border-white/[0.06] bg-ink-850/60 text-slate-400 hover:border-cyan-400/25 hover:text-slate-200'}`}
            >
              {on && <motion.span layoutId="tools-pill" className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-600/10" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-cyan-400/15 text-cyan-200' : 'bg-white/[0.04] text-slate-400 group-hover:text-cyan-200'}`}>
                <Icon size={16} />
              </span>
              <span className="relative min-w-0">
                <span className="block truncate text-sm font-medium">
                  <span className="xl:hidden">{t.label}</span>
                  <span className="hidden xl:inline">{t.short}</span>
                </span>
                <span className="block truncate text-[11px] text-slate-500 xl:hidden">{t.desc}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tool.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          <Active />
        </motion.div>
      </AnimatePresence>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        Strumenti a scopo esclusivamente educativo: non sostituiscono strumentazione certificata, test standardizzati né il giudizio clinico.
      </p>
    </div>
  );
}
