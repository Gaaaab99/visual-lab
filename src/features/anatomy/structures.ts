/** Dati anatomici della sezione "Anatomia interattiva dell'occhio". */

export type AnatomyMode = 'sagittal' | 'fundus' | 'oct';

export const MODE_LABEL: Record<AnatomyMode, string> = {
  sagittal: 'Sezione sagittale',
  fundus: 'Fondo oculare',
  oct: 'Strati retinici (OCT)',
};

export const MODE_DESCRIPTION: Record<AnatomyMode, string> = {
  sagittal: 'Sezione del bulbo oculare destro lungo l’asse ottico: segmento anteriore a sinistra, polo posteriore e nervo ottico a destra.',
  fundus: 'Fondo oculare destro (OD) come appare all’oftalmoscopia: papilla nasale, macula temporale, arcate vascolari.',
  oct: 'Scansione B-scan OCT attraverso la fovea: gli strati retinici appaiono come bande a diversa riflettività.',
};

export type StructureId =
  | 'cornea'
  | 'camera-anteriore'
  | 'angolo'
  | 'iride'
  | 'pupilla'
  | 'cristallino'
  | 'zonula'
  | 'corpo-ciliare'
  | 'sclera'
  | 'coroide'
  | 'retina'
  | 'macula'
  | 'fovea'
  | 'papilla'
  | 'escavazione'
  | 'nervo-ottico'
  | 'vitreo'
  | 'retto-superiore'
  | 'retto-inferiore'
  | 'congiuntiva'
  | 'palpebre'
  | 'arterie'
  | 'vene'
  | 'media-periferia'
  | 'ora-serrata'
  | 'ilm'
  | 'rnfl'
  | 'gcl'
  | 'ipl'
  | 'inl'
  | 'opl'
  | 'onl'
  | 'elm'
  | 'ez'
  | 'rpe'
  | 'bruch';

export interface NormalValue {
  label: string;
  value: string;
}

export interface AnatomyStructure {
  id: StructureId;
  name: string;
  latin?: string;
  /** Viste in cui la struttura è rappresentata (la prima è quella di default) */
  views: AnatomyMode[];
  /** Colore usato in legenda e nel disegno */
  color: string;
  group: string;
  function: string;
  clinical: string;
  normals: NormalValue[];
  imaging: string[];
  /** id presenti in src/data/pathologies.ts */
  pathologies: string[];
}

