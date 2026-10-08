import { Award, BookOpenCheck, Brain, Crown, FileCheck2, FileText, Medal, Microscope, type LucideIcon } from 'lucide-react';
import type { Report, UserProfile } from '../../types';
import { CASES } from '../../data/cases';
import { levelFromXp } from '../../context/AppContext';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  test: (p: UserProfile, reports: Report[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-report', title: 'Primo referto', description: 'Salva il tuo primo referto', icon: FileText, test: (_, r) => r.length >= 1 },
  { id: 'ten-reports', title: 'Ambulatorio', description: 'Salva 10 referti', icon: FileCheck2, test: (_, r) => r.length >= 10 },
  { id: 'sim-report', title: 'Empatia', description: 'Allega una simulazione a un referto', icon: Award, test: (_, r) => r.some((x) => x.simulation && x.simulation.conditions.length > 0) },
  { id: 'five-cases', title: 'Osservatore', description: 'Studia 5 casi clinici', icon: Microscope, test: (p) => p.casesStudied.length >= 5 },
  { id: 'all-cases', title: 'Atlante completo', description: 'Studia tutti i casi clinici', icon: BookOpenCheck, test: (p) => CASES.every((c) => p.casesStudied.includes(c.id)) },
  { id: 'first-quiz', title: 'Allievo', description: 'Completa il primo quiz', icon: Brain, test: (p) => (p.quizHistory?.length ?? 0) >= 1 },
  { id: 'perfect-quiz', title: 'Perfezionista', description: 'Ottieni il 100% in un quiz da almeno 10 domande', icon: Medal, test: (p) => (p.quizHistory ?? []).some((q) => q.total >= 10 && q.score === q.total) },
  { id: 'level-4', title: 'Oftalmologo', description: 'Raggiungi il livello 4', icon: Crown, test: (p) => levelFromXp(p.xp).level >= 4 },
];

export function evaluateAchievements(profile: UserProfile | null, reports: Report[]): Set<string> {
  if (!profile) return new Set();
  return new Set(ACHIEVEMENTS.filter((a) => a.test(profile, reports)).map((a) => a.id));
}
