import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Stampa di documenti (buste, scontrini, dichiarazioni, prescrizioni).
 * `print(<Documento />)` monta il contenuto in #print-root (visibile solo in stampa)
 * e apre la finestra di stampa del browser, da cui si può anche salvare in PDF.
 */
const Ctx = createContext<(node: ReactNode) => void>(() => undefined);

export function PrintProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<ReactNode>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el = document.getElementById('print-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'print-root';
      document.body.appendChild(el);
    }
    setHost(el);
  }, []);

  useEffect(() => {
    if (!node) return;
    const t = setTimeout(() => {
      window.print();
      setNode(null);
    }, 150);
    return () => clearTimeout(t);
  }, [node]);

  const print = useCallback((n: ReactNode) => setNode(n), []);

  return (
    <Ctx.Provider value={print}>
      {children}
      {host && node ? createPortal(<div className="print-doc">{node}</div>, host) : null}
    </Ctx.Provider>
  );
}

export const usePrint = () => useContext(Ctx);

/** Intestazione standard dei documenti stampati con i dati del negozio */
export function PrintHeader({ title, subtitle, store }: { title: string; subtitle?: string; store: { businessName: string; address: string; city: string; phone: string; email: string; vatNumber: string } }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0e7490', paddingBottom: 10, marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0e7490' }}>{store.businessName}</div>
        <div style={{ fontSize: 11 }}>
          {store.address} · {store.city}
        </div>
        <div style={{ fontSize: 11 }}>
          Tel. {store.phone} · {store.email} {store.vatNumber ? `· P.IVA ${store.vatNumber}` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11 }}>{subtitle}</div>}
      </div>
    </header>
  );
}
