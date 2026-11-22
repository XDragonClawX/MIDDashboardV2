import { useState } from 'react';
import { CheckCircle2, Circle, Flag, Lock, MinusCircle, PartyPopper, Users } from 'lucide-react';
import type { CampaignChapter, TeamGoal } from '../campaign';

const STATUS_LABEL = { kommend: 'Kommend', laufend: 'Laufend', abgeschlossen: 'Abgeschlossen' } as const;

function ChapterButton({
  chapter,
  active,
  onClick,
}: {
  chapter: CampaignChapter;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = chapter.passed
    ? CheckCircle2
    : chapter.status === 'kommend'
    ? Lock
    : chapter.status === 'laufend'
    ? Flag
    : Circle;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 min-w-[5.5rem] p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
        active ? 'border-[#10B981] bg-emerald-50' : 'border-zinc-200 bg-white hover:bg-zinc-50'
      } ${chapter.status === 'kommend' ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-display font-bold text-sm text-zs-blau-schwarz">{chapter.short}</span>
        <Icon className={`w-4 h-4 ${chapter.passed ? 'text-[#10B981]' : 'text-zinc-400'}`} aria-hidden="true" />
      </div>
      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
        {chapter.passed ? 'Bestanden' : STATUS_LABEL[chapter.status]}
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full bg-[#10B981]" style={{ width: `${chapter.progressPct}%` }} />
      </div>
    </button>
  );
}

/** Kampagne über die 5 AZA-Perioden mit Jahresbilanz je Kapitel. */
export function CampaignPanel({ chapters }: { chapters: CampaignChapter[] }) {
  const current = chapters.find((c) => c.status === 'laufend') ?? chapters[0];
  const [activeKey, setActiveKey] = useState<string | undefined>(current?.key);
  const chapter = chapters.find((c) => c.key === activeKey) ?? current;
  if (!chapter) return null;
  const passedCount = chapters.filter((c) => c.passed).length;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3">
        <div>
          <h2 className="font-display font-bold text-base text-zs-blau-schwarz flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#BA8B68]" aria-hidden="true" />
            <span>Kampagne 2025–2029</span>
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Fünf Kapitel, je ein AZA-Förderzeitraum mit Jahresbilanz</p>
        </div>
        <span className="font-mono text-xs font-bold text-zs-blau-schwarz tabular-nums">
          {passedCount} / {chapters.length} Kapitel bestanden
        </span>
      </div>

      <div role="tablist" aria-label="Kampagnenkapitel" className="flex flex-wrap gap-2">
        {chapters.map((c) => (
          <ChapterButton key={c.key} chapter={c} active={c.key === chapter.key} onClick={() => setActiveKey(c.key)} />
        ))}
      </div>

      {chapter.passed && (
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2.5">
          <PartyPopper className="w-4 h-4" aria-hidden="true" />
          Kapitel {chapter.label} bestanden – alle bewertbaren Kriterien der Periode sind erfüllt.
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold text-zs-blau-schwarz">Jahresbilanz {chapter.label}</h3>
          <span className="text-[10px] font-mono text-zinc-500">
            {STATUS_LABEL[chapter.status]}
            {chapter.hasData ? ` · ${chapter.progressPct} % der Kriterien erfüllt` : ' · noch keine Daten'}
          </span>
        </div>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {chapter.criteria.map((c) => (
            <li key={c.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50">
              {c.met === null ? (
                <MinusCircle className="w-4 h-4 shrink-0 text-zinc-300 mt-0.5" aria-hidden="true" />
              ) : c.met ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981] mt-0.5" aria-hidden="true" />
              ) : (
                <Circle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-zs-blau-schwarz">{c.label}</div>
                <div className="text-[10px] text-zinc-500 leading-snug">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const PACE_STYLE: Record<TeamGoal['pace'], { label: string; cls: string; bar: string }> = {
  erreicht: { label: 'Erreicht', cls: 'bg-emerald-100 text-emerald-800', bar: 'bg-[#10B981]' },
  'auf-kurs': { label: 'Auf Kurs', cls: 'bg-sky-100 text-sky-800', bar: 'bg-[#00B4D8]' },
  'in-verzug': { label: 'In Verzug', cls: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
};

/** Gemeinsame Team-Ziele – bewusst ohne Personenbezug und ohne Rangliste. */
export function TeamGoalsPanel({ goals }: { goals: TeamGoal[] }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
      <div className="border-b border-zinc-100 pb-3">
        <h2 className="font-display font-bold text-base text-zs-blau-schwarz flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00B4D8]" aria-hidden="true" />
          <span>Gemeinsame Team-Ziele</span>
        </h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Projektziele für das ganze Team – keine Einzelwertung. Der Marker zeigt den linearen Soll-Verlauf.
        </p>
      </div>
      <ul className="space-y-3">
        {goals.map((g) => {
          const style = PACE_STYLE[g.pace];
          return (
            <li key={g.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zs-blau-schwarz">{g.title}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${style.cls}`}>
                  {style.label}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500">
                {g.description} · Ziel bis {g.targetDate.split('-').reverse().join('.')}
              </div>
              <div
                className="relative mt-1.5 h-2 rounded-full bg-zinc-100 overflow-hidden"
                role="progressbar"
                aria-valuenow={g.progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${g.title}: ${g.current} von ${g.target}`}
              >
                <div className={`h-full ${style.bar} transition-all duration-300`} style={{ width: `${g.progressPct}%` }} />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-zs-blau-schwarz/60"
                  style={{ left: `${g.expectedPct}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5 tabular-nums">
                {g.current} / {g.target} ({g.progressPct} %)
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
