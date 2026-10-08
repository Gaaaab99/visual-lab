import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Eye, Loader2, LogIn, PackageOpen, ShoppingCart, UserPlus, Users, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEMO_ACCOUNT } from '../lib/backend';
import type { ProfessionalRole } from '../types';
import { Logo } from './Logo';

const ROLES: ProfessionalRole[] = ['Oftalmologo', 'Optometrista', 'Ortottista', 'Specializzando', 'Studente di Medicina', 'Paziente'];

const FEATURES = [
  { icon: Users, title: 'Schede clienti', text: 'Prescrizioni, lenti a contatto, consensi GDPR e storico acquisti.' },
  { icon: PackageOpen, title: 'Buste e laboratorio', text: 'Ordini, centratura, consegna, garanzia e dichiarazione di conformità.' },
  { icon: ShoppingCart, title: 'Cassa e magazzino', text: 'Vendite, scorte, richiami ed esportazione per il Sistema TS.' },
  { icon: Eye, title: 'Area clinica', text: 'Simulatore di patologie, atlante, casi clinici, anatomia e quiz.' },
];

export function AuthScreen() {
  const { signIn, signUp, mode } = useApp();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<ProfessionalRole>('Oftalmologo');
  const [specialization, setSpecialization] = useState('');
  const [institution, setInstitution] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === 'login') await signIn(email, password);
      else
        await signUp(email, password, {
          displayName: displayName.trim() || email.split('@')[0],
          role,
          specialization: specialization.trim() || (role === 'Paziente' ? '—' : 'Oftalmologia generale'),
          institution: institution.trim(),
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto.');
    } finally {
      setBusy(false);
    }
  };

  const demo = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.06] bg-ink-850/70 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] p-10 lg:flex">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <Logo size={44} />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Visual Lab</h1>
                <p className="text-sm text-cyan-300/80">Clinical Ophthalmic Platform</p>
              </div>
            </div>
            <p className="mt-8 max-w-sm text-[15px] leading-relaxed text-slate-300">
              Il gestionale per il centro ottico: clienti, buste di lavoro, cassa, magazzino e agenda, con un’area clinica per spiegare ai clienti cosa vedono e formarsi ogni giorno.
            </p>
          </div>
          <ul className="relative mt-10 grid gap-4">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <motion.li key={title} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-sm text-slate-400">{text}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Logo size={36} />
            <div>
              <h1 className="text-xl font-semibold text-white">Visual Lab</h1>
              <p className="text-xs text-cyan-300/80">Clinical Ophthalmic Platform</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-ink-900/60 p-1">
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
                className={`relative rounded-lg py-2 text-sm font-medium transition ${tab === t ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {tab === t && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/25 to-blue-500/25 ring-1 ring-cyan-400/30" />}
                <span className="relative">{t === 'login' ? 'Accedi' : 'Registrati'}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <AnimatePresence initial={false}>
              {tab === 'signup' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                  <div>
                    <label className="label" htmlFor="name">Nome e titolo</label>
                    <input id="name" className="input" placeholder="Dr. Mario Rossi" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="role">Profilo</label>
                      <select id="role" className="input" value={role} onChange={(e) => setRole(e.target.value as ProfessionalRole)}>
                        {ROLES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="spec">Specializzazione</label>
                      <input id="spec" className="input" placeholder="Glaucoma, Retina…" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="inst">Struttura / Università</label>
                    <input id="inst" className="input" placeholder="Ospedale, ambulatorio o ateneo" value={institution} onChange={(e) => setInstitution(e.target.value)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" className="input" placeholder="nome@ospedale.it" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="pw">Password</label>
              <input
                id="pw"
                type="password"
                required
                minLength={6}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                className="input"
                placeholder="Almeno 6 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? <Loader2 size={16} className="animate-spin" /> : tab === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
              {tab === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          </form>

          {mode === 'demo' && (
            <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
              <div className="flex items-start gap-3">
                <WifiOff size={18} className="mt-0.5 shrink-0 text-amber-300" />
                <div className="text-sm">
                  <p className="font-medium text-amber-100">Modalità demo offline</p>
                  <p className="mt-1 text-amber-100/70">Firebase non è configurato: account e referti vengono salvati in modo persistente nel browser (localStorage).</p>
                  <button type="button" onClick={demo} disabled={busy} className="btn-ghost mt-3 border-amber-300/30 text-amber-100">
                    <Activity size={15} /> Entra con l’account demo
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
