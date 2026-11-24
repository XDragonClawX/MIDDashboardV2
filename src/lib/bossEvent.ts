import type {
  Rechnungsbeleg,
  Zahlungsanforderung,
} from '../types';
import { hasBackupInCurrentMonth } from './backup';
import { validateZaChain } from './zaChain';

// ── Boss-Event: Operation Kassenschluss (15. November) ──
export interface BossEventPhase {
  id: number;
  title: string;
  cleanTitle: string;
  description: string;
  completed: boolean;
  progressWeight: number;
}

export interface BossEventState {
  targetYear: number;
  deadlineDate: string;
  daysUntilClose: number;
  progressPct: number;
  trophyUnlocked: boolean;
  phases: BossEventPhase[];
}

export function computeBossEventKassenschluss(params: {
  zas: Zahlungsanforderung[];
  rechnungen: Rechnungsbeleg[];
  targetYear?: number;
}): BossEventState {
  const { zas, rechnungen } = params;
  const targetYear = params.targetYear || 2026;
  const deadlineDate = `${targetYear}-11-15`;
  const daysUntilClose = Math.ceil(
    (new Date(`${deadlineDate}T23:59:59`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const yearInvoices = rechnungen.filter((r) => r.foerderjahr === targetYear && r.foerderfaehig);
  const q34Invoices = yearInvoices.filter((r) => r.quartal >= 3);
  const readyQ34 = q34Invoices.filter((r) => r.status !== 'ENTWURF');
  const phase1Done = q34Invoices.length > 0 && readyQ34.length === q34Invoices.length;

  const yearZas = zas.filter((z) => z.datum.startsWith(String(targetYear)));
  const valMap = validateZaChain(zas);
  const allYearZasChainOk =
    yearZas.length > 0 && yearZas.every((z) => valMap[z.id]?.isChainValid !== false);
  const phase2Done = yearZas.length >= 2 && allYearZasChainOk;

  const hasNovOrQ4Za = yearZas.some(
    (z) =>
      (z.status === 'Eingereicht' || z.status === 'Abgerechnet') &&
      z.datum >= `${targetYear}-10-01`
  );
  const hasMonthlyBackup = hasBackupInCurrentMonth();
  const phase3Done = hasNovOrQ4Za && hasMonthlyBackup;

  const phases: BossEventPhase[] = [
    {
      id: 1,
      title: 'Phase 1 · Aufklärung (Q3/Q4-Belege)',
      cleanTitle: 'Schritt 1 · Q3/Q4-Belege prüfen & freigeben',
      description:
        q34Invoices.length > 0
          ? `${readyQ34.length} von ${q34Invoices.length} Q3/Q4-Belegen in ${targetYear} geprüft/eingereicht.`
          : `Noch keine Q3/Q4-Belege für ${targetYear} erfasst.`,
      completed: phase1Done,
      progressWeight: 33,
    },
    {
      id: 2,
      title: 'Phase 2 · Taktik (ZA-Kette & Pos. 0835)',
      cleanTitle: 'Schritt 2 · ZA-Kettenprüfung & Übertragungsbedarf',
      description: allYearZasChainOk
        ? `${yearZas.length} ZA(s) in ${targetYear} lückenlos über Spalte 2 verkettet.`
        : `ZA-Kettenprüfung oder mindestens 2 Jahres-ZAs ausstehend.`,
      completed: phase2Done,
      progressWeight: 33,
    },
    {
      id: 3,
      title: 'Phase 3 · Finale (Jahres-ZA & Snapshot)',
      cleanTitle: 'Schritt 3 · Jahresabschluss-ZA & Monats-Sicherung',
      description: `Q4-ZA eingereicht (${hasNovOrQ4Za ? 'Ja' : 'Offen'}) · Monats-Backup (${
        hasMonthlyBackup ? 'Gesichert' : 'Ausstehend'
      })`,
      completed: phase3Done,
      progressWeight: 34,
    },
  ];

  const progressPct = phases.reduce((s, p) => s + (p.completed ? p.progressWeight : 0), 0);

  return {
    targetYear,
    deadlineDate,
    daysUntilClose,
    progressPct,
    trophyUnlocked: phase1Done && phase2Done && phase3Done,
    phases,
  };
}
