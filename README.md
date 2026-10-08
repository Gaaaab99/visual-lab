# Visual Lab · Clinical Ophthalmic Platform

Piattaforma web interattiva per oftalmologi, optometristi, studenti di medicina e pazienti.

- **Simulatore ottico in tempo reale** di 16 patologie oculari combinabili (glaucoma, cataratta, AMD, retinopatia diabetica, distacco di retina, miopia, ipermetropia, astigmatismo, cheratocono, miodesopsie, discromatopsie, edema maculare, retinite pigmentosa, uveite, neurite ottica, ambliopia), con filtri CSS, SVG `feColorMatrix` / `feDisplacementMap` e overlay animati. Sorgenti: scene cliniche (lettura, guida notturna, città, griglia di Amsler, tavola pseudoisocromatica), webcam o immagine caricata. Preset per stadio e combinazioni cliniche, modalità di confronto a schermo diviso e generazione diretta del referto.
- **Atlante patologie** filtrabile per categoria, con descrizione, eziologia, sintomi, indagini strumentali e trattamenti.
- **Casi clinici** con immagini reali (Wikimedia Commons, licenze libere indicate su ogni caso), zoom/pan, etichette diagnostiche, diagnosi differenziale e decorso.
- **Cartella pazienti e referti** con snapshot dei parametri del simulatore, ricerca, stato (In corso / Completato) e dettaglio stampabile.
- **Autenticazione e profilo medico** con specializzazione, contatore referti e livello formativo/XP.

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
