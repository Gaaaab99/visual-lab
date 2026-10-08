import { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Receipt, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../../store/StoreContext';
import type { Sale } from '../../store/types';
import { eur, lineTotal } from '../../store/utils';
import { MONTHS_SHORT, lineCategory, localDay, localToday, saleGross } from './shared';

const compact = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k` : Math.round(n).toLocaleString('it-IT'));

/** Scala "pulita" per l'asse y */
function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

interface Bar {
  key: string;
  label: string;
  tip: string;
  value: number;
  highlight?: boolean;
}

/** Istogramma verticale in SVG puro, con tooltip al passaggio del mouse */
function ColumnChart({ bars, labelEvery = 1, height = 200 }: { bars: Bar[]; labelEvery?: number; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const padL = 40;
  const padB = 22;
  const padT = 10;
  const max = niceMax(Math.max(...bars.map((b) => b.value), 0));
  const plotW = W - padL - 6;
  const plotH = H - padB - padT;
  const step = plotW / Math.max(1, bars.length);
  const bw = Math.max(2, step - 2);
  const y = (v: number) => padT + plotH - (Math.max(0, v) / max) * plotH;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const h = hover !== null ? bars[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafico a colonne" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="rgb(255 255 255 / 0.06)" />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="11" fill="#64748b">
              {compact(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const x = padL + i * step + (step - bw) / 2;
          const top = y(b.value);
          const bh = Math.max(0, padT + plotH - top);
          const r = Math.min(4, bw / 2, bh);
          return (
            <g key={b.key} onMouseEnter={() => setHover(i)}>
              <rect x={padL + i * step} y={padT} width={step} height={plotH} fill="transparent" />
              {bh > 0 && (
                <path
                  d={`M${x},${padT + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${padT + plotH} Z`}
                  fill={b.highlight ? '#22d3ee' : '#0891b2'}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  style={{ transition: 'opacity .15s' }}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#64748b">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={padL} x2={W} y1={padT + plotH} y2={padT + plotH} stroke="rgb(255 255 255 / 0.15)" />
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-800 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl"
          style={{ left: `${Math.min(88, Math.max(12, ((padL + hover * step + step / 2) / W) * 100))}%` }}
        >
          <p className="text-slate-400">{h.tip}</p>
          <p className="font-semibold text-white">{eur(h.value)}</p>
        </div>
      )}
    </div>
  );
}

/** Barre orizzontali per ripartizioni (valore e quota sempre etichettati) */
function SplitBars({ rows }: { rows: { label: string; value: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">Nessun dato nel periodo.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${eur(r.value)}`}>
          <div className="mb-1 flex justify-between gap-2 text-xs">
            <span className="truncate text-slate-300">{r.label}</span>
            <span className="shrink-0 text-slate-400">
              {eur(r.value)} · <span className="text-slate-500">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
          <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-2 w-full" aria-hidden>
            <rect x="0" y="0" width="100" height="6" rx="3" fill="rgb(255 255 255 / 0.05)" />
            <rect x="0" y="0" width={Math.max(0.5, (Math.max(0, r.value) / max) * 100)} height="6" rx="3" fill="#0891b2" className="transition-[fill] group-hover:fill-cyan-400" />
          </svg>
        </li>
      ))}
    </ul>
  );
}

