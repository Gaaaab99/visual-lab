import type { CSSProperties, ReactNode } from 'react';
import { PrintHeader } from '../../components/Print';
import type { Customer, EyeRx, Order, StoreSettings } from '../../store/types';
import { addDays, dpt, eur, fmtDate, fullName, orderTotals, vatBreakdown } from '../../store/utils';
import { frameLabel, hasFrame, hasLenses } from './helpers';

const small: CSSProperties = { fontSize: 11 };
const h3: CSSProperties = { fontSize: 13, fontWeight: 700, margin: '14px 0 6px', textTransform: 'uppercase', letterSpacing: 0.5, color: '#0e7490' };
const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const cell: CSSProperties = { padding: '4px 6px', textAlign: 'left' };
const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: 12 };

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <span style={{ color: '#555' }}>{k}: </span>
      <strong>{v}</strong>
    </div>
  );
}

/** Rappresentazione a barre del numero di busta (codice visivo per il banco di lavoro) */
function Bars({ value }: { value: string }) {
  const bars: number[] = [2, 1, 2];
  for (const ch of value) {
    const c = ch.charCodeAt(0);
    for (let i = 0; i < 5; i++) bars.push(((c >> i) & 1) + 1, ((c >> (i + 2)) & 1) + 1);
  }
  bars.push(2, 1, 2);
  let x = 0;
  const rects = bars.map((w, i) => {
    const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w * 1.4} height={34} fill="#000" /> : null;
    x += w * 1.4;
    return r;
  });
  return (
    <div style={{ textAlign: 'right' }}>
      <svg width={x} height={34} viewBox={`0 0 ${x} 34`}>
        {rects}
      </svg>
      <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 }}>{value}</div>
    </div>
  );
}

