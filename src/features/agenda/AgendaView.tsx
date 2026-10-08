import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock, UserX, Users } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { Appointment } from '../../store/types';
import type { ViewId } from '../../types';
import { dayMonth, diffDays, fromMin, isoOf, localToday, parseISO, shiftDays, startOfWeek, toMin, weekdayLong, weekdayShort } from './dates';
import { APPT_TYPES, DAY_END, DAY_START, SLOT, STATUS_META, TYPE_STYLE, isActive, layoutDay, overlaps } from './shared';
import { AppointmentForm, type ApptDraft } from './AppointmentForm';

interface Props {
  focusId: string | null;
  onFocusConsumed: () => void;
  onNavigate: (view: ViewId, focusId?: string) => void;
}

const SLOT_PX = 22;
const SLOTS = (DAY_END - DAY_START) / SLOT;
const SUNDAY_KEY = 'visuallab.agenda.sunday';

function readSunday(): boolean {
  try {
    return localStorage.getItem(SUNDAY_KEY) === '1';
  } catch {
    return false;
  }
}

function useIsMobile(): boolean {
  const query = '(max-width: 767px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

function nowMinutes(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export function AgendaView({ focusId, onFocusConsumed, onNavigate }: Props) {
  const { appointments, ready, customerById } = useStore();
  const { notify } = useApp();
  const isMobile = useIsMobile();
  const today = localToday();
  const [anchor, setAnchor] = useState(today);
  const [userMode, setUserMode] = useState<'week' | 'day'>('week');
  const [showSunday, setShowSunday] = useState(readSunday);
  const [draft, setDraft] = useState<ApptDraft | null>(null);
  const [now, setNow] = useState(nowMinutes);

  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(t);
  }, []);

  const mode = isMobile ? 'day' : userMode;

  const toggleSunday = () => {
    setShowSunday((s) => {
      try {
        localStorage.setItem(SUNDAY_KEY, s ? '0' : '1');
      } catch {
        /* archiviazione non disponibile */
      }
      return !s;
    });
  };

  const days = useMemo(() => {
    if (mode === 'day') return [anchor];
    const start = startOfWeek(anchor);
    return Array.from({ length: showSunday ? 7 : 6 }, (_, i) => shiftDays(start, i));
  }, [mode, anchor, showSunday]);

  const byDate = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const l = m.get(a.date);
      if (l) l.push(a);
      else m.set(a.date, [a]);
    }
    return m;
  }, [appointments]);

  /* ------------------------------------------------------------ bozze */

  const blank = useCallback(
    (date: string, time: string, customerId?: string): ApptDraft => {
      const c = customerById(customerId);
      return {
        customerId: c?.id,
        name: c ? `${c.firstName} ${c.lastName}`.trim() : '',
        phone: c?.phone ?? '',
        date,
        time,
        duration: 30,
        type: 'Esame della vista',
        operator: '',
        status: 'programmato',
        notes: '',
      };
    },
    [customerById],
  );

  /** Primo slot libero (nessun appuntamento attivo sovrapposto) a partire da ora */
  const nextFreeSlot = useCallback(
    (duration = 30): { date: string; time: string } => {
      for (let i = 0; i < 21; i++) {
        const date = shiftDays(today, i);
        if (parseISO(date).getDay() === 0 && !showSunday) continue;
        const list = (byDate.get(date) ?? []).filter(isActive);
        let start = DAY_START;
        if (i === 0) start = Math.max(DAY_START, Math.ceil(nowMinutes() / SLOT) * SLOT);
        for (let m = start; m + duration <= DAY_END; m += SLOT) {
          const cand = { time: fromMin(m), duration };
          if (!list.some((a) => overlaps(a, cand))) return { date, time: cand.time };
        }
      }
      return { date: today, time: fromMin(DAY_START) };
    },
    [byDate, today, showSunday],
  );

  const openNew = useCallback(
    (customerId?: string) => {
      const s = nextFreeSlot();
      setDraft(blank(s.date, s.time, customerId));
      setAnchor(s.date);
    },
    [nextFreeSlot, blank],
  );

  const openEdit = (a: Appointment) => setDraft({ ...a, notes: a.notes ?? '' });

  useEffect(() => {
    if (!focusId || !ready) return;
    if (focusId === 'new') openNew();
    else if (focusId.startsWith('new:')) openNew(focusId.slice(4));
    else {
      const a = appointments.find((x) => x.id === focusId);
      if (a) {
        setAnchor(a.date);
        setDraft({ ...a });
      } else notify('Appuntamento non trovato.', 'error');
    }
    onFocusConsumed();
  }, [focusId, ready, appointments, openNew, onFocusConsumed, notify]);

  /* ------------------------------------------------------------ statistiche */

  const stats = useMemo(() => {
    const todayCount = (byDate.get(today) ?? []).filter(isActive).length;
    const ws = startOfWeek(today);
    const weekCount = appointments.filter((a) => isActive(a) && diffDays(ws, a.date) >= 0 && diffDays(ws, a.date) < 7).length;
    const recent = appointments.filter((a) => (a.status === 'completato' || a.status === 'non_presentato') && diffDays(a.date, today) <= 90 && diffDays(a.date, today) >= 0);
    const noShow = recent.filter((a) => a.status === 'non_presentato').length;
    const rate = recent.length ? Math.round((noShow / recent.length) * 100) : 0;
    return { todayCount, weekCount, rate, recent: recent.length, noShow };
  }, [appointments, byDate, today]);

  const todayList = useMemo(() => [...(byDate.get(today) ?? [])].sort((a, b) => toMin(a.time) - toMin(b.time)), [byDate, today]);

  /* ------------------------------------------------------------ navigazione */

  const step = mode === 'day' ? 1 : 7;
  const rangeLabel =
    mode === 'day'
      ? weekdayLong(anchor)
      : `${dayMonth(days[0] ?? anchor)} – ${dayMonth(days[days.length - 1] ?? anchor)} ${parseISO(days[days.length - 1] ?? anchor).getFullYear()}`;

  const hourLabels = Array.from({ length: SLOTS }, (_, i) => DAY_START + i * SLOT);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Negozio"
        title="Agenda"
        icon={<CalendarDays size={22} />}
        description="Esami della vista, controlli LAC, ritiri e consulenze. Clicca su uno spazio libero per fissare un appuntamento."
        actions={
          <button className="btn-primary" onClick={() => openNew()}>
            <CalendarPlus size={16} /> Nuovo appuntamento
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Clock size={16} />} label="Appuntamenti oggi" value={String(stats.todayCount)} />
        <Stat icon={<CalendarDays size={16} />} label="Questa settimana" value={String(stats.weekCount)} />
        <Stat icon={<UserX size={16} />} label="Non presentati (90 gg)" value={`${stats.rate}%`} hint={`${stats.noShow} su ${stats.recent}`} tone={stats.rate >= 15 ? 'text-rose-300' : 'text-white'} />
        <Stat icon={<Users size={16} />} label="Prossimo slot libero" value={(() => {
          const s = nextFreeSlot();
          return s.date === today ? `Oggi ${s.time}` : `${dayMonth(s.date)} ${s.time}`;
        })()} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="panel min-w-0 overflow-hidden">
          {/* barra di navigazione */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] p-3">
            <button className="btn-ghost px-2.5" onClick={() => setAnchor(shiftDays(anchor, -step))} aria-label="Precedente">
              <ChevronLeft size={16} />
            </button>
            <button className="btn-ghost" onClick={() => setAnchor(today)}>
              Oggi
            </button>
            <button className="btn-ghost px-2.5" onClick={() => setAnchor(shiftDays(anchor, step))} aria-label="Successivo">
              <ChevronRight size={16} />
            </button>
            <span className="ml-1 text-sm font-medium capitalize text-slate-200">{rangeLabel}</span>
            <div className="ml-auto flex items-center gap-2">
              {!isMobile && (
                <div className="flex rounded-lg border border-white/10 bg-ink-900/60 p-0.5 text-xs">
                  {(['week', 'day'] as const).map((m) => (
                    <button key={m} onClick={() => setUserMode(m)} className={`rounded-md px-2.5 py-1 transition ${userMode === m ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}>
                      {m === 'week' ? 'Settimana' : 'Giorno'}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'week' && (
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                  <input type="checkbox" checked={showSunday} onChange={toggleSunday} className="accent-cyan-500" /> Domenica
                </label>
              )}
            </div>
          </div>

          {/* griglia */}
          <div className="max-h-[70vh] overflow-auto">
            <div className={mode === 'week' ? 'min-w-[680px]' : ''}>
              <div className="sticky top-0 z-20 grid border-b border-white/[0.06] bg-ink-850/95 backdrop-blur" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}>
                <div />
                {days.map((iso) => {
                  const isToday = iso === today;
                  const count = (byDate.get(iso) ?? []).filter(isActive).length;
                  return (
                    <button
                      key={iso}
                      onClick={() => {
                        setAnchor(iso);
                        if (!isMobile) setUserMode('day');
                      }}
                      className="flex flex-col items-center gap-0.5 border-l border-white/[0.04] py-2 text-xs transition hover:bg-white/[0.03]"
                      title="Vista giorno"
                    >
                      <span className={`uppercase tracking-wider ${isToday ? 'text-cyan-300' : 'text-slate-500'}`}>{weekdayShort(iso)}</span>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-cyan-500 text-white' : 'text-slate-200'}`}>{parseISO(iso).getDate()}</span>
                      <span className="text-[10px] text-slate-500">{count ? `${count} app.` : '—'}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}>
                {/* etichette orarie */}
                <div className="relative" style={{ height: SLOTS * SLOT_PX }}>
                  {hourLabels.map((m, i) =>
                    m % 30 === 0 ? (
                      <span key={m} className={`absolute right-2 -translate-y-1/2 text-[10px] tabular-nums ${m % 60 === 0 ? 'text-slate-400' : 'text-slate-600'}`} style={{ top: i * SLOT_PX }}>
                        {i === 0 ? '' : fromMin(m)}
                      </span>
                    ) : null,
                  )}
                </div>

                {days.map((iso) => {
                  const list = byDate.get(iso) ?? [];
                  const placed = layoutDay(list);
                  const isToday = iso === today;
                  const past = diffDays(iso, today) > 0;
                  return (
                    <div key={iso} className={`relative border-l border-white/[0.04] ${isToday ? 'bg-cyan-400/[0.025]' : ''}`} style={{ height: SLOTS * SLOT_PX }}>
                      {hourLabels.map((m, i) => {
                        const slotPast = past || (isToday && m + SLOT <= now);
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDraft(blank(iso, fromMin(m)))}
                            className={`group absolute inset-x-0 border-t text-left transition hover:bg-cyan-400/[0.08] ${m % 60 === 0 ? 'border-white/[0.07]' : 'border-white/[0.025]'} ${slotPast ? 'bg-black/[0.12]' : ''}`}
                            style={{ top: i * SLOT_PX, height: SLOT_PX }}
                            aria-label={`Nuovo appuntamento ${weekdayLong(iso)} ore ${fromMin(m)}`}
                          >
                            <span className="hidden pl-1.5 text-[10px] text-cyan-300/80 group-hover:inline">+ {fromMin(m)}</span>
                          </button>
                        );
                      })}

                      {isToday && now >= DAY_START && now <= DAY_END && (
                        <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((now - DAY_START) / SLOT) * SLOT_PX }}>
                          <span className="-ml-1 h-2 w-2 rounded-full bg-rose-400" />
                          <span className="h-px flex-1 bg-rose-400/80" />
                        </div>
                      )}

                      {placed.map(({ a, col, cols }) => {
                        const start = Math.max(toMin(a.time), DAY_START);
                        const end = Math.min(toMin(a.time) + a.duration, DAY_END);
                        if (end <= DAY_START || start >= DAY_END) return null;
                        const top = ((start - DAY_START) / SLOT) * SLOT_PX;
                        const height = Math.max(((end - start) / SLOT) * SLOT_PX - 2, 18);
                        const style = TYPE_STYLE[a.type] ?? TYPE_STYLE.Altro;
                        const cancelled = a.status === 'annullato';
                        const noShow = a.status === 'non_presentato';
                        const compact = height < 40;
                        return (
                          <motion.button
                            key={a.id}
                            type="button"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => openEdit(a)}
                            className={`absolute z-[5] overflow-hidden rounded-lg border px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-md shadow-black/30 transition-colors ${style.block} ${cancelled ? 'opacity-40 line-through' : ''} ${noShow ? 'border-dashed opacity-70' : ''}`}
                            style={{ top: top + 1, height, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)` }}
                            title={`${a.time} · ${a.name} · ${a.type} · ${a.operator || 'operatore non indicato'} · ${STATUS_META[a.status].label}`}
                          >
                            <div className="flex items-center gap-1 truncate font-semibold">
                              {a.status === 'confermato' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />}
                              <span className="truncate">
                                {a.time} {a.name}
                              </span>
                            </div>
                            {!compact && <div className="truncate opacity-80">{a.type}</div>}
                            {!compact && height > 56 && a.operator && <div className="truncate opacity-60">{a.operator}</div>}
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* legenda */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/[0.06] px-3 py-2.5">
            {APPT_TYPES.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className={`h-2 w-2 rounded-full ${TYPE_STYLE[t].dot}`} /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* pannello laterale */}
        <aside className="space-y-4">
          <MiniCalendar value={anchor} today={today} onPick={setAnchor} marks={byDate} />
          <div className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Oggi</h3>
              <span className="text-xs capitalize text-slate-500">{weekdayLong(today)}</span>
            </div>
            {todayList.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun appuntamento per oggi.</p>
            ) : (
              <ul className="space-y-1.5">
                {todayList.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => openEdit(a)} className={`flex w-full items-start gap-2.5 rounded-xl border border-transparent px-2 py-1.5 text-left transition hover:border-white/10 hover:bg-white/[0.03] ${a.status === 'annullato' ? 'opacity-50' : ''}`}>
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_STYLE[a.type]?.dot ?? 'bg-slate-400'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-100">{a.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-slate-400">{a.time}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-500">
                            {a.type}
                            {a.operator ? ` · ${a.operator}` : ''}
                          </span>
                          <span className={`chip shrink-0 !px-1.5 !py-0 text-[10px] ${STATUS_META[a.status].tone}`}>{STATUS_META[a.status].label}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <AppointmentForm draft={draft} onClose={() => setDraft(null)} onNavigate={onNavigate} />
    </div>
  );
}

function Stat({ icon, label, value, hint, tone = 'text-white' }: { icon: ReactNode; label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="text-cyan-300">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-2 truncate text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

function MiniCalendar({ value, today, onPick, marks }: { value: string; today: string; onPick: (iso: string) => void; marks: Map<string, Appointment[]> }) {
  const [month, setMonth] = useState(() => value.slice(0, 7));
  useEffect(() => setMonth(value.slice(0, 7)), [value]);
  const first = parseISO(`${month}-01`);
  const gridStart = startOfWeek(isoOf(first));
  const cells = Array.from({ length: 42 }, (_, i) => shiftDays(gridStart, i));
  const move = (n: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    setMonth(isoOf(d).slice(0, 7));
  };
  const weekOfValue = startOfWeek(value);
  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <button className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => move(-1)} aria-label="Mese precedente">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold capitalize text-white">{first.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</span>
        <button className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => move(1)} aria-label="Mese successivo">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase text-slate-500">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((iso) => {
          const inMonth = iso.slice(0, 7) === month;
          const has = (marks.get(iso) ?? []).some(isActive);
          const sel = iso === value;
          const inWeek = startOfWeek(iso) === weekOfValue;
          return (
            <button
              key={iso}
              onClick={() => onPick(iso)}
              className={`relative flex h-8 items-center justify-center rounded-lg text-xs tabular-nums transition ${
                sel ? 'bg-cyan-500 font-semibold text-white' : iso === today ? 'text-cyan-300 ring-1 ring-cyan-400/40' : inMonth ? 'text-slate-200 hover:bg-white/5' : 'text-slate-600 hover:bg-white/5'
              } ${inWeek && !sel ? 'bg-white/[0.04]' : ''}`}
            >
              {parseISO(iso).getDate()}
              {has && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${sel ? 'bg-white' : 'bg-cyan-400'}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
