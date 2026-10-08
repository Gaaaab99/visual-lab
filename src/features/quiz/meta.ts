import { Activity, CircleDot, Droplets, Eye, Flame, Glasses, Pill, Stethoscope, type LucideIcon } from 'lucide-react';
import type { QuizCategory, QuizDifficulty } from '../../data/quiz';

export const CATEGORY_META: Record<QuizCategory, { icon: LucideIcon; tone: string; bar: string }> = {
  Retina: { icon: Eye, tone: 'text-rose-300', bar: 'from-rose-500 to-rose-400' },
  'Nervo Ottico': { icon: Activity, tone: 'text-amber-300', bar: 'from-amber-500 to-amber-400' },
  Cornea: { icon: CircleDot, tone: 'text-sky-300', bar: 'from-sky-500 to-sky-400' },
  'Mezzi Diottrici': { icon: Droplets, tone: 'text-yellow-300', bar: 'from-yellow-500 to-yellow-400' },
  'Vizi di Refrazione': { icon: Glasses, tone: 'text-violet-300', bar: 'from-violet-500 to-violet-400' },
  Uvea: { icon: Flame, tone: 'text-red-300', bar: 'from-red-500 to-red-400' },
  Farmacologia: { icon: Pill, tone: 'text-emerald-300', bar: 'from-emerald-500 to-emerald-400' },
  Semeiotica: { icon: Stethoscope, tone: 'text-cyan-300', bar: 'from-cyan-500 to-cyan-400' },
};

export const DIFFICULTY_TONE: Record<QuizDifficulty, string> = {
  Base: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  Intermedio: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  Avanzato: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
};
