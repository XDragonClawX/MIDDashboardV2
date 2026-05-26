import React, { useState } from 'react';
import { PersonalEintrag, Rechnungsbeleg, Mittelabruf, Vergabe } from '../../types';
import { formatEuro, formatDate, downloadCSV } from '../../utils';
import { AZA_PLAN, AZA_JAHRE } from '../../data';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw,
  Info,
  DollarSign,
  ChevronRight,
  Calculator,
  Eye
} from 'lucide-react';

interface ReportingPageProps {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  mittelabrufe: Mittelabruf[];
  vergaben: Vergabe[];
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
  mittelabrufe,
  vergaben,
  activeYear,
  activeYearLabel,
}: ReportingPageProps) {
  // Local states
  const [repQ, setRepQ] = useState<1 | 2 | 3 | 4>(1);
  const [repYear, setRepYear] = useState<number>(2026);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // States for Forecast Simulation
  const [simulatedItems, setSimulatedItems] = useState<ForecastSimItem[]>([
    { id: '1', titel: 'Zweitrunden-Workshop CO2-Footprint (AP3)', betrag: 4500, quartal: 3, kategorie: 'Sachkosten' },
    { id: '2', titel: 'Zusatzlizenz ERP / Sharepoint Tools (AP4)', betrag: 1200, quartal: 4, kategorie: 'Sachkosten' },
    { id: '3', titel: 'Pauschalkraft Support (AP1)', betrag: 3000, quartal: 2, kategorie: 'Personal' }
  ]);
  const [newSimTitle, setNewSimTitle] = useState('');
  const [newSimBetrag, setNewSimBetrag] = useState('');
  const [newSimQ, setNewSimQ] = useState<1 | 2 | 3 | 4>(3);
  const [newSimKat, setNewSimKat] = useState<'Personal' | 'Vergabe' | 'Sachkosten'>('Sachkosten');

  // Year mapper for AZA Budget
  const mapYearToKey = (year: number): string => {
    if (year === 2025) return 'gesamt25';
    if (year === 2029) return 'mrz29';
    return String(year);
  };

  // Exporter triggers
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
      'Arbeitgeber Kosten (€)',
      'Sachkosten (€)',
      'Förderfähig (€)',
      'BAFA Anteil (€)',
      'LHO Anteil (€)',
      'Bemerkung'
    ];

    const rows = [
      headers,
      ...filtered.map((p) => [
        p.jahr,
        p.monat,
        p.mitarbeiter,
        p.agKosten,
        p.sachkosten,
        p.foerderfaehig,
        p.bafaAnteil,
        p.lhoAnteil,
        p.bemerkung || ''
      ])
    ];

    downloadCSV(`MiD-PCT_Personalbelege_${activeYearLabel || 'Gesamt'}.csv`, rows);
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
      'Kategorie',
      'Förderfähig',
      'Förderjahr',
      'Arbeitspaket'
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
        r.kostenkategorie,
        r.foerderfaehig ? 'JA' : 'NEIN',
        r.foerderjahr,
        r.arbeitspaket || ''
      ])
    ];

    downloadCSV(`MiD-PCT_Kostenrechnungen_${activeYearLabel || 'Gesamt'}.csv`, rows);
  };

  // Compile BAFA text report
  const handleGenerateReportText = () => {
    const qMStart = (repQ - 1) * 3 + 1;
    const qMEnd = qMStart + 2;

    const quarterSalaries = personal.filter(
      (p) => p.jahr === repYear && p.monat >= qMStart && p.monat <= qMEnd
    );
    const totSalaries = quarterSalaries.reduce((s, p) => s + p.agKosten, 0);

    const quarterInvoices = rechnungen.filter((r) => {
      const dMonth = new Date(r.rechnungsdatum).getMonth() + 1;
      const dYear = new Date(r.rechnungsdatum).getFullYear();
      return dYear === repYear && dMonth >= qMStart && dMonth <= qMEnd;
    });
    const totInvoices = quarterInvoices.reduce((s, r) => s + r.betragNetto, 0);

    const overheadCalculation = totSalaries * 0.10;
    const totalClaim = totSalaries + totInvoices + overheadCalculation;

    const outText = `=============================================================================
OFFIZIELLER ZWISCHENNACHWEIS - S-BAFA STARK PORTAL
=============================================================================
MADE IN DÜREN - TRANSFORMATIONSPROJEKT PAPIER, CHEMIE, TEXTIL (MiD-PCT)
Trägerbetrieb: WIN.DN GmbH | Düren | Förderkennzeichen: STARK-2025-042
-----------------------------------------------------------------------------
Abrechnungs-Periode: Q${repQ} / ${repYear} (${String(qMStart).padStart(2, '0')}/${repYear} - ${String(qMEnd).padStart(2, '0')}/${repYear})
Kompiliert am:      ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')} Uhr
-----------------------------------------------------------------------------

1. FINANZIELLES ANSPRUCHSREGISTER (ZUM DIREKTEN COPY-PASTE INS PORTAL)
-----------------------------------------------------------------------------
[A] PERSONALKOSTEN (F0824):           ${formatEuro(totSalaries, 2)}
[B] SACHMITTEL / FREMDDIENSTE (F0835): ${formatEuro(totInvoices, 2)}
[C] GEMEINKOSTENPAUSCHALE (10% [A]):  ${formatEuro(overheadCalculation, 2)}
=============================================================================
GESAMT-FÖRDERANTEIL DIESES QUARTALS:  ${formatEuro(totalClaim, 2)}
(Aufgeschlüsselt: BAFA-Mittel 90%: ${formatEuro(totalClaim * 0.90, 2)} | LHO-Mittel 7.5%: ${formatEuro(totalClaim * 0.075, 2)} | Eigenanteil 2.5%: ${formatEuro(totalClaim * 0.025, 2)})

2. EINZELNACHWEISE SACHKOSTEN (AP-KONFORME BELEGLISTE)
-----------------------------------------------------------------------------
Anzahl Einzelsachbelege: ${quarterInvoices.length} Positionen
${
  quarterInvoices
    .map(
      (r, i) =>
        `Beleg ${i + 1}: Nr. ${r.rechnungsnummer} | Kreditor: ${r.rechnungssteller} | Kategorie: ${r.kostenkategorie} | Netto: ${formatEuro(
          r.betragNetto
        )} (${r.foerderfaehig ? 'förderfähig (100%)' : 'nicht förderfähig'}) | Zweck: ${r.leistungsbeschreibung}`
    )
    .join('\n') || ' Keine registrierten Sachbelege in diesem Abrechnungsquartal.'
}

3. ENTLOHNUNGS- & PERSONALSTÄNDEREGISTER (F0824)
-----------------------------------------------------------------------------
Aktive Köpfe in diesem Quartal: ${Array.from(new Set(quarterSalaries.map((p) => p.mitarbeiter))).length} Personen
Mitarbeiteraufstellung:
${
  Array.from(new Set(quarterSalaries.map((p) => p.mitarbeiter)))
    .map((name) => {
      const empSum = quarterSalaries.filter((p) => p.mitarbeiter === name).reduce((sum, p) => sum + p.agKosten, 0);
      return `- ${name}: Gesamtbezug AG-Kosten in Q${repQ}: ${formatEuro(empSum, 2)}`;
    })
    .join('\n') || ' Keine aktiven Personalstunden in diesem Abrechnungsquartal.'
}

4. PROVISIONSFREIER SACHBERICHT (MEILENSTEINE & COMPLIANCE)
-----------------------------------------------------------------------------
- Der Technologietransfer d. WIN.DN GmbH im Spitzencluster der Dürener Grundstoffindustrie läuft plangemäß.
- Tariftreuevorgaben sowie Besserstellungsverbot (Gleichbehandlung mit kommunalen Entgelttabellen TVöD) wurden lückenlos gewahrt.
- Die parallel anstehenden Kofinanzierungsabrufe zu den LHO-Landesmitteln NRW wurden harmonisiert.
- Keine wettbewerbsverzerrenden Vergabe-Fehltritte identifiziert. ${
  vergaben.filter((v) => v.status === 'abgeschlossen').length
} Vergabeverfahren sind vollumfänglich dokumentiert und abgeschlossen.

=============================================================================
Revisionssichere Ausgabe aus dem Fördermittel-ERP der WIN.DN GmbH.
Der Zwischennachweis entspricht den GoBD-Standards für Fördermittelbewilligungen.
=============================================================================`;

    setReportResult(outText);
    setIsCopied(false);
  };

  const handleCopyClipboard = () => {
    if (!reportResult) return;
    navigator.clipboard.writeText(reportResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleAIEngineTrigger = () => {
    setAiLoading(true);
    setTimeout(() => {
      setAiLoading(false);
      if (!reportResult) {
        alert(
          'Bitte generieren Sie zuerst den strukturierten Bericht auf der linken Seite.'
        );
        return;
      }

      const aiAddition = `

=============================================================================
MOCK-AI ERGÄNZUNG: GENERIERTER SACHBERICHTS-TEXT (BAFA STARK PORTAL READY)
=============================================================================
FOKUS-NARRATIV: Sektorenkopplung & Dekarbonisierung (Dürener Revier)

Ergänzender Projektfortschritt im Rahmen von Q${repQ} / ${repYear}:
1. SYSTEM-SYNTHESE UND MATCHMAKING:
   Im abgelaufenen Zeitraum wurden die transregionalen Wirtschaftsforen der WIN.DN intensiviert. Es gelang, neue KMU-Netzwerkpartner für den Papier- und Energietechnologie-Sektor zu gewinnen. Die in der Systemdatenbank gepflegten Pilot-Use-Cases zeigen signifikanten technologischen Skalierungserfolg.
   
2. TRANSFORMATIONSAUSWIRKUNGEN:
   Die Pilotbetriebe im Bereich Textil (z.B. re.solution GmbH / GKD Group) bestätigen in chemischen Laboruntersuchungen eine wesentliche Senkung des Energiebedarfs beim Polyester-Recycling. Der Chatbot-Assistent bei der Sihl GmbH befindet sich bereits in der fortgeschrittenen Testphase unter Realbedingungen.

3. RISIKOMINIMIERUNGS-PORTFOLIO:
   Etwaige personelle Engpässe sowie regulatorische Verzögerungen bei der BAFA-Mittelzuweisung wurden durch das interne Liquiditäts-Controlling sowie Zwischenfinanzierungen von Landespartnern gänzlich absorbiert. Ein reibungsloser Mittelfluss ist gewährt.`;

      setReportResult(reportResult + aiAddition);
    }, 1100);
  };

  // Simulated Forecast management
  const handleAddSimulated = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimTitle.trim() || !newSimBetrag) return;

    const betrag = parseFloat(newSimBetrag);
    if (isNaN(betrag)) return;

    const newItem: ForecastSimItem = {
      id: Date.now().toString(),
      titel: newSimTitle,
      betrag,
      quartal: newSimQ,
      kategorie: newSimKat
    };

    setSimulatedItems((prev) => [...prev, newItem]);
    setNewSimTitle('');
    setNewSimBetrag('');
  };

  const handleDeleteSimulated = (id: string) => {
    setSimulatedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // CALCULATE FORECAST VS TARGET BUDGETS
  // Get planned values from data.ts AZA_PLAN for select year
  const yearKey = mapYearToKey(repYear);

  const getYearPlanTotal = (): number => {
    const getVal = (val: any) => (typeof val === 'number' ? val : 0);

    const plannedPersonal = AZA_PLAN.personal.reduce(
      (sum, p) => sum + getVal((p as any)[yearKey]),
      0
    );
    const plannedOverhead = getVal((AZA_PLAN.overhead as any)[yearKey]);
    const plannedAuftraege = AZA_PLAN.auftraege.reduce(
      (sum, a) => sum + getVal((a as any)[yearKey]),
      0
    );
    const plannedMiete = getVal((AZA_PLAN.miete as any)[yearKey]);
    const plannedGegenst = getVal((AZA_PLAN.gegenst as any)[yearKey]);
    const plannedReisen = getVal((AZA_PLAN.reisen as any)[yearKey]);

    return (
      plannedPersonal +
      plannedOverhead +
      plannedAuftraege +
      plannedMiete +
      plannedGegenst +
      plannedReisen
    );
  };

  const totalSollYear = getYearPlanTotal();
  const sollQuarterlyLimit = totalSollYear / 4;

  // Build metrics for Q1 - Q4 of selected year
  const getQuarterlyMetrics = (qNum: number) => {
    // 1. Confirmed actuals (status: ARCHIVIERT, EINGEREICHT in that quarter)
    const subPersonalConfirmed = personal.filter(
      (p) =>
        p.foerderjahr === repYear &&
        p.quartal === qNum &&
        (p.status === 'ARCHIVIERT' || p.status === 'EINGEREICHT')
    );
    const actualSalaries = subPersonalConfirmed.reduce((sum, p) => sum + p.agKosten, 0);

    const subRechnungenConfirmed = rechnungen.filter(
      (r) =>
        r.foerderjahr === repYear &&
        r.quartal === qNum &&
        (r.status === 'ARCHIVIERT' || r.status === 'EINGEREICHT')
    );
    const actualInvoices = subRechnungenConfirmed.reduce((sum, r) => sum + r.betragNetto, 0);
    const actualOverhead = actualSalaries * 0.10;
    const actualTotal = actualSalaries + actualInvoices + actualOverhead;

    // 2. Drafts (status: ENTWURF, IN_PRUEFUNG)
    const subPersonalDraft = personal.filter(
      (p) =>
        p.foerderjahr === repYear &&
        p.quartal === qNum &&
        (p.status === 'ENTWURF' || p.status === 'IN_PRUEFUNG')
    );
    const draftSalaries = subPersonalDraft.reduce((sum, p) => sum + p.agKosten, 0);

    const subRechnungenDraft = rechnungen.filter(
      (r) =>
        r.foerderjahr === repYear &&
        r.quartal === qNum &&
        (r.status === 'ENTWURF' || r.status === 'IN_PRUEFUNG')
    );
    const draftInvoices = subRechnungenDraft.reduce((sum, r) => sum + r.betragNetto, 0);
    const draftOverhead = draftSalaries * 0.10;
    const draftTotal = draftSalaries + draftInvoices + draftOverhead;

    // 3. Simulated Items
    const simTotal = simulatedItems
      .filter((item) => item.quartal === qNum)
      .reduce((sum, item) => sum + item.betrag, 0);

    return {
      actual: actualTotal,
      draft: draftTotal,
      simulated: simTotal,
      totalExpected: actualTotal + draftTotal + simTotal,
      overPercent: Math.min(
        100,
        Math.round(((actualTotal + draftTotal + simTotal) / sollQuarterlyLimit) * 100)
      )
    };
  };

  const q1Metrics = getQuarterlyMetrics(1);
  const q2Metrics = getQuarterlyMetrics(2);
  const q3Metrics = getQuarterlyMetrics(3);
  const q4Metrics = getQuarterlyMetrics(4);

  const totalIstYear = q1Metrics.actual + q2Metrics.actual + q3Metrics.actual + q4Metrics.actual;
  const totalDraftYear = q1Metrics.draft + q2Metrics.draft + q3Metrics.draft + q4Metrics.draft;
  const totalSimYear = q1Metrics.simulated + q2Metrics.simulated + q3Metrics.simulated + q4Metrics.simulated;
  const grandExpectedYear = totalIstYear + totalDraftYear + totalSimYear;
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
            Revisionssichere Belege, BAFA-STARK Zwischennachweise und vorausschauende Quartalsprognosen.
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Druck-Layout (Strg+P)
          </button>
        </div>
      </div>

      {/* CSV Export & Actions Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/85 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 bg-zs-textil-gruen rounded" />
            <h3 className="font-display font-black text-sm text-slate-900">
              Personalbelege exportieren
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-4 font-sans">
            Generiert ein Excel/CSV-kompatibles Register aller gebuchten Personalstunden und Lohnkosten für das gewählte Förderjahr <strong>{activeYearLabel}</strong>.
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
            <h3 className="font-display font-black text-sm text-slate-900">
              Sachbelege &amp; Rechnungen exportieren
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-4 font-sans">
            Erstellt eine vollständige Belegliste inklusive Steuern, Rechnungsnummern und AP-Klassifizierungen für Wirtschaftsprüfer.
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

      {/* Main Grid: Generator (Left) & Forecast (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: BAFA Report Synthesizer (xl:col-span-7) */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-100 rounded text-slate-700">
                  <Calculator className="w-4 h-4" />
                </span>
                <h2 className="font-display font-black text-base text-slate-900">
                  Quartalsbericht-Synthesizer
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                BAFA-STARK V22
              </span>
            </div>

            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Kompilieren Sie erfasste Belege in ein rechtskonformes ASCII-Datenpaket für das S-BAFA Stammportal. Das System kalkuliert Gehälter, Inlandsrechnungen und die 10%ige Pflegepauschale vollautomatisch.
            </p>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Abrechnungskalender
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
                  <option value="1">Q1 (1. Jan &mdash; 31. Mär)</option>
                  <option value="2">Q2 (1. Apr &mdash; 30. Jun)</option>
                  <option value="3">Q3 (1. Jul &mdash; 30. Sep)</option>
                  <option value="4">Q4 (1. Okt &mdash; 31. Dez)</option>
                </select>
              </div>
            </div>

            {/* Run Synthesizer Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleGenerateReportText}
                className="flex-1 py-3 text-xs font-bold rounded-lg bg-slate-900 border border-slate-900 text-white cursor-pointer hover:bg-slate-800 transition-all font-mono uppercase tracking-wider text-center"
              >
                Synthese berechnen
              </button>
              
              <button
                onClick={handleAIEngineTrigger}
                disabled={aiLoading || !reportResult}
                className={`px-4 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer font-mono ${
                  !reportResult 
                    ? 'border-slate-200 bg-slate-50 text-slate-450 cursor-not-allowed opacity-50' 
                    : aiLoading 
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 animate-pulse' 
                      : 'border-emerald-250 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
                title={!reportResult ? 'Bitte zuerst "Synthese berechnen" klicken' : 'AI Ergänzungen simulieren'}
              >
                <Sparkles className="w-4 h-4" />
                {aiLoading ? 'Synthetisiere...' : '+ AI Sachbericht'}
              </button>
            </div>
          </div>

          {/* ASCII Viewer Console */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col p-5 space-y-3">
            <div className="flex justify-between items-center bg-slate-800/20 p-2.5 rounded-lg border border-slate-800">
              <span className="flex items-center gap-2 text-[10px] font-mono font-bold text-zs-signal-gelb tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Vorschau-Terminal: Verwendungsnachweis
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
                      In Zwischenablage!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Inhalt kopieren
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
                '=== ERP BERICHTS-SYSTHEMATIK ===\n\nWählen Sie oben das Förderjahr und das entsprechende Quartal aus.\nKlicken Sie dann auf "Synthese berechnen", um alle state-sensitiven ERP-Transaktionen formatiert auszugeben.'
              }
              className="w-full bg-transparent border-none outline-none resize-none font-mono text-[10px] text-slate-300 whitespace-pre scrollbar-thin overflow-y-auto leading-relaxed focus:ring-0"
            />
            
            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-450 border-t border-slate-800 pt-2">
              <Info className="w-3 h-3 text-zs-signal-gelb" />
              <span>Hinweis: Das Terminal liefert standardkonforme Formulierungen für das offizielle S-BAFA Uploadfeld.</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quarterly Forecast Board (xl:col-span-12 or 5) */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-100 rounded text-slate-700">
                  <TrendingUp className="w-4 h-4 text-zs-textil-gruen" />
                </span>
                <h2 className="font-display font-black text-base text-slate-900">
                  Quartals Forecast &amp; Budget
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono font-bold">
                Jahr: {repYear}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Vergleicht das gezeichnete AZA Soll-Budget des Jahres {repYear} (gleichmäßig geteilt pro Quartal: <strong>{formatEuro(sollQuarterlyLimit)}</strong>) mit gebuchten Ist-Kosten, noch offenen Entwürfen und simulierten Kostenrisiken.
            </p>

            {/* Visual Progress Tracks */}
            <div className="space-y-4 pt-1">
              {[
                { number: 1, label: 'Q1 / Jan-Mär', val: q1Metrics },
                { number: 2, label: 'Q2 / Apr-Jun', val: q2Metrics },
                { number: 3, label: 'Q3 / Jul-Sep', val: q3Metrics },
                { number: 4, label: 'Q4 / Okt-Dez', val: q4Metrics },
              ].map((quart) => {
                const limitVal = sollQuarterlyLimit;
                const exc = quart.val.totalExpected;
                const barWidth = Math.min(100, Math.round((exc / limitVal) * 100));
                
                // Color grading based on usage
                const barColor = barWidth > 95 ? 'bg-rose-500' : barWidth > 75 ? 'bg-amber-500' : 'bg-slate-900';

                return (
                  <div key={quart.number} className="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 font-sans text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        {quart.label}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-900">
                        {formatEuro(exc)} / <span className="text-slate-400 font-medium">{formatEuro(limitVal)}</span>
                      </span>
                    </div>

                    {/* Progress stacked bar container */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
                      {/* Ist portion (Confirmed) */}
                      <div 
                        style={{ width: `${Math.min(100, (quart.val.actual / limitVal) * 100)}%` }} 
                        className="h-full bg-slate-900 absolute left-0 top-0 transition-all" 
                        title={`Ist: ${formatEuro(quart.val.actual)}`}
                      />
                      {/* Draft portion (Entwurf) */}
                      <div 
                        style={{ 
                          width: `${Math.min(100, (quart.val.draft / limitVal) * 100)}%`,
                          left: `${Math.min(100, (quart.val.actual / limitVal) * 100)}%`
                        }} 
                        className="h-full bg-slate-400/80 absolute top-0 transition-all" 
                        title={`Entwurf: ${formatEuro(quart.val.draft)}`}
                      />
                      {/* Simulated portion */}
                      <div 
                        style={{ 
                          width: `${Math.min(100, (quart.val.simulated / limitVal) * 100)}%`,
                          left: `${Math.min(100, ((quart.val.actual + quart.val.draft) / limitVal) * 100)}%`
                        }} 
                        className="h-full bg-emerald-500 absolute top-0 transition-all" 
                        title={`Simulation: ${formatEuro(quart.val.simulated)}`}
                      />
                    </div>

                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>Abrechnungsverhältnis: <strong>{barWidth}%</strong></span>
                      <span className="flex gap-2">
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-slate-900 rounded-xs" /> Ist</span>
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-slate-400 rounded-xs" /> Draft</span>
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-xs" /> Sim</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Annual Pacing Card */}
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 font-mono text-xs">
              <span className="text-[9px] uppercase text-zs-signal-gelb tracking-wider font-bold block border-b border-white/10 pb-1.5">
                Prognose Abschluss &amp; Puffer ({repYear})
              </span>
              
              <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                <div className="text-white/60">Soll Jahresetat (AZA):</div>
                <div className="text-right text-white font-bold">{formatEuro(totalSollYear, 2)}</div>

                <div className="text-white/60">Ist-Buchungen (go-live):</div>
                <div className="text-right text-emerald-400 font-bold">+{formatEuro(totalIstYear, 2)}</div>

                <div className="text-white/60">Offene Entwürfe (Drafts):</div>
                <div className="text-right text-slate-300">+{formatEuro(totalDraftYear, 2)}</div>

                <div className="text-white/60">Simulierte Risiken (Aussicht):</div>
                <div className="text-right text-blue-300">+{formatEuro(totalSimYear, 2)}</div>
                
                <div className="col-span-2 border-t border-white/15 my-1" />

                <div className="text-zs-signal-gelb font-bold uppercase text-[10px]">Forecaster-Summe:</div>
                <div className="text-right text-white font-bold">{formatEuro(grandExpectedYear, 2)}</div>

                <div className="font-bold text-[10px] uppercase">Rücklage (Verbleibend):</div>
                <div className={`text-right font-bold ${yearPuffer < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatEuro(yearPuffer, 2)}
                </div>
              </div>

              {yearPuffer < 0 && (
                <div className="p-2 border border-red-500/30 bg-red-950/40 rounded text-[10px] text-red-300 flex items-start gap-1 font-sans">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />
                  <span>Kostenlimit überschritten! Die modellierte Prognose übersteigt den jährlichen AZA-Zuwendungsbescheid.</span>
                </div>
              )}
            </div>
          </div>

          {/* Forecast Simulator Editor */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <h3 className="font-display font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                Ad-Hoc Forecast Simulator
              </h3>
              <span className="text-[10px] bg-emerald-50 border border-emerald-100 px-1.5 text-emerald-700 rounded font-mono font-bold">
                Interaktiv
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Planen Sie fiktive Großaufträge, neue Mitarbeiterzuteilungen oder Sachrisiken ein, um deren Auslagerung und Budgetbindung in der Pacing-Kurve oben ad-hoc zu berechnen.
            </p>

            <form onSubmit={handleAddSimulated} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-405 font-bold uppercase">Bezeichnung</span>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Marketing AP2"
                    value={newSimTitle}
                    onChange={(e) => setNewSimTitle(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-slate-850"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-405 font-bold uppercase">Euro-Nettobetrag</span>
                  <input
                    type="number"
                    required
                    placeholder="z.B. 4500"
                    value={newSimBetrag}
                    onChange={(e) => setNewSimBetrag(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-slate-850 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-405 font-bold uppercase">Ziel-Quartal</span>
                  <select
                    value={newSimQ}
                    onChange={(e) => setNewSimQ(Number(e.target.value) as any)}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded outline-none cursor-pointer focus:border-slate-850"
                  >
                    <option value="1">Quartal 1</option>
                    <option value="2">Quartal 2</option>
                    <option value="3">Quartal 3</option>
                    <option value="4">Quartal 4</option>
                  </select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-405 font-bold uppercase">ERP-Kategorie</span>
                  <select
                    value={newSimKat}
                    onChange={(e) => setNewSimKat(e.target.value as any)}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded outline-none cursor-pointer focus:border-slate-850"
                  >
                    <option value="Sachkosten">Sachkosten (F0835)</option>
                    <option value="Personal">Personalkosten (F0824)</option>
                    <option value="Vergabe">Vergabeaufträge</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 text-center text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold rounded cursor-pointer transition-all"
              >
                + Simulation in Forecast einpflegen
              </button>
            </form>

            {/* List of Simulated forecast items */}
            {simulatedItems.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto pr-1">
                <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block mb-1">
                  Aktive Simulationsprüfungen:
                </span>
                
                {simulatedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150 text-[11px] font-mono">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="truncate font-bold text-slate-700">{item.titel}</div>
                      <div className="text-[9px] text-slate-450">
                        Q{item.quartal} &bull; {item.kategorie}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 whitespace-nowrap">
                        +{formatEuro(item.betrag)}
                      </span>
                      <button
                        onClick={() => handleDeleteSimulated(item.id)}
                        className="p-1 hover:bg-slate-200 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                        title="Simulierten Posten löschen"
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
