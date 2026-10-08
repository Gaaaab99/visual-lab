import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const ICON = { success: CheckCircle2, error: XCircle, info: Info };
const TONE = {
  success: 'border-emerald-400/30 text-emerald-200',
  error: 'border-rose-400/30 text-rose-200',
  info: 'border-cyan-400/30 text-cyan-100',
};

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <motion.button
              layout
              key={t.id}
              onClick={() => dismissToast(t.id)}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className={`pointer-events-auto flex items-center gap-3 rounded-xl border bg-ink-850/95 px-4 py-3 text-left text-sm shadow-xl backdrop-blur ${TONE[t.kind]}`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-slate-100">{t.text}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
