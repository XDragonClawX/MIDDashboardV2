import { PersonalEintrag, Rechnungsbeleg, Mittelabruf, Vergabe, UseCase, Partner, AuditLogItem, EventLogItem, Task } from './types';

// Unveränderliche Fördervereinbarung/Planwerte für die Jahre 2025–2029
export const AZA_JAHRE = [
  { key: 'gesamt25', label: '2025 (Apr–Dez)', short: '2025', von: '2025-04-01', bis: '2025-12-31' },
  { key: '2026', label: '2026', short: '2026', von: '2026-01-01', bis: '2026-12-31' },
  { key: '2027', label: '2027', short: '2027', von: '2027-01-01', bis: '2027-12-31' },
  { key: '2028', label: '2028', short: '2028', von: '2028-01-01', bis: '2028-12-31' },
  { key: 'mrz29', label: '2029 (Jan–Mär)', short: '2029', von: '2029-01-01', bis: '2029-03-31' },
];

export const AZA_PLAN = {
  personal: [
    { pos: 'Innovations-Manager/in (Master) – Projektleitung', kat: 'F0824 Personal', gesamt25: 52399.08, '2026': 69865.44, '2027': 75432.47, '2028': 77190.47, mrz29: 18525.71 },
    { pos: 'Netzwerk-Manager/in (Master)', kat: 'F0824 Personal', gesamt25: 46120.35, '2026': 65875.16, '2027': 67258.75, '2028': 71385.14, mrz29: 17445.17 },
    { pos: 'Vergabe-Manager/in (Bachelor)', kat: 'F0824 Personal', gesamt25: 22276.42, '2026': 31418.37, '2027': 31960.42, '2028': 33911.71, mrz29: 8286.70 },
    { pos: 'Studentische Hilfskraft', kat: 'F0824 Personal', gesamt25: 9816.50, '2026': 24312.00, '2027': 24324.00, '2028': 24336.00, mrz29: 3272.17 },
  ],
  overhead: { pos: 'Geschäftsbedarf (10% auf Personal)', kat: 'F0839 Geschäftsbedarf', gesamt25: 13061.23, '2026': 19147.10, '2027': 19897.56, '2028': 20682.33, mrz29: 4752.97 },
  auftraege: [
    { pos: 'Juristische Beratung', kat: 'F0835 Vergabe', gesamt25: 15000.00, '2026': 7600.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Design-Sprint + Use-Case-Definition', kat: 'F0835 Vergabe', gesamt25: 15000.00, '2026': 0.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Marketing', kat: 'F0835 Vergabe', gesamt25: 31000.00, '2026': 10100.00, '2027': 10500.00, '2028': 3500.00, mrz29: 1800.00 },
    { pos: 'Ökoprofit-Checkup', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 20000.00, '2027': 20000.00, '2028': 20000.00, mrz29: 0.00 },
    { pos: 'Veranstaltungen', kat: 'F0835 Vergabe', gesamt25: 11143.00, '2026': 13423.00, '2027': 13423.00, '2028': 13423.00, mrz29: 8365.00 },
    { pos: 'Mitgliedsbeiträge Kooperationspartner', kat: 'F0835 Vergabe', gesamt25: 5775.00, '2026': 3000.00, '2027': 3000.00, '2028': 7700.00, mrz29: 1925.00 },
    { pos: 'Transformations-Booster 1', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 37000.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 2', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 37000.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 3', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 37000.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 4', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 37000.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 5', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 0.00, '2027': 37000.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 6', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 0.00, '2027': 37000.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 7', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 0.00, '2027': 37000.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 8', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 0.00, '2027': 37000.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 9', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 0.00, '2027': 0.00, '2028': 37000.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 10', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 0.00, '2027': 0.00, '2028': 37000.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 11', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 0.00, '2027': 0.00, '2028': 37000.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 12', kat: 'F0835 Vergabe', gesamt25: 0.00, '2026': 0.00, '2027': 0.00, '2028': 37000.00, mrz29: 0.00 },
  ],
  miete: { pos: 'Drucker-Leasing', kat: 'F0832 Mieten', gesamt25: 1274.79, '2026': 1699.72, '2027': 1699.72, '2028': 1699.72, mrz29: 424.93 },
  gegenst: { pos: 'Gegenstände < 800 EUR', kat: 'F0831 Gegenstände', gesamt25: 1598.00, '2026': 0.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
  reisen: { pos: 'Inlandsreisen', kat: 'F0844 Reisen', gesamt25: 0.00, '2026': 1202.00, '2027': 1392.00, '2028': 2255.20, mrz29: 0.00 },
  foerder: {
    gesamt25: { gesamt: 224464.37, foerderbar: 218852.76, bafa: 202017.93, lho: 16834.83, eigen: 5611.61 },
    '2026': { gesamt: 415642.78, foerderbar: 405251.72, bafa: 374078.51, lho: 31173.21, eigen: 10391.07 },
    '2027': { gesamt: 416887.92, foerderbar: 406465.72, bafa: 375199.13, lho: 31266.59, eigen: 10422.20 },
    '2028': { gesamt: 424083.56, foerderbar: 413481.47, bafa: 381675.21, lho: 31806.27, eigen: 10602.09 },
    mrz29: { gesamt: 64797.65, foerderbar: 63177.71, bafa: 58317.89, lho: 4859.82, eigen: 1619.94 },
  },
};

export const SEED_MITARBEITER = [
  'von Styp-Rekowski',
  'Lena Guth',
  'Lea Fischöder'
];

export const SEED_PERSONAL: PersonalEintrag[] = [
  // von Styp-Rekowski — Projektstart Juli 2025
  { id: 1, mitarbeiter: 'von Styp-Rekowski', monat: 7, jahr: 2025, quartal: 3, agKosten: 5675.31, sachkosten: 567.53, foerderfaehig: 6242.84, bafaAnteil: 5618.56, lhoAnteil: 468.21, eigenaufwand: 156.07, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: 'Projektleitung Projektstart' },
  { id: 2, mitarbeiter: 'von Styp-Rekowski', monat: 8, jahr: 2025, quartal: 3, agKosten: 5675.31, sachkosten: 567.53, foerderfaehig: 6242.84, bafaAnteil: 5618.56, lhoAnteil: 468.21, eigenaufwand: 156.07, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: '' },
  { id: 3, mitarbeiter: 'von Styp-Rekowski', monat: 9, jahr: 2025, quartal: 3, agKosten: 5675.31, sachkosten: 567.53, foerderfaehig: 6242.84, bafaAnteil: 5618.56, lhoAnteil: 468.21, eigenaufwand: 156.07, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: '' },
  { id: 4, mitarbeiter: 'von Styp-Rekowski', monat: 10, jahr: 2025, quartal: 4, agKosten: 5709.92, sachkosten: 570.99, foerderfaehig: 6280.91, bafaAnteil: 5652.82, lhoAnteil: 471.07, eigenaufwand: 157.02, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: 'Anpassung Einstufung' },
  { id: 5, mitarbeiter: 'von Styp-Rekowski', monat: 11, jahr: 2025, quartal: 4, agKosten: 6623.50, sachkosten: 662.35, foerderfaehig: 7285.85, bafaAnteil: 6557.27, lhoAnteil: 546.44, eigenaufwand: 182.15, foerderjahr: 2025, status: 'ENTWURF', bemerkung: 'Inkl. Jahressonderzahlung' },
  { id: 6, mitarbeiter: 'von Styp-Rekowski', monat: 12, jahr: 2025, quartal: 4, agKosten: 6139.60, sachkosten: 613.96, foerderfaehig: 6753.56, bafaAnteil: 6078.20, lhoAnteil: 506.52, eigenaufwand: 168.84, foerderjahr: 2025, status: 'ENTWURF', bemerkung: '' },
  // Lena Guth — ab Oktober 2025
  { id: 7, mitarbeiter: 'Lena Guth', monat: 10, jahr: 2025, quartal: 4, agKosten: 4232.45, sachkosten: 423.25, foerderfaehig: 4655.70, bafaAnteil: 4190.13, lhoAnteil: 349.18, eigenaufwand: 116.39, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: 'Eintritt Oktober' },
  { id: 8, mitarbeiter: 'Lena Guth', monat: 11, jahr: 2025, quartal: 4, agKosten: 4232.45, sachkosten: 423.25, foerderfaehig: 4655.70, bafaAnteil: 4190.13, lhoAnteil: 349.18, eigenaufwand: 116.39, foerderjahr: 2025, status: 'ENTWURF', bemerkung: '' },
  { id: 9, mitarbeiter: 'Lena Guth', monat: 12, jahr: 2025, quartal: 4, agKosten: 4973.96, sachkosten: 497.40, foerderfaehig: 5471.36, bafaAnteil: 4924.22, lhoAnteil: 410.35, eigenaufwand: 136.78, foerderjahr: 2025, status: 'ENTWURF', bemerkung: 'Inkl. Jahressonderzahlung' },
  // Lea Fischöder — ab September 2025
  { id: 10, mitarbeiter: 'Lea Fischöder', monat: 9, jahr: 2025, quartal: 3, agKosten: 1082.35, sachkosten: 108.24, foerderfaehig: 1190.59, bafaAnteil: 1071.53, lhoAnteil: 89.29, eigenaufwand: 29.76, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: 'Hilfskraft' },
  { id: 11, mitarbeiter: 'Lea Fischöder', monat: 10, jahr: 2025, quartal: 4, agKosten: 1082.35, sachkosten: 108.24, foerderfaehig: 1190.59, bafaAnteil: 1071.53, lhoAnteil: 89.29, eigenaufwand: 29.76, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: '' },
  { id: 12, mitarbeiter: 'Lea Fischöder', monat: 11, jahr: 2025, quartal: 4, agKosten: 1082.35, sachkosten: 108.24, foerderfaehig: 1190.59, bafaAnteil: 1071.53, lhoAnteil: 89.29, eigenaufwand: 29.76, foerderjahr: 2025, status: 'ENTWURF', bemerkung: '' },
  { id: 13, mitarbeiter: 'Lea Fischöder', monat: 12, jahr: 2025, quartal: 4, agKosten: 1254.91, sachkosten: 125.49, foerderfaehig: 1380.40, bafaAnteil: 1242.36, lhoAnteil: 103.53, eigenaufwand: 34.51, foerderjahr: 2025, status: 'ENTWURF', bemerkung: 'Inkl. Jahressonderzahlung' },
];

export const SEED_RECHNUNGEN: Rechnungsbeleg[] = [
  // Q2/Q3 2025
  { id: 1, rechnungsnummer: 'META-2025-001', rechnungssteller: 'Meta', leistungsbeschreibung: 'Bewerbung Social Media', rechnungsdatum: '2025-06-24', zahlungsdatum: '2025-06-24', kostenkategorie: 'Marketing', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 31.00, betragBrutto: 31.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 2, rechnungsnummer: 'META-2025-002', rechnungssteller: 'Meta', leistungsbeschreibung: 'Bewerbung Social Media', rechnungsdatum: '2025-06-25', zahlungsdatum: '2025-06-25', kostenkategorie: 'Marketing', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 31.00, betragBrutto: 31.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 3, rechnungsnummer: 'META-2025-003', rechnungssteller: 'Meta', leistungsbeschreibung: 'Bewerbung Social Media', rechnungsdatum: '2025-06-20', zahlungsdatum: '2025-06-20', kostenkategorie: 'Marketing', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 7.73, betragBrutto: 7.73, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 4, rechnungsnummer: 'GEMA-2025-001', rechnungssteller: 'GEMA KundenCenter', leistungsbeschreibung: 'Unterhaltungsmusik DN POWER UP', rechnungsdatum: '2025-06-09', zahlungsdatum: '2025-06-10', kostenkategorie: 'Veranstaltungen', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 124.15, betragBrutto: 124.15, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 5, rechnungsnummer: 'KLAWIE-2025-001', rechnungssteller: 'KlaWie Veranstaltungstechnik', leistungsbeschreibung: 'Veranstaltungstechnik DN POWER UP', rechnungsdatum: '2025-06-26', zahlungsdatum: '2025-07-15', kostenkategorie: 'Veranstaltungen', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 2005.15, betragBrutto: 2005.15, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 6, rechnungsnummer: 'KUEMPEL-2025-001', rechnungssteller: 'Anna-Lena Kümpel', leistungsbeschreibung: 'Moderation DN POWER UP', rechnungsdatum: '2025-07-07', zahlungsdatum: '2025-07-21', kostenkategorie: 'Veranstaltungen', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 1071.00, betragBrutto: 1071.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 7, rechnungsnummer: 'JDPHOTO-2025-001', rechnungssteller: 'JDPhotoArt', leistungsbeschreibung: 'Fotografie DN POWER UP', rechnungsdatum: '2025-06-29', zahlungsdatum: '2025-07-01', kostenkategorie: 'Veranstaltungen', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 824.19, betragBrutto: 824.19, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 8, rechnungsnummer: 'SDC-2025-001', rechnungssteller: 'Sozialwerk Dürener Christen', leistungsbeschreibung: 'Blumensträuße', rechnungsdatum: '2025-07-08', zahlungsdatum: '2025-07-21', kostenkategorie: 'Gegenstände <800€', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 150.00, betragBrutto: 150.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 9, rechnungsnummer: 'STDT-2025-001', rechnungssteller: 'Stadt Düren', leistungsbeschreibung: 'Präsentkorb Zuschauerpreis', rechnungsdatum: '2025-07-02', zahlungsdatum: '2025-07-07', kostenkategorie: 'Gegenstände <800€', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 63.40, betragBrutto: 63.40, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 10, rechnungsnummer: 'FLYER-2025-001', rechnungssteller: 'Flyeralarm GmbH', leistungsbeschreibung: 'Messetheke Made in Düren', rechnungsdatum: '2025-08-08', zahlungsdatum: '2025-08-12', kostenkategorie: 'Gegenstände <800€', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 265.45, betragBrutto: 265.45, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 11, rechnungsnummer: 'FLYER-2025-002', rechnungssteller: 'Flyeralarm GmbH', leistungsbeschreibung: 'Roll-up Made in Düren', rechnungsdatum: '2025-08-19', zahlungsdatum: '2025-08-19', kostenkategorie: 'Gegenstände <800€', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 115.08, betragBrutto: 115.08, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 12, rechnungsnummer: 'DUESSRF-2025-001', rechnungssteller: 'Düsseldorf Rheinland GmbH', leistungsbeschreibung: 'Messetickets Future Tech Fest', rechnungsdatum: '2025-09-01', zahlungsdatum: '2025-09-04', kostenkategorie: 'Vergabeaufträge', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP2 – Technologietransfer', betragNetto: 153.00, betragBrutto: 153.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  // Q4 2025
  { id: 13, rechnungsnummer: 'SKOPOS-2025-001', rechnungssteller: 'Skopos Nova GmbH', leistungsbeschreibung: 'Design Thinking Workshop', rechnungsdatum: '2025-11-21', zahlungsdatum: '2025-12-15', kostenkategorie: 'Workshops', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP2 – Technologietransfer', betragNetto: 12495.00, betragBrutto: 12495.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 14, rechnungsnummer: 'CROLLA-2025-001', rechnungssteller: 'Crolla Lowis', leistungsbeschreibung: 'Marketing Teilzahlung 1', rechnungsdatum: '2025-10-24', zahlungsdatum: '2025-11-12', kostenkategorie: 'Marketing', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 8925.00, betragBrutto: 8925.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 15, rechnungsnummer: 'MTS-2025-001', rechnungssteller: 'Meet the Startup Catering', leistungsbeschreibung: 'Catering Meet the Startup', rechnungsdatum: '2025-11-07', zahlungsdatum: '2025-11-12', kostenkategorie: 'Veranstaltungen', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 403.05, betragBrutto: 403.05, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 16, rechnungsnummer: 'WEBFLOW-2025-001', rechnungssteller: 'Webflow', leistungsbeschreibung: 'Webhosting', rechnungsdatum: '2025-12-17', zahlungsdatum: '2025-12-17', kostenkategorie: 'Hosting/Web', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 276.00, betragBrutto: 276.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 17, rechnungsnummer: 'CROLLA-2025-002', rechnungssteller: 'Crolla Lowis', leistungsbeschreibung: 'Marketing Teilzahlung 2', rechnungsdatum: '2025-12-03', zahlungsdatum: '2025-12-10', kostenkategorie: 'Marketing', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 11900.00, betragBrutto: 11900.00, foerderfaehig: true, status: 'EINGEREICHT' },
  // Q1 2026
  { id: 18, rechnungsnummer: 'RSD-2026-001', rechnungssteller: 'Redeker/Sellner/Dahs', leistungsbeschreibung: 'Juristische Beratung Pauschalhonorar', rechnungsdatum: '2026-02-10', zahlungsdatum: '2026-02-13', kostenkategorie: 'Juristische Beratung', foerderjahr: 2026, quartal: 1, arbeitspaket: 'AP1 – Projektmanagement', betragNetto: 14280.00, betragBrutto: 14280.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 19, rechnungsnummer: 'RSD-2026-002', rechnungssteller: 'Redeker/Sellner/Dahs', leistungsbeschreibung: 'Juristische Beratung Zeitaufwand', rechnungsdatum: '2026-02-10', zahlungsdatum: '2026-02-13', kostenkategorie: 'Juristische Beratung', foerderjahr: 2026, quartal: 1, arbeitspaket: 'AP1 – Projektmanagement', betragNetto: 1428.00, betragBrutto: 1428.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 20, rechnungsnummer: 'CROLLA-2026-001', rechnungssteller: 'Crolla Lowis', leistungsbeschreibung: 'Marketing Schlussrechnung', rechnungsdatum: '2026-01-30', zahlungsdatum: '2026-02-13', kostenkategorie: 'Marketing', foerderjahr: 2026, quartal: 1, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 9038.05, betragBrutto: 9038.05, foerderfaehig: true, status: 'EINGEREICHT' },
];

export const SEED_MITTELABRUFE: Mittelabruf[] = [
  { id: 1, abrufnummer: 'BAFA-2025-Q2Q3', zeitraumVon: '2025-07-01', zeitraumBis: '2025-09-30', mittelgeber: 'BAFA_BUND', foerderjahr: 2025, quartal: 3, beantragt: 22123.62, eingegangen: 22123.62, differenz: 0, status: 'ARCHIVIERT' },
  { id: 2, abrufnummer: 'LHO-2025-Q2Q3', zeitraumVon: '2025-07-01', zeitraumBis: '2025-09-30', mittelgeber: 'LHO_LAND', foerderjahr: 2025, quartal: 3, beantragt: 1843.63, eingegangen: 1843.63, differenz: 0, status: 'ARCHIVIERT' },
  { id: 3, abrufnummer: 'BAFA-2025-Q4', zeitraumVon: '2025-10-01', zeitraumBis: '2025-12-31', mittelgeber: 'BAFA_BUND', foerderjahr: 2025, quartal: 4, beantragt: 35262.90, eingegangen: 0, differenz: 35262.90, status: 'EINGEREICHT' },
  { id: 4, abrufnummer: 'LHO-2025-Q4', zeitraumVon: '2025-10-01', zeitraumBis: '2025-12-31', mittelgeber: 'LHO_LAND', foerderjahr: 2025, quartal: 4, beantragt: 2938.58, eingegangen: 0, differenz: 2938.58, status: 'EINGEREICHT' },
];

export const SEED_VERGABEN: Vergabe[] = [
  { id: 1, titel: 'Digitalisierungsberatung Textilunternehmen', auftragnehmer: 'Müller & Partner GmbH', vergabeart: 'freihändige Vergabe', auftragswert: 24000.00, ausschreibungsDatum: '2025-04-10', abgabeFrist: '2025-04-30', zuschlagsDatum: '2025-05-05', vertragsende: '2025-12-31', arbeitspaket: 'AP2 – Technologietransfer', bafaFreigabe: true, status: 'Zuschlag', notizen: 'Laufendes Projekt im Sektor Textil' },
  { id: 2, titel: 'Design Thinking Workshop (Skopos Nova)', auftragnehmer: 'Skopos Nova GmbH', vergabeart: 'freihändige Vergabe', auftragswert: 12495.00, ausschreibungsDatum: '2025-10-01', abgabeFrist: '2025-11-15', zuschlagsDatum: '2025-11-21', vertragsende: '2025-12-31', arbeitspaket: 'AP2 – Technologietransfer', bafaFreigabe: true, status: 'abgeschlossen', notizen: 'Erfolgreich durchgeführt' },
  { id: 3, titel: 'Marketing-Kampagne (Crolla Lowis)', auftragnehmer: 'Crolla Lowis', vergabeart: 'freihändige Vergabe', auftragswert: 29750.00, ausschreibungsDatum: '2025-09-01', abgabeFrist: '2025-10-01', zuschlagsDatum: '2025-10-24', vertragsende: '2026-03-31', arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', bafaFreigabe: true, status: 'abgeschlossen', notizen: 'Drei Teilrechnungen abgerechnet' },
  { id: 4, titel: 'Juristische Beratung (Redeker/Sellner/Dahs)', auftragnehmer: 'Redeker/Sellner/Dahs', vergabeart: 'freihändige Vergabe', auftragswert: 15708.00, ausschreibungsDatum: '2025-12-01', abgabeFrist: '2026-01-31', zuschlagsDatum: '2026-02-10', vertragsende: '2026-06-30', arbeitspaket: 'AP1 – Projektmanagement', bafaFreigabe: true, status: 'Zuschlag', notizen: 'Unterstützung Vergaberecht Booster' },
];

export const SEED_USECASES: UseCase[] = [
  {
    id: 1,
    titel: 'Chemisches Recycling von Kunststoff- und Mischgewebeabfällen',
    unternehmen: 'GKD Group',
    ansprechpartner: 'Dr. Michael Müller',
    branche: 'Textil',
    reifegrad: 'Pilotbetrieb',
    batch: 'Batch 1',
    thema: 'Recycling, Kunststoff, Kreislaufwirtschaft',
    risiken: 'Komplexe Abfallzusammensetzung (Mischgewebe mit Bronzefäden), regulatorische Vorgaben thermische Verwertung, lokale Skalierbarkeit',
    politischeRelevanz: 5,
    deadline: '2026-09-30',
    erfolgswahrscheinlichkeit: 85,
    status: 'aktiv',
    notizen: 'Ausgewählter Lösungspartner: re.solution GmbH. Labortests erfolgreich abgeschlossen, Skalierung auf Werksebene gestartet.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/UseCases/GKD_Group',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/chemisches-recycling',
    industrieWebsite: 'https://www.gkd-group.com/de-de/',
    loesung: 're.solution GmbH',
    loesungWebsite: 'https://resolution.technology/',
    projektbeschreibung: 'Produktionsabfälle aus technischen Geweben und Polyester-Mischgeweben sollen chemisch recycelt werden, um hochreines Polyester sowie chemische Grundbausteine zurückzugewinnen. Dies soll die thermische Entsorgung verringern und geschlossene Materialkreisläufe im Sektor Textil etablieren.',
  },
  {
    id: 2,
    titel: 'KI-basierter Chatbot für den Maschinenpark',
    unternehmen: 'Sihl GmbH',
    ansprechpartner: 'Lena Schmidt',
    branche: 'Papier',
    reifegrad: 'Pilotbetrieb',
    batch: 'Batch 1',
    thema: 'Künstliche Intelligenz, Wissensmanagement, Produktion',
    risiken: 'Datenintegration heterogener Informationsquellen, Akzeptanz der Schichtmitarbeitenden, strenge IT-Sicherheitsauflagen',
    politischeRelevanz: 4,
    deadline: '2026-09-30',
    erfolgswahrscheinlichkeit: 82,
    status: 'aktiv',
    notizen: 'Ausgewählter Lösungspartner: INC Innovation Center GmbH. Prototyp läuft auf Tablet-Terminals in Halle 4.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/UseCases/Sihl_GmbH',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/ki-chatbot',
    industrieWebsite: 'https://sihl.com',
    loesung: 'INC Innovation Center GmbH',
    loesungWebsite: 'https://www.innovation-center.com/de',
    projektbeschreibung: 'Für den komplexen Maschinenpark zur Papierbeschichtung wird ein KI-gestützter Assistent auf Large-Language-Model (LLM)-Basis implementiert. Er macht das implizite Schichtwissen, Handbücher und Störungshistorien per Sprach- und Texteingabe sofort für Bediener nutzbar, um Rüstzeiten und Fehlproduktionen zu minimieren.',
  },
  {
    id: 3,
    titel: 'Starke Netze — Peak-Shaving mit KI-gestützten Batteriespeichern',
    unternehmen: 'Leitungspartner GmbH / Dürener Industrie',
    ansprechpartner: 'Markus Becker',
    branche: 'Chemie',
    reifegrad: 'Pilotbetrieb',
    batch: 'Batch 1',
    thema: 'Energieeffizienz, Batteriespeicher, Peak-Shaving, Lastensteuerung',
    risiken: 'Komplexe Netzentgelt-Gesetzgebung (§19 StromNEV), schwankende Energiepreise, hohe Hardware-Investitionskosten',
    politischeRelevanz: 5,
    deadline: '2026-09-30',
    erfolgswahrscheinlichkeit: 80,
    status: 'aktiv',
    notizen: 'Ausgewählter Lösungspartner: minimum energy. Algorithmen zur Lastprognose werden an realen Verbrauchsdaten kalibriert.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/UseCases/Batteriespeicher',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/peak-shaving',
    industrieWebsite: 'https://www.leitungspartner.de',
    loesung: 'minimum energy',
    loesungWebsite: 'https://www.minimum.energy',
    projektbeschreibung: 'Entwicklung und Erprobung eines optimierten Lastspitzen-Managements (Peak-Shaving) durch die Kombination intelligenter Großbatteriespeicher mit lernenden Vorhersage-Algorithmen. Dies senkt Netzentgelte für stromintensive Chemie- und Papierbetriebe und entlastet das Dürener Verteilnetz.',
  },
];

export const SEED_PARTNER: Partner[] = [
  { id: 1, name: 'GKD Group', typ: 'Industrieunternehmen', branche: 'Textil', status: 'Pilot läuft', rolle: 'Use-Case-Geber', useCase: 'Chemisches Recycling von Kunststoff- und Mischgewebeabfällen', ap: 'Dr. Michael Müller', funktion: 'Leitung F&E', email: 'michael.mueller@gkd-group.com', tel: '+49 2421 803-0', web: 'https://www.gkd-group.com', ort: 'Düren', bewertung: 5, gruendung: '1925', tech: 'Gewebetechnik, Präzisionssiebe', beschr: 'Globaler Marktführer für technische Gewebe. Beteiligt sich aktiv an Circular Economy Projekten.', notizen: 'Batch 1 Partner. Sehr gute Zusammenarbeit.', datum: '2025-04-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/GKD' },
  { id: 2, name: 'Sihl GmbH', typ: 'Industrieunternehmen', branche: 'Papier', status: 'Pilot läuft', rolle: 'Use-Case-Geber', useCase: 'KI-basierter Chatbot für den Maschinenpark', ap: 'Lena Schmidt', funktion: 'Digital Lead', email: 'l.schmidt@sihl.com', tel: '+49 2421 597-0', web: 'https://sihl.com', ort: 'Düren', bewertung: 5, gruendung: '1906', tech: 'Beschichtungstechnologie, Spezialpapiere', beschr: 'Führendes Unternehmen in der Veredelung und Beschichtung von Papieren und Folien.', notizen: 'Stellt Maschinendaten und Handbücher bereit.', datum: '2025-04-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/Sihl' },
  { id: 3, name: 'Leitungspartner GmbH', typ: 'Industrieunternehmen', branche: 'Energie', status: 'Pilot läuft', rolle: 'Use-Case-Geber', useCase: 'Starke Netze — Peak-Shaving mit KI-gestützten Batteriespeichern', ap: 'Markus Becker', funktion: 'Netzplanung', email: 'm.becker@leitungspartner.de', tel: '+49 2421 4865-0', web: 'https://www.leitungspartner.de', ort: 'Düren', bewertung: 4, gruendung: '2005', tech: 'Stromnetze, Smart Metering', beschr: 'Verteilnetzbetreiber für Stadt und Kreis Düren.', notizen: 'Wichtiger Netz- und Datenlieferant für das Peak-Shaving.', datum: '2025-04-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/Leitungspartner' },
  { id: 4, name: 're.solution GmbH', typ: 'Startup / Lösungspartner', branche: 'Chemie', status: 'Pilot läuft', rolle: 'Lösungspartner (Batch 1)', useCase: 'Chemisches Recycling von Kunststoff- und Mischgewebeabfällen', ap: 'Dr. Rando Schmidt', funktion: 'CEO', email: 'info@resolution.technology', tel: '', web: 'https://resolution.technology', ort: 'Aachen', bewertung: 5, gruendung: '2023', tech: 'Nonaquaeous Solvents, Polyester Recycling', beschr: 'Entwickelt energieeffiziente chemische Textilrecyclingverfahren.', notizen: 'Sehr kompetentes Forscher- und Gründerteam.', datum: '2025-10-18', sharepoint: '' },
  { id: 5, name: 'INC Innovation Center GmbH', typ: 'Startup / Lösungspartner', branche: 'IT / Software', status: 'Pilot läuft', rolle: 'Lösungspartner (Batch 1)', useCase: 'KI-basierter Chatbot für den Maschinenpark', ap: 'Michael Lorenz', funktion: 'Consultant', email: 'm.lorenz@innovation-center.com', tel: '', web: 'https://www.innovation-center.com/de', ort: 'Aachen / Köln', bewertung: 5, gruendung: '2014', tech: 'NLP, Large Language Models, Knowledge Graph', beschr: 'Experten für Innovationsberatung und angewandte künstliche Intelligenz.', notizen: 'Entwickelt und trainiert das LLM-Modell für Sihl.', datum: '2025-10-18', sharepoint: '' },
  { id: 6, name: 'minimum energy', typ: 'Startup / Lösungspartner', branche: 'Energie', status: 'Pilot läuft', rolle: 'Lösungspartner (Batch 1)', useCase: 'Starke Netze — Peak-Shaving mit KI-gestützten Batteriespeichern', ap: 'Nils Peters', funktion: 'Lead Engineer', email: 'contact@minimum.energy', tel: '', web: 'https://www.minimum.energy', ort: 'Karlsruhe', bewertung: 5, gruendung: '2021', tech: 'Batterie-Management, Forecasting, KI-Trading', beschr: 'KI-Plattform für die optimierte Steuerung industrieller Batteriespeicher.', notizen: 'Stellt Softwareplattform zur Verfügung.', datum: '2025-10-18', sharepoint: '' },
  { id: 7, name: 'WIN.DN GmbH', typ: 'Kooperationspartner', branche: 'Übergreifend', status: 'aktiv', rolle: 'Projektträger', useCase: '', ap: 'Christian von Styp-Rekowski', funktion: 'Projektleiter Zukunftsstoff', email: 'c.v_styp@windn.de', tel: '+49 155 63 77 26 07', web: 'https://www.windn.de', ort: 'Düren', bewertung: 5, gruendung: '1995', tech: 'Wirtschaftsförderung, Regionalkonzepte', beschr: 'Wirtschaftsförderung der Stadt Düren. Projektleitung und Fördermittelempfänger.', notizen: 'Steuert das gesamte AZA-Budget und Abrufe.', datum: '2025-04-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/WINDN' },
  { id: 8, name: 'Skopos Nova GmbH', typ: 'Dienstleister', branche: 'IT / Software', status: 'abgeschlossen', rolle: 'Dienstleister', useCase: 'Design thinking Workshops', ap: 'Carina Becker', funktion: 'Forschungsleiterin', email: 'info@skopos-nova.de', tel: '', web: 'https://www.skopos-nova.de', ort: 'Köln', bewertung: 4, gruendung: '2020', tech: 'Design Thinking, UX, Ideen-Sprint', beschr: 'Forschungs- und Innovationsberatung für Digitalprodukte.', notizen: 'Auszahlung über Rechnung SKOPOS-2025-001 abgeschlossen.', datum: '2025-11-21', sharepoint: '' },
  { id: 9, name: 'Crolla Lowis', typ: 'Dienstleister', branche: 'Übergreifend', status: 'abgeschlossen', rolle: 'Dienstleister', useCase: 'Öffentlichkeitsarbeit & Kampagnen', ap: 'Marc Crolla', funktion: 'Geschäftsführer', email: 'marketing@crolla-lowis.de', tel: '', web: 'http://www.crolla-lowis.de', ort: 'Aachen / Düren', bewertung: 4, gruendung: '2008', tech: 'Branding, Web-Design, Kampagnen-Führung', beschr: 'Kommunikations- und Marketingagentur für Dürener Unternehmen.', notizen: 'Hat das vollständige Design des Projekts Zukunftsstoff entworfen.', datum: '2025-10-24', sharepoint: '' },
  { id: 10, name: 'Redeker / Sellner / Dahs', typ: 'Dienstleister', branche: 'Übergreifend', status: 'aktiv', rolle: 'Vergaberechtliche Beratung', useCase: 'Juristische Beratung Transformations-Booster', ap: 'Dr. Kathrin Sellner', funktion: 'Partnerin', email: 'sellner@redeker.de', tel: '', web: 'https://www.redeker.de', ort: 'Bonn / Köln', bewertung: 4, gruendung: '1929', tech: 'Vergaberecht, Europarecht, Vergabemanagement', beschr: 'Renommierte Anwaltskanzlei für Bundesfördermittel und Ausschreibungen.', notizen: 'Unterstützt verfahrenssicheren Start der Booster.', datum: '2026-02-10', sharepoint: '' },
  { id: 11, name: 'BioökonomieREVIER', typ: 'Kooperationspartner', branche: 'Übergreifend', status: 'aktiv', rolle: 'Kooperationspartner', useCase: '', ap: 'Anke Kern', funktion: 'Clustermanagerin', email: 'a.kern@fz-juelich.de', tel: '', web: 'https://www.biooekonomie-revier.de', ort: 'Jülich', bewertung: 4, gruendung: '2019', tech: 'Bioökonomie, Strukturwandel, Grüne Chemie', beschr: 'Strukturwandel-Initiative des Forschungszentrums Jülich.', notizen: 'Wichtiger Partner für regionale Vernetzung und Start-ups.', datum: '2026-01-01', sharepoint: '' },
];

export const SEED_AUDIT: AuditLogItem[] = [
  { id: 1, entityType: 'System', entityId: 0, changeType: 'CREATE', windowsUser: 'SYSTEM', computerName: 'SRV-WIN-DN-01', alterWert: '', neuerWert: 'Datenbank initialisiert mit Echtdaten MiD-PCT 2025', createdAt: new Date().toISOString() },
];

export const SEED_EVENTS: EventLogItem[] = [
  { id: 1, titel: 'DN POWER UP Kickoff Event', datum: '2025-06-25', beschreibung: 'Großes Kick-off-Event für das Transfernetzwerk in der Dürener Arena.', ort: 'Arena Kreis Düren, Anis-Straße', akteure: 'GKD Group, Sihl, Leitungspartner, WIN.DN, BioökonomieREVIER', kategorie: 'Netzwerktreffen' },
  { id: 2, titel: 'Design Thinking Workshop Use Cases', datum: '2025-11-21', beschreibung: 'Zentraler Workshop zur Konkretisierung und Schärfung der Batch 1 Pilotversuche.', ort: 'WIN.DN Gründerzentrum, Raum Zukunftsstoff', akteure: 'Sihl GmbH, Skopos Nova, WIN.DN', kategorie: 'Workshop' },
  { id: 3, titel: 'Regionalforum Strukturwandel', datum: '2026-01-28', beschreibung: 'Präsentation des Projekts Zukunftsstoff als Best-Practice für Industrietransformation.', ort: 'Forschungszentrum Jülich, Audimax', akteure: 'WIN.DN, Ministerium für Wirtschaft NRW, BioökonomieREVIER', kategorie: 'Netzwerktreffen' },
  { id: 4, titel: 'Sitzung Lenkungskreis Q2-2026', datum: '2026-06-15', beschreibung: 'Reguläre Abstimmung über Fortschritte und Freigaben der neuen Vergabewellen.', ort: 'Rathaus Düren, Konferenzraum', akteure: 'Fördermittelausschuss, WIN.DN GmbH, BAFA Prüfstelle', kategorie: 'Ausschuss' },
];

export const SEED_TASKS: Task[] = [
  {
    id: 1,
    title: 'Abstimmung Lastensteuerung definieren',
    description: 'Klärung der Netzentgelt-Gesetzentwürfe und Abstimmung der Hardware-Schnittstellen mit minimum energy.',
    dueDate: '2026-06-15',
    status: 'in_bearbeitung',
    priority: 'hoch',
    useCaseId: 3,
    vergabeId: null,
    rechnungId: null,
    createdAt: '2026-05-10',
  },
  {
    id: 2,
    title: 'Maschinenpark-Handbücher in SharePoint hochladen',
    description: 'Vollständiges Hochladen aller digitalisierten PDF-Dokumente und Störungshistorien für Sihl GmbH im SharePoint-Ordner.',
    dueDate: '2026-06-30',
    status: 'offen',
    priority: 'mittel',
    useCaseId: 2,
    vergabeId: null,
    rechnungId: null,
    createdAt: '2026-05-15',
  },
  {
    id: 3,
    title: 'Prüfungsnotizen der Kanzlei bewerten',
    description: 'Juristische Durchsicht der Ergebnisse des Vergabemodells für den Transformations-Booster.',
    dueDate: '2026-06-10',
    status: 'offen',
    priority: 'hoch',
    useCaseId: null,
    vergabeId: 4,
    rechnungId: null,
    createdAt: '2026-05-20',
  },
  {
    id: 4,
    title: 'GEMA-Gebührenbeleg final prüfen',
    description: 'GEMA-Abrechnung auf Förderfähigkeit kontrollieren und an die Buchhaltung weiterleiten.',
    dueDate: '2026-06-05',
    status: 'erledigt',
    priority: 'niedrig',
    useCaseId: null,
    vergabeId: null,
    rechnungId: 4,
    createdAt: '2026-05-02',
  }
];
