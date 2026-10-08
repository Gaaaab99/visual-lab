import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  CheckCircle2,
  Contrast,
  ExternalLink,
  Eye,
  EyeOff,
  GraduationCap,
  Lightbulb,
  Maximize2,
  Microscope,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Sun,
  Tag,
  XCircle,
} from 'lucide-react';
import { CASES, CASE_BY_ID } from '../../data/cases';
import { PATHOLOGY_BY_ID } from '../../data/pathologies';
import type { ClinicalCase, ImagingModality } from '../../types';
import { Modal } from '../../components/Modal';
import { SmartImage } from '../../components/SmartImage';
import { PageHeader } from '../../components/PageHeader';
import { useApp } from '../../context/AppContext';
import { mulberry32 } from '../simulator/engine';

const MODALITIES: ImagingModality[] = ['Fondo oculare', 'Retinografia', 'Widefield', 'OCT', 'Topografia corneale', 'Lampada a fessura'];
const DIFFICULTIES = ['Tutti', 'Base', 'Intermedio', 'Avanzato'] as const;

const DIFF_TONE: Record<ClinicalCase['difficulty'], string> = {
  Base: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  Intermedio: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  Avanzato: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
};

interface Props {
  focusId: string | null;
  onFocusConsumed: () => void;
  onOpenPathology: (id: string) => void;
}

