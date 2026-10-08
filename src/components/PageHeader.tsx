import type { ReactNode } from 'react';

interface Props {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}

/** Intestazione standard di pagina: usare in cima a ogni vista */
export function PageHeader({ eyebrow, title, description, icon, actions }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        {icon && (
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-blue-600/15 text-cyan-300 shadow-lg shadow-cyan-500/10 sm:flex">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