export const STRUCTURES: AnatomyStructure[] = [
  /* ------------------------------------------------------- Segmento anteriore */
  {
    id: 'cornea',
    name: 'Cornea',
    latin: 'Cornea',
    views: ['sagittal'],
    color: '#7dd3fc',
    group: 'Segmento anteriore',
    function:
      'Lente trasparente e avascolare che fornisce circa due terzi del potere diottrico dell’occhio (≈ 43 D). Composta da epitelio, strato di Bowman, stroma, membrana di Descemet ed endotelio, che mantiene la deturgescenza stromale.',
    clinical:
      'Irregolarità della curvatura generano astigmatismo; l’ectasia progressiva con assottigliamento è tipica del cheratocono. Lo spessore corneale centrale (CCT) condiziona la lettura tonometrica: cornee sottili sottostimano l’IOP.',
    normals: [
      { label: 'Spessore centrale (CCT)', value: '≈ 540 µm (520–560)' },
      { label: 'Potere diottrico', value: '≈ 43 D' },
      { label: 'Raggio di curvatura anteriore', value: '7,8 mm' },
      { label: 'Diametro orizzontale', value: '11,5–12 mm' },
      { label: 'Densità endoteliale', value: '> 2000–2500 cell/mm²' },
    ],
    imaging: ['Lampada a fessura', 'Pachimetria ultrasonica/ottica', 'Tomografia corneale (Scheimpflug)', 'Topografia corneale', 'Microscopia speculare endoteliale', 'AS-OCT'],
    pathologies: ['cheratocono', 'astigmatismo', 'miopia'],
  },
  {
    id: 'camera-anteriore',
    name: 'Camera anteriore',
    latin: 'Camera anterior bulbi',
    views: ['sagittal'],
    color: '#38bdf8',
    group: 'Segmento anteriore',
    function:
      'Spazio compreso tra endotelio corneale e faccia anteriore di iride e cristallino, riempito di umor acqueo che nutre cornea e cristallino e mantiene la pressione intraoculare.',
    clinical:
      'Una camera bassa (ipermetropia, cristallino intumescente) predispone alla chiusura d’angolo. In corso di uveite anteriore si osservano cellule e flare (effetto Tyndall) fino all’ipopion.',
    normals: [
      { label: 'Profondità (ACD)', value: '≈ 3 mm (2,5–3,5)' },
      { label: 'Volume', value: '≈ 0,25 mL' },
      { label: 'Produzione umor acqueo', value: '2–3 µL/min' },
    ],
    imaging: ['Lampada a fessura (test di Van Herick)', 'Biometria ottica', 'AS-OCT', 'Scheimpflug'],
    pathologies: ['uveite', 'glaucoma', 'ipermetropia'],
  },
  {
    id: 'angolo',
    name: 'Angolo irido-corneale e trabecolato',
    latin: 'Angulus iridocornealis, reticulum trabeculare',
    views: ['sagittal'],
    color: '#a78bfa',
    group: 'Segmento anteriore',
    function:
      'Principale via di deflusso dell’umor acqueo (via convenzionale, ≈ 80–90%): il fluido attraversa il trabecolato, entra nel canale di Schlemm e raggiunge le vene episclerali.',
    clinical:
      'L’aumento delle resistenze trabecolari eleva l’IOP nel glaucoma ad angolo aperto; l’apposizione iridea all’angolo causa la chiusura d’angolo acuta, emergenza oftalmologica.',
    normals: [
      { label: 'Pressione intraoculare (IOP)', value: '10–21 mmHg' },
      { label: 'Ampiezza angolo', value: '20–45° (Shaffer 3–4)' },
    ],
    imaging: ['Gonioscopia', 'AS-OCT', 'Biomicroscopia ultrasonica (UBM)', 'Tonometria ad applanazione'],
    pathologies: ['glaucoma', 'uveite'],
  },
  {
    id: 'iride',
    name: 'Iride',
    latin: 'Iris',
    views: ['sagittal'],
    color: '#60a5fa',
    group: 'Uvea',
    function:
      'Diaframma pigmentato dell’uvea anteriore che regola la quantità di luce che entra nell’occhio tramite il muscolo sfintere (parasimpatico) e il dilatatore (simpatico) della pupilla.',
    clinical:
      'Sede di infiammazione nell’irite/iridociclite (sinechie posteriori). Neovascolarizzazione iridea (rubeosi) in retinopatia diabetica proliferante e occlusioni venose: rischio di glaucoma neovascolare.',
    normals: [{ label: 'Diametro', value: '≈ 12 mm' }],
    imaging: ['Lampada a fessura', 'AS-OCT', 'Fluorangiografia iridea'],
    pathologies: ['uveite', 'retinopatia-diabetica', 'glaucoma'],
  },
  {
    id: 'pupilla',
    name: 'Pupilla',
    latin: 'Pupilla',
    views: ['sagittal'],
    color: '#1e293b',
    group: 'Segmento anteriore',
    function:
      'Apertura centrale dell’iride che funziona da diaframma di apertura del sistema ottico: limita le aberrazioni, aumenta la profondità di campo e regola l’illuminazione retinica.',
    clinical:
      'Il difetto pupillare afferente relativo (RAPD, test della luce oscillante) è il segno chiave di neuropatia ottica monolaterale, ad esempio nella neurite ottica.',
    normals: [
      { label: 'Diametro in luce', value: '2–4 mm' },
      { label: 'Diametro al buio', value: '4–8 mm' },
      { label: 'Anisocoria fisiologica', value: '< 1 mm' },
    ],
    imaging: ['Test della luce oscillante', 'Pupillometria', 'Lampada a fessura'],
    pathologies: ['neurite-ottica', 'uveite'],
  },
  {
    id: 'cristallino',
    name: 'Cristallino',
    latin: 'Lens crystallina',
    views: ['sagittal'],
    color: '#fde68a',
    group: 'Segmento anteriore',
    function:
      'Lente biconvessa trasparente e deformabile sospesa dalla zonula. Fornisce ≈ 20 D di potere e, modificando la propria curvatura, consente l’accomodazione per la visione da vicino.',
    clinical:
      'La perdita di trasparenza (nucleare, corticale, sottocapsulare posteriore) definisce la cataratta; la riduzione età-correlata dell’elasticità causa la presbiopia.',
    normals: [
      { label: 'Spessore (LT)', value: '≈ 4 mm (aumenta con l’età)' },
      { label: 'Diametro equatoriale', value: '9–10 mm' },
      { label: 'Potere diottrico', value: '≈ 20 D' },
      { label: 'Ampiezza accomodativa', value: '≈ 14 D a 10 anni, < 1 D a 60 anni' },
    ],
    imaging: ['Lampada a fessura in midriasi (LOCS III)', 'Retroilluminazione', 'Biometria ottica', 'Scheimpflug'],
    pathologies: ['cataratta', 'presbiopia', 'ipermetropia'],
  },
  {
    id: 'zonula',
    name: 'Zonula di Zinn',
    latin: 'Zonula ciliaris',
    views: ['sagittal'],
    color: '#e2e8f0',
    group: 'Segmento anteriore',
    function:
      'Sistema di fibre elastiche che collega i processi ciliari all’equatore del cristallino; il rilasciamento delle fibre durante la contrazione del muscolo ciliare permette l’accomodazione.',
    clinical:
      'Debolezza zonulare (pseudoesfoliazione, trauma, sindrome di Marfan) può causare sublussazione del cristallino e complicare la chirurgia della cataratta.',
    normals: [],
    imaging: ['Lampada a fessura in midriasi', 'UBM'],
    pathologies: ['cataratta', 'presbiopia'],
  },
  {
    id: 'corpo-ciliare',
    name: 'Corpo ciliare',
    latin: 'Corpus ciliare',
    views: ['sagittal'],
    color: '#c084fc',
    group: 'Uvea',
    function:
      'Porzione intermedia dell’uvea: i processi ciliari (pars plicata) producono l’umor acqueo, il muscolo ciliare controlla l’accomodazione; la pars plana prosegue fino all’ora serrata.',
    clinical:
      'Bersaglio dei farmaci ipotonizzanti che riducono la produzione di acqueo (β-bloccanti, inibitori dell’anidrasi carbonica). La pars plana è la via d’accesso per iniezioni intravitreali e vitrectomia; sede della pars planite (uveite intermedia).',
    normals: [{ label: 'Lunghezza antero-posteriore', value: '≈ 6 mm' }],
    imaging: ['UBM', 'AS-OCT', 'Oftalmoscopia indiretta con indentazione'],
    pathologies: ['glaucoma', 'uveite', 'presbiopia'],
  },
  {
    id: 'congiuntiva',
    name: 'Congiuntiva',
    latin: 'Tunica conjunctiva',
    views: ['sagittal'],
    color: '#fda4af',
    group: 'Annessi',
    function:
      'Mucosa trasparente che riveste la sclera anteriore (bulbare) e la superficie interna delle palpebre (tarsale), riflettendosi nei fornici. Contribuisce al film lacrimale con le cellule caliciformi mucipare.',
    clinical:
      'L’iperemia congiuntivale va distinta dall’iniezione ciliare perilimbare, tipica di uveite anteriore e cheratite. Sede di congiuntiviti infettive e allergiche.',
    normals: [],
    imaging: ['Lampada a fessura', 'Colorazione con fluoresceina e verde di lissamina'],
    pathologies: ['uveite'],
  },
  {
    id: 'palpebre',
    name: 'Palpebre',
    latin: 'Palpebrae',
    views: ['sagittal'],
    color: '#f0abfc',
    group: 'Annessi',
    function:
      'Pliche muscolo-cutanee che proteggono il bulbo, distribuiscono il film lacrimale con l’ammiccamento e contengono il tarso e le ghiandole di Meibomio.',
    clinical:
      'Una ptosi congenita che occlude l’asse visivo nell’infanzia può determinare ambliopia da deprivazione. Disfunzioni meibomiane causano occhio secco evaporativo.',
    normals: [
      { label: 'Rima palpebrale verticale', value: '9–10 mm' },
      { label: 'MRD1', value: '4–5 mm' },
    ],
    imaging: ['Esame obiettivo', 'Lampada a fessura', 'Meibografia'],
    pathologies: ['ambliopia'],
  },
  {
    id: 'retto-superiore',
    name: 'Muscolo retto superiore',
    latin: 'Musculus rectus superior',
    views: ['sagittal'],
    color: '#f87171',
    group: 'Annessi',
    function:
      'Muscolo extraoculare innervato dalla branca superiore del III nervo cranico: elevazione (azione principale, massima in abduzione), intorsione e adduzione.',
    clinical:
      'Deficit nelle paralisi del III nervo; coinvolto negli strabismi verticali. Uno strabismo infantile non corretto può causare ambliopia.',
    normals: [{ label: 'Inserzione dal limbus', value: '≈ 7,7 mm' }],
    imaging: ['Test di motilità oculare', 'Cover test', 'Test di Hess-Lancaster', 'RM / TC orbite'],
    pathologies: ['ambliopia'],
  },
  {
    id: 'retto-inferiore',
    name: 'Muscolo retto inferiore',
    latin: 'Musculus rectus inferior',
    views: ['sagittal'],
    color: '#fb7185',
    group: 'Annessi',
    function:
      'Muscolo extraoculare innervato dalla branca inferiore del III nervo cranico: abbassamento (massimo in abduzione), extorsione e adduzione.',
    clinical:
      'È il muscolo più frequentemente ispessito nell’orbitopatia tiroidea (restrizione dell’elevazione). Può restare intrappolato nelle fratture del pavimento orbitario.',
    normals: [{ label: 'Inserzione dal limbus', value: '≈ 6,5 mm' }],
    imaging: ['Test di motilità oculare', 'Test di duzione forzata', 'RM / TC orbite'],
    pathologies: ['ambliopia'],
  },

  /* ------------------------------------------------------ Tonache e polo post. */
  {
    id: 'sclera',
    name: 'Sclera',
    latin: 'Sclera',
    views: ['sagittal'],
    color: '#f1f5f9',
    group: 'Tonache',
    function:
      'Tonaca fibrosa esterna di collagene che conferisce forma e resistenza al bulbo, offre inserzione ai muscoli extraoculari e posteriormente si continua con la guaina durale del nervo ottico (lamina cribrosa).',
    clinical:
      'L’allungamento assiale nella miopia elevata assottiglia la sclera posteriore fino allo stafiloma. Sclerite ed episclerite sono spesso associate a malattie sistemiche autoimmuni.',
    normals: [
      { label: 'Spessore al limbus', value: '≈ 0,8 mm' },
      { label: 'Spessore all’equatore', value: '≈ 0,3–0,4 mm' },
      { label: 'Lunghezza assiale del bulbo', value: '≈ 23,5 mm' },
    ],
    imaging: ['Ecografia B-scan', 'Biometria ottica (lunghezza assiale)', 'AS-OCT', 'SS-OCT'],
    pathologies: ['miopia', 'ipermetropia', 'uveite'],
  },
  {
    id: 'coroide',
    name: 'Coroide',
    latin: 'Choroidea',
    views: ['sagittal', 'oct'],
    color: '#ea580c',
    group: 'Uvea',
    function:
      'Tonaca vascolare posteriore con il più alto flusso ematico dell’organismo per unità di peso: tramite la coriocapillare nutre l’EPR e gli strati esterni della retina (fotorecettori).',
    clinical:
      'La neovascolarizzazione coroideale (CNV) è la base della DMLE essudativa; la coroide è assottigliata nella miopia patologica e coinvolta nelle uveiti posteriori (coroiditi).',
    normals: [{ label: 'Spessore subfoveale', value: '≈ 250–300 µm (si riduce con età e miopia)' }],
    imaging: ['EDI-OCT / Swept-Source OCT', 'Angiografia al verde indocianina (ICGA)', 'OCT-angiografia'],
    pathologies: ['amd', 'uveite', 'miopia'],
  },
  {
    id: 'retina',
    name: 'Retina',
    latin: 'Retina',
    views: ['sagittal'],
    color: '#fb923c',
    group: 'Tonache',
    function:
      'Tonaca nervosa interna che trasforma lo stimolo luminoso in segnale elettrico (fototrasduzione) e lo pre-elabora attraverso una catena di neuroni: fotorecettori → cellule bipolari → cellule ganglionari.',
    clinical:
      'Il distacco di retina separa la neuroretina dall’EPR ed è un’urgenza chirurgica. La microangiopatia diabetica, le occlusioni venose e le distrofie ereditarie (retinite pigmentosa) sono le principali patologie retiniche.',
    normals: [{ label: 'Spessore', value: '≈ 250 µm al polo posteriore, ≈ 100 µm in periferia' }],
    imaging: ['Oftalmoscopia / retinografia', 'OCT', 'Fluorangiografia (FAG)', 'Elettroretinogramma (ERG)'],
    pathologies: ['distacco-retina', 'retinopatia-diabetica', 'retinite-pigmentosa', 'occlusione-venosa'],
  },
  {
    id: 'vitreo',
    name: 'Corpo vitreo',
    latin: 'Corpus vitreum',
    views: ['sagittal'],
    color: '#94a3b8',
    group: 'Mezzi diottrici',
    function:
      'Gel trasparente di collagene e acido ialuronico (99% acqua) che occupa la cavità posteriore, mantiene la trasparenza del cammino ottico e sostiene la retina.',
    clinical:
      'Con l’età il gel si liquefà (sineresi) generando miodesopsie e infine distacco posteriore del vitreo, che può trazionare la retina e causare rotture e distacco. Emovitreo nella retinopatia diabetica proliferante.',
    normals: [
      { label: 'Volume', value: '≈ 4 mL (≈ 80% del bulbo)' },
      { label: 'Indice di rifrazione', value: '1,336' },
    ],
    imaging: ['Oftalmoscopia indiretta', 'Ecografia B-scan', 'OCT (interfaccia vitreo-retinica)'],
    pathologies: ['miodesopsie', 'distacco-retina', 'retinopatia-diabetica'],
  },
  {
    id: 'macula',
    name: 'Macula',
    latin: 'Macula lutea',
    views: ['sagittal', 'fundus'],
    color: '#facc15',
    group: 'Polo posteriore',
    function:
      'Area centrale della retina ricca di pigmenti xantofilli (luteina, zeaxantina) e di cellule ganglionari stratificate; responsabile della visione centrale, del dettaglio e dei colori.',
    clinical:
      'Sede della degenerazione maculare legata all’età (drusen, atrofia, CNV) e dell’edema maculare diabetico. La griglia di Amsler evidenzia metamorfopsie e scotomi centrali.',
    normals: [
      { label: 'Diametro', value: '≈ 5,5 mm' },
      { label: 'Distanza dalla papilla', value: '≈ 4,5 mm (2,5 diametri papillari)' },
      { label: 'Spessore centrale (CST)', value: '≈ 250–270 µm (dipende dallo strumento)' },
    ],
    imaging: ['OCT maculare', 'Autofluorescenza (FAF)', 'Fluorangiografia', 'OCT-angiografia', 'Griglia di Amsler'],
    pathologies: ['amd', 'edema-maculare', 'retinopatia-diabetica', 'occlusione-venosa'],
  },
  {
    id: 'fovea',
    name: 'Fovea e foveola',
    latin: 'Fovea centralis',
    views: ['sagittal', 'fundus'],
    color: '#fef08a',
    group: 'Polo posteriore',
    function:
      'Depressione centrale della macula priva di vasi e di strati retinici interni, con soli coni ad altissima densità: è il punto di massima acuità visiva su cui si focalizza l’immagine.',
    clinical:
      'La perdita del profilo foveale all’OCT indica edema o trazione; la zona avascolare foveale (FAZ) si allarga nella maculopatia ischemica diabetica. Una fissazione non foveale si associa ad ambliopia.',
    normals: [
      { label: 'Diametro fovea', value: '≈ 1,5 mm' },
      { label: 'Foveola', value: '≈ 0,35 mm' },
      { label: 'FAZ (plesso superficiale)', value: '≈ 0,25–0,35 mm²' },
      { label: 'Densità coni', value: '≈ 150.000–200.000 /mm²' },
    ],
    imaging: ['OCT', 'OCT-angiografia (FAZ)', 'Microperimetria'],
    pathologies: ['amd', 'edema-maculare', 'ambliopia'],
  },
  {
    id: 'papilla',
    name: 'Papilla ottica (disco)',
    latin: 'Discus nervi optici',
    views: ['fundus', 'sagittal'],
    color: '#fecaca',
    group: 'Nervo ottico',
    function:
      'Punto di uscita degli assoni delle cellule ganglionari e di ingresso dei vasi centrali della retina; privo di fotorecettori, corrisponde alla macchia cieca fisiologica del campo visivo.',
    clinical:
      'Valutazione di colore, margini, bordo neuroretinico (regola ISNT) ed emorragie a fiamma. Edema papillare nella neurite ottica anteriore e nell’ipertensione endocranica; escavazione progressiva nel glaucoma.',
    normals: [
      { label: 'Diametro verticale', value: '≈ 1,5–1,9 mm' },
      { label: 'Rapporto C/D', value: '< 0,5 (asimmetria tra occhi < 0,2)' },
      { label: 'Regola ISNT', value: 'Bordo: inferiore ≥ superiore ≥ nasale ≥ temporale' },
    ],
    imaging: ['Oftalmoscopia / retinografia stereo', 'OCT della testa del nervo ottico', 'Campo visivo (macchia cieca)'],
    pathologies: ['glaucoma', 'neurite-ottica'],
  },
  {
    id: 'escavazione',
    name: 'Escavazione papillare (cup)',
    latin: 'Excavatio disci',
    views: ['fundus'],
    color: '#fff7ed',
    group: 'Nervo ottico',
    function:
      'Depressione centrale pallida della papilla priva di fibre nervose, attraversata dai vasi centrali. Le sue dimensioni dipendono dalla taglia del disco.',
    clinical:
      'L’allargamento verticale della cup, la notch del bordo e l’asimmetria tra i due occhi sono segni di danno glaucomatoso; dischi grandi possono avere cup fisiologicamente ampie.',
    normals: [{ label: 'Rapporto C/D verticale', value: '< 0,5' }],
    imaging: ['Retinografia stereo', 'OCT ONH (area del bordo, BMO-MRW)'],
    pathologies: ['glaucoma'],
  },
  {
    id: 'nervo-ottico',
    name: 'Nervo ottico',
    latin: 'Nervus opticus (II)',
    views: ['sagittal'],
    color: '#fcd34d',
    group: 'Nervo ottico',
    function:
      'Secondo nervo cranico: ≈ 1,2 milioni di assoni delle cellule ganglionari mielinizzati dietro la lamina cribrosa, avvolti da guaine meningee, che conducono l’informazione visiva al chiasma.',
    clinical:
      'La neurite ottica demielinizzante (spesso associata a sclerosi multipla) dà calo visivo con dolore ai movimenti oculari e discromatopsia; il glaucoma ne causa la perdita assonale progressiva.',
    normals: [
      { label: 'Numero di assoni', value: '≈ 1,2 milioni' },
      { label: 'Lunghezza totale', value: '≈ 45–50 mm' },
      { label: 'Diametro retrobulbare', value: '≈ 3–4 mm' },
    ],
    imaging: ['RM orbite ed encefalo con gadolinio', 'Potenziali evocati visivi (PEV)', 'OCT RNFL', 'Campo visivo'],
    pathologies: ['neurite-ottica', 'glaucoma', 'discromatopsia'],
  },

  /* ----------------------------------------------------------- Fondo oculare */
  {
    id: 'arterie',
    name: 'Arteriole retiniche',
    latin: 'Arteria centralis retinae (rami)',
    views: ['fundus'],
    color: '#f87171',
    group: 'Vasi retinici',
    function:
      'Rami dell’arteria centrale della retina che irrorano gli strati interni retinici; appaiono più sottili, più chiare e con riflesso luminoso parietale più evidente delle vene.',
    clinical:
      'Restringimento, riflesso “a filo di rame/argento” e incroci artero-venosi patologici (segno di Gunn) nella retinopatia ipertensiva; l’incrocio A/V è la sede tipica delle occlusioni venose di branca.',
    normals: [
      { label: 'Rapporto calibro A/V', value: '≈ 2:3' },
      { label: 'Calibro peripapillare', value: '≈ 100 µm' },
    ],
    imaging: ['Retinografia', 'Fluorangiografia (FAG)', 'OCT-angiografia'],
    pathologies: ['occlusione-venosa', 'retinopatia-diabetica'],
  },
  {
    id: 'vene',
    name: 'Venule retiniche',
    latin: 'Vena centralis retinae (rami)',
    views: ['fundus'],
    color: '#991b1b',
    group: 'Vasi retinici',
    function:
      'Drenano il sangue degli strati interni verso la vena centrale della retina; più larghe, più scure e tortuose delle arteriole.',
    clinical:
      'Dilatazione e tortuosità con emorragie “a fiamma” nei quattro quadranti indicano un’occlusione della vena centrale; il “beading” venoso è un segno di retinopatia diabetica pre-proliferante grave.',
    normals: [{ label: 'Calibro peripapillare', value: '≈ 125–150 µm' }],
    imaging: ['Retinografia', 'Fluorangiografia (FAG)', 'OCT-angiografia'],
    pathologies: ['occlusione-venosa', 'retinopatia-diabetica'],
  },
  {
    id: 'media-periferia',
    name: 'Media periferia retinica',
    views: ['fundus'],
    color: '#fdba74',
    group: 'Periferia',
    function:
      'Area compresa tra le arcate vascolari e l’equatore, dominata dai bastoncelli: è fondamentale per la visione notturna e per il campo visivo periferico.',
    clinical:
      'Sede degli addensamenti pigmentari “a spicole ossee” nella retinite pigmentosa, delle aree di non perfusione nella retinopatia diabetica e delle degenerazioni predisponenti al distacco.',
    normals: [{ label: 'Densità bastoncelli (picco)', value: '≈ 160.000 /mm² a 4–5 mm dalla fovea' }],
    imaging: ['Oftalmoscopia indiretta', 'Retinografia widefield / ultra-widefield', 'Campo visivo periferico', 'ERG'],
    pathologies: ['retinite-pigmentosa', 'retinopatia-diabetica', 'distacco-retina'],
  },
  {
    id: 'ora-serrata',
    name: 'Ora serrata',
    latin: 'Ora serrata',
    views: ['fundus'],
    color: '#e5e7eb',
    group: 'Periferia',
    function:
      'Margine dentellato dove la retina neurosensoriale termina e si continua con l’epitelio non pigmentato della pars plana del corpo ciliare.',
    clinical:
      'Le dialisi retiniche (soprattutto post-traumatiche) e le rotture periferiche nelle degenerazioni a palizzata (lattice), più frequenti nel miope, possono evolvere in distacco regmatogeno.',
    normals: [{ label: 'Distanza dal limbus', value: '≈ 7–8 mm temporalmente, 6–7 mm nasalmente' }],
    imaging: ['Oftalmoscopia indiretta con indentazione sclerale', 'Ultra-widefield'],
    pathologies: ['distacco-retina', 'miopia'],
  },

  /* ------------------------------------------------------- Strati retinici OCT */
  {
    id: 'ilm',
    name: 'Membrana limitante interna (ILM)',
    latin: 'Membrana limitans interna',
    views: ['oct'],
    color: '#f8fafc',
    group: 'Strati retinici',
    function:
      'Membrana basale formata dai piedi delle cellule di Müller; costituisce l’interfaccia tra retina e vitreo ed è il limite superiore della misura di spessore OCT.',
    clinical:
      'Superficie su cui si sviluppano membrane epiretiniche e trazioni vitreo-maculari; viene rimossa (peeling) nella chirurgia del foro maculare.',
    normals: [],
    imaging: ['OCT'],
    pathologies: ['edema-maculare'],
  },
  {
    id: 'rnfl',
    name: 'Strato delle fibre nervose (RNFL)',
    views: ['oct'],
    color: '#ef4444',
    group: 'Strati retinici',
    function:
      'Assoni non mielinizzati delle cellule ganglionari diretti alla papilla; iper-riflettente all’OCT. Più spesso in sede peripapillare e assente nella foveola.',
    clinical:
      'Lo spessore RNFL peripapillare è il principale biomarcatore strutturale del glaucoma (assottigliamento nei settori inferiore e superiore) e documenta l’atrofia ottica dopo neurite.',
    normals: [{ label: 'RNFL peripapillare medio', value: '≈ 100 µm (90–105)' }],
    imaging: ['OCT circolare peripapillare', 'Fotografia aneritra'],
    pathologies: ['glaucoma', 'neurite-ottica'],
  },
  {
    id: 'gcl',
    name: 'Strato delle cellule ganglionari (GCL)',
    views: ['oct'],
    color: '#22c55e',
    group: 'Strati retinici',
    function:
      'Corpi cellulari delle cellule ganglionari, i neuroni di uscita della retina; massimo spessore nell’anello parafoveale (fino a 6–8 file di cellule).',
    clinical:
      'L’analisi GCL+IPL maculare (GCIPL/GCC) evidenzia precocemente il danno glaucomatoso e le neuropatie ottiche.',
    normals: [{ label: 'GCL + IPL (media)', value: '≈ 80 µm' }],
    imaging: ['OCT maculare (analisi GCIPL / GCC)'],
    pathologies: ['glaucoma', 'neurite-ottica'],
  },
  {
    id: 'ipl',
    name: 'Strato plessiforme interno (IPL)',
    views: ['oct'],
    color: '#84cc16',
    group: 'Strati retinici',
    function: 'Sinapsi tra cellule bipolari, amacrine e ganglionari; sede dell’elaborazione dei segnali ON/OFF e del movimento.',
    clinical: 'Misurato insieme al GCL (GCIPL); si assottiglia nelle neuropatie ottiche.',
    normals: [],
    imaging: ['OCT maculare'],
    pathologies: ['glaucoma'],
  },
  {
    id: 'inl',
    name: 'Strato nucleare interno (INL)',
    views: ['oct'],
    color: '#06b6d4',
    group: 'Strati retinici',
    function:
      'Nuclei delle cellule bipolari, orizzontali, amacrine e di Müller. Ai suoi margini decorrono il plesso capillare intermedio e profondo.',
    clinical: 'Sede tipica delle cisti intraretiniche nell’edema maculare diabetico e da occlusione venosa.',
    normals: [],
    imaging: ['OCT', 'OCT-angiografia (plesso profondo)'],
    pathologies: ['edema-maculare', 'retinopatia-diabetica', 'occlusione-venosa'],
  },
  {
    id: 'opl',
    name: 'Strato plessiforme esterno (OPL)',
    views: ['oct'],
    color: '#3b82f6',
    group: 'Strati retinici',
    function:
      'Sinapsi tra fotorecettori e cellule bipolari/orizzontali; nella regione foveale le fibre decorrono oblique formando lo strato di Henle.',
    clinical: 'Accumulo di essudati duri lipidici e di cisti nelle maculopatie essudative (aspetto stellato).',
    normals: [],
    imaging: ['OCT'],
    pathologies: ['edema-maculare', 'retinopatia-diabetica'],
  },
  {
    id: 'onl',
    name: 'Strato nucleare esterno (ONL)',
    views: ['oct'],
    color: '#6366f1',
    group: 'Strati retinici',
    function: 'Nuclei dei fotorecettori (≈ 6 milioni di coni e ≈ 120 milioni di bastoncelli); il più spesso in fovea dove contiene solo coni.',
    clinical: 'Si assottiglia nelle distrofie dei fotorecettori come la retinite pigmentosa; liquido intraretinico nell’edema.',
    normals: [],
    imaging: ['OCT'],
    pathologies: ['retinite-pigmentosa', 'edema-maculare'],
  },
  {
    id: 'elm',
    name: 'Membrana limitante esterna (ELM)',
    latin: 'Membrana limitans externa',
    views: ['oct'],
    color: '#e0e7ff',
    group: 'Strati retinici',
    function: 'Linea di giunzioni aderenti tra cellule di Müller e fotorecettori; sottile banda iper-riflettente.',
    clinical: 'La sua integrità è un fattore prognostico funzionale dopo terapia per edema maculare e DMLE.',
    normals: [],
    imaging: ['OCT'],
    pathologies: ['retinite-pigmentosa', 'edema-maculare'],
  },
  {
    id: 'ez',
    name: 'Zona ellissoide (EZ)',
    views: ['oct'],
    color: '#fde047',
    group: 'Strati retinici',
    function:
      'Porzione ricca di mitocondri dei segmenti interni dei fotorecettori; seconda banda iper-riflettente esterna, indice dell’integrità dei fotorecettori.',
    clinical:
      'La larghezza residua della EZ misura la progressione della retinite pigmentosa; interruzioni nelle maculopatie e nella DMLE. Disfunzioni dei coni alterano la visione dei colori.',
    normals: [],
    imaging: ['OCT', 'Microperimetria'],
    pathologies: ['retinite-pigmentosa', 'amd', 'discromatopsia'],
  },
  {
    id: 'rpe',
    name: 'Epitelio pigmentato retinico (EPR)',
    views: ['oct'],
    color: '#f97316',
    group: 'Strati retinici',
    function:
      'Monostrato di cellule pigmentate che fagocita i segmenti esterni, ricicla i retinoidi del ciclo visivo, forma la barriera emato-retinica esterna e assorbe la luce diffusa.',
    clinical:
      'Drusen, atrofia geografica e distacchi dell’EPR caratterizzano la DMLE; l’autofluorescenza evidenzia lipofuscina e aree atrofiche.',
    normals: [{ label: 'Spessore', value: '≈ 10–15 µm' }],
    imaging: ['OCT', 'Autofluorescenza (FAF)', 'Fluorangiografia'],
    pathologies: ['amd', 'retinite-pigmentosa'],
  },
  {
    id: 'bruch',
    name: 'Membrana di Bruch',
    latin: 'Lamina basalis choroideae',
    views: ['oct'],
    color: '#fbbf24',
    group: 'Strati retinici',
    function: 'Membrana pentalaminare tra EPR e coriocapillare, regola gli scambi metabolici tra coroide e retina esterna.',
    clinical:
      'Ispessimento e accumulo lipidico con l’età; drusen tra EPR e Bruch. Rotture (strie angioidi, lacche miopiche) permettono la crescita di neovasi coroideali.',
    normals: [{ label: 'Spessore', value: '≈ 2–4 µm' }],
    imaging: ['OCT', 'ICGA'],
    pathologies: ['amd', 'miopia'],
  },
];

export const STRUCTURE_BY_ID: Record<StructureId, AnatomyStructure> = Object.fromEntries(STRUCTURES.map((s) => [s.id, s])) as Record<StructureId, AnatomyStructure>;

export function structuresForMode(mode: AnatomyMode): AnatomyStructure[] {
  return STRUCTURES.filter((s) => s.views.includes(mode));
}
