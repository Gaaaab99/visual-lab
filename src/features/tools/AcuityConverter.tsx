import { useMemo, useState } from 'react';
import { Glasses } from 'lucide-react';
import { NumberField, Note, Stat, ToolCard, parseNum } from './ui';

type Unit = 'decimal' | 'snellen6' | 'snellen20' | 'logmar' | 'mar';

const UNITS: { id: Unit; label: string; hint: string; step: number }[] = [
  { id: 'decimal', label: 'Decimale', hint: 'es. 0.5 (= 5/10)', step: 0.05 },
  { id: 'snellen6', label: 'Snellen 6/x', hint: 'denominatore in metri, es. 12', step: 1 },
  { id: 'snellen20', label: 'Snellen 20/x', hint: 'denominatore in piedi, es. 40', step: 5 },
  { id: 'logmar', label: 'LogMAR', hint: 'es. 0.3', step: 0.1 },
  { id: 'mar', label: 'MAR (arcmin)', hint: 'minimo angolo di risoluzione', step: 0.5 },
];

/** Converte il valore inserito nell'unità scelta in LogMAR */
function toLogMar(unit: Unit, v: number): number | null {
  switch (unit) {
    case 'decimal':
      return v > 0 ? -Math.log10(v) : null;
    case 'snellen6':
      return v > 0 ? Math.log10(v / 6) : null;
    case 'snellen20':
      return v > 0 ? Math.log10(v / 20) : null;
    case 'logmar':
      return v;
    case 'mar':
      return v > 0 ? Math.log10(v) : null;
  }
}

function fromLogMar(unit: Unit, lm: number): string {
  const mar = 10 ** lm;
  switch (unit) {
    case 'decimal':
      return (1 / mar).toFixed(2);
    case 'snellen6':
      return (6 * mar).toFixed(1);
    case 'snellen20':
      return (20 * mar).toFixed(0);
    case 'logmar':
      return lm.toFixed(2);
    case 'mar':
      return mar.toFixed(2);
  }
}

interface Row {
  logmar: number;
  decimal: string;
  m6: string;
  f20: string;
  decimi: string;
  etdrs: number;
}

const ROWS: Row[] = [
  { logmar: 1.0, decimal: '0.10', m6: '6/60', f20: '20/200', decimi: '1/10', etdrs: 35 },
  { logmar: 0.9, decimal: '0.125', m6: '6/48', f20: '20/160', decimi: '1.25/10', etdrs: 40 },
  { logmar: 0.8, decimal: '0.16', m6: '6/38', f20: '20/125', decimi: '1.6/10', etdrs: 45 },
  { logmar: 0.7, decimal: '0.20', m6: '6/30', f20: '20/100', decimi: '2/10', etdrs: 50 },
  { logmar: 0.6, decimal: '0.25', m6: '6/24', f20: '20/80', decimi: '2.5/10', etdrs: 55 },
  { logmar: 0.5, decimal: '0.32', m6: '6/19', f20: '20/63', decimi: '3.2/10', etdrs: 60 },
  { logmar: 0.4, decimal: '0.40', m6: '6/15', f20: '20/50', decimi: '4/10', etdrs: 65 },
  { logmar: 0.3, decimal: '0.50', m6: '6/12', f20: '20/40', decimi: '5/10', etdrs: 70 },
  { logmar: 0.2, decimal: '0.63', m6: '6/9.5', f20: '20/32', decimi: '6.3/10', etdrs: 75 },
  { logmar: 0.1, decimal: '0.80', m6: '6/7.5', f20: '20/25', decimi: '8/10', etdrs: 80 },
  { logmar: 0.0, decimal: '1.00', m6: '6/6', f20: '20/20', decimi: '10/10', etdrs: 85 },
  { logmar: -0.1, decimal: '1.25', m6: '6/4.8', f20: '20/16', decimi: '12.5/10', etdrs: 90 },
  { logmar: -0.2, decimal: '1.60', m6: '6/3.8', f20: '20/12.5', decimi: '16/10', etdrs: 95 },
  { logmar: -0.3, decimal: '2.00', m6: '6/3', f20: '20/10', decimi: '20/10', etdrs: 100 },
];

function category(lm: number): { text: string; tone: 'emerald' | 'sky' | 'amber' | 'rose' } {
  // Classificazione OMS (ICD-11) basata sull'occhio migliore
  if (lm <= 0.3) return { text: 'Nessuna compromissione / lieve (≥ 6/12)', tone: 'emerald' };
  if (lm <= 0.48) return { text: 'Compromissione lieve (< 6/12 e ≥ 6/18)', tone: 'sky' };
  if (lm <= 1.0) return { text: 'Compromissione moderata (< 6/18 e ≥ 6/60)', tone: 'amber' };
  if (lm <= 1.3) return { text: 'Compromissione grave (< 6/60 e ≥ 3/60)', tone: 'rose' };
  return { text: 'Cecità (< 3/60)', tone: 'rose' };
}

