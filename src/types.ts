export type ViewId =
  | 'dashboard'
  | 'customers'
  | 'orders'
  | 'agenda'
  | 'pos'
  | 'inventory'
  | 'recalls'
  | 'settings'
  | 'simulator'
  | 'archive'
  | 'cases'
  | 'anatomy'
  | 'tools'
  | 'quiz'
  | 'reports';

/* ---------------------------------------------------------------- Simulator */

export type ConditionId =
  | 'glaucoma'
  | 'cataract'
  | 'amd'
  | 'diabeticRetinopathy'
  | 'retinalDetachment'
  | 'myopia'
  | 'hyperopia'
  | 'astigmatism'
  | 'keratoconus'
  | 'floaters'
  | 'colorBlindness'
  | 'macularEdema'
  | 'retinitisPigmentosa'
  | 'uveitis'
  | 'opticNeuritis'
  | 'amblyopia';

export type ColorBlindType = 'protanopia' | 'deuteranopia' | 'tritanopia';
export type Quadrant = 'superior' | 'inferior' | 'temporal' | 'nasal';

export interface ConditionState {
  enabled: boolean;
  /** 0 - 100 */
  severity: number;
}

export interface SimulatorParams {
  /** Diottrie negative, 0 .. -12 */
  myopiaDiopters: number;
  /** Diottrie positive, 0 .. +8 */
  hyperopiaDiopters: number;
  /** Asse del cilindro 0 - 180 */
  astigmatismAxis: number;
  /** Cilindro in diottrie 0 .. 6 */
  astigmatismCylinder: number;
  colorBlindType: ColorBlindType;
  detachmentQuadrant: Quadrant;
}

export interface SimulatorState {
  conditions: Record<ConditionId, ConditionState>;
  params: SimulatorParams;
}

export type SceneId = 'reading' | 'night' | 'city' | 'faces' | 'stairs' | 'amsler' | 'ishihara';

export type VisualSource =
  | { kind: 'scene'; scene: SceneId }
  | { kind: 'webcam' }
  | { kind: 'upload'; url: string; name: string };

export interface SimulationSnapshot {
  conditions: { id: ConditionId; name: string; severity: number }[];
  params: SimulatorParams;
  source: string;
  summary: string;
  capturedAt: string;
}

/* ------------------------------------------------------------------ Archive */

export type PathologyCategory =
  | 'Retina'
  | 'Cornea'
  | 'Nervo Ottico'
  | 'Vizi di Refrazione'
  | 'Mezzi Diottrici'
  | 'Uvea';

export interface Pathology {
  id: string;
  name: string;
  latin?: string;
  category: PathologyCategory;
  icd10: string;
  simulatorId?: ConditionId;
  summary: string;
  description: string;
  etiology: string[];
  riskFactors: string[];
  symptoms: string[];
  diagnostics: { name: string; finding: string }[];
  treatments: { type: 'Medica' | 'Laser' | 'Chirurgica' | 'Iniettiva' | 'Ottica' | 'Riabilitativa'; name: string; detail: string }[];
  prevalence: string;
  urgency: 'Elettiva' | 'Programmata' | 'Urgente' | 'Emergenza';
}

/* -------------------------------------------------------------------- Cases */

export type ImagingModality =
  | 'Retinografia'
  | 'Fondo oculare'
  | 'Lampada a fessura'
  | 'OCT'
  | 'Topografia corneale'
  | 'Widefield';

export interface CaseLabel {
  x: number;
  y: number;
  text: string;
  detail: string;
}

export interface ClinicalCase {
  id: string;
  title: string;
  pathologyId: string;
  modality: ImagingModality;
  image: { src: string; width: number; height: number; credit: string; license: string; sourceUrl: string };
  patient: { age: number; sex: 'M' | 'F'; eye: 'OD' | 'OS' | 'OU' };
  difficulty: 'Base' | 'Intermedio' | 'Avanzato';
  chiefComplaint: string;
  history: string;
  examination: string[];
  instrumentalReport: string;
  diagnosis: string;
  differential: { name: string; reason: string }[];
  course: string;
  labels: CaseLabel[];
  teachingPoints: string[];
}

/* ------------------------------------------------------------------ Reports */

export type ReportStatus = 'in_corso' | 'completato';

export interface Report {
  id: string;
  patientName: string;
  patientCode: string;
  age: number;
  date: string;
  eye: 'OD' | 'OS' | 'OU';
  visualAcuity: { od: string; os: string };
  iop: { od: string; os: string };
  diagnosis: string;
  notes: string;
  prescription: string;
  followUp: string;
  status: ReportStatus;
  simulation: SimulationSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

export type ReportDraft = Omit<Report, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

/* --------------------------------------------------------------------- Auth */

export type ProfessionalRole = 'Oftalmologo' | 'Optometrista' | 'Ortottista' | 'Specializzando' | 'Studente di Medicina' | 'Paziente';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: ProfessionalRole;
  specialization: string;
  institution: string;
  xp: number;
  casesStudied: string[];
  /** Storico dei quiz completati */
  quizHistory?: QuizResult[];
  createdAt: string;
}

export interface QuizResult {
  date: string;
  category: string;
  score: number;
  total: number;
}

export interface AppUser {
  uid: string;
  email: string;
}
