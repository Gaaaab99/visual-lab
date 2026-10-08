import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FilePlus2,
  Flame,
  GraduationCap,
  Lightbulb,
  Lock,
  Microscope,
  ScanEye,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { levelFromXp, useApp } from '../../context/AppContext';
import { CASES } from '../../data/cases';
import { PATHOLOGIES } from '../../data/pathologies';
import { SmartImage } from '../../components/SmartImage';
import type { ViewId } from '../../types';
import { ACHIEVEMENTS, evaluateAchievements } from './achievements';

const PEARLS = [
  'Lampi e corpi mobili improvvisi richiedono un fondo oculare in midriasi entro 24 ore: fino al 15% dei distacchi posteriori di vitreo sintomatici ha una rottura retinica.',
  'Una pachimetria sottile (< 520 µm) fa sottostimare la IOP misurata con tonometro di Goldmann ed è un fattore di rischio indipendente per glaucoma.',
  'Il difetto pupillare afferente relativo (RAPD) si cerca con lo swinging flashlight test ed è assente nella cataratta anche se densa.',
  'Nella neurite ottica tipica il 65% dei casi è retrobulbare: «il paziente non vede nulla e il medico nemmeno».',
  'Il red-free (filtro verde) aumenta il contrasto di emorragie, microaneurismi e difetti dello strato delle fibre nervose.',
  'Il segno di Munson (deformazione a V della palpebra inferiore nello sguardo in basso) indica un cheratocono avanzato.',
  'La macchia rosso ciliegia nell’occlusione dell’arteria centrale è dovuta alla coroide visibile attraverso la fovea, priva di strati interni.',
  'Il glaucoma acuto ad angolo chiuso si presenta con dolore, nausea, aloni colorati e pupilla media fissa: è un’emergenza.',
  'Nei bambini l’ambliopia risponde meglio alla terapia occlusiva prima dei 7-8 anni, durante il periodo critico.',
  'Il test di Amsler quotidiano permette al paziente con AMD intermedia di accorgersi precocemente della conversione neovascolare.',
];

const dayIndex = () => Math.floor(Date.now() / 86_400_000);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

interface Props {
  onNavigate: (v: ViewId, id?: string) => void;
  onNewReport: () => void;
}

