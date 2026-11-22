// Gamification Stufe 3: Kampagne über die 5 AZA-Perioden und gemeinsame Team-Ziele.
// Rein funktional (Datum wird übergeben); bewusst ohne Personenbezug – nur Team-/Projektebene.
import type { OekoprofitCheckup, Rechnungsbeleg, UseCase, Vergabe, Zahlungsanforderung } from './types';
import { computeTransformationIndex, validateZaChain } from './utils';

export interface CampaignPeriod {
  key: string;
  label: string;
  short: string;
  von: string;
  bis: string;
}

export type ChapterStatus = 'kommend' | 'laufend' | 'abgeschlossen';

export interface ChapterCriterion {
  id: string;
  label: string;
  detail: string;
  /** null = für diese Periode (noch) nichts zu bewerten */
  met: boolean | null;
}

export interface CampaignChapter {
  key: string;
  label: string;
  short: string;
  year: number;
  status: ChapterStatus;
  criteria: ChapterCriterion[];
  progressPct: number;
  /** Periode vorbei und alle bewertbaren Kriterien erfüllt */
  passed: boolean;
  hasData: boolean;
  stats: { belege: number; zasEingereicht: number; useCasesTotal: number; useCasesDone: number; vergaben: number };
}

const inYear = (dateISO: string | null | undefined, year: number) => Boolean(dateISO) && dateISO!.startsWith(String(year));

export function periodYear(p: CampaignPeriod): number {
  return Number(p.von.slice(0, 4));
}

export function computeCampaign(params: {
  periods: CampaignPeriod[];
  today: string;
  rechnungen: Rechnungsbeleg[];
  zas: Zahlungsanforderung[];
  usecases: UseCase[];
  vergaben: Vergabe[];
}): CampaignChapter[] {
  const { periods, today, rechnungen, zas, usecases, vergaben } = params;
  const chain = validateZaChain(zas);

  return periods.map((p) => {
    const year = periodYear(p);
    const status: ChapterStatus = today > p.bis ? 'abgeschlossen' : today >= p.von ? 'laufend' : 'kommend';

    const belege = rechnungen.filter((r) => r.foerderjahr === year && r.foerderfaehig);
    const belegeOffen = belege.filter((r) => r.status === 'ENTWURF');
    const yearZas = zas.filter((z) => inYear(z.datum, year));
    const submitted = yearZas.filter((z) => z.status === 'Eingereicht' || z.status === 'Abgerechnet');
    const zaProblems = submitted.filter((z) => !chain[z.id]?.isChainValid || !z.belegVollstaendig);
    const ucs = usecases.filter((u) => inYear(u.deadline, year));
    const ucsDone = ucs.filter((u) => u.status === 'abgeschlossen');
    const yearVergaben = vergaben.filter((v) => inYear(v.zuschlagsDatum, year) || inYear(v.ausschreibungsDatum, year));
    const vergabenOhneFreigabe = yearVergaben.filter((v) => !v.bafaFreigabe && v.status !== 'abgeschlossen');

    const criteria: ChapterCriterion[] = [
      {
        id: 'belege',
        label: 'Belege geprüft',
        detail: belege.length > 0 ? `${belege.length - belegeOffen.length} von ${belege.length} förderfähigen Belegen freigegeben` : 'Keine Belege in dieser Periode',
        met: belege.length > 0 ? belegeOffen.length === 0 : null,
      },
      {
        id: 'zas',
        label: 'ZAs lückenlos und belegt',
        detail: submitted.length > 0 ? `${submitted.length - zaProblems.length} von ${submitted.length} eingereichten ZAs ohne Befund` : 'Keine eingereichten ZAs',
        met: submitted.length > 0 ? zaProblems.length === 0 : null,
      },
      {
        id: 'vergaben',
        label: 'Vergaben mit BAFA-Freigabe',
        detail: yearVergaben.length > 0 ? `${yearVergaben.length - vergabenOhneFreigabe.length} von ${yearVergaben.length} freigegeben oder abgeschlossen` : 'Keine Vergaben in dieser Periode',
        met: yearVergaben.length > 0 ? vergabenOhneFreigabe.length === 0 : null,
      },
      {
        id: 'usecases',
        label: 'Use-Case-Meilensteine erreicht',
        detail: ucs.length > 0 ? `${ucsDone.length} von ${ucs.length} Meilensteinen abgeschlossen` : 'Keine Meilensteine in dieser Periode',
        met: ucs.length > 0 ? ucsDone.length === ucs.length : null,
      },
    ];

    const rated = criteria.filter((c) => c.met !== null);
    const metCount = rated.filter((c) => c.met).length;
    const hasData = rated.length > 0;

    return {
      key: p.key,
      label: p.label,
      short: p.short,
      year,
      status,
      criteria,
      progressPct: hasData ? Math.round((metCount / rated.length) * 100) : 0,
      passed: status === 'abgeschlossen' && hasData && metCount === rated.length,
      hasData,
      stats: {
        belege: belege.length,
        zasEingereicht: submitted.length,
        useCasesTotal: ucs.length,
        useCasesDone: ucsDone.length,
        vergaben: yearVergaben.length,
      },
    };
  });
}

