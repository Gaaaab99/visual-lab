import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BrainCircuit, LogOut, Timer } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useApp } from '../../context/AppContext';
import type { QuizResult } from '../../types';
import { QuestionCard } from './QuestionCard';
import { ResultsScreen } from './ResultsScreen';
import { SetupScreen } from './SetupScreen';
import { buildSession, newSeed, type Answer, type QuizSession, type QuizSettings } from './session';

type Phase = 'setup' | 'play' | 'results';

const DEFAULT_SETTINGS: QuizSettings = { category: 'Tutte', difficulty: 'Tutte', count: 10, timed: false };
const HISTORY_LIMIT = 50;

export function QuizView({ onOpenPathology }: { onOpenPathology: (pathologyId: string) => void }) {
  const { profile, awardXp, notify } = useApp();
  const [phase, setPhase] = useState<Phase>('setup');
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(Answer | undefined)[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [localHistory, setLocalHistory] = useState<QuizResult[]>([]);

  const profileHistory = useMemo(() => profile?.quizHistory ?? [], [profile?.quizHistory]);
  // Lo storico del profilo si aggiorna in modo asincrono: fino ad allora mostriamo la copia locale
  const history = profileHistory.length >= localHistory.length ? profileHistory : localHistory;

  const start = useCallback((s: QuizSettings) => {
    const next = buildSession(s, newSeed());
    if (next.items.length === 0) return;
    setSession(next);
    setIndex(0);
    setAnswers([]);
    setResult(null);
    setPhase('play');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const answer = useCallback(
    (value: Answer) => {
      setAnswers((prev) => {
        if (prev[index] !== undefined) return prev;
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    [index],
  );

  const finish = useCallback(() => {
    if (!session) return;
    const score = session.items.reduce((s, it, i) => s + (answers[i] === it.correctIndex ? 1 : 0), 0);
    const { category } = session.settings;
    const res: QuizResult = {
      date: new Date().toISOString(),
      category: category === 'Tutte' ? 'Tutte le categorie' : category,
      score,
      total: session.items.length,
    };
    const nextHistory = [...history, res].slice(-HISTORY_LIMIT);
    setResult(res);
    setLocalHistory(nextHistory);
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    awardXp(score * 10, 'Quiz completato', { quizHistory: nextHistory }).catch(() => notify('Impossibile salvare il risultato del quiz.', 'error'));
  }, [session, answers, history, awardXp, notify]);

  const next = useCallback(() => {
    if (!session || answers[index] === undefined) return;
    if (index >= session.items.length - 1) finish();
    else setIndex(index + 1);
  }, [session, answers, index, finish]);

  const total = session?.items.length ?? 0;
  const answeredCount = answers.filter((a) => a !== undefined).length;
  const correctSoFar = session ? session.items.reduce((s, it, i) => s + (answers[i] === it.correctIndex ? 1 : 0), 0) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Autovalutazione"
        title="Quiz clinico"
        icon={<BrainCircuit size={22} />}
        description="Metti alla prova le tue conoscenze di oftalmologia con domande a scelta multipla, casi per immagini e spiegazioni ragionate."
        actions={
          phase === 'play' ? (
            <button type="button" className="btn-ghost" onClick={() => setPhase('setup')}>
              <LogOut size={15} /> Abbandona
            </button>
          ) : undefined
        }
      />

      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
            <SetupScreen settings={settings} onChange={setSettings} onStart={() => start(settings)} history={history} />
          </motion.div>
        )}

        {phase === 'play' && session && (
          <motion.div
            key={`play-${session.seed}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="mx-auto max-w-3xl space-y-4"
          >
            <div className="panel px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>
                  <strong className="text-slate-200 tabular-nums">{Math.min(index + 1, total)}</strong> / {total}
                </span>
                <span className="flex items-center gap-3">
                  {session.settings.timed && (
                    <span className="inline-flex items-center gap-1 text-cyan-300">
                      <Timer size={13} /> A tempo
                    </span>
                  )}
                  <span className="tabular-nums">
                    <span className="text-emerald-300">{correctSoFar}</span> corrette
                  </span>
                </span>
              </div>
              <div className="mt-2 flex h-1.5 gap-[3px]">
                {total <= 30 ? (
                  session.items.map((it, i) => {
                    const a = answers[i];
                    const cls =
                      a === undefined ? (i === index ? 'bg-cyan-400/60' : 'bg-white/[0.07]') : a === it.correctIndex ? 'bg-emerald-400' : 'bg-rose-400';
                    return <div key={it.question.id} className={`h-full flex-1 rounded-full transition-colors duration-300 ${cls}`} />;
                  })
                ) : (
                  <div className="h-full flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      animate={{ width: `${(answeredCount / total) * 100}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <QuestionCard
                key={session.items[index].question.id}
                item={session.items[index]}
                index={index}
                total={total}
                timed={session.settings.timed}
                answer={answers[index]}
                onAnswer={answer}
                onNext={next}
                onOpenPathology={onOpenPathology}
              />
            </AnimatePresence>

            <p className="hidden text-center text-xs text-slate-500 sm:block">
              Premi <kbd className="rounded border border-white/10 px-1 font-mono">1</kbd>–<kbd className="rounded border border-white/10 px-1 font-mono">4</kbd> per
              rispondere e <kbd className="rounded border border-white/10 px-1 font-mono">Invio</kbd> per proseguire.
            </p>
          </motion.div>
        )}

        {phase === 'results' && session && result && (
          <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
            <ResultsScreen
              session={session}
              answers={answers}
              result={result}
              history={history}
              onRetry={() => start(session.settings)}
              onNewQuiz={() => setPhase('setup')}
              onOpenPathology={onOpenPathology}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
