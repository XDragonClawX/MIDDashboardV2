import { useState } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, Circle, Flag, Target, Trophy } from 'lucide-react';
import type { WeeklyMissionState } from '../missions';
import type { BossEventCard } from '../bossEvents';
import { formatDate } from '../utils';

const MAX_VISIBLE_MISSIONS = 6;

function isoWeek(dateISO: string): number {
  const d = new Date(`${dateISO}T12:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function dueLabel(daysLeft: number, done: boolean): string {
  if (done) return 'Erledigt';
  if (daysLeft < 0) return `${Math.abs(daysLeft)} d überfällig`;
  if (daysLeft === 0) return 'Heute';
  if (daysLeft === 1) return 'Morgen';
  return `in ${daysLeft} d`;
}

interface MissionProps {
  state: WeeklyMissionState;
  onOpen: (page: string, subTab?: string) => void;
}

/** Wochen-Missionen aus echten Fristen (Aufgaben, Vergaben, Use Cases, ZA-Fristen, Belege). */
export function WeeklyMissionsPanel({ state, onOpen }: MissionProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? state.missions : state.missions.slice(0, MAX_VISIBLE_MISSIONS);
  const hidden = state.missions.length - visible.length;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3">
        <div>
          <h2 className="font-display font-bold text-base text-zs-blau-schwarz flex items-center gap-2">
            <Target className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
            <span>Wochen-Missionen · KW {isoWeek(state.weekStart)}</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {formatDate(state.weekStart)} – {formatDate(state.weekEnd)} · automatisch aus Aufgaben, Vergabe-,
            Use-Case- und ZA-Fristen
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs font-bold text-zs-blau-schwarz tabular-nums">
            {state.doneCount} / {state.total} erledigt
          </div>
          {state.overdueCount > 0 && (
            <div className="text-xs font-mono font-bold text-red-600">{state.overdueCount} überfällig</div>
          )}
        </div>
      </div>

      <div
        className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={state.progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Wochenfortschritt"
      >
        <div className="bg-[#10B981] h-full transition-all duration-300" style={{ width: `${state.progressPct}%` }} />
      </div>

      {state.total === 0 ? (
        <p className="text-xs text-zinc-500 py-2">
          Diese Woche stehen keine Fristen an – Zeit für Vorbereitung und Aufräumen.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {visible.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onOpen(m.targetPage, m.subTab)}
                className="w-full flex items-center gap-2.5 py-2 text-left hover:bg-zinc-50 rounded cursor-pointer"
              >
                {m.done ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" aria-hidden="true" />
                ) : (
                  <Circle className={`w-4 h-4 shrink-0 ${m.overdue ? 'text-red-500' : 'text-zinc-300'}`} aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-xs font-bold truncate ${
                      m.done ? 'text-zinc-400 line-through' : 'text-zs-blau-schwarz'
                    }`}
                  >
                    {m.title}
                  </span>
                  <span className="block text-xs text-zinc-500 truncate">{m.detail}</span>
                </span>
                <span
                  className={`shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                    m.done
                      ? 'bg-emerald-100 text-emerald-800'
                      : m.overdue
                      ? 'bg-red-100 text-red-700'
                      : m.daysLeft <= 1
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {dueLabel(m.daysLeft, m.done)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs font-mono font-bold text-[#0f766e] hover:underline cursor-pointer"
        >
          + {hidden} weitere anzeigen
        </button>
      )}
      {showAll && state.missions.length > MAX_VISIBLE_MISSIONS && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs font-mono font-bold text-zinc-500 hover:underline cursor-pointer"
        >
          weniger anzeigen
        </button>
      )}

      {state.allDone && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          <CalendarCheck className="w-3.5 h-3.5" aria-hidden="true" /> Alle Wochen-Missionen erledigt – sauber gearbeitet.
        </div>
      )}
    </div>
  );
}

interface BossProps {
  events: BossEventCard[];
  onOpen: (page: string, subTab?: string) => void;
}

/** Boss-Events (Kassenschluss, Mittelabruf-Frist, Vor-Ort-Prüfung) mit Umschalter. */
export function BossEventsPanel({ events, onOpen }: BossProps) {
  const [activeId, setActiveId] = useState<BossEventCard['id']>(events[0]?.id ?? 'kassenschluss');
  const boss = events.find((e) => e.id === activeId) ?? events[0];
  if (!boss) return null;

  return (
    <div className="bg-[#041422] text-white rounded-xl p-5 flex flex-col justify-between space-y-4">
      <div className="space-y-2">
        <div role="tablist" aria-label="Boss-Events" className="flex flex-wrap gap-1">
          {events.map((e) => (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={e.id === boss.id}
              onClick={() => setActiveId(e.id)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-bold cursor-pointer ${
                e.id === boss.id ? 'bg-[#58B49D] text-[#041422]' : 'bg-white/10 text-zinc-300 hover:bg-white/20'
              }`}
            >
              {e.trophyUnlocked && <Trophy className="w-3 h-3" aria-hidden="true" />}
              {e.id === 'kassenschluss' ? 'Kassenschluss' : e.id === 'mittelabruf-frist' ? 'Mittelabruf' : 'Prüfung'}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-[#58B49D] pt-1">
          <span className="inline-flex items-center gap-1.5 font-bold">
            <Flag className="w-3.5 h-3.5" aria-hidden="true" /> {boss.title}
          </span>
          <span className="tabular-nums">{boss.deadlineLabel}</span>
        </div>
        <div className="font-display font-bold text-lg">
          {boss.subtitle}: {boss.progressPct} %
        </div>
        {boss.daysLeft !== null && (
          <div className="text-xs text-zinc-400">
            {boss.daysLeft >= 0 ? `Noch ${boss.daysLeft} Tage` : `${Math.abs(boss.daysLeft)} Tage über Frist`}
          </div>
        )}
        <div
          className="w-full bg-white/10 h-2 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={boss.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${boss.title} Fortschritt`}
        >
          <div className="bg-[#10B981] h-full transition-all duration-300" style={{ width: `${boss.progressPct}%` }} />
        </div>
        <div className="space-y-1.5 pt-1">
          {boss.phases.map((p) => (
            <div key={p.id} className="text-xs text-zinc-300">
              <div className="flex items-center justify-between">
                <span className="truncate pr-2">{p.title}</span>
                <span className={`font-mono font-bold shrink-0 ${p.completed ? 'text-[#10B981]' : 'text-amber-300'}`}>
                  {p.completed ? 'Erledigt' : 'Offen'}
                </span>
              </div>
              <div className="text-xs text-zinc-400 leading-snug">{p.description}</div>
            </div>
          ))}
        </div>
        {boss.trophyUnlocked && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#10B981] pt-1">
            <Trophy className="w-3.5 h-3.5" aria-hidden="true" /> Boss besiegt
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpen(boss.targetPage, boss.subTab)}
        className="w-full py-2 px-3 rounded-lg bg-[#58B49D] text-[#041422] font-bold text-xs hover:bg-[#4ca28b] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>{boss.actionLabel}</span>
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
