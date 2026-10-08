import { Image as ImageIcon, Keyboard, Layers, Play, Timer } from 'lucide-react';
import { QUESTIONS, QUIZ_CATEGORIES, QUIZ_DIFFICULTIES } from '../../data/quiz';
import type { QuizResult } from '../../types';
import { HistoryPanel } from './HistoryPanel';
import { CATEGORY_META } from './meta';
import { filterPool, SECONDS_PER_QUESTION, type CategoryFilter, type DifficultyFilter, type QuestionCount, type QuizSettings } from './session';

interface Props {
  settings: QuizSettings;
  onChange: (next: QuizSettings) => void;
  onStart: () => void;
  history: QuizResult[];
}

const COUNTS: { value: QuestionCount; label: string }[] = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 'all', label: 'Tutte' },
];

function Segment<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-2 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm ${
            value === o.value ? 'bg-cyan-500/15 text-white ring-1 ring-cyan-400/40' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={value === o.value}
        >
          {o.label}
          {o.hint && <span className="ml-1 text-[11px] text-slate-500">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export function SetupScreen({ settings, onChange, onStart, history }: Props) {
  const pool = filterPool(settings.category, settings.difficulty);
  const total = settings.count === 'all' ? pool.length : Math.min(settings.count, pool.length);
  const images = pool.filter((q) => q.caseId).length;
  const set = <K extends keyof QuizSettings>(k: K, v: QuizSettings[K]) => onChange({ ...settings, [k]: v });

  const categories: CategoryFilter[] = ['Tutte', ...QUIZ_CATEGORIES];
  const difficulties: DifficultyFilter[] = ['Tutte', ...QUIZ_DIFFICULTIES];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="panel space-y-6 p-5 sm:p-6">
        <section>
          <span className="label">Categoria</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {categories.map((c) => {
              const n = filterPool(c, settings.difficulty).length;
              const Icon = c === 'Tutte' ? Layers : CATEGORY_META[c].icon;
              const active = settings.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={n === 0}
                  onClick={() => set('category', c)}
                  aria-pressed={active}
                  className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? 'border-cyan-400/50 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10'
                      : 'border-white/[0.07] bg-white/[0.02] text-slate-300 hover:border-white/20'
                  }`}
                >
                  <Icon size={16} className={`shrink-0 ${c === 'Tutte' ? 'text-cyan-300' : CATEGORY_META[c].tone}`} />
                  <span className="min-w-0 flex-1 truncate">{c === 'Tutte' ? 'Tutte' : c}</span>
                  <span className="text-xs text-slate-500 tabular-nums">{n}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <span className="label">Difficoltà</span>
            <Segment
              options={difficulties.map((d) => ({ value: d, label: d, disabled: filterPool(settings.category, d).length === 0 }))}
              value={settings.difficulty}
              onChange={(v) => set('difficulty', v)}
            />
          </section>
          <section>
            <span className="label">Numero di domande</span>
            <Segment
              options={COUNTS.map((c) => ({ ...c, hint: c.value === 'all' ? `(${pool.length})` : undefined }))}
              value={settings.count}
              onChange={(v) => set('count', v)}
            />
          </section>
        </div>

        <section>
          <button
            type="button"
            role="switch"
            aria-checked={settings.timed}
            onClick={() => set('timed', !settings.timed)}
            className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition ${
              settings.timed ? 'border-cyan-400/40 bg-cyan-500/[0.07]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <Timer size={20} className={settings.timed ? 'text-cyan-300' : 'text-slate-500'} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-white">Modalità a tempo</span>
              <span className="block text-xs text-slate-400">{SECONDS_PER_QUESTION} secondi per domanda: allo scadere la risposta conta come errata.</span>
            </span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings.timed ? 'bg-cyan-500' : 'bg-ink-600'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${settings.timed ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        </section>

        <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>
              <strong className="text-slate-200">{total}</strong> domande selezionate
            </span>
            {images > 0 && (
              <span className="inline-flex items-center gap-1">
                <ImageIcon size={13} /> {images} con immagini cliniche
              </span>
            )}
            <span className="hidden items-center gap-1 sm:inline-flex">
              <Keyboard size={13} /> Tasti 1-4 e Invio
            </span>
          </div>
          <button type="button" className="btn-primary w-full px-6 py-2.5 sm:w-auto" disabled={total === 0} onClick={onStart}>
            <Play size={16} /> Inizia il quiz
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <HistoryPanel history={history} />
        <div className="panel p-5 text-xs leading-relaxed text-slate-400">
          <p>
            Banca dati di <strong className="text-slate-200">{QUESTIONS.length}</strong> domande su retina, nervo ottico, cornea, mezzi diottrici, refrazione,
            uvea, farmacologia e semeiotica. Ogni risposta corretta vale <strong className="text-cyan-300">10 XP</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
