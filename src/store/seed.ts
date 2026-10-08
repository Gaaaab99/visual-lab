import type { Appointment, Customer, EyeRx, Order, OrderLine, Prescription, Product, ProductCategory, Sale, StockMovement, StoreSettings } from './types';
import { DEFAULT_VAT, IS_MEDICAL_DEVICE, newId } from './utils';
import { DEFAULT_SETTINGS } from './StoreContext';

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const dt = (offset: number, h = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, 15, 0, 0);
  return d.toISOString();
};

const eye = (sph: number, cyl = 0, axis = 0, add = 0, va = '10/10'): EyeRx => ({ sph, cyl, axis, add, prism: 0, base: '', va });

function rx(date: string, kind: Prescription['kind'], od: EyeRx, os: EyeRx, pd: [number, number], extra: Partial<Prescription> = {}): Prescription {
  return {
    id: newId(),
    date,
    kind,
    source: 'Esame optometrico in negozio',
    examiner: 'Dott. Luca Marchetti, optometrista',
    od,
    os,
    pdOd: pd[0],
    pdOs: pd[1],
    notes: '',
    nextCheck: undefined,
    ...extra,
  };
}

const consents = (marketing = true, sts = false) => ({ privacy: true, healthData: true, marketing, reminders: true, stsOpposition: sts, signedAt: dt(-200) });

