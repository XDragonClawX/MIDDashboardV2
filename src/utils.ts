// Nächste freie numerische ID für eine Liste von Objekten mit id-Feld.
// Zentral, damit die ID-Vergabe nicht an vielen Stellen dupliziert wird.
export function getNextId<T extends { id: number }>(items: T[], start = 1): number {
  return items.length > 0 ? Math.max(...items.map((x) => x.id)) + 1 : start;
}

// Schema-Version der im localStorage abgelegten Daten. Erhöhen, sobald sich
// die Struktur eines gespeicherten Werts inkompatibel ändert, und in
// migrateStorage() die Migration ergänzen.
export const STORAGE_SCHEMA_VERSION = 1;

interface StorageEnvelope<T> {
  __v: number;
  data: T;
}

function isEnvelope<T>(value: unknown): value is StorageEnvelope<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { __v?: unknown }).__v === 'number' &&
    'data' in value
  );
}

/**
 * Migriert einen geladenen Wert von seiner gespeicherten Version auf die
 * aktuelle Schema-Version. Aktuell gibt es nur Version 1; künftige
 * Breaking-Changes werden hier schrittweise hochgezogen.
 */
function migrateStorage<T>(fromVersion: number, data: T): T {
  let version = fromVersion;
  let migrated = data;
  // Beispiel für künftige Migrationen:
  // if (version === 1) { migrated = ...; version = 2; }
  void version;
  return migrated;
}

export function loadLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const parsed: unknown = JSON.parse(item);

    // Neues, versioniertes Format
    if (isEnvelope<T>(parsed)) {
      return migrateStorage<T>(parsed.__v, parsed.data);
    }

    // Altbestand ohne Versionshülle: unverändert übernehmen. Wird beim
    // nächsten Speichern automatisch ins versionierte Format überführt.
    return parsed as T;
  } catch (error) {
    console.error(`Error loading key "${key}" from localStorage`, error);
    return defaultValue;
  }
}

export function saveLocalStorage<T>(key: string, value: T): void {
  try {
    const envelope: StorageEnvelope<T> = { __v: STORAGE_SCHEMA_VERSION, data: value };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    console.error(`Error saving key "${key}" to localStorage`, error);
  }
}

export function formatEuro(price: number, digits: number = 0): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(price || 0);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '–';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('de-DE');
  } catch {
    return dateString;
  }
}

export function getQuarterFromMonth(month: number): number {
  return Math.ceil(month / 3);
}

// Obergrenze für persistierte Audit-Einträge, damit der localStorage nicht
// unbegrenzt wächst und irgendwann das Quota sprengt.
export const MAX_AUDIT_ENTRIES = 1000;

export function downloadCSV(filename: string, rows: (string | number)[][]): void {
  // UTF-8 BOM so Excel opens it with right special chars (ä, ö, ü, €)
  const csvContent = '\uFEFF' + rows.map((e) => e.map((val) => {
    const clean = String(val ?? '').replace(/"/g, '""');
    return clean.includes(';') || clean.includes('\n') || clean.includes('"') ? `"${clean}"` : clean;
  }).join(';')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
