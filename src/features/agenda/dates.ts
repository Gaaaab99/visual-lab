/* Utilità per date locali (evitano gli slittamenti di fuso di toISOString) */

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const isoOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function parseISO(s: string): Date {
  const [y = 1970, m = 1, d = 1] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const localToday = () => isoOf(new Date());

export function shiftDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

export function shiftMonths(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setMonth(d.getMonth() + n);
  return isoOf(d);
}

/** Giorni da a → b (positivo se b è successiva) */
export const diffDays = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);

/** Lunedì della settimana che contiene la data */
export function startOfWeek(iso: string): string {
  const d = parseISO(iso);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return isoOf(d);
}

export function toMin(t: string): number {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
}

export const fromMin = (m: number) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;

export const weekdayLong = (iso: string) => parseISO(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
export const weekdayShort = (iso: string) => parseISO(iso).toLocaleDateString('it-IT', { weekday: 'short' });
export const dayMonth = (iso: string) => parseISO(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
export const fmtLocal = (iso: string) => parseISO(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
