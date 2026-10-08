import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowDownUp, CalendarX2, ChevronRight, CircleDot, Contact, Glasses, Phone, Search, ShieldAlert, UserPlus, Users, X } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useApp } from '../../context/AppContext';
import { useStore } from '../../store/StoreContext';
import type { Customer } from '../../store/types';
import { age, fmtDate, fullName, latestRx, rxLine, todayISO } from '../../store/utils';
import type { ViewId } from '../../types';
import { CustomerDetail } from './CustomerDetail';
import { CustomerForm } from './CustomerForm';
import { checkState, clReorder, emptyCustomer, isOpenOrder, lastVisit, latestCl, matches, nextCustomerCode } from './helpers';
import { Avatar } from './ui';

interface Props {
  focusId: string | null;
  onFocusConsumed: () => void;
  onNavigate: (view: ViewId, focusId?: string) => void;
}

type SortKey = 'nome' | 'recenti' | 'visita' | 'controllo' | 'codice';
type Flag = 'overdue' | 'noConsent' | 'clReorder' | 'openOrders';

const PAGE = 60;

interface Row {
  c: Customer;
  name: string;
  age: number | null;
  last?: string;
  rxSummary: string;
  check: ReturnType<typeof checkState>;
  openOrders: number;
  hasCl: boolean;
  clDue: boolean;
  noConsent: boolean;
}

