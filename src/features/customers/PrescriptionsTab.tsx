import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, Copy, Glasses, Pencil, Plus, Printer, ShieldAlert, Trash2, TrendingUp, X } from 'lucide-react';
import { usePrint } from '../../components/Print';
import { useStore } from '../../store/StoreContext';
import type { Customer, EyeRx, Prescription } from '../../store/types';
import { daysBetween, dpt, fmtDate, todayISO } from '../../store/utils';
import type { ViewId } from '../../types';
import { checkState, emptyRx, RX_KINDS, RX_SOURCES, sortedRx, sphEq } from './helpers';
import { PrescriptionDoc } from './prints';
import { Empty, Field, NumField, SectionTitle } from './ui';

interface Props {
  customer: Customer;
  onSave: (c: Customer, msg?: string) => Promise<void>;
  onNavigate: (view: ViewId, focusId?: string) => void;
  onGoPrivacy: () => void;
}

export function PrescriptionsTab({ customer: c, onSave, onNavigate, onGoPrivacy }: Props) {
  const { settings } = useStore();
  const print = usePrint();
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const list = useMemo(() => sortedRx(c), [c]);
  const canWrite = c.consents.privacy && c.consents.healthData;
  const examiner = settings.optician || list[0]?.examiner || '';

  const save = async (rx: Prescription) => {
    const exists = c.prescriptions.some((p) => p.id === rx.id);
    await onSave({ ...c, prescriptions: exists ? c.prescriptions.map((p) => (p.id === rx.id ? rx : p)) : [...c.prescriptions, rx] }, exists ? 'Prescrizione aggiornata.' : 'Prescrizione registrata.');
    setEditing(null);
  };

  if (editing) return <RxEditor rx={editing} isNew={!c.prescriptions.some((p) => p.id === editing.id)} onCancel={() => setEditing(null)} onSave={save} />;

  const check = checkState(c);

  return (
    <div className="space-y-5">
      {!canWrite && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3 text-sm text-amber-100">
          <ShieldAlert size={18} className="shrink-0 text-amber-300" />
          <span className="min-w-0 flex-1">Mancano i consensi privacy (art. 13) e/o dati sanitari (art. 9): non è possibile registrare nuove prescrizioni.</span>
          <button className="btn-ghost py-1.5 text-xs" onClick={onGoPrivacy}>
            Raccogli consensi <ArrowRight size={14} />
          </button>
        </div>
      )}

      <SectionTitle
        icon={<Glasses size={14} />}
        actions={
          <button className="btn-primary py-1.5 text-xs" disabled={!canWrite} onClick={() => setEditing(emptyRx(examiner, list[0]))}>
            <Plus size={14} /> Nuova prescrizione
          </button>
        }
      >
        Prescrizioni ({list.length})
      </SectionTitle>

      {list.length === 0 ? (
        <Empty icon={<Glasses size={30} />}>Nessuna prescrizione registrata. Inserisci un esame optometrico o una prescrizione dell’oculista.</Empty>
      ) : (
        <>
          {check.state !== 'none' && check.due && (
            <div className={`flex items-center gap-2 text-xs ${check.state === 'overdue' ? 'text-rose-300' : check.state === 'soon' ? 'text-amber-300' : 'text-slate-400'}`}>
              <CalendarClock size={14} />
              {check.state === 'overdue' ? `Controllo scaduto da ${-daysBetween(todayISO(), check.due)} giorni (${fmtDate(check.due)})` : `Prossimo controllo: ${fmtDate(check.due)}`}
            </div>
          )}
          {list.length > 1 && <SeChart list={list} />}
          <div className="space-y-3">
            {list.map((rx, i) => (
              <RxCard
                key={rx.id}
                rx={rx}
                prev={list[i + 1]}
                latest={i === 0}
                confirming={confirmDel === rx.id}
                onEdit={() => setEditing(rx)}
                onDuplicate={canWrite ? () => setEditing({ ...emptyRx(examiner, rx), kind: rx.kind }) : undefined}
                onPrint={() => print(<PrescriptionDoc c={c} rx={rx} store={settings} />)}
                onUseForOrder={() => onNavigate('orders', `new:${c.id}`)}
                onAskDelete={() => setConfirmDel(rx.id)}
                onCancelDelete={() => setConfirmDel(null)}
                onDelete={async () => {
                  await onSave({ ...c, prescriptions: c.prescriptions.filter((p) => p.id !== rx.id) }, 'Prescrizione eliminata.');
                  setConfirmDel(null);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ card */

function Delta({ v }: { v: number }) {
  if (Math.abs(v) < 0.001) return <span className="text-slate-500">=</span>;
  const worse = v < 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono ${worse ? 'text-amber-300' : 'text-sky-300'}`}>
      {worse ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
      {dpt(v)}
    </span>
  );
}

function RxCard(props: {
  rx: Prescription;
  prev?: Prescription;
  latest: boolean;
  confirming: boolean;
  onEdit: () => void;
  onDuplicate?: () => void;
  onPrint: () => void;
  onUseForOrder: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const { rx, prev, latest } = props;
  const eyes: Array<['OD' | 'OS', EyeRx, EyeRx | undefined]> = [
    ['OD', rx.od, prev?.od],
    ['OS', rx.os, prev?.os],
  ];
  return (
    <div className={`rounded-2xl border p-4 ${latest ? 'border-cyan-400/25 bg-cyan-400/[0.03]' : 'border-white/[0.06] bg-ink-900/40'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{fmtDate(rx.date)}</span>
            <span className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-200">{rx.kind}</span>
            {latest && <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-200">Attuale</span>}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {rx.source}
            {rx.examiner ? ` · ${rx.examiner}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={props.onPrint} title="Stampa prescrizione">
            <Printer size={14} /> <span className="hidden sm:inline">Stampa</span>
          </button>
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={props.onUseForOrder} title="Usa per nuova busta">
            <Glasses size={14} /> <span className="hidden sm:inline">Nuova busta</span>
          </button>
          {props.onDuplicate && (
            <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-cyan-300" onClick={props.onDuplicate} title="Nuova prescrizione partendo da questa" aria-label="Duplica">
              <Copy size={15} />
            </button>
          )}
          <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-cyan-300" onClick={props.onEdit} aria-label="Modifica" title="Modifica">
            <Pencil size={15} />
          </button>
          <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300" onClick={props.onAskDelete} aria-label="Elimina" title="Elimina">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-1.5 pr-2 text-left font-medium" />
              <th className="px-2 py-1.5 text-right font-medium">Sfera</th>
              <th className="px-2 py-1.5 text-right font-medium">Cil</th>
              <th className="px-2 py-1.5 text-right font-medium">Asse</th>
              <th className="px-2 py-1.5 text-right font-medium">Add</th>
              <th className="px-2 py-1.5 text-right font-medium">Prisma</th>
              <th className="px-2 py-1.5 text-right font-medium">AV</th>
              <th className="px-2 py-1.5 text-right font-medium">Eq. sf.</th>
              {prev && <th className="px-2 py-1.5 text-right font-medium">Δ sf / cil</th>}
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {eyes.map(([label, e, p]) => (
              <tr key={label} className="border-t border-white/[0.05]">
                <td className="py-1.5 pr-2 font-sans text-xs font-semibold text-cyan-300">{label}</td>
                <td className="px-2 py-1.5 text-right text-white">{dpt(e.sph)}</td>
                <td className="px-2 py-1.5 text-right text-slate-200">{e.cyl ? dpt(e.cyl) : '—'}</td>
                <td className="px-2 py-1.5 text-right text-slate-200">{e.cyl ? `${e.axis}°` : '—'}</td>
                <td className="px-2 py-1.5 text-right text-slate-200">{e.add ? dpt(e.add) : '—'}</td>
                <td className="px-2 py-1.5 text-right text-slate-300">{e.prism ? `${e.prism}Δ ${e.base}` : '—'}</td>
                <td className="px-2 py-1.5 text-right text-slate-300">{e.va || '—'}</td>
                <td className="px-2 py-1.5 text-right text-slate-300">{dpt(sphEq(e))}</td>
                {p && (
                  <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs">
                    <Delta v={e.sph - p.sph} /> <span className="text-slate-600">/</span> <Delta v={e.cyl - p.cyl} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
        <span>
          DNP <span className="font-mono text-slate-200">{rx.pdOd || '—'}</span> / <span className="font-mono text-slate-200">{rx.pdOs || '—'}</span> · tot{' '}
          <span className="font-mono text-slate-200">{rx.pdOd + rx.pdOs ? (rx.pdOd + rx.pdOs).toFixed(1) : '—'}</span> mm
        </span>
        {(rx.heightOd || rx.heightOs) && (
          <span>
            Altezze <span className="font-mono text-slate-200">{rx.heightOd ?? '—'}</span> / <span className="font-mono text-slate-200">{rx.heightOs ?? '—'}</span> mm
          </span>
        )}
        {rx.nextCheck && <span>Prossimo controllo {fmtDate(rx.nextCheck)}</span>}
        {prev && <span className="text-slate-500">Variazione rispetto al {fmtDate(prev.date)}</span>}
      </div>
      {rx.notes && <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{rx.notes}</p>}

      {props.confirming && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          <span className="flex-1">Eliminare definitivamente questa prescrizione?</span>
          <button className="btn-ghost py-1.5 text-xs" onClick={props.onCancelDelete}>
            Annulla
          </button>
          <button className="btn-danger py-1.5 text-xs" onClick={props.onDelete}>
            <Trash2 size={14} /> Elimina
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ grafico */

function SeChart({ list }: { list: Prescription[] }) {
  const pts = [...list].reverse();
  const W = 640;
  const H = 170;
  const pad = { l: 44, r: 16, t: 14, b: 26 };
  const t0 = new Date(pts[0].date).getTime();
  const t1 = new Date(pts[pts.length - 1].date).getTime();
  const vals = pts.flatMap((r) => [sphEq(r.od), sphEq(r.os)]);
  let lo = Math.floor(Math.min(...vals, 0) * 2) / 2 - 0.25;
  let hi = Math.ceil(Math.max(...vals, 0) * 2) / 2 + 0.25;
  if (hi - lo < 1.5) {
    lo -= 0.5;
    hi += 0.5;
  }
  const x = (d: string) => (t1 === t0 ? (pad.l + W - pad.r) / 2 : pad.l + ((new Date(d).getTime() - t0) / (t1 - t0)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const step = hi - lo > 6 ? 2 : hi - lo > 3 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(Number(v.toFixed(2)));
  const series = [
    { key: 'OD', color: '#22d3ee', get: (r: Prescription) => sphEq(r.od) },
    { key: 'OS', color: '#a78bfa', get: (r: Prescription) => sphEq(r.os) },
  ];
  const first = pts[0];
  const last = pts[pts.length - 1];
  const years = Math.max(daysBetween(first.date, last.date) / 365, 0.01);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink-900/40 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <TrendingUp size={14} className="text-cyan-300/80" /> Equivalente sferico nel tempo
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          {series.map((s) => {
            const rate = (s.get(last) - s.get(first)) / years;
            return (
              <span key={s.key} className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.key} <span className="font-mono text-slate-400">{dpt(s.get(last))}</span>
                {years >= 0.5 && <span className={`font-mono ${rate < -0.49 ? 'text-amber-300' : 'text-slate-500'}`}>({dpt(rate)} D/anno)</span>}
              </span>
            );
          })}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Andamento equivalente sferico OD e OS">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.1)'} strokeDasharray={v === 0 ? undefined : '3 4'} />
            <text x={pad.l - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="JetBrains Mono, monospace">
              {dpt(v)}
            </text>
          </g>
        ))}
        {pts.map((r) => (
          <text key={r.id} x={x(r.date)} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">
            {new Date(r.date).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.key}>
            <polyline fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts.map((r) => `${x(r.date)},${y(s.get(r))}`).join(' ')} />
            {pts.map((r) => (
              <circle key={r.id} cx={x(r.date)} cy={y(s.get(r))} r="3.5" fill="#0b1120" stroke={s.color} strokeWidth="2">
                <title>{`${s.key} ${fmtDate(r.date)}: ${dpt(s.get(r))} D`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ editor */

const BASES: EyeRx['base'][] = ['', 'IN', 'OUT', 'UP', 'DOWN'];

function RxEditor({ rx: initial, isNew, onCancel, onSave }: { rx: Prescription; isNew: boolean; onCancel: () => void; onSave: (rx: Prescription) => Promise<void> }) {
  const [rx, setRx] = useState<Prescription>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Prescription>(k: K, v: Prescription[K]) => setRx((p) => ({ ...p, [k]: v }));
  const setEye = (side: 'od' | 'os', patch: Partial<EyeRx>) => setRx((p) => ({ ...p, [side]: { ...p[side], ...patch } }));

  const axisIssue = (e: EyeRx) => e.cyl !== 0 && (e.axis < 1 || e.axis > 180);
  const problems: string[] = [];
  if (axisIssue(rx.od)) problems.push('Asse OD mancante o non valido (1–180°).');
  if (axisIssue(rx.os)) problems.push('Asse OS mancante o non valido (1–180°).');
  if (rx.kind === 'Progressivo' && !rx.od.add && !rx.os.add) problems.push('Per le progressive indica l’addizione.');
  if (rx.kind === 'Progressivo' && (!rx.heightOd || !rx.heightOs)) problems.push('Per le progressive indica le altezze di montaggio.');
  if (rx.od.cyl > 0 || rx.os.cyl > 0) problems.push('Usa la convenzione a cilindro negativo (trasposizione).');

  const transpose = () =>
    setRx((p) => {
      const t = (e: EyeRx): EyeRx => (e.cyl > 0 ? { ...e, sph: e.sph + e.cyl, cyl: -e.cyl, axis: e.axis > 90 ? e.axis - 90 : e.axis + 90 } : e);
      return { ...p, od: t(p.od), os: t(p.os) };
    });

  const eyeRow = (side: 'od' | 'os') => {
    const e = rx[side];
    const label = side === 'od' ? 'OD' : 'OS';
    return (
      <tr className="border-t border-white/[0.05]">
        <td className="py-2 pr-2 text-xs font-semibold text-cyan-300">{label}</td>
        <td className="p-1">
          <NumField ariaLabel={`Sfera ${label}`} value={e.sph} onChange={(v) => setEye(side, { sph: v ?? 0 })} step={0.25} snap signed decimals={2} min={-30} max={30} />
        </td>
        <td className="p-1">
          <NumField ariaLabel={`Cilindro ${label}`} value={e.cyl} onChange={(v) => setEye(side, { cyl: v ?? 0 })} step={0.25} snap signed decimals={2} min={-10} max={10} />
        </td>
        <td className="p-1">
          <NumField ariaLabel={`Asse ${label}`} value={e.axis} onChange={(v) => setEye(side, { axis: Math.round(v ?? 0) })} step={5} min={0} max={180} className={axisIssue(e) ? 'border-rose-400/60' : ''} />
        </td>
        <td className="p-1">
          <NumField ariaLabel={`Addizione ${label}`} value={e.add} onChange={(v) => setEye(side, { add: v ?? 0 })} step={0.25} snap signed decimals={2} min={0} max={4} />
        </td>
        <td className="p-1">
          <NumField ariaLabel={`Prisma ${label}`} value={e.prism} onChange={(v) => setEye(side, { prism: v ?? 0 })} step={0.25} snap decimals={2} min={0} max={20} />
        </td>
        <td className="p-1">
          <select className="input px-1.5 text-xs" aria-label={`Base prisma ${label}`} value={e.base} onChange={(ev) => setEye(side, { base: ev.target.value as EyeRx['base'] })}>
            {BASES.map((b) => (
              <option key={b} value={b}>
                {b || '—'}
              </option>
            ))}
          </select>
        </td>
        <td className="p-1">
          <input className="input px-2 text-center font-mono" aria-label={`Acuità ${label}`} placeholder="10/10" value={e.va} onChange={(ev) => setEye(side, { va: ev.target.value })} />
        </td>
        <td className="p-1 text-right font-mono text-xs text-slate-400">{dpt(sphEq(e))}</td>
      </tr>
    );
  };

  const shown = problems;
  const blocking = axisIssue(rx.od) || axisIssue(rx.os) || !rx.date;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-white">{isNew ? 'Nuova prescrizione' : `Modifica prescrizione del ${fmtDate(initial.date)}`}</h3>
        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onCancel} aria-label="Chiudi editor">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Data">
          <input type="date" className="input" value={rx.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Tipo">
          <select className="input" value={rx.kind} onChange={(e) => set('kind', e.target.value as Prescription['kind'])}>
            {RX_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Fonte">
          <select className="input" value={rx.source} onChange={(e) => set('source', e.target.value as Prescription['source'])}>
            {RX_SOURCES.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Esaminatore / medico">
          <input className="input" value={rx.examiner} onChange={(e) => set('examiner', e.target.value)} />
        </Field>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-ink-900/40 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">Passi da 0,25 D · frecce ↑/↓ per incrementare</p>
          <div className="flex gap-1.5">
            <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setRx((p) => ({ ...p, os: { ...p.od } }))}>
              Copia OD → OS
            </button>
            <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={transpose} title="Converte il cilindro positivo in negativo">
              Trasponi
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-8" />
                <th className="px-1 pb-1 font-medium">Sfera</th>
                <th className="px-1 pb-1 font-medium">Cilindro</th>
                <th className="px-1 pb-1 font-medium">Asse</th>
                <th className="px-1 pb-1 font-medium">Add</th>
                <th className="px-1 pb-1 font-medium">Prisma</th>
                <th className="px-1 pb-1 font-medium">Base</th>
                <th className="px-1 pb-1 font-medium">AV</th>
                <th className="px-1 pb-1 text-right font-medium">Eq. sf.</th>
              </tr>
            </thead>
            <tbody>
              {eyeRow('od')}
              {eyeRow('os')}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="DNP OD (mm)">
          <NumField value={rx.pdOd || undefined} onChange={(v) => set('pdOd', v ?? 0)} step={0.5} snap decimals={1} min={0} max={45} />
        </Field>
        <Field label="DNP OS (mm)">
          <NumField value={rx.pdOs || undefined} onChange={(v) => set('pdOs', v ?? 0)} step={0.5} snap decimals={1} min={0} max={45} />
        </Field>
        <Field label="DNP totale">
          <div className="input flex items-center justify-center bg-ink-900/30 font-mono text-slate-300">{rx.pdOd + rx.pdOs ? (rx.pdOd + rx.pdOs).toFixed(1) : '—'}</div>
        </Field>
        <Field label="Altezza OD">
          <NumField value={rx.heightOd} onChange={(v) => set('heightOd', v)} step={0.5} decimals={1} min={0} max={45} />
        </Field>
        <Field label="Altezza OS">
          <NumField value={rx.heightOs} onChange={(v) => set('heightOs', v)} step={0.5} decimals={1} min={0} max={45} />
        </Field>
        <Field label="Prossimo controllo">
          <input type="date" className="input" value={rx.nextCheck ?? ''} onChange={(e) => set('nextCheck', e.target.value || undefined)} />
        </Field>
      </div>

      <Field label="Note">
        <textarea className="input min-h-20 resize-y" value={rx.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anamnesi, test eseguiti, consigli, invio all’oculista…" />
      </Field>

      {shown.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3 text-xs text-amber-100">
          {shown.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>
          Annulla
        </button>
        <button
          className="btn-primary"
          disabled={saving || blocking}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(rx);
            } catch {
              // errore già notificato
            } finally {
              setSaving(false);
            }
          }}
        >
          {isNew ? 'Registra prescrizione' : 'Salva modifiche'}
        </button>
      </div>
    </div>
  );
}
