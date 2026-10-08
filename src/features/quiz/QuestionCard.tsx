import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { ArrowRight, BookOpen, Check, Clock, Flag, Lightbulb, X } from 'lucide-react';
import { CASE_BY_ID } from '../../data/cases';
import { PATHOLOGY_BY_ID } from '../../data/pathologies';
import { SmartImage } from '../../components/SmartImage';
import { CountdownRing } from './rings';
import { CATEGORY_META, DIFFICULTY_TONE } from './meta';
import { SECONDS_PER_QUESTION, type Answer, type SessionQuestion } from './session';

interface Props {
  item: SessionQuestion;
  index: number;
  total: number;
  timed: boolean;
  /** `undefined` finché l'utente non ha risposto */
  answer: Answer | undefined;
  onAnswer: (answer: Answer) => void;
  onNext: () => void;
  onOpenPathology: (pathologyId: string) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const TOTAL_MS = SECONDS_PER_QUESTION * 1000;

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
}

export function QuestionCard({ item, index, total, timed, answer, onAnswer, onNext, onOpenPathology }: Props) {
  const { question, options, correctIndex } = item;
  const answered = answer !== undefined;
  const isPresent = useIsPresent();
  const [remaining, setRemaining] = useState(TOTAL_MS);
  const deadline = useRef<number | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Countdown: si ferma alla risposta, allo scadere registra una risposta nulla
  useEffect(() => {
    if (!timed || answered || !isPresent) return;
    if (deadline.current === null) deadline.current = performance.now() + TOTAL_MS;
    const end = deadline.current;
    const id = window.setInterval(() => {
      const left = end - performance.now();
      if (left <= 0) {
        window.clearInterval(id);
        setRemaining(0);
        onAnswer(null);
      } else {
        setRemaining(left);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [timed, answered, isPresent, onAnswer]);

  // Scorciatoie da tastiera: 1-4 per rispondere, Invio per proseguire
  useEffect(() => {
    if (!isPresent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!answered && /^[1-4]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < options.length) {
          e.preventDefault();
          onAnswer(i);
        }
      } else if (answered && e.key === 'Enter' && !isInteractive(e.target)) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, isPresent, options.length, onAnswer, onNext]);

  useEffect(() => {
    if (answered) nextRef.current?.focus({ preventScroll: true });
  }, [answered]);

  const clinicalCase = question.caseId ? CASE_BY_ID[question.caseId] : undefined;
  const pathology = question.pathologyId ? PATHOLOGY_BY_ID[question.pathologyId] : undefined;
  const meta = CATEGORY_META[question.category];
  const CatIcon = meta.icon;
  const correct = answered && answer === correctIndex;
  const isLast = index === total - 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="panel overflow-hidden"
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="chip border-white/10 bg-white/[0.03] text-slate-300">
              <CatIcon size={12} className={meta.tone} /> {question.category}
            </span>
            <span className={`chip ${DIFFICULTY_TONE[question.difficulty]}`}>{question.difficulty}</span>
          </div>
          {timed && <CountdownRing remaining={remaining} total={TOTAL_MS} paused={answered} />}
        </div>

        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
          Domanda {index + 1} di {total}
        </p>
        <h2 className="mt-2 text-base font-semibold leading-snug text-white sm:text-lg">{question.prompt}</h2>

        {clinicalCase && (
          <figure className="mt-4 overflow-hidden rounded-xl border border-white/[0.07] bg-black">
            <SmartImage
              src={clinicalCase.image.src}
              alt={`Immagine clinica: ${clinicalCase.modality}`}
              wrapperClassName="h-56 w-full sm:h-72"
              className="h-full w-full object-contain"
            />
            <figcaption className="flex flex-wrap justify-between gap-x-3 border-t border-white/[0.06] bg-ink-900/80 px-3 py-1.5 text-[11px] text-slate-500">
              <span>{clinicalCase.modality}</span>
              <span className="truncate">
                {clinicalCase.image.credit} · {clinicalCase.image.license}
              </span>
            </figcaption>
          </figure>
        )}

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {options.map((opt, i) => {
            const isCorrect = i === correctIndex;
            const isChosen = answer === i;
            let tone = 'border-white/[0.08] bg-white/[0.02] text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-400/[0.05]';
            if (answered) {
              if (isCorrect) tone = 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100';
              else if (isChosen) tone = 'border-rose-400/50 bg-rose-500/10 text-rose-100';
              else tone = 'border-white/[0.05] bg-white/[0.01] text-slate-500';
            }
            return (
              <motion.button
                key={opt}
                type="button"
                disabled={answered}
                onClick={() => onAnswer(i)}
                animate={answered && isChosen && !isCorrect ? { x: [0, -6, 6, -4, 4, 0] } : answered && isCorrect ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.4 }}
                className={`flex min-h-[52px] items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors disabled:cursor-default ${tone}`}
              >
                <span
                  className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border font-mono text-xs ${
                    answered && isCorrect
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                      : answered && isChosen
                        ? 'border-rose-400/60 bg-rose-500/20 text-rose-200'
                        : 'border-white/10 bg-ink-900/60 text-slate-400'
                  }`}
                >
                  {answered && isCorrect ? <Check size={14} /> : answered && isChosen ? <X size={14} /> : LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1 leading-snug">{opt}</span>
                {!answered && <kbd className="hidden shrink-0 rounded border border-white/10 px-1.5 font-mono text-[10px] text-slate-500 sm:inline">{i + 1}</kbd>}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {answered && (
          <motion.div
            key="explanation"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`border-t px-4 py-4 sm:px-6 ${correct ? 'border-emerald-400/20 bg-emerald-500/[0.05]' : 'border-rose-400/20 bg-rose-500/[0.05]'}`}
          >
            <p className={`flex items-center gap-2 text-sm font-semibold ${correct ? 'text-emerald-300' : 'text-rose-300'}`}>
              {correct ? <Check size={16} /> : answer === null ? <Clock size={16} /> : <X size={16} />}
              {correct ? 'Risposta corretta' : answer === null ? 'Tempo scaduto' : 'Risposta errata'}
            </p>
            <p className="mt-2 flex gap-2 text-sm leading-relaxed text-slate-300">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-300" />
              <span>{question.explanation}</span>
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              {pathology ? (
                <button type="button" className="btn-ghost" onClick={() => onOpenPathology(pathology.id)}>
                  <BookOpen size={15} /> Approfondisci: {pathology.name}
                </button>
              ) : (
                <span />
              )}
              <button ref={nextRef} type="button" className="btn-primary" onClick={onNext}>
                {isLast ? (
                  <>
                    <Flag size={15} /> Vedi risultati
                  </>
                ) : (
                  <>
                    Prossima <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
