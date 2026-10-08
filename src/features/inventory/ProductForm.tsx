import { useEffect, useState } from 'react';
import { PackagePlus, RefreshCw, Save } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { Product, ProductCategory } from '../../store/types';
import { DEFAULT_VAT, IS_MEDICAL_DEVICE, eur, newId } from '../../store/utils';
import { CATEGORIES, generateBarcode, generateSku } from './shared';

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function emptyProduct(): Product {
  return {
    id: '',
    sku: '',
    barcode: '',
    category: 'Montatura vista',
    brand: '',
    model: '',
    color: '',
    size: '',
    material: '',
    supplier: '',
    cost: 0,
    price: 0,
    vat: DEFAULT_VAT['Montatura vista'],
    medicalDevice: IS_MEDICAL_DEVICE['Montatura vista'],
    stock: 0,
    minStock: 1,
    location: '',
    updatedAt: '',
  };
}

export function ProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: (p: Product) => void }) {
  const { products, put } = useStore();
  const { notify } = useApp();
  const [p, setP] = useState<Product>(emptyProduct());
  const [busy, setBusy] = useState(false);
  const isNew = !product?.id;

  useEffect(() => {
    if (product) setP(product);
  }, [product]);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const setCategory = (c: ProductCategory) => setP((x) => ({ ...x, category: c, vat: DEFAULT_VAT[c], medicalDevice: IS_MEDICAL_DEVICE[c] }));

  const skuTaken = !!p.sku.trim() && products.some((x) => x.id !== p.id && x.sku.toLowerCase() === p.sku.trim().toLowerCase());
  const barcodeTaken = !!p.barcode.trim() && products.some((x) => x.id !== p.id && x.barcode === p.barcode.trim());
  const valid = p.brand.trim() && p.model.trim() && !skuTaken && !barcodeTaken && p.price >= 0;
  const margin = p.price > 0 ? ((p.price / (1 + p.vat / 100) - p.cost) / (p.price / (1 + p.vat / 100))) * 100 : 0;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const sku = p.sku.trim() || generateSku(p.category, p.brand, products);
      const initial = isNew ? p.stock : (products.find((x) => x.id === p.id)?.stock ?? p.stock);
      const now = new Date().toISOString();
      const doc: Product = { ...p, id: p.id || newId(), sku, barcode: p.barcode.trim(), brand: p.brand.trim(), model: p.model.trim(), stock: initial, updatedAt: now };
      await put('products', doc);
      // movimento registrato direttamente: adjustStock non vede ancora l'articolo appena creato
      if (isNew && initial > 0) await put('movements', { id: newId(), productId: doc.id, date: now, qty: initial, reason: 'Carico', note: 'Giacenza iniziale' });
      notify(isNew ? 'Articolo creato.' : 'Articolo aggiornato.');
      onSaved(doc);
    } catch {
      notify('Impossibile salvare l’articolo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      size="lg"
      icon={<PackagePlus size={18} />}
      title={isNew ? 'Nuovo articolo' : `Modifica ${product?.brand} ${product?.model}`}
      subtitle="La categoria imposta IVA e dispositivo medico predefiniti, modificabili sul singolo articolo."
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" onClick={() => void save()} disabled={!valid || busy}>
            <Save size={15} /> Salva
          </button>
        </>
      }
    >
      <form
        className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div>
          <label className="label" htmlFor="pf-cat">
            Categoria
          </label>
          <select id="pf-cat" className="input" value={p.category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pf-brand">
            Marca *
          </label>
          <input id="pf-brand" className="input" value={p.brand} onChange={(e) => set('brand', e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="pf-model">
            Modello *
          </label>
          <input id="pf-model" className="input" value={p.model} onChange={(e) => set('model', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-color">
            Colore
          </label>
          <input id="pf-color" className="input" value={p.color} onChange={(e) => set('color', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-size">
            Calibro-ponte-asta
          </label>
          <input id="pf-size" className="input" placeholder="52-18-145" value={p.size} onChange={(e) => set('size', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-mat">
            Materiale
          </label>
          <input id="pf-mat" className="input" value={p.material} onChange={(e) => set('material', e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="pf-sku">
            SKU
          </label>
          <div className="flex gap-2">
            <input id="pf-sku" className={`input font-mono ${skuTaken ? 'border-rose-400/60' : ''}`} placeholder="Automatico" value={p.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} />
            <button type="button" className="btn-ghost px-2.5" title="Genera SKU" onClick={() => set('sku', generateSku(p.category, p.brand, products))}>
              <RefreshCw size={14} />
            </button>
          </div>
          {skuTaken && <p className="mt-1 text-[11px] text-rose-300">SKU già usato da un altro articolo.</p>}
        </div>
        <div>
          <label className="label" htmlFor="pf-bc">
            Codice a barre (EAN)
          </label>
          <div className="flex gap-2">
            <input id="pf-bc" className={`input font-mono ${barcodeTaken ? 'border-rose-400/60' : ''}`} inputMode="numeric" value={p.barcode} onChange={(e) => set('barcode', e.target.value.trim())} placeholder="Leggi o genera" />
            <button type="button" className="btn-ghost px-2.5" title="Genera codice interno" onClick={() => set('barcode', generateBarcode(products))}>
              <RefreshCw size={14} />
            </button>
          </div>
          {barcodeTaken && <p className="mt-1 text-[11px] text-rose-300">Codice a barre già presente.</p>}
        </div>
        <div>
          <label className="label" htmlFor="pf-sup">
            Fornitore
          </label>
          <input id="pf-sup" className="input" list="pf-suppliers" value={p.supplier} onChange={(e) => set('supplier', e.target.value)} />
          <datalist id="pf-suppliers">
            {[...new Set(products.map((x) => x.supplier).filter(Boolean))].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="label" htmlFor="pf-cost">
            Costo (€, IVA escl.)
          </label>
          <input id="pf-cost" className="input" type="number" min={0} step="0.01" value={p.cost} onChange={(e) => set('cost', num(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="pf-price">
            Prezzo al pubblico (€, IVA incl.)
          </label>
          <input id="pf-price" className="input" type="number" min={0} step="0.01" value={p.price} onChange={(e) => set('price', num(e.target.value))} />
          {p.price > 0 && <p className="mt-1 text-[11px] text-slate-500">Margine sul netto IVA: {margin.toFixed(1).replace('.', ',')}% · imponibile {eur(p.price / (1 + p.vat / 100))}</p>}
        </div>
        <div>
          <label className="label" htmlFor="pf-vat">
            Aliquota IVA
          </label>
          <select id="pf-vat" className="input" value={p.vat} onChange={(e) => set('vat', Number(e.target.value))}>
            {[4, 5, 10, 22, 0].map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="pf-stock">
            {isNew ? 'Giacenza iniziale' : 'Giacenza'}
          </label>
          <input id="pf-stock" className="input" type="number" min={0} value={p.stock} disabled={!isNew} onChange={(e) => set('stock', Math.max(0, Math.floor(num(e.target.value))))} />
          {!isNew && <p className="mt-1 text-[11px] text-slate-500">Usa Carico o Rettifica inventario per variarla.</p>}
        </div>
        <div>
          <label className="label" htmlFor="pf-min">
            Scorta minima
          </label>
          <input id="pf-min" className="input" type="number" min={0} value={p.minStock} onChange={(e) => set('minStock', Math.max(0, Math.floor(num(e.target.value))))} />
        </div>
        <div>
          <label className="label" htmlFor="pf-loc">
            Ubicazione
          </label>
          <input id="pf-loc" className="input" placeholder="es. Vetrina A2, Cassetto 3" value={p.location} onChange={(e) => set('location', e.target.value)} />
        </div>

        <label className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-ink-900/40 p-3 text-sm text-slate-300 sm:col-span-2 lg:col-span-3">
          <input type="checkbox" className="mt-0.5" checked={p.medicalDevice} onChange={(e) => set('medicalDevice', e.target.checked)} />
          <span>
            Dispositivo medico con marcatura CE
            <span className="block text-xs text-slate-500">La spesa è detraibile e trasmissibile al Sistema TS con tipo spesa AD (montature e lenti graduate, lenti a contatto, soluzioni).</span>
          </span>
        </label>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
