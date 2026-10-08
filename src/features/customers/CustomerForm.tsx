import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, ShieldCheck, UserPlus, UserRoundPen, XCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import type { ContactChannel, Customer } from '../../store/types';
import { isValidFiscalCode } from '../../store/utils';
import { TAG_SUGGESTIONS, VISUAL_NEEDS } from './helpers';
import { ChipToggle, Field, Toggle } from './ui';

interface Props {
  open: boolean;
  initial: Customer | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (c: Customer) => Promise<void>;
}

const CHANNELS: ContactChannel[] = ['WhatsApp', 'SMS', 'Email', 'Telefono'];

export function CustomerForm({ open, initial, isNew, onClose, onSave }: Props) {
  const [c, setC] = useState<Customer | null>(initial);
  const [tagDraft, setTagDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (open) {
      setC(initial);
      setTried(false);
      setTagDraft('');
    }
  }, [open, initial]);

  if (!c) return null;

  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setC((p) => (p ? { ...p, [k]: v } : p));
  const setConsent = (k: keyof Customer['consents'], v: boolean) =>
    setC((p) => {
      if (!p) return p;
      const consents = { ...p.consents, [k]: v };
      if (v && (k === 'privacy' || k === 'healthData')) consents.signedAt = new Date().toISOString();
      return { ...p, consents };
    });
  const toggleIn = (k: 'visualNeeds' | 'tags', v: string) => set(k, c[k].includes(v) ? c[k].filter((x) => x !== v) : [...c[k], v]);

  const cf = c.fiscalCode.trim().toUpperCase();
  const cfState: 'empty' | 'ok' | 'bad' = !cf ? 'empty' : isValidFiscalCode(cf) ? 'ok' : 'bad';
  const emailBad = !!c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email);
  const nameMissing = !c.firstName.trim() || !c.lastName.trim();
  const consentMissing = !c.consents.privacy || !c.consents.healthData;
  const hasClinical = c.prescriptions.length > 0 || c.contactLenses.length > 0;
  const zipBad = !!c.zip && !/^\d{5}$/.test(c.zip);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (nameMissing || cfState === 'bad' || emailBad || zipBad) return;
    setSaving(true);
    try {
      await onSave({
        ...c,
        firstName: c.firstName.trim(),
        lastName: c.lastName.trim(),
        fiscalCode: cf,
        email: c.email.trim(),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // errore già notificato
    } finally {
      setSaving(false);
    }
  };

  const customTags = c.tags.filter((t) => !TAG_SUGGESTIONS.includes(t));
  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !c.tags.includes(t)) set('tags', [...c.tags, t]);
    setTagDraft('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={isNew ? <UserPlus size={18} /> : <UserRoundPen size={18} />}
      title={isNew ? 'Nuovo cliente' : `Modifica ${c.lastName} ${c.firstName}`}
      subtitle={
        <span>
          Codice <span className="font-mono text-cyan-200">{c.code}</span>
        </span>
      }
      footer={
        <>
          {tried && (nameMissing || cfState === 'bad' || emailBad || zipBad) && <span className="mr-auto text-xs text-rose-300">Controlla i campi evidenziati.</span>}
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annulla
          </button>
          <button type="submit" form="customer-form" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {isNew ? 'Crea cliente' : 'Salva modifiche'}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="space-y-6 p-5">
        {/* anagrafica */}
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Anagrafica</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Field label="Nome *" className="lg:col-span-2">
              <input autoFocus className={`input ${tried && !c.firstName.trim() ? 'border-rose-400/60' : ''}`} value={c.firstName} onChange={(e) => set('firstName', e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Cognome *" className="lg:col-span-2">
              <input className={`input ${tried && !c.lastName.trim() ? 'border-rose-400/60' : ''}`} value={c.lastName} onChange={(e) => set('lastName', e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Sesso">
              <select className="input" value={c.sex} onChange={(e) => set('sex', e.target.value as Customer['sex'])}>
                <option value="F">F</option>
                <option value="M">M</option>
                <option value="X">Altro</option>
              </select>
            </Field>
            <Field label="Nascita">
              <input type="date" className="input" value={c.birthDate ?? ''} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('birthDate', e.target.value || undefined)} />
            </Field>
            <Field
              label="Codice fiscale"
              className="lg:col-span-3"
              hint={
                cfState === 'ok' ? (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 size={12} /> Codice fiscale formalmente valido
                  </span>
                ) : cfState === 'bad' ? (
                  <span className="flex items-center gap-1 text-rose-300">
                    <XCircle size={12} /> {cf.length !== 16 ? `${cf.length}/16 caratteri` : 'Carattere di controllo non valido'}
                  </span>
                ) : (
                  <span className="text-slate-500">Necessario per detrazioni e Sistema Tessera Sanitaria</span>
                )
              }
            >
              <input
                className={`input font-mono uppercase tracking-wider ${cfState === 'bad' ? 'border-rose-400/60' : cfState === 'ok' ? 'border-emerald-400/40' : ''}`}
                value={c.fiscalCode}
                maxLength={16}
                onChange={(e) => set('fiscalCode', e.target.value.toUpperCase().replace(/\s/g, ''))}
                autoComplete="off"
              />
            </Field>
            <Field label="Professione" className="lg:col-span-3">
              <input className="input" value={c.profession} onChange={(e) => set('profession', e.target.value)} />
            </Field>
            <Field label="Telefono" className="lg:col-span-3">
              <input type="tel" className="input" value={c.phone} placeholder="+39 333 1234567" onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email" className="lg:col-span-3" hint={emailBad ? <span className="text-rose-300">Indirizzo email non valido</span> : undefined}>
              <input type="email" className={`input ${emailBad ? 'border-rose-400/60' : ''}`} value={c.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Indirizzo" className="sm:col-span-2 lg:col-span-3">
              <input className="input" value={c.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="CAP" hint={zipBad ? <span className="text-rose-300">5 cifre</span> : undefined}>
              <input className={`input font-mono ${zipBad ? 'border-rose-400/60' : ''}`} inputMode="numeric" maxLength={5} value={c.zip} onChange={(e) => set('zip', e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label="Città" className="lg:col-span-2">
              <input className="input" value={c.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
          </div>
        </section>

        {/* esigenze e preferenze */}
        <section className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Esigenze visive</h3>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...VISUAL_NEEDS, ...c.visualNeeds])].map((v) => (
                <ChipToggle key={v} active={c.visualNeeds.includes(v)} onClick={() => toggleIn('visualNeeds', v)}>
                  {v}
                </ChipToggle>
              ))}
            </div>
            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Canale preferito</h3>
            <div className="flex rounded-xl border border-white/10 p-0.5">
              {CHANNELS.map((ch) => (
                <button
                  type="button"
                  key={ch}
                  onClick={() => set('preferredChannel', ch)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${c.preferredChannel === ch ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Tag</h3>
            <div className="flex flex-wrap gap-1.5">
              {[...TAG_SUGGESTIONS, ...customTags].map((t) => (
                <ChipToggle key={t} active={c.tags.includes(t)} onClick={() => toggleIn('tags', t)}>
                  {t}
                </ChipToggle>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="input py-1.5 text-xs"
                placeholder="Nuovo tag…"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button type="button" className="btn-ghost px-2.5 py-1.5 text-xs" onClick={addTag} disabled={!tagDraft.trim()}>
                <Plus size={14} />
              </button>
            </div>
            <Field label="Note" className="mt-4">
              <textarea className="input min-h-20 resize-y" value={c.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Preferenze, patologie riferite, terapie…" />
            </Field>
          </div>
        </section>

        {/* consensi */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
              <ShieldCheck size={14} /> Consensi GDPR
            </h3>
            {c.consents.signedAt && <span className="text-[11px] text-slate-500">Firmati il {new Date(c.consents.signedAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>}
          </div>
          {consentMissing && (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3 text-xs leading-relaxed text-amber-100">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
              <span>
                Senza <b>informativa privacy (art. 13)</b> e <b>consenso ai dati sanitari (art. 9)</b> non è possibile registrare prescrizioni, misure e applicazioni di lenti a contatto per questo cliente.
                {hasClinical && ' Il cliente ha già dati visivi registrati: raccogli il consenso al più presto.'}
              </span>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle required checked={c.consents.privacy} onChange={(v) => setConsent('privacy', v)} label="Informativa privacy (art. 13)" description="Presa visione dell’informativa e trattamento dei dati anagrafici e di vendita." />
            <Toggle required checked={c.consents.healthData} onChange={(v) => setConsent('healthData', v)} label="Dati relativi alla salute (art. 9)" description="Esame della vista, prescrizioni, misure e applicazione di lenti a contatto." />
            <Toggle checked={c.consents.reminders} onChange={(v) => setConsent('reminders', v)} label="Promemoria di servizio" description="Avvisi di ritiro, controlli periodici, riordino lenti a contatto." />
            <Toggle checked={c.consents.marketing} onChange={(v) => setConsent('marketing', v)} label="Comunicazioni promozionali" description="Offerte, novità e iniziative del centro ottico." />
            <Toggle
              checked={c.consents.stsOpposition}
              onChange={(v) => setConsent('stsOpposition', v)}
              label="Opposizione invio al Sistema TS"
              description="Il cliente si oppone alla trasmissione delle spese sanitarie al Sistema Tessera Sanitaria (precompilata 730)."
            />
          </div>
        </section>
      </form>
    </Modal>
  );
}
