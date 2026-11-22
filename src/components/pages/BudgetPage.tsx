import React, { useState, useMemo, useEffect } from 'react';
import {
  PersonalEintrag,
  Rechnungsbeleg,
  Mittelabruf,
  Buchung,
  MitarbeiterStamm,
  SystemSettings,
  ProfiPositionCode,
  AzaPlanVersion,
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
  formatDate,
  PROFI_POSITIONEN,
  PROFI_STARK_FKZ,
  mapKategorieToProfiPosition,
  splitPersonalToProfi,
  getFoerderfaehigerRechnungsBetrag,
  addEuro,
  subEuro,
  sumEuro,
  splitPercent9010,
  computeIdeallinieSeries,
} from '../../utils';
import {
  ArrowLeft,
  AlertTriangle,
  Copy,
  Check,
  Plus,
  Clock,
  Layers,
  Activity,
} from 'lucide-react';
import PolicyDecreeDeck from '../PolicyDecreeDeck';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export type BudgetTab = 'kategorie' | 'jahre' | 'personal' | 'vergaben' | 'buchungen' | 'dekrete';
export type BudgetFocus = 'all' | 'bundesmittel' | 'eigenanteil';

interface BudgetPageProps {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  mittelabrufe: Mittelabruf[];
  buchungen: Buchung[];
  mitarbeiterStamm?: MitarbeiterStamm[];
  settings?: SystemSettings;
  onUpdateSettings?: (patch: Partial<SystemSettings>) => void;
  activeYear: string | null;
  activeYearLabel: string;
  onSetGlobalYear: (yr: string | null) => void;
  onAddBuchung: (b: Omit<Buchung, 'id'>) => void;
  onUpdateBuchungStatus: (id: number, status: Buchung['status']) => void;
  initialTab?: BudgetTab;
  initialFocus?: BudgetFocus;
  onFocusChange?: (f: BudgetFocus) => void;
  onBackToCockpit?: () => void;
}

