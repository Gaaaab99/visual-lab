import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Glasses, Package, Plus, Save, Search, Send, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { EyeRx, LensDesign, Order, OrderLine, OrderType, PaymentMethod, Prescription, Product } from '../../store/types';
import { DEFAULT_VAT, IS_MEDICAL_DEVICE, eur, fmtDate, lineTotal, orderTotals, rxLine } from '../../store/utils';
import { CustomerPicker, Field, NumInput, Section } from './fields';
import {
  LAB_SUGGESTIONS,
  LENS_BRANDS,
  LENS_DESIGNS,
  LENS_INDEXES,
  LENS_MATERIALS,
  ORDER_TYPES,
  TREATMENTS,
  emptyRx,
  hasFrame,
  hasLenses,
  lensDescription,
  newLine,
} from './helpers';
import { useOrderActions } from './useOrderActions';

const STEPS = ['Cliente', 'Prescrizione', 'Montatura', 'Lenti e centratura', 'Prezzi'] as const;
const PAYMENTS: PaymentMethod[] = ['Carta', 'Bancomat', 'Contanti', 'Bonifico', 'Finanziamento', 'Buono'];
const FRAME_CATS = new Set<Product['category']>(['Montatura vista', 'Occhiale da sole']);

interface Props {
  initial: Order;
  isNew: boolean;
  onClose: () => void;
  onSaved: (o: Order) => void;
}

