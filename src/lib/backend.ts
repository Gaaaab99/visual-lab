import type { AppUser, Report, ReportDraft, UserProfile } from '../types';

/**
 * Astrazione di persistenza. Se le variabili VITE_FIREBASE_* sono presenti
 * viene usato Firebase (Auth + Firestore), altrimenti un backend demo offline
 * reattivo con persistenza su localStorage.
 */
export interface Backend {
  readonly mode: 'firebase' | 'demo';
  onAuthChange(cb: (user: AppUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, profile: Omit<UserProfile, 'uid' | 'email' | 'xp' | 'casesStudied' | 'createdAt'>): Promise<void>;
  signOut(): Promise<void>;
  getProfile(user: AppUser): Promise<UserProfile>;
  updateProfile(uid: string, patch: Partial<UserProfile>): Promise<UserProfile>;
  listReports(uid: string): Promise<Report[]>;
  saveReport(uid: string, draft: ReportDraft): Promise<Report>;
  deleteReport(uid: string, id: string): Promise<void>;
  /** Collezioni generiche del gestionale negozio (clienti, buste, magazzino…) */
  listDocs<T extends { id: string }>(uid: string, collection: string): Promise<T[]>;
  putDoc<T extends { id: string }>(uid: string, collection: string, doc: T): Promise<T>;
  removeDoc(uid: string, collection: string, id: string): Promise<void>;
  getDoc<T>(uid: string, collection: string, id: string): Promise<T | null>;
}

export class BackendError extends Error {}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const newId = uid;

export function defaultProfile(user: AppUser, partial?: Partial<UserProfile>): UserProfile {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.email.split('@')[0] ?? 'Utente',
    role: 'Oftalmologo',
    specialization: 'Oftalmologia generale',
    institution: '',
    xp: 0,
    casesStudied: [],
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

/* ======================================================================= */
/*                               DEMO BACKEND                               */
/* ======================================================================= */

interface DemoAccount {
  uid: string;
  email: string;
  passwordHash: string;
}

const LS = {
  accounts: 'visuallab.accounts',
  session: 'visuallab.session',
  profile: (u: string) => `visuallab.profile.${u}`,
  reports: (u: string) => `visuallab.reports.${u}`,
  col: (u: string, c: string) => `visuallab.${c}.${u}`,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota o storage bloccato: la sessione resta in memoria */
  }
}

async function hash(text: string): Promise<string> {
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`visuallab:${text}`));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return btoa(text);
}

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export const DEMO_ACCOUNT = { email: 'demo@visuallab.it', password: 'visuallab' };

class DemoBackend implements Backend {
  readonly mode = 'demo' as const;
  private listeners = new Set<(u: AppUser | null) => void>();

  private current(): AppUser | null {
    return read<AppUser | null>(LS.session, null);
  }

  private emit() {
    const u = this.current();
    this.listeners.forEach((l) => l(u));
  }

  onAuthChange(cb: (user: AppUser | null) => void) {
    this.listeners.add(cb);
    queueMicrotask(() => cb(this.current()));
    const onStorage = (e: StorageEvent) => e.key === LS.session && cb(this.current());
    window.addEventListener('storage', onStorage);
    return () => {
      this.listeners.delete(cb);
      window.removeEventListener('storage', onStorage);
    };
  }

  private async ensureDemoAccount() {
    const accounts = read<DemoAccount[]>(LS.accounts, []);
    if (accounts.some((a) => a.email === DEMO_ACCOUNT.email)) return;
    const account: DemoAccount = { uid: 'demo-user', email: DEMO_ACCOUNT.email, passwordHash: await hash(DEMO_ACCOUNT.password) };
    write(LS.accounts, [...accounts, account]);
    write(
      LS.profile(account.uid),
      defaultProfile(account, {
        displayName: 'Dr.ssa Giulia Ferri',
        role: 'Oftalmologo',
        specialization: 'Retina medica e chirurgica',
        institution: 'Ambulatorio Visual Lab',
        xp: 340,
      }),
    );
    const { seedReports } = await import('../data/seedReports');
    write(LS.reports(account.uid), seedReports());
  }

  async signIn(email: string, password: string) {
    await this.ensureDemoAccount();
    await delay();
    const accounts = read<DemoAccount[]>(LS.accounts, []);
    const acc = accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    if (!acc || acc.passwordHash !== (await hash(password))) throw new BackendError('Credenziali non valide.');
    write(LS.session, { uid: acc.uid, email: acc.email });
    this.emit();
  }

