import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Building2, DatabaseBackup, Download, FileCheck2, Info, RotateCcw, Save, Scale, Settings2, ShieldCheck, Upload } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { PrintHeader } from '../../components/Print';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { Appointment, Customer, Order, Product, Sale, StockMovement, StoreSettings } from '../../store/types';
import type { ViewId } from '../../types';

interface Props {
  onNavigate: (view: ViewId, focusId?: string) => void;
}

const COLLECTIONS = ['customers', 'products', 'movements', 'orders', 'sales', 'appointments'] as const;
type Col = (typeof COLLECTIONS)[number];

const COL_LABEL: Record<Col, string> = {
  customers: 'Clienti',
  products: 'Articoli',
  movements: 'Movimenti di magazzino',
  orders: 'Buste',
  sales: 'Vendite',
  appointments: 'Appuntamenti',
};

interface Backup {
  app: 'visual-lab';
  version: 1;
  exportedAt: string;
  settings: StoreSettings;
  data: Record<Col, { id: string }[]>;
}

type FieldKey = Exclude<keyof StoreSettings, 'id' | 'loyaltyEuroPerPoint'>;

const SECTIONS: { title: string; icon: ReactNode; fields: { key: FieldKey; label: string; placeholder?: string; wide?: boolean; type?: string }[] }[] = [
  {
    title: 'Dati dell’attività',
    icon: <Building2 size={16} />,
    fields: [
      { key: 'businessName', label: 'Ragione sociale', placeholder: 'Ottica Rossi S.r.l.', wide: true },
      { key: 'vatNumber', label: 'Partita IVA', placeholder: '01234567890' },
      { key: 'fiscalCode', label: 'Codice fiscale', placeholder: '01234567890' },
      { key: 'address', label: 'Indirizzo', placeholder: 'Via Roma 1', wide: true },
      { key: 'city', label: 'CAP, città e provincia', placeholder: '20100 Milano (MI)' },
      { key: 'phone', label: 'Telefono', placeholder: '+39 02 1234567', type: 'tel' },
      { key: 'email', label: 'Email', placeholder: 'info@ottica.it', type: 'email' },
      { key: 'website', label: 'Sito web', placeholder: 'www.ottica.it' },
    ],
  },
  {
    title: 'Responsabile tecnico e fabbricante',
    icon: <FileCheck2 size={16} />,
    fields: [
      { key: 'optician', label: 'Ottico responsabile', placeholder: 'Nome e cognome' },
      { key: 'opticianRegistration', label: 'Abilitazione / iscrizione', placeholder: 'Diploma di abilitazione n. …' },
      { key: 'manufacturerRegistration', label: 'N. registrazione fabbricante dispositivi su misura (Ministero della Salute)', placeholder: 'ITCA…', wide: true },
    ],
  },
  {
    title: 'Operatività',
    icon: <Settings2 size={16} />,
    fields: [
      { key: 'orderPrefix', label: 'Prefisso numerazione buste', placeholder: 'B' },
      { key: 'defaultLab', label: 'Laboratorio predefinito', placeholder: 'Laboratorio interno' },
      { key: 'openingHours', label: 'Orari di apertura', placeholder: 'Lun–Sab 9:00–12:30 · 15:30–19:30', wide: true },
      { key: 'messageSignature', label: 'Firma dei messaggi (WhatsApp, SMS, email)', placeholder: 'Il tuo centro ottico', wide: true },
    ],
  },
];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDocList = (v: unknown): v is { id: string }[] => Array.isArray(v) && v.every((d) => isObj(d) && typeof d.id === 'string' && d.id.length > 0);

function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Il file non è un JSON valido.');
  }
  if (!isObj(raw) || !isObj(raw.data)) throw new Error('Il file non sembra un backup di Visual Lab.');
  const data = raw.data;
  const out = {} as Record<Col, { id: string }[]>;
  for (const c of COLLECTIONS) {
    const list = data[c] ?? [];
    if (!isDocList(list)) throw new Error(`Sezione “${COL_LABEL[c]}” non valida.`);
    out[c] = list;
  }
  if (!isObj(raw.settings)) throw new Error('Impostazioni del negozio mancanti nel backup.');
  return {
    app: 'visual-lab',
    version: 1,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    settings: raw.settings as unknown as StoreSettings,
    data: out,
  };
}

