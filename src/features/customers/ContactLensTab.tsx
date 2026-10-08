import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, CircleDot, PackageCheck, Pencil, Plus, ShieldAlert, ShoppingCart, Trash2, X } from 'lucide-react';
import type { ContactLensFit, Customer } from '../../store/types';
import { dpt, fmtDate, todayISO } from '../../store/utils';
import type { ViewId } from '../../types';
import { CL_REPLACEMENTS, CL_STATE, clReorder, emptyCl } from './helpers';
import { Empty, Field, NumField, SectionTitle } from './ui';

interface Props {
  customer: Customer;
  onSave: (c: Customer, msg?: string) => Promise<void>;
  onNavigate: (view: ViewId, focusId?: string) => void;
  onGoPrivacy: () => void;
}

type ClEye = ContactLensFit['od'];

const SUPPLY_PRESETS = [30, 90, 180, 365];

export function ContactLensTab({ customer: c, onSave, onNavigate, onGoPrivacy }: Props) {
  const [editing, setEditing] = useState<ContactLensFit | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const list = useMemo(() => [...c.contactLenses].sort((a, b) => b.date.localeCompare(a.date)), [c]);
  const canWrite = c.consents.privacy && c.consents.healthData;

  const upsert = async (f: ContactLensFit, msg: string) => {
    const exists = c.contactLenses.some((x) => x.id === f.id);
    await onSave({ ...c, contactLenses: exists ? c.contactLenses.map((x) => (x.id === f.id ? f : x)) : [...c.contactLenses, f] }, msg);
  };

  if (editing)
    return (
      <ClEditor
        fit={editing}
        isNew={!c.contactLenses.some((x) => x.id === editing.id)}
        onCancel={() => setEditing(null)}
        onSave={async (f) => {
          await upsert(f, 'Applicazione LAC salvata.');
          setEditing(null);
        }}
      />
    );

  return (
    <div className="space-y-5">
      {!canWrite && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3 text-sm text-amber-100">
          <ShieldAlert size={18} className="shrink-0 text-amber-300" />
          <span className="min-w-0 flex-1">Senza consenso ai dati sanitari non è possibile registrare applicazioni di lenti a contatto.</span>
          <button className="btn-ghost py-1.5 text-xs" onClick={onGoPrivacy}>
            Raccogli consensi <ArrowRight size={14} />
          </button>
        </div>
      )}
      <SectionTitle
        icon={<CircleDot size={14} />}
        actions={
          <button className="btn-primary py-1.5 text-xs" disabled={!canWrite} onClick={() => setEditing(list[0] ? { ...list[0], id: emptyCl().id, date: todayISO(), lastSupplyDate: todayISO(), notes: '' } : emptyCl())}>
            <Plus size={14} /> Nuova applicazione
          </button>
        }
      >
        Lenti a contatto ({list.length})
      </SectionTitle>

      {list.length === 0 ? (
        <Empty icon={<CircleDot size={30} />}>Nessuna applicazione di lenti a contatto registrata.</Empty>
      ) : (
        <div className="space-y-3">
          {list.map((f, i) => {
            const r = clReorder(f);
            const st = CL_STATE[r.state];
            return (
              <div key={f.id} className={`rounded-2xl border p-4 ${i === 0 ? 'border-cyan-400/25 bg-cyan-400/[0.03]' : 'border-white/[0.06] bg-ink-900/40'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">
                        {f.brand} {f.product}
                      </span>
                      <span className="chip border-white/10 bg-white/[0.03] text-slate-300">{f.replacement}</span>
                      {i === 0 && <span className={`chip ${st.tone}`}>{st.label}</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Applicazione del {fmtDate(f.date)}
                      {f.solution && f.solution !== '—' ? ` · Soluzione: ${f.solution}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {i === 0 && (
                      <button className="btn-primary px-2.5 py-1.5 text-xs" onClick={() => onNavigate('pos', `new:${c.id}`)}>
                        <ShoppingCart size={14} /> Vendita riordino
                      </button>
                    )}
                    {i === 0 && canWrite && (
                      <button
                        className="btn-ghost px-2.5 py-1.5 text-xs"
                        title="Registra una nuova fornitura consegnata oggi"
                        onClick={() => upsert({ ...f, lastSupplyDate: todayISO() }, 'Fornitura registrata: riordino aggiornato.')}
                      >
                        <PackageCheck size={14} /> <span className="hidden sm:inline">Fornitura oggi</span>
                      </button>
                    )}
                    <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-cyan-300" onClick={() => setEditing(f)} aria-label="Modifica">
                      <Pencil size={15} />
                    </button>
                    <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300" onClick={() => setConfirmDel(f.id)} aria-label="Elimina">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[460px] text-sm">
                    <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-1.5 pr-2 text-left font-medium" />
                        <th className="px-2 py-1.5 text-right font-medium">Potere</th>
                        <th className="px-2 py-1.5 text-right font-medium">Cil</th>
                        <th className="px-2 py-1.5 text-right font-medium">Asse</th>
                        <th className="px-2 py-1.5 text-right font-medium">Add</th>
                        <th className="px-2 py-1.5 text-right font-medium">BC</th>
                        <th className="px-2 py-1.5 text-right font-medium">DIA</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono tabular-nums">
                      {(
                        [
                          ['OD', f.od],
                          ['OS', f.os],
                        ] as const
                      ).map(([l, e]) => (
                        <tr key={l} className="border-t border-white/[0.05]">
                          <td className="py-1.5 pr-2 font-sans text-xs font-semibold text-cyan-300">{l}</td>
                          <td className="px-2 py-1.5 text-right text-white">{dpt(e.power)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-200">{e.cyl ? dpt(e.cyl) : '—'}</td>
                          <td className="px-2 py-1.5 text-right text-slate-200">{e.cyl ? `${e.axis ?? 0}°` : '—'}</td>
                          <td className="px-2 py-1.5 text-right text-slate-200">{e.add || '—'}</td>
                          <td className="px-2 py-1.5 text-right text-slate-300">{e.bc.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-300">{e.dia.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Info label="Ultima fornitura" value={fmtDate(f.lastSupplyDate)} />
                  <Info label="Copertura" value={f.supplyDays ? `${f.supplyDays} giorni` : '—'} />
                  <Info
                    label="Riordino previsto"
                    value={
                      r.date ? (
                        <span className={r.state === 'overdue' ? 'text-rose-300' : r.state === 'soon' ? 'text-amber-300' : 'text-emerald-300'}>
                          {fmtDate(r.date)}{' '}
                          <span className="text-xs text-slate-400">
                            ({r.days !== undefined && r.days < 0 ? `scaduto da ${-r.days} gg` : r.days === 0 ? 'oggi' : `tra ${r.days} gg`})
                          </span>
                        </span>
                      ) : (
                        '—'
                      )
                    }
                  />
                </div>
                {f.notes && <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{f.notes}</p>}

                {confirmDel === f.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                    <span className="flex-1">Eliminare questa applicazione?</span>
                    <button className="btn-ghost py-1.5 text-xs" onClick={() => setConfirmDel(null)}>
                      Annulla
                    </button>
                    <button
                      className="btn-danger py-1.5 text-xs"
                      onClick={async () => {
                        await onSave({ ...c, contactLenses: c.contactLenses.filter((x) => x.id !== f.id) }, 'Applicazione eliminata.');
                        setConfirmDel(null);
                      }}
                    >
                      <Trash2 size={14} /> Elimina
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function ClEditor({ fit, isNew, onCancel, onSave }: { fit: ContactLensFit; isNew: boolean; onCancel: () => void; onSave: (f: ContactLensFit) => Promise<void> }) {
  const [f, setF] = useState<ContactLensFit>(fit);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ContactLensFit>(k: K, v: ContactLensFit[K]) => setF((p) => ({ ...p, [k]: v }));
  const setEye = (side: 'od' | 'os', patch: Partial<ClEye>) => setF((p) => ({ ...p, [side]: { ...p[side], ...patch } }));
  const valid = f.brand.trim() && f.product.trim() && f.date;

  const row = (side: 'od' | 'os') => {
    const e = f[side];
    const l = side.toUpperCase();
    return (
      <tr className="border-t border-white/[0.05]">
        <td className="py-2 pr-2 text-xs font-semibold text-cyan-300">{l}</td>
        <td className="p-1">
          <NumField ariaLabel={`Potere ${l}`} value={e.power} onChange={(v) => setEye(side, { power: v ?? 0 })} step={0.25} snap signed decimals={2} min={-30} max={30} />
        </td>
        <td className="p-1">
          <NumField ariaLabel={`Cilindro ${l}`} value={e.cyl} onChange={(v) => setEye(side, { cyl: v || undefined })} step={0.25} snap signed decimals={2} min={-6} max={0} />
        </td>
        <td className="p-1">
          <NumField ariaLabel={`Asse ${l}`} value={e.axis} onChange={(v) => setEye(side, { axis: v === undefined ? undefined : Math.round(v) })} step={10} min={0} max={180} />
        </td>
        <td className="p-1">
          <input className="input px-2 text-center font-mono" aria-label={`Addizione ${l}`} placeholder="LOW/MED/HIGH" value={e.add ?? ''} onChange={(ev) => setEye(side, { add: ev.target.value || undefined })} />
        </td>
        <td className="p-1">
          <NumField ariaLabel={`BC ${l}`} value={e.bc} onChange={(v) => setEye(side, { bc: v ?? 0 })} step={0.1} decimals={2} min={5} max={11} />
        </td>
        <td className="p-1">
          <NumField ariaLabel={`DIA ${l}`} value={e.dia} onChange={(v) => setEye(side, { dia: v ?? 0 })} step={0.1} decimals={1} min={8} max={16} />
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-white">{isNew ? 'Nuova applicazione LAC' : 'Modifica applicazione LAC'}</h3>
        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onCancel} aria-label="Chiudi editor">
          <X size={18} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Data applicazione">
          <input type="date" className="input" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Marca *">
          <input className="input" value={f.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Alcon, CooperVision…" />
        </Field>
        <Field label="Prodotto *">
          <input className="input" value={f.product} onChange={(e) => set('product', e.target.value)} placeholder="Biofinity, Dailies Total1…" />
        </Field>
        <Field label="Ricambio">
          <select className="input" value={f.replacement} onChange={(e) => set('replacement', e.target.value as ContactLensFit['replacement'])}>
            {CL_REPLACEMENTS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-ink-900/40 p-3">
        <table className="w-full min-w-[560px]">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-8" />
              <th className="px-1 pb-1 font-medium">Potere</th>
              <th className="px-1 pb-1 font-medium">Cilindro</th>
              <th className="px-1 pb-1 font-medium">Asse</th>
              <th className="px-1 pb-1 font-medium">Add</th>
              <th className="px-1 pb-1 font-medium">BC</th>
              <th className="px-1 pb-1 font-medium">DIA</th>
            </tr>
          </thead>
          <tbody>
            {row('od')}
            {row('os')}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Soluzione">
          <input className="input" value={f.solution} onChange={(e) => set('solution', e.target.value)} placeholder="— per giornaliere" />
        </Field>
        <Field label="Ultima fornitura">
          <input type="date" className="input" value={f.lastSupplyDate ?? ''} onChange={(e) => set('lastSupplyDate', e.target.value || undefined)} />
        </Field>
        <Field label="Giorni di copertura">
          <div className="flex gap-1.5">
            <NumField value={f.supplyDays} onChange={(v) => set('supplyDays', v === undefined ? undefined : Math.round(v))} step={30} min={0} max={730} className="w-20" />
            {SUPPLY_PRESETS.map((d) => (
              <button key={d} type="button" className={`rounded-lg border px-2 text-xs transition-colors ${f.supplyDays === d ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`} onClick={() => set('supplyDays', d)}>
                {d}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Note di applicazione">
        <textarea className="input min-h-20 resize-y" value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Centratura, movimento, comfort, istruzioni d’uso…" />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>
          Annulla
        </button>
        <button
          className="btn-primary"
          disabled={!valid || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({ ...f, brand: f.brand.trim(), product: f.product.trim() });
            } catch {
              // errore già notificato
            } finally {
              setSaving(false);
            }
          }}
        >
          {isNew ? 'Registra applicazione' : 'Salva modifiche'}
        </button>
      </div>
    </div>
  );
}
