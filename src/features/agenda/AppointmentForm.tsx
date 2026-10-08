import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CalendarClock, FilePlus2, MessageCircle, MessageSquare, Search, Trash2, UserRound, X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { Appointment, AppointmentType } from '../../store/types';
import type { ViewId } from '../../types';
import { contactLink, fullName, newId } from '../../store/utils';
import { fromMin, toMin, weekdayLong } from './dates';
import { APPT_TYPES, DAY_END, DAY_START, DURATIONS, SLOT, STATUSES, STATUS_META, isActive, overlaps, type ApptStatus } from './shared';

export interface ApptDraft {
  id?: string;
  customerId?: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  operator: string;
  status: ApptStatus;
  notes: string;
}

interface Props {
  draft: ApptDraft | null;
  onClose: () => void;
  onNavigate: (view: ViewId, focusId?: string) => void;
}

const TIME_OPTIONS: string[] = [];
for (let m = DAY_START; m < DAY_END; m += SLOT) TIME_OPTIONS.push(fromMin(m));

export function AppointmentForm({ draft, onClose, onNavigate }: Props) {
  return (
    <Modal
      open={draft !== null}
      onClose={onClose}
      size="md"
      icon={<CalendarClock size={18} />}
      title={draft?.id ? 'Modifica appuntamento' : 'Nuovo appuntamento'}
      subtitle={draft ? `${weekdayLong(draft.date)} · ore ${draft.time}` : undefined}
    >
      {draft && <FormBody key={draft.id ?? `new-${draft.date}-${draft.time}-${draft.customerId ?? ''}`} initial={draft} onClose={onClose} onNavigate={onNavigate} />}
    </Modal>
  );
}