export function OrderEditor({ initial, isNew, onClose, onSaved }: Props) {
  const { customers, products, orders } = useStore();
  const { notify } = useApp();
  const { saveOrder, setStatus } = useOrderActions();
  const [d, setD] = useState<Order>(initial);
  const [step, setStep] = useState(0);
  const [depositPayment, setDepositPayment] = useState<PaymentMethod>('Carta');
  const [lensPrice, setLensPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [frameQ, setFrameQ] = useState('');

  const customer = customers.find((c) => c.id === d.customerId);
  const totals = orderTotals(d);
  const labs = useMemo(() => [...new Set([...LAB_SUGGESTIONS, ...orders.map((o) => o.lab).filter(Boolean)])], [orders]);

  const patch = (p: Partial<Order>) => setD((o) => ({ ...o, ...p }));
  const patchLenses = (p: Partial<Order['lenses']>) => setD((o) => ({ ...o, lenses: { ...o.lenses, ...p } }));
  const patchCentering = (p: Partial<Order['centering']>) => setD((o) => ({ ...o, centering: { ...o.centering, ...p } }));
  const patchFrame = (p: Partial<Order['frame']>) => setD((o) => ({ ...o, frame: { ...o.frame, ...p } }));
  const patchRx = (p: Partial<Prescription>) => setD((o) => ({ ...o, rx: { ...(o.rx ?? emptyRx()), ...p } }));
  const patchEye = (eye: 'od' | 'os', p: Partial<EyeRx>) => setD((o) => {
    const rx = o.rx ?? emptyRx();
    return { ...o, rx: { ...rx, [eye]: { ...rx[eye], ...p } } };
  });
  const patchLine = (id: string, p: Partial<OrderLine>) => setD((o) => ({ ...o, lines: o.lines.map((l) => (l.id === id ? { ...l, ...p } : l)) }));

  const frames = useMemo(() => {
    const t = frameQ.trim().toLowerCase();
    return products
      .filter((p) => FRAME_CATS.has(p.category))
      .filter((p) => !t || `${p.brand} ${p.model} ${p.color} ${p.sku} ${p.barcode}`.toLowerCase().includes(t))
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.brand.localeCompare(b.brand));
  }, [products, frameQ]);

  const pickRx = (rx: Prescription) =>
    setD((o) => ({
      ...o,
      rx: { ...rx, od: { ...rx.od }, os: { ...rx.os } },
      centering: {
        ...o.centering,
        pdOd: rx.pdOd || o.centering.pdOd,
        pdOs: rx.pdOs || o.centering.pdOs,
        heightOd: rx.heightOd ?? o.centering.heightOd,
        heightOs: rx.heightOs ?? o.centering.heightOs,
      },
      lenses: {
        ...o.lenses,
        design: rx.kind === 'Progressivo' ? 'Progressiva' : rx.kind === 'Lenti a contatto' ? 'Lenti a contatto' : rx.kind === 'Intermedio' ? 'Office / degressiva' : o.lenses.design,
      },
    }));

  const pickFrame = (p: Product) =>
    setD((o) => {
      const old = o.frame.productId;
      const lines = o.lines.filter((l) => !old || l.productId !== old);
      return {
        ...o,
        frame: { productId: p.id, brand: p.brand, model: p.model, color: p.color, size: p.size, ownFrame: false },
        lines: [newLine(`Montatura ${p.brand} ${p.model}${p.color ? ` ${p.color}` : ''}`, p.price, p.vat ?? DEFAULT_VAT[p.category], p.medicalDevice ?? IS_MEDICAL_DEVICE[p.category], p.id), ...lines],
      };
    });

  const setOwnFrame = (own: boolean) =>
    setD((o) => {
      const old = o.frame.productId;
      return {
        ...o,
        frame: own ? { brand: '', model: '', color: '', size: '', ownFrame: true } : { ...o.frame, ownFrame: false },
        lines: own && old ? o.lines.filter((l) => l.productId !== old) : o.lines,
      };
    });

  const addLensLine = () => {
    const desc = lensDescription(d);
    const existing = d.lines.find((l) => !l.productId && (l.description.startsWith('Lenti ') || l.description.startsWith('Lenti a contatto')));
    if (existing) patchLine(existing.id, { description: desc, unitPrice: lensPrice || existing.unitPrice });
    else patch({ lines: [...d.lines, newLine(desc, lensPrice, 4, true)] });
  };

  const goTo = (i: number) => {
    // entrando nei prezzi aggiunge in automatico la riga lenti se manca
    if (i === 4 && hasLenses(d.type) && !d.lines.some((l) => !l.productId && l.description.startsWith('Lenti'))) {
      setD((o) => ({ ...o, lines: [...o.lines, newLine(lensDescription(o), lensPrice, 4, true)] }));
    }
    setStep(i);
  };

  const validate = (): string | null => {
    if (!d.customerId) return 'Seleziona il cliente.';
    if (d.lines.some((l) => !l.description.trim())) return 'Ogni riga di prezzo deve avere una descrizione.';
    if (totals.total > 0 && d.deposit > totals.total) return 'L’acconto supera il totale della busta.';
    return null;
  };

  const submit = async (alsoOrder: boolean) => {
    const err = validate();
    if (err) {
      notify(err, 'error');
      if (!d.customerId) setStep(0);
      return;
    }
    setSaving(true);
    try {
      let saved = await saveOrder(d, depositPayment);
      if (alsoOrder && saved.status === 'preventivo') saved = await setStatus(saved, 'ordinato', `Ordine inviato a ${saved.lab || 'laboratorio'}`);
      onSaved(saved);
    } catch {
      notify('Impossibile salvare la busta.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const typeHasRx = d.type !== 'Riparazione';
  const stepDisabled = (i: number) => (i === 1 && !typeHasRx) || (i === 2 && !hasFrame(d.type)) || (i === 3 && !hasLenses(d.type));

  const eyeRow = (eye: 'od' | 'os') => {
    const e = d.rx?.[eye];
    if (!e) return null;
    return (
      <div className="grid grid-cols-[32px_repeat(3,minmax(0,1fr))] gap-1.5 sm:grid-cols-[36px_repeat(7,minmax(0,1fr))]">
        <span className="flex items-center text-sm font-semibold text-cyan-300">{eye.toUpperCase()}</span>
        <NumInput ariaLabel={`Sfera ${eye}`} value={e.sph} onChange={(v) => patchEye(eye, { sph: v })} />
        <NumInput ariaLabel={`Cilindro ${eye}`} value={e.cyl} onChange={(v) => patchEye(eye, { cyl: v })} />
        <NumInput ariaLabel={`Asse ${eye}`} value={e.axis} min={0} max={180} step={1} onChange={(v) => patchEye(eye, { axis: Math.round(v) })} />
        <span className="sm:hidden" />
        <NumInput ariaLabel={`Addizione ${eye}`} value={e.add} onChange={(v) => patchEye(eye, { add: v })} />
        <NumInput ariaLabel={`Prisma ${eye}`} value={e.prism} step={0.5} onChange={(v) => patchEye(eye, { prism: v })} />
        <select className="input px-2" aria-label={`Base prisma ${eye}`} value={e.base} onChange={(ev) => patchEye(eye, { base: ev.target.value as EyeRx['base'] })}>
          {(['', 'IN', 'OUT', 'UP', 'DOWN'] as const).map((b) => (
            <option key={b} value={b}>
              {b || '—'}
            </option>
          ))}
        </select>
        <input className="input px-2" aria-label={`Acuità ${eye}`} placeholder="10/10" value={e.va} onChange={(ev) => patchEye(eye, { va: ev.target.value })} />
      </div>
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      icon={<Package size={18} />}
      title={isNew ? 'Nuova busta di lavoro' : `Modifica busta ${d.number}`}
      subtitle={customer ? `${customer.lastName} ${customer.firstName} · ${d.type}` : 'Seleziona cliente e tipo di lavoro'}
      footer={
        <>
          <div className="mr-auto text-sm text-slate-400">
            Totale <span className="font-semibold text-white">{eur(totals.total)}</span>
            {d.deposit > 0 && <span className="hidden sm:inline"> · acconto {eur(d.deposit)}</span>}
          </div>
          <button className="btn-ghost" disabled={step === 0} onClick={() => goTo(Math.max(0, step - 1))}>
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Indietro</span>
          </button>
          {step < STEPS.length - 1 && (
            <button className="btn-ghost" onClick={() => goTo(step + 1)}>
              <span className="hidden sm:inline">Avanti</span> <ChevronRight size={16} />
            </button>
          )}
          <button className={isNew && d.status === 'preventivo' ? 'btn-ghost' : 'btn-primary'} disabled={saving} onClick={() => submit(false)}>
            <Save size={16} /> {isNew ? 'Salva preventivo' : 'Salva'}
          </button>
          {isNew && d.status === 'preventivo' && (
            <button className="btn-primary" disabled={saving} onClick={() => submit(true)}>
              <Send size={16} /> Salva e ordina
            </button>
          )}
        </>
      }
    >
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-ink-850/95 px-3 py-2 backdrop-blur sm:px-5">
        <ol className="flex gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const disabled = stepDisabled(i);
            return (
              <li key={s} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    step === i ? 'bg-cyan-500/15 text-cyan-100' : disabled ? 'text-slate-600' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step > i ? 'bg-cyan-500/30 text-cyan-100' : 'border border-white/15'}`}>
                    {step > i ? <Check size={11} /> : i + 1}
                  </span>
                  {s}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {step === 0 && (
          <>
            <Section title="Cliente">
              <CustomerPicker customers={customers} value={d.customerId} onChange={(id) => patch({ customerId: id, rx: id === d.customerId ? d.rx : null })} />
            </Section>
            <Section title="Tipo di lavoro">
              <div className="flex flex-wrap gap-2">
                {ORDER_TYPES.map((t: OrderType) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setD((o) => ({
                        ...o,
                        type: t,
                        lenses: { ...o.lenses, design: t === 'Lenti a contatto' ? 'Lenti a contatto' : o.lenses.design === 'Lenti a contatto' ? 'Monofocale' : o.lenses.design },
                        lab: t === 'Riparazione' && !o.lab ? 'Laboratorio interno' : o.lab,
                      }))
                    }
                    className={`rounded-xl border px-3 py-2 text-sm transition-colors ${d.type === t ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-300 hover:border-white/25'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Laboratorio e consegna">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Laboratorio / fornitore">
                  <input className="input" list="orders-labs" value={d.lab} onChange={(e) => patch({ lab: e.target.value })} />
                  <datalist id="orders-labs">
                    {labs.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Data consegna prevista">
                  <input type="date" className="input" value={d.expectedDate ?? ''} onChange={(e) => patch({ expectedDate: e.target.value || undefined })} />
                </Field>
                <Field label="Note per il laboratorio / banco" className="sm:col-span-2">
                  <textarea className="input min-h-20" value={d.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Es. lenti sottili, curvatura base 6, consegna urgente…" />
                </Field>
              </div>
            </Section>
          </>
        )}

        {step === 1 &&
          (!typeHasRx ? (
            <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">Le riparazioni non richiedono una prescrizione.</p>
          ) : (
            <>
              <Section title="Prescrizioni del cliente">
                {!customer ? (
                  <p className="text-sm text-slate-500">Seleziona prima un cliente.</p>
                ) : customer.prescriptions.length === 0 ? (
                  <p className="text-sm text-slate-500">Il cliente non ha prescrizioni registrate: inseriscila manualmente qui sotto.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {[...customer.prescriptions]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((rx) => (
                        <button
                          key={rx.id}
                          type="button"
                          onClick={() => pickRx(rx)}
                          className={`rounded-xl border p-3 text-left text-sm transition-colors ${d.rx?.id === rx.id ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 hover:border-white/25'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-white">
                              {fmtDate(rx.date)} · {rx.kind}
                            </span>
                            {d.rx?.id === rx.id && <Check size={15} className="text-cyan-300" />}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">OD {rxLine(rx.od)}</p>
                          <p className="text-xs text-slate-400">OS {rxLine(rx.os)}</p>
                          <p className="mt-1 truncate text-[11px] text-slate-500">{rx.source}</p>
                        </button>
                      ))}
                  </div>
                )}
              </Section>
              <Section
                title="Prescrizione sulla busta"
                aside={
                  d.rx ? (
                    <button type="button" className="btn-ghost py-1 text-xs" onClick={() => patch({ rx: null })}>
                      <Trash2 size={13} /> Rimuovi
                    </button>
                  ) : (
                    <button type="button" className="btn-ghost py-1 text-xs" onClick={() => patch({ rx: emptyRx() })}>
                      <Plus size={13} /> Inserisci manualmente
                    </button>
                  )
                }
              >
                {!d.rx ? (
                  <p className="text-sm text-slate-500">Nessuna prescrizione selezionata.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Data">
                        <input type="date" className="input" value={d.rx.date} onChange={(e) => patchRx({ date: e.target.value })} />
                      </Field>
                      <Field label="Tipo">
                        <select className="input" value={d.rx.kind} onChange={(e) => patchRx({ kind: e.target.value as Prescription['kind'] })}>
                          {(['Lontano', 'Vicino', 'Intermedio', 'Progressivo', 'Lenti a contatto'] as const).map((k) => (
                            <option key={k}>{k}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Fonte">
                        <select className="input" value={d.rx.source} onChange={(e) => patchRx({ source: e.target.value as Prescription['source'] })}>
                          {(['Esame optometrico in negozio', 'Prescrizione oculista', 'Lensometria occhiale in uso'] as const).map((k) => (
                            <option key={k}>{k}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Prescrittore" className="sm:col-span-3">
                        <input className="input" value={d.rx.examiner} onChange={(e) => patchRx({ examiner: e.target.value })} placeholder="Es. Dott.ssa Bianchi, medico oculista" />
                      </Field>
                    </div>
                    <div className="space-y-1.5 overflow-x-auto">
                      <div className="hidden grid-cols-[36px_repeat(7,minmax(0,1fr))] gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 sm:grid">
                        <span />
                        <span>Sfera</span>
                        <span>Cilindro</span>
                        <span>Asse</span>
                        <span>Add</span>
                        <span>Prisma</span>
                        <span>Base</span>
                        <span>AV</span>
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 sm:hidden">Sfera · Cil · Asse / Add · Prisma · Base · AV</p>
                      {eyeRow('od')}
                      {eyeRow('os')}
                    </div>
                    <p className="text-xs text-slate-500">Le modifiche valgono solo per questa busta: la scheda cliente non viene alterata.</p>
                  </div>
                )}
              </Section>
            </>
          ))}

        {step === 2 &&
          (!hasFrame(d.type) ? (
            <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">Questo tipo di lavoro non prevede una montatura.</p>
          ) : (
            <Section
              title="Montatura"
              aside={
                <div className="flex rounded-xl border border-white/10 p-0.5">
                  <button type="button" onClick={() => setOwnFrame(false)} className={`rounded-lg px-3 py-1 text-xs ${!d.frame.ownFrame ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400'}`}>
                    Da magazzino
                  </button>
                  <button type="button" onClick={() => setOwnFrame(true)} className={`rounded-lg px-3 py-1 text-xs ${d.frame.ownFrame ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400'}`}>
                    Del cliente
                  </button>
                </div>
              }
            >
              {d.frame.ownFrame ? (
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Marca">
                    <input className="input" value={d.frame.brand} onChange={(e) => patchFrame({ brand: e.target.value })} />
                  </Field>
                  <Field label="Modello">
                    <input className="input" value={d.frame.model} onChange={(e) => patchFrame({ model: e.target.value })} />
                  </Field>
                  <Field label="Colore">
                    <input className="input" value={d.frame.color} onChange={(e) => patchFrame({ color: e.target.value })} />
                  </Field>
                  <Field label="Calibro">
                    <input className="input" placeholder="52-18-145" value={d.frame.size} onChange={(e) => patchFrame({ size: e.target.value })} />
                  </Field>
                  <p className="text-xs text-slate-500 sm:col-span-4">Montatura fornita dal cliente: verificarne lo stato prima del montaggio (nessuno scarico di magazzino).</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input pl-9" placeholder="Cerca marca, modello, colore, codice a barre…" value={frameQ} onChange={(e) => setFrameQ(e.target.value)} />
                  </div>
                  <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                    {frames.map((p) => {
                      const sel = d.frame.productId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => pickFrame(p)}
                          className={`rounded-xl border p-3 text-left transition-colors ${sel ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 hover:border-white/25'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {p.brand} {p.model}
                              </p>
                              <p className="truncate text-xs text-slate-400">{[p.color, p.size, p.category].filter(Boolean).join(' · ')}</p>
                            </div>
                            <Glasses size={16} className={sel ? 'text-cyan-300' : 'text-slate-600'} />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200">{eur(p.price)}</span>
                            <span className={`chip ${p.stock > 0 ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-rose-400/30 bg-rose-400/10 text-rose-200'}`}>
                              {p.stock > 0 ? `${p.stock} in stock` : 'Esaurita'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {frames.length === 0 && <p className="p-3 text-sm text-slate-500">Nessuna montatura trovata.</p>}
                  </div>
                </div>
              )}
            </Section>
          ))}

        {step === 3 &&
          (!hasLenses(d.type) ? (
            <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">Questo tipo di lavoro non prevede lenti.</p>
          ) : (
            <>
              <Section title={d.type === 'Lenti a contatto' ? 'Lenti a contatto' : 'Lenti oftalmiche'}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Marca">
                    <input className="input" list="orders-lens-brands" value={d.lenses.brand} onChange={(e) => patchLenses({ brand: e.target.value })} />
                    <datalist id="orders-lens-brands">
                      {LENS_BRANDS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Geometria">
                    <select className="input" value={d.lenses.design} onChange={(e) => patchLenses({ design: e.target.value as LensDesign })}>
                      {LENS_DESIGNS.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Materiale">
                    <select className="input" value={d.lenses.material} onChange={(e) => patchLenses({ material: e.target.value })}>
                      {[...new Set([...LENS_MATERIALS, d.lenses.material])].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Diametro (mm)">
                    <input className="input" inputMode="decimal" value={d.lenses.diameter} onChange={(e) => patchLenses({ diameter: e.target.value })} placeholder="65" />
                  </Field>
                </div>
                {d.type !== 'Lenti a contatto' && (
                  <div className="mt-3">
                    <span className="label">Indice di rifrazione</span>
                    <div className="flex flex-wrap gap-1.5">
                      {LENS_INDEXES.map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => patchLenses({ index: i })}
                          className={`rounded-lg border px-3 py-1.5 text-sm tabular-nums transition-colors ${d.lenses.index === i ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-300 hover:border-white/25'}`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <span className="label">Trattamenti</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set([...TREATMENTS, ...d.lenses.treatments])].map((t) => {
                      const on = d.lenses.treatments.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => patchLenses({ treatments: on ? d.lenses.treatments.filter((x) => x !== t) : [...d.lenses.treatments, t] })}
                          className={`chip transition-colors ${on ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-slate-400 hover:border-white/25'}`}
                        >
                          {on && <Check size={11} />} {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field label="Prezzo lenti (coppia)">
                    <NumInput value={lensPrice} min={0} step={1} onChange={setLensPrice} placeholder="Es. 390" />
                  </Field>
                  <button type="button" className="btn-ghost" onClick={addLensLine}>
                    <Plus size={15} /> Aggiorna riga lenti
                  </button>
                </div>
              </Section>
              {d.type !== 'Lenti a contatto' && (
                <Section title="Centratura">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    <Field label="DNP OD (mm)">
                      <NumInput value={d.centering.pdOd} step={0.5} onChange={(v) => patchCentering({ pdOd: v })} />
                    </Field>
                    <Field label="DNP OS (mm)">
                      <NumInput value={d.centering.pdOs} step={0.5} onChange={(v) => patchCentering({ pdOs: v })} />
                    </Field>
                    <Field label="Altezza OD">
                      <NumInput value={d.centering.heightOd} step={0.5} onChange={(v) => patchCentering({ heightOd: v })} />
                    </Field>
                    <Field label="Altezza OS">
                      <NumInput value={d.centering.heightOs} step={0.5} onChange={(v) => patchCentering({ heightOs: v })} />
                    </Field>
                    <Field label="Dist. apice (mm)">
                      <NumInput value={d.centering.vertex} step={0.5} onChange={(v) => patchCentering({ vertex: v })} />
                    </Field>
                    <Field label="Pantoscopico (°)">
                      <NumInput value={d.centering.pantoscopic} step={1} onChange={(v) => patchCentering({ pantoscopic: v })} />
                    </Field>
                    <Field label="Curvatura (°)">
                      <NumInput value={d.centering.wrap} step={1} onChange={(v) => patchCentering({ wrap: v })} />
                    </Field>
                  </div>
                  {d.lenses.design === 'Progressiva' && (!d.centering.heightOd || !d.centering.heightOs) && (
                    <p className="mt-2 text-xs text-amber-300">Per le lenti progressive indica le altezze di montaggio.</p>
                  )}
                </Section>
              )}
            </>
          ))}

        {step === 4 && (
          <>
            <Section
              title="Righe di prezzo"
              aside={
                <div className="flex flex-wrap gap-1.5">
                  {hasLenses(d.type) && (
                    <button type="button" className="btn-ghost py-1 text-xs" onClick={addLensLine}>
                      <Plus size={13} /> Lenti
                    </button>
                  )}
                  <button type="button" className="btn-ghost py-1 text-xs" onClick={() => patch({ lines: [...d.lines, newLine('', 0, 22, false)] })}>
                    <Plus size={13} /> Riga libera
                  </button>
                </div>
              }
            >
              {d.lines.length === 0 ? (
                <p className="text-sm text-slate-500">Nessuna riga. Aggiungi le voci della fornitura.</p>
              ) : (
                <div className="space-y-2">
                  <div className="hidden grid-cols-[minmax(0,1fr)_64px_100px_72px_64px_90px_32px] gap-2 text-[10px] uppercase tracking-wider text-slate-500 md:grid">
                    <span>Descrizione</span>
                    <span>Q.tà</span>
                    <span>Prezzo</span>
                    <span>IVA %</span>
                    <span>DM</span>
                    <span className="text-right">Importo</span>
                    <span />
                  </div>
                  {d.lines.map((l) => (
                    <div key={l.id} className="grid grid-cols-[1fr_1fr_1fr] gap-2 rounded-xl border border-white/[0.06] p-2 md:grid-cols-[minmax(0,1fr)_64px_100px_72px_64px_90px_32px] md:items-center md:border-0 md:p-0">
                      <input className="input col-span-3 md:col-span-1" placeholder="Descrizione" value={l.description} onChange={(e) => patchLine(l.id, { description: e.target.value })} />
                      <NumInput ariaLabel="Quantità" value={l.qty} min={0} step={1} onChange={(v) => patchLine(l.id, { qty: v })} />
                      <NumInput ariaLabel="Prezzo unitario" value={l.unitPrice} min={0} step={1} onChange={(v) => patchLine(l.id, { unitPrice: v })} />
                      <select className="input px-2" aria-label="IVA" value={l.vat} onChange={(e) => patchLine(l.id, { vat: Number(e.target.value) })}>
                        {[...new Set([4, 10, 22, 0, l.vat])].map((v) => (
                          <option key={v} value={v}>
                            {v}%
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-slate-400" title="Dispositivo medico (spesa sanitaria detraibile)">
                        <input type="checkbox" className="accent-cyan-500" checked={l.medicalDevice} onChange={(e) => patchLine(l.id, { medicalDevice: e.target.checked })} />
                        <span className="md:hidden">Disp. medico</span>
                        <span className="hidden md:inline">DM</span>
                      </label>
                      <span className="self-center text-right text-sm font-medium tabular-nums text-slate-100">{eur(lineTotal(l))}</span>
                      <button type="button" className="justify-self-end rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => patch({ lines: d.lines.filter((x) => x.id !== l.id) })} aria-label="Elimina riga">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section title="Sconto, acconto e totale">
              <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Sconto (€)">
                    <NumInput value={d.discount} min={0} step={1} onChange={(v) => patch({ discount: v })} />
                  </Field>
                  <Field label="Acconto (€)">
                    <NumInput value={d.deposit} min={0} step={1} onChange={(v) => patch({ deposit: v })} />
                  </Field>
                  <Field label="Pagamento acconto">
                    <select className="input" value={depositPayment} onChange={(e) => setDepositPayment(e.target.value as PaymentMethod)}>
                      {PAYMENTS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  {d.deposit > initial.deposit && (
                    <p className="text-xs text-slate-500 sm:col-span-3">
                      Al salvataggio verrà registrato un documento commerciale di acconto di {eur(d.deposit - initial.deposit)}.
                    </p>
                  )}
                </div>
                <dl className="space-y-1.5 rounded-xl border border-white/[0.06] bg-ink-900/60 p-3 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <dt>Lordo</dt>
                    <dd className="tabular-nums">{eur(totals.gross)}</dd>
                  </div>
                  {d.discount > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <dt>Sconto</dt>
                      <dd className="tabular-nums">−{eur(d.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-white">
                    <dt>Totale</dt>
                    <dd className="tabular-nums">{eur(totals.total)}</dd>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <dt>Acconti e pagamenti</dt>
                    <dd className="tabular-nums">−{eur(d.deposit + d.paid)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-white/[0.06] pt-1.5 font-semibold text-cyan-200">
                    <dt>Saldo al ritiro</dt>
                    <dd className="tabular-nums">{eur(totals.due)}</dd>
                  </div>
                </dl>
              </div>
            </Section>
          </>
        )}
      </div>
    </Modal>
  );
}
