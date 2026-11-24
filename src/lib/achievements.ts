import type {
  AchievementTier,
  ComplianceStreaks,
  OekoprofitCheckup,
  PersonalEintrag,
  Rechnungsbeleg,
  SystemSettings,
  UseCase,
  Vergabe,
  Zahlungsanforderung,
} from '../types';
import { hasBackupInCurrentMonth } from './backup';
import { computeBossEventKassenschluss } from './bossEvent';
import { formatEuro } from './helpers';
import { addEuro, getFoerderfaehigerRechnungsBetrag, mapKategorieToProfiPosition, mulPercent, sumEuro } from './money';
import { getUseCaseMapStage } from './transformation';
import { validateZaChain } from './zaChain';

// ── Projekt-Achievements (Trophäenschrank) ──
export interface ProjectAchievement {
  id: string;
  title: string;
  category: string;
  description: string;
  unlocked: boolean;
  progressLabel: string;
  tier?: AchievementTier | null; // aktuell erreichte Stufe (nur Stufen-Abzeichen)
  nextTier?: { tier: AchievementTier; threshold: number } | null;
  hidden?: boolean; // verstecktes Abzeichen: bis zur Freischaltung verdeckt
}

export const TIER_ORDER: AchievementTier[] = ['bronze', 'silber', 'gold'];
export const TIER_LABEL: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silber: 'Silber',
  gold: 'Gold',
};

export interface TierThresholds {
  bronze: number;
  silber: number;
  gold: number;
}

/** Höchste erreichte Stufe für einen Zählwert (null = noch keine Stufe). */
export function resolveTier(value: number, thresholds: TierThresholds): AchievementTier | null {
  let reached: AchievementTier | null = null;
  for (const tier of TIER_ORDER) {
    if (value >= thresholds[tier]) reached = tier;
  }
  return reached;
}

/** Nächste noch nicht erreichte Stufe samt Schwelle (null = Gold erreicht). */
export function resolveNextTier(
  value: number,
  thresholds: TierThresholds
): { tier: AchievementTier; threshold: number } | null {
  const next = TIER_ORDER.find((tier) => value < thresholds[tier]);
  return next ? { tier: next, threshold: thresholds[next] } : null;
}

function tieredFields(value: number, thresholds: TierThresholds) {
  const tier = resolveTier(value, thresholds);
  return { unlocked: tier !== null, tier, nextTier: resolveNextTier(value, thresholds) };
}

