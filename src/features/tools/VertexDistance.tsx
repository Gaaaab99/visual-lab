import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { NumberField, Note, Stat, ToolCard, fmtD, normAxis, parseNum, roundQuarter } from './ui';

/** Potere effettivo al nuovo piano: Fc = F / (1 − d·F), d in metri (positivo verso l'occhio) */
export function vertexConvert(F: number, dMm: number): number {
  const d = dMm / 1000;
  return F / (1 - d * F);
}

export function VertexDistance() {
  const [sphS, setSph] = useState('-6.00');
  const [cylS, setCyl] = useState('-2.00');
  const [axisS, setAxis] = useState('180');
  const [dS, setD] = useState('12');

  const sph = parseNum(sphS);
  const cyl = parseNum(cylS) ?? 0;
  const axis = parseNum(axisS) ?? 180;
  const d = parseNum(dS);
  const valid = sph !== null && d !== null && d >= 0 && d <= 30 && Math.abs(sph) <= 30 && Math.abs(cyl) <= 15;

  let content = <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">Inserire sfera, cilindro e distanza (0–30 mm) validi.</p>;

  if (valid) {
    const ax1 = normAxis(axis);
    const ax2 = normAxis(axis + 90);
    const m1 = sph; // meridiano dell'asse
    const m2 = sph + cyl; // meridiano a 90°
    const c1 = vertexConvert(m1, d);
    const c2 = vertexConvert(m2, d);
    const sphC = c1;
    const cylC = c2 - c1;
    const significant = Math.abs(m1) >= 4 || Math.abs(m2) >= 4;

    content = (
      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Stat label="Lente a contatto (esatta)" value={`${fmtD(sphC)} ${fmtD(cylC)} × ${ax1}°`} tone="cyan" />
          <Stat label="Arrotondata a 0.25 D" value={`${fmtD(roundQuarter(sphC))} ${fmtD(roundQuarter(cylC))} × ${ax1}°`} tone="emerald" />
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="bg-ink-900/70 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Meridiano</th>
                <th className="px-3 py-2 font-medium">Occhiale</th>
                <th className="px-3 py-2 font-medium">Piano corneale</th>
                <th className="px-3 py-2 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody className="font-mono text-slate-200">
              {[
                { ax: ax1, f: m1, c: c1 },
                { ax: ax2, f: m2, c: c2 },
              ].map((r) => (
                <tr key={r.ax} className="border-t border-white/[0.04]">
                  <td className="px-3 py-1.5">{r.ax}°</td>
                  <td className="px-3 py-1.5">{fmtD(r.f)}</td>
                  <td className="px-3 py-1.5 text-cyan-200">{fmtD(r.c)}</td>
                  <td className="px-3 py-1.5 text-slate-400">{fmtD(r.c - r.f)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!significant && <p className="text-xs text-slate-400">Entrambi i meridiani sono sotto ±4.00 D: l'effetto della distanza al vertice è clinicamente trascurabile.</p>}
      </div>
    );
  }

  return (
    <ToolCard
      icon={<ArrowRightLeft size={20} />}
      title="Distanza al vertice"
      subtitle="Conversione del potere dall'occhiale al piano corneale (lente a contatto), meridiano per meridiano."
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="vx-sph" label="Sfera" value={sphS} onChange={setSph} suffix="D" />
          <NumberField id="vx-cyl" label="Cilindro" value={cylS} onChange={setCyl} suffix="D" />
          <NumberField id="vx-axis" label="Asse" value={axisS} onChange={setAxis} step={5} min={0} max={180} suffix="°" />
          <NumberField id="vx-d" label="Distanza vertice" value={dS} onChange={setD} step={1} min={0} suffix="mm" />
        </div>
        {content}
      </div>
      <Note>
        Formula: F<sub>c</sub> = F / (1 − d·F), con d in metri. Ogni meridiano principale (sfera all'asse, sfera + cilindro a 90° dall'asse) viene convertito
        separatamente e poi ricombinato. Rilevante per poteri ≥ ±4.00 D: le lenti negative si riducono, le positive aumentano al piano corneale.
      </Note>
    </ToolCard>
  );
}
