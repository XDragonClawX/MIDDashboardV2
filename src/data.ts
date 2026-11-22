import {
  PersonalEintrag,
  Rechnungsbeleg,
  Mittelabruf,
  Zahlungsanforderung,
  Vergabe,
  UseCase,
  Partner,
  AuditLogItem,
  EventLogItem,
  Task,
  OekoprofitCheckup,
  MitarbeiterStamm,
  AzaPlanVersion,
  SystemSettings,
} from './types';
import { addEuro, mulPercent, subEuro, sumEuro, roundEuro } from './utils';

// Unveränderliche Fördervereinbarung/Planwerte für die Jahre 2025–2029 (FKZ 46SK0267X · STARK Ausgabenbasis 90% Bund / 10% Eigenanteil)
export const AZA_JAHRE = [
  { key: 'gesamt25', label: '2025 (Apr–Dez)', short: '2025', von: '2025-04-01', bis: '2025-12-31' },
  { key: '2026', label: '2026', short: '2026', von: '2026-01-01', bis: '2026-12-31' },
  { key: '2027', label: '2027', short: '2027', von: '2027-01-01', bis: '2027-12-31' },
  { key: '2028', label: '2028', short: '2028', von: '2028-01-01', bis: '2028-12-31' },
  { key: 'mrz29', label: '2029 (Jan–Mär)', short: '2029', von: '2029-01-01', bis: '2029-03-31' },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  vorsteuerabzugsberechtigt: false, // Kommunale/Wirtschaftsförderungs-Standardbasis bei nicht abzugsfähiger USt; in Settings umschaltbar
  privacyMode: false,
  boardroomMode: false,
  azaVersion: 'aenderung_2025_12_personal',
  gamificationMode: true,
};

export const AZA_PLAN = {
  personal: [
    { pos: 'Innovations-Manager/in (Master) – Projektleitung', kat: '0812 / 0820 Personal', gesamt25: 52399.08, '2026': 69865.44, '2027': 75432.47, '2028': 77190.47, mrz29: 18525.71 },
    { pos: 'Netzwerk-Manager/in (Master)', kat: '0812 / 0820 Personal', gesamt25: 46120.35, '2026': 65875.16, '2027': 67258.75, '2028': 71385.14, mrz29: 17445.17 },
    { pos: 'Vergabe-Manager/in (Bachelor)', kat: '0812 / 0820 Personal', gesamt25: 22276.42, '2026': 31418.37, '2027': 31960.42, '2028': 33911.71, mrz29: 8286.70 },
    { pos: 'Studentische Hilfskraft', kat: '0812 / 0820 Personal', gesamt25: 9816.50, '2026': 24312.00, '2027': 24324.00, '2028': 24336.00, mrz29: 3272.17 },
  ],
  overhead: { pos: 'Geschäftsbedarf (10% auf Personal)', kat: '0843 Sächl. Verwaltungsausgaben', gesamt25: 13061.23, '2026': 19147.10, '2027': 19897.56, '2028': 20682.33, mrz29: 4752.97 },
  auftraege: [
    { pos: 'Juristische Beratung', kat: '0835 Vergabe von Aufträgen', gesamt25: 15000.00, '2026': 7600.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Design-Sprint + Use-Case-Definition', kat: '0835 Vergabe von Aufträgen', gesamt25: 15000.00, '2026': 0.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Marketing & Öffentlichkeitsarbeit', kat: '0843 Sächl. Verwaltungsausgaben', gesamt25: 31000.00, '2026': 10100.00, '2027': 10500.00, '2028': 3500.00, mrz29: 1800.00 },
    { pos: 'Ökoprofit-Checkup', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 20000.00, '2027': 20000.00, '2028': 20000.00, mrz29: 0.00 },
    { pos: 'Veranstaltungen', kat: '0835 Vergabe von Aufträgen', gesamt25: 11143.00, '2026': 13423.00, '2027': 13423.00, '2028': 13423.00, mrz29: 8365.00 },
    { pos: 'Mitgliedsbeiträge Kooperationspartner', kat: '0835 Vergabe von Aufträgen', gesamt25: 5775.00, '2026': 3000.00, '2027': 3000.00, '2028': 7700.00, mrz29: 1925.00 },
    { pos: 'Transformations-Booster 1', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 37000.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 2', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 37000.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 3', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 37000.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 4', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 37000.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 5', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 0.00, '2027': 37000.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 6', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 0.00, '2027': 37000.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 7', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 0.00, '2027': 37000.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 8', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 0.00, '2027': 37000.00, '2028': 0.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 9', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 0.00, '2027': 0.00, '2028': 37000.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 10', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 0.00, '2027': 0.00, '2028': 37000.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 11', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 0.00, '2027': 0.00, '2028': 37000.00, mrz29: 0.00 },
    { pos: 'Transformations-Booster 12', kat: '0835 Vergabe von Aufträgen', gesamt25: 0.00, '2026': 0.00, '2027': 0.00, '2028': 37000.00, mrz29: 0.00 },
  ],
  miete: { pos: 'Drucker-Leasing', kat: '0843 Sächl. Verwaltungsausgaben', gesamt25: 1274.79, '2026': 1699.72, '2027': 1699.72, '2028': 1699.72, mrz29: 424.93 },
  gegenst: { pos: 'Gegenstände < 800 EUR', kat: '0843 Sächl. Verwaltungsausgaben', gesamt25: 1598.00, '2026': 0.00, '2027': 0.00, '2028': 0.00, mrz29: 0.00 },
  reisen: { pos: 'Dienstreisen / Reisekosten', kat: '0831 Dienstreisen', gesamt25: 0.00, '2026': 1202.00, '2027': 1392.00, '2028': 2255.20, mrz29: 0.00 },
  foerder: {
    gesamt25: { gesamt: 224464.37, foerderbar: 224464.37, bafa: 202017.93, lho: 0, eigen: 22446.44 },
    '2026': { gesamt: 415642.78, foerderbar: 415642.78, bafa: 374078.50, lho: 0, eigen: 41564.28 },
    '2027': { gesamt: 416887.92, foerderbar: 416887.92, bafa: 375199.13, lho: 0, eigen: 41688.79 },
    '2028': { gesamt: 424083.56, foerderbar: 424083.56, bafa: 381675.20, lho: 0, eigen: 42408.36 },
    mrz29: { gesamt: 64797.65, foerderbar: 64797.65, bafa: 58317.89, lho: 0, eigen: 6479.76 },
  },
};

export type AzaPlanType = typeof AZA_PLAN;

function buildFoerderFromLines(plan: Omit<AzaPlanType, 'foerder'>): AzaPlanType['foerder'] {
  const yearKeys = ['gesamt25', '2026', '2027', '2028', 'mrz29'] as const;
  const result: any = {};
  yearKeys.forEach((yk) => {
    const persSum = sumEuro(plan.personal.map((r) => (r as any)[yk] || 0));
    const auftrSum = sumEuro(plan.auftraege.map((r) => (r as any)[yk] || 0));
    const gesamt = sumEuro([
      persSum,
      (plan.overhead as any)[yk] || 0,
      auftrSum,
      (plan.miete as any)[yk] || 0,
      (plan.gegenst as any)[yk] || 0,
      (plan.reisen as any)[yk] || 0,
    ]);
    const bafa = mulPercent(gesamt, 90);
    const eigen = subEuro(gesamt, bafa);
    result[yk] = { gesamt, foerderbar: gesamt, bafa, lho: 0, eigen };
  });
  return result;
}

const PLAN_2025_12_PERSONAL_LINES: Omit<AzaPlanType, 'foerder'> = {
  personal: [
    { pos: 'Innovations-Manager/in (Master) – Projektleitung', kat: '0812 / 0820 Personal', gesamt25: 22399.08, '2026': 99865.44, '2027': 75432.47, '2028': 77190.47, mrz29: 18525.71 },
    { pos: 'Netzwerk-Manager/in (Master)', kat: '0812 / 0820 Personal', gesamt25: 19620.35, '2026': 92375.16, '2027': 67258.75, '2028': 71385.14, mrz29: 17445.17 },
    { pos: 'Vergabe-Manager/in (Bachelor)', kat: '0812 / 0820 Personal', gesamt25: 10406.62, '2026': 43288.17, '2027': 31960.42, '2028': 33911.71, mrz29: 8286.70 },
    { pos: 'Studentische Hilfskraft', kat: '0817 / 0820 Personal', gesamt25: 4816.50, '2026': 29312.00, '2027': 24324.00, '2028': 24336.00, mrz29: 3272.17 },
  ],
  overhead: { pos: 'Geschäftsbedarf (10% auf Personal)', kat: '0843 Sächl. Verwaltungsausgaben', gesamt25: 5724.25, '2026': 26484.08, '2027': 19897.56, '2028': 20682.33, mrz29: 4752.97 },
  auftraege: AZA_PLAN.auftraege.map((a) => ({ ...a })),
  miete: { ...AZA_PLAN.miete },
  gegenst: { ...AZA_PLAN.gegenst },
  reisen: { ...AZA_PLAN.reisen },
};

const PLAN_2026_11_UEBERTRAG_LINES: Omit<AzaPlanType, 'foerder'> = {
  personal: PLAN_2025_12_PERSONAL_LINES.personal.map((p) => ({ ...p })),
  overhead: { ...PLAN_2025_12_PERSONAL_LINES.overhead },
  auftraege: PLAN_2025_12_PERSONAL_LINES.auftraege.map((a) => {
    if (a.pos === 'Transformations-Booster 4') {
      return { ...a, '2026': 0.00, '2027': 37000.00 };
    }
    if (a.pos === 'Ökoprofit-Checkup') {
      return { ...a, '2026': 0.00, '2027': 40000.00 };
    }
    if (a.pos === 'Veranstaltungen') {
      return { ...a, '2026': 5423.00, '2027': 21423.00 };
    }
    if (a.pos === 'Marketing & Öffentlichkeitsarbeit') {
      return { ...a, '2026': 5100.00, '2027': 15500.00 };
    }
    return { ...a };
  }),
  miete: { ...AZA_PLAN.miete },
  gegenst: { ...AZA_PLAN.gegenst },
  reisen: { ...AZA_PLAN.reisen },
};

export const AZA_VERSION_META: Record<
  AzaPlanVersion,
  { id: AzaPlanVersion; label: string; shortLabel: string; beschreibung: string }
