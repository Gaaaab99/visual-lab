import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { gradeTone } from './session';

interface CountdownProps {
  /** Millisecondi residui */
  remaining: number;
  /** Millisecondi totali */
  total: number;
  paused?: boolean;
}

/** Anello di countdown per la modalità a tempo */
export function CountdownRing({ remaining, total, paused = false }: CountdownProps) {
  const size = 52;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, remaining / total));
  const secs = Math.ceil(remaining / 1000);
  const color = secs <= 5 ? '#fb7185' : secs <= 10 ? '#fbbf24' : '#22d3ee';
  const urgent = !paused && secs <= 5 && secs > 0;

  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={urgent ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      role="timer"
      aria-label={`${secs} secondi rimanenti`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: paused ? 'stroke 0.3s' : 'stroke-dashoffset 0.12s linear, stroke 0.3s' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-semibold tabular-nums" style={{ color }}>
        {Math.max(0, secs)}
      </span>
    </motion.div>
  );
}

interface ScoreRingProps {
  pct: number;
  size?: number;
  children?: ReactNode;
}

/** Anello del punteggio finale, animato al montaggio */
export function ScoreRing({ pct, size = 168, children }: ScoreRingProps) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = gradeTone(pct);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 10px ${tone.stroke}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