export function evaluateProjectAchievements(params: {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  zas: Zahlungsanforderung[];
  vergaben: Vergabe[];
  usecases: UseCase[];
  oekoprofitCheckups: OekoprofitCheckup[];
  settings: SystemSettings;
  streaks?: ComplianceStreaks; // optional: aktiviert Serien-Abzeichen
  auditChain?: { valid: boolean; checkedCount: number }; // optional: für „Revisionsfest"
}): ProjectAchievement[] {
  const { personal, rechnungen, zas, vergaben, usecases, oekoprofitCheckups, settings, streaks, auditChain } =
    params;

  // 1. Erster Booster gezündet
  const boosterRechnung = rechnungen.some((r) => {
    const pos = mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition);
    const ff = getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt);
    const linkedVergabe = vergaben.find((v) => v.id === r.vergabeId);
    return (
      pos === '0835' &&
      Boolean(r.useCaseId) &&
      (ff >= 37000 || (linkedVergabe && linkedVergabe.auftragswert >= 37000))
    );
  });
  const boosterVergaben = vergaben.filter(
    (v) => v.bafaFreigabe && v.auftragswert >= 37000 && Boolean(v.useCaseId)
  );
  const boosterVergabeIds = new Set(boosterVergaben.map((v) => v.id));
  // Belege zählen nur, wenn ihre Vergabe nicht schon als Booster gezählt wurde
  const boosterRechnungenExtra = rechnungen.filter((r) => {
    if (r.vergabeId && boosterVergabeIds.has(r.vergabeId)) return false;
    const pos = mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition);
    const ff = getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt);
    const linkedVergabe = vergaben.find((v) => v.id === r.vergabeId);
    return (
      pos === '0835' &&
      Boolean(r.useCaseId) &&
      (ff >= 37000 || (linkedVergabe && linkedVergabe.auftragswert >= 37000))
    );
  });
  const boosterCount = boosterVergaben.length + boosterRechnungenExtra.length;
  // Mindestens 1, sobald die bisherige Bedingung erfüllt ist (Abwärtskompatibilität)
  const boosterValue = boosterRechnung ? Math.max(boosterCount, 1) : boosterCount;

  // 2. Cent-Präzision (ZA Zeile 19 matches computed value to 0.00 €)
  const valMap = validateZaChain(zas);
  const centExactZas = zas.filter((z) => {
    const val = valMap[z.id];
    return (
      (z.status === 'Eingereicht' || z.status === 'Abgerechnet') &&
      val &&
      Math.abs(z.zeile19Anforderung - val.zeile19Computed) < 0.01
    );
  });

  // 3. Dürener Dreiklang (Papier, Textil, Chemie in Pilotbetrieb/aktiv)
  const isPilotActive = (u: UseCase) =>
    u.status === 'aktiv' || u.status === 'abgeschlossen' || u.reifegrad === 'Pilotbetrieb';
  const hasPapier = usecases.some((u) => isPilotActive(u) && u.branche.toLowerCase().includes('papier'));
  const hasTextil = usecases.some((u) => isPilotActive(u) && u.branche.toLowerCase().includes('textil'));
  const hasChemie = usecases.some((u) => isPilotActive(u) && u.branche.toLowerCase().includes('chemie'));
  const dreiklangCount = [hasPapier, hasTextil, hasChemie].filter(Boolean).length;

  // 4. Ökoprofit-Pionier
  const completedOeko = oekoprofitCheckups.some(
    (c) =>
      c.protokoll1Abgegeben &&
      c.protokoll2Abgegeben &&
      c.abschlussReportingAbgegeben &&
      c.abschlag1Freigegeben &&
      c.abschlag2Freigegeben &&
      c.schlusszahlungFreigegeben
  );

  // 5. Null-Eigenanteil-Lücke
  const latestZa = [...zas].sort((a, b) => a.datum.localeCompare(b.datum)).slice(-1)[0];
  const latestIstBund = latestZa ? sumEuro(Object.values(latestZa.istJePosition || {})) : 0;
  const recordedEigen10 = addEuro(
    sumEuro(personal.map((p) => mulPercent(p.foerderfaehig || 0, 10))),
    sumEuro(
      rechnungen.map((r) =>
        mulPercent(getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt), 10)
      )
    )
  );
  const requiredEigen10 = mulPercent(latestIstBund, 10);
  const eigenCovered = recordedEigen10 > 0 && recordedEigen10 >= requiredEigen10;

  // 6. Backup-Wächter
  const backupMonthly = hasBackupInCurrentMonth();

  // 7. Jahresabschluss-Trophäe
  const boss = computeBossEventKassenschluss({ zas, rechnungen });

  // Versteckte Abzeichen
  const mapStages = usecases.map((u) => getUseCaseMapStage(u, vergaben));
  const rurKorridorKomplett = usecases.length >= 3 && mapStages.every((s) => s >= 2);
  const submittedZas = zas.filter((z) => z.status === 'Eingereicht' || z.status === 'Abgerechnet');
  const vollstaendigeAkte =
    submittedZas.length >= 3 &&
    submittedZas.every((z) => z.belegVollstaendig && valMap[z.id]?.isChainValid);
  const revisionsfest = Boolean(auditChain && auditChain.valid && auditChain.checkedCount >= 100);

  const BOOSTER_TIERS: TierThresholds = { bronze: 1, silber: 4, gold: 12 };
  const CENT_TIERS: TierThresholds = { bronze: 1, silber: 3, gold: 6 };
  const BACKUP_TIERS: TierThresholds = { bronze: 1, silber: 3, gold: 6 };
  const TEMPO_TIERS: TierThresholds = { bronze: 5, silber: 15, gold: 30 };
  const KETTE_TIERS: TierThresholds = { bronze: 3, silber: 6, gold: 12 };

  const backupFields = streaks
    ? tieredFields(streaks.backup.best, BACKUP_TIERS)
    : { unlocked: backupMonthly, tier: null, nextTier: null };

  const streakAchievements: ProjectAchievement[] = streaks
    ? [
        {
          id: 'beleg-tempo',
          title: 'Fristgerechte Erfassung',
          category: 'Serie · Belege',
          description:
            'Belege in Folge höchstens 5 Werktage nach Rechnungsdatum erfasst (1 Joker pro Serie). Stufen bei 5 / 15 / 30.',
          ...tieredFields(streaks.belegTempo.best, TEMPO_TIERS),
          progressLabel: `Rekord ${streaks.belegTempo.best} · aktuell ${streaks.belegTempo.current} in Folge`,
        },
        {
          id: 'za-kette',
          title: 'Lückenlose ZA-Kette',
          category: 'Serie · profi-online',
          description:
            'Eingereichte Zahlungsanforderungen in Folge mit gültiger Kette (Spalte 2). Stufen bei 3 / 6 / 12.',
          ...tieredFields(streaks.zaKette.best, KETTE_TIERS),
          progressLabel: `Rekord ${streaks.zaKette.best} · aktuell ${streaks.zaKette.current} ZAs in Folge`,
        },
      ]
    : [];

  return [
    {
      id: 'first-booster',
      title: 'Booster gezündet',
      category: 'Industrie-Transfer',
      description:
        '37.000-€-Vergaben oder -Belege (Pos. 0835) mit Use-Case verknüpft und freigegeben. Stufen bei 1 / 4 / 12 Boostern.',
      ...tieredFields(boosterValue, BOOSTER_TIERS),
      progressLabel: `${boosterValue} / 12 Booster belegt`,
    },
    {
      id: 'cent-precision',
      title: 'Cent-Präzision',
      category: 'profi-online',
      description:
        'Eingereichte ZAs (Zeile 19) entsprechen exakt bis auf 0,00 € der Kettenberechnung. Stufen bei 1 / 3 / 6 ZAs.',
      ...tieredFields(centExactZas.length, CENT_TIERS),
      progressLabel: `${centExactZas.length} / ${zas.length} ZAs cent-exakt`,
    },
    {
      id: 'duerener-dreiklang',
      title: 'Dürener Dreiklang',
      category: 'MiD-PTC Cluster',
      description: 'Je mindestens 1 aktiver Pilot in Papier, Textil und Chemie.',
      unlocked: dreiklangCount === 3,
      progressLabel: `${dreiklangCount} / 3 Branchen aktiv`,
    },
    {
      id: 'oekoprofit-pionier',
      title: 'Ökoprofit-Pionier',
      category: 'Leistungsverzeichnis',
      description: 'Erstes Startup hat alle 3 Termine inkl. Abschluss-Reporting komplett abgeschlossen.',
      unlocked: completedOeko,
      progressLabel: completedOeko
        ? 'Abgeschlossen'
        : `${oekoprofitCheckups.length} Checkups aktiv`,
    },
    {
      id: 'eigenanteil-luecke',
      title: 'Null-Eigenanteil-Lücke',
      category: '90/10 Finanzierung',
      description: 'Der 10-%-Eigenanteil (WIN.DN) ist vollständig durch erfasste Belege gedeckt.',
      unlocked: eigenCovered,
      progressLabel: eigenCovered
        ? `${formatEuro(recordedEigen10, 0)} gedeckt`
        : 'Belege abgleichen',
    },
    {
      id: 'backup-waechter',
      title: 'Backup-Wächter',
      category: 'Datensicherheit',
      description: streaks
        ? 'Jeden Monat mindestens 1 JSON-Snapshot oder Offline-HTML-Export (1 Joker pro Serie). Stufen bei 1 / 3 / 6 Monaten in Folge.'
        : 'Mindestens 1 JSON-Snapshot oder Offline-HTML-Export im laufenden Monat erstellt.',
      ...backupFields,
      progressLabel: streaks
        ? `${backupMonthly ? 'Diesen Monat gesichert' : 'Export ausstehend'} · Rekord ${streaks.backup.best} Monate`
        : backupMonthly
        ? 'Diesen Monat gesichert'
        : 'Export ausstehend',
    },
    {
      id: 'kassenschluss-trophy',
      title: `Jahresabschluss-Trophäe ${boss.targetYear}`,
      category: 'Kassenschluss 15.11.',
      description: 'Alle 3 Phasen der Jahresabschluss-Prüfung vor dem 15.11. abgeschlossen.',
      unlocked: boss.trophyUnlocked,
      progressLabel: `${boss.progressPct} % abgeschlossen`,
    },
    ...streakAchievements,
    {
      id: 'rur-korridor-komplett',
      title: 'Rur-Korridor komplett',
      category: 'Verstecktes Abzeichen',
      description: 'Alle Use-Cases der Transformations-Karte sind mindestens im Pilotbetrieb (min. 3).',
      unlocked: rurKorridorKomplett,
      hidden: true,
      progressLabel: `${mapStages.filter((s) => s >= 2).length} / ${usecases.length} Kacheln im Pilot`,
    },
    {
      id: 'vollstaendige-akte',
      title: 'Vollständige Akte',
      category: 'Verstecktes Abzeichen',
      description: 'Mindestens 3 eingereichte ZAs – alle mit vollständigen Belegen und gültiger Kette.',
      unlocked: vollstaendigeAkte,
      hidden: true,
      progressLabel: `${submittedZas.length} ZAs eingereicht`,
    },
    {
      id: 'revisionsfest',
      title: 'Revisionsfest',
      category: 'Verstecktes Abzeichen',
      description: 'Mindestens 100 lückenlos verkettete, unveränderte GoBD-Audit-Einträge.',
      unlocked: revisionsfest,
      hidden: true,
      progressLabel: auditChain
        ? `${auditChain.checkedCount} Einträge · Kette ${auditChain.valid ? 'gültig' : 'unterbrochen'}`
        : 'Audit-Kette nicht geprüft',
    },
  ];
}
