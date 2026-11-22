import React, { useMemo } from 'react';
import {
  PersonalEintrag,
  Rechnungsbeleg,
  Mittelabruf,
  UseCase,
  Vergabe,
  Task,
  Zahlungsanforderung,
  ProfiPositionCode,
  MitarbeiterStamm,
  SystemSettings,
  OekoprofitCheckup,
  EventLogItem,
  ComplianceStreaks,
  StreakResult,
} from '../../types';
import { applyPersistedUnlocks, DisplayAchievement } from '../../gamification';
import { TIER_STYLE } from '../AchievementToast';
import {
  AZA_JAHRE,
  DEFAULT_SETTINGS,
  AZA_VERSION_META,
  SEED_EVENTS,
  getAzaPlan,
  splitAzaPersonalPlan0812_0817_0820,
} from '../../data';
import {
  formatEuro,
  formatDate,
  PROFI_STARK_FKZ,
  PROFI_POSITIONEN,
  mapKategorieToProfiPosition,
  splitPersonalToProfi,
  getFoerderfaehigerRechnungsBetrag,
  validateZaChain,
  ZaChainValidation,
  addEuro,
  subEuro,
  sumEuro,
  mulPercent,
  splitPercent9010,
  evaluateProjectAchievements,
  computeBossEventKassenschluss,
  computeResourcePipeline,
  computeExecutiveAdvisors,
  computeChronikTimeline,
  TIER_LABEL,
} from '../../utils';
import HexTransformationMap from '../HexTransformationMap';
import { BossEventsPanel, WeeklyMissionsPanel } from '../MissionBoard';
import { CampaignPanel, TeamGoalsPanel } from '../CampaignPanel';
import { computeBossEvents } from '../../bossEvents';
import { computeCampaign, computeTeamGoals } from '../../campaign';
import { computeWeeklyMissions, todayISO } from '../../missions';
import ExecutiveAdvisorsPanel from '../ExecutiveAdvisorsPanel';
import ResourceSankeyPipeline from '../ResourceSankeyPipeline';
import ChronikScrubber from '../ChronikScrubber';
import { BudgetFocus, BudgetTab } from './BudgetPage';
import { AbrufStatusFilter, MittelabrufeSubTab } from './MittelabrufePage';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CheckSquare,
  Square,
  ArrowRight,
  AlertTriangle,
  ShieldAlert,
  Clock,
  EyeOff,
  Award,
  CheckCircle2,
  Flag,
  Flame,
  Lock,
  Sparkles,
} from 'lucide-react';

export interface CockpitDrilldownFilters {
  personalQuarter?: string;
  rechnungenKategorie?: string;
  rechnungenProfiPos?: ProfiPositionCode | '';
  mittelabrufeGeber?: string;
  mittelabrufeSubTab?: MittelabrufeSubTab;
  mittelabrufeStatusFilter?: AbrufStatusFilter;
  budgetTab?: BudgetTab;
  budgetFocus?: BudgetFocus;
  aufgabenStatus?: string;
  useCaseId?: number | null;
}

interface ExecutiveCockpitProps {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  mittelabrufe: Mittelabruf[];
  zas?: Zahlungsanforderung[];
  usecases: UseCase[];
  vergaben: Vergabe[];
  oekoprofitCheckups?: OekoprofitCheckup[];
  mitarbeiterStamm?: MitarbeiterStamm[];
  settings?: SystemSettings;
  activeYear: string | null;
  activeYearLabel: string;
  tasks?: Task[];
  events?: EventLogItem[];
  achievements?: DisplayAchievement[]; // inkl. dauerhaft gespeicherter Freischaltungen (aus App)
  streaks?: ComplianceStreaks;
  auditChain?: { valid: boolean; checkedCount: number };
  onUpdateTask?: (id: number, task: Partial<Task>) => void;
  onUpdateUseCase?: (id: number, uc: Partial<UseCase>) => void;
  onNavigateDetail: (page: string, filters: CockpitDrilldownFilters) => void;
}

