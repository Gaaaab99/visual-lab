import { motion } from 'motion/react';
import { BookOpen, Check, Clock, PartyPopper, RotateCcw, Settings2, Sparkles, X } from 'lucide-react';
import { CASE_BY_ID } from '../../data/cases';
import { PATHOLOGY_BY_ID } from '../../data/pathologies';
import type { QuizCategory } from '../../data/quiz';
import type { QuizResult } from '../../types';
import { SmartImage } from '../../components/SmartImage';
import { HistoryPanel } from './HistoryPanel';
import { CATEGORY_META } from './meta';
import { ScoreRing } from './rings';
import { gradeTone, percent, type Answer, type QuizSession } from './session';

interface Props {
  session: QuizSession;
  answers: (Answer | undefined)[];
  result: QuizResult;
  history: QuizResult[];
  onRetry: () => void;
  onNewQuiz: () => void;
  onOpenPathology: (pathologyId: string) => void;
}

export function ResultsScreen({ session, answers, result, history, onRetry, onNewQuiz, onOpenPathology }: Props) {
  const pct = percent(result.score, result.total);
  const tone = gradeTone(pct);
  const timeouts = answers.filter((a) => a === null).length;

  const breakdown = new Map<QuizCategory, { correct: number; total: number }>();
  session.items.forEach((it, i) => {
    const row = breakdown.get(it.question.category) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (answers[i] === it.correctIndex) row.correct += 1;
    breakdown.set(it.question.category, row);
  });
  const categories = [...breakdown.entries()].sort((a, b) => percent(a[1].correct, a[1].total) - percent(b[1].correct, b[1].total));

  const wrong = session.items.map((it, i) => ({ it, answer: answers[i] })).filter(({ it, answer }) => answer !== it.correctIndex);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel p-5 sm:p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <ScoreRing pct={pct}>
              <span className={`text-4xl font-semibold tabular-nums ${tone.text}`}>{pct}%</span>
              <span className="text-xs text-slate-400">
                {result.score} / {result.total}
              </span>
            </ScoreRing>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${tone.text}`}>{tone.label}</p>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                {result.score} risposte corrette su {result.total}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {result.category}
                {session.settings.difficulty !== 'Tutte' && ` · ${session.settings.difficulty}`}
                {session.settings.timed && ` · a tempo${timeouts ? ` (${timeouts} scadut${timeouts === 1 ? 'a' : 'e'})` : ''}`}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-200">
                <Sparkles size={14} /> +{result.score * 10} XP
              </div>
              <div className="mt-5 flex flex-col gap-2 min-[420px]:flex-row sm:justify-start">
                <button type="button" className="btn-primary" onClick={onRetry}>
                  <RotateCcw size={15} /> Riprova
                </button>
                <button type="button" className="btn-ghost" onClick={onNewQuiz}>
                  <Settings2 size={15} /> Nuovo quiz
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="panel p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-white">Risultato per categoria</h3>
          <ul className="mt-4 space-y-3">
            {categories.map(([cat, row], i) => {
              const p = percent(row.correct, row.total);
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <li key={cat}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-slate-200">
                      <Icon size={15} className={`shrink-0 ${meta.tone}`} />
                      <span className="truncate">{cat}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-400 tabular-nums">
                      {row.correct}/{row.total} · {p}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${meta.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${p}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.06, ease: 'easeOut' }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="panel p-5 sm:p-6">
          <h3 className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
            Revisione degli errori
            <span className="text-xs font-normal text-slate-500">{wrong.length}</span>
          </h3>
          {wrong.length === 0 ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-4 text-sm text-emerald-200">
              <PartyPopper size={20} className="shrink-0" /> Percorso netto: nessun errore da rivedere!
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {wrong.map(({ it, answer }) => {
                const pathology = it.question.pathologyId ? PATHOLOGY_BY_ID[it.question.pathologyId] : undefined;
                const img = it.question.caseId ? CASE_BY_ID[it.question.caseId] : undefined;
                return (
                  <li key={it.question.id} className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-4">
                    <div className="flex gap-3">
                      {img && (
                        <SmartImage
                          src={img.image.src}
                          alt={img.modality}
                          wrapperClassName="hidden h-16 w-16 shrink-0 rounded-lg bg-black min-[420px]:block"
                          className="h-full w-full object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-white">{it.question.prompt}</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="flex gap-2 text-rose-300">
                            {answer === null || answer === undefined ? <Clock size={15} className="mt-0.5 shrink-0" /> : <X size={15} className="mt-0.5 shrink-0" />}
                            <span>{answer === null || answer === undefined ? 'Tempo scaduto' : it.options[answer]}</span>
                          </p>
                          <p className="flex gap-2 text-emerald-300">
                            <Check size={15} className="mt-0.5 shrink-0" />
                            <span>{it.options[it.correctIndex]}</span>
                          </p>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">{it.question.explanation}</p>
                        {pathology && (
                          <button
                            type="button"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 transition hover:text-cyan-200"
                            onClick={() => onOpenPathology(pathology.id)}
                          >
                            <BookOpen size={13} /> Approfondisci: {pathology.name}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </div>

      <div className="space-y-6">
        <HistoryPanel history={history} limit={8} />
      </div>
    </div>
  );
}
