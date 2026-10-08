import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GlowFilter, Hotspot, Marker, type DiagramProps } from './Hotspot';
import { annularSector, arcPath, fmt, polar } from './geometry';
import { structuresForMode, type StructureId } from './structures';

/* ------------------------------------------------------------------ Geometria
 * Bulbo destro in sezione lungo l'asse ottico. Scala ≈ 16 px/mm:
 * lunghezza assiale ≈ 23,5 mm, ACD ≈ 3 mm, spessore cristallino ≈ 4 mm.
 * Angoli: 0° = polo posteriore (fovea), ±180° = cornea.
 */
const CX = 420;
const CY = 260;
const R_RET_IN = 178;
const R_RET_OUT = 185.5;
const R_CHO_OUT = 189.5;
const R_SCL_OUT = 198;
const ORA = 128; // ora serrata
const LIMBUS = 151;
const DISC = 20; // angolo della papilla (nasale, verso il basso nella vista)
const DISC_HALF = 5;

const P = (r: number, deg: number) => polar(CX, CY, r, deg);

// Cornea: superficie anteriore (r 128) e posteriore (r ≈ 122) → CCT ≈ 9 px ≈ 0,55 mm
const cOutTop = P(R_SCL_OUT, -LIMBUS);
const cOutBot = P(R_SCL_OUT, LIMBUS);
const cInTop = P(R_CHO_OUT, -LIMBUS);
const cInBot = P(R_CHO_OUT, LIMBUS);
const CORNEA = `M ${fmt(cOutTop)} A 128 128 0 0 0 ${fmt(cOutBot)} L ${fmt(cInBot)} A 121.9 121.9 0 0 1 ${fmt(cInTop)} Z`;
const ANTERIOR_CHAMBER = `M ${fmt(cInTop)} A 121.9 121.9 0 0 0 ${fmt(cInBot)} L 258 343 C 262 320 265 300 268 286 L 268 234 C 265 220 262 200 258 177 Z`;

const SCLERA = annularSector(CX, CY, R_CHO_OUT, R_SCL_OUT, -LIMBUS, LIMBUS);
const CHOROID = [annularSector(CX, CY, R_RET_OUT, R_CHO_OUT, -ORA, DISC - DISC_HALF), annularSector(CX, CY, R_RET_OUT, R_CHO_OUT, DISC + DISC_HALF, ORA)].join(' ');
const RETINA = [annularSector(CX, CY, R_RET_IN, R_RET_OUT, -ORA, DISC - DISC_HALF), annularSector(CX, CY, R_RET_IN, R_RET_OUT, DISC + DISC_HALF, ORA)].join(' ');
const MACULA = annularSector(CX, CY, R_RET_IN - 1.5, R_RET_OUT, -10, 10);

const oraTop = P(R_RET_IN, -ORA);
const VITREOUS = `M ${fmt(oraTop)} ${arcPath(CX, CY, R_RET_IN, -ORA, ORA).replace(/^M [^A]+/, '')} L 296 336 C 314 328 336 296 336 260 C 336 224 314 192 296 184 Z`;

// Cristallino biconvesso (anteriore meno curvo del posteriore), equatore x ≈ 292
const LENS = 'M 292 190 C 276 194 268 228 268 260 C 268 292 276 326 292 330 C 312 326 334 296 334 260 C 334 224 312 194 292 190 Z';
const LENS_NUCLEUS = 'M 293 214 C 282 218 278 240 278 260 C 278 280 282 302 293 306 C 308 302 322 282 322 260 C 322 238 308 218 293 214 Z';

// Metà superiore delle strutture simmetriche (la metà inferiore è ottenuta per riflessione su y = CY)
const MIRROR = `matrix(1 0 0 -1 0 ${CY * 2})`;
const IRIS_UP = 'M 258 177 C 262 198 264 218 264.5 236 L 270 236 C 270.5 220 268.5 199 265.5 178 Z';
const ciliaryStart = P(R_CHO_OUT, -149);
const ciliaryEnd = P(R_CHO_OUT, -ORA);
const CILIARY_UP = `M 258 177 L ${fmt(ciliaryStart)} A ${R_CHO_OUT} ${R_CHO_OUT} 0 0 1 ${fmt(ciliaryEnd)} L 299 132 Q 298 152 295 163 Q 292 172 287 168 Q 283 177 277 172 Q 271 179 265.5 178 Z`;
const ZONULE_UP: [number, number, number, number][] = [
  [284, 194, 280, 174],
  [288, 191, 285, 171],
  [292, 190, 289, 169],
  [297, 191, 293, 167],
  [302, 194, 296, 165],
];
const ANGLE_UP = 'M 254 168.5 L 259.5 176 L 253 181 Q 251.5 174 254 168.5 Z';

