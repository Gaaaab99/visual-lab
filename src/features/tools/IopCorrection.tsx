import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { NumberField, Note, Stat, ToolCard, parseNum, type Tone } from './ui';

const REF_CCT = 545;
const K_PER_10UM = 0.7;

function iopClass(iop: number): { text: string; tone: Tone } {
  if (iop < 10) return { text: 'Bassa (< 10 mmHg)', tone: 'sky' };
  if (iop <= 21) return { text: 'Nel range statistico normale (10–21 mmHg)', tone: 'emerald' };
  if (iop <= 25) return { text: 'Lievemente elevata (22–25 mmHg)', tone: 'amber' };
  if (iop <= 30) return { text: 'Elevata (26–30 mmHg)', tone: 'rose' };
  return { text: 'Molto elevata (> 30 mmHg)', tone: 'rose' };
}

function cctClass(cct: number): { text: string; tone: Tone } {
  if (cct < 520) return { text: 'Sottile (< 520 µm): IOP probabilmente sottostimata; fattore di rischio indipendente (OHTS ≤ 555 µm)', tone: 'rose' };
  if (cct <= 555) return { text: 'Medio-sottile (520–555 µm): fattore di rischio di conversione a glaucoma secondo OHTS', tone: 'amber' };
  if (cct <= 590) return { text: 'Media (556–590 µm)', tone: 'emerald' };
  return { text: 'Spessa (> 590 µm): IOP probabilmente sovrastimata', tone: 'sky' };
}

export function IopCorrection() {
  const [iopS, setIop] = useState('22');
  const [cctS, setCct] = useState('510');
  const iop = parseNum(iopS);
  const cct = parseNum(cctS);
  const valid = iop !== null && cct !== null && iop >= 0 && iop <= 80 && cct >= 350 && cct <= 800;

  const delta = valid ? ((REF_CCT - cct) / 10) * K_PER_10UM : 0;
  const corrected = valid ? iop + delta : 0;
  const ic = iopClass(corrected);
  const cc = valid ? cctClass(cct) : null;
  const pct = Math.min(100, Math.max(0, (corrected / 40) * 100));

  return (
    <ToolCard icon={<Gauge size={20} />} title="Correzione IOP per pachimetria" subtitle="Stima della pressione intraoculare corretta per lo spessore corneale centrale (CCT) misurato con tonometria Goldmann.">
      <div className="grid gap-5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <NumberField id="iop" label="IOP Goldmann" value={iopS} onChange={setIop} step={1} min={0} suffix="mmHg" />
          <NumberField id="cct" label="CCT (pachimetria)" value={cctS} onChange={setCct} step={5} min={350} suffix="µm" hint={`Riferimento: ${REF_CCT} µm`} />
        </div>
        {valid && cc ? (
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="IOP misurata" value={`${iop.toFixed(0)}`} sub="mmHg" />
              <Stat label="Correzione" value={`${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}`} sub="mmHg" tone="cyan" />
              <Stat label="IOP corretta" value={corrected.toFixed(1)} sub="mmHg" tone={ic.tone} />
            </div>
            <div>
              <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-sky-500/50 via-emerald-500/50 via-55% to-rose-500/60">
                <div className="absolute inset-y-0 border-l-2 border-white shadow-[0_0_8px_white]" style={{ left: `${pct}%` }} />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
                <span>0</span>
                <span>10</span>
                <span>21</span>
                <span>30</span>
                <span>40 mmHg</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className={`rounded-xl border px-3 py-2 ${'border-white/10'}`}>
                <span className="text-slate-400">IOP corretta: </span>
                <span className="font-medium text-white">{ic.text}</span>
              </p>
              <p className="rounded-xl border border-white/10 px-3 py-2">
                <span className="text-slate-400">Spessore corneale: </span>
                <span className="font-medium text-white">{cc.text}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="self-start rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">Inserire IOP (0–80 mmHg) e CCT (350–800 µm).</p>
        )}
      </div>
      <Note>
        Formula (correzione lineare tipo Ehlers): IOP<sub>corr</sub> = IOP<sub>GAT</sub> + (545 − CCT) / 10 × 0.7 mmHg. Il valore è puramente indicativo: non esiste un
        nomogramma di correzione validato universalmente e la tonometria è influenzata anche da curvatura, isteresi e rigidità corneale. Non usare la IOP corretta come unico
        criterio decisionale.
      </Note>
    </ToolCard>
  );
}
