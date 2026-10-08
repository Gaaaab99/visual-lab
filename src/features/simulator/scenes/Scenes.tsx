import { memo, useMemo } from 'react';
import type { SceneId } from '../../../types';
import { mulberry32 } from '../engine';

/** Sorgenti luminose della scena in % del viewport: usate per aloni e glare */
export const SCENE_LIGHTS: Record<SceneId, { x: number; y: number; r: number }[]> = {
  night: [
    { x: 44.5, y: 55, r: 1 },
    { x: 49, y: 55, r: 1 },
    { x: 20, y: 30, r: 0.8 },
    { x: 80, y: 30, r: 0.8 },
    { x: 33, y: 41, r: 0.5 },
    { x: 67, y: 41, r: 0.5 },
    { x: 72.5, y: 45, r: 0.45 },
  ],
  city: [{ x: 82, y: 16, r: 1.4 }],
  reading: [],
  amsler: [],
  ishihara: [],
};

const svgProps = {
  width: '100%',
  height: '100%',
  preserveAspectRatio: 'xMidYMid slice',
  xmlns: 'http://www.w3.org/2000/svg',
  style: { display: 'block' },
} as const;

/* --------------------------------------------------------------- Reading */

const READING_TEXT = [
  { size: 34, text: 'Visual Lab' },
  { size: 22, text: 'Il cristallino è una lente biconvessa trasparente' },
  { size: 18, text: 'che, grazie all’accomodazione, mette a fuoco gli oggetti' },
  { size: 15, text: 'vicini. Con l’età perde elasticità: compare la presbiopia.' },
  { size: 13, text: 'La macula, al centro della retina, è responsabile della visione' },
  { size: 11, text: 'distinta e dei colori. Una sua lesione produce scotomi centrali e' },
  { size: 9.5, text: 'metamorfopsie: le linee rette appaiono ondulate o interrotte, come sulla' },
  { size: 8, text: 'griglia di Amsler. Il campo visivo periferico è invece mediato dai bastoncelli' },
  { size: 7, text: 'e viene compromesso precocemente nel glaucoma e nella retinite pigmentosa.' },
];

const ReadingScene = memo(function ReadingScene() {
  let y = 92;
  return (
    <svg viewBox="0 0 800 500" {...svgProps}>
      <defs>
        <linearGradient id="sc-desk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6b4a2f" />
          <stop offset="1" stopColor="#3f2a1a" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#sc-desk)" />
      <rect x="110" y="30" width="580" height="450" rx="6" fill="#f6f1e6" />
      <rect x="110" y="30" width="580" height="450" rx="6" fill="none" stroke="#d8cfbd" />
      {READING_TEXT.map((l, i) => {
        y += l.size * 1.75;
        return (
          <text key={i} x={140} y={y} fontFamily="Georgia, 'Times New Roman', serif" fontSize={l.size} fill="#1b1b1b" fontWeight={i === 0 ? 700 : 400}>
            {l.text}
          </text>
        );
      })}
      <g transform="translate(140 420)" fontFamily="Inter, sans-serif" fill="#1b1b1b">
        <text fontSize="11" fill="#555">Ottotipo di lettura · N12 → N5</text>
        <text y="26" fontSize="18" letterSpacing="6">E  F  P  T  O  Z</text>
        <text x="270" y="26" fontSize="12" letterSpacing="5">L  P  E  D  F  C  Z</text>
      </g>
      <circle cx="660" cy="450" r="14" fill="#c0392b" />
      <rect x="600" y="440" width="40" height="22" rx="3" fill="#2e86de" />
    </svg>
  );
});

/* ----------------------------------------------------------------- Night */

