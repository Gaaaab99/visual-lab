import {
  BellRing,
  BookOpen,
  Brain,
  Calculator,
  CalendarDays,
  ClipboardList,
  Eye,
  LayoutDashboard,
  Microscope,
  Package,
  PackageOpen,
  ScanEye,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ViewId } from '../types';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Tasto per la scorciatoia Alt+N (vuoto = nessuna) */
  shortcut: string;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Panoramica',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Andamento del negozio e attività del giorno', shortcut: '1' }],
  },
  {
    label: 'Negozio',
    items: [
      { id: 'customers', label: 'Clienti', icon: Users, description: 'Schede clienti, prescrizioni, LAC e consensi', shortcut: '2' },
      { id: 'orders', label: 'Buste di lavoro', icon: PackageOpen, description: 'Ordini al laboratorio, montaggio e consegna', shortcut: '3' },
      { id: 'agenda', label: 'Agenda', icon: CalendarDays, description: 'Appuntamenti ed esami della vista', shortcut: '4' },
      { id: 'pos', label: 'Cassa e vendite', icon: ShoppingCart, description: 'Vendite, incassi e Sistema Tessera Sanitaria', shortcut: '5' },
      { id: 'inventory', label: 'Magazzino', icon: Package, description: 'Montature, lenti, LAC e scorte', shortcut: '6' },
      { id: 'recalls', label: 'Richiami', icon: BellRing, description: 'Controlli annuali, riordino LAC, ritiri', shortcut: '' },
    ],
  },
  {
    label: 'Clinica',
    items: [
      { id: 'simulator', label: 'Simulatore', icon: Eye, description: 'Visione soggettiva in tempo reale', shortcut: '7' },
      { id: 'reports', label: 'Referti clinici', icon: ClipboardList, description: 'Referti con snapshot del simulatore', shortcut: '' },
      { id: 'archive', label: 'Patologie', icon: BookOpen, description: 'Atlante e schede cliniche', shortcut: '8' },
      { id: 'cases', label: 'Casi clinici', icon: Microscope, description: 'Iconografia reale commentata', shortcut: '9' },
    ],
  },
  {
    label: 'Formazione e strumenti',
    items: [
      { id: 'tools', label: 'Strumenti', icon: Calculator, description: 'Calcolatori e test visivi', shortcut: '' },
      { id: 'anatomy', label: 'Anatomia', icon: ScanEye, description: 'Bulbo oculare interattivo', shortcut: '' },
      { id: 'quiz', label: 'Quiz', icon: Brain, description: 'Autovalutazione con XP', shortcut: '' },
    ],
  },
  {
    label: 'Sistema',
    items: [{ id: 'settings', label: 'Impostazioni', icon: Settings, description: 'Dati del negozio, documenti e backup', shortcut: '' }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
export const VIEW_IDS: ViewId[] = NAV_ITEMS.map((i) => i.id);
