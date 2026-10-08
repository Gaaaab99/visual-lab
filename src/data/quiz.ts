import type { PathologyCategory } from '../types';

export type QuizCategory = PathologyCategory | 'Farmacologia' | 'Semeiotica';
export type QuizDifficulty = 'Base' | 'Intermedio' | 'Avanzato';

export const QUIZ_CATEGORIES: QuizCategory[] = [
  'Retina',
  'Nervo Ottico',
  'Cornea',
  'Mezzi Diottrici',
  'Vizi di Refrazione',
  'Uvea',
  'Farmacologia',
  'Semeiotica',
];

export const QUIZ_DIFFICULTIES: QuizDifficulty[] = ['Base', 'Intermedio', 'Avanzato'];

/**
 * Domanda a scelta multipla. La risposta corretta è in `answer`, le tre alternative errate in
 * `distractors`: l'ordine di presentazione viene rimescolato a runtime con un seed di sessione.
 */
export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  prompt: string;
  answer: string;
  distractors: readonly [string, string, string];
  explanation: string;
  /** Scheda dell'archivio da approfondire (id di src/data/pathologies.ts) */
  pathologyId?: string;
  /** Caso clinico la cui immagine accompagna la domanda (id di src/data/cases.ts) */
  caseId?: string;
}

export const QUESTIONS: QuizQuestion[] = [
  /* ------------------------------------------------------------- Immagini */
  {
    id: 'img-glaucoma',
    category: 'Nervo Ottico',
    difficulty: 'Intermedio',
    caseId: 'case-glaucoma',
    pathologyId: 'glaucoma',
    prompt: 'Quale reperto caratterizza la papilla ottica mostrata nell’immagine?',
    answer: 'Escavazione ampliata con assottigliamento della rima neuroretinica',
    distractors: ['Papilla edematosa a margini sfumati', 'Neovasi sulla superficie papillare (NVD)', 'Drusen calcifiche della testa del nervo ottico'],
    explanation:
      'Il rapporto cup/disc aumentato, con rima neuroretinica sottile e vasi dislocati nasalmente, è il segno cardine della neuropatia ottica glaucomatosa.',
  },
  {
    id: 'img-keratoconus',
    category: 'Cornea',
    difficulty: 'Intermedio',
    caseId: 'case-keratoconus',
    pathologyId: 'cheratocono',
    prompt: 'La mappa topografica mostrata è suggestiva di:',
    answer: 'Cheratocono, con area di incurvamento focale e asimmetrico',
    distractors: [
      'Astigmatismo regolare con pattern a clessidra simmetrico',
      'Cornea dopo LASIK miopica, con appiattimento centrale',
      'Cornea normale (topografia sferica)',
    ],
    explanation:
      'Nel cheratocono la topografia mostra un’area localizzata di curvatura elevata, spesso inferiore e asimmetrica, con assi irregolari (pattern “a cravatta asimmetrica”).',
  },
  {
    id: 'img-rd',
    category: 'Retina',
    difficulty: 'Base',
    caseId: 'case-rd',
    pathologyId: 'distacco-retina',
    prompt: 'Quale diagnosi è più compatibile con il quadro widefield mostrato?',
    answer: 'Distacco di retina regmatogeno',
    distractors: ['Retinoschisi senile', 'Corioretinopatia sierosa centrale', 'Melanoma della coroide'],
    explanation:
      'La retina appare sollevata, grigiastra e ondulata, con perdita del normale riflesso coroideale: è il quadro tipico del distacco regmatogeno, secondario a una rottura retinica.',
  },
  {
    id: 'img-cataract',
    category: 'Mezzi Diottrici',
    difficulty: 'Base',
    caseId: 'case-cataract',
    pathologyId: 'cataratta',
    prompt: 'Nella foto alla lampada a fessura, quale struttura appare opacizzata?',
    answer: 'Il cristallino',
    distractors: ['La cornea', 'Il corpo vitreo', 'L’umor acqueo della camera anteriore'],
    explanation:
      'L’opacità biancastra visibile dietro l’iride, nell’area pupillare, interessa il cristallino: è una cataratta. La cornea antistante rimane trasparente.',
  },
  {
    id: 'img-dr',
    category: 'Retina',
    difficulty: 'Intermedio',
    caseId: 'case-dr',
    pathologyId: 'retinopatia-diabetica',
    prompt: 'Le numerose cicatrici rotondeggianti e pigmentate in media periferia rappresentano:',
    answer: 'Esiti di fotocoagulazione laser panretinica (PRP)',
    distractors: ['Spicole ossee da retinite pigmentosa', 'Drusen periferiche', 'Nevi coroideali multipli'],
    explanation:
      'Gli spot regolari, distribuiti a griglia e risparmiando la macula, sono gli esiti della PRP, trattamento di riferimento della retinopatia diabetica proliferante.',
  },
  {
    id: 'img-amd',
    category: 'Retina',
    difficulty: 'Intermedio',
    caseId: 'case-amd',
    pathologyId: 'amd',
    prompt: 'Le lesioni giallastre rotondeggianti al polo posteriore sono:',
    answer: 'Drusen',
    distractors: ['Essudati duri', 'Noduli cotonosi (cotton wool spots)', 'Macchie di Roth'],
    explanation:
      'Le drusen sono depositi extracellulari tra epitelio pigmentato e membrana di Bruch; drusen ampie (≥125 µm) definiscono la DMLE intermedia secondo la classificazione AREDS.',
  },
  {
    id: 'img-cme',
    category: 'Retina',
    difficulty: 'Intermedio',
    caseId: 'case-cme',
    pathologyId: 'edema-maculare',
    prompt: 'Quale reperto è evidente nella scansione OCT?',
    answer: 'Spazi cistici iporiflettenti intraretinici con aumento dello spessore foveale',
    distractors: ['Foro maculare a tutto spessore', 'Distacco dell’epitelio pigmentato da neovascolarizzazione tipo 1', 'Atrofia geografica con ipertrasmissione'],
    explanation:
      'Le cavità iporiflettenti negli strati nucleare interno e plessiforme esterno, con perdita della depressione foveale, sono il segno OCT dell’edema maculare cistoide.',
  },
  {
    id: 'img-rp',
    category: 'Retina',
    difficulty: 'Base',
    caseId: 'case-rp',
    pathologyId: 'retinite-pigmentosa',
    prompt: 'Il pigmento a “spicole ossee” in media periferia è tipico di:',
    answer: 'Retinite pigmentosa',
    distractors: ['Retinopatia diabetica', 'Degenerazione maculare legata all’età', 'Corioretinite da toxoplasma'],
    explanation:
      'La migrazione perivascolare del pigmento dall’EPR, con aspetto a spicole ossee, fa parte della triade classica della retinite pigmentosa insieme al pallore papillare e all’assottigliamento vasale.',
  },
  {
    id: 'img-hypopyon',
    category: 'Uvea',
    difficulty: 'Base',
    caseId: 'case-hypopyon',
    pathologyId: 'uveite',
    prompt: 'Il livello biancastro declive in camera anteriore si chiama:',
    answer: 'Ipopion',
    distractors: ['Ifema', 'Arco senile', 'Precipitati cheratici'],
    explanation:
      'L’ipopion è una raccolta di leucociti sedimentati in camera anteriore; si osserva in uveiti anteriori severe (es. HLA-B27, Behçet) e nelle endoftalmiti. L’ifema è invece sangue.',
  },
  {
    id: 'img-on',
    category: 'Nervo Ottico',
    difficulty: 'Avanzato',
    caseId: 'case-on',
    pathologyId: 'neurite-ottica',
    prompt:
      'Giovane donna con calo visivo monolaterale, dolore ai movimenti oculari e la papilla mostrata. Diagnosi più probabile?',
    answer: 'Neurite ottica anteriore (papillite)',
    distractors: [
      'Papilledema da ipertensione endocranica',
      'Neuropatia ottica ischemica anteriore arteritica',
      'Neuropatia ottica glaucomatosa',
    ],
    explanation:
      'Edema papillare monolaterale con dolore ai movimenti oculari in una giovane donna indica una papillite. Il papilledema è tipicamente bilaterale con visione conservata; la NOIA arteritica colpisce soggetti anziani.',
  },

  /* ---------------------------------------------------------------- Retina */
  {
    id: 'ret-amd-antivegf',
    category: 'Retina',
    difficulty: 'Base',
    pathologyId: 'amd',
    prompt: 'Qual è il trattamento di prima linea della DMLE neovascolare (essudativa)?',
    answer: 'Iniezioni intravitreali di farmaci anti-VEGF',
    distractors: ['Fotocoagulazione laser panretinica', 'Vitrectomia via pars plana', 'Integratori AREDS2 come unica terapia'],
    explanation:
      'Gli anti-VEGF (aflibercept, ranibizumab, faricimab, brolucizumab) inibiscono la neovascolarizzazione coroideale e sono lo standard di cura della forma essudativa.',
  },
  {
    id: 'ret-areds2',
    category: 'Retina',
    difficulty: 'Intermedio',
    pathologyId: 'amd',
    prompt: 'Nella formulazione AREDS2 il beta-carotene è stato sostituito da:',
    answer: 'Luteina e zeaxantina',
    distractors: ['Acidi grassi omega-3', 'Vitamina A', 'Selenio e coenzima Q10'],
    explanation:
      'Il beta-carotene aumentava il rischio di carcinoma polmonare nei fumatori; luteina e zeaxantina si sono dimostrate efficaci e più sicure.',
  },
  {
    id: 'ret-pdr',
    category: 'Retina',
    difficulty: 'Base',
    pathologyId: 'retinopatia-diabetica',
    prompt: 'Quale reperto definisce la retinopatia diabetica proliferante?',
    answer: 'Neovasi sulla papilla o altrove (NVD/NVE)',
    distractors: ['Microaneurismi', 'Essudati duri', 'Emorragie intraretiniche puntiformi'],
    explanation:
      'La presenza di neovascolarizzazione distingue la forma proliferante; microaneurismi, essudati ed emorragie sono propri della forma non proliferante.',
  },
  {
    id: 'ret-421',
    category: 'Retina',
    difficulty: 'Avanzato',
    pathologyId: 'retinopatia-diabetica',
    prompt: 'La “regola del 4-2-1” è usata per definire:',
    answer: 'La retinopatia diabetica non proliferante severa',
    distractors: ['La retinopatia proliferante ad alto rischio', 'L’edema maculare clinicamente significativo', 'La maculopatia ischemica'],
    explanation:
      'Emorragie intraretiniche nei 4 quadranti, irregolarità venose (venous beading) in 2 quadranti o IRMA in 1 quadrante identificano la NPDR severa (classificazione ETDRS).',
  },
  {
    id: 'ret-rd-type',
    category: 'Retina',
    difficulty: 'Base',
    pathologyId: 'distacco-retina',
    prompt: 'Qual è la forma più frequente di distacco di retina?',
    answer: 'Regmatogeno',
    distractors: ['Trazionale', 'Essudativo', 'Sieroso centrale'],
    explanation:
      'Il distacco regmatogeno, causato da una rottura retinica che consente il passaggio di vitreo liquefatto nello spazio sottoretinico, è di gran lunga il più comune.',
  },
  {
    id: 'ret-rd-symptoms',
    category: 'Retina',
    difficulty: 'Base',
    pathologyId: 'distacco-retina',
    prompt: 'Quali sintomi prodromici fanno sospettare una rottura retinica?',
    answer: 'Fotopsie e improvvisa comparsa di numerose miodesopsie',
    distractors: ['Dolore oculare intenso e occhio rosso', 'Prurito e lacrimazione', 'Aloni colorati attorno alle luci'],
    explanation:
      'Lampi luminosi e “pioggia” di corpi mobili indicano trazione vitreoretinica ed eventuale emorragia: impongono un esame del fundus in midriasi entro breve tempo.',
  },
  {
    id: 'ret-pneumatic',
    category: 'Retina',
    difficulty: 'Intermedio',
    pathologyId: 'distacco-retina',
    prompt: 'Quale tecnica per il distacco di retina prevede l’iniezione intravitreale di una bolla di gas e il posizionamento del capo?',
    answer: 'Retinopessia pneumatica',
    distractors: ['Piombaggio episclerale', 'Cerchiaggio sclerale', 'Fotocoagulazione panretinica'],
    explanation:
      'La retinopessia pneumatica, eseguibile ambulatorialmente, è indicata soprattutto per rotture singole nei quadranti superiori, associata a crioterapia o laser.',
  },
  {
    id: 'ret-oct-dme',
    category: 'Retina',
    difficulty: 'Base',
    pathologyId: 'edema-maculare',
    prompt: 'Quale esame è il riferimento per quantificare e monitorare l’edema maculare?',
    answer: 'Tomografia a coerenza ottica (OCT)',
    distractors: ['Campo visivo computerizzato', 'Ecografia B-scan', 'Elettroretinogramma'],
    explanation:
      'L’OCT misura in modo non invasivo e ripetibile lo spessore retinico centrale e documenta i fluidi intra e sottoretinici, guidando il re-trattamento.',
  },
  {
    id: 'ret-irvine-gass',
    category: 'Retina',
    difficulty: 'Intermedio',
    pathologyId: 'edema-maculare',
    prompt: 'La sindrome di Irvine-Gass è un edema maculare cistoide che insorge tipicamente:',
    answer: 'Alcune settimane dopo un intervento di cataratta',
    distractors: ['Subito dopo un trauma contusivo', 'Dopo un ciclo di iniezioni anti-VEGF', 'In corso di occlusione arteriosa retinica'],
    explanation:
      'È la complicanza maculare più frequente della chirurgia della cataratta, con picco a circa 4-6 settimane; si tratta con FANS e corticosteroidi topici.',
  },
  {
    id: 'ret-rp-symptom',
    category: 'Retina',
    difficulty: 'Base',
    pathologyId: 'retinite-pigmentosa',
    prompt: 'Qual è il sintomo d’esordio più tipico della retinite pigmentosa?',
    answer: 'Nictalopia (difficoltà visiva in ambienti poco illuminati)',
    distractors: ['Metamorfopsie centrali', 'Diplopia binoculare', 'Dolore retrobulbare'],
    explanation:
      'La degenerazione colpisce inizialmente i bastoncelli: ne derivano cecità notturna e progressivo restringimento del campo visivo “a cannocchiale”.',
  },
  {
    id: 'ret-rp-erg',
    category: 'Retina',
    difficulty: 'Avanzato',
    pathologyId: 'retinite-pigmentosa',
    prompt: 'Quale reperto elettrofisiologico è tipico della retinite pigmentosa nelle fasi iniziali?',
    answer: 'ERG scotopico ridotto precocemente, spesso prima dei segni fundoscopici',
    distractors: ['ERG normale con PEV marcatamente rallentati', 'Riduzione isolata della risposta fotopica a 30 Hz', 'ERG sovranormale'],
    explanation:
      'L’ERG documenta la disfunzione dei bastoncelli (risposte scotopiche ridotte o estinte) anche quando il fondo appare ancora quasi normale; i coni sono coinvolti più tardi.',
  },
  {
    id: 'ret-crvo',
    category: 'Retina',
    difficulty: 'Intermedio',
    pathologyId: 'occlusione-venosa',
    prompt: 'Emorragie a fiamma diffuse nei quattro quadranti, vene dilatate e tortuose ed edema papillare (“blood and thunder”) indicano:',
    answer: 'Occlusione della vena centrale della retina',
    distractors: ['Occlusione dell’arteria centrale della retina', 'Retinopatia ipertensiva di grado I', 'Degenerazione maculare essudativa'],
    explanation:
      'Il quadro emorragico diffuso è tipico dell’occlusione venosa centrale; nelle forme di branca le emorragie sono limitate al settore drenato dal vaso occluso.',
  },
  {
    id: 'ret-rvo-risk',
    category: 'Retina',
    difficulty: 'Base',
    pathologyId: 'occlusione-venosa',
    prompt: 'Qual è il principale fattore di rischio sistemico per le occlusioni venose retiniche?',
    answer: 'Ipertensione arteriosa',
    distractors: ['Miopia elevata', 'Ipotiroidismo', 'Anemia sideropenica'],
    explanation:
      'L’ipertensione, insieme a diabete, dislipidemia e glaucoma, favorisce la compressione venosa a livello degli incroci artero-venosi e della lamina cribrosa.',
  },
  {
    id: 'ret-crao',
    category: 'Retina',
    difficulty: 'Intermedio',
    prompt: 'Calo visivo improvviso e indolore, retina pallida ed edematosa con “macchia rosso ciliegia” foveale: qual è la diagnosi?',
    answer: 'Occlusione dell’arteria centrale della retina',
    distractors: ['Occlusione della vena centrale della retina', 'Distacco di retina macula-off', 'Emorragia vitreale'],
    explanation:
      'L’ischemia degli strati interni rende la retina opaca, mentre la fovea, priva di strati interni e nutrita dalla coroide, appare rossa. È un’emergenza: va esclusa l’arterite gigantocellulare.',
  },
  {
    id: 'ret-cb-genetics',
    category: 'Retina',
    difficulty: 'Base',
    pathologyId: 'discromatopsia',
    prompt: 'Come si trasmette la discromatopsia congenita rosso-verde?',
    answer: 'Recessiva legata al cromosoma X',
    distractors: ['Autosomica dominante', 'Mitocondriale', 'Autosomica recessiva'],
    explanation:
      'I geni delle opsine L e M si trovano sul cromosoma X: per questo il difetto interessa circa l’8% dei maschi e meno dell’1% delle femmine.',
  },
  {
    id: 'ret-protan',
    category: 'Retina',
    difficulty: 'Intermedio',
    pathologyId: 'discromatopsia',
    prompt: 'Nella protanopia è assente la funzione dei coni sensibili a:',
    answer: 'Lunghezze d’onda lunghe (coni L, “rossi”)',
    distractors: ['Lunghezze d’onda medie (coni M, “verdi”)', 'Lunghezze d’onda corte (coni S, “blu”)', 'Tutte le lunghezze d’onda (acromatopsia)'],
    explanation:
      'Protan = coni L, deutan = coni M, tritan = coni S. Il protanope percepisce inoltre il rosso come più scuro.',
  },

  /* ---------------------------------------------------------- Nervo ottico */
  {
    id: 'no-iop',
    category: 'Nervo Ottico',
    difficulty: 'Base',
    pathologyId: 'glaucoma',
    prompt: 'Qual è l’unico fattore di rischio del glaucoma su cui si interviene con la terapia?',
    answer: 'La pressione intraoculare',
    distractors: ['La familiarità', 'L’età avanzata', 'Lo spessore corneale centrale'],
    explanation:
      'Tutte le terapie attuali (farmaci, laser, chirurgia) mirano a ridurre la IOP, che resta il principale fattore di rischio modificabile anche nel glaucoma normotensivo.',
  },
  {
    id: 'no-bjerrum',
    category: 'Nervo Ottico',
    difficulty: 'Intermedio',
    pathologyId: 'glaucoma',
    prompt: 'Quale difetto campimetrico è tipico del glaucoma iniziale-moderato?',
    answer: 'Scotoma arcuato (di Bjerrum) e scalino nasale',
    distractors: ['Emianopsia omonima', 'Scotoma centrale', 'Quadrantopsia bitemporale superiore'],
    explanation:
      'Il danno alle fibre dello strato delle fibre nervose che si arcuano attorno alla macula produce difetti arcuati che rispettano il meridiano orizzontale.',
  },
  {
    id: 'no-isnt',
    category: 'Nervo Ottico',
    difficulty: 'Intermedio',
    pathologyId: 'glaucoma',
    prompt: 'Secondo la regola ISNT, in una papilla normale la rima neuroretinica è più spessa:',
    answer: 'Inferiormente, poi superiormente, nasalmente e temporalmente',
    distractors: [
      'Temporalmente, poi nasalmente, superiormente e inferiormente',
      'Superiormente, poi inferiormente, temporalmente e nasalmente',
      'In modo uniforme su tutti i settori',
    ],
    explanation:
      'La violazione della regola ISNT, soprattutto l’assottigliamento dei poli inferiore e superiore, è un segno precoce di danno glaucomatoso.',
  },
  {
    id: 'no-acute-angle',
    category: 'Nervo Ottico',
    difficulty: 'Intermedio',
    pathologyId: 'glaucoma',
    prompt: 'Dopo aver ridotto la pressione in un attacco acuto di glaucoma ad angolo chiuso, il trattamento definitivo è:',
    answer: 'Iridotomia periferica con laser Nd:YAG',
    distractors: ['Trabeculoplastica laser selettiva (SLT)', 'Ciclofotocoagulazione diodo', 'Vitrectomia posteriore'],
    explanation:
      'L’iridotomia crea una via alternativa per l’acqueo eliminando il blocco pupillare; va eseguita profilatticamente anche nell’occhio controlaterale.',
  },
  {
    id: 'no-pachy',
    category: 'Nervo Ottico',
    difficulty: 'Avanzato',
    pathologyId: 'glaucoma',
    prompt: 'Con una cornea centrale sottile (es. 480 µm), la IOP misurata con tonometro di Goldmann tende a essere:',
    answer: 'Sottostimata rispetto al valore reale',
    distractors: ['Sovrastimata rispetto al valore reale', 'Indipendente dallo spessore corneale', 'Non misurabile con applanazione'],
    explanation:
      'Una cornea sottile si appiana più facilmente e porta a sottostimare la pressione; lo spessore ridotto è inoltre un fattore di rischio indipendente di progressione (OHTS).',
  },
  {
    id: 'no-ms',
    category: 'Nervo Ottico',
    difficulty: 'Base',
    pathologyId: 'neurite-ottica',
    prompt: 'La neurite ottica demielinizzante è più frequentemente associata a:',
    answer: 'Sclerosi multipla',
    distractors: ['Diabete mellito', 'Arterite a cellule giganti', 'Ipertensione endocranica idiopatica'],
    explanation:
      'Può essere la manifestazione d’esordio della sclerosi multipla; la RM encefalica con lesioni della sostanza bianca stratifica il rischio di conversione.',
  },
  {
    id: 'no-onnt',
    category: 'Nervo Ottico',
    difficulty: 'Avanzato',
    pathologyId: 'neurite-ottica',
    prompt: 'Secondo l’Optic Neuritis Treatment Trial, il prednisone orale a basse dosi come unica terapia:',
    answer: 'Aumenta il rischio di recidive ed è sconsigliato',
    distractors: ['Migliora l’acuità visiva finale', 'È la terapia di prima scelta', 'Previene la conversione a sclerosi multipla'],
    explanation:
      'Il metilprednisolone ad alte dosi ev accelera il recupero senza cambiare l’esito visivo finale; il prednisone orale a basse dosi da solo si è associato a più recidive.',
  },
  {
    id: 'no-retrobulbar',
    category: 'Nervo Ottico',
    difficulty: 'Intermedio',
    pathologyId: 'neurite-ottica',
    prompt: 'Nella neurite ottica retrobulbare, l’esame del fondo oculare in fase acuta mostra tipicamente:',
    answer: 'Una papilla normale',
    distractors: ['Edema papillare con emorragie peripapillari', 'Pallore papillare settoriale', 'Escavazione papillare aumentata'],
    explanation:
      '“Il paziente non vede nulla e il medico non vede nulla”: l’infiammazione è posteriore al bulbo. Il pallore papillare compare solo dopo 4-6 settimane.',
  },

  /* ---------------------------------------------------------------- Cornea */
  {
    id: 'cor-cxl',
    category: 'Cornea',
    difficulty: 'Base',
    pathologyId: 'cheratocono',
    prompt: 'Quale trattamento è indicato per arrestare la progressione del cheratocono?',
    answer: 'Cross-linking corneale con riboflavina e raggi UVA',
    distractors: ['Cheratotomia radiale', 'LASIK miopica', 'Lenti a contatto morbide notturne'],
    explanation:
      'Il cross-linking aumenta i legami tra le fibre collagene stromali e la rigidità corneale; la chirurgia refrattiva laser è invece controindicata nel cheratocono.',
  },
  {
    id: 'cor-munson',
    category: 'Cornea',
    difficulty: 'Intermedio',
    pathologyId: 'cheratocono',
    prompt: 'Il segno di Munson nel cheratocono avanzato consiste in:',
    answer: 'Protrusione a V della palpebra inferiore nello sguardo verso il basso',
    distractors: ['Riflesso conico di luce sul limbus nasale', 'Anello pigmentato alla base del cono', 'Strie verticali nello stroma posteriore'],
    explanation:
      'La cornea conica deforma il margine palpebrale inferiore. Il riflesso nasale è il segno di Rizzuti, l’anello è di Fleischer e le strie sono di Vogt.',
  },
  {
    id: 'cor-fleischer',
    category: 'Cornea',
    difficulty: 'Avanzato',
    pathologyId: 'cheratocono',
    prompt: 'L’anello di Fleischer nel cheratocono è dovuto a:',
    answer: 'Deposito di ferro nell’epitelio basale alla base del cono',
    distractors: ['Deposito di rame nella membrana di Descemet periferica', 'Cicatrice stromale apicale', 'Accumulo di lipidi al limbus'],
    explanation:
      'È un deposito di emosiderina ben visibile con luce blu cobalto. Il deposito di rame nella Descemet è l’anello di Kayser-Fleischer della malattia di Wilson.',
  },
  {
    id: 'cor-hydrops',
    category: 'Cornea',
    difficulty: 'Avanzato',
    pathologyId: 'cheratocono',
    prompt: 'L’idrope corneale acuto nel cheratocono è causato da:',
    answer: 'Rottura della membrana di Descemet con imbibizione stromale',
    distractors: ['Perforazione a tutto spessore della cornea', 'Infezione batterica dello stroma', 'Distacco dell’epitelio corneale'],
    explanation:
      'L’acqueo penetra nello stroma attraverso la rottura della Descemet causando edema improvviso; di solito si risolve in settimane lasciando una cicatrice.',
  },
  {
    id: 'cor-topography',
    category: 'Cornea',
    difficulty: 'Intermedio',
    pathologyId: 'cheratocono',
    prompt: 'Quale esame identifica più precocemente un cheratocono subclinico?',
    answer: 'Tomografia corneale (Scheimpflug) con analisi della faccia posteriore',
    distractors: ['Cheratometria manuale', 'Acuità visiva con ottotipo', 'Test di Schirmer'],
    explanation:
      'L’elevazione della superficie posteriore e la distribuzione dello spessore si alterano prima della curvatura anteriore, rendendo la tomografia essenziale nello screening pre-chirurgia refrattiva.',
  },
  {
    id: 'cor-hsv',
    category: 'Cornea',
    difficulty: 'Base',
    prompt: 'Un’ulcera corneale ramificata con bulbi terminali, evidenziata con fluoresceina, suggerisce:',
    answer: 'Cheratite da Herpes simplex',
    distractors: ['Cheratite da Acanthamoeba', 'Ulcera batterica da Pseudomonas', 'Cheratopatia da esposizione'],
    explanation:
      'L’ulcera dendritica è patognomonica dell’HSV epiteliale; si tratta con antivirali e i corticosteroidi topici sono controindicati nella forma epiteliale attiva.',
  },
  {
    id: 'cor-acanthamoeba',
    category: 'Cornea',
    difficulty: 'Intermedio',
    prompt: 'Portatore di lenti a contatto con dolore sproporzionato ai segni clinici e infiltrato stromale ad anello: quale agente sospettare?',
    answer: 'Acanthamoeba',
    distractors: ['Staphylococcus aureus', 'Adenovirus', 'Chlamydia trachomatis'],
    explanation:
      'La cheratite da Acanthamoeba è legata al contatto delle lenti con acqua; dolore intenso, perineurite radiale e infiltrato ad anello sono tipici.',
  },

  /* ------------------------------------------------------- Mezzi diottrici */
  {
    id: 'md-phaco',
    category: 'Mezzi Diottrici',
    difficulty: 'Base',
    pathologyId: 'cataratta',
    prompt: 'Qual è la tecnica chirurgica standard per la cataratta nei Paesi industrializzati?',
    answer: 'Facoemulsificazione con impianto di IOL nel sacco capsulare',
    distractors: ['Estrazione intracapsulare con lente afachica', 'Vitrectomia con lensectomia', 'Capsulotomia Nd:YAG'],
    explanation:
      'La facoemulsificazione frammenta il nucleo con ultrasuoni attraverso un’incisione di 2-3 mm e consente l’impianto di una lente pieghevole nel sacco.',
  },
  {
    id: 'md-second-sight',
    category: 'Mezzi Diottrici',
    difficulty: 'Intermedio',
    pathologyId: 'cataratta',
    prompt: 'Un anziano riferisce di poter di nuovo leggere senza occhiali (“second sight”). Quale tipo di cataratta è più probabile?',
    answer: 'Nucleare',
    distractors: ['Sottocapsulare posteriore', 'Corticale a cuneo', 'Polare anteriore congenita'],
    explanation:
      'La sclerosi nucleare aumenta l’indice di rifrazione del cristallino causando una miopizzazione che compensa temporaneamente la presbiopia.',
  },
  {
    id: 'md-psc-steroids',
    category: 'Mezzi Diottrici',
    difficulty: 'Intermedio',
    pathologyId: 'cataratta',
    prompt: 'La cataratta sottocapsulare posteriore è tipicamente associata a:',
    answer: 'Terapia corticosteroidea prolungata',
    distractors: ['Ipermetropia elevata', 'Uso di analoghi delle prostaglandine', 'Carenza di vitamina A'],
    explanation:
      'Corticosteroidi (sistemici, inalatori o topici), diabete, radiazioni e uveiti favoriscono la forma sottocapsulare posteriore, che causa abbagliamento e calo visivo per vicino.',
  },
  {
    id: 'md-pco',
    category: 'Mezzi Diottrici',
    difficulty: 'Base',
    pathologyId: 'cataratta',
    prompt: 'A distanza di anni dalla chirurgia della cataratta il paziente lamenta un nuovo annebbiamento per opacizzazione della capsula posteriore. Il trattamento è:',
    answer: 'Capsulotomia con laser Nd:YAG',
    distractors: ['Sostituzione chirurgica della IOL', 'Colliri antinfiammatori', 'Trabeculoplastica laser'],
    explanation:
      'La “cataratta secondaria” deriva dalla proliferazione di cellule epiteliali residue; il laser apre un foro nella capsula in pochi secondi, ambulatorialmente.',
  },
  {
    id: 'md-pvd',
    category: 'Mezzi Diottrici',
    difficulty: 'Base',
    pathologyId: 'miodesopsie',
    prompt: 'La comparsa improvvisa di un grande corpo mobile ad anello (anello di Weiss) indica:',
    answer: 'Distacco posteriore di vitreo',
    distractors: ['Emorragia sottocongiuntivale', 'Cataratta corticale', 'Edema maculare'],
    explanation:
      'L’anello di Weiss è il residuo dell’adesione peripapillare del vitreo; ogni distacco posteriore sintomatico richiede l’esame della periferia retinica in midriasi.',
  },
  {
    id: 'md-shafer',
    category: 'Mezzi Diottrici',
    difficulty: 'Avanzato',
    pathologyId: 'miodesopsie',
    prompt: 'Il segno di Shafer (“polvere di tabacco” nel vitreo anteriore) in un paziente con miodesopsie acute suggerisce:',
    answer: 'Una rottura retinica associata',
    distractors: ['Una sineresi vitreale fisiologica', 'Un’uveite anteriore cronica', 'Una cataratta incipiente'],
    explanation:
      'Le cellule pigmentate dell’EPR liberate da una rottura migrano nel vitreo; il segno ha elevato valore predittivo positivo per rottura retinica.',
  },

  /* ---------------------------------------------------- Vizi di refrazione */
  {
    id: 'vr-myopia-lens',
    category: 'Vizi di Refrazione',
    difficulty: 'Base',
    pathologyId: 'miopia',
    prompt: 'Con quale tipo di lente si corregge la miopia?',
    answer: 'Lente divergente (negativa)',
    distractors: ['Lente convergente (positiva)', 'Lente prismatica', 'Lente cilindrica pura'],
    explanation:
      'Nell’occhio miope l’immagine si forma davanti alla retina; la lente negativa sposta il fuoco indietro, sulla retina.',
  },
  {
    id: 'vr-hyperopia-focus',
    category: 'Vizi di Refrazione',
    difficulty: 'Base',
    pathologyId: 'ipermetropia',
    prompt: 'Nell’occhio ipermetrope non corretto, a riposo accomodativo, l’immagine di un oggetto lontano si forma:',
    answer: 'Dietro la retina',
    distractors: ['Davanti alla retina', 'Esattamente sulla retina', 'Su due fuochi distinti'],
    explanation:
      'L’occhio è “corto” o poco potente: il giovane può compensare con l’accomodazione, ma a costo di affaticamento e, nei bambini, rischio di esotropia accomodativa.',
  },
  {
    id: 'vr-wtr',
    category: 'Vizi di Refrazione',
    difficulty: 'Intermedio',
    pathologyId: 'astigmatismo',
    prompt: 'Nell’astigmatismo secondo regola (with-the-rule), il meridiano corneale più curvo è:',
    answer: 'Verticale (intorno a 90°)',
    distractors: ['Orizzontale (intorno a 180°)', 'Obliquo a 45°', 'Variabile da punto a punto (irregolare)'],
    explanation:
      'È la forma più comune nei giovani; con l’età tende a virare verso un astigmatismo contro regola, con meridiano più curvo orizzontale.',
  },
  {
    id: 'vr-presbyopia',
    category: 'Vizi di Refrazione',
    difficulty: 'Base',
    pathologyId: 'presbiopia',
    prompt: 'La presbiopia è dovuta principalmente a:',
    answer: 'Perdita di elasticità del cristallino con riduzione dell’accomodazione',
    distractors: ['Allungamento del bulbo oculare', 'Aumento della curvatura corneale', 'Degenerazione dei fotorecettori maculari'],
    explanation:
      'Il cristallino si irrigidisce progressivamente con l’età; i sintomi compaiono tipicamente dopo i 40-45 anni e si correggono con lenti positive per vicino.',
  },
  {
    id: 'vr-amblyopia-tx',
    category: 'Vizi di Refrazione',
    difficulty: 'Base',
    pathologyId: 'ambliopia',
    prompt: 'Qual è il trattamento di base dell’ambliopia nel bambino?',
    answer: 'Correzione ottica completa e occlusione (o penalizzazione) dell’occhio dominante',
    distractors: ['Occlusione dell’occhio ambliope', 'Chirurgia refrattiva laser', 'Attesa fino all’età scolare'],
    explanation:
      'Il trattamento è tanto più efficace quanto più precoce, entro il periodo critico dello sviluppo visivo; l’atropina nell’occhio sano è un’alternativa alla benda.',
  },
  {
    id: 'vr-deprivation',
    category: 'Vizi di Refrazione',
    difficulty: 'Intermedio',
    pathologyId: 'ambliopia',
    prompt: 'Quale forma di ambliopia richiede l’intervento più urgente?',
    answer: 'Da deprivazione (es. cataratta congenita densa)',
    distractors: ['Anisometropica lieve', 'Strabica in esotropia alternante', 'Refrattiva bilaterale ipermetropica moderata'],
    explanation:
      'La deprivazione visiva nelle prime settimane di vita causa un deficit profondo e spesso irreversibile: la cataratta congenita densa monolaterale va operata entro le prime 6 settimane circa.',
  },
  {
    id: 'vr-high-myopia',
    category: 'Vizi di Refrazione',
    difficulty: 'Avanzato',
    pathologyId: 'miopia',
    prompt: 'La miopia elevata aumenta il rischio di tutte le seguenti condizioni, TRANNE:',
    answer: 'Glaucoma primario ad angolo chiuso',
    distractors: ['Distacco di retina regmatogeno', 'Neovascolarizzazione coroideale miopica', 'Glaucoma primario ad angolo aperto'],
    explanation:
      'L’angolo chiuso è associato agli occhi corti ipermetropi. La miopia elevata predispone invece a distacco di retina, CNV miopica, glaucoma ad angolo aperto e cataratta.',
  },

  /* ------------------------------------------------------------------ Uvea */
  {
    id: 'uv-hlab27',
    category: 'Uvea',
    difficulty: 'Base',
    pathologyId: 'uveite',
    prompt: 'Quale antigene HLA è più frequentemente associato all’uveite anteriore acuta?',
    answer: 'HLA-B27',
    distractors: ['HLA-A29', 'HLA-B51', 'HLA-DR4'],
    explanation:
      'HLA-B27 si associa alle spondiloartriti (spondilite anchilosante, artrite reattiva). HLA-A29 è legato alla corioretinopatia birdshot, HLA-B51 alla malattia di Behçet.',
  },
  {
    id: 'uv-cycloplegics',
    category: 'Uvea',
    difficulty: 'Intermedio',
    pathologyId: 'uveite',
    prompt: 'Nell’uveite anteriore acuta, perché si associano cicloplegici ai corticosteroidi topici?',
    answer: 'Per ridurre il dolore da spasmo ciliare e prevenire le sinechie posteriori',
    distractors: ['Per abbassare la pressione intraoculare', 'Per eradicare l’agente infettivo', 'Per favorire la riepitelizzazione corneale'],
    explanation:
      'La midriasi farmacologica allontana l’iride dal cristallino evitando aderenze, mentre la paralisi del muscolo ciliare allevia il dolore.',
  },
  {
    id: 'uv-mutton-fat',
    category: 'Uvea',
    difficulty: 'Intermedio',
    pathologyId: 'uveite',
    prompt: 'Precipitati cheratici grandi e untuosi (“a grasso di montone”) orientano verso:',
    answer: 'Un’uveite granulomatosa (es. sarcoidosi, tubercolosi)',
    distractors: ['Un’uveite anteriore acuta HLA-B27', 'Una cheratite da Herpes simplex epiteliale', 'Un glaucoma pigmentario'],
    explanation:
      'I precipitati “mutton-fat” sono aggregati di macrofagi ed epitelioidi; insieme ai noduli iridei di Koeppe e Busacca suggeriscono un’eziologia granulomatosa.',
  },
  {
    id: 'uv-bombe',
    category: 'Uvea',
    difficulty: 'Avanzato',
    pathologyId: 'uveite',
    prompt: 'Sinechie posteriori estese a 360° (seclusio pupillae) possono determinare:',
    answer: 'Iride a bombé con glaucoma secondario ad angolo chiuso',
    distractors: ['Ipotonia per distacco del corpo ciliare', 'Glaucoma pigmentario ad angolo aperto', 'Cheratocono secondario'],
    explanation:
      'L’acqueo non riesce a passare dalla camera posteriore all’anteriore, spinge l’iride in avanti e chiude l’angolo: serve un’iridotomia urgente.',
  },

  /* ---------------------------------------------------------- Farmacologia */
  {
    id: 'fa-latanoprost',
    category: 'Farmacologia',
    difficulty: 'Intermedio',
    pathologyId: 'glaucoma',
    prompt: 'Gli analoghi delle prostaglandine (es. latanoprost) riducono la IOP principalmente:',
    answer: 'Aumentando il deflusso uveosclerale',
    distractors: ['Riducendo la produzione di umor acqueo', 'Contraendo il muscolo ciliare e aprendo il trabecolato', 'Disidratando il vitreo per via osmotica'],
    explanation:
      'Sono i farmaci di prima linea per efficacia e monosomministrazione serale; effetti collaterali tipici sono iperpigmentazione iridea, ipertricosi ciliare e orbitopatia.',
  },
  {
    id: 'fa-timolol',
    category: 'Farmacologia',
    difficulty: 'Base',
    pathologyId: 'glaucoma',
    prompt: 'In quale paziente il timololo collirio è controindicato?',
    answer: 'Paziente con asma bronchiale o bradicardia',
    distractors: ['Paziente con ipertensione arteriosa', 'Paziente con diabete ben compensato', 'Paziente con miopia elevata'],
    explanation:
      'Il beta-bloccante non selettivo viene assorbito sistemicamente attraverso le vie nasolacrimali e può causare broncospasmo, bradicardia e blocchi atrioventricolari.',
  },
  {
    id: 'fa-brimonidine',
    category: 'Farmacologia',
    difficulty: 'Avanzato',
    pathologyId: 'glaucoma',
    prompt: 'Perché la brimonidina è controindicata nei bambini sotto i 2 anni?',
    answer: 'Rischio di depressione del sistema nervoso centrale e apnea',
    distractors: ['Rischio di miopizzazione rapida', 'Rischio di cataratta precoce', 'Rischio di ipertensione arteriosa grave'],
    explanation:
      'L’alfa-2 agonista attraversa facilmente la barriera ematoencefalica immatura, provocando sonnolenza, ipotonia, bradicardia e apnea.',
  },
  {
    id: 'fa-acetazolamide',
    category: 'Farmacologia',
    difficulty: 'Intermedio',
    pathologyId: 'glaucoma',
    prompt: 'Quale effetto collaterale è tipico dell’acetazolamide sistemica?',
    answer: 'Parestesie alle estremità e ipokaliemia',
    distractors: ['Iperpigmentazione iridea', 'Miosi serrata', 'Broncospasmo'],
    explanation:
      'L’inibitore dell’anidrasi carbonica riduce la produzione di acqueo; causa anche acidosi metabolica, calcolosi renale ed è da usare con cautela negli allergici ai sulfamidici.',
  },
  {
    id: 'fa-atropine-duration',
    category: 'Farmacologia',
    difficulty: 'Base',
    prompt: 'Quale cicloplegico ha la durata d’azione più lunga?',
    answer: 'Atropina (7-14 giorni)',
    distractors: ['Tropicamide (4-6 ore)', 'Ciclopentolato (circa 24 ore)', 'Fenilefrina (alcune ore, solo midriatico)'],
    explanation:
      'L’atropina è il cicloplegico più potente e duraturo; la tropicamide è preferita per la midriasi diagnostica, mentre la fenilefrina è un simpaticomimetico senza effetto cicloplegico.',
  },
  {
    id: 'fa-low-dose-atropine',
    category: 'Farmacologia',
    difficulty: 'Intermedio',
    pathologyId: 'miopia',
    prompt: 'Quale intervento farmacologico ha dimostrato di rallentare la progressione della miopia nei bambini?',
    answer: 'Atropina collirio a basso dosaggio (0,01-0,05%)',
    distractors: ['Timololo collirio serale', 'Integratori di luteina', 'Pilocarpina all’1%'],
    explanation:
      'L’atropina a basse concentrazioni riduce la progressione con effetti collaterali minimi; si associa a misure ottiche (lenti a defocus periferico, ortocheratologia) e all’attività all’aperto.',
  },
  {
    id: 'fa-pilocarpine',
    category: 'Farmacologia',
    difficulty: 'Base',
    prompt: 'La pilocarpina è un:',
    answer: 'Agonista muscarinico che causa miosi',
    distractors: ['Antagonista muscarinico che causa midriasi', 'Alfa-agonista che causa midriasi', 'Beta-bloccante senza effetto pupillare'],
    explanation:
      'Contraendo lo sfintere dell’iride e il muscolo ciliare apre l’angolo e il trabecolato; oggi è usata soprattutto nel glaucoma ad angolo chiuso e, a basse dosi, nella presbiopia.',
  },
  {
    id: 'fa-ivt-endophthalmitis',
    category: 'Farmacologia',
    difficulty: 'Intermedio',
    pathologyId: 'amd',
    prompt: 'Qual è la complicanza più temuta delle iniezioni intravitreali?',
    answer: 'Endoftalmite',
    distractors: ['Emorragia sottocongiuntivale', 'Aumento transitorio della IOP', 'Cheratite puntata superficiale'],
    explanation:
      'È rara (circa 1 caso su 2.000-3.000 iniezioni) ma può compromettere la vista; la profilassi si basa su iodopovidone al 5% e tecnica asettica.',
  },
  {
    id: 'fa-steroid-response',
    category: 'Farmacologia',
    difficulty: 'Base',
    prompt: 'Quali complicanze oculari sono tipiche dell’uso prolungato di corticosteroidi topici?',
    answer: 'Ipertensione oculare/glaucoma e cataratta',
    distractors: ['Distacco di retina e miopia', 'Cheratocono e astigmatismo', 'Neurite ottica e discromatopsia'],
    explanation:
      'Circa un terzo della popolazione è “steroid responder”: la IOP va monitorata nelle terapie prolungate, che favoriscono anche la cataratta sottocapsulare posteriore.',
  },

  /* ------------------------------------------------------------ Semeiotica */
  {
    id: 'se-amsler',
    category: 'Semeiotica',
    difficulty: 'Base',
    pathologyId: 'amd',
    prompt: 'La griglia di Amsler serve a evidenziare:',
    answer: 'Metamorfopsie e scotomi dei 10° centrali',
    distractors: ['Difetti del campo visivo periferico', 'Deficit della visione dei colori', 'Alterazioni della motilità oculare'],
    explanation:
      'È uno strumento semplice di autocontrollo per i pazienti con maculopatie: linee distorte o mancanti possono segnalare l’evoluzione verso la forma neovascolare.',
  },
  {
    id: 'se-pinhole',
    category: 'Semeiotica',
    difficulty: 'Base',
    prompt: 'Se l’acuità visiva migliora guardando attraverso il foro stenopeico, il calo visivo è probabilmente dovuto a:',
    answer: 'Un vizio refrattivo non corretto',
    distractors: ['Una maculopatia', 'Una neuropatia ottica', 'Un’ambliopia'],
    explanation:
      'Il foro stenopeico seleziona i raggi parassiali riducendo i circoli di sfocamento: corregge in parte gli errori refrattivi ma non i deficit di origine retinica o neurologica.',
  },
  {
    id: 'se-rapd',
    category: 'Semeiotica',
    difficulty: 'Intermedio',
    pathologyId: 'neurite-ottica',
    prompt: 'Con lo swinging flashlight test, la pupilla che si dilata quando viene illuminata indica:',
    answer: 'Un difetto pupillare afferente relativo (pupilla di Marcus Gunn) da quel lato',
    distractors: ['Una paralisi del III nervo cranico da quel lato', 'Una pupilla tonica di Adie', 'Una sindrome di Horner controlaterale'],
    explanation:
      'Il RAPD indica un deficit asimmetrico della via afferente, tipicamente del nervo ottico; è presente nella neurite ottica e nelle neuropatie monolaterali.',
  },
  {
    id: 'se-goldmann',
    category: 'Semeiotica',
    difficulty: 'Base',
    pathologyId: 'glaucoma',
    prompt: 'Qual è il metodo di riferimento per misurare la pressione intraoculare?',
    answer: 'Tonometria ad applanazione di Goldmann',
    distractors: ['Tonometria digitale', 'Pachimetria ultrasonica', 'Gonioscopia'],
    explanation:
      'La tonometria di Goldmann alla lampada a fessura è il gold standard; i valori considerati statisticamente normali sono compresi tra circa 10 e 21 mmHg.',
  },
  {
    id: 'se-cover-test',
    category: 'Semeiotica',
    difficulty: 'Base',
    pathologyId: 'ambliopia',
    prompt: 'Il cover-uncover test permette di:',
    answer: 'Distinguere uno strabismo manifesto (tropia) da uno latente (foria)',
    distractors: ['Misurare la pressione intraoculare', 'Valutare la sensibilità al contrasto', 'Quantificare l’astigmatismo'],
    explanation:
      'Se coprendo un occhio l’altro compie un movimento di rifissazione, c’è una tropia; se l’occhio coperto si muove alla scopertura, si tratta di una foria.',
  },
  {
    id: 'se-ishihara',
    category: 'Semeiotica',
    difficulty: 'Base',
    pathologyId: 'discromatopsia',
    prompt: 'Le tavole pseudoisocromatiche di Ishihara sono un test di screening per:',
    answer: 'Le discromatopsie congenite rosso-verdi',
    distractors: ['Il glaucoma', 'La stereopsi', 'Il cheratocono'],
    explanation:
      'Sono rapide e sensibili per i difetti protan e deutan; non indagano bene l’asse blu-giallo (tritan), per cui si usano test come il Farnsworth D-15.',
  },
  {
    id: 'se-leukocoria',
    category: 'Semeiotica',
    difficulty: 'Intermedio',
    prompt: 'In un neonato il riflesso rosso del fondo è sostituito da un riflesso biancastro (leucocoria). Quali diagnosi vanno escluse per prime?',
    answer: 'Retinoblastoma e cataratta congenita',
    distractors: ['Congiuntivite neonatale e dacriostenosi', 'Miopia elevata e astigmatismo', 'Glaucoma congenito e megalocornea'],
    explanation:
      'La leucocoria richiede una valutazione oculistica urgente: il retinoblastoma è potenzialmente letale e la cataratta congenita causa ambliopia da deprivazione.',
  },
  {
    id: 'se-fluorescein',
    category: 'Semeiotica',
    difficulty: 'Base',
    prompt: 'La fluoresceina sodica instillata in collirio, osservata con luce blu cobalto, evidenzia:',
    answer: 'Difetti dell’epitelio corneale',
    distractors: ['Neovasi coroideali', 'Cellule infiammatorie in camera anteriore', 'Opacità del cristallino'],
    explanation:
      'Il colorante si fissa dove l’epitelio è interrotto (abrasioni, ulcere, cheratiti puntate) e serve anche per la tonometria di Goldmann e la valutazione dell’applicazione delle lenti a contatto.',
  },
];
