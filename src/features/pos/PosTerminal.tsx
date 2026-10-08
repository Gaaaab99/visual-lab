import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Barcode, CheckCircle2, CreditCard, Keyboard, Minus, Plus, Printer, ReceiptText, Search, ShieldCheck, Trash2, UserRound, UserX, Wrench, X } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import { usePrint } from '../../components/Print';
import { Modal } from '../../components/Modal';
import type { Customer, FiscalDocType, OrderLine, PaymentMethod, Product, ProductCategory, Sale } from '../../store/types';
import { eur, fullName, isValidFiscalCode, newId, vatBreakdown } from '../../store/utils';
import { ReceiptDoc } from './Receipt';
import { PAYMENTS, nextSaleNumber, round2, type ViewProps } from './shared';

interface CartLine {
  key: string;
  productId?: string;
  description: string;
  detail: string;
  qty: number;
  price: number;
  discountPct: number;
  vat: number;
  medicalDevice: boolean;
}

const CATEGORIES: ProductCategory[] = ['Montatura vista', 'Occhiale da sole', 'Lenti oftalmiche', 'Lenti a contatto', 'Soluzioni e cura', 'Accessori', 'Servizi'];

const FREE_PRESETS: { label: string; vat: number; medicalDevice: boolean }[] = [
  { label: 'Riparazione', vat: 22, medicalDevice: false },
  { label: 'Servizio di montaggio', vat: 22, medicalDevice: false },
  { label: 'Esame della vista', vat: 22, medicalDevice: false },
  { label: 'Lenti oftalmiche su misura', vat: 4, medicalDevice: true },
];

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const netLine = (l: CartLine) => round2(l.price * (1 - l.discountPct / 100)) * l.qty;

export interface PosPreset {
  customerId?: string;
  nonce: number;
}

