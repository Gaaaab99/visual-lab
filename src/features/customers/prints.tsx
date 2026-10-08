import type { CSSProperties } from 'react';
import { PrintHeader } from '../../components/Print';
import type { Customer, EyeRx, Prescription, StoreSettings } from '../../store/types';
import { age, dpt, fmtDate, fullName } from '../../store/utils';
import { sphEq } from './helpers';

const muted: CSSProperties = { color: '#555', fontSize: 11 };
const h3: CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#0e7490', margin: '16px 0 6px' };
const cell: CSSProperties = { padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', fontSize: 13 };
const th: CSSProperties = { padding: '5px 8px', fontSize: 10.5, textTransform: 'uppercase', background: '#f1f5f9' };
const sign: CSSProperties = { borderTop: '1px solid #333', paddingTop: 4, fontSize: 11, textAlign: 'center', marginTop: 44 };

function CustomerBox({ c }: { c: Customer }) {
  const a = age(c.birthDate);
  return (
    <table style={{ width: '100%', marginBottom: 8 }}>
      <tbody>
        <tr>
          <td style={{ padding: '6px 8px', width: '50%' }}>
            <div style={muted}>Cliente</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{fullName(c)}</div>
            <div style={{ fontSize: 11 }}>
              Cod. {c.code}
              {c.birthDate ? ` · nato/a il ${fmtDate(c.birthDate)}${a !== null ? ` (${a} anni)` : ''}` : ''}
            </div>
          </td>
          <td style={{ padding: '6px 8px' }}>
            <div style={muted}>Codice fiscale / recapiti</div>
            <div style={{ fontFamily: 'monospace' }}>{c.fiscalCode || '—'}</div>
            <div style={{ fontSize: 11 }}>{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const vaOrDash = (s: string) => s || '—';
const n0 = (n: number) => (n ? dpt(n) : '—');

function EyeRow({ label, e }: { label: string; e: EyeRx }) {
  return (
    <tr>
      <td style={{ ...cell, fontWeight: 700, fontFamily: 'inherit' }}>{label}</td>
      <td style={cell}>{dpt(e.sph)}</td>
      <td style={cell}>{e.cyl ? dpt(e.cyl) : '—'}</td>
      <td style={cell}>{e.cyl ? `${e.axis}°` : '—'}</td>
      <td style={cell}>{n0(e.add)}</td>
      <td style={cell}>{e.prism ? `${e.prism.toFixed(2)} Δ ${e.base}` : '—'}</td>
      <td style={cell}>{vaOrDash(e.va)}</td>
      <td style={cell}>{dpt(sphEq(e))}</td>
    </tr>
  );
}

export function PrescriptionDoc({ c, rx, store }: { c: Customer; rx: Prescription; store: StoreSettings }) {
  const pdTot = rx.pdOd + rx.pdOs;
  const isExam = rx.source === 'Esame optometrico in negozio';
  return (
    <div style={{ fontSize: 12, lineHeight: 1.45 }}>
      <PrintHeader store={store} title={isExam ? 'Scheda optometrica' : 'Prescrizione occhiale'} subtitle={`${rx.kind} · ${fmtDate(rx.date)}`} />
      <CustomerBox c={c} />

      <div style={h3}>Correzione {rx.kind.toLowerCase()}</div>
      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={th}>Occhio</th>
            <th style={th}>Sfera</th>
            <th style={th}>Cilindro</th>
            <th style={th}>Asse</th>
            <th style={th}>Addizione</th>
            <th style={th}>Prisma / base</th>
            <th style={th}>AV corretta</th>
            <th style={th}>Eq. sferico</th>
          </tr>
        </thead>
        <tbody>
          <EyeRow label="OD" e={rx.od} />
          <EyeRow label="OS" e={rx.os} />
        </tbody>
      </table>

      <div style={h3}>Misure di centratura</div>
      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={th}>DNP OD</th>
            <th style={th}>DNP OS</th>
            <th style={th}>DNP totale</th>
            <th style={th}>Altezza OD</th>
            <th style={th}>Altezza OS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>{rx.pdOd ? `${rx.pdOd.toFixed(1)} mm` : '—'}</td>
            <td style={cell}>{rx.pdOs ? `${rx.pdOs.toFixed(1)} mm` : '—'}</td>
            <td style={cell}>{pdTot ? `${pdTot.toFixed(1)} mm` : '—'}</td>
            <td style={cell}>{rx.heightOd ? `${rx.heightOd} mm` : '—'}</td>
            <td style={cell}>{rx.heightOs ? `${rx.heightOs} mm` : '—'}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={muted}>Fonte</div>
          <div>{rx.source}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={muted}>Esaminatore</div>
          <div>{rx.examiner || '—'}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={muted}>Prossimo controllo consigliato</div>
          <div>{fmtDate(rx.nextCheck)}</div>
        </div>
      </div>

      {(rx.notes || c.visualNeeds.length > 0) && (
        <>
          <div style={h3}>Note</div>
          {c.visualNeeds.length > 0 && <div style={{ marginBottom: 4 }}>Esigenze visive riferite: {c.visualNeeds.join(', ')}.</div>}
          {rx.notes && <div style={{ whiteSpace: 'pre-wrap' }}>{rx.notes}</div>}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, marginTop: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={sign}>Luogo e data</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={sign}>
            Firma dell’esaminatore
            <br />
            {rx.examiner || store.optician}
            {store.opticianRegistration ? ` · ${store.opticianRegistration}` : ''}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28, border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', fontSize: 10, color: '#444', background: '#f8fafc' }}>
        <b>Avvertenza.</b> L’esame optometrico è una valutazione delle capacità visive finalizzata alla correzione ottica dei difetti refrattivi e <b>non sostituisce la visita medica oculistica</b>, che resta
        indispensabile per la diagnosi e la cura delle patologie oculari. Si raccomanda un controllo oculistico periodico, in particolare in presenza di sintomi, familiarità per glaucoma o altre patologie, diabete
        o dopo i 40 anni. I valori riportati si riferiscono alla data dell’esame e possono variare nel tempo. Documento contenente dati relativi alla salute: conservare con riservatezza.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ privacy */

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', margin: '6px 0' }}>
      <div style={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
        [{on ? 'X' : ' '}] Acconsento &nbsp; [{on ? ' ' : 'X'}] Non acconsento
      </div>
      <div>{label}</div>
    </div>
  );
}

export function PrivacyDoc({ c, store }: { c: Customer; store: StoreSettings }) {
  const p: CSSProperties = { margin: '4px 0', textAlign: 'justify' };
  const titolare = [store.businessName, store.address, store.city].filter(Boolean).join(', ');
  return (
    <div style={{ fontSize: 10.5, lineHeight: 1.45 }}>
      <PrintHeader store={store} title="Informativa privacy" subtitle="Artt. 13 e 9 Reg. UE 2016/679 (GDPR)" />
      <CustomerBox c={c} />

      <div style={h3}>1. Titolare del trattamento</div>
      <p style={p}>
        Titolare del trattamento è <b>{titolare || store.businessName}</b>
        {store.vatNumber ? `, P.IVA ${store.vatNumber}` : ''}, contattabile ai recapiti {[store.phone, store.email].filter(Boolean).join(' / ') || 'indicati in intestazione'}. Responsabile tecnico:{' '}
        {store.optician || 'ottico abilitato'}.
      </p>

      <div style={h3}>2. Dati trattati</div>
      <p style={p}>
        Dati anagrafici e di contatto (nome, cognome, data di nascita, codice fiscale, indirizzo, telefono, email); dati relativi agli acquisti e ai pagamenti; <b>dati relativi alla salute</b> (art. 9 GDPR) quali
        esiti dell’esame optometrico, prescrizioni oftalmiche, acuità visiva, misure anatomiche, parametri di applicazione delle lenti a contatto ed eventuali informazioni anamnestiche da Lei riferite.
      </p>

      <div style={h3}>3. Finalità e basi giuridiche</div>
      <table style={{ width: '100%', fontSize: 10 }}>
        <thead>
          <tr>
            <th style={th}>Finalità</th>
            <th style={th}>Base giuridica</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: 5 }}>a) Vendita di prodotti e servizi, gestione buste di lavoro e assistenza post-vendita</td>
            <td style={{ padding: 5 }}>Esecuzione del contratto (art. 6.1.b)</td>
          </tr>
          <tr>
            <td style={{ padding: 5 }}>b) Adempimenti fiscali e contabili, trasmissione spese sanitarie al Sistema Tessera Sanitaria, obblighi del fabbricante di dispositivi medici su misura (Reg. UE 2017/745)</td>
            <td style={{ padding: 5 }}>Obbligo di legge (art. 6.1.c)</td>
          </tr>
          <tr>
            <td style={{ padding: 5 }}>c) Esame della vista, realizzazione di occhiali e applicazione di lenti a contatto (dati sanitari)</td>
            <td style={{ padding: 5 }}>Consenso esplicito (art. 9.2.a) e finalità di assistenza sanitaria (art. 9.2.h)</td>
          </tr>
          <tr>
            <td style={{ padding: 5 }}>d) Promemoria di servizio: avviso di ritiro, controlli periodici, riordino lenti a contatto</td>
            <td style={{ padding: 5 }}>Consenso (art. 6.1.a)</td>
          </tr>
          <tr>
            <td style={{ padding: 5 }}>e) Comunicazioni commerciali e promozionali via SMS, WhatsApp, email o telefono</td>
            <td style={{ padding: 5 }}>Consenso (art. 6.1.a), revocabile in ogni momento</td>
          </tr>
        </tbody>
      </table>
      <p style={p}>Il conferimento dei dati per le finalità a) e b) è necessario; il rifiuto del consenso per la finalità c) impedisce l’esecuzione dell’esame e la realizzazione di dispositivi su misura. I consensi d) ed e) sono facoltativi.</p>

      <div style={h3}>4. Modalità, destinatari e conservazione</div>
      <p style={p}>
        I dati sono trattati con strumenti informatici e cartacei, da personale autorizzato e tenuto al segreto professionale, con misure di sicurezza adeguate. Possono essere comunicati a laboratori e fornitori di
        lenti limitatamente ai dati necessari alla lavorazione, a consulenti fiscali, all’Agenzia delle Entrate / Sistema TS e alle autorità competenti. Non sono diffusi né trasferiti fuori dall’UE.
      </p>
      <p style={p}>
        Conservazione: dati sanitari e scheda cliente per la durata del rapporto e fino a 10 anni dall’ultimo contatto (documentazione tecnica dei dispositivi su misura); documenti fiscali per 10 anni (art. 2220
        c.c.); dati per promemoria e marketing fino a revoca del consenso o comunque non oltre 24 mesi dall’ultimo acquisto.
      </p>

      <div style={h3}>5. Diritti dell’interessato (artt. 15-22 GDPR)</div>
      <p style={p}>
        Lei può chiedere in ogni momento l’accesso ai dati, la rettifica, la cancellazione (diritto all’oblio, salvo i dati soggetti a obbligo di conservazione), la limitazione, la portabilità e opporsi al
        trattamento; può revocare i consensi senza pregiudicare la liceità del trattamento precedente e proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).
      </p>

      <div style={h3}>6. Sistema Tessera Sanitaria</div>
      <p style={p}>
        Le spese per dispositivi medici (occhiali da vista, lenti, lenti a contatto) sono trasmesse al Sistema TS per la dichiarazione precompilata. Lei può <b>opporsi alla trasmissione</b> chiedendolo al momento
        dell’acquisto: in tal caso il documento commerciale verrà emesso senza invio dei dati al Sistema TS.
      </p>

      <div style={h3}>Modulo di consenso</div>
      <p style={p}>Il/la sottoscritto/a {fullName(c)}, ricevuta e compresa l’informativa:</p>
      <Check on={c.consents.privacy} label="dichiara di aver ricevuto l’informativa (art. 13) e autorizza il trattamento dei dati per le finalità a) e b)" />
      <Check on={c.consents.healthData} label="presta consenso esplicito al trattamento dei dati relativi alla salute per la finalità c) (art. 9)" />
      <Check on={c.consents.reminders} label="acconsente a ricevere promemoria di servizio (finalità d)" />
      <Check on={c.consents.marketing} label="acconsente a ricevere comunicazioni commerciali (finalità e)" />
      <div style={{ margin: '6px 0', fontFamily: 'monospace' }}>
        [{c.consents.stsOpposition ? 'X' : ' '}] <span style={{ fontFamily: 'inherit' }}>si oppone alla trasmissione delle spese sanitarie al Sistema Tessera Sanitaria</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
        <div style={{ flex: 1 }}>
          <div style={sign}>Luogo e data {c.consents.signedAt ? `(${fmtDate(c.consents.signedAt)})` : ''}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={sign}>Firma dell’interessato (o di chi esercita la responsabilità genitoriale)</div>
        </div>
      </div>
    </div>
  );
}