export function AcuityConverter() {
  const [unit, setUnit] = useState<Unit>('decimal');
  const [raw, setRaw] = useState('0.5');

  const lm = useMemo(() => {
    const v = parseNum(raw);
    if (v === null) return null;
    const r = toLogMar(unit, v);
    return r !== null && r >= -0.5 && r <= 3 ? r : null;
  }, [unit, raw]);

  const switchUnit = (u: Unit) => {
    if (lm !== null) setRaw(fromLogMar(u, lm));
    setUnit(u);
  };

  const nearest = lm === null ? -1 : ROWS.reduce((best, r, i) => (Math.abs(r.logmar - lm) < Math.abs(ROWS[best].logmar - lm) ? i : best), 0);
  const mar = lm === null ? null : 10 ** lm;
  const cat = lm === null ? null : category(lm);
  const unitDef = UNITS.find((u) => u.id === unit) ?? UNITS[0];

  return (
    <ToolCard icon={<Glasses size={20} />} title="Convertitore acuità visiva" subtitle="Decimale ↔ Snellen (6/x, 20/x) ↔ LogMAR ↔ MAR, con tabella di equivalenza completa.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="label">Unità di ingresso</p>
            <div className="flex flex-wrap gap-1.5">
              {UNITS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => switchUnit(u.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${unit === u.id ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
          <NumberField
            id="va-value"
            label={unit === 'snellen6' ? 'Denominatore (6/…)' : unit === 'snellen20' ? 'Denominatore (20/…)' : unitDef.label}
            value={raw}
            onChange={setRaw}
            step={unitDef.step}
            hint={unitDef.hint}
          />
          <div>
            <label htmlFor="va-slider" className="label">
              Regola in LogMAR
            </label>
            <input
              id="va-slider"
              type="range"
              min={-0.3}
              max={1.3}
              step={0.02}
              value={lm ?? 0}
              onChange={(e) => setRaw(fromLogMar(unit, Number(e.target.value)))}
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
              <span>−0.3</span>
              <span>0.0</span>
              <span>0.5</span>
              <span>1.0</span>
              <span>1.3</span>
            </div>
          </div>

          {lm === null || mar === null ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">Valore non valido o fuori intervallo.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Decimale" value={(1 / mar).toFixed(2)} sub={`${(10 / mar).toFixed(1)}/10`} tone="cyan" />
              <Stat label="LogMAR" value={lm.toFixed(2)} sub={`ETDRS ≈ ${Math.max(0, Math.round(85 - lm * 50))} lettere`} tone="cyan" />
              <Stat label="Snellen (m)" value={`6/${(6 * mar).toFixed(1)}`} />
              <Stat label="Snellen (ft)" value={`20/${(20 * mar).toFixed(0)}`} />
              <Stat label="MAR" value={`${mar.toFixed(2)}′`} sub="minuti d'arco" />
              {cat && <Stat label="Categoria OMS" value={<span className="text-sm">{cat.text.split(' (')[0]}</span>} sub={cat.text.includes('(') ? `(${cat.text.split(' (')[1]}` : undefined} tone={cat.tone} />}
            </div>
          )}
        </div>

        <div className="min-w-0 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead className="bg-ink-900/70 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">LogMAR</th>
                <th className="px-3 py-2 font-medium">Decimale</th>
                <th className="px-3 py-2 font-medium">Decimi</th>
                <th className="px-3 py-2 font-medium">6/x</th>
                <th className="px-3 py-2 font-medium">20/x</th>
                <th className="px-3 py-2 font-medium">ETDRS</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {ROWS.map((r, i) => (
                <tr
                  key={r.logmar}
                  onClick={() => setRaw(fromLogMar(unit, r.logmar))}
                  className={`cursor-pointer border-t border-white/[0.04] transition ${i === nearest ? 'bg-cyan-400/15 text-white' : 'text-slate-300 hover:bg-white/[0.03]'}`}
                >
                  <td className="px-3 py-1.5">
                    {i === nearest && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-cyan-300 align-middle" />}
                    {r.logmar.toFixed(1)}
                  </td>
                  <td className="px-3 py-1.5">{r.decimal}</td>
                  <td className="px-3 py-1.5">{r.decimi}</td>
                  <td className="px-3 py-1.5">{r.m6}</td>
                  <td className="px-3 py-1.5">{r.f20}</td>
                  <td className="px-3 py-1.5">{r.etdrs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Note>
        Formule: MAR = 1 / decimale · LogMAR = log₁₀(MAR) · Snellen 6/(6·MAR) = 20/(20·MAR). Lettere ETDRS ≈ 85 − 50·LogMAR (5 lettere per riga). Clicca una riga della
        tabella per selezionarla.
      </Note>
    </ToolCard>
  );
}
