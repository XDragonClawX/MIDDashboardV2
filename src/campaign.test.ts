import { describe, expect, it } from 'vitest';
import type { Rechnungsbeleg, UseCase, Vergabe } from './types';
import { computeCampaign, computeTeamGoals } from './campaign';

const periods = [
  { key: '2025', label: '2025', short: '2025', von: '2025-04-01', bis: '2025-12-31' },
  { key: '2026', label: '2026', short: '2026', von: '2026-01-01', bis: '2026-12-31' },
  { key: '2027', label: '2027', short: '2027', von: '2027-01-01', bis: '2027-12-31' },
];

const beleg = (o: Partial<Rechnungsbeleg>) =>
  ({ id: 1, foerderjahr: 2025, foerderfaehig: true, status: 'EINGEREICHT', quartal: 2, ...o }) as unknown as Rechnungsbeleg;

const base = { periods, today: '2026-06-01', rechnungen: [], zas: [], usecases: [], vergaben: [] };

describe('computeCampaign', () => {
  it('ordnet Kapitel nach Datum ein', () => {
    expect(computeCampaign(base).map((c) => c.status)).toEqual(['abgeschlossen', 'laufend', 'kommend']);
  });

  it('besteht ein abgeschlossenes Kapitel nur mit Daten und erfüllten Kriterien', () => {
    expect(computeCampaign(base)[0].passed).toBe(false); // keine Daten
    const ok = computeCampaign({ ...base, rechnungen: [beleg({})] })[0];
    expect(ok.passed).toBe(true);
    const open = computeCampaign({ ...base, rechnungen: [beleg({}), beleg({ id: 2, status: 'ENTWURF' })] })[0];
    expect(open.passed).toBe(false);
    expect(open.progressPct).toBe(0);
  });

  it('laufendes Kapitel gilt nie als bestanden', () => {
    const c = computeCampaign({ ...base, rechnungen: [beleg({ foerderjahr: 2026 })] })[1];
    expect(c.progressPct).toBe(100);
    expect(c.passed).toBe(false);
  });

  it('bewertet Use-Case-Meilensteine der Periode', () => {
    const uc = (status: string) => ({ id: 1, deadline: '2025-09-01', status }) as unknown as UseCase;
    expect(computeCampaign({ ...base, usecases: [uc('abgeschlossen')] })[0].passed).toBe(true);
    expect(computeCampaign({ ...base, usecases: [uc('aktiv')] })[0].passed).toBe(false);
  });
});

describe('computeTeamGoals', () => {
  it('markiert erreichte und verzögerte Ziele', () => {
    const goals = computeTeamGoals({ today: '2026-12-01', usecases: [], vergaben: [] as Vergabe[], oekoprofitCheckups: [] });
    const index = goals.find((g) => g.id === 'index-500')!;
    expect(index.reached).toBe(false);
    expect(index.pace).toBe('in-verzug');
    expect(goals).toHaveLength(4);
  });
});
