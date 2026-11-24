import type {
  OekoprofitCheckup,
  Rechnungsbeleg,
  UseCase,
  Vergabe,
  Zahlungsanforderung,
} from '../types';
import { addBusinessDaysISO, addWeeksISO, formatEuro } from './helpers';
import { validateZaChain } from './zaChain';

// ── Pillar 6: Berater-Stab (3 Executive NPC Advisors driven by real state) ──
export interface ExecutiveAdvisor {
  id: 'kaemmerer' | 'justiziarin' | 'architekt';
  name: string;
  role: string;
  focus: string;
  status: 'optimal' | 'attention' | 'alert';
  message: string;
  metricLabel: string;
  actionLabel: string;
  targetPage: string;
  filters: Record<string, any>;
}

export function computeExecutiveAdvisors(params: {
  zas: Zahlungsanforderung[];
  vergaben: Vergabe[];
  oekoprofitCheckups: OekoprofitCheckup[];
  usecases: UseCase[];
  rechnungen: Rechnungsbeleg[];
  unspent0835: number;
}): ExecutiveAdvisor[] {
  const { zas, vergaben, oekoprofitCheckups, usecases, unspent0835 } = params;
  const valMap = validateZaChain(zas);
  const validations = Object.values(valMap);
  const chainIssues = validations.filter((v) => !v.isChainValid);
  const positiveKb = validations.filter((v) => v.hasPositiveKassenbestand);
  const incompleteZas = zas.filter((z) => !z.belegVollstaendig);

  // 1. Finanz- & BAFA-Kämmerer
  let kaemmererStatus: ExecutiveAdvisor['status'] = 'optimal';
  let kaemmererMsg = `Alle ${zas.length} ZAs sind lückenlos verkettet. Positionen 0812–0843 im Plan-Korridor; Restbudget 0835: ${formatEuro(unspent0835, 0)}.`;
  if (chainIssues.length > 0 || positiveKb.length > 0) {
    kaemmererStatus = 'alert';
    kaemmererMsg =
      chainIssues.length > 0
        ? `Achtung: ${chainIssues.length} ZA zeigt eine Spalte-2-Abweichung zur Vor-ZA. Bitte vor dem nächsten Abruf abgleichen.`
        : `ANBest-P Frist läuft: Positiver Kassenbestand (Zeile 16) in ${positiveKb[0].bezeichnung} – Ausgabenzuordnung vor 2-Monats-Frist prüfen.`;
  } else if (incompleteZas.length > 0 || unspent0835 > 40000) {
    kaemmererStatus = 'attention';
    kaemmererMsg =
      incompleteZas.length > 0
        ? `${incompleteZas.length} ZA(s) warten auf vollständigen Belegabgleich. Außerdem liegen in Pos. 0835 noch ${formatEuro(unspent0835, 0)} — Übertrag vor 15.11. prüfen.`
        : `Vor dem Kassenschluss (15.11.) stehen noch ${formatEuro(unspent0835, 0)} in Pos. 0835 offen — Übertragungs-Dekret nach 2027 vorbereiten.`;
  }

  // 2. Vergabe- & Compliance-Justiziarin
  const unapprovedVergaben = vergaben.filter((v) => !v.bafaFreigabe && v.status !== 'abgeschlossen');
  const todayISO = new Date().toISOString().slice(0, 10);
  const urgentOeko = oekoprofitCheckups.find((c) => {
    const d1 = addBusinessDaysISO(c.termin1Datum, 5);
    const d2 = addBusinessDaysISO(c.termin2Datum, 5);
    const d3 = addWeeksISO(c.termin3Datum, 4);
    return (
      (d1 && !c.protokoll1Abgegeben && d1 <= todayISO) ||
      (d2 && !c.protokoll2Abgegeben && d2 <= todayISO) ||
      (d3 && !c.abschlussReportingAbgegeben && d3 <= todayISO)
    );
  });
  let justiziarinStatus: ExecutiveAdvisor['status'] = 'optimal';
  let justiziarinMsg = `Alle ${vergaben.length} Vergaben sind BAFA-konform dokumentiert und ${oekoprofitCheckups.length} Ökoprofit-Checkups liegen innerhalb der Frist.`;
  if (urgentOeko) {
    justiziarinStatus = 'alert';
    justiziarinMsg = `Fristalarm Ökoprofit (${urgentOeko.startupName}): Ergebnisprotokoll/Reporting sofort abhaken, damit die 1.250-€-/2.500-€-Tranche freigeschaltet wird.`;
  } else if (unapprovedVergaben.length > 0) {
    justiziarinStatus = 'attention';
    justiziarinMsg = `${unapprovedVergaben.length} Vergabe(n) ohne BAFA-Freigabe-Siegel (Compliance-Gate sperrt Rechnungsbuchung in Modul 4). Jetzt Fast-Track prüfen.`;
  }

  // 3. Netzwerk- & Transformations-Architekt
  const batch1 = usecases.filter((u) => u.batch === 'Batch 1');
  const batch2 = usecases.filter((u) => u.batch === 'Batch 2');
  const avgProbB1 =
    batch1.length > 0
      ? Math.round(batch1.reduce((s, u) => s + (u.erfolgswahrscheinlichkeit || 75), 0) / batch1.length)
      : 0;
  const readyB2 = batch2.find((u) => u.status === 'in Vorbereitung');
  const architektStatus: ExecutiveAdvisor['status'] = readyB2 ? 'attention' : 'optimal';
  const architektMsg = readyB2
    ? `Batch 1 läuft stabil bei ${avgProbB1} % Ø-Erfolgswahrscheinlichkeit. In Batch 2 warten ${batch2.length} Vorhaben — Kickoff für „${readyB2.unternehmen} × ${readyB2.startupPartner || readyB2.loesung}“ anstoßen.`
    : `${usecases.length} regionale Use-Cases aktiv verknüpft (Ø ${avgProbB1} % Erfolgswahrscheinlichkeit). Innovations-Cluster bereit für Folgeantrag 2029+.`;

  return [
    {
      id: 'kaemmerer',
      name: 'Finanz- & BAFA-Kämmerer',
      role: '0812–0843 · Zeile 19 · 15.11.',
      focus: 'Haushalts- & Abrufsteuerung',
      status: kaemmererStatus,
      message: kaemmererMsg,
      metricLabel: `${zas.length} ZAs · ${formatEuro(unspent0835, 0)} Rest 0835`,
      actionLabel: incompleteZas.length > 0 || chainIssues.length > 0 ? 'ZA-Rechner öffnen' : 'Übertrag prüfen',
      targetPage: incompleteZas.length > 0 || chainIssues.length > 0 ? 'mittelabrufe' : 'budget',
      filters:
        incompleteZas.length > 0 || chainIssues.length > 0
          ? { mittelabrufeSubTab: 'za-rechner' }
          : { budgetTab: 'kategorie' },
    },
    {
      id: 'justiziarin',
      name: 'Vergabe- & Compliance-Justiziarin',
      role: 'ANBest-P · Fristen · Protokolle',
      focus: 'Rechts- & Fristsicherheit',
      status: justiziarinStatus,
      message: justiziarinMsg,
      metricLabel: `${unapprovedVergaben.length} ohne Siegel · ${oekoprofitCheckups.length} Checkups`,
      actionLabel: 'Vergaben & Checkups',
      targetPage: 'vergaben',
      filters: {},
    },
    {
      id: 'architekt',
      name: 'Netzwerk- & Transformations-Architekt',
      role: 'Batches 1–3 · Tech-Tree · Synergien',
      focus: 'Cluster-Wachstum Düren',
      status: architektStatus,
      message: architektMsg,
      metricLabel: `${batch1.length} aktiv · ${batch2.length} Batch 2`,
      actionLabel: 'Tech-Tree & Use-Cases',
      targetPage: 'usecase',
      filters: {},
    },
  ];
}
