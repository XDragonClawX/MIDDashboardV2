import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Award, Sparkles, X } from 'lucide-react';
import type { AchievementTier } from '../types';
import { TIER_LABEL } from '../utils';

export interface AchievementToastItem {
  key: string;
  title: string;
  description: string;
  tier: AchievementTier | null;
  hidden?: boolean;
}

export const TIER_STYLE: Record<AchievementTier, { ring: string; badge: string; text: string }> = {
  bronze: { ring: 'border-[#B87333]/60', badge: 'bg-[#B87333]/15 text-[#8a5524]', text: 'text-[#8a5524]' },
  silber: { ring: 'border-zinc-400/70', badge: 'bg-zinc-200 text-zinc-700', text: 'text-zinc-600' },
  gold: { ring: 'border-[#D4A017]/70', badge: 'bg-[#D4A017]/20 text-[#7a5c00]', text: 'text-[#7a5c00]' },
};

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 3;

interface Props {
  items: AchievementToastItem[];
  onDismiss: (key: string) => void;
}

/** Stapel von Hinweisen zu neu freigeschalteten Abzeichen (unten rechts). */
export default function AchievementToastStack({ items, onDismiss }: Props) {
  const reduceMotion = useReducedMotion();

  // Ältesten Hinweis nach einigen Sekunden automatisch schließen
  useEffect(() => {
    if (items.length === 0) return;
    const timer = setTimeout(() => onDismiss(items[0].key), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [items, onDismiss]);

  return (
    <div
      aria-live="polite"
      aria-label="Neu freigeschaltete Abzeichen"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))] print:hidden"
    >
      <AnimatePresence initial={false}>
        {items.slice(0, MAX_VISIBLE).map((item) => {
          const style = item.tier ? TIER_STYLE[item.tier] : null;
          return (
            <motion.div
              key={item.key}
              layout={!reduceMotion}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 48 }}
              transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: 'easeOut' }}
              role="status"
              className={`relative bg-white rounded-xl border-2 shadow-lg p-3 pr-9 ${
                style ? style.ring : 'border-[#10B981]/60'
              }`}
            >
              <button
                type="button"
                onClick={() => onDismiss(item.key)}
                aria-label="Hinweis schließen"
                className="absolute top-2 right-2 p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start gap-2.5">
                <motion.div
                  initial={reduceMotion ? false : { rotate: -20, scale: 0.6 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.1 }}
                  className="shrink-0 w-9 h-9 rounded-full bg-zs-blau-schwarz flex items-center justify-center"
                >
                  {item.hidden ? (
                    <Sparkles className="w-4.5 h-4.5 text-zs-signal-gelb" />
                  ) : (
                    <Award className="w-4.5 h-4.5 text-zs-signal-gelb" />
                  )}
                </motion.div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#10B981]">
                    {item.hidden ? 'Verstecktes Abzeichen entdeckt' : 'Abzeichen freigeschaltet'}
                  </div>
                  <div className="font-bold text-sm text-zs-blau-schwarz leading-tight mt-0.5">
                    {item.title}
                    {item.tier && style && (
                      <span className={`ml-1.5 align-middle text-[10px] font-mono px-1.5 py-0.5 rounded ${style.badge}`}>
                        {TIER_LABEL[item.tier]}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-1">{item.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