export function CasesView({ focusId, onFocusConsumed, onOpenPathology }: Props) {
  const { profile } = useApp();
  const [mod, setMod] = useState<ImagingModality | 'Tutte'>('Tutte');
  const [diff, setDiff] = useState<(typeof DIFFICULTIES)[number]>('Tutti');
  const [q, setQ] = useState('');
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [selected, setSelected] = useState<ClinicalCase | null>(null);

  useEffect(() => {
    if (focusId && CASE_BY_ID[focusId]) {
      setSelected(CASE_BY_ID[focusId]);
      onFocusConsumed();
    }
  }, [focusId, onFocusConsumed]);

  const studied = profile?.casesStudied ?? [];
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return CASES.filter(
      (c) =>
        (mod === 'Tutte' || c.modality === mod) &&
        (diff === 'Tutti' || c.difficulty === diff) &&
        (!onlyTodo || !studied.includes(c.id)) &&
        (!t || `${c.title} ${c.chiefComplaint} ${c.modality}`.toLowerCase().includes(t)),
    );
  }, [mod, diff, q, onlyTodo, studied]);
  const available = MODALITIES.filter((m) => CASES.some((c) => c.modality === m));
  const pct = Math.round((studied.filter((id) => CASE_BY_ID[id]).length / CASES.length) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Atlante iconografico del bulbo oculare"
        title="Casi clinici"
        icon={<Microscope size={22} />}
        description="Immagini cliniche reali con anamnesi, esame obiettivo, referto strumentale e diagnosi differenziale. Formula la tua ipotesi prima di rivelare la diagnosi."
        actions={
          <div className="panel flex items-center gap-3 px-4 py-2.5">
            <GraduationCap size={18} className="text-cyan-300" />
            <div>
              <p className="text-xs text-slate-400">Casi studiati</p>
              <p className="text-sm font-semibold text-white">
                {studied.filter((id) => CASE_BY_ID[id]).length}/{CASES.length}
              </p>
            </div>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-700">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        }
      />

      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-52 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Cerca un caso…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={mod} onChange={(e) => setMod(e.target.value as ImagingModality | 'Tutte')} aria-label="Metodica">
          <option value="Tutte">Tutte le metodiche</option>
          {available.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <div className="flex rounded-xl border border-white/10 p-0.5">
          {DIFFICULTIES.map((d) => (
            <button key={d} onClick={() => setDiff(d)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${diff === d ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}>
              {d}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={onlyTodo} onChange={(e) => setOnlyTodo(e.target.checked)} className="accent-cyan-500" /> Solo da studiare
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
            onClick={() => setSelected(c)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-850 text-left shadow-lg shadow-black/20 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-cyan-500/10"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-black">
              <SmartImage
                src={c.image.src}
                alt={c.title}
                wrapperClassName="absolute inset-0"
                className={`h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04] ${c.modality === 'Topografia corneale' || c.modality === 'OCT' ? 'object-contain' : 'object-cover'}`}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-850 to-transparent" />
              <span className="absolute left-3 top-3 rounded-md bg-ink-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200 backdrop-blur">{c.modality}</span>
              {studied.includes(c.id) && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-emerald-500/90 px-2 py-1 text-[10px] font-semibold text-white">
                  <CheckCircle2 size={12} /> Studiato
                </span>
              )}
              <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-ink-950/70 text-slate-200 opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
                <Maximize2 size={15} />
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-semibold text-white transition-colors group-hover:text-cyan-100">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">“{c.chiefComplaint}”</p>
              <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-slate-500">
                <span>
                  {c.patient.sex === 'M' ? '♂' : '♀'} {c.patient.age} anni · {c.patient.eye}
                </span>
                <span className={`chip ml-auto ${DIFF_TONE[c.difficulty]}`}>{c.difficulty}</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
      {list.length === 0 && <p className="py-16 text-center text-sm text-slate-500">Nessun caso corrisponde ai filtri.</p>}

      <CaseModal clinicalCase={selected} onClose={() => setSelected(null)} onOpenPathology={onOpenPathology} />
    </div>
  );
}

/* ------------------------------------------------------------ Modal */

type Tab = 'storia' | 'esame' | 'referto' | 'differenziale' | 'decorso';
const TABS: { id: Tab; label: string }[] = [
  { id: 'storia', label: 'Anamnesi' },
  { id: 'esame', label: 'Esame obiettivo' },
  { id: 'referto', label: 'Referto' },
  { id: 'differenziale', label: 'Differenziale' },
  { id: 'decorso', label: 'Decorso' },
];

function buildOptions(c: ClinicalCase): string[] {
  const rnd = mulberry32(c.id.length * 7919 + c.id.charCodeAt(5));
  const opts = [c.diagnosis, ...c.differential.slice(0, 3).map((d) => d.name)];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

function CaseModal({ clinicalCase: c, onClose, onOpenPathology }: { clinicalCase: ClinicalCase | null; onClose: () => void; onOpenPathology: (id: string) => void }) {
  const { markCaseStudied, awardXp } = useApp();
  const [tab, setTab] = useState<Tab>('storia');
  const [answer, setAnswer] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [labels, setLabels] = useState(true);
  const [activeLabel, setActiveLabel] = useState<number | null>(null);

  useEffect(() => {
    setTab('storia');
    setRevealed(false);
    setAnswer(null);
    setActiveLabel(null);
    setLabels(true);
  }, [c?.id]);

  const options = useMemo(() => (c ? buildOptions(c) : []), [c]);

  const choose = (opt: string) => {
    if (!c || answer) return;
    setAnswer(opt);
    setRevealed(true);
    markCaseStudied(c.id);
    if (opt === c.diagnosis) awardXp(15, 'Diagnosi corretta');
  };

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
            <ImageViewer key={c.id} c={c} showLabels={labels && revealed} activeLabel={activeLabel} onLabel={setActiveLabel} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="btn-ghost py-1.5 text-xs" onClick={() => setLabels((l) => !l)} disabled={!revealed} title={revealed ? '' : 'Disponibili dopo la diagnosi'}>
                {labels ? <EyeOff size={14} /> : <Eye size={14} />} {labels ? 'Nascondi etichette' : 'Mostra etichette'}
              </button>
              <a href={c.image.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 hover:text-cyan-300">
                {c.image.credit} · {c.image.license} <ExternalLink size={11} />
              </a>
            </div>
            {revealed && labels && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {c.labels.map((l, i) => (
                  <li key={i}>
                    <button
                      onMouseEnter={() => setActiveLabel(i)}
                      onMouseLeave={() => setActiveLabel(null)}
                      onClick={() => setActiveLabel(activeLabel === i ? null : i)}
                      className={`flex w-full gap-2 rounded-lg border p-2.5 text-left transition-colors ${activeLabel === i ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/[0.06] bg-ink-900/40'}`}
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
            {!revealed && <p className="mt-3 text-xs text-slate-500">Le etichette diagnostiche si sbloccano dopo aver formulato la diagnosi.</p>}
          </div>

          <div className="flex min-w-0 flex-col p-4">
            <div className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3 text-sm">
              <span className="text-xs uppercase tracking-wider text-slate-500">Motivo della visita</span>
              <p className="mt-1 italic text-slate-200">“{c.chiefComplaint}”</p>
            </div>

            <div className="mt-4 flex gap-1 overflow-x-auto border-b border-white/[0.06]">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`relative shrink-0 px-3 py-2 text-xs font-medium transition-colors ${tab === t.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {t.label}
                  {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-cyan-400" />}
                </button>
              ))}
            </div>

            <div className="min-h-[170px] py-4 text-sm leading-relaxed text-slate-300">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
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
                  {tab === 'differenziale' &&
                    (revealed ? (
                      <div className="space-y-2">
                        {c.differential.map((d) => (
                          <div key={d.name} className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3">
                            <p className="font-medium text-white">{d.name}</p>
                            <p className="mt-0.5 text-xs text-slate-400">{d.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500">La discussione della diagnosi differenziale è disponibile dopo la risposta.</p>
                    ))}
                  {tab === 'decorso' && (revealed ? <p>{c.course}</p> : <p className="text-slate-500">Rivela la diagnosi per visualizzare il decorso clinico.</p>)}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-auto space-y-3">
              {!revealed && (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300/90">
                    <GraduationCap size={14} /> Qual è la tua diagnosi?
                  </p>
                  <div className="grid gap-2">
                    {options.map((o) => (
                      <button key={o} onClick={() => choose(o)} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/[0.05]">
                        {o}
                      </button>
                    ))}
                  </div>
                  <button className="mt-2 text-xs text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline" onClick={reveal}>
                    Salta e mostra la diagnosi
                  </button>
                </div>
              )}
              {revealed && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {answer && (
                    <p className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${answer === c.diagnosis ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-rose-400/30 bg-rose-400/10 text-rose-100'}`}>
                      {answer === c.diagnosis ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {answer === c.diagnosis ? 'Corretto!' : `Hai risposto: ${answer}`}
                    </p>
                  )}
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-4">
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
                  </div>
                </motion.div>
              )}
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

/* ------------------------------------------------------------ Viewer */

type Filter = 'none' | 'redfree' | 'invert';

function ImageViewer({ c, showLabels, activeLabel, onLabel }: { c: ClinicalCase; showLabels: boolean; activeLabel: number | null; onLabel: (i: number | null) => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [filter, setFilter] = useState<Filter>('none');
  const [loaded, setLoaded] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  scaleRef.current = scale;

  const clampPos = useCallback((x: number, y: number, s: number) => {
    const el = boxRef.current;
    if (!el) return { x, y };
    const mx = ((s - 1) * el.clientWidth) / 2;
    const my = ((s - 1) * el.clientHeight) / 2;
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  }, []);

  const setZoom = useCallback(
    (n: number) => {
      const s = Math.min(6, Math.max(1, +n.toFixed(2)));
      setScale(s);
      setPos((p) => (s === 1 ? { x: 0, y: 0 } : clampPos(p.x, p.y, s)));
    },
    [clampPos],
  );

  // wheel non passivo: lo zoom non deve far scorrere la pagina
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(scaleRef.current * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom]);

  const onDown = (e: RPointerEvent) => {
    if (scale === 1) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    if (!drag.current) return;
    setPos(clampPos(drag.current.px + e.clientX - drag.current.x, drag.current.py + e.clientY - drag.current.y, scale));
  };
  const endDrag = () => (drag.current = null);

  const cssFilter = [
    `brightness(${bright}%)`,
    `contrast(${contrast}%)`,
    filter === 'redfree' ? 'url(#vl-redfree)' : '',
    filter === 'invert' ? 'invert(1) hue-rotate(180deg)' : '',
  ].join(' ');
  const ratio = c.image.width / c.image.height;

  return (
    <div>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="vl-redfree">
          <feColorMatrix type="matrix" values="0 1 0 0 0  0 1 0 0 0  0 1 0 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      <div className="relative">
        <div
          ref={boxRef}
          className={`relative mx-auto touch-none overflow-hidden rounded-xl bg-black ring-1 ring-white/10 ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
          style={{ aspectRatio: `${ratio}`, width: `min(100%, calc(60vh * ${ratio}))` }}
          onDoubleClick={() => setZoom(scale > 1 ? 1 : 2.5)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {!loaded && <div className="skeleton absolute inset-0" />}
          <div className="absolute inset-0 origin-center will-change-transform" style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})` }}>
            <img
              src={c.image.src}
              alt={c.title}
              draggable={false}
              referrerPolicy="no-referrer"
              onLoad={() => setLoaded(true)}
              className={`h-full w-full select-none object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ filter: cssFilter }}
            />
            {showLabels &&
              loaded &&
              c.labels.map((l, i) => (
                <div key={i} className="absolute" style={{ left: `${l.x}%`, top: `${l.y}%`, transform: `translate(-50%, -50%) scale(${1 / scale})` }}>
                  <button
                    className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-cyan-500 text-[10px] font-bold text-white shadow-lg shadow-black/50 transition-transform hover:scale-110"
                    onMouseEnter={() => onLabel(i)}
                    onMouseLeave={() => onLabel(null)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onLabel(activeLabel === i ? null : i)}
                    aria-label={l.text}
                  >
                    {activeLabel === i && <span className="absolute -inset-1.5 rounded-full border-2 border-cyan-300/70" />}
                    {i + 1}
                  </button>
                  {activeLabel === i && (
                    <div className="pointer-events-none absolute left-1/2 top-8 z-10 w-48 -translate-x-1/2 rounded-lg border border-cyan-400/30 bg-ink-950/95 p-2 text-left shadow-xl">
                      <span className="block text-xs font-semibold text-cyan-200">{l.text}</span>
                      <span className="block text-[11px] text-slate-300">{l.detail}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-white/10 bg-ink-950/85 p-1 backdrop-blur">
          <button className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" onClick={() => setZoom(scale / 1.5)} aria-label="Riduci">
            <Minus size={15} />
          </button>
          <span className="w-12 text-center font-mono text-[11px] text-slate-300">{Math.round(scale * 100)}%</span>
          <button className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" onClick={() => setZoom(scale * 1.5)} aria-label="Ingrandisci">
            <Plus size={15} />
          </button>
          <button className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" onClick={() => setZoom(1)} aria-label="Reimposta zoom">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 rounded-xl border border-white/[0.06] bg-ink-900/40 p-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          <Sun size={14} className="shrink-0" />
          <input type="range" min={50} max={180} value={bright} onChange={(e) => setBright(+e.target.value)} aria-label="Luminosità" />
        </label>
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          <Contrast size={14} className="shrink-0" />
          <input type="range" min={50} max={200} value={contrast} onChange={(e) => setContrast(+e.target.value)} aria-label="Contrasto" />
        </label>
        <div className="flex gap-1">
          {(
            [
              ['none', 'Originale'],
              ['redfree', 'Red-free'],
              ['invert', 'Inverti'],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${filter === f ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">Rotella o doppio clic per lo zoom, trascina per spostarti. Il filtro red-free evidenzia vasi ed emorragie.</p>
    </div>
  );
}
