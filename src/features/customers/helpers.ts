import type { Appointment, ContactLensFit, Customer, EyeRx, Order, Prescription, Sale } from '../../store/types';
import { addDays, daysBetween, emptyEye, latestRx, newId, todayISO } from '../../store/utils';

export const VISUAL_NEEDS = ['Guida', 'Guida notturna', 'PC', 'Lettura', 'Sport', 'Lavoro all’aperto', 'Scuola', 'Televisione', 'Lavori di precisione', 'Sole', 'Smartphone'];
export const TAG_SUGGESTIONS = ['Progressive', 'LAC', 'Bambino', 'Miopia', 'Controllo miopia', 'Astigmatismo', 'Presbiopia', 'Glaucoma', 'Cataratta', 'Sportivo', 'VIP'];

export const RX_KINDS: Prescription['kind'][] = ['Lontano', 'Vicino', 'Intermedio', 'Progressivo', 'Lenti a contatto'];
export const RX_SOURCES: Prescription['source'][] = ['Esame optometrico in negozio', 'Prescrizione oculista', 'Lensometria occhiale in uso'];
export const CL_REPLACEMENTS: ContactLensFit['replacement'][] = ['Giornaliere', 'Quindicinali', 'Mensili', 'Trimestrali', 'Annuali', 'RGP'];

/** Equivalente sferico */
export const sphEq = (e: EyeRx) => e.sph + e.cyl / 2;

export const round025 = (n: number) => Math.round(n * 4) / 4;

export const sortedRx = (c: Customer) => [...c.prescriptions].sort((a, b) => b.date.localeCompare(a.date));

export function emptyCustomer(code: string): Customer {
  const now = new Date().toISOString();
  return {
    id: newId(),
    code,
    firstName: '',
    lastName: '',
    sex: 'F',
    birthDate: undefined,
    fiscalCode: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    zip: '',
    profession: '',
    visualNeeds: [],
    preferredChannel: 'WhatsApp',
    tags: [],
    notes: '',
    consents: { privacy: false, healthData: false, marketing: false, reminders: true, stsOpposition: false },
    prescriptions: [],
    contactLenses: [],
    loyaltyPoints: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function nextCustomerCode(customers: Customer[]): string {
  const max = customers.reduce((m, c) => {
    const r = /^C(\d+)$/.exec(c.code);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 1000);
  let n = max + 1;
  const used = new Set(customers.map((c) => c.code));
  while (used.has(`C${n}`)) n++;
  return `C${n}`;
}

export function emptyRx(examiner: string, prev?: Prescription | null): Prescription {
  return {
    id: newId(),
    date: todayISO(),
    kind: prev?.kind ?? 'Lontano',
    source: 'Esame optometrico in negozio',
    examiner,
    od: prev ? { ...prev.od, va: '' } : emptyEye(),
    os: prev ? { ...prev.os, va: '' } : emptyEye(),
    pdOd: prev?.pdOd ?? 0,
    pdOs: prev?.pdOs ?? 0,
    heightOd: prev?.heightOd,
    heightOs: prev?.heightOs,
    notes: '',
    nextCheck: addDays(todayISO(), 365),
  };
}

export function emptyCl(): ContactLensFit {
  const eye = { power: 0, bc: 8.6, dia: 14.2 };
  return {
    id: newId(),
    date: todayISO(),
    brand: '',
    product: '',
    replacement: 'Mensili',
    od: { ...eye },
    os: { ...eye },
    solution: '',
    lastSupplyDate: todayISO(),
    supplyDays: 180,
    notes: '',
  };
}

/* ------------------------------------------------------------ stato controlli */

export type CheckState = 'ok' | 'soon' | 'overdue' | 'none';

/** Stato del prossimo controllo visivo (scaduto = data superata o ultima Rx > 24 mesi) */
export function checkState(c: Customer): { state: CheckState; due?: string } {
  const rx = latestRx(c);
  if (!rx) return { state: 'none' };
  const due = rx.nextCheck ?? addDays(rx.date, 730);
  const d = daysBetween(todayISO(), due);
  return { state: d < 0 ? 'overdue' : d <= 30 ? 'soon' : 'ok', due };
}

/* ------------------------------------------------------------ lenti a contatto */

export type ClState = 'ok' | 'soon' | 'overdue' | 'unknown';

export function clReorder(f: ContactLensFit): { state: ClState; date?: string; days?: number } {
  if (!f.lastSupplyDate || !f.supplyDays) return { state: 'unknown' };
  const date = addDays(f.lastSupplyDate, f.supplyDays);
  const days = daysBetween(todayISO(), date);
  return { state: days < 0 ? 'overdue' : days <= 14 ? 'soon' : 'ok', date, days };
}

export const CL_STATE: Record<ClState, { label: string; tone: string }> = {
  ok: { label: 'In corso', tone: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' },
  soon: { label: 'In scadenza', tone: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
  overdue: { label: 'Scaduta', tone: 'border-rose-400/30 bg-rose-400/10 text-rose-200' },
  unknown: { label: 'Fornitura n.d.', tone: 'border-slate-400/30 bg-slate-400/10 text-slate-300' },
};

export function latestCl(c: Customer): ContactLensFit | null {
  return [...c.contactLenses].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

/* ------------------------------------------------------------ attività */

export const isOpenOrder = (o: Order) => o.status !== 'consegnato' && o.status !== 'annullato';

/** Data dell’ultima attività del cliente (esame, busta, vendita, appuntamento completato) */
export function lastVisit(c: Customer, orders: Order[], sales: Sale[], appts: Appointment[]): string | undefined {
  const dates: string[] = [...c.prescriptions.map((r) => r.date), ...c.contactLenses.map((f) => f.date)];
  for (const o of orders) if (o.customerId === c.id) dates.push(o.createdAt.slice(0, 10));
  for (const s of sales) if (s.customerId === c.id) dates.push(s.date.slice(0, 10));
  for (const a of appts) if (a.customerId === c.id && a.status === 'completato') dates.push(a.date);
  const today = todayISO();
  return dates.filter((d) => d <= today).sort().pop();
}

/** Ricerca normalizzata (senza accenti, spazi nel telefono) */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function matches(c: Customer, q: string): boolean {
  if (!q) return true;
  const digits = q.replace(/[^\d]/g, '');
  const hay = norm([c.firstName, c.lastName, c.code, c.fiscalCode, c.email, c.city, c.tags.join(' ')].join(' '));
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (terms.every((t) => hay.includes(t))) return true;
  return digits.length >= 3 && c.phone.replace(/[^\d]/g, '').includes(digits);
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const AVATAR_TONES = [
  'from-cyan-500/30 to-blue-600/30 text-cyan-100',
  'from-violet-500/30 to-fuchsia-600/30 text-violet-100',
  'from-emerald-500/30 to-teal-600/30 text-emerald-100',
  'from-amber-500/30 to-orange-600/30 text-amber-100',
  'from-rose-500/30 to-pink-600/30 text-rose-100',
  'from-sky-500/30 to-indigo-600/30 text-sky-100',
];
export const avatarTone = (id: string) => AVATAR_TONES[[...id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
