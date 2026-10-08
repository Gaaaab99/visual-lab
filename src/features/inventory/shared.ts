import type { Product, ProductCategory } from '../../store/types';

export const CATEGORIES: ProductCategory[] = ['Montatura vista', 'Occhiale da sole', 'Lenti oftalmiche', 'Lenti a contatto', 'Soluzioni e cura', 'Accessori', 'Servizi'];

/** I servizi non hanno giacenza */
export const tracksStock = (p: Pick<Product, 'category'>) => p.category !== 'Servizi';

export type StockState = 'esaurito' | 'sotto' | 'ok' | 'servizio';

export function stockState(p: Product): StockState {
  if (!tracksStock(p)) return 'servizio';
  if (p.stock <= 0) return 'esaurito';
  if (p.stock <= p.minStock) return 'sotto';
  return 'ok';
}

export const STOCK_TONE: Record<StockState, string> = {
  esaurito: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  sotto: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  ok: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  servizio: 'border-slate-400/20 bg-slate-400/5 text-slate-400',
};

export const needsReorder = (p: Product) => tracksStock(p) && p.stock <= p.minStock;

/** Quantità suggerita: riporta la giacenza al doppio della scorta minima (almeno 1) */
export const suggestedQty = (p: Product) => Math.max(1, p.minStock * 2 - p.stock);

/** Margine % sul prezzo netto IVA */
export function marginPct(p: Pick<Product, 'price' | 'cost' | 'vat'>): number | null {
  const net = p.price / (1 + p.vat / 100);
  if (net <= 0) return null;
  return ((net - p.cost) / net) * 100;
}

const clean = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();

export function generateSku(category: ProductCategory, brand: string, products: Product[]): string {
  const prefix = `${clean(category).slice(0, 3)}-${(clean(brand) || 'GEN').slice(0, 3)}`;
  const used = new Set(products.map((p) => p.sku.toUpperCase()));
  for (let i = 0; i < 200; i++) {
    const sku = `${prefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
    if (!used.has(sku)) return sku;
  }
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

/** EAN-13 a uso interno (prefisso 200-299 riservato alla numerazione interna del negozio) */
export function generateBarcode(products: Product[]): string {
  const used = new Set(products.map((p) => p.barcode));
  for (;;) {
    const base = `20${String(Math.floor(Math.random() * 1e10)).padStart(10, '0')}`;
    const sum = base.split('').reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
    const code = base + String((10 - (sum % 10)) % 10);
    if (!used.has(code)) return code;
  }
}

export const productLabel = (p: Pick<Product, 'brand' | 'model'>) => `${p.brand} ${p.model}`.trim();
