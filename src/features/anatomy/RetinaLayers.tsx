import { useId, useMemo } from 'react';
import { GlowFilter, Hotspot, type DiagramProps } from './Hotspot';
import { STRUCTURE_BY_ID, type StructureId } from './structures';

/* B-scan OCT orizzontale passante per la fovea (OD): temporale a sinistra, nasale (papilla) a destra.
 * Gli spessori sono qualitativi ma rispettano le proporzioni relative degli strati. */

const X0 = 20;
const X1 = 620;
const FX = 300; // centro foveale
const STEP = 6;

const g = (x: number) => Math.exp(-(((x - FX) / 46) ** 2)); // profilo della fossa foveale
const bump = (x: number) => Math.exp(-(((Math.abs(x - FX) - 105) / 55) ** 2)); // ispessimento parafoveale GCL
const nasal = (x: number) => Math.min(1, Math.max(0, (x - FX) / 320));
const bruchY = (x: number) => 292 + 10 * ((x - FX) / 300) ** 2;

type LayerKey = StructureId | 'myoid' | 'os';

interface LayerDef {
  key: LayerKey;
  thickness: (x: number) => number;
  gray: number;
  /** colore pseudocolore per gli strati non selezionabili */
  color?: string;
}

/** Dal basso (sopra la membrana di Bruch) verso l'alto */
const LAYERS_BOTTOM_UP: LayerDef[] = [
  { key: 'rpe', thickness: () => 9, gray: 252 },
  { key: 'os', thickness: (x) => 6 + 2 * g(x), gray: 95, color: '#7c2d12' },
  { key: 'ez', thickness: () => 5, gray: 240 },
  { key: 'myoid', thickness: (x) => 6 + 3 * g(x), gray: 70, color: '#1e1b4b' },
  { key: 'elm', thickness: () => 2, gray: 205 },
  { key: 'onl', thickness: (x) => 26 + 14 * g(x), gray: 48 },
  { key: 'opl', thickness: (x) => 11 * (1 - 0.7 * g(x)) + 3 * bump(x), gray: 190 },
  { key: 'inl', thickness: (x) => 20 * (1 - 0.97 * g(x)) + 6 * bump(x), gray: 82 },
  { key: 'ipl', thickness: (x) => 18 * (1 - 0.97 * g(x)) + 4 * bump(x), gray: 175 },
  { key: 'gcl', thickness: (x) => 14 * (1 - 0.99 * g(x)) + 20 * bump(x), gray: 125 },
  { key: 'rnfl', thickness: (x) => (5 + 24 * nasal(x)) * (1 - 0.97 * g(x)) + 2, gray: 232 },
];

const xs: number[] = [];
for (let x = X0; x <= X1; x += STEP) xs.push(x);

interface Band {
  key: LayerKey;
  d: string;
  gray: number;
  color?: string;
  midY: number;
}

function buildBands() {
  const bottom = xs.map(bruchY);
  const bands: Band[] = [];
  let lower = bottom;
  const boundaries: Partial<Record<LayerKey, number[]>> = {};
  for (const layer of LAYERS_BOTTOM_UP) {
    const upper = xs.map((x, i) => lower[i] - layer.thickness(x));
    const top = xs.map((x, i) => `${x} ${upper[i].toFixed(2)}`).join(' L ');
    const bot = xs
      .map((x, i) => `${x} ${lower[i].toFixed(2)}`)
      .reverse()
      .join(' L ');
    const last = xs.length - 1;
    bands.push({ key: layer.key, d: `M ${top} L ${bot} Z`, gray: layer.gray, color: layer.color, midY: (upper[last] + lower[last]) / 2 });
    boundaries[layer.key] = upper;
    lower = upper;
  }
  const line = (ys: number[]) => `M ${xs.map((x, i) => `${x} ${ys[i].toFixed(2)}`).join(' L ')}`;
  const ilmY = lower;
  return {
    bands,
    ilm: line(ilmY),
    elm: line(xs.map((_, i) => ((boundaries.elm?.[i] ?? 0) + (boundaries.myoid?.[i] ?? 0)) / 2)),
    bruch: line(bottom),
    ilmLast: ilmY[ilmY.length - 1],
    elmLast: boundaries.elm?.[xs.length - 1] ?? 0,
    bruchLast: bottom[bottom.length - 1],
    ilmAt: (x: number) => ilmY[Math.round((x - X0) / STEP)],
    choroid: `M ${xs.map((x, i) => `${x} ${bottom[i].toFixed(2)}`).join(' L ')} L ${X1} ${bruchY(X1) + 74} ${xs
      .slice()
      .reverse()
      .map((x) => `L ${x} ${(bruchY(x) + 72 + 6 * Math.sin(x / 40)).toFixed(2)}`)
      .join(' ')} Z`,
  };
}

