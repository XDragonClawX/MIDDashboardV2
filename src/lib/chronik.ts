import type {
  PersonalEintrag,
  Rechnungsbeleg,
  UseCase,
  Vergabe,
} from '../types';
import { computeIdeallinieSeries } from './ideallinie';

// ── Pillar 7: 48-Monate-Chronik & Replay-Scrubber (04/2025 – 03/2029) ──
export interface ChronikFrame {
  index: number; // 0..47
  monthKey: string; // YYYY-MM
  label: string; // MM/YYYY
  azaPeriod: string;
  cumPlan: number;
  cumIst: number;
  activePilots: number;
  pipelinePilots: number;
  boostersReleased: number;
  milestoneEvents: { id: number; titel: string; datum: string; ort: string }[];
}

export function computeChronikTimeline(params: {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  vergaben: Vergabe[];
  usecases: UseCase[];
  events: { id: number; titel: string; datum: string; ort: string }[];
  foerderByYear: Record<string, { gesamt: number }>;
  vorsteuerabzugsberechtigt: boolean;
}): ChronikFrame[] {
  const { personal, rechnungen, vergaben, usecases, events, foerderByYear, vorsteuerabzugsberechtigt } = params;

  const ideallinie = computeIdeallinieSeries({
    personal,
    rechnungen,
    foerderByYear,
    vorsteuerabzugsberechtigt,
  });

  const azaLabelForMonth = (mk: string): string => {
    if (mk <= '2025-12') return 'AZA 1 · Aufbau 2025';
    if (mk <= '2026-12') return 'AZA 2 · Pilotjahr 2026';
    if (mk <= '2027-12') return 'AZA 3 · Skalierung 2027';
    if (mk <= '2028-12') return 'AZA 4 · Transfer 2028';
    return 'AZA 5 · Abschluss Q1/2029';
  };

  return ideallinie.series.map((pt, idx) => {
    const mk = pt.monthKey;
    const monthEvents = events.filter((ev) => ev.datum && ev.datum.slice(0, 7) === mk);

    // Count boosters awarded up to this month
    const boostersByMonth = vergaben.filter((v) => {
      const refDate = v.zuschlagsDatum || v.ausschreibungsDatum || '2026-01-01';
      return v.auftragswert >= 30000 && refDate.slice(0, 7) <= mk;
    }).length;

    // Simulate gradual network activation across the 48 months anchored in real Batch statuses
    const batch1Count = usecases.filter((u) => u.batch === 'Batch 1').length;
    const batch2Count = usecases.filter((u) => u.batch === 'Batch 2').length;
    const batch3Count = usecases.filter((u) => u.batch === 'Batch 3').length;

    let activePilots = 0;
    let pipelinePilots = 0;
    if (mk >= '2025-06' && mk < '2025-11') {
      activePilots = Math.min(batch1Count, 1);
      pipelinePilots = batch1Count - activePilots + Math.min(2, batch2Count);
    } else if (mk >= '2025-11' && mk < '2026-09') {
      activePilots = batch1Count;
      pipelinePilots = batch2Count + batch3Count;
    } else if (mk >= '2026-09' && mk < '2027-06') {
      activePilots = batch1Count + Math.min(3, batch2Count);
      pipelinePilots = Math.max(0, batch2Count - 3) + batch3Count;
    } else if (mk >= '2027-06' && mk < '2028-06') {
      activePilots = batch1Count + batch2Count;
      pipelinePilots = batch3Count;
    } else if (mk >= '2028-06') {
      activePilots = usecases.length;
      pipelinePilots = 0;
    } else {
      pipelinePilots = batch1Count;
    }

    const lastRealIst =
      pt.cumIst !== null
        ? pt.cumIst
        : ideallinie.latestIst;

    return {
      index: idx,
      monthKey: mk,
      label: `${mk.slice(5, 7)}/${mk.slice(0, 4)}`,
      azaPeriod: azaLabelForMonth(mk),
      cumPlan: pt.cumPlan,
      cumIst: lastRealIst,
      activePilots,
      pipelinePilots,
      boostersReleased: boostersByMonth,
      milestoneEvents: monthEvents,
    };
  });
}
