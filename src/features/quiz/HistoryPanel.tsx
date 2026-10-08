import { History, Trophy } from 'lucide-react';
import type { QuizResult } from '../../types';
import { gradeTone, percent } from './session';

const fmt = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : fmt.format(d);
}

/** Storico degli ultimi quiz con miglior punteggio */
export function HistoryPanel({ history, limit = 6 }: { history: QuizResult[]; limit?: number }) {
  const best = history.reduce<QuizResult | null>((acc, r) => (!acc || percent(r.score, r.total) > percent(acc.score, acc.total) ? r : acc), null);
  const recent = history.slice(-limit).reverse();
  const avg = history.length ? Math.round(history.reduce((s, r) => s + percent(r.score, r.total), 0) / history.length) : 0;

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <History size={16} className="text-cyan-300" /> Storico quiz
        </h3>
        <span className="text-xs text-slate-500">{history.length} completati</span>
      </div>

      {history.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
          Nessun quiz completato finora. Il primo risultato apparirà qui.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-200/80">
                <Trophy size={13} /> Miglior risultato
              </p>
              {best && (
                <>
                  <p className="mt-1 text-xl font-semibold text-white tabular-nums">{percent(best.score, best.total)}%</p>
                  <p className="truncate text-xs text-slate-400">
                    {best.score}/{best.total} · {best.category}
                  </p>
                </>
              )}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Media</p>
              <p className="mt-1 text-xl font-semibold text-white tabular-nums">{avg}%</p>
              <p className="text-xs text-slate-400">su tutti i quiz</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {recent.map((r, i) => {
              const pct = percent(r.score, r.total);
              const tone = gradeTone(pct);
              return (
                <li key={`${r.date}-${i}`} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-ink-900/50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">{r.category}</p>
                    <p className="text-xs text-slate-500">{formatDate(r.date)}</p>
                  </div>
                  <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06] min-[400px]:block">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone.stroke }} />
                  </div>
                  <span className={`w-14 text-right font-mono text-sm tabular-nums ${tone.text}`}>
                    {r.score}/{r.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
