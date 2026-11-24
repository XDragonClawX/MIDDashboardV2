import type {
  MitarbeiterStamm,
  PersonalEintrag,
  ProfiPositionAmounts,
  ProfiPositionCode,
  Rechnungsbeleg,
  Vergabe,
} from '../types';

export const PROFI_STARK_FKZ = '46SK0267X';
export const BUNDESANTEIL_QUOTE = 0.90;
export const EIGENANTEIL_QUOTE = 0.10;

export interface ProfiPositionMeta {
  code: ProfiPositionCode;
  displayCode: string;
  bezeichnung: string;
  kurzBezeichnung: string;
  beschreibung: string;
}

export const PROFI_POSITIONEN: ProfiPositionMeta[] = [
  {
    code: '0812',
    displayCode: '0812',
    bezeichnung: 'Personalausgaben (Angestellte)',
    kurzBezeichnung: 'Personal Angestellte',
    beschreibung: 'Projektleitung, Netzwerk- und Vergabemanagement (TVöD E11/E12)',
  },
  {
    code: '0817',
    displayCode: '0817',
    bezeichnung: 'Personalausgaben (Aushilfen / SHK)',
    kurzBezeichnung: 'Personal Aushilfen/SHK',
    beschreibung: 'Studentische Hilfskräfte & geringfügig Beschäftigte (Projektassistenz)',
  },
  {
    code: '0820',
    displayCode: '0820',
    bezeichnung: 'Sozialabgaben & Zusatzversorgung',
    kurzBezeichnung: 'Sozialabgaben / ZVK',
    beschreibung: 'Gesetzliche/tarifliche Sozialabgaben, Arbeitgeberanteile, KZVK/VBL',
  },
  {
    code: '0831',
    displayCode: '0831',
    bezeichnung: 'Dienstreisen / Reisekosten',
    kurzBezeichnung: 'Dienstreisen',
    beschreibung: 'Inlandsreisen, ÖPNV/Bahn, Projekt- und Gremienfahrten',
  },
  {
    code: '0835',
    displayCode: '0835',
    bezeichnung: 'Vergabe von Aufträgen / Fremdleistungen',
    kurzBezeichnung: 'Vergabe / Fremdleistung',
    beschreibung: 'Industrie-Use-Cases, Transformations-Booster, Ökoprofit-Checkups, Beratung, Events',
  },
  {
    code: '0843',
    displayCode: '0843',
    bezeichnung: 'Sächliche Verwaltungsausgaben',
    kurzBezeichnung: 'Sächl. Verwaltungsausg.',
    beschreibung: 'Geschäftsbedarf (10%-Pauschale), Marketing, Hosting, Drucker-Leasing, Gegenstände <800€',
  },
];

