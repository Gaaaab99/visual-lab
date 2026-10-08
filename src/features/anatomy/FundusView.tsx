import { useId } from 'react';
import { GlowFilter, Hotspot, Marker, type DiagramProps } from './Hotspot';
import { polar } from './geometry';
import { structuresForMode, type StructureId } from './structures';

/* Fondo oculare destro (OD): papilla nasale (a destra), macula temporale.
 * Scala ≈ 33 px/mm: diametro papillare ≈ 1,8 mm, distanza papilla-fovea ≈ 4,5 mm. */
const C = 300;
const R = 270;
const DISC = { x: 400, y: 290, r: 30 };
const CUP = { x: 403, y: 289, rx: 11, ry: 13 }; // C/D verticale ≈ 0,43
const FOVEA = { x: 250, y: 302 };

interface Vessel {
  d: string;
  w: number;
}

const ARTERIES: Vessel[] = [
  // arcata temporale superiore
  { d: 'M 396 276 C 372 222 312 196 256 198 C 192 200 142 222 72 252', w: 3.2 },
  // arcata temporale inferiore
  { d: 'M 396 304 C 372 360 312 392 256 396 C 192 398 142 378 72 350', w: 3.2 },
  // nasale superiore / inferiore
  { d: 'M 404 274 C 418 220 440 160 474 92', w: 2.6 },
  { d: 'M 404 306 C 420 368 444 430 472 502', w: 2.6 },
  { d: 'M 428 287 C 470 284 520 278 566 266', w: 1.8 },
  // rami maculari e periferici
  { d: 'M 300 199 C 292 228 282 248 272 262', w: 1.3 },
  { d: 'M 300 395 C 292 368 283 352 272 340', w: 1.3 },
  { d: 'M 180 204 C 150 180 130 150 112 112', w: 1.6 },
  { d: 'M 182 392 C 152 418 132 448 116 486', w: 1.6 },
  { d: 'M 230 199 C 214 176 200 150 196 108', w: 1.3 },
  { d: 'M 452 186 C 480 176 512 172 548 176', w: 1.4 },
  { d: 'M 450 416 C 480 426 514 432 548 426', w: 1.4 },
  { d: 'M 120 238 C 104 260 98 282 96 300', w: 1 },
];

const VEINS: Vessel[] = [
  { d: 'M 402 272 C 382 210 320 182 258 183 C 196 185 130 204 60 228', w: 4.6 },
  { d: 'M 402 308 C 382 370 320 404 258 410 C 196 412 130 395 60 372', w: 4.6 },
  { d: 'M 410 274 C 432 210 468 160 502 100', w: 3.6 },
  { d: 'M 410 306 C 434 368 470 430 506 490', w: 3.6 },
  { d: 'M 428 296 C 470 300 520 310 566 322', w: 2.4 },
  { d: 'M 312 184 C 302 214 290 236 280 252', w: 1.8 },
  { d: 'M 312 408 C 302 380 290 360 280 348', w: 1.8 },
  { d: 'M 214 186 C 192 160 176 136 156 98', w: 2.2 },
  { d: 'M 212 410 C 190 438 172 462 150 496', w: 2.2 },
  { d: 'M 470 156 C 500 140 530 136 560 140', w: 1.8 },
  { d: 'M 472 438 C 500 456 530 462 558 458', w: 1.8 },
  { d: 'M 96 216 C 82 238 76 262 74 290', w: 1.4 },
];

/** Ora serrata: contorno dentellato */
const ORA_PATH = (() => {
  const n = 64;
  const pts = Array.from({ length: n }, (_, i) => polar(C, C, i % 2 === 0 ? 258 : 264, (i * 360) / n));
  return `M ${pts.map((p) => `${p[0]} ${p[1]}`).join(' L ')} Z`;
})();

const PERIPHERY = `M ${C} ${C - 250} A 250 250 0 1 1 ${C - 0.01} ${C - 250} Z M ${C} ${C - 178} A 178 178 0 1 0 ${C + 0.01} ${C - 178} Z`;

const MARKERS: Partial<Record<StructureId, [number, number, number, number]>> = {
  macula: [250, 345, 250, 345],
  fovea: [FOVEA.x - 2, FOVEA.y, 205, 288],
  papilla: [374, 300, 342, 300],
  escavazione: [407, 296, 448, 334],
  arterie: [164, 214, 150, 252],
  vene: [162, 400, 140, 446],
  'media-periferia': [300, 84, 300, 84],
  'ora-serrata': [300, 561, 300, 561],
};

