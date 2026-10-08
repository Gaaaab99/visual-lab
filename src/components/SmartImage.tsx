import { useState, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  fallbackLabel?: string;
}

/** Immagine con skeleton durante il caricamento e fallback in caso di errore */
export function SmartImage({ wrapperClassName = '', className = '', fallbackLabel = 'Immagine non disponibile', onLoad, onError, ...rest }: Props) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {state === 'loading' && <div className="skeleton absolute inset-0" aria-hidden />}
      {state === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-800 text-slate-500">
          <ImageOff size={28} />
          <span className="px-4 text-center text-xs">{fallbackLabel}</span>
        </div>
      ) : (
        <img
          {...rest}
          loading={rest.loading ?? 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          className={`${className} transition-opacity duration-500 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={(e) => {
            setState('loaded');
            onLoad?.(e);
          }}
          onError={(e) => {
            setState('error');
            onError?.(e);
          }}
        />
      )}
    </div>
  );
}