export default function BudgetPage({
  personal,
  rechnungen,
  buchungen,
  mitarbeiterStamm = [],
  settings = DEFAULT_SETTINGS,
  onUpdateSettings,
  activeYear,
  activeYearLabel,
  onSetGlobalYear,
  onAddBuchung,
  onUpdateBuchungStatus,
  initialTab = 'kategorie',
  initialFocus = 'all',
  onBackToCockpit,
}: BudgetPageProps) {
  const [tab, setTab] = useState<BudgetTab>(initialTab);
  const [focus, setFocus] = useState<BudgetFocus>(initialFocus);
  const [copiedTransferDraft, setCopiedTransferDraft] = useState(false);

  // Manual Booking Modal
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [bDatum, setBDatum] = useState(new Date().toISOString().slice(0, 10));
  const [bBetrag, setBBetrag] = useState('');
  const [bKat, setBKat] = useState('Sachkosten');
  const [bAp, setBAp] = useState('AP2 – Technologietransfer');
  const [bBeschr, setBBeschr] = useState('');
  const [bStatus, setBStatus] = useState<Buchung['status']>('geplant');
  const [bFoerd, setBFoerd] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setFocus(initialFocus);
  }, [initialFocus]);

  const activePlan = useMemo(() => getAzaPlan(settings.azaVersion), [settings.azaVersion]);
  const azaMeta = AZA_VERSION_META[settings.azaVersion];
  const yearKeys = useMemo(
    () => (activeYear ? [activeYear] : AZA_JAHRE.map((y) => y.key)),
    [activeYear]
  );

  const scopeMatches = (foerderjahr: number) => {
    if (!activeYear) return true;
    if (activeYear === 'gesamt25') return foerderjahr === 2025;
    if (activeYear === 'mrz29') return foerderjahr === 2029;
    return String(foerderjahr) === activeYear;
  };

  const yearPers = useMemo(
    () => personal.filter((p) => scopeMatches(p.foerderjahr)),
    [personal, activeYear]
  );
  const yearRech = useMemo(
    () => rechnungen.filter((r) => scopeMatches(r.foerderjahr)),
    [rechnungen, activeYear]
  );

  // Plan je profi-Position (0812–0843)
  const posPlan: Record<ProfiPositionCode, number> = useMemo(() => {
    const persPlanSplit = splitAzaPersonalPlan0812_0817_0820(activePlan, yearKeys);
    const sumRow = (row: Record<string, any>) =>
      sumEuro(yearKeys.map((yk) => Number(row?.[yk] || 0)));

    const overhead = sumRow(activePlan.overhead);
    const miete = sumRow(activePlan.miete);
    const gegenst = sumRow(activePlan.gegenst);
    const reisen = sumRow(activePlan.reisen);
    let auftr0835 = 0;
    let auftr0843 = 0;
    activePlan.auftraege.forEach((a) => {
      const v = sumRow(a);
      if (a.kat.includes('0843')) {
        auftr0843 = addEuro(auftr0843, v);
      } else {
        auftr0835 = addEuro(auftr0835, v);
      }
    });

    return {
      '0812': persPlanSplit.pos0812,
      '0817': persPlanSplit.pos0817,
      '0820': persPlanSplit.pos0820,
      '0831': reisen,
      '0835': auftr0835,
      '0843': sumEuro([overhead, miete, gegenst, auftr0843]),
    };
  }, [activePlan, yearKeys]);

  // Ist je profi-Position (0812–0843)
  const persTotals = useMemo(
    () => splitPersonalToProfi(yearPers, 0.18, mitarbeiterStamm),
    [yearPers, mitarbeiterStamm]
  );

  const posIst: Record<ProfiPositionCode, number> = useMemo(() => {
    const sach: Record<ProfiPositionCode, number> = {
      '0812': 0,
      '0817': 0,
      '0820': 0,
      '0831': 0,
      '0835': 0,
      '0843': 0,
    };
    yearRech.forEach((r) => {
      const ff = getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt);
      if (ff <= 0) return;
      const pos = mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition);
      sach[pos] = addEuro(sach[pos], ff);
    });
    return {
      '0812': persTotals.pos0812,
      '0817': persTotals.pos0817,
      '0820': persTotals.pos0820,
      '0831': sach['0831'],
      '0835': sach['0835'],
      '0843': addEuro(persTotals.pos0843Overhead, sach['0843']),
    };
  }, [persTotals, yearRech, settings.vorsteuerabzugsberechtigt]);

  const totalPlan = useMemo(() => sumEuro(Object.values(posPlan)), [posPlan]);
  const totalIst = useMemo(() => sumEuro(Object.values(posIst)), [posIst]);
  const plan9010 = useMemo(() => splitPercent9010(totalPlan), [totalPlan]);
  const ist9010 = useMemo(() => splitPercent9010(totalIst), [totalIst]);

  // 20-%-Umschichtungs-Wächter
  const over20Positions = useMemo(
    () =>
      PROFI_POSITIONEN.filter((pos) => {
        const p = posPlan[pos.code] || 0;
        const i = posIst[pos.code] || 0;
        return p > 0 && i > p * 1.2;
      }),
    [posPlan, posIst]
  );

  // 48-Monats Pacing: Die Ideallinie (04/2025 – 03/2029)
  const gamificationEnabled = settings.gamificationMode !== false;
  const ideallinie = useMemo(
    () =>
      computeIdeallinieSeries({
        personal,
        rechnungen,
        foerderByYear: activePlan.foerder as Record<string, { gesamt: number }>,
        vorsteuerabzugsberechtigt: settings.vorsteuerabzugsberechtigt,
      }),
    [personal, rechnungen, activePlan.foerder, settings.vorsteuerabzugsberechtigt]
  );

  // Verfalls-Radar & Übertragungs-Assistent (Kassenschluss 15.11.)
  const transferProjection = useMemo(() => {
    const rest0835 = Math.max(0, subEuro(posPlan['0835'], posIst['0835']));
    const rest0843 = Math.max(0, subEuro(posPlan['0843'], posIst['0843']));
    const estimatedAtRisk = addEuro(Math.round(rest0835 * 0.45 * 100) / 100, Math.round(rest0843 * 0.25 * 100) / 100);
    return {
      rest0835,
      rest0843,
      estimatedAtRisk,
    };
  }, [posPlan, posIst]);

  const transferDraftText = useMemo(() => {
    const scopeText = activeYear ? activeYearLabel : 'Förderjahr 2026';
    return [
      `ANTRAG AUF MITTELÜBERTRAGUNG GEMÄSS ANBest-P / STARK-RICHTLINIE`,
      `An: Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA) – Referat 424, Frankfurter Str. 29–35, 65760 Eschborn`,
      `Zuwendungsempfänger: WIN.DN Wirtschaftsförderung Düren GmbH`,
      `Projekt: Zukunftsstoff – Made in Düren / MiD-PTC (FKZ ${PROFI_STARK_FKZ})`,
      ``,
      `Betreff: Antrag auf kostenneutrale Übertragung unverausgabter Haushaltsmittel (${scopeText}) in das Folgejahr`,
      ``,
      `Sehr geehrte Damen und Herren,`,
      `aufgrund verlängerter Vergabe- und Abstimmungsfristen bei den industriellen Transformations-Boostern sowie den Ökoprofit-Checkups (profi-online Pos. 0835) und begleitender Öffentlichkeitsarbeit (Pos. 0843) beantragen wir vor Kassenschluss (15.11.) die kostenneutrale Übertragung der nicht bis Jahresende kassenwirksam werdenden Restmittel:`,
      `- Pos. 0835 (Vergabe / Fremdleistungen): Restbudget aktuell ${formatEuro(transferProjection.rest0835, 2)}`,
      `- Pos. 0843 (Sächl. Verwaltungsausgaben): Restbudget aktuell ${formatEuro(transferProjection.rest0843, 2)}`,
      `- Gesamtvolumen des voraussichtlichen Übertrags (Ausgabenbasis 100 %): ${formatEuro(transferProjection.estimatedAtRisk, 2)} (90 % Bundesanteil: ${formatEuro(splitPercent9010(transferProjection.estimatedAtRisk).bund90, 2)})`,
      ``,
      `Der Gesamtfinanzierungsplan (90 % Bund / 10 % Eigenanteil WIN.DN) bleibt unverändert. Die Mittel werden im Folgejahr vollständig zur Erreichung der Projektziele (AP2/AP5) gebunden.`,
    ].join('\n');
  }, [activeYear, activeYearLabel, transferProjection]);

  const handleCopyTransferDraft = () => {
    navigator.clipboard.writeText(transferDraftText);
    setCopiedTransferDraft(true);
    setTimeout(() => setCopiedTransferDraft(false), 2200);
  };

  // Jahresmatrix Daten
  const yearBreakdown = useMemo(() => {
    return AZA_JAHRE.map((y) => {
      const pEntry = (activePlan.foerder as Record<string, { gesamt: number; bafa: number; eigen: number }>)[y.key];
      const planTotal = pEntry?.gesamt || 0;
      const yearNum = y.key === 'gesamt25' ? 2025 : y.key === 'mrz29' ? 2029 : parseInt(y.key, 10);
      const yPers = personal.filter((p) => p.foerderjahr === yearNum);
      const yRech = rechnungen.filter((r) => r.foerderjahr === yearNum);
      const pSum = sumEuro(yPers.map((p) => p.foerderfaehig || 0));
      const rSum = sumEuro(
        yRech.map((r) => getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt))
      );
      const istTotal = addEuro(pSum, rSum);
      const istS = splitPercent9010(istTotal);
      return {
        ...y,
        planTotal,
        planBund: pEntry?.bafa || 0,
        planEigen: pEntry?.eigen || 0,
        istTotal,
        istBund: istS.bund90,
        istEigen: istS.eigen10,
      };
    });
  }, [activePlan, personal, rechnungen, settings.vorsteuerabzugsberechtigt]);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(bBetrag);
    if (!val || val <= 0 || !bBeschr.trim()) {
      setFormError('Bitte gültigen Betrag und Beschreibung eingeben.');
      return;
    }
    setFormError(null);
    const yr = parseInt(bDatum.slice(0, 4), 10) || 2026;
    onAddBuchung({
      datum: bDatum,
      kategorie: bKat,
      beschreibung: bBeschr.trim(),
      betrag: val,
      foerderfaehig: bFoerd,
      arbeitspaket: bAp,
      foerderjahr: yr,
      status: bStatus,
    });
    setBBetrag('');
    setBBeschr('');
    setShowAddBookingModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header + AZA-Plan-Versions-Umschalter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          {onBackToCockpit && (
            <button
              onClick={onBackToCockpit}
              className="text-xs font-mono text-zinc-500 hover:text-zs-blau-schwarz flex items-center gap-1 mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Zurück zum Cockpit</span>
            </button>
          )}
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Budget &amp; AZA-Finanzierungsplan
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            {azaMeta.label} &middot; {activeYearLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-[#58B49D]" />
            <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase">AZA-Planstand:</span>
            <select
              value={settings.azaVersion}
              onChange={(e) =>
                onUpdateSettings?.({ azaVersion: e.target.value as AzaPlanVersion })
              }
              className="font-semibold text-zs-blau-schwarz bg-transparent outline-none cursor-pointer text-xs"
            >
              {Object.values(AZA_VERSION_META).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          {tab === 'buchungen' && (
            <button
              onClick={() => setShowAddBookingModal(true)}
              className="px-4 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-zs-signal-gelb" />
              <span>Manuelle Buchung</span>
            </button>
          )}
        </div>
      </div>

      {/* Planversion Beschreibung + 20-%-Umschichtungswächter */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 text-xs text-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <strong className="text-zs-blau-schwarz">{azaMeta.label}:</strong>{' '}
          <span className="text-zinc-600">{azaMeta.beschreibung}</span>
        </div>
        <div className="font-mono text-xs tabular-nums shrink-0 text-right">
          <span className="text-zinc-500">Gesamtplan: </span>
          <strong className="text-zs-blau-schwarz">{formatEuro(totalPlan, 2)}</strong>
          <span className="text-zinc-400"> ({formatEuro(plan9010.bund90, 2)} Bund)</span>
        </div>
      </div>

      {over20Positions.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-xl flex items-start gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong>ANBest-P 20-%-Umschichtungs-Wächter:</strong> Folgende profi-Positionen überschreiten den Ansatz der aktiven Planversion um mehr als 20 % (&gt; 120 %):{' '}
            <strong className="font-mono">
              {over20Positions.map((p) => `${p.displayCode} (${p.kurzBezeichnung})`).join(', ')}
            </strong>
            . Vor Einreichung der nächsten ZA ist beim BAFA eine Umschichtungsanzeige / ein Änderungsantrag erforderlich.
          </div>
        </div>
      )}

      {/* Fokus & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-200/70 rounded-lg border border-zinc-200">
          {(
            [
              { id: 'kategorie', label: 'profi-Positionen 0812–0843' },
              { id: 'jahre', label: 'Jahresmatrix 2025–2029' },
              { id: 'personal', label: 'Personal-Plan' },
              { id: 'vergaben', label: 'Sach-/Vergabe-Plan' },
              { id: 'buchungen', label: `Buchungen (${buchungen.length})` },
              { id: 'dekrete', label: 'Dekrete & Sandbox' },
            ] as { id: BudgetTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                tab === t.id ? 'bg-white text-zs-blau-schwarz shadow-xs' : 'text-zinc-600 hover:text-zs-blau-schwarz'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200 text-[11px] font-mono">
          {(
            [
              { id: 'all', label: '100 % Gesamt' },
              { id: 'bundesmittel', label: '90 % Bund' },
              { id: 'eigenanteil', label: '10 % Eigenanteil' },
            ] as { id: BudgetFocus; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFocus(f.id)}
              className={`px-2.5 py-1 rounded cursor-pointer font-semibold ${
                focus === f.id ? 'bg-zs-blau-schwarz text-white' : 'text-zinc-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'kategorie' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                    <th className="p-3 pl-5">Pos.</th>
                    <th className="p-3">profi-online Position</th>
                    <th className="p-3 text-right">
                      Plan ({focus === 'bundesmittel' ? '90 %' : focus === 'eigenanteil' ? '10 %' : '100 %'})
                    </th>
                    <th className="p-3 text-right">Ist erfasst</th>
                    <th className="p-3 text-right">Restbudget</th>
                    <th className="p-3 pr-5 text-right">Auslastung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {PROFI_POSITIONEN.map((pos) => {
                    const rawPlan = posPlan[pos.code] || 0;
                    const rawIst = posIst[pos.code] || 0;
                    const mult = focus === 'bundesmittel' ? 0.9 : focus === 'eigenanteil' ? 0.1 : 1;
                    const pVal =
                      focus === 'all'
                        ? rawPlan
                        : focus === 'bundesmittel'
                        ? splitPercent9010(rawPlan).bund90
                        : splitPercent9010(rawPlan).eigen10;
                    const iVal =
                      focus === 'all'
                        ? rawIst
                        : focus === 'bundesmittel'
                        ? splitPercent9010(rawIst).bund90
                        : splitPercent9010(rawIst).eigen10;
                    const rest = subEuro(pVal, iVal);
                    const pct = pVal > 0 ? (iVal / pVal) * 100 : 0;
                    const over20 = rawPlan > 0 && rawIst > rawPlan * 1.2;
                    void mult;

                    return (
                      <tr key={pos.code} className="hover:bg-zinc-50/70">
                        <td className="p-3 pl-5 font-mono font-bold text-zs-blau-schwarz">{pos.displayCode}</td>
                        <td className="p-3">
                          <div className="font-semibold text-zinc-800 flex items-center gap-2">
                            <span>{pos.bezeichnung}</span>
                            {over20 && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-mono text-[10px] font-bold">
                                &gt;120 % Umschichtung prüfen
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400">{pos.beschreibung}</div>
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-zinc-600">
                          {formatEuro(pVal, 2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold tabular-nums text-zs-blau-schwarz">
                          {formatEuro(iVal, 2)}
                        </td>
                        <td className={`p-3 text-right font-mono font-semibold tabular-nums ${rest < 0 ? 'text-red-700' : 'text-[#58B49D]'}`}>
                          {formatEuro(rest, 2)}
                        </td>
                        <td className="p-3 pr-5 text-right font-mono font-bold tabular-nums">
                          {pct.toFixed(1)} %
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-50 border-t border-zinc-200 font-mono font-bold text-xs text-zs-blau-schwarz">
                    <td className="p-3 pl-5" colSpan={2}>
                      Gesamtsumme ({activeYearLabel})
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatEuro(
                        focus === 'bundesmittel'
                          ? plan9010.bund90
                          : focus === 'eigenanteil'
                          ? plan9010.eigen10
                          : totalPlan,
                        2
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatEuro(
                        focus === 'bundesmittel'
                          ? ist9010.bund90
                          : focus === 'eigenanteil'
                          ? ist9010.eigen10
                          : totalIst,
                        2
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatEuro(
                        subEuro(
                          focus === 'bundesmittel'
                            ? plan9010.bund90
                            : focus === 'eigenanteil'
                            ? plan9010.eigen10
                            : totalPlan,
                          focus === 'bundesmittel'
                            ? ist9010.bund90
                            : focus === 'eigenanteil'
                            ? ist9010.eigen10
                            : totalIst
                        ),
                        2
                      )}
                    </td>
                    <td className="p-3 pr-5 text-right tabular-nums">
                      {totalPlan > 0 ? ((totalIst / totalPlan) * 100).toFixed(1) : '0.0'} %
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Verfalls-Radar & Mittelübertragungs-Assistent (Kassenschluss 15.11.) */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h2 className="font-display font-bold text-base text-zs-blau-schwarz flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Verfalls-Radar &amp; Übertragungs-Assistent (Kassenschluss 15.11.)</span>
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Prognose unverausgabter Mittel in Pos. 0835 &amp; 0843 vor Kassenschluss mit Begründungsentwurf für BAFA Referat 424 Eschborn.
                </p>
              </div>
              <button
                onClick={handleCopyTransferDraft}
                className="px-3.5 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold hover:bg-[#08243d] flex items-center gap-1.5 cursor-pointer"
              >
                {copiedTransferDraft ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-zs-signal-gelb" />
                    <span>Begründung kopiert</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zs-signal-gelb" />
                    <span>BAFA-Übertragsbegründung kopieren</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Restbudget Pos. 0835</div>
                <div className="text-xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
                  {formatEuro(transferProjection.rest0835, 2)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Restbudget Pos. 0843</div>
                <div className="text-xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
                  {formatEuro(transferProjection.rest0843, 2)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-mono text-amber-800 uppercase">Übertrags-Empfehlung (Vor 15.11.)</div>
                <div className="text-xl font-mono font-bold text-amber-900 tabular-nums mt-1">
                  {formatEuro(transferProjection.estimatedAtRisk, 2)}
                </div>
              </div>
            </div>

            <pre className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] font-mono text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {transferDraftText}
            </pre>
          </div>

          {/* Die Ideallinie (48-Monats AZA-Pacing mit ±5-%-Effizienzkorridor) */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h2 className="font-display font-bold text-base text-zs-blau-schwarz flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#58B49D]" />
                  <span>
                    {gamificationEnabled
                      ? 'Die Ideallinie — AZA-Pacing & ±5-%-Effizienzkorridor (04/2025–03/2029)'
                      : '48-Monats-Mittelabfluss vs. AZA-Sollkurve (±5-%-Toleranzkorridor)'}
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Vergleicht den kumulierten Ist-Mittelabfluss (schwarze Linie) mit dem linearen AZA-Soll („AZA-Geist“, gestrichelt) im grünen ±5-%-Korridor.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold tabular-nums self-start sm:self-auto ${
                  ideallinie.inCorridor
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : ideallinie.latestDeviationPct < -5
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {ideallinie.inCorridor
                  ? `Im Korridor (${ideallinie.latestDeviationPct >= 0 ? '+' : ''}${ideallinie.latestDeviationPct.toFixed(1)} %)`
                  : ideallinie.latestDeviationPct < -5
                  ? `Mittelabfluss verzögert (${ideallinie.latestDeviationPct.toFixed(1)} %)`
                  : `Vorlauf über Korridor (+${ideallinie.latestDeviationPct.toFixed(1)} %)`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">AZA-Soll kumuliert (Stichtag)</div>
                <div className="text-lg font-mono font-bold text-zs-blau-schwarz tabular-nums mt-0.5">
                  {formatEuro(ideallinie.latestPlan, 2)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Ist-Ausgaben kumuliert</div>
                <div className="text-lg font-mono font-bold text-zs-blau-schwarz tabular-nums mt-0.5">
                  {formatEuro(ideallinie.latestIst, 2)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Abweichung zum Korridor</div>
                <div
                  className={`text-lg font-mono font-bold tabular-nums mt-0.5 ${
                    ideallinie.inCorridor ? 'text-emerald-700' : 'text-amber-800'
                  }`}
                >
                  {subEuro(ideallinie.latestIst, ideallinie.latestPlan) > 0 ? '+' : ''}
                  {formatEuro(subEuro(ideallinie.latestIst, ideallinie.latestPlan), 2)}
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ideallinie.series} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} interval={5} />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    width={46}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: '11px',
                      borderRadius: '8px',
                      borderColor: '#e4e4e7',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                    formatter={(val: any, name: any) => {
                      if (Array.isArray(val)) {
                        return [`${formatEuro(Number(val[0]), 0)} – ${formatEuro(Number(val[1]), 0)}`, '±5-%-Korridor'];
                      }
                      return [formatEuro(Number(val), 2), String(name)];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bandRange"
                    name="±5-%-Effizienz-Korridor"
                    stroke="none"
                    fill="#58B49D"
                    fillOpacity={0.2}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumPlan"
                    name="AZA-Geist (Soll)"
                    stroke="#71717a"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumIst"
                    name="Ist-Ausgaben kumuliert"
                    stroke="#041422"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {gamificationEnabled && (
            <PolicyDecreeDeck
              rest0835={transferProjection.rest0835}
              rest0843={transferProjection.rest0843}
              totalPlan={totalPlan}
              totalIst={totalIst}
              settings={settings}
              onApplyAzaVersion={(version) => onUpdateSettings?.({ azaVersion: version })}
            />
          )}
        </div>
      )}

      {tab === 'dekrete' && (
        <PolicyDecreeDeck
          rest0835={transferProjection.rest0835}
          rest0843={transferProjection.rest0843}
          totalPlan={totalPlan}
          totalIst={totalIst}
          settings={settings}
          onApplyAzaVersion={(version) => onUpdateSettings?.({ azaVersion: version })}
        />
      )}

      {tab === 'jahre' && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                  <th className="p-3 pl-5">Förderjahr</th>
                  <th className="p-3 text-right">AZA-Plan (100 %)</th>
                  <th className="p-3 text-right">Bund-Plan (90 %)</th>
                  <th className="p-3 text-right">Eigenanteil-Plan (10 %)</th>
                  <th className="p-3 text-right">Ist erfasst (100 %)</th>
                  <th className="p-3 pr-5 text-right">Abrufquote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {yearBreakdown.map((y) => (
                  <tr
                    key={y.key}
                    onClick={() => onSetGlobalYear(y.key)}
                    className={`hover:bg-zinc-50 cursor-pointer ${
                      activeYear === y.key ? 'bg-zs-signal-gelb/15 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3 pl-5 font-bold text-zs-blau-schwarz">{y.label}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{formatEuro(y.planTotal, 2)}</td>
                    <td className="p-3 text-right font-mono tabular-nums text-[#58B49D]">
                      {formatEuro(y.planBund, 2)}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-[#BA8B68]">
                      {formatEuro(y.planEigen, 2)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold tabular-nums text-zs-blau-schwarz">
                      {formatEuro(y.istTotal, 2)}
                    </td>
                    <td className="p-3 pr-5 text-right font-mono tabular-nums">
                      {y.planTotal > 0 ? ((y.istTotal / y.planTotal) * 100).toFixed(1) : '0.0'} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'personal' && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                  <th className="p-3 pl-5">Stelle im AZA-Finanzierungsplan</th>
                  <th className="p-3">Kategorie</th>
                  <th className="p-3 text-right">2025</th>
                  <th className="p-3 text-right">2026</th>
                  <th className="p-3 text-right">2027</th>
                  <th className="p-3 text-right">2028</th>
                  <th className="p-3 pr-5 text-right">2029</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {activePlan.personal.map((row) => (
                  <tr key={row.pos} className="hover:bg-zinc-50">
                    <td className="p-3 pl-5 font-semibold text-zs-blau-schwarz">{row.pos}</td>
                    <td className="p-3 font-mono text-[11px] text-zinc-500">{row.kat}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{formatEuro(row.gesamt25, 2)}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{formatEuro(row['2026'], 2)}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{formatEuro(row['2027'], 2)}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{formatEuro(row['2028'], 2)}</td>
                    <td className="p-3 pr-5 text-right font-mono tabular-nums">{formatEuro(row.mrz29, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'vergaben' && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                  <th className="p-3 pl-5">Position (AZA)</th>
                  <th className="p-3">profi</th>
                  <th className="p-3 text-right">2025</th>
                  <th className="p-3 text-right">2026</th>
                  <th className="p-3 text-right">2027</th>
                  <th className="p-3 text-right">2028</th>
                  <th className="p-3 pr-5 text-right">2029</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[...activePlan.auftraege, activePlan.miete, activePlan.gegenst, activePlan.reisen].map((row) => (
                  <tr key={row.pos} className="hover:bg-zinc-50">
                    <td className="p-3 pl-5 font-semibold text-zs-blau-schwarz">{row.pos}</td>
                    <td className="p-3 font-mono text-[11px] text-zinc-500">{row.kat}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{formatEuro(row.gesamt25, 2)}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{formatEuro(row['2026'], 2)}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{formatEuro(row['2027'], 2)}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{formatEuro(row['2028'], 2)}</td>
                    <td className="p-3 pr-5 text-right font-mono tabular-nums">{formatEuro(row.mrz29, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'buchungen' && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                  <th className="p-3 pl-5">Datum</th>
                  <th className="p-3">Beschreibung</th>
                  <th className="p-3">Kategorie / AP</th>
                  <th className="p-3 text-right">Betrag (€)</th>
                  <th className="p-3 pr-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {buchungen.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-zinc-400 font-mono">
                      Noch keine manuellen Budget-Buchungen vorhanden.
                    </td>
                  </tr>
                ) : (
                  buchungen.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-50">
                      <td className="p-3 pl-5 font-mono text-zinc-500">{formatDate(b.datum)}</td>
                      <td className="p-3 font-semibold text-zs-blau-schwarz">{b.beschreibung}</td>
                      <td className="p-3 text-zinc-500">
                        {b.kategorie} &middot; {b.arbeitspaket}
                      </td>
                      <td className="p-3 text-right font-mono font-bold tabular-nums">
                        {formatEuro(b.betrag, 2)}
                      </td>
                      <td className="p-3 pr-5 text-center">
                        <select
                          value={b.status}
                          onChange={(e) => onUpdateBuchungStatus(b.id, e.target.value as Buchung['status'])}
                          className="px-2 py-1 border border-zinc-200 rounded text-xs font-mono bg-white cursor-pointer"
                        >
                          <option value="geplant">geplant</option>
                          <option value="reserviert">reserviert</option>
                          <option value="gebucht">gebucht</option>
                          <option value="geprüft">geprüft</option>
                          <option value="freigegeben">freigegeben</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Manuelle Buchung */}
      {showAddBookingModal && (
        <div
          className="fixed inset-0 bg-[#041422]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddBookingModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleBookingSubmit}>
              <div className="p-5 border-b border-zinc-100">
                <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">Manuelle Mittelreservierung / Buchung</h3>
              </div>
              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Datum</label>
                    <input
                      type="date"
                      value={bDatum}
                      onChange={(e) => setBDatum(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg font-mono outline-none focus:border-zs-blau-schwarz"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Betrag (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bBetrag}
                      onChange={(e) => setBBetrag(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold outline-none focus:border-zs-blau-schwarz"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Kategorie</label>
                    <select
                      value={bKat}
                      onChange={(e) => setBKat(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                    >
                      <option>Personalkosten</option>
                      <option>Sachkosten</option>
                      <option>Vergabeaufträge</option>
                      <option>Marketing</option>
                      <option>Reisen</option>
                      <option>IT</option>
                      <option>Sonstiges</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Arbeitspaket</label>
                    <select
                      value={bAp}
                      onChange={(e) => setBAp(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                    >
                      <option>AP1 – Projektmanagement</option>
                      <option>AP2 – Technologietransfer</option>
                      <option>AP3 – Netzwerk</option>
                      <option>AP4 – Öffentlichkeitsarbeit</option>
                      <option>AP5 – Use-Cases</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Beschreibung</label>
                  <input
                    type="text"
                    value={bBeschr}
                    onChange={(e) => setBBeschr(e.target.value)}
                    placeholder="Verwendungsnachweis..."
                    className="px-3 py-2 border border-zinc-300 rounded-lg"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Status</label>
                    <select
                      value={bStatus}
                      onChange={(e) => setBStatus(e.target.value as Buchung['status'])}
                      className="px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                    >
                      <option value="geplant">geplant</option>
                      <option value="reserviert">reserviert</option>
                      <option value="gebucht">gebucht</option>
                      <option value="geprüft">geprüft</option>
                      <option value="freigegeben">freigegeben</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="b-foerd"
                      checked={bFoerd}
                      onChange={(e) => setBFoerd(e.target.checked)}
                      className="w-4 h-4 accent-zs-blau-schwarz"
                    />
                    <label htmlFor="b-foerd" className="text-xs font-semibold text-zs-blau-schwarz cursor-pointer">
                      Förderfähig
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-zinc-100 flex flex-col gap-2 bg-zinc-50/50">
                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {formError}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setShowAddBookingModal(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-zs-signal-gelb text-zs-blau-schwarz font-bold text-xs cursor-pointer"
                  >
                    Buchung speichern
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