> = {
  baseline_2025_03: {
    id: 'baseline_2025_03',
    label: 'Original-Bescheid (03/2025)',
    shortLabel: 'Bescheid 03/2025',
    beschreibung: 'Ursprünglicher Zuwendungsbescheid FKZ 46SK0267X (Gesamtvolumen 1.545.876,28 €).',
  },
  aenderung_2025_12_personal: {
    id: 'aenderung_2025_12_personal',
    label: 'Änderungsstand 12/2025 (Personal-Übertrag + TVöD-Stufen)',
    shortLabel: 'Änderung 12/2025',
    beschreibung:
      'Inkl. Personal-Übertrag 2025→2026 über 73.369,80 € sowie kostenneutraler TVöD-Stufenanpassung (E12 S2→S3 & E11 S1→S3 über 62.812,77 € gem. Antrag 12.12.2025).',
  },
  aenderung_2026_11_uebertrag: {
    id: 'aenderung_2026_11_uebertrag',
    label: 'Änderungsstand 11/2026 (F0835-Übertrag nach 2027)',
    shortLabel: 'Änderung 11/2026',
    beschreibung:
      'Inkl. geplanter Mittelverschiebung 2026→2027: 37.000 € Booster 4, 20.000 € Ökoprofit-Checkup, 8.000 € Events & 5.000 € Marketing (70.000 € Übertrag vor Kassenschluss 15.11.).',
  },
};

export const AZA_PLAN_VERSIONS: Record<AzaPlanVersion, AzaPlanType> = {
  baseline_2025_03: AZA_PLAN,
  aenderung_2025_12_personal: {
    ...PLAN_2025_12_PERSONAL_LINES,
    foerder: buildFoerderFromLines(PLAN_2025_12_PERSONAL_LINES),
  },
  aenderung_2026_11_uebertrag: {
    ...PLAN_2026_11_UEBERTRAG_LINES,
    foerder: buildFoerderFromLines(PLAN_2026_11_UEBERTRAG_LINES),
  },
};

export function getAzaPlan(version: AzaPlanVersion = 'aenderung_2025_12_personal'): AzaPlanType {
  return AZA_PLAN_VERSIONS[version] || AZA_PLAN;
}

export function splitAzaPersonalPlan0812_0817_0820(
  plan: AzaPlanType,
  yearKeys: string[]
): { pos0812: number; pos0817: number; pos0820: number } {
  let angestellteBrutto = 0;
  let shkBrutto = 0;
  let sozial0820 = 0;

  plan.personal.forEach((row) => {
    const rowSum = sumEuro(yearKeys.map((yk) => Number((row as any)[yk] || 0)));
    const isShk =
      row.pos.toLowerCase().includes('hilfskraft') || row.kat.includes('0817');
    const svShare = isShk ? 0.18 : 0.185;
    const svPart = roundEuro(rowSum * svShare);
    const bruttoPart = subEuro(rowSum, svPart);
    sozial0820 = addEuro(sozial0820, svPart);
    if (isShk) {
      shkBrutto = addEuro(shkBrutto, bruttoPart);
    } else {
      angestellteBrutto = addEuro(angestellteBrutto, bruttoPart);
    }
  });

  return {
    pos0812: angestellteBrutto,
    pos0817: shkBrutto,
    pos0820: sozial0820,
  };
}

export const SEED_MITARBEITER = [
  'von Styp-Rekowski',
  'Lena Guth',
  'Lea Fischöder'
];

export const SEED_MITARBEITER_STAMM: MitarbeiterStamm[] = [
  {
    id: 1,
    name: 'von Styp-Rekowski',
    rolle: 'Innovations-Manager/in · Projektleitung',
    primaerePosition: '0812',
    svQuote: 0.185,
    tvoedGruppe: 'E12',
    tvoedStufe: 'Stufe 3 (Änderungsantrag)',
    aktiv: true,
  },
  {
    id: 2,
    name: 'Lena Guth',
    rolle: 'Netzwerk-Manager/in',
    primaerePosition: '0812',
    svQuote: 0.185,
    tvoedGruppe: 'E11',
    tvoedStufe: 'Stufe 3 (Änderungsantrag)',
    aktiv: true,
  },
  {
    id: 3,
    name: 'Lea Fischöder',
    rolle: 'Studentische Hilfskraft / Projektassistenz',
    primaerePosition: '0817',
    svQuote: 0.18,
    tvoedGruppe: 'SHK',
    tvoedStufe: 'Pauschal',
    aktiv: true,
  },
];

export const SEED_PERSONAL: PersonalEintrag[] = [
  // von Styp-Rekowski — Projektstart Juli 2025 (90% Bund / 10% Eigenanteil)
  { id: 1, mitarbeiter: 'von Styp-Rekowski', monat: 7, jahr: 2025, quartal: 3, agKosten: 5675.31, sachkosten: 567.53, foerderfaehig: 6242.84, bafaAnteil: 5618.56, lhoAnteil: 0, eigenaufwand: 624.28, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: 'Projektleitung Projektstart' },
  { id: 2, mitarbeiter: 'von Styp-Rekowski', monat: 8, jahr: 2025, quartal: 3, agKosten: 5675.31, sachkosten: 567.53, foerderfaehig: 6242.84, bafaAnteil: 5618.56, lhoAnteil: 0, eigenaufwand: 624.28, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: '' },
  { id: 3, mitarbeiter: 'von Styp-Rekowski', monat: 9, jahr: 2025, quartal: 3, agKosten: 5675.31, sachkosten: 567.53, foerderfaehig: 6242.84, bafaAnteil: 5618.56, lhoAnteil: 0, eigenaufwand: 624.28, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: '' },
  { id: 4, mitarbeiter: 'von Styp-Rekowski', monat: 10, jahr: 2025, quartal: 4, agKosten: 5709.92, sachkosten: 570.99, foerderfaehig: 6280.91, bafaAnteil: 5652.82, lhoAnteil: 0, eigenaufwand: 628.09, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: 'Anpassung Einstufung' },
  { id: 5, mitarbeiter: 'von Styp-Rekowski', monat: 11, jahr: 2025, quartal: 4, agKosten: 6623.50, sachkosten: 662.35, foerderfaehig: 7285.85, bafaAnteil: 6557.27, lhoAnteil: 0, eigenaufwand: 728.58, foerderjahr: 2025, status: 'ENTWURF', bemerkung: 'Inkl. Jahressonderzahlung' },
  { id: 6, mitarbeiter: 'von Styp-Rekowski', monat: 12, jahr: 2025, quartal: 4, agKosten: 6139.60, sachkosten: 613.96, foerderfaehig: 6753.56, bafaAnteil: 6078.20, lhoAnteil: 0, eigenaufwand: 675.36, foerderjahr: 2025, status: 'ENTWURF', bemerkung: '' },
  // Lena Guth — ab Oktober 2025
  { id: 7, mitarbeiter: 'Lena Guth', monat: 10, jahr: 2025, quartal: 4, agKosten: 4232.45, sachkosten: 423.25, foerderfaehig: 4655.70, bafaAnteil: 4190.13, lhoAnteil: 0, eigenaufwand: 465.57, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: 'Eintritt Oktober' },
  { id: 8, mitarbeiter: 'Lena Guth', monat: 11, jahr: 2025, quartal: 4, agKosten: 4232.45, sachkosten: 423.25, foerderfaehig: 4655.70, bafaAnteil: 4190.13, lhoAnteil: 0, eigenaufwand: 465.57, foerderjahr: 2025, status: 'ENTWURF', bemerkung: '' },
  { id: 9, mitarbeiter: 'Lena Guth', monat: 12, jahr: 2025, quartal: 4, agKosten: 4973.96, sachkosten: 497.40, foerderfaehig: 5471.36, bafaAnteil: 4924.22, lhoAnteil: 0, eigenaufwand: 547.14, foerderjahr: 2025, status: 'ENTWURF', bemerkung: 'Inkl. Jahressonderzahlung' },
  // Lea Fischöder — ab September 2025
  { id: 10, mitarbeiter: 'Lea Fischöder', monat: 9, jahr: 2025, quartal: 3, agKosten: 1082.35, sachkosten: 108.24, foerderfaehig: 1190.59, bafaAnteil: 1071.53, lhoAnteil: 0, eigenaufwand: 119.06, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: 'Hilfskraft' },
  { id: 11, mitarbeiter: 'Lea Fischöder', monat: 10, jahr: 2025, quartal: 4, agKosten: 1082.35, sachkosten: 108.24, foerderfaehig: 1190.59, bafaAnteil: 1071.53, lhoAnteil: 0, eigenaufwand: 119.06, foerderjahr: 2025, status: 'EINGEREICHT', bemerkung: '' },
  { id: 12, mitarbeiter: 'Lea Fischöder', monat: 11, jahr: 2025, quartal: 4, agKosten: 1082.35, sachkosten: 108.24, foerderfaehig: 1190.59, bafaAnteil: 1071.53, lhoAnteil: 0, eigenaufwand: 119.06, foerderjahr: 2025, status: 'ENTWURF', bemerkung: '' },
  { id: 13, mitarbeiter: 'Lea Fischöder', monat: 12, jahr: 2025, quartal: 4, agKosten: 1254.91, sachkosten: 125.49, foerderfaehig: 1380.40, bafaAnteil: 1242.36, lhoAnteil: 0, eigenaufwand: 138.04, foerderjahr: 2025, status: 'ENTWURF', bemerkung: 'Inkl. Jahressonderzahlung' },
];

