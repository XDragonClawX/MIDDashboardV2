import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  PersonalEintrag,
  Rechnungsbeleg,
  Mittelabruf,
  Vergabe,
  Zahlungsanforderung,
  MitarbeiterStamm,
  SystemSettings,
  ProfiPositionCode,
} from '../../types';
import {
  AZA_JAHRE,
  AZA_VERSION_META,
  DEFAULT_SETTINGS,
  getAzaPlan,
  splitAzaPersonalPlan0812_0817_0820,
} from '../../data';
import {
  formatEuro,
  downloadCSV,
  mapKategorieToProfiPosition,
  PROFI_STARK_FKZ,
  PROFI_POSITIONEN,
  splitPersonalToProfi,
  getFoerderfaehigerRechnungsBetrag,
  anonymizeEmployeeName,
  validateZaChain,
  addEuro,
  sumEuro,
  splitPercent9010,
} from '../../utils';
import {
  FileText,
  Download,
  Printer,
  Copy,
  TrendingUp,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  Info,
  Calculator,
  FileSpreadsheet,
} from 'lucide-react';

interface ReportingPageProps {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  mittelabrufe: Mittelabruf[];
  zas?: Zahlungsanforderung[];
  vergaben: Vergabe[];
  mitarbeiterStamm?: MitarbeiterStamm[];
  settings?: SystemSettings;
  activeYear: string | null;
  activeYearLabel: string;
}

interface ForecastSimItem {
  id: string;
  titel: string;
  betrag: number;
  quartal: number;
  kategorie: 'Personal' | 'Vergabe' | 'Sachkosten';
}

