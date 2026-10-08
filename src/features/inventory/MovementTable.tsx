import type { StockMovement } from '../../store/types';
import { useStore } from '../../store/StoreContext';
import { productLabel } from './shared';

const REASON_TONE: Record<StockMovement['reason'], string> = {
  Carico: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  Vendita: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  Reso: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  'Rettifica inventario': 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  Busta: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
};

export function MovementTable({ movements, showProduct, onOpenProduct, limit = 300 }: { movements: StockMovement[]; showProduct: boolean; onOpenProduct?: (id: string) => void; limit?: number }) {
  const { productById } = useStore();
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-ink-900/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2">Data</th>
            {showProduct && <th className="px-3 py-2">Articolo</th>}
            <th className="px-3 py-2">Causale</th>
            <th className="px-3 py-2 text-right">Q.tà</th>
            <th className="px-3 py-2">Note / documento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {movements.slice(0, limit).map((m) => {
            const p = productById(m.productId);
            return (
              <tr key={m.id}>
                <td className="px-3 py-2 whitespace-nowrap text-slate-400">{new Date(m.date).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                {showProduct && (
                  <td className="px-3 py-2">
                    {p ? (
                      <button className="text-left text-slate-200 hover:text-cyan-200 hover:underline" onClick={() => onOpenProduct?.(p.id)}>
                        {productLabel(p)}
                      </button>
                    ) : (
                      <span className="text-slate-500">Articolo eliminato</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2">
                  <span className={`chip ${REASON_TONE[m.reason]}`}>{m.reason}</span>
                </td>
                <td className={`px-3 py-2 text-right font-medium ${m.qty > 0 ? 'text-emerald-300' : m.qty < 0 ? 'text-rose-300' : 'text-slate-400'}`}>
                  {m.qty > 0 ? '+' : ''}
                  {m.qty}
                </td>
                <td className="px-3 py-2 text-slate-400">{m.note || '—'}</td>
              </tr>
            );
          })}
          {!movements.length && (
            <tr>
              <td colSpan={showProduct ? 5 : 4} className="px-3 py-8 text-center text-slate-500">
                Nessun movimento.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {movements.length > limit && <p className="border-t border-white/[0.06] px-3 py-2 text-xs text-slate-500">Mostrati i primi {limit} movimenti su {movements.length}.</p>}
    </div>
  );
}
