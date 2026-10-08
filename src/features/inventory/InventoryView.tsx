import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowDown, ArrowUp, Boxes, Coins, Download, History, PackagePlus, PackageSearch, Search, Tag, Truck, Warehouse } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { Product, ProductCategory, StockMovement } from '../../store/types';
import { eur } from '../../store/utils';
import { csvNum, downloadFile, localToday, toCsv, type ViewProps } from '../pos/shared';
import { CATEGORIES, STOCK_TONE, marginPct, needsReorder, productLabel, stockState, tracksStock } from './shared';
import { ProductForm, emptyProduct } from './ProductForm';
import { ProductDetail } from './ProductDetail';
import { StockDialog, type StockMode } from './StockDialog';
import { LabelsDialog } from './Labels';
import { Reorder } from './Reorder';
import { MovementTable } from './MovementTable';

type Tab = 'prodotti' | 'movimenti' | 'riordino';
type StockFilter = '' | 'esaurito' | 'sotto' | 'disponibile';
type SortKey = 'articolo' | 'categoria' | 'prezzo' | 'costo' | 'margine' | 'giacenza' | 'ubicazione';

const STOCK_LABEL = { esaurito: 'Esaurito', sotto: 'Sotto scorta', ok: 'Disponibile', servizio: 'Servizio' } as const;
const REASONS: StockMovement['reason'][] = ['Carico', 'Vendita', 'Reso', 'Rettifica inventario', 'Busta'];

