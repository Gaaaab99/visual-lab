import { useEffect, useState, type ReactNode } from 'react';
import type { Customer } from '../../store/types';
import { initials } from '../../store/utils';
import { avatarTone } from './helpers';

export function Avatar({ c, size = 'md' }: { c: Pick<Customer, 'id' | 'firstName' | 'lastName'>; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-sm';
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br font-semibold ${avatarTone(c.id)} ${s}`}>
      {initials(c)}
    </div>
  );
}

export function Field({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px]">{hint}</span>}
    </label>
  );
}

interface NumProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Mostra sempre il segno (+/−) a riposo: per diottrie */
  signed?: boolean;
  decimals?: number;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  /** Arrotonda al passo al blur */
  snap?: boolean;
}

const fmtNum = (v: number | undefined, signed: boolean, decimals: number) => {
  if (v === undefined || Number.isNaN(v)) return '';
  const s = v.toFixed(decimals);
  return signed && v > 0 ? `+${s}` : s;
};

/** Campo numerico tollerante alla digitazione (accetta virgola, segno, vuoto) */
export function NumField({ value, onChange, step = 1, min, max, signed = false, decimals = 0, placeholder, className = '', ariaLabel, snap = false }: NumProps) {
  const [text, setText] = useState(fmtNum(value, signed, decimals));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(fmtNum(value, signed, decimals));
  }, [value, focused, signed, decimals]);

  const parse = (t: string): number | undefined => {
    const n = Number(t.replace(',', '.').replace('−', '-'));
    return t.trim() === '' || Number.isNaN(n) ? undefined : n;
  };
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const bump = (dir: 1 | -1) => {
    const base = value ?? 0;
    const n = clamp(Math.round((base + dir * step) / step) * step);
    onChange(Number(n.toFixed(4)));
  };

  return (
    <input
      inputMode="decimal"
      aria-label={ariaLabel}
      className={`input px-2 text-center font-mono tabular-nums ${className}`}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onChange={(e) => {
        setText(e.target.value);
        const n = parse(e.target.value);
        if (n !== undefined || e.target.value.trim() === '') onChange(n);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          bump(e.key === 'ArrowUp' ? 1 : -1);
          setFocused(false);
        }
      }}
      onBlur={() => {
        setFocused(false);
        const n = parse(text);
        if (n === undefined) return;
        const v = clamp(snap ? Math.round(n / step) * step : n);
        onChange(Number(v.toFixed(4)));
      }}
    />
  );
}

export function Toggle({ checked, onChange, label, description, required }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; required?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${checked ? 'border-cyan-400/30 bg-cyan-400/[0.06]' : 'border-white/[0.06] bg-ink-900/40 hover:border-white/15'}`}
    >
      <span className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-cyan-500' : 'bg-ink-600'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-100">
          {label}
          {required && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">obbligatorio per dati visivi</span>}
        </span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{description}</span>}
      </span>
    </button>
  );
}

export function SectionTitle({ icon, children, actions }: { icon?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {icon && <span className="text-cyan-300/80">{icon}</span>}
        {children}
      </h3>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ icon, children, action }: { icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
      <div className="text-slate-600">{icon}</div>
      <p className="max-w-sm text-sm text-slate-400">{children}</p>
      {action}
    </div>
  );
}

export function ChipToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip cursor-pointer py-1 transition-colors ${active ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200'}`}
    >
      {children}
    </button>
  );
}
