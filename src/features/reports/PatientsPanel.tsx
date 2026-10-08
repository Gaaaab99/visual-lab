import { useMemo, useState } from 'react';
import { Activity, CalendarPlus, ChevronRight, Gauge, Search, UserRound } from 'lucide-react';
import type { Report } from '../../types';
import { parseAcuity } from './export';

interface Patient {
  code: string;
  name: string;
  age: number;
  visits: Report[];
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' });

export function PatientsPanel({ reports, onOpenReport, onNewVisit }: { reports: Report[]; onOpenReport: (r: Report) => void; onNewVisit: (r: Report) => void }) {
  const [q, setQ] = useState('');
  const patients = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const r of reports) {
      const key = r.patientCode.trim().toUpperCase() || r.patientName;
      const p = map.get(key) ?? { code: r.patientCode, name: r.patientName, age: r.age, visits: [] };
      p.visits.push(r);
      map.set(key, p);
    }
    const list = [...map.values()];
    list.forEach((p) => p.visits.sort((a, b) => a.date.localeCompare(b.date)));
    list.sort((a, b) => b.visits[b.visits.length - 1].date.localeCompare(a.visits[a.visits.length - 1].date));
    return list;
  }, [reports]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const t = q.trim().toLowerCase();
  const filtered = patients.filter((p) => !t || `${p.name} ${p.code}`.toLowerCase().includes(t));
  const selected = patients.find((p) => p.code === selectedCode) ?? filtered[0] ?? null;

  if (!patients.length) return <div className="panel px-4 py-16 text-center text-sm text-slate-500">Nessun paziente in archivio.</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.06] p-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-9" placeholder="Cerca paziente…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <ul className="max-h-[560px] overflow-y-auto p-1.5">
          {filtered.map((p) => {
            const last = p.visits[p.visits.length - 1];
            const active = selected?.code === p.code;
            return (
              <li key={p.code}>
                <button
                  onClick={() => setSelectedCode(p.code)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? 'bg-cyan-400/10' : 'hover:bg-white/[0.03]'}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' : 'bg-ink-700 text-slate-300'}`}>
                    {p.name
                      .split(' ')
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{p.name}</span>
                    <span className="block truncate font-mono text-[11px] text-slate-500">
                      {p.code} · {p.visits.length} {p.visits.length === 1 ? 'visita' : 'visite'} · {fmt(last.date)}
                    </span>
                  </span>
                  <ChevronRight size={15} className="text-slate-600" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && <PatientDetail key={selected.code} p={selected} onOpenReport={onOpenReport} onNewVisit={onNewVisit} />}
    </div>
  );
}

function PatientDetail({ p, onOpenReport, onNewVisit }: { p: Patient; onOpenReport: (r: Report) => void; onNewVisit: (r: Report) => void }) {
  const last = p.visits[p.visits.length - 1];
  const va = p.visits.map((v) => ({ date: v.date, od: parseAcuity(v.visualAcuity.od), os: parseAcuity(v.visualAcuity.os) }));
  const iop = p.visits.map((v) => ({ date: v.date, od: Number(v.iop.od.replace(',', '.')) || null, os: Number(v.iop.os.replace(',', '.')) || null }));
  return (
    <div className="panel space-y-5 p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-300">
          <UserRound size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-white">{p.name}</h3>
          <p className="font-mono text-xs text-slate-500">
            {p.code} · {last.age} anni · ultima visita {fmt(last.date)}
          </p>
          <p className="mt-1 text-sm text-slate-300">{last.diagnosis || 'Diagnosi non specificata'}</p>
        </div>
        <button className="btn-primary" onClick={() => onNewVisit(last)}>
          <CalendarPlus size={15} /> Nuova visita
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TrendChart title="Visus (decimale)" icon={<Activity size={14} />} data={va} min={0} max={1.2} format={(v) => v.toFixed(1)} />
        <TrendChart title="IOP (mmHg)" icon={<Gauge size={14} />} data={iop} min={5} max={40} format={(v) => v.toFixed(0)} threshold={21} />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300/90">Cronologia visite</p>
        <ol className="relative space-y-3 border-l border-white/10 pl-5">
          {[...p.visits].reverse().map((v) => (
            <li key={v.id} className="relative">
              <span className={`absolute -left-[26px] top-1.5 h-3 w-3 rounded-full border-2 border-ink-850 ${v.status === 'completato' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <button onClick={() => onOpenReport(v)} className="w-full rounded-xl border border-white/[0.06] bg-ink-900/40 p-3 text-left transition-colors hover:border-cyan-400/30">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-white">{fmt(v.date)}</span>
                  <span className="text-slate-500">
                    VA {v.visualAcuity.od || '—'} / {v.visualAcuity.os || '—'} · IOP {v.iop.od || '—'} / {v.iop.os || '—'}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-300">{v.diagnosis || '—'}</p>
                {v.prescription && <p className="mt-0.5 truncate text-xs text-slate-500">Rx: {v.prescription}</p>}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

interface Point {
  date: string;
  od: number | null;
  os: number | null;
}

function TrendChart({ title, icon, data, min, max, format, threshold }: { title: string; icon: React.ReactNode; data: Point[]; min: number; max: number; format: (v: number) => string; threshold?: number }) {
  const W = 300;
  const H = 120;
  const pad = 18;
  const n = data.length;
  const x = (i: number) => (n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2));
  const y = (v: number) => H - pad - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (H - pad * 2);
  const line = (k: 'od' | 'os') =>
    data
      .map((d, i) => (d[k] === null ? null : `${x(i)},${y(d[k] as number)}`))
      .filter(Boolean)
      .join(' ');
  const hasData = data.some((d) => d.od !== null || d.os !== null);
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
        {icon} {title}
        <span className="ml-auto flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded bg-cyan-400" />
            OD
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded bg-violet-400" />
            OS
          </span>
        </span>
      </div>
      {!hasData ? (
        <p className="py-8 text-center text-xs text-slate-600">Dati insufficienti</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {[0, 0.5, 1].map((t) => (
            <line key={t} x1={pad} x2={W - pad} y1={pad + t * (H - pad * 2)} y2={pad + t * (H - pad * 2)} stroke="rgb(255 255 255 / 0.05)" />
          ))}
          {threshold !== undefined && (
            <>
              <line x1={pad} x2={W - pad} y1={y(threshold)} y2={y(threshold)} stroke="#f43f5e" strokeOpacity="0.5" strokeDasharray="4 4" />
              <text x={W - pad} y={y(threshold) - 4} textAnchor="end" fontSize="9" fill="#fda4af">
                {threshold}
              </text>
            </>
          )}
          <polyline points={line('od')} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" />
          <polyline points={line('os')} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinejoin="round" />
          {data.map((d, i) => (
            <g key={i}>
              {d.od !== null && (
                <circle cx={x(i)} cy={y(d.od)} r="3" fill="#22d3ee">
                  <title>{`OD ${format(d.od)} · ${fmt(d.date)}`}</title>
                </circle>
              )}
              {d.os !== null && (
                <circle cx={x(i)} cy={y(d.os)} r="3" fill="#a78bfa">
                  <title>{`OS ${format(d.os)} · ${fmt(d.date)}`}</title>
                </circle>
              )}
              <text x={x(i)} y={H - 3} textAnchor="middle" fontSize="8" fill="#64748b">
                {fmt(d.date)}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
