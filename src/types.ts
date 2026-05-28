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
  lhoAnteil: number;
  eigenaufwand: number;
  foerderjahr: number;
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
  foerderjahr: number;
  quartal: number;
  arbeitspaket: string;
  betragNetto: number;
  betragBrutto: number;
  foerderfaehig: boolean;
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
  status: 'Vorbereitung' | 'Veröffentlichung' | 'Angebotsphase' | 'Prüfung' | 'Zuschlag' | 'abgeschlossen';
  notizen: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseCase {
  id: number;
  titel: string;
  unternehmen: string;
  ansprechpartner: string;
  branche: string; // Papier | Chemie | Textil | Energie | Übergreifend
  reifegrad: string; // Idee | Konzept | Prototyp | Pilotbetrieb | Produktiv | Skalierung
  batch: string; // Batch 1 | Batch 2 | Batch 3 | Batch 4
  thema: string;
  risiken: string;
  politischeRelevanz: number; // 1-5
  deadline: string; // YYYY-MM-DD
  erfolgswahrscheinlichkeit: number; // 0-100
  status: 'Pipeline' | 'in Prüfung' | 'aktiv' | 'kritisch' | 'abgeschlossen';
  notizen: string;
  sharepointUrl: string;
  websiteUrl: string;
  industrieWebsite?: string;
  loesung?: string;
  loesungWebsite?: string;
  projektbeschreibung?: string;
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
  useCaseId?: number | null; // Associated Use Case
  vergabeId?: number | null; // Associated Vergabe
  rechnungId?: number | null; // Associated Rechnung
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
  status: 'in Kontakt' | 'aktiv' | 'Pilot läuft' | 'abgeschlossen' | 'abgelehnt';
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
}


