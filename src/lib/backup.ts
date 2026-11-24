// ── Backup Timestamp Tracking (Backup-Wächter) ──
export const BACKUP_TIMESTAMP_KEY = 'midpct_last_backup_at';

// Verlauf der Monate (YYYY-MM) mit mindestens einer Sicherung – Grundlage
// für die Backup-Serie im Trophäenschrank.
export const BACKUP_MONTHS_KEY = 'midpct_backup_months';
export const BACKUP_RECORDED_EVENT = 'midpct-backup-recorded';

export function recordBackupTimestamp(): string {
  const now = new Date().toISOString();
  try {
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, now);
    const months = getBackupMonths();
    const month = now.slice(0, 7);
    if (!months.includes(month)) {
      localStorage.setItem(BACKUP_MONTHS_KEY, JSON.stringify([...months, month].sort()));
    }
  } catch {
    // Ignore storage quota errors
  }
  try {
    window.dispatchEvent(new Event(BACKUP_RECORDED_EVENT));
  } catch {
    // Kein window (z. B. Tests)
  }
  return now;
}

export function getBackupMonths(): string[] {
  try {
    const raw = localStorage.getItem(BACKUP_MONTHS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const months = Array.isArray(parsed)
      ? parsed.filter((m): m is string => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m))
      : [];
    // Bestand vor Einführung des Verlaufs: letzte Sicherung übernehmen
    const last = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    if (last && !months.includes(last.slice(0, 7))) months.push(last.slice(0, 7));
    return months.sort();
  } catch {
    return [];
  }
}

export function getLastBackupTimestamp(): string | null {
  try {
    return localStorage.getItem(BACKUP_TIMESTAMP_KEY);
  } catch {
    return null;
  }
}

export function hasBackupInCurrentMonth(): boolean {
  const ts = getLastBackupTimestamp();
  if (!ts) return false;
  const nowMonth = new Date().toISOString().slice(0, 7);
  return ts.slice(0, 7) === nowMonth;
}
