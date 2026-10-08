import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, AlertOctagon, BookOpen, Eye, FlaskConical, Microscope, Pill, Search, Stethoscope, Syringe, Zap, Scissors, Glasses, HeartPulse } from 'lucide-react';
import { CATEGORIES, PATHOLOGIES, PATHOLOGY_BY_ID } from '../../data/pathologies';
import { CASES } from '../../data/cases';
import type { ConditionId, Pathology, PathologyCategory } from '../../types';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';

const URGENCY_TONE: Record<Pathology['urgency'], string> = {
  Elettiva: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  Programmata: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  Urgente: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  Emergenza: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
};

const TREATMENT_ICON = { Medica: Pill, Laser: Zap, Chirurgica: Scissors, Iniettiva: Syringe, Ottica: Glasses, Riabilitativa: HeartPulse };

const CATEGORY_ACCENT: Record<PathologyCategory, string> = {
  Retina: 'from-rose-500/20',
  'Nervo Ottico': 'from-amber-500/20',
  Cornea: 'from-sky-500/20',
  'Mezzi Diottrici': 'from-yellow-500/20',
  'Vizi di Refrazione': 'from-violet-500/20',
  Uvea: 'from-red-500/20',
};

interface Props {
  focusId: string | null;
  onFocusConsumed: () => void;
  onSimulate: (id: ConditionId) => void;
  onOpenCase: (caseId: string) => void;
}

