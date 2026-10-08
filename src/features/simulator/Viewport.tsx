import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { motion } from 'motion/react';
import type { Quadrant, SimulatorState, VisualSource } from '../../types';
import { computeRender, mulberry32, type RenderModel } from './engine';
import { SCENES, SCENE_LIGHTS } from './scenes/Scenes';

/* ------------------------------------------------------------ Sorgente */

function VideoLayer({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />;
}

const SourceLayer = memo(function SourceLayer({ source, stream }: { source: VisualSource; stream: MediaStream | null }) {
  if (source.kind === 'scene') {
    const Scene = SCENES[source.scene];
    return <Scene />;
  }
  if (source.kind === 'upload') return <img src={source.url} alt={source.name} className="h-full w-full object-cover" draggable={false} />;
  if (stream) return <VideoLayer stream={stream} />;
  return <div className="h-full w-full bg-ink-950" />;
});

/* ------------------------------------------------------------ Filtri SVG */

function FilterDefs({ model }: { model: RenderModel }) {
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden>
      <defs>
        <filter id="vl-colorblind" colorInterpolationFilters="linearRGB">
          <feColorMatrix type="matrix" values={model.colorMatrix ?? '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0'} />
        </filter>
        <filter id="vl-metamorph" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.022" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={model.distortion?.scale ?? 0} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="vl-cornea" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="turbulence" baseFrequency="0.006 0.009" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={model.cornealWarp} xChannelSelector="R" yChannelSelector="B" />
        </filter>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------ Overlay */

const W = 160;
const H = 100;

/** Punto di fissazione in % del viewport (50,50 = centro) */
export interface Fixation {
  x: number;
  y: number;
}
const CENTER: Fixation = { x: 50, y: 50 };
const fx = (f: Fixation) => (f.x / 100) * W;
const fy = (f: Fixation) => (f.y / 100) * H;

function FieldLoss({ level, kind, fix = CENTER }: { level: number; kind: 'glaucoma' | 'rp'; fix?: Fixation }) {
  if (level <= 0) return null;
  const clear = kind === 'glaucoma' ? 95 * (1 - level * 0.86) + 4 : 70 * (1 - level * 0.9) + 6;
  const fade = kind === 'glaucoma' ? 22 + level * 6 : 10 + level * 4;
  const r = clear + fade;
  const id = `vl-field-${kind}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
      <defs>
        <radialGradient id={id} cx={fx(fix)} cy={fy(fix)} r={r} gradientUnits="userSpaceOnUse">
          <stop offset={clear / r} stopColor="#000" stopOpacity="0" />
          <stop offset={(clear + fade * 0.55) / r} stopColor={kind === 'rp' ? '#030303' : '#0a0a0a'} stopOpacity={kind === 'rp' ? 0.9 : 0.7} />
          <stop offset="1" stopColor="#000" stopOpacity={kind === 'rp' ? 1 : 0.97} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />
    </svg>
  );
}

function PeripheralDesensitization({ level, fix = CENTER }: { level: number; fix?: Fixation }) {
  if (level <= 0) return null;
  const inner = Math.max(8, 55 - level * 40);
  const style: CSSProperties = {
    backdropFilter: `blur(${2 + level * 5}px) grayscale(${0.3 + level * 0.5})`,
    WebkitBackdropFilter: `blur(${2 + level * 5}px) grayscale(${0.3 + level * 0.5})`,
    maskImage: `radial-gradient(ellipse 50% 80% at ${fix.x}% ${fix.y}%, transparent ${inner}%, black ${inner + 30}%)`,
    WebkitMaskImage: `radial-gradient(ellipse 50% 80% at ${fix.x}% ${fix.y}%, transparent ${inner}%, black ${inner + 30}%)`,
  };
  return <div className="absolute inset-0" style={style} />;
}

function CentralScotoma({ amd, edema, fix = CENTER }: { amd: number; edema: number; fix?: Fixation }) {
  const cx = fx(fix);
  const cy = fy(fix);
  const blobs = useMemo(() => {
    const r = mulberry32(31);
    return Array.from({ length: 7 }, () => ({ a: r() * Math.PI * 2, d: r(), s: 0.5 + r() * 0.6 }));
  }, []);
  if (amd <= 0 && edema <= 0) return null;
  const blurBackdrop = Math.max(amd, edema);
  const maskR = 10 + blurBackdrop * 16;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: `blur(${3 + blurBackdrop * 8}px)`,
          WebkitBackdropFilter: `blur(${3 + blurBackdrop * 8}px)`,
          maskImage: `radial-gradient(ellipse ${maskR}% ${maskR * 1.6}% at ${fix.x}% ${fix.y}%, black 40%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(ellipse ${maskR}% ${maskR * 1.6}% at ${fix.x}% ${fix.y}%, black 40%, transparent 100%)`,
        }}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <filter id="vl-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
          <filter id="vl-softer" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {amd > 0 && (
          <g filter="url(#vl-soft)" opacity={0.55 + amd * 0.42}>
            <ellipse cx={cx} cy={cy} rx={4 + amd * 16} ry={4 + amd * 15} fill="#16110d" />
            {blobs.map((b, i) => (
              <circle key={i} cx={cx + Math.cos(b.a) * b.d * (4 + amd * 12)} cy={cy + Math.sin(b.a) * b.d * (3 + amd * 10)} r={(2 + amd * 9) * b.s} fill="#1f1812" />
            ))}
          </g>
        )}
        {edema > 0 && (
          <g filter="url(#vl-softer)" opacity={0.25 + edema * 0.4}>
            <ellipse cx={cx} cy={cy} rx={6 + edema * 14} ry={5 + edema * 12} fill="#8d8466" />
            <ellipse cx={cx - 2} cy={cy + 1} rx={3 + edema * 6} ry={3 + edema * 5} fill="#5c5544" />
          </g>
        )}
      </svg>
    </>
  );
}

function DiabeticSpots({ level }: { level: number }) {
  const all = useMemo(() => {
    const r = mulberry32(2024);
    return Array.from({ length: 40 }, () => ({
      x: 6 + r() * (W - 12),
      y: 6 + r() * (H - 12),
      rx: 2 + r() * 6,
      ry: 2 + r() * 5,
      rot: r() * 180,
      shade: r(),
      hem: r() > 0.55,
    }));
  }, []);
  const dots = useMemo(() => {
    const r = mulberry32(77);
    return Array.from({ length: 60 }, () => ({ x: r() * W, y: r() * H, r: 0.35 + r() * 0.8 }));
  }, []);
  if (level <= 0) return null;
  const n = Math.round(5 + level * 35);
  const nd = Math.round(level * 60);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
      <defs>
        <filter id="vl-dr" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <g filter="url(#vl-dr)">
        {all.slice(0, n).map((s, i) => (
          <ellipse
            key={i}
            cx={s.x}
            cy={s.y}
            rx={s.rx * (0.6 + level * 0.6)}
            ry={s.ry * (0.6 + level * 0.6)}
            transform={`rotate(${s.rot} ${s.x} ${s.y})`}
            fill={s.hem ? '#3b0a0a' : '#120f0d'}
            opacity={0.35 + level * 0.5 * (0.5 + s.shade / 2)}
          />
        ))}
      </g>
      {dots.slice(0, nd).map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#7f1d1d" opacity={0.55 + level * 0.3} />
      ))}
    </svg>
  );
}

/** Il difetto di campo è opposto al settore retinico distaccato (OD) */
const FIELD_SIDE: Record<Quadrant, 'top' | 'bottom' | 'left' | 'right'> = {
  superior: 'bottom',
  inferior: 'top',
  temporal: 'left',
  nasal: 'right',
};

function wavyEdge(len: number, depth: number, seed: number, amp: number) {
  const r = mulberry32(seed);
  const pts: [number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) pts.push([(i / n) * len, depth + (r() - 0.5) * amp + Math.sin((i / n) * Math.PI) * amp * 0.9]);
  return pts;
}

function Detachment({ level, quadrant }: { level: number; quadrant: Quadrant }) {
  const side = FIELD_SIDE[quadrant];
  const flashes = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({ length: 5 }, () => ({ t: r(), delay: r() * 4, dur: 0.35 + r() * 0.4, rep: 2.5 + r() * 4 }));
  }, []);
  if (level <= 0) return null;
  const horizontal = side === 'top' || side === 'bottom';
  const span = horizontal ? H : W;
  const len = horizontal ? W : H;
  const depth = span * (0.12 + level * 0.6);
  const edge = wavyEdge(len, depth, 9, 6 + level * 6);
  // costruzione in coordinate locali (asse u lungo il bordo, v verso l'interno)
  const toXY = (u: number, v: number): [number, number] => {
    switch (side) {
      case 'top':
        return [u, v];
      case 'bottom':
        return [u, H - v];
      case 'left':
        return [v, u];
      case 'right':
        return [W - v, u];
    }
  };
  const poly = [toXY(0, -2), ...edge.map(([u, v]) => toXY(u, v)), toXY(len, -2)];
  const d = `M${poly.map((p) => p.map((n) => n.toFixed(2)).join(' ')).join(' L')} Z`;
  const gradDir = { top: ['0', '0', '0', '1'], bottom: ['0', '1', '0', '0'], left: ['0', '0', '1', '0'], right: ['1', '0', '0', '0'] }[side];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="vl-curtain" x1={gradDir[0]} y1={gradDir[1]} x2={gradDir[2]} y2={gradDir[3]}>
          <stop offset="0" stopColor="#020202" stopOpacity="0.98" />
          <stop offset={0.12 + level * 0.6} stopColor="#0b0b0e" stopOpacity="0.88" />
          <stop offset="1" stopColor="#0b0b0e" stopOpacity="0.88" />
        </linearGradient>
        <filter id="vl-curtain-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="vl-flash" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>
      <path d={d} fill="url(#vl-curtain)" filter="url(#vl-curtain-blur)" />
      {flashes.map((f, i) => {
        const [x, y] = toXY(f.t * len, Math.max(4, depth - 5));
        return (
          <motion.path
            key={i}
            d={`M${x - 4} ${y} q 2 -3 4 0 t 4 0`}
            stroke="#f8fafc"
            strokeWidth="0.8"
            fill="none"
            filter="url(#vl-flash)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.95, 0] }}
            transition={{ duration: f.dur, delay: f.delay, repeat: Infinity, repeatDelay: f.rep * (1.2 - level * 0.6) }}
          />
        );
      })}
    </svg>
  );
}

function Floaters({ level }: { level: number }) {
  const items = useMemo(() => {
    const r = mulberry32(99);
    return Array.from({ length: 14 }, (_, i) => {
      const kind = i % 3;
      const x = 10 + r() * 80;
      const y = 10 + r() * 80;
      const size = 40 + r() * 120;
      let path = '';
      if (kind === 0) {
        path = `M10 50 C 30 ${20 + r() * 20}, 50 ${70 + r() * 20}, 70 45 S 100 ${30 + r() * 30}, 120 ${50 + r() * 20}`;
      } else if (kind === 1) {
        path = `M60 60 m -18 0 a 18 ${12 + r() * 8} ${r() * 60} 1 0 36 0 a 18 ${12 + r() * 8} 0 1 0 -36 0`;
      } else {
        path = `M20 30 q 20 30 50 10 q 25 -15 40 25`;
      }
      return {
        x,
        y,
        size,
        path,
        kind,
        dx: (r() - 0.5) * 60,
        dy: 20 + r() * 50,
        dur: 9 + r() * 10,
        delay: r() * -10,
        rot: r() * 360,
      };
    });
  }, []);
  if (level <= 0) return null;
  const n = Math.round(3 + level * 11);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.slice(0, n).map((f, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.size, height: f.size, rotate: f.rot }}
          animate={{ x: [0, f.dx, f.dx * 0.4, 0], y: [0, f.dy, f.dy * 0.6, 0] }}
          transition={{ duration: f.dur, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 130 100" width="100%" height="100%" style={{ filter: 'blur(1.2px)' }}>
            <path d={f.path} fill="none" stroke="#1a1a1a" strokeOpacity={0.18 + level * 0.32} strokeWidth={f.kind === 1 ? 3 : 2.4} strokeLinecap="round" />
            {f.kind === 2 &&
              [0, 1, 2, 3].map((k) => <circle key={k} cx={30 + k * 18} cy={35 + (k % 2) * 8} r={2.4} fill="#1a1a1a" fillOpacity={0.2 + level * 0.3} />)}
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

function Uveitis({ level }: { level: number }) {
  const cells = useMemo(() => {
    const r = mulberry32(404);
    return Array.from({ length: 120 }, () => ({ x: r() * 100, y: r() * 100, s: 1 + r() * 2.5, d: 10 + r() * 20, o: r() }));
  }, []);
  if (level <= 0) return null;
  return (
    <>
      <div className="absolute inset-0" style={{ background: `rgb(255 255 255 / ${0.06 + level * 0.18})`, mixBlendMode: 'screen' }} />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 70% at 50% 50%, transparent 45%, rgb(220 38 38 / ${0.18 + level * 0.4}) 100%)`,
          mixBlendMode: 'multiply',
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {cells.slice(0, Math.round(level * 120)).map((c, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-zinc-300"
            style={{ left: `${c.x}%`, top: `${c.y}%`, width: c.s, height: c.s, opacity: 0.25 + c.o * 0.4 }}
            animate={{ y: [0, c.d, 0], x: [0, c.d * 0.3, 0] }}
            transition={{ duration: 6 + c.o * 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </>
  );
}

function OpticNeuritis({ level, fix = CENTER }: { level: number; fix?: Fixation }) {
  if (level <= 0) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
      <defs>
        <filter id="vl-on" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {/* scotoma centrocecale: dal punto di fissazione verso la macchia cieca (temporale, OD) */}
      <ellipse cx={fx(fix) + 9} cy={fy(fix) + 1} rx={10 + level * 16} ry={6 + level * 9} fill="#2a2a2e" opacity={0.3 + level * 0.5} filter="url(#vl-on)" />
    </svg>
  );
}

function Glare({ model, source }: { model: RenderModel; source: VisualSource }) {
  const { s } = model;
  const intensity = Math.max(s.cataract, s.keratoconus * 0.9, s.uveitis * 0.6);
  if (intensity <= 0) return null;
  const lights = source.kind === 'scene' ? SCENE_LIGHTS[source.scene] : [{ x: 50, y: 18, r: 1.6 }];
  return (
    <>
      {/* velatura diffusa del cristallino opacato */}
      {s.cataract > 0 && (
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 50% 45%, rgb(254 243 199 / ${0.1 + s.cataract * 0.32}), rgb(253 230 138 / ${0.05 + s.cataract * 0.2}))`, mixBlendMode: 'screen' }}
        />
      )}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" style={{ mixBlendMode: 'screen' }}>
        <defs>
          <radialGradient id="vl-halo">
            <stop offset="0" stopColor="#fffbeb" stopOpacity="0.95" />
            <stop offset="0.25" stopColor="#fde68a" stopOpacity="0.55" />
            <stop offset="0.6" stopColor="#fbbf24" stopOpacity="0.15" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
        </defs>
        {lights.map((l, i) => {
          const rad = l.r * (3 + intensity * 14);
          return (
            <g key={i}>
              <ellipse cx={l.x} cy={l.y} rx={rad * 0.62} ry={rad} fill="url(#vl-halo)" opacity={0.4 + intensity * 0.6} />
              {s.keratoconus > 0.15 &&
                Array.from({ length: 10 }).map((_, k) => {
                  const a = (k / 10) * Math.PI * 2;
                  const len = rad * (1 + s.keratoconus * 1.5);
                  return (
                    <line
                      key={k}
                      x1={l.x}
                      y1={l.y}
                      x2={l.x + Math.cos(a) * len * 0.62}
                      y2={l.y + Math.sin(a) * len + s.keratoconus * 3}
                      stroke="#fff7d6"
                      strokeWidth={0.18}
                      opacity={0.35 * s.keratoconus}
                    />
                  );
                })}
            </g>
          );
        })}
      </svg>
    </>
  );
}

/* ------------------------------------------------------------ Viewport */

interface Props {
  state: SimulatorState;
  source: VisualSource;
  stream: MediaStream | null;
  compare: boolean;
  /** Se definito, i deficit retinici seguono il puntatore (visione contingente allo sguardo) */
  gazeMode?: boolean;
}

export function Viewport({ state, source, stream, compare, gazeMode = false }: Props) {
  const [fix, setFix] = useState<Fixation>(CENTER);
  useEffect(() => {
    if (!gazeMode) setFix(CENTER);
  }, [gazeMode]);
  const model = useMemo(() => computeRender(state, source), [state, source]);
  const [split, setSplit] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMove = (e: RPointerEvent) => {
    if (gazeMode && boxRef.current && !dragging.current) {
      const rect = boxRef.current.getBoundingClientRect();
      setFix({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
    }
    if (!dragging.current || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    setSplit(Math.min(98, Math.max(2, ((e.clientX - rect.left) / rect.width) * 100)));
  };

  const { s } = model;
  const layerStyle: CSSProperties = { filter: model.filter, transform: 'scale(1.04)' };

  return (
    <div
      ref={boxRef}
      className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-2xl bg-black ring-1 ring-white/10"
      onPointerMove={onMove}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => {
        dragging.current = false;
        if (gazeMode) setFix(CENTER);
      }}
    >
      <FilterDefs model={model} />

      {compare && (
        <div className="absolute inset-0">
          <SourceLayer source={source} stream={stream} />
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden" style={compare ? { clipPath: `inset(0 0 0 ${split}%)` } : undefined}>
        <div className="absolute inset-0" style={layerStyle}>
          <SourceLayer source={source} stream={stream} />
        </div>

        {model.ghosts.map((g, i) => (
          <div
            key={i}
            className="pointer-events-none absolute inset-0"
            style={{ ...layerStyle, opacity: g.opacity, transform: `translate(${g.dx}%, ${g.dy}%) scale(1.04)` }}
          >
            <SourceLayer source={source} stream={stream} />
          </div>
        ))}

        {model.distortion && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              filter: `${model.filter} url(#vl-metamorph)`,
              transform: 'scale(1.04)',
              maskImage: `radial-gradient(ellipse ${model.distortion.radius}% ${model.distortion.radius * 1.6}% at ${fix.x}% ${fix.y}%, black 35%, transparent 100%)`,
              WebkitMaskImage: `radial-gradient(ellipse ${model.distortion.radius}% ${model.distortion.radius * 1.6}% at ${fix.x}% ${fix.y}%, black 35%, transparent 100%)`,
            }}
          >
            <SourceLayer source={source} stream={stream} />
          </div>
        )}

        <Glare model={model} source={source} />
        <PeripheralDesensitization level={Math.max(s.glaucoma, s.retinitisPigmentosa * 0.8)} fix={fix} />
        <FieldLoss level={s.glaucoma} kind="glaucoma" fix={fix} />
        <FieldLoss level={s.retinitisPigmentosa} kind="rp" fix={fix} />
        <CentralScotoma amd={s.amd} edema={s.macularEdema} fix={fix} />
        <DiabeticSpots level={s.diabeticRetinopathy} />
        <OpticNeuritis level={s.opticNeuritis} fix={fix} />
        <Uveitis level={s.uveitis} />
        <Detachment level={s.retinalDetachment} quadrant={state.params.detachmentQuadrant} />
        <Floaters level={s.floaters} />
        {gazeMode && <div className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 shadow-[0_0_0_3px_rgb(255_255_255/0.6)]" style={{ left: `${fix.x}%`, top: `${fix.y}%` }} />}
      </div>

      {compare && (
        <>
          <div className="absolute inset-y-0 z-10 w-0.5 bg-cyan-300/90 shadow-[0_0_12px_rgb(6_182_212)]" style={{ left: `${split}%` }} />
          <button
            type="button"
            aria-label="Trascina per confrontare"
            className="absolute top-1/2 z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-cyan-300 bg-ink-900/90 text-cyan-200 shadow-lg"
            style={{ left: `${split}%` }}
            onPointerDown={(e) => {
              dragging.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={onMove}
            onPointerUp={() => (dragging.current = false)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setSplit((v) => Math.max(2, v - 2));
              if (e.key === 'ArrowRight') setSplit((v) => Math.min(98, v + 2));
            }}
          >
            ⇆
          </button>
          <span className="absolute left-3 top-3 z-10 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-200">Visione normale</span>
          <span className="absolute right-3 top-3 z-10 rounded-md bg-cyan-500/80 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-white">Simulazione paziente</span>
        </>
      )}
    </div>
  );
}
