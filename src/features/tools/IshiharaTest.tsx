import { useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, EyeOff, Palette, Play, RotateCcw, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PLATES, PLATE_R, generatePlate, type PlateSpec } from './ishihara';
import { Note, Stat, ToolCard, type Tone } from './ui';

function Plate({ spec, size = 320 }: { spec: PlateSpec; size?: number }) {
  const dots = useMemo(() => generatePlate(spec), [spec]);
  const v = PLATE_R + 4;
  return (
    <svg viewBox={`${-v} ${-v} ${2 * v} ${2 * v}`} className="block h-auto w-full" style={{ maxWidth: size }} role="img" aria-label="Tavola pseudo-isocromatica">
      <circle r={PLATE_R + 3} fill="#efe6d2" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.fill} />
      ))}
    </svg>
  );
}

const DIAGNOSTIC = PLATES.filter((p) => !p.demo).length;

function interpret(demoOk: boolean, correct: number): { title: string; text: string; tone: Tone } {
  if (!demoOk)
    return {
      title: 'Test non attendibile',
      text: "La tavola dimostrativa, leggibile anche da chi ha un deficit cromatico, non è stata riconosciuta: verificare acuità visiva, comprensione delle istruzioni e condizioni di visione.",
      tone: 'amber',
    };
  if (correct >= DIAGNOSTIC - 1)
    return { title: 'Visione cromatica nella norma (screening)', text: 'Le tavole diagnostiche sono state lette correttamente. Nessun segno di discromatopsia rosso-verde.', tone: 'emerald' };
  if (correct >= DIAGNOSTIC - 3)
    return {
      title: 'Risultato dubbio',
      text: 'Alcuni errori: ripetere il test con tavole Ishihara originali in illuminazione standardizzata (luce diurna, ~75 cm).',
      tone: 'amber',
    };
  return {
    title: 'Possibile discromatopsia rosso-verde',
    text: 'Numerosi errori sulle tavole diagnostiche, compatibili con deficit protan/deutan congenito. Approfondire con Ishihara originale, HRR, Farnsworth D-15 o anomaloscopio.',
    tone: 'rose',
  };
}

export function IshiharaTest() {
  const { awardXp } = useApp();
  const [phase, setPhase] = useState<'intro' | 'test' | 'done'>('intro');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const awarded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setPhase('test');
    setIdx(0);
    setAnswers([]);
    setInput('');
    awarded.current = false;
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const submit = (value: string) => {
    const next = [...answers, value.trim()];
    setAnswers(next);
    setInput('');
    if (idx + 1 >= PLATES.length) {
      setPhase('done');
      if (!awarded.current) {
        awarded.current = true;
        void awardXp(20, 'Test Ishihara completato');
      }
    } else {
      setIdx(idx + 1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;
    submit(input);
  };

  const results = PLATES.map((p, i) => ({ plate: p, answer: answers[i] ?? '', ok: (answers[i] ?? '') === p.number }));
  const demoOk = results[0]?.ok ?? false;
  const correct = results.filter((r) => !r.plate.demo && r.ok).length;
  const verdict = interpret(demoOk, correct);

  return (
    <ToolCard
      icon={<Palette size={20} />}
      title="Test di Ishihara (screening)"
      subtitle="Tavole pseudo-isocromatiche generate proceduralmente con colori lungo le linee di confusione protan/deutan."
      actions={
        phase !== 'intro' ? (
          <button className="btn-ghost" onClick={start}>
            <RotateCcw size={15} /> Ricomincia
          </button>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid items-center gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[260px]">
              <Plate spec={PLATES[0]} size={260} />
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Ti verranno mostrate <strong className="text-white">{PLATES.length} tavole</strong>: la prima è dimostrativa e dovrebbe essere letta da chiunque. Per ciascuna,
                digita il numero che vedi oppure scegli «Non vedo numeri».
              </p>
              <ul className="list-disc space-y-1 pl-5 text-slate-400">
                <li>Luminosità dello schermo al massimo, filtri luce blu / modalità notte disattivati.</li>
                <li>Distanza di circa 75 cm, circa 3 secondi per tavola.</li>
                <li>Se porti occhiali per lontano o vicino, indossali.</li>
              </ul>
              <button className="btn-primary" onClick={start}>
                <Play size={15} /> Inizia il test
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'test' && (
          <motion.div key={`plate-${idx}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="grid items-center gap-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[340px]">
              <Plate spec={PLATES[idx]} size={340} />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-cyan-300/80">
                  Tavola {idx + 1} di {PLATES.length}
                  {PLATES[idx].demo ? ' · dimostrativa' : ''}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${(idx / PLATES.length) * 100}%` }} />
                </div>
              </div>
              <form onSubmit={onSubmit} className="space-y-3">
                <label htmlFor="ishi-input" className="label">
                  Che numero vedi?
                </label>
                <input
                  id="ishi-input"
                  ref={inputRef}
                  className="input max-w-[200px] text-center font-mono text-2xl tracking-widest"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="btn-primary" disabled={input.trim() === ''}>
                    Conferma <ArrowRight size={15} />
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => submit('')}>
                    <EyeOff size={15} /> Non vedo numeri
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Tavole diagnostiche corrette" value={`${correct}/${DIAGNOSTIC}`} tone={verdict.tone} />
              <Stat label="Tavola dimostrativa" value={demoOk ? 'Letta' : 'Non letta'} tone={demoOk ? 'emerald' : 'amber'} />
              <Stat label="XP" value="+20" sub="Test completato" tone="cyan" />
            </div>
            <div className={`rounded-xl border px-4 py-3 ${verdict.tone === 'emerald' ? 'border-emerald-400/30 bg-emerald-400/10' : verdict.tone === 'rose' ? 'border-rose-400/30 bg-rose-500/10' : 'border-amber-400/30 bg-amber-400/10'}`}>
              <p className="font-semibold text-white">{verdict.title}</p>
              <p className="mt-1 text-sm text-slate-300">{verdict.text}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {results.map((r, i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-2">
                  <div className="mx-auto max-w-[140px]">
                    <Plate spec={r.plate} size={140} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1 text-xs">
                    <span className="text-slate-400">
                      #{i + 1} · atteso <span className="font-mono text-white">{r.plate.number}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 font-mono ${r.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {r.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {r.answer || '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Note>
        Strumento di screening didattico: i colori di un monitor non sono calibrati come le tavole stampate originali. Un risultato anomalo non costituisce diagnosi e
        richiede conferma con test standardizzati. Le discromatopsie tritan non sono valutate da questo test.
      </Note>
    </ToolCard>
  );
}