export function PosTerminal({ active, preset, onNavigate }: { active: boolean; preset: PosPreset | null; onNavigate: ViewProps['onNavigate'] }) {
  const { products, customers, sales, settings, put, adjustStock, customerById, productById } = useStore();
  const { notify } = useApp();
  const print = usePrint();

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<ProductCategory | 'Tutte'>('Tutte');
  const [hi, setHi] = useState(0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [custQuery, setCustQuery] = useState('');
  const [custOpen, setCustOpen] = useState(false);
  const [cf, setCf] = useState('');
  const [opposition, setOpposition] = useState(false);
  const [docType, setDocType] = useState<FiscalDocType>('Documento commerciale');
  const [payment, setPayment] = useState<PaymentMethod>('Carta');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [free, setFree] = useState({ description: '', price: 0, vat: 22, medicalDevice: false });
  const [freeOpen, setFreeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const custRef = useRef<HTMLInputElement>(null);

  const customer = customerById(customerId);

  const selectCustomer = useCallback((c: Customer | undefined) => {
    setCustomerId(c?.id);
    setCf(c?.fiscalCode ?? '');
    setOpposition(c?.consents.stsOpposition ?? false);
    setCustQuery('');
    setCustOpen(false);
  }, []);

  useEffect(() => {
    if (!preset) return;
    const c = customers.find((x) => x.id === preset.customerId);
    selectCustomer(c);
    searchRef.current?.focus();
    // il preset si applica una sola volta per nonce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.nonce]);

  /* ------------------------------------------------------------ ricerca articoli */
  const results = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products
      .filter((p) => (cat === 'Tutte' || p.category === cat) && tokens.every((t) => `${p.brand} ${p.model} ${p.sku} ${p.barcode} ${p.color}`.toLowerCase().includes(t)))
      .sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'it'))
      .slice(0, 40);
  }, [products, query, cat]);

  useEffect(() => setHi(0), [query, cat]);

  const addProduct = useCallback((p: Product) => {
    setCart((c) => {
      const ex = c.find((l) => l.productId === p.id);
      if (ex) return c.map((l) => (l === ex ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...c,
        {
          key: newId(),
          productId: p.id,
          description: `${p.brand} ${p.model}`.trim(),
          detail: [p.category, p.color, p.size].filter(Boolean).join(' · '),
          qty: 1,
          price: p.price,
          discountPct: 0,
          vat: p.vat,
          medicalDevice: p.medicalDevice,
        },
      ];
    });
  }, []);

  const onSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Escape') {
      setQuery('');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const code = query.trim();
      if (!code) return;
      const exact = products.find((p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
      const pick = exact ?? results[hi];
      if (pick) {
        addProduct(pick);
        setQuery('');
      } else {
        notify(`Nessun articolo trovato per “${code}”.`, 'error');
      }
    }
  };

  const updateLine = (key: string, patch: Partial<CartLine>) => setCart((c) => c.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setCart((c) => c.filter((l) => l.key !== key));

  const addFree = () => {
    if (!free.description.trim()) return;
    setCart((c) => [...c, { key: newId(), description: free.description.trim(), detail: 'Voce libera', qty: 1, price: free.price, discountPct: 0, vat: free.vat, medicalDevice: free.medicalDevice }]);
    setFree({ description: '', price: 0, vat: 22, medicalDevice: false });
    setFreeOpen(false);
    searchRef.current?.focus();
  };

  /* ------------------------------------------------------------ clienti */
  const custResults = useMemo(() => {
    const t = custQuery.trim().toLowerCase();
    if (!t) return customers.slice(0, 8);
    return customers.filter((c) => `${c.firstName} ${c.lastName} ${c.lastName} ${c.firstName} ${c.fiscalCode} ${c.phone} ${c.code}`.toLowerCase().includes(t)).slice(0, 8);
  }, [customers, custQuery]);

  /* ------------------------------------------------------------ totali */
  const lines: OrderLine[] = useMemo(
    () =>
      cart.map((l) => ({
        id: l.key,
        productId: l.productId,
        description: l.discountPct ? `${l.description} (sconto ${l.discountPct}%)` : l.description,
        qty: l.qty,
        unitPrice: round2(l.price * (1 - l.discountPct / 100)),
        vat: l.vat,
        medicalDevice: l.medicalDevice,
      })),
    [cart],
  );
  const gross = round2(cart.reduce((s, l) => s + netLine(l), 0));
  const disc = Math.min(Math.max(0, discount), gross);
  const total = round2(gross - disc);
  const vat = vatBreakdown(lines, disc);
  const medical = cart.some((l) => l.medicalDevice);
  const cfTrim = cf.trim().toUpperCase();
  const cfInvalid = cfTrim !== '' && !isValidFiscalCode(cfTrim);
  const canCheckout = cart.length > 0 && !cfInvalid && !busy && cart.every((l) => l.qty > 0 && l.description.trim());
  const points = customer && settings.loyaltyEuroPerPoint > 0 ? Math.floor(total / settings.loyaltyEuroPerPoint) : 0;

  const reset = () => {
    setCart([]);
    setDiscount(0);
    setNotes('');
    setDocType('Documento commerciale');
    selectCustomer(undefined);
  };

  const checkout = async () => {
    if (!canCheckout) return;
    setBusy(true);
    try {
      const sale: Sale = {
        id: newId(),
        number: nextSaleNumber(sales),
        date: new Date().toISOString(),
        customerId,
        fiscalCode: cfTrim,
        stsOpposition: opposition,
        docType,
        lines,
        discount: disc,
        depositDeducted: 0,
        total,
        payment,
        notes: notes.trim(),
      };
      await put('sales', sale);
      const qtyByProduct = new Map<string, number>();
      for (const l of lines) if (l.productId) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.qty);
      for (const [pid, q] of qtyByProduct) {
        const p = productById(pid);
        if (p && p.category !== 'Servizi') await adjustStock(pid, -q, 'Vendita', sale.number);
      }
      if (customer && points > 0) await put('customers', { ...customer, loyaltyPoints: customer.loyaltyPoints + points, updatedAt: new Date().toISOString() });
      notify(`Vendita ${sale.number} registrata · ${eur(total)}${points > 0 ? ` · +${points} punti` : ''}`);
      setReceipt(sale);
      reset();
    } catch {
      notify('Impossibile registrare la vendita.', 'error');
    } finally {
      setBusy(false);
    }
  };

  // scorciatoie da tastiera
  const checkoutRef = useRef(checkout);
  checkoutRef.current = checkout;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (receipt || !active) return;
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        custRef.current?.focus();
        setCustOpen(true);
      } else if (e.key === 'F9' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        void checkoutRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [receipt, active]);

  useEffect(() => {
    if (active) searchRef.current?.focus();
  }, [active]);

  const receiptCustomer = receipt ? customerById(receipt.customerId) : undefined;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* ------------------------------------------------------ colonna articoli + carrello */}
      <div className="min-w-0 space-y-4">
        <div className="panel space-y-3 p-3 sm:p-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
            <input
              ref={searchRef}
              className="input pr-10 pl-9 text-base"
              placeholder="Cerca per marca, modello, SKU o leggi il codice a barre…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              aria-label="Cerca articolo"
            />
            <Barcode size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(['Tutte', ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`chip shrink-0 transition-colors ${cat === c ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3">
            {results.map((p, i) => {
              const out = p.stock <= 0 && p.category !== 'Servizi';
              return (
                <button
                  key={p.id}
                  ref={i === hi ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                  onClick={() => {
                    addProduct(p);
                    searchRef.current?.focus();
                  }}
                  onMouseEnter={() => setHi(i)}
                  className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${i === hi ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/[0.06] bg-ink-900/40 hover:border-white/15'}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {p.brand} {p.model}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {p.sku} · {p.color || p.category}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-white">{eur(p.price)}</p>
                    {p.category !== 'Servizi' && <p className={`text-[11px] ${out ? 'text-rose-300' : p.stock <= p.minStock ? 'text-amber-300' : 'text-slate-500'}`}>{out ? 'esaurito' : `${p.stock} pz`}</p>}
                  </div>
                </button>
              );
            })}
            {!results.length && <p className="col-span-full py-6 text-center text-sm text-slate-500">Nessun articolo corrisponde alla ricerca.</p>}
          </div>
          <p className="hidden items-center gap-1.5 text-[11px] text-slate-500 sm:flex">
            <Keyboard size={12} /> Invio aggiunge (codice a barre esatto o articolo evidenziato) · ↑↓ scorre · F2 ricerca · F4 cliente · F9 o Ctrl+Invio incassa
          </p>
        </div>

        <div className="panel p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <ReceiptText size={16} className="text-cyan-300" /> Carrello <span className="text-slate-500">({cart.reduce((s, l) => s + l.qty, 0)} pz)</span>
            </h3>
            <div className="flex gap-2">
              <button className="btn-ghost py-1.5 text-xs" onClick={() => setFreeOpen((v) => !v)}>
                <Wrench size={14} /> Voce libera
              </button>
              {cart.length > 0 && (
                <button className="btn-ghost py-1.5 text-xs" onClick={() => setCart([])}>
                  <Trash2 size={14} /> Svuota
                </button>
              )}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {freeOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mb-3 space-y-2 rounded-xl border border-white/[0.06] bg-ink-900/40 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {FREE_PRESETS.map((p) => (
                      <button key={p.label} className="chip border-white/10 text-slate-300 hover:border-cyan-400/40" onClick={() => setFree((f) => ({ ...f, description: p.label, vat: p.vat, medicalDevice: p.medicalDevice }))}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_110px_90px_auto]">
                    <input
                      className="input col-span-2 sm:col-span-1"
                      placeholder="Descrizione (es. riparazione cerniera)"
                      value={free.description}
                      onChange={(e) => setFree({ ...free, description: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && addFree()}
                    />
                    <input className="input" type="number" step="0.01" min={0} placeholder="Prezzo" value={free.price || ''} onChange={(e) => setFree({ ...free, price: num(e.target.value) })} onKeyDown={(e) => e.key === 'Enter' && addFree()} aria-label="Prezzo" />
                    <select className="input" value={free.vat} onChange={(e) => setFree({ ...free, vat: Number(e.target.value) })} aria-label="IVA">
                      {[4, 10, 22, 0].map((v) => (
                        <option key={v} value={v}>
                          IVA {v}%
                        </option>
                      ))}
                    </select>
                    <button className="btn-primary col-span-2 sm:col-span-1" onClick={addFree} disabled={!free.description.trim()}>
                      <Plus size={15} /> Aggiungi
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={free.medicalDevice} onChange={(e) => setFree({ ...free, medicalDevice: e.target.checked })} /> Dispositivo medico CE (spesa sanitaria AD)
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!cart.length ? (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">Leggi un codice a barre o scegli un articolo per iniziare.</div>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {cart.map((l) => {
                const p = productById(l.productId);
                const short = p && p.category !== 'Servizi' && l.qty > p.stock;
                return (
                  <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_96px_92px_72px_88px_32px] sm:items-center">
                    <div className="min-w-0">
                      {l.productId ? (
                        <p className="truncate text-sm font-medium text-slate-100">{l.description}</p>
                      ) : (
                        <input className="input py-1 text-sm" value={l.description} onChange={(e) => updateLine(l.key, { description: e.target.value })} aria-label="Descrizione" />
                      )}
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        {l.detail} · IVA {l.vat}%
                        {l.medicalDevice && <span className="chip border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0 text-[10px] text-emerald-200">AD</span>}
                        {short && (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <AlertTriangle size={11} /> giacenza {p.stock}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-right text-sm font-semibold text-white sm:order-last sm:hidden">{eur(netLine(l))}</p>
                    <div className="col-span-2 flex flex-wrap items-center gap-2 sm:contents">
                      <div className="flex items-center rounded-xl border border-white/10 bg-ink-900/70">
                        <button className="p-1.5 text-slate-400 hover:text-white" onClick={() => updateLine(l.key, { qty: Math.max(1, l.qty - 1) })} aria-label="Diminuisci">
                          <Minus size={13} />
                        </button>
                        <input className="w-9 bg-transparent text-center text-sm text-white outline-none" value={l.qty} onChange={(e) => updateLine(l.key, { qty: Math.max(1, Math.floor(num(e.target.value))) })} aria-label="Quantità" />
                        <button className="p-1.5 text-slate-400 hover:text-white" onClick={() => updateLine(l.key, { qty: l.qty + 1 })} aria-label="Aumenta">
                          <Plus size={13} />
                        </button>
                      </div>
                      <label className="flex items-center gap-1 text-[11px] text-slate-500">
                        €
                        <input className="input w-[76px] px-2 py-1 text-right" type="number" step="0.01" min={0} value={l.price} onChange={(e) => updateLine(l.key, { price: num(e.target.value) })} aria-label="Prezzo unitario" />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-slate-500">
                        <input className="input w-[52px] px-2 py-1 text-right" type="number" min={0} max={100} value={l.discountPct || ''} placeholder="0" onChange={(e) => updateLine(l.key, { discountPct: Math.min(100, Math.max(0, num(e.target.value))) })} aria-label="Sconto %" />%
                      </label>
                      <p className="hidden text-right text-sm font-semibold text-white sm:block">{eur(netLine(l))}</p>
                      <button className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 sm:ml-0" onClick={() => removeLine(l.key)} aria-label="Rimuovi riga">
                        <X size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ colonna incasso */}
      <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <div className="panel space-y-3 p-4">
          <p className="label flex items-center gap-1.5">
            <UserRound size={13} /> Cliente <span className="normal-case text-slate-600">(facoltativo)</span>
          </p>
          {customer ? (
            <div className="flex items-start justify-between gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-3">
              <div className="min-w-0">
                <button className="truncate text-left text-sm font-semibold text-cyan-100 hover:underline" onClick={() => onNavigate('customers', customer.id)}>
                  {fullName(customer)}
                </button>
                <p className="text-[11px] text-slate-400">
                  {customer.code} · {customer.loyaltyPoints} punti fedeltà
                </p>
              </div>
              <button className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => selectCustomer(undefined)} aria-label="Rimuovi cliente">
                <UserX size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                ref={custRef}
                className="input"
                placeholder="Cerca cliente (nome, CF, telefono)…"
                value={custQuery}
                onChange={(e) => {
                  setCustQuery(e.target.value);
                  setCustOpen(true);
                }}
                onFocus={() => setCustOpen(true)}
                onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && custResults[0]) {
                    e.preventDefault();
                    selectCustomer(custResults[0]);
                    searchRef.current?.focus();
                  }
                  if (e.key === 'Escape') setCustOpen(false);
                }}
              />
              {custOpen && custResults.length > 0 && (
                <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-ink-800 p-1 shadow-2xl shadow-black/50">
                  {custResults.map((c) => (
                    <li key={c.id}>
                      <button className="w-full rounded-lg px-3 py-1.5 text-left hover:bg-cyan-400/10" onMouseDown={(e) => e.preventDefault()} onClick={() => selectCustomer(c)}>
                        <span className="block text-sm text-slate-100">{fullName(c)}</span>
                        <span className="block text-[11px] text-slate-500">
                          {c.fiscalCode || 'CF non indicato'} · {c.phone}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <label className="label" htmlFor="pos-cf">
              Codice fiscale per la detrazione
            </label>
            <input
              id="pos-cf"
              className={`input font-mono uppercase ${cfInvalid ? 'border-rose-400/60' : ''}`}
              maxLength={16}
              placeholder="RSSMRA80A01F205X"
              value={cf}
              onChange={(e) => setCf(e.target.value.toUpperCase())}
            />
            {cfInvalid ? (
              <p className="mt-1 text-[11px] text-rose-300">Codice fiscale formalmente non valido.</p>
            ) : medical && !cfTrim ? (
              <p className="mt-1 text-[11px] text-amber-300/90">Senza codice fiscale la spesa sanitaria non è detraibile né trasmissibile al Sistema TS.</p>
            ) : cfTrim ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300">
                <ShieldCheck size={12} /> Codice fiscale valido
              </p>
            ) : null}
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-300">
            <input type="checkbox" className="mt-0.5" checked={opposition} onChange={(e) => setOpposition(e.target.checked)} />
            <span>
              Opposizione all’invio al Sistema TS
              <span className="block text-[11px] text-slate-500">Il cliente chiede di non trasmettere questa spesa all’Agenzia delle Entrate.</span>
            </span>
          </label>
        </div>

        <div className="panel space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            {(['Documento commerciale', 'Fattura'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDocType(d)}
                className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${docType === d ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <div>
            <p className="label flex items-center gap-1.5">
              <CreditCard size={13} /> Pagamento
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPayment(p)}
                  className={`rounded-lg border px-1 py-1.5 text-xs transition-colors ${payment === p ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="pos-disc">
                Sconto (€)
              </label>
              <input id="pos-disc" className="input" type="number" min={0} step="0.01" value={discount || ''} placeholder="0,00" onChange={(e) => setDiscount(Math.max(0, num(e.target.value)))} />
            </div>
            <div>
              <label className="label" htmlFor="pos-notes">
                Note
              </label>
              <input id="pos-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Facoltative" />
            </div>
          </div>

          <div className="space-y-1 rounded-xl border border-white/[0.06] bg-ink-900/50 p-3 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotale</span>
              <span>{eur(gross)}</span>
            </div>
            {disc > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Sconto</span>
                <span>−{eur(disc)}</span>
              </div>
            )}
            {vat.map((v) => (
              <div key={v.rate} className="flex justify-between text-[11px] text-slate-500">
                <span>
                  IVA {v.rate}% su {eur(v.taxable)}
                </span>
                <span>{eur(v.vat)}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-2">
              <span className="font-medium text-slate-200">Totale</span>
              <span className="text-2xl font-semibold text-white">{eur(total)}</span>
            </div>
            {points > 0 && <p className="text-right text-[11px] text-cyan-300">+{points} punti fedeltà</p>}
          </div>

          <button className="btn-primary w-full py-3 text-base" onClick={() => void checkout()} disabled={!canCheckout}>
            <CheckCircle2 size={18} /> {busy ? 'Registrazione…' : `Incassa ${total ? eur(total) : ''}`}
            <kbd className="ml-1 hidden rounded border border-white/30 px-1 text-[10px] font-normal sm:inline">F9</kbd>
          </button>
        </div>
      </div>

      <Modal
        open={!!receipt}
        onClose={() => {
          setReceipt(null);
          setTimeout(() => searchRef.current?.focus(), 50);
        }}
        size="sm"
        title={`Vendita ${receipt?.number ?? ''} registrata`}
        subtitle={receipt ? `${eur(receipt.total)} · ${receipt.payment}` : undefined}
        icon={<CheckCircle2 size={18} />}
        footer={
          <>
            {receiptCustomer && (
              <button className="btn-ghost" onClick={() => onNavigate('customers', receiptCustomer.id)}>
                <UserRound size={15} /> Scheda cliente
              </button>
            )}
            <button
              className="btn-ghost"
              onClick={() => {
                setReceipt(null);
                setTimeout(() => searchRef.current?.focus(), 50);
              }}
            >
              Nuova vendita
            </button>
            <button className="btn-primary" autoFocus onClick={() => receipt && print(<ReceiptDoc sale={receipt} settings={settings} customer={receiptCustomer} />)}>
              <Printer size={15} /> Stampa
            </button>
          </>
        }
      >
        {receipt && (
          <div className="p-4">
            <div className="rounded-xl bg-white p-4 shadow-inner">
              <ReceiptDoc sale={receipt} settings={settings} customer={receiptCustomer} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