export function ArchiveView({ focusId, onFocusConsumed, onSimulate, onOpenCase }: Props) {
  const [cat, setCat] = useState<PathologyCategory | 'Tutte'>('Tutte');
  const [q, setQ] = useState('');
  const [urgency, setUrgency] = useState<Pathology['urgency'] | 'Tutte'>('Tutte');
  const [onlySim, setOnlySim] = useState(false);
  const [selected, setSelected] = useState<Pathology | null>(null);

  useEffect(() => {
    if (focusId && PATHOLOGY_BY_ID[focusId]) {
      setSelected(PATHOLOGY_BY_ID[focusId]);
      onFocusConsumed();
    }
  }, [focusId, onFocusConsumed]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return PATHOLOGIES.filter(
      (p) =>
        (cat === 'Tutte' || p.category === cat) &&
        (urgency === 'Tutte' || p.urgency === urgency) &&
        (!onlySim || p.simulatorId) &&
        (!term || `${p.name} ${p.summary} ${p.icd10} ${p.symptoms.join(' ')}`.toLowerCase().includes(term)),
    ).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [cat, q, urgency, onlySim]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Atlante clinico"
        title="Archivio patologie"
        icon={<BookOpen size={22} />}
        description={`${PATHOLOGIES.length} schede con eziologia, fattori di rischio, sintomi, indagini strumentali e terapie raccomandate.`}
      />
      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-52 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Filtra per nome, sintomo o ICD-10…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={urgency} onChange={(e) => setUrgency(e.target.value as Pathology['urgency'] | 'Tutte')} aria-label="Priorità">
          <option value="Tutte">Ogni priorità</option>
          {(['Emergenza', 'Urgente', 'Programmata', 'Elettiva'] as const).map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" className="accent-cyan-500" checked={onlySim} onChange={(e) => setOnlySim(e.target.checked)} /> Solo simulabili
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['Tutte', ...CATEGORIES] as const).map((c) => {
          const n = c === 'Tutte' ? PATHOLOGIES.length : PATHOLOGIES.filter((p) => p.category === c).length;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`relative rounded-full px-3.5 py-1.5 text-xs font-medium transition ${cat === c ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {cat === c && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-cyan-500/15 ring-1 ring-cyan-400/40" />}
              <span className="relative">
                {c} <span className="text-slate-500">{n}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.025 }}
              onClick={() => setSelected(p)}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br ${CATEGORY_ACCENT[p.category]} to-transparent p-5 text-left transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="chip border-white/10 bg-ink-900/60 text-slate-300">{p.category}</span>
                <span className="font-mono text-[11px] text-slate-500">{p.icd10}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-white group-hover:text-cyan-100">{p.name}</h3>
              <p className="mt-1.5 line-clamp-3 text-sm text-slate-400">{p.summary}</p>
              <div className="mt-auto flex items-center gap-2 pt-4">
                <span className={`chip ${URGENCY_TONE[p.urgency]}`}>{p.urgency}</span>
                {p.simulatorId && (
                  <span className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                    <Eye size={11} /> Simulabile
                  </span>
                )}
              </div>
            </motion.button>
          ))}
      </div>
      {list.length === 0 && <p className="py-16 text-center text-sm text-slate-500">Nessuna patologia corrisponde ai filtri.</p>}

      <PathologyModal pathology={selected} onClose={() => setSelected(null)} onSimulate={onSimulate} onOpenCase={onOpenCase} />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Eye; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300/90">
        <Icon size={14} /> {title}
      </h4>
      {children}
    </section>
  );
}

function PathologyModal({ pathology: p, onClose, onSimulate, onOpenCase }: { pathology: Pathology | null; onClose: () => void; onSimulate: (id: ConditionId) => void; onOpenCase: (id: string) => void }) {
  const related = p ? CASES.filter((c) => c.pathologyId === p.id) : [];
  return (
    <Modal
      open={!!p}
      onClose={onClose}
      size="lg"
      icon={<BookOpen size={18} />}
      title={p?.name}
      subtitle={p && `${p.category} · ICD-10 ${p.icd10}${p.latin ? ` · ${p.latin}` : ''}`}
      footer={
        p && (
          <>
            {related.map((c) => (
              <button key={c.id} className="btn-ghost mr-auto" onClick={() => onOpenCase(c.id)}>
                <Microscope size={15} /> Caso clinico
              </button>
            ))}
            {p.simulatorId && (
              <button className="btn-primary" onClick={() => onSimulate(p.simulatorId!)}>
                <Eye size={15} /> Simula visione
              </button>
            )}
          </>
        )
      }
    >
      {p && (
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <Section icon={BookOpen} title="Descrizione clinica">
              <p className="text-sm leading-relaxed text-slate-300">{p.description}</p>
            </Section>
            <Section icon={FlaskConical} title="Eziologia e patogenesi">
              <ul className="space-y-1.5 text-sm text-slate-300">
                {p.etiology.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                    {e}
                  </li>
                ))}
              </ul>
            </Section>
            <Section icon={Microscope} title="Indagini strumentali">
              <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                {p.diagnostics.map((d, i) => (
                  <div key={d.name} className={`grid gap-1 px-4 py-3 sm:grid-cols-[200px_1fr] ${i % 2 ? 'bg-white/[0.015]' : ''}`}>
                    <p className="text-sm font-medium text-white">{d.name}</p>
                    <p className="text-sm text-slate-400">{d.finding}</p>
                  </div>
                ))}
              </div>
            </Section>
            <Section icon={Stethoscope} title="Trattamenti raccomandati">
              <div className="grid gap-2 sm:grid-cols-2">
                {p.treatments.map((t) => {
                  const Icon = TREATMENT_ICON[t.type];
                  return (
                    <div key={t.name} className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-cyan-300" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t.type}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-white">{t.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{t.detail}</p>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
          <aside className="space-y-5">
            <div className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-4">
              <Section icon={Activity} title="Sintomi riferiti">
                <ul className="space-y-1.5 text-sm text-slate-300">
                  {p.symptoms.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="text-cyan-400">›</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-4">
              <Section icon={AlertOctagon} title="Fattori di rischio">
                <div className="flex flex-wrap gap-1.5">
                  {p.riskFactors.map((r) => (
                    <span key={r} className="chip border-white/10 text-slate-300">
                      {r}
                    </span>
                  ))}
                </div>
              </Section>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-4 text-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500">Epidemiologia</p>
              <p className="mt-1 text-slate-300">{p.prevalence}</p>
              <p className="mt-3 text-xs uppercase tracking-wider text-slate-500">Priorità clinica</p>
              <span className={`chip mt-1 ${URGENCY_TONE[p.urgency]}`}>{p.urgency}</span>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  );
}