  async signUp(email: string, password: string, profile: Omit<UserProfile, 'uid' | 'email' | 'xp' | 'casesStudied' | 'createdAt'>) {
    await delay();
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new BackendError('Indirizzo email non valido.');
    if (password.length < 6) throw new BackendError('La password deve contenere almeno 6 caratteri.');
    const accounts = read<DemoAccount[]>(LS.accounts, []);
    if (accounts.some((a) => a.email === normalized)) throw new BackendError('Esiste già un account con questa email.');
    const acc: DemoAccount = { uid: uid(), email: normalized, passwordHash: await hash(password) };
    write(LS.accounts, [...accounts, acc]);
    write(LS.profile(acc.uid), defaultProfile(acc, profile));
    write(LS.reports(acc.uid), []);
    write(LS.session, { uid: acc.uid, email: acc.email });
    this.emit();
  }

  async signOut() {
    localStorage.removeItem(LS.session);
    this.emit();
  }

  async getProfile(user: AppUser) {
    return read<UserProfile>(LS.profile(user.uid), defaultProfile(user));
  }

  async updateProfile(userId: string, patch: Partial<UserProfile>) {
    const session = this.current();
    const prev = read<UserProfile>(LS.profile(userId), defaultProfile({ uid: userId, email: session?.email ?? '' }));
    const next = { ...prev, ...patch, uid: userId };
    write(LS.profile(userId), next);
    return next;
  }

  async listReports(userId: string) {
    await delay(150);
    return read<Report[]>(LS.reports(userId), []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveReport(userId: string, draft: ReportDraft) {
    await delay(180);
    const all = read<Report[]>(LS.reports(userId), []);
    const now = new Date().toISOString();
    const existing = draft.id ? all.find((r) => r.id === draft.id) : undefined;
    const report: Report = { ...draft, id: existing?.id ?? uid(), createdAt: existing?.createdAt ?? now, updatedAt: now };
    write(LS.reports(userId), existing ? all.map((r) => (r.id === report.id ? report : r)) : [report, ...all]);
    return report;
  }

  async deleteReport(userId: string, id: string) {
    await delay(120);
    write(
      LS.reports(userId),
      read<Report[]>(LS.reports(userId), []).filter((r) => r.id !== id),
    );
  }

  async listDocs<T extends { id: string }>(userId: string, collection: string) {
    return read<T[]>(LS.col(userId, collection), []);
  }

  async putDoc<T extends { id: string }>(userId: string, collection: string, doc: T) {
    const all = read<T[]>(LS.col(userId, collection), []);
    const exists = all.some((d) => d.id === doc.id);
    write(LS.col(userId, collection), exists ? all.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...all]);
    return doc;
  }

  async removeDoc(userId: string, collection: string, id: string) {
    write(
      LS.col(userId, collection),
      read<{ id: string }[]>(LS.col(userId, collection), []).filter((d) => d.id !== id),
    );
  }

  async getDoc<T>(userId: string, collection: string, id: string) {
    const all = read<(T & { id: string })[]>(LS.col(userId, collection), []);
    return all.find((d) => d.id === id) ?? null;
  }
}

/* ======================================================================= */
/*                              FIREBASE BACKEND                            */
/* ======================================================================= */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

const firebaseErrors: Record<string, string> = {
  'auth/invalid-credential': 'Credenziali non valide.',
  'auth/wrong-password': 'Credenziali non valide.',
  'auth/user-not-found': 'Nessun account associato a questa email.',
  'auth/email-already-in-use': 'Esiste già un account con questa email.',
  'auth/weak-password': 'La password deve contenere almeno 6 caratteri.',
  'auth/invalid-email': 'Indirizzo email non valido.',
  'auth/network-request-failed': 'Connessione di rete assente.',
  'auth/too-many-requests': 'Troppi tentativi, riprova più tardi.',
};

function translate(e: unknown): BackendError {
  const code = (e as { code?: string })?.code ?? '';
  return new BackendError(firebaseErrors[code] ?? (e instanceof Error ? e.message : 'Errore imprevisto.'));
}

class FirebaseBackend implements Backend {
  readonly mode = 'firebase' as const;
  private sdk = (async () => {
    const [{ initializeApp }, auth, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = initializeApp(firebaseConfig);
    const db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() });
    return { auth, fs, a: auth.getAuth(app), db };
  })();

