import type { KeyboardEvent, ReactNode } from 'react';
import { STRUCTURE_BY_ID, type StructureId } from './structures';

/** Props comuni ai tre disegni SVG */
export interface DiagramProps {
  selected: StructureId | null;
  hovered: StructureId | null;
  onSelect: (id: StructureId) => void;
  onHover: (id: StructureId | null) => void;
  showLabels: boolean;
}

interface HotspotProps extends DiagramProps {
  id: StructureId;
  /** id del filtro <filter> di glow definito nel <defs> dell'SVG */
  glowId: string;
  /** Nodo SVG oppure funzione che riceve lo stato attivo (hover/focus/selezione) */
  children: ReactNode | ((active: boolean) => ReactNode);
}

/** Regione SVG interattiva: hover, click e tastiera (Enter / Spazio). */
export function Hotspot({ id, glowId, selected, hovered, onSelect, onHover, children }: HotspotProps) {
  const isSelected = selected === id;
  const isHovered = hovered === id;
  const active = isSelected || isHovered;
  const dimmed = selected !== null && !isSelected && !isHovered;

  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={STRUCTURE_BY_ID[id].name}
      aria-pressed={isSelected}
      data-structure={id}
      className="cursor-pointer outline-none"
      style={{
        filter: active ? `url(#${glowId})` : undefined,
        opacity: dimmed ? 0.72 : 1,
        transition: 'opacity 250ms ease, filter 250ms ease',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onKeyDown={onKeyDown}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onBlur={() => onHover(null)}
    >
      {typeof children === 'function' ? children(active) : children}
    </g>
  );
}

/** Filtro di glow (alone cyan) da inserire in <defs>. */
export function GlowFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="1.2" result="thick" />
      <feGaussianBlur in="thick" stdDeviation="3.2" result="blur" />
      <feFlood floodColor="#22d3ee" floodOpacity="0.95" />
      <feComposite in2="blur" operator="in" result="glow" />
      <feComponentTransfer in="SourceGraphic" result="bright">
        <feFuncR type="linear" slope="1.15" />
        <feFuncG type="linear" slope="1.15" />
        <feFuncB type="linear" slope="1.15" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="bright" />
      </feMerge>
    </filter>
  );
}

/** Marcatore numerato con linea guida (non interattivo): il numero corrisponde alla legenda. */
export function Marker({ n, x, y, tx = x, ty = y, active = false }: { n: number; x: number; y: number; tx?: number; ty?: number; active?: boolean }) {
  const hasLeader = Math.hypot(tx - x, ty - y) > 9;
  return (
    <g pointerEvents="none" aria-hidden="true">
      {hasLeader && (
        <>
          <line x1={x} y1={y} x2={tx} y2={ty} stroke="#e2e8f0" strokeOpacity="0.55" strokeWidth="0.9" />
          <circle cx={x} cy={y} r="1.9" fill="#e2e8f0" />
        </>
      )}
      <circle cx={tx} cy={ty} r="8" fill={active ? '#06b6d4' : '#0b1120'} fillOpacity={active ? 1 : 0.85} stroke={active ? '#a5f3fc' : '#67e8f9'} strokeOpacity={active ? 1 : 0.6} strokeWidth="1" />
      <text x={tx} y={ty + 3.2} textAnchor="middle" fontSize="9" fontWeight="700" fill={active ? '#0b1120' : '#e0f2fe'} fontFamily="Inter, ui-sans-serif, system-ui">
        {n}
      </text>
    </g>
  );
}