export const SEED_RECHNUNGEN: Rechnungsbeleg[] = [
  // Q2/Q3 2025
  { id: 1, rechnungsnummer: 'META-2025-001', rechnungssteller: 'Meta', leistungsbeschreibung: 'Bewerbung Social Media', rechnungsdatum: '2025-06-24', zahlungsdatum: '2025-06-24', kostenkategorie: 'Marketing', profiPosition: '0843', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 31.00, betragBrutto: 31.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 2, rechnungsnummer: 'META-2025-002', rechnungssteller: 'Meta', leistungsbeschreibung: 'Bewerbung Social Media', rechnungsdatum: '2025-06-25', zahlungsdatum: '2025-06-25', kostenkategorie: 'Marketing', profiPosition: '0843', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 31.00, betragBrutto: 31.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 3, rechnungsnummer: 'META-2025-003', rechnungssteller: 'Meta', leistungsbeschreibung: 'Bewerbung Social Media', rechnungsdatum: '2025-06-20', zahlungsdatum: '2025-06-20', kostenkategorie: 'Marketing', profiPosition: '0843', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 7.73, betragBrutto: 7.73, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 4, rechnungsnummer: 'GEMA-2025-001', rechnungssteller: 'GEMA KundenCenter', leistungsbeschreibung: 'Unterhaltungsmusik DN POWER UP', rechnungsdatum: '2025-06-09', zahlungsdatum: '2025-06-10', kostenkategorie: 'Veranstaltungen', profiPosition: '0835', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 124.15, betragBrutto: 124.15, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 5, rechnungsnummer: 'KLAWIE-2025-001', rechnungssteller: 'KlaWie Veranstaltungstechnik', leistungsbeschreibung: 'Veranstaltungstechnik DN POWER UP', rechnungsdatum: '2025-06-26', zahlungsdatum: '2025-07-15', kostenkategorie: 'Veranstaltungen', profiPosition: '0835', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 2005.15, betragBrutto: 2005.15, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 6, rechnungsnummer: 'KUEMPEL-2025-001', rechnungssteller: 'Anna-Lena Kümpel', leistungsbeschreibung: 'Moderation DN POWER UP', rechnungsdatum: '2025-07-07', zahlungsdatum: '2025-07-21', kostenkategorie: 'Veranstaltungen', profiPosition: '0835', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 1071.00, betragBrutto: 1071.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 7, rechnungsnummer: 'JDPHOTO-2025-001', rechnungssteller: 'JDPhotoArt', leistungsbeschreibung: 'Fotografie DN POWER UP', rechnungsdatum: '2025-06-29', zahlungsdatum: '2025-07-01', kostenkategorie: 'Veranstaltungen', profiPosition: '0835', foerderjahr: 2025, quartal: 2, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 824.19, betragBrutto: 824.19, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 8, rechnungsnummer: 'SDC-2025-001', rechnungssteller: 'Sozialwerk Dürener Christen', leistungsbeschreibung: 'Blumensträuße', rechnungsdatum: '2025-07-08', zahlungsdatum: '2025-07-21', kostenkategorie: 'Gegenstände <800€', profiPosition: '0843', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 150.00, betragBrutto: 150.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 9, rechnungsnummer: 'STDT-2025-001', rechnungssteller: 'Stadt Düren', leistungsbeschreibung: 'Präsentkorb Zuschauerpreis', rechnungsdatum: '2025-07-02', zahlungsdatum: '2025-07-07', kostenkategorie: 'Gegenstände <800€', profiPosition: '0843', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 63.40, betragBrutto: 63.40, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 10, rechnungsnummer: 'FLYER-2025-001', rechnungssteller: 'Flyeralarm GmbH', leistungsbeschreibung: 'Messetheke Made in Düren', rechnungsdatum: '2025-08-08', zahlungsdatum: '2025-08-12', kostenkategorie: 'Gegenstände <800€', profiPosition: '0843', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 265.45, betragBrutto: 265.45, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 11, rechnungsnummer: 'FLYER-2025-002', rechnungssteller: 'Flyeralarm GmbH', leistungsbeschreibung: 'Roll-up Made in Düren', rechnungsdatum: '2025-08-19', zahlungsdatum: '2025-08-19', kostenkategorie: 'Gegenstände <800€', profiPosition: '0843', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 115.08, betragBrutto: 115.08, foerderfaehig: true, status: 'ARCHIVIERT' },
  { id: 12, rechnungsnummer: 'DUESSRF-2025-001', rechnungssteller: 'Düsseldorf Rheinland GmbH', leistungsbeschreibung: 'Messetickets Future Tech Fest', rechnungsdatum: '2025-09-01', zahlungsdatum: '2025-09-04', kostenkategorie: 'Vergabeaufträge', profiPosition: '0835', foerderjahr: 2025, quartal: 3, arbeitspaket: 'AP2 – Technologietransfer', betragNetto: 153.00, betragBrutto: 153.00, foerderfaehig: true, status: 'ARCHIVIERT' },
  // Q4 2025
  { id: 13, rechnungsnummer: 'SKOPOS-2025-001', rechnungssteller: 'Skopos Nova GmbH', leistungsbeschreibung: 'Design Thinking Workshop', rechnungsdatum: '2025-11-21', zahlungsdatum: '2025-12-15', kostenkategorie: 'Workshops', profiPosition: '0835', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP2 – Technologietransfer', betragNetto: 12495.00, betragBrutto: 12495.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 14, rechnungsnummer: 'CROLLA-2025-001', rechnungssteller: 'Crolla Lowis', leistungsbeschreibung: 'Marketing Teilzahlung 1', rechnungsdatum: '2025-10-24', zahlungsdatum: '2025-11-12', kostenkategorie: 'Marketing', profiPosition: '0843', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 8925.00, betragBrutto: 8925.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 15, rechnungsnummer: 'MTS-2025-001', rechnungssteller: 'Meet the Startup Catering', leistungsbeschreibung: 'Catering Meet the Startup', rechnungsdatum: '2025-11-07', zahlungsdatum: '2025-11-12', kostenkategorie: 'Veranstaltungen', profiPosition: '0835', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP3 – Netzwerk', betragNetto: 403.05, betragBrutto: 403.05, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 16, rechnungsnummer: 'WEBFLOW-2025-001', rechnungssteller: 'Webflow', leistungsbeschreibung: 'Webhosting', rechnungsdatum: '2025-12-17', zahlungsdatum: '2025-12-17', kostenkategorie: 'Hosting/Web', profiPosition: '0843', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 276.00, betragBrutto: 276.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 17, rechnungsnummer: 'CROLLA-2025-002', rechnungssteller: 'Crolla Lowis', leistungsbeschreibung: 'Marketing Teilzahlung 2', rechnungsdatum: '2025-12-03', zahlungsdatum: '2025-12-10', kostenkategorie: 'Marketing', profiPosition: '0843', foerderjahr: 2025, quartal: 4, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 11900.00, betragBrutto: 11900.00, foerderfaehig: true, status: 'EINGEREICHT' },
  // Q1 2026
  { id: 18, rechnungsnummer: 'RSD-2026-001', rechnungssteller: 'Redeker/Sellner/Dahs', leistungsbeschreibung: 'Juristische Beratung Pauschalhonorar', rechnungsdatum: '2026-02-10', zahlungsdatum: '2026-02-13', kostenkategorie: 'Juristische Beratung', profiPosition: '0835', foerderjahr: 2026, quartal: 1, arbeitspaket: 'AP1 – Projektmanagement', betragNetto: 14280.00, betragBrutto: 14280.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 19, rechnungsnummer: 'RSD-2026-002', rechnungssteller: 'Redeker/Sellner/Dahs', leistungsbeschreibung: 'Juristische Beratung Zeitaufwand', rechnungsdatum: '2026-02-10', zahlungsdatum: '2026-02-13', kostenkategorie: 'Juristische Beratung', profiPosition: '0835', foerderjahr: 2026, quartal: 1, arbeitspaket: 'AP1 – Projektmanagement', betragNetto: 1428.00, betragBrutto: 1428.00, foerderfaehig: true, status: 'EINGEREICHT' },
  { id: 20, rechnungsnummer: 'CROLLA-2026-001', rechnungssteller: 'Crolla Lowis', leistungsbeschreibung: 'Marketing Schlussrechnung', rechnungsdatum: '2026-01-30', zahlungsdatum: '2026-02-13', kostenkategorie: 'Marketing', profiPosition: '0843', foerderjahr: 2026, quartal: 1, arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', betragNetto: 9038.05, betragBrutto: 9038.05, foerderfaehig: true, status: 'EINGEREICHT' },
];

export const SEED_MITTELABRUFE: Mittelabruf[] = [
  { id: 1, abrufnummer: 'BAFA-2025-Q2Q3', zeitraumVon: '2025-07-01', zeitraumBis: '2025-09-30', mittelgeber: 'BAFA_BUND', foerderjahr: 2025, quartal: 3, beantragt: 22123.62, eingegangen: 22123.62, differenz: 0, status: 'ARCHIVIERT' },
  { id: 2, abrufnummer: 'BAFA-2025-Q4', zeitraumVon: '2025-10-01', zeitraumBis: '2025-12-31', mittelgeber: 'BAFA_BUND', foerderjahr: 2025, quartal: 4, beantragt: 35262.90, eingegangen: 0, differenz: 35262.90, status: 'EINGEREICHT' },
];

// Historische profi-online Zahlungsanforderungen 2026 mit verifizierten Original-PDF-Werten (FKZ 46SK0267X)
export const SEED_ZAHLUNGSANFORDERUNGEN: Zahlungsanforderung[] = [
  {
    id: 1,
    bezeichnung: 'ZA 46SK0267X · 13.03.2026',
    kennung: '2992656-5',
    datum: '2026-03-13',
    zeitraumVon: '2026-01-01',
    zeitraumBis: '2026-03-31',
    stichtagIst: '2026-03-13',
    spalte2BisherGeplant: 0.00,
    istJePosition: {
      '0812': 11441.97,
      '0817': 8566.64,
      '0820': 2160.78,
      '0831': 0.00,
      '0835': 9270.10,
      '0843': 2216.94,
    },
    vorschauJePosition: {
      '0812': 5750.91,
      '0817': 4283.32,
      '0820': 1080.39,
      '0831': 232.78,
      '0835': 94.59,
      '0843': 1111.46,
    },
    kassenbestand: -30290.79, // Zeile 16 = Zeile 14 (0,00) - Zeile 15 (30.290,79)
    erhalteneBundesmittel: 0.00,
    zeile14BisherAnzurechnen: 0.00,
    zeile17ZusatzVerrechnung: 9246.05, // Vorläufiger Kassenbestand / Zusatzverrechnung
    auszahlungsDatum: '2026-03-27',
    bundesanteilQuote: 0.90,
    zeile19Anforderung: 32342.85,
    belegVollstaendig: true,
    manuelleKorrektur: false,
    notizen: 'profi-online ZA Kennung 2992656-5 (ZA_46SK0267X_20260313.pdf). Vorschau bis 31.03.2026. Zeile 17 Zusatzverrechnung: 9.246,05 €.',
    status: 'Abgerechnet',
  },
  {
    id: 2,
    bezeichnung: 'ZA 46SK0267X · 01.06.2026',
    kennung: '3067024-8',
    datum: '2026-06-01',
    zeitraumVon: '2026-03-14',
    zeitraumBis: '2026-06-30',
    stichtagIst: '2026-06-01',
    spalte2BisherGeplant: 46209.88, // 33.656,43 + 12.553,45 aus ZA 13.03.2026
    istJePosition: {
      '0812': 28754.55,
      '0817': 21416.60,
      '0820': 5401.95,
      '0831': 232.78,
      '0835': 11761.41,
      '0843': 5557.31,
    },
    vorschauJePosition: {
      '0812': 5750.91,
      '0817': 2000.00,
      '0820': 0.00,
      '0831': 0.00,
      '0835': 37000.00,
      '0843': 775.09,
    },
    kassenbestand: -24223.24, // Zeile 16 = Zeile 14 (41.588,90) - Zeile 15 (65.812,14)
    erhalteneBundesmittel: 41588.90,
    zeile14BisherAnzurechnen: 41588.90,
    zeile17ZusatzVerrechnung: 0.00,
    auszahlungsDatum: '2026-06-15',
    bundesanteilQuote: 0.90,
    zeile19Anforderung: 65196.64,
    belegVollstaendig: true,
    manuelleKorrektur: false,
    notizen: 'profi-online ZA Kennung 3067024-8 (ZA_46SK0267X_20260601.pdf). Vorschau bis 30.06.2026 inkl. 37.000 € Transformations-Booster (0835).',
    status: 'Abgerechnet',
  },
  {
    id: 3,
    bezeichnung: 'ZA 46SK0267X · 06.08.2026',
    kennung: '3141261-7',
    datum: '2026-08-06',
    zeitraumVon: '2026-06-02',
    zeitraumBis: '2026-09-30',
    stichtagIst: '2026-07-30',
    spalte2BisherGeplant: 118650.60, // 73.124,60 + 45.526,00 aus ZA 01.06.2026
    istJePosition: {
      '0812': 40256.37,
      '0817': 29848.84,
      '0820': 5401.95,
      '0831': 525.17,
      '0835': 28021.87,
      '0843': 7550.72,
    },
    vorschauJePosition: {
      '0812': 11501.82,
      '0817': 11040.18,
      '0820': 0.00,
      '0831': 0.00,
      '0835': 47196.97,
      '0843': 2254.20,
    },
    kassenbestand: 6341.11, // Zeile 16 = +6.341,11 € (Zeile 14 106.785,54 - Zeile 15 100.444,43)
    erhalteneBundesmittel: 106785.54,
    zeile14BisherAnzurechnen: 106785.54,
    zeile17ZusatzVerrechnung: 0.00,
    auszahlungsDatum: '2026-08-14',
    bundesanteilQuote: 0.90,
    zeile19Anforderung: 58452.74,
    belegVollstaendig: true,
    manuelleKorrektur: false,
    notizen: 'profi-online ZA Kennung 3141261-7 (ZA_46SK0267X_20260806.pdf). Ist-Ausgaben bis 30.07.2026, Vorschau bis 30.09.2026. Positiver Kassenbestand (+6.341,11 €) unterliegt ANBest-P 2-Monats-Frist.',
    status: 'Eingereicht',
  },
];

export const SEED_VERGABEN: Vergabe[] = [
  { id: 1, titel: 'Digitalisierungsberatung Textilunternehmen', auftragnehmer: 'Müller & Partner GmbH', vergabeart: 'freihändige Vergabe', auftragswert: 24000.00, ausschreibungsDatum: '2025-04-10', abgabeFrist: '2025-04-30', zuschlagsDatum: '2025-05-05', vertragsende: '2025-12-31', arbeitspaket: 'AP2 – Technologietransfer', bafaFreigabe: true, status: 'Zuschlag', notizen: 'Laufendes Projekt im Sektor Textil' },
  { id: 2, titel: 'Design Thinking Workshop (Skopos Nova)', auftragnehmer: 'Skopos Nova GmbH', vergabeart: 'freihändige Vergabe', auftragswert: 12495.00, ausschreibungsDatum: '2025-10-01', abgabeFrist: '2025-11-15', zuschlagsDatum: '2025-11-21', vertragsende: '2025-12-31', arbeitspaket: 'AP2 – Technologietransfer', bafaFreigabe: true, status: 'abgeschlossen', notizen: 'Erfolgreich durchgeführt' },
  { id: 3, titel: 'Marketing-Kampagne (Crolla Lowis)', auftragnehmer: 'Crolla Lowis', vergabeart: 'freihändige Vergabe', auftragswert: 29750.00, ausschreibungsDatum: '2025-09-01', abgabeFrist: '2025-10-01', zuschlagsDatum: '2025-10-24', vertragsende: '2026-03-31', arbeitspaket: 'AP4 – Öffentlichkeitsarbeit', bafaFreigabe: true, status: 'abgeschlossen', notizen: 'Drei Teilrechnungen abgerechnet' },
  { id: 4, titel: 'Juristische Beratung (Redeker/Sellner/Dahs)', auftragnehmer: 'Redeker/Sellner/Dahs', vergabeart: 'freihändige Vergabe', auftragswert: 15708.00, ausschreibungsDatum: '2025-12-01', abgabeFrist: '2026-01-31', zuschlagsDatum: '2026-02-10', vertragsende: '2026-06-30', arbeitspaket: 'AP1 – Projektmanagement', bafaFreigabe: true, status: 'Zuschlag', notizen: 'Unterstützung Vergaberecht Booster' },
];

export const SEED_USECASES: UseCase[] = [
  // ── BATCH 1: AKTIVE PILOTPROJEKTE ──
  {
    id: 1,
    titel: 'Chemisches Recycling von Kunststoff- und Mischgewebeabfällen',
    unternehmen: 'GKD Group',
    startupPartner: 're.solution GmbH',
    ansprechpartner: 'Dr. Michael Müller (GKD) / Dr. Rando Schmidt (re.solution)',
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
    problemstellung: 'In der Fertigung technischer Gewebe entstehen heterogene Polyester- und Mischgewebeabfälle (u. a. mit Bronzefäden), die mechanisch kaum sortenrein trennbar sind und bislang überwiegend thermisch verwertet werden.',
    loesungsansatz: 'Einsatz des energieeffizienten solvolytischen Recyclingverfahrens von re.solution GmbH zur Rückgewinnung hochreiner Monomere bzw. Polyester-Rohstoffe inklusive Pilotvalidierung an der Extrusionslinie bei GKD.',
    statusNextSteps: 'Batch 1 (Pilotbetrieb): Laborvalidierung der Lösemittelrückgewinnung und Pilot-Extrusionstest abgeschlossen; nächster Schritt ist die Wirtschaftlichkeitsberechnung für die Vollanlage sowie die Vorbereitung des Abschlussberichts bis 30.09.2026.',
    standortMehrwert: 'Aufbau geschlossener Textil- und Kunststoffkreisläufe im Cluster Düren, Reduktion fossiler Rohstoffimporte und Vorbildwirkung für technische Textilhersteller im Rheinischen Revier.',
    todos: [
      { id: 'b1-1-1', text: 'Laborvalidierung der Lösemittelrückgewinnung abschließen', completed: true, dueDate: '2026-04-15' },
      { id: 'b1-1-2', text: 'Skalierungstest an Pilot-Extrusionslinie bei GKD aufbauen', completed: true, dueDate: '2026-05-30' },
      { id: 'b1-1-3', text: 'Wirtschaftlichkeitsberechnung für Vollanlage Düren finalisieren', completed: false, dueDate: '2026-08-15' },
      { id: 'b1-1-4', text: 'Abschlussbericht und Übergabe für Fördergeber vorbereiten', completed: false, dueDate: '2026-09-30' },
    ],
  },
  {
    id: 2,
    titel: 'KI-basierter Chatbot für den Maschinenpark',
    unternehmen: 'Sihl GmbH',
    startupPartner: 'INC Innovation Center GmbH',
    ansprechpartner: 'Lena Schmidt (Sihl) / Michael Lorenz (INC)',
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
    problemstellung: 'Wissen zu komplexen Beschichtungsanlagen liegt verteilt in Handbüchern, Störungshistorien und Erfahrungswerten einzelner Schichtteams vor, was zu langen Rüstzeiten und Stillständen bei Störungen führt.',
    loesungsansatz: 'Aufbau einer abgeschotteten RAG-Pipeline und eines Wissensgraphen auf Tablet-Terminals in Halle 4 durch INC Innovation Center GmbH für direkten Zugriff im Schichtbetrieb.',
    statusNextSteps: 'Batch 1 (Pilotbetrieb): Dokumentation erfasst und RAG-Pipeline produktiv; nächste Schritte sind die Schichtbetrieb-Evaluation bis 31.07.2026 und das Sicherheits-Fine-Tuning bis 30.08.2026.',
    standortMehrwert: 'Sicherung von Produktions-Know-how trotz Fachkräftemangel sowie Senkung von Ausschuss und Energieverlusten in der Dürener Spezialpapierindustrie.',
    todos: [
      { id: 'b1-2-1', text: 'Maschinendokumentation & Handbücher Halle 4 digital erfassen', completed: true, dueDate: '2026-04-01' },
      { id: 'b1-2-2', text: 'RAG-Pipeline & Wissensgraph mit INC aufsetzen', completed: true, dueDate: '2026-05-15' },
      { id: 'b1-2-3', text: 'Tablet-Terminals im Schichtbetrieb evaluieren und Feedback erfassen', completed: false, dueDate: '2026-07-31' },
      { id: 'b1-2-4', text: 'Feinabstimmung Prompting & Sicherheitsrichtlinien durchführen', completed: false, dueDate: '2026-08-30' },
    ],
  },
  {
    id: 3,
    titel: 'Starke Netze — Peak-Shaving mit KI-gestützten Batteriespeichern',
    unternehmen: 'Leitungspartner GmbH / Dürener Industrie',
    startupPartner: 'minimum energy',
    ansprechpartner: 'Markus Becker (Leitungspartner) / Nils Peters (minimum energy)',
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
    problemstellung: 'Stromintensive Produktionsbetriebe in Düren verzeichnen ausgeprägte Lastspitzen, die hohe Netzentgelte verursachen und das regionale Verteilnetz bei wachsender Elektrifizierung belasten.',
    loesungsansatz: 'Einsatz KI-gestützter Lastprognose-Algorithmen von minimum energy zur präzisen Ansteuerung industrieller Batteriespeicher nach §19 StromNEV.',
    statusNextSteps: 'Batch 1 (Pilotbetrieb): Historische Lastprofile ausgewertet und Speicherschnittstellen kalibriert; nächster Schritt ist der algorithmische Probebetrieb zur Lastspitzenkappung und Einsparungsvalidierung.',
    standortMehrwert: 'Steigerung der Netzstabilität und Energiekosten-Wettbewerbsfähigkeit im Industriestandort Düren als Blaupause für regionale Sektorenkopplung.',
    todos: [
      { id: 'b1-3-1', text: 'Historische Lastprofile der Pilotbetriebe analysieren', completed: true, dueDate: '2026-03-20' },
      { id: 'b1-3-2', text: 'Hardware-Schnittstellen zu den Batteriespeichern kalibrieren', completed: true, dueDate: '2026-05-10' },
      { id: 'b1-3-3', text: 'Algorithmen zur Lastspitzenprognose im Probebetrieb testen', completed: false, dueDate: '2026-07-15' },
      { id: 'b1-3-4', text: 'Validierung der Netzentgelt-Einsparungen nach §19 StromNEV', completed: false, dueDate: '2026-09-30' },
    ],
  },

  // ── BATCH 2: MATCHMAKING & VORBEREITUNG (INDUSTRIE & STARTUP) ──
  {
    id: 4,
    titel: 'KI-gestützte Fertigungsoptimierung & Gewebeinspektion',
    unternehmen: 'Heimbach GmbH',
    startupPartner: 'OptiVision AI Solutions',
    ansprechpartner: 'Dr. Stefan Thomas (Heimbach) / Dr. Sarah Kroll (OptiVision)',
    branche: 'Textil',
    reifegrad: 'Prototyp',
    batch: 'Batch 2',
    thema: 'Fertigungsoptimierung, Computer Vision, Inline-Qualitätsprüfung, Papiermaschinenbespannung',
    risiken: 'Hochgeschwindigkeitsabtastung bei Webprozessen, Integration in heterogene Maschinensteuerungen älterer Baujahre',
    politischeRelevanz: 5,
    deadline: '2027-04-30',
    erfolgswahrscheinlichkeit: 85,
    status: 'in Vorbereitung',
    notizen: 'Vorbereitung für Matchmaking und Testaufbau an Webstuhl 7 im Werk Düren.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Batch2/Heimbach_Gewebeinspektion',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/fertigungsoptimierung-heimbach',
    industrieWebsite: 'https://www.heimbach.com',
    loesung: 'OptiVision AI Solutions',
    loesungWebsite: 'https://optivision-ai.de',
    projektbeschreibung: 'Einsatz hochfrequenter optischer Zeilensensoren und lokaler Edge-KI-Modelle zur kontinuierlichen Echtzeit-Gewebeinspektion bei der Herstellung von technischen Papiermaschinenbespannungen. Früherkennung von Web- und Fadenfehlern zur drastischen Ausschussreduktion und Energieeinsparung.',
    problemstellung: 'Web- und Fadenfehler bei hochpräzisen Papiermaschinenbespannungen werden bislang häufig erst nachgelagert erkannt, was Materialausschuss und Nacharbeit verursacht.',
    loesungsansatz: 'Integration eines Edge-KI-Kamerasystems von OptiVision AI Solutions direkt an Webstuhl 7 zur automatisierten Echtzeit-Fehlerklassifikation im laufenden Betrieb.',
    statusNextSteps: 'Batch 2 (Vorbereitung): Sensor-Anforderungskatalog und Matchmaking-Workshop abgeschlossen; nächste Schritte sind die Bereitstellung der Fehler-Trainingsdaten und die Einreichung von LoI & Booster-Antrag.',
    standortMehrwert: 'Qualitäts- und Ressourcenvorsprung für ein Dürener Textil-Leitunternehmen sowie technologischer Transferpfad zwischen Aachener KI-Startups und regionalem Mittelstand.',
    todos: [
      { id: 'b2-1-1', text: 'Anforderungskatalog für optische Sensoren an Webstuhl 7 definieren', completed: true, dueDate: '2026-06-15' },
      { id: 'b2-1-2', text: 'Matchmaking-Workshop zwischen Heimbach & OptiVision durchführen', completed: true, dueDate: '2026-07-01' },
      { id: 'b2-1-3', text: 'Datensatz fehlerhafter Gewebemuster für KI-Modelltraining bereitstellen', completed: false, dueDate: '2026-08-30' },
      { id: 'b2-1-4', text: 'Letter of Intent (LoI) und Förderantrag Transformations-Booster Batch 2 einreichen', completed: false, dueDate: '2026-10-15' },
    ],
  },
  {
    id: 5,
    titel: 'Wasserstoffbasierte Prozesswärme in der Papierherstellung',
    unternehmen: 'Schoellershammer GmbH',
    startupPartner: 'H2-Heat Innovations',
    ansprechpartner: 'Dr. Peter Weber (Schoellershammer) / Janine Brandt (H2-Heat)',
    branche: 'Papier',
    reifegrad: 'Konzept',
    batch: 'Batch 2',
    thema: 'Wasserstoff, Dekarbonisierung, Prozesswärme, Dampferzeugung',
    risiken: 'H2-Verfügbarkeit im Pipelinenetz, Anpassungsaufwand der Gasbrenner, Genehmigungsauflagen nach BImSchG',
    politischeRelevanz: 5,
    deadline: '2027-03-31',
    erfolgswahrscheinlichkeit: 78,
    status: 'in Vorbereitung',
    notizen: 'Vorbereitung für Matchmaking und Pilotförderung in Batch 2. Erste Vor-Ort-Begehung an Kesselanlage 3 erfolgt.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Batch2/Wasserstoff_Prozesswaerme',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/h2-prozesswaerme',
    industrieWebsite: 'https://www.schoellershammer.de',
    loesung: 'H2-Heat Innovations',
    loesungWebsite: 'https://h2-heat.tech',
    projektbeschreibung: 'Machbarkeitsanalyse und Konzeption für den Einsatz von grünem Wasserstoff zur Dekarbonisierung dampfintensiver Trocknungspartien in der Dürener Papiererzeugung. Gemeinsames Engineering zwischen Schoellershammer und H2-Heat zur schrittweisen Substitution von Erdgas.',
    problemstellung: 'Hoher fossiler Erdgasbedarf in der Dampf- und Trocknungserzeugung der Papierproduktion erfordert eine technisch sichere und genehmigungsfähige Umrüstperspektive auf Wasserstoff.',
    loesungsansatz: 'Konzeption einer H2-fähigen Hybridfeuerung für Kesselanlage 3 gemeinsam mit H2-Heat Innovations inklusive Lastenheft für Brennergeometrie und Regelung.',
    statusNextSteps: 'Batch 2 (Vorbereitung): Technisches Lastenheft und Matchmaking abgeschlossen; nächste Schritte sind die Genehmigungsabstimmung nach BImSchG und der Batch-2-Booster-Antrag.',
    standortMehrwert: 'Direkter Dekarbonisierungspfad für das traditionsreiche Papiercluster Düren mit hoher Signalwirkung für die industrielle Wärmewende im Rheinischen Revier.',
    todos: [
      { id: 'b2-2-1', text: 'Technisches Lastenheft Dampfbedarf & Brennergeometrie Kessel 3 erstellen', completed: true, dueDate: '2026-06-30' },
      { id: 'b2-2-2', text: 'Matchmaking-Workshop zwischen Schoellershammer und H2-Heat durchführen', completed: true, dueDate: '2026-07-15' },
      { id: 'b2-2-3', text: 'Sicherheits- und Genehmigungskonzept mit Bezirksregierung Köln abstimmen', completed: false, dueDate: '2026-09-30' },
      { id: 'b2-2-4', text: 'Förderantrag Transformations-Booster Batch 2 finalisieren', completed: false, dueDate: '2026-11-15' },
    ],
  },
  {
    id: 6,
    titel: 'Biobasierte Barrierebeschichtungen für Spezialpapiere',
    unternehmen: 'Kanzan Spezialpapiere GmbH',
    startupPartner: 'BioCoat Materials',
    ansprechpartner: 'Dr. Frank Meyer (Kanzan) / Dr. Elena Weiß (BioCoat)',
    branche: 'Papier',
    reifegrad: 'Konzept',
    batch: 'Batch 2',
    thema: 'Bioökonomie, Chitosan, Biopolymere, Barrierebeschichtung, Thermopapier',
    risiken: 'Rohstoffverfügbarkeit biogener Polymere, Einhaltung strenger Lebensmittelechtheit und Feuchtigkeitsbarrieren',
    politischeRelevanz: 5,
    deadline: '2027-05-31',
    erfolgswahrscheinlichkeit: 82,
    status: 'in Vorbereitung',
    notizen: 'Kooperationsanbahnung mit BioökonomieREVIER und Forschungszentrum Jülich für biobasierte Schutzschichten.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Batch2/Kanzan_BioCoat',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/biobasierte-barrierebeschichtung',
    industrieWebsite: 'https://www.kanzan.de',
    loesung: 'BioCoat Materials',
    loesungWebsite: 'https://biocoat-materials.de',
    projektbeschreibung: 'Entwicklung und industrielle Erprobung nachhaltiger, biobasierter Barrierebeschichtungen auf Chitosan- und Ligninbasis zur Substitution synthetischer Fluorchemikalien und Erdöl-Polymeren bei Spezial- und Thermopapieren.',
    problemstellung: 'Fett-, Feuchtigkeits- und Sauerstoffbarrieren bei Spezialpapieren beruhen oft auf fossilen oder schwer rezyklierbaren Kunststoff- bzw. Fluorbeschichtungen.',
    loesungsansatz: 'Formulierung und Pilot-Coating biobasierter Schutzschichten durch BioCoat Materials auf Trägerpapieren von Kanzan Spezialpapiere unter Einbindung von BioökonomieREVIER.',
    statusNextSteps: 'Batch 2 (Vorbereitung): Laborprüfungen und Matchmaking im TZ Jülich abgeschlossen; nächste Schritte sind Musterbeschichtungen in Halle 2 und die Projektvereinbarung.',
    standortMehrwert: 'Verknüpfung der Jülicher Bioökonomie-Forschung mit der Dürener Papierindustrie zur Schaffung hochwertiger, kreislauffähiger Spezialpapiere.',
    todos: [
      { id: 'b2-3-1', text: 'Laborprüfung biobasierter Formulierungen auf Kanzan-Trägerpapier', completed: true, dueDate: '2026-06-20' },
      { id: 'b2-3-2', text: 'Matchmaking-Treffen mit BioCoat Materials im Technologiezentrum Jülich', completed: true, dueDate: '2026-07-25' },
      { id: 'b2-3-3', text: 'Musterbeschichtung auf Pilot-Coater in Halle 2 vorbereiten', completed: false, dueDate: '2026-09-15' },
      { id: 'b2-3-4', text: 'Gemeinsame Projektvereinbarung Batch 2 unterzeichnen', completed: false, dueDate: '2026-11-01' },
    ],
  },
  {
    id: 7,
    titel: 'Zirkuläre Abwärmenutzung & Sektorenkopplung Tissue-Produktion',
    unternehmen: 'Metsä Tissue GmbH (Werk Kreuzau)',
    startupPartner: 'SymbioHeat Analytics',
    ansprechpartner: 'Markus Lindner (Metsä Tissue) / Tim Ehlers (SymbioHeat)',
    branche: 'Papier',
    reifegrad: 'Idee',
    batch: 'Batch 2',
    thema: 'Abwärmerückgewinnung, Wärmenetz, Sektorenkopplung, Energieeffizienz, Tissue',
    risiken: 'Temperaturniveaus der Abluft- und Brüdenschwaden, hydraulische Einbindung in das kommunale Netz',
    politischeRelevanz: 4,
    deadline: '2027-06-30',
    erfolgswahrscheinlichkeit: 75,
    status: 'in Vorbereitung',
    notizen: 'Matchmaking läuft gemeinsam mit Stadtwerken Düren und Kreis Düren.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Batch2/MetsaTissue_Abwaerme',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/abwaermenutzung-metsa',
    industrieWebsite: 'https://www.metsagroup.com/metsatissue/',
    loesung: 'SymbioHeat Analytics',
    loesungWebsite: 'https://symbioheat.io',
    projektbeschreibung: 'Erfassung und Nutzung industrieller Niedertemperaturabwärme aus der Papiertrocknung bei Metsä Tissue Kreuzau zur Einspeisung in lokale Nahwärmenetze und Vorwärmung von Speisewasser benachbarter Betriebe mittels cloudbasierter IoT-Wärmemengenüberwachung.',
    problemstellung: 'Erhebliche Mengen industrieller Niedertemperatur-Abwärme und Brüdenschwaden aus der Tissue-Trocknung entweichen bislang ungenutzt.',
    loesungsansatz: 'Thermische Datenerfassung und dynamisches Auskopplungskonzept mit SymbioHeat Analytics zur Einspeisung in kommunale und industrielle Nachbarnetze.',
    statusNextSteps: 'Batch 2 (Vorbereitung): Thermografie- und Durchflussmessungen sowie Matchmaking mit Werksleitung abgeschlossen; als Nächstes folgen Machbarkeitsstudie Nahwärme und LoI.',
    standortMehrwert: 'Regionale Sektorenkopplung zwischen Industrie und Kommune im Kreis Düren/Kreuzau mit nachhaltiger Senkung von Primärenergiebedarf und Wärmekosten.',
    todos: [
      { id: 'b2-4-1', text: 'Thermografie- und Durchflussmessung an den Brüdenschloten durchführen', completed: true, dueDate: '2026-06-30' },
      { id: 'b2-4-2', text: 'Matchmaking-Runde mit Werksleitung Metsä Kreuzau & SymbioHeat', completed: true, dueDate: '2026-08-05' },
      { id: 'b2-4-3', text: 'Machbarkeitsstudie Einspeisung Nahwärme Düren-Süd beauftragen', completed: false, dueDate: '2026-10-20' },
      { id: 'b2-4-4', text: 'Letter of Intent für Batch 2 Pilotierung aufsetzen', completed: false, dueDate: '2026-12-15' },
    ],
  },
  {
    id: 8,
    titel: 'Autonome KI-Fertigungsautomation & Großwalzenbearbeitung',
    unternehmen: 'Carl Krafft & Söhne GmbH & Co. KG',
    startupPartner: 'RobCo',
    ansprechpartner: 'Jürgen Krafft (Carl Krafft) / Maximilian Becker (RobCo)',
    branche: 'Papier',
    reifegrad: 'Prototyp',
    batch: 'Batch 2',
    thema: 'Maschinenbau, modulare Robotik, KI-Präzisionsfertigung, Walzen',
    risiken: 'Extrem hohe Werkstückgewichte (bis zu 20 Tonnen), Toleranzen im Mikrometerbereich',
    politischeRelevanz: 4,
    deadline: '2027-04-30',
    erfolgswahrscheinlichkeit: 84,
    status: 'in Vorbereitung',
    notizen: 'Modernisierung der traditionsreichen Dürener Papiermaschinenbau-Fertigung durch flexible Leichtbaurobotik.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Batch2/Krafft_Robotik',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/walzen-fertigungsautomation',
    industrieWebsite: 'https://www.krafft-walzen.com',
    loesung: 'RobCo',
    loesungWebsite: 'https://www.robco.de',
    projektbeschreibung: 'Integration modularer Roboterzellen und intelligenter optischer Sensorik zur automatisierten Entgratung, Beschichtungsprüfung und Vermessung schwerer Papiermaschinen-Walzen bei Carl Krafft in Düren.',
    problemstellung: 'Die Bearbeitung und Qualitätsvermessung bis zu 20 Tonnen schwerer Großwalzen im Mikrometerbereich ist personalintensiv und erfordert flexible Automatisierung für kleine Losgrößen.',
    loesungsansatz: 'Einsatz modularer Plug&Play-Roboterzellen von RobCo kombiniert mit optischer Sensorik für Entgratungs- und Prüfaufgaben an 6-Meter-Walzen.',
    statusNextSteps: 'Batch 2 (Vorbereitung): Werksbesichtigung durchgeführt; nächste Schritte sind Kinematik-Simulation, CE-Sicherheitskonzept und Booster-Antrag.',
    standortMehrwert: 'Stärkung des Dürener Spezialmaschinenbaus für die Papierindustrie durch bezahlbare, mittelstandstaugliche KI-Robotik.',
    todos: [
      { id: 'b2-5-1', text: 'Besichtigung der Großdreherei mit dem RobCo-Engineeringteam', completed: true, dueDate: '2026-07-10' },
      { id: 'b2-5-2', text: 'Simulation der Roboterkinematik für 6-Meter-Walzen fertigstellen', completed: false, dueDate: '2026-08-25' },
      { id: 'b2-5-3', text: 'Sicherheitskonzept nach CE-Maschinenrichtlinie erstellen', completed: false, dueDate: '2026-10-10' },
      { id: 'b2-5-4', text: 'Förderantrag Batch 2 Booster freigeben', completed: false, dueDate: '2026-11-30' },
    ],
  },
  {
    id: 9,
    titel: 'Inline-KI-Qualitätsüberwachung für technische Filtrationsvliese',
    unternehmen: 'Neenah Gessner / Textilindustrie Düren',
    startupPartner: 'SensorEdge AI',
    ansprechpartner: 'Klaus Hartmann (Neenah) / Dr. Hendrik Weber (SensorEdge)',
    branche: 'Textil',
    reifegrad: 'Prototyp',
    batch: 'Batch 2',
    thema: 'Edge-KI, Sensorik, Inline-Qualitätsprüfung, Filtrationsvliese, Textil',
    risiken: 'Hochgeschwindigkeitslauf bei 250 m/min, feine Partikelemissionen im Fertigungsumfeld',
    politischeRelevanz: 4,
    deadline: '2027-05-31',
    erfolgswahrscheinlichkeit: 86,
    status: 'in Vorbereitung',
    notizen: 'Kalibrierung der Multispektralkameras an Linie 2 in Vorbereitung.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Batch2/Neenah_Sensorik',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/ki-qualitaetskontrolle',
    industrieWebsite: 'https://www.gessner-filtration.com',
    loesung: 'SensorEdge AI',
    loesungWebsite: 'https://sensoredge.ai',
    projektbeschreibung: 'Automatisierte Inline-Erkennung von Poreninkonsistenzen und Faserungleichmäßigkeiten in technischen Filtermedien für Automotive und Cleanroom mittels Multispektral-Sensorik und Edge-KI.',
    problemstellung: 'Bei Bahngeschwindigkeiten um 250 m/min und feiner Partikelbelastung lassen sich mikroskopische Fehler in Filtrationsvliesen manuell kaum lückenlos erfassen.',
    loesungsansatz: 'Montage kompakter Multispektral-Sensorköpfe von SensorEdge AI direkt an Fertigungslinie 2 mit lokalem Edge-KI-Klassifikationsmodell (>98 % Zielgenauigkeit).',
    statusNextSteps: 'Batch 2 (Vorbereitung): Fehler-Musterdatensatz liegt vor; nächste Schritte sind Offline-Benchmarking, Halterungsplanung an Linie 2 und LoI-Unterzeichnung.',
    standortMehrwert: 'Ausschuss- und Energieeinsparung in der Dürener Textil- und Filtrationsindustrie sowie Qualifizierung einer übertragbaren KMU-Sensorik-Lösung.',
    todos: [
      { id: 'b2-6-1', text: 'Musterdatensatz typischer Webfehler bereitstellen', completed: true, dueDate: '2026-07-01' },
      { id: 'b2-6-2', text: 'Offline-Benchmarking des Klassifikationsmodells (>98% Genauigkeit)', completed: false, dueDate: '2026-08-20' },
      { id: 'b2-6-3', text: 'Sensor-Montagehalterung an Fertigungslinie 2 planen', completed: false, dueDate: '2026-10-15' },
      { id: 'b2-6-4', text: 'LoI für Batch 2 Pilotierung unterzeichnen', completed: false, dueDate: '2026-11-30' },
    ],
  },
  {
    id: 10,
    titel: 'Industrielle Abwärmespeicherung & Hochtemperatur-Speicher',
    unternehmen: 'AkzoNobel / Industriepark Rütgers',
    startupPartner: 'Kraftblock',
    ansprechpartner: 'Stefan Becker (AkzoNobel) / Dr. Martin Schichtel (Kraftblock)',
    branche: 'Chemie',
    reifegrad: 'Idee',
    batch: 'Batch 2',
    thema: 'Industrielle Abwärme, Hochtemperatur-Energiespeicher, Chemie, Dekarbonisierung',
    risiken: 'Chemische Korrosionsbeständigkeit von Wärmetauschern bei aggressiven Prozessgasen',
    politischeRelevanz: 5,
    deadline: '2027-06-30',
    erfolgswahrscheinlichkeit: 79,
    status: 'in Vorbereitung',
    notizen: 'Vorbereitung für das Matchmaking zur Speicherung von Syntheseabwärme bei >350°C.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Batch2/AkzoNobel_Kraftblock',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/abwaermespeicher-kraftblock',
    industrieWebsite: 'https://www.akzonobel.com',
    loesung: 'Kraftblock',
    loesungWebsite: 'https://kraftblock.com',
    projektbeschreibung: 'Einsatz modularer Hochtemperatur-Feststoffspeicher von Kraftblock zur Zwischenspeicherung industrieller Prozesswärme aus chemischen Synthesen im Industriepark Rütgers zur bedarfsgerechten Rückverstromung und Dampferzeugung.',
    problemstellung: 'Zeitlich versetzter Anfall von Hochtemperatur-Abwärme (>350 °C) aus chemischen Syntheseprozessen gegenüber dem Dampfbedarf im Werk.',
    loesungsansatz: 'Modularer Hochtemperatur-Feststoffspeicher (5-MWh-Klasse) von Kraftblock inklusive korrosionsbeständiger Wärmetauscher-Einbindung.',
    statusNextSteps: 'Batch 2 (Vorbereitung): Temperaturprofil erfasst und Matchmaking-Termin durchgeführt; als Nächstes folgen Wirtschaftlichkeitsrechnung und Konsortialvereinbarung.',
    standortMehrwert: 'CO2-Reduktion und industrielle Wärmespeicherung im Chemiesektor Düren als Leuchtturmprojekt für energieintensive Chemiestandorte.',
    todos: [
      { id: 'b2-7-1', text: 'Temperaturprofil der Abgasströme an Reaktor 4 aufnehmen', completed: true, dueDate: '2026-06-15' },
      { id: 'b2-7-2', text: 'Matchmaking-Termin AkzoNobel & Kraftblock koordinieren', completed: true, dueDate: '2026-08-10' },
      { id: 'b2-7-3', text: 'Wirtschaftlichkeitsberechnung für 5-MWh-Speichermodul aufstellen', completed: false, dueDate: '2026-10-30' },
      { id: 'b2-7-4', text: 'Konsortialvereinbarung für Batch 2 Förderung einreichen', completed: false, dueDate: '2026-12-10' },
    ],
  },

  // ── BATCH 3: STRATEGISCHE TRANSFORMATIONS-PIPELINE ──
  {
    id: 11,
    titel: 'Biobasierte Barrierebeschichtungen für Papierverpackungen',
    unternehmen: 'Mondi / Kanzan Spezialpapiere',
    startupPartner: 'BioCoat Materials (in Anbahnung)',
    ansprechpartner: 'WIN.DN Technologietransfer / BioökonomieREVIER',
    branche: 'Papier',
    reifegrad: 'Idee',
    batch: 'Batch 3',
    thema: 'Bioökonomie, Chitosan, Biopolymere, Barrierebeschichtung',
    risiken: 'Skalierung biogener Rohstoffquellen, Einhaltung von Lebensmittelkontakt-Zulassungen (BfR)',
    politischeRelevanz: 4,
    deadline: '2028-03-31',
    erfolgswahrscheinlichkeit: 65,
    status: 'Pipeline',
    notizen: 'Batch 3 Transformationspipeline. Synergien mit Forschungszentrum Jülich / BioökonomieREVIER.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Batch3/Biobasierte_Beschichtungen',
    websiteUrl: 'https://www.zukunftsstoff.de/use-case/biobasierte-beschichtungen',
    industrieWebsite: 'https://www.mondigroup.com',
    loesung: 'BioCoat Materials (in Anbahnung)',
    loesungWebsite: 'https://biocoat-materials.de',
    projektbeschreibung: 'Entwicklung voll recyclebarer und kompostierbarer Barrierebeschichtungen auf Chitosan- und Ligninbasis zur Substitution synthetischer Polyethylen-Kaschierungen in industriellen Lebensmittelverpackungen.',
    problemstellung: 'Fehlende marktfähige biobasierte Alternativen für Polyethylen-Kaschierungen mit strenger BfR-Lebensmittelkontaktzulassung in der Großserien-Verpackungsfertigung.',
    loesungsansatz: 'Scouting und Konsortialaufbau zwischen regionalen Papierverpackern, Hochschul-Ausgründungen im Rheinischen Revier und BioCoat Materials.',
    statusNextSteps: 'Batch 3 (Pipeline): Recherche passender Spin-offs und Bedarfsabfrage bei regionalen Verpackungsherstellern bis Anfang 2027.',
    standortMehrwert: 'Langfristige Sicherung des Verpackungs- und Papierstandorts Düren durch frühe Besetzung biobasierter Wertschöpfungsketten.',
    todos: [
      { id: 'b3-1-1', text: 'Recherche passender Hochschul-Ausgründungen im Rheinischen Revier', completed: false, dueDate: '2026-11-30' },
      { id: 'b3-1-2', text: 'Erste Bedarfsabfrage bei regionalen Verpackungsherstellern durchführen', completed: false, dueDate: '2027-01-15' },
    ],
  },
];

export const SEED_PARTNER: Partner[] = [
  { id: 1, name: 'GKD Group', typ: 'Industrieunternehmen', branche: 'Textil', status: 'Pilot läuft', rolle: 'Use-Case-Geber (Batch 1)', useCase: 'Chemisches Recycling von Kunststoff- und Mischgewebeabfällen', ap: 'Dr. Michael Müller', funktion: 'Leitung F&E', email: 'michael.mueller@gkd-group.com', tel: '+49 2421 803-0', web: 'https://www.gkd-group.com', ort: 'Düren', bewertung: 5, gruendung: '1925', tech: 'Gewebetechnik, Präzisionssiebe', beschr: 'Globaler Marktführer für technische Gewebe. Beteiligt sich aktiv an Circular Economy Projekten.', notizen: 'Batch 1 Partner. Sehr gute Zusammenarbeit.', datum: '2025-04-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/GKD' },
  { id: 2, name: 'Sihl GmbH', typ: 'Industrieunternehmen', branche: 'Papier', status: 'Pilot läuft', rolle: 'Use-Case-Geber (Batch 1)', useCase: 'KI-basierter Chatbot für den Maschinenpark', ap: 'Lena Schmidt', funktion: 'Digital Lead', email: 'l.schmidt@sihl.com', tel: '+49 2421 597-0', web: 'https://sihl.com', ort: 'Düren', bewertung: 5, gruendung: '1906', tech: 'Beschichtungstechnologie, Spezialpapiere', beschr: 'Führendes Unternehmen in der Veredelung und Beschichtung von Papieren und Folien.', notizen: 'Stellt Maschinendaten und Handbücher bereit.', datum: '2025-04-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/Sihl' },
  { id: 3, name: 'Leitungspartner GmbH', typ: 'Industrieunternehmen', branche: 'Energie', status: 'Pilot läuft', rolle: 'Use-Case-Geber (Batch 1)', useCase: 'Starke Netze — Peak-Shaving mit KI-gestützten Batteriespeichern', ap: 'Markus Becker', funktion: 'Netzplanung', email: 'm.becker@leitungspartner.de', tel: '+49 2421 4865-0', web: 'https://www.leitungspartner.de', ort: 'Düren', bewertung: 4, gruendung: '2005', tech: 'Stromnetze, Smart Metering', beschr: 'Verteilnetzbetreiber für Stadt und Kreis Düren.', notizen: 'Wichtiger Netz- und Datenlieferant für das Peak-Shaving.', datum: '2025-04-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/Leitungspartner' },
  { id: 4, name: 're.solution GmbH', typ: 'Startup / Lösungspartner', branche: 'Chemie', status: 'Pilot läuft', rolle: 'Lösungspartner (Batch 1)', useCase: 'Chemisches Recycling von Kunststoff- und Mischgewebeabfällen', ap: 'Dr. Rando Schmidt', funktion: 'CEO', email: 'info@resolution.technology', tel: '', web: 'https://resolution.technology', ort: 'Aachen', bewertung: 5, gruendung: '2023', tech: 'Nonaquaeous Solvents, Polyester Recycling', beschr: 'Entwickelt energieeffiziente chemische Textilrecyclingverfahren.', notizen: 'Sehr kompetentes Forscher- und Gründerteam.', datum: '2025-10-18', sharepoint: '' },
  { id: 5, name: 'INC Innovation Center GmbH', typ: 'Startup / Lösungspartner', branche: 'IT / Software', status: 'Pilot läuft', rolle: 'Lösungspartner (Batch 1)', useCase: 'KI-basierter Chatbot für den Maschinenpark', ap: 'Michael Lorenz', funktion: 'Consultant', email: 'm.lorenz@innovation-center.com', tel: '', web: 'https://www.innovation-center.com/de', ort: 'Aachen / Köln', bewertung: 5, gruendung: '2014', tech: 'NLP, Large Language Models, Knowledge Graph', beschr: 'Experten für Innovationsberatung und angewandte künstliche Intelligenz.', notizen: 'Entwickelt und trainiert das LLM-Modell für Sihl.', datum: '2025-10-18', sharepoint: '' },
  { id: 6, name: 'minimum energy', typ: 'Startup / Lösungspartner', branche: 'Energie', status: 'Pilot läuft', rolle: 'Lösungspartner (Batch 1)', useCase: 'Starke Netze — Peak-Shaving mit KI-gestützten Batteriespeichern', ap: 'Nils Peters', funktion: 'Lead Engineer', email: 'contact@minimum.energy', tel: '', web: 'https://www.minimum.energy', ort: 'Karlsruhe', bewertung: 5, gruendung: '2021', tech: 'Batterie-Management, Forecasting, KI-Trading', beschr: 'KI-Plattform für die optimierte Steuerung industrieller Batteriespeicher.', notizen: 'Stellt Softwareplattform zur Verfügung.', datum: '2025-10-18', sharepoint: '' },
  
  // ── BATCH 2 PARTNER (INDUSTRIE & STARTUPS IN VORBEREITUNG) ──
  { id: 12, name: 'Heimbach GmbH', typ: 'Industrieunternehmen', branche: 'Textil', status: 'Vorbereitung', rolle: 'Use-Case-Geber (Batch 2)', useCase: 'KI-gestützte Fertigungsoptimierung & Gewebeinspektion', ap: 'Dr. Stefan Thomas', funktion: 'Technischer Leiter', email: 's.thomas@heimbach.com', tel: '+49 2421 802-0', web: 'https://www.heimbach.com', ort: 'Düren', bewertung: 5, gruendung: '1811', tech: 'Papiermaschinenbespannung, Technische Textilien', beschr: 'Weltweit führender Spezialist für Papiermaschinenbespannungen und textile Filtrationsmedien.', notizen: 'Batch 2 Vorbereitung. Fokus auf sensorische Qualitätssicherung.', datum: '2026-05-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/Heimbach' },
  { id: 13, name: 'Schoellershammer GmbH', typ: 'Industrieunternehmen', branche: 'Papier', status: 'Vorbereitung', rolle: 'Use-Case-Geber (Batch 2)', useCase: 'Wasserstoffbasierte Prozesswärme in der Papierherstellung', ap: 'Dr. Peter Weber', funktion: 'Leitung Energiewirtschaft', email: 'p.weber@schoellershammer.de', tel: '+49 2421 808-0', web: 'https://www.schoellershammer.de', ort: 'Düren', bewertung: 5, gruendung: '1784', tech: 'Wellpappenrohpapiere, Energieerzeugung', beschr: 'Traditionsreicher Dürener Hersteller hochwertiger Wellpappenrohpapiere.', notizen: 'Großes Interesse an Wasserstofftransformation der Kesselanlagen.', datum: '2026-05-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/Schoellershammer' },
  { id: 14, name: 'Kanzan Spezialpapiere GmbH', typ: 'Industrieunternehmen', branche: 'Papier', status: 'Vorbereitung', rolle: 'Use-Case-Geber (Batch 2)', useCase: 'Biobasierte Barrierebeschichtungen für Spezialpapiere', ap: 'Dr. Frank Meyer', funktion: 'F&E Beschichtung', email: 'f.meyer@kanzan.de', tel: '+49 2421 5924-0', web: 'https://www.kanzan.de', ort: 'Düren', bewertung: 5, gruendung: '1990', tech: 'Thermopapiere, Inkjet-Papiere, Barrierebeschichtungen', beschr: 'Europäischer Spitzenhersteller von Thermopapieren und Spezialbeschichtungen.', notizen: 'Partner für nachhaltige Barrierebeschichtungen ohne synthetische Polymere.', datum: '2026-05-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/Kanzan' },
  { id: 15, name: 'Metsä Tissue GmbH', typ: 'Industrieunternehmen', branche: 'Papier', status: 'Vorbereitung', rolle: 'Use-Case-Geber (Batch 2)', useCase: 'Zirkuläre Abwärmenutzung & Sektorenkopplung Tissue-Produktion', ap: 'Markus Lindner', funktion: 'Werksleitung Kreuzau', email: 'markus.lindner@metsagroup.com', tel: '+49 2422 56-0', web: 'https://www.metsagroup.com/metsatissue/', ort: 'Kreuzau / Düren', bewertung: 4, gruendung: '1968', tech: 'Tissuepapiere, Kreislaufwirtschaft, Energieeffizienz', beschr: 'Großwerk für nachhaltige Hygienepapiere in Kreuzau bei Düren.', notizen: 'Fokus auf Abwärmenutzung und Sektorenkopplung.', datum: '2026-05-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/MetsaTissue' },
  { id: 16, name: 'Carl Krafft & Söhne GmbH & Co. KG', typ: 'Industrieunternehmen', branche: 'Papier', status: 'Vorbereitung', rolle: 'Use-Case-Geber (Batch 2)', useCase: 'Autonome KI-Fertigungsautomation & Großwalzenbearbeitung', ap: 'Jürgen Krafft', funktion: 'Geschäftsführer', email: 'j.krafft@krafft-walzen.com', tel: '+49 2421 9360-0', web: 'https://www.krafft-walzen.com', ort: 'Düren', bewertung: 5, gruendung: '1870', tech: 'Papiermaschinenwalzen, Zerspanung, Maschinenbau', beschr: 'Spezialmaschinenbauer für Großwalzen der weltweiten Papier- und Folienindustrie.', notizen: 'Traditionsunternehmen in Düren. Pilotbetrieb mit Leichtbaurobotik.', datum: '2026-05-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/Krafft' },
  { id: 17, name: 'Neenah Gessner', typ: 'Industrieunternehmen', branche: 'Textil', status: 'Vorbereitung', rolle: 'Use-Case-Geber (Batch 2)', useCase: 'Inline-KI-Qualitätsüberwachung für technische Filtrationsvliese', ap: 'Klaus Hartmann', funktion: 'Qualitätsmanagement', email: 'k.hartmann@gessner-filtration.com', tel: '+49 2421 805-0', web: 'https://www.gessner-filtration.com', ort: 'Düren', bewertung: 4, gruendung: '1950', tech: 'Filtrationsmedien, Technische Vliese', beschr: 'Produzent hochwertiger Filtrationsvliese für industrielle Spezialanwendungen.', notizen: 'Edge-KI Integration an Linie 2 geplant.', datum: '2026-05-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/Neenah' },
  { id: 18, name: 'AkzoNobel / Nouryon', typ: 'Industrieunternehmen', branche: 'Chemie', status: 'Vorbereitung', rolle: 'Use-Case-Geber (Batch 2)', useCase: 'Industrielle Abwärmespeicherung & Hochtemperatur-Speicher', ap: 'Stefan Becker', funktion: 'Werksleiter Düren', email: 'stefan.becker@akzonobel.com', tel: '+49 2421 40-0', web: 'https://www.akzonobel.com', ort: 'Düren', bewertung: 5, gruendung: '1970', tech: 'Spezialchemie, Organische Peroxide, Synthese', beschr: 'Chemiestandort im Industriepark Rütgers / Düren.', notizen: 'Bedarf an Speicherung industrieller Synthese-Abwärme.', datum: '2026-05-01', sharepoint: 'https://windn.sharepoint.com/sites/MiD-PCT/Partner/AkzoNobel' },
  { id: 19, name: 'OptiVision AI Solutions', typ: 'Startup / Lösungspartner', branche: 'IT / Software', status: 'Vorbereitung', rolle: 'Lösungspartner (Batch 2)', useCase: 'KI-gestützte Fertigungsoptimierung & Gewebeinspektion', ap: 'Dr. Sarah Kroll', funktion: 'CTO & Co-Founder', email: 'contact@optivision-ai.de', tel: '+49 241 9901-20', web: 'https://optivision-ai.de', ort: 'Aachen / Köln', bewertung: 5, gruendung: '2023', tech: 'Computer Vision, Edge-KI, Hochgeschwindigkeits-Inspektion', beschr: 'Spezialisiert auf industrielle Bildverarbeitung und fehlertolerante KI-Modelle für Bahnwaren.', notizen: 'Partner für Heimbach GmbH.', datum: '2026-05-01', sharepoint: '' },
  { id: 20, name: 'H2-Heat Innovations', typ: 'Startup / Lösungspartner', branche: 'Energie', status: 'Vorbereitung', rolle: 'Lösungspartner (Batch 2)', useCase: 'Wasserstoffbasierte Prozesswärme in der Papierherstellung', ap: 'Janine Brandt', funktion: 'Managing Director', email: 'info@h2-heat.tech', tel: '+49 241 8945-10', web: 'https://h2-heat.tech', ort: 'Aachen', bewertung: 5, gruendung: '2022', tech: 'H2-Brennertechnik, Prozesswärme, Hybridfeuerung', beschr: 'Spin-off für die thermische Nutzung von Wasserstoff in industriellen Kesseln.', notizen: 'Partner für Schoellershammer.', datum: '2026-05-01', sharepoint: '' },
  { id: 21, name: 'BioCoat Materials', typ: 'Startup / Lösungspartner', branche: 'Chemie', status: 'Vorbereitung', rolle: 'Lösungspartner (Batch 2)', useCase: 'Biobasierte Barrierebeschichtungen für Spezialpapiere', ap: 'Dr. Elena Weiß', funktion: 'Lead Chemist', email: 'kontakt@biocoat-materials.de', tel: '+49 2461 61-90', web: 'https://biocoat-materials.de', ort: 'Jülich', bewertung: 5, gruendung: '2023', tech: 'Biopolymere, Chitosan, Lignin, Barrierebeschichtung', beschr: 'Entwickelt biologisch abbaubare Funktionsbeschichtungen für Papier und Pappe.', notizen: 'Partner für Kanzan Spezialpapiere.', datum: '2026-05-01', sharepoint: '' },
  { id: 22, name: 'SymbioHeat Analytics', typ: 'Startup / Lösungspartner', branche: 'Energie', status: 'Vorbereitung', rolle: 'Lösungspartner (Batch 2)', useCase: 'Zirkuläre Abwärmenutzung & Sektorenkopplung Tissue-Produktion', ap: 'Tim Ehlers', funktion: 'Head of Energy Systems', email: 'hello@symbioheat.io', tel: '+49 211 4050-70', web: 'https://symbioheat.io', ort: 'Düsseldorf', bewertung: 4, gruendung: '2022', tech: 'IoT-Sensoren, Thermische Simulation, Abwärmenetzwerk', beschr: 'Software- und Sensorikplattform zur industriellen Abwärmenutzung.', notizen: 'Partner für Metsä Tissue.', datum: '2026-05-01', sharepoint: '' },
  { id: 23, name: 'RobCo', typ: 'Startup / Lösungspartner', branche: 'IT / Software', status: 'Vorbereitung', rolle: 'Lösungspartner (Batch 2)', useCase: 'Autonome KI-Fertigungsautomation & Großwalzenbearbeitung', ap: 'Maximilian Becker', funktion: 'Industrial Solutions Lead', email: 'solutions@robco.de', tel: '+49 89 2000-88', web: 'https://www.robco.de', ort: 'München', bewertung: 5, gruendung: '2020', tech: 'Modulare Robotik, Plug&Play Automation, KI-Bahnplanung', beschr: 'Führender Anbieter modularer Industrie- und Leichtbauroboter für den Mittelstand.', notizen: 'Partner für Carl Krafft & Söhne.', datum: '2026-05-01', sharepoint: '' },
  { id: 24, name: 'SensorEdge AI', typ: 'Startup / Lösungspartner', branche: 'IT / Software', status: 'Vorbereitung', rolle: 'Lösungspartner (Batch 2)', useCase: 'Inline-KI-Qualitätsüberwachung für technische Filtrationsvliese', ap: 'Dr. Hendrik Weber', funktion: 'CEO', email: 'h.weber@sensoredge.ai', tel: '+49 221 6700-12', web: 'https://sensoredge.ai', ort: 'Köln', bewertung: 4, gruendung: '2021', tech: 'Edge-KI, Multispektral-Kameras, Partikelmonitoring', beschr: 'Entwickelt kompakte Edge-KI Sensorköpfe für Fertigungslinien.', notizen: 'Partner für Neenah Gessner.', datum: '2026-05-01', sharepoint: '' },
  { id: 25, name: 'Kraftblock', typ: 'Startup / Lösungspartner', branche: 'Energie', status: 'Vorbereitung', rolle: 'Lösungspartner (Batch 2)', useCase: 'Industrielle Abwärmespeicherung & Hochtemperatur-Speicher', ap: 'Dr. Martin Schichtel', funktion: 'CEO & Founder', email: 'contact@kraftblock.com', tel: '+49 6897 924-0', web: 'https://kraftblock.com', ort: 'Sulzbach', bewertung: 5, gruendung: '2014', tech: 'Hochtemperatur-Feststoffspeicher, Abwärmerecycling', beschr: 'Weltweit renommierter Entwickler von Hochtemperatur-Wärmespeichern bis 1.300°C.', notizen: 'Partner für AkzoNobel.', datum: '2026-05-01', sharepoint: '' },

  // ── BESTEHENDE DIENSTLEISTER & KOOPERATIONSPARTNER ──
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

export const SEED_OEKOPROFIT_CHECKUPS: OekoprofitCheckup[] = [];

