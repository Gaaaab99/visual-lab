import type { Customer, EyeRx, Order, OrderLine, OrderStatus, Prescription, ProductCategory } from './types';

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const eur = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
export const fmtDateShort = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '—');

export const fullName = (c?: Pick<Customer, 'firstName' | 'lastName'> | null) => (c ? `${c.lastName} ${c.firstName}`.trim() : 'Cliente occasionale');
export const initials = (c?: Pick<Customer, 'firstName' | 'lastName'> | null) => (c ? `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase() : '?');

export function age(birth?: string): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

/** Formatta una diottria con segno e due decimali: +1,25 / −0,50 / 0,00 */
export const dpt = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2).replace('.', ',')}`;

export function rxLine(e: EyeRx): string {
  const parts = [`sf ${dpt(e.sph)}`];
  if (e.cyl) parts.push(`cil ${dpt(e.cyl)} ax ${e.axis}°`);
  if (e.add) parts.push(`add ${dpt(e.add)}`);
  if (e.prism) parts.push(`${e.prism}Δ ${e.base}`);
  return parts.join(' ');
}

export const emptyEye = (): EyeRx => ({ sph: 0, cyl: 0, axis: 0, add: 0, prism: 0, base: '', va: '' });

export function latestRx(c: Customer): Prescription | null {
  return [...c.prescriptions].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export const lineTotal = (l: OrderLine) => l.qty * l.unitPrice;

export function orderTotals(o: Pick<Order, 'lines' | 'discount' | 'deposit' | 'paid'>) {
  const gross = o.lines.reduce((s, l) => s + lineTotal(l), 0);
  const total = Math.max(0, gross - o.discount);
  const due = Math.max(0, total - o.deposit - o.paid);
  return { gross, total, due };
}

/** Scorporo IVA per aliquota */
export function vatBreakdown(lines: OrderLine[], discount = 0) {
  const gross = lines.reduce((s, l) => s + lineTotal(l), 0) || 1;
  const map = new Map<number, { taxable: number; vat: number; total: number }>();
  for (const l of lines) {
    const t = lineTotal(l) * (1 - discount / gross);
    const taxable = t / (1 + l.vat / 100);
    const cur = map.get(l.vat) ?? { taxable: 0, vat: 0, total: 0 };
    cur.taxable += taxable;
    cur.vat += t - taxable;
    cur.total += t;
    map.set(l.vat, cur);
  }
  return [...map.entries()].map(([rate, v]) => ({ rate, ...v }));
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string; dot: string }> = {
  preventivo: { label: 'Preventivo', tone: 'border-slate-400/30 bg-slate-400/10 text-slate-200', dot: 'bg-slate-400' },
  ordinato: { label: 'Ordinato', tone: 'border-sky-400/30 bg-sky-400/10 text-sky-200', dot: 'bg-sky-400' },
  in_lavorazione: { label: 'In lavorazione', tone: 'border-violet-400/30 bg-violet-400/10 text-violet-200', dot: 'bg-violet-400' },
  pronto: { label: 'Pronto', tone: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200', dot: 'bg-emerald-400' },
  consegnato: { label: 'Consegnato', tone: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200', dot: 'bg-cyan-400' },
  annullato: { label: 'Annullato', tone: 'border-rose-400/30 bg-rose-400/10 text-rose-200', dot: 'bg-rose-400' },
};

export const ORDER_FLOW: OrderStatus[] = ['preventivo', 'ordinato', 'in_lavorazione', 'pronto', 'consegnato'];

/** Aliquote IVA predefinite per categoria (modificabili sul singolo articolo). */
export const DEFAULT_VAT: Record<ProductCategory, number> = {
  'Montatura vista': 4,
  'Occhiale da sole': 22,
  'Lenti oftalmiche': 4,
  'Lenti a contatto': 4,
  'Soluzioni e cura': 22,
  Accessori: 22,
  Servizi: 22,
};

export const IS_MEDICAL_DEVICE: Record<ProductCategory, boolean> = {
  'Montatura vista': true,
  'Occhiale da sole': false,
  'Lenti oftalmiche': true,
  'Lenti a contatto': true,
  'Soluzioni e cura': true,
  Accessori: false,
  Servizi: false,
};

export function nextNumber(prefix: string, existing: string[]): string {
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = existing.reduce((m, n) => {
    const r = n.match(re);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}

/** Semplice validazione formale del codice fiscale italiano (16 caratteri + carattere di controllo) */
export function isValidFiscalCode(cf: string): boolean {
  const s = cf.trim().toUpperCase();
  if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(s)) return false;
  const odd: Record<string, number> = {
    0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
  };
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const ch = s[i];
    if (i % 2 === 0) sum += odd[ch];
    else sum += /[0-9]/.test(ch) ? Number(ch) : ch.charCodeAt(0) - 65;
  }
  return String.fromCharCode(65 + (sum % 26)) === s[15];
}

/** Link di contatto (aprono l’app del dispositivo, non inviano nulla automaticamente) */
export function contactLink(channel: 'WhatsApp' | 'SMS' | 'Email' | 'Telefono', c: Pick<Customer, 'phone' | 'email'>, text: string, subject = 'Il tuo centro ottico'): string | null {
  const phone = c.phone.replace(/[^\d+]/g, '');
  const intl = phone.startsWith('+') ? phone.slice(1) : phone.startsWith('00') ? phone.slice(2) : `39${phone}`;
  switch (channel) {
    case 'WhatsApp':
      return phone ? `https://wa.me/${intl}?text=${encodeURIComponent(text)}` : null;
    case 'SMS':
      return phone ? `sms:${phone}?body=${encodeURIComponent(text)}` : null;
    case 'Email':
      return c.email ? `mailto:${c.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null;
    case 'Telefono':
      return phone ? `tel:${phone}` : null;
  }
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