export function SettingsView({ onNavigate }: Props) {
  const store = useStore();
  const { settings, saveSettings, resetDemo, put } = store;
  const { notify } = useApp();
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Backup | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dirty) setDraft(settings);
  }, [settings, dirty]);

  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setDirty(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.businessName.trim()) {
      notify('La ragione sociale è obbligatoria.', 'error');
      return;
    }
    if (draft.vatNumber && !/^\d{11}$/.test(draft.vatNumber.trim())) notify('Attenzione: la partita IVA italiana ha 11 cifre.', 'info');
    setSaving(true);
    try {
      const clean: StoreSettings = {
        ...draft,
        orderPrefix: draft.orderPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'B',
        loyaltyEuroPerPoint: Math.max(0.01, Number(draft.loyaltyEuroPerPoint) || 1),
      };
      await saveSettings(clean);
      setDraft(clean);
      setDirty(false);
    } catch {
      notify('Impossibile salvare le impostazioni.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const downloadBackup = () => {
    const backup: Backup = {
      app: 'visual-lab',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      data: {
        customers: store.customers,
        products: store.products,
        movements: store.movements,
        orders: store.orders,
        sales: store.sales,
        appointments: store.appointments,
      },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visual-lab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Backup scaricato.');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'File di backup non valido.', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const restore = async () => {
    if (!pending) return;
    setRestoring(true);
    setProgress(0);
    const total = COLLECTIONS.reduce((s, c) => s + pending.data[c].length, 0) || 1;
    let n = 0;
    const tick = () => setProgress(Math.round((++n / total) * 100));
    try {
      for (const d of pending.data.customers) await put('customers', d as Customer).then(tick);
      for (const d of pending.data.products) await put('products', d as Product).then(tick);
      for (const d of pending.data.movements) await put('movements', d as StockMovement).then(tick);
      for (const d of pending.data.orders) await put('orders', d as Order).then(tick);
      for (const d of pending.data.sales) await put('sales', d as Sale).then(tick);
      for (const d of pending.data.appointments) await put('appointments', d as Appointment).then(tick);
      await saveSettings({ ...settings, ...pending.settings, id: 'settings' });
      setDirty(false);
      notify('Backup ripristinato.', 'success');
      setPending(null);
    } catch {
      notify('Ripristino interrotto: alcuni dati potrebbero non essere stati importati.', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const doReset = async () => {
    setResetting(true);
    try {
      await resetDemo();
      setDirty(false);
      setConfirmReset(false);
    } catch {
      notify('Impossibile ripristinare i dati dimostrativi.', 'error');
    } finally {
      setResetting(false);
    }
  };

  const counts = COLLECTIONS.map((c) => ({ c, n: store[c].length }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Negozio"
        title="Impostazioni"
        icon={<Settings2 size={22} />}
        description="Dati del centro ottico usati su buste, documenti stampati e messaggi ai clienti; backup e ripristino dell’archivio."
        actions={
          <button className="btn-ghost" onClick={() => onNavigate('dashboard')}>
            Torna alla dashboard
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={submit} className="space-y-4">
          {SECTIONS.map((s) => (
            <section key={s.title} className="panel p-4 sm:p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <span className="text-cyan-300">{s.icon}</span> {s.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {s.fields.map((f) => (
                  <label key={f.key} className={`block ${f.wide ? 'sm:col-span-2' : ''}`}>
                    <span className="label">{f.label}</span>
                    <input className="input" type={f.type ?? 'text'} placeholder={f.placeholder} value={draft[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                  </label>
                ))}
                {s.title === 'Operatività' && (
                  <label className="block">
                    <span className="label">Euro di spesa per 1 punto fedeltà</span>
                    <input className="input" type="number" min={0.01} step={0.5} value={draft.loyaltyEuroPerPoint} onChange={(e) => set('loyaltyEuroPerPoint', Number(e.target.value))} />
                  </label>
                )}
              </div>
            </section>
          ))}
          <div className="sticky bottom-3 z-10 flex items-center justify-end gap-3 rounded-2xl border border-white/[0.06] bg-ink-900/90 px-4 py-3 backdrop-blur">
            {dirty && <span className="mr-auto text-xs text-amber-300">Modifiche non salvate</span>}
            {dirty && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setDraft(settings);
                  setDirty(false);
                }}
              >
                Annulla
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving || !dirty}>
              <Save size={16} /> {saving ? 'Salvataggio…' : 'Salva impostazioni'}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="panel p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Anteprima carta intestata</h2>
            <div className="overflow-hidden rounded-xl bg-white p-4 text-[#111]" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <PrintHeader title="Documento" subtitle={`Busta ${draft.orderPrefix || 'B'}-${new Date().getFullYear()}-0001`} store={draft} />
              <div style={{ fontSize: 10, color: '#555', lineHeight: 1.5 }}>
                {draft.optician && (
                  <div>
                    Ottico responsabile: {draft.optician}
                    {draft.opticianRegistration ? ` · ${draft.opticianRegistration}` : ''}
                  </div>
                )}
                {draft.manufacturerRegistration && <div>Fabbricante dispositivi su misura n. {draft.manufacturerRegistration}</div>}
                {draft.website && <div>{draft.website}</div>}
                <div style={{ marginTop: 10, height: 6, width: '70%', background: '#e5e7eb', borderRadius: 3 }} />
                <div style={{ marginTop: 6, height: 6, width: '55%', background: '#e5e7eb', borderRadius: 3 }} />
              </div>
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
              <DatabaseBackup size={16} className="text-cyan-300" /> Backup e ripristino
            </h2>
            <p className="mb-3 text-xs text-slate-400">Il backup contiene tutti i dati (anche sanitari) dei clienti: conservalo in un luogo protetto.</p>
            <ul className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
              {counts.map(({ c, n }) => (
                <li key={c} className="flex justify-between gap-2">
                  <span className="truncate">{COL_LABEL[c]}</span>
                  <span className="tabular-nums text-slate-200">{n}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <button className="btn-primary" onClick={downloadBackup}>
                <Download size={16} /> Backup completo (JSON)
              </button>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Ripristina da backup
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <button className="btn-danger" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={16} /> Ripristina dati dimostrativi
              </button>
            </div>
          </section>
        </aside>
      </div>

      <ComplianceCard />

      <Modal
        open={pending !== null}
        onClose={() => !restoring && setPending(null)}
        size="sm"
        icon={<Upload size={18} />}
        title="Ripristinare il backup?"
        subtitle={pending?.exportedAt ? `Backup del ${new Date(pending.exportedAt).toLocaleString('it-IT')}` : undefined}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setPending(null)} disabled={restoring}>
              Annulla
            </button>
            <button className="btn-primary" onClick={restore} disabled={restoring}>
              {restoring ? `Ripristino… ${progress}%` : 'Ripristina'}
            </button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3 p-5 text-sm text-slate-300">
            <p>Verranno importati i seguenti documenti. Quelli con lo stesso identificativo saranno sovrascritti; gli altri dati attuali resteranno invariati.</p>
            <ul className="space-y-1 text-xs">
              {COLLECTIONS.map((c) => (
                <li key={c} className="flex justify-between">
                  <span className="text-slate-400">{COL_LABEL[c]}</span>
                  <span className="tabular-nums text-white">{pending.data[c].length}</span>
                </li>
              ))}
              <li className="flex justify-between">
                <span className="text-slate-400">Impostazioni negozio</span>
                <span className="text-white">{pending.settings.businessName || '—'}</span>
              </li>
            </ul>
            {restoring && (
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-cyan-400 transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => !resetting && setConfirmReset(false)}
        size="sm"
        icon={<AlertTriangle size={18} />}
        title="Ripristinare i dati dimostrativi?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmReset(false)} disabled={resetting}>
              Annulla
            </button>
            <button className="btn-danger" onClick={doReset} disabled={resetting}>
              {resetting ? 'Ripristino…' : 'Sì, cancella e ripristina'}
            </button>
          </>
        }
      >
        <div className="space-y-2 p-5 text-sm text-slate-300">
          <p>Tutti i clienti, le buste, le vendite, gli articoli e gli appuntamenti attuali verranno <strong className="text-rose-300">eliminati</strong> e sostituiti con i dati di esempio. Anche le impostazioni del negozio torneranno ai valori dimostrativi.</p>
          <p className="text-slate-400">Consiglio: scarica prima un backup completo.</p>
        </div>
      </Modal>
    </div>
  );
}

const COMPLIANCE: { icon: ReactNode; title: string; points: string[] }[] = [
  {
    icon: <ShieldCheck size={16} />,
    title: 'Privacy (GDPR)',
    points: [
      'Informativa al cliente (art. 13) e registrazione della data di firma nella scheda.',
      'Consenso separato per i dati sanitari (art. 9): prescrizioni, esami, lenti a contatto.',
      'Consensi distinti per promemoria di servizio e comunicazioni promozionali: i richiami li rispettano.',
      'Diritti dell’interessato (accesso, rettifica, cancellazione, portabilità): la scheda cliente consente di consultare ed esportare i dati.',
      'Conservazione: definisci tempi coerenti con le finalità (es. obblighi fiscali 10 anni) e fai backup protetti.',
    ],
  },
  {
    icon: <FileCheck2 size={16} />,
    title: 'Sistema Tessera Sanitaria',
    points: [
      'Le spese per dispositivi medici (occhiali da vista, lenti, LAC) sono marcate come tipo spesa “AD”.',
      'Codice fiscale del cliente sul documento commerciale per la detrazione e l’invio al Sistema TS.',
      'Opposizione del cliente all’invio dei dati: registrata nei consensi e riportata sulla vendita.',
      'L’app prepara i dati per l’export: l’invio telematico va effettuato con le credenziali del negozio.',
    ],
  },
  {
    icon: <Scale size={16} />,
    title: 'Dispositivi su misura (MDR 2017/745)',
    points: [
      'L’occhiale correttivo montato su prescrizione è un dispositivo medico su misura.',
      'Dichiarazione di conformità per ogni busta, secondo l’Allegato XIII, conservata con la documentazione.',
      'Registrazione come fabbricante presso il Ministero della Salute: il numero va indicato nelle impostazioni.',
    ],
  },
  {
    icon: <Info size={16} />,
    title: 'Vendita e garanzia',
    points: [
      'Garanzia legale di conformità di 24 mesi sui beni venduti al consumatore (Codice del Consumo).',
      'Documento commerciale per ogni vendita al dettaglio, fattura su richiesta; acconti registrati sulla busta.',
      'Aliquote IVA per articolo (es. 4% per dispositivi medici correttivi, 22% per occhiali da sole e accessori), da verificare con il commercialista.',
    ],
  },
];

function ComplianceCard() {
  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Adempimenti e documenti</h2>
          <p className="mt-0.5 text-xs text-slate-400">Cosa ti aiuta a gestire Visual Lab, in breve.</p>
        </div>
        <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-200">
          <Info size={12} /> Solo informativo · non è consulenza legale
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {COMPLIANCE.map((c) => (
          <div key={c.title} className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-100">
              <span className="text-cyan-300">{c.icon}</span> {c.title}
            </h3>
            <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-400 marker:text-cyan-400/60">
              {c.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Queste indicazioni sono una sintesi divulgativa e possono non essere aggiornate. Per gli obblighi applicabili alla tua attività fai riferimento alla normativa vigente, al tuo consulente privacy, al commercialista e alle associazioni di categoria.
      </p>
    </section>
  );
}
