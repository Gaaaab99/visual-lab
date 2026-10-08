import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  Camera,
  CameraOff,
  ChevronDown,
  Columns2,
  FilePlus2,
  ImageUp,
  Info,
  Layers,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Crosshair,
  Eye,
  Maximize,
  Pause,
  Play,
  MessageCircleHeart,
} from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import type { ColorBlindType, ConditionId, Quadrant, SceneId, SimulationSnapshot, SimulatorState, VisualSource } from '../../types';
import { CLINICAL_PRESETS, COLOR_BLIND_LABEL, CONDITIONS, CONDITION_BY_ID, PATIENT_INFO, QUADRANT_LABEL, STAGES, createInitialState, type ConditionMeta, type StageId } from './conditions';
import { SCENE_LABEL, describeCondition, snapshot } from './engine';
import { Viewport } from './Viewport';

const SCENE_ORDER: SceneId[] = ['city', 'night', 'reading', 'faces', 'stairs', 'amsler', 'ishihara'];

const GROUP_ORDER: ConditionMeta['group'][] = ['Mezzi diottrici', 'Retina', 'Nervo ottico', 'Refrazione', 'Cornea', 'Uvea', 'Colore', 'Funzionale'];

interface Props {
  state: SimulatorState;
  setState: Dispatch<SetStateAction<SimulatorState>>;
  source: VisualSource;
  setSource: (s: VisualSource) => void;
  onGenerateReport: (snap: SimulationSnapshot) => void;
  onOpenPathology: (pathologyId: string) => void;
}

