import { useMemo, useState } from 'react';
import { Check, RotateCcw, Shuffle, Type, X } from 'lucide-react';
import { mulberry32 } from './prng';
import { Note, Stat, ToolCard } from './ui';

const SLOAN = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;
const LINES: number[] = Array.from({ length: 12 }, (_, i) => Math.round((1.0 - i * 0.1) * 10) / 10); // 1.0 → -0.1
const PER_LINE = 5;
const DISTANCES = [3, 4, 6] as const;
type Distance = (typeof DISTANCES)[number];

function buildChart(seed: number): string[][] {
  const rand = mulberry32(seed);
  return LINES.map(() => {
    const pool: string[] = [...SLOAN];
    const row: string[] = [];
    for (let k = 0; k < PER_LINE; k++) {
      const idx = Math.floor(rand() * pool.length);
      row.push(pool.splice(idx, 1)[0]);
    }
    return row;
  });
}

const emptyMarks = (): boolean[][] => LINES.map(() => Array.from({ length: PER_LINE }, () => false));

/** Altezza della lettera (mm) per una riga LogMAR alla distanza data: 5′ d'arco × MAR */
function letterHeightMm(logmar: number, distM: number): number {
  const arcmin = 5 * 10 ** logmar;
  return 2 * distM * 1000 * Math.tan(((arcmin / 60) * Math.PI) / 360);
}