// ── CENT-INTEGER ARITHMETIK (keine IEEE-754 Rundungsfehler) ──
export function toCents(val: number): number {
  return Math.round((Number(val) || 0) * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function roundEuro(val: number): number {
  return fromCents(toCents(val));
}

export function addEuro(a: number, b: number): number {
  return fromCents(toCents(a) + toCents(b));
}

export function subEuro(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

export function sumEuro(values: number[]): number {
  return fromCents(values.reduce((acc, v) => acc + toCents(v), 0));
}

export function mulPercent(amount: number, percent: number): number {
  return fromCents(Math.round((toCents(amount) * percent) / 100));
}

export function splitPercent9010(amount: number): { bund90: number; eigen10: number } {
  const totalCents = toCents(amount);
  const bundCents = Math.round((totalCents * 90) / 100);
  const eigenCents = totalCents - bundCents;
  return {
    bund90: fromCents(bundCents),
    eigen10: fromCents(eigenCents),
  };
}

export function createEmptyProfiAmounts(): ProfiPositionAmounts {
  return {
    '0812': 0,
    '0817': 0,
    '0820': 0,
    '0831': 0,
    '0835': 0,
    '0843': 0,
  };
}

export function normalizeProfiAmounts(raw?: Partial<Record<ProfiPositionCode, number>>): ProfiPositionAmounts {
  return {
    '0812': roundEuro(raw?.['0812'] || 0),
    '0817': roundEuro(raw?.['0817'] || 0),
    '0820': roundEuro(raw?.['0820'] || 0),
    '0831': roundEuro(raw?.['0831'] || 0),
    '0835': roundEuro(raw?.['0835'] || 0),
    '0843': roundEuro(raw?.['0843'] || 0),
  };
}

export function mapKategorieToProfiPosition(
  kategorie: string,
  explicitPos?: ProfiPositionCode
): ProfiPositionCode {
  if (explicitPos && ['0812', '0817', '0820', '0831', '0835', '0843'].includes(explicitPos)) {
    return explicitPos;
  }
  const kat = (kategorie || '').toLowerCase();
  if (kat.includes('reise')) return '0831';
  if (
    kat.includes('vergabe') ||
    kat.includes('workshop') ||
    kat.includes('jurist') ||
    kat.includes('beratung') ||
    kat.includes('ökoprofit') ||
    kat.includes('oekoprofit') ||
    kat.includes('booster') ||
    kat.includes('veranstalt') ||
    kat.includes('mitglied') ||
    kat.includes('fremd') ||
    kat.includes('sprint')
  ) {
    return '0835';
  }
  if (
    kat.includes('marketing') ||
    kat.includes('öffentlich') ||
    kat.includes('hosting') ||
    kat.includes('web') ||
    kat.includes('gegenst') ||
    kat.includes('miete') ||
    kat.includes('drucker') ||
    kat.includes('geschäft') ||
    kat.includes('rechner') ||
    kat.includes('verwaltung') ||
    kat.includes('it')
  ) {
    return '0843';
  }
  return '0835';
}

export function splitPersonalToProfi(
  entries: PersonalEintrag[],
  svShareOfAg: number = 0.18,
  stammList: MitarbeiterStamm[] = []
): { pos0812: number; pos0817: number; pos0820: number; pos0843Overhead: number } {
  const safeDefaultShare = Math.min(Math.max(svShareOfAg, 0), 0.5);
  let cents0812 = 0;
  let cents0817 = 0;
  let cents0820 = 0;
  let cents0843 = 0;

  entries.forEach((p) => {
    const agCents = toCents(p.agKosten || 0);
    const skCents = toCents(p.sachkosten || 0);
    cents0843 += skCents;

    // 1. Exakte DATEV-Split-Felder haben höchste Priorität
    if (
      p.brutto0812 !== undefined ||
      p.brutto0817 !== undefined ||
      p.sv0820 !== undefined
    ) {
      cents0812 += toCents(p.brutto0812 || 0);
      cents0817 += toCents(p.brutto0817 || 0);
      cents0820 += toCents(p.sv0820 || 0);
      return;
    }

    // 2. Stamm-Lookup für 0812 vs 0817 & individuelle SV-Quote
    const nameNorm = (p.mitarbeiter || '').toLowerCase().trim();
    const stamm = stammList.find(
      (s) =>
        s.name.toLowerCase().trim() === nameNorm ||
        nameNorm.includes(s.name.toLowerCase().trim())
    );
    const isShkByName =
      nameNorm.includes('fischöder') ||
      nameNorm.includes('fischoeder') ||
      nameNorm.includes('hilfskraft') ||
      nameNorm.includes('shk');

    if (p.profiPosition === '0820') {
      cents0820 += agCents;
      return;
    }

    const primaryPos: '0812' | '0817' =
      p.profiPosition === '0817'
        ? '0817'
        : p.profiPosition === '0812'
        ? '0812'
        : stamm?.primaerePosition || (isShkByName ? '0817' : '0812');

    const quote = stamm ? Math.min(Math.max(stamm.svQuote, 0), 0.5) : safeDefaultShare;
    const svCents = Math.round(agCents * quote);
    const bruttoCents = agCents - svCents;
    cents0820 += svCents;
    if (primaryPos === '0817') {
      cents0817 += bruttoCents;
    } else {
      cents0812 += bruttoCents;
    }
  });

  return {
    pos0812: fromCents(cents0812),
    pos0817: fromCents(cents0817),
    pos0820: fromCents(cents0820),
    pos0843Overhead: fromCents(cents0843),
  };
}

// ── § 15 UStG Vorsteuerabzug-Berechnung ──
export function getFoerderfaehigerRechnungsBetrag(
  r: Pick<Rechnungsbeleg, 'betragNetto' | 'betragBrutto' | 'mwstSatz' | 'foerderfaehigerBetrag' | 'foerderfaehig'>,
  vorsteuerabzugsberechtigt: boolean
): number {
  if (!r.foerderfaehig) return 0;
  if (typeof r.foerderfaehigerBetrag === 'number' && r.foerderfaehigerBetrag >= 0 && r.mwstSatz !== undefined) {
    // Recalculate dynamically so toggling the global § 15 UStG switch immediately propagates unless explicitly forced 'brutto'
    if (r.mwstSatz === 'brutto') return roundEuro(r.betragBrutto || r.betragNetto);
    return vorsteuerabzugsberechtigt ? roundEuro(r.betragNetto) : roundEuro(r.betragBrutto || r.betragNetto);
  }
  if (r.mwstSatz === 'brutto') {
    return roundEuro(r.betragBrutto || r.betragNetto);
  }
  return vorsteuerabzugsberechtigt ? roundEuro(r.betragNetto) : roundEuro(r.betragBrutto || r.betragNetto);
}
