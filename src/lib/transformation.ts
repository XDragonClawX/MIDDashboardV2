import type {
  OekoprofitCheckup,
  UseCase,
  Vergabe,
} from '../types';

// ── Regionaler Transformations-Index (Dürener Transformations-Karte) ──
// Stage 1: Idea / Vorbereitung (Grey)
// Stage 2: Pilot / Aktiv (Cyan)
// Stage 3: Completed / Abgeschlossen (Mint)
export function getUseCaseMapStage(
  uc: UseCase,
  vergaben: Vergabe[]
): 1 | 2 | 3 {
  const isCompleted =
    uc.status === 'abgeschlossen' ||
    uc.reifegrad === 'Produktiv' ||
    uc.reifegrad === 'Skalierung';
  if (isCompleted) return 3;

  const hasLinkedApprovedVergabe = vergaben.some(
    (v) => v.useCaseId === uc.id && v.bafaFreigabe
  );
  const isPilot =
    uc.status === 'aktiv' ||
    uc.reifegrad === 'Pilotbetrieb' ||
    hasLinkedApprovedVergabe;
  if (isPilot) return 2;

  return 1;
}

export interface TransformationIndexMetrics {
  score: number;
  stage3Count: number;
  stage2Count: number;
  stage1Count: number;
  boosterCount: number;
  boosterMax: number;
  oekoCount: number;
  oekoMax: number;
  daysToProjectEnd: number;
}

export function computeTransformationIndex(params: {
  usecases: UseCase[];
  vergaben: Vergabe[];
  oekoprofitCheckups: OekoprofitCheckup[];
}): TransformationIndexMetrics {
  const { usecases, vergaben, oekoprofitCheckups } = params;
  let stage1Count = 0;
  let stage2Count = 0;
  let stage3Count = 0;

  usecases.forEach((uc) => {
    const st = getUseCaseMapStage(uc, vergaben);
    if (st === 3) stage3Count++;
    else if (st === 2) stage2Count++;
    else stage1Count++;
  });

  const boosterVergaben = vergaben.filter(
    (v) =>
      v.auftragswert >= 30000 ||
      v.titel.toLowerCase().includes('booster') ||
      v.useCaseId != null
  );
  const boosterCount = Math.min(12, boosterVergaben.length);
  const oekoCount = Math.min(12, oekoprofitCheckups.length);

  // Weighted regional transformation index (0–1000)
  const rawScore =
    stage3Count * 55 +
    stage2Count * 22 +
    stage1Count * 8 +
    boosterCount * 24 +
    oekoCount * 15;
  const score = Math.min(1000, rawScore);

  const endMs = new Date('2029-03-31T23:59:59').getTime();
  const daysToProjectEnd = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));

  return {
    score,
    stage3Count,
    stage2Count,
    stage1Count,
    boosterCount,
    boosterMax: 12,
    oekoCount,
    oekoMax: 12,
    daysToProjectEnd,
  };
}
