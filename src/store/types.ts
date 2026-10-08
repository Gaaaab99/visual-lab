/* ======================================================================
 * Modello dati del gestionale per centro ottico
 * ==================================================================== */

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

/* -------------------------------------------------------------- Clienti */

export interface EyeRx {
  /** Sfera (D) */
  sph: number;
  /** Cilindro (D, convenzione negativa) */
  cyl: number;
  /** Asse 0-180 */
  axis: number;
  /** Addizione per vicino (D) */
  add: number;
  /** Prisma (Δ) */
  prism: number;
  /** Base del prisma */
  base: '' | 'IN' | 'OUT' | 'UP' | 'DOWN';
  /** Acuità visiva corretta (es. 10/10) */
  va: string;
}

export type RxKind = 'Lontano' | 'Vicino' | 'Intermedio' | 'Progressivo' | 'Lenti a contatto';
export type RxSource = 'Esame optometrico in negozio' | 'Prescrizione oculista' | 'Lensometria occhiale in uso';

export interface Prescription {
  id: string;
  date: ISODate;
  kind: RxKind;
  source: RxSource;
  examiner: string;
  od: EyeRx;
  os: EyeRx;
  /** Distanza naso-pupillare monoculare (mm) */
  pdOd: number;
  pdOs: number;
  /** Altezza di montaggio (mm), per progressive */
  heightOd?: number;
  heightOs?: number;
  notes: string;
  /** Data consigliata per il prossimo controllo */
  nextCheck?: ISODate;
}

export type ClReplacement = 'Giornaliere' | 'Quindicinali' | 'Mensili' | 'Trimestrali' | 'Annuali' | 'RGP';

export interface ContactLensFit {
  id: string;
  date: ISODate;
  brand: string;
  product: string;
  replacement: ClReplacement;
  od: { power: number; cyl?: number; axis?: number; add?: string; bc: number; dia: number };
  os: { power: number; cyl?: number; axis?: number; add?: string; bc: number; dia: number };
  solution: string;
  /** Scatole consegnate con l’ultima fornitura e data: servono per stimare il riordino */
  lastSupplyDate?: ISODate;
  /** Giorni di copertura dell’ultima fornitura */
  supplyDays?: number;
  notes: string;
}

export interface Consents {
  /** Informativa privacy e trattamento dati personali (GDPR art. 13) */
  privacy: boolean;
  /** Trattamento di dati relativi alla salute (GDPR art. 9) */
  healthData: boolean;
  /** Comunicazioni promozionali */
  marketing: boolean;
  /** Promemoria di servizio (controlli, LAC, ritiro) */
  reminders: boolean;
  /** Opposizione all’invio delle spese al Sistema Tessera Sanitaria */
  stsOpposition: boolean;
  signedAt?: ISODateTime;
}

export type ContactChannel = 'WhatsApp' | 'SMS' | 'Email' | 'Telefono';

export interface Customer {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  sex: 'M' | 'F' | 'X';
  birthDate?: ISODate;
  fiscalCode: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  profession: string;
  /** Abitudini visive: guida, PC, sport… */
  visualNeeds: string[];
  preferredChannel: ContactChannel;
  tags: string[];
  notes: string;
  consents: Consents;
  prescriptions: Prescription[];
  contactLenses: ContactLensFit[];
  loyaltyPoints: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/* -------------------------------------------------------------- Magazzino */

export type ProductCategory = 'Montatura vista' | 'Occhiale da sole' | 'Lenti oftalmiche' | 'Lenti a contatto' | 'Soluzioni e cura' | 'Accessori' | 'Servizi';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  category: ProductCategory;
  brand: string;
  model: string;
  color: string;
  /** Calibro-ponte-asta, es. 52-18-145 */
  size: string;
  material: string;
  supplier: string;
  cost: number;
  price: number;
  /** Aliquota IVA % (configurabile per articolo) */
  vat: number;
  /** Dispositivo medico: spesa sanitaria trasmissibile al Sistema TS (codice AD) */
  medicalDevice: boolean;
  stock: number;
  minStock: number;
  location: string;
  updatedAt: ISODateTime;
}