export function CustomersView({ focusId, onFocusConsumed, onNavigate }: Props) {
  const { customers, orders, sales, appointments, ready, put, remove } = useStore();
  const { notify } = useApp();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [flags, setFlags] = useState<Set<Flag>>(new Set());
  const [sort, setSort] = useState<SortKey>('nome');
  const [limit, setLimit] = useState(PAGE);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<{ customer: Customer; isNew: boolean; back: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const openNew = useCallback(() => setForm({ customer: emptyCustomer(nextCustomerCode(customers)), isNew: true, back: false }), [customers]);

  /* focus da altre viste */
  useEffect(() => {
    if (!focusId || !ready) return;
    if (focusId === 'new') openNew();
    else if (customers.some((c) => c.id === focusId)) setDetailId(focusId);
    else notify('Cliente non trovato.', 'error');
    onFocusConsumed();
  }, [focusId, ready, customers, openNew, onFocusConsumed, notify]);

  /* "/" per cercare */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === '/' && !detailId && !form && t && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailId, form]);

  const rows = useMemo<Row[]>(
    () =>
      customers.map((c) => {
        const rx = latestRx(c);
        const cl = latestCl(c);
        const st = cl ? clReorder(cl).state : 'unknown';
        return {
          c,
          name: fullName(c),
          age: age(c.birthDate),
          last: lastVisit(c, orders, sales, appointments),
          rxSummary: rx ? `OD ${rxLine(rx.od)} · OS ${rxLine(rx.os)}` : '',
          check: checkState(c),
          openOrders: orders.filter((o) => o.customerId === c.id && isOpenOrder(o)).length,
          hasCl: c.contactLenses.length > 0 || c.tags.includes('LAC'),
          clDue: st === 'soon' || st === 'overdue',
          noConsent: !c.consents.privacy || !c.consents.healthData,
        };
      }),
    [customers, orders, sales, appointments],
  );

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of customers) for (const t of c.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ t, n }));
  }, [customers]);

  const stats = useMemo(() => {
    const month = todayISO().slice(0, 7);
    return {
      total: customers.length,
      newMonth: customers.filter((c) => c.createdAt.startsWith(month)).length,
      overdue: rows.filter((r) => r.check.state === 'overdue').length,
      cl: rows.filter((r) => r.hasCl).length,
      noConsent: rows.filter((r) => r.noConsent).length,
    };
  }, [customers, rows]);

  const filtered = useMemo(() => {
    const term = q.trim();
    const out = rows.filter(
      (r) =>
        matches(r.c, term) &&
        (!tag || r.c.tags.includes(tag)) &&
        (!flags.has('overdue') || r.check.state === 'overdue') &&
        (!flags.has('noConsent') || r.noConsent) &&
        (!flags.has('clReorder') || r.clDue) &&
        (!flags.has('openOrders') || r.openOrders > 0),
    );
    const cmp: Record<SortKey, (a: Row, b: Row) => number> = {
      nome: (a, b) => a.name.localeCompare(b.name, 'it'),
      recenti: (a, b) => b.c.createdAt.localeCompare(a.c.createdAt),
      visita: (a, b) => (b.last ?? '').localeCompare(a.last ?? ''),
      controllo: (a, b) => (a.check.due ?? '9999').localeCompare(b.check.due ?? '9999'),
      codice: (a, b) => a.c.code.localeCompare(b.c.code, 'it', { numeric: true }),
    };
    return out.sort(cmp[sort]);
  }, [rows, q, tag, flags, sort]);

  useEffect(() => setLimit(PAGE), [q, tag, flags, sort]);

  const toggleFlag = (f: Flag) =>
    setFlags((s) => {
      const n = new Set(s);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });

  const detail = detailId ? (customers.find((c) => c.id === detailId) ?? null) : null;

  const saveCustomer = useCallback(
    async (c: Customer, msg?: string) => {
      try {
        await put('customers', { ...c, updatedAt: new Date().toISOString() });
        if (msg) notify(msg);
      } catch {
        notify('Salvataggio non riuscito. Riprova.', 'error');
        throw new Error('save failed');
      }
    },
    [put, notify],
  );

  const deleteCustomer = useCallback(
    async (c: Customer) => {
      try {
        // anonimizza gli appuntamenti; vendite e buste restano per obblighi fiscali / dispositivi su misura
        for (const a of appointments.filter((x) => x.customerId === c.id)) await put('appointments', { ...a, customerId: undefined, name: 'Cliente cancellato', phone: '' });
        await remove('customers', c.id);
        setDetailId(null);
        notify(`Scheda di ${fullName(c)} eliminata.`, 'info');
      } catch {
        notify('Eliminazione non riuscita.', 'error');
      }
    },
    [appointments, put, remove, notify],
  );

  const hasFilters = !!q || !!tag || flags.size > 0;
  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Gestionale · Clienti"
        title="Schede clienti"
        icon={<Contact size={22} />}
        description="Anagrafica, prescrizioni, lenti a contatto, acquisti e consensi privacy in un’unica scheda."
        actions={
          <button className="btn-primary" onClick={openNew}>
            <UserPlus size={16} /> Nuovo cliente
          </button>
        }
      />

      {/* stat strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Users size={16} />} label="Totale clienti" value={stats.total} tone="from-cyan-500/15 text-cyan-300" />
        <Stat icon={<UserPlus size={16} />} label="Nuovi questo mese" value={stats.newMonth} tone="from-emerald-500/15 text-emerald-300" />
        <Stat icon={<CalendarX2 size={16} />} label="Controlli scaduti" value={stats.overdue} tone="from-rose-500/15 text-rose-300" onClick={() => toggleFlag('overdue')} active={flags.has('overdue')} />
        <Stat icon={<CircleDot size={16} />} label="Clienti LAC" value={stats.cl} tone="from-violet-500/15 text-violet-300" onClick={() => setTag(tag === 'LAC' ? null : 'LAC')} active={tag === 'LAC'} />
      </div>

      <div className="panel overflow-hidden">
        {/* filtri */}
        <div className="space-y-3 border-b border-white/[0.06] p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 basis-60">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchRef}
                className="input pl-9 pr-9"
                placeholder="Cerca nome, codice, telefono, codice fiscale, email…  ( / )"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered.length === 1) setDetailId(filtered[0].c.id);
                  if (e.key === 'Escape') setQ('');
                }}
              />
              {q && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-200" onClick={() => setQ('')} aria-label="Cancella ricerca">
                  <X size={14} />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <ArrowDownUp size={14} />
              <select className="input w-auto py-1.5 text-xs" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordina">
                <option value="nome">Cognome A–Z</option>
                <option value="visita">Ultima visita</option>
                <option value="recenti">Ultimi inseriti</option>
                <option value="controllo">Scadenza controllo</option>
                <option value="codice">Codice</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FlagChip active={flags.has('overdue')} onClick={() => toggleFlag('overdue')} tone="rose">
              <CalendarX2 size={12} /> Controllo scaduto
            </FlagChip>
            <FlagChip active={flags.has('noConsent')} onClick={() => toggleFlag('noConsent')} tone="amber">
              <ShieldAlert size={12} /> Senza consensi {stats.noConsent > 0 && <span className="opacity-70">{stats.noConsent}</span>}
            </FlagChip>
            <FlagChip active={flags.has('clReorder')} onClick={() => toggleFlag('clReorder')} tone="violet">
              <CircleDot size={12} /> Riordino LAC
            </FlagChip>
            <FlagChip active={flags.has('openOrders')} onClick={() => toggleFlag('openOrders')} tone="amber">
              <Glasses size={12} /> Buste aperte
            </FlagChip>
            {allTags.length > 0 && <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />}
            {allTags.map(({ t, n }) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className={`chip py-1 transition-colors ${tag === t ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}
              >
                {t} <span className="text-slate-500">{n}</span>
              </button>
            ))}
            {hasFilters && (
              <button
                className="ml-auto text-xs text-slate-400 hover:text-cyan-300"
                onClick={() => {
                  setQ('');
                  setTag(null);
                  setFlags(new Set());
                }}
              >
                Azzera filtri
              </button>
            )}
          </div>
        </div>

        {!ready ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <Users size={32} className="text-slate-600" />
            <p className="text-sm text-slate-400">{customers.length ? 'Nessun cliente corrisponde ai filtri.' : 'Nessun cliente in archivio.'}</p>
            <button className="btn-primary" onClick={openNew}>
              <UserPlus size={16} /> Nuovo cliente
            </button>
          </div>
        ) : (
          <>
            <p className="border-b border-white/[0.04] px-4 py-2 text-[11px] text-slate-500">
              {filtered.length} {filtered.length === 1 ? 'cliente' : 'clienti'}
              {hasFilters && ` su ${customers.length}`}
            </p>
            {/* tabella desktop */}
            <table className="hidden w-full table-fixed text-left text-sm md:table">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-white/[0.06]">
                  <th className="w-[30%] px-4 py-2.5 font-medium">Cliente</th>
                  <th className="w-[17%] px-3 py-2.5 font-medium">Telefono</th>
                  <th className="hidden w-[29%] px-3 py-2.5 font-medium lg:table-cell">Ultima prescrizione</th>
                  <th className="w-[13%] px-3 py-2.5 font-medium">Ultima visita</th>
                  <th className="px-3 py-2.5 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.c.id} onClick={() => setDetailId(r.c.id)} className="group cursor-pointer border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.025]">
                    <td className="px-4 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar c={r.c} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white group-hover:text-cyan-100">{r.name}</p>
                          <p className="truncate font-mono text-[11px] text-slate-500">
                            {r.c.code}
                            {r.age !== null && ` · ${r.age} anni`}
                            {r.c.city && ` · ${r.c.city}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="truncate px-3 py-2.5 font-mono text-xs text-slate-300">{r.c.phone || '—'}</td>
                    <td className="hidden truncate px-3 py-2.5 font-mono text-xs text-slate-400 lg:table-cell" title={r.rxSummary}>
                      {r.rxSummary || <span className="font-sans text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-400">{fmtDate(r.last)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                          <Badges r={r} />
                        </div>
                        <ChevronRight size={16} className="shrink-0 text-slate-600 transition-colors group-hover:text-cyan-300" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* card mobile */}
            <div className="grid gap-2 p-3 md:hidden">
              {visible.map((r, i) => (
                <motion.button
                  key={r.c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.02 }}
                  onClick={() => setDetailId(r.c.id)}
                  className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3 text-left transition-colors active:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-3">
                    <Avatar c={r.c} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-white">{r.name}</p>
                        <span className="shrink-0 font-mono text-[11px] text-slate-500">{r.c.code}</span>
                      </div>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                        {r.age !== null && <span>{r.age} anni</span>}
                        {r.c.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> {r.c.phone}
                          </span>
                        )}
                        <span>Ultima visita {fmtDate(r.last)}</span>
                      </p>
                      {r.rxSummary && <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{r.rxSummary}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badges r={r} />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {filtered.length > limit && (
              <div className="border-t border-white/[0.04] p-3 text-center">
                <button className="btn-ghost text-xs" onClick={() => setLimit((l) => l + PAGE)}>
                  Mostra altri {Math.min(PAGE, filtered.length - limit)} clienti
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CustomerDetail
        customer={form ? null : detail}
        onClose={() => setDetailId(null)}
        onEdit={() => detail && setForm({ customer: detail, isNew: false, back: true })}
        onNavigate={onNavigate}
        onSave={saveCustomer}
        onDelete={deleteCustomer}
      />

      <CustomerForm
        open={!!form}
        initial={form?.customer ?? null}
        isNew={form?.isNew ?? false}
        onClose={() => {
          if (form && !form.back) setDetailId(null);
          setForm(null);
        }}
        onSave={async (c) => {
          const isNew = form?.isNew ?? false;
          if (isNew && customers.some((x) => x.code === c.code)) c = { ...c, code: nextCustomerCode(customers) };
          const dup = isNew && c.fiscalCode ? customers.find((x) => x.fiscalCode === c.fiscalCode) : undefined;
          if (dup) {
            notify(`Codice fiscale già presente: ${fullName(dup)} (${dup.code}).`, 'error');
            return;
          }
          await saveCustomer(c, isNew ? `Cliente ${fullName(c)} creato (${c.code}).` : 'Scheda aggiornata.');
          setForm(null);
          setDetailId(c.id);
        }}
      />
    </div>
  );
}

function Badges({ r }: { r: Row }) {
  const out: ReactNode[] = [];
  if (r.check.state === 'overdue')
    out.push(
      <span key="ov" className="chip border-rose-400/30 bg-rose-400/10 text-[10px] text-rose-200">
        <CalendarX2 size={10} /> Controllo
      </span>,
    );
  if (r.hasCl)
    out.push(
      <span key="cl" className={`chip text-[10px] ${r.clDue ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-violet-400/30 bg-violet-400/10 text-violet-200'}`}>
        LAC{r.clDue ? ' · riordino' : ''}
      </span>,
    );
  if (r.openOrders > 0)
    out.push(
      <span key="ord" className="chip border-amber-400/30 bg-amber-400/10 text-[10px] text-amber-200">
        <Glasses size={10} /> {r.openOrders} {r.openOrders === 1 ? 'busta' : 'buste'}
      </span>,
    );
  if (r.noConsent)
    out.push(
      <span key="gdpr" className="chip border-amber-400/30 bg-amber-400/10 text-[10px] text-amber-200" title="Consensi privacy/dati sanitari mancanti">
        <AlertTriangle size={10} /> GDPR
      </span>,
    );
  return out.length ? <>{out}</> : <span className="text-xs text-slate-600">—</span>;
}

function Stat({ icon, label, value, tone, onClick, active }: { icon: ReactNode; label: string; value: number; tone: string; onClick?: () => void; active?: boolean }) {
  const [grad, text] = tone.split(' ');
  const body = (
    <>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} to-transparent ${text}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums text-white">{value}</p>
        <p className="truncate text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      </div>
    </>
  );
  const cls = `panel flex items-center gap-3 p-3 sm:p-4 text-left ${active ? 'ring-1 ring-cyan-400/40' : ''}`;
  return onClick ? (
    <button className={`${cls} transition-colors hover:border-white/15`} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const FLAG_TONES = {
  rose: 'border-rose-400/40 bg-rose-400/15 text-rose-100',
  amber: 'border-amber-400/40 bg-amber-400/15 text-amber-100',
  violet: 'border-violet-400/40 bg-violet-400/15 text-violet-100',
};

function FlagChip({ active, onClick, tone, children }: { active: boolean; onClick: () => void; tone: keyof typeof FLAG_TONES; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`chip py-1 transition-colors ${active ? FLAG_TONES[tone] : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}>
      {children}
    </button>
  );
}