export function OptotypeChart() {
  const [seed, setSeed] = useState(7);
  const [marks, setMarks] = useState<boolean[][]>(emptyMarks);
  const [dist, setDist] = useState<Distance>(4);
  const chart = useMemo(() => buildChart(seed), [seed]);

  const toggle = (li: number, k: number) => setMarks((m) => m.map((row, i) => (i === li ? row.map((v, j) => (j === k ? !v : v)) : row)));
  const setLine = (li: number, v: boolean) => setMarks((m) => m.map((row, i) => (i === li ? row.map(() => v) : row)));

  const total = marks.reduce((s, row) => s + row.filter(Boolean).length, 0);
  const logmar = 1.1 - 0.02 * total;
  const decimal = 10 ** -logmar;
  let lastLine = -1;
  marks.forEach((row, i) => {
    if (row.filter(Boolean).length >= 3) lastLine = i;
  });

  // geometria SVG: altezza lettera h = 9·10^LogMAR unità, spaziatura = h, interlinea = h della riga successiva
  const layout = useMemo(() => {
    let y = 30;
    return LINES.map((lm, i) => {
      const h = 9 * 10 ** lm;
      const cy = y + h / 2;
      const next = i + 1 < LINES.length ? 9 * 10 ** LINES[i + 1] : 20;
      y += h + Math.max(next, 14);
      return { lm, h, cy };
    });
  }, []);
  const svgHeight = layout[layout.length - 1].cy + layout[layout.length - 1].h / 2 + 30;

  return (
    <ToolCard
      icon={<Type size={20} />}
      title="Ottotipo interattivo (tipo ETDRS)"
      subtitle="Lettere Sloan su scala logaritmica da 1.0 a −0.1 LogMAR. Segna le lettere lette correttamente: punteggio lettera per lettera (0.02 LogMAR/lettera)."
      actions={
        <>
          <button className="btn-ghost" onClick={() => setSeed((s) => s + 1)}>
            <Shuffle size={15} /> Nuova tavola
          </button>
          <button className="btn-ghost" onClick={() => setMarks(emptyMarks())}>
            <RotateCcw size={15} /> Azzera
          </button>
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="min-w-0 rounded-xl border border-white/10 bg-white p-2 shadow-inner sm:p-4">
          <svg viewBox={`0 0 1000 ${svgHeight}`} className="mx-auto block w-full max-w-[640px] select-none" role="img" aria-label="Ottotipo a lettere Sloan">
            {layout.map(({ lm, h, cy }, li) => (
              <g key={lm}>
                <text x={12} y={cy} dominantBaseline="central" fontSize={18} fill="#94a3b8" fontFamily="ui-monospace, monospace">
                  {lm.toFixed(1)}
                </text>
                {chart[li].map((ch, k) => {
                  const cx = 500 - 4 * h + k * 2 * h;
                  const read = marks[li][k];
                  return (
                    <g key={k} onClick={() => toggle(li, k)} className="cursor-pointer">
                      <rect x={cx - h * 0.75} y={cy - h * 0.75} width={h * 1.5} height={h * 1.5} fill={read ? 'rgba(16,185,129,0.14)' : 'transparent'} rx={h * 0.15} />
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={h / 0.72}
                        fontWeight={700}
                        fontFamily="Arial, Helvetica, sans-serif"
                        fill="#0b1120"
                      >
                        {ch}
                      </text>
                    </g>
                  );
                })}
                <text x={988} y={cy} textAnchor="end" dominantBaseline="central" fontSize={18} fill="#94a3b8" fontFamily="ui-monospace, monospace">
                  {(10 ** -lm).toFixed(2)}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Lettere" value={`${total}/60`} tone="cyan" />
            <Stat label="LogMAR" value={logmar.toFixed(2)} tone="cyan" />
            <Stat label="Decimale" value={decimal.toFixed(2)} sub={`${(decimal * 10).toFixed(1)}/10`} tone="emerald" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Distanza di riferimento:</span>
            {DISTANCES.map((d) => (
              <button
                key={d}
                onClick={() => setDist(d)}
                className={`rounded-full border px-2.5 py-0.5 font-mono transition ${dist === d ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100' : 'border-white/10 hover:text-slate-200'}`}
              >
                {d} m
              </button>
            ))}
          </div>
          <div className="max-h-[520px] overflow-y-auto rounded-xl border border-white/[0.06]">
            {LINES.map((lm, li) => {
              const n = marks[li].filter(Boolean).length;
              return (
                <div key={lm} className={`flex items-center gap-2 border-b border-white/[0.04] px-2.5 py-2 last:border-0 ${li === lastLine ? 'bg-emerald-400/[0.06]' : ''}`}>
                  <div className="w-14 shrink-0 font-mono text-xs">
                    <p className="text-slate-200">{lm.toFixed(1)}</p>
                    <p className="text-[10px] text-slate-500">{letterHeightMm(lm, dist).toFixed(1)} mm</p>
                  </div>
                  <div className="flex min-w-0 flex-1 gap-1">
                    {chart[li].map((ch, k) => (
                      <button
                        key={k}
                        onClick={() => toggle(li, k)}
                        aria-pressed={marks[li][k]}
                        className={`h-7 w-7 shrink-0 rounded-md border font-mono text-xs font-bold transition ${marks[li][k] ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-100' : 'border-white/10 text-slate-400 hover:border-cyan-400/40'}`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setLine(li, true)} className="rounded-md p-1.5 text-emerald-300 transition hover:bg-emerald-400/10" title="Riga letta" aria-label={`Riga ${lm.toFixed(1)} letta`}>
                      <Check size={14} />
                    </button>
                    <button onClick={() => setLine(li, false)} className="rounded-md p-1.5 text-rose-300 transition hover:bg-rose-400/10" title="Riga non letta" aria-label={`Riga ${lm.toFixed(1)} non letta`}>
                      <X size={14} />
                    </button>
                  </div>
                  <span className="w-7 shrink-0 text-right font-mono text-[11px] text-slate-500">{n}/5</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Note>
        Punteggio ETDRS: LogMAR = 1.1 − 0.02 × lettere lette (presupponendo la lettura a partire dalla riga 1.0). La riga evidenziata è l'ultima con ≥ 3 lettere corrette.
        Le dimensioni a schermo non sono calibrate: per un uso reale la lettera della riga 0.0 deve sottendere 5′ d'arco ({letterHeightMm(0, dist).toFixed(2)} mm a {dist} m).
      </Note>
    </ToolCard>
  );
}
