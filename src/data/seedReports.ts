import type { Report } from '../types';
import { DEFAULT_PARAMS } from '../features/simulator/conditions';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export function seedReports(): Report[] {
  return [
    {
      id: 'seed-1',
      patientName: 'Mario Rossi',
      patientCode: 'VL-2026-0142',
      age: 71,
      date: daysAgo(2).slice(0, 10),
      eye: 'OU',
      visualAcuity: { od: '4/10', os: '6/10' },
      iop: { od: '24', os: '21' },
      diagnosis: 'Cataratta nucleare OU + glaucoma cronico ad angolo aperto',
      notes: 'Riferisce abbagliamento notturno. Escavazione C/D 0,7 OD. Campo visivo con scalino nasale OD.',
      prescription: 'Latanoprost 0,005% 1 gtt/sera OU. Programmare facoemulsificazione OD.',
      followUp: 'Controllo IOP a 4 settimane, campo visivo a 3 mesi',
      status: 'in_corso',
      simulation: {
        conditions: [
          { id: 'cataract', name: 'Cataratta', severity: 60 },
          { id: 'glaucoma', name: 'Glaucoma', severity: 45 },
        ],
        params: { ...DEFAULT_PARAMS },
        source: 'Guida notturna',
        summary: 'Cataratta moderata (60%); Glaucoma moderata (45%)',
        capturedAt: daysAgo(2),
      },
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: 'seed-2',
      patientName: 'Lucia Bianchi',
      patientCode: 'VL-2026-0098',
      age: 78,
      date: daysAgo(9).slice(0, 10),
      eye: 'OS',
      visualAcuity: { od: '8/10', os: '2/10' },
      iop: { od: '15', os: '16' },
      diagnosis: 'AMD neovascolare OS',
      notes: 'Metamorfopsie all’Amsler. OCT: fluido sottoretinico e intraretinico, PED fibrovascolare.',
      prescription: 'Aflibercept 2 mg intravitreale OS, 3 dosi di carico mensili.',
      followUp: 'OCT prima di ogni iniezione',
      status: 'completato',
      simulation: {
        conditions: [{ id: 'amd', name: 'Degenerazione maculare (AMD)', severity: 75 }],
        params: { ...DEFAULT_PARAMS },
        source: 'Griglia di Amsler',
        summary: 'Degenerazione maculare (AMD) grave (75%)',
        capturedAt: daysAgo(9),
      },
      createdAt: daysAgo(9),
      updatedAt: daysAgo(8),
    },
    {
      id: 'seed-3',
      patientName: 'Giorgio Verdi',
      patientCode: 'VL-2026-0171',
      age: 23,
      date: daysAgo(15).slice(0, 10),
      eye: 'OD',
      visualAcuity: { od: '6/10', os: '10/10' },
      iop: { od: '13', os: '14' },
      diagnosis: 'Cheratocono evolutivo OD',
      notes: 'Kmax 55,1 D (+1,2 D in 6 mesi). Pachimetria minima 448 µm.',
      prescription: 'Cross-linking corneale epi-off OD. Sospendere lo sfregamento oculare.',
      followUp: 'Topografia a 6 mesi dal CXL',
      status: 'completato',
      simulation: null,
      createdAt: daysAgo(15),
      updatedAt: daysAgo(15),
    },
  ];
}
