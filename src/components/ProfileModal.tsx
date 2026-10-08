import { useEffect, useState } from 'react';
import { Award, BookOpenCheck, FileText, GraduationCap, LogOut, Save, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { levelFromXp, useApp, XP } from '../context/AppContext';
import { CASES } from '../data/cases';
import type { ProfessionalRole } from '../types';
import { Modal } from './Modal';

const ROLES: ProfessionalRole[] = ['Oftalmologo', 'Optometrista', 'Ortottista', 'Specializzando', 'Studente di Medicina', 'Paziente'];

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, reports, updateProfile, signOut, mode } = useApp();
  const [form, setForm] = useState({ displayName: '', role: 'Oftalmologo' as ProfessionalRole, specialization: '', institution: '' });

  useEffect(() => {
    if (profile && open) setForm({ displayName: profile.displayName, role: profile.role, specialization: profile.specialization, institution: profile.institution });
  }, [profile, open]);

  if (!profile) return null;
  const lvl = levelFromXp(profile.xp);
  const completed = reports.filter((r) => r.status === 'completato').length;
  const dirty =
    form.displayName !== profile.displayName || form.role !== profile.role || form.specialization !== profile.specialization || form.institution !== profile.institution;

  const stats = [
    { icon: FileText, label: 'Referti salvati', value: reports.length },
    { icon: Award, label: 'Completati', value: completed },
    { icon: BookOpenCheck, label: 'Casi studiati', value: `${profile.casesStudied.length}/${CASES.length}` },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profilo medico"
      subtitle={profile.email}
      icon={<UserRound size={18} />}
      size="md"
      footer={
        <>
          <button className="btn-danger mr-auto" onClick={() => signOut().then(onClose)}>
            <LogOut size={15} /> Esci
          </button>
          <button className="btn-ghost" onClick={onClose}>
            Chiudi
          </button>
          <button className="btn-primary" disabled={!dirty || !form.displayName.trim()} onClick={() => updateProfile(form)}>
            <Save size={15} /> Salva
          </button>
        </>
      }
    >
      <div className="space-y-6 p-5">
        <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
              <GraduationCap size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-cyan-300/80">Livello formativo {lvl.level}</p>
              <p className="text-lg font-semibold text-white">{lvl.title}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-900/70">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" initial={{ width: 0 }} animate={{ width: `${lvl.progress * 100}%` }} transition={{ duration: 0.8 }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {profile.xp} XP{lvl.nextAt ? ` · prossimo livello a ${lvl.nextAt} XP` : ' · livello massimo'}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Guadagni XP salvando referti (+{XP.report}), completandoli (+{XP.reportCompleted}) e studiando i casi clinici (+{XP.caseStudied}).
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3 text-center">
              <Icon size={16} className="mx-auto text-cyan-300" />
              <p className="mt-1.5 text-xl font-semibold text-white">{value}</p>
              <p className="text-[11px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome e titolo</label>
            <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div>
            <label className="label">Profilo professionale</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ProfessionalRole })}>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Specializzazione</label>
            <input className="input" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Struttura</label>
            <input className="input" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Archiviazione: {mode === 'firebase' ? 'Firebase Auth + Cloud Firestore' : 'demo offline (localStorage del browser)'} · Iscritto dal{' '}
          {new Date(profile.createdAt).toLocaleDateString('it-IT')}
        </p>
      </div>
    </Modal>
  );
}