const NightScene = memo(function NightScene() {
  const stars = useMemo(() => {
    const r = mulberry32(7);
    return Array.from({ length: 60 }, () => ({ x: r() * 800, y: r() * 180, s: r() * 1.2 + 0.3 }));
  }, []);
  return (
    <svg viewBox="0 0 800 500" {...svgProps}>
      <defs>
        <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020617" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
        <radialGradient id="sc-head" r="0.5">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.35" stopColor="#fde68a" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sc-lamp" r="0.5">
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f2937" />
          <stop offset="1" stopColor="#0b0f17" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#sc-sky)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#e2e8f0" opacity="0.7" />
      ))}
      {/* skyline */}
      <path d="M0 260 L0 205 L60 205 L60 180 L120 180 L120 220 L170 220 L170 170 L230 170 L230 230 L300 230 L300 200 L340 200 L340 245 L460 245 L460 190 L520 190 L520 225 L590 225 L590 175 L650 175 L650 215 L720 215 L720 195 L800 195 L800 260 Z" fill="#0f172a" />
      {/* road */}
      <path d="M0 500 L370 270 L430 270 L800 500 Z" fill="url(#sc-road)" />
      <rect x="0" y="262" width="800" height="10" fill="#111827" />
      {[0, 1, 2, 3, 4].map((i) => {
        const t = i / 5;
        const y1 = 280 + t * t * 230;
        const y2 = y1 + 8 + t * 30;
        const w = 1.5 + t * 8;
        return <path key={i} d={`M${400 - w / 2} ${y1} L${400 + w / 2} ${y1} L${400 + w} ${y2} L${400 - w} ${y2} Z`} fill="#e5e7eb" opacity="0.85" />;
      })}
      <path d="M380 270 L120 500" stroke="#f8fafc" strokeWidth="3" opacity="0.6" />
      <path d="M420 270 L680 500" stroke="#f8fafc" strokeWidth="3" opacity="0.6" />
      {/* street lamps */}
      {[
        [160, 150, 'L'],
        [640, 150, 'R'],
        [265, 205, 'L'],
        [535, 205, 'R'],
      ].map(([x, y, side], i) => {
        const X = Number(x);
        const Y = Number(y);
        const dir = side === 'L' ? 1 : -1;
        return (
          <g key={i}>
            <path d={`M${X} ${Y} L${X} ${Y + (i < 2 ? 170 : 70)}`} stroke="#334155" strokeWidth={i < 2 ? 5 : 3} />
            <path d={`M${X} ${Y} q ${dir * 20} -12 ${dir * 38} 0`} stroke="#334155" strokeWidth={i < 2 ? 5 : 3} fill="none" />
            <circle cx={X + dir * 38} cy={Y + 4} r={i < 2 ? 40 : 22} fill="url(#sc-lamp)" />
            <circle cx={X + dir * 38} cy={Y + 4} r={i < 2 ? 6 : 3.5} fill="#fffbeb" />
          </g>
        );
      })}
      {/* oncoming car */}
      <rect x="338" y="262" width="58" height="22" rx="5" fill="#111827" />
      <circle cx="356" cy="275" r="26" fill="url(#sc-head)" />
      <circle cx="392" cy="275" r="26" fill="url(#sc-head)" />
      <circle cx="356" cy="275" r="5" fill="#fff" />
      <circle cx="392" cy="275" r="5" fill="#fff" />
      {/* traffic light */}
      <rect x="575" y="190" width="14" height="38" rx="3" fill="#0b1120" stroke="#334155" />
      <circle cx="582" cy="199" r="4" fill="#3f0d0d" />
      <circle cx="582" cy="209" r="4" fill="#3a2a05" />
      <circle cx="582" cy="219" r="4.5" fill="#22c55e" />
      <circle cx="582" cy="219" r="12" fill="#22c55e" opacity="0.25" />
      {/* road sign */}
      <g transform="translate(205 300)">
        <rect x="-2" y="20" width="4" height="70" fill="#475569" />
        <circle r="24" fill="#f8fafc" stroke="#dc2626" strokeWidth="7" />
        <text textAnchor="middle" y="8" fontSize="22" fontWeight="800" fontFamily="Inter, sans-serif" fill="#111">
          50
        </text>
      </g>
    </svg>
  );
});

/* ------------------------------------------------------------------ City */

