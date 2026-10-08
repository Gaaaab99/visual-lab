import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CalendarClock, ClipboardList, Columns3, Euro, FilePlus2, Filter, List, PackageCheck, PackageOpen, Search, Wallet } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useStore } from '../../store/StoreContext';
import type { Order, OrderStatus, OrderType } from '../../store/types';
import type { ViewId } from '../../types';
import { ORDER_FLOW, ORDER_STATUS, daysBetween, eur, fmtDate, fmtDateShort, fullName, orderTotals, todayISO } from '../../store/utils';
import { ORDER_TYPES, emptyOrder, frameLabel, isLate, isOpen, lastStatusDate } from './helpers';
import { OrderDetail, StatusChip } from './OrderDetail';
import { OrderEditor } from './OrderEditor';

interface Props {
  focusId: string | null;
  onFocusConsumed: () => void;
  onNavigate: (view: ViewId, focusId?: string) => void;
}

type Mode = 'board' | 'list';
interface EditorState {
  order: Order;
  isNew: boolean;
}

const MODE_KEY = 'visual-lab:orders-mode';
const readMode = (): Mode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'list' ? 'list' : 'board';
  } catch {
    return 'board';
  }
};

export function OrdersView({ focusId, onFocusConsumed, onNavigate }: Props) {
  const { orders, customers, settings, ready, customerById } = useStore();
  const [mode, setModeState] = useState<Mode>(readMode);
  const [q, setQ] = useState('');
  const [type, setType] = useState<OrderType | 'tutti'>('tutti');
  const [lab, setLab] = useState('tutti');
  const [onlyLate, setOnlyLate] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* archiviazione non disponibile */
    }
  };

  const openNew = (customerId = '') => setEditor({ order: emptyOrder(customerId, settings.defaultLab), isNew: true });

  useEffect(() => {
    if (!focusId || !ready) return;
    if (focusId === 'new') openNew();
    else if (focusId.startsWith('new:')) openNew(focusId.slice(4));
    else if (orders.some((o) => o.id === focusId)) setDetailId(focusId);
    onFocusConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, ready]);

  const today = todayISO();
  const labs = useMemo(() => [...new Set(orders.map((o) => o.lab).filter(Boolean))].sort(), [orders]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (type !== 'tutti' && o.type !== type) return false;
        if (lab !== 'tutti' && o.lab !== lab) return false;
        if (onlyLate && !isLate(o, today)) return false;
        if (!showCancelled && o.status === 'annullato') return false;
        if (!t) return true;
        const c = customerById(o.customerId);
        return `${o.number} ${c ? `${c.firstName} ${c.lastName} ${c.lastName} ${c.firstName} ${c.code}` : ''} ${o.frame.brand} ${o.frame.model} ${o.lenses.brand} ${o.lab}`
          .toLowerCase()
          .includes(t);
      })
      .sort((a, b) => (a.expectedDate ?? '9999').localeCompare(b.expectedDate ?? '9999') || b.createdAt.localeCompare(a.createdAt));
  }, [orders, q, type, lab, onlyLate, showCancelled, today, customerById]);

  const stats = useMemo(() => {
    const open = orders.filter(isOpen);
    return [
      { label: 'Buste aperte', value: String(open.length), icon: PackageOpen, tone: 'text-cyan-300 bg-cyan-500/10' },
      { label: 'Pronte da consegnare', value: String(orders.filter((o) => o.status === 'pronto').length), icon: PackageCheck, tone: 'text-emerald-300 bg-emerald-500/10' },
      { label: 'In ritardo', value: String(orders.filter((o) => isLate(o, today)).length), icon: AlertTriangle, tone: 'text-amber-300 bg-amber-500/10' },
      { label: 'Valore aperto', value: eur(open.reduce((s, o) => s + orderTotals(o).total, 0)), icon: Euro, tone: 'text-sky-300 bg-sky-500/10' },
      { label: 'Acconti incassati', value: eur(open.reduce((s, o) => s + o.deposit + o.paid, 0)), icon: Wallet, tone: 'text-violet-300 bg-violet-500/10' },
    ];
  }, [orders, today]);

  const columns: OrderStatus[] = showCancelled ? [...ORDER_FLOW, 'annullato'] : ORDER_FLOW;
  const inColumn = (s: OrderStatus) =>
    filtered.filter((o) => o.status === s && (s !== 'consegnato' || daysBetween(lastStatusDate(o).slice(0, 10), today) <= 30));

  const detail = detailId ? orders.find((o) => o.id === detailId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Laboratorio"
        title="Buste di lavoro"
        icon={<ClipboardList size={22} />}
        description="Ordini al laboratorio dal preventivo alla consegna: prescrizione, montatura, lenti, centratura, acconti, stampe e dichiarazione di conformità."
        actions={
          <button className="btn-primary" onClick={() => openNew()}>
            <FilePlus2 size={16} /> Nuova busta
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, tone }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="panel flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tabular-nums text-white">{value}</p>
              <p className="truncate text-xs text-slate-500">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Cerca numero, cliente, montatura, laboratorio…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Filter size={15} className="hidden text-slate-500 sm:block" />
        <select className="input w-auto min-w-0 py-1.5 text-xs" value={type} onChange={(e) => setType(e.target.value as OrderType | 'tutti')} aria-label="Tipo">
          <option value="tutti">Tutti i tipi</option>
          {ORDER_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select className="input w-auto min-w-0 max-w-48 py-1.5 text-xs" value={lab} onChange={(e) => setLab(e.target.value)} aria-label="Laboratorio">
          <option value="tutti">Tutti i laboratori</option>
          {labs.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-300">
          <input type="checkbox" className="accent-amber-500" checked={onlyLate} onChange={(e) => setOnlyLate(e.target.checked)} /> Solo in ritardo
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-300">
          <input type="checkbox" className="accent-rose-500" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Annullate
        </label>
        <div className="ml-auto flex rounded-xl border border-white/10 p-0.5">
          {(
            [
              ['board', 'Bacheca', Columns3],
              ['list', 'Elenco', List],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${mode === id ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {!ready ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : mode === 'board' ? (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {columns.map((s) => {
            const list = inColumn(s);
            const st = ORDER_STATUS[s];
            return (
              <div key={s} className="flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-white/[0.06] bg-ink-900/40 sm:w-[280px] xl:w-auto xl:min-w-[230px] xl:max-w-none xl:flex-1">
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <span className={`h-2 w-2 rounded-full ${st.dot}`} /> {st.label}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs tabular-nums text-slate-400">{list.length}</span>
                </div>
                <div className="flex min-h-24 flex-col gap-2 p-2">
                  {list.map((o) => (
                    <OrderCard key={o.id} order={o} onOpen={() => setDetailId(o.id)} today={today} />
                  ))}
                  {list.length === 0 && <p className="py-6 text-center text-xs text-slate-600">Nessuna busta</p>}
                  {s === 'consegnato' && list.length > 0 && <p className="text-center text-[10px] text-slate-600">Ultimi 30 giorni</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-14 text-center text-sm text-slate-500">{orders.length ? 'Nessuna busta corrisponde ai filtri.' : 'Nessuna busta: creane una con «Nuova busta».'}</p>
          ) : (
            <>
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3 font-medium">Busta</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 font-medium">Consegna</th>
                    <th className="px-4 py-3 text-right font-medium">Totale</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const c = customerById(o.customerId);
                    const t = orderTotals(o);
                    const late = isLate(o, today);
                    return (
                      <tr key={o.id} onClick={() => setDetailId(o.id)} className="cursor-pointer border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.03]">
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{o.number}</td>
                        <td className="px-4 py-3">
                          {c ? (
                            <button
                              className="text-left text-slate-100 hover:text-cyan-200 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate('customers', c.id);
                              }}
                            >
                              {fullName(c)}
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{o.type}</td>
                        <td className="px-4 py-3">
                          <StatusChip status={o.status} />
                        </td>
                        <td className={`px-4 py-3 ${late ? 'text-amber-300' : 'text-slate-400'}`}>
                          {fmtDate(o.expectedDate)}
                          {late && <span className="chip ml-2 border-amber-400/30 bg-amber-400/10 text-amber-200">in ritardo</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-200">{eur(t.total)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${t.due > 0 ? 'text-white' : 'text-slate-500'}`}>{eur(t.due)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="divide-y divide-white/[0.04] md:hidden">
                {filtered.map((o) => (
                  <div key={o.id} className="p-2">
                    <OrderCard order={o} onOpen={() => setDetailId(o.id)} today={today} showStatus />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {detail && (
        <OrderDetail
          order={detail}
          onClose={() => setDetailId(null)}
          onEdit={(o) => {
            setDetailId(null);
            setEditor({ order: o, isNew: false });
          }}
          onOpenCustomer={(id) => {
            setDetailId(null);
            onNavigate('customers', id);
          }}
        />
      )}

      {editor && (
        <OrderEditor
          key={editor.order.id}
          initial={editor.order}
          isNew={editor.isNew}
          onClose={() => setEditor(null)}
          onSaved={(o) => {
            setEditor(null);
            setDetailId(o.id);
          }}
        />
      )}

      {customers.length === 0 && ready && <p className="text-center text-xs text-slate-500">Nessun cliente in anagrafica: crea prima un cliente per aprire una busta.</p>}
    </div>
  );
}

function OrderCard({ order: o, onOpen, today, showStatus = false }: { order: Order; onOpen: () => void; today: string; showStatus?: boolean }) {
  const { customerById } = useStore();
  const c = customerById(o.customerId);
  const t = orderTotals(o);
  const late = isLate(o, today);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-xl border bg-ink-850/80 p-3 text-left transition-colors hover:border-cyan-400/30 hover:bg-ink-800 ${late ? 'border-amber-400/30' : 'border-white/[0.06]'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-500">{o.number}</span>
        {showStatus ? <StatusChip status={o.status} /> : late && <span className="chip border-amber-400/30 bg-amber-400/10 text-[10px] text-amber-200">in ritardo</span>}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-white">{c ? fullName(c) : 'Cliente non trovato'}</p>
      <p className="truncate text-xs text-slate-400">{o.type}</p>
      {o.type !== 'Lenti a contatto' && o.type !== 'Solo lenti' && <p className="mt-1.5 truncate text-xs text-slate-500">{frameLabel(o)}</p>}
      {o.type !== 'Riparazione' && (
        <p className="truncate text-xs text-slate-500">
          {[o.lenses.brand, o.lenses.design !== '—' ? o.lenses.design : '', o.type !== 'Lenti a contatto' ? o.lenses.index : ''].filter(Boolean).join(' · ')}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={`flex items-center gap-1 ${late ? 'text-amber-300' : 'text-slate-500'}`}>
          <CalendarClock size={12} /> {o.expectedDate ? fmtDateShort(o.expectedDate) : '—'}
          {showStatus && late && ' · in ritardo'}
        </span>
        <span className={`tabular-nums ${t.due > 0 && o.status !== 'annullato' ? 'font-semibold text-slate-100' : 'text-slate-500'}`}>{t.due > 0 ? `da incassare ${eur(t.due)}` : 'saldato'}</span>
      </div>
    </button>
  );
}
