import type { Report } from '../../types';

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([mime.startsWith('text/csv') ? '﻿' + content : content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cell = (v: string | number) => {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV con separatore ';' (compatibile con Excel in locale italiano) */
export function reportsToCsv(reports: Report[]): string {
  const head = ['Codice', 'Paziente', 'Età', 'Data', 'Occhio', 'Visus OD', 'Visus OS', 'IOP OD', 'IOP OS', 'Diagnosi', 'Prescrizione', 'Controllo', 'Stato', 'Simulazione'];
  const rows = reports.map((r) => [
    r.patientCode,
    r.patientName,
    r.age,
    r.date,
    r.eye,
    r.visualAcuity.od,
    r.visualAcuity.os,
    r.iop.od,
    r.iop.os,
    r.diagnosis,
    r.prescription,
    r.followUp,
    r.status === 'completato' ? 'Completato' : 'In corso',
    r.simulation?.summary ?? '',
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

/** Converte un visus testuale (10/10, 0.5, 6/12, 20/40) in decimale */
export function parseAcuity(v: string): number | null {
  const s = v.trim().replace(',', '.');
  if (!s) return null;
  const frac = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (frac) {
    const n = +frac[1];
    const d = +frac[2];
    return d ? n / d : null;
  }
  const num = Number(s);
  if (Number.isFinite(num)) return num > 2 ? num / 10 : num;
  return null;
}
