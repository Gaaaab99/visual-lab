import { useCallback } from 'react';
import { useStore } from '../../store/StoreContext';
import { useApp } from '../../context/AppContext';
import type { FiscalDocType, Order, OrderStatus, PaymentMethod, Sale } from '../../store/types';
import { ORDER_STATUS, eur, newId, nextNumber, orderTotals } from '../../store/utils';
import { flowIndex, isCustomMade, newLine, nextConformityNumber, nextSaleNumber, stockTaken } from './helpers';

const usesStockFrame = (o: Order) => !!o.frame.productId && !o.frame.ownFrame;

export function useOrderActions() {
  const { orders, sales, settings, put, adjustStock, customerById } = useStore();
  const { notify } = useApp();

  /** Salva una busta (nuova o modificata). Registra l’eventuale acconto come documento commerciale. */
  const saveOrder = useCallback(
    async (draft: Order, depositPayment: PaymentMethod): Promise<Order> => {
      const prev = orders.find((o) => o.id === draft.id);
      const now = new Date().toISOString();
      const next: Order = {
        ...draft,
        number: draft.number || nextNumber(settings.orderPrefix || 'B', orders.map((o) => o.number)),
        updatedAt: now,
        history: draft.history.length ? draft.history : [{ date: now, status: draft.status, note: 'Busta creata' }],
      };

      // montatura sostituita dopo lo scarico dal magazzino
      if (prev && stockTaken(prev)) {
        const oldId = usesStockFrame(prev) ? prev.frame.productId : undefined;
        const newIdP = usesStockFrame(next) ? next.frame.productId : undefined;
        if (oldId !== newIdP) {
          if (oldId) await adjustStock(oldId, 1, 'Busta', `${next.number} · montatura sostituita`);
          if (newIdP) await adjustStock(newIdP, -1, 'Busta', next.number);
        }
      }

      const delta = Math.round((next.deposit - (prev?.deposit ?? 0)) * 100) / 100;
      if (delta > 0) {
        const c = customerById(next.customerId);
        const sale: Sale = {
          id: newId(),
          number: nextSaleNumber(sales),
          date: now,
          customerId: next.customerId,
          fiscalCode: c?.fiscalCode ?? '',
          stsOpposition: c?.consents.stsOpposition ?? false,
          docType: 'Documento commerciale',
          lines: [{ ...newLine(`Acconto busta ${next.number}`, delta, 4, true), id: newId() }],
          discount: 0,
          depositDeducted: 0,
          total: delta,
          payment: depositPayment,
          orderId: next.id,
          notes: 'Acconto',
        };
        await put('sales', sale);
      }

      await put('orders', next);
      notify(prev ? `Busta ${next.number} aggiornata.` : `Busta ${next.number} creata.`);
      return next;
    },
    [orders, sales, settings.orderPrefix, put, adjustStock, customerById, notify],
  );

  /** Avanza (o riporta) lo stato della busta registrando l’evento nello storico */
  const setStatus = useCallback(
    async (o: Order, to: OrderStatus, note = ''): Promise<Order> => {
      const now = new Date().toISOString();
      if (to !== 'annullato' && flowIndex(to) >= 1 && !stockTaken(o) && usesStockFrame(o) && o.frame.productId) {
        await adjustStock(o.frame.productId, -1, 'Busta', o.number);
      }
      if (to === 'annullato' && stockTaken(o) && usesStockFrame(o) && o.frame.productId) {
        await adjustStock(o.frame.productId, 1, 'Busta', `${o.number} · annullata`);
      }
      const next: Order = { ...o, status: to, updatedAt: now, history: [...o.history, { date: now, status: to, note }] };
      await put('orders', next);
      if (to === 'annullato') {
        const paid = o.deposit + o.paid;
        notify(paid > 0 ? `Busta ${o.number} annullata. Ricorda di gestire l’acconto di ${eur(paid)}.` : `Busta ${o.number} annullata.`, 'info');
      } else notify(`Busta ${o.number}: ${ORDER_STATUS[to].label.toLowerCase()}.`);
      return next;
    },
    [put, adjustStock, notify],
  );

  /** Consegna con incasso del saldo: emette il documento di vendita e chiude la busta */
  const deliver = useCallback(
    async (o: Order, amount: number, payment: PaymentMethod, docType: FiscalDocType, note: string): Promise<Order> => {
      const now = new Date().toISOString();
      const c = customerById(o.customerId);
      if (!stockTaken(o) && usesStockFrame(o) && o.frame.productId) await adjustStock(o.frame.productId, -1, 'Busta', o.number);

      const sale: Sale = {
        id: newId(),
        number: nextSaleNumber(sales),
        date: now,
        customerId: o.customerId,
        fiscalCode: c?.fiscalCode ?? '',
        stsOpposition: c?.consents.stsOpposition ?? false,
        docType,
        lines: o.lines.map((l) => ({ ...l })),
        discount: o.discount,
        depositDeducted: o.deposit + o.paid,
        total: amount,
        payment,
        orderId: o.id,
        notes: note || `Saldo busta ${o.number}`,
      };
      await put('sales', sale);

      const next: Order = {
        ...o,
        paid: o.paid + amount,
        status: 'consegnato',
        saleId: sale.id,
        updatedAt: now,
        conformityNumber: o.conformityNumber ?? (isCustomMade(o) ? nextConformityNumber(orders) : undefined),
        history: [...o.history, { date: now, status: 'consegnato', note: note || `Consegnato · ${sale.number} · ${eur(amount)} (${payment})` }],
      };
      await put('orders', next);

      if (c) {
        const points = Math.floor(amount / Math.max(0.01, settings.loyaltyEuroPerPoint || 1));
        if (points > 0) await put('customers', { ...c, loyaltyPoints: c.loyaltyPoints + points, updatedAt: now });
        notify(`Busta ${o.number} consegnata · ${sale.number}${points > 0 ? ` · +${points} punti fedeltà` : ''}.`);
      } else notify(`Busta ${o.number} consegnata · ${sale.number}.`);
      const { due } = orderTotals(next);
      if (due > 0.009) notify(`Rimane un residuo da incassare di ${eur(due)}.`, 'info');
      return next;
    },
    [orders, sales, settings.loyaltyEuroPerPoint, put, adjustStock, customerById, notify],
  );

  return { saveOrder, setStatus, deliver };
}