/** Lumi vascolari coroideali (pseudo-casuali ma deterministici) */
const CHOROID_VESSELS = Array.from({ length: 34 }, (_, i) => {
  const x = X0 + 10 + ((i * 97) % 590);
  const depth = 22 + ((i * 37) % 40);
  const rx = 4 + ((i * 13) % 9);
  return { x, y: bruchY(x) + depth, rx, ry: rx * 0.55 };
});

interface Props extends DiagramProps {
  grayscale: boolean;
}

export function RetinaLayers(props: Props) {
  const { grayscale, showLabels, selected, hovered } = props;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const glow = `glow-${uid}`;
  const hs = { ...props, glowId: glow };
  const geo = useMemo(buildBands, []);

  const fill = (b: { key: LayerKey; gray: number; color?: string }) => {
    if (grayscale) return `rgb(${b.gray} ${b.gray} ${b.gray})`;
    if (b.color) return b.color;
    return STRUCTURE_BY_ID[b.key as StructureId].color;
  };

  // Etichette a destra con distribuzione anti-sovrapposizione
  const labels = useMemo(() => {
    type RawLabel = { key: StructureId; y: number; text: string };
    const raw: RawLabel[] = [
      { key: 'ilm', y: geo.ilmLast, text: 'ILM' },
      ...geo.bands
        .filter((b): b is Band & { key: StructureId } => b.key !== 'myoid' && b.key !== 'os')
        .map((b): RawLabel => ({ key: b.key, y: b.midY, text: b.key === 'rpe' ? 'EPR / RPE' : b.key === 'ez' ? 'EZ (ellissoide)' : b.key.toUpperCase() })),
      { key: 'bruch', y: geo.bruchLast, text: 'Bruch' },
      { key: 'coroide', y: geo.bruchLast + 38, text: 'Coroide' },
    ];
    raw.sort((a, b) => a.y - b.y);
    const out = raw.map((r) => ({ ...r, ly: r.y }));
    for (let i = 1; i < out.length; i++) out[i].ly = Math.max(out[i].ly, out[i - 1].ly + 15);
    const overflow = out[out.length - 1].ly - 384;
    if (overflow > 0) for (let i = out.length - 1; i >= 0; i--) out[i].ly -= overflow * ((i + 1) / out.length);
    return out;
  }, [geo]);

  const elmBand = geo.bands.find((b) => b.key === 'elm');
  const bg = grayscale ? '#060606' : '#020617';

  return (
    <svg viewBox="0 0 800 400" className="h-auto w-full select-none" role="group" aria-label="Sezione retinica OCT">
      <defs>
        <GlowFilter id={glow} />
        <clipPath id={`scan-${uid}`}>
          <rect x={X0} y="16" width={X1 - X0} height="368" rx="10" />
        </clipPath>
        <filter id={`speckle-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="2" seed="3" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.35" />
          </feComponentTransfer>
        </filter>
      </defs>

      <g clipPath={`url(#scan-${uid})`}>
        <rect x={X0} y="16" width={X1 - X0} height="368" fill={bg} />
        {/* Sclera */}
        <rect x={X0} y="340" width={X1 - X0} height="60" fill={grayscale ? '#3f3f3f' : '#334155'} />

        {/* Coroide */}
        <Hotspot id="coroide" {...hs}>
          <path d={geo.choroid} fill={grayscale ? '#6e6e6e' : '#c2410c'} fillOpacity={grayscale ? 1 : 0.85} />
          {CHOROID_VESSELS.map((v) => (
            <ellipse key={`${v.x}-${v.y}`} cx={v.x} cy={v.y} rx={v.rx} ry={v.ry} fill={grayscale ? '#2b2b2b' : '#7c2d12'} />
          ))}
        </Hotspot>

        {/* Strati retinici */}
        {geo.bands.map((b) =>
          b.key === 'elm' ? null : b.key === 'myoid' || b.key === 'os' ? (
            <path key={b.key} d={b.d} fill={fill(b)} pointerEvents="none" />
          ) : (
            <Hotspot key={b.key} id={b.key} {...hs}>
              <path d={b.d} fill={fill(b)} />
            </Hotspot>
          ),
        )}

        {/* Ombre dei vasi retinici superficiali */}
        <g pointerEvents="none">
          {[470, 548].map((x) => (
            <g key={x}>
              <rect x={x - 5} y={geo.ilmAt(x) + 6} width="10" height={bruchY(x) - geo.ilmAt(x) + 60} fill="#000" fillOpacity="0.35" />
              <circle cx={x} cy={geo.ilmAt(x) + 8} r="5" fill={grayscale ? '#d4d4d4' : '#fca5a5'} />
            </g>
          ))}
        </g>

        {/* Linee: ILM, ELM, Bruch */}
        <Hotspot id="ilm" {...hs}>
          <path d={geo.ilm} fill="none" stroke="transparent" strokeWidth="9" />
          <path d={geo.ilm} fill="none" stroke={grayscale ? '#ffffff' : '#f8fafc'} strokeWidth="1.6" />
        </Hotspot>
        <Hotspot id="elm" {...hs}>
          {elmBand && <path d={elmBand.d} fill={fill(elmBand)} />}
          <path d={geo.elm} fill="none" stroke="transparent" strokeWidth="7" />
        </Hotspot>
        <Hotspot id="bruch" {...hs}>
          <path d={geo.bruch} fill="none" stroke="transparent" strokeWidth="7" />
          <path d={geo.bruch} fill="none" stroke={grayscale ? '#bdbdbd' : '#fbbf24'} strokeWidth="1.8" />
        </Hotspot>

        {grayscale && <rect x={X0} y="16" width={X1 - X0} height="368" filter={`url(#speckle-${uid})`} pointerEvents="none" opacity="0.45" />}

        {/* Annotazioni */}
        <g pointerEvents="none" fontSize="10" fontWeight="600" letterSpacing="1.2" fill="#94a3b8">
          <text x={FX} y="34" textAnchor="middle">
            FOVEA
          </text>
          <path d={`M ${FX} 40 L ${FX} ${geo.ilmAt(FX) - 6}`} stroke="#94a3b8" strokeDasharray="2 3" />
          <text x={X0 + 10} y="34">
            ← TEMPORALE
          </text>
          <text x={X1 - 10} y="34" textAnchor="end">
            NASALE (papilla) →
          </text>
          <text x={X0 + 10} y="70" fill="#64748b" fontWeight="500" letterSpacing="0.5">
            Vitreo
          </text>
          {/* barra di scala orizzontale (≈ 100 px/mm; la scala verticale è espansa come nei B-scan reali) */}
          <path d={`M ${X0 + 14} 372 h 100`} stroke="#e2e8f0" strokeWidth="2" />
          <text x={X0 + 14} y="366" fill="#e2e8f0" fontWeight="500" letterSpacing="0.3">
            1 mm
          </text>
        </g>
      </g>
      <rect x={X0} y="16" width={X1 - X0} height="368" rx="10" fill="none" stroke="#273452" pointerEvents="none" />

      {/* Etichette laterali */}
      {showLabels && (
        <g pointerEvents="none" aria-hidden="true">
          {labels.map((l) => {
            const active = selected === l.key || hovered === l.key;
            return (
              <g key={l.key}>
                <path d={`M ${X1 + 2} ${l.y} L ${X1 + 14} ${l.y} L ${X1 + 26} ${l.ly} L ${X1 + 32} ${l.ly}`} fill="none" stroke={active ? '#22d3ee' : '#475569'} strokeWidth="1" />
                <rect x={X1 + 34} y={l.ly - 5} width="8" height="10" rx="2" fill={STRUCTURE_BY_ID[l.key].color} />
                <text x={X1 + 48} y={l.ly + 3.6} fontSize="10.5" fontWeight={active ? 700 : 500} fill={active ? '#a5f3fc' : '#cbd5e1'}>
                  {l.text}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
