# Visual Lab · Clinical Ophthalmic Platform

Piattaforma web interattiva per oftalmologi, optometristi, studenti di medicina e pazienti.

- **Simulatore ottico in tempo reale** di 16 patologie oculari combinabili (glaucoma, cataratta, AMD, retinopatia diabetica, distacco di retina, miopia, ipermetropia, astigmatismo, cheratocono, miodesopsie, discromatopsie, edema maculare, retinite pigmentosa, uveite, neurite ottica, ambliopia), con filtri CSS, SVG `feColorMatrix` / `feDisplacementMap` e overlay animati. Sorgenti: scene cliniche (lettura, guida notturna, città, griglia di Amsler, tavola pseudoisocromatica), webcam o immagine caricata. Preset per stadio e combinazioni cliniche, modalità di confronto a schermo diviso e generazione diretta del referto.
- **Atlante patologie** (34 schede) filtrabile per categoria, con descrizione, eziologia, sintomi, indagini strumentali e trattamenti.
- **Casi clinici** (17) con immagini reali, modalità diagnosi a scelta multipla, filtro red-free (Wikimedia Commons, licenze libere indicate su ogni caso), zoom/pan, etichette diagnostiche, diagnosi differenziale e decorso.
- **Cartella pazienti e referti** con snapshot dei parametri del simulatore, ricerca, stato (In corso / Completato) e dettaglio stampabile.
- **Autenticazione e profilo medico** con specializzazione, contatore referti, livello formativo/XP e traguardi.
- **Dashboard** con caso del giorno, perla clinica, attività recente e accesso rapido.
- **Anatomia interattiva**: sezione sagittale del bulbo, fondo oculare e strati retinici OCT cliccabili, con valori normali e patologie correlate.
- **Quiz clinico**: 75 domande (anche su immagini reali) con modalità a tempo, spiegazioni e storico dei risultati.
- **Strumenti clinici**: convertitore di acuità visiva, ottotipo ETDRS, correzione IOP/pachimetria, distanza al vertice, trasposizione del cilindro, calcolo IOL SRK/II, test di Ishihara e griglia di Amsler interattiva.

Il simulatore include anche la visione contingente allo sguardo (i deficit seguono il puntatore), la riproduzione animata della progressione, lo schermo intero e una spiegazione in linguaggio semplice per il paziente. I referti hanno una vista per paziente con andamento di visus e IOP, esportazione CSV, backup/importazione JSON e stampa.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · lucide-react · motion · Firebase (Auth + Firestore)

## Avvio

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build di produzione in dist/
```

## Firebase (opzionale)

Senza configurazione l'app funziona in **modalità demo offline**: account, profilo e referti sono salvati nel `localStorage` del browser. È disponibile l'account demo `demo@visuallab.it` / `visuallab`.

Per usare Firebase copia `.env.example` in `.env.local` e compila le variabili `VITE_FIREBASE_*`. Abilita Email/Password in Authentication e crea un database Firestore. Regole consigliate:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Struttura

```
src/
  components/        TopNav, Footer, Modal, AuthScreen, ProfileModal, SmartImage…
  context/           AppContext (auth, profilo, referti, notifiche)
  data/              pathologies, cases, seedReports
  features/
    simulator/       engine (modello di rendering), Viewport, scene SVG, controlli
    archive/         atlante patologie
    cases/           casi clinici con zoom
    reports/         gestione referti
  lib/backend.ts     astrazione Firebase / demo localStorage
```

## Disclaimer

Strumento a scopo informativo ed educativo: le simulazioni approssimano la percezione soggettiva e non sostituiscono la valutazione di un medico oculista.

© 2026 Amos Santambrogio. Tutti i diritti riservati. Visual Lab - Clinical Ophthalmic Platform.