export function DashboardView({ onNavigate, onNewReport }: Props) {
  const { profile, reports } = useApp();
  const lvl = levelFromXp(profile?.xp ?? 0);
  const caseOfDay = CASES[dayIndex() % CASES.length];
  const pearl = PEARLS[dayIndex() % PEARLS.length];
  const featured = PATHOLOGIES[(dayIndex() * 7) % PATHOLOGIES.length];
  const studied = (profile?.casesStudied ?? []).filter((id) => CASES.some((c) => c.id === id)).length;
  const quiz = profile?.quizHistory ?? [];
  const bestQuiz = quiz.length ? Math.max(...quiz.map((q) => Math.round((q.score / Math.max(1, q.total)) * 100))) : null;
  const unlocked = evaluateAchievements(profile, reports);

  const activity = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });
    return days.map((d) => {
      const key = d.toISOString().slice(0, 10);
      return { d, count: reports.filter((r) => r.createdAt.slice(0, 10) === key).length };
    });
  }, [reports]);
  const maxAct = Math.max(1, ...activity.map((a) => a.count));

  const kpis: { label: string; value: string | number; hint: string; icon: LucideIcon; tone: string; view: ViewId }[] = [
    { label: 'Referti', value: reports.length, hint: `${reports.filter((r) => r.status === 'in_corso').length} in corso`, icon: ClipboardList, tone: 'from-cyan-500/20 text-cyan-300', view: 'reports' },
    { label: 'Casi studiati', value: `${studied}/${CASES.length}`, hint: `${Math.round((studied / CASES.length) * 100)}% dell’atlante`, icon: Microscope, tone: 'from-violet-500/20 text-violet-300', view: 'cases' },
    { label: 'Miglior quiz', value: bestQuiz !== null ? `${bestQuiz}%` : '—', hint: `${quiz.length} quiz completati`, icon: Brain, tone: 'from-amber-500/20 text-amber-300', view: 'quiz' },
    { label: 'Esperienza', value: `${profile?.xp ?? 0} XP`, hint: `Livello ${lvl.level} · ${lvl.title}`, icon: Flame, tone: 'from-rose-500/20 text-rose-300', view: 'dashboard' },
  ];

  const quick: { label: string; desc: string; icon: LucideIcon; view: ViewId }[] = [
    { label: 'Simulatore', desc: 'Mostra al paziente cosa vede', icon: Eye, view: 'simulator' },
    { label: 'Anatomia', desc: 'Esplora il bulbo oculare', icon: ScanEye, view: 'anatomy' },
    { label: 'Quiz', desc: 'Mettiti alla prova', icon: Brain, view: 'quiz' },
    { label: 'Strumenti', desc: 'Calcolatori e test', icon: Calculator, view: 'tools' },
  ];

  const recent = reports.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-ink-800 via-ink-850 to-ink-900 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl" />
        <HeroEye />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {greeting()}, {profile?.displayName?.split(' ').slice(0, 2).join(' ') ?? 'collega'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {profile?.role} · {profile?.specialization}
            {profile?.institution ? ` · ${profile.institution}` : ''}
          </p>
          <div className="mt-5 max-w-md">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <GraduationCap size={14} className="text-cyan-300" /> Livello {lvl.level} · {lvl.title}
              </span>
              <span className="font-mono text-slate-500">{lvl.nextAt ? `${profile?.xp ?? 0}/${lvl.nextAt} XP` : 'MAX'}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-950/70">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" initial={{ width: 0 }} animate={{ width: `${lvl.progress * 100}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => onNavigate('simulator')}>
              <Eye size={16} /> Apri simulatore
            </button>
            <button className="btn-ghost" onClick={onNewReport}>
              <FilePlus2 size={16} /> Nuovo referto
            </button>
          </div>
        </div>
      </section>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.button
            key={k.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            onClick={() => onNavigate(k.view)}
            className={`group rounded-2xl border border-white/[0.06] bg-gradient-to-br ${k.tone.split(' ')[0]} to-transparent p-4 text-left transition-colors hover:border-white/15`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{k.label}</span>
              <k.icon size={17} className={k.tone.split(' ')[1]} />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{k.value}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{k.hint}</p>
          </motion.button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* caso del giorno */}
        <button onClick={() => onNavigate('cases', caseOfDay.id)} className="group panel overflow-hidden text-left xl:col-span-2">
          <div className="grid sm:grid-cols-[1.1fr_1fr]">
            <div className="relative aspect-[4/3] bg-black sm:aspect-auto sm:min-h-64">
              <SmartImage src={caseOfDay.image.src} alt={caseOfDay.title} wrapperClassName="absolute inset-0" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-cyan-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                <Sparkles size={11} /> Caso del giorno
              </span>
            </div>
            <div className="flex flex-col p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{caseOfDay.modality}</span>
              <h3 className="mt-1 text-lg font-semibold text-white">Paziente di {caseOfDay.patient.age} anni</h3>
              <p className="mt-2 text-sm italic leading-relaxed text-slate-300">“{caseOfDay.chiefComplaint}”</p>
              <p className="mt-3 line-clamp-3 text-sm text-slate-400">{caseOfDay.history}</p>
              <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-cyan-300">
                Formula la diagnosi <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </button>

        {/* perla clinica */}
        <div className="panel flex flex-col p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Lightbulb size={14} /> Perla clinica
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-200">{pearl}</p>
          <div className="mt-auto border-t border-white/[0.06] pt-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Patologia in evidenza</p>
            <button onClick={() => onNavigate('archive', featured.id)} className="group mt-1 flex w-full items-center gap-2 text-left">
              <BookOpen size={15} className="text-cyan-300" />
              <span className="flex-1 text-sm font-medium text-white group-hover:text-cyan-100">{featured.name}</span>
              <ArrowRight size={14} className="text-slate-500 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* referti recenti */}
        <div className="panel overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <ClipboardList size={16} className="text-cyan-300" /> Referti recenti
            </p>
            <button className="text-xs text-cyan-300 hover:underline" onClick={() => onNavigate('reports')}>
              Vedi tutti
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Nessun referto. Generane uno dal simulatore o creane uno nuovo.</p>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {recent.map((r) => (
                <li key={r.id}>
                  <button onClick={() => onNavigate('reports', r.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-xs font-semibold text-white">
                      {r.patientName
                        .split(' ')
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{r.patientName}</span>
                      <span className="block truncate text-xs text-slate-500">{r.diagnosis || r.patientCode}</span>
                    </span>
                    {r.status === 'completato' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Clock size={16} className="text-amber-400" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-white/[0.06] px-5 py-4">
            <p className="mb-3 text-[11px] uppercase tracking-wider text-slate-500">Referti creati · ultimi 14 giorni</p>
            <div className="flex h-20 items-end gap-1.5">
              {activity.map((a, i) => (
                <div key={i} className="group relative flex-1" title={`${a.d.toLocaleDateString('it-IT')}: ${a.count}`}>
                  <motion.div
                    className={`w-full rounded-t ${a.count ? 'bg-gradient-to-t from-blue-600 to-cyan-400' : 'bg-white/[0.05]'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(6, (a.count / maxAct) * 80)}px` }}
                    transition={{ delay: i * 0.02, duration: 0.5 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* accesso rapido + traguardi */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {quick.map((q) => (
              <button key={q.label} onClick={() => onNavigate(q.view)} className="group panel p-4 text-left transition-colors hover:border-cyan-400/30">
                <q.icon size={20} className="text-cyan-300" />
                <p className="mt-2 text-sm font-medium text-white">{q.label}</p>
                <p className="text-[11px] text-slate-500">{q.desc}</p>
              </button>
            ))}
          </div>
          <div className="panel p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Trophy size={16} className="text-amber-300" /> Traguardi
              <span className="ml-auto text-xs text-slate-500">
                {unlocked.size}/{ACHIEVEMENTS.length}
              </span>
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {ACHIEVEMENTS.map((a) => {
                const ok = unlocked.has(a.id);
                return (
                  <div
                    key={a.id}
                    title={`${a.title}: ${a.description}`}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition-colors ${
                      ok ? 'border-amber-300/30 bg-gradient-to-br from-amber-400/20 to-orange-500/10 text-amber-200' : 'border-white/[0.06] bg-ink-900/40 text-slate-600'
                    }`}
                  >
                    {ok ? <a.icon size={20} /> : <Lock size={16} />}
                    <span className="mt-1 line-clamp-1 px-1 text-[9px] font-medium">{a.title}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Award size={12} /> Passa il mouse su un badge per i requisiti.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroEye() {
  return (
    <svg viewBox="0 0 400 260" className="pointer-events-none absolute -right-24 top-1/2 hidden h-[115%] -translate-y-1/2 opacity-40 lg:block xl:-right-10 xl:opacity-60" aria-hidden>
      <defs>
        <radialGradient id="he-iris" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0b1120" />
          <stop offset="0.32" stopColor="#0b1120" />
          <stop offset="0.36" stopColor="#0e7490" />
          <stop offset="0.75" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
        <linearGradient id="he-stroke" x1="0" x2="1">
          <stop offset="0" stopColor="#06b6d4" stopOpacity="0" />
          <stop offset="0.5" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path d="M20 130 C 110 20, 290 20, 380 130 C 290 240, 110 240, 20 130 Z" fill="none" stroke="url(#he-stroke)" strokeWidth="2" />
      <motion.g animate={{ x: [0, 14, -10, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}>
        <circle cx="200" cy="130" r="70" fill="url(#he-iris)" opacity="0.9" />
        {Array.from({ length: 36 }).map((_, i) => {
          const a = (i / 36) * Math.PI * 2;
          return <line key={i} x1={200 + Math.cos(a) * 28} y1={130 + Math.sin(a) * 28} x2={200 + Math.cos(a) * 66} y2={130 + Math.sin(a) * 66} stroke="#67e8f9" strokeOpacity="0.18" />;
        })}
        <circle cx="222" cy="108" r="9" fill="#e0f2fe" opacity="0.8" />
      </motion.g>
      {[60, 90, 120].map((r, i) => (
        <motion.circle
          key={r}
          cx="200"
          cy="130"
          r={r}
          fill="none"
          stroke="#06b6d4"
          strokeOpacity="0.15"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 4, delay: i * 0.8, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}
