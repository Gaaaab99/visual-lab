import { memo } from 'react';

const svgProps = {
  width: '100%',
  height: '100%',
  preserveAspectRatio: 'xMidYMid slice',
  xmlns: 'http://www.w3.org/2000/svg',
  style: { display: 'block' },
} as const;

interface FaceSpec {
  x: number;
  skin: string;
  hair: string;
  shirt: string;
  hairStyle: 'short' | 'long' | 'bald' | 'curly';
  glasses?: boolean;
  beard?: boolean;
  name: string;
}

const FACES: FaceSpec[] = [
  { x: 170, skin: '#f1c7a5', hair: '#3b2416', shirt: '#2563eb', hairStyle: 'long', name: 'Anna' },
  { x: 400, skin: '#c98e62', hair: '#111827', shirt: '#dc2626', hairStyle: 'short', beard: true, name: 'Marco' },
  { x: 630, skin: '#ead2bd', hair: '#cbd5e1', shirt: '#16a34a', hairStyle: 'bald', glasses: true, name: 'Nonno Piero' },
];

function Face({ f }: { f: FaceSpec }) {
  const { x } = f;
  return (
    <g>
      {/* busto */}
      <path d={`M${x - 95} 500 Q ${x - 90} 360 ${x} 350 Q ${x + 90} 360 ${x + 95} 500 Z`} fill={f.shirt} />
      <rect x={x - 22} y={300} width={44} height={60} fill={f.skin} />
      {/* capelli lunghi dietro */}
      {f.hairStyle === 'long' && <path d={`M${x - 78} 200 Q ${x - 90} 330 ${x - 60} 360 L ${x + 60} 360 Q ${x + 90} 330 ${x + 78} 200 Z`} fill={f.hair} />}
      {/* testa */}
      <ellipse cx={x} cy={225} rx={70} ry={88} fill={f.skin} />
      <ellipse cx={x - 70} cy={232} rx={10} ry={18} fill={f.skin} />
      <ellipse cx={x + 70} cy={232} rx={10} ry={18} fill={f.skin} />
      {f.hairStyle === 'short' && <path d={`M${x - 72} 205 Q ${x - 70} 130 ${x} 132 Q ${x + 72} 130 ${x + 72} 205 Q ${x + 50} 165 ${x} 168 Q ${x - 48} 165 ${x - 72} 205 Z`} fill={f.hair} />}
      {f.hairStyle === 'long' && <path d={`M${x - 74} 215 Q ${x - 78} 128 ${x} 130 Q ${x + 78} 128 ${x + 74} 215 Q ${x + 40} 160 ${x - 10} 165 Q ${x - 50} 170 ${x - 74} 215 Z`} fill={f.hair} />}
      {f.hairStyle === 'bald' && <path d={`M${x - 72} 215 Q ${x - 74} 175 ${x - 58} 165 L ${x - 54} 205 Z M${x + 72} 215 Q ${x + 74} 175 ${x + 58} 165 L ${x + 54} 205 Z`} fill={f.hair} />}
      {/* sopracciglia */}
      <path d={`M${x - 42} 192 q 14 -8 28 0`} stroke={f.hairStyle === 'bald' ? '#94a3b8' : f.hair} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d={`M${x + 14} 192 q 14 -8 28 0`} stroke={f.hairStyle === 'bald' ? '#94a3b8' : f.hair} strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* occhi */}
      {[-28, 28].map((dx) => (
        <g key={dx}>
          <ellipse cx={x + dx} cy={215} rx={11} ry={7} fill="#fff" />
          <circle cx={x + dx} cy={215} r={5} fill="#4b3621" />
          <circle cx={x + dx + 1.5} cy={213.5} r={1.5} fill="#fff" />
        </g>
      ))}
      {f.glasses && (
        <g stroke="#1f2937" strokeWidth="3" fill="none">
          <rect x={x - 46} y={201} width={36} height={28} rx={8} />
          <rect x={x + 10} y={201} width={36} height={28} rx={8} />
          <path d={`M${x - 10} 212 h 20`} />
        </g>
      )}
      {/* naso e bocca */}
      <path d={`M${x} 222 q -8 26 -2 30 q 6 3 12 -1`} stroke="#00000033" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={`M${x - 24} 272 q 24 18 48 0`} stroke="#9f1239" strokeWidth="4" fill="none" strokeLinecap="round" />
      {f.beard && <path d={`M${x - 62} 250 Q ${x - 55} 318 ${x} 316 Q ${x + 55} 318 ${x + 62} 250 Q ${x + 40} 300 ${x} 296 Q ${x - 40} 300 ${x - 62} 250 Z`} fill={f.hair} opacity="0.9" />}
      <text x={x} y={485} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="600" fill="#fff">
        {f.name}
      </text>
    </g>
  );
}

export const FacesScene = memo(function FacesScene() {
  return (
    <svg viewBox="0 0 800 500" {...svgProps}>
      <defs>
        <linearGradient id="sc-room" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7dccb" />
          <stop offset="1" stopColor="#cbb89c" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#sc-room)" />
      <rect x="40" y="40" width="150" height="110" rx="4" fill="#9ca3af" stroke="#6b7280" strokeWidth="6" />
      <path d="M50 140 L 95 85 L 125 115 L 150 95 L 180 140 Z" fill="#4d7c0f" />
      <circle cx="160" cy="70" r="12" fill="#fde047" />
      <rect x="600" y="30" width="140" height="160" rx="4" fill="#bfdbfe" stroke="#f8fafc" strokeWidth="8" />
      <path d="M670 30 V190 M600 110 H740" stroke="#f8fafc" strokeWidth="6" />
      {FACES.map((f) => (
        <Face key={f.name} f={f} />
      ))}
    </svg>
  );
});

export const StairsScene = memo(function StairsScene() {
  const steps = 9;
  return (
    <svg viewBox="0 0 800 500" {...svgProps}>
      <defs>
        <linearGradient id="sc-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d6d3d1" />
          <stop offset="1" stopColor="#a8a29e" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#sc-wall)" />
      <rect x="0" y="0" width="160" height="500" fill="#78716c" />
      <rect x="640" y="0" width="160" height="500" fill="#a8a29e" />
      {Array.from({ length: steps }).map((_, i) => {
        const t = i / steps;
        const y = 500 - (i + 1) * 40;
        const inset = 40 + t * 150;
        return (
          <g key={i}>
            <rect x={160 + inset * 0.4 - 40} y={y} width={480 - inset * 0.8 + 80} height={40} fill={i % 2 ? '#9a8f84' : '#a39689'} />
            <rect x={160 + inset * 0.4 - 40} y={y} width={480 - inset * 0.8 + 80} height={6} fill="#d6cfc7" />
          </g>
        );
      })}
      {/* corrimano */}
      <path d="M180 470 L 330 120" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
      <path d="M620 470 L 470 120" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
      {/* ostacoli: vaso e borsa */}
      <g transform="translate(560 410)">
        <path d="M-22 0 L 22 0 L 16 50 L -16 50 Z" fill="#b45309" />
        <circle cx="0" cy="-20" r="28" fill="#15803d" />
      </g>
      <g transform="translate(250 380)">
        <rect x="-26" y="0" width="52" height="38" rx="6" fill="#1d4ed8" />
        <path d="M-14 0 q 14 -22 28 0" stroke="#1e3a8a" strokeWidth="5" fill="none" />
      </g>
      <rect x="350" y="40" width="100" height="60" rx="4" fill="#16a34a" />
      <text x="400" y="78" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" fill="#fff">
        USCITA
      </text>
    </svg>
  );
});
