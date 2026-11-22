import React, { useState, useMemo, useEffect } from 'react';
import {
  Mittelabruf,
  PersonalEintrag,
  Rechnungsbeleg,
  Zahlungsanforderung,
  ProfiPositionAmounts,
  ProfiPositionCode,
  MitarbeiterStamm,
  SystemSettings,
} from '../../types';
import { DEFAULT_SETTINGS } from '../../data';
import {
  formatEuro,
  formatDate,
  PROFI_STARK_FKZ,
  PROFI_POSITIONEN,
  BUNDESANTEIL_QUOTE,
  createEmptyProfiAmounts,
  normalizeProfiAmounts,
  mapKategorieToProfiPosition,
  splitPersonalToProfi,
  getFoerderfaehigerRechnungsBetrag,
  validateZaChain,
  addEuro,
  subEuro,
  sumEuro,
  mulPercent,
  roundEuro,
  downloadCSV,
  computeBossEventKassenschluss,
  recordBackupTimestamp,
} from '../../utils';
import {
  Plus,
  Copy,
  Check,
  Calculator,
  Trash2,
  Download,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ArrowLeft,
  Trophy,
  DownloadCloud,
} from 'lucide-react';

export type MittelabrufeSubTab = 'za-rechner' | 'abrufe';
export type AbrufStatusFilter = 'all' | 'open' | 'paid';

interface MittelabrufePageProps {
  mittelabrufe: Mittelabruf[];
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  zas: Zahlungsanforderung[];
  mitarbeiterStamm?: MitarbeiterStamm[];
  settings?: SystemSettings;
  activeYear: string | null;
  activeYearLabel: string;
  onAddMittelabruf: (abruf: Omit<Mittelabruf, 'id'>) => void;
  onUpdateMittelabrufStatus: (id: number, status: Mittelabruf['status']) => void;
  onSaveZa: (za: Omit<Zahlungsanforderung, 'id'> | Zahlungsanforderung) => void;
  onDeleteZa: (id: number) => void;
  initialGeber?: string;
  onGeberChange?: (g: string) => void;
  initialSubTab?: MittelabrufeSubTab;
  onSubTabChange?: (t: MittelabrufeSubTab) => void;
  initialStatusFilter?: AbrufStatusFilter;
  onStatusFilterChange?: (s: AbrufStatusFilter) => void;
  onBackToCockpit?: () => void;
  onQuickBackupSnapshot?: () => void;
  onNavigateToRechnungen?: () => void;
}