const CityScene = memo(function CityScene() {
  const windows = useMemo(() => {
    const r = mulberry32(42);
    return Array.from({ length: 140 }, () => r());
  }, []);
  const buildings = [
    { x: 20, w: 90, h: 230, c: '#64748b' },
    { x: 115, w: 70, h: 300, c: '#475569' },
    { x: 190, w: 110, h: 200, c: '#94a3b8' },
    { x: 305, w: 80, h: 330, c: '#334155' },
    { x: 390, w: 120, h: 250, c: '#7c8ba1' },
    { x: 515, w: 70, h: 290, c: '#526079' },
    { x: 590, w: 100, h: 215, c: '#8a96a8' },
    { x: 695, w: 90, h: 270, c: '#3e4b63' },
  ];
  let wi = 0;
  return (
    <svg viewBox="0 0 800 500" {...svgProps}>
      <defs>
        <linearGradient id="sc-day" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#e0f2fe" />
        </linearGradient>
        <radialGradient id="sc-sun" r="0.5">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.4" stopColor="#fde047" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="url(#sc-day)" />
      <circle cx="656" cy="80" r="70" fill="url(#sc-sun)" />
      <circle cx="656" cy="80" r="22" fill="#fffbeb" />
      <g fill="#fff" opacity="0.9">
        <ellipse cx="160" cy="70" rx="60" ry="16" />
        <ellipse cx="200" cy="60" rx="40" ry="18" />
        <ellipse cx="430" cy="100" rx="70" ry="14" />
      </g>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={400 - b.h} width={b.w} height={b.h} fill={b.c} />
          {Array.from({ length: Math.floor(b.h / 30) }).map((_, row) =>
            Array.from({ length: Math.floor(b.w / 22) }).map((__, col) => {
              const v = windows[wi++ % windows.length];
              return <rect key={`${row}-${col}`} x={b.x + 8 + col * 22} y={400 - b.h + 12 + row * 30} width={11} height={15} fill={v > 0.7 ? '#fde68a' : '#1e293b'} opacity={0.85} />;
            }),
          )}
        </g>
      ))}
      <rect y="400" width="800" height="100" fill="#3f3f46" />
      <rect y="400" width="800" height="14" fill="#a1a1aa" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={i * 85 + 10} y="452" width="45" height="6" fill="#fafafa" />
      ))}
      {/* trees */}
      {[60, 250, 470, 740].map((x, i) => (
        <g key={i}>
          <rect x={x - 4} y="365" width="8" height="40" fill="#78350f" />
          <circle cx={x} cy="355" r="26" fill={i % 2 ? '#16a34a' : '#15803d'} />
          <circle cx={x - 14} cy="368" r="16" fill="#22c55e" />
        </g>
      ))}
      {/* red car + blue car */}
      <g transform="translate(120 420)">
        <rect width="120" height="34" rx="10" fill="#dc2626" />
        <rect x="22" y="-20" width="70" height="26" rx="8" fill="#b91c1c" />
        <rect x="30" y="-15" width="25" height="16" rx="3" fill="#bae6fd" />
        <rect x="60" y="-15" width="25" height="16" rx="3" fill="#bae6fd" />
        <circle cx="26" cy="36" r="11" fill="#111" />
        <circle cx="94" cy="36" r="11" fill="#111" />
      </g>
      <g transform="translate(520 425)">
        <rect width="110" height="30" rx="9" fill="#2563eb" />
        <rect x="20" y="-18" width="62" height="22" rx="7" fill="#1d4ed8" />
        <circle cx="24" cy="32" r="10" fill="#111" />
        <circle cx="86" cy="32" r="10" fill="#111" />
      </g>
      {/* traffic light */}
      <g transform="translate(395 300)">
        <rect x="-3" y="60" width="6" height="45" fill="#27272a" />
        <rect x="-12" y="0" width="24" height="64" rx="5" fill="#18181b" />
        <circle cy="13" r="7" fill="#ef4444" />
        <circle cy="32" r="7" fill="#422006" />
        <circle cy="51" r="7" fill="#14532d" />
      </g>
      {/* sign */}
      <g transform="translate(300 330)">
        <rect x="-2" y="20" width="4" height="55" fill="#52525b" />
        <rect x="-40" y="-6" width="80" height="30" rx="4" fill="#15803d" />
        <text textAnchor="middle" y="15" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif" fill="#fff">
          CENTRO
        </text>
      </g>
    </svg>
  );
});

