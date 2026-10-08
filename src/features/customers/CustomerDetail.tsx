import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CalendarClock,
  CalendarPlus,
  CircleDot,
  Glasses,
  History,
  Mail,
  MessageCircle,
  MessageSquare,
  Pencil,
  Phone,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useStore } from '../../store/StoreContext';
import type { ContactChannel, Customer } from '../../store/types';
import { age, contactLink, eur, fmtDate, fullName, ORDER_STATUS, orderTotals, rxLine, todayISO } from '../../store/utils';
import type { ViewId } from '../../types';
import { checkState, CL_STATE, clReorder, isOpenOrder, latestCl, sortedRx } from './helpers';
import { ContactLensTab } from './ContactLensTab';
import { PrescriptionsTab } from './PrescriptionsTab';
import { PrivacyTab } from './PrivacyTab';
import { Avatar, Empty, SectionTitle } from './ui';

type Tab = 'overview' | 'rx' | 'cl' | 'purchases' | 'privacy';

interface Props {
  customer: Customer | null;
  onClose: () => void;
  onEdit: () => void;
  onNavigate: (view: ViewId, focusId?: string) => void;
  onSave: (c: Customer, msg?: string) => Promise<void>;
  onDelete: (c: Customer) => Promise<void>;
}

const CHANNEL_ICON: Record<ContactChannel, typeof Phone> = { WhatsApp: MessageCircle, SMS: MessageSquare, Email: Mail, Telefono: Phone };

const APPT_STATUS: Record<string, string> = {
  programmato: 'Programmato',
  confermato: 'Confermato',
  completato: 'Completato',
  non_presentato: 'Non presentato',
  annullato: 'Annullato',
};

