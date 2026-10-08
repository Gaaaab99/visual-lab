import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backend, BackendError } from '../lib/backend';
import type { AppUser, Report, ReportDraft, UserProfile } from '../types';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface AppContextValue {
  mode: 'firebase' | 'demo';
  authReady: boolean;
  user: AppUser | null;
  profile: UserProfile | null;
  reports: Report[];
  reportsLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profile: Pick<UserProfile, 'displayName' | 'role' | 'specialization' | 'institution'>) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  saveReport: (draft: ReportDraft) => Promise<Report>;
  deleteReport: (id: string) => Promise<void>;
  markCaseStudied: (caseId: string) => void;
  /** Assegna XP all'utente con notifica; `patch` aggiorna altri campi del profilo nello stesso salvataggio */
  awardXp: (amount: number, reason: string, patch?: Partial<UserProfile>) => Promise<void>;
  toasts: Toast[];
  notify: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppContextValue | null>(null);

export const XP = { report: 50, reportCompleted: 25, caseStudied: 20 };

export function levelFromXp(xp: number) {
  const thresholds = [
    { min: 0, title: 'Tirocinante' },
    { min: 150, title: 'Specializzando I anno' },
    { min: 400, title: 'Specializzando senior' },
    { min: 800, title: 'Oftalmologo' },
    { min: 1500, title: 'Esperto clinico' },
    { min: 2500, title: 'Primario' },
  ];
  let idx = 0;
  thresholds.forEach((t, i) => xp >= t.min && (idx = i));
  const cur = thresholds[idx];
  const next = thresholds[idx + 1];
  return {
    level: idx + 1,
    title: cur.title,
    progress: next ? (xp - cur.min) / (next.min - cur.min) : 1,
    nextAt: next?.min ?? null,
  };
}

let toastSeq = 1;

export function AppProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback(
    (text: string, kind: Toast['kind'] = 'success') => {
      const id = toastSeq++;
      setToasts((t) => [...t, { id, kind, text }]);
      setTimeout(() => dismissToast(id), 3800);
    },
    [dismissToast],
  );

  useEffect(
    () =>
      backend.onAuthChange((u) => {
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setReports([]);
      return;
    }
    let alive = true;
    setReportsLoading(true);
    Promise.all([backend.getProfile(user), backend.listReports(user.uid)])
      .then(([p, r]) => {
        if (!alive) return;
        setProfile(p);
        setReports(r);
      })
      .catch(() => alive && notify('Impossibile caricare i dati del profilo.', 'error'))
      .finally(() => alive && setReportsLoading(false));
    return () => {
      alive = false;
    };
  }, [user, notify]);

  const addXp = useCallback(
    async (amount: number, extra?: Partial<UserProfile>) => {
      if (!user || !profile) return;
      const next = await backend.updateProfile(user.uid, { xp: profile.xp + amount, ...extra });
      setProfile(next);
    },
    [user, profile],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      mode: backend.mode,
      authReady,
      user,
      profile,
      reports,
      reportsLoading,
      toasts,
      notify,
      dismissToast,
      signIn: (email, password) => backend.signIn(email, password),
      signUp: (email, password, p) => backend.signUp(email, password, p),
      signOut: async () => {
        await backend.signOut();
        notify('Sessione terminata.', 'info');
      },
      updateProfile: async (patch) => {
        if (!user) return;
        setProfile(await backend.updateProfile(user.uid, patch));
        notify('Profilo aggiornato.');
      },
      saveReport: async (draft) => {
        if (!user) throw new BackendError('Sessione scaduta.');
        const prev = draft.id ? reports.find((r) => r.id === draft.id) : undefined;
        const saved = await backend.saveReport(user.uid, draft);
        setReports((rs) => [saved, ...rs.filter((r) => r.id !== saved.id)]);
        let gained = prev ? 0 : XP.report;
        if (saved.status === 'completato' && prev?.status !== 'completato') gained += XP.reportCompleted;
        if (gained) await addXp(gained);
        notify(prev ? 'Referto aggiornato.' : `Referto salvato · +${gained} XP`);
        return saved;
      },
      deleteReport: async (id) => {
        if (!user) return;
        await backend.deleteReport(user.uid, id);
        setReports((rs) => rs.filter((r) => r.id !== id));
        notify('Referto eliminato.', 'info');
      },
      awardXp: async (amount, reason, patch) => {
        await addXp(amount, patch);
        if (amount > 0) notify(`${reason} · +${amount} XP`);
      },
      markCaseStudied: (caseId) => {
        if (!profile || profile.casesStudied.includes(caseId)) return;
        addXp(XP.caseStudied, { casesStudied: [...profile.casesStudied, caseId] }).then(() => notify(`Caso clinico studiato · +${XP.caseStudied} XP`));
      },
    }),
    [authReady, user, profile, reports, reportsLoading, toasts, notify, dismissToast, addXp],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp deve essere usato dentro <AppProvider>');
  return v;
}