export function FundusView(props: DiagramProps) {
  const { showLabels, selected, hovered } = props;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const glow = `glow-${uid}`;
  const hs = { ...props, glowId: glow };
  const numbers = structuresForMode('fundus');

  return (
    <svg viewBox="0 0 600 600" className="mx-auto h-auto w-full max-w-[640px] select-none" role="group" aria-label="Fondo oculare, occhio destro">
      <defs>
        <GlowFilter id={glow} />
        <radialGradient id={`fundus-${uid}`} cx="0.45" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#c2410c" />
          <stop offset="0.55" stopColor="#b4341a" />
          <stop offset="0.85" stopColor="#8a2413" />
          <stop offset="1" stopColor="#3b0d07" />
        </radialGradient>
        <radialGradient id={`macula-${uid}`}>
          <stop offset="0" stopColor="#3f0f06" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#5a1709" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7c2d12" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`disc-${uid}`} cx="0.42" cy="0.5">
          <stop offset="0" stopColor="#fde4cf" />
          <stop offset="0.7" stopColor="#f6b98f" />
          <stop offset="1" stopColor="#e58f62" />
        </radialGradient>
        <filter id={`tex-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" />
          <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.06  0 0 0 0 0.02  0 0 0 0.55 -0.12" />
        </filter>
        <clipPath id={`clip-${uid}`}>
          <circle cx={C} cy={C} r={R} />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${uid})`}>
        <circle cx={C} cy={C} r={R} fill={`url(#fundus-${uid})`} />
        <rect x="0" y="0" width="600" height="600" filter={`url(#tex-${uid})`} opacity="0.55" pointerEvents="none" />

        {/* Media periferia (corona tra arcate ed equatore) */}
        <Hotspot id="media-periferia" {...hs}>
          {(active) => <path d={PERIPHERY} fillRule="evenodd" fill="#fdba74" fillOpacity={active ? 0.16 : 0.03} stroke="#fdba74" strokeOpacity={active ? 0.55 : 0.12} strokeDasharray="4 6" />}
        </Hotspot>

        {/* Ora serrata */}
        <Hotspot id="ora-serrata" {...hs}>
          {(active) => (
            <>
              <path d={ORA_PATH} fill="none" stroke="transparent" strokeWidth="14" />
              <path d={ORA_PATH} fill="none" stroke="#f1f5f9" strokeOpacity={active ? 0.95 : 0.4} strokeWidth="1.4" strokeLinejoin="round" />
            </>
          )}
        </Hotspot>

        {/* Macula */}
        <Hotspot id="macula" {...hs}>
          {(active) => (
            <>
              <circle cx={FOVEA.x} cy={FOVEA.y} r="88" fill={`url(#macula-${uid})`} />
              <circle cx={FOVEA.x} cy={FOVEA.y} r="60" fill="transparent" stroke="#facc15" strokeOpacity={active ? 0.7 : 0} strokeDasharray="3 5" />
            </>
          )}
        </Hotspot>

        {/* Fovea con riflesso foveale */}
        <Hotspot id="fovea" {...hs}>
          {(active) => (
            <>
              <circle cx={FOVEA.x} cy={FOVEA.y} r="14" fill="transparent" />
              <circle cx={FOVEA.x} cy={FOVEA.y} r="7" fill="#2a0904" fillOpacity="0.85" />
              <circle cx={FOVEA.x} cy={FOVEA.y} r="1.8" fill={active ? '#fef08a' : '#fde68a'} />
            </>
          )}
        </Hotspot>

        {/* Papilla ed escavazione */}
        <Hotspot id="papilla" {...hs}>
          <circle cx={DISC.x} cy={DISC.y} r={DISC.r + 3} fill="#5b1a0c" fillOpacity="0.55" />
          <circle cx={DISC.x} cy={DISC.y} r={DISC.r} fill={`url(#disc-${uid})`} />
        </Hotspot>
        <Hotspot id="escavazione" {...hs}>
          <ellipse cx={CUP.x} cy={CUP.y} rx={CUP.rx} ry={CUP.ry} fill="#fff7ed" fillOpacity="0.95" />
        </Hotspot>

        {/* Vene (più scure e spesse) */}
        <Hotspot id="vene" {...hs}>
          {VEINS.map((v) => (
            <g key={v.d}>
              <path d={v.d} fill="none" stroke="transparent" strokeWidth={v.w + 6} strokeLinecap="round" />
              <path d={v.d} fill="none" stroke="#6b1010" strokeWidth={v.w} strokeLinecap="round" />
            </g>
          ))}
        </Hotspot>

        {/* Arterie (più sottili e chiare, con riflesso parietale) */}
        <Hotspot id="arterie" {...hs}>
          {ARTERIES.map((a) => (
            <g key={a.d}>
              <path d={a.d} fill="none" stroke="transparent" strokeWidth={a.w + 6} strokeLinecap="round" />
              <path d={a.d} fill="none" stroke="#ef4444" strokeWidth={a.w} strokeLinecap="round" />
              <path d={a.d} fill="none" stroke="#fee2e2" strokeOpacity="0.55" strokeWidth={Math.max(0.5, a.w * 0.25)} strokeLinecap="round" />
            </g>
          ))}
        </Hotspot>
      </g>

      {/* Cornice */}
      <circle cx={C} cy={C} r={R} fill="none" stroke="#0b1120" strokeWidth="2" pointerEvents="none" />
      <circle cx={C} cy={C} r={R + 6} fill="none" stroke="#273452" strokeWidth="1" pointerEvents="none" />

      {showLabels &&
        numbers.map((s, i) => {
          const m = MARKERS[s.id];
          if (!m) return null;
          return <Marker key={s.id} n={i + 1} x={m[0]} y={m[1]} tx={m[2]} ty={m[3]} active={selected === s.id || hovered === s.id} />;
        })}

      <g pointerEvents="none" fontSize="10" fill="#64748b" fontWeight="600" letterSpacing="1.5">
        <text x="14" y="20">OD</text>
        <text x="14" y="590">TEMPORALE</text>
        <text x="586" y="590" textAnchor="end">
          NASALE
        </text>
      </g>
    </svg>
  );
}