/* ---------------------------------------------------------------- Amsler */

const AmslerScene = memo(function AmslerScene() {
  const cells = 20;
  const size = 440;
  const step = size / cells;
  const ox = (800 - size) / 2;
  const oy = (500 - size) / 2;
  return (
    <svg viewBox="0 0 800 500" {...svgProps}>
      <rect width="800" height="500" fill="#f8fafc" />
      <rect x={ox} y={oy} width={size} height={size} fill="#fff" stroke="#0f172a" strokeWidth="2" />
      {Array.from({ length: cells + 1 }).map((_, i) => (
        <g key={i} stroke="#0f172a" strokeWidth="1.2">
          <line x1={ox + i * step} y1={oy} x2={ox + i * step} y2={oy + size} />
          <line x1={ox} y1={oy + i * step} x2={ox + size} y2={oy + i * step} />
        </g>
      ))}
      <circle cx="400" cy="250" r="5" fill="#0f172a" />
      <text x={ox + size + 18} y={oy + 16} fontSize="12" fontFamily="Inter, sans-serif" fill="#475569">
        Fissare il punto centrale
      </text>
      <text x={ox + size + 18} y={oy + 34} fontSize="12" fontFamily="Inter, sans-serif" fill="#475569">
        a 30–35 cm, un occhio per volta
      </text>
    </svg>
  );
});

/* -------------------------------------------------------------- Ishihara */

// segmenti stile 7-seg per comporre il numero 74
const SEGS: [number, number, number, number][] = [
  // "7"
  [-70, -60, -10, -60],
  [-10, -60, -40, 60],
  // "4"
  [25, -60, 15, 20],
  [15, 20, 75, 20],
  [55, -40, 55, 60],
];

function distToSeg(px: number, py: number, [x1, y1, x2, y2]: [number, number, number, number]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

const IshiharaScene = memo(function IshiharaScene() {
  const dots = useMemo(() => {
    const r = mulberry32(1917);
    const out: { x: number; y: number; r: number; c: string }[] = [];
    const figure = ['#e8743b', '#d9583b', '#f08a4b', '#cc5a2a', '#e0703f'];
    const ground = ['#9cad5a', '#7f9a48', '#b5bf6b', '#8aa35a', '#a7b45f', '#6f8d43'];
    let tries = 0;
    while (out.length < 900 && tries < 20000) {
      tries++;
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 175;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const rad = 3 + r() * 6;
      if (out.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + rad + 0.8)) continue;
      const inFig = SEGS.some((s) => distToSeg(x, y, s) < 17);
      const pal = inFig ? figure : ground;
      out.push({ x, y, r: rad, c: pal[Math.floor(r() * pal.length)] });
    }
    return out;
  }, []);
  return (
    <svg viewBox="0 0 800 500" {...svgProps}>
      <rect width="800" height="500" fill="#f5f0e6" />
      <g transform="translate(400 250)">
        <circle r="185" fill="#efe7d6" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} />
        ))}
      </g>
      <text x="610" y="440" fontSize="12" fontFamily="Inter, sans-serif" fill="#57534e">
        Tavola pseudoisocromatica
      </text>
      <text x="610" y="458" fontSize="12" fontFamily="Inter, sans-serif" fill="#57534e">
        Normale: 74 · Deficit rosso-verde: non leggibile
      </text>
    </svg>
  );
});

export const SCENES: Record<SceneId, React.ComponentType> = {
  reading: ReadingScene,
  night: NightScene,
  city: CityScene,
  amsler: AmslerScene,
  ishihara: IshiharaScene,
};
