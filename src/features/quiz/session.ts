import { QUESTIONS, type QuizCategory, type QuizDifficulty, type QuizQuestion } from '../../data/quiz';

export type CategoryFilter = QuizCategory | 'Tutte';
export type DifficultyFilter = QuizDifficulty | 'Tutte';
export type QuestionCount = 10 | 20 | 'all';

export interface QuizSettings {
  category: CategoryFilter;
  difficulty: DifficultyFilter;
  count: QuestionCount;
  timed: boolean;
}

export interface SessionQuestion {
  question: QuizQuestion;
  /** Opzioni nell'ordine di presentazione */
  options: string[];
  correctIndex: number;
}

/** `null` = tempo scaduto senza risposta */
export type Answer = number | null;

export interface QuizSession {
  seed: number;
  settings: QuizSettings;
  items: SessionQuestion[];
}

export const SECONDS_PER_QUESTION = 30;

/** PRNG deterministico (mulberry32): stessa sequenza a parità di seed */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function filterPool(category: CategoryFilter, difficulty: DifficultyFilter): QuizQuestion[] {
  return QUESTIONS.filter((q) => (category === 'Tutte' || q.category === category) && (difficulty === 'Tutte' || q.difficulty === difficulty));
}

export function buildSession(settings: QuizSettings, seed: number): QuizSession {
  const rand = mulberry32(seed);
  const pool = shuffle(filterPool(settings.category, settings.difficulty), rand);
  const picked = settings.count === 'all' ? pool : pool.slice(0, settings.count);
  const items = picked.map<SessionQuestion>((question) => {
    const options = shuffle([question.answer, ...question.distractors], rand);
    return { question, options, correctIndex: options.indexOf(question.answer) };
  });
  return { seed, settings, items };
}

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

export function percent(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

export function gradeTone(pct: number): { text: string; stroke: string; label: string } {
  if (pct >= 85) return { text: 'text-emerald-300', stroke: '#34d399', label: 'Eccellente' };
  if (pct >= 70) return { text: 'text-cyan-300', stroke: '#22d3ee', label: 'Buono' };
  if (pct >= 50) return { text: 'text-amber-300', stroke: '#fbbf24', label: 'Sufficiente' };
  return { text: 'text-rose-300', stroke: '#fb7185', label: 'Da ripassare' };
}
