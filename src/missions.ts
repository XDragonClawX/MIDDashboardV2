// Gamification Stufe 2: Wochen-Missionen, abgeleitet aus echten Fristen.
// Alle Funktionen sind rein (Datum wird übergeben) und damit direkt testbar.
import type { Rechnungsbeleg, Task, UseCase, Vergabe, Zahlungsanforderung } from './types';
import { addDaysISO, validateZaChain } from './utils';

export type MissionKind = 'task' | 'vergabe' | 'usecase' | 'usecase-todo' | 'za-frist' | 'beleg';

export interface WeeklyMission {
  id: string;
  kind: MissionKind;
  title: string;
  detail: string;
  dueDate: string; // YYYY-MM-DD
  daysLeft: number; // negativ = überfällig
  overdue: boolean;
  done: boolean;
  targetPage: string;
  subTab?: string;
}

export interface WeeklyMissionState {
  weekStart: string; // Montag
  weekEnd: string; // Sonntag
  missions: WeeklyMission[];
  doneCount: number;
  total: number;
  progressPct: number;
  overdueCount: number;
  allDone: boolean;
}

/** Überfällige, noch offene Fristen werden bis zu so vielen Tagen zurück berücksichtigt. */
export const OVERDUE_LOOKBACK_DAYS = 28;

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffDays(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T12:00:00`).getTime();
  const b = new Date(`${toISO}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Montag und Sonntag der Kalenderwoche, in der `today` liegt. */
export function weekRange(today: string): { weekStart: string; weekEnd: string } {
  const d = new Date(`${today}T12:00:00`);
  const sinceMonday = (d.getDay() + 6) % 7;
  const weekStart = addDaysISO(today, -sinceMonday) ?? today;
  const weekEnd = addDaysISO(weekStart, 6) ?? today;
  return { weekStart, weekEnd };
}

export function computeWeeklyMissions(params: {
  today: string;
  tasks: Task[];
  vergaben: Vergabe[];
  usecases: UseCase[];
  zas: Zahlungsanforderung[];
  rechnungen: Rechnungsbeleg[];
}): WeeklyMissionState {
  const { today, tasks, vergaben, usecases, zas, rechnungen } = params;
  const { weekStart, weekEnd } = weekRange(today);
  const lookbackStart = addDaysISO(weekStart, -OVERDUE_LOOKBACK_DAYS) ?? weekStart;

  const missions: WeeklyMission[] = [];

  /** Fällig diese Woche oder (noch offen) kürzlich überfällig. */
  const relevant = (due: string | null | undefined, done: boolean): due is string => {
    if (!due || !/^\d{4}-\d{2}-\d{2}/.test(due)) return false;
    const day = due.slice(0, 10);
    if (day >= weekStart && day <= weekEnd) return true;
    return !done && day < weekStart && day >= lookbackStart;
  };

  const push = (m: Omit<WeeklyMission, 'daysLeft' | 'overdue'>) => {
    const dueDate = m.dueDate.slice(0, 10);
    const daysLeft = diffDays(today, dueDate);
    missions.push({ ...m, dueDate, daysLeft, overdue: !m.done && daysLeft < 0 });
  };

  for (const t of tasks) {
    const done = t.status === 'erledigt';
    if (!relevant(t.dueDate, done)) continue;
    push({
      id: `task:${t.id}`,
      kind: 'task',
      title: t.title,
      detail: t.priority === 'hoch' ? 'Aufgabe · hohe Priorität' : 'Aufgabe',
      dueDate: t.dueDate as string,
      done,
      targetPage: 'aufgaben',
    });
  }

  for (const v of vergaben) {
    const closed = v.status === 'abgeschlossen';
    // Angebotsfrist gilt als erledigt, sobald die Prüfung begonnen hat
    const bidsDone = closed || v.status === 'Prüfung' || v.status === 'Zuschlag';
    if (relevant(v.abgabeFrist, bidsDone)) {
      push({
        id: `vergabe-abgabe:${v.id}`,
        kind: 'vergabe',
        title: `Angebotsfrist: ${v.titel}`,
        detail: `Vergabe · Status ${v.status}`,
        dueDate: v.abgabeFrist as string,
        done: bidsDone,
        targetPage: 'vergaben',
      });
    }
    if (relevant(v.zuschlagsDatum, closed)) {
      push({
        id: `vergabe-zuschlag:${v.id}`,
        kind: 'vergabe',
        title: `Zuschlag: ${v.titel}`,
        detail: v.bafaFreigabe ? 'Vergabe · BAFA-Freigabe liegt vor' : 'Vergabe · BAFA-Freigabe fehlt noch',
        dueDate: v.zuschlagsDatum as string,
        done: closed || v.status === 'Zuschlag',
        targetPage: 'vergaben',
      });
    }
  }

  for (const uc of usecases) {
    const closed = uc.status === 'abgeschlossen';
    if (relevant(uc.deadline, closed)) {
      push({
        id: `usecase:${uc.id}`,
        kind: 'usecase',
        title: `Meilenstein: ${uc.titel}`,
        detail: `Use Case · ${uc.unternehmen}`,
        dueDate: uc.deadline,
        done: closed,
        targetPage: 'usecase',
      });
    }
    for (const todo of uc.todos ?? []) {
      if (!relevant(todo.dueDate, todo.completed)) continue;
      push({
        id: `usecase-todo:${uc.id}:${todo.id}`,
        kind: 'usecase-todo',
        title: todo.text,
        detail: `To-do · ${uc.titel}`,
        dueDate: todo.dueDate as string,
        done: todo.completed,
        targetPage: 'usecase',
      });
    }
  }

  // ANBest-P 2-Monats-Frist: positiver Kassenbestand muss zeitnah verwendet werden
  const validations = validateZaChain(zas);
  for (const za of zas) {
    const v = validations[za.id];
    if (!v?.twoMonthDeadline) continue;
    const done = za.status === 'Abgerechnet' || za.belegVollstaendig;
    if (!relevant(v.twoMonthDeadline, done)) continue;
    push({
      id: `za-frist:${za.id}`,
      kind: 'za-frist',
      title: `2-Monats-Frist: ${za.bezeichnung}`,
      detail: 'Positiven Kassenbestand mit Belegen verwenden (ANBest-P)',
      dueDate: v.twoMonthDeadline,
      done,
      targetPage: 'mittelabrufe',
      subTab: 'za-rechner',
    });
  }

  // Beleg-Prüfung: Entwürfe des laufenden Quartals bündeln
  const month = Number(today.slice(5, 7));
  const year = Number(today.slice(0, 4));
  const quarter = Math.ceil(month / 3);
  const drafts = rechnungen.filter(
    (r) => r.foerderjahr === year && r.quartal === quarter && r.status === 'ENTWURF' && r.foerderfaehig
  );
  if (drafts.length > 0) {
    push({
      id: `beleg:${year}-Q${quarter}`,
      kind: 'beleg',
      title: `${drafts.length} Beleg${drafts.length === 1 ? '' : 'e'} Q${quarter}/${year} prüfen`,
      detail: 'Entwürfe prüfen und freigeben',
      dueDate: weekEnd,
      done: false,
      targetPage: 'rechnungen',
    });
  }

  missions.sort(
    (a, b) =>
      Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id)
  );

  const doneCount = missions.filter((m) => m.done).length;
  const total = missions.length;
  return {
    weekStart,
    weekEnd,
    missions,
    doneCount,
    total,
    progressPct: total === 0 ? 100 : Math.round((doneCount / total) * 100),
    overdueCount: missions.filter((m) => m.overdue).length,
    allDone: total > 0 && doneCount === total,
  };
}
