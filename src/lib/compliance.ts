import type {
  Mittelabruf,
  OekoprofitCheckup,
  Rechnungsbeleg,
  Vergabe,
  Zahlungsanforderung,
} from '../types';
import { addBusinessDaysISO, addWeeksISO } from './helpers';
import { validateZaChain } from './zaChain';

// ── Compliance-Shield Engine (BAFA & GoBD) ──
export interface ComplianceShieldQuest {
  id: string;
  title: string;
  detail: string;
  impactPct: number;
  severity: 'high' | 'medium';
  targetPage: string;
  actionLabel: string;
  subTab?: string;
}

export interface ComplianceShieldState {
  score: number;
  status: 'optimal' | 'warning' | 'critical';
  quests: ComplianceShieldQuest[];
}

export function computeComplianceShield(params: {
  zas: Zahlungsanforderung[];
  vergaben: Vergabe[];
  oekoprofitCheckups: OekoprofitCheckup[];
  rechnungen: Rechnungsbeleg[];
}): ComplianceShieldState {
  const { zas, vergaben, oekoprofitCheckups, rechnungen } = params;
  const quests: ComplianceShieldQuest[] = [];
  let penalty = 0;

  // 1. Submitted ZAs with incomplete receipt mapping
  const incompleteZas = zas.filter(
    (z) => (z.status === 'Eingereicht' || z.status === 'Abgerechnet') && !z.belegVollstaendig
  );
  if (incompleteZas.length > 0) {
    const impact = Math.min(24, incompleteZas.length * 10);
    penalty += impact;
    quests.push({
      id: 'za-incomplete',
      title: `${incompleteZas.length} ZA(s) ohne vollständige Belegzuordnung`,
      detail: `${incompleteZas.map((z) => z.bezeichnung).join(', ')} als vollständig verknüpft prüfen.`,
      impactPct: impact,
      severity: 'high',
      targetPage: 'mittelabrufe',
      subTab: 'za-rechner',
      actionLabel: 'ZAs vervollständigen',
    });
  }

  // 2. Active Vergaben without BAFA approval
  const missingBafa = vergaben.filter((v) => !v.bafaFreigabe && v.status !== 'abgeschlossen');
  if (missingBafa.length > 0) {
    const impact = Math.min(28, missingBafa.length * 7);
    penalty += impact;
    quests.push({
      id: 'vergaben-bafa',
      title: `${missingBafa.length} Vergabe(n) ohne BAFA-Freigabe`,
      detail: `Rechnungen zu unfreigegebenen Vergaben sind durch das Compliance-Gate gesperrt.`,
      impactPct: impact,
      severity: 'high',
      targetPage: 'vergaben',
      actionLabel: 'Freigaben prüfen',
    });
  }

  // 3. ZA chain errors & 2-month positive Kassenbestand deadlines
  const valMap = validateZaChain(zas);
  const validations = Object.values(valMap);
  const chainIssues = validations.filter((v) => !v.isChainValid);
  if (chainIssues.length > 0) {
    const impact = Math.min(20, chainIssues.length * 10);
    penalty += impact;
    quests.push({
      id: 'za-chain',
      title: `ZA-Ketten-Abweichung in ${chainIssues.length} Zahlungsanforderung(en)`,
      detail: `Spalte 2 weicht von Vor-ZA (Spalte 3 + Spalte 5) ab.`,
      impactPct: impact,
      severity: 'high',
      targetPage: 'mittelabrufe',
      subTab: 'za-rechner',
      actionLabel: 'ZA-Kette abgleichen',
    });
  }

  const overdueKassenbestand = validations.filter(
    (v) => v.hasPositiveKassenbestand && v.daysUntilDeadline !== null && v.daysUntilDeadline < 0
  );
  if (overdueKassenbestand.length > 0) {
    const impact = Math.min(24, overdueKassenbestand.length * 14);
    penalty += impact;
    quests.push({
      id: 'kassenbestand-overdue',
      title: `ANBest-P 2-Monats-Frist überschritten (${overdueKassenbestand.length} ZA)`,
      detail: `Positiver Kassenbestand (Zeile 16) birgt Rückforderungs-/Zinsrisiko.`,
      impactPct: impact,
      severity: 'high',
      targetPage: 'mittelabrufe',
      subTab: 'za-rechner',
      actionLabel: 'Mittelabruf abstimmen',
    });
  } else {
    const warningKassenbestand = validations.filter(
      (v) => v.hasPositiveKassenbestand && v.daysUntilDeadline !== null && v.daysUntilDeadline <= 14
    );
    if (warningKassenbestand.length > 0) {
      const impact = 8;
      penalty += impact;
      quests.push({
        id: 'kassenbestand-warning',
        title: `ANBest-P 2-Monats-Frist endet in ≤ 14 Tagen`,
        detail: `Offener Kassenbestand zeitnah verausgaben oder verrechnen.`,
        impactPct: impact,
        severity: 'medium',
        targetPage: 'mittelabrufe',
        subTab: 'za-rechner',
        actionLabel: 'Frist prüfen',
      });
    }
  }

  // 4. Overdue Ökoprofit protocols (+5 WT / +4 weeks)
  const todayISO = new Date().toISOString().slice(0, 10);
  const overdueOeko = oekoprofitCheckups.filter((c) => {
    const d1 = addBusinessDaysISO(c.termin1Datum, 5);
    const d2 = addBusinessDaysISO(c.termin2Datum, 5);
    const d3 = addWeeksISO(c.termin3Datum, 4);
    return (
      (d1 && !c.protokoll1Abgegeben && d1 < todayISO) ||
      (d2 && !c.protokoll2Abgegeben && d2 < todayISO) ||
      (d3 && !c.abschlussReportingAbgegeben && d3 < todayISO)
    );
  });
  if (overdueOeko.length > 0) {
    const impact = Math.min(18, overdueOeko.length * 6);
    penalty += impact;
    quests.push({
      id: 'oeko-overdue',
      title: `${overdueOeko.length} überfällige(s) Ökoprofit-Protokoll(e)`,
      detail: `5-Werktage- bzw. 4-Wochen-Frist nach Beratungstermin überschritten.`,
      impactPct: impact,
      severity: 'medium',
      targetPage: 'vergaben',
      actionLabel: 'Protokolle nachtragen',
    });
  }

  // 5. Draft invoices awaiting submission check
  const draftInvoices = rechnungen.filter((r) => r.foerderfaehig && r.status === 'ENTWURF');
  if (draftInvoices.length >= 5) {
    const impact = 6;
    penalty += impact;
    quests.push({
      id: 'draft-invoices',
      title: `${draftInvoices.length} Sachbelege noch im Status „ENTWURF“`,
      detail: `Belege prüfen und für den nächsten BAFA-Mittelabruf freigeben.`,
      impactPct: impact,
      severity: 'medium',
      targetPage: 'rechnungen',
      actionLabel: 'Belege prüfen',
    });
  }

  const score = Math.max(0, Math.min(100, 100 - penalty));
  const status: ComplianceShieldState['status'] =
    score >= 95 ? 'optimal' : score >= 75 ? 'warning' : 'critical';

  return { score, status, quests };
}