  onAuthChange(cb: (user: AppUser | null) => void) {
    let unsub = () => {};
    let cancelled = false;
    this.sdk.then(({ auth, a }) => {
      if (cancelled) return;
      unsub = auth.onAuthStateChanged(a, (u) => cb(u ? { uid: u.uid, email: u.email ?? '' } : null));
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }

  async signIn(email: string, password: string) {
    const { auth, a } = await this.sdk;
    try {
      await auth.signInWithEmailAndPassword(a, email.trim(), password);
    } catch (e) {
      throw translate(e);
    }
  }

  async signUp(email: string, password: string, profile: Omit<UserProfile, 'uid' | 'email' | 'xp' | 'casesStudied' | 'createdAt'>) {
    const { auth, a, fs, db } = await this.sdk;
    try {
      const cred = await auth.createUserWithEmailAndPassword(a, email.trim(), password);
      await auth.updateProfile(cred.user, { displayName: profile.displayName });
      await fs.setDoc(fs.doc(db, 'users', cred.user.uid), defaultProfile({ uid: cred.user.uid, email: cred.user.email ?? email }, profile));
    } catch (e) {
      throw translate(e);
    }
  }

  async signOut() {
    const { auth, a } = await this.sdk;
    await auth.signOut(a);
  }

  async getProfile(user: AppUser) {
    const { fs, db } = await this.sdk;
    const snap = await fs.getDoc(fs.doc(db, 'users', user.uid));
    if (snap.exists()) return { ...defaultProfile(user), ...(snap.data() as UserProfile) };
    const p = defaultProfile(user);
    await fs.setDoc(fs.doc(db, 'users', user.uid), p);
    return p;
  }

  async updateProfile(userId: string, patch: Partial<UserProfile>) {
    const { fs, db } = await this.sdk;
    const ref = fs.doc(db, 'users', userId);
    await fs.setDoc(ref, patch, { merge: true });
    const snap = await fs.getDoc(ref);
    return snap.data() as UserProfile;
  }

  async listReports(userId: string) {
    const { fs, db } = await this.sdk;
    const q = fs.query(fs.collection(db, 'users', userId, 'reports'), fs.orderBy('updatedAt', 'desc'));
    const snap = await fs.getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as Report), id: d.id }));
  }

  async saveReport(userId: string, draft: ReportDraft) {
    const { fs, db } = await this.sdk;
    const now = new Date().toISOString();
    const id = draft.id ?? uid();
    const ref = fs.doc(db, 'users', userId, 'reports', id);
    const prev = draft.id ? await fs.getDoc(ref) : null;
    const report: Report = {
      ...draft,
      id,
      createdAt: (prev?.exists() && (prev.data() as Report).createdAt) || now,
      updatedAt: now,
    };
    await fs.setDoc(ref, JSON.parse(JSON.stringify(report)));
    return report;
  }

  async deleteReport(userId: string, id: string) {
    const { fs, db } = await this.sdk;
    await fs.deleteDoc(fs.doc(db, 'users', userId, 'reports', id));
  }

  async listDocs<T extends { id: string }>(userId: string, collection: string) {
    const { fs, db } = await this.sdk;
    const snap = await fs.getDocs(fs.collection(db, 'users', userId, collection));
    return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
  }

  async putDoc<T extends { id: string }>(userId: string, collection: string, doc: T) {
    const { fs, db } = await this.sdk;
    await fs.setDoc(fs.doc(db, 'users', userId, collection, doc.id), JSON.parse(JSON.stringify(doc)));
    return doc;
  }

  async removeDoc(userId: string, collection: string, id: string) {
    const { fs, db } = await this.sdk;
    await fs.deleteDoc(fs.doc(db, 'users', userId, collection, id));
  }

  async getDoc<T>(userId: string, collection: string, id: string) {
    const { fs, db } = await this.sdk;
    const snap = await fs.getDoc(fs.doc(db, 'users', userId, collection, id));
    return snap.exists() ? (snap.data() as T) : null;
  }
}

export const backend: Backend = isFirebaseConfigured ? new FirebaseBackend() : new DemoBackend();
