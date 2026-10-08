import { useMemo, useState } from 'react';
import { Download, HeartPulse, Search } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import type { PaymentMethod, Sale } from '../../store/types';
import { eur, fullName } from '../../store/utils';
import { PAYMENTS, csvNum, downloadFile, hasMedical, localDay, localToday, medicalAmount, toCsv } from './shared';

type Period = 'oggi' | '7' | 'mese' | 'anno' | 'tutto' | 'custom';

const PERIODS: [Period, string][] = [
  ['oggi', 'Oggi'],
  ['7', 'Ultimi 7 giorni'],
  ['mese', 'Mese corrente'],
  ['anno', 'Anno corrente'],
  ['tutto', 'Tutto'],
  ['custom', 'Intervallo…'],
];

function range(p: Period, from: string, to: string): [string, string] {
  const today = localToday();
  const d = new Date();
  switch (p) {
    case 'oggi':
      return [today, today];
    case '7': {
      const s = new Date();
      s.setDate(s.getDate() - 6);
      return [localDay(s.toISOString()), today];
    }
    case 'mese':
      return [`${today.slice(0, 7)}-01`, today];
    case 'anno':
      return [`${d.getFullYear()}-01-01`, today];
    case 'tutto':
      return ['0000-01-01', '9999-12-31'];
    case 'custom':
      return [from || '0000-01-01', to || '9999-12-31'];
  }
}

export function SalesList({ onOpen }: { onOpen: (s: Sale) => void }) {
  const { sales, customers, customerById } = useStore();
  const [period, setPeriod] = useState<Period>('mese');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [payment, setPayment] = useState<PaymentMethod | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [onlyMedical, setOnlyMedical] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const [a, b] = range(period, from, to);
    const t = q.trim().toLowerCase();
    return sales
      .filter((s) => {
        const day = localDay(s.date);
        if (day < a || day > b) return false;
        if (payment && s.payment !== payment) return false;
        if (customerId && s.customerId !== customerId) return false;
        if (onlyMedical && !hasMedical(s)) return false;
        if (t) {
          const c = customerById(s.customerId);
          const hay = `${s.number} ${c ? fullName(c) : ''} ${s.fiscalCode} ${s.notes} ${s.lines.map((l) => l.description).join(' ')}`.toLowerCase();
          if (!hay.includes(t)) return false;
        }
        return true;
      })
      .sort((x, y) => y.date.localeCompare(x.date));
  }, [sales, period, from, to, payment, customerId, onlyMedical, q, customerById]);

  const total = filtered.reduce((s, x) => s + x.total, 0);
  const md = filtered.reduce((s, x) => s + medicalAmount(x), 0);
  const customersWithSales = useMemo(() => {
    const ids = new Set(sales.map((s) => s.customerId).filter(Boolean));
    return customers.filter((c) => ids.has(c.id)).sort((a, b) => fullName(a).localeCompare(fullName(b), 'it'));
  }, [sales, customers]);

  const exportCsv = () => {
    const rows: (string | number)[][] = [['Numero', 'Data', 'Documento', 'Cliente', 'Codice fiscale', 'Righe', 'Pagamento', 'Totale', 'Di cui dispositivi medici', 'Opposizione STS', 'Note']];
    for (const s of filtered) {
      const c = customerById(s.customerId);
      rows.push([s.number, new Date(s.date).toLocaleString('it-IT'), s.docType, c ? fullName(c) : '', s.fiscalCode, s.lines.map((l) => `${l.qty}x ${l.description}`).join(' | '), s.payment, csvNum(s.total), csvNum(medicalAmount(s)), s.stsOpposition ? 'SI' : 'NO', s.notes]);
    }
    downloadFile(`vendite-${localToday()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Numero, cliente, CF, articolo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Periodo">
          {PERIODS.map(([id, l]) => (
            <option key={id} value={id}>
              {l}
            </option>
          ))}
        </select>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dal" />
            <span className="text-slate-500">–</span>
            <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Al" />
          </div>
        )}
        <select className="input w-auto" value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod | '')} aria-label="Pagamento">
          <option value="">Tutti i pagamenti</option>
          {PAYMENTS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select className="input w-auto max-w-[200px]" value={customerId} onChange={(e) => setCustomerId(e.target.value)} aria-label="Cliente">
          <option value="">Tutti i clienti</option>
          {customersWithSales.map((c) => (
            <option key={c.id} value={c.id}>
              {fullName(c)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={onlyMedical} onChange={(e) => setOnlyMedical(e.target.checked)} /> Solo spese sanitarie
        </label>
        <button className="btn-ghost py-1.5 text-xs" onClick={exportCsv} disabled={!filtered.length}>
          <Download size={14} /> CSV
        </button>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-ink-900/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Numero</th>
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Articoli</th>
                <th className="px-4 py-2.5">Pagamento</th>
                <th className="px-4 py-2.5 text-right">Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.slice(0, 300).map((s) => {
                const c = customerById(s.customerId);
                return (
                  <tr key={s.id} className="cursor-pointer transition-colors hover:bg-white/[0.03]" onClick={() => onOpen(s)}>
                    <td className="px-4 py-2.5 font-mono text-xs text-cyan-200">
                      {s.number}
                      {s.total < 0 && <span className="chip ml-2 border-rose-400/30 bg-rose-400/10 px-1.5 py-0 font-sans text-[10px] text-rose-200">Reso</span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-400">{new Date(s.date).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-2.5 text-slate-200">{c ? fullName(c) : <span className="text-slate-500">Occasionale</span>}</td>
                    <td className="max-w-[280px] px-4 py-2.5 text-slate-400">
                      <span className="flex items-center gap-1.5">
                        {hasMedical(s) && <HeartPulse size={13} className="shrink-0 text-emerald-300" aria-label="Spesa sanitaria" />}
                        <span className="truncate">{s.lines.map((l) => l.description).join(', ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{s.payment}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${s.total < 0 ? 'text-rose-300' : 'text-white'}`}>{eur(s.total)}</td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Nessuna vendita nel periodo selezionato.
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="border-t border-white/10 bg-ink-900/60">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-xs text-slate-400">
                    {filtered.length} documenti{filtered.length > 300 ? ' (mostrati i primi 300)' : ''} · di cui spese sanitarie {eur(md)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-400">Totale</td>
                  <td className="px-4 py-3 text-right text-base font-semibold text-white">{eur(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
