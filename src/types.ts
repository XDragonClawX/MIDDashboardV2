export type ProfiPositionCode = '0812' | '0817' | '0820' | '0831' | '0835' | '0843';

export type ProfiPositionAmounts = Record<ProfiPositionCode, number>;

export type AzaPlanVersion =
  | 'baseline_2025_03'
  | 'aenderung_2025_12_personal'
  | 'aenderung_2026_11_uebertrag';

export interface SystemSettings {
  vorsteuerabzugsberechtigt: boolean;
  privacyMode: boolean;
  boardroomMode: boolean;
  azaVersion: AzaPlanVersion;
  gamificationMode?: boolean;
}

export interface MitarbeiterStamm {
  id: number;
  name: string;
  rolle: string;
  primaerePosition: '0812' | '0817';
  svQuote: number; // z. B. 0.185 für Angestellte, 0.18 für Aushilfen/SHK
  tvoedGruppe: string;
  tvoedStufe: string;
  aktiv: boolean;
}

export interface Zahlungsanforderung {
  id: number;
  bezeichnung: string;
  kennung?: string; // e.g. 2992656-5
  datum: string; // YYYY-MM-DD (ZA-Datum)
  zeitraumVon: string;
  zeitraumBis: string;
  stichtagIst: string; // YYYY-MM-DD
  spalte2BisherGeplant?: number; // Vorherige Spalte 3 + Spalte 5
  istJePosition: ProfiPositionAmounts; // Spalte 3 kumuliert
  vorschauJePosition: ProfiPositionAmounts; // Spalte 5 Zweimonats-Vorschau
  kassenbestand: number; // Zeile 16 = Zeile 14 - Zeile 15 (positiv = Guthaben)
  erhalteneBundesmittel: number; // Zeile 14 bzw. angerechnete Vorleistungen
  zeile14BisherAnzurechnen?: number; // Zeile 14 explizit (90 % von Spalte 2)
  zeile17ZusatzVerrechnung?: number; // Zeile 17 Zusätzlich zu verrechnen
  auszahlungsDatum?: string | null; // Wertstellungsdatum für ANBest-P 2-Monats-Frist
  bundesanteilQuote: number; // 0.90
  zeile19Anforderung: number;
  belegVollstaendig: boolean;
  manuelleKorrektur: boolean;
  notizen?: string;
  pdfHash?: string;
  status: 'Entwurf' | 'Eingereicht' | 'Abgerechnet';
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalEintrag {
  id: number;
  mitarbeiter: string;
  monat: number; // 1-12
  jahr: number;
  quartal: number; // 1-4
  agKosten: number;
  sachkosten: number;
  foerderfaehig: number;
  bafaAnteil: number;
  lhoAnteil?: number; // legacy compatibility (always 0 in 90/10 FKZ 46SK0267X)
  eigenaufwand: number;
  foerderjahr: number;
  profiPosition?: '0812' | '0817' | '0820';
  brutto0812?: number; // Exakter DATEV-Anteil 0812
  brutto0817?: number; // Exakter DATEV-Anteil 0817
  sv0820?: number; // Exakter DATEV-Anteil 0820
  status: 'ENTWURF' | 'IN_PRUEFUNG' | 'EINGEREICHT' | 'ARCHIVIERT';
  bemerkung: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Rechnungsbeleg {
  id: number;
  rechnungsnummer: string;
  rechnungssteller: string;
  leistungsbeschreibung: string;
  rechnungsdatum: string; // YYYY-MM-DD
  zahlungsdatum: string | null; // YYYY-MM-DD
  kostenkategorie: string;
  profiPosition?: ProfiPositionCode;
  foerderjahr: number;
  quartal: number;
  arbeitspaket: string;
  betragNetto: number;
  betragBrutto: number;
  mwstSatz?: 0 | 7 | 19 | 'brutto';
  foerderfaehigerBetrag?: number;
  foerderfaehig: boolean;
  useCaseId?: number | null;
  vergabeId?: number | null;
  pdfHash?: string;
  status: 'ENTWURF' | 'IN_PRUEFUNG' | 'EINGEREICHT' | 'ARCHIVIERT';
  createdAt?: string;
  updatedAt?: string;
}

export interface Mittelabruf {
  id: number;
  abrufnummer: string;
  zeitraumVon: string;
  zeitraumBis: string;
  mittelgeber: 'BAFA_BUND' | 'LHO_LAND';
  foerderjahr: number;
  quartal: number;
  beantragt: number;
  eingegangen: number;
  differenz: number;
  zaId?: number;
  status: 'ENTWURF' | 'IN_PRUEFUNG' | 'EINGEREICHT' | 'ARCHIVIERT';
  createdAt?: string;
}

export interface Buchung {
  id: number;
  datum: string;
  kategorie: string;
  beschreibung: string;
  betrag: number;
  foerderfaehig: boolean;
  arbeitspaket: string;
  foerderjahr: number;
  status: 'geplant' | 'reserviert' | 'gebucht' | 'geprüft' | 'freigegeben';
  createdAt?: string;
}

export interface Vergabe {
  id: number;
  titel: string;
  auftragnehmer: string;
  vergabeart: string;
  auftragswert: number;
  ausschreibungsDatum: string | null;
  abgabeFrist: string | null;
  zuschlagsDatum: string | null;
  vertragsende: string | null;
  arbeitspaket: string | null;
  bafaFreigabe: boolean;
  useCaseId?: number | null;
  status: 'Vorbereitung' | 'Veröffentlichung' | 'Angebotsphase' | 'Prüfung' | 'Zuschlag' | 'abgeschlossen';
  notizen: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseCaseTodo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
}

export interface UseCase {
  id: number;
  titel: string;
  unternehmen: string; // Industrieunternehmen
  startupPartner?: string; // Startup / Lösungspartner
  ansprechpartner: string;
  branche: string; // Papier | Chemie | Textil | Energie | Übergreifend
  reifegrad: string; // Idee | Konzept | Prototyp | Pilotbetrieb | Produktiv | Skalierung
  batch: string; // Batch 1 | Batch 2 | Batch 3 | Batch 4
  thema: string;
  risiken: string;
  politischeRelevanz: number; // 1-5
  deadline: string; // YYYY-MM-DD
  erfolgswahrscheinlichkeit: number; // 0-100
  status: 'Pipeline' | 'in Prüfung' | 'in Vorbereitung' | 'aktiv' | 'kritisch' | 'abgeschlossen';
  notizen: string;
  sharepointUrl: string;
  websiteUrl: string;
  industrieWebsite?: string;
  loesung?: string;
  loesungWebsite?: string;
  projektbeschreibung?: string;
  problemstellung?: string;
  loesungsansatz?: string;
  statusNextSteps?: string;
  standortMehrwert?: string;
  todos?: UseCaseTodo[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string | null;
  status: 'offen' | 'in_bearbeitung' | 'erledigt';
  priority: 'niedrig' | 'mittel' | 'hoch';
  useCaseId?: number | null;
  vergabeId?: number | null;
  rechnungId?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export interface UCNotiz {
  id: number;
  type: 'update' | 'meilenstein' | 'problem' | 'meeting';
  text: string;
  date: string;
  author: string;
}

export interface Partner {
  id: number;
  name: string;
  typ: 'Startup / Lösungspartner' | 'Industrieunternehmen' | 'Kooperationspartner' | 'Dienstleister';
  branche: string;
  status: 'in Kontakt' | 'aktiv' | 'Pilot läuft' | 'Vorbereitung' | 'abgeschlossen' | 'abgelehnt';
  rolle?: string;
  useCase?: string;
  ap?: string;
  funktion?: string;
  email?: string;
  tel?: string;
  web?: string;
  ort?: string;
  bewertung?: number; // 1-5
  gruendung?: string;
  tech?: string;
  beschr?: string;
  notizen?: string;
  datum?: string;
  sharepoint?: string;
  createdAt?: string;
}

export interface AuditLogItem {
  id: number;
  entityType: string;
  entityId: number;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'EXPORT' | 'IMPORT' | 'ARCHIVE';
  windowsUser: string;
  computerName: string;
  alterWert: string;
  neuerWert: string;
  createdAt: string;
}

export interface EventLogItem {
  id: number;
  titel: string;
  datum: string;
  beschreibung: string;
  ort: string;
  akteure: string;
  kategorie: 'Netzwerktreffen' | 'Workshop' | 'Meilenstein' | 'Ausschuss' | 'Sonstiges';
}

export interface PartnerMatch {
  id?: number;
  industryId: number;
  providerId: number;
  type: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  module: string;
  action: string;
  details: string;
  user: string;
  entityType?: string;
  entityId?: number;
  beforeJson?: string;
  afterJson?: string;
  previousHash?: string;
  hash?: string;
  pdfHash?: string;
}

export interface OekoprofitCheckup {
  id: number;
  startupName: string;
  berater: string;
  branche: string;
  verguetungBrutto: number; // Standard 5000.00 EUR brutto (Pos. 0835)
  termin1Datum?: string;
  protokoll1Abgegeben: boolean;
  termin2Datum?: string;
  protokoll2Abgegeben: boolean;
  termin3Datum?: string;
  abschlussReportingAbgegeben: boolean;
  abschlag1Freigegeben: boolean; // 25% = 1.250 EUR
  abschlag2Freigegeben: boolean; // 25% = 1.250 EUR
  schlusszahlungFreigegeben: boolean; // 50% = 2.500 EUR
  tranche1Invoiced?: boolean;
  tranche2Invoiced?: boolean;
  tranche3Invoiced?: boolean;
  status: 'Geplant' | 'In Beratung' | 'Reporting offen' | 'Abgeschlossen';
  notizen?: string;
}

// ── Gamification Stufe 1: Stufen, Serien, dauerhafte Freischaltungen ──
export type AchievementTier = 'bronze' | 'silber' | 'gold';

export interface StreakResult {
  current: number; // aktuelle Serie (neueste Einträge rückwärts gezählt)
  best: number; // längste Serie im gesamten Verlauf
  jokerUsed: boolean; // wurde in der aktuellen Serie die Schonfrist verbraucht?
  total: number; // Anzahl bewerteter Einträge
}

export interface ComplianceStreaks {
  belegTempo: StreakResult; // Belege ≤ 5 Werktage nach Rechnungsdatum erfasst
  backup: StreakResult; // Monate mit mindestens einer Datensicherung
  zaKette: StreakResult; // eingereichte ZAs mit gültiger Kette (Spalte 2)
}

export interface AchievementUnlock {
  achievementId: string;
  tier: AchievementTier | null; // null = Abzeichen ohne Stufen
  unlockedAt: string; // ISO-Zeitstempel der Freischaltung
  retroactive?: boolean; // beim ersten Start aus Bestandsdaten übernommen
}
