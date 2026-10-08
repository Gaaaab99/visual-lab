import type { ColorBlindType, ConditionId, Quadrant, SimulatorParams, SimulatorState } from '../../types';

export interface ConditionMeta {
  id: ConditionId;
  name: string;
  short: string;
  group: 'Retina' | 'Nervo ottico' | 'Refrazione' | 'Mezzi diottrici' | 'Cornea' | 'Colore' | 'Uvea' | 'Funzionale';
  effect: string;
  pathologyId: string;
}

export const CONDITIONS: ConditionMeta[] = [
  { id: 'glaucoma', name: 'Glaucoma', short: 'GLC', group: 'Nervo ottico', effect: 'Restrizione concentrica del campo visivo con perdita di sensibilità periferica.', pathologyId: 'glaucoma' },
  { id: 'cataract', name: 'Cataratta', short: 'CAT', group: 'Mezzi diottrici', effect: 'Sfocatura diffusa, abbagliamento, calo di contrasto e ingiallimento brunescente.', pathologyId: 'cataratta' },
  { id: 'amd', name: 'Degenerazione maculare (AMD)', short: 'AMD', group: 'Retina', effect: 'Scotoma centrale e metamorfopsia delle linee rette.', pathologyId: 'amd' },
  { id: 'diabeticRetinopathy', name: 'Retinopatia diabetica', short: 'RD', group: 'Retina', effect: 'Scotomi sparsi a macchia di leopardo e micro-emorragie.', pathologyId: 'retinopatia-diabetica' },
  { id: 'retinalDetachment', name: 'Distacco di retina', short: 'DR', group: 'Retina', effect: 'Tenda scura che invade un quadrante, con fotopsie.', pathologyId: 'distacco-retina' },
  { id: 'myopia', name: 'Miopia', short: 'MIO', group: 'Refrazione', effect: 'Sfocatura per lontano proporzionale alle diottrie.', pathologyId: 'miopia' },
  { id: 'hyperopia', name: 'Ipermetropia', short: 'IPM', group: 'Refrazione', effect: 'Sfocatura per vicino, accentuata in lettura.', pathologyId: 'ipermetropia' },
  { id: 'astigmatism', name: 'Astigmatismo', short: 'AST', group: 'Refrazione', effect: 'Sdoppiamento e sfocatura direzionale lungo un asse.', pathologyId: 'astigmatismo' },
  { id: 'keratoconus', name: 'Cheratocono', short: 'KC', group: 'Cornea', effect: 'Aberrazioni di alto ordine, ghosting inferiore e aloni.', pathologyId: 'cheratocono' },
  { id: 'floaters', name: 'Miodesopsie', short: 'FLT', group: 'Mezzi diottrici', effect: 'Corpi mobili vitreali semitrasparenti che fluttuano.', pathologyId: 'miodesopsie' },
  { id: 'colorBlindness', name: 'Discromatopsia', short: 'CB', group: 'Colore', effect: 'Simulazione dicromatica (protan, deutan, tritan).', pathologyId: 'discromatopsia' },
  { id: 'macularEdema', name: 'Edema maculare', short: 'EM', group: 'Retina', effect: 'Offuscamento centrale, distorsione e desaturazione.', pathologyId: 'edema-maculare' },
  { id: 'retinitisPigmentosa', name: 'Retinite pigmentosa', short: 'RP', group: 'Retina', effect: 'Visione tubulare e cecità notturna.', pathologyId: 'retinite-pigmentosa' },
  { id: 'uveitis', name: 'Uveite', short: 'UV', group: 'Uvea', effect: 'Iperemia perilimbare, foschia e cellule vitreali.', pathologyId: 'uveite' },
  { id: 'opticNeuritis', name: 'Neurite ottica', short: 'NO', group: 'Nervo ottico', effect: 'Desaturazione cromatica e scotoma centrocecale.', pathologyId: 'neurite-ottica' },
  { id: 'amblyopia', name: 'Ambliopia', short: 'AMB', group: 'Funzionale', effect: 'Ridotta acuità, crowding e calo di contrasto.', pathologyId: 'ambliopia' },
];

export const CONDITION_BY_ID = Object.fromEntries(CONDITIONS.map((c) => [c.id, c])) as Record<ConditionId, ConditionMeta>;

export const COLOR_BLIND_LABEL: Record<ColorBlindType, string> = {
  protanopia: 'Protanopia (rosso)',
  deuteranopia: 'Deuteranopia (verde)',
  tritanopia: 'Tritanopia (blu)',
};

export const QUADRANT_LABEL: Record<Quadrant, string> = {
  superior: 'Superiore',
  inferior: 'Inferiore',
  temporal: 'Temporale',
  nasal: 'Nasale',
};

export const DEFAULT_PARAMS: SimulatorParams = {
  myopiaDiopters: -3,
  hyperopiaDiopters: 2.5,
  astigmatismAxis: 90,
  astigmatismCylinder: 2,
  colorBlindType: 'deuteranopia',
  detachmentQuadrant: 'superior',
};

export function createInitialState(): SimulatorState {
  const conditions = Object.fromEntries(CONDITIONS.map((c) => [c.id, { enabled: false, severity: 50 }])) as SimulatorState['conditions'];
  return { conditions, params: { ...DEFAULT_PARAMS } };
}

export type StageId = 'early' | 'moderate' | 'advanced';
export const STAGES: { id: StageId; label: string; severity: number }[] = [
  { id: 'early', label: 'Iniziale', severity: 25 },
  { id: 'moderate', label: 'Moderato', severity: 55 },
  { id: 'advanced', label: 'Avanzato', severity: 85 },
];

export interface ClinicalPreset {
  id: string;
  label: string;
  description: string;
  conditions: Partial<Record<ConditionId, number>>;
  params?: Partial<SimulatorParams>;
}

export const CLINICAL_PRESETS: ClinicalPreset[] = [
  { id: 'cat-glc', label: 'Cataratta + Glaucoma', description: 'Anziano con cataratta nucleare e glaucoma cronico ad angolo aperto.', conditions: { cataract: 60, glaucoma: 55 } },
  { id: 'dm', label: 'Paziente diabetico', description: 'Retinopatia diabetica proliferante con edema maculare.', conditions: { diabeticRetinopathy: 65, macularEdema: 50 } },
  { id: 'amd-wet', label: 'AMD essudativa', description: 'Neovascolarizzazione coroideale con scotoma e metamorfopsia.', conditions: { amd: 75, cataract: 20 } },
  { id: 'kc', label: 'Cheratocono evolutivo', description: 'Giovane con ectasia corneale e astigmatismo irregolare.', conditions: { keratoconus: 65, astigmatism: 45 }, params: { astigmatismAxis: 160, astigmatismCylinder: 3.5 } },
  { id: 'rd', label: 'Distacco regmatogeno', description: 'Tenda superiore con fotopsie e corpi mobili.', conditions: { retinalDetachment: 60, floaters: 70 }, params: { detachmentQuadrant: 'superior' } },
  { id: 'myope', label: 'Miope elevato', description: 'Miopia elevata −8 D con miodesopsie.', conditions: { myopia: 70, floaters: 35 }, params: { myopiaDiopters: -8 } },
  { id: 'ms', label: 'Neurite ottica (SM)', description: 'Neurite retrobulbare in sclerosi multipla.', conditions: { opticNeuritis: 70 } },
  { id: 'rp', label: 'Retinite pigmentosa', description: 'Visione tubulare avanzata e nictalopia.', conditions: { retinitisPigmentosa: 80 } },
];