function product(category: ProductCategory, brand: string, model: string, price: number, stock: number, extra: Partial<Product> = {}): Product {
  return {
    id: newId(),
    sku: `${category.slice(0, 3).toUpperCase()}-${brand.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    barcode: String(8000000000000 + Math.floor(Math.random() * 999999999)),
    category,
    brand,
    model,
    color: '',
    size: '',
    material: '',
    supplier: brand,
    cost: Math.round(price * 0.45 * 100) / 100,
    price,
    vat: DEFAULT_VAT[category],
    medicalDevice: IS_MEDICAL_DEVICE[category],
    stock,
    minStock: category === 'Lenti a contatto' || category === 'Soluzioni e cura' ? 6 : 1,
    location: '',
    updatedAt: dt(-10),
    ...extra,
  };
}

const line = (description: string, unitPrice: number, vat: number, medicalDevice: boolean, productId?: string, qty = 1): OrderLine => ({
  id: newId(),
  productId,
  description,
  qty,
  unitPrice,
  vat,
  medicalDevice,
});

export function buildSeed() {
  /* ---------------------------------------------------------- magazzino */
  const products: Product[] = [
    product('Montatura vista', 'Ray-Ban', 'RX5154 Clubmaster', 149, 3, { color: 'Nero/Oro', size: '51-21-145', material: 'Acetato/metallo' }),
    product('Montatura vista', 'Ray-Ban', 'RX7047', 119, 2, { color: 'Avana', size: '54-17-145', material: 'Propionato' }),
    product('Montatura vista', 'Persol', 'PO3007V', 210, 1, { color: 'Tortoise', size: '50-19-145', material: 'Acetato' }),
    product('Montatura vista', 'Oakley', 'OX8046 Airdrop', 165, 2, { color: 'Satin Black', size: '55-18-143', material: 'O Matter' }),
    product('Montatura vista', 'Silhouette', 'Momentum 5529', 345, 1, { color: 'Titanio', size: '52-17-140', material: 'Titanio (glasant)' }),
    product('Montatura vista', 'Lindberg', 'Strip 9704', 520, 0, { color: 'Argento', size: '50-19-135', material: 'Titanio' }),
    product('Montatura vista', 'Vogue', 'VO5286', 99, 4, { color: 'Rosa trasparente', size: '52-17-140', material: 'Acetato' }),
    product('Montatura vista', 'Kids Line', 'K-Flex 210', 69, 5, { color: 'Blu', size: '45-16-125', material: 'TR90' }),
    product('Occhiale da sole', 'Ray-Ban', 'RB3025 Aviator', 169, 4, { color: 'Oro / G-15', size: '58-14-135' }),
    product('Occhiale da sole', 'Persol', 'PO0649', 245, 1, { color: 'Havana / Marrone polarizzato', size: '54-20-140' }),
    product('Occhiale da sole', 'Oakley', 'Holbrook OO9102', 159, 2, { color: 'Matte Black / Prizm', size: '55-18-137' }),
    product('Lenti oftalmiche', 'Essilor', 'Eyezen 1.6 Crizal Sapphire (coppia)', 280, 0, { minStock: 0 }),
    product('Lenti oftalmiche', 'Essilor', 'Varilux XR 1.67 Crizal Prevencia (coppia)', 890, 0, { minStock: 0 }),
    product('Lenti oftalmiche', 'Zeiss', 'SmartLife Individual 1.6 DuraVision (coppia)', 760, 0, { minStock: 0 }),
    product('Lenti oftalmiche', 'Hoya', 'Nulux 1.5 Hi-Vision (coppia)', 140, 0, { minStock: 0 }),
    product('Lenti a contatto', 'Johnson & Johnson', 'Acuvue Oasys 1-Day (90)', 72, 14, { size: 'BC 8.5 DIA 14.3' }),
    product('Lenti a contatto', 'Alcon', 'Dailies Total1 (90)', 85, 4, { size: 'BC 8.5 DIA 14.1' }),
    product('Lenti a contatto', 'CooperVision', 'Biofinity (6)', 39, 9, { size: 'BC 8.6 DIA 14.0' }),
    product('Lenti a contatto', 'Bausch + Lomb', 'Ultra for Astigmatism (6)', 45, 3, { size: 'BC 8.6 DIA 14.5' }),
    product('Soluzioni e cura', 'Alcon', 'Opti-Free PureMoist 300 ml', 14.9, 18),
    product('Soluzioni e cura', 'Bausch + Lomb', 'Biotrue 300 ml', 12.5, 4),
    product('Soluzioni e cura', 'Thea', 'Thealoz Duo collirio', 16.9, 7),
    product('Accessori', 'Visual Lab', 'Astuccio rigido', 12, 25),
    product('Accessori', 'Visual Lab', 'Panno microfibra + spray', 6, 40),
    product('Accessori', 'Chums', 'Cordino sportivo', 9.5, 2, { minStock: 3 }),
    product('Servizi', 'Visual Lab', 'Esame della vista completo', 35, 999, { minStock: 0, vat: 22 }),
    product('Servizi', 'Visual Lab', 'Applicazione lenti a contatto', 50, 999, { minStock: 0, vat: 22 }),
  ];
  const P = (model: string) => products.find((p) => p.model.startsWith(model))!;

  /* ---------------------------------------------------------- clienti */
  const mk = (c: Partial<Customer> & Pick<Customer, 'firstName' | 'lastName'>, i: number): Customer => ({
    id: newId(),
    code: `C${String(1000 + i)}`,
    sex: 'F',
    fiscalCode: '',
    phone: '',
    email: '',
    address: '',
    city: 'Milano',
    zip: '20100',
    profession: '',
    visualNeeds: [],
    preferredChannel: 'WhatsApp',
    tags: [],
    notes: '',
    consents: consents(),
    prescriptions: [],
    contactLenses: [],
    loyaltyPoints: 0,
    createdAt: dt(-400 + i * 20),
    updatedAt: dt(-5),
    ...c,
  });

  const customers: Customer[] = [
    mk(
      {
        firstName: 'Mario',
        lastName: 'Rossi',
        sex: 'M',
        birthDate: '1955-03-12',
        fiscalCode: 'RSSMRA55C12F205G',
        phone: '+39 333 1234567',
        email: 'mario.rossi@example.com',
        address: 'Via Garibaldi 12',
        profession: 'Pensionato',
        visualNeeds: ['Lettura', 'Guida notturna', 'Televisione'],
        tags: ['Progressive', 'Glaucoma'],
        notes: 'In terapia con latanoprost. Preferisce montature leggere.',
        loyaltyPoints: 420,
        prescriptions: [
          rx(day(-420), 'Progressivo', eye(1.25, -0.5, 90, 2.25, '9/10'), eye(1.5, -0.75, 85, 2.25, '9/10'), [32, 31.5], { heightOd: 22, heightOs: 22 }),
          rx(day(-30), 'Progressivo', eye(1.5, -0.5, 90, 2.5, '8/10'), eye(1.75, -0.75, 80, 2.5, '9/10'), [32, 31.5], {
            heightOd: 21,
            heightOs: 21,
            notes: 'Lieve opacità del cristallino OD: consigliata visita oculistica.',
            nextCheck: day(335),
          }),
        ],
      },
      1,
    ),
    mk(
      {
        firstName: 'Giulia',
        lastName: 'Bianchi',
        birthDate: '1992-07-21',
        fiscalCode: 'BNCGLI92L61F205O',
        phone: '+39 347 9876543',
        email: 'giulia.b@example.com',
        address: 'Corso Buenos Aires 45',
        profession: 'Grafica',
        visualNeeds: ['PC', 'Sport'],
        tags: ['LAC', 'Miopia'],
        preferredChannel: 'Email',
        loyaltyPoints: 260,
        prescriptions: [rx(day(-200), 'Lontano', eye(-3.25, -0.5, 175), eye(-3.0, -0.25, 10), [31, 31], { nextCheck: day(165) })],
        contactLenses: [
          {
            id: newId(),
            date: day(-200),
            brand: 'Johnson & Johnson',
            product: 'Acuvue Oasys 1-Day',
            replacement: 'Giornaliere',
            od: { power: -3.0, bc: 8.5, dia: 14.3 },
            os: { power: -2.75, bc: 8.5, dia: 14.3 },
            solution: '—',
            lastSupplyDate: day(-82),
            supplyDays: 90,
            notes: 'Buona centratura, movimento 0,3 mm.',
          },
        ],
      },
      2,
    ),
    mk(
      {
        firstName: 'Luca',
        lastName: 'Ferrari',
        sex: 'M',
        birthDate: '2015-11-02',
        fiscalCode: 'FRRLCU15S02F205P',
        phone: '+39 340 5551122',
        email: 'famiglia.ferrari@example.com',
        address: 'Via Padova 210',
        profession: 'Studente (scuola primaria)',
        visualNeeds: ['Scuola', 'Sport'],
        tags: ['Bambino', 'Controllo miopia'],
        notes: 'Genitori miopi. Valutare lenti per il controllo della miopia.',
        prescriptions: [
          rx(day(-365), 'Lontano', eye(-0.75), eye(-0.75), [27, 27]),
          rx(day(-12), 'Lontano', eye(-1.5, -0.25, 180), eye(-1.25), [27.5, 27.5], { notes: 'Progressione −0,75 D/anno: proposte lenti a defocus periferico.', nextCheck: day(170) }),
        ],
      },
      3,
    ),
    mk(
      {
        firstName: 'Anna',
        lastName: 'Colombo',
        birthDate: '1968-01-30',
        fiscalCode: 'CLMNNA68A70F205S',
        phone: '+39 328 4445566',
        email: 'anna.colombo@example.com',
        address: 'Viale Monza 88',
        profession: 'Insegnante',
        visualNeeds: ['Lettura', 'PC', 'Guida'],
        tags: ['Progressive'],
        consents: consents(false),
        loyaltyPoints: 180,
        prescriptions: [rx(day(-10), 'Progressivo', eye(-0.5, -0.75, 15, 2.0), eye(-0.25, -0.5, 170, 2.0), [30.5, 30], { heightOd: 20, heightOs: 20, nextCheck: day(355) })],
      },
      4,
    ),
    mk(
      {
        firstName: 'Paolo',
        lastName: 'Ricci',
        sex: 'M',
        birthDate: '1980-09-14',
        fiscalCode: 'RCCPLA80P14F205L',
        phone: '+39 339 7778899',
        email: '',
        address: 'Via Torino 3',
        profession: 'Autista',
        visualNeeds: ['Guida notturna', 'Sole'],
        tags: ['Astigmatismo'],
        preferredChannel: 'Telefono',
        prescriptions: [rx(day(-700), 'Lontano', eye(0.25, -1.75, 10), eye(0.5, -2.0, 170), [33, 33], { nextCheck: day(-335) })],
      },
      5,
    ),
    mk(
      {
        firstName: 'Sofia',
        lastName: 'Esposito',
        birthDate: '1999-04-05',
        fiscalCode: 'SPSSFO99D45F205F',
        phone: '+39 366 1112233',
        email: 'sofia.esposito@example.com',
        address: 'Via Tortona 19',
        profession: 'Studentessa universitaria',
        visualNeeds: ['PC', 'Lettura'],
        tags: ['LAC', 'Astigmatismo'],
        consents: consents(true, true),
        prescriptions: [rx(day(-150), 'Lontano', eye(-2.0, -1.25, 180), eye(-2.25, -1.0, 5), [30, 30], { nextCheck: day(215) })],
        contactLenses: [
          {
            id: newId(),
            date: day(-150),
            brand: 'Bausch + Lomb',
            product: 'Ultra for Astigmatism',
            replacement: 'Mensili',
            od: { power: -1.75, cyl: -1.25, axis: 180, bc: 8.6, dia: 14.5 },
            os: { power: -2.0, cyl: -0.75, axis: 10, bc: 8.6, dia: 14.5 },
            solution: 'Biotrue 300 ml',
            lastSupplyDate: day(-170),
            supplyDays: 180,
            notes: 'Rotazione stabile, asse marker a 6 ore.',
          },
        ],
      },
      6,
    ),
  ];
  const [rossi, bianchi, ferrari, colombo, , esposito] = customers;

  /* ---------------------------------------------------------- buste */
  const baseOrder = (o: Partial<Order> & Pick<Order, 'number' | 'customerId' | 'status'>): Order => ({
    id: newId(),
    type: 'Occhiale da vista',
    createdAt: dt(-5),
    updatedAt: dt(-1),
    rx: null,
    frame: { brand: '', model: '', color: '', size: '', ownFrame: false },
    lenses: { brand: '', design: 'Monofocale', index: '1.5', material: 'Organico', treatments: [], diameter: '' },
    centering: { pdOd: 0, pdOs: 0, heightOd: 0, heightOs: 0, vertex: 12, pantoscopic: 8, wrap: 5 },
    lab: 'Essilor Italia',
    lines: [],
    discount: 0,
    deposit: 0,
    paid: 0,
    notes: '',
    history: [],
    ...o,
  });

  const silh = P('Momentum');
  const rb = P('RX7047');
  const kids = P('K-Flex');
  const orders: Order[] = [
    baseOrder({
      number: `B-${new Date().getFullYear()}-0012`,
      customerId: rossi.id,
      status: 'in_lavorazione',
      createdAt: dt(-6),
      rx: rossi.prescriptions[1],
      frame: { productId: silh.id, brand: silh.brand, model: silh.model, color: silh.color, size: silh.size, ownFrame: false },
      lenses: { brand: 'Essilor', design: 'Progressiva', index: '1.67', material: 'Organico', treatments: ['Antiriflesso Crizal Prevencia', 'Filtro luce blu', 'Indurente'], diameter: '70' },
      centering: { pdOd: 32, pdOs: 31.5, heightOd: 21, heightOs: 21, vertex: 12, pantoscopic: 9, wrap: 4 },
      lab: 'Essilor Italia',
      expectedDate: day(3),
      lines: [line(`Montatura ${silh.brand} ${silh.model}`, silh.price, 4, true, silh.id), line('Lenti Varilux XR 1.67 Crizal Prevencia (coppia)', 890, 4, true)],
      discount: 85,
      deposit: 400,
      history: [
        { date: dt(-6), status: 'preventivo', note: 'Preventivo accettato' },
        { date: dt(-6, 11), status: 'ordinato', note: 'Lenti ordinate a Essilor' },
        { date: dt(-2), status: 'in_lavorazione', note: 'Lenti arrivate, in montaggio' },
      ],
    }),
    baseOrder({
      number: `B-${new Date().getFullYear()}-0013`,
      customerId: ferrari.id,
      status: 'pronto',
      createdAt: dt(-9),
      rx: ferrari.prescriptions[1],
      frame: { productId: kids.id, brand: kids.brand, model: kids.model, color: kids.color, size: kids.size, ownFrame: false },
      lenses: { brand: 'Hoya', design: 'Monofocale', index: '1.59', material: 'Policarbonato', treatments: ['Defocus periferico (controllo miopia)', 'Antiriflesso'], diameter: '65' },
      centering: { pdOd: 27.5, pdOs: 27.5, heightOd: 0, heightOs: 0, vertex: 12, pantoscopic: 8, wrap: 3 },
      lab: 'Hoya Lens Italia',
      expectedDate: day(-1),
      lines: [line(`Montatura ${kids.brand} ${kids.model}`, kids.price, 4, true, kids.id), line('Lenti MiyoSmart 1.59 (coppia)', 390, 4, true)],
      deposit: 150,
      history: [
        { date: dt(-9), status: 'ordinato', note: '' },
        { date: dt(-4), status: 'in_lavorazione', note: '' },
        { date: dt(-1), status: 'pronto', note: 'Controllo finale centraggio OK' },
      ],
    }),
    baseOrder({
      number: `B-${new Date().getFullYear()}-0014`,
      customerId: colombo.id,
      status: 'ordinato',
      createdAt: dt(-2),
      rx: colombo.prescriptions[0],
      frame: { productId: rb.id, brand: rb.brand, model: rb.model, color: rb.color, size: rb.size, ownFrame: false },
      lenses: { brand: 'Zeiss', design: 'Progressiva', index: '1.6', material: 'Organico', treatments: ['DuraVision Platinum', 'BlueGuard'], diameter: '70' },
      centering: { pdOd: 30.5, pdOs: 30, heightOd: 20, heightOs: 20, vertex: 13, pantoscopic: 8, wrap: 5 },
      lab: 'Zeiss Vision Care',
      expectedDate: day(6),
      lines: [line(`Montatura ${rb.brand} ${rb.model}`, rb.price, 4, true, rb.id), line('Lenti SmartLife Individual 1.6 DuraVision (coppia)', 760, 4, true)],
      discount: 50,
      deposit: 300,
      history: [{ date: dt(-2), status: 'ordinato', note: '' }],
    }),
    baseOrder({
      number: `B-${new Date().getFullYear()}-0015`,
      customerId: bianchi.id,
      status: 'preventivo',
      type: 'Lenti a contatto',
      createdAt: dt(-1),
      lenses: { brand: 'Johnson & Johnson', design: 'Lenti a contatto', index: '—', material: 'Silicone hydrogel', treatments: [], diameter: '14.3' },
      lab: 'Johnson & Johnson Vision',
      lines: [line('Acuvue Oasys 1-Day (90) OD', 72, 4, true), line('Acuvue Oasys 1-Day (90) OS', 72, 4, true)],
      history: [{ date: dt(-1), status: 'preventivo', note: 'Riordino semestrale' }],
    }),
    baseOrder({
      number: `B-${new Date().getFullYear()}-0016`,
      customerId: customers[4].id,
      status: 'pronto',
      type: 'Riparazione',
      createdAt: dt(-3),
      frame: { brand: 'Persol', model: 'PO0714 (del cliente)', color: 'Havana', size: '', ownFrame: true },
      lab: 'Laboratorio interno',
      lines: [line('Sostituzione cerniera e regolazione', 25, 22, false)],
      history: [
        { date: dt(-3), status: 'in_lavorazione', note: 'Cerniera rotta asta sinistra' },
        { date: dt(0, 9), status: 'pronto', note: '' },
      ],
    }),
  ];

  /* ---------------------------------------------------------- vendite */
  const sales: Sale[] = [];
  const pool: [string, number, number, boolean][] = [
    ['Esame della vista completo', 35, 22, false],
    ['Acuvue Oasys 1-Day (90)', 72, 4, true],
    ['Opti-Free PureMoist 300 ml', 14.9, 22, true],
    ['Occhiale da sole Ray-Ban RB3025', 169, 22, false],
    ['Occhiale completo monofocale', 249, 4, true],
    ['Occhiale completo progressivo', 690, 4, true],
    ['Biofinity (6)', 39, 4, true],
    ['Astuccio rigido', 12, 22, false],
  ];
  const payments: Sale['payment'][] = ['Carta', 'Bancomat', 'Contanti', 'Carta', 'Bonifico'];
  let n = 1;
  for (let d = -170; d <= 0; d += 3) {
    const count = 1 + ((d * 7) % 3 === 0 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const idx = Math.abs((d * 13 + k * 5) % pool.length);
      const [desc, price, vat, md] = pool[idx];
      const cust = customers[Math.abs((d + k) % customers.length)];
      const withCustomer = md && idx % 2 === 0;
      const qty = desc.includes('(90)') || desc.includes('(6)') ? 2 : 1;
      sales.push({
        id: newId(),
        number: `DC-${String(n++).padStart(5, '0')}`,
        date: dt(d, 10 + k * 3),
        customerId: withCustomer ? cust.id : undefined,
        fiscalCode: withCustomer ? cust.fiscalCode : '',
        stsOpposition: withCustomer ? cust.consents.stsOpposition : false,
        docType: 'Documento commerciale',
        lines: [line(desc, price, vat, md, undefined, qty)],
        discount: 0,
        depositDeducted: 0,
        total: price * qty,
        payment: payments[Math.abs(d + k) % payments.length],
        notes: '',
      });
    }
  }
  // acconti delle buste aperte
  for (const o of orders.filter((x) => x.deposit > 0)) {
    const c = customers.find((x) => x.id === o.customerId)!;
    sales.push({
      id: newId(),
      number: `DC-${String(n++).padStart(5, '0')}`,
      date: o.createdAt,
      customerId: c.id,
      fiscalCode: c.fiscalCode,
      stsOpposition: c.consents.stsOpposition,
      docType: 'Documento commerciale',
      lines: [line(`Acconto busta ${o.number}`, o.deposit, 4, true)],
      discount: 0,
      depositDeducted: 0,
      total: o.deposit,
      payment: 'Carta',
      orderId: o.id,
      notes: 'Acconto',
    });
  }

  /* ---------------------------------------------------------- agenda */
  const appointments: Appointment[] = [
    { id: newId(), customerId: esposito.id, name: 'Sofia Esposito', phone: esposito.phone, date: day(0), time: '10:00', duration: 30, type: 'Controllo lenti a contatto', operator: 'Luca', status: 'confermato', notes: '' },
    { id: newId(), customerId: ferrari.id, name: 'Luca Ferrari', phone: ferrari.phone, date: day(0), time: '16:30', duration: 15, type: 'Ritiro occhiali', operator: 'Chiara', status: 'programmato', notes: 'Spiegare uso lenti per controllo miopia' },
    { id: newId(), name: 'Marco Gallo', phone: '+39 345 0001122', date: day(1), time: '09:30', duration: 45, type: 'Esame della vista', operator: 'Luca', status: 'programmato', notes: 'Nuovo cliente' },
    { id: newId(), customerId: colombo.id, name: 'Anna Colombo', phone: colombo.phone, date: day(2), time: '11:00', duration: 30, type: 'Consulenza montatura', operator: 'Chiara', status: 'confermato', notes: '' },
    { id: newId(), customerId: rossi.id, name: 'Mario Rossi', phone: rossi.phone, date: day(4), time: '17:00', duration: 20, type: 'Ritiro occhiali', operator: 'Chiara', status: 'programmato', notes: '' },
    { id: newId(), customerId: bianchi.id, name: 'Giulia Bianchi', phone: bianchi.phone, date: day(-3), time: '18:00', duration: 30, type: 'Controllo lenti a contatto', operator: 'Luca', status: 'completato', notes: '' },
  ];

  const movements: StockMovement[] = products
    .filter((p) => p.category !== 'Servizi')
    .map((p) => ({ id: newId(), productId: p.id, date: dt(-60), qty: p.stock, reason: 'Carico' as const, note: 'Inventario iniziale' }));

  const settings: StoreSettings = {
    ...DEFAULT_SETTINGS,
    businessName: 'Ottica Visual Lab s.r.l.',
    vatNumber: '12345678901',
    fiscalCode: '12345678901',
    address: 'Corso Venezia 21',
    city: '20121 Milano (MI)',
    phone: '+39 02 1234567',
    email: 'info@otticavisuallab.it',
    website: 'www.otticavisuallab.it',
    optician: 'Dott.ssa Chiara Conti, ottico-optometrista',
    opticianRegistration: 'Abilitazione arte ausiliaria di ottico n. 1234/MI',
    manufacturerRegistration: 'ITCA01234567',
    defaultLab: 'Essilor Italia',
    messageSignature: 'Ottica Visual Lab · 02 1234567',
  };

  return { data: { customers, products, movements, orders, sales, appointments }, settings };
}