// Palpebra superiore e congiuntiva
const lidInnerBack = P(204, -118);
const lidInnerFront = P(204, -152);
const LID_UP = `M ${fmt(lidInnerBack)} A 204 204 0 0 0 ${fmt(lidInnerFront)} L 239 172 Q 232 175 225 170 C 211 140 213 84 257 54 Q 300 42 332 62 Z`;
const CONJ_UP = `${arcPath(CX, CY, 200, -150, -121)} Q 322 74 ${fmt(P(203.5, -118))} ${arcPath(CX, CY, 203.5, -118, -151).replace(/^M [^A]+/, '')}`;

// Muscoli retti
const SR = `M ${fmt(P(212, -120))} A 212 212 0 0 1 ${fmt(P(212, -62))} L 790 284 L 790 296 L ${fmt(P(199, -55))} A 199 199 0 0 0 ${fmt(P(199, -120))} Z`;
const IR = `M ${fmt(P(212, 120))} A 212 212 0 0 0 ${fmt(P(212, 62))} L 790 364 L 790 351 L ${fmt(P(199, 55))} A 199 199 0 0 1 ${fmt(P(199, 120))} Z`;

// Nervo ottico con guaine
const nTop = P(R_SCL_OUT, DISC - 7);
const nBot = P(R_SCL_OUT, DISC + 7);
const NERVE = `M ${fmt(P(R_RET_OUT, DISC - DISC_HALF))} L ${fmt(nTop)} Q 700 318 790 300 L 790 346 Q 690 376 ${fmt(nBot)} L ${fmt(P(R_RET_OUT, DISC + DISC_HALF))} Z`;
const NERVE_SHEATH = `M ${fmt(P(R_SCL_OUT + 2, DISC - 8.5))} Q 700 314 790 295 M ${fmt(P(R_SCL_OUT + 2, DISC + 8.5))} Q 690 381 790 351`;
const CENTRAL_VESSELS = `M ${fmt(P(R_RET_IN + 4, DISC))} Q 690 345 790 323`;
const PAPILLA = annularSector(CX, CY, R_RET_IN - 2, R_SCL_OUT - 2, DISC - DISC_HALF - 0.5, DISC + DISC_HALF + 0.5);
const cup = P(R_RET_IN + 3, DISC);

const fovea = P(R_RET_IN, 0);

// Raggi luminosi: entrano paralleli, rifratti da cornea e cristallino, convergono sulla fovea
const RAYS = [242, 251, 260, 269, 278].map((y0) => {
  const d = y0 - CY;
  return `M 8 ${y0} L 206 ${y0} L 268 ${CY + d * 0.86} L 334 ${CY + d * 0.7} L ${fovea[0] - 2} ${fovea[1]}`;
});

/* Posizioni dei marcatori numerati: [ancora x, ancora y, marcatore x, marcatore y] */
const MARKERS: Partial<Record<StructureId, [number, number, number, number]>> = {
  cornea: [207, 212, 176, 204],
  'camera-anteriore': [238, 300, 190, 322],
  angolo: [255, 174, 232, 140],
  iride: [267, 318, 246, 392],
  pupilla: [266, 252, 236, 230],
  cristallino: [306, 262, 306, 262],
  zonula: [290, 182, 314, 158],
  'corpo-ciliare': [284, 140, 300, 98],
  congiuntiva: [312, 86, 352, 40],
  palpebre: [224, 112, 186, 82],
  'retto-superiore': [580, 127, 580, 127],
  'retto-inferiore': [580, 419, 580, 419],
  sclera: [...P(194, -100), 386, 30] as [number, number, number, number],
  coroide: [...P(187.5, -45), 520, 165] as [number, number, number, number],
  retina: [...P(181.5, -28), 536, 196] as [number, number, number, number],
  vitreo: [450, 300, 450, 300],
  macula: [...P(181, -8), 562, 226] as [number, number, number, number],
  fovea: [fovea[0] - 1, fovea[1], 562, 256],
  papilla: [...P(182, DISC), 552, 300] as [number, number, number, number],
  'nervo-ottico': [700, 333, 700, 333],
};

