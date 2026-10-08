import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BellRing, CalendarPlus, CheckCircle2, Cake, ChevronDown, Contact, Eye, FileText, Glasses, Lock, PenLine, RotateCcw, Search, Send, Undo2, UserRound } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { ContactChannel, Customer, Order } from '../../store/types';
import type { ViewId } from '../../types';
import { contactLink, fullName, latestRx } from '../../store/utils';
import { diffDays, fmtLocal, isoOf, localToday, parseISO, shiftDays, shiftMonths } from '../agenda/dates';

interface Props {
  focusId: string | null;
  onFocusConsumed: () => void;
  onNavigate: (view: ViewId, focusId?: string) => void;
}

type Cat = 'vista' | 'lac' | 'pronti' | 'preventivi' | 'compleanni';

const CATS: Record<Cat, { label: string; short: string; icon: typeof Eye; tone: string; consent: 'reminders' | 'marketing' }> = {
  vista: { label: 'Controllo della vista', short: 'Controllo vista', icon: Eye, tone: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200', consent: 'reminders' },
  lac: { label: 'Riordino lenti a contatto', short: 'Riordino LAC', icon: Contact, tone: 'border-violet-400/30 bg-violet-400/10 text-violet-200', consent: 'reminders' },
  pronti: { label: 'Occhiali pronti da ritirare', short: 'Pronti al ritiro', icon: Glasses, tone: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200', consent: 'reminders' },
  preventivi: { label: 'Preventivi in sospeso', short: 'Preventivi', icon: FileText, tone: 'border-amber-400/30 bg-amber-400/10 text-amber-200', consent: 'reminders' },
  compleanni: { label: 'Compleanni nei prossimi 7 giorni', short: 'Compleanni', icon: Cake, tone: 'border-pink-400/30 bg-pink-400/10 text-pink-200', consent: 'marketing' },
};
const CAT_ORDER: Cat[] = ['vista', 'lac', 'pronti', 'preventivi', 'compleanni'];

const DEFAULT_TEMPLATES: Record<Cat, string> = {
  vista:
    'Gentile {nome}, è il momento del controllo periodico della vista (consigliato entro il {data}). Prenota un appuntamento da {negozio}: siamo aperti {orari}.',
  lac: 'Gentile {nome}, la sua scorta di lenti a contatto sta per terminare (circa il {data}). Possiamo preparare il riordino: ci scriva o passi da {negozio} ({orari}).',
  pronti: 'Gentile {nome}, i suoi occhiali sono pronti dal {data} e la aspettano da {negozio}. Orari: {orari}.',
  preventivi: 'Gentile {nome}, le ricordiamo il preventivo preparato per lei da {negozio}. Se desidera procedere o ha domande siamo a disposizione ({orari}).',
  compleanni: 'Tanti auguri {nome}! Tutto lo staff di {negozio} le augura un felice compleanno. Passi a trovarci: abbiamo un piccolo pensiero per lei. ({orari})',
};

const CONTACTED_KEY = 'visuallab.recalls.contacted';
const TEMPLATES_KEY = 'visuallab.recalls.templates';
const CONTACT_COOLDOWN = 30;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v: unknown = JSON.parse(raw);
    return v && typeof v === 'object' ? ({ ...fallback, ...(v as Partial<T>) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* archiviazione non disponibile */
  }
}

interface RecallItem {
  key: string;
  cat: Cat;
  customer: Customer;
  reason: string;
  /** Data di riferimento usata nei messaggi */
  due: string;
  /** Giorni dalla data odierna alla scadenza (negativo = scaduto) */
  delta: number;
  order?: Order;
}

function badge(item: RecallItem): { text: string; tone: string } {
  const { delta, cat } = item;
  if (cat === 'pronti') {
    const w = -delta;
    return { text: w <= 0 ? 'Pronto da oggi' : `In attesa da ${w} gg`, tone: w > 14 ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : w > 5 ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' };
  }
  if (cat === 'compleanni') return { text: delta === 0 ? 'Oggi' : delta === 1 ? 'Domani' : `Tra ${delta} gg`, tone: 'border-pink-400/30 bg-pink-400/10 text-pink-200' };
  if (delta < 0) return { text: `Scaduto da ${-delta} gg`, tone: 'border-rose-400/30 bg-rose-400/10 text-rose-200' };
  if (delta === 0) return { text: 'Scade oggi', tone: 'border-amber-400/30 bg-amber-400/10 text-amber-200' };
  if (delta <= 7) return { text: `Tra ${delta} gg`, tone: 'border-amber-400/30 bg-amber-400/10 text-amber-200' };
  return { text: `Tra ${delta} gg`, tone: 'border-sky-400/30 bg-sky-400/10 text-sky-200' };
}

function fill(tpl: string, vars: Record<'nome' | 'data' | 'negozio' | 'orari', string>): string {
  return tpl.replace(/\{(nome|data|negozio|orari)\}/g, (_m: string, k: string) => vars[k as keyof typeof vars]);
}

export function RecallsView({ focusId, onFocusConsumed, onNavigate }: Props) {
  const { customers, orders, settings, customerById } = useStore();
  const { notify } = useApp();
  const today = localToday();
  const [contacted, setContacted] = useState<Record<string, string>>(() => readJSON<Record<string, string>>(CONTACTED_KEY, {}));
  const [templates, setTemplates] = useState<Record<Cat, string>>(() => readJSON<Record<Cat, string>>(TEMPLATES_KEY, DEFAULT_TEMPLATES));
  const [filter, setFilter] = useState<Cat | 'tutti'>('tutti');
  const [q, setQ] = useState('');
  const [compose, setCompose] = useState<RecallItem | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [showContacted, setShowContacted] = useState(false);

  useEffect(() => {
    if (!focusId) return;
    // focusId opzionale: nome di una categoria per filtrare la lista
    if ((CAT_ORDER as string[]).includes(focusId)) setFilter(focusId as Cat);
    onFocusConsumed();
  }, [focusId, onFocusConsumed]);

  const items = useMemo<RecallItem[]>(() => {
    const out: RecallItem[] = [];
    for (const c of customers) {
      // Controllo della vista
      const rx = latestRx(c);
      if (rx) {
        if (rx.nextCheck) {
          const delta = diffDays(today, rx.nextCheck);
          if (delta <= 30) out.push({ key: `vista:${c.id}:${rx.id}`, cat: 'vista', customer: c, due: rx.nextCheck, delta, reason: `Controllo consigliato entro il ${fmtLocal(rx.nextCheck)} · ultima prescrizione ${fmtLocal(rx.date)} (${rx.kind})` });
        } else {
          const due = shiftMonths(rx.date, 12);
          const delta = diffDays(today, due);
          if (delta < 0) out.push({ key: `vista:${c.id}:${rx.id}`, cat: 'vista', customer: c, due, delta, reason: `Ultima prescrizione del ${fmtLocal(rx.date)}: più di 12 mesi fa` });
        }
      }
      // Riordino LAC: per ogni prodotto la sola applicazione più recente con dati di fornitura
      const fits = [...c.contactLenses].filter((f) => f.lastSupplyDate && f.supplyDays).sort((a, b) => (b.lastSupplyDate ?? '').localeCompare(a.lastSupplyDate ?? ''));
      const seen = new Set<string>();
      for (const f of fits) {
        const prodKey = `${f.brand} ${f.product}`.toLowerCase();
        if (seen.has(prodKey) || !f.lastSupplyDate || !f.supplyDays) continue;
        seen.add(prodKey);
        const end = shiftDays(f.lastSupplyDate, f.supplyDays);
        const delta = diffDays(today, end);
        if (delta <= 14) out.push({ key: `lac:${c.id}:${f.id}:${f.lastSupplyDate}`, cat: 'lac', customer: c, due: end, delta, reason: `${f.brand} ${f.product} (${f.replacement}) · fornitura del ${fmtLocal(f.lastSupplyDate)} per ${f.supplyDays} giorni` });
      }
      // Compleanni
      if (c.birthDate) {
        const b = parseISO(c.birthDate);
        const t = parseISO(today);
        let next = new Date(t.getFullYear(), b.getMonth(), b.getDate());
        if (isoOf(next) < today) next = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
        const nextIso = isoOf(next);
        const delta = diffDays(today, nextIso);
        if (delta <= 7) out.push({ key: `compleanni:${c.id}:${nextIso.slice(0, 4)}`, cat: 'compleanni', customer: c, due: nextIso, delta, reason: `Compie ${next.getFullYear() - b.getFullYear()} anni il ${fmtLocal(nextIso)}` });
      }
    }
    for (const o of orders) {
      const c = customerById(o.customerId);
      if (!c) continue;
      if (o.status === 'pronto') {
        const ev = [...o.history].reverse().find((h) => h.status === 'pronto');
        const since = (ev?.date ?? o.updatedAt).slice(0, 10);
        const delta = diffDays(today, since);
        out.push({ key: `pronti:${o.id}`, cat: 'pronti', customer: c, due: since, delta, order: o, reason: `Busta ${o.number} · ${o.type} pronta dal ${fmtLocal(since)}` });
      } else if (o.status === 'preventivo') {
        const created = o.createdAt.slice(0, 10);
        const age = diffDays(created, today);
        if (age > 7) out.push({ key: `preventivi:${o.id}`, cat: 'preventivi', customer: c, due: created, delta: -(age - 7), order: o, reason: `Preventivo ${o.number} · ${o.type} del ${fmtLocal(created)} (${age} giorni fa)` });
      }
    }
    return out.sort((a, b) => a.delta - b.delta);
  }, [customers, orders, customerById, today]);

  const isContacted = (key: string) => {
    const d = contacted[key];
    return !!d && diffDays(d, today) < CONTACT_COOLDOWN;
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => (filter === 'tutti' || i.cat === filter) && (!s || `${i.customer.firstName} ${i.customer.lastName} ${i.customer.phone} ${i.reason}`.toLowerCase().includes(s)));
  }, [items, filter, q]);

  const active = filtered.filter((i) => !isContacted(i.key));
  const done = filtered.filter((i) => isContacted(i.key));

  const counts: Record<Cat, number> = { vista: 0, lac: 0, pronti: 0, preventivi: 0, compleanni: 0 };
  for (const i of items) if (!isContacted(i.key)) counts[i.cat]++;

  const markContacted = (item: RecallItem, value: boolean) => {
    setContacted((prev) => {
      const next = { ...prev };
      // pulizia delle voci ormai scadute
      for (const [k, d] of Object.entries(next)) if (diffDays(d, today) >= CONTACT_COOLDOWN) delete next[k];
      if (value) next[item.key] = today;
      else delete next[item.key];
      writeJSON(CONTACTED_KEY, next);
      return next;
    });
    notify(value ? `${fullName(item.customer)} segnato come contattato.` : 'Richiamo riportato in lista.', value ? 'success' : 'info');
  };

  const saveTemplates = (t: Record<Cat, string>) => {
    setTemplates(t);
    writeJSON(TEMPLATES_KEY, t);
    notify('Modelli dei messaggi salvati.');
  };

  const orderNav = (item: RecallItem) => {
    const o = item.order;
    return o ? () => onNavigate('orders', o.id) : undefined;
  };

  const allowed = (item: RecallItem) => item.customer.consents[CATS[item.cat].consent];

  const messageFor = (item: RecallItem) =>
    fill(templates[item.cat], { nome: item.customer.firstName, data: fmtLocal(item.due), negozio: settings.businessName, orari: settings.openingHours }) +
    (settings.messageSignature ? `\n${settings.messageSignature}` : '');

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Negozio"
        title="Richiami"
        icon={<BellRing size={22} />}
        description="Lista di lavoro generata dai dati: controlli della vista, riordini LAC, occhiali pronti, preventivi e compleanni. Solo verso clienti che hanno dato il consenso."
        actions={
          <button className="btn-ghost" onClick={() => setTplOpen(true)}>
            <PenLine size={16} /> Modelli messaggi
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {CAT_ORDER.map((c) => {
          const meta = CATS[c];
          const sel = filter === c;
          return (
            <button key={c} onClick={() => setFilter(sel ? 'tutti' : c)} className={`panel flex flex-col items-start gap-2 p-4 text-left transition hover:border-cyan-400/30 ${sel ? '!border-cyan-400/50 ring-1 ring-cyan-400/30' : ''}`}>
              <span className={`chip ${meta.tone}`}>
                <meta.icon size={12} /> {meta.short}
              </span>
              <span className="text-2xl font-semibold tabular-nums text-white">{counts[c]}</span>
              <span className="text-[11px] text-slate-500">da contattare</span>
            </button>
          );
        })}
      </div>

      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Cerca cliente o motivo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Cat | 'tutti')}>
          <option value="tutti">Tutte le categorie</option>
          {CAT_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATS[c].label}
            </option>
          ))}
        </select>
      </div>

      <section className="space-y-2">
        {active.length === 0 ? (
          <div className="panel flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 size={28} className="text-emerald-300" />
            <p className="text-sm text-slate-300">Nessun richiamo da fare{filter !== 'tutti' ? ' in questa categoria' : ''}.</p>
          </div>
        ) : (
          active.map((i, idx) => (
            <motion.div key={i.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }}>
              <RecallRow item={i} allowed={allowed(i)} onCompose={() => setCompose(i)} onBook={() => onNavigate('agenda', `new:${i.customer.id}`)} onOpen={() => onNavigate('customers', i.customer.id)} onOrder={orderNav(i)} onToggle={() => markContacted(i, true)} />
            </motion.div>
          ))
        )}
      </section>

      {done.length > 0 && (
        <section className="panel overflow-hidden">
          <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setShowContacted((s) => !s)}>
            <span className="text-sm font-semibold text-white">
              Contattati <span className="ml-1 text-slate-500">({done.length})</span>
            </span>
            <ChevronDown size={16} className={`text-slate-400 transition ${showContacted ? 'rotate-180' : ''}`} />
          </button>
          {showContacted && (
            <div className="space-y-2 border-t border-white/[0.06] p-3">
              <p className="px-1 text-xs text-slate-500">Le voci contattate tornano automaticamente in lista dopo {CONTACT_COOLDOWN} giorni se il richiamo è ancora valido.</p>
              {done.map((i) => (
                <RecallRow
                  key={i.key}
                  item={i}
                  allowed={allowed(i)}
                  contactedOn={contacted[i.key]}
                  onCompose={() => setCompose(i)}
                  onBook={() => onNavigate('agenda', `new:${i.customer.id}`)}
                  onOpen={() => onNavigate('customers', i.customer.id)}
                  onOrder={orderNav(i)}
                  onToggle={() => markContacted(i, false)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <ComposeModal
        item={compose}
        initialText={compose ? messageFor(compose) : ''}
        onClose={() => setCompose(null)}
        onContacted={(i) => {
          if (!isContacted(i.key)) markContacted(i, true);
          setCompose(null);
        }}
      />
      <TemplatesModal open={tplOpen} value={templates} onClose={() => setTplOpen(false)} onSave={saveTemplates} />
    </div>
  );
}

function RecallRow({
  item,
  allowed,
  contactedOn,
  onCompose,
  onBook,
  onOpen,
  onOrder,
  onToggle,
}: {
  item: RecallItem;
  allowed: boolean;
  contactedOn?: string;
  onCompose: () => void;
  onBook: () => void;
  onOpen: () => void;
  onOrder?: () => void;
  onToggle: () => void;
}) {
  const meta = CATS[item.cat];
  const b = badge(item);
  const c = item.customer;
  return (
    <div className={`panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center ${contactedOn ? 'opacity-70' : ''}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.tone}`}>
          <meta.icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onOpen} className="truncate text-sm font-semibold text-white hover:text-cyan-200">
              {fullName(c)}
            </button>
            <span className={`chip ${b.tone}`}>{b.text}</span>
            <span className="chip border-white/10 bg-white/[0.03] text-slate-300">{c.preferredChannel}</span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
            <span className="text-slate-300">{meta.label}</span> · {item.reason}
          </p>
          {contactedOn && <p className="mt-0.5 text-[11px] text-emerald-300/80">Contattato il {fmtLocal(contactedOn)}</p>}
          {!allowed && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-300/90">
              <Lock size={11} />
              {meta.consent === 'marketing'
                ? 'Manca il consenso alle comunicazioni promozionali: non è possibile inviare auguri o promozioni.'
                : 'Manca il consenso ai promemoria di servizio: contattare solo se il cliente lo richiede.'}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button className="btn-primary px-3 py-1.5 text-xs" onClick={onCompose} disabled={!allowed} title={allowed ? 'Prepara il messaggio' : 'Consenso non rilasciato'}>
          <Send size={13} /> Contatta
        </button>
        {item.cat !== 'pronti' && item.cat !== 'compleanni' && (
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onBook}>
            <CalendarPlus size={13} /> Prenota
          </button>
        )}
        {onOrder && (
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onOrder}>
            <FileText size={13} /> Busta
          </button>
        )}
        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onOpen} aria-label="Apri cliente">
          <UserRound size={13} />
        </button>
        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onToggle}>
          {contactedOn ? (
            <>
              <Undo2 size={13} /> Riporta in lista
            </>
          ) : (
            <>
              <CheckCircle2 size={13} /> Segna come contattato
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ComposeModal({ item, initialText, onClose, onContacted }: { item: RecallItem | null; initialText: string; onClose: () => void; onContacted: (i: RecallItem) => void }) {
  return (
    <Modal open={item !== null} onClose={onClose} size="md" icon={<Send size={18} />} title={item ? `Contatta ${fullName(item.customer)}` : ''} subtitle={item ? CATS[item.cat].label : undefined}>
      {item && <ComposeBody key={item.key} item={item} initialText={initialText} onClose={onClose} onContacted={onContacted} />}
    </Modal>
  );
}

const CHANNELS: ContactChannel[] = ['WhatsApp', 'SMS', 'Email', 'Telefono'];

function ComposeBody({ item, initialText, onClose, onContacted }: { item: RecallItem; initialText: string; onClose: () => void; onContacted: (i: RecallItem) => void }) {
  const [channel, setChannel] = useState<ContactChannel>(item.customer.preferredChannel);
  const [text, setText] = useState(initialText);
  const [opened, setOpened] = useState(false);
  const link = contactLink(channel, item.customer, text, `${CATS[item.cat].label}`);
  return (
    <div>
      <div className="space-y-4 p-5">
        <div>
          <span className="label">Canale</span>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <button key={ch} onClick={() => setChannel(ch)} className={`chip cursor-pointer transition ${channel === ch ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'}`}>
                {ch}
                {ch === item.customer.preferredChannel && <span className="text-[10px] opacity-70">· preferito</span>}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {item.customer.phone || 'nessun telefono'} · {item.customer.email || 'nessuna email'}
          </p>
        </div>
        {channel !== 'Telefono' ? (
          <label className="block">
            <span className="label">Messaggio (modificabile)</span>
            <textarea className="input min-h-[150px] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
          </label>
        ) : (
          <div className="rounded-xl border border-white/10 bg-ink-900/60 p-3 text-sm text-slate-300">
            <p className="label">Traccia per la telefonata</p>
            <p className="whitespace-pre-line leading-relaxed">{text}</p>
          </div>
        )}
        {!link && <p className="text-sm text-amber-300">Recapito mancante per il canale {channel}: aggiorna la scheda cliente o scegli un altro canale.</p>}
        <p className="text-[11px] text-slate-500">Il link apre l’app del dispositivo con il testo precompilato: il messaggio non viene inviato automaticamente.</p>
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.06] bg-ink-900/50 px-5 py-3">
        <button className="btn-ghost" onClick={onClose}>
          Chiudi
        </button>
        {opened && (
          <button className="btn-ghost" onClick={() => onContacted(item)}>
            <CheckCircle2 size={15} /> Segna come contattato
          </button>
        )}
        {link ? (
          <a className="btn-primary" href={link} target={channel === 'WhatsApp' ? '_blank' : undefined} rel="noreferrer" onClick={() => setOpened(true)}>
            <Send size={15} /> {channel === 'Telefono' ? 'Chiama' : `Apri ${channel}`}
          </a>
        ) : (
          <button className="btn-primary" disabled>
            <Send size={15} /> Apri {channel}
          </button>
        )}
      </footer>
    </div>
  );
}

function TemplatesModal({ open, value, onClose, onSave }: { open: boolean; value: Record<Cat, string>; onClose: () => void; onSave: (v: Record<Cat, string>) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<PenLine size={18} />}
      title="Modelli dei messaggi"
      subtitle="Segnaposto disponibili: {nome}, {data}, {negozio}, {orari}. La firma dei messaggi viene aggiunta in coda."
      footer={
        <>
          <button className="btn-ghost mr-auto" onClick={() => setDraft(DEFAULT_TEMPLATES)}>
            <RotateCcw size={15} /> Ripristina predefiniti
          </button>
          <button className="btn-ghost" onClick={onClose}>
            Annulla
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Salva modelli
          </button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        {CAT_ORDER.map((c) => (
          <label key={c} className="block">
            <span className="label flex items-center gap-1.5">
              {CATS[c].label}
              <span className="normal-case tracking-normal text-slate-500">· consenso {CATS[c].consent === 'marketing' ? 'marketing' : 'promemoria'}</span>
            </span>
            <textarea className="input min-h-[80px] leading-relaxed" value={draft[c]} onChange={(e) => setDraft((d) => ({ ...d, [c]: e.target.value }))} />
          </label>
        ))}
      </div>
    </Modal>
  );
}