export interface StockMovement {
  id: string;
  productId: string;
  date: ISODateTime;
  qty: number;
  reason: 'Carico' | 'Vendita' | 'Reso' | 'Rettifica inventario' | 'Busta';
  note: string;
}

/* -------------------------------------------------------------- Buste */

export type OrderStatus = 'preventivo' | 'ordinato' | 'in_lavorazione' | 'pronto' | 'consegnato' | 'annullato';
export type OrderType = 'Occhiale da vista' | 'Occhiale da sole graduato' | 'Lenti a contatto' | 'Solo lenti' | 'Riparazione';
export type LensDesign = 'Monofocale' | 'Progressiva' | 'Office / degressiva' | 'Bifocale' | 'Lenti a contatto' | '—';

export interface OrderLine {
  id: string;
  productId?: string;
  description: string;
  qty: number;
  unitPrice: number;
  vat: number;
  medicalDevice: boolean;
}

export interface OrderEvent {
  date: ISODateTime;
  status: OrderStatus;
  note: string;
}

export interface Order {
  id: string;
  number: string;
  customerId: string;
  type: OrderType;
  status: OrderStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  /** Copia della prescrizione usata per il montaggio */
  rx: Prescription | null;
  frame: { productId?: string; brand: string; model: string; color: string; size: string; ownFrame: boolean };
  lenses: { brand: string; design: LensDesign; index: string; material: string; treatments: string[]; diameter: string };
  centering: { pdOd: number; pdOs: number; heightOd: number; heightOs: number; vertex: number; pantoscopic: number; wrap: number };
  lab: string;
  expectedDate?: ISODate;
  lines: OrderLine[];
  discount: number;
  deposit: number;
  paid: number;
  saleId?: string;
  notes: string;
  history: OrderEvent[];
  /** Numero della dichiarazione di conformità del dispositivo su misura */
  conformityNumber?: string;
}

/* -------------------------------------------------------------- Vendite */

export type PaymentMethod = 'Contanti' | 'Carta' | 'Bancomat' | 'Bonifico' | 'Finanziamento' | 'Buono';
export type FiscalDocType = 'Documento commerciale' | 'Fattura';

export interface Sale {
  id: string;
  number: string;
  date: ISODateTime;
  customerId?: string;
  /** Codice fiscale per la detrazione / Sistema TS */
  fiscalCode: string;
  stsOpposition: boolean;
  docType: FiscalDocType;
  lines: OrderLine[];
  discount: number;
  /** Importo già incassato come acconto (es. sulla busta) */
  depositDeducted: number;
  total: number;
  payment: PaymentMethod;
  orderId?: string;
  notes: string;
}

/* -------------------------------------------------------------- Agenda */

export type AppointmentType = 'Esame della vista' | 'Controllo lenti a contatto' | 'Applicazione LAC' | 'Ritiro occhiali' | 'Riparazione / assistenza' | 'Consulenza montatura' | 'Altro';

export interface Appointment {
  id: string;
  customerId?: string;
  name: string;
  phone: string;
  date: ISODate;
  /** HH:MM */
  time: string;
  duration: number;
  type: AppointmentType;
  operator: string;
  status: 'programmato' | 'confermato' | 'completato' | 'non_presentato' | 'annullato';
  notes: string;
}

/* -------------------------------------------------------------- Negozio */

export interface StoreSettings {
  id: 'settings';
  businessName: string;
  vatNumber: string;
  fiscalCode: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  /** Ottico abilitato responsabile tecnico */
  optician: string;
  opticianRegistration: string;
  /** Numero di registrazione come fabbricante di dispositivi su misura (Ministero della Salute) */
  manufacturerRegistration: string;
  /** Prefisso numerazione buste */
  orderPrefix: string;
  defaultLab: string;
  openingHours: string;
  messageSignature: string;
  loyaltyEuroPerPoint: number;
}

export type StoreCollection = 'customers' | 'products' | 'movements' | 'orders' | 'sales' | 'appointments' | 'store';
