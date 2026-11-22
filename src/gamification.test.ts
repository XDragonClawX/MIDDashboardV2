import { describe, expect, it } from 'vitest';
import type { AchievementUnlock, Rechnungsbeleg } from './types';
import {
  applyPersistedUnlocks,
  computeBackupStreak,
  computeBelegTempoStreak,
  computeStreak,
  mergeAchievementUnlocks,
  sanitizeUnlocks,
} from './gamification';
import { ProjectAchievement, resolveNextTier, resolveTier } from './utils';

const T = true;
const F = false;

describe('computeStreak', () => {
  it('zählt eine ununterbrochene Serie', () => {
    expect(computeStreak([T, T, T])).toEqual({ current: 3, best: 3, jokerUsed: false, total: 3 });
  });

  it('toleriert einen Fehlschlag (Joker) ohne Serienbruch', () => {
    const r = computeStreak([T, T, F, T, T]);
    expect(r.current).toBe(4);
    expect(r.jokerUsed).toBe(true);
  });

  it('bricht beim zweiten Fehlschlag', () => {
    const r = computeStreak([T, T, T, F, F, T]);
    expect(r.current).toBe(1);
    expect(r.best).toBe(3);
  });

  it('ohne Schonfrist bricht schon der erste Fehlschlag', () => {
    expect(computeStreak([T, T, F, T], 0).current).toBe(1);
  });

  it('meldet keinen verbrauchten Joker für einen Fehlschlag vor jeder Serie', () => {
    const r = computeStreak([F, T, T]);
    expect(r.current).toBe(2);
    expect(r.jokerUsed).toBe(false);
  });

  it('liefert 0 für leere Listen', () => {
    expect(computeStreak([])).toEqual({ current: 0, best: 0, jokerUsed: false, total: 0 });
  });
});

describe('computeBelegTempoStreak', () => {
  const beleg = (rechnungsdatum: string, createdAt?: string): Rechnungsbeleg =>
    ({ id: 1, rechnungsdatum, createdAt } as unknown as Rechnungsbeleg);

  it('bewertet nur Belege mit Erfassungszeitpunkt', () => {
    const r = computeBelegTempoStreak([beleg('2026-03-02'), beleg('2026-03-02', '2026-03-03T10:00:00Z')]);
    expect(r.total).toBe(1);
    expect(r.current).toBe(1);
  });

  it('wertet Erfassung nach mehr als 5 Werktagen als verspätet', () => {
    // Mo 02.03.2026 + 5 Werktage = Mo 09.03.2026
    const pünktlich = beleg('2026-03-02', '2026-03-09T09:00:00Z');
    const verspätet = beleg('2026-03-02', '2026-03-10T09:00:00Z');
    expect(computeBelegTempoStreak([pünktlich]).current).toBe(1);
    expect(computeBelegTempoStreak([verspätet], 0).current).toBe(0);
  });
});

describe('computeBackupStreak', () => {
  it('zählt Monate in Folge ab der ersten Sicherung', () => {
    const r = computeBackupStreak(['2026-01', '2026-02', '2026-03'], '2026-03-15T00:00:00Z');
    expect(r.current).toBe(3);
  });

  it('wertet den laufenden Monat ohne Sicherung als offen, nicht als Fehlschlag', () => {
    const r = computeBackupStreak(['2026-01', '2026-02'], '2026-03-15T00:00:00Z', 0);
    expect(r.current).toBe(2);
    expect(r.total).toBe(2);
  });

  it('nutzt den Joker für einen ausgelassenen Monat', () => {
    const r = computeBackupStreak(['2026-01', '2026-03'], '2026-03-20T00:00:00Z');
    expect(r.current).toBe(2);
    expect(r.jokerUsed).toBe(true);
  });

  it('läuft korrekt über den Jahreswechsel', () => {
    const r = computeBackupStreak(['2025-11', '2025-12', '2026-01'], '2026-01-05T00:00:00Z');
    expect(r.current).toBe(3);
  });
});

describe('Stufen', () => {
  const thresholds = { bronze: 1, silber: 3, gold: 6 };

  it('ermittelt die erreichte Stufe', () => {
    expect(resolveTier(0, thresholds)).toBeNull();
    expect(resolveTier(1, thresholds)).toBe('bronze');
    expect(resolveTier(4, thresholds)).toBe('silber');
    expect(resolveTier(9, thresholds)).toBe('gold');
  });

  it('ermittelt die nächste Stufe', () => {
    expect(resolveNextTier(2, thresholds)).toEqual({ tier: 'silber', threshold: 3 });
    expect(resolveNextTier(6, thresholds)).toBeNull();
  });
});

describe('Dauerhafte Freischaltungen', () => {
  const ach = (overrides: Partial<ProjectAchievement>): ProjectAchievement => ({
    id: 'x',
    title: 'X',
    category: 'Test',
    description: '',
    unlocked: false,
    progressLabel: '',
    ...overrides,
  });

  it('schaltet beim Sprung auf Gold alle Stufen frei, meldet aber nur Gold', () => {
    const { unlocks, newlyUnlocked } = mergeAchievementUnlocks(
      [],
      [ach({ id: 'cent', unlocked: true, tier: 'gold' })],
      '2026-11-22T10:00:00Z'
    );
    expect(unlocks.map((u) => u.tier)).toEqual(['bronze', 'silber', 'gold']);
    expect(newlyUnlocked).toHaveLength(1);
    expect(newlyUnlocked[0].tier).toBe('gold');
  });

  it('meldet bereits Gespeichertes nicht erneut', () => {
    const first = mergeAchievementUnlocks([], [ach({ id: 'a', unlocked: true })], '2026-11-01T00:00:00Z');
    const second = mergeAchievementUnlocks(first.unlocks, [ach({ id: 'a', unlocked: true })], '2026-11-22T00:00:00Z');
    expect(second.newlyUnlocked).toHaveLength(0);
    expect(second.unlocks).toBe(first.unlocks);
  });

  it('markiert die Erst-Übernahme als rückwirkend', () => {
    const { unlocks } = mergeAchievementUnlocks([], [ach({ id: 'a', unlocked: true })], '2026-11-22T00:00:00Z', true);
    expect(unlocks[0].retroactive).toBe(true);
  });

  it('behält eine Freischaltung, auch wenn die Bedingung später entfällt', () => {
    const stored: AchievementUnlock[] = [
      { achievementId: 'cent', tier: 'bronze', unlockedAt: '2026-05-01T00:00:00Z' },
      { achievementId: 'cent', tier: 'silber', unlockedAt: '2026-08-01T00:00:00Z' },
    ];
    const [display] = applyPersistedUnlocks(
      [ach({ id: 'cent', unlocked: false, tier: null, nextTier: { tier: 'bronze', threshold: 1 } })],
      stored
    );
    expect(display.unlocked).toBe(true);
    expect(display.tier).toBe('silber');
    expect(display.unlockedAt).toBe('2026-05-01T00:00:00Z');
    expect(display.tierUnlockedAt).toBe('2026-08-01T00:00:00Z');
    expect(display.nextTier).toBeNull();
  });

  it('verwirft ungültige gespeicherte Einträge', () => {
    expect(sanitizeUnlocks('kaputt')).toBeNull();
    expect(
      sanitizeUnlocks([
        { achievementId: 'a', tier: null, unlockedAt: '2026-01-01' },
        { achievementId: 'b', tier: 'platin', unlockedAt: '2026-01-01' },
        { foo: 1 },
      ])
    ).toHaveLength(1);
  });
});