export function SalesReport() {
  const { sales, productById } = useStore();
  const [splitPeriod, setSplitPeriod] = useState<'mese' | 'anno' | '12'>('anno');

  const data = useMemo(() => {
    const today = localToday();
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);
    const byDay = new Map<string, number>();
    const byMonth = new Map<string, number>();
    let tToday = 0;
    let tMonth = 0;
    let tYear = 0;
    let nMonth = 0;
    let nYear = 0;
    for (const s of sales) {
      const d = localDay(s.date);
      byDay.set(d, (byDay.get(d) ?? 0) + s.total);
      byMonth.set(d.slice(0, 7), (byMonth.get(d.slice(0, 7)) ?? 0) + s.total);
      if (d === today) tToday += s.total;
      if (d.startsWith(month)) {
        tMonth += s.total;
        if (s.total > 0) nMonth++;
      }
      if (d.startsWith(year)) {
        tYear += s.total;
        if (s.total > 0) nYear++;
      }
    }
    const days: Bar[] = [];
    for (let i = 29; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const k = localDay(dt.toISOString());
      days.push({ key: k, label: String(dt.getDate()), tip: dt.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }), value: byDay.get(k) ?? 0, highlight: i === 0 });
    }
    const months: Bar[] = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(1);
      dt.setMonth(dt.getMonth() - i);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key: k, label: MONTHS_SHORT[dt.getMonth()], tip: dt.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }), value: byMonth.get(k) ?? 0, highlight: i === 0 });
    }
    const avgBase = sales.filter((s) => s.total > 0 && localDay(s.date).startsWith(year));
    const avg = avgBase.length ? avgBase.reduce((t, s) => t + s.total, 0) / avgBase.length : 0;
    return { tToday, tMonth, tYear, nMonth, nYear, avg, days, months };
  }, [sales]);

  const split = useMemo(() => {
    const today = localToday();
    const from = splitPeriod === 'mese' ? `${today.slice(0, 7)}-01` : splitPeriod === 'anno' ? `${today.slice(0, 4)}-01-01` : (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      return localDay(d.toISOString());
    })();
    const inRange: Sale[] = sales.filter((s) => localDay(s.date) >= from);
    const cat = new Map<string, number>();
    const pay = new Map<string, number>();
    for (const s of inRange) {
      pay.set(s.payment, (pay.get(s.payment) ?? 0) + s.total);
      const gross = saleGross(s) || 1;
      for (const l of s.lines) {
        const k = lineCategory(l, productById);
        cat.set(k, (cat.get(k) ?? 0) + lineTotal(l) * (1 - s.discount / gross));
      }
    }
    const sort = (m: Map<string, number>) => [...m.entries()].map(([label, value]) => ({ label, value })).filter((r) => Math.abs(r.value) > 0.005).sort((a, b) => b.value - a.value);
    return { cat: sort(cat), pay: sort(pay) };
  }, [sales, splitPeriod, productById]);

  const kpis = [
    { label: 'Incasso oggi', value: eur(data.tToday), icon: Wallet },
    { label: 'Incasso mese', value: eur(data.tMonth), icon: CalendarDays },
    { label: 'Incasso anno', value: eur(data.tYear), icon: TrendingUp },
    { label: 'Scontrino medio (anno)', value: eur(data.avg), icon: Receipt },
    { label: 'Vendite mese / anno', value: `${data.nMonth} / ${data.nYear}`, icon: ShoppingBag },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`panel flex items-center gap-3 p-4 ${i === 4 ? 'col-span-2 md:col-span-1' : ''}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-base leading-tight font-semibold break-words text-white 2xl:text-lg">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <BarChart3 size={16} className="text-cyan-300" /> Incassi ultimi 30 giorni
          </h3>
          <ColumnChart bars={data.days} labelEvery={3} />
        </section>
        <section className="panel p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <BarChart3 size={16} className="text-cyan-300" /> Incassi per mese · ultimi 12 mesi
          </h3>
          <ColumnChart bars={data.months} />
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Ripartizioni:</span>
        <div className="flex rounded-xl border border-white/10 bg-ink-900/50 p-1">
          {(
            [
              ['mese', 'Mese corrente'],
              ['anno', 'Anno corrente'],
              ['12', 'Ultimi 12 mesi'],
            ] as const
          ).map(([id, l]) => (
            <button key={id} onClick={() => setSplitPeriod(id)} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${splitPeriod === id ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Per categoria</h3>
          <SplitBars rows={split.cat} />
        </section>
        <section className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Per metodo di pagamento</h3>
          <SplitBars rows={split.pay} />
        </section>
      </div>
    </div>
  );
}
