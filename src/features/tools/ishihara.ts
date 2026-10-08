import { mulberry32, pick } from './prng';

export interface Dot {
  x: number;
  y: number;
  r: number;
  fill: string;
}

export type PaletteId = 'demo' | 'classic' | 'protan' | 'deutan';

export interface PlateSpec {
  number: string;
  palette: PaletteId;
  seed: number;
  demo?: boolean;
}

interface Palette {
  figure: readonly string[];
  background: readonly string[];
}

/**
 * Coppie di colori scelte lungo le linee di confusione protan/deutan:
 * rosso-arancio (figura) vs verde-oliva/giallo-verde (sfondo) con luminanza simile,
 * così da non poter essere distinti tramite la sola luminosità.
 */
export const PALETTES: Record<PaletteId, Palette> = {
  demo: {
    figure: ['#e0632f', '#d4572a', '#ea7a40', '#c94f25'],
    background: ['#8aa3b8', '#9fb3c4', '#7b95ab', '#a9bccb', '#94abbf'],
  },
  classic: {
    figure: ['#e07b39', '#d9693a', '#ec9a5c', '#c95f30', '#e88a4f'],
    background: ['#8ea65a', '#a3b46a', '#7f9a4f', '#b9c07a', '#94ab63', '#c4b86f'],
  },
  protan: {
    figure: ['#d6574c', '#e06d57', '#cb4f4a', '#e5806a', '#d9624f'],
    background: ['#8f9452', '#a19e5c', '#848f4c', '#ada866', '#979a57'],
  },
  deutan: {
    figure: ['#e3884e', '#d97c46', '#ee9b63', '#d27140'],
    background: ['#a2a65c', '#b2ad67', '#96a057', '#bdb470', '#a9b064'],
  },
};

export const PLATES: PlateSpec[] = [
  { number: '12', palette: 'demo', seed: 101, demo: true },
  { number: '8', palette: 'classic', seed: 202 },
  { number: '29', palette: 'protan', seed: 303 },
  { number: '74', palette: 'deutan', seed: 404 },
  { number: '5', palette: 'classic', seed: 505 },
  { number: '45', palette: 'protan', seed: 606 },
  { number: '6', palette: 'deutan', seed: 707 },
  { number: '3', palette: 'classic', seed: 808 },
];

type Pt = readonly [number, number];
type Stroke = Pt[];

function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 18): Stroke {
  const pts: Stroke = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

/** Cifre in una cella 1 × 1.6 (y verso il basso), descritte come polilinee */
const SIX: Stroke[] = [arc(0.5, 1.12, 0.36, 0.38, 0, 360, 24), arc(0.62, 1.12, 0.48, 1.0, 180, 265, 14)];
const GLYPHS: Record<string, Stroke[]> = {
  '0': [arc(0.5, 0.8, 0.38, 0.68, 0, 360, 28)],
  '1': [
    [
      [0.28, 0.32],
      [0.56, 0.1],
      [0.56, 1.5],
    ],
  ],
  '2': [
    [
      ...arc(0.5, 0.46, 0.36, 0.36, -175, 35, 18),
      [0.1, 1.5],
      [0.92, 1.5],
    ],
  ],
  '3': [arc(0.48, 0.45, 0.34, 0.35, -160, 90, 16), arc(0.48, 1.14, 0.38, 0.36, -90, 160, 16)],
  '4': [
    [
      [0.68, 1.5],
      [0.68, 0.1],
      [0.08, 1.06],
      [0.94, 1.06],
    ],
  ],
  '5': [
    [
      [0.86, 0.1],
      [0.22, 0.1],
      [0.16, 0.72],
      ...arc(0.48, 1.06, 0.4, 0.42, -135, 150, 18),
    ],
  ],
  '6': SIX,
  '7': [
    [
      [0.08, 0.1],
      [0.92, 0.1],
      [0.38, 1.5],
    ],
  ],
  '8': [arc(0.5, 0.43, 0.3, 0.32, 0, 360, 22), arc(0.5, 1.13, 0.37, 0.38, 0, 360, 24)],
  '9': SIX.map((s) => s.map(([x, y]) => [1 - x, 1.6 - y] as const)),
};

function distToSegment(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len2));
  const qx = a[0] + t * dx;
  const qy = a[1] + t * dy;
  return Math.hypot(px - qx, py - qy);
}

export const PLATE_R = 100;

/** Genera una tavola pseudo-isocromatica: dischi impacchettati casualmente, colorati in base alla distanza dai tratti delle cifre */
export function generatePlate(spec: PlateSpec): Dot[] {
  const rand = mulberry32(spec.seed);
  const palette = PALETTES[spec.palette];
  const digits = spec.number.split('');
  const n = digits.length;
  const scale = n === 1 ? 70 : 60;
  const gap = 0.3;
  const width = n + (n - 1) * gap;
  const x0 = (-width * scale) / 2;
  const y0 = -0.8 * scale;
  const halfStroke = 0.17;

  const segments: [Pt, Pt][] = [];
  digits.forEach((d, i) => {
    const ox = i * (1 + gap);
    for (const stroke of GLYPHS[d] ?? []) {
      for (let k = 0; k + 1 < stroke.length; k++) {
        segments.push([
          [stroke[k][0] + ox, stroke[k][1]],
          [stroke[k + 1][0] + ox, stroke[k + 1][1]],
        ]);
      }
    }
  });

  const isFigure = (x: number, y: number) => {
    const u = (x - x0) / scale;
    const v = (y - y0) / scale;
    for (const [a, b] of segments) if (distToSegment(u, v, a, b) < halfStroke) return true;
    return false;
  };

  const cell = 14;
  const grid = new Map<string, Dot[]>();
  const key = (cx: number, cy: number) => `${cx},${cy}`;
  const dots: Dot[] = [];
  const phases = [6.2, 5.2, 4.3, 3.5, 2.8, 2.2, 1.6];
  const spacing = 0.7;

  for (const maxR of phases) {
    for (let t = 0; t < 3000; t++) {
      const r = maxR * (0.82 + rand() * 0.18);
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand()) * (PLATE_R - r - 1);
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      let ok = true;
      for (let ix = gx - 1; ix <= gx + 1 && ok; ix++) {
        for (let iy = gy - 1; iy <= gy + 1 && ok; iy++) {
          const bucket = grid.get(key(ix, iy));
          if (!bucket) continue;
          for (const d of bucket) {
            if (Math.hypot(d.x - x, d.y - y) < d.r + r + spacing) {
              ok = false;
              break;
            }
          }
        }
      }
      if (!ok) continue;
      const fill = pick(rand, isFigure(x, y) ? palette.figure : palette.background);
      const dot: Dot = { x, y, r, fill };
      dots.push(dot);
      const k = key(gx, gy);
      const bucket = grid.get(k);
      if (bucket) bucket.push(dot);
      else grid.set(k, [dot]);
    }
  }
  return dots;
}
