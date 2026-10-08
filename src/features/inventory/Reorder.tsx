import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Truck } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import type { Product } from '../../store/types';
import { eur } from '../../store/utils';
import { csvNum, downloadFile, localToday, toCsv } from '../pos/shared';
import { STOCK_TONE, needsReorder, productLabel, stockState, suggestedQty } from './shared';

export function Reorder({ onOpen }: { onOpen: (p: Product) => void }) {
  const { products } = useStore();
  const [qty, setQty] = useState<Record<string, number>>({});

  const groups = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products.filter(needsReorder)) {
      const k = p.supplier.trim() || 'Fornitore non indicato';
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'it')).map(([supplier, list]) => ({ supplier, list: list.sort((a, b) => productLabel(a).localeCompare(productLabel(b), 'it')) }));
  }, [products]);

  const q = (p: Product) => qty[p.id] ?? suggestedQty(p);

  const exportCsv = (sel: { supplier: string; list: Product[] }[]) => {
    const rows: (string | number)[][] = [['Fornitore', 'SKU', 'Codice a barre', 'Marca', 'Modello', 'Colore', 'Calibro', 'Giacenza', 'Scorta minima', 'Quantità da ordinare', 'Costo unitario', 'Totale']];
    for (const g of sel) for (const p of g.list) if (q(p) > 0) rows.push([g.supplier, p.sku, p.barcode, p.brand, p.model, p.color, p.size, p.stock, p.minStock, q(p), csvNum(p.cost), csvNum(p.cost * q(p))]);
    const name = sel.length === 1 ? sel[0].supplier.replace(/[^\w-]+/g, '_') : 'tutti';
    downloadFile(`ordine-fornitore-${name}-${localToday()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  if (!groups.length)
    return (
      <div className="panel flex flex-col items-center gap-2 py-14 text-center">
        <CheckCircle2 size={28} className="text-emerald-300" />
        <p className="text-sm text-slate-300">Nessun articolo sotto scorta.</p>
        <p className="text-xs text-slate-500">Gli articoli con giacenza minore o uguale alla scorta minima compariranno qui, raggruppati per fornitore.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-400">
          Quantità suggerita: porta la giacenza al doppio della scorta minima. Puoi modificarla prima di esportare.
        </p>
        <button className="btn-primary" onClick={() => exportCsv(groups)}>
          <Download size={15} /> Esporta tutti gli ordini
        </button>
      </div>
      {groups.map((g) => {
        const total = g.list.reduce((s, p) => s + p.cost * q(p), 0);
        return (
          <section key={g.supplier} className="panel overflow-hidden">
            <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <Truck size={16} className="text-cyan-300" />
              <h3 className="text-sm font-semibold text-white">{g.supplier}</h3>
              <span className="text-xs text-slate-500">
                {g.list.length} articoli · {eur(total)} a costo
              </span>
              <button className="btn-ghost ml-auto py-1.5 text-xs" onClick={() => exportCsv([g])}>
                <Download size={14} /> Esporta ordine fornitore
              </button>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-ink-900/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Articolo</th>
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2 text-right">Giacenza</th>
                    <th className="px-4 py-2 text-right">Minimo</th>
                    <th className="px-4 py-2 text-right">Da ordinare</th>
                    <th className="px-4 py-2 text-right">Costo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {g.list.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2">
                        <button className="text-left text-slate-200 hover:text-cyan-200 hover:underline" onClick={() => onOpen(p)}>
                          {productLabel(p)}
                        </button>
                        <p className="text-[11px] text-slate-500">{[p.category, p.color].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-400">{p.sku}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`chip ${STOCK_TONE[stockState(p)]}`}>{p.stock}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-400">{p.minStock}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          className="input ml-auto w-20 px-2 py-1 text-right"
                          value={q(p)}
                          onChange={(e) => setQty({ ...qty, [p.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                          aria-label="Quantità da ordinare"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-slate-300">{eur(p.cost * q(p))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
