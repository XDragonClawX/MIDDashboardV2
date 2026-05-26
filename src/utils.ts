import { AuditLogItem } from './types';

// Storage und Recovery keys
export const STORAGE_KEYS = {
  personal: 'midpct_personal',
  rechnungen: 'midpct_rechnungen',
  mittelabrufe: 'midpct_mittelabrufe',
  buchungen: 'midpct_buchungen',
  vergaben: 'midpct_vergaben',
  usecases: 'midpct_usecases',
  audit: 'midpct_audit',
  partner: 'midpct_partner',
  mitarbeiter: 'midpct_mitarbeiter_namen',
  ucNotes: 'midpct_uc_notes',
  ucInvoices: 'midpct_uc_inv',
  events: 'midpct_events',
};

export function loadLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading key "${key}" from localStorage`, error);
    return defaultValue;
  }
}

export function saveLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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

export function addAuditLog(
  entityType: string,
  entityId: number,
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'EXPORT' | 'IMPORT' | 'ARCHIVE',
  alterWert: string = '',
  neuerWert: string = ''
): void {
  try {
    const logs = loadLocalStorage<AuditLogItem[]>(STORAGE_KEYS.audit, []);
    const newId = logs.length ? Math.max(...logs.map((x) => x.id)) + 1 : 1;
    const newItem: AuditLogItem = {
      id: newId,
      entityType,
      entityId,
      changeType,
      windowsUser: 'WIN.DN-PROJEKTOOFFICE',
      computerName: 'SURFACE-PRO-CLIENT',
      alterWert: String(alterWert),
      neuerWert: String(neuerWert),
      createdAt: new Date().toISOString(),
    };
    logs.unshift(newItem);
    saveLocalStorage(STORAGE_KEYS.audit, logs);
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
}

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
