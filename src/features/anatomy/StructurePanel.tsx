import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Info, Microscope, MousePointerClick, Play, Ruler, Stethoscope, X } from 'lucide-react';
import { PATHOLOGY_BY_ID } from '../../data/pathologies';
import type { ConditionId, Pathology } from '../../types';
import { MODE_LABEL, type AnatomyStructure } from './structures';

interface Props {
  structure: AnatomyStructure | null;
  onClose: () => void;
  onOpenPathology: (pathologyId: string) => void;
  onSimulate: (conditionId: ConditionId) => void;
}

export function StructurePanel({ structure, onClose, onOpenPathology, onSimulate }: Props) {
  return (
    <div className="panel overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {structure ? (
          <motion.div
            key={structure.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="p-5"
          >
            <StructureDetail structure={structure} onClose={onClose} onOpenPathology={onOpenPathology} onSimulate={onSimulate} />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300">
              <MousePointerClick size={22} />
            </div>
            <p className="text-sm font-medium text-white">Seleziona una struttura</p>
            <p className="max-w-xs text-xs leading-relaxed text-slate-400">
              Clicca su una regione del disegno, usa la legenda o cerca nell’elenco. Le regioni sono raggiungibili anche da tastiera con Tab e attivabili con Invio.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StructureDetail({ structure: s, onClose, onOpenPathology, onSimulate }: Props & { structure: AnatomyStructure }) {
  const pathologies = s.pathologies.map((id) => PATHOLOGY_BY_ID[id]).filter((p): p is Pathology => p !== undefined);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-white/10" style={{ background: s.color }} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">{s.group}</p>
            <h2 className="text-lg font-semibold leading-snug text-white">{s.name}</h2>
            {s.latin && <p className="text-xs italic text-slate-400">{s.latin}</p>}
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label="Chiudi scheda">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {s.views.map((v) => (
          <span key={v} className="chip border-white/10 bg-white/[0.03] text-slate-300">
            {MODE_LABEL[v]}
          </span>
        ))}
      </div>

      <Section icon={<Info size={14} />} title="Funzione">
        <p className="text-sm leading-relaxed text-slate-300">{s.function}</p>
      </Section>

      <Section icon={<Stethoscope size={14} />} title="Note cliniche">
        <p className="text-sm leading-relaxed text-slate-300">{s.clinical}</p>
      </Section>

      {s.normals.length > 0 && (
        <Section icon={<Ruler size={14} />} title="Valori di riferimento">
          <dl className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900/50">
            {s.normals.map((n) => (
              <div key={n.label} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2">
                <dt className="text-xs text-slate-400">{n.label}</dt>
                <dd className="font-mono text-xs font-medium text-cyan-200">{n.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Section icon={<Microscope size={14} />} title="Indagini strumentali">
        <div className="flex flex-wrap gap-1.5">
          {s.imaging.map((i) => (
            <span key={i} className="chip border-sky-400/25 bg-sky-400/[0.07] text-sky-200">
              {i}
            </span>
          ))}
        </div>
      </Section>

      <Section icon={<BookOpen size={14} />} title="Patologie correlate">
        {pathologies.length === 0 ? (
          <p className="text-xs text-slate-500">Nessuna scheda collegata nell’archivio.</p>
        ) : (
          <ul className="space-y-2">
            {pathologies.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">{p.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {p.category} · ICD-10 {p.icd10}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => onOpenPathology(p.id)}>
                    <BookOpen size={13} /> Scheda
                  </button>
                  {p.simulatorId && (
                    <button className="btn-primary px-2.5 py-1 text-xs" onClick={() => p.simulatorId && onSimulate(p.simulatorId)}>
                      <Play size={13} /> Simula
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <span className="text-cyan-300/80">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
