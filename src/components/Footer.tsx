import { useState } from 'react';
import { AlertTriangle, Scale, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import { Logo } from './Logo';

type Doc = 'legal' | 'privacy' | 'disclaimer';

const DOCS: Record<Doc, { title: string; icon: typeof Scale; body: string[] }> = {
  legal: {
    title: 'Note Legali',
    icon: Scale,
    body: [
      'Visual Lab - Clinical Ophthalmic Platform è un’opera di Amos Santambrogio. Tutti i contenuti testuali, grafici e il codice sorgente sono protetti dalla normativa sul diritto d’autore (L. 633/1941).',
      'Le immagini cliniche dell’atlante provengono da Wikimedia Commons e sono utilizzate nel rispetto delle rispettive licenze (CC BY, CC BY-SA, CC0, pubblico dominio). Autore e licenza sono indicati in ciascun caso clinico.',
      'È vietata la riproduzione, anche parziale, dei contenuti originali senza autorizzazione scritta, salvo usi didattici non commerciali con citazione della fonte.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    icon: ShieldCheck,
    body: [
      'In modalità demo i dati (account, profilo e referti) sono memorizzati esclusivamente nel localStorage del browser e non vengono trasmessi a server esterni.',
      'Con Firebase configurato, i dati sono conservati su Google Firebase (Authentication e Cloud Firestore) e accessibili solo all’utente autenticato secondo le regole di sicurezza del progetto.',
      'Il flusso della webcam del simulatore viene elaborato localmente nel browser e non viene mai registrato né inviato. Le immagini caricate restano sul dispositivo.',
      'Non inserire dati sanitari reali di pazienti senza adeguata base giuridica (GDPR art. 9) e informativa al paziente.',
    ],
  },
  disclaimer: {
    title: 'Disclaimer Medico',
    icon: AlertTriangle,
    body: [
      'Visual Lab è uno strumento a scopo esclusivamente informativo, educativo e di sensibilizzazione. Le simulazioni sono approssimazioni della percezione soggettiva e non riproducono fedelmente l’esperienza visiva di ogni paziente.',
      'I contenuti non sostituiscono in alcun modo la visita, la diagnosi o la terapia di un medico oculista. I referti generati non hanno valore medico-legale.',
      'In presenza di sintomi improvvisi (lampi, tenda nel campo visivo, calo visivo acuto, dolore oculare) rivolgersi immediatamente a un pronto soccorso oculistico.',
    ],
  },
};

export function Footer() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const d = doc ? DOCS[doc] : null;
  return (
    <footer className="mt-16 border-t border-white/[0.06] bg-ink-950/50">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={26} />
          <p className="text-xs leading-relaxed text-slate-400">© 2026 Amos Santambrogio. Tutti i diritti riservati. Visual Lab - Clinical Ophthalmic Platform.</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {(Object.keys(DOCS) as Doc[]).map((k) => (
            <button key={k} onClick={() => setDoc(k)} className="text-slate-400 underline-offset-4 transition hover:text-cyan-300 hover:underline">
              {DOCS[k].title}
            </button>
          ))}
        </nav>
      </div>
      <Modal open={!!d} onClose={() => setDoc(null)} title={d?.title} icon={d ? <d.icon size={18} /> : null} size="sm">
        <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-slate-300">
          {d?.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </Modal>
    </footer>
  );
}