export function InventoryView({ focusId, onFocusConsumed }: ViewProps) {
  const { products, movements, ready } = useStore();
  const { notify } = useApp();
  const [tab, setTab] = useState<Tab>('prodotti');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ProductCategory | ''>('');
  const [supplier, setSupplier] = useState('');
  const [stockF, setStockF] = useState<StockFilter>('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'articolo', dir: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockOp, setStockOp] = useState<{ product: Product; mode: StockMode } | null>(null);
  const [labels, setLabels] = useState<Product[] | null>(null);

  const [mq, setMq] = useState('');
  const [mReason, setMReason] = useState<StockMovement['reason'] | ''>('');

  useEffect(() => {
    if (!focusId) return;
    if (focusId === 'new') {
      setTab('prodotti');
      setEditing(emptyProduct());
      onFocusConsumed();
    } else if (focusId === 'low') {
      setTab('riordino');
      onFocusConsumed();
    } else if (products.some((p) => p.id === focusId)) {
      setTab('prodotti');
      setDetailId(focusId);
      onFocusConsumed();
    } else if (ready) {
      notify('Articolo non trovato.', 'error');
      onFocusConsumed();
    }
  }, [focusId, products, ready, onFocusConsumed, notify]);

  const suppliers = useMemo(() => [...new Set(products.map((p) => p.supplier).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it')), [products]);

  const filtered = useMemo(() => {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const out = products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (supplier && p.supplier !== supplier) return false;
      const st = stockState(p);
      if (stockF === 'esaurito' && st !== 'esaurito') return false;
      if (stockF === 'sotto' && !needsReorder(p)) return false;
      if (stockF === 'disponibile' && st !== 'ok') return false;
      const hay = `${p.brand} ${p.model} ${p.sku} ${p.barcode} ${p.color}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
    const val = (p: Product): string | number => {
      switch (sort.key) {
        case 'articolo':
          return productLabel(p).toLowerCase();
        case 'categoria':
          return p.category;
        case 'prezzo':
          return p.price;
        case 'costo':
          return p.cost;
        case 'margine':
          return marginPct(p) ?? -999;
        case 'giacenza':
          return tracksStock(p) ? p.stock : Number.MAX_SAFE_INTEGER;
        case 'ubicazione':
          return p.location.toLowerCase();
      }
    };
    return out.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'it');
      return c * sort.dir;
    });
  }, [products, q, cat, supplier, stockF, sort]);

  const stats = useMemo(() => {
    const goods = products.filter(tracksStock);
    const pcs = goods.reduce((s, p) => s + Math.max(0, p.stock), 0);
    return [
      { label: 'Articoli', value: products.length.toLocaleString('it-IT'), icon: PackageSearch },
      { label: 'Pezzi a magazzino', value: pcs.toLocaleString('it-IT'), icon: Boxes },
      { label: 'Valore a costo', value: eur(goods.reduce((s, p) => s + Math.max(0, p.stock) * p.cost, 0)), icon: Coins },
      { label: 'Valore a prezzo', value: eur(goods.reduce((s, p) => s + Math.max(0, p.stock) * p.price, 0)), icon: Tag },
      { label: 'Sotto scorta', value: String(products.filter(needsReorder).length), icon: AlertTriangle, warn: true },
    ];
  }, [products]);

  const lowCount = products.filter(needsReorder).length;

  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }));
  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const exportCsv = () => {
    const rows: (string | number)[][] = [['SKU', 'Codice a barre', 'Categoria', 'Marca', 'Modello', 'Colore', 'Calibro', 'Materiale', 'Fornitore', 'Costo', 'Prezzo', 'IVA %', 'Dispositivo medico', 'Giacenza', 'Scorta minima', 'Ubicazione', 'Valore a costo']];
    for (const p of filtered)
      rows.push([p.sku, p.barcode, p.category, p.brand, p.model, p.color, p.size, p.material, p.supplier, csvNum(p.cost), csvNum(p.price), p.vat, p.medicalDevice ? 'SI' : 'NO', tracksStock(p) ? p.stock : '', tracksStock(p) ? p.minStock : '', p.location, csvNum(Math.max(0, p.stock) * p.cost)]);
    downloadFile(`magazzino-${localToday()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  const filteredMovements = useMemo(() => {
    const t = mq.trim().toLowerCase();
    return movements
      .filter((m) => {
        if (mReason && m.reason !== mReason) return false;
        if (!t) return true;
        const p = products.find((x) => x.id === m.productId);
        return `${p ? `${p.brand} ${p.model} ${p.sku} ${p.barcode}` : ''} ${m.note}`.toLowerCase().includes(t);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [movements, products, mq, mReason]);

  const Th = ({ k, children, right }: { k: SortKey; children: string; right?: boolean }) => (
    <th className={`px-3 py-2.5 ${right ? 'text-right' : ''}`}>
      <button className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-slate-200 ${sort.key === k ? 'text-cyan-200' : ''}`} onClick={() => toggleSort(k)}>
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );

  const selectedProducts = products.filter((p) => selected.has(p.id));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Negozio"
        title="Magazzino"
        icon={<Warehouse size={22} />}
        description="Montature, occhiali da sole, lenti e accessori: giacenze, carichi, inventario, riordino ai fornitori ed etichette prezzo."
        actions={
          <>
            <button className="btn-ghost" onClick={exportCsv} disabled={!filtered.length}>
              <Download size={16} /> CSV
            </button>
            <button className="btn-primary" onClick={() => setEditing(emptyProduct())}>
              <PackagePlus size={16} /> Nuovo articolo
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, warn }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`panel flex items-center gap-3 p-4 ${i === 4 ? 'col-span-2 md:col-span-1' : ''}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${warn && lowCount ? 'bg-amber-500/10 text-amber-300' : 'bg-cyan-500/10 text-cyan-300'}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-base leading-tight font-semibold break-words text-white 2xl:text-lg">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex overflow-x-auto rounded-xl border border-white/10 bg-ink-900/50 p-1 sm:w-fit">
        {(
          [
            ['prodotti', 'Articoli', PackageSearch],
            ['movimenti', 'Movimenti', History],
            ['riordino', `Da riordinare${lowCount ? ` (${lowCount})` : ''}`, Truck],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${tab === id ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'prodotti' && (
        <div className="space-y-4">
          <div className="panel flex flex-wrap items-center gap-3 p-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
              <input className="input pl-9" placeholder="Marca, modello, SKU o codice a barre…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value as ProductCategory | '')} aria-label="Categoria">
              <option value="">Tutte le categorie</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select className="input w-auto max-w-[180px]" value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="Fornitore">
              <option value="">Tutti i fornitori</option>
              {suppliers.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select className="input w-auto" value={stockF} onChange={(e) => setStockF(e.target.value as StockFilter)} aria-label="Stato giacenza">
              <option value="">Qualsiasi giacenza</option>
              <option value="disponibile">Disponibili</option>
              <option value="sotto">Sotto scorta</option>
              <option value="esaurito">Esauriti</option>
            </select>
          </div>

          {selected.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-2 text-sm">
              <span className="text-cyan-100">{selected.size} selezionati</span>
              <button className="btn-ghost py-1 text-xs" onClick={() => setLabels(selectedProducts)}>
                <Tag size={14} /> Stampa etichette
              </button>
              <button className="ml-auto text-xs text-slate-400 hover:text-white" onClick={() => setSelected(new Set())}>
                Deseleziona
              </button>
            </motion.div>
          )}

          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-ink-900/60 text-left text-[11px] text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleziona tutti" />
                    </th>
                    <Th k="articolo">Articolo</Th>
                    <Th k="categoria">Categoria</Th>
                    <th className="px-3 py-2.5 uppercase tracking-wider">Colore / calibro</th>
                    <Th k="prezzo" right>
                      Prezzo
                    </Th>
                    <Th k="costo" right>
                      Costo
                    </Th>
                    <Th k="margine" right>
                      Margine
                    </Th>
                    <Th k="giacenza" right>
                      Giacenza
                    </Th>
                    <Th k="ubicazione">Ubicazione</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filtered.map((p) => {
                    const st = stockState(p);
                    const m = marginPct(p);
                    return (
                      <tr key={p.id} className="cursor-pointer transition-colors hover:bg-white/[0.03]" onClick={() => setDetailId(p.id)}>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Seleziona ${productLabel(p)}`} />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-100">{productLabel(p)}</p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {p.sku}
                            {p.barcode ? ` · ${p.barcode}` : ''}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          {p.category}
                          {p.medicalDevice && <span className="chip ml-1.5 border-emerald-400/30 px-1.5 py-0 text-[10px] text-emerald-200">AD</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-400">{[p.color, p.size].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="px-3 py-2 text-right font-medium text-white">{eur(p.price)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{eur(p.cost)}</td>
                        <td className={`px-3 py-2 text-right ${m === null ? 'text-slate-500' : m < 30 ? 'text-amber-300' : 'text-slate-300'}`}>{m === null ? '—' : `${m.toFixed(0)}%`}</td>
                        <td className="px-3 py-2 text-right">
                          {tracksStock(p) ? (
                            <span className={`chip ${STOCK_TONE[st]}`} title={`${STOCK_LABEL[st]} · scorta minima ${p.minStock}`}>
                              {p.stock}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">servizio</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-400">{p.location || '—'}</td>
                      </tr>
                    );
                  })}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                        Nessun articolo corrisponde ai filtri.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="border-t border-white/[0.06] px-4 py-2 text-xs text-slate-500">
              {filtered.length} di {products.length} articoli · margine calcolato sul prezzo al netto dell’IVA
            </p>
          </div>
        </div>
      )}

      {tab === 'movimenti' && (
        <div className="space-y-4">
          <div className="panel flex flex-wrap items-center gap-3 p-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
              <input className="input pl-9" placeholder="Articolo, SKU, note o numero documento…" value={mq} onChange={(e) => setMq(e.target.value)} />
            </div>
            <select className="input w-auto" value={mReason} onChange={(e) => setMReason(e.target.value as StockMovement['reason'] | '')} aria-label="Causale">
              <option value="">Tutte le causali</option>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="panel p-3">
            <MovementTable movements={filteredMovements} showProduct onOpenProduct={(id) => setDetailId(id)} />
          </div>
        </div>
      )}

      {tab === 'riordino' && <Reorder onOpen={(p) => setDetailId(p.id)} />}

      <ProductDetail
        productId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(p) => {
          setDetailId(null);
          setEditing(p);
        }}
        onStock={(p, mode) => setStockOp({ product: p, mode })}
        onLabels={(p) => setLabels([p])}
      />
      <ProductForm
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={(p) => {
          setEditing(null);
          setDetailId(p.id);
        }}
      />
      <StockDialog product={stockOp?.product ?? null} mode={stockOp?.mode ?? 'carico'} onClose={() => setStockOp(null)} />
      <LabelsDialog products={labels} onClose={() => setLabels(null)} />
    </div>
  );
}
