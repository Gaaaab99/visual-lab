import { useMemo } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowRight, BellRing, CalendarDays, Euro, Glasses, Package, PackageCheck, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { ORDER_STATUS, addDays, eur, fullName, latestRx, orderTotals, todayISO } from '../../store/utils';
import type { ViewId } from '../../types';

interface Props {
  onNavigate: (v: ViewId, id?: string) => void;
}

const TYPE_COLOR: Record<string, string> = {
  'Esame della vista': 'bg-cyan-400',
  'Controllo lenti a contatto': 'bg-violet-400',
  'Applicazione LAC': 'bg-fuchsia-400',
  'Ritiro occhiali': 'bg-emerald-400',
  'Riparazione / assistenza': 'bg-amber-400',
  'Consulenza montatura': 'bg-sky-400',
  Altro: 'bg-slate-400',
};

export function StoreOverview({ onNavigate }: Props) {
  const { sales, orders, appointments, products, customers, ready } = useStore();
  const today = todayISO();

  const m = useMemo(() => {
    const now = new Date();
    const ym = today.slice(0, 7);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const dayOfMonth = now.getDate();
    const sum = (f: (iso: string) => boolean) => sales.filter((s) => f(s.date)).reduce((a, s) => a + s.total, 0);
    const todayTot = sum((d) => d.slice(0, 10) === today);
    const monthTot = sum((d) => d.slice(0, 7) === ym);
    // confronto a parità di giorni con il mese precedente
    const prevSameDays = sum((d) => d.slice(0, 7) === prev && Number(d.slice(8, 10)) <= dayOfMonth);
    const open = orders.filter((o) => !['consegnato', 'annullato', 'preventivo'].includes(o.status));
    const ready = orders.filter((o) => o.status === 'pronto');
    const late = open.filter((o) => o.status !== 'pronto' && o.expectedDate && o.expectedDate < today);
    const todayAppts = appointments.filter((a) => a.date === today && a.status !== 'annullato').sort((a, b) => a.time.localeCompare(b.time));
    const low = products.filter((p) => p.category !== 'Servizi' && p.minStock > 0 && p.stock <= p.minStock);
    const checks = customers.filter((c) => {
      const rx = latestRx(c);
      if (!rx) return false;
      const due = rx.nextCheck ?? addDays(rx.date, 365);
      return due <= addDays(today, 30);
    });
    const lac = customers.flatMap((c) => c.contactLenses.filter((f) => f.lastSupplyDate && f.supplyDays && addDays(f.lastSupplyDate, f.supplyDays) <= addDays(today, 14)));
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = addDays(today, i - 29);
      return { d, v: sum((x) => x.slice(0, 10) === d) };
    });
    return { todayTot, monthTot, prevSameDays, open, ready, late, todayAppts, low, recalls: checks.length + lac.length + ready.length, days };
  }, [sales, orders, appointments, products, customers, today]);

  const trend = m.prevSameDays ? ((m.monthTot - m.prevSameDays) / m.prevSameDays) * 100 : null;
  const maxDay = Math.max(1, ...m.days.map((d) => d.v));

  const kpis: { label: string; value: string; hint: string; icon: LucideIcon; tone: string; view: ViewId; focus?: string }[] = [
    { label: 'Incasso oggi', value: eur(m.todayTot), hint: `Mese ${eur(m.monthTot)}`, icon: Euro, tone: 'text-emerald-300 from-emerald-500/15', view: 'pos' },
    { label: 'Buste aperte', value: String(m.open.length), hint: `${m.ready.length} pronte · ${m.late.length} in ritardo`, icon: Glasses, tone: 'text-cyan-300 from-cyan-500/15', view: 'orders' },
    { label: 'Appuntamenti oggi', value: String(m.todayAppts.length), hint: m.todayAppts[0] ? `Prossimo alle ${m.todayAppts[0].time}` : 'Agenda libera', icon: CalendarDays, tone: 'text-violet-300 from-violet-500/15', view: 'agenda' },
    { label: 'Richiami da fare', value: String(m.recalls), hint: 'Controlli, LAC, ritiri', icon: BellRing, tone: 'text-amber-300 from-amber-500/15', view: 'recalls' },
    { label: 'Sotto scorta', value: String(m.low.length), hint: 'Articoli da riordinare', icon: Package, tone: 'text-rose-300 from-rose-500/15', view: 'inventory', focus: 'low' },
  ];

  if (!ready) return <div className="skeleton h-40 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <motion.button
            key={k.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            onClick={() => onNavigate(k.view, k.focus)}
            className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${k.tone.split(' ')[1]} to-transparent p-4 text-left transition-colors hover:border-white/15`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{k.label}</span>
              <k.icon size={17} className={k.tone.split(' ')[0]} />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{k.value}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{k.hint}</p>
          </motion.button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* incassi */}
        <div className="panel p-5 xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs text-slate-400">Incassi del mese</p>
              <p className="text-2xl font-semibold text-white">{eur(m.monthTot)}</p>
            </div>
            {trend !== null && (
              <span className={`chip ${trend >= 0 ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-rose-400/30 bg-rose-400/10 text-rose-200'}`}>
                {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {trend >= 0 ? '+' : ''}
                {trend.toFixed(0)}% vs stesso periodo mese scorso
              </span>
            )}
          </div>
          <div className="mt-4 flex h-28 items-end gap-1">
            {m.days.map((d, i) => (
              <div key={d.d} className="group relative flex-1">
                <motion.div
                  className={`w-full rounded-t ${d.d === today ? 'bg-gradient-to-t from-emerald-600 to-emerald-300' : d.v ? 'bg-gradient-to-t from-blue-600 to-cyan-400' : 'bg-white/[0.05]'}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, (d.v / maxDay) * 112)}px` }}
                  transition={{ delay: i * 0.01, duration: 0.4 }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-950 px-2 py-1 text-[10px] text-slate-200 group-hover:block">
                  {new Date(d.d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}: {eur(d.v)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Ultimi 30 giorni</p>
        </div>

        {/* agenda di oggi */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <CalendarDays size={16} className="text-violet-300" /> Oggi in agenda
            </p>
            <button className="text-xs text-cyan-300 hover:underline" onClick={() => onNavigate('agenda')}>
              Apri agenda
            </button>
          </div>
          {m.todayAppts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Nessun appuntamento oggi.</p>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {m.todayAppts.map((a) => (
                <li key={a.id}>
                  <button onClick={() => onNavigate('agenda', a.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]">
                    <span className="w-12 font-mono text-sm text-white">{a.time}</span>
                    <span className={`h-8 w-1 rounded-full ${TYPE_COLOR[a.type] ?? 'bg-slate-400'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">{a.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {a.type} · {a.duration} min
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <PackageCheck size={16} className="text-emerald-300" /> Buste da seguire
            </p>
            <button className="text-xs text-cyan-300 hover:underline" onClick={() => onNavigate('orders')}>
              Tutte le buste
            </button>
          </div>
          {[...m.ready, ...m.late].length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Nessuna busta pronta o in ritardo.</p>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {[...m.ready, ...m.late].slice(0, 6).map((o) => {
                const c = customers.find((x) => x.id === o.customerId);
                const late = m.late.includes(o);
                return (
                  <li key={o.id}>
                    <button onClick={() => onNavigate('orders', o.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">
                          {o.number} · {fullName(c)}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {o.type} · da incassare {eur(orderTotals(o).due)}
                        </span>
                      </span>
                      {late ? (
                        <span className="chip border-rose-400/30 bg-rose-400/10 text-rose-200">
                          <AlertTriangle size={11} /> In ritardo
                        </span>
                      ) : (
                        <span className={`chip ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Package size={16} className="text-rose-300" /> Scorte basse
            </p>
            <button className="text-xs text-cyan-300 hover:underline" onClick={() => onNavigate('inventory', 'low')}>
              Da riordinare
            </button>
          </div>
          {m.low.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Magazzino in ordine.</p>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {m.low.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <button onClick={() => onNavigate('inventory', p.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">
                        {p.brand} {p.model}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {p.category} · scorta minima {p.minStock}
                      </span>
                    </span>
                    <span className={`chip ${p.stock === 0 ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : 'border-amber-400/30 bg-amber-400/10 text-amber-200'}`}>{p.stock} pz</span>
                    <ArrowRight size={14} className="text-slate-600" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
