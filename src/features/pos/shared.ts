import type { OrderLine, PaymentMethod, Product, Sale } from '../../store/types';
import { lineTotal } from '../../store/utils';
import type { ViewId } from '../../types';

export interface ViewProps {
  focusId: string | null;
  onFocusConsumed: () => void;
  onNavigate: (view: ViewId, focusId?: string) => void;
}

export const PAYMENTS: PaymentMethod[] = ['Contanti', 'Carta', 'Bancomat', 'Bonifico', 'Finanziamento', 'Buono'];

/** Scarica un file generato nel browser */
export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([mime.startsWith('text/csv') ? '﻿' + content : content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cell = (v: string | number) => {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV con separatore ';' (compatibile con Excel in locale italiano) */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

/** Importo con virgola decimale per i CSV */
export const csvNum = (n: number) => n.toFixed(2).replace('.', ',');

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const saleGross = (s: Pick<Sale, 'lines'>) => s.lines.reduce((t, l) => t + lineTotal(l), 0);

/** Quota della vendita relativa a dispositivi medici (sconto ripartito proporzionalmente) */
export function medicalAmount(s: Pick<Sale, 'lines' | 'discount'>): number {
  const gross = saleGross(s);
  if (!gross) return 0;
  const md = s.lines.filter((l) => l.medicalDevice).reduce((t, l) => t + lineTotal(l), 0);
  return round2(md * (1 - s.discount / gross));
}

export const hasMedical = (s: Pick<Sale, 'lines'>) => s.lines.some((l) => l.medicalDevice);

/** Numero progressivo DC-xxxxx che prosegue dal massimo esistente */
export function nextSaleNumber(sales: Sale[]): string {
  const max = sales.reduce((m, s) => {
    const r = s.number.match(/^DC-(\d+)$/);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `DC-${String(max + 1).padStart(5, '0')}`;
}

export const isTracked = (p: PaymentMethod) => p !== 'Contanti';

/** Data locale YYYY-MM-DD di un ISO date-time */
export function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const localToday = () => localDay(new Date().toISOString());

/** Categoria di ricavo di una riga di vendita (dall'articolo o, in mancanza, dalla descrizione) */
export function lineCategory(l: OrderLine, productById: (id?: string) => Product | undefined): string {
  const p = productById(l.productId);
  if (p) return p.category;
  const d = l.description.toLowerCase();
  if (/acconto|busta|occhiale completo|progressiv|monofocal/.test(d)) return 'Occhiali su misura';
  if (/sole/.test(d)) return 'Occhiale da sole';
  if (/esame|servizio|riparaz|regolaz|controllo/.test(d)) return 'Servizi';
  if (/acuvue|biofinity|dailies|air optix|lenti a contatto|\(\d+\)/.test(d)) return 'Lenti a contatto';
  if (/soluzion|opti-free|biotrue|renu|spray|gocce/.test(d)) return 'Soluzioni e cura';
  if (/astuccio|panno|cordino|catenella/.test(d)) return 'Accessori';
  return l.medicalDevice ? 'Altri dispositivi medici' : 'Altro';
}

export const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
