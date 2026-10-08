import { useEffect, useState } from 'react';
import { BarChart3, FileSpreadsheet, ListOrdered, ShoppingCart, Store } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { Sale } from '../../store/types';
import { eur } from '../../store/utils';
import { PosTerminal, type PosPreset } from './PosTerminal';
import { SalesList } from './SalesList';
import { SalesReport } from './SalesReport';
import { StsExport } from './StsExport';
import { SaleDetail } from './SaleDetail';
import { localDay, localToday, type ViewProps } from './shared';

type Tab = 'pos' | 'vendite' | 'report' | 'sts';

const TABS: [Tab, string, typeof ShoppingCart][] = [
  ['pos', 'Nuova vendita', ShoppingCart],
  ['vendite', 'Vendite', ListOrdered],
  ['report', 'Report', BarChart3],
  ['sts', 'Sistema TS', FileSpreadsheet],
];

export function PosView({ focusId, onFocusConsumed, onNavigate }: ViewProps) {
  const { sales, ready } = useStore();
  const { notify } = useApp();
  const [tab, setTab] = useState<Tab>('pos');
  const [preset, setPreset] = useState<PosPreset | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusId) return;
    if (focusId === 'new' || focusId.startsWith('new:')) {
      setTab('pos');
      setPreset({ customerId: focusId.startsWith('new:') ? focusId.slice(4) : undefined, nonce: Date.now() });
      onFocusConsumed();
      return;
    }
    const s = sales.find((x) => x.id === focusId);
    if (s) {
      setTab('vendite');
      setDetailId(s.id);
      onFocusConsumed();
    } else if (ready) {
      notify('Vendita non trovata.', 'error');
      onFocusConsumed();
    }
  }, [focusId, sales, ready, onFocusConsumed, notify]);

  const detail = sales.find((s) => s.id === detailId) ?? null;
  const openSale = (s: Sale) => setDetailId(s.id);
  const today = localToday();
  const todayTotal = sales.filter((s) => localDay(s.date) === today).reduce((t, s) => t + s.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Negozio"
        title="Cassa e vendite"
        icon={<Store size={22} />}
        description="Vendita al banco con lettore di codici a barre, documento commerciale parlante per la detrazione, storico, resi, report e preparazione dei dati per il Sistema Tessera Sanitaria."
        actions={
          <div className="panel px-4 py-2 text-right">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Incasso di oggi</p>
            <p className="text-lg font-semibold text-white">{eur(todayTotal)}</p>
          </div>
        }
      />

      <div className="flex overflow-x-auto rounded-xl border border-white/10 bg-ink-900/50 p-1 sm:w-fit">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${tab === id ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* la cassa resta montata per non perdere il carrello cambiando scheda */}
      <div className={tab === 'pos' ? '' : 'hidden'}>
        <PosTerminal active={tab === 'pos' && !detail} preset={preset} onNavigate={onNavigate} />
      </div>
      {tab === 'vendite' && <SalesList onOpen={openSale} />}
      {tab === 'report' && <SalesReport />}
      {tab === 'sts' && <StsExport onOpen={openSale} />}

      <SaleDetail sale={detail} onClose={() => setDetailId(null)} onNavigate={onNavigate} onOpenSale={openSale} />
    </div>
  );
}