export default function MittelabrufePage({
  mittelabrufe,
  personal,
  rechnungen,
  zas,
  mitarbeiterStamm = [],
  settings = DEFAULT_SETTINGS,
  activeYear,
  activeYearLabel,
  onAddMittelabruf,
  onUpdateMittelabrufStatus,
  onSaveZa,
  onDeleteZa,
  initialSubTab = 'za-rechner',
  onSubTabChange,
  initialStatusFilter = 'all',
  onStatusFilterChange,
  onBackToCockpit,
  onQuickBackupSnapshot,
  onNavigateToRechnungen,
}: MittelabrufePageProps) {
  const [subTab, setSubTab] = useState<MittelabrufeSubTab>(initialSubTab);
  const [statusFilter, setStatusFilter] = useState<AbrufStatusFilter>(initialStatusFilter);
  const [backupRefreshTick, setBackupRefreshTick] = useState(0);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const sortedZas = useMemo(
    () => [...zas].sort((a, b) => a.datum.localeCompare(b.datum) || a.id - b.id),
    [zas]
  );

  const zaValidationMap = useMemo(() => validateZaChain(zas), [zas]);
  const gamificationEnabled = settings.gamificationMode !== false;

  const bossEvent = useMemo(
    () => {
      void backupRefreshTick;
      return computeBossEventKassenschluss({ zas, rechnungen, targetYear: 2026 });
    },
    [zas, rechnungen, backupRefreshTick]
  );

  const handleQuickBackupAction = () => {
    recordBackupTimestamp();
    onQuickBackupSnapshot?.();
    setBackupRefreshTick((t) => t + 1);
    setSaveMessage('Monatlicher Revisions-Snapshot erstellt („Backup-Wächter“ aktualisiert).');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // ── ZA-RECHNER STATE ──
  const [selectedZaId, setSelectedZaId] = useState<number | 'new'>(() =>
    sortedZas.length > 0 ? sortedZas[sortedZas.length - 1].id : 'new'
  );
  const [svSharePct, setSvSharePct] = useState<number>(18);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const activeZa = useMemo(
    () => (selectedZaId === 'new' ? null : sortedZas.find((z) => z.id === selectedZaId) || null),
    [sortedZas, selectedZaId]
  );

  const [bezeichnung, setBezeichnung] = useState('ZA 46SK0267X · Entwurf');
  const [kennung, setKennung] = useState('');
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [zeitraumVon, setZeitraumVon] = useState('2026-01-01');
  const [zeitraumBis, setZeitraumBis] = useState('2026-11-30');
  const [stichtagIst, setStichtagIst] = useState('2026-09-30');
  const [spalte2BisherGeplant, setSpalte2BisherGeplant] = useState<number>(0);
  const [istJePos, setIstJePos] = useState<ProfiPositionAmounts>(createEmptyProfiAmounts);
  const [vorschauJePos, setVorschauJePos] = useState<ProfiPositionAmounts>(createEmptyProfiAmounts);
  const [zeile17Zusatz, setZeile17Zusatz] = useState<number>(0);
  const [auszahlungsDatum, setAuszahlungsDatum] = useState<string>('');
  const [zaStatus, setZaStatus] = useState<Zahlungsanforderung['status']>('Entwurf');
  const [notizen, setNotizen] = useState('');

  // Load selected ZA into form
  useEffect(() => {
    if (activeZa) {
      setBezeichnung(activeZa.bezeichnung);
      setKennung(activeZa.kennung || '');
      setDatum(activeZa.datum);
      setZeitraumVon(activeZa.zeitraumVon);
      setZeitraumBis(activeZa.zeitraumBis);
      setStichtagIst(activeZa.stichtagIst);

      const val = zaValidationMap[activeZa.id];
      setSpalte2BisherGeplant(
        activeZa.spalte2BisherGeplant !== undefined
          ? activeZa.spalte2BisherGeplant
          : val?.expectedSpalte2 || 0
      );
      setIstJePos(normalizeProfiAmounts(activeZa.istJePosition));
      setVorschauJePos(normalizeProfiAmounts(activeZa.vorschauJePosition));
      setZeile17Zusatz(roundEuro(activeZa.zeile17ZusatzVerrechnung || 0));
      setAuszahlungsDatum(activeZa.auszahlungsDatum || '');
      setZaStatus(activeZa.status);
      setNotizen(activeZa.notizen || '');
    }
  }, [activeZa, zaValidationMap]);

  // Helper: Auto-Ist aus erfassten 2026+ Belegen mit echter 0812/0817/0820 Trennung & § 15 UStG
  const computeAutoIstUntil = (cutoffDate: string, fromDate: string): ProfiPositionAmounts => {
    const res = createEmptyProfiAmounts();
    const cutoffYear = parseInt(cutoffDate.slice(0, 4), 10) || 2026;
    const cutoffMonth = parseInt(cutoffDate.slice(5, 7), 10) || 12;
    const fromYear = parseInt(fromDate.slice(0, 4), 10) || 2026;
    const fromMonth = parseInt(fromDate.slice(5, 7), 10) || 1;

    const matchingPers = personal.filter((p) => {
      if (p.jahr < fromYear || p.jahr > cutoffYear) return false;
      if (p.jahr === fromYear && p.monat < fromMonth) return false;
      if (p.jahr === cutoffYear && p.monat > cutoffMonth) return false;
      return true;
    });

    const pSplit = splitPersonalToProfi(matchingPers, svSharePct / 100, mitarbeiterStamm);
    res['0812'] = pSplit.pos0812;
    res['0817'] = pSplit.pos0817;
    res['0820'] = pSplit.pos0820;
    res['0843'] = pSplit.pos0843Overhead;

    rechnungen.forEach((r) => {
      const refDate = r.zahlungsdatum || r.rechnungsdatum;
      if (!refDate) return;
      if (refDate < fromDate || refDate > cutoffDate) return;
      const ff = getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt);
      if (ff <= 0) return;
      const pos = mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition);
      res[pos] = addEuro(res[pos], ff);
    });

    return res;
  };

  // Start a new ZA inheriting Spalte 2 = Vor-ZA (Spalte 3 + Spalte 5)
  const handleStartNewZa = () => {
    setSelectedZaId('new');
    const lastZa = sortedZas[sortedZas.length - 1];
    const inheritedSpalte2 = lastZa
      ? addEuro(
          sumEuro(Object.values(lastZa.istJePosition || {})),
          sumEuro(Object.values(lastZa.vorschauJePosition || {}))
        )
      : 0;

    const today = new Date().toISOString().slice(0, 10);
    const twoMonthsLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const yr = today.slice(0, 4);
    const fromDate = `${yr}-01-01`;

    setBezeichnung(`ZA ${PROFI_STARK_FKZ} · ${formatDate(today)}`);
    setKennung('');
    setDatum(today);
    setZeitraumVon(fromDate);
    setZeitraumBis(twoMonthsLater);
    setStichtagIst(today);
    setSpalte2BisherGeplant(inheritedSpalte2);
    setIstJePos(computeAutoIstUntil(today, fromDate));
    setVorschauJePos(createEmptyProfiAmounts());
    setZeile17Zusatz(0);
    setAuszahlungsDatum('');
    setZaStatus('Entwurf');
    setNotizen('Automatisch auf Basis der Vorgänger-ZA (Spalte 2 vererbt) erstellt.');
  };

  const handleLoadAutoIst = () => {
    setIstJePos(computeAutoIstUntil(stichtagIst, zeitraumVon));
    setSaveMessage('Kumulierte Ist-Werte (0812–0843) aus Personal & Sachbelegen übernommen.');
    setTimeout(() => setSaveMessage(null), 2600);
  };

  // Erwartete Spalte 2 aus Vorgänger-ZA (Kettenprüfung)
  const expectedSpalte2ForCurrent = useMemo(() => {
    if (selectedZaId === 'new') {
      const last = sortedZas[sortedZas.length - 1];
      if (!last) return 0;
      return addEuro(
        sumEuro(Object.values(last.istJePosition || {})),
        sumEuro(Object.values(last.vorschauJePosition || {}))
      );
    }
    const idx = sortedZas.findIndex((z) => z.id === selectedZaId);
    if (idx <= 0) return 0;
    const prev = sortedZas[idx - 1];
    return addEuro(
      sumEuro(Object.values(prev.istJePosition || {})),
      sumEuro(Object.values(prev.vorschauJePosition || {}))
    );
  }, [selectedZaId, sortedZas]);

  const deltaSpalte2Live = useMemo(
    () => subEuro(spalte2BisherGeplant, expectedSpalte2ForCurrent),
    [spalte2BisherGeplant, expectedSpalte2ForCurrent]
  );
  const isLiveChainValid = Math.abs(deltaSpalte2Live) <= 0.05;

  // Exakte profi-online Zeilenrechnung (Cent-Integer Arithmetik)
  const sumIst = useMemo(() => sumEuro(Object.values(istJePos)), [istJePos]);
  const sumVorschau = useMemo(() => sumEuro(Object.values(vorschauJePos)), [vorschauJePos]);

  const zeile14Anzurechnen = useMemo(
    () => mulPercent(spalte2BisherGeplant, BUNDESANTEIL_QUOTE * 100),
    [spalte2BisherGeplant]
  );
  const zeile15BundesanteilIst = useMemo(
    () => mulPercent(sumIst, BUNDESANTEIL_QUOTE * 100),
    [sumIst]
  );
  const zeile16Kassenbestand = useMemo(
    () => subEuro(zeile14Anzurechnen, zeile15BundesanteilIst),
    [zeile14Anzurechnen, zeile15BundesanteilIst]
  );
  const zeile18BundesanteilVorschau = useMemo(
    () => mulPercent(sumVorschau, BUNDESANTEIL_QUOTE * 100),
    [sumVorschau]
  );
  const zeile19Angefordert = useMemo(
    () => Math.max(0, subEuro(subEuro(zeile18BundesanteilVorschau, zeile16Kassenbestand), zeile17Zusatz)),
    [zeile18BundesanteilVorschau, zeile16Kassenbestand, zeile17Zusatz]
  );

  const handleSaveCurrentZa = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Zahlungsanforderung, 'id'> = {
      bezeichnung: bezeichnung.trim() || `ZA ${datum}`,
      kennung: kennung.trim() || undefined,
      datum,
      zeitraumVon,
      zeitraumBis,
      stichtagIst,
      spalte2BisherGeplant: roundEuro(spalte2BisherGeplant),
      istJePosition: normalizeProfiAmounts(istJePos),
      vorschauJePosition: normalizeProfiAmounts(vorschauJePos),
      kassenbestand: zeile16Kassenbestand,
      erhalteneBundesmittel: zeile14Anzurechnen,
      zeile14BisherAnzurechnen: zeile14Anzurechnen,
      zeile17ZusatzVerrechnung: roundEuro(zeile17Zusatz),
      auszahlungsDatum: auszahlungsDatum || null,
      bundesanteilQuote: BUNDESANTEIL_QUOTE,
      zeile19Anforderung: zeile19Angefordert,
      belegVollstaendig: true,
      manuelleKorrektur: !isLiveChainValid,
      notizen: notizen.trim(),
      pdfHash: activeZa?.pdfHash,
      status: zaStatus,
    };

    if (activeZa) {
      onSaveZa({ ...payload, id: activeZa.id });
    } else {
      onSaveZa(payload);
    }
    setSaveMessage('Zahlungsanforderung GoBD-konform im System gespeichert.');
    setTimeout(() => setSaveMessage(null), 2600);
  };

  const handleCopyProfiSummary = () => {
    const lines = [
      `PROFI-ONLINE ZAHLUNGSANFORDERUNG (FKZ ${PROFI_STARK_FKZ})`,
      `Bezeichnung: ${bezeichnung}${kennung ? ` | Kennung: ${kennung}` : ''}`,
      `ZA-Datum: ${formatDate(datum)} | Zeitraum: ${formatDate(zeitraumVon)} – ${formatDate(zeitraumBis)}`,
      `------------------------------------------------------------------------`,
      `Spalte 2 (Bisher im Haushaltsjahr geplant/abger.): ${formatEuro(spalte2BisherGeplant, 2)}`,
      `Spalte 3 (Kumulierte Ist-Ausgaben bis ${formatDate(stichtagIst)}): ${formatEuro(sumIst, 2)}`,
      ...PROFI_POSITIONEN.map(
        (p) =>
          `  Pos. ${p.displayCode} (${p.kurzBezeichnung}): Sp.3 Ist = ${formatEuro(istJePos[p.code], 2)} | Sp.5 Vorschau = ${formatEuro(vorschauJePos[p.code], 2)}`
      ),
      `Spalte 5 (Geplante Ausgaben Zweimonats-Vorschau): ${formatEuro(sumVorschau, 2)}`,
      `------------------------------------------------------------------------`,
      `Zeile 14 (Bisher anzurechnen, 90 % von Spalte 2): ${formatEuro(zeile14Anzurechnen, 2)}`,
      `Zeile 15 (90 % Bundesanteil aus Spalte 3 Ist):    ${formatEuro(zeile15BundesanteilIst, 2)}`,
      `Zeile 16 (Derzeitiger Kassenbestand Z.14 - Z.15): ${formatEuro(zeile16Kassenbestand, 2)}`,
      `Zeile 17 (Zusätzlich zu verrechnen):              ${formatEuro(zeile17Zusatz, 2)}`,
      `Zeile 18 (90 % Bundesanteil aus Spalte 5 Vorschau):${formatEuro(zeile18BundesanteilVorschau, 2)}`,
      `Zeile 19 (ANGEFORDERTE BUNDESMITTEL):             ${formatEuro(zeile19Angefordert, 2)}`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId('za');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── TAB 2: KLASSISCHE MITTELABRUFE ──
  const [showNewAbrufModal, setShowNewAbrufModal] = useState(false);
  const [abrufNummer, setAbrufNummer] = useState('');
  const [abrufVon, setAbrufVon] = useState('2026-01-01');
  const [abrufBis, setAbrufBis] = useState('2026-03-31');
  const [abrufJahr, setAbrufJahr] = useState(2026);
  const [abrufQuartal, setAbrufQuartal] = useState(1);
  const [abrufBeantragt, setAbrufBeantragt] = useState('');

  const filteredAbrufe = useMemo(() => {
    return mittelabrufe.filter((a) => {
      if (activeYear) {
        if (activeYear === 'gesamt25' && a.foerderjahr !== 2025) return false;
        if (activeYear === 'mrz29' && a.foerderjahr !== 2029) return false;
        if (activeYear !== 'gesamt25' && activeYear !== 'mrz29' && String(a.foerderjahr) !== activeYear)
          return false;
      }
      if (statusFilter === 'open') return (a.differenz || 0) > 0.01 || a.status !== 'ARCHIVIERT';
      if (statusFilter === 'paid') return a.status === 'ARCHIVIERT' || (a.eingegangen || 0) >= (a.beantragt || 0);
      return true;
    });
  }, [mittelabrufe, activeYear, statusFilter]);

  const handleAbrufSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(abrufBeantragt) || 0;
    onAddMittelabruf({
      abrufnummer: abrufNummer.trim() || `BAFA-${abrufJahr}-Q${abrufQuartal}`,
      zeitraumVon: abrufVon,
      zeitraumBis: abrufBis,
      mittelgeber: 'BAFA_BUND',
      foerderjahr: abrufJahr,
      quartal: abrufQuartal,
      beantragt: roundEuro(val),
      eingegangen: 0,
      differenz: roundEuro(val),
      status: 'EINGEREICHT',
    });
    setAbrufNummer('');
    setAbrufBeantragt('');
    setShowNewAbrufModal(false);
  };

  const activeZaValidation = activeZa ? zaValidationMap[activeZa.id] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            profi-online ZA &amp; Mittelabrufe
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            FKZ {PROFI_STARK_FKZ} &middot; 90 % Bund / 10 % Eigenanteil &middot; {activeYearLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg border border-zinc-200">
            <button
              onClick={() => {
                setSubTab('za-rechner');
                onSubTabChange?.('za-rechner');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                subTab === 'za-rechner'
                  ? 'bg-white text-zs-blau-schwarz shadow-xs'
                  : 'text-zinc-600 hover:text-zs-blau-schwarz'
              }`}
            >
              ZA-Rechner ({sortedZas.length})
            </button>
            <button
              onClick={() => {
                setSubTab('abrufe');
                onSubTabChange?.('abrufe');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                subTab === 'abrufe'
                  ? 'bg-white text-zs-blau-schwarz shadow-xs'
                  : 'text-zinc-600 hover:text-zs-blau-schwarz'
              }`}
            >
              Mittelabrufe ({mittelabrufe.length})
            </button>
          </div>
        </div>
      </div>

      {subTab === 'za-rechner' ? (
        <div className="space-y-5">
          {/* Boss-Event: Operation Kassenschluss 15. November / Jahresabschluss-Prüfung */}
          <div
            className={`rounded-xl border p-5 space-y-4 ${
              gamificationEnabled
                ? 'bg-[#041422] text-white border-[#1b3145]'
                : 'bg-white text-zs-blau-schwarz border-zinc-200'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {gamificationEnabled && <Trophy className="w-4 h-4 text-zs-signal-gelb shrink-0" />}
                  <h2 className="font-display font-bold text-sm tracking-tight">
                    {gamificationEnabled
                      ? `Operation Kassenschluss ${bossEvent.targetYear} (Stichtag 15. November)`
                      : `Jahresabschluss-Prüfung ${bossEvent.targetYear} (Frist 15. November)`}
                  </h2>
                </div>
                <p className={`text-[11px] font-mono mt-1 tabular-nums ${gamificationEnabled ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {bossEvent.daysUntilClose >= 0
                    ? `Noch ${bossEvent.daysUntilClose} Tage bis Kassenschluss ${formatDate(bossEvent.deadlineDate)}`
                    : `Stichtag ${formatDate(bossEvent.deadlineDate)} erreicht`}
                  {' · '}Fortschritt: <strong>{bossEvent.progressPct} %</strong>
                  {bossEvent.trophyUnlocked && (
                    <span className={gamificationEnabled ? ' · text-zs-signal-gelb font-bold' : ' · text-emerald-700 font-bold'}>
                      {' · '}{gamificationEnabled ? 'Jahresabschluss-Trophäe freigeschaltet' : 'Alle 3 Prüfschritte erfüllt'}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onNavigateToRechnungen && (
                  <button
                    type="button"
                    onClick={onNavigateToRechnungen}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      gamificationEnabled
                        ? 'border-white/20 text-white hover:bg-white/10'
                        : 'border-zinc-200 text-zs-blau-schwarz hover:bg-zinc-50'
                    }`}
                  >
                    Q3/Q4-Belege prüfen
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleQuickBackupAction}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    gamificationEnabled
                      ? 'bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-[#e8e800]'
                      : 'bg-zs-blau-schwarz text-white hover:bg-[#08243d]'
                  }`}
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Monats-Snapshot sichern</span>
                </button>
              </div>
            </div>

            <div className={`w-full h-1.5 rounded-full overflow-hidden ${gamificationEnabled ? 'bg-white/10' : 'bg-zinc-100'}`}>
              <div
                className={`h-full transition-all duration-500 ${
                  bossEvent.trophyUnlocked
                    ? 'bg-emerald-500'
                    : gamificationEnabled
                    ? 'bg-zs-signal-gelb'
                    : 'bg-zs-blau-schwarz'
                }`}
                style={{ width: `${bossEvent.progressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {bossEvent.phases.map((phase) => (
                <div
                  key={phase.id}
                  className={`p-3 rounded-lg border ${
                    phase.completed
                      ? gamificationEnabled
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-100'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : gamificationEnabled
                      ? 'bg-white/5 border-white/10 text-zinc-200'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-bold text-[11px]">
                    <span>{gamificationEnabled ? phase.title : phase.cleanTitle}</span>
                    {phase.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 opacity-50 shrink-0" />
                    )}
                  </div>
                  <p className={`text-[11px] mt-1 leading-snug ${gamificationEnabled ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {phase.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Linke Spalte: Historische ZAs & Ketten-Validierung */}
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-sm text-zs-blau-schwarz">
                  ZA-Historie &amp; Kette
                </h2>
                <button
                  onClick={handleStartNewZa}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-zs-blau-schwarz text-white hover:bg-[#08243d] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-zs-signal-gelb" />
                  <span>Neue ZA</span>
                </button>
              </div>

              <div className="space-y-2">
                {sortedZas.map((z) => {
                  const val = zaValidationMap[z.id];
                  const isSel = selectedZaId === z.id;
                  return (
                    <div
                      key={z.id}
                      onClick={() => setSelectedZaId(z.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSel
                          ? 'border-zs-blau-schwarz bg-[#041422]/[0.03]'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-zs-blau-schwarz truncate">
                            {z.bezeichnung}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                            {formatDate(z.datum)}
                            {z.kennung ? ` · Kennung ${z.kennung}` : ''}
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-zs-blau-schwarz tabular-nums shrink-0">
                          {formatEuro(z.zeile19Anforderung, 2)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            z.status === 'Abgerechnet'
                              ? 'bg-emerald-50 text-emerald-700'
                              : z.status === 'Eingereicht'
                              ? 'bg-sky-50 text-sky-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {z.status}
                        </span>
                        {val && !val.isChainValid && (
                          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            Kette Δ {formatEuro(val.deltaSpalte2, 2)}
                          </span>
                        )}
                        {val?.hasPositiveKassenbestand && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Kassenbestand +{formatEuro(val.zeile16Kassenbestand, 2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {activeZaValidation?.hasPositiveKassenbestand && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>ANBest-P 2-Monats-Verwendungsfrist</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Aus dieser ZA verbleibt ein positiver Kassenbestand von{' '}
                  <strong className="font-mono">{formatEuro(activeZaValidation.zeile16Kassenbestand, 2)}</strong>.
                  Mittel müssen bis spätestens{' '}
                  <strong className="font-mono">{formatDate(activeZaValidation.twoMonthDeadline)}</strong>{' '}
                  zweckentsprechend verausgabt sein.
                </p>
              </div>
            )}
          </div>

          {/* Rechte Spalte: Vollständiger profi-online ZA-Rechner */}
          <form onSubmit={handleSaveCurrentZa} className="xl:col-span-8 space-y-5">
            {!isLiveChainValid && (
              <div className="bg-red-50 border border-red-300 text-red-900 rounded-xl p-4 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    ZA-Ketten-Konsistenzwarnung: Spalte 2 weicht von Vorgänger-ZA ab!
                  </div>
                  <div className="font-mono text-[11px] mt-1 tabular-nums">
                    Erwartet (Vor-ZA Sp. 3 + Sp. 5): <strong>{formatEuro(expectedSpalte2ForCurrent, 2)}</strong> |
                    Eingetragen in Spalte 2: <strong>{formatEuro(spalte2BisherGeplant, 2)}</strong> (Δ{' '}
                    {formatEuro(deltaSpalte2Live, 2)})
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpalte2BisherGeplant(expectedSpalte2ForCurrent)}
                    className="mt-2 px-2.5 py-1 rounded bg-red-700 text-white text-[11px] font-bold hover:bg-red-800 cursor-pointer"
                  >
                    Spalte 2 auf {formatEuro(expectedSpalte2ForCurrent, 2)} korrigieren
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-5">
              {/* Kopfdaten */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-zs-blau-schwarz flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[#58B49D]" />
                    <span>{selectedZaId === 'new' ? 'Neue profi-online Zahlungsanforderung' : bezeichnung}</span>
                  </h2>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    Exakte Spaltenlogik (Sp. 2–5) &amp; Zeilen 14–19 nach BAFA / profi-online
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadAutoIst}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
                  >
                    Ist-Werte aus Belegen laden
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyProfiSummary}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === 'za' ? <Check className="w-3.5 h-3.5 text-[#58B49D]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'za' ? 'Kopiert' : 'profi-online Werte kopieren'}</span>
                  </button>
                </div>
              </div>

              {/* Stammdaten Felder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Bezeichnung</label>
                  <input
                    type="text"
                    value={bezeichnung}
                    onChange={(e) => setBezeichnung(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">profi-online Kennung</label>
                  <input
                    type="text"
                    placeholder="z. B. 3141261-7"
                    value={kennung}
                    onChange={(e) => setKennung(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono outline-none focus:border-zs-blau-schwarz"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Status</label>
                  <select
                    value={zaStatus}
                    onChange={(e) => setZaStatus(e.target.value as Zahlungsanforderung['status'])}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white outline-none focus:border-zs-blau-schwarz"
                  >
                    <option value="Entwurf">Entwurf</option>
                    <option value="Eingereicht">Eingereicht</option>
                    <option value="Abgerechnet">Abgerechnet</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">ZA-Datum</label>
                  <input
                    type="date"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono outline-none focus:border-zs-blau-schwarz"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Ist-Stichtag</label>
                  <input
                    type="date"
                    value={stichtagIst}
                    onChange={(e) => setStichtagIst(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono outline-none focus:border-zs-blau-schwarz"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Zeitraum Bis (Vorschau)</label>
                  <input
                    type="date"
                    value={zeitraumBis}
                    onChange={(e) => setZeitraumBis(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono outline-none focus:border-zs-blau-schwarz"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Wertstellung / Auszahlung</label>
                  <input
                    type="date"
                    value={auszahlungsDatum}
                    onChange={(e) => setAuszahlungsDatum(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono outline-none focus:border-zs-blau-schwarz"
                  />
                </div>
              </div>

              {/* Spalte 2 & SV-Quote */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                    Spalte 2: Bisher im Haushaltsjahr abgerufen/geplant (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={spalte2BisherGeplant}
                    onChange={(e) => setSpalte2BisherGeplant(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono font-bold bg-white outline-none focus:border-zs-blau-schwarz tabular-nums"
                  />
                  <div className="text-[10px] font-mono text-zinc-500 mt-1 tabular-nums">
                    Erwartet aus Vor-ZA: {formatEuro(expectedSpalte2ForCurrent, 2)}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                    Fallback-SV-Satz (ohne DATEV-Split) ({svSharePct} %)
                  </label>
                  <input
                    type="range"
                    min="14"
                    max="24"
                    step="0.5"
                    value={svSharePct}
                    onChange={(e) => setSvSharePct(parseFloat(e.target.value))}
                    className="mt-3 w-full accent-zs-blau-schwarz"
                  />
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Stammdaten (0812/0817/0820) &amp; DATEV-Splits haben Vorrang.
                  </div>
                </div>
              </div>

              {/* Tabelle Positionen 0812–0843: Spalte 3 Ist & Spalte 5 Vorschau */}
              <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[10px] text-zinc-500 uppercase">
                      <th className="py-2.5 px-4">Pos.</th>
                      <th className="py-2.5 px-3">profi-online Position</th>
                      <th className="py-2.5 px-3 text-right">Spalte 3: Ist kumuliert (€)</th>
                      <th className="py-2.5 px-4 text-right">Spalte 5: Vorschau 2 Mon. (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {PROFI_POSITIONEN.map((pos) => (
                      <tr key={pos.code}>
                        <td className="py-2.5 px-4 font-mono font-bold text-zs-blau-schwarz">
                          {pos.displayCode}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-zinc-700">{pos.bezeichnung}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={istJePos[pos.code]}
                            onChange={(e) =>
                              setIstJePos((prev) => ({
                                ...prev,
                                [pos.code]: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-36 px-2.5 py-1.5 text-right border border-zinc-300 rounded-lg font-mono text-xs tabular-nums outline-none focus:border-zs-blau-schwarz"
                          />
                        </td>
                        <td className="py-2 px-4 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={vorschauJePos[pos.code]}
                            onChange={(e) =>
                              setVorschauJePos((prev) => ({
                                ...prev,
                                [pos.code]: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-36 px-2.5 py-1.5 text-right border border-zinc-300 rounded-lg font-mono text-xs tabular-nums outline-none focus:border-zs-blau-schwarz"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-50 border-t border-zinc-200 font-mono font-bold text-xs text-zs-blau-schwarz">
                      <td className="py-3 px-4" colSpan={2}>
                        Summe Spalte 3 &amp; Spalte 5 (100 % Ausgabenbasis)
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatEuro(sumIst, 2)}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatEuro(sumVorschau, 2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Zeile 14–19 profi-online Berechnungsmatrix */}
              <div className="bg-[#041422] text-white rounded-xl p-5 space-y-3 font-mono text-xs">
                <div className="text-[11px] uppercase tracking-wider text-[#58B49D] font-bold">
                  Berechnung Zeilen 14–19 (90 % Bundesanteil)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                    <span className="text-zinc-300">Zeile 14 · Bisher anzurechnen (90 % Sp. 2)</span>
                    <span className="font-bold tabular-nums">{formatEuro(zeile14Anzurechnen, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                    <span className="text-zinc-300">Zeile 15 · 90 % Bundesanteil aus Spalte 3</span>
                    <span className="font-bold tabular-nums">{formatEuro(zeile15BundesanteilIst, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                    <span className="text-zinc-300">Zeile 16 · Kassenbestand (Z.14 − Z.15)</span>
                    <span
                      className={`font-bold tabular-nums ${
                        zeile16Kassenbestand > 0.01 ? 'text-amber-300' : 'text-zinc-200'
                      }`}
                    >
                      {zeile16Kassenbestand > 0 ? `+${formatEuro(zeile16Kassenbestand, 2)}` : formatEuro(zeile16Kassenbestand, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5 gap-2">
                    <span className="text-zinc-300">Zeile 17 · Zusätzlich zu verrechnen</span>
                    <input
                      type="number"
                      step="0.01"
                      value={zeile17Zusatz}
                      onChange={(e) => setZeile17Zusatz(parseFloat(e.target.value) || 0)}
                      className="w-28 px-2 py-1 text-right bg-white/10 border border-white/20 rounded text-xs font-bold text-white tabular-nums outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                    <span className="text-zinc-300">Zeile 18 · 90 % Bundesanteil Vorschau (Sp. 5)</span>
                    <span className="font-bold tabular-nums">{formatEuro(zeile18BundesanteilVorschau, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-zs-signal-gelb/15 border border-zs-signal-gelb/40 px-3 py-2 rounded-lg">
                    <span className="text-zs-signal-gelb font-bold">Zeile 19 · Angeforderte Bundesmittel</span>
                    <span className="text-lg font-extrabold text-zs-signal-gelb tabular-nums">
                      {formatEuro(zeile19Angefordert, 2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notizen & Aktionen */}
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Notizen / Prüfhistorie</label>
                <input
                  type="text"
                  value={notizen}
                  onChange={(e) => setNotizen(e.target.value)}
                  placeholder="z. B. Übertrag Vorperiode, besondere Erläuterung..."
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-2">
                  {activeZa &&
                    (deleteConfirmId === activeZa.id ? (
                      <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded border border-red-200 text-xs">
                        <span className="text-red-700 font-bold">ZA löschen?</span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteZa(activeZa.id);
                            setDeleteConfirmId(null);
                            setSelectedZaId('new');
                          }}
                          className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 text-[11px] font-bold cursor-pointer"
                        >
                          Nein
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(activeZa.id)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Entfernen</span>
                      </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                  {saveMessage && (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{saveMessage}</span>
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-zs-signal-gelb text-zs-blau-schwarz font-bold text-xs hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-colors cursor-pointer"
                  >
                    ZA speichern &amp; im Audit-Log sichern
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
        </div>
      ) : (
        /* ── TAB 2: KLASSISCHE MITTELABRUFE ── */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg border border-zinc-200 text-xs">
              {(
                [
                  { id: 'all', label: 'Alle' },
                  { id: 'open', label: 'Offen' },
                  { id: 'paid', label: 'Eingegangen / Archiv' },
                ] as { id: AbrufStatusFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setStatusFilter(f.id);
                    onStatusFilterChange?.(f.id);
                  }}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    statusFilter === f.id ? 'bg-white text-zs-blau-schwarz' : 'text-zinc-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  downloadCSV(
                    'Mittelabrufe_BAFA.csv',
                    [
                      ['Abrufnummer', 'Von', 'Bis', 'Jahr', 'Beantragt', 'Eingegangen', 'Differenz', 'Status'],
                      ...filteredAbrufe.map((a) => [
                        a.abrufnummer,
                        a.zeitraumVon,
                        a.zeitraumBis,
                        a.foerderjahr,
                        a.beantragt,
                        a.eingegangen,
                        a.differenz,
                        a.status,
                      ]),
                    ]
                  )
                }
                className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV Export</span>
              </button>
              <button
                onClick={() => setShowNewAbrufModal(true)}
                className="px-4 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold hover:bg-[#08243d] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-zs-signal-gelb" />
                <span>Mittelabruf erfassen</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                    <th className="p-3 pl-5">Abrufnummer</th>
                    <th className="p-3">Zeitraum</th>
                    <th className="p-3">Förderjahr / Q</th>
                    <th className="p-3 text-right">Beantragt (€)</th>
                    <th className="p-3 text-right">Eingegangen (€)</th>
                    <th className="p-3 text-right">Offen (€)</th>
                    <th className="p-3 pr-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredAbrufe.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50">
                      <td className="p-3 pl-5 font-mono font-bold text-zs-blau-schwarz">{a.abrufnummer}</td>
                      <td className="p-3 font-mono text-zinc-600">
                        {formatDate(a.zeitraumVon)} – {formatDate(a.zeitraumBis)}
                      </td>
                      <td className="p-3 font-mono text-zinc-600">
                        {a.foerderjahr} &middot; Q{a.quartal}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold tabular-nums">
                        {formatEuro(a.beantragt, 2)}
                      </td>
                      <td className="p-3 text-right font-mono text-[#58B49D] font-semibold tabular-nums">
                        {formatEuro(a.eingegangen, 2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-red-700 tabular-nums">
                        {formatEuro(a.differenz, 2)}
                      </td>
                      <td className="p-3 pr-5 text-center">
                        <select
                          value={a.status}
                          onChange={(e) =>
                            onUpdateMittelabrufStatus(a.id, e.target.value as Mittelabruf['status'])
                          }
                          className="px-2 py-1 rounded border border-zinc-200 text-xs font-mono bg-white cursor-pointer"
                        >
                          <option value="ENTWURF">ENTWURF</option>
                          <option value="IN_PRUEFUNG">IN_PRUEFUNG</option>
                          <option value="EINGEREICHT">EINGEREICHT</option>
                          <option value="ARCHIVIERT">ARCHIVIERT</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Neuer Mittelabruf */}
      {showNewAbrufModal && (
        <div
          className="fixed inset-0 bg-[#041422]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewAbrufModal(false)}
        >
          <form
            onSubmit={handleAbrufSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">Neuen BAFA-Mittelabruf anlegen</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Abrufnummer</label>
                <input
                  type="text"
                  required
                  placeholder="BAFA-2026-Q3"
                  value={abrufNummer}
                  onChange={(e) => setAbrufNummer(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Zeitraum Von</label>
                  <input
                    type="date"
                    value={abrufVon}
                    onChange={(e) => setAbrufVon(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Zeitraum Bis</label>
                  <input
                    type="date"
                    value={abrufBis}
                    onChange={(e) => setAbrufBis(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Förderjahr</label>
                  <input
                    type="number"
                    value={abrufJahr}
                    onChange={(e) => setAbrufJahr(parseInt(e.target.value) || 2026)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Quartal</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={abrufQuartal}
                    onChange={(e) => setAbrufQuartal(parseInt(e.target.value) || 1)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Beantragter Betrag (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={abrufBeantragt}
                  onChange={(e) => setAbrufBeantragt(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowNewAbrufModal(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold cursor-pointer"
              >
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
