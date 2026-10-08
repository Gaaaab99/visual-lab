import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Info, XCircle } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import type { Sale } from '../../store/types';
import { eur, fullName, isValidFiscalCode } from '../../store/utils';
import { csvNum, downloadFile, isTracked, localDay, medicalAmount, toCsv } from './shared';

interface Row {
  sale: Sale;
  amount: number;
  reason?: string;
}

export function StsExport({ onOpen }: { onOpen: (s: Sale) => void }) {
  const { sales, customerById } = useStore();
  const prev = new Date().getFullYear() - 1;
  const [from, setFrom] = useState(`${prev}-01-01`);
  const [to, setTo] = useState(`${prev}-12-31`);
  const [showExcluded, setShowExcluded] = useState(true);

  const { eligible, excluded } = useMemo(() => {
    const eligible: Row[] = [];
    const excluded: Row[] = [];
    for (const s of sales) {
      const d = localDay(s.date);
      if (d < from || d > to) continue;
      const amount = medicalAmount(s);
      if (amount === 0) continue;
      const cf = s.fiscalCode.trim().toUpperCase();
      if (!cf) excluded.push({ sale: s, amount, reason: 'Codice fiscale assente' });
      else if (!isValidFiscalCode(cf)) excluded.push({ sale: s, amount, reason: 'Codice fiscale non valido' });
      else if (s.stsOpposition) excluded.push({ sale: s, amount, reason: 'Opposizione del cliente' });
      else eligible.push({ sale: s, amount });
    }
    const byDate = (a: Row, b: Row) => a.sale.date.localeCompare(b.sale.date);
    return { eligible: eligible.sort(byDate), excluded: excluded.sort(byDate) };
  }, [sales, from, to]);

  const totEligible = eligible.reduce((s, r) => s + r.amount, 0);
  const totExcluded = excluded.reduce((s, r) => s + r.amount, 0);
  const tracked = eligible.filter((r) => isTracked(r.sale.payment)).reduce((s, r) => s + r.amount, 0);

  const exportCsv = () => {
    const rows: (string | number)[][] = [['CF cittadino', 'Data documento', 'Numero documento', 'Tipo spesa', 'Importo', 'Pagamento tracciato', 'Flag opposizione']];
    for (const r of eligible) {
      rows.push([r.sale.fiscalCode.toUpperCase(), localDay(r.sale.date), r.sale.number, 'AD', csvNum(r.amount), isTracked(r.sale.payment) ? 'SI' : 'NO', r.sale.stsOpposition ? 'SI' : 'NO']);
    }
    downloadFile(`sistema-ts-AD_${from}_${to}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  const table = (rows: Row[], withReason: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-ink-900/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Documento</th>
            <th className="px-4 py-2.5">Data</th>
            <th className="px-4 py-2.5">Cliente</th>
            <th className="px-4 py-2.5">Codice fiscale</th>
            <th className="px-4 py-2.5">Pagamento</th>
            {withReason && <th className="px-4 py-2.5">Motivo esclusione</th>}
            <th className="px-4 py-2.5 text-right">Importo AD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {rows.map(({ sale, amount, reason }) => {
            const c = customerById(sale.customerId);
            return (
              <tr key={sale.id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => onOpen(sale)}>
                <td className="px-4 py-2 font-mono text-xs text-cyan-200">{sale.number}</td>
                <td className="px-4 py-2 text-slate-400">{new Date(sale.date).toLocaleDateString('it-IT')}</td>
                <td className="px-4 py-2 text-slate-200">{c ? fullName(c) : <span className="text-slate-500">Occasionale</span>}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-300">{sale.fiscalCode || '—'}</td>
                <td className="px-4 py-2 text-slate-400">
                  {sale.payment} <span className="text-[11px] text-slate-500">({isTracked(sale.payment) ? 'tracciato' : 'non tracciato'})</span>
                </td>
                {withReason && <td className="px-4 py-2 text-amber-300">{reason}</td>}
                <td className={`px-4 py-2 text-right font-medium ${amount < 0 ? 'text-rose-300' : 'text-white'}`}>{eur(amount)}</td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={withReason ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                Nessun documento.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-4 text-sm leading-relaxed text-slate-300">
        <Info size={18} className="mt-0.5 shrink-0 text-sky-300" />
        <div className="space-y-1.5">
          <p>
            Questo è un <strong className="text-white">export preparatorio</strong> delle spese per dispositivi medici (tipo spesa <strong className="text-white">AD</strong>) da trasmettere al Sistema Tessera Sanitaria. La
            trasmissione vera e propria avviene tramite il canale ufficiale del Sistema TS oppure tramite un intermediario (es. associazione di categoria, commercialista, software abilitato).
          </p>
          <p>
            Gli ottici sono tenuti a comunicare le spese per dispositivi medici con marcatura CE intestate a un codice fiscale. Il cliente può esercitare l’<strong className="text-white">opposizione</strong> all’invio: quei documenti
            sono esclusi dall’export. Verifica sempre tracciati, codifiche e <strong className="text-white">scadenze ufficiali</strong> su{' '}
            <a href="https://www.sistemats.it" target="_blank" rel="noreferrer" className="text-sky-300 underline hover:text-sky-200">
              sistemats.it
            </a>
            , perché possono cambiare di anno in anno.
          </p>
        </div>
      </div>

      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400" htmlFor="sts-from">
            Dal
          </label>
          <input id="sts-from" type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label className="text-xs text-slate-400" htmlFor="sts-to">
            al
          </label>
          <input id="sts-to" type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {[prev, prev + 1].map((y) => (
            <button
              key={y}
              className="chip border-white/10 text-slate-300 hover:border-cyan-400/40"
              onClick={() => {
                setFrom(`${y}-01-01`);
                setTo(`${y}-12-31`);
              }}
            >
              Anno {y}
            </button>
          ))}
        </div>
        <button className="btn-primary ml-auto" onClick={exportCsv} disabled={!eligible.length}>
          <Download size={15} /> Esporta CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Documenti da trasmettere', value: String(eligible.length) },
          { label: 'Importo AD trasmissibile', value: eur(totEligible) },
          { label: 'di cui pagamento tracciato', value: eur(tracked) },
          { label: `Esclusi (${excluded.length})`, value: eur(totExcluded) },
        ].map((k) => (
          <div key={k.label} className="panel p-4">
            <p className="text-lg font-semibold text-white">{k.value}</p>
            <p className="text-xs text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <h3 className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-sm font-semibold text-white">
          <CheckCircle2 size={16} className="text-emerald-300" /> Documenti idonei
        </h3>
        {table(eligible, false)}
      </section>

      <section className="panel overflow-hidden">
        <button className="flex w-full items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-left text-sm font-semibold text-white" onClick={() => setShowExcluded((v) => !v)}>
          <XCircle size={16} className="text-amber-300" /> Documenti esclusi
          <span className="ml-auto text-xs font-normal text-slate-500">{showExcluded ? 'Nascondi' : 'Mostra'}</span>
        </button>
        {showExcluded && table(excluded, true)}
      </section>
    </div>
  );
}
