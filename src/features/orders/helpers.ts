import type { Customer, LensDesign, Order, OrderLine, OrderStatus, OrderType, Prescription, Sale } from '../../store/types';
import { ORDER_FLOW, emptyEye, newId, orderTotals, todayISO } from '../../store/utils';

export const ORDER_TYPES: OrderType[] = ['Occhiale da vista', 'Occhiale da sole graduato', 'Lenti a contatto', 'Solo lenti', 'Riparazione'];
export const LENS_DESIGNS: LensDesign[] = ['Monofocale', 'Progressiva', 'Office / degressiva', 'Bifocale', 'Lenti a contatto', '—'];
export const LENS_INDEXES = ['1.5', '1.53', '1.59', '1.6', '1.67', '1.74'];
export const LENS_MATERIALS = ['Organico', 'Policarbonato', 'Trivex', 'Minerale', 'Silicone hydrogel', 'Hydrogel'];
export const LENS_BRANDS = ['Essilor', 'Zeiss', 'Hoya', 'Rodenstock', 'Nikon', 'Shamir', 'BBGR', 'Johnson & Johnson', 'CooperVision', 'Alcon', 'Bausch + Lomb'];
export const TREATMENTS = [
  'Antiriflesso',
  'Indurente',
  'Idro-oleorepellente',
  'Filtro luce blu',
  'Fotocromatiche',
  'Polarizzate',
  'Colorazione solare',
  'Specchiatura',
  'Controllo miopia',
  'Antiappannamento',
  'Protezione UV 400',
];
export const LAB_SUGGESTIONS = ['Laboratorio interno', 'Essilor Italia', 'Zeiss Vision Care', 'Hoya Lens Italia', 'Rodenstock Italia', 'Johnson & Johnson Vision', 'CooperVision Italia'];

/** Tipi di busta che producono un dispositivo medico su misura (occhiale graduato) */
export const CUSTOM_MADE: OrderType[] = ['Occhiale da vista', 'Occhiale da sole graduato', 'Solo lenti'];
export const isCustomMade = (o: Pick<Order, 'type'>) => CUSTOM_MADE.includes(o.type);
export const hasFrame = (t: OrderType) => t !== 'Lenti a contatto' && t !== 'Solo lenti';
export const hasLenses = (t: OrderType) => t !== 'Riparazione';

export const OPEN_STATUSES: OrderStatus[] = ['preventivo', 'ordinato', 'in_lavorazione', 'pronto'];
export const isOpen = (o: Order) => OPEN_STATUSES.includes(o.status);

/** Ritardo: data prevista superata e busta non ancora pronta */
export const isLate = (o: Order, today = todayISO()) =>
  !!o.expectedDate && o.expectedDate < today && (o.status === 'preventivo' || o.status === 'ordinato' || o.status === 'in_lavorazione');

/** Stato raggiunto almeno una volta (oltre il preventivo): la montatura è stata scaricata dal magazzino */
export const flowIndex = (s: OrderStatus) => ORDER_FLOW.indexOf(s);
export const stockTaken = (o: Order) => o.history.some((h) => flowIndex(h.status) >= 1) || flowIndex(o.status) >= 1;

export const lastStatusDate = (o: Order) => o.history.length ? o.history[o.history.length - 1].date : o.updatedAt;

export function emptyRx(): Prescription {
  return {
    id: newId(),
    date: todayISO(),
    kind: 'Lontano',
    source: 'Prescrizione oculista',
    examiner: '',
    od: emptyEye(),
    os: emptyEye(),
    pdOd: 0,
    pdOs: 0,
    notes: '',
  };
}

export function emptyOrder(customerId: string, lab: string): Order {
  const now = new Date().toISOString();
  return {
    id: newId(),
    number: '',
    customerId,
    type: 'Occhiale da vista',
    status: 'preventivo',
    createdAt: now,
    updatedAt: now,
    rx: null,
    frame: { brand: '', model: '', color: '', size: '', ownFrame: false },
    lenses: { brand: '', design: 'Monofocale', index: '1.5', material: 'Organico', treatments: [], diameter: '' },
    centering: { pdOd: 0, pdOs: 0, heightOd: 0, heightOs: 0, vertex: 12, pantoscopic: 8, wrap: 5 },
    lab,
    lines: [],
    discount: 0,
    deposit: 0,
    paid: 0,
    notes: '',
    history: [],
  };
}

export const newLine = (description = '', unitPrice = 0, vat = 4, medicalDevice = true, productId?: string): OrderLine => ({
  id: newId(),
  productId,
  description,
  qty: 1,
  unitPrice,
  vat,
  medicalDevice,
});

export function lensDescription(o: Pick<Order, 'lenses' | 'type'>): string {
  const l = o.lenses;
  if (o.type === 'Lenti a contatto') return `Lenti a contatto ${l.brand}`.trim();
  const parts = ['Lenti', l.brand, l.design !== '—' ? l.design.toLowerCase() : '', l.index, l.material.toLowerCase()].filter(Boolean);
  const tr = l.treatments.length ? ` · ${l.treatments.join(', ')}` : '';
  return `${parts.join(' ')}${tr} (coppia)`;
}

export const frameLabel = (o: Pick<Order, 'frame'>) =>
  o.frame.ownFrame
    ? `Montatura del cliente${o.frame.brand || o.frame.model ? ` · ${[o.frame.brand, o.frame.model].filter(Boolean).join(' ')}` : ''}`
    : [o.frame.brand, o.frame.model, o.frame.color, o.frame.size].filter(Boolean).join(' · ') || '—';

/** Numero progressivo del documento commerciale: DC-00001 */
export function nextSaleNumber(sales: Sale[]): string {
  const max = sales.reduce((m, s) => {
    const r = s.number.match(/^DC-(\d+)$/);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `DC-${String(max + 1).padStart(5, '0')}`;
}

/** Numero della dichiarazione di conformità: DC-SM-<anno>-<progressivo> */
export function nextConformityNumber(orders: Order[]): string {
  const year = new Date().getFullYear();
  const re = new RegExp(`^DC-SM-${year}-(\\d+)$`);
  const max = orders.reduce((m, o) => {
    const r = o.conformityNumber?.match(re);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `DC-SM-${year}-${String(max + 1).padStart(4, '0')}`;
}

export function readyMessage(c: Customer, o: Order, signature: string, hours: string): string {
  const { due } = orderTotals(o);
  const what = o.type === 'Lenti a contatto' ? 'le sue lenti a contatto sono pronte' : o.type === 'Riparazione' ? 'la riparazione del suo occhiale è pronta' : 'i suoi occhiali sono pronti';
  return [
    `Gentile ${c.firstName} ${c.lastName}, ${what} per il ritiro (busta ${o.number}).`,
    due > 0 ? `Saldo da corrispondere al ritiro: ${due.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}.` : '',
    hours ? `Ci trova nei seguenti orari: ${hours}.` : '',
    signature,
  ]
    .filter(Boolean)
    .join('\n');
}

export const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
