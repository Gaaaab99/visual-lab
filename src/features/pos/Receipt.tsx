import type { CSSProperties } from 'react';
import type { Customer, Sale, StoreSettings } from '../../store/types';
import { eur, fullName, lineTotal, vatBreakdown } from '../../store/utils';
import { hasMedical, isTracked, saleGross } from './shared';

const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8 };
const hr: CSSProperties = { borderTop: '1px dashed #64748b', margin: '8px 0' };
const small: CSSProperties = { fontSize: 10, color: '#475569' };

/**
 * "Documento commerciale parlante": riporta natura, qualità e quantità dei beni,
 * il codice fiscale del cliente e la marcatura dei dispositivi medici (AD),
 * così da poter essere usato per la detrazione IRPEF delle spese sanitarie.
 */
export function ReceiptDoc({ sale, settings, customer }: { sale: Sale; settings: StoreSettings; customer?: Customer }) {
  const gross = saleGross(sale);
  const vat = vatBreakdown(sale.lines, sale.discount);
  const medical = hasMedical(sale);
  const isReturn = sale.total < 0;
  const d = new Date(sale.date);
  const title = sale.docType === 'Fattura' ? 'FATTURA (copia di cortesia)' : isReturn ? 'DOCUMENTO COMMERCIALE DI RESO' : 'DOCUMENTO COMMERCIALE';

  return (
    <div style={{ width: '100%', maxWidth: 340, margin: '0 auto', fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", fontSize: 11.5, color: '#0f172a', lineHeight: 1.45 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{settings.businessName}</div>
        {settings.address && <div>{settings.address}</div>}
        {settings.city && <div>{settings.city}</div>}
        {settings.phone && <div>Tel. {settings.phone}</div>}
        {settings.vatNumber && <div>P.IVA {settings.vatNumber}</div>}
      </div>
      <div style={hr} />
      <div style={{ textAlign: 'center', fontWeight: 700 }}>{title}</div>
      <div style={{ textAlign: 'center', ...small }}>{sale.docType === 'Fattura' ? 'fattura elettronica trasmessa tramite SdI' : 'di vendita o prestazione'}</div>
      <div style={hr} />
      <div style={row}>
        <span>DESCRIZIONE</span>
        <span>IVA&nbsp;&nbsp;PREZZO(€)</span>
      </div>
      {sale.lines.map((l) => (
        <div key={l.id} style={{ marginTop: 4 }}>
          <div style={row}>
            <span style={{ flex: 1 }}>
              {l.description}
              {l.medicalDevice ? ' [AD]' : ''}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>
              {l.vat}%&nbsp;&nbsp;{lineTotal(l).toFixed(2).replace('.', ',')}
            </span>
          </div>
          {l.qty !== 1 && (
            <div style={small}>
              {l.qty} x {eur(l.unitPrice)}
            </div>
          )}
          {l.medicalDevice && <div style={small}>dispositivo medico CE</div>}
        </div>
      ))}
      <div style={hr} />
      {sale.discount !== 0 && (
        <>
          <div style={row}>
            <span>SUBTOTALE</span>
            <span>{eur(gross)}</span>
          </div>
          <div style={row}>
            <span>SCONTO</span>
            <span>−{eur(Math.abs(sale.discount))}</span>
          </div>
        </>
      )}
      <div style={{ ...row, fontSize: 14, fontWeight: 700 }}>
        <span>TOTALE COMPLESSIVO</span>
        <span>{eur(sale.total)}</span>
      </div>
      {vat.map((v) => (
        <div key={v.rate} style={{ ...row, ...small }}>
          <span>
            di cui IVA {v.rate}% (imponibile {eur(v.taxable)})
          </span>
          <span>{eur(v.vat)}</span>
        </div>
      ))}
      <div style={hr} />
      <div style={row}>
        <span>Pagamento {isTracked(sale.payment) ? 'elettronico' : 'contante'}</span>
        <span>{sale.payment}</span>
      </div>
      <div style={row}>
        <span>Importo {isReturn ? 'reso' : 'pagato'}</span>
        <span>{eur(sale.total)}</span>
      </div>
      <div style={hr} />
      <div style={row}>
        <span>{d.toLocaleDateString('it-IT')} {d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>N. {sale.number}</span>
      </div>
      {customer && <div>Cliente: {fullName(customer)}</div>}
      {sale.fiscalCode && <div style={{ fontWeight: 700 }}>C.F. cliente: {sale.fiscalCode.toUpperCase()}</div>}
      {sale.notes && <div style={small}>{sale.notes}</div>}
      {medical && sale.fiscalCode && !isReturn && (
        <div style={{ marginTop: 8, padding: 6, border: '1px solid #94a3b8', fontSize: 10.5 }}>
          Spesa detraibile ai fini IRPEF (art. 15 TUIR) – dispositivo medico con marcatura CE. Le voci [AD] sono dispositivi medici.
        </div>
      )}
      {medical && sale.stsOpposition && (
        <div style={{ ...small, marginTop: 6 }}>Il cliente si è opposto alla trasmissione della spesa al Sistema Tessera Sanitaria.</div>
      )}
      <div style={{ textAlign: 'center', marginTop: 10, ...small }}>Grazie e arrivederci</div>
    </div>
  );
}
