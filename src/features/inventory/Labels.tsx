import { useEffect, useState } from 'react';
import { Printer, Tag } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { usePrint } from '../../components/Print';
import type { Product } from '../../store/types';
import { eur } from '../../store/utils';
import { productLabel, tracksStock } from './shared';

/** Barre decorative derivate dalle cifre (non è una simbologia leggibile dagli scanner) */
function Stripes({ code }: { code: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  const seq = `11${code}11`;
  for (let i = 0; i < seq.length; i++) {
    const d = Number(seq[i]) || seq.charCodeAt(i) % 10;
    const w1 = 1 + (d % 3);
    const w2 = 1 + ((d >> 1) % 2);
    bars.push({ x, w: w1 });
    x += w1 + 1 + (d % 2);
    bars.push({ x, w: w2 });
    x += w2 + 2;
  }
  return (
    <svg viewBox={`0 0 ${x} 20`} preserveAspectRatio="none" style={{ width: '100%', height: 22, display: 'block' }} aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={20} fill="#111" />
      ))}
    </svg>
  );
}

export function LabelSheet({ items }: { items: { product: Product; copies: number }[] }) {
  const labels = items.flatMap(({ product, copies }) => Array.from({ length: copies }, (_, i) => ({ key: `${product.id}-${i}`, p: product })));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
      {labels.map(({ key, p }) => {
        const code = p.barcode || p.sku;
        return (
          <div key={key} style={{ border: '1px dashed #94a3b8', borderRadius: 4, padding: '6px 8px', breakInside: 'avoid', fontFamily: 'Inter, Arial, sans-serif', color: '#111' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.brand}</div>
            <div style={{ fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.model}</div>
            <div style={{ fontSize: 9, color: '#475569', minHeight: 12 }}>{[p.color, p.size].filter(Boolean).join(' · ')}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ border: '1px solid #111', padding: '2px 3px', background: '#fff' }}>
                  <Stripes code={code} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: 1, textAlign: 'center', marginTop: 1 }}>{code}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>{eur(p.price)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LabelsDialog({ products, onClose }: { products: Product[] | null; onClose: () => void }) {
  const print = usePrint();
  const [copies, setCopies] = useState<Record<string, number>>({});

  useEffect(() => {
    if (products) setCopies(Object.fromEntries(products.map((p) => [p.id, 1])));
  }, [products]);

  const items = (products ?? []).map((product) => ({ product, copies: copies[product.id] ?? 1 })).filter((i) => i.copies > 0);
  const count = items.reduce((s, i) => s + i.copies, 0);

  return (
    <Modal
      open={!!products}
      onClose={onClose}
      size="md"
      icon={<Tag size={18} />}
      title="Etichette prezzo"
      subtitle="Foglio A4 a tre colonne con marca, modello, prezzo e codice."
      footer={
        <>
          <button className="btn-ghost mr-auto text-xs" onClick={() => products && setCopies(Object.fromEntries(products.map((p) => [p.id, tracksStock(p) ? Math.max(1, p.stock) : 1])))}>
            Una per pezzo a magazzino
          </button>
          <button className="btn-ghost" onClick={onClose}>
            Chiudi
          </button>
          <button className="btn-primary" disabled={!count} onClick={() => print(<LabelSheet items={items} />)}>
            <Printer size={15} /> Stampa {count} etichett{count === 1 ? 'a' : 'e'}
          </button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <ul className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.06]">
          {(products ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-200">{productLabel(p)}</p>
                <p className="font-mono text-[11px] text-slate-500">{p.barcode || p.sku}</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Copie
                <input
                  type="number"
                  min={0}
                  max={99}
                  className="input w-16 px-2 py-1 text-right"
                  value={copies[p.id] ?? 1}
                  onChange={(e) => setCopies({ ...copies, [p.id]: Math.min(99, Math.max(0, Math.floor(Number(e.target.value) || 0))) })}
                />
              </label>
            </li>
          ))}
        </ul>
        {items.length > 0 && (
          <div>
            <p className="label">Anteprima</p>
            <div className="max-h-64 overflow-y-auto rounded-xl bg-white p-3">
              <LabelSheet items={items.slice(0, 6).map((i) => ({ ...i, copies: 1 }))} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
