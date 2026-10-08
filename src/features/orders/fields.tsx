import { useMemo, useState, type ReactNode } from 'react';
import { Search, UserRound, X } from 'lucide-react';
import type { Customer } from '../../store/types';
import { fullName, initials } from '../../store/utils';
import { num } from './helpers';

/** Campo numerico che consente di digitare valori intermedi ("-", "1,") senza perdere l’input */
export function NumInput({
  value,
  onChange,
  step = 0.25,
  min,
  max,
  className = '',
  ariaLabel,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(value ? String(value).replace('.', ',') : '');
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    if (num(text) !== value) setText(value ? String(value).replace('.', ',') : '');
  }
  return (
    <input
      inputMode="decimal"
      className={`input px-2 tabular-nums ${className}`}
      aria-label={ariaLabel}
      placeholder={placeholder ?? '0'}
      value={text}
      data-step={step}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d,.+-]/g, '');
        setText(t);
        let n = num(t);
        if (min !== undefined) n = Math.max(min, n);
        if (max !== undefined) n = Math.min(max, n);
        onChange(n);
      }}
    />
  );
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-ink-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Selezione cliente con ricerca per nome, codice, telefono o codice fiscale */
export function CustomerPicker({ customers, value, onChange }: { customers: Customer[]; value: string; onChange: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const selected = customers.find((c) => c.id === value);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return customers
      .filter((c) => !t || `${c.firstName} ${c.lastName} ${c.lastName} ${c.firstName} ${c.code} ${c.phone} ${c.fiscalCode}`.toLowerCase().includes(t))
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'it'))
      .slice(0, 30);
  }, [customers, q]);

  if (selected && !open)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-200">{initials(selected)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{fullName(selected)}</p>
          <p className="truncate text-xs text-slate-400">
            {selected.code} · {selected.phone || 'nessun telefono'} · {selected.prescriptions.length} prescrizioni
          </p>
        </div>
        <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setOpen(true)}>
          Cambia
        </button>
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input autoFocus className="input pl-9" placeholder="Cerca per cognome, nome, codice, telefono…" value={q} onChange={(e) => setQ(e.target.value)} />
        {selected && (
          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-white" onClick={() => setOpen(false)} aria-label="Annulla">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-white/[0.06] bg-ink-900/60">
        {list.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-500">Nessun cliente trovato.</p>
        ) : (
          list.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => {
                onChange(c.id);
                setOpen(false);
                setQ('');
              }}
              className={`flex w-full items-center gap-3 border-b border-white/[0.04] px-3 py-2 text-left text-sm transition-colors last:border-0 hover:bg-cyan-400/[0.06] ${c.id === value ? 'bg-cyan-400/[0.08]' : ''}`}
            >
              <UserRound size={15} className="shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1 truncate text-slate-100">{fullName(c)}</span>
              <span className="shrink-0 text-xs text-slate-500">{c.code}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
