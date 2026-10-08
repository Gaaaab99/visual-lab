import { useEffect, useState } from 'react';
import { ClipboardCheck, PackageOpen } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { Product } from '../../store/types';
import { newId } from '../../store/utils';
import { productLabel } from './shared';

export type StockMode = 'carico' | 'rettifica';

export function StockDialog({ product, mode, onClose }: { product: Product | null; mode: StockMode; onClose: () => void }) {
  const { adjustStock, productById, put } = useStore();
  const { notify } = useApp();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const current = productById(product?.id) ?? product;

  useEffect(() => {
    if (!product) return;
    setQty(mode === 'carico' ? 1 : product.stock);
    setNote('');
    setCost('');
  }, [product, mode]);

  const delta = current ? (mode === 'carico' ? qty : qty - current.stock) : 0;
  const valid = mode === 'carico' ? qty > 0 : qty >= 0 && delta !== 0;

  const save = async () => {
    if (!current || !valid) return;
    setBusy(true);
    try {
      const reason = mode === 'carico' ? 'Carico' : 'Rettifica inventario';
      const text = mode === 'carico' ? note.trim() : `Conteggio ${qty} (era ${current.stock})${note.trim() ? ` · ${note.trim()}` : ''}`;
      if (mode === 'carico' && cost !== '' && cost !== current.cost) {
        // aggiornamento del costo insieme alla giacenza, in un solo salvataggio
        const now = new Date().toISOString();
        await put('products', { ...current, cost, stock: current.stock + delta, updatedAt: now });
        await put('movements', { id: newId(), productId: current.id, date: now, qty: delta, reason, note: text });
      } else {
        await adjustStock(current.id, delta, reason, text);
      }
      notify(mode === 'carico' ? `Caricati ${qty} pz di ${productLabel(current)}.` : `Giacenza di ${productLabel(current)} rettificata a ${qty}.`);
      onClose();
    } catch {
      notify('Operazione di magazzino non riuscita.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      size="sm"
      icon={mode === 'carico' ? <PackageOpen size={18} /> : <ClipboardCheck size={18} />}
      title={mode === 'carico' ? 'Carico merce' : 'Rettifica inventario'}
      subtitle={current ? `${productLabel(current)} · giacenza attuale ${current.stock}` : undefined}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" disabled={!valid || busy} onClick={() => void save()}>
            Conferma
          </button>
        </>
      }
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div>
          <label className="label" htmlFor="sd-qty">
            {mode === 'carico' ? 'Quantità ricevuta' : 'Quantità contata'}
          </label>
          <input id="sd-qty" className="input text-lg" type="number" min={mode === 'carico' ? 1 : 0} value={qty} autoFocus onChange={(e) => setQty(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
          {current && (
            <p className="mt-1 text-xs text-slate-500">
              Nuova giacenza: <strong className="text-slate-200">{current.stock + delta}</strong>
              {mode === 'rettifica' && delta !== 0 && <span className={delta > 0 ? 'text-emerald-300' : 'text-rose-300'}> ({delta > 0 ? '+' : ''}{delta})</span>}
            </p>
          )}
        </div>
        {mode === 'carico' && (
          <div>
            <label className="label" htmlFor="sd-cost">
              Costo unitario (facoltativo)
            </label>
            <input id="sd-cost" className="input" type="number" min={0} step="0.01" placeholder={current ? String(current.cost) : ''} value={cost} onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="sd-note">
            {mode === 'carico' ? 'Numero DDT / note' : 'Note'}
          </label>
          <input id="sd-note" className="input" placeholder={mode === 'carico' ? 'es. DDT 1234 del 05/10' : 'es. inventario annuale'} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
