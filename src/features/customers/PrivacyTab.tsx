import { useState } from 'react';
import { AlertTriangle, Download, FileText, Loader2, Printer, ShieldCheck, Trash2 } from 'lucide-react';
import { usePrint } from '../../components/Print';
import { useStore } from '../../store/StoreContext';
import type { Consents, Customer } from '../../store/types';
import { fullName } from '../../store/utils';
import { downloadJson } from './helpers';
import { PrivacyDoc } from './prints';
import { SectionTitle, Toggle } from './ui';

interface Props {
  customer: Customer;
  onSave: (c: Customer, msg?: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function PrivacyTab({ customer: c, onSave, onDelete }: Props) {
  const { settings, orders, sales, appointments } = useStore();
  const print = usePrint();
  const [confirmText, setConfirmText] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const setConsent = (k: keyof Omit<Consents, 'signedAt'>, v: boolean) => {
    const consents: Consents = { ...c.consents, [k]: v };
    if (v && (k === 'privacy' || k === 'healthData')) consents.signedAt = new Date().toISOString();
    onSave({ ...c, consents }, 'Consensi aggiornati.').catch(() => undefined);
  };

  const myOrders = orders.filter((o) => o.customerId === c.id);
  const mySales = sales.filter((s) => s.customerId === c.id);
  const myAppts = appointments.filter((a) => a.customerId === c.id);

  const exportData = () => {
    downloadJson(`dati-cliente-${c.code}-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      titolare: { businessName: settings.businessName, vatNumber: settings.vatNumber, address: settings.address, city: settings.city, email: settings.email },
      nota: 'Esportazione dei dati personali ai sensi dell’art. 20 GDPR (diritto alla portabilità).',
      cliente: c,
      buste: myOrders,
      vendite: mySales,
      appuntamenti: myAppts,
    });
  };

  const canDelete = confirmText.trim().toLowerCase() === c.lastName.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle icon={<ShieldCheck size={14} />}>Consensi GDPR</SectionTitle>
        {(!c.consents.privacy || !c.consents.healthData) && (
          <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3 text-xs leading-relaxed text-amber-100">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
            Privacy (art. 13) e dati sanitari (art. 9) sono necessari per registrare prescrizioni e lenti a contatto. Stampa il modulo, fallo firmare e attiva i consensi.
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle required checked={c.consents.privacy} onChange={(v) => setConsent('privacy', v)} label="Informativa privacy (art. 13)" description="Dati anagrafici, vendite e adempimenti fiscali." />
          <Toggle required checked={c.consents.healthData} onChange={(v) => setConsent('healthData', v)} label="Dati relativi alla salute (art. 9)" description="Esami visivi, prescrizioni, misure, lenti a contatto." />
          <Toggle checked={c.consents.reminders} onChange={(v) => setConsent('reminders', v)} label="Promemoria di servizio" description="Ritiro, controlli periodici, riordino LAC." />
          <Toggle checked={c.consents.marketing} onChange={(v) => setConsent('marketing', v)} label="Comunicazioni promozionali" description="Offerte e novità via WhatsApp, SMS, email." />
          <Toggle checked={c.consents.stsOpposition} onChange={(v) => setConsent('stsOpposition', v)} label="Opposizione invio al Sistema TS" description="Le spese sanitarie non verranno trasmesse per la precompilata." />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {c.consents.signedAt ? `Ultima firma registrata: ${new Date(c.consents.signedAt).toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' })}` : 'Nessuna firma registrata.'}
        </p>
      </section>

      <section>
        <SectionTitle icon={<FileText size={14} />}>Documenti e diritti dell’interessato</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-ink-900/40 p-3 text-left transition-colors hover:border-cyan-400/30" onClick={() => print(<PrivacyDoc c={c} store={settings} />)}>
            <Printer size={18} className="mt-0.5 shrink-0 text-cyan-300" />
            <span>
              <span className="block text-sm font-medium text-white">Stampa informativa e modulo consensi</span>
              <span className="block text-xs text-slate-400">Informativa completa artt. 13 e 9 con spazio firme, precompilata con i consensi attuali.</span>
            </span>
          </button>
          <button className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-ink-900/40 p-3 text-left transition-colors hover:border-cyan-400/30" onClick={exportData}>
            <Download size={18} className="mt-0.5 shrink-0 text-cyan-300" />
            <span>
              <span className="block text-sm font-medium text-white">Esporta dati (portabilità)</span>
              <span className="block text-xs text-slate-400">
                File JSON con anagrafica, prescrizioni, LAC, {myOrders.length} buste, {mySales.length} vendite, {myAppts.length} appuntamenti (art. 20).
              </span>
            </span>
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-200">
          <Trash2 size={15} /> Elimina cliente (diritto all’oblio, art. 17)
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Cancella definitivamente la scheda: anagrafica, prescrizioni, lenti a contatto e consensi. Gli appuntamenti vengono anonimizzati. I <b className="text-slate-300">documenti fiscali</b> (vendite, documenti
          commerciali, fatture) e la documentazione delle buste su misura <b className="text-slate-300">restano conservati</b> per gli obblighi di legge (10 anni), senza più collegamento alla scheda.
        </p>
        {!askDelete ? (
          <button className="btn-danger mt-3 py-1.5 text-xs" onClick={() => setAskDelete(true)}>
            <Trash2 size={14} /> Elimina cliente…
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-rose-100">
              Per confermare digita il cognome <b className="font-mono">{c.lastName}</b>:
              <input className="input mt-1.5 border-rose-400/40" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-ghost py-1.5 text-xs"
                onClick={() => {
                  setAskDelete(false);
                  setConfirmText('');
                }}
              >
                Annulla
              </button>
              <button
                className="btn-danger py-1.5 text-xs"
                disabled={!canDelete || deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await onDelete();
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Elimina definitivamente {fullName(c)}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
