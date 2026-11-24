import { ChevronRight, Search } from 'lucide-react';
import type { SearchResult } from '../lib/search';

interface Props {
  query: string;
  results: SearchResult[];
  onQueryChange: (q: string) => void;
  onSelect: (page: string) => void;
  onClose: () => void;
}

/** Suchfenster (Strg+K) mit tastaturbedienbarer Ergebnisliste. */
export default function GlobalSearchModal({ query, results, onQueryChange, onSelect, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-[#041422]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Globale Suche"
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-500" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            aria-label="Suchbegriff"
            placeholder="Suchen... (Abrufnummer, Name, Kreditor, ZA)"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full text-sm font-sans outline-none text-zinc-800"
          />
          <kbd className="px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 font-mono text-xs text-[#041422] font-semibold">
            ESC
          </kbd>
        </div>

        <div className="p-2 max-h-72 overflow-y-auto pr-1" aria-live="polite">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono">
              Geben Sie ein Suchwort ein, um ERP-Sammlungen nachzuschlagen.
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono">Keine Übereinstimmungen gefunden.</div>
          ) : (
            <ul className="space-y-0.5">
              {results.map((res, idx) => (
                <li key={`${res.page}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(res.page)}
                    className="w-full min-h-[44px] flex justify-between items-center p-2.5 rounded-lg hover:bg-zs-signal-gelb/25 cursor-pointer text-xs text-left transition-all border border-transparent hover:border-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blau-schwarz"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 text-xs font-mono font-bold bg-[#041422]/10 px-2 py-0.5 rounded text-zs-blau-schwarz">
                        {res.category}
                      </span>
                      <span className="text-zinc-700 font-medium truncate max-w-[280px]">{res.text}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-zinc-500" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-zinc-200 bg-zinc-50/50 flex justify-between text-xs font-mono text-zinc-500">
          <span>Navigieren Sie per Mausklick oder Tastatur</span>
          <span>Made in Düren &bull; WIN.DN</span>
        </div>
      </div>
    </div>
  );
}
