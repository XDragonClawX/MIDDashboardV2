import { AlertTriangle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export interface TodayItem {
  id: string;
  severity: 'high' | 'medium';
  title: string;
  detail?: string;
  page: string;
  subTab?: string;
}

const MAX_ITEMS = 4;

/** „Heute“-Streifen: das Dringendste (Fristen, Prüfwarnungen) vor allen Detailbereichen. */
export function TodayStrip({
  items,
  onOpen,
}: {
  items: TodayItem[];
  onOpen: (page: string, subTab?: string) => void;
}) {
  const sorted = [...items].sort((a, b) => Number(b.severity === 'high') - Number(a.severity === 'high'));
  const visible = sorted.slice(0, MAX_ITEMS);
  const more = sorted.length - visible.length;

  if (sorted.length === 0) {
    return (
      <section
        aria-label="Heute dringend"
        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="font-bold">Heute nichts Dringendes</span>
        <span className="text-emerald-800">– keine überfälligen Fristen, keine offenen Prüfwarnungen.</span>
      </section>
    );
  }

  return (
    <section aria-label="Heute dringend" className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h2 className="font-display font-bold text-sm text-zs-blau-schwarz">Heute dringend</h2>
        <span className="text-xs text-zinc-500 tabular-nums">{sorted.length} offen</span>
      </div>
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {visible.map((item) => {
          const high = item.severity === 'high';
          const Icon = high ? AlertTriangle : Clock;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item.page, item.subTab)}
                className={`w-full min-h-[44px] flex items-center gap-3 rounded-lg border px-3 py-2 text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blau-schwarz ${
                  high
                    ? 'border-red-200 bg-red-50 hover:bg-red-100'
                    : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${high ? 'text-red-700' : 'text-amber-700'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold ${high ? 'text-red-950' : 'text-amber-950'}`}>
                    {item.title}
                  </span>
                  {item.detail && (
                    <span className={`block text-xs ${high ? 'text-red-800' : 'text-amber-900'}`}>{item.detail}</span>
                  )}
                </span>
                <span className="sr-only">{high ? 'Dringend' : 'Bald fällig'}</span>
                <ArrowRight className="w-4 h-4 shrink-0 text-zinc-500" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {more > 0 && <p className="mt-2 text-xs text-zinc-500">+ {more} weitere in den Fachmodulen</p>}
    </section>
  );
}

export type CockpitView = 'ueberblick' | 'finanzen' | 'spiel';

const VIEW_LABEL: Record<CockpitView, string> = {
  ueberblick: 'Überblick',
  finanzen: 'Finanzen',
  spiel: 'Fortschritt & Spiel',
};

/** Reiter zur Gliederung der langen Cockpit-Seite. */
export function CockpitTabs({
  view,
  views,
  onChange,
}: {
  view: CockpitView;
  views: CockpitView[];
  onChange: (v: CockpitView) => void;
}) {
  return (
    <div role="tablist" aria-label="Cockpit-Bereiche" className="flex flex-wrap gap-1 border-b border-zinc-200">
      {views.map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          id={`cockpit-tab-${v}`}
          aria-selected={view === v}
          aria-controls="cockpit-panel"
          onClick={() => onChange(v)}
          className={`min-h-[44px] px-4 text-sm font-bold border-b-2 -mb-px cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blau-schwarz ${
            view === v
              ? 'border-zs-blau-schwarz text-zs-blau-schwarz'
              : 'border-transparent text-zinc-600 hover:text-zs-blau-schwarz'
          }`}
        >
          {VIEW_LABEL[v]}
        </button>
      ))}
    </div>
  );
}