export function CustomerDetail({ customer: c, onClose, onEdit, onNavigate, onSave, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const cid = c?.id;
  useEffect(() => setTab('overview'), [cid]);

  return (
    <Modal
      open={!!c}
      onClose={onClose}
      size="full"
      icon={c ? <Avatar c={c} size="sm" /> : undefined}
      title={
        c ? (
          <span className="flex flex-wrap items-center gap-2">
            {fullName(c)}
            {c.tags.slice(0, 4).map((t) => (
              <span key={t} className="chip border-white/10 bg-white/[0.04] text-[10px] font-medium text-slate-300">
                {t}
              </span>
            ))}
          </span>
        ) : undefined
      }
      subtitle={
        c ? (
          <span className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="font-mono text-cyan-200/90">{c.code}</span>
            {age(c.birthDate) !== null && <span>{age(c.birthDate)} anni</span>}
            {c.fiscalCode && <span className="font-mono text-slate-400">{c.fiscalCode}</span>}
            {c.profession && <span className="text-slate-500">{c.profession}</span>}
          </span>
        ) : undefined
      }
    >
      {c && <DetailBody c={c} tab={tab} setTab={setTab} onEdit={onEdit} onNavigate={onNavigate} onSave={onSave} onDelete={onDelete} />}
    </Modal>
  );
}

function DetailBody({ c, tab, setTab, onEdit, onNavigate, onSave, onDelete }: { c: Customer; tab: Tab; setTab: (t: Tab) => void } & Omit<Props, 'customer' | 'onClose'>) {
  const { orders, sales, appointments, settings } = useStore();
  const myOrders = useMemo(() => orders.filter((o) => o.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [orders, c.id]);
  const mySales = useMemo(() => sales.filter((s) => s.customerId === c.id).sort((a, b) => b.date.localeCompare(a.date)), [sales, c.id]);
  const myAppts = useMemo(() => appointments.filter((a) => a.customerId === c.id).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)), [appointments, c.id]);
  const consentOk = c.consents.privacy && c.consents.healthData;

  const msg = `Gentile ${c.firstName}, `;
  const tabs: Array<[Tab, string, typeof User, number | null]> = [
    ['overview', 'Panoramica', User, null],
    ['rx', 'Prescrizioni', Glasses, c.prescriptions.length],
    ['cl', 'Lenti a contatto', CircleDot, c.contactLenses.length],
    ['purchases', 'Acquisti', ShoppingBag, myOrders.length + mySales.length],
    ['privacy', 'Privacy', consentOk ? ShieldCheck : ShieldAlert, null],
  ];

  return (
    <div>
      {/* barra azioni */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {(['WhatsApp', 'SMS', 'Email', 'Telefono'] as const).map((ch) => {
            const href = contactLink(ch, c, `${msg}\n\n${settings.messageSignature}`, settings.businessName);
            const Icon = CHANNEL_ICON[ch];
            const preferred = c.preferredChannel === ch;
            return href ? (
              <a
                key={ch}
                href={href}
                target={ch === 'WhatsApp' ? '_blank' : undefined}
                rel="noreferrer"
                title={`${ch}${preferred ? ' (canale preferito)' : ''}`}
                className={`btn px-2.5 py-1.5 text-xs ${preferred ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20' : 'btn-ghost'}`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{ch}</span>
              </a>
            ) : (
              <span key={ch} className="btn-ghost cursor-not-allowed px-2.5 py-1.5 text-xs opacity-40" title={`${ch}: recapito mancante`}>
                <Icon size={14} />
                <span className="hidden sm:inline">{ch}</span>
              </span>
            );
          })}
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={onEdit}>
            <Pencil size={14} /> Modifica
          </button>
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => onNavigate('agenda', `new:${c.id}`)}>
            <CalendarPlus size={14} /> Appuntamento
          </button>
          <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => onNavigate('pos', `new:${c.id}`)}>
            <Receipt size={14} /> Vendita
          </button>
          <button className="btn-primary px-2.5 py-1.5 text-xs" onClick={() => onNavigate('orders', `new:${c.id}`)}>
            <Glasses size={14} /> Nuova busta
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="sticky top-0 z-10 overflow-x-auto border-b border-white/[0.06] bg-ink-850/95 px-3 backdrop-blur">
        <div className="flex min-w-max gap-1">
          {tabs.map(([id, label, Icon, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${tab === id ? 'text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Icon size={15} className={id === 'privacy' && !consentOk ? 'text-amber-300' : ''} />
              {label}
              {count !== null && count > 0 && <span className="rounded-full bg-white/[0.06] px-1.5 text-[10px] text-slate-300">{count}</span>}
              {tab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-cyan-400" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {tab === 'overview' && <Overview c={c} myOrders={myOrders} mySales={mySales} myAppts={myAppts} onNavigate={onNavigate} onTab={setTab} />}
        {tab === 'rx' && <PrescriptionsTab customer={c} onSave={onSave} onNavigate={onNavigate} onGoPrivacy={() => setTab('privacy')} />}
        {tab === 'cl' && <ContactLensTab customer={c} onSave={onSave} onNavigate={onNavigate} onGoPrivacy={() => setTab('privacy')} />}
        {tab === 'purchases' && <Purchases myOrders={myOrders} mySales={mySales} onNavigate={onNavigate} />}
        {tab === 'privacy' && <PrivacyTab customer={c} onSave={onSave} onDelete={() => onDelete(c)} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ panoramica */

type Store = ReturnType<typeof useStore>;

interface TimelineItem {
  id: string;
  date: string;
  kind: 'rx' | 'cl' | 'order' | 'sale' | 'appt';
  title: string;
  detail: string;
  badge?: { label: string; tone: string };
  onClick?: () => void;
}

const KIND_STYLE: Record<TimelineItem['kind'], { icon: typeof Glasses; tone: string; label: string }> = {
  rx: { icon: Glasses, tone: 'bg-cyan-400/15 text-cyan-300 ring-cyan-400/30', label: 'Prescrizione' },
  cl: { icon: CircleDot, tone: 'bg-violet-400/15 text-violet-300 ring-violet-400/30', label: 'Lenti a contatto' },
  order: { icon: ShoppingBag, tone: 'bg-amber-400/15 text-amber-300 ring-amber-400/30', label: 'Busta' },
  sale: { icon: Receipt, tone: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30', label: 'Vendita' },
  appt: { icon: CalendarClock, tone: 'bg-sky-400/15 text-sky-300 ring-sky-400/30', label: 'Appuntamento' },
};

function Overview({
  c,
  myOrders,
  mySales,
  myAppts,
  onNavigate,
  onTab,
}: {
  c: Customer;
  myOrders: Store['orders'];
  mySales: Store['sales'];
  myAppts: Store['appointments'];
  onNavigate: (view: ViewId, focusId?: string) => void;
  onTab: (t: Tab) => void;
}) {
  const [kindFilter, setKindFilter] = useState<TimelineItem['kind'] | 'all'>('all');
  const rx = sortedRx(c)[0];
  const cl = latestCl(c);
  const clr = cl ? clReorder(cl) : null;
  const check = checkState(c);
  const year = String(new Date().getFullYear());
  const spentYear = mySales.filter((s) => s.date.startsWith(year)).reduce((s, x) => s + x.total, 0);
  const openOrders = myOrders.filter(isOpenOrder);
  const nextAppt = [...myAppts].reverse().find((a) => a.date >= todayISO() && (a.status === 'programmato' || a.status === 'confermato'));

  const items = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = [];
    for (const r of c.prescriptions)
      out.push({ id: r.id, date: r.date, kind: 'rx', title: `${r.kind} · ${r.source}`, detail: `OD ${rxLine(r.od)} · OS ${rxLine(r.os)}`, onClick: () => onTab('rx') });
    for (const f of c.contactLenses) out.push({ id: f.id, date: f.date, kind: 'cl', title: `${f.brand} ${f.product}`, detail: `${f.replacement}`, onClick: () => onTab('cl') });
    for (const o of myOrders) {
      const st = ORDER_STATUS[o.status];
      out.push({
        id: o.id,
        date: o.createdAt,
        kind: 'order',
        title: `Busta ${o.number} · ${o.type}`,
        detail: [o.frame.brand && `${o.frame.brand} ${o.frame.model}`, o.lenses.brand && `${o.lenses.brand} ${o.lenses.design}`, eur(orderTotals(o).total)].filter(Boolean).join(' · '),
        badge: { label: st.label, tone: st.tone },
        onClick: () => onNavigate('orders', o.id),
      });
    }
    for (const s of mySales)
      out.push({
        id: s.id,
        date: s.date,
        kind: 'sale',
        title: `${s.docType} ${s.number}`,
        detail: `${s.lines.map((l) => l.description).slice(0, 2).join(', ')}${s.lines.length > 2 ? '…' : ''} · ${eur(s.total)} · ${s.payment}`,
        onClick: () => onNavigate('pos', s.id),
      });
    for (const a of myAppts)
      out.push({
        id: a.id,
        date: `${a.date}T${a.time}`,
        kind: 'appt',
        title: `${a.type} · ore ${a.time}`,
        detail: [a.operator && `con ${a.operator}`, a.notes].filter(Boolean).join(' · ') || '—',
        badge: { label: APPT_STATUS[a.status] ?? a.status, tone: a.status === 'completato' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : a.status === 'annullato' || a.status === 'non_presentato' ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : 'border-sky-400/30 bg-sky-400/10 text-sky-200' },
        onClick: () => onNavigate('agenda', a.id),
      });
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [c, myOrders, mySales, myAppts, onNavigate, onTab]);

  const shown = kindFilter === 'all' ? items : items.filter((i) => i.kind === kindFilter);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Kpi icon={<Star size={14} />} label="Punti fedeltà" value={String(c.loyaltyPoints)} tone="text-amber-300" />
          <Kpi icon={<Receipt size={14} />} label={`Spesa ${year}`} value={eur(spentYear)} tone="text-emerald-300" />
          <Kpi icon={<ShoppingBag size={14} />} label="Buste aperte" value={String(openOrders.length)} tone={openOrders.length ? 'text-amber-300' : 'text-slate-300'} />
          <Kpi
            icon={<CalendarClock size={14} />}
            label="Prossimo controllo"
            value={check.due ? fmtDate(check.due) : '—'}
            tone={check.state === 'overdue' ? 'text-rose-300' : check.state === 'soon' ? 'text-amber-300' : 'text-slate-200'}
          />
        </div>

        <InfoCard title="Ultima prescrizione" action={rx ? { label: 'Apri', onClick: () => onTab('rx') } : undefined}>
          {rx ? (
            <div className="space-y-1 font-mono text-xs text-slate-200">
              <p className="font-sans text-[11px] text-slate-500">
                {fmtDate(rx.date)} · {rx.kind}
              </p>
              <p>
                <span className="font-sans font-semibold text-cyan-300">OD</span> {rxLine(rx.od)}
              </p>
              <p>
                <span className="font-sans font-semibold text-cyan-300">OS</span> {rxLine(rx.os)}
              </p>
              <p className="font-sans text-[11px] text-slate-500">
                DNP {rx.pdOd}/{rx.pdOs} mm
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nessuna prescrizione.</p>
          )}
        </InfoCard>

        {cl && clr && (
          <InfoCard title="Lenti a contatto" action={{ label: 'Apri', onClick: () => onTab('cl') }}>
            <p className="text-sm text-slate-200">
              {cl.brand} {cl.product}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className={`chip ${CL_STATE[clr.state].tone}`}>{CL_STATE[clr.state].label}</span>
              {clr.date && `Riordino ${fmtDate(clr.date)}`}
            </p>
          </InfoCard>
        )}

        {nextAppt && (
          <InfoCard title="Prossimo appuntamento" action={{ label: 'Agenda', onClick: () => onNavigate('agenda', nextAppt.id) }}>
            <p className="text-sm text-slate-200">{nextAppt.type}</p>
            <p className="text-xs text-slate-400">
              {fmtDate(nextAppt.date)} · ore {nextAppt.time}
            </p>
          </InfoCard>
        )}

        <InfoCard title="Contatti">
          <dl className="space-y-1.5 text-sm">
            <Row k="Telefono" v={c.phone} />
            <Row k="Email" v={c.email} />
            <Row k="Indirizzo" v={[c.address, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')} />
            <Row k="Canale" v={c.preferredChannel} />
            <Row k="Nascita" v={c.birthDate ? fmtDate(c.birthDate) : ''} />
            <Row k="Cliente dal" v={fmtDate(c.createdAt)} />
          </dl>
        </InfoCard>

        {(c.visualNeeds.length > 0 || c.notes) && (
          <InfoCard title="Esigenze e note">
            {c.visualNeeds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {c.visualNeeds.map((v) => (
                  <span key={v} className="chip border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200">
                    {v}
                  </span>
                ))}
              </div>
            )}
            {c.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{c.notes}</p>}
          </InfoCard>
        )}
      </div>

      <div className="min-w-0">
        <SectionTitle icon={<History size={14} />}>Cronologia</SectionTitle>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(['all', 'rx', 'cl', 'order', 'sale', 'appt'] as const).map((k) => {
            const n = k === 'all' ? items.length : items.filter((i) => i.kind === k).length;
            if (k !== 'all' && !n) return null;
            return (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className={`chip py-1 transition-colors ${kindFilter === k ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
              >
                {k === 'all' ? 'Tutto' : KIND_STYLE[k].label} <span className="text-slate-500">{n}</span>
              </button>
            );
          })}
        </div>
        {shown.length === 0 ? (
          <Empty icon={<Sparkles size={28} />}>Nessuna attività registrata per questo cliente.</Empty>
        ) : (
          <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-white/[0.07]">
            {shown.map((it) => {
              const k = KIND_STYLE[it.kind];
              const future = it.date.slice(0, 10) > todayISO();
              return (
                <li key={`${it.kind}-${it.id}`}>
                  <button onClick={it.onClick} className="group relative flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/[0.03]">
                    <span className={`relative z-[1] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ring-1 ${k.tone} mt-1`}>
                      <k.icon size={10} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-100 group-hover:text-white">{it.title}</span>
                        {it.badge && <span className={`chip text-[10px] ${it.badge.tone}`}>{it.badge.label}</span>}
                        {future && <span className="chip border-sky-400/30 bg-sky-400/10 text-[10px] text-sky-200">In programma</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">{it.detail}</span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-slate-500">
                      {fmtDate(it.date)}
                      <span className="block text-[10px] uppercase tracking-wider text-slate-600">{k.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </p>
      <p className={`mt-1 truncate text-base font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function InfoCard({ title, children, action }: { title: string; children: ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
        {action && (
          <button className="text-xs text-cyan-300 hover:text-cyan-200" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-xs text-slate-500">{k}</dt>
      <dd className="min-w-0 break-words text-slate-200">{v || '—'}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ acquisti */

function Purchases({ myOrders, mySales, onNavigate }: { myOrders: Store['orders']; mySales: Store['sales']; onNavigate: (view: ViewId, focusId?: string) => void }) {
  const year = String(new Date().getFullYear());
  const spentYear = mySales.filter((s) => s.date.startsWith(year)).reduce((s, x) => s + x.total, 0);
  const spentAll = mySales.reduce((s, x) => s + x.total, 0);
  const open = myOrders.filter(isOpenOrder);
  const openDue = open.reduce((s, o) => s + orderTotals(o).due, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi icon={<Receipt size={14} />} label={`Speso nel ${year}`} value={eur(spentYear)} tone="text-emerald-300" />
        <Kpi icon={<Receipt size={14} />} label="Speso totale" value={eur(spentAll)} tone="text-slate-100" />
        <Kpi icon={<ShoppingBag size={14} />} label="Buste aperte" value={String(open.length)} tone="text-amber-300" />
        <Kpi icon={<ShoppingBag size={14} />} label="Saldo da incassare" value={eur(openDue)} tone={openDue ? 'text-amber-300' : 'text-slate-300'} />
      </div>

      <section>
        <SectionTitle icon={<ShoppingBag size={14} />}>Buste di lavoro ({myOrders.length})</SectionTitle>
        {myOrders.length === 0 ? (
          <Empty icon={<ShoppingBag size={28} />}>Nessuna busta.</Empty>
        ) : (
          <div className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06]">
            {myOrders.map((o) => {
              const t = orderTotals(o);
              const st = ORDER_STATUS[o.status];
              return (
                <button key={o.id} onClick={() => onNavigate('orders', o.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 bg-ink-900/30 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]">
                  <span className="font-mono text-sm text-white">{o.number}</span>
                  <span className={`chip ${st.tone}`}>{st.label}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-400">{o.type}</span>
                  <span className="text-xs text-slate-500">{fmtDate(o.createdAt)}</span>
                  <span className="w-24 text-right font-mono text-sm tabular-nums text-slate-100">{eur(t.total)}</span>
                  {t.due > 0 && o.status !== 'annullato' && <span className="w-full text-right text-[11px] text-amber-300 sm:w-auto">da saldare {eur(t.due)}</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle icon={<Receipt size={14} />}>Vendite ({mySales.length})</SectionTitle>
        {mySales.length === 0 ? (
          <Empty icon={<Receipt size={28} />}>Nessuna vendita.</Empty>
        ) : (
          <div className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06]">
            {mySales.map((s) => (
              <button key={s.id} onClick={() => onNavigate('pos', s.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 bg-ink-900/30 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]">
                <span className="font-mono text-sm text-white">{s.number}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-400">{s.lines.map((l) => l.description).join(', ')}</span>
                <span className="text-xs text-slate-500">
                  {fmtDate(s.date)} · {s.payment}
                </span>
                <span className="w-24 text-right font-mono text-sm tabular-nums text-slate-100">{eur(s.total)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
