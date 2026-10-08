/** Piccole utilità geometriche per costruire i path SVG. Angoli in gradi, 0° = asse +x, crescenti in senso orario (y verso il basso). */

export type Pt = readonly [number, number];

const r2 = (n: number) => Math.round(n * 100) / 100;

export function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  return [r2(cx + r * Math.cos(a)), r2(cy + r * Math.sin(a))];
}

export const fmt = (p: Pt) => `${p[0]} ${p[1]}`;

/** Arco di circonferenza da a0 a a1 (a1 > a0 → senso orario). Restituisce solo il comando A (senza M). */
function arcTo(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `A ${r} ${r} 0 ${large} ${sweep} ${fmt(polar(cx, cy, r, a1))}`;
}

export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  return `M ${fmt(polar(cx, cy, r, a0))} ${arcTo(cx, cy, r, a0, a1)}`;
}

/** Settore di corona circolare tra i raggi r0 < r1 e gli angoli a0 → a1. */
export function annularSector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  return [`M ${fmt(polar(cx, cy, r1, a0))}`, arcTo(cx, cy, r1, a0, a1), `L ${fmt(polar(cx, cy, r0, a1))}`, arcTo(cx, cy, r0, a1, a0), 'Z'].join(' ');
}

/** Polilinea "liscia" (Catmull-Rom → Bézier) attraverso i punti dati. */
export function smoothLine(points: Pt[]): string {
  if (points.length < 2) return '';
  let d = `M ${fmt(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1: Pt = [r2(p1[0] + (p2[0] - p0[0]) / 6), r2(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2: Pt = [r2(p2[0] - (p3[0] - p1[0]) / 6), r2(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C ${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return d;
}
