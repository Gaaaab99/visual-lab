import { BookOpen, Brain, Calculator, ClipboardList, Eye, LayoutDashboard, Microscope, ScanEye, type LucideIcon } from 'lucide-react';
import type { ViewId } from '../types';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  description: string;
  shortcut: string;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Panoramica',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Attività recenti e accesso rapido', shortcut: '1' }],
  },
  {
    label: 'Clinica',
    items: [
      { id: 'simulator', label: 'Simulatore', icon: Eye, description: 'Visione soggettiva in tempo reale', shortcut: '2' },
      { id: 'archive', label: 'Patologie', icon: BookOpen, description: 'Atlante e schede cliniche', shortcut: '3' },
      { id: 'cases', label: 'Casi clinici', icon: Microscope, description: 'Iconografia reale commentata', shortcut: '4' },
      { id: 'reports', label: 'Pazienti / Referti', icon: ClipboardList, description: 'Cartella clinica e referti', shortcut: '5' },
    ],
  },
  {
    label: 'Formazione',
    items: [
      { id: 'anatomy', label: 'Anatomia', icon: ScanEye, description: 'Bulbo oculare interattivo', shortcut: '6' },
      { id: 'quiz', label: 'Quiz', icon: Brain, description: 'Autovalutazione con XP', shortcut: '7' },
      { id: 'tools', label: 'Strumenti', icon: Calculator, description: 'Calcolatori e test visivi', shortcut: '8' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
export const VIEW_IDS: ViewId[] = NAV_ITEMS.map((i) => i.id);
