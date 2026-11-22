import { describe, expect, it } from 'vitest';
import type { Task, UseCase, Vergabe, Zahlungsanforderung } from './types';
import { computeWeeklyMissions, weekRange } from './missions';
import { computeBossMittelabrufFrist, computeBossVorOrtPruefung } from './bossEvents';

// Mittwoch, 11.11.2026 → Woche 09.11.–15.11.
const TODAY = '2026-11-11';

const task = (o: Partial<Task>): Task =>
  ({ id: 1, title: 'T', description: '', dueDate: null, status: 'offen', priority: 'mittel', createdAt: '', ...o }) as Task;

const base = { today: TODAY, tasks: [], vergaben: [], usecases: [], zas: [], rechnungen: [] };

describe('weekRange', () => {
  it('liefert Montag bis Sonntag', () => {
    expect(weekRange('2026-11-11')).toEqual({ weekStart: '2026-11-09', weekEnd: '2026-11-15' });
    expect(weekRange('2026-11-15')).toEqual({ weekStart: '2026-11-09', weekEnd: '2026-11-15' });
    expect(weekRange('2026-11-09').weekStart).toBe('2026-11-09');
  });
});

describe('computeWeeklyMissions', () => {
  it('nimmt Fristen dieser Woche auf und ignoriert fremde Wochen', () => {
    const r = computeWeeklyMissions({
      ...base,
      tasks: [
        task({ id: 1, dueDate: '2026-11-12' }),
        task({ id: 2, dueDate: '2026-11-20' }),
        task({ id: 3, dueDate: '2026-12-01', status: 'erledigt' }),
      ],
    });
    expect(r.missions.map((m) => m.id)).toEqual(['task:1']);
  });

  it('zeigt überfällige offene Fristen, aber keine alten erledigten', () => {
    const r = computeWeeklyMissions({
      ...base,
      tasks: [
        task({ id: 1, dueDate: '2026-11-03' }),
        task({ id: 2, dueDate: '2026-11-03', status: 'erledigt' }),
        task({ id: 3, dueDate: '2026-08-01' }),
      ],
    });
    expect(r.missions.map((m) => m.id)).toEqual(['task:1']);
    expect(r.missions[0].overdue).toBe(true);
    expect(r.missions[0].daysLeft).toBe(-8);
    expect(r.overdueCount).toBe(1);
  });

  it('berechnet Fortschritt und allDone', () => {
    const r = computeWeeklyMissions({
      ...base,
      tasks: [
        task({ id: 1, dueDate: '2026-11-10', status: 'erledigt' }),
        task({ id: 2, dueDate: '2026-11-13', status: 'erledigt' }),
      ],
    });
    expect(r.progressPct).toBe(100);
    expect(r.allDone).toBe(true);
  });

  it('leere Woche ist nicht „alles erledigt“', () => {
    const r = computeWeeklyMissions(base);
    expect(r.total).toBe(0);
    expect(r.allDone).toBe(false);
  });

  it('leitet Missionen aus Vergaben und Use Cases ab', () => {
    const vergabe = {
      id: 7, titel: 'Booster 5', status: 'Angebotsphase', abgabeFrist: '2026-11-13', zuschlagsDatum: null, bafaFreigabe: false,
    } as unknown as Vergabe;
    const uc = {
      id: 3, titel: 'Pilot A', unternehmen: 'X', deadline: '2026-11-14', status: 'aktiv',
      todos: [{ id: 'a', text: 'Vertrag', completed: true, dueDate: '2026-11-11' }],
    } as unknown as UseCase;
    const r = computeWeeklyMissions({ ...base, vergaben: [vergabe], usecases: [uc] });
    expect(r.missions.map((m) => m.id).sort()).toEqual(['usecase-todo:3:a', 'usecase:3', 'vergabe-abgabe:7']);
    expect(r.doneCount).toBe(1);
  });
});

describe('Boss-Events', () => {
  it('Mittelabruf-Frist ohne Daten ist nicht besiegt', () => {
    const b = computeBossMittelabrufFrist({ zas: [], today: TODAY });
    expect(b.trophyUnlocked).toBe(false);
    expect(b.progressPct).toBe(0);
  });

  it('Vor-Ort-Prüfung braucht intakte Kette und Backup', () => {
    const none = computeBossVorOrtPruefung({
      zas: [], vergaben: [], oekoprofitCheckups: [], rechnungen: [], auditChain: { valid: true, checkedCount: 5 }, hasBackup: true,
    });
    // ohne eingereichte ZA ist die Akte nicht „vollständig“
    expect(none.phases[1].completed).toBe(false);
    expect(none.trophyUnlocked).toBe(false);
    const za = { id: 1, status: 'Eingereicht', belegVollstaendig: true, datum: '2026-05-01', istJePosition: {}, vorschauJePosition: {} } as unknown as Zahlungsanforderung;
    const ok = computeBossVorOrtPruefung({
      zas: [za], vergaben: [], oekoprofitCheckups: [], rechnungen: [], auditChain: { valid: true, checkedCount: 5 }, hasBackup: true,
    });
    expect(ok.phases[1].completed).toBe(true);
    expect(ok.phases[2].completed).toBe(true);
    const broken = computeBossVorOrtPruefung({
      zas: [za], vergaben: [], oekoprofitCheckups: [], rechnungen: [], auditChain: { valid: false, checkedCount: 5 }, hasBackup: false,
    });
    expect(broken.trophyUnlocked).toBe(false);
  });
});