export function SimulatorView({ state, setState, source, setSource, onGenerateReport, onOpenPathology }: Props) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [gaze, setGaze] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);

  /* ---------------- progressione temporale ---------------- */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    const DURATION = 7000;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / DURATION);
      setProgress(k);
      if (k < 1) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const displayState = useMemo<SimulatorState>(() => {
    if (progress >= 1) return state;
    const conditions = { ...state.conditions };
    (Object.keys(conditions) as ConditionId[]).forEach((id) => {
      conditions[id] = { ...conditions[id], severity: Math.round(conditions[id].severity * progress) };
    });
    const p = state.params;
    return {
      conditions,
      params: { ...p, myopiaDiopters: p.myopiaDiopters * progress, hyperopiaDiopters: p.hyperopiaDiopters * progress, astigmatismCylinder: p.astigmatismCylinder * progress },
    };
  }, [state, progress]);

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => undefined);
  };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ 'Mezzi diottrici': true, Retina: true, 'Nervo ottico': true, Refrazione: true });
  const fileRef = useRef<HTMLInputElement>(null);

  const active = useMemo(() => CONDITIONS.filter((c) => state.conditions[c.id].enabled), [state]);

  /* ---------------- webcam ---------------- */
  useEffect(() => {
    if (source.kind !== 'webcam') return;
    let cancelled = false;
    let local: MediaStream | null = null;
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Il browser non supporta l’accesso alla webcam.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 800 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        local = s;
        setStream(s);
      })
      .catch((e: DOMException) => setCamError(e.name === 'NotAllowedError' ? 'Permesso webcam negato.' : 'Webcam non disponibile.'));
    return () => {
      cancelled = true;
      local?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [source.kind]);

  /* ---------------- state helpers ---------------- */
  const toggle = (id: ConditionId) => setState((s) => ({ ...s, conditions: { ...s.conditions, [id]: { ...s.conditions[id], enabled: !s.conditions[id].enabled } } }));
  const setSeverity = (id: ConditionId, v: number) => setState((s) => ({ ...s, conditions: { ...s.conditions, [id]: { enabled: true, severity: v } } }));
  const setParam = <K extends keyof SimulatorState['params']>(k: K, v: SimulatorState['params'][K]) => setState((s) => ({ ...s, params: { ...s.params, [k]: v } }));

  const applyStage = (stage: StageId) => {
    const sev = STAGES.find((s) => s.id === stage)!.severity;
    setState((s) => {
      const ids = (Object.keys(s.conditions) as ConditionId[]).filter((id) => s.conditions[id].enabled);
      const targets = ids.length ? ids : (['cataract'] as ConditionId[]);
      const conditions = { ...s.conditions };
      targets.forEach((id) => (conditions[id] = { enabled: true, severity: sev }));
      const k = sev / 100;
      return {
        conditions,
        params: {
          ...s.params,
          myopiaDiopters: conditions.myopia.enabled ? -Math.round(k * 10 * 4) / 4 : s.params.myopiaDiopters,
          hyperopiaDiopters: conditions.hyperopia.enabled ? Math.round(k * 6 * 4) / 4 : s.params.hyperopiaDiopters,
          astigmatismCylinder: conditions.astigmatism.enabled ? Math.round(k * 5 * 4) / 4 : s.params.astigmatismCylinder,
        },
      };
    });
  };

  const applyPreset = (id: string) => {
    const p = CLINICAL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    const base = createInitialState();
    (Object.entries(p.conditions) as [ConditionId, number][]).forEach(([cid, sev]) => (base.conditions[cid] = { enabled: true, severity: sev }));
    setState({ conditions: base.conditions, params: { ...state.params, ...p.params } });
  };

  const reset = () => setState(createInitialState());

  const onUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (source.kind === 'upload') URL.revokeObjectURL(source.url);
    setSource({ kind: 'upload', url: URL.createObjectURL(file), name: file.name });
  };

  const grouped = GROUP_ORDER.map((g) => ({ group: g, items: CONDITIONS.filter((c) => c.group === g) })).filter((g) => g.items.length);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* ======================= Viewport column ======================= */}
      <section className="min-w-0 space-y-4">
        <PageHeader
          eyebrow="Simulatore ottico interattivo"
          title="Visione soggettiva del paziente"
          icon={<Eye size={22} />}
          actions={
          <>
            <button className={`btn-ghost ${compare ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : ''}`} onClick={() => setCompare((c) => !c)} aria-pressed={compare}>
              <Columns2 size={16} /> Confronto
            </button>
            <button className="btn-ghost" onClick={reset}>
              <RotateCcw size={16} /> Reset
            </button>
            <button className="btn-primary" onClick={() => onGenerateReport(snapshot(state, source))}>
              <FilePlus2 size={16} /> Genera referto
            </button>
          </>
          }
        />

        <div className="panel p-2 sm:p-3">
          <div ref={stageRef} className="relative flex items-center justify-center bg-ink-950 [&:fullscreen]:p-6">
            <div className="w-full">
              <Viewport state={displayState} source={source} stream={stream} compare={compare} gazeMode={gaze} />
            </div>
            <div className="absolute bottom-3 right-3 z-20 flex gap-1 rounded-xl border border-white/10 bg-ink-950/80 p-1 backdrop-blur">
              <button
                className={`rounded-lg p-2 transition-colors ${playing ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-white/10'}`}
                onClick={() => {
                  if (playing) {
                    setPlaying(false);
                    setProgress(1);
                  } else if (active.length) {
                    setProgress(0);
                    setPlaying(true);
                  }
                }}
                disabled={!active.length}
                title="Riproduci la progressione della malattia"
                aria-label="Riproduci progressione"
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                className={`rounded-lg p-2 transition-colors ${gaze ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-white/10'}`}
                onClick={() => setGaze((g) => !g)}
                aria-pressed={gaze}
                title="Visione contingente allo sguardo: i deficit retinici seguono il puntatore"
                aria-label="Segui lo sguardo"
              >
                <Crosshair size={16} />
              </button>
              <button className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10" onClick={toggleFullscreen} title="Schermo intero" aria-label="Schermo intero">
                <Maximize size={16} />
              </button>
            </div>
            {playing && (
              <div className="absolute inset-x-6 bottom-16 z-20 sm:inset-x-24">
                <div className="mb-1 flex justify-between text-[11px] font-medium text-white drop-shadow">
                  <span>Esordio</span>
                  <span>{progress < 0.34 ? 'Stadio iniziale' : progress < 0.67 ? 'Stadio moderato' : 'Stadio attuale'}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            )}
            {source.kind === 'webcam' && !stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-ink-950/90 text-center">
                {camError ? <CameraOff className="text-rose-300" size={30} /> : <Camera className="animate-pulse text-cyan-300" size={30} />}
                <p className="text-sm text-slate-300">{camError ?? 'Richiesta accesso alla webcam…'}</p>
                {camError && (
                  <button className="btn-ghost" onClick={() => setSource({ kind: 'scene', scene: 'city' })}>
                    Torna alle scene
                  </button>
                )}
              </div>
            )}
            <AnimatePresence>
              {active.length > 0 && !compare && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-3 top-3 flex max-w-[80%] flex-wrap gap-1.5">
                  {active.map((c) => (
                    <span key={c.id} className="rounded-md bg-ink-950/75 px-2 py-1 font-mono text-[10px] font-medium text-cyan-200 backdrop-blur">
                      {c.short} {state.conditions[c.id].severity}%
                    </span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* sorgenti */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SCENE_ORDER.map((sc) => (
              <button
                key={sc}
                onClick={() => setSource({ kind: 'scene', scene: sc })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  source.kind === 'scene' && source.scene === sc ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                {SCENE_LABEL[sc]}
              </button>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
            <button
              onClick={() => setSource({ kind: 'webcam' })}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                source.kind === 'webcam' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera size={14} /> Webcam
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                source.kind === 'upload' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageUp size={14} /> {source.kind === 'upload' ? source.name.slice(0, 18) : 'Carica immagine'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* riepilogo clinico */}
        <div className="panel p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Layers size={16} className="text-cyan-300" /> Parametri attivi
          </div>
          {active.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Nessuna patologia attiva: viene mostrata la visione di riferimento. Attiva una o più condizioni dal pannello o scegli un preset clinico.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {active.map((c) => (
                <li key={c.id} className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-ink-900/50 p-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-100">{describeCondition(state, c.id)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{c.effect}</p>
                  </div>
                  <button className="rounded-md p-1 text-slate-500 hover:text-cyan-300" title="Apri scheda patologia" onClick={() => onOpenPathology(c.pathologyId)}>
                    <BookOpen size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {active.length > 0 && (
          <div className="panel p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <MessageCircleHeart size={16} className="text-rose-300" /> Spiegazione per il paziente
            </div>
            <p className="mt-1 text-xs text-slate-500">Linguaggio semplice da condividere durante il colloquio.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {active.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3">
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{PATIENT_INFO[c.id].sees}</p>
                  <ul className="mt-2 space-y-1">
                    {PATIENT_INFO[c.id].tips.map((t) => (
                      <li key={t} className="flex gap-2 text-xs text-slate-400">
                        <span className="text-emerald-400">✓</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ======================= Control panel ======================= */}
      <aside className="space-y-4">
        <div className="panel p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Sparkles size={16} className="text-cyan-300" /> Stadio clinico
          </div>
          <p className="mt-1 text-xs text-slate-500">Applica la severità a tutte le condizioni attive.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {STAGES.map((s) => (
              <button key={s.id} onClick={() => applyStage(s.id)} className="btn-ghost flex-col gap-0.5 py-2">
                <span>{s.label}</span>
                <span className="font-mono text-[10px] text-slate-500">{s.severity}%</span>
              </button>
            ))}
          </div>
          <label className="label mt-4">Preset combinati</label>
          <div className="grid grid-cols-2 gap-2">
            {CLINICAL_PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p.id)} title={p.description} className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-left text-xs text-slate-300 transition hover:border-cyan-400/40 hover:text-white">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <SlidersHorizontal size={16} className="text-cyan-300" /> Patologie
            </div>
            <span className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-200">{active.length} attive</span>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
            {grouped.map(({ group, items }) => {
              const isOpen = openGroups[group] ?? false;
              const count = items.filter((c) => state.conditions[c.id].enabled).length;
              return (
                <div key={group} className="border-b border-white/[0.04] last:border-0">
                  <button onClick={() => setOpenGroups((o) => ({ ...o, [group]: !isOpen }))} className="flex w-full items-center justify-between px-4 py-2.5 text-left">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {group} {count > 0 && <span className="ml-1 text-cyan-300">· {count}</span>}
                    </span>
                    <ChevronDown size={16} className={`text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="space-y-2 px-3 pb-3">
                          {items.map((c) => (
                            <ConditionControl key={c.id} meta={c} state={state} onToggle={toggle} onSeverity={setSeverity} setParam={setParam} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
        <p className="flex gap-2 px-1 text-[11px] leading-relaxed text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0" /> Simulazione a scopo educativo: rappresenta un’approssimazione della percezione soggettiva riferita dai pazienti.
        </p>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------ Control */

interface ControlProps {
  meta: ConditionMeta;
  state: SimulatorState;
  onToggle: (id: ConditionId) => void;
  onSeverity: (id: ConditionId, v: number) => void;
  setParam: <K extends keyof SimulatorState['params']>(k: K, v: SimulatorState['params'][K]) => void;
}

function ConditionControl({ meta, state, onToggle, onSeverity, setParam }: ControlProps) {
  const c = state.conditions[meta.id];
  const p = state.params;
  const usesDiopters = meta.id === 'myopia' || meta.id === 'hyperopia';
  return (
    <div className={`rounded-xl border p-3 transition ${c.enabled ? 'border-cyan-400/30 bg-cyan-400/[0.05]' : 'border-white/[0.06] bg-ink-900/40'}`}>
      <div className="flex items-center gap-3">
        <button
          role="switch"
          aria-checked={c.enabled}
          aria-label={`Attiva ${meta.name}`}
          onClick={() => onToggle(meta.id)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition ${c.enabled ? 'bg-cyan-500' : 'bg-ink-600'}`}
        >
          <motion.span
            className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow"
            initial={false}
            animate={{ x: c.enabled ? 16 : 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 34 }}
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${c.enabled ? 'text-white' : 'text-slate-300'}`}>{meta.name}</p>
        </div>
        {!usesDiopters && <span className="font-mono text-xs text-slate-400">{c.severity}%</span>}
      </div>

      {usesDiopters ? (
        <Slider
          label={meta.id === 'myopia' ? 'Diottrie (sfera)' : 'Diottrie (sfera)'}
          value={meta.id === 'myopia' ? p.myopiaDiopters : p.hyperopiaDiopters}
          min={meta.id === 'myopia' ? -12 : 0}
          max={meta.id === 'myopia' ? 0 : 8}
          step={0.25}
          format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)} D`}
          onChange={(v) => {
            if (meta.id === 'myopia') setParam('myopiaDiopters', v);
            else setParam('hyperopiaDiopters', v);
            const sev = Math.round((Math.abs(v) / (meta.id === 'myopia' ? 12 : 8)) * 100);
            onSeverity(meta.id, sev);
          }}
        />
      ) : (
        <Slider label="Severità" value={c.severity} min={0} max={100} step={1} format={(v) => `${v}%`} onChange={(v) => onSeverity(meta.id, v)} />
      )}

      {meta.id === 'astigmatism' && (
        <>
          <Slider label="Cilindro" value={p.astigmatismCylinder} min={0.25} max={6} step={0.25} format={(v) => `−${v.toFixed(2)} D`} onChange={(v) => setParam('astigmatismCylinder', v)} />
          <Slider label="Asse" value={p.astigmatismAxis} min={0} max={180} step={5} format={(v) => `${v}°`} onChange={(v) => setParam('astigmatismAxis', v)} />
        </>
      )}
      {meta.id === 'colorBlindness' && (
        <div className="mt-2 grid grid-cols-3 gap-1">
          {(Object.keys(COLOR_BLIND_LABEL) as ColorBlindType[]).map((t) => (
            <button
              key={t}
              onClick={() => setParam('colorBlindType', t)}
              className={`rounded-md border px-1.5 py-1 text-[11px] ${p.colorBlindType === t ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400'}`}
            >
              {COLOR_BLIND_LABEL[t].split(' ')[0]}
            </button>
          ))}
        </div>
      )}
      {meta.id === 'retinalDetachment' && (
        <div className="mt-2">
          <p className="mb-1 text-[11px] text-slate-500">Settore retinico distaccato (OD) · difetto di campo controlaterale</p>
          <div className="grid grid-cols-4 gap-1">
            {(Object.keys(QUADRANT_LABEL) as Quadrant[]).map((q) => (
              <button
                key={q}
                onClick={() => setParam('detachmentQuadrant', q)}
                className={`rounded-md border px-1 py-1 text-[11px] ${p.detachmentQuadrant === q ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400'}`}
              >
                {QUADRANT_LABEL[q]}
              </button>
            ))}
          </div>
        </div>
      )}
      {c.enabled && <p className="mt-2 text-[11px] leading-snug text-slate-500">{CONDITION_BY_ID[meta.id].effect}</p>}
    </div>
  );
}

function Slider({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mt-2.5">
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono text-slate-300">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(90deg, #06B6D4 0%, #3B82F6 ${pct}%, #273452 ${pct}%)` }}
        aria-label={label}
      />
    </div>
  );
}
