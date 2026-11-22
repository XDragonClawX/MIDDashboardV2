// Gamification Stufe 2: weitere Boss-Events mit derselben Phasen-Logik wie „Kassenschluss“.
// Belohnt werden Fristtreue und Vollständigkeit – nicht Ausgabevolumen.
import type { OekoprofitCheckup, Rechnungsbeleg, Vergabe, Zahlungsanforderung } from './types';
import {
  BossEventState,
  computeComplianceShield,
  hasBackupInCurrentMonth,
  validateZaChain,
} from './utils';

export interface BossEventCardPhase {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface BossEventCard {
  id: 'kassenschluss' | 'mittelabruf-frist' | 'vor-ort-pruefung';
  title: string;
  subtitle: string;
  deadlineLabel: string; // z. B. „Frist: 15.11.“ oder „Jederzeit“
  daysLeft: number | null;
  progressPct: number;
  trophyUnlocked: boolean;
  phases: BossEventCardPhase[];
  actionLabel: string;
  targetPage: string;
  subTab?: string;
}

const pct = (phases: { completed: boolean }[]) =>
  phases.length === 0 ? 0 : Math.round((phases.filter((p) => p.completed).length / phases.length) * 100);

function daysBetween(todayISO: string, targetISO: string): number {
  return Math.ceil(
    (new Date(`${targetISO}T12:00:00`).getTime() - new Date(`${todayISO}T12:00:00`).getTime()) / 86_400_000
  );
}

/** Boss „Mittelabruf-Frist“: ANBest-P 2-Monats-Frist bei positivem Kassenbestand. */
export function computeBossMittelabrufFrist(params: {
  zas: Zahlungsanforderung[];
  today: string;
}): BossEventCard {
  const { zas, today } = params;
  const validations = validateZaChain(zas);
  const relevant = zas.filter((z) => validations[z.id]?.hasPositiveKassenbestand);
  const open = relevant.filter((z) => z.status !== 'Abgerechnet');

  const withDate = relevant.filter((z) => Boolean(z.auszahlungsDatum));
  const overdue = open.filter((z) => {
    const dl = validations[z.id]?.twoMonthDeadline;
    return Boolean(dl) && dl! < today && !z.belegVollstaendig;
  });
  const belegOk = relevant.filter((z) => z.belegVollstaendig);

  const hasData = relevant.length > 0;
  const phases: BossEventCardPhase[] = [
    {
      id: 1,
      title: 'Schritt 1 · Auszahlungsdatum erfasst',
      description: hasData
        ? `${withDate.length} von ${relevant.length} ZA mit Wertstellungsdatum.`
        : 'Keine ZA mit positivem Kassenbestand – nichts zu verwenden.',
      completed: hasData && withDate.length === relevant.length,
    },
    {
      id: 2,
      title: 'Schritt 2 · Keine Frist überschritten',
      description: overdue.length > 0 ? `${overdue.length} ZA mit abgelaufener 2-Monats-Frist.` : 'Alle Fristen eingehalten.',
      completed: hasData && overdue.length === 0,
    },
    {
      id: 3,
      title: 'Schritt 3 · Belege vollständig zugeordnet',
      description: hasData
        ? `${belegOk.length} von ${relevant.length} ZA mit vollständiger Belegzuordnung.`
        : 'Noch keine Daten.',
      completed: hasData && belegOk.length === relevant.length,
    },
  ];

  const nextDeadline = open
    .map((z) => validations[z.id]?.twoMonthDeadline)
    .filter((d): d is string => Boolean(d) && d! >= today)
    .sort()[0];

  return {
    id: 'mittelabruf-frist',
    title: 'Boss: Mittelabruf-Frist',
    subtitle: 'ANBest-P: Guthaben innerhalb von 2 Monaten verwenden',
    deadlineLabel: nextDeadline ? `Nächste Frist: ${nextDeadline.split('-').reverse().join('.')}` : 'Keine offene Frist',
    daysLeft: nextDeadline ? daysBetween(today, nextDeadline) : null,
    progressPct: pct(phases),
    trophyUnlocked: phases.every((p) => p.completed),
    phases,
    actionLabel: 'ZA-Rechner öffnen',
    targetPage: 'mittelabrufe',
    subTab: 'za-rechner',
  };
}

/** Boss „Vor-Ort-Prüfung“: Prüfungsreife der Akte, jederzeit herstellbar. */
export function computeBossVorOrtPruefung(params: {
  zas: Zahlungsanforderung[];
  vergaben: Vergabe[];
  oekoprofitCheckups: OekoprofitCheckup[];
  rechnungen: Rechnungsbeleg[];
  auditChain?: { valid: boolean; checkedCount: number };
  hasBackup?: boolean;
}): BossEventCard {
  const { zas, vergaben, oekoprofitCheckups, rechnungen, auditChain } = params;
  const hasBackup = params.hasBackup ?? hasBackupInCurrentMonth();
  const shield = computeComplianceShield({ zas, vergaben, oekoprofitCheckups, rechnungen });
  const submitted = zas.filter((z) => z.status === 'Eingereicht' || z.status === 'Abgerechnet');
  const submittedComplete = submitted.filter((z) => z.belegVollstaendig);

  const phases: BossEventCardPhase[] = [
    {
      id: 1,
      title: 'Schritt 1 · Compliance-Schild ≥ 90 %',
      description: `Aktueller Wert: ${shield.score} % (${shield.quests.length} offene Prüfpunkte).`,
      completed: shield.score >= 90,
    },
    {
      id: 2,
      title: 'Schritt 2 · Audit-Kette intakt, Akte vollständig',
      description: auditChain
        ? `${auditChain.checkedCount} Einträge · Kette ${auditChain.valid ? 'gültig' : 'unterbrochen'} · ${submittedComplete.length} von ${submitted.length} eingereichten ZA vollständig belegt.`
        : 'Audit-Kette nicht geprüft.',
      completed: Boolean(auditChain?.valid) && submitted.length > 0 && submittedComplete.length === submitted.length,
    },
    {
      id: 3,
      title: 'Schritt 3 · Aktuelle Sicherung vorhanden',
      description: hasBackup ? 'Backup im laufenden Monat erstellt.' : 'Im laufenden Monat noch kein Backup.',
      completed: hasBackup,
    },
  ];

  return {
    id: 'vor-ort-pruefung',
    title: 'Boss: Vor-Ort-Prüfung',
    subtitle: 'Prüfungsreife der gesamten Akte',
    deadlineLabel: 'Jederzeit bereit sein',
    daysLeft: null,
    progressPct: pct(phases),
    trophyUnlocked: phases.every((p) => p.completed),
    phases,
    actionLabel: 'Audit-Protokoll öffnen',
    targetPage: 'audit',
  };
}

/** Bestehendes Kassenschluss-Event in das gemeinsame Kartenformat überführen. */
export function kassenschlussToCard(boss: BossEventState): BossEventCard {
  return {
    id: 'kassenschluss',
    title: `Operation Kassenschluss ${boss.targetYear}`,
    subtitle: 'Jahresabschluss-Fortschritt',
    deadlineLabel: 'Frist: 15.11.',
    daysLeft: boss.daysUntilClose,
    progressPct: boss.progressPct,
    trophyUnlocked: boss.trophyUnlocked,
    phases: boss.phases.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      completed: p.completed,
    })),
    actionLabel: 'Kassenschluss-Checkliste öffnen',
    targetPage: 'mittelabrufe',
    subTab: 'za-rechner',
  };
}

export function computeBossEvents(params: {
  kassenschluss: BossEventState;
  zas: Zahlungsanforderung[];
  vergaben: Vergabe[];
  oekoprofitCheckups: OekoprofitCheckup[];
  rechnungen: Rechnungsbeleg[];
  auditChain?: { valid: boolean; checkedCount: number };
  today: string;
  hasBackup?: boolean;
}): BossEventCard[] {
  return [
    kassenschlussToCard(params.kassenschluss),
    computeBossMittelabrufFrist({ zas: params.zas, today: params.today }),
    computeBossVorOrtPruefung(params),
  ];
}