function FormBody({ initial, onClose, onNavigate }: { initial: ApptDraft; onClose: () => void; onNavigate: Props['onNavigate'] }) {
  const { customers, appointments, put, remove, customerById, settings } = useStore();
  const { notify } = useApp();
  const [d, setD] = useState<ApptDraft>(initial);
  const [mode, setMode] = useState<'cliente' | 'libero'>(initial.customerId || !initial.id ? 'cliente' : 'libero');
  const [q, setQ] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const customer = customerById(d.customerId);
  const set = <K extends keyof ApptDraft>(k: K, v: ApptDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? customers.filter((c) => `${c.firstName} ${c.lastName} ${c.lastName} ${c.firstName} ${c.phone} ${c.code} ${c.fiscalCode}`.toLowerCase().includes(s))
      : customers;
    return [...list].sort((a, b) => fullName(a).localeCompare(fullName(b))).slice(0, 8);
  }, [customers, q]);

  const operators = useMemo(() => [...new Set(appointments.map((a) => a.operator.trim()).filter(Boolean))].sort(), [appointments]);

  const conflicts = useMemo(() => {
    const op = d.operator.trim().toLowerCase();
    if (!op || d.status === 'annullato') return [];
    return appointments.filter((a) => a.id !== d.id && a.date === d.date && isActive(a) && a.operator.trim().toLowerCase() === op && overlaps(a, d));
  }, [appointments, d]);

  const timeOptions = TIME_OPTIONS.includes(d.time) ? TIME_OPTIONS : [...TIME_OPTIONS, d.time].sort((a, b) => toMin(a) - toMin(b));
  const endsAfterClose = toMin(d.time) + d.duration > DAY_END;

  const pick = (id: string) => {
    const c = customerById(id);
    if (!c) return;
    setD((x) => ({ ...x, customerId: c.id, name: `${c.firstName} ${c.lastName}`.trim(), phone: c.phone }));
    setQ('');
    setPickerOpen(false);
  };

  const displayName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : d.name.trim();
  const phone = d.phone.trim() || customer?.phone || '';
  const reminder = `Gentile ${customer?.firstName || displayName}, le ricordiamo l’appuntamento “${d.type}” di ${weekdayLong(d.date)} alle ore ${d.time} presso ${settings.businessName}${settings.address ? ` (${settings.address}${settings.city ? `, ${settings.city}` : ''})` : ''}. Per spostarlo o annullarlo risponda pure a questo messaggio. ${settings.messageSignature}`.trim();
  const waLink = phone ? contactLink('WhatsApp', { phone, email: '' }, reminder) : null;
  const smsLink = phone ? contactLink('SMS', { phone, email: '' }, reminder) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName) {
      notify('Indica il cliente o un nominativo.', 'error');
      return;
    }
    setSaving(true);
    try {
      const doc: Appointment = {
        id: d.id ?? newId(),
        customerId: mode === 'cliente' ? d.customerId : undefined,
        name: displayName,
        phone: phone,
        date: d.date,
        time: d.time,
        duration: d.duration,
        type: d.type,
        operator: d.operator.trim(),
        status: d.status,
        notes: d.notes.trim(),
      };
      await put('appointments', doc);
      notify(d.id ? 'Appuntamento aggiornato.' : 'Appuntamento creato.');
      onClose();
    } catch {
      notify('Impossibile salvare l’appuntamento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!d.id) return;
    try {
      await remove('appointments', d.id);
      notify('Appuntamento eliminato.', 'info');
      onClose();
    } catch {
      notify('Impossibile eliminare l’appuntamento.', 'error');
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col">
      <div className="space-y-4 p-5">
        {/* Cliente */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="label !mb-0">Cliente</span>
            <div className="flex rounded-lg border border-white/10 bg-ink-900/60 p-0.5 text-xs">
              {(['cliente', 'libero'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    if (m === 'libero') set('customerId', undefined);
                  }}
                  className={`rounded-md px-2.5 py-1 transition ${mode === m ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {m === 'cliente' ? 'In archivio' : 'Nominativo libero'}
                </button>
              ))}
            </div>
          </div>
          {mode === 'cliente' ? (
            customer ? (
              <div className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] px-3 py-2">
                <UserRound size={16} className="shrink-0 text-cyan-300" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{fullName(customer)}</div>
                  <div className="truncate text-xs text-slate-400">
                    {customer.code} · {customer.phone || 'nessun telefono'}
                  </div>
                </div>
                <button type="button" className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => set('customerId', undefined)} aria-label="Cambia cliente">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-9"
                  placeholder="Cerca per nome, telefono, codice…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPickerOpen(true);
                  }}
                  onFocus={() => setPickerOpen(true)}
                  onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
                />
                {pickerOpen && (
                  <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 py-1 shadow-2xl shadow-black/50">
                    {matches.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Nessun cliente trovato</li>}
                    {matches.map((c) => (
                      <li key={c.id}>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-cyan-400/10">
                          <span className="truncate text-slate-100">{fullName(c)}</span>
                          <span className="shrink-0 text-xs text-slate-500">{c.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder="Nome e cognome" value={d.name} onChange={(e) => set('name', e.target.value)} />
              <input className="input" placeholder="Telefono" type="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Tipo</span>
            <select className="input" value={d.type} onChange={(e) => set('type', e.target.value as AppointmentType)}>
              {APPT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Stato</span>
            <select className="input" value={d.status} onChange={(e) => set('status', e.target.value as ApptStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Data</span>
            <input className="input" type="date" required value={d.date} onChange={(e) => e.target.value && set('date', e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Ora</span>
              <select className="input" value={d.time} onChange={(e) => set('time', e.target.value)}>
                {timeOptions.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Durata</span>
              <select className="input" value={d.duration} onChange={(e) => set('duration', Number(e.target.value))}>
                {(DURATIONS.includes(d.duration) ? DURATIONS : [...DURATIONS, d.duration].sort((a, b) => a - b)).map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block sm:col-span-2">
            <span className="label">Operatore</span>
            <input className="input" list="agenda-operators" placeholder="Es. Luca" value={d.operator} onChange={(e) => set('operator', e.target.value)} />
            <datalist id="agenda-operators">
              {operators.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Note</span>
            <textarea className="input min-h-[72px]" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
          </label>
        </div>

        {conflicts.length > 0 && (
          <div className="flex gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              {d.operator.trim()} ha già {conflicts.length === 1 ? 'un appuntamento' : `${conflicts.length} appuntamenti`} in questa fascia:{' '}
              {conflicts.map((c) => `${c.time} ${c.name} (${c.duration}′)`).join(', ')}.
            </div>
          </div>
        )}
        {endsAfterClose && <p className="text-xs text-amber-300">L’appuntamento termina dopo le 20:00.</p>}

        {d.id && (
          <div className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3">
            <p className="label">Azioni</p>
            <div className="flex flex-wrap gap-2">
              {waLink ? (
                <a className="btn-ghost text-xs" href={waLink} target="_blank" rel="noreferrer">
                  <MessageCircle size={14} /> Conferma via WhatsApp
                </a>
              ) : null}
              {smsLink ? (
                <a className="btn-ghost text-xs" href={smsLink}>
                  <MessageSquare size={14} /> Conferma via SMS
                </a>
              ) : null}
              {!phone && <span className="text-xs text-slate-500">Nessun telefono: impossibile inviare il promemoria.</span>}
              {customer && (
                <>
                  <button type="button" className="btn-ghost text-xs" onClick={() => onNavigate('customers', customer.id)}>
                    <UserRound size={14} /> Apri cliente
                  </button>
                  <button type="button" className="btn-ghost text-xs" onClick={() => onNavigate('orders', `new:${customer.id}`)}>
                    <FilePlus2 size={14} /> Nuova busta
                  </button>
                </>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">I link aprono l’app di messaggistica con il testo precompilato: nulla viene inviato automaticamente.</p>
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] bg-ink-900/95 px-5 py-3 backdrop-blur">
        <div>
          {d.id &&
            (confirmDelete ? (
              <div className="flex items-center gap-2">
                <button type="button" className="btn-danger text-xs" onClick={doDelete}>
                  Conferma eliminazione
                </button>
                <button type="button" className="btn-ghost text-xs" onClick={() => setConfirmDelete(false)}>
                  No
                </button>
              </div>
            ) : (
              <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} /> Elimina
              </button>
            ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annulla
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </footer>
    </form>
  );
}