export default function ExecutiveCockpit({
  personal,
  rechnungen,
  mittelabrufe,
  zas = [],
  usecases,
  vergaben,
  oekoprofitCheckups = [],
  mitarbeiterStamm = [],
  settings = DEFAULT_SETTINGS,
  activeYear,
  activeYearLabel,
  tasks = [],
  events = SEED_EVENTS,
  achievements: achievementsProp,
  streaks,
  auditChain,
  onUpdateTask,
  onUpdateUseCase,
  onNavigateDetail,
}: ExecutiveCockpitProps) {
  const gamificationEnabled = settings.gamificationMode !== false;
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
  const yearAbr = useMemo(
    () => mittelabrufe.filter((a) => scopeMatches(a.foerderjahr)),
    [mittelabrufe, activeYear]
  );

  // Zentrale Planwerte aus gewählter AZA-Planversion (90% Bund / 10% Eigenanteil)
  const planGesamt = useMemo(
    () =>
      sumEuro(
        yearKeys.map(
          (yk) => (activePlan.foerder as Record<string, { gesamt: number }>)[yk]?.gesamt || 0
        )
      ),
    [activePlan, yearKeys]
  );
  const planSplit = useMemo(() => splitPercent9010(planGesamt), [planGesamt]);

  // Kumulierte Ist-Werte aus Personal + Sachbelegen (§ 15 UStG berücksichtigt)
  const persTotals = useMemo(
    () => splitPersonalToProfi(yearPers, 0.18, mitarbeiterStamm),
    [yearPers, mitarbeiterStamm]
  );

  const sachByPos = useMemo(() => {
    const sums: Record<ProfiPositionCode, number> = {
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
      sums[pos] = addEuro(sums[pos], ff);
    });
    return sums;
  }, [yearRech, settings.vorsteuerabzugsberechtigt]);

  const posIst: Record<ProfiPositionCode, number> = useMemo(
    () => ({
      '0812': persTotals.pos0812,
      '0817': persTotals.pos0817,
      '0820': persTotals.pos0820,
      '0831': sachByPos['0831'],
      '0835': sachByPos['0835'],
      '0843': addEuro(persTotals.pos0843Overhead, sachByPos['0843']),
    }),
    [persTotals, sachByPos]
  );

  const istGesamt = useMemo(() => sumEuro(Object.values(posIst)), [posIst]);
  const istSplit = useMemo(() => splitPercent9010(istGesamt), [istGesamt]);

  // Bundesmittel-Saldo & Eigenanteil
  const bafaRest = subEuro(planSplit.bund90, istSplit.bund90);
  const bafaQuotePct = planSplit.bund90 > 0 ? Math.min(100, (istSplit.bund90 / planSplit.bund90) * 100) : 0;
  const eigenQuotePct = planSplit.eigen10 > 0 ? Math.min(100, (istSplit.eigen10 / planSplit.eigen10) * 100) : 0;

  // Offene Mittelabrufe & profi-online ZAs
  const abrufBeantragt = useMemo(() => sumEuro(yearAbr.map((a) => a.beantragt || 0)), [yearAbr]);
  const abrufEingegangen = useMemo(() => sumEuro(yearAbr.map((a) => a.eingegangen || 0)), [yearAbr]);
  const offeneForderungen = Math.max(0, subEuro(abrufBeantragt, abrufEingegangen));

  const sortedZas = useMemo(
    () => [...zas].sort((a, b) => a.datum.localeCompare(b.datum) || a.id - b.id),
    [zas]
  );
  const latestZa = sortedZas[sortedZas.length - 1] || null;
  const zaValidationMap = useMemo<Record<number, ZaChainValidation>>(
    () => validateZaChain(zas),
    [zas]
  );

  // ANBest-P 2-Monats-Verwendungsfrist-Alert
  const kassenbestandAlerts = useMemo<ZaChainValidation[]>(() => {
    return (Object.values(zaValidationMap) as ZaChainValidation[]).filter(
      (v) => v.hasPositiveKassenbestand
    );
  }, [zaValidationMap]);

  const chainErrors = useMemo<ZaChainValidation[]>(() => {
    return (Object.values(zaValidationMap) as ZaChainValidation[]).filter(
      (v) => !v.isChainValid
    );
  }, [zaValidationMap]);

  // Planwerte je profi-online Position (0812–0843)
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

  // 20-%-Umschichtungs-Wächter (ANBest-P Überschreitung >120 %)
  const overBudgetPositions = useMemo(() => {
    return PROFI_POSITIONEN.filter((pos) => {
      const p = posPlan[pos.code] || 0;
      const i = posIst[pos.code] || 0;
      return p > 0 && i > p * 1.2;
    });
  }, [posPlan, posIst]);

  // Verfalls-Radar (15.11. Kassenschluss): aktuelles Scope-Restbudget in 0835/0843
  const unspentAlert2026 = useMemo(() => {
    const plan0835 = posPlan['0835'] || 0;
    const ist0835 = posIst['0835'] || 0;
    const rest0835 = Math.max(0, subEuro(plan0835, ist0835));
    return {
      rest0835,
      ratioOpen: plan0835 > 0 ? (rest0835 / plan0835) * 100 : 0,
    };
  }, [posPlan, posIst]);

  const profiChartData = useMemo(
    () =>
      PROFI_POSITIONEN.map((pos) => ({
        code: pos.displayCode,
        name: pos.kurzBezeichnung,
        Plan: posPlan[pos.code] || 0,
        Ist: posIst[pos.code] || 0,
      })),
    [posPlan, posIst]
  );

  // Offene Vergaben / Check-Items
  const vergabenOhneBafa = vergaben.filter(
    (v) => !v.bafaFreigabe && v.status !== 'abgeschlossen'
  ).length;
  const offeneTasks = tasks.filter((t) => t.status !== 'erledigt');
  const activePilotsCount = usecases.filter(
    (u) => u.status === 'aktiv' || u.status === 'in Vorbereitung' || u.status === 'kritisch'
  ).length;

  // Bevorzugt die App-weite Auswertung (mit Serien & gespeicherten Freischaltungen);
  // ohne Prop wird wie bisher lokal ausgewertet.
  const achievements: DisplayAchievement[] = useMemo(
    () =>
      achievementsProp ??
      applyPersistedUnlocks(
        evaluateProjectAchievements({
          personal,
          rechnungen,
          zas,
          vergaben,
          usecases,
          oekoprofitCheckups,
          settings,
        }),
        []
      ),
    [achievementsProp, personal, rechnungen, zas, vergaben, usecases, oekoprofitCheckups, settings]
  );

  const bossEvent = useMemo(
    () =>
      computeBossEventKassenschluss({
        zas,
        rechnungen,
        targetYear:
          activeYear && /^\d{4}$/.test(activeYear) ? Number(activeYear) : 2026,
      }),
    [zas, rechnungen, activeYear]
  );

  const bossEvents = useMemo(
    () =>
      computeBossEvents({
        kassenschluss: bossEvent,
        zas,
        vergaben,
        oekoprofitCheckups,
        rechnungen,
        auditChain,
        today: todayISO(),
      }),
    [bossEvent, zas, vergaben, oekoprofitCheckups, rechnungen, auditChain]
  );

  const weeklyMissions = useMemo(
    () =>
      computeWeeklyMissions({
        today: todayISO(),
        tasks,
        vergaben,
        usecases,
        zas,
        rechnungen,
      }),
    [tasks, vergaben, usecases, zas, rechnungen]
  );

  const campaign = useMemo(
    () => computeCampaign({ periods: AZA_JAHRE, today: todayISO(), rechnungen, zas, usecases, vergaben }),
    [rechnungen, zas, usecases, vergaben]
  );

  const teamGoals = useMemo(
    () => computeTeamGoals({ today: todayISO(), usecases, vergaben, oekoprofitCheckups }),
    [usecases, vergaben, oekoprofitCheckups]
  );

  const openFromGamification = (page: string, subTab?: string) =>
    onNavigateDetail(page, subTab ? { mittelabrufeSubTab: subTab as MittelabrufeSubTab } : {});

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const resourcePipeline = useMemo(
    () =>
      computeResourcePipeline({
        posPlan,
        posIst,
        vergaben,
        mittelabrufe: yearAbr,
        rechnungen: yearRech,
        vorsteuerabzugsberechtigt: settings.vorsteuerabzugsberechtigt,
      }),
    [posPlan, posIst, vergaben, yearAbr, yearRech, settings.vorsteuerabzugsberechtigt]
  );

  const executiveAdvisors = useMemo(
    () =>
      computeExecutiveAdvisors({
        zas,
        vergaben,
        oekoprofitCheckups,
        usecases,
        rechnungen,
        unspent0835: unspentAlert2026.rest0835,
      }),
    [zas, vergaben, oekoprofitCheckups, usecases, rechnungen, unspentAlert2026.rest0835]
  );

  const chronikFrames = useMemo(
    () =>
      computeChronikTimeline({
        personal,
        rechnungen,
        vergaben,
        usecases,
        events,
        foerderByYear: activePlan.foerder as Record<string, { gesamt: number }>,
        vorsteuerabzugsberechtigt: settings.vorsteuerabzugsberechtigt,
      }),
    [
      personal,
      rechnungen,
      vergaben,
      usecases,
      events,
      activePlan.foerder,
      settings.vorsteuerabzugsberechtigt,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-semibold text-[#58B49D] uppercase tracking-wider">
            STARK FKZ {PROFI_STARK_FKZ} &middot; {azaMeta.shortLabel}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-zs-blau-schwarz tracking-tight mt-0.5">
            Executive Cockpit
          </h1>
          <p className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
            <span>WIN.DN Fördermittelsteuerung &middot; {activeYearLabel} &middot; 90 % Bund / 10 % Eigenanteil</span>
            {settings.privacyMode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zs-blau-schwarz text-zs-signal-gelb font-mono text-[10px] font-bold">
                <EyeOff className="w-3 h-3" />
                Privacy-Modus aktiv
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() =>
            onNavigateDetail('mittelabrufe', {
              mittelabrufeSubTab: 'za-rechner',
            })
          }
          className="px-4 py-2 text-xs font-bold rounded-lg bg-zs-blau-schwarz text-white hover:bg-[#08243d] transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <span>profi-online ZA öffnen</span>
          <ArrowRight className="w-3.5 h-3.5 text-zs-signal-gelb" />
        </button>
      </div>

      {/* Berater-Stab (Simulation Mode) ODER schlichte Compliance-Warnleisten (Gremien-Stealth-Modus) */}
      {gamificationEnabled ? (
        <ExecutiveAdvisorsPanel
          advisors={executiveAdvisors}
          onNavigate={(page, filters) => onNavigateDetail(page, filters)}
        />
      ) : (
        (kassenbestandAlerts.length > 0 || chainErrors.length > 0 || overBudgetPositions.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {kassenbestandAlerts.map((alert) => (
            <button
              key={`kb-${alert.zaId}`}
              type="button"
              onClick={() =>
                onNavigateDetail('mittelabrufe', { mittelabrufeSubTab: 'za-rechner' })
              }
              className="text-left bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3 hover:border-amber-500 transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 leading-relaxed">
                <div className="font-bold">
                  ANBest-P 2-Monats-Verwendungsfrist: Positiver Kassenbestand (+{formatEuro(alert.zeile16Kassenbestand, 2)})
                </div>
                <div className="text-[11px] text-amber-800 mt-0.5 font-mono tabular-nums">
                  {alert.bezeichnung} &middot; Fristende: {formatDate(alert.twoMonthDeadline)}{' '}
                  {alert.daysUntilDeadline !== null &&
                    (alert.daysUntilDeadline >= 0
                      ? `(noch ${alert.daysUntilDeadline} Tage)`
                      : `(seit ${Math.abs(alert.daysUntilDeadline)} Tagen überschritten – Zinsrisiko!)`)}
                </div>
              </div>
            </button>
          ))}

          {(chainErrors.length > 0 || overBudgetPositions.length > 0) && (
            <button
              type="button"
              onClick={() =>
                onNavigateDetail(chainErrors.length > 0 ? 'mittelabrufe' : 'budget', {
                  mittelabrufeSubTab: 'za-rechner',
                  budgetTab: 'kategorie',
                })
              }
              className="text-left bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3 hover:border-red-400 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <div className="text-xs text-red-950 leading-relaxed">
                {chainErrors.length > 0 && (
                  <div className="font-bold">
                    ZA-Ketten-Abweichung erkannt ({chainErrors.length} ZA): Spalte 2 weicht von Vor-ZA ab.
                  </div>
                )}
                {overBudgetPositions.length > 0 && (
                  <div className="font-bold">
                    ANBest-P 20-%-Umschichtungswächter:{' '}
                    {overBudgetPositions.map((p) => `Pos. ${p.displayCode}`).join(', ')} über 120 % Ansatz.
                  </div>
                )}
                <div className="text-[11px] text-red-700 mt-0.5">
                  Klicken für direkte Prüfung &amp; Gegensteuerung im Fachmodul.
                </div>
              </div>
            </button>
          )}
        </div>
        )
      )}

      {/* Zentrales Cockpit-Visual: 2.5D-Transformationskarte Düren */}
      <HexTransformationMap
        usecases={usecases}
        vergaben={vergaben}
        oekoprofitCheckups={oekoprofitCheckups}
        setSelectedUseCaseId={(useCaseId) => {
          if (useCaseId !== null) {
            onNavigateDetail('usecase', { useCaseId });
          }
        }}
        onSelectUseCase={(useCaseId) =>
          onNavigateDetail('usecase', { useCaseId })
        }
        onUpdateUseCase={onUpdateUseCase}
        showProgress={gamificationEnabled}
      />

      {/* 3 Kern-KPI-Karten mit direktem Drilldown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() =>
            onNavigateDetail('budget', {
              budgetTab: 'jahre',
              budgetFocus: 'bundesmittel',
            })
          }
          className="text-left bg-white p-6 rounded-xl border border-zinc-200 hover:border-zs-blau-schwarz transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
                Bundesmittel-Saldo (90 %)
              </span>
              <span className="text-xs font-mono text-zs-blau-schwarz opacity-60 group-hover:opacity-100 flex items-center gap-1">
                <span>Budget</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="font-mono text-3xl font-bold text-zs-blau-schwarz tabular-nums mt-3">
              {formatEuro(bafaRest, 2)}
            </div>
            <p className="text-xs text-zinc-500 mt-1 tabular-nums">
              Restbudget Bund aus {formatEuro(planSplit.bund90, 2)} ({bafaQuotePct.toFixed(1)} % abgerufen)
            </p>
          </div>
          <div className="mt-4 w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-zs-blau-schwarz h-full transition-all duration-300"
              style={{ width: `${bafaQuotePct}%` }}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onNavigateDetail('budget', {
              budgetTab: 'kategorie',
              budgetFocus: 'eigenanteil',
            })
          }
          className="text-left bg-white p-6 rounded-xl border border-zinc-200 hover:border-[#BA8B68] transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
                Eigenanteil (10 % WIN.DN)
              </span>
              <span className="text-xs font-mono text-[#BA8B68] opacity-80 group-hover:opacity-100 flex items-center gap-1">
                <span>Nachweis</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="font-mono text-3xl font-bold text-[#BA8B68] tabular-nums mt-3">
              {formatEuro(istSplit.eigen10, 2)}
            </div>
            <p className="text-xs text-zinc-500 mt-1 tabular-nums">
              Erbrachter Eigenanteil von {formatEuro(planSplit.eigen10, 2)} Plan-Soll ({eigenQuotePct.toFixed(1)} %)
            </p>
          </div>
          <div className="mt-4 w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#BA8B68] h-full transition-all duration-300"
              style={{ width: `${eigenQuotePct}%` }}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onNavigateDetail('mittelabrufe', {
              mittelabrufeSubTab: 'abrufe',
              mittelabrufeStatusFilter: 'open',
            })
          }
          className="text-left bg-white p-6 rounded-xl border border-zinc-200 hover:border-[#58B49D] transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
                Offene Abrufe &amp; Auszahlungen
              </span>
              <span className="text-xs font-mono text-[#58B49D] opacity-80 group-hover:opacity-100 flex items-center gap-1">
                <span>Abrufe</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="font-mono text-3xl font-bold text-[#58B49D] tabular-nums mt-3">
              {formatEuro(offeneForderungen, 2)}
            </div>
            <p className="text-xs text-zinc-500 mt-1 tabular-nums">
              {latestZa
                ? `Letzte ZA (${latestZa.bezeichnung}): ${formatEuro(latestZa.zeile19Anforderung, 2)} (Z. 19)`
                : `Eingegangen: ${formatEuro(abrufEingegangen, 2)} / ${formatEuro(abrufBeantragt, 2)}`}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-zinc-500 border-t border-zinc-100 pt-2.5">
            <span>Kumuliertes Ist (100 %):</span>
            <span className="font-bold text-zs-blau-schwarz tabular-nums">{formatEuro(istGesamt, 2)}</span>
          </div>
        </button>
      </div>

      {/* Ressourcen-Fluss (Anno-Sankey-Pipeline & Engpass-Detektor) */}
      {gamificationEnabled && (
        <ResourceSankeyPipeline
          pipeline={resourcePipeline}
          activeYearLabel={activeYearLabel}
          onNavigateDetail={onNavigateDetail}
        />
      )}

      {/* profi-online Kostenpositionen (0812–0843) & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabelle profi-online */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-zs-blau-schwarz">
                profi-online Kostenpositionen (0812–0843)
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {azaMeta.label} &middot; Klicken für Drilldown
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
              Gesamt-Plan: {formatEuro(planGesamt, 2)}
            </span>
          </div>
          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                  <th className="py-2.5 px-4">Pos.</th>
                  <th className="py-2.5 px-3">Bezeichnung</th>
                  <th className="py-2.5 px-3 text-right">AZA-Plan</th>
                  <th className="py-2.5 px-3 text-right">Ist erfasst</th>
                  <th className="py-2.5 px-4 text-right">Quote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {PROFI_POSITIONEN.map((pos) => {
                  const p = posPlan[pos.code] || 0;
                  const i = posIst[pos.code] || 0;
                  const pct = p > 0 ? (i / p) * 100 : 0;
                  const isOver20 = p > 0 && i > p * 1.2;
                  const targetPage =
                    pos.code === '0812' || pos.code === '0817' || pos.code === '0820'
                      ? 'personal'
                      : 'rechnungen';
                  return (
                    <tr
                      key={pos.code}
                      onClick={() =>
                        onNavigateDetail(targetPage, {
                          rechnungenProfiPos: targetPage === 'rechnungen' ? pos.code : '',
                        })
                      }
                      className="hover:bg-zinc-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-zs-blau-schwarz">
                        {pos.displayCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-zinc-800">{pos.bezeichnung}</div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[260px]">
                          {pos.beschreibung}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-600 tabular-nums">
                        {formatEuro(p, 2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-zs-blau-schwarz tabular-nums">
                        {formatEuro(i, 2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            isOver20
                              ? 'text-red-700'
                              : pct > 90
                              ? 'text-amber-700'
                              : 'text-[#58B49D]'
                          }`}
                        >
                          {pct.toFixed(1)} %
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200 p-5 flex flex-col">
          <div className="mb-3">
            <h2 className="font-display font-bold text-base text-zs-blau-schwarz">
              Soll / Ist je profi-Position
            </h2>
            <p className="text-[11px] text-zinc-500">
              {settings.vorsteuerabzugsberechtigt ? 'Förderbasis: Netto (§ 15 UStG)' : 'Förderbasis: Brutto'} &middot; {activeYearLabel}
            </p>
          </div>
          <div className="flex-grow min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profiChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#52525b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  width={40}
                />
                <Tooltip
                  formatter={(value: any) => formatEuro(Number(value), 2)}
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                    borderColor: '#e4e4e7',
                  }}
                />
                <Bar dataKey="Plan" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ist" fill="#041422" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Operational Strip: Verfalls-Radar, Vergaben/Freigaben, Use-Cases & Aufgaben */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Verfalls-Radar & Übertragungs-Hinweis */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase font-bold">
              Kassenschluss 15.11. &middot; Verfalls-Radar Pos. 0835
            </div>
            <div className="font-mono text-2xl font-bold text-zs-blau-schwarz tabular-nums mt-2">
              {formatEuro(unspentAlert2026.rest0835, 2)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Offenes Restbudget in Vergaben/Fremdleistungen ({unspentAlert2026.ratioOpen.toFixed(1)} % unverausgabt). Bei Nichtabruf bis 15.11. rechtzeitig Übertragungsantrag (Referat 424) stellen.
            </p>
          </div>
          <button
            onClick={() =>
              onNavigateDetail('budget', { budgetTab: 'kategorie' })
            }
            className="text-xs font-semibold text-zs-blau-schwarz hover:underline flex items-center gap-1 cursor-pointer self-start"
          >
            <span>Übertragungs-Assistent öffnen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Vergaben & Pilot-Use-Cases */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase font-bold">
              Compliance &amp; Transformationspiloten
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                type="button"
                onClick={() => onNavigateDetail('vergaben', {})}
                className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 hover:border-zs-blau-schwarz text-left cursor-pointer"
              >
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Ohne BAFA-Freigabe</div>
                <div className={`text-xl font-mono font-bold tabular-nums mt-0.5 ${vergabenOhneBafa > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {vergabenOhneBafa}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onNavigateDetail('usecase', {})}
                className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 hover:border-zs-blau-schwarz text-left cursor-pointer"
              >
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Aktive Use-Cases</div>
                <div className="text-xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-0.5">
                  {activePilotsCount}
                </div>
              </button>
            </div>
          </div>
          {vergabenOhneBafa > 0 && (
            <div className="text-[11px] text-red-700 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Rechnungen zu unfreigegebenen Vergaben sind durch Compliance-Gate gesperrt.</span>
            </div>
          )}
        </div>

        {/* Offene Aufgaben */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-zinc-500 uppercase font-bold">
                Fällige Aufgaben ({offeneTasks.length})
              </span>
              <button
                onClick={() =>
                  onNavigateDetail('aufgaben', { aufgabenStatus: 'offen' })
                }
                className="text-xs font-semibold text-zs-blau-schwarz hover:underline cursor-pointer"
              >
                Alle
              </button>
            </div>
            {offeneTasks.length === 0 ? (
              <p className="text-xs text-zinc-400 font-mono py-4 text-center">
                Keine offenen Aufgaben.
              </p>
            ) : (
              <div className="space-y-2">
                {offeneTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-2.5 text-xs p-2 rounded-lg bg-zinc-50 border border-zinc-100"
                  >
                    <button
                      type="button"
                      onClick={() => onUpdateTask?.(t.id, { status: 'erledigt' })}
                      className="text-zinc-400 hover:text-[#58B49D] cursor-pointer mt-0.5"
                      title="Als erledigt markieren"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zs-blau-schwarz truncate">{t.title}</div>
                      {t.dueDate && (
                        <div className="text-[10px] font-mono text-zinc-500">
                          Fällig: {formatDate(t.dueDate)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {tasks.some((t) => t.status === 'erledigt') && (
            <div className="mt-3 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-1.5 font-mono">
              <CheckSquare className="w-3.5 h-3.5 text-[#58B49D]" />
              <span>{tasks.filter((t) => t.status === 'erledigt').length} erledigt</span>
            </div>
          )}
        </div>
      </div>

      {/* 48-Monate-Chronik-Scrubber, Operation Kassenschluss & Trophäenschrank (nur in Projekt-Steuerung) */}
      {gamificationEnabled && (
        <div className="space-y-6">
          <ChronikScrubber frames={chronikFrames} />
          <WeeklyMissionsPanel state={weeklyMissions} onOpen={openFromGamification} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7">
              <CampaignPanel chapters={campaign} />
            </div>
            <div className="lg:col-span-5">
              <TeamGoalsPanel goals={teamGoals} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Boss-Events: Kassenschluss, Mittelabruf-Frist, Vor-Ort-Prüfung */}
          <div className="lg:col-span-4">
            <BossEventsPanel events={bossEvents} onOpen={openFromGamification} />
          </div>

          {/* Projekt-Trophäenschrank */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="font-display font-bold text-base text-zs-blau-schwarz flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#BA8B68]" />
                  <span>Projekt-Trophäenschrank (Operational Mastery)</span>
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Datengetriebene Abzeichen aus Live-Belegen, Use-Cases und BAFA-Prüfregeln – einmal
                  freigeschaltet, bleiben sie revisionssicher im Audit-Log erhalten
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-zs-blau-schwarz tabular-nums">
                {unlockedCount} / {achievements.length} freigeschaltet
              </span>
            </div>

            {streaks && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StreakTile
                  label="Fristgerechte Erfassung"
                  unit="Belege"
                  rule="≤ 5 Werktage nach Rechnungsdatum"
                  streak={streaks.belegTempo}
                />
                <StreakTile
                  label="Backup-Serie"
                  unit="Monate"
                  rule="mind. 1 Sicherung pro Monat"
                  streak={streaks.backup}
                />
                <StreakTile
                  label="ZA-Kette"
                  unit="ZAs"
                  rule="eingereicht mit gültiger Kette"
                  streak={streaks.zaKette}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {achievements.map((ach) => (
                <AchievementCard key={ach.id} achievement={ach} />
              ))}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trophäenschrank: Serien-Kachel ──
function StreakTile({
  label,
  unit,
  rule,
  streak,
}: {
  label: string;
  unit: string;
  rule: string;
  streak: StreakResult;
}) {
  const active = streak.current > 0;
  return (
    <div
      className={`p-3 rounded-lg border ${
        active ? 'border-orange-300/70 bg-orange-50/50' : 'border-zinc-200 bg-zinc-50/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">{label}</span>
        <Flame className={`w-4 h-4 shrink-0 ${active ? 'text-orange-500' : 'text-zinc-300'}`} aria-hidden="true" />
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display font-bold text-2xl text-zs-blau-schwarz tabular-nums">{streak.current}</span>
        <span className="text-[11px] text-zinc-500">{unit} in Folge</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono text-zinc-500">
        <span>Rekord {streak.best}</span>
        <span aria-hidden="true">·</span>
        <span
          className={`px-1.5 py-0.5 rounded ${
            streak.jokerUsed ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {streak.jokerUsed ? 'Joker verbraucht' : '1 Joker frei'}
        </span>
      </div>
      <p className="mt-1.5 text-[10px] text-zinc-400 leading-snug">
        {streak.total === 0 ? `Noch keine Daten – ${rule}` : rule}
      </p>
    </div>
  );
}

// ── Trophäenschrank: Abzeichen-Karte (Stufen, Freischaltdatum, versteckt) ──
function AchievementCard({ achievement: ach }: { achievement: DisplayAchievement }) {
  const concealed = ach.hidden && !ach.unlocked;
  const tierStyle = ach.tier ? TIER_STYLE[ach.tier] : null;
  const dateLabel = ach.tier ? ach.tierUnlockedAt : ach.unlockedAt;

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        ach.unlocked
          ? tierStyle
            ? `${tierStyle.ring} bg-white`
            : 'border-[#10B981]/50 bg-emerald-50/40'
          : concealed
          ? 'border-dashed border-zinc-300 bg-zinc-50/50'
          : 'border-zinc-200 bg-zinc-50/50 opacity-80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-mono text-zinc-400">{ach.category}</span>
        {concealed ? (
          <Lock className="w-4 h-4 shrink-0 text-zinc-300" aria-label="Verstecktes Abzeichen" />
        ) : ach.hidden ? (
          <Sparkles className="w-4 h-4 shrink-0 text-[#D4A017]" aria-hidden="true" />
        ) : (
          <CheckCircle2
            className={`w-4 h-4 shrink-0 ${ach.unlocked ? 'text-[#10B981]' : 'text-zinc-300'}`}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="font-bold text-xs text-zs-blau-schwarz mt-1 flex items-center gap-1.5 flex-wrap">
        <span>{concealed ? '???' : ach.title}</span>
        {ach.tier && tierStyle && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${tierStyle.badge}`}>
            {TIER_LABEL[ach.tier]}
          </span>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
        {concealed ? 'Verstecktes Abzeichen – wird bei einem besonderen Meilenstein enthüllt.' : ach.description}
      </p>

      {!concealed && (
        <div className="mt-2 font-mono text-[10px] font-semibold text-zinc-600">{ach.progressLabel}</div>
      )}

      {!concealed && ach.nextTier && (
        <div className="mt-1 font-mono text-[10px] text-zinc-400">
          Nächste Stufe: {TIER_LABEL[ach.nextTier.tier]} bei {ach.nextTier.threshold}
        </div>
      )}

      {ach.unlocked && dateLabel && (
        <div className="mt-1.5 text-[10px] text-zinc-400">
          {ach.retroactive ? 'Aus Bestand übernommen am ' : 'Freigeschaltet am '}
          {formatDate(dateLabel)}
        </div>
      )}
    </div>
  );
}