export default function ReportingPage({
  personal,
  rechnungen,
  zas = [],
  vergaben,
  mitarbeiterStamm = [],
  settings = DEFAULT_SETTINGS,
  activeYear,
  activeYearLabel,
}: ReportingPageProps) {
  const [repQ, setRepQ] = useState<1 | 2 | 3 | 4>(1);
  const [repYear, setRepYear] = useState<number>(2026);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [synthWarning, setSynthWarning] = useState<string | null>(null);

  const [simulatedItems, setSimulatedItems] = useState<ForecastSimItem[]>([
    { id: '1', titel: 'Zweitrunden-Workshop CO2-Footprint (AP3)', betrag: 4500, quartal: 3, kategorie: 'Sachkosten' },
    { id: '2', titel: 'Zusatzlizenz ERP / Sharepoint Tools (AP4)', betrag: 1200, quartal: 4, kategorie: 'Sachkosten' },
    { id: '3', titel: 'Pauschalkraft Support (AP1)', betrag: 3000, quartal: 2, kategorie: 'Personal' },
  ]);
  const [newSimTitle, setNewSimTitle] = useState('');
  const [newSimBetrag, setNewSimBetrag] = useState('');
  const [newSimQ, setNewSimQ] = useState<1 | 2 | 3 | 4>(3);
  const [newSimKat, setNewSimKat] = useState<'Personal' | 'Vergabe' | 'Sachkosten'>('Sachkosten');

  const activePlan = useMemo(() => getAzaPlan(settings.azaVersion), [settings.azaVersion]);
  const azaMeta = AZA_VERSION_META[settings.azaVersion];

  const mapYearToKey = (year: number): string => {
    if (year === 2025) return 'gesamt25';
    if (year === 2029) return 'mrz29';
    return String(year);
  };

  // 4-Sheet BAFA-Verwendungsnachweis Excel Export (.xlsx)
  const handleDownloadBafaWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const yearKeys = activeYear ? [activeYear] : AZA_JAHRE.map((y) => y.key);

    const scopeMatch = (y: number) => {
      if (!activeYear) return true;
      if (activeYear === 'gesamt25') return y === 2025;
      if (activeYear === 'mrz29') return y === 2029;
      return String(y) === activeYear;
    };

    const scopedPersonal = personal.filter((p) => scopeMatch(p.foerderjahr));
    const scopedRechnungen = rechnungen.filter((r) => scopeMatch(r.foerderjahr));

    // Planwerte 0812–0843
    const persPlan = splitAzaPersonalPlan0812_0817_0820(activePlan, yearKeys);
    const sumRow = (row: Record<string, any>) => sumEuro(yearKeys.map((yk) => Number(row?.[yk] || 0)));
    let a0835 = 0;
    let a0843 = 0;
    activePlan.auftraege.forEach((a) => {
      const v = sumRow(a);
      if (a.kat.includes('0843')) a0843 = addEuro(a0843, v);
      else a0835 = addEuro(a0835, v);
    });
    const planMap: Record<ProfiPositionCode, number> = {
      '0812': persPlan.pos0812,
      '0817': persPlan.pos0817,
      '0820': persPlan.pos0820,
      '0831': sumRow(activePlan.reisen),
      '0835': a0835,
      '0843': sumEuro([sumRow(activePlan.overhead), sumRow(activePlan.miete), sumRow(activePlan.gegenst), a0843]),
    };

    const pIst = splitPersonalToProfi(scopedPersonal, 0.18, mitarbeiterStamm);
    const sIst: Record<ProfiPositionCode, number> = {
      '0812': 0,
      '0817': 0,
      '0820': 0,
      '0831': 0,
      '0835': 0,
      '0843': 0,
    };
    scopedRechnungen.forEach((r) => {
      const ff = getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt);
      if (ff <= 0) return;
      const pos = mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition);
      sIst[pos] = addEuro(sIst[pos], ff);
    });
    const istMap: Record<ProfiPositionCode, number> = {
      '0812': pIst.pos0812,
      '0817': pIst.pos0817,
      '0820': pIst.pos0820,
      '0831': sIst['0831'],
      '0835': sIst['0835'],
      '0843': addEuro(pIst.pos0843Overhead, sIst['0843']),
    };

    // Sheet 1: Deckblatt & Quoten
    const sheet1Rows: any[][] = [
      ['BAFA STARK Verwendungsnachweis – Deckblatt & Quoten'],
      ['Projekt', 'Zukunftsstoff – Made in Düren (MiD-PTC)'],
      ['Förderkennzeichen', PROFI_STARK_FKZ],
      ['Zuwendungsempfänger', 'WIN.DN Wirtschaftsförderung Düren GmbH'],
      ['AZA-Planstand', azaMeta.label],
      ['§ 15 UStG Modus', settings.vorsteuerabzugsberechtigt ? 'Vorsteuerabzugsberechtigt (Netto)' : 'Nicht abzugsberechtigt (Brutto)'],
      ['Export-Scope', activeYearLabel],
      [],
      ['profi-Pos.', 'Bezeichnung', 'AZA-Plan (100 %)', 'Ist erfasst (100 %)', '90 % Bundesanteil Ist', '10 % Eigenanteil Ist'],
      ...PROFI_POSITIONEN.map((p) => {
        const i = istMap[p.code];
        const sp = splitPercent9010(i);
        return [p.displayCode, p.bezeichnung, planMap[p.code], i, sp.bund90, sp.eigen10];
      }),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Deckblatt & Quoten');

    // Sheet 2: Personalbelege 0812-0820 (respects privacyMode)
    const sheet2Rows: any[][] = [
      ['Jahr', 'Monat', 'Mitarbeiter/Stelle', 'profi-Pos.', 'AG-Kosten (€)', '0843 (10 %)', 'Förderfähig (€)', '90 % Bund (€)', '10 % Eigenanteil (€)', 'Status', 'Bemerkung'],
      ...scopedPersonal.map((p, idx) => [
        p.jahr,
        p.monat,
        anonymizeEmployeeName(p.mitarbeiter, idx + 1, settings.privacyMode),
        p.profiPosition || '0812/0817/0820',
        settings.privacyMode ? '***' : p.agKosten,
        settings.privacyMode ? '***' : p.sachkosten,
        settings.privacyMode ? '***' : p.foerderfaehig,
        settings.privacyMode ? '***' : p.bafaAnteil,
        settings.privacyMode ? '***' : p.eigenaufwand,
        p.status,
        p.bemerkung || '',
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Personalbelege 0812-0820');

    // Sheet 3: Sachbelege 0831-0843
    const sheet3Rows: any[][] = [
      ['Belegnr', 'Rechnungsdatum', 'Zahlungsdatum', 'Kreditor', 'profi-Pos.', 'Kategorie', 'Netto (€)', 'Brutto (€)', 'MwSt', 'Förderfähig §15 UStG (€)', 'Status', 'PDF SHA-256'],
      ...scopedRechnungen.map((r) => [
        r.rechnungsnummer,
        r.rechnungsdatum,
        r.zahlungsdatum || '',
        r.rechnungssteller,
        mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition),
        r.kostenkategorie,
        r.betragNetto,
        r.betragBrutto,
        r.mwstSatz ?? '',
        getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt),
        r.status,
        r.pdfHash || '',
      ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Sachbelege 0831-0843');

    // Sheet 4: ZA-Abstimmung Sp.2-5 & Z.14-19
    const zaValMap = validateZaChain(zas);
    const sortedZas = [...zas].sort((a, b) => a.datum.localeCompare(b.datum) || a.id - b.id);
    const sheet4Rows: any[][] = [
      [
        'Bezeichnung',
        'Kennung',
        'ZA-Datum',
        'Sp.2 Bisher geplant',
        'Sp.3 Ist kum.',
        'Sp.5 Vorschau',
        'Z.14 Anzurechnen',
        'Z.15 Bund Ist 90%',
        'Z.16 Kassenbestand',
        'Z.17 Zusatz',
        'Z.18 Bund Vorschau 90%',
        'Z.19 Angefordert',
        'Ketten-Check',
      ],
      ...sortedZas.map((z) => {
        const v = zaValMap[z.id];
        return [
          z.bezeichnung,
          z.kennung || '',
          z.datum,
          v?.actualSpalte2 ?? z.spalte2BisherGeplant ?? 0,
          v?.sumIst ?? 0,
          v?.sumVorschau ?? 0,
          v?.zeile14Expected ?? z.zeile14BisherAnzurechnen ?? 0,
          v?.zeile15Ist90 ?? 0,
          v?.zeile16Kassenbestand ?? z.kassenbestand,
          v?.zeile17Zusatz ?? z.zeile17ZusatzVerrechnung ?? 0,
          v?.zeile18Vorschau90 ?? 0,
          z.zeile19Anforderung,
          v?.isChainValid ? 'OK' : `ABWEICHUNG (${v?.deltaSpalte2})`,
        ];
      }),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(sheet4Rows);
    XLSX.utils.book_append_sheet(wb, ws4, 'ZA-Abstimmung Sp2-5 Z14-19');

    XLSX.writeFile(wb, `BAFA_Verwendungsnachweis_${PROFI_STARK_FKZ}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadLohnCSV = () => {
    const filtered = personal.filter((p) => {
      if (!activeYear) return true;
      if (activeYear === 'gesamt25') return p.jahr === 2025;
      if (activeYear === 'mrz29') return p.jahr === 2029;
      return String(p.jahr) === String(activeYear);
    });

    const headers = [
      'Jahr',
      'Monat',
      'Mitarbeiter',
      'profi-online Position',
      'Arbeitgeber Kosten (€)',
      'Geschäftsbedarf 10% → 0843 (€)',
      'Förderfähig (€)',
      'Bundesanteil BAFA 90% (€)',
      'Eigenanteil WIN.DN 10% (€)',
      'Bemerkung',
    ];

    const rows = [
      headers,
      ...filtered.map((p, idx) => [
        p.jahr,
        p.monat,
        anonymizeEmployeeName(p.mitarbeiter, idx + 1, settings.privacyMode),
        p.profiPosition || '0812/0817/0820',
        settings.privacyMode ? '***' : p.agKosten,
        settings.privacyMode ? '***' : p.sachkosten,
        settings.privacyMode ? '***' : p.foerderfaehig,
        settings.privacyMode ? '***' : p.bafaAnteil,
        settings.privacyMode ? '***' : p.eigenaufwand,
        p.bemerkung || '',
      ]),
    ];

    downloadCSV(`MiD-PTC_Personalbelege_${activeYearLabel || 'Gesamt'}.csv`, rows);
  };

  const downloadExpenseCSV = () => {
    const filtered = rechnungen.filter((r) => {
      if (!activeYear) return true;
      const { von, bis } = (() => {
        if (activeYear === 'gesamt25') return { von: '2025-04-01', bis: '2025-12-31' };
        if (activeYear === 'mrz29') return { von: '2029-01-01', bis: '2029-03-31' };
        return { von: `${activeYear}-01-01`, bis: `${activeYear}-12-31` };
      })();
      return r.rechnungsdatum >= von && r.rechnungsdatum <= bis;
    });

    const headers = [
      'Rechnungsnr',
      'Rechnungsdatum',
      'Kreditor',
      'Leistungsbeschreibung',
      'Nettobetrag (€)',
      'Betrag Brutto (€)',
      'Förderfähig §15 UStG (€)',
      'Kategorie',
      'profi-online Position',
      'Förderfähig',
      'Förderjahr',
      'Arbeitspaket',
    ];

    const rows = [
      headers,
      ...filtered.map((r) => [
        r.rechnungsnummer,
        r.rechnungsdatum,
        r.rechnungssteller,
        r.leistungsbeschreibung,
        r.betragNetto,
        r.betragBrutto,
        getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt),
        r.kostenkategorie,
        mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition),
        r.foerderfaehig ? 'JA' : 'NEIN',
        r.foerderjahr,
        r.arbeitspaket || '',
      ]),
    ];

    downloadCSV(`MiD-PTC_Kostenrechnungen_${activeYearLabel || 'Gesamt'}.csv`, rows);
  };

  const handleGenerateReportText = () => {
    const qMStart = (repQ - 1) * 3 + 1;
    const qMEnd = qMStart + 2;

    const quarterSalaries = personal.filter(
      (p) => p.jahr === repYear && p.monat >= qMStart && p.monat <= qMEnd
    );

    const quarterInvoices = rechnungen.filter((r) => {
      const dMonth = new Date(r.rechnungsdatum).getMonth() + 1;
      const dYear = new Date(r.rechnungsdatum).getFullYear();
      return dYear === repYear && dMonth >= qMStart && dMonth <= qMEnd && r.foerderfaehig;
    });

    const personalSplit = splitPersonalToProfi(quarterSalaries, 0.18, mitarbeiterStamm);
    const inv0831 = sumEuro(
      quarterInvoices
        .filter((r) => mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition) === '0831')
        .map((r) => getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt))
    );
    const inv0835 = sumEuro(
      quarterInvoices
        .filter((r) => mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition) === '0835')
        .map((r) => getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt))
    );
    const inv0843 = sumEuro(
      quarterInvoices
        .filter((r) => mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition) === '0843')
        .map((r) => getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt))
    );
    const pos0843Total = addEuro(inv0843, personalSplit.pos0843Overhead);
    const totalClaim = sumEuro([
      personalSplit.pos0812,
      personalSplit.pos0817,
      personalSplit.pos0820,
      inv0831,
      inv0835,
      pos0843Total,
    ]);
    const split9010 = splitPercent9010(totalClaim);

    const uniqueNames = Array.from(new Set(quarterSalaries.map((p) => p.mitarbeiter)));

    const outText = `=============================================================================
OFFIZIELLER ZWISCHENNACHWEIS · profi-online / BAFA STARK-PROGRAMM
=============================================================================
ZUKUNFTSSTOFF – MADE IN DÜREN (MiD-PTC · Papier, Textil, Chemie)
Trägerbetrieb: WIN.DN GmbH | Düren | Förderkennzeichen: ${PROFI_STARK_FKZ}
AZA-Planstand: ${azaMeta.label}
§ 15 UStG Basis: ${settings.vorsteuerabzugsberechtigt ? 'Vorsteuerabzugsberechtigt (Netto)' : 'Nicht vorsteuerabzugsberechtigt (Brutto)'}
-----------------------------------------------------------------------------
Abrechnungs-Periode: Q${repQ} / ${repYear} (${String(qMStart).padStart(2, '0')}/${repYear} - ${String(qMEnd).padStart(2, '0')}/${repYear})
Kompiliert am:      ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')} Uhr
-----------------------------------------------------------------------------

1. AUSGABENBASIS NACH profi-online POSITIONEN (0812–0843)
-----------------------------------------------------------------------------
[0812] Personalausgaben Angestellte:       ${formatEuro(personalSplit.pos0812, 2)}
[0817] Personalausgaben Aushilfen / SHK:   ${formatEuro(personalSplit.pos0817, 2)}
[0820] Sozialabgaben & Zusatzversorgung:   ${formatEuro(personalSplit.pos0820, 2)}
[0831] Dienstreisen / Reisekosten:         ${formatEuro(inv0831, 2)}
[0835] Vergabe von Aufträgen / Fremdl.:    ${formatEuro(inv0835, 2)}
[0843] Sächl. Verwaltungsausgaben:         ${formatEuro(pos0843Total, 2)}
       (Belege 0843: ${formatEuro(inv0843, 2)} + 10%-Pauschale: ${formatEuro(personalSplit.pos0843Overhead, 2)})
=============================================================================
FÖRDERFÄHIGE GESAMTAUSGABEN Q${repQ}/${repYear}:     ${formatEuro(totalClaim, 2)}
Bundesanteil (90,00 % BAFA):                       ${formatEuro(split9010.bund90, 2)}
Eigenanteil  (10,00 % WIN.DN GmbH):                ${formatEuro(split9010.eigen10, 2)}

2. EINZELNACHWEISE SACHKOSTEN (profi-online & AP-KONFORME BELEGLISTE)
-----------------------------------------------------------------------------
Anzahl Einzelsachbelege: ${quarterInvoices.length} Positionen
${
  quarterInvoices
    .map(
      (r, i) =>
        `Beleg ${i + 1}: [${mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition)}] Nr. ${r.rechnungsnummer} | Kreditor: ${r.rechnungssteller} | Kategorie: ${r.kostenkategorie} | Förderfähig: ${formatEuro(
          getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt),
          2
        )} | Zweck: ${r.leistungsbeschreibung}`
    )
    .join('\n') || ' Keine registrierten Sachbelege in diesem Abrechnungsquartal.'
}

3. PERSONAL- & ENTLOHNUNGSREGISTER (0812 / 0817 / 0820)
-----------------------------------------------------------------------------
Aktive Stellen in diesem Quartal: ${uniqueNames.length}
${
  uniqueNames
    .map((name, idx) => {
      const empSum = sumEuro(quarterSalaries.filter((p) => p.mitarbeiter === name).map((p) => p.agKosten));
      return `- ${anonymizeEmployeeName(name, idx + 1, settings.privacyMode)}: AG-Kosten in Q${repQ}: ${
        settings.privacyMode ? '•••• € (Datenschutz)' : formatEuro(empSum, 2)
      }`;
    })
    .join('\n') || ' Keine aktiven Personalbelege in diesem Abrechnungsquartal.'
}

4. COMPLIANCE & BEGLEITHINWEISE (FKZ ${PROFI_STARK_FKZ})
-----------------------------------------------------------------------------
- Technologietransfer der WIN.DN GmbH im Strukturwandelprojekt „Zukunftsstoff – Made in Düren“ (MiD-PTC).
- Besserstellungsverbot und TVöD/TV-VKA-Tarifbindung werden eingehalten.
- Förderaufteilung nach Ausgabenbasis: 90,00 % Bundesanteil (BAFA), 10,00 % Eigenanteil (WIN.DN GmbH).
- ${vergaben.filter((v) => v.status === 'abgeschlossen').length} Vergabeverfahren abgeschlossen und dokumentiert.`;

    setReportResult(outText);
    setIsCopied(false);
    setSynthWarning(null);
  };

  const handleCopyClipboard = () => {
    if (!reportResult) return;
    navigator.clipboard.writeText(reportResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleAppendTextModules = () => {
    if (!reportResult) {
      setSynthWarning('Bitte berechnen Sie zuerst den Quartalsbericht über „Synthese berechnen“.');
      return;
    }
    setSynthWarning(null);

    const textModules = `

=============================================================================
SACHBERICHTS-TEXTBAUSTEINE (STARK · FKZ ${PROFI_STARK_FKZ})
=============================================================================
Zeitraum: Q${repQ} / ${repYear}

1. INDUSTRIE- & STARTUP-MATCHMAKING (USE-CASES):
   Im Berichtszeitraum wurden die Pilotvorhaben im Cluster Papier, Textil und Chemie der Wirtschaftsregion Düren weiter vorangetrieben. Gemeinsam mit den regionalen KMU-Partnern wurden konkrete Anwendungsfälle zur Ressourceneffizienz und Dekarbonisierung validiert sowie nächste Pilot-Batches vorbereitet.

2. ÖKOPROFIT-CHECKUP & TRANSFORMATIONSBOOSTER:
   Die Begleitung innovativer Lösungsanbieter erfolgt strukturiert entlang der drei vorgesehenen Beratungs- und Skalierungsmeilensteine inkl. indikatorenbasiertem Ressourcen- und Wirkungs-Check sowie Ergebnisprotokollierung binnen 5 Werktagen.

3. PERSONAL- & VERGABEABWICKLUNG:
   Abweichungen gegenüber der ursprünglichen Meilensteinplanung (z. B. Besetzungsfristen, tarifgerechte Stufenanpassungen ohne Erhöhung des Gesamtbudgets) sind nachvollziehbar dokumentiert und bleiben im genehmigten Kostenrahmen des Zuwendungsbescheids.`;

    setReportResult(reportResult + textModules);
  };

  const handleAddSimulated = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimTitle.trim() || !newSimBetrag) return;
    const betrag = parseFloat(newSimBetrag);
    if (isNaN(betrag)) return;
    setSimulatedItems((prev) => [
      ...prev,
      { id: Date.now().toString(), titel: newSimTitle, betrag, quartal: newSimQ, kategorie: newSimKat },
    ]);
    setNewSimTitle('');
    setNewSimBetrag('');
  };

  const yearKey = mapYearToKey(repYear);
  const totalSollYear = useMemo(() => {
    return Number((activePlan.foerder as Record<string, { gesamt: number }>)[yearKey]?.gesamt || 0);
  }, [activePlan, yearKey]);
  const sollQuarterlyLimit = totalSollYear > 0 ? totalSollYear / 4 : 1;

  const getQuarterlyMetrics = (qNum: number) => {
    const subPersonalConfirmed = personal.filter(
      (p) =>
        p.foerderjahr === repYear &&
        p.quartal === qNum &&
        (p.status === 'ARCHIVIERT' || p.status === 'EINGEREICHT')
    );
    const actualSalaries = sumEuro(subPersonalConfirmed.map((p) => p.agKosten));
    const actualOverhead = sumEuro(subPersonalConfirmed.map((p) => p.sachkosten));

    const subRechnungenConfirmed = rechnungen.filter(
      (r) =>
        r.foerderjahr === repYear &&
        r.quartal === qNum &&
        (r.status === 'ARCHIVIERT' || r.status === 'EINGEREICHT')
    );
    const actualInvoices = sumEuro(
      subRechnungenConfirmed.map((r) =>
        getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt)
      )
    );
    const actualTotal = sumEuro([actualSalaries, actualInvoices, actualOverhead]);

    const subPersonalDraft = personal.filter(
      (p) =>
        p.foerderjahr === repYear &&
        p.quartal === qNum &&
        (p.status === 'ENTWURF' || p.status === 'IN_PRUEFUNG')
    );
    const draftSalaries = sumEuro(subPersonalDraft.map((p) => p.agKosten));
    const draftOverhead = sumEuro(subPersonalDraft.map((p) => p.sachkosten));

    const subRechnungenDraft = rechnungen.filter(
      (r) =>
        r.foerderjahr === repYear &&
        r.quartal === qNum &&
        (r.status === 'ENTWURF' || r.status === 'IN_PRUEFUNG')
    );
    const draftInvoices = sumEuro(
      subRechnungenDraft.map((r) =>
        getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt)
      )
    );
    const draftTotal = sumEuro([draftSalaries, draftInvoices, draftOverhead]);

    const simTotal = sumEuro(simulatedItems.filter((item) => item.quartal === qNum).map((item) => item.betrag));

    return {
      actual: actualTotal,
      draft: draftTotal,
      simulated: simTotal,
      totalExpected: sumEuro([actualTotal, draftTotal, simTotal]),
      overPercent: Math.min(100, Math.round(((actualTotal + draftTotal + simTotal) / sollQuarterlyLimit) * 100)),
    };
  };

  const q1Metrics = getQuarterlyMetrics(1);
  const q2Metrics = getQuarterlyMetrics(2);
  const q3Metrics = getQuarterlyMetrics(3);
  const q4Metrics = getQuarterlyMetrics(4);

  const totalIstYear = sumEuro([q1Metrics.actual, q2Metrics.actual, q3Metrics.actual, q4Metrics.actual]);
  const totalDraftYear = sumEuro([q1Metrics.draft, q2Metrics.draft, q3Metrics.draft, q4Metrics.draft]);
  const totalSimYear = sumEuro([q1Metrics.simulated, q2Metrics.simulated, q3Metrics.simulated, q4Metrics.simulated]);
  const grandExpectedYear = sumEuro([totalIstYear, totalDraftYear, totalSimYear]);
  const yearPuffer = totalSollYear - grandExpectedYear;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-slate-900 text-white rounded-lg">
              <FileText className="w-5 h-5 text-zs-signal-gelb" />
            </span>
            Berichte &amp; <span className="text-zs-textil-gruen">Abrechnung</span>
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-1">
            4-Tabellen BAFA-Verwendungsnachweis (.xlsx), CSV-Belegregister &amp; Quartalssynthese ({azaMeta.shortLabel}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleDownloadBafaWorkbook}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-zs-blau-schwarz text-white hover:bg-[#08243d] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-zs-signal-gelb" />
            <span>BAFA-Verwendungsnachweis (.xlsx, 4 Blätter)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Druck-Layout (Strg+P)</span>
          </button>
        </div>
      </div>

      {/* CSV Export & Actions Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/85 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 bg-zs-textil-gruen rounded" />
            <h3 className="font-display font-black text-sm text-slate-900">Personalbelege exportieren</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-4 font-sans">
            Generiert ein Excel/CSV-Register der Personalbelege (0812/0817/0820) für <strong>{activeYearLabel}</strong>.
          </p>
          <button
            onClick={downloadLohnCSV}
            className="w-full py-2.5 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-900 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-zs-textil-gruen" />
            Lohnregister.csv herunterladen
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/85 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 bg-zs-papier-braun rounded" />
            <h3 className="font-display font-black text-sm text-slate-900">Sachbelege &amp; Rechnungen exportieren</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-4 font-sans">
            Belegliste inkl. § 15 UStG Förderbetrag, Rechnungsnummern und profi-Positionen (0831–0843).
          </p>
          <button
            onClick={downloadExpenseCSV}
            className="w-full py-2.5 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-900 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-zs-papier-braun" />
            Rechnungsregister.csv herunterladen
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-100 rounded text-slate-700">
                  <Calculator className="w-4 h-4" />
                </span>
                <h2 className="font-display font-black text-base text-slate-900">Quartalsbericht-Synthesizer</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                BAFA-STARK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Abrechnungsjahr
                </label>
                <select
                  value={repYear}
                  onChange={(e) => setRepYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold outline-none focus:border-slate-800 cursor-pointer"
                >
                  <option value="2025">2025 (Förderbeginn)</option>
                  <option value="2026">2026 (Volllast)</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029 (Abschluss)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Abrechnungsquartal
                </label>
                <select
                  value={repQ}
                  onChange={(e) => setRepQ(Number(e.target.value) as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold outline-none focus:border-slate-800 cursor-pointer"
                >
                  <option value="1">Q1 (Jan – Mär)</option>
                  <option value="2">Q2 (Apr – Jun)</option>
                  <option value="3">Q3 (Jul – Sep)</option>
                  <option value="4">Q4 (Okt – Dez)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGenerateReportText}
                className="flex-1 py-3 text-xs font-bold rounded-lg bg-slate-900 border border-slate-900 text-white cursor-pointer hover:bg-slate-800 transition-all font-mono uppercase tracking-wider text-center"
              >
                Synthese berechnen
              </button>

              <button
                onClick={handleAppendTextModules}
                disabled={!reportResult}
                className={`px-4 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer font-mono ${
                  !reportResult
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <FileText className="w-4 h-4" />+ Sachbericht-Bausteine
              </button>
            </div>
            {synthWarning && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between gap-2">
                <span>{synthWarning}</span>
                <button
                  onClick={() => setSynthWarning(null)}
                  className="text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col p-5 space-y-3">
            <div className="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
              <span className="flex items-center gap-2 text-[10px] font-mono font-bold text-zs-signal-gelb tracking-wider uppercase">
                Vorschau-Terminal: Verwendungsnachweis (FKZ {PROFI_STARK_FKZ})
              </span>

              {reportResult && (
                <button
                  onClick={handleCopyClipboard}
                  className={`px-3 py-1 text-[10px] font-mono rounded h-7 transition-all flex items-center gap-1 cursor-pointer font-bold ${
                    isCopied
                      ? 'bg-emerald-600/25 text-emerald-400 border border-emerald-500/35'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Kopieren
                    </>
                  )}
                </button>
              )}
            </div>

            <textarea
              readOnly
              rows={16}
              value={
                reportResult ||
                '=== ERP BERICHTS-SYSTEMATIK ===\n\nWählen Sie oben Förderjahr und Quartal und klicken Sie auf "Synthese berechnen".'
              }
              className="w-full bg-transparent border-none outline-none resize-none font-mono text-[10px] text-slate-300 whitespace-pre scrollbar-thin overflow-y-auto leading-relaxed focus:ring-0"
            />

            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400 border-t border-slate-800 pt-2">
              <Info className="w-3 h-3 text-zs-signal-gelb" />
              <span>Standardkonforme Formatierung für das S-BAFA Portal.</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quarterly Forecast Board */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-100 rounded text-slate-700">
                  <TrendingUp className="w-4 h-4 text-zs-textil-gruen" />
                </span>
                <h2 className="font-display font-black text-base text-slate-900">Quartals-Forecast &amp; Budget</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono font-bold">Jahr: {repYear}</span>
            </div>

            <div className="space-y-4 pt-1">
              {[
                { number: 1, label: 'Q1 / Jan–Mär', val: q1Metrics },
                { number: 2, label: 'Q2 / Apr–Jun', val: q2Metrics },
                { number: 3, label: 'Q3 / Jul–Sep', val: q3Metrics },
                { number: 4, label: 'Q4 / Okt–Dez', val: q4Metrics },
              ].map((quart) => {
                const limitVal = sollQuarterlyLimit;
                const exc = quart.val.totalExpected;
                const barWidth = Math.min(100, Math.round((exc / limitVal) * 100));

                return (
                  <div
                    key={quart.number}
                    className="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 font-sans text-xs">{quart.label}</span>
                      <span className="font-mono text-[11px] font-bold text-slate-900 tabular-nums">
                        {formatEuro(exc)} / <span className="text-slate-400 font-medium">{formatEuro(limitVal)}</span>
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
                      <div
                        style={{ width: `${Math.min(100, (quart.val.actual / limitVal) * 100)}%` }}
                        className="h-full bg-slate-900 absolute left-0 top-0 transition-all"
                      />
                      <div
                        style={{
                          width: `${Math.min(100, (quart.val.draft / limitVal) * 100)}%`,
                          left: `${Math.min(100, (quart.val.actual / limitVal) * 100)}%`,
                        }}
                        className="h-full bg-slate-400/80 absolute top-0 transition-all"
                      />
                      <div
                        style={{
                          width: `${Math.min(100, (quart.val.simulated / limitVal) * 100)}%`,
                          left: `${Math.min(100, ((quart.val.actual + quart.val.draft) / limitVal) * 100)}%`,
                        }}
                        className="h-full bg-emerald-500 absolute top-0 transition-all"
                      />
                    </div>

                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>
                        Auslastung: <strong>{barWidth}%</strong>
                      </span>
                      <span className="flex gap-2">
                        <span>Ist</span>
                        <span>Entwurf</span>
                        <span>Sim</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 font-mono text-xs">
              <span className="text-[9px] uppercase text-zs-signal-gelb tracking-wider font-bold block border-b border-white/10 pb-1.5">
                Prognose Abschluss &amp; Puffer ({repYear})
              </span>

              <div className="grid grid-cols-2 gap-y-2 text-[11px] tabular-nums">
                <div className="text-white/60">Soll Jahresetat (AZA):</div>
                <div className="text-right text-white font-bold">{formatEuro(totalSollYear, 2)}</div>

                <div className="text-white/60">Ist-Buchungen:</div>
                <div className="text-right text-emerald-400 font-bold">+{formatEuro(totalIstYear, 2)}</div>

                <div className="text-white/60">Offene Entwürfe:</div>
                <div className="text-right text-slate-300">+{formatEuro(totalDraftYear, 2)}</div>

                <div className="text-white/60">Simulationen:</div>
                <div className="text-right text-blue-300">+{formatEuro(totalSimYear, 2)}</div>

                <div className="col-span-2 border-t border-white/15 my-1" />

                <div className="text-zs-signal-gelb font-bold uppercase text-[10px]">Forecaster-Summe:</div>
                <div className="text-right text-white font-bold">{formatEuro(grandExpectedYear, 2)}</div>

                <div className="font-bold text-[10px] uppercase">Restbudget / Puffer:</div>
                <div className={`text-right font-bold ${yearPuffer < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatEuro(yearPuffer, 2)}
                </div>
              </div>

              {yearPuffer < 0 && (
                <div className="p-2 border border-red-500/30 bg-red-950/40 rounded text-[10px] text-red-300 flex items-start gap-1 font-sans">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />
                  <span>Kostenlimit überschritten! Prognose übersteigt den jährlichen AZA-Ansatz.</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <h3 className="font-display font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                Ad-Hoc Forecast Simulator
              </h3>
            </div>

            <form onSubmit={handleAddSimulated} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Bezeichnung</span>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Marketing AP2"
                    value={newSimTitle}
                    onChange={(e) => setNewSimTitle(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-slate-800"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Betrag (€)</span>
                  <input
                    type="number"
                    required
                    placeholder="z.B. 4500"
                    value={newSimBetrag}
                    onChange={(e) => setNewSimBetrag(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Ziel-Quartal</span>
                  <select
                    value={newSimQ}
                    onChange={(e) => setNewSimQ(Number(e.target.value) as any)}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded outline-none cursor-pointer focus:border-slate-800"
                  >
                    <option value="1">Quartal 1</option>
                    <option value="2">Quartal 2</option>
                    <option value="3">Quartal 3</option>
                    <option value="4">Quartal 4</option>
                  </select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">ERP-Kategorie</span>
                  <select
                    value={newSimKat}
                    onChange={(e) => setNewSimKat(e.target.value as any)}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded outline-none cursor-pointer focus:border-slate-800"
                  >
                    <option value="Sachkosten">Verwaltung / Fremdl. (0835/0843)</option>
                    <option value="Personal">Personal (0812/0817/0820)</option>
                    <option value="Vergabe">Vergabeaufträge (0835)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 text-center text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold rounded cursor-pointer transition-all"
              >
                + Simulation einpflegen
              </button>
            </form>

            {simulatedItems.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto pr-1">
                {simulatedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="truncate font-bold text-slate-700">{item.titel}</div>
                      <div className="text-[9px] text-slate-400">
                        Q{item.quartal} &bull; {item.kategorie}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 whitespace-nowrap tabular-nums">
                        +{formatEuro(item.betrag)}
                      </span>
                      <button
                        onClick={() => setSimulatedItems((prev) => prev.filter((x) => x.id !== item.id))}
                        className="p-1 hover:bg-slate-200 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
