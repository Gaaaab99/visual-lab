import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { backend } from '../lib/backend';
import { useApp } from '../context/AppContext';
import type { Appointment, Customer, Order, Product, Sale, StockMovement, StoreSettings } from './types';
import { newId } from './utils';

export const DEFAULT_SETTINGS: StoreSettings = {
  id: 'settings',
  businessName: 'Ottica Visual Lab',
  vatNumber: '',
  fiscalCode: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  optician: '',
  opticianRegistration: '',
  manufacturerRegistration: '',
  orderPrefix: 'B',
  defaultLab: 'Laboratorio interno',
  openingHours: 'Lun–Sab 9:00–12:30 · 15:30–19:30',
  messageSignature: 'Il tuo centro ottico',
  loyaltyEuroPerPoint: 1,
};

interface Collections {
  customers: Customer[];
  products: Product[];
  movements: StockMovement[];
  orders: Order[];
  sales: Sale[];
  appointments: Appointment[];
}

type CollectionName = keyof Collections;
type Item<K extends CollectionName> = Collections[K][number];

interface StoreValue extends Collections {
  ready: boolean;
  settings: StoreSettings;
  saveSettings: (s: StoreSettings) => Promise<void>;
  /** Inserisce o aggiorna un documento della collezione */
  put: <K extends CollectionName>(col: K, doc: Item<K>) => Promise<Item<K>>;
  remove: <K extends CollectionName>(col: K, id: string) => Promise<void>;
  customerById: (id?: string) => Customer | undefined;
  productById: (id?: string) => Product | undefined;
  /** Variazione di giacenza con registrazione del movimento */
  adjustStock: (productId: string, qty: number, reason: StockMovement['reason'], note?: string) => Promise<void>;
  /** Ricarica i dati demo di esempio (solo modalità demo) */
  resetDemo: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

const EMPTY: Collections = { customers: [], products: [], movements: [], orders: [], sales: [], appointments: [] };
const NAMES = Object.keys(EMPTY) as CollectionName[];
const inflight = new Map<string, Promise<{ data: Collections; settings: StoreSettings }>>();

async function doFetch(uid: string): Promise<{ data: Collections; settings: StoreSettings }> {
  const [lists, st] = await Promise.all([Promise.all(NAMES.map((n) => backend.listDocs(uid, n))), backend.getDoc<StoreSettings>(uid, 'store', 'settings')]);
  if (st) return { data: Object.fromEntries(NAMES.map((n, i) => [n, lists[i]])) as unknown as Collections, settings: { ...DEFAULT_SETTINGS, ...st } };
  // primo accesso: popola il negozio con dati dimostrativi
  const { buildSeed } = await import('./seed');
  const seed = buildSeed();
  for (const n of NAMES) for (const d of seed.data[n]) await backend.putDoc(uid, n, d as { id: string });
  await backend.putDoc(uid, 'store', seed.settings);
  return seed;
}

/** Un solo caricamento per utente alla volta (StrictMode monta due volte gli effetti) */
function fetchStore(uid: string) {
  let p = inflight.get(uid);
  if (!p) {
    p = doFetch(uid).finally(() => inflight.delete(uid));
    inflight.set(uid, p);
  }
  return p;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, notify } = useApp();
  const [data, setData] = useState<Collections>(EMPTY);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  /** Stato sempre aggiornato, per operazioni composte nello stesso handler */
  const dataRef = useRef<Collections>(EMPTY);
  dataRef.current = data;

  const load = useCallback(async (uid: string) => {
    const { data: next, settings: nextSettings } = await fetchStore(uid);
    setData(next);
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    if (!user) {
      setData(EMPTY);
      setReady(false);
      return;
    }
    let alive = true;
    load(user.uid)
      .catch(() => notify('Impossibile caricare i dati del negozio.', 'error'))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [user, load, notify]);

  const put = useCallback(
    async <K extends CollectionName>(col: K, doc: Item<K>) => {
      if (!user) throw new Error('Sessione scaduta');
      await backend.putDoc(user.uid, col, doc as { id: string });
      const apply = (d: Collections): Collections => {
        const list = d[col] as Item<K>[];
        const exists = list.some((x) => x.id === doc.id);
        return { ...d, [col]: exists ? list.map((x) => (x.id === doc.id ? doc : x)) : [doc, ...list] };
      };
      dataRef.current = apply(dataRef.current);
      setData(apply);
      return doc;
    },
    [user],
  );

  const remove = useCallback(
    async <K extends CollectionName>(col: K, id: string) => {
      if (!user) return;
      await backend.removeDoc(user.uid, col, id);
      const apply = (d: Collections): Collections => ({ ...d, [col]: (d[col] as Item<K>[]).filter((x) => x.id !== id) });
      dataRef.current = apply(dataRef.current);
      setData(apply);
    },
    [user],
  );

  const adjustStock = useCallback(
    async (productId: string, qty: number, reason: StockMovement['reason'], note = '') => {
      const p = dataRef.current.products.find((x) => x.id === productId);
      if (!p) return;
      await put('products', { ...p, stock: p.stock + qty, updatedAt: new Date().toISOString() });
      await put('movements', { id: newId(), productId, date: new Date().toISOString(), qty, reason, note });
    },
    [put],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      ready,
      settings,
      saveSettings: async (s) => {
        if (!user) return;
        await backend.putDoc(user.uid, 'store', s);
        setSettings(s);
        notify('Impostazioni del negozio salvate.');
      },
      put,
      remove,
      adjustStock,
      customerById: (id) => (id ? data.customers.find((c) => c.id === id) : undefined),
      productById: (id) => (id ? data.products.find((p) => p.id === id) : undefined),
      resetDemo: async () => {
        if (!user) return;
        for (const n of NAMES) for (const d of data[n]) await backend.removeDoc(user.uid, n, d.id);
        await backend.removeDoc(user.uid, 'store', 'settings');
        await load(user.uid);
        notify('Dati dimostrativi ripristinati.', 'info');
      },
    }),
    [data, ready, settings, user, put, remove, adjustStock, notify, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore deve essere usato dentro <StoreProvider>');
  return v;
}
