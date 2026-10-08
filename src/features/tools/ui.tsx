import type { ReactNode } from 'react';

/** Scheda contenitore di uno strumento */
export function ToolCard({ icon, title, subtitle, children, actions }: { icon: ReactNode; title: string; subtitle?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-blue-600/15 text-cyan-300">{icon}</div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
  id: string;
}

export function NumberField({ label, value, onChange, step = 0.25, min, max, suffix, hint, id }: NumberFieldProps) {
  const invalid = value.trim() !== '' && parseNum(value) === null;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          type="number"
          className={`input font-mono ${suffix ? 'pr-12' : ''} ${invalid ? 'border-rose-400/60' : ''}`}
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export type Tone = 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';

export const TONE_CLASSES: Record<Tone, string> = {
  cyan: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  rose: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  slate: 'border-white/10 bg-white/[0.03] text-slate-300',
  sky: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
};

export function Stat({ label, value, sub, tone = 'slate' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className={`min-w-0 rounded-xl border px-3.5 py-3 ${TONE_CLASSES[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{label}</p>
      <p className="mt-1 truncate font-mono text-lg font-semibold text-white sm:text-xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs opacity-80">{sub}</p>}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-4 rounded-xl border border-white/[0.06] bg-ink-900/50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-400">{children}</p>;
}

/** Converte una stringa in numero finito, oppure null */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '' || t === '-' || t === '+') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Arrotonda al quarto di diottria più vicino */
export function roundQuarter(x: number): number {
  return Math.round(x * 4) / 4;
}

/** Formatta un potere diottrico con segno: +1.25 */
export function fmtD(x: number, digits = 2): string {
  const v = Math.abs(x) < 1e-9 ? 0 : x;
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`;
}

/** Normalizza un asse in 1..180 */
export function normAxis(a: number): number {
  let r = Math.round(a) % 180;
  if (r <= 0) r += 180;
  return r;
}
