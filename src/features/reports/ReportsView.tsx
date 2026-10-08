import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownUp, CheckCircle2, ClipboardList, Clock, Copy, Download, Eye, FilePlus2, FileText, Layers, Loader2, Pencil, Printer, Search, Trash2, Unlink, Upload, Users } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { PATHOLOGIES } from '../../data/pathologies';
import { PatientsPanel } from './PatientsPanel';
import { downloadFile, reportsToCsv } from './export';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../components/Modal';
import type { Report, ReportDraft, ReportStatus, SimulationSnapshot } from '../../types';

const STATUS: Record<ReportStatus, { label: string; tone: string; icon: typeof Clock }> = {
  in_corso: { label: 'In corso', tone: 'border-amber-400/30 bg-amber-400/10 text-amber-200', icon: Clock },
  completato: { label: 'Completato', tone: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200', icon: CheckCircle2 },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

function StatusBadge({ status }: { status: ReportStatus }) {
  const s = STATUS[status];
  return (
    <span className={`chip ${s.tone}`}>
      <s.icon size={11} /> {s.label}
    </span>
  );
}

function emptyDraft(snapshot: SimulationSnapshot | null): ReportDraft {
  const year = new Date().getFullYear();
  return {
    patientName: '',
    patientCode: `VL-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    age: 60,
    date: new Date().toISOString().slice(0, 10),
    eye: 'OU',
    visualAcuity: { od: '', os: '' },
    iop: { od: '', os: '' },
    diagnosis: snapshot?.conditions.map((c) => c.name).join(' + ') ?? '',
    notes: snapshot ? `Simulazione associata: ${snapshot.summary}.` : '',
    prescription: '',
    followUp: '',
    status: 'in_corso',
    simulation: snapshot,
  };
}

export interface DraftRequest {
  snapshot: SimulationSnapshot | null;
}

interface Props {
  focusId: string | null;
  onFocusConsumed: () => void;
  draftRequest: DraftRequest | null;
  onDraftConsumed: () => void;
  onOpenSimulator: () => void;
}

type SortKey = 'recenti' | 'data' | 'nome';

/** Bozza di una nuova visita per un paziente già in archivio */
function followUpDraft(r: Report): ReportDraft {
  return {
    ...emptyDraft(null),
    patientName: r.patientName,
    patientCode: r.patientCode,
    age: r.age,
    eye: r.eye,
    diagnosis: r.diagnosis,
    prescription: r.prescription,
    notes: `Controllo successivo alla visita del ${fmtDate(r.date)}.`,
  };
}

export function ReportsView({ focusId, onFocusConsumed, draftRequest, onDraftConsumed, onOpenSimulator }: Props) {
  const { reports, reportsLoading, deleteReport, saveReport, notify } = useApp();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ReportStatus | 'tutti'>('tutti');
  const [tab, setTab] = useState<'referti' | 'pazienti'>('referti');
  const [sort, setSort] = useState<SortKey>('recenti');
  const importRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<ReportDraft | null>(null);
  const [viewing, setViewing] = useState<Report | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Report | null>(null);

  useEffect(() => {
    if (draftRequest) {
      setEditing(emptyDraft(draftRequest.snapshot));
      onDraftConsumed();
    }
  }, [draftRequest, onDraftConsumed]);

  useEffect(() => {
    if (!focusId) return;
    const r = reports.find((x) => x.id === focusId);
    if (r) {
      setViewing(r);
      onFocusConsumed();
    }
  }, [focusId, reports, onFocusConsumed]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out = reports.filter(
      (r) => (status === 'tutti' || r.status === status) && (!t || `${r.patientName} ${r.patientCode} ${r.diagnosis}`.toLowerCase().includes(t)),
    );
    if (sort === 'data') out.sort((a, b) => b.date.localeCompare(a.date));
    if (sort === 'nome') out.sort((a, b) => a.patientName.localeCompare(b.patientName, 'it'));
    return out;
  }, [reports, q, status, sort]);

  const exportCsv = () => downloadFile(`visual-lab-referti-${new Date().toISOString().slice(0, 10)}.csv`, reportsToCsv(filtered), 'text/csv;charset=utf-8');
  const exportJson = () => downloadFile(`visual-lab-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(reports, null, 2), 'application/json');
  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as unknown;
      if (!Array.isArray(data)) throw new Error('Formato non valido');
      let n = 0;
      for (const raw of data as Partial<Report>[]) {
        if (!raw || typeof raw.patientName !== 'string' || typeof raw.patientCode !== 'string') continue;
        const base = emptyDraft(null);
        await saveReport({
          ...base,
          ...raw,
          id: undefined,
          visualAcuity: { ...base.visualAcuity, ...raw.visualAcuity },
          iop: { ...base.iop, ...raw.iop },
          simulation: raw.simulation ?? null,
        });
        n++;
      }
      notify(`${n} referti importati.`);
    } catch {
      notify('File di backup non valido.', 'error');
    }
  };

  const stats = [
    { label: 'Referti totali', value: reports.length, icon: FileText },
    { label: 'In corso', value: reports.filter((r) => r.status === 'in_corso').length, icon: Clock },
    { label: 'Completati', value: reports.filter((r) => r.status === 'completato').length, icon: CheckCircle2 },
    { label: 'Con simulazione', value: reports.filter((r) => r.simulation).length, icon: Layers },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cartella clinica"
        title="Pazienti e referti"
        icon={<ClipboardList size={22} />}
        description="Referti con snapshot del simulatore, storico per paziente con andamento di visus e IOP, esportazione CSV e backup."
        actions={
          <>
            <button className="btn-ghost" onClick={onOpenSimulator}>
              <Eye size={16} /> Dal simulatore
            </button>
            <button className="btn-primary" onClick={() => setEditing(emptyDraft(null))}>
              <FilePlus2 size={16} /> Nuovo referto
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="panel flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-white/10 bg-ink-900/50 p-1">
          {(
            [
              ['referti', 'Referti', FileText],
              ['pazienti', 'Pazienti', Users],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === id ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-ghost py-1.5 text-xs" onClick={exportCsv} disabled={!filtered.length}>
            <Download size={14} /> CSV
          </button>
          <button className="btn-ghost py-1.5 text-xs" onClick={exportJson} disabled={!reports.length}>
            <Download size={14} /> Backup JSON
          </button>
          <button className="btn-ghost py-1.5 text-xs" onClick={() => importRef.current?.click()}>
            <Upload size={14} /> Importa
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {tab === 'pazienti' && <PatientsPanel reports={reports} onOpenReport={setViewing} onNewVisit={(r) => setEditing(followUpDraft(r))} />}
      <div className={`panel overflow-hidden ${tab === 'pazienti' ? 'hidden' : ''}`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] p-4">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-9" placeholder="Cerca per nome paziente, codice o diagnosi…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex rounded-xl border border-white/10 p-0.5">
            {(['tutti', 'in_corso', 'completato'] as const).map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${status === s ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}>
                {s === 'tutti' ? 'Tutti' : STATUS[s].label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <ArrowDownUp size={14} />
            <select className="input w-auto py-1.5 text-xs" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordina">
              <option value="recenti">Ultima modifica</option>
              <option value="data">Data visita</option>
              <option value="nome">Nome paziente</option>
            </select>
          </label>
        </div>

        {reportsLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <ClipboardList size={32} className="text-slate-600" />
            <p className="text-sm text-slate-400">{reports.length ? 'Nessun referto corrisponde alla ricerca.' : 'Nessun referto ancora. Creane uno o generalo dal simulatore.'}</p>
          </div>
        ) : (
          <>
            {/* tabella desktop */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 font-medium">Paziente</th>
                  <th className="px-4 py-3 font-medium">Diagnosi</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Stato</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((r) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setViewing(r)}
                      className="cursor-pointer border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{r.patientName}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {r.patientCode} · {r.age} anni · {r.eye}
                        </p>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate text-slate-300">{r.diagnosis || '—'}</p>
                        {r.simulation && (
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-cyan-300/80">
                            <Layers size={11} /> Simulazione allegata
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-cyan-300" onClick={() => setEditing(followUpDraft(r))} aria-label="Nuova visita" title="Nuova visita per questo paziente">
                            <Copy size={15} />
                          </button>
                          <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-cyan-300" onClick={() => setEditing(r)} aria-label="Modifica" title="Modifica">
                            <Pencil size={15} />
                          </button>
                          <button className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => setConfirmDelete(r)} aria-label="Elimina">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {/* card mobile */}
            <div className="grid gap-2 p-3 md:hidden">
              {filtered.map((r) => (
                <button key={r.id} onClick={() => setViewing(r)} className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{r.patientName}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">{r.diagnosis || '—'}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {r.patientCode} · {fmtDate(r.date)}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <ReportEditor draft={editing} onClose={() => setEditing(null)} onOpenSimulator={onOpenSimulator} />
      <ReportDetail
        report={viewing}
        onClose={() => setViewing(null)}
        onEdit={(r) => {
          setViewing(null);
          setEditing(r);
        }}
      />
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Eliminare il referto?"
        icon={<Trash2 size={18} />}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>
              Annulla
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                if (confirmDelete) deleteReport(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              <Trash2 size={15} /> Elimina
            </button>
          </>
        }
      >
        <p className="p-5 text-sm text-slate-300">
          Il referto di <strong className="text-white">{confirmDelete?.patientName}</strong> ({confirmDelete?.patientCode}) verrà eliminato definitivamente.
        </p>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------ Editor */

const RX_TEMPLATES = [
  'Latanoprost 0,005% 1 gtt la sera',
  'Timololo 0,5% 1 gtt x 2/die',
  'Desametasone collirio 1 gtt x 4/die a scalare',
  'Sostituti lacrimali al bisogno',
  'Anti-VEGF intravitreale, 3 dosi di carico',
  'Integratori AREDS2',
  'Nuova correzione ottica',
];

function ReportEditor({ draft, onClose, onOpenSimulator }: { draft: ReportDraft | null; onClose: () => void; onOpenSimulator: () => void }) {
  const { saveReport, notify } = useApp();
  const [form, setForm] = useState<ReportDraft | null>(draft);
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(draft), [draft]);

  const set = <K extends keyof ReportDraft>(k: K, v: ReportDraft[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await saveReport(form);
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Salvataggio non riuscito.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!form}
      onClose={onClose}
      size="lg"
      icon={<FilePlus2 size={18} />}
      title={form?.id ? 'Modifica referto' : 'Nuovo referto'}
      subtitle={form?.simulation ? 'Parametri del simulatore associati automaticamente' : 'Compila i dati del paziente e la valutazione clinica'}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annulla
          </button>
          <button type="submit" form="report-form" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Salva referto
          </button>
        </>
      }
    >
      {form && (
        <form id="report-form" onSubmit={submit} className="space-y-6 p-5">
          <fieldset className="grid gap-4 sm:grid-cols-6">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-300/90">Anagrafica</legend>
            <div className="sm:col-span-3">
              <label className="label">Nome e cognome *</label>
              <input className="input" required value={form.patientName} onChange={(e) => set('patientName', e.target.value)} placeholder="Mario Rossi" />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Codice paziente *</label>
              <input className="input font-mono" required value={form.patientCode} onChange={(e) => set('patientCode', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Età</label>
              <input className="input" type="number" min={0} max={120} required value={form.age} onChange={(e) => set('age', Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Data visita</label>
              <input className="input" type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Occhio</label>
              <select className="input" value={form.eye} onChange={(e) => set('eye', e.target.value as ReportDraft['eye'])}>
                <option value="OD">OD (destro)</option>
                <option value="OS">OS (sinistro)</option>
                <option value="OU">OU (entrambi)</option>
              </select>
            </div>
          </fieldset>

          <datalist id="vl-va">
            {['10/10', '9/10', '8/10', '7/10', '6/10', '5/10', '4/10', '3/10', '2/10', '1/10', '1/20', 'CF', 'HM', 'PL', 'NPL'].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <fieldset className="grid gap-4 sm:grid-cols-4">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-300/90">Esame obiettivo</legend>
            <div>
              <label className="label">Visus OD</label>
              <input className="input" list="vl-va" placeholder="10/10" value={form.visualAcuity.od} onChange={(e) => set('visualAcuity', { ...form.visualAcuity, od: e.target.value })} />
            </div>
            <div>
              <label className="label">Visus OS</label>
              <input className="input" list="vl-va" placeholder="10/10" value={form.visualAcuity.os} onChange={(e) => set('visualAcuity', { ...form.visualAcuity, os: e.target.value })} />
            </div>
            <div>
              <label className="label">IOP OD (mmHg)</label>
              <input className="input" placeholder="15" value={form.iop.od} onChange={(e) => set('iop', { ...form.iop, od: e.target.value })} />
            </div>
            <div>
              <label className="label">IOP OS (mmHg)</label>
              <input className="input" placeholder="15" value={form.iop.os} onChange={(e) => set('iop', { ...form.iop, os: e.target.value })} />
            </div>
          </fieldset>

          <div className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300/90">
                <Layers size={14} /> Stato del simulatore
              </p>
              {form.simulation ? (
                <button type="button" className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-300" onClick={() => set('simulation', null)}>
                  <Unlink size={13} /> Scollega
                </button>
              ) : (
                <button
                  type="button"
                  className="text-xs text-cyan-300 hover:underline"
                  onClick={() => {
                    onClose();
                    onOpenSimulator();
                  }}
                >
                  Apri il simulatore
                </button>
              )}
            </div>
            {form.simulation ? <SimulationSummary snap={form.simulation} /> : <p className="mt-2 text-sm text-slate-500">Nessuna simulazione associata. Usa “Genera referto” dal simulatore per allegarne una.</p>}
          </div>

          <div className="grid gap-4">
            <div>
              <label className="label">Diagnosi finale</label>
              <input className="input" list="vl-diagnoses" value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="Es. Glaucoma primario ad angolo aperto OU" />
              <datalist id="vl-diagnoses">
                {PATHOLOGIES.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Note cliniche</label>
              <textarea className="input min-h-24" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anamnesi, obiettività, esami strumentali…" />
            </div>
            <div>
              <label className="label">Prescrizione terapeutica</label>
              <textarea className="input min-h-20" value={form.prescription} onChange={(e) => set('prescription', e.target.value)} placeholder="Farmaco, posologia, correzione ottica, intervento…" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RX_TEMPLATES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('prescription', form.prescription ? `${form.prescription}\n${t}` : t)}
                    className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-100"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Controllo / follow-up</label>
                <input className="input" list="vl-followup" value={form.followUp} onChange={(e) => set('followUp', e.target.value)} placeholder="Es. controllo a 3 mesi con OCT" />
                <datalist id="vl-followup">
                  {['Controllo a 1 settimana', 'Controllo a 1 mese', 'Controllo a 3 mesi con OCT', 'Controllo a 6 mesi con campo visivo', 'Controllo annuale', 'Urgente: ricovero/intervento'].map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">Stato</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STATUS) as ReportStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('status', s)}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${form.status === s ? STATUS[s].tone : 'border-white/10 text-slate-400'}`}
                    >
                      {STATUS[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

function SimulationSummary({ snap }: { snap: SimulationSnapshot }) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {snap.conditions.length === 0 && <span className="text-sm text-slate-400">Visione di riferimento (nessuna alterazione)</span>}
        {snap.conditions.map((c) => (
          <span key={c.id} className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
            {c.name} · {c.severity}%
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-400">{snap.summary}</p>
      <p className="font-mono text-[11px] text-slate-500">
        Sorgente: {snap.source} · acquisito il {new Date(snap.capturedAt).toLocaleString('it-IT')}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ Detail */

function ReportDetail({ report: r, onClose, onEdit }: { report: Report | null; onClose: () => void; onEdit: (r: Report) => void }) {
  const { profile } = useApp();
  return (
    <Modal
      open={!!r}
      onClose={onClose}
      size="md"
      icon={<FileText size={18} />}
      title={r ? `Referto · ${r.patientName}` : ''}
      subtitle={r && `${r.patientCode} · ${fmtDate(r.date)}`}
      footer={
        r && (
          <>
            <button className="btn-ghost mr-auto" onClick={() => window.print()}>
              <Printer size={15} /> Stampa
            </button>
            <button className="btn-primary" onClick={() => onEdit(r)}>
              <Pencil size={15} /> Modifica
            </button>
          </>
        )
      }
    >
      {r && (
        <div className="space-y-5 p-5 text-sm" id="report-print">
          <div className="print-only border-b pb-3">
            <p className="text-lg font-semibold">Visual Lab · Referto oftalmologico</p>
            <p className="text-xs">
              {r.patientName} · {r.patientCode} · {fmtDate(r.date)}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={r.status} />
            <span className="text-xs text-slate-500">Aggiornato il {new Date(r.updatedAt).toLocaleString('it-IT')}</span>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Età', `${r.age} anni`],
              ['Occhio', r.eye],
              ['Visus OD / OS', `${r.visualAcuity.od || '—'} / ${r.visualAcuity.os || '—'}`],
              ['IOP OD / OS', `${r.iop.od || '—'} / ${r.iop.os || '—'} mmHg`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
                <dd className="mt-1 font-medium text-white">{v}</dd>
              </div>
            ))}
          </dl>
          {[
            ['Diagnosi', r.diagnosis],
            ['Note cliniche', r.notes],
            ['Prescrizione', r.prescription],
            ['Controllo', r.followUp],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">{k}</p>
              <p className="mt-1 whitespace-pre-line text-slate-300">{v || '—'}</p>
            </div>
          ))}
          {r.simulation && (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300/90">
                <Layers size={14} /> Simulazione allegata
              </p>
              <SimulationSummary snap={r.simulation} />
            </div>
          )}
          <p className="border-t border-white/[0.06] pt-3 text-xs text-slate-500">
            Firmato: {profile?.displayName} · {profile?.specialization}
            {profile?.institution ? ` · ${profile.institution}` : ''}
          </p>
        </div>
      )}
    </Modal>
  );
}
