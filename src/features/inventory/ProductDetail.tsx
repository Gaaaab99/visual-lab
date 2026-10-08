import { useMemo, useState } from 'react';
import { ClipboardCheck, Package, PackageOpen, Pencil, Tag, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { Product } from '../../store/types';
import { eur } from '../../store/utils';
import { STOCK_TONE, marginPct, productLabel, stockState, tracksStock } from './shared';
import { MovementTable } from './MovementTable';

export function ProductDetail({
  productId,
  onClose,
  onEdit,
  onStock,
  onLabels,
}: {
  productId: string | null;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onStock: (p: Product, mode: 'carico' | 'rettifica') => void;
  onLabels: (p: Product) => void;
}) {
  const { productById, movements, remove } = useStore();
  const { notify } = useApp();
  const [confirm, setConfirm] = useState(false);
  const p = productById(productId ?? undefined);
  const history = useMemo(() => movements.filter((m) => m.productId === productId).sort((a, b) => b.date.localeCompare(a.date)), [movements, productId]);

  const del = async () => {
    if (!p) return;
    await remove('products', p.id);
    notify('Articolo eliminato.', 'info');
    setConfirm(false);
    onClose();
  };

  const m = p ? marginPct(p) : null;
  const st = p ? stockState(p) : 'ok';
  const facts: [string, string][] = p
    ? [
        ['Categoria', p.category],
        ['SKU', p.sku],
        ['Codice a barre', p.barcode || '—'],
        ['Fornitore', p.supplier || '—'],
        ['Colore', p.color || '—'],
        ['Calibro', p.size || '—'],
        ['Materiale', p.material || '—'],
        ['Ubicazione', p.location || '—'],
        ['Prezzo', eur(p.price)],
        ['Costo', eur(p.cost)],
        ['Margine', m === null ? '—' : `${m.toFixed(1).replace('.', ',')}%`],
        ['IVA', `${p.vat}%${p.medicalDevice ? ' · dispositivo medico (AD)' : ''}`],
      ]
    : [];

  return (
    <Modal
      open={!!p}
      onClose={onClose}
      size="lg"
      icon={<Package size={18} />}
      title={p ? productLabel(p) : ''}
      subtitle={p ? `${p.category}${p.color ? ` · ${p.color}` : ''}` : undefined}
      footer={
        p &&
        (confirm ? (
          <>
            <span className="mr-auto text-sm text-rose-200">Eliminare definitivamente l’articolo? I movimenti restano nello storico.</span>
            <button className="btn-ghost" onClick={() => setConfirm(false)}>
              Annulla
            </button>
            <button className="btn-danger" onClick={() => void del()}>
              <Trash2 size={15} /> Elimina
            </button>
          </>
        ) : (
          <>
            <button className="btn-ghost mr-auto text-rose-300" onClick={() => setConfirm(true)}>
              <Trash2 size={15} /> Elimina
            </button>
            <button className="btn-ghost" onClick={() => onLabels(p)}>
              <Tag size={15} /> Etichetta
            </button>
            {tracksStock(p) && (
              <>
                <button className="btn-ghost" onClick={() => onStock(p, 'rettifica')}>
                  <ClipboardCheck size={15} /> Rettifica
                </button>
                <button className="btn-ghost" onClick={() => onStock(p, 'carico')}>
                  <PackageOpen size={15} /> Carico
                </button>
              </>
            )}
            <button className="btn-primary" onClick={() => onEdit(p)}>
              <Pencil size={15} /> Modifica
            </button>
          </>
        ))
      }
    >
      {p && (
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`rounded-2xl border px-4 py-3 ${STOCK_TONE[st]}`}>
              <p className="text-[11px] uppercase tracking-wider opacity-80">Giacenza</p>
              <p className="text-2xl font-semibold">{tracksStock(p) ? p.stock : '—'}</p>
            </div>
            {tracksStock(p) && (
              <div className="text-sm text-slate-400">
                Scorta minima <strong className="text-slate-200">{p.minStock}</strong>
                <br />
                Valore a costo <strong className="text-slate-200">{eur(Math.max(0, p.stock) * p.cost)}</strong>
              </div>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-white/[0.04] py-1.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className={`text-right text-slate-200 ${k === 'SKU' || k === 'Codice a barre' ? 'font-mono text-xs' : ''}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white">Movimenti di magazzino</h3>
            <MovementTable movements={history} showProduct={false} />
          </div>
        </div>
      )}
    </Modal>
  );
}
