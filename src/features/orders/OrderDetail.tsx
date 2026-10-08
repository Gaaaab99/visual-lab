import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BadgeCheck,
  CalendarClock,
  FileText,
  HandCoins,
  MessageCircle,
  Package,
  Pencil,
  Printer,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { usePrint } from '../../components/Print';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { ContactChannel, FiscalDocType, Order, OrderStatus, PaymentMethod } from '../../store/types';
import { ORDER_FLOW, ORDER_STATUS, contactLink, dpt, eur, fmtDate, fullName, lineTotal, orderTotals } from '../../store/utils';
import { NumInput, Field } from './fields';
import { flowIndex, frameLabel, hasFrame, hasLenses, isCustomMade, isLate, readyMessage } from './helpers';
import { ConformityDoc, DepositReceiptDoc, WarrantyDoc, WorkTicketDoc } from './prints';
import { useOrderActions } from './useOrderActions';

const PAYMENTS: PaymentMethod[] = ['Carta', 'Bancomat', 'Contanti', 'Bonifico', 'Finanziamento', 'Buono'];
const CHANNELS: ContactChannel[] = ['WhatsApp', 'SMS', 'Email'];

export function StatusChip({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return (
    <span className={`chip ${s.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
    </span>
  );
}

interface Props {
  order: Order;
  onClose: () => void;
  onEdit: (o: Order) => void;
  onOpenCustomer: (id: string) => void;
}

type Dialog = null | 'deliver' | 'cancel' | 'notify';

export function OrderDetail({ order: o, onClose, onEdit, onOpenCustomer }: Props) {
  const { customerById, settings } = useStore();
  const { notify } = useApp();
  const print = usePrint();
  const { setStatus, deliver } = useOrderActions();
  const [note, setNote] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  const c = customerById(o.customerId);
  const t = orderTotals(o);
  const late = isLate(o);
  const idx = flowIndex(o.status);
  const nextStatus: OrderStatus | null = o.status === 'annullato' || idx < 0 || idx >= ORDER_FLOW.length - 2 ? null : ORDER_FLOW[idx + 1];
  const closed = o.status === 'consegnato' || o.status === 'annullato';

  const advance = async (to: OrderStatus) => {
    setBusy(true);
    try {
      await setStatus(o, to, note.trim());
      setNote('');
    } catch {
      notify('Impossibile aggiornare lo stato.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const docs = { order: o, customer: c, settings };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        icon={<Package size={18} />}
        title={
          <span className="flex flex-wrap items-center gap-2">
            Busta {o.number} <StatusChip status={o.status} />
            {late && <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-200">In ritardo</span>}
          </span>
        }
        subtitle={`${o.type} · creata il ${fmtDate(o.createdAt)}`}
        footer={
          <>
            {!closed && (
              <button className="btn-danger mr-auto" onClick={() => setDialog('cancel')}>
                <Ban size={15} /> Annulla busta
              </button>
            )}
            {!closed && (
              <button className="btn-ghost" onClick={() => onEdit(o)}>
                <Pencil size={15} /> Modifica
              </button>
            )}
            {o.status === 'pronto' && (
              <button className="btn-ghost" onClick={() => setDialog('notify')}>
                <MessageCircle size={15} /> Avvisa il cliente
              </button>
            )}
            {nextStatus && (
              <button className="btn-primary" disabled={busy} onClick={() => advance(nextStatus)}>
                <ArrowRight size={15} /> Segna «{ORDER_STATUS[nextStatus].label}»
              </button>
            )}
            {(o.status === 'pronto' || o.status === 'in_lavorazione') && (
              <button className={o.status === 'pronto' ? 'btn-primary' : 'btn-ghost'} disabled={busy} onClick={() => setDialog('deliver')}>
                <HandCoins size={15} /> Consegna e incassa
              </button>
            )}
          </>
        }
      >
        <div className="space-y-4 p-4 sm:p-5">
          {/* testata */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Cliente">
              {c ? (
                <button className="text-left font-medium text-cyan-200 hover:underline" onClick={() => onOpenCustomer(c.id)}>
                  {fullName(c)}
                </button>
              ) : (
                '—'
              )}
              {c && <span className="block text-xs text-slate-500">{c.code} · {c.phone}</span>}
            </Info>
            <Info label="Laboratorio">{o.lab || '—'}</Info>
            <Info label="Consegna prevista">
              <span className={late ? 'text-amber-300' : ''}>{fmtDate(o.expectedDate)}</span>
            </Info>
            <Info label="Saldo da incassare">
              <span className="font-semibold text-white">{eur(t.due)}</span>
              <span className="block text-xs text-slate-500">
                su {eur(t.total)} · acconto {eur(o.deposit + o.paid)}
              </span>
            </Info>
          </div>

          {/* stampe */}
          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.06] bg-ink-900/40 p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Printer size={14} /> Stampe
            </span>
            <button className="btn-ghost py-1.5 text-xs" onClick={() => print(<WorkTicketDoc {...docs} />)}>
              <FileText size={14} /> Busta di lavoro
            </button>
            <button className="btn-ghost py-1.5 text-xs" disabled={o.deposit + o.paid <= 0} onClick={() => print(<DepositReceiptDoc {...docs} />)}>
              <Receipt size={14} /> Ricevuta di acconto
            </button>
            {isCustomMade(o) && (
              <button className="btn-ghost py-1.5 text-xs" onClick={() => print(<ConformityDoc {...docs} />)}>
                <BadgeCheck size={14} /> Dichiarazione di conformità
              </button>
            )}
            <button className="btn-ghost py-1.5 text-xs" onClick={() => print(<WarrantyDoc {...docs} />)}>
              <ShieldCheck size={14} /> Certificato di garanzia
            </button>
          </div>

          {/* prescrizione */}
          {o.rx && (
            <Block title={`Prescrizione · ${fmtDate(o.rx.date)} · ${o.rx.kind}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {['', 'Sfera', 'Cil', 'Asse', 'Add', 'Prisma', 'DNP', 'Alt.', 'AV'].map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular-nums text-slate-200">
                    {(['od', 'os'] as const).map((eye) => {
                      const e = o.rx![eye];
                      return (
                        <tr key={eye} className="border-t border-white/[0.04]">
                          <td className="px-2 py-1.5 font-semibold text-cyan-300">{eye.toUpperCase()}</td>
                          <td className="px-2 py-1.5">{dpt(e.sph)}</td>
                          <td className="px-2 py-1.5">{e.cyl ? dpt(e.cyl) : '—'}</td>
                          <td className="px-2 py-1.5">{e.cyl ? `${e.axis}°` : '—'}</td>
                          <td className="px-2 py-1.5">{e.add ? dpt(e.add) : '—'}</td>
                          <td className="px-2 py-1.5">{e.prism ? `${e.prism}Δ ${e.base}` : '—'}</td>
                          <td className="px-2 py-1.5">{eye === 'od' ? o.centering.pdOd || '—' : o.centering.pdOs || '—'}</td>
                          <td className="px-2 py-1.5">{eye === 'od' ? o.centering.heightOd || '—' : o.centering.heightOs || '—'}</td>
                          <td className="px-2 py-1.5">{e.va || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {o.rx.source}
                {o.rx.examiner ? ` · ${o.rx.examiner}` : ''}
              </p>
            </Block>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {hasFrame(o.type) && (
              <Block title="Montatura">
                <p className="text-sm text-slate-200">{frameLabel(o)}</p>
                {o.frame.ownFrame && <p className="mt-1 text-xs text-slate-500">Fornita dal cliente</p>}
              </Block>
            )}
            {hasLenses(o.type) && (
              <Block title="Lenti">
                <p className="text-sm text-slate-200">
                  {[o.lenses.brand, o.lenses.design, o.type !== 'Lenti a contatto' ? `indice ${o.lenses.index}` : '', o.lenses.material].filter(Boolean).join(' · ')}
                </p>
                {o.lenses.treatments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {o.lenses.treatments.map((tr) => (
                      <span key={tr} className="chip border-white/10 text-slate-300">
                        {tr}
                      </span>
                    ))}
                  </div>
                )}
                {o.type !== 'Lenti a contatto' && (
                  <p className="mt-2 text-xs text-slate-500">
                    Apice {o.centering.vertex} mm · pantoscopico {o.centering.pantoscopic}° · curvatura {o.centering.wrap}°{o.lenses.diameter ? ` · Ø ${o.lenses.diameter} mm` : ''}
                  </p>
                )}
              </Block>
            )}
          </div>

          {/* righe */}
          <Block title="Fornitura">
            <div className="space-y-1.5 text-sm">
              {o.lines.map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-slate-200">
                    {l.qty !== 1 && <span className="text-slate-500">{l.qty} × </span>}
                    {l.description}
                    <span className="ml-1.5 text-xs text-slate-500">
                      IVA {l.vat}%{l.medicalDevice ? ' · DM' : ''}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-200">{eur(lineTotal(l))}</span>
                </div>
              ))}
              {o.discount > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Sconto</span>
                  <span className="tabular-nums">−{eur(o.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/[0.06] pt-1.5 font-semibold text-white">
                <span>Totale</span>
                <span className="tabular-nums">{eur(t.total)}</span>
              </div>
              {o.conformityNumber && <p className="pt-1 text-xs text-slate-500">Dichiarazione di conformità n. {o.conformityNumber}</p>}
            </div>
          </Block>

          {o.notes && (
            <Block title="Note">
              <p className="whitespace-pre-wrap text-sm text-slate-300">{o.notes}</p>
            </Block>
          )}

          {/* storico */}
          <Block title="Storico">
            <ol className="space-y-2">
              {[...o.history].reverse().map((h, i) => (
                <li key={`${h.date}-${i}`} className="flex gap-3 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ORDER_STATUS[h.status].dot}`} />
                  <div className="min-w-0">
                    <p className="text-slate-200">
                      {ORDER_STATUS[h.status].label}
                      <span className="ml-2 text-xs text-slate-500">
                        {new Date(h.date).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                    {h.note && <p className="text-xs text-slate-400">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
            {!closed && (
              <input className="input mt-3" placeholder="Nota per il prossimo cambio di stato (facoltativa)" value={note} onChange={(e) => setNote(e.target.value)} />
            )}
          </Block>
        </div>
      </Modal>

      {dialog === 'deliver' && (
        <DeliverDialog
          order={o}
          onClose={() => setDialog(null)}
          onConfirm={async (amount, payment, docType, n) => {
            setBusy(true);
            try {
              await deliver(o, amount, payment, docType, n);
              setDialog(null);
            } catch {
              notify('Impossibile completare la consegna.', 'error');
            } finally {
              setBusy(false);
            }
          }}
          busy={busy}
        />
      )}

      {dialog === 'cancel' && (
        <CancelDialog
          order={o}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            setBusy(true);
            try {
              await setStatus(o, 'annullato', reason);
              setDialog(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {dialog === 'notify' && c && (
        <NotifyDialog
          order={o}
          message={readyMessage(c, o, settings.messageSignature, settings.openingHours)}
          defaultChannel={c.preferredChannel === 'Telefono' ? 'SMS' : c.preferredChannel}
          consent={c.consents.reminders}
          phone={c.phone}
          email={c.email}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 text-sm text-slate-200">{children}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-ink-900/40 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------ Consegna e incassa */
function DeliverDialog({
  order: o,
  onClose,
  onConfirm,
  busy,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (amount: number, payment: PaymentMethod, docType: FiscalDocType, note: string) => void;
  busy: boolean;
}) {
  const t = orderTotals(o);
  const [amount, setAmount] = useState(Math.round(t.due * 100) / 100);
  const [payment, setPayment] = useState<PaymentMethod>('Carta');
  const [docType, setDocType] = useState<FiscalDocType>('Documento commerciale');
  const [note, setNote] = useState('');
  const short = amount < t.due - 0.009;
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      icon={<Wallet size={18} />}
      title="Consegna e incassa"
      subtitle={`Busta ${o.number}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" disabled={busy || amount < 0} onClick={() => onConfirm(amount, payment, docType, note.trim())}>
            <HandCoins size={15} /> Conferma consegna
          </button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <dl className="space-y-1 rounded-xl border border-white/[0.06] bg-ink-900/60 p-3 text-sm">
          <div className="flex justify-between text-slate-400">
            <dt>Totale busta</dt>
            <dd className="tabular-nums">{eur(t.total)}</dd>
          </div>
          <div className="flex justify-between text-slate-400">
            <dt>Acconti già versati</dt>
            <dd className="tabular-nums">−{eur(o.deposit + o.paid)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-white">
            <dt>Saldo dovuto</dt>
            <dd className="tabular-nums">{eur(t.due)}</dd>
          </div>
        </dl>
        <Field label="Importo incassato ora (€)">
          <NumInput value={amount} min={0} step={1} onChange={setAmount} />
        </Field>
        {short && <p className="flex items-center gap-1.5 text-xs text-amber-300"><AlertTriangle size={13} /> Incasso parziale: resterà un residuo di {eur(t.due - amount)}.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pagamento">
            <select className="input" value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)}>
              {PAYMENTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Documento">
            <select className="input" value={docType} onChange={(e) => setDocType(e.target.value as FiscalDocType)}>
              <option>Documento commerciale</option>
              <option>Fattura</option>
            </select>
          </Field>
        </div>
        <Field label="Nota (facoltativa)">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {isCustomMade(o) && (
          <p className="text-xs text-slate-500">
            Verrà assegnato il numero della dichiarazione di conformità del dispositivo su misura, da stampare e consegnare al cliente.
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ Annullamento */
function CancelDialog({ order: o, onClose, onConfirm, busy }: { order: Order; onClose: () => void; onConfirm: (reason: string) => void; busy: boolean }) {
  const [reason, setReason] = useState('');
  const paid = o.deposit + o.paid;
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      icon={<Ban size={18} />}
      title="Annulla busta"
      subtitle={`Busta ${o.number}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Indietro
          </button>
          <button className="btn-danger" disabled={busy || !reason.trim()} onClick={() => onConfirm(reason.trim())}>
            <Ban size={15} /> Conferma annullamento
          </button>
        </>
      }
    >
      <div className="space-y-3 p-5 text-sm text-slate-300">
        <p>La busta verrà spostata tra le annullate. L’operazione non è reversibile.</p>
        {o.frame.productId && !o.frame.ownFrame && flowIndex(o.status) >= 1 && <p className="text-xs text-slate-400">La montatura verrà ricaricata in magazzino.</p>}
        {paid > 0 && (
          <p className="flex items-start gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5 text-xs text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Il cliente ha versato {eur(paid)}: gestisci il rimborso o il buono dalla cassa.
          </p>
        )}
        <Field label="Motivo">
          <input autoFocus className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Es. cliente ha rinunciato" />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ Avviso al cliente */
function NotifyDialog({
  order: o,
  message,
  defaultChannel,
  consent,
  phone,
  email,
  onClose,
}: {
  order: Order;
  message: string;
  defaultChannel: ContactChannel;
  consent: boolean;
  phone: string;
  email: string;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<ContactChannel>(defaultChannel);
  const [text, setText] = useState(message);
  const link = contactLink(channel, { phone, email }, text, `Busta ${o.number}: occhiali pronti`);
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      icon={<MessageCircle size={18} />}
      title="Avvisa il cliente"
      subtitle="Il messaggio viene aperto nell’app scelta: nulla viene inviato automaticamente."
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Chiudi
          </button>
          {link ? (
            <a className="btn-primary" href={link} target="_blank" rel="noreferrer" onClick={onClose}>
              <MessageCircle size={15} /> Apri {channel}
            </a>
          ) : (
            <span className="text-xs text-rose-300">Recapito mancante per {channel}.</span>
          )}
        </>
      }
    >
      <div className="space-y-3 p-5">
        {!consent && (
          <p className="flex items-start gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5 text-xs text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Il cliente non ha acconsentito ai promemoria di servizio. Contattalo solo se lo ha richiesto espressamente per
            questa fornitura.
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${channel === ch ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-300 hover:border-white/25'}`}
            >
              {ch}
            </button>
          ))}
        </div>
        <Field label="Messaggio">
          <textarea className="input min-h-40" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarClock size={13} /> {phone || email || 'Nessun recapito'}
        </p>
      </div>
    </Modal>
  );
}
