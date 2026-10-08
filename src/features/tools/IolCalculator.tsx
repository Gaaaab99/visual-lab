import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { NumberField, Note, Stat, ToolCard, fmtD, parseNum } from './ui';

/** Correzione della costante A secondo SRK/II in base alla lunghezza assiale */
function srk2Adjust(al: number): { delta: number; rule: string } {
  if (al < 20) return { delta: 3, rule: 'AL < 20.00 mm → A + 3' };
  if (al < 21) return { delta: 2, rule: '20.00 ≤ AL < 21.00 mm → A + 2' };
  if (al < 22) return { delta: 1, rule: '21.00 ≤ AL < 22.00 mm → A + 1' };
  if (al < 24.5) return { delta: 0, rule: '22.00 ≤ AL < 24.50 mm → A invariata' };
  return { delta: -0.5, rule: 'AL ≥ 24.50 mm → A − 0.5' };
}

const RULES: { range: string; label: string; delta: number }[] = [
  { range: '< 20.00', label: '+3.0', delta: 3 },
  { range: '20.00 – 20.99', label: '+2.0', delta: 2 },
  { range: '21.00 – 21.99', label: '+1.0', delta: 1 },
  { range: '22.00 – 24.49', label: '0', delta: 0 },
  { range: '≥ 24.50', label: '−0.5', delta: -0.5 },
];

export function IolCalculator() {
  const [alS, setAl] = useState('23.50');
  const [k1S, setK1] = useState('43.50');
  const [k2S, setK2] = useState('44.25');
  const [aS, setA] = useState('118.4');
  const [targetS, setTarget] = useState('-0.25');

  const al = parseNum(alS);
  const k1 = parseNum(k1S);
  const k2 = parseNum(k2S);
  const a = parseNum(aS);
  const target = parseNum(targetS) ?? 0;
  const valid = al !== null && k1 !== null && k2 !== null && a !== null && al >= 15 && al <= 40 && k1 >= 30 && k1 <= 60 && k2 >= 30 && k2 <= 60 && a >= 110 && a <= 125;

  let body = <p className="self-start rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">Valori fuori range: AL 15–40 mm, K 30–60 D, costante A 110–125.</p>;

  if (valid) {
    const k = (k1 + k2) / 2;
    const adj = srk2Adjust(al);
    const a1 = a + adj.delta;
    const pEmm = a1 - 2.5 * al - 0.9 * k;
    const cr = pEmm > 14 ? 1.25 : 1.0;
    const pTarget = pEmm - cr * target;
    const center = Math.round(pTarget * 2) / 2;
    const powers = Array.from({ length: 11 }, (_, i) => center + (5 - i) * 0.5).filter((p) => p >= -10 && p <= 40);
    const refrFor = (p: number) => (pEmm - p) / cr;
    const best = powers.reduce((b, p) => (Math.abs(refrFor(p) - target) < Math.abs(refrFor(b) - target) ? p : b), powers[0]);

    body = (
      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="K medio" value={k.toFixed(2)} sub="D" />
          <Stat label="A corretta (A1)" value={a1.toFixed(1)} sub={adj.delta === 0 ? 'nessuna correzione' : `${adj.delta > 0 ? '+' : '−'}${Math.abs(adj.delta)}`} />
          <Stat label="IOL emmetropia" value={pEmm.toFixed(2)} sub="D" tone="cyan" />
          <Stat label={`IOL per target ${fmtD(target)}`} value={pTarget.toFixed(2)} sub={`CR = ${cr.toFixed(2)}`} tone="emerald" />
        </div>
        <p className="text-xs text-slate-400">Regola applicata: {adj.rule}</p>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[300px] text-left text-sm">
            <thead className="bg-ink-900/70 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Potere IOL (D)</th>
                <th className="px-3 py-2 font-medium">Refrazione prevista (D)</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {powers.map((p) => {
                const r = refrFor(p);
                return (
                  <tr key={p} className={`border-t border-white/[0.04] ${p === best ? 'bg-cyan-400/15 text-white' : 'text-slate-300'}`}>
                    <td className="px-3 py-1.5">
                      {p === best && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-cyan-300 align-middle" />}
                      {p.toFixed(1)}
                    </td>
                    <td className={`px-3 py-1.5 ${Math.abs(r) < 0.13 ? 'text-emerald-300' : r > 0 ? 'text-amber-200' : 'text-sky-200'}`}>{fmtD(r)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <ToolCard
      icon={<Calculator size={20} />}
      title="Calcolo IOL — formula SRK/II"
      subtitle="Formula di regressione di II generazione (Sanders-Retzlaff-Kraff II). Solo a scopo didattico: in clinica preferire formule di III/IV generazione o IOL-specifiche."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="iol-al" label="Lunghezza assiale" value={alS} onChange={setAl} step={0.01} suffix="mm" />
            <NumberField id="iol-a" label="Costante A" value={aS} onChange={setA} step={0.1} />
            <NumberField id="iol-k1" label="K1" value={k1S} onChange={setK1} step={0.25} suffix="D" />
            <NumberField id="iol-k2" label="K2" value={k2S} onChange={setK2} step={0.25} suffix="D" />
          </div>
          <NumberField id="iol-target" label="Refrazione target" value={targetS} onChange={setTarget} step={0.25} suffix="D" />
          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <p className="bg-ink-900/70 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Correzione A1 (SRK/II)</p>
            <table className="w-full text-sm">
              <tbody className="font-mono">
                {RULES.map(({ range, label: d, delta }) => {
                  const active = valid && srk2Adjust(al).delta === delta;
                  return (
                    <tr key={range} className={`border-t border-white/[0.04] ${active ? 'bg-cyan-400/10 text-cyan-100' : 'text-slate-400'}`}>
                      <td className="px-3 py-1">AL {range} mm</td>
                      <td className="px-3 py-1 text-right">{d}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {body}
      </div>
      <Note>
        P<sub>emm</sub> = A1 − 2.5 × AL − 0.9 × K. Potere per refrazione target R: P = P<sub>emm</sub> − CR × R, con CR = 1.25 se P<sub>emm</sub> &gt; 14 D, altrimenti
        1.00. Refrazione prevista per una IOL di potere P: R = (P<sub>emm</sub> − P) / CR. La riga evidenziata è la IOL più vicina al target.
      </Note>
    </ToolCard>
  );
}