// ── Gemeinsame Team-Ziele ──

export interface TeamGoal {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  targetDate: string;
  progressPct: number;
  reached: boolean;
  /** Soll-Fortschritt linear von Projektstart bis Zieldatum */
  expectedPct: number;
  pace: 'erreicht' | 'auf-kurs' | 'in-verzug';
}

export const PROJECT_START = '2025-04-01';

function expectedProgress(today: string, targetDate: string): number {
  const start = new Date(`${PROJECT_START}T12:00:00`).getTime();
  const end = new Date(`${targetDate}T12:00:00`).getTime();
  const now = new Date(`${today}T12:00:00`).getTime();
  if (end <= start) return 100;
  return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
}

function buildGoal(
  def: Pick<TeamGoal, 'id' | 'title' | 'description' | 'target' | 'targetDate'>,
  current: number,
  today: string
): TeamGoal {
  const progressPct = def.target <= 0 ? 100 : Math.min(100, Math.round((current / def.target) * 100));
  const reached = current >= def.target;
  const expectedPct = expectedProgress(today, def.targetDate);
  return {
    ...def,
    current,
    progressPct,
    reached,
    expectedPct,
    pace: reached ? 'erreicht' : progressPctOnTrack(progressPct, expectedPct) ? 'auf-kurs' : 'in-verzug',
  };
}

// Kleine Toleranz: bis 10 Prozentpunkte hinter dem linearen Soll gilt noch als auf Kurs
const progressPctOnTrack = (actual: number, expected: number) => actual >= expected - 10;

export function computeTeamGoals(params: {
  today: string;
  usecases: UseCase[];
  vergaben: Vergabe[];
  oekoprofitCheckups: OekoprofitCheckup[];
}): TeamGoal[] {
  const { today, usecases, vergaben, oekoprofitCheckups } = params;
  const idx = computeTransformationIndex({ usecases, vergaben, oekoprofitCheckups });
  const piloten = idx.stage2Count + idx.stage3Count;

  return [
    buildGoal(
      { id: 'index-500', title: 'Transformations-Index 500', description: 'Gemeinsamer Regionalindex der Rur-Korridor-Projekte', target: 500, targetDate: '2026-12-31' },
      idx.score,
      today
    ),
    buildGoal(
      { id: 'booster-12', title: '12 Transformations-Booster', description: 'Vergaben und Boosterprojekte im Förderzeitraum', target: idx.boosterMax, targetDate: '2028-12-31' },
      idx.boosterCount,
      today
    ),
    buildGoal(
      { id: 'oeko-12', title: '12 Ökoprofit-Checkups', description: 'Durchgeführte Checkups bei Industriepartnern', target: idx.oekoMax, targetDate: '2028-12-31' },
      idx.oekoCount,
      today
    ),
    buildGoal(
      { id: 'piloten-8', title: '8 Projekte im Pilotbetrieb oder weiter', description: 'Use Cases mit Reifegrad Pilotbetrieb, Produktiv oder Skalierung', target: 8, targetDate: '2027-12-31' },
      piloten,
      today
    ),
  ];
}
