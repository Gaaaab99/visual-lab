import { useState } from 'react';
import { Repeat } from 'lucide-react';
import { NumberField, Note, Stat, ToolCard, fmtD, normAxis, parseNum } from './ui';

export function CylinderTools() {
  const [sphS, setSph] = useState('+1.50');
  const [cylS, setCyl] = useState('-2.25');
  const [axisS, setAxis] = useState('170');

  const sph = parseNum(sphS);
  const cyl = parseNum(cylS);
  const axis = parseNum(axisS);
  const valid = sph !== null && cyl !== null && axis !== null && axis >= 0 && axis <= 180;

  return (
    <ToolCard icon={<Repeat size={20} />} title="Trasposizione cilindro ed equivalente sferico" subtitle="Passaggio tra notazione a cilindro positivo e negativo, croce dei poteri ed equivalente sferico.">
      <div className="grid gap-5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
          <NumberField id="tc-sph" label="Sfera" value={sphS} onChange={setSph} suffix="D" />
          <NumberField id="tc-cyl" label="Cilindro" value={cylS} onChange={setCyl} suffix="D" />
          <NumberField id="tc-axis" label="Asse" value={axisS} onChange={setAxis} step={5} min={0} max={180} suffix="°" />
        </div>
        {valid ? (
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Stat label="Prescrizione originale" value={`${fmtD(sph)} ${fmtD(cyl)} × ${normAxis(axis)}°`} sub={cyl < 0 ? 'Cilindro negativo' : cyl > 0 ? 'Cilindro positivo' : 'Sfera semplice'} />
              <Stat
                label="Trasposta"
                value={`${fmtD(sph + cyl)} ${fmtD(-cyl)} × ${normAxis(axis + 90)}°`}
                sub={cyl < 0 ? 'Cilindro positivo' : cyl > 0 ? 'Cilindro negativo' : 'Sfera semplice'}
                tone="cyan"
              />
              <Stat label="Equivalente sferico" value={`${fmtD(sph + cyl / 2)} D`} sub="SE = S + C/2" tone="emerald" />
              <Stat label="Meridiani principali" value={<span className="text-base">{`${fmtD(sph)} @${normAxis(axis)}° · ${fmtD(sph + cyl)} @${normAxis(axis + 90)}°`}</span>} />
            </div>
            <PowerCross m1={sph} a1={normAxis(axis)} m2={sph + cyl} a2={normAxis(axis + 90)} />
          </div>
        ) : (
          <p className="self-start rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">Inserire sfera, cilindro e asse (0–180°).</p>
        )}
      </div>
      <Note>Trasposizione: nuova sfera = S + C · nuovo cilindro = −C · nuovo asse = asse ± 90° (mantenuto tra 1° e 180°). Gli assi sono in notazione TABO.</Note>
    </ToolCard>
  );
}

/** Croce ottica dei poteri: gli assi TABO vanno in senso antiorario a partire dalle ore 3 */
function PowerCross({ m1, a1, m2, a2 }: { m1: number; a1: number; m2: number; a2: number }) {
  const line = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return { x: Math.cos(r) * 80, y: -Math.sin(r) * 80 };
  };
  const p1 = line(a1);
  const p2 = line(a2);
  return (
    <div className="flex justify-center rounded-xl border border-white/[0.06] bg-ink-900/40 p-3">
      <svg viewBox="-130 -110 260 220" className="h-48 w-full max-w-[320px]" role="img" aria-label="Croce dei poteri">
        <circle r={90} fill="none" stroke="rgb(255 255 255 / 0.08)" />
        <text x={96} y={4} fontSize={9} fill="#64748b">
          0°
        </text>
        <text x={-4} y={-95} fontSize={9} fill="#64748b">
          90°
        </text>
        <text x={-122} y={4} fontSize={9} fill="#64748b">
          180°
        </text>
        <line x1={-p1.x} y1={-p1.y} x2={p1.x} y2={p1.y} stroke="#22d3ee" strokeWidth={3} strokeLinecap="round" />
        <line x1={-p2.x} y1={-p2.y} x2={p2.x} y2={p2.y} stroke="#60a5fa" strokeWidth={3} strokeLinecap="round" />
        <text x={p1.x * 1.08} y={p1.y * 1.08 - 6} fontSize={11} fill="#a5f3fc" textAnchor="middle" fontFamily="ui-monospace, monospace">
          {fmtD(m1)}
        </text>
        <text x={p2.x * 1.08} y={p2.y * 1.08 - 6} fontSize={11} fill="#bfdbfe" textAnchor="middle" fontFamily="ui-monospace, monospace">
          {fmtD(m2)}
        </text>
      </svg>
    </div>
  );
}
