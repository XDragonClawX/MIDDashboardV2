import type {
  Mittelabruf,
  ProfiPositionCode,
  Rechnungsbeleg,
  Vergabe,
} from '../types';
import { formatEuro } from './helpers';
import { PROFI_POSITIONEN, getFoerderfaehigerRechnungsBetrag, mapKategorieToProfiPosition, splitPercent9010, subEuro, sumEuro } from './money';

// ── Pillar 2: Anno-Warenlogik Ressourcen-Fluss (Sankey-Pipeline & Engpass-Detektor) ──
export interface ResourceBottleneck {
  position: ProfiPositionCode;
  label: string;
  obligo: number;
  invoicedIst: number;
  stauBetrag: number;
  message: string;
  targetPage: 'rechnungen' | 'vergaben' | 'personal';
}

export interface ResourcePipelineState {
  stage1AzaPotenzial: number;
  stage2GebundenesObligo: number;
  stage3BelegtesIst: number;
  stage3Bund90: number;
  stage3Eigen10Katalysator: number;
  stage4LiquideBundesmittel: number;
  stage4OffeneForderungen: number;
  positionBreakdown: {
    code: ProfiPositionCode;
    displayCode: string;
    label: string;
    azaPlan: number;
    obligo: number;
    ist: number;
    stau: number;
  }[];
  bottlenecks: ResourceBottleneck[];
  primaryBottleneck: ResourceBottleneck | null;
}

export function computeResourcePipeline(params: {
  posPlan: Record<ProfiPositionCode, number>;
  posIst: Record<ProfiPositionCode, number>;
  vergaben: Vergabe[];
  mittelabrufe: Mittelabruf[];
  rechnungen: Rechnungsbeleg[];
  vorsteuerabzugsberechtigt: boolean;
}): ResourcePipelineState {
  const { posPlan, posIst, vergaben, mittelabrufe, rechnungen, vorsteuerabzugsberechtigt } = params;

  const stage1AzaPotenzial = sumEuro(Object.values(posPlan));
  const stage3BelegtesIst = sumEuro(Object.values(posIst));
  const split3 = splitPercent9010(stage3BelegtesIst);

  // Obligo 0835 from contracted/awarded/active Vergaben (Zuschlag / abgeschlossen)
  const obligo0835Vergaben = sumEuro(
    vergaben
      .filter((v) => v.status === 'Zuschlag' || v.status === 'abgeschlossen')
      .map((v) => v.auftragswert || 0)
  );
  // Recorded invoiced amounts strictly in 0835
  const ist0835Rechnungen = sumEuro(
    rechnungen
      .filter((r) => mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition) === '0835')
      .map((r) => getFoerderfaehigerRechnungsBetrag(r, vorsteuerabzugsberechtigt))
  );

  // Total Obligo combines Personnel + Overhead commitments + Contracted 0835 + Travel/Admin Ist
  const obligo0812 = Math.max(posIst['0812'], posIst['0812']);
  const obligo0817 = Math.max(posIst['0817'], posIst['0817']);
  const obligo0820 = Math.max(posIst['0820'], posIst['0820']);
  const obligo0831 = posIst['0831'];
  const obligo0835 = Math.max(obligo0835Vergaben, ist0835Rechnungen);
  const obligo0843 = posIst['0843'];

  const stage2GebundenesObligo = sumEuro([
    obligo0812,
    obligo0817,
    obligo0820,
    obligo0831,
    obligo0835,
    obligo0843,
  ]);

  const stage4LiquideBundesmittel = sumEuro(mittelabrufe.map((m) => m.eingegangen || 0));
  const beantragtGesamt = sumEuro(mittelabrufe.map((m) => m.beantragt || 0));
  const stage4OffeneForderungen = Math.max(0, subEuro(beantragtGesamt, stage4LiquideBundesmittel));

  const positionBreakdown = PROFI_POSITIONEN.map((p) => {
    const obligo =
      p.code === '0835'
        ? obligo0835
        : p.code === '0812'
        ? obligo0812
        : p.code === '0817'
        ? obligo0817
        : p.code === '0820'
        ? obligo0820
        : p.code === '0831'
        ? obligo0831
        : obligo0843;
    const ist = posIst[p.code] || 0;
    const stau = Math.max(0, subEuro(obligo, ist));
    return {
      code: p.code,
      displayCode: p.displayCode,
      label: p.kurzBezeichnung,
      azaPlan: posPlan[p.code] || 0,
      obligo,
      ist,
      stau,
    };
  });

  const bottlenecks: ResourceBottleneck[] = [];
  if (obligo0835Vergaben > ist0835Rechnungen + 1) {
    const stau0835 = subEuro(obligo0835Vergaben, ist0835Rechnungen);
    bottlenecks.push({
      position: '0835',
      label: 'Vergaben & Booster (Pos. 0835)',
      obligo: obligo0835Vergaben,
      invoicedIst: ist0835Rechnungen,
      stauBetrag: stau0835,
      message: `Produktionsstau in Pipeline 0835: ${formatEuro(stau0835, 2)} offenes Obligo (${formatEuro(obligo0835Vergaben, 2)} Zuschlag vs. ${formatEuro(ist0835Rechnungen, 2)} Rechnung) warten auf Rechnungsabruf!`,
      targetPage: 'rechnungen',
    });
  }

  // Also flag pending un-approved Vergaben waiting in pipeline
  const pendingApproval = vergaben.filter((v) => !v.bafaFreigabe && v.status !== 'abgeschlossen');
  if (pendingApproval.length > 0 && bottlenecks.length === 0) {
    const pendingSum = sumEuro(pendingApproval.map((v) => v.auftragswert || 0));
    bottlenecks.push({
      position: '0835',
      label: 'BAFA-Freigabe-Gate (Pos. 0835)',
      obligo: pendingSum,
      invoicedIst: ist0835Rechnungen,
      stauBetrag: pendingSum,
      message: `${pendingApproval.length} Vergabe(n) über ${formatEuro(pendingSum, 2)} warten im Compliance-Gate auf BAFA-Freigabe.`,
      targetPage: 'vergaben',
    });
  }

  return {
    stage1AzaPotenzial,
    stage2GebundenesObligo,
    stage3BelegtesIst,
    stage3Bund90: split3.bund90,
    stage3Eigen10Katalysator: split3.eigen10,
    stage4LiquideBundesmittel,
    stage4OffeneForderungen,
    positionBreakdown,
    bottlenecks,
    primaryBottleneck: bottlenecks[0] || null,
  };
}
