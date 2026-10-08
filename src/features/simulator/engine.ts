import type { ColorBlindType, ConditionId, SceneId, SimulationSnapshot, SimulatorState, VisualSource } from '../../types';
import { COLOR_BLIND_LABEL, CONDITION_BY_ID, QUADRANT_LABEL } from './conditions';

export interface Ghost {
  dx: number;
  dy: number;
  opacity: number;
}

export interface RenderModel {
  /** Filtro CSS applicato a tutte le copie della sorgente */
  filter: string;
  /** Copie fantasma (diplopia monoculare, astigmatismo, crowding) espresse in % del viewport */
  ghosts: Ghost[];
  /** Distorsione centrale (metamorfopsia) */
  distortion: { scale: number; radius: number } | null;
  /** Distorsione corneale globale (cheratocono) */
  cornealWarp: number;
  colorMatrix: string | null;
  s: Record<ConditionId, number>;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** Matrici dicromatiche (Machado, Oliveira & Fernandes 2009, severità 1.0) */
const CB_MATRICES: Record<ColorBlindType, number[]> = {
  protanopia: [0.152286, 1.052583, -0.204868, -0.114503, 0.786281, 0.328223, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

export function colorMatrixFor(type: ColorBlindType, severity: number): string {
  const m = CB_MATRICES[type];
  const id = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const t = clamp(severity);
  const mix = m.map((v, i) => id[i] + (v - id[i]) * t);
  const rows = [0, 1, 2].map((r) => `${mix[r * 3].toFixed(4)} ${mix[r * 3 + 1].toFixed(4)} ${mix[r * 3 + 2].toFixed(4)} 0 0`);
  return [...rows, '0 0 0 1 0'].join(' ');
}

export const SCENE_DISTANCE: Record<SceneId, 'near' | 'far'> = {
  reading: 'near',
  amsler: 'near',
  ishihara: 'near',
  night: 'far',
  city: 'far',
};

/** Livello normalizzato 0..1 di ciascuna condizione (0 se disattiva) */
export function levels(state: SimulatorState): Record<ConditionId, number> {
  const out = {} as Record<ConditionId, number>;
  for (const [id, c] of Object.entries(state.conditions) as [ConditionId, { enabled: boolean; severity: number }][]) {
    out[id] = c.enabled ? clamp(c.severity / 100) : 0;
  }
  return out;
}

export function computeRender(state: SimulatorState, source: VisualSource): RenderModel {
  const s = levels(state);
  const p = state.params;
  const distance = source.kind === 'scene' ? SCENE_DISTANCE[source.scene] : 'far';

  // --- Sfocatura (px) ----------------------------------------------------
  let blur = 0;
  if (state.conditions.myopia.enabled) {
    const d = Math.abs(p.myopiaDiopters);
    blur += distance === 'far' ? d * 1.15 : d * 0.18; // il miope vede bene da vicino
  }
  if (state.conditions.hyperopia.enabled) {
    const d = Math.abs(p.hyperopiaDiopters);
    blur += distance === 'near' ? d * 1.35 : d * 0.35;
  }
  blur += s.cataract * 3.2;
  blur += s.amblyopia * 2.4;
  blur += s.keratoconus * 1.4;
  blur += s.uveitis * 1.6;
  blur += s.macularEdema * 0.8;
  blur += s.astigmatism * (p.astigmatismCylinder / 6) * 1.2;

  // --- Contrasto / luminosità / saturazione ------------------------------
  let contrast = 1;
  contrast -= s.cataract * 0.42;
  contrast -= s.amblyopia * 0.3;
  contrast -= s.opticNeuritis * 0.35;
  contrast -= s.glaucoma * 0.12;
  contrast -= s.uveitis * 0.2;
  contrast -= s.keratoconus * 0.15;

  let brightness = 1;
  brightness += s.cataract * 0.1;
  brightness -= s.retinitisPigmentosa * 0.35;
  brightness -= s.opticNeuritis * 0.18;
  brightness += s.uveitis * 0.08;

  let saturate = 1;
  saturate -= s.opticNeuritis * 0.85;
  saturate -= s.macularEdema * 0.2;
  saturate -= s.retinitisPigmentosa * 0.25;
  saturate -= s.cataract * 0.2;

  const sepia = s.cataract * 0.75;
  const hue = -s.cataract * 8;

  const parts = [
    blur > 0.05 && `blur(${blur.toFixed(2)}px)`,
    `contrast(${clamp(contrast, 0.25, 1.3).toFixed(3)})`,
    `brightness(${clamp(brightness, 0.35, 1.4).toFixed(3)})`,
    `saturate(${clamp(saturate, 0.05, 1.2).toFixed(3)})`,
    sepia > 0.01 && `sepia(${sepia.toFixed(3)})`,
    hue !== 0 && `hue-rotate(${hue.toFixed(1)}deg)`,
    s.colorBlindness > 0 && 'url(#vl-colorblind)',
    s.keratoconus > 0.05 && 'url(#vl-cornea)',
  ].filter(Boolean);

  // --- Copie fantasma ---------------------------------------------------
  const ghosts: Ghost[] = [];
  if (s.astigmatism > 0) {
    const mag = (p.astigmatismCylinder / 6) * (0.35 + s.astigmatism) * 1.6; // % viewport
    const rad = (p.astigmatismAxis * Math.PI) / 180;
    const steps = 3;
    for (let i = 1; i <= steps; i++) {
      const k = (i / steps) * mag;
      const op = 0.32 * (1 - (i - 1) / steps) * (0.4 + s.astigmatism * 0.6);
      ghosts.push({ dx: Math.cos(rad) * k, dy: -Math.sin(rad) * k, opacity: op });
      ghosts.push({ dx: -Math.cos(rad) * k, dy: Math.sin(rad) * k, opacity: op * 0.8 });
    }
  }
  if (s.keratoconus > 0) {
    // coma verticale inferiore tipico del cono inferotemporale
    const mag = s.keratoconus * 2.6;
    ghosts.push({ dx: 0.25 * mag, dy: mag, opacity: 0.38 * s.keratoconus + 0.1 });
    ghosts.push({ dx: 0.5 * mag, dy: mag * 1.9, opacity: 0.22 * s.keratoconus });
    ghosts.push({ dx: -0.4 * mag, dy: mag * 0.6, opacity: 0.18 * s.keratoconus });
  }
  if (s.amblyopia > 0.2) {
    const mag = s.amblyopia * 0.8;
    ghosts.push({ dx: mag, dy: 0, opacity: 0.18 * s.amblyopia });
  }

  // --- Distorsione centrale --------------------------------------------
  const metamorph = Math.max(s.amd * 1, s.macularEdema * 0.7);
  const distortion = metamorph > 0 ? { scale: 6 + metamorph * 34, radius: 18 + metamorph * 14 } : null;

  return {
    filter: parts.join(' '),
    ghosts,
    distortion,
    cornealWarp: s.keratoconus * 14,
    colorMatrix: s.colorBlindness > 0 ? colorMatrixFor(p.colorBlindType, s.colorBlindness) : null,
    s,
  };
}

export function sourceLabel(source: VisualSource): string {
  if (source.kind === 'webcam') return 'Webcam in tempo reale';
  if (source.kind === 'upload') return `Immagine caricata (${source.name})`;
  return SCENE_LABEL[source.scene];
}

export const SCENE_LABEL: Record<SceneId, string> = {
  reading: 'Lettura testo (vicino)',
  night: 'Guida notturna',
  city: 'Paesaggio urbano',
  amsler: 'Griglia di Amsler',
  ishihara: 'Tavola pseudoisocromatica',
};

export function severityLabel(v: number): string {
  if (v < 34) return 'lieve';
  if (v < 67) return 'moderata';
  return 'grave';
}

export function describeCondition(state: SimulatorState, id: ConditionId): string {
  const c = state.conditions[id];
  const p = state.params;
  const name = CONDITION_BY_ID[id].name;
  switch (id) {
    case 'myopia':
      return `${name} ${p.myopiaDiopters.toFixed(2)} D`;
    case 'hyperopia':
      return `${name} +${p.hyperopiaDiopters.toFixed(2)} D`;
    case 'astigmatism':
      return `${name} cil. −${p.astigmatismCylinder.toFixed(2)} D asse ${Math.round(p.astigmatismAxis)}°`;
    case 'colorBlindness':
      return `${COLOR_BLIND_LABEL[p.colorBlindType]} (${c.severity}%)`;
    case 'retinalDetachment':
      return `${name} quadrante ${QUADRANT_LABEL[p.detachmentQuadrant].toLowerCase()} (${severityLabel(c.severity)}, ${c.severity}%)`;
    default:
      return `${name} ${severityLabel(c.severity)} (${c.severity}%)`;
  }
}

export function snapshot(state: SimulatorState, source: VisualSource): SimulationSnapshot {
  const active = (Object.keys(state.conditions) as ConditionId[]).filter((id) => state.conditions[id].enabled);
  return {
    conditions: active.map((id) => ({ id, name: CONDITION_BY_ID[id].name, severity: state.conditions[id].severity })),
    params: { ...state.params },
    source: sourceLabel(source),
    summary: active.length ? active.map((id) => describeCondition(state, id)).join('; ') : 'Nessuna alterazione simulata (visione di riferimento).',
    capturedAt: new Date().toISOString(),
  };
}

/** PRNG deterministico per posizionare scotomi ed elementi in modo stabile */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
