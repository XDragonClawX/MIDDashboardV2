import type {
  PersonalEintrag,
  Rechnungsbeleg,
} from '../types';
import { addEuro, getFoerderfaehigerRechnungsBetrag, mulPercent, roundEuro } from './money';

// ── Pacing-Minigame: 48-Monats Ideallinie (04/2025 – 03/2029) ──
export interface IdealliniePoint {
  monthKey: string; // YYYY-MM
  label: string;
  cumPlan: number; // AZA-Geist
  corridorLow: number; // -5%
  corridorHigh: number; // +5%
  cumIst: number | null; // null after current/latest data month
  bandRange: [number, number];
}

export function computeIdeallinieSeries(params: {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  foerderByYear: Record<string, { gesamt: number }>;
  vorsteuerabzugsberechtigt: boolean;
}): {
  series: IdealliniePoint[];
  latestDeviationPct: number;
  inCorridor: boolean;
  latestIst: number;
  latestPlan: number;
} {
  const { personal, rechnungen, foerderByYear, vorsteuerabzugsberechtigt } = params;

  // Build 48 months from 2025-04 to 2029-03
  const months: { key: string; label: string; yearKey: string; monthsInYear: number }[] = [];
  const startYear = 2025;
  const startMonth = 4;
  for (let i = 0; i < 48; i++) {
    const totalM = startYear * 12 + (startMonth - 1) + i;
    const y = Math.floor(totalM / 12);
    const m = (totalM % 12) + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const yearKey = y === 2025 ? 'gesamt25' : y === 2029 ? 'mrz29' : String(y);
    const monthsInYear = y === 2025 ? 9 : y === 2029 ? 3 : 12;
    months.push({
      key,
      label: `${String(m).padStart(2, '0')}/${String(y).slice(2)}`,
      yearKey,
      monthsInYear,
    });
  }

  // Monthly actuals map
  const istByMonth: Record<string, number> = {};
  let latestActualMonth = '2026-07';
  personal.forEach((p) => {
    const mk = `${p.jahr}-${String(p.monat).padStart(2, '0')}`;
    istByMonth[mk] = addEuro(istByMonth[mk] || 0, p.foerderfaehig || 0);
    if (mk > latestActualMonth) latestActualMonth = mk;
  });
  rechnungen.forEach((r) => {
    const ff = getFoerderfaehigerRechnungsBetrag(r, vorsteuerabzugsberechtigt);
    if (ff <= 0 || !r.rechnungsdatum) return;
    const mk = r.rechnungsdatum.slice(0, 7);
    istByMonth[mk] = addEuro(istByMonth[mk] || 0, ff);
    if (mk > latestActualMonth) latestActualMonth = mk;
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const cutoffMonth = latestActualMonth > currentMonth ? latestActualMonth : currentMonth;

  let cumPlan = 0;
  let cumIst = 0;
  let latestDeviationPct = 0;
  let latestIst = 0;
  let latestPlan = 0;

  const series: IdealliniePoint[] = months.map((m) => {
    const yrTotal = foerderByYear[m.yearKey]?.gesamt || 0;
    const monthlyPlan = roundEuro(yrTotal / m.monthsInYear);
    cumPlan = addEuro(cumPlan, monthlyPlan);
    const corridorLow = mulPercent(cumPlan, 95);
    const corridorHigh = mulPercent(cumPlan, 105);

    const hasActual = m.key <= cutoffMonth;
    if (hasActual) {
      cumIst = addEuro(cumIst, istByMonth[m.key] || 0);
      latestIst = cumIst;
      latestPlan = cumPlan;
      latestDeviationPct = cumPlan > 0 ? ((cumIst - cumPlan) / cumPlan) * 100 : 0;
    }

    return {
      monthKey: m.key,
      label: m.label,
      cumPlan,
      corridorLow,
      corridorHigh,
      cumIst: hasActual ? cumIst : null,
      bandRange: [corridorLow, corridorHigh],
    };
  });

  return {
    series,
    latestDeviationPct,
    inCorridor: Math.abs(latestDeviationPct) <= 5,
    latestIst,
    latestPlan,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE SIMULATION & OPERATIONAL MASTERY ENGINES (100% REAL BAFA/STARK DATA)
// ══════════════════════════════════════════════════════════════════════════════
