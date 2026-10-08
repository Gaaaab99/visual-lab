import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, CheckCircle2, ExternalLink, Eye, EyeOff, Lightbulb, Maximize2, Microscope, Minus, Plus, RotateCcw, Tag } from 'lucide-react';
import { CASES, CASE_BY_ID } from '../../data/cases';
import { PATHOLOGY_BY_ID } from '../../data/pathologies';
import type { ClinicalCase, ImagingModality } from '../../types';
import { Modal } from '../../components/Modal';
import { SmartImage } from '../../components/SmartImage';
import { useApp } from '../../context/AppContext';

const MODALITIES: ImagingModality[] = ['Fondo oculare', 'Retinografia', 'Widefield', 'OCT', 'Topografia corneale', 'Lampada a fessura'];

const DIFF_TONE = { Base: 'text-emerald-300', Intermedio: 'text-amber-300', Avanzato: 'text-rose-300' };

interface Props {
  focusId: string | null;
  onFocusConsumed: () => void;
  onOpenPathology: (id: string) => void;
}

export function CasesView({ focusId, onFocusConsumed, onOpenPathology }: Props) {
  const { profile } = useApp();
  const [mod, setMod] = useState<ImagingModality | 'Tutte'>('Tutte');
  const [selected, setSelected] = useState<ClinicalCase | null>(null);

  useEffect(() => {
    if (focusId && CASE_BY_ID[focusId]) {
      setSelected(CASE_BY_ID[focusId]);
      onFocusConsumed();
    }
  }, [focusId, onFocusConsumed]);

  const list = useMemo(() => CASES.filter((c) => mod === 'Tutte' || c.modality === mod), [mod]);
  const available = MODALITIES.filter((m) => CASES.some((c) => c.modality === m));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/80">Atlante iconografico del bulbo oculare</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Casi clinici</h1>
          <p className="mt-1 text-sm text-slate-400">
            Immagini cliniche reali con storia, esame obiettivo, referto strumentale e diagnosi differenziale.
            {profile && (
              <span className="ml-1 text-cyan-300">
                Studiati {profile.casesStudied.length}/{CASES.length}.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['Tutte', ...available] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMod(m)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${mod === m ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
          >
            {m}
          </button>
        ))}
      </div>

      <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((c) => {
            const studied = profile?.casesStudied.includes(c.id);
            return (
              <motion.button
                layout
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelected(c)}
                className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-850 text-left transition hover:border-cyan-400/30"
              >
                <div className="relative">
                  <SmartImage src={c.image.src} alt={c.title} wrapperClassName="aspect-[4/3] bg-black" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute left-3 top-3 rounded-md bg-ink-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200 backdrop-blur">{c.modality}</span>
                  {studied && (
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-emerald-500/90 px-2 py-1 text-[10px] font-semibold text-white">
                      <CheckCircle2 size={12} /> Studiato
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-ink-950/70 text-slate-200 opacity-0 backdrop-blur transition group-hover:opacity-100">
                    <Maximize2 size={15} />
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white group-hover:text-cyan-100">{c.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">“{c.chiefComplaint}”</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      {c.patient.sex}, {c.patient.age} anni · {c.patient.eye}
                    </span>
                    <span className={`ml-auto font-medium ${DIFF_TONE[c.difficulty]}`}>{c.difficulty}</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <CaseModal clinicalCase={selected} onClose={() => setSelected(null)} onOpenPathology={onOpenPathology} />
    </div>
  );
}

/* ------------------------------------------------------------ Modal */

type Tab = 'storia' | 'esame' | 'referto' | 'differenziale' | 'decorso';
const TABS: { id: Tab; label: string }[] = [
  { id: 'storia', label: 'Storia clinica' },
  { id: 'esame', label: 'Esame obiettivo' },
  { id: 'referto', label: 'Referto strumentale' },
  { id: 'differenziale', label: 'Diagnosi differenziale' },
  { id: 'decorso', label: 'Decorso' },
];

function CaseModal({ clinicalCase: c, onClose, onOpenPathology }: { clinicalCase: ClinicalCase | null; onClose: () => void; onOpenPathology: (id: string) => void }) {
  const { markCaseStudied } = useApp();
  const [tab, setTab] = useState<Tab>('storia');
  const [revealed, setRevealed] = useState(false);
  const [labels, setLabels] = useState(true);
  const [activeLabel, setActiveLabel] = useState<number | null>(null);

  useEffect(() => {
    setTab('storia');
    setRevealed(false);
    setActiveLabel(null);
  }, [c?.id]);

  const reveal = () => {
    setRevealed(true);
    if (c) markCaseStudied(c.id);
  };

  const pathology = c ? PATHOLOGY_BY_ID[c.pathologyId] : null;

  return (
    <Modal
      open={!!c}
      onClose={onClose}
      size="full"
      icon={<Microscope size={18} />}
      title={c?.title}
      subtitle={c && `${c.modality} · ${c.patient.sex === 'M' ? 'Uomo' : 'Donna'}, ${c.patient.age} anni · ${c.patient.eye} · livello ${c.difficulty.toLowerCase()}`}
    >
      {c && (
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="border-b border-white/[0.06] p-4 lg:border-b-0 lg:border-r">
            <ZoomableImage c={c} showLabels={labels} activeLabel={activeLabel} onLabel={setActiveLabel} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="btn-ghost py-1.5 text-xs" onClick={() => setLabels((l) => !l)}>
                {labels ? <EyeOff size={14} /> : <Eye size={14} />} {labels ? 'Nascondi etichette' : 'Mostra etichette'}
              </button>
              <a href={c.image.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 hover:text-cyan-300">
                {c.image.credit} · {c.image.license} <ExternalLink size={11} />
              </a>
            </div>
            {labels && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {c.labels.map((l, i) => (
                  <li key={i}>
                    <button
                      onMouseEnter={() => setActiveLabel(i)}
                      onMouseLeave={() => setActiveLabel(null)}
                      onClick={() => setActiveLabel(i)}
                      className={`flex w-full gap-2 rounded-lg border p-2.5 text-left transition ${activeLabel === i ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/[0.06] bg-ink-900/40'}`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white">{i + 1}</span>
                      <span>
                        <span className="block text-xs font-medium text-white">{l.text}</span>
                        <span className="block text-[11px] text-slate-400">{l.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex min-w-0 flex-col p-4">
            <div className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3 text-sm">
              <span className="text-xs uppercase tracking-wider text-slate-500">Motivo della visita</span>
              <p className="mt-1 italic text-slate-200">“{c.chiefComplaint}”</p>
            </div>

            <div className="mt-4 flex gap-1 overflow-x-auto border-b border-white/[0.06]">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`relative shrink-0 px-3 py-2 text-xs font-medium transition ${tab === t.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {t.label}
                  {tab === t.id && <motion.span layoutId="case-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-cyan-400" />}
                </button>
              ))}
            </div>

            <div className="min-h-[180px] py-4 text-sm leading-relaxed text-slate-300">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                  {tab === 'storia' && <p>{c.history}</p>}
                  {tab === 'esame' && (
                    <ul className="space-y-1.5">
                      {c.examination.map((e) => (
                        <li key={e} className="flex gap-2">
                          <span className="text-cyan-400">›</span>
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                  {tab === 'referto' && <p className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-3 font-mono text-[12.5px] leading-relaxed text-slate-200">{c.instrumentalReport}</p>}
                  {tab === 'differenziale' && (
                    <div className="space-y-2">
                      {c.differential.map((d) => (
                        <div key={d.name} className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3">
                          <p className="font-medium text-white">{d.name}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{d.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {tab === 'decorso' && (revealed ? <p>{c.course}</p> : <p className="text-slate-500">Rivela la diagnosi per visualizzare il decorso clinico.</p>)}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-auto space-y-3">
              <AnimatePresence mode="wait">
                {revealed ? (
                  <motion.div key="dx" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      <Tag size={13} /> Diagnosi finale
                    </p>
                    <p className="mt-1.5 font-medium text-white">{c.diagnosis}</p>
                    <ul className="mt-3 space-y-1">
                      {c.teachingPoints.map((t) => (
                        <li key={t} className="flex gap-2 text-xs text-slate-300">
                          <Lightbulb size={13} className="mt-0.5 shrink-0 text-amber-300" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ) : (
                  <motion.button key="btn" onClick={reveal} className="btn-primary w-full py-2.5" exit={{ opacity: 0 }}>
                    <Lightbulb size={16} /> Formula la tua ipotesi e rivela la diagnosi
                  </motion.button>
                )}
              </AnimatePresence>
              {pathology && (
                <button className="btn-ghost w-full" onClick={() => onOpenPathology(pathology.id)}>
                  <BookOpen size={15} /> Scheda: {pathology.name}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------ Zoom */

function ZoomableImage({ c, showLabels, activeLabel, onLabel }: { c: ClinicalCase; showLabels: boolean; activeLabel: number | null; onLabel: (i: number | null) => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, [c.id]);

  const clampPos = (x: number, y: number, s: number) => {
    const el = boxRef.current;
    if (!el) return { x, y };
    const mx = ((s - 1) * el.clientWidth) / 2;
    const my = ((s - 1) * el.clientHeight) / 2;
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  };

  const zoom = (delta: number) =>
    setScale((s) => {
      const n = Math.min(5, Math.max(1, +(s + delta).toFixed(2)));
      setPos((p) => clampPos(p.x, p.y, n));
      return n;
    });

  const onWheel = (e: RWheelEvent) => {
    zoom(e.deltaY < 0 ? 0.25 : -0.25);
  };

  const onDown = (e: RPointerEvent) => {
    if (scale === 1) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    if (!drag.current) return;
    setPos(clampPos(drag.current.px + e.clientX - drag.current.x, drag.current.py + e.clientY - drag.current.y, scale));
  };

  return (
    <div className="relative">
      <div
        ref={boxRef}
        className={`relative overflow-hidden rounded-xl bg-black ring-1 ring-white/10 ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        style={{ aspectRatio: `${c.image.width} / ${c.image.height}`, width: `min(100%, calc(62vh * ${c.image.width / c.image.height}))`, marginInline: 'auto' }}
        onWheel={onWheel}
        onDoubleClick={() => (scale > 1 ? (setScale(1), setPos({ x: 0, y: 0 })) : zoom(1.5))}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
      >
        <div className="absolute inset-0 transition-transform duration-75" style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}>
          <SmartImage src={c.image.src} alt={c.title} loading="eager" wrapperClassName="h-full w-full" className="h-full w-full select-none object-contain" draggable={false} />
          {showLabels &&
            c.labels.map((l, i) => (
              <button
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${l.x}%`, top: `${l.y}%`, scale: 1 / scale }}
                onMouseEnter={() => onLabel(i)}
                onMouseLeave={() => onLabel(null)}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={l.text}
              >
                <span className="relative flex h-6 w-6 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/40" />
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-cyan-500 text-[10px] font-bold text-white shadow-lg">{i + 1}</span>
                </span>
                <AnimatePresence>
                  {activeLabel === i && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute left-1/2 top-8 z-10 w-48 -translate-x-1/2 rounded-lg border border-cyan-400/30 bg-ink-950/95 p-2 text-left shadow-xl"
                    >
                      <span className="block text-xs font-semibold text-cyan-200">{l.text}</span>
                      <span className="block text-[11px] text-slate-300">{l.detail}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
        </div>
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-white/10 bg-ink-950/80 p-1 backdrop-blur">
        <button className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" onClick={() => zoom(-0.5)} aria-label="Riduci">
          <Minus size={15} />
        </button>
        <span className="w-12 text-center font-mono text-[11px] text-slate-300">{Math.round(scale * 100)}%</span>
        <button className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" onClick={() => zoom(0.5)} aria-label="Ingrandisci">
          <Plus size={15} />
        </button>
        <button
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
          onClick={() => {
            setScale(1);
            setPos({ x: 0, y: 0 });
          }}
          aria-label="Reimposta zoom"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
