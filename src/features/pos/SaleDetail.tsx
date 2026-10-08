import { useEffect, useMemo, useState } from 'react';
import { Printer, ReceiptText, RotateCcw, UserRound } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { usePrint } from '../../components/Print';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { OrderLine, PaymentMethod, Sale } from '../../store/types';
import { eur, fmtDate, fullName, lineTotal, newId, vatBreakdown } from '../../store/utils';
import { ReceiptDoc } from './Receipt';
import { PAYMENTS, medicalAmount, nextSaleNumber, round2, saleGross, type ViewProps } from './shared';

/** Le righe di reso hanno id `ret-<idRigaOriginale>-<suffisso>`: servono a calcolare quanto è già stato reso */
const RET = 'ret-';

export function returnedQty(sales: Sale[], lineId: string): number {
  let q = 0;
  for (const s of sales) for (const l of s.lines) if (l.id.startsWith(`${RET}${lineId}-`)) q += Math.abs(l.qty);
  return q;
}

export function SaleDetail({ sale, onClose, onNavigate, onOpenSale }: { sale: Sale | null; onClose: () => void; onNavigate: ViewProps['onNavigate']; onOpenSale: (s: Sale) => void }) {
  const { sales, settings, customerById, productById, put, adjustStock } = useStore();
  const { notify } = useApp();
  const print = usePrint();
  const [returning, setReturning] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [refund, setRefund] = useState<PaymentMethod>('Contanti');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReturning(false);
    setQty({});
    if (sale) setRefund(sale.payment);
  }, [sale]);

  const customer = customerById(sale?.customerId);
  const isReturn = !!sale && sale.total < 0;
  const original = useMemo(() => {
    if (!sale || !isReturn) return undefined;
    const m = sale.notes.match(/DC-\d+/);
    return m ? sales.find((s) => s.number === m[0]) : undefined;
  }, [sale, isReturn, sales]);
  const returns = useMemo(() => (sale && !isReturn ? sales.filter((s) => s.total < 0 && s.lines.some((l) => sale.lines.some((o) => l.id.startsWith(`${RET}${o.id}-`)))) : []), [sale, isReturn, sales]);

  const available = (l: OrderLine) => Math.max(0, l.qty - returnedQty(sales, l.id));
  const returnable = !!sale && !isReturn && sale.lines.some((l) => available(l) > 0);

  const retLines: OrderLine[] = sale
    ? sale.lines
        .filter((l) => (qty[l.id] ?? 0) > 0)
        .map((l) => ({ ...l, id: `${RET}${l.id}-${newId().slice(0, 8)}`, qty: -(qty[l.id] ?? 0) }))
    : [];
  const origGross = sale ? saleGross(sale) : 0;
  const retGross = retLines.reduce((s, l) => s + lineTotal(l), 0);
  const retDiscount = sale && origGross ? round2((sale.discount * retGross) / origGross) : 0;
  const retTotal = round2(retGross - retDiscount);

  const doReturn = async () => {
    if (!sale || !retLines.length) return;
    setBusy(true);
    try {
      const ret: Sale = {
        id: newId(),
        number: nextSaleNumber(sales),
        date: new Date().toISOString(),
        customerId: sale.customerId,
        fiscalCode: sale.fiscalCode,
        stsOpposition: sale.stsOpposition,
        docType: sale.docType,
        lines: retLines,
        discount: retDiscount,
        depositDeducted: 0,
        total: retTotal,
        payment: refund,
        orderId: sale.orderId,
        notes: `Reso / storno di ${sale.number} del ${fmtDate(sale.date)}`,
      };
      await put('sales', ret);
      const byProduct = new Map<string, number>();
      for (const l of retLines) if (l.productId) byProduct.set(l.productId, (byProduct.get(l.productId) ?? 0) + Math.abs(l.qty));
      for (const [pid, q] of byProduct) {
        const p = productById(pid);
        if (p && p.category !== 'Servizi') await adjustStock(pid, q, 'Reso', ret.number);
      }
      if (customer && settings.loyaltyEuroPerPoint > 0) {
        const pts = Math.floor(Math.abs(retTotal) / settings.loyaltyEuroPerPoint);
        if (pts > 0) await put('customers', { ...customer, loyaltyPoints: Math.max(0, customer.loyaltyPoints - pts), updatedAt: new Date().toISOString() });
      }
      notify(`Reso ${ret.number} registrato · ${eur(retTotal)}`);
      onOpenSale(ret);
    } catch {
      notify('Impossibile registrare il reso.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const vat = sale ? vatBreakdown(sale.lines, sale.discount) : [];
  const md = sale ? medicalAmount(sale) : 0;

  return (
    <Modal
      open={!!sale}
      onClose={onClose}
      size="lg"
      icon={<ReceiptText size={18} />}
      title={sale ? `${isReturn ? 'Reso' : sale.docType} ${sale.number}` : ''}
      subtitle={sale ? `${new Date(sale.date).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })} · ${sale.payment}` : undefined}
      footer={
        sale && (
          <>
            {returning ? (
              <>
                <button className="btn-ghost" onClick={() => setReturning(false)}>
                  Annulla
                </button>
                <button className="btn-danger" disabled={!retLines.length || busy} onClick={() => void doReturn()}>
                  <RotateCcw size={15} /> Conferma reso {retLines.length ? eur(retTotal) : ''}
                </button>
              </>
            ) : (
              <>
                {returnable && (
                  <button
                    className="btn-danger"
                    onClick={() => {
                      setQty(Object.fromEntries(sale.lines.map((l) => [l.id, available(l)])));
                      setReturning(true);
                    }}
                  >
                    <RotateCcw size={15} /> Reso / storno
                  </button>
                )}
                <button className="btn-primary" onClick={() => print(<ReceiptDoc sale={sale} settings={settings} customer={customer} />)}>
                  <Printer size={15} /> Ristampa
                </button>
              </>
            )}
          </>
        )
      }
    >
      {sale && (
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              {customer ? (
                <button className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20" onClick={() => onNavigate('customers', customer.id)}>
                  <UserRound size={11} /> {fullName(customer)}
                </button>
              ) : (
                <span className="chip border-white/10 text-slate-400">Cliente occasionale</span>
              )}
              {sale.fiscalCode && <span className="chip border-white/10 font-mono text-slate-300">CF {sale.fiscalCode}</span>}
              {md !== 0 && <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-200">Spesa sanitaria AD {eur(md)}</span>}
              {sale.stsOpposition && <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-200">Opposizione Sistema TS</span>}
              {sale.orderId && (
                <button className="chip border-white/10 text-slate-300 hover:border-cyan-400/40" onClick={() => onNavigate('orders', sale.orderId)}>
                  Busta collegata
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="bg-ink-900/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Descrizione</th>
                    <th className="px-3 py-2 text-right">Q.tà</th>
                    <th className="px-3 py-2 text-right">Prezzo</th>
                    <th className="px-3 py-2 text-right">IVA</th>
                    <th className="px-3 py-2 text-right">{returning ? 'Da rendere' : 'Totale'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {sale.lines.map((l) => {
                    const av = available(l);
                    return (
                      <tr key={l.id}>
                        <td className="px-3 py-2 text-slate-200">
                          {l.description}
                          {l.medicalDevice && <span className="chip ml-1.5 border-emerald-400/30 px-1.5 py-0 text-[10px] text-emerald-200">AD</span>}
                          {!isReturn && av < l.qty && <span className="ml-1.5 text-[11px] text-amber-300">reso {l.qty - av}</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300">{l.qty}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{eur(l.unitPrice)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{l.vat}%</td>
                        <td className="px-3 py-2 text-right font-medium text-white">
                          {returning ? (
                            <input
                              type="number"
                              min={0}
                              max={av}
                              className="input ml-auto w-20 px-2 py-1 text-right"
                              value={qty[l.id] ?? 0}
                              disabled={av === 0}
                              onChange={(e) => setQty({ ...qty, [l.id]: Math.min(av, Math.max(0, Math.floor(Number(e.target.value) || 0))) })}
                              aria-label="Quantità da rendere"
                            />
                          ) : (
                            eur(lineTotal(l))
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {returning && (
              <div className="space-y-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.05] p-4 text-sm">
                <p className="text-slate-300">
                  Verrà registrato un documento di reso con importo negativo <strong className="text-white">{eur(retTotal)}</strong> e gli articoli torneranno a magazzino.
                </p>
                <div>
                  <p className="label">Rimborso tramite</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENTS.map((p) => (
                      <button key={p} onClick={() => setRefund(p)} className={`chip transition-colors ${refund === p ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-slate-400'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {sale.notes && <p className="text-sm text-slate-400">Note: {sale.notes}</p>}
            {original && (
              <button className="btn-ghost text-xs" onClick={() => onOpenSale(original)}>
                Apri documento originale {original.number}
              </button>
            )}
            {returns.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                Resi collegati:
                {returns.map((r) => (
                  <button key={r.id} className="chip border-rose-400/30 text-rose-200 hover:bg-rose-500/10" onClick={() => onOpenSale(r)}>
                    {r.number} · {eur(r.total)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5 self-start rounded-xl border border-white/[0.06] bg-ink-900/50 p-4 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotale</span>
              <span>{eur(saleGross(sale))}</span>
            </div>
            {sale.discount !== 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Sconto</span>
                <span>−{eur(Math.abs(sale.discount))}</span>
              </div>
            )}
            {vat.map((v) => (
              <div key={v.rate} className="flex justify-between text-[11px] text-slate-500">
                <span>
                  IVA {v.rate}% su {eur(v.taxable)}
                </span>
                <span>{eur(v.vat)}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-2">
              <span className="text-slate-200">Totale</span>
              <span className={`text-xl font-semibold ${isReturn ? 'text-rose-300' : 'text-white'}`}>{eur(sale.total)}</span>
            </div>
            {sale.depositDeducted > 0 && <p className="text-[11px] text-slate-500">Acconti scalati: {eur(sale.depositDeducted)}</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}