function RxTable({ o }: { o: Order }) {
  if (!o.rx) return <p style={small}>Nessuna prescrizione associata.</p>;
  const row = (label: string, e: EyeRx, pd: number, h?: number) => (
    <tr>
      <td style={cell}>
        <strong>{label}</strong>
      </td>
      <td style={cell}>{dpt(e.sph)}</td>
      <td style={cell}>{e.cyl ? dpt(e.cyl) : '—'}</td>
      <td style={cell}>{e.cyl ? `${e.axis}°` : '—'}</td>
      <td style={cell}>{e.add ? dpt(e.add) : '—'}</td>
      <td style={cell}>{e.prism ? `${e.prism}Δ ${e.base}` : '—'}</td>
      <td style={cell}>{pd ? `${pd} mm` : '—'}</td>
      <td style={cell}>{h ? `${h} mm` : '—'}</td>
      <td style={cell}>{e.va || '—'}</td>
    </tr>
  );
  return (
    <>
      <table style={table}>
        <thead>
          <tr>
            {['', 'Sfera', 'Cilindro', 'Asse', 'Addizione', 'Prisma', 'DNP', 'Altezza', 'AV'].map((h) => (
              <th key={h} style={cell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row('OD', o.rx.od, o.centering.pdOd || o.rx.pdOd, o.centering.heightOd || o.rx.heightOd)}
          {row('OS', o.rx.os, o.centering.pdOs || o.rx.pdOs, o.centering.heightOs || o.rx.heightOs)}
        </tbody>
      </table>
      <p style={{ ...small, marginTop: 4 }}>
        Prescrizione del {fmtDate(o.rx.date)} · {o.rx.kind} · {o.rx.source}
        {o.rx.examiner ? ` · ${o.rx.examiner}` : ''}
      </p>
    </>
  );
}

function Signature({ label, place }: { label: string; place?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, fontSize: 12 }}>
      <div>
        {place ? `${place}, ` : ''}
        {fmtDate(new Date().toISOString())}
      </div>
      <div style={{ textAlign: 'center', minWidth: 220 }}>
        <div style={{ borderBottom: '1px solid #000', height: 36 }} />
        <div style={{ marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

interface DocProps {
  order: Order;
  customer?: Customer;
  settings: StoreSettings;
}

/* ------------------------------------------------------------ Busta di lavoro */
export function WorkTicketDoc({ order: o, customer: c, settings }: DocProps) {
  const checks = [
    'Verifica corrispondenza lenti / ordine (potere, indice, trattamenti)',
    'Controllo al frontifocometro OD / OS',
    'Centratura e altezze verificate',
    'Asse cilindro verificato',
    'Sagomatura e montaggio',
    'Pulizia e controllo estetico',
    'Regolazione montatura',
    'Controllo finale (firma)',
  ];
  return (
    <div>
      <PrintHeader title="Busta di lavoro" subtitle={`${o.type} · ${o.lab}`} store={settings} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={grid2}>
          <KV k="Busta" v={o.number} />
          <KV k="Data" v={fmtDate(o.createdAt)} />
          <KV k="Cliente" v={c ? `${fullName(c)} (${c.code})` : '—'} />
          <KV k="Telefono" v={c?.phone || '—'} />
          <KV k="Consegna prevista" v={fmtDate(o.expectedDate)} />
          <KV k="Laboratorio" v={o.lab || '—'} />
        </div>
        <Bars value={o.number} />
      </div>

      {o.type !== 'Riparazione' && (
        <>
          <div style={h3}>Prescrizione</div>
          <RxTable o={o} />
        </>
      )}

      {o.type !== 'Riparazione' && o.type !== 'Lenti a contatto' && (
        <>
          <div style={h3}>Centratura</div>
          <div style={{ ...grid2, gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <KV k="DNP OD" v={`${o.centering.pdOd} mm`} />
            <KV k="DNP OS" v={`${o.centering.pdOs} mm`} />
            <KV k="Altezza OD" v={o.centering.heightOd ? `${o.centering.heightOd} mm` : '—'} />
            <KV k="Altezza OS" v={o.centering.heightOs ? `${o.centering.heightOs} mm` : '—'} />
            <KV k="Distanza apice" v={`${o.centering.vertex} mm`} />
            <KV k="Angolo pantoscopico" v={`${o.centering.pantoscopic}°`} />
            <KV k="Curvatura" v={`${o.centering.wrap}°`} />
          </div>
        </>
      )}

      {hasFrame(o.type) && (
        <>
          <div style={h3}>Montatura</div>
          <p style={{ fontSize: 12 }}>{frameLabel(o)}</p>
        </>
      )}

      {hasLenses(o.type) && (
        <>
          <div style={h3}>Lenti</div>
          <div style={grid2}>
            <KV k="Marca" v={o.lenses.brand || '—'} />
            <KV k="Geometria" v={o.lenses.design} />
            <KV k="Indice" v={o.lenses.index} />
            <KV k="Materiale" v={o.lenses.material} />
            <KV k="Diametro" v={o.lenses.diameter ? `${o.lenses.diameter} mm` : '—'} />
            <KV k="Trattamenti" v={o.lenses.treatments.join(', ') || 'nessuno'} />
          </div>
        </>
      )}

      {o.notes && (
        <>
          <div style={h3}>Note</div>
          <p style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{o.notes}</p>
        </>
      )}

      <div style={h3}>Check-list montaggio</div>
      <table style={table}>
        <tbody>
          {checks.map((ch) => (
            <tr key={ch}>
              <td style={{ ...cell, width: 24 }}>☐</td>
              <td style={cell}>{ch}</td>
              <td style={{ ...cell, width: 120 }}>Operatore:</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------ Ricevuta di acconto */
export function DepositReceiptDoc({ order: o, customer: c, settings }: DocProps) {
  const { total, due } = orderTotals(o);
  return (
    <div>
      <PrintHeader title="Ricevuta di acconto" subtitle={`Busta ${o.number}`} store={settings} />
      <div style={grid2}>
        <KV k="Cliente" v={c ? fullName(c) : '—'} />
        <KV k="Codice fiscale" v={c?.fiscalCode || '—'} />
        <KV k="Data" v={fmtDate(new Date().toISOString())} />
        <KV k="Consegna prevista" v={fmtDate(o.expectedDate)} />
      </div>
      <div style={h3}>Dettaglio fornitura</div>
      <table style={table}>
        <thead>
          <tr>
            <th style={cell}>Descrizione</th>
            <th style={cell}>Q.tà</th>
            <th style={cell}>Prezzo</th>
            <th style={cell}>IVA</th>
            <th style={cell}>Importo</th>
          </tr>
        </thead>
        <tbody>
          {o.lines.map((l) => (
            <tr key={l.id}>
              <td style={cell}>{l.description}</td>
              <td style={cell}>{l.qty}</td>
              <td style={cell}>{eur(l.unitPrice)}</td>
              <td style={cell}>{l.vat}%</td>
              <td style={cell}>{eur(l.qty * l.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ ...table, width: 300, marginLeft: 'auto', marginTop: 10 }}>
        <tbody>
          {o.discount > 0 && (
            <tr>
              <td style={cell}>Sconto</td>
              <td style={cell}>−{eur(o.discount)}</td>
            </tr>
          )}
          <tr>
            <td style={cell}>Totale fornitura</td>
            <td style={cell}>
              <strong>{eur(total)}</strong>
            </td>
          </tr>
          <tr>
            <td style={cell}>Acconto versato</td>
            <td style={cell}>
              <strong>{eur(o.deposit + o.paid)}</strong>
            </td>
          </tr>
          <tr>
            <td style={cell}>Saldo al ritiro</td>
            <td style={cell}>
              <strong>{eur(due)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...small, marginTop: 14 }}>
        Il presente documento attesta il versamento di un acconto sulla fornitura indicata e non costituisce documento fiscale: il documento commerciale / fattura per l’intero importo
        verrà emesso alla consegna. Conservare la ricevuta e presentarla al ritiro.
      </p>
      <Signature label="Per il centro ottico" place={settings.city} />
    </div>
  );
}

/* ------------------------------------------------------------ Dichiarazione di conformità */
export function ConformityDoc({ order: o, customer: c, settings }: DocProps) {
  const device = [
    o.type,
    hasFrame(o.type) ? `montatura: ${frameLabel(o)}` : '',
    hasLenses(o.type) ? `lenti: ${[o.lenses.brand, o.lenses.design, `indice ${o.lenses.index}`, o.lenses.material].filter(Boolean).join(' ')}${o.lenses.treatments.length ? `, trattamenti: ${o.lenses.treatments.join(', ')}` : ''}` : '',
  ]
    .filter(Boolean)
    .join(' — ');
  return (
    <div>
      <PrintHeader title="Dichiarazione di conformità" subtitle="Dispositivo medico su misura · Reg. (UE) 2017/745" store={settings} />
      <p style={{ fontSize: 12 }}>
        Dichiarazione n. <strong>{o.conformityNumber ?? '(da assegnare alla consegna)'}</strong> resa ai sensi dell’art. 52, paragrafo 8, e dell’Allegato XIII del Regolamento (UE) 2017/745
        relativo ai dispositivi medici.
      </p>

      <div style={h3}>1. Fabbricante</div>
      <div style={grid2}>
        <KV k="Ragione sociale" v={settings.businessName} />
        <KV k="Indirizzo" v={`${settings.address} ${settings.city}`.trim() || '—'} />
        <KV k="P.IVA" v={settings.vatNumber || '—'} />
        <KV k="N. registrazione fabbricante" v={settings.manufacturerRegistration || '—'} />
      </div>

      <div style={h3}>2. Identificazione del dispositivo</div>
      <div style={grid2}>
        <KV k="Busta / lotto" v={o.number} />
        <KV k="Data di fabbricazione" v={fmtDate(o.history.find((h) => h.status === 'pronto')?.date ?? new Date().toISOString())} />
      </div>
      <p style={{ fontSize: 12, marginTop: 4 }}>{device}</p>

      <div style={h3}>3. Destinatario</div>
      <p style={{ fontSize: 12 }}>
        Dispositivo destinato all’uso esclusivo del paziente identificato con il codice <strong>{c?.code ?? '—'}</strong>.
      </p>

      <div style={h3}>4. Prescrizione</div>
      <p style={{ fontSize: 12 }}>
        {o.rx
          ? `Prescrizione del ${fmtDate(o.rx.date)} (${o.rx.source})${o.rx.examiner ? ` rilasciata da ${o.rx.examiner}` : ''}.`
          : 'Riferimento alla prescrizione: —'}
      </p>

      <div style={h3}>5. Caratteristiche specifiche</div>
      <RxTable o={o} />
      {o.type !== 'Lenti a contatto' && (
        <p style={{ fontSize: 12, marginTop: 4 }}>
          Centratura: DNP OD {o.centering.pdOd} mm / OS {o.centering.pdOs} mm
          {o.centering.heightOd ? ` · altezze ${o.centering.heightOd}/${o.centering.heightOs} mm` : ''} · distanza apice {o.centering.vertex} mm · angolo pantoscopico{' '}
          {o.centering.pantoscopic}° · curvatura {o.centering.wrap}°.
        </p>
      )}

      <div style={h3}>6. Dichiarazione</div>
      <p style={{ fontSize: 12 }}>
        Il sottoscritto, in qualità di responsabile per conto del fabbricante, dichiara sotto la propria responsabilità che il dispositivo sopra descritto è stato fabbricato su misura
        secondo la prescrizione indicata ed è destinato a essere utilizzato esclusivamente dal paziente sopra identificato, e che è conforme ai requisiti generali di sicurezza e
        prestazione di cui all’Allegato I del Regolamento (UE) 2017/745.
      </p>
      <p style={{ fontSize: 12 }}>
        Requisiti generali di sicurezza e prestazione non pienamente soddisfatti: <strong>nessuno</strong>.
      </p>

      <Signature label={`${settings.optician || 'Il responsabile'}${settings.opticianRegistration ? ` · ${settings.opticianRegistration}` : ''}`} place={settings.city} />

      <p style={{ ...small, marginTop: 18, color: '#444' }}>
        Ai sensi dell’Allegato XIII, punto 3 e seguenti, la documentazione relativa alla progettazione, alla fabbricazione e alle prestazioni del dispositivo è conservata dal
        fabbricante e tenuta a disposizione delle autorità competenti per almeno 15 anni dall’immissione in servizio. Copia della presente dichiarazione è consegnata al paziente.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ Certificato di garanzia */
export function WarrantyDoc({ order: o, customer: c, settings }: DocProps) {
  const delivered = o.history.find((h) => h.status === 'consegnato')?.date ?? new Date().toISOString();
  const { total } = orderTotals(o);
  return (
    <div>
      <PrintHeader title="Certificato di garanzia" subtitle={`Busta ${o.number}`} store={settings} />
      <div style={grid2}>
        <KV k="Cliente" v={c ? fullName(c) : '—'} />
        <KV k="Data di consegna" v={fmtDate(delivered)} />
        <KV k="Prodotto" v={o.type} />
        <KV k="Garanzia valida fino al" v={fmtDate(addDays(delivered.slice(0, 10), 730))} />
      </div>
      <div style={h3}>Fornitura</div>
      <table style={table}>
        <tbody>
          {o.lines.map((l) => (
            <tr key={l.id}>
              <td style={cell}>{l.description}</td>
              <td style={cell}>{l.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ ...small, marginTop: 4 }}>
        Importo complessivo: {eur(total)} · Ripartizione IVA: {vatBreakdown(o.lines, o.discount).map((v) => `${v.rate}%`).join(', ')}
      </p>
      <div style={h3}>Garanzia legale di conformità</div>
      <p style={{ fontSize: 12 }}>
        Il venditore è responsabile nei confronti del consumatore per qualsiasi difetto di conformità esistente al momento della consegna del bene e che si manifesti entro{' '}
        <strong>24 mesi</strong> dalla consegna, ai sensi degli artt. 128–135 del D.Lgs. 206/2005 (Codice del Consumo). In caso di difetto di conformità il consumatore ha diritto al
        ripristino della conformità mediante riparazione o sostituzione senza spese, ovvero a una riduzione del prezzo o alla risoluzione del contratto, nei casi previsti dalla legge.
      </p>
      <p style={{ fontSize: 12 }}>
        Non rientrano nella garanzia i danni causati da urti, cadute, uso improprio, esposizione a calore eccessivo, pulizia con prodotti non idonei, né la normale usura dei
        trattamenti superficiali. La garanzia non copre variazioni della prescrizione successive alla consegna. Per far valere la garanzia è necessario presentare il presente
        certificato unitamente al documento di acquisto.
      </p>
      <Signature label="Per il centro ottico" place={settings.city} />
    </div>
  );
}