interface Props extends DiagramProps {
  showLight: boolean;
}

export function SagittalSection(props: Props) {
  const { showLight, showLabels, selected, hovered } = props;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const glow = `glow-${uid}`;
  const reduce = useReducedMotion();
  const hs = { ...props, glowId: glow };
  const numbers = structuresForMode('sagittal');

  return (
    <svg viewBox="0 0 800 520" className="h-auto w-full select-none" role="group" aria-label="Sezione sagittale del bulbo oculare">
      <defs>
        <GlowFilter id={glow} />
        <radialGradient id={`vit-${uid}`} cx="0.55" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#13213d" />
          <stop offset="1" stopColor="#0d1830" />
        </radialGradient>
        <radialGradient id={`lens-${uid}`} cx="0.45" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#fef9c3" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id={`cornea-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#bae6fd" stopOpacity="0.85" />
          <stop offset="1" stopColor="#7dd3fc" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`iris-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id={`muscle-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#f87171" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id={`nerve-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d4a72c" />
        </linearGradient>
        <linearGradient id={`lid-${uid}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#d4a3a8" />
          <stop offset="1" stopColor="#9d6b78" />
        </linearGradient>
        <linearGradient id={`ray-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.2" />
          <stop offset="0.3" stopColor="#fef08a" />
          <stop offset="1" stopColor="#facc15" />
        </linearGradient>
        <pattern id={`fat-${uid}`} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="9" r="7" fill="none" stroke="#facc15" strokeOpacity="0.07" />
        </pattern>
      </defs>

      {/* Grasso orbitario (sfondo) */}
      <path d="M 300 0 L 800 0 L 800 520 L 300 520 Q 470 470 620 420 Q 700 260 620 100 Q 470 50 300 0 Z" fill={`url(#fat-${uid})`} />

      {/* Muscoli extraoculari */}
      <Hotspot id="retto-superiore" {...hs}>
        <path d={SR} fill={`url(#muscle-${uid})`} fillOpacity="0.85" stroke="#fecaca" strokeOpacity="0.25" />
      </Hotspot>
      <Hotspot id="retto-inferiore" {...hs}>
        <path d={IR} fill={`url(#muscle-${uid})`} fillOpacity="0.85" stroke="#fecaca" strokeOpacity="0.25" />
      </Hotspot>

      {/* Nervo ottico */}
      <Hotspot id="nervo-ottico" {...hs}>
        <path d={NERVE} fill={`url(#nerve-${uid})`} fillOpacity="0.9" />
        <path d={NERVE_SHEATH} fill="none" stroke="#e2e8f0" strokeOpacity="0.55" strokeWidth="3" />
        <path d={CENTRAL_VESSELS} fill="none" stroke="#dc2626" strokeWidth="2.4" strokeOpacity="0.85" />
        <path d={CENTRAL_VESSELS} fill="none" stroke="#1d4ed8" strokeWidth="1.2" strokeOpacity="0.8" transform="translate(0 4)" />
      </Hotspot>

      {/* Sclera */}
      <Hotspot id="sclera" {...hs}>
        <path d={SCLERA} fill="#e8edf5" />
        <path d={arcPath(CX, CY, R_SCL_OUT - 0.5, -LIMBUS, LIMBUS)} fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1" />
      </Hotspot>

      {/* Vitreo */}
      <Hotspot id="vitreo" {...hs}>
        <path d={VITREOUS} fill={`url(#vit-${uid})`} />
        {[
          'M 360 150 C 420 170 470 160 520 190',
          'M 350 330 C 410 350 480 340 540 360',
          'M 380 240 C 440 230 500 250 560 236',
        ].map((d) => (
          <path key={d} d={d} fill="none" stroke="#94a3b8" strokeOpacity="0.12" strokeWidth="1" />
        ))}
      </Hotspot>

      {/* Coroide */}
      <Hotspot id="coroide" {...hs}>
        <path d={CHOROID} fill="#c2410c" />
      </Hotspot>

      {/* Retina */}
      <Hotspot id="retina" {...hs}>
        <path d={RETINA} fill="#fb923c" fillOpacity="0.9" />
        <path d={arcPath(CX, CY, R_RET_IN + 0.5, -ORA, DISC - DISC_HALF)} fill="none" stroke="#fed7aa" strokeOpacity="0.6" strokeWidth="0.8" />
      </Hotspot>

      {/* Macula e fovea */}
      <Hotspot id="macula" {...hs}>
        <path d={MACULA} fill="#facc15" fillOpacity="0.75" />
      </Hotspot>
      <Hotspot id="fovea" {...hs}>
        {(active) => (
          <>
            <ellipse cx={fovea[0] + 1} cy={fovea[1]} rx="4.2" ry="7.5" fill="#13213d" />
            <circle cx={fovea[0] + 2} cy={fovea[1]} r="9" fill="transparent" />
            <circle cx={fovea[0] + 3} cy={fovea[1]} r="2" fill={active ? '#fef08a' : '#fde047'} />
          </>
        )}
      </Hotspot>

      {/* Papilla ottica con escavazione */}
      <Hotspot id="papilla" {...hs}>
        <path d={PAPILLA} fill="#fecaca" />
        <ellipse cx={cup[0]} cy={cup[1]} rx="4" ry="6.5" transform={`rotate(${DISC} ${cup[0]} ${cup[1]})`} fill="#fff7ed" />
      </Hotspot>

      {/* Corpo ciliare */}
      <Hotspot id="corpo-ciliare" {...hs}>
        <path d={CILIARY_UP} fill="#a855f7" fillOpacity="0.85" />
        <path d={CILIARY_UP} fill="#a855f7" fillOpacity="0.85" transform={MIRROR} />
      </Hotspot>

      {/* Cristallino */}
      <Hotspot id="cristallino" {...hs}>
        <path d={LENS} fill={`url(#lens-${uid})`} stroke="#fef3c7" strokeOpacity="0.8" strokeWidth="1" />
        <path d={LENS_NUCLEUS} fill="#fcd34d" fillOpacity="0.28" />
      </Hotspot>

      {/* Zonula */}
      <Hotspot id="zonula" {...hs}>
        {[false, true].map((m) => (
          <g key={String(m)} transform={m ? MIRROR : undefined}>
            <rect x="278" y="166" width="26" height="26" fill="transparent" />
            {ZONULE_UP.map(([x1, y1, x2, y2]) => (
              <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e2e8f0" strokeWidth="0.9" strokeOpacity="0.85" />
            ))}
          </g>
        ))}
      </Hotspot>

      {/* Camera anteriore */}
      <Hotspot id="camera-anteriore" {...hs}>
        <path d={ANTERIOR_CHAMBER} fill="#0ea5e9" fillOpacity="0.16" />
      </Hotspot>

      {/* Iride */}
      <Hotspot id="iride" {...hs}>
        <path d={IRIS_UP} fill={`url(#iris-${uid})`} />
        <path d={IRIS_UP} fill={`url(#iris-${uid})`} transform={MIRROR} />
      </Hotspot>

      {/* Pupilla */}
      <Hotspot id="pupilla" {...hs}>
        {(active) => (
          <>
            <rect x="262" y="237" width="9" height="46" rx="2" fill="#020617" fillOpacity={active ? 0.6 : 0.28} />
            <line x1="266.5" y1="238" x2="266.5" y2="282" stroke="#67e8f9" strokeOpacity={active ? 0.9 : 0.25} strokeDasharray="2 3" />
          </>
        )}
      </Hotspot>

      {/* Angolo irido-corneale / trabecolato + canale di Schlemm */}
      <Hotspot id="angolo" {...hs}>
        {[false, true].map((m) => (
          <g key={String(m)} transform={m ? MIRROR : undefined}>
            <circle cx="255" cy="174" r="9" fill="transparent" />
            <path d={ANGLE_UP} fill="#a78bfa" />
            <ellipse cx="249.5" cy="170" rx="1.8" ry="2.6" fill="#4c1d95" stroke="#c4b5fd" strokeWidth="0.6" />
          </g>
        ))}
      </Hotspot>

      {/* Cornea */}
      <Hotspot id="cornea" {...hs}>
        <path d={CORNEA} fill={`url(#cornea-${uid})`} stroke="#e0f2fe" strokeOpacity="0.7" strokeWidth="0.8" />
      </Hotspot>

      {/* Congiuntiva */}
      <Hotspot id="congiuntiva" {...hs}>
        {[false, true].map((m) => (
          <g key={String(m)} transform={m ? MIRROR : undefined}>
            <path d={CONJ_UP} fill="none" stroke="transparent" strokeWidth="7" />
            <path d={CONJ_UP} fill="none" stroke="#fda4af" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        ))}
      </Hotspot>

      {/* Palpebre */}
      <Hotspot id="palpebre" {...hs}>
        {[false, true].map((m) => (
          <g key={String(m)} transform={m ? MIRROR : undefined}>
            <path d={LID_UP} fill={`url(#lid-${uid})`} fillOpacity="0.55" stroke="#f5d0d6" strokeOpacity="0.4" />
            {/* tarso */}
            <path d="M 236 160 C 228 140 230 112 244 96" fill="none" stroke="#fde2e4" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />
            {/* ciglia */}
            <path d="M 228 171 q -10 4 -16 -2 M 232 173 q -8 8 -15 5" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          </g>
        ))}
      </Hotspot>

      {/* Percorso della luce */}
      {showLight && (
        <g pointerEvents="none">
          {RAYS.map((d, i) => (
            <g key={d}>
              <motion.path
                d={d}
                fill="none"
                stroke={`url(#ray-${uid})`}
                strokeWidth="1.4"
                strokeOpacity="0.55"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : i * 0.06, ease: 'easeOut' }}
              />
              {!reduce && (
                <motion.path
                  d={d}
                  fill="none"
                  stroke="#fef9c3"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray="4 22"
                  initial={{ strokeDashoffset: 0, opacity: 0 }}
                  animate={{ strokeDashoffset: -104, opacity: 1 }}
                  transition={{ strokeDashoffset: { duration: 1.6, ease: 'linear', repeat: Infinity }, opacity: { delay: 1, duration: 0.4 } }}
                />
              )}
            </g>
          ))}
          <motion.circle
            cx={fovea[0] - 2}
            cy={fovea[1]}
            fill="none"
            stroke="#fde047"
            strokeWidth="1.5"
            initial={{ r: 3, opacity: 0 }}
            animate={reduce ? { r: 6, opacity: 0.8 } : { r: [3, 14], opacity: [0.9, 0] }}
            transition={reduce ? { duration: 0 } : { duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 1 }}
          />
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.6 }}>
            <text x="200" y="300" textAnchor="end" fontSize="10.5" fill="#fef08a" stroke="#0b1120" strokeWidth="3" style={{ paintOrder: 'stroke' }}>
              Cornea ≈ 43 D
            </text>
            <text x="320" y="352" textAnchor="middle" fontSize="10.5" fill="#fef08a" stroke="#0b1120" strokeWidth="3" style={{ paintOrder: 'stroke' }}>
              Cristallino ≈ 20 D
            </text>
            <text x="520" y="288" textAnchor="middle" fontSize="10.5" fill="#fef08a" stroke="#0b1120" strokeWidth="3" style={{ paintOrder: 'stroke' }}>
              Fuoco sulla fovea
            </text>
            <text x="12" y="232" fontSize="10.5" fill="#fde68a" stroke="#0b1120" strokeWidth="3" style={{ paintOrder: 'stroke' }}>
              Luce incidente →
            </text>
          </motion.g>
        </g>
      )}

      {/* Marcatori numerati */}
      {showLabels &&
        numbers.map((s, i) => {
          const m = MARKERS[s.id];
          if (!m) return null;
          return <Marker key={s.id} n={i + 1} x={m[0]} y={m[1]} tx={m[2]} ty={m[3]} active={selected === s.id || hovered === s.id} />;
        })}

      {/* Orientamento */}
      <g pointerEvents="none" fontSize="10" fill="#64748b" fontWeight="600" letterSpacing="1.5">
        <text x="12" y="510">ANTERIORE</text>
        <text x="788" y="510" textAnchor="end">
          POSTERIORE
        </text>
        <text x="420" y="14" textAnchor="middle">
          SUPERIORE
        </text>
      </g>
    </svg>
  );
}
