import type { Appointment, AppointmentType } from '../../store/types';
import { toMin } from './dates';

export type ApptStatus = Appointment['status'];

export const APPT_TYPES: AppointmentType[] = [
  'Esame della vista',
  'Controllo lenti a contatto',
  'Applicazione LAC',
  'Ritiro occhiali',
  'Riparazione / assistenza',
  'Consulenza montatura',
  'Altro',
];

export const TYPE_STYLE: Record<AppointmentType, { block: string; dot: string }> = {
  'Esame della vista': { block: 'border-cyan-400/50 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30', dot: 'bg-cyan-400' },
  'Controllo lenti a contatto': { block: 'border-violet-400/50 bg-violet-500/20 text-violet-50 hover:bg-violet-500/30', dot: 'bg-violet-400' },
  'Applicazione LAC': { block: 'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-50 hover:bg-fuchsia-500/30', dot: 'bg-fuchsia-400' },
  'Ritiro occhiali': { block: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30', dot: 'bg-emerald-400' },
  'Riparazione / assistenza': { block: 'border-amber-400/50 bg-amber-500/20 text-amber-50 hover:bg-amber-500/30', dot: 'bg-amber-400' },
  'Consulenza montatura': { block: 'border-blue-400/50 bg-blue-500/20 text-blue-50 hover:bg-blue-500/30', dot: 'bg-blue-400' },
  Altro: { block: 'border-slate-400/50 bg-slate-500/20 text-slate-50 hover:bg-slate-500/30', dot: 'bg-slate-400' },
};

export const STATUS_META: Record<ApptStatus, { label: string; tone: string }> = {
  programmato: { label: 'Programmato', tone: 'border-sky-400/30 bg-sky-400/10 text-sky-200' },
  confermato: { label: 'Confermato', tone: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' },
  completato: { label: 'Completato', tone: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' },
  non_presentato: { label: 'Non presentato', tone: 'border-rose-400/30 bg-rose-400/10 text-rose-200' },
  annullato: { label: 'Annullato', tone: 'border-slate-400/30 bg-slate-400/10 text-slate-300' },
};

export const STATUSES = Object.keys(STATUS_META) as ApptStatus[];
export const DURATIONS = [15, 20, 30, 45, 60, 90];

export const DAY_START = 8 * 60 + 30;
export const DAY_END = 20 * 60;
export const SLOT = 15;

export const isActive = (a: Appointment) => a.status !== 'annullato';

export function overlaps(a: Pick<Appointment, 'time' | 'duration'>, b: Pick<Appointment, 'time' | 'duration'>): boolean {
  const s1 = toMin(a.time);
  const s2 = toMin(b.time);
  return s1 < s2 + b.duration && s2 < s1 + a.duration;
}

export interface Placed {
  a: Appointment;
  col: number;
  cols: number;
}

/** Dispone gli appuntamenti sovrapposti affiancati in colonne */
export function layoutDay(list: Appointment[]): Placed[] {
  const sorted = [...list].sort((x, y) => toMin(x.time) - toMin(y.time) || y.duration - x.duration);
  const out: Placed[] = [];
  let cluster: { a: Appointment; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = colEnds.length;
    for (const c of cluster) out.push({ a: c.a, col: c.col, cols });
    cluster = [];
    colEnds = [];
    clusterEnd = -1;
  };
  for (const a of sorted) {
    const s = toMin(a.time);
    const e = s + a.duration;
    if (cluster.length && s >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= s);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(e);
    } else colEnds[col] = e;
    cluster.push({ a, col });
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return out;
}
