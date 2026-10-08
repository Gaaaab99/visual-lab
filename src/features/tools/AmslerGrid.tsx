import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Grid3x3, RotateCcw } from 'lucide-react';
import { Note, Stat, ToolCard } from './ui';

const N = 20;
const CELL = 20;
const SIZE = N * CELL;

type Eye = 'OD' | 'OS';

const keyOf = (r: number, c: number) => r * N + c;

export function AmslerGrid() {
  const [marked, setMarked] = useState<ReadonlySet<number>>(() => new Set());
  const [eye, setEye] = useState<Eye>('OD');
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ adding: boolean } | null>(null);

  const cellAt = (e: ReactPointerEvent<SVGSVGElement>): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * SIZE;
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    if (r < 0 || r >= N || c < 0 || c >= N) return null;
    return keyOf(r, c);
  };

  const apply = (k: number, adding: boolean) =>
    setMarked((prev) => {
      if (prev.has(k) === adding) return prev;
      const next = new Set(prev);
      if (adding) next.add(k);
      else next.delete(k);
      return next;
    });

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const k = cellAt(e);
    if (k === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const adding = !marked.has(k);
    drag.current = { adding };
    apply(k, adding);
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const k = cellAt(e);
    if (k !== null) apply(k, drag.current.adding);
  };
  const onUp = () => {
    drag.current = null;
  };

  // quadranti del campo visivo: per OD il lato sinistro del campo è nasale, per OS è temporale
  const leftName = eye === 'OD' ? 'nasale' : 'temporale';
  const rightName = eye === 'OD' ? 'temporale' : 'nasale';
  const quadrants = [
    { id: 'ss', label: `Supero-${leftName}`, test: (r: number, c: number) => r < N / 2 && c < N / 2 },
    { id: 'sd', label: `Supero-${rightName}`, test: (r: number, c: number) => r < N / 2 && c >= N / 2 },
    { id: 'is', label: `Infero-${leftName}`, test: (r: number, c: number) => r >= N / 2 && c < N / 2 },
    { id: 'id', label: `Infero-${rightName}`, test: (r: number, c: number) => r >= N / 2 && c >= N / 2 },
  ];
  const cells = [...marked].map((k) => ({ r: Math.floor(k / N), c: k % N }));
  const counts = quadrants.map((q) => ({ ...q, n: cells.filter(({ r, c }) => q.test(r, c)).length }));
  // area centrale: celle entro 2° dal punto di fissazione (centro della griglia)
  const central = cells.filter(({ r, c }) => Math.abs(r + 0.5 - N / 2) <= 2 && Math.abs(c + 0.5 - N / 2) <= 2).length;

  return (
    <ToolCard
      icon={<Grid3x3 size={20} />}
      title="Griglia di Amsler interattiva"
      subtitle="Fissa il punto centrale con un occhio coperto. Clicca o trascina per marcare le aree in cui le linee appaiono distorte, sfocate o mancanti."
      actions={
        <button className="btn-ghost" onClick={() => setMarked(new Set())} disabled={marked.size === 0}>
          <RotateCcw size={15} /> Azzera
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[460px]">
          <svg
            ref={svgRef}
            viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
            className="block w-full cursor-crosshair touch-none select-none rounded-xl bg-white shadow-inner"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            role="img"
            aria-label="Griglia di Amsler 20 per 20"
          >
            <rect x={0} y={0} width={SIZE} height={SIZE} fill="#ffffff" />
            {cells.map(({ r, c }) => (
              <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill="rgba(244,63,94,0.35)" />
            ))}
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={i}>
                <line x1={i * CELL} y1={0} x2={i * CELL} y2={SIZE} stroke="#111827" strokeWidth={i === 0 || i === N ? 1.6 : 0.8} />
                <line x1={0} y1={i * CELL} x2={SIZE} y2={i * CELL} stroke="#111827" strokeWidth={i === 0 || i === N ? 1.6 : 0.8} />
              </g>
            ))}
            <circle cx={SIZE / 2} cy={SIZE / 2} r={4.5} fill="#111827" />
          </svg>
          <p className="mt-2 text-center text-[11px] text-slate-500">Ogni quadretto ≈ 1° di campo visivo a ~30 cm (griglia 20° × 20°).</p>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Occhio testato:</span>
            {(['OD', 'OS'] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEye(e)}
                className={`rounded-full border px-3 py-0.5 font-medium transition ${eye === e ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100' : 'border-white/10 hover:text-slate-200'}`}
              >
                {e === 'OD' ? 'OD (destro)' : 'OS (sinistro)'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Celle marcate" value={`${marked.size}`} sub={`${((marked.size / (N * N)) * 100).toFixed(1)}% della griglia`} tone={marked.size ? 'rose' : 'emerald'} />
            <Stat label="Area centrale (≤ 2°)" value={`${central}`} sub="celle intorno alla fissazione" tone={central ? 'rose' : 'emerald'} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {counts.map((q) => (
              <div key={q.id} className={`rounded-xl border px-3 py-2 text-sm ${q.n ? 'border-rose-400/30 bg-rose-500/10 text-rose-100' : 'border-white/[0.06] text-slate-400'}`}>
                <p className="text-xs">{q.label}</p>
                <p className="font-mono text-base text-white">{q.n}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-300">
            {marked.size === 0
              ? 'Nessuna anomalia segnalata.'
              : `Quadranti coinvolti: ${counts
                  .filter((q) => q.n > 0)
                  .map((q) => q.label.toLowerCase())
                  .join(', ')}${central ? ' — interessamento dell’area maculare centrale.' : '.'}`}
          </p>
        </div>
      </div>
      <Note>
        Metamorfopsie o scotomi di nuova insorgenza, specie centrali, richiedono una visita oculistica tempestiva (sospetta maculopatia, es. DMLE neovascolare).
        Quadranti riferiti al campo visivo dell'occhio testato.
      </Note>
    </ToolCard>
  );
}
