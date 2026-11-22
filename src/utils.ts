import {
  AuditLog,
  AuditLogItem,
  MitarbeiterStamm,
  Mittelabruf,
  OekoprofitCheckup,
  PersonalEintrag,
  ProfiPositionAmounts,
  ProfiPositionCode,
  Rechnungsbeleg,
  SystemSettings,
  UseCase,
  Vergabe,
  Zahlungsanforderung,
} from './types';

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

// ── ZA-Ketten-Validierung & ANBest-P 2-Monats-Verwendungsfrist ──
export interface ZaChainValidation {
  zaId: number;
  bezeichnung: string;
  datum: string;
  sumIst: number;
  sumVorschau: number;
  expectedSpalte2: number;
  actualSpalte2: number;
  deltaSpalte2: number;
  isChainValid: boolean;
  zeile14Expected: number;
  zeile15Ist90: number;
  zeile16Kassenbestand: number;
  zeile17Zusatz: number;
  zeile18Vorschau90: number;
  zeile19Computed: number;
  hasPositiveKassenbestand: boolean;
  twoMonthDeadline: string | null;
  daysUntilDeadline: number | null;
}

export function addDaysISO(dateString: string | undefined | null, days: number): string | null {
  if (!dateString) return null;
  const d = new Date(dateString + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function validateZaChain(zas: Zahlungsanforderung[]): Record<number, ZaChainValidation> {
  const sorted = [...zas].sort((a, b) => a.datum.localeCompare(b.datum) || a.id - b.id);
  const map: Record<number, ZaChainValidation> = {};

  sorted.forEach((za, idx) => {
    const sumIst = sumEuro(Object.values(za.istJePosition || {}));
    const sumVorschau = sumEuro(Object.values(za.vorschauJePosition || {}));
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const prevIst = prev ? sumEuro(Object.values(prev.istJePosition || {})) : 0;
    const prevVorschau = prev ? sumEuro(Object.values(prev.vorschauJePosition || {})) : 0;
    const expectedSpalte2 = prev ? addEuro(prevIst, prevVorschau) : 0;
    const actualSpalte2 =
      za.spalte2BisherGeplant !== undefined
        ? roundEuro(za.spalte2BisherGeplant)
        : prev
        ? expectedSpalte2
        : 0;
    const deltaSpalte2 = subEuro(actualSpalte2, expectedSpalte2);
    const isChainValid = Math.abs(deltaSpalte2) <= 0.05;

    const quotePct = (za.bundesanteilQuote || 0.9) * 100;
    const zeile14Expected =
      za.zeile14BisherAnzurechnen !== undefined
        ? roundEuro(za.zeile14BisherAnzurechnen)
        : mulPercent(actualSpalte2, quotePct);
    const zeile15Ist90 = mulPercent(sumIst, quotePct);
    const zeile16Kassenbestand = subEuro(zeile14Expected, zeile15Ist90);
    const zeile17Zusatz = roundEuro(za.zeile17ZusatzVerrechnung || 0);
    const zeile18Vorschau90 = mulPercent(sumVorschau, quotePct);
    const zeile19Computed = subEuro(subEuro(zeile18Vorschau90, zeile16Kassenbestand), zeile17Zusatz);

    const hasPositiveKassenbestand = zeile16Kassenbestand > 0.01;
    const refDate = za.auszahlungsDatum || za.stichtagIst || za.datum;
    const twoMonthDeadline = hasPositiveKassenbestand ? addDaysISO(refDate, 60) : null;
    let daysUntilDeadline: number | null = null;
    if (twoMonthDeadline) {
      const diffMs = new Date(twoMonthDeadline + 'T12:00:00').getTime() - Date.now();
      daysUntilDeadline = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    map[za.id] = {
      zaId: za.id,
      bezeichnung: za.bezeichnung,
      datum: za.datum,
      sumIst,
      sumVorschau,
      expectedSpalte2,
      actualSpalte2,
      deltaSpalte2,
      isChainValid,
      zeile14Expected,
      zeile15Ist90,
      zeile16Kassenbestand,
      zeile17Zusatz,
      zeile18Vorschau90,
      zeile19Computed,
      hasPositiveKassenbestand,
      twoMonthDeadline,
      daysUntilDeadline,
    };
  });

  return map;
}

// ── GoBD Synchronous Standard SHA-256 (NIST FIPS 180-4, Offline/file:// Safe) ──
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256HexSync(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => (n >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

export const GOBD_GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function computeAuditEntryHash(
  entry: Omit<AuditLog, 'hash'>,
  previousHash: string = GOBD_GENESIS_HASH
): string {
  const payload = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    module: entry.module,
    action: entry.action,
    details: entry.details,
    user: entry.user,
    entityType: entry.entityType || '',
    entityId: entry.entityId ?? null,
    beforeJson: entry.beforeJson || '',
    afterJson: entry.afterJson || '',
    pdfHash: entry.pdfHash || '',
    previousHash,
  });
  return sha256HexSync(payload);
}

export function ensureAuditLogChain(logs: AuditLog[]): AuditLog[] {
  if (!logs || logs.length === 0) return [];
  // Logs are stored newest-first; chain runs oldest -> newest
  const asc = [...logs].reverse();
  let prevHash = GOBD_GENESIS_HASH;
  const chainedAsc = asc.map((item) => {
    const previousHash = item.previousHash || prevHash;
    const hash = item.hash || computeAuditEntryHash({ ...item, previousHash }, previousHash);
    prevHash = hash;
    return { ...item, previousHash, hash };
  });
  return chainedAsc.reverse();
}

export function verifyAuditChain(logs: AuditLog[]): {
  valid: boolean;
  checkedCount: number;
  brokenId: number | null;
} {
  if (!logs || logs.length === 0) {
    return { valid: true, checkedCount: 0, brokenId: null };
  }
  const asc = [...logs].reverse();
  let expectedPrev = GOBD_GENESIS_HASH;
  for (const item of asc) {
    if (!item.hash) {
      return { valid: false, checkedCount: asc.length, brokenId: item.id };
    }
    if ((item.previousHash || GOBD_GENESIS_HASH) !== expectedPrev) {
      return { valid: false, checkedCount: asc.length, brokenId: item.id };
    }
    const recomputed = computeAuditEntryHash({ ...item, previousHash: expectedPrev }, expectedPrev);
    if (recomputed !== item.hash) {
      return { valid: false, checkedCount: asc.length, brokenId: item.id };
    }
    expectedPrev = item.hash;
  }
  return { valid: true, checkedCount: asc.length, brokenId: null };
}

export function anonymizeEmployeeName(
  name: string,
  indexOrPos: string | number = '',
  privacyMode: boolean = false
): string {
  if (!privacyMode) return name;
  const n = (name || '').toLowerCase();
  if (n.includes('styp')) return 'Stelle A · Projektleitung (E12)';
  if (n.includes('guth')) return 'Stelle B · Netzwerkmanagement (E11)';
  if (n.includes('fischöder') || n.includes('fischoeder')) return 'Stelle C · Projektassistenz (SHK 0817)';
  return `Personal-ID ${String(indexOrPos || 'X')}`;
}

export interface UseCaseSteckbriefData {
  titel: string;
  partner: string;
  problemstellung: string;
  loesungsansatz: string;
  statusNextSteps: string;
  standortMehrwert: string;
}

export function getUseCaseSteckbrief(uc: UseCase): UseCaseSteckbriefData {
  const startup = uc.startupPartner || uc.loesung || 'In Matchmaking-Abstimmung';
  const partnerParts = [
    `Industrieunternehmen: ${uc.unternehmen || '–'}`,
    `Startup-/Lösungspartner: ${startup}`,
    uc.ansprechpartner ? `Ansprechpartner: ${uc.ansprechpartner}` : '',
  ].filter(Boolean);

  const openTodos = (uc.todos || []).filter((t) => !t.completed);
  const doneTodos = (uc.todos || []).filter((t) => t.completed);
  const defaultNextSteps =
    openTodos.length > 0
      ? `${uc.batch} · Status: ${uc.status} (${uc.reifegrad}). Offene Meilensteine: ${openTodos
          .map((t) => `${t.text}${t.dueDate ? ` (bis ${formatDate(t.dueDate)})` : ''}`)
          .join('; ')}.`
      : `${uc.batch} · Status: ${uc.status} (${uc.reifegrad}). ${doneTodos.length} Meilensteine abgeschlossen${uc.deadline ? `, Zieltermin ${formatDate(uc.deadline)}` : ''}.`;

  const defaultProblem =
    uc.risiken && uc.thema
      ? `Herausforderung im Handlungsfeld ${uc.thema} (${uc.branche}): ${uc.risiken}.`
      : uc.risiken || `Transformationsbedarf im Bereich ${uc.thema || uc.branche} am Standort Düren.`;

  const defaultSolution =
    uc.projektbeschreibung || uc.notizen || 'Pilotierung und technische Validierung gemeinsam mit dem Lösungspartner.';

  const defaultMehrwert = `Stärkung der regionalen Wertschöpfung im Cluster ${uc.branche} im Wirtschaftsraum Düren (Rheinisches Revier) durch Technologietransfer zwischen ${uc.unternehmen} und ${startup}.`;

  return {
    titel: uc.titel,
    partner: partnerParts.join(' | '),
    problemstellung: (uc.problemstellung || '').trim() || defaultProblem,
    loesungsansatz: (uc.loesungsansatz || '').trim() || defaultSolution,
    statusNextSteps: (uc.statusNextSteps || '').trim() || defaultNextSteps,
    standortMehrwert: (uc.standortMehrwert || '').trim() || defaultMehrwert,
  };
}

export function formatUseCaseSteckbriefPlainText(uc: UseCase): string {
  const s = getUseCaseSteckbrief(uc);
  return [
    `USE-CASE STECKBRIEF (${uc.batch} · FKZ ${PROFI_STARK_FKZ})`,
    `====================================================================`,
    `1. Titel: ${s.titel}`,
    `2. Partner: ${s.partner}`,
    `3. Problemstellung: ${s.problemstellung}`,
    `4. Lösungsansatz: ${s.loesungsansatz}`,
    `5. Status & Next Steps: ${s.statusNextSteps}`,
    `6. Standort-Mehrwert: ${s.standortMehrwert}`,
  ].join('\n');
}

export function formatUseCaseSteckbriefMarkdown(uc: UseCase): string {
  const s = getUseCaseSteckbrief(uc);
  return [
    `# Use-Case Steckbrief: ${s.titel}`,
    ``,
    `- **Projekt:** Zukunftsstoff – Made in Düren / MiD-PTC (FKZ \`${PROFI_STARK_FKZ}\`)`,
    `- **Batch / Branche:** ${uc.batch} · ${uc.branche} · Reifegrad: ${uc.reifegrad}`,
    ``,
    `## 1. Titel`,
    `${s.titel}`,
    ``,
    `## 2. Partner`,
    `${s.partner}`,
    ``,
    `## 3. Problemstellung`,
    `${s.problemstellung}`,
    ``,
    `## 4. Lösungsansatz`,
    `${s.loesungsansatz}`,
    ``,
    `## 5. Status & Next Steps`,
    `${s.statusNextSteps}`,
    ``,
    `## 6. Standort-Mehrwert`,
    `${s.standortMehrwert}`,
    ``,
  ].join('\n');
}

// Storage und Recovery keys
export const STORAGE_KEYS = {
  personal: 'midpct_personal',
  rechnungen: 'midpct_rechnungen',
  mittelabrufe: 'midpct_mittelabrufe',
  zas: 'midpct_zas',
  buchungen: 'midpct_buchungen',
  vergaben: 'midpct_vergaben',
  usecases: 'midpct_usecases',
  audit: 'midpct_audit',
  partner: 'midpct_partner',
  mitarbeiter: 'midpct_mitarbeiter_namen',
  mitarbeiterStamm: 'midpct_mitarbeiter_stamm',
  settings: 'midpct_settings',
  ucNotes: 'midpct_uc_notes',
  ucInvoices: 'midpct_uc_inv',
  events: 'midpct_events',
  oekoprofit: 'midpct_oekoprofit_checkups',
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

export function addBusinessDaysISO(dateString: string | undefined, businessDays: number): string | null {
  if (!dateString) return null;
  const d = new Date(dateString + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  let added = 0;
  while (added < businessDays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

export function addWeeksISO(dateString: string | undefined, weeks: number): string | null {
  if (!dateString) return null;
  const d = new Date(dateString + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
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
  const csvContent =
    '\uFEFF' +
    rows
      .map((e) =>
        e
          .map((val) => {
            const clean = String(val ?? '').replace(/"/g, '""');
            return clean.includes(';') || clean.includes('\n') || clean.includes('"')
              ? `"${clean}"`
              : clean;
          })
          .join(';')
      )
      .join('\n');

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

// ── Backup Timestamp Tracking (Backup-Wächter) ──
export const BACKUP_TIMESTAMP_KEY = 'midpct_last_backup_at';

export function recordBackupTimestamp(): string {
  const now = new Date().toISOString();
  try {
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, now);
  } catch {
    // Ignore storage quota errors
  }
  return now;
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

// ── Compliance-Shield Engine (BAFA & GoBD) ──
export interface ComplianceShieldQuest {
  id: string;
  title: string;
  detail: string;
  impactPct: number;
  severity: 'high' | 'medium';
  targetPage: string;
  actionLabel: string;
  subTab?: string;
}

export interface ComplianceShieldState {
  score: number;
  status: 'optimal' | 'warning' | 'critical';
  quests: ComplianceShieldQuest[];
}

export function computeComplianceShield(params: {
  zas: Zahlungsanforderung[];
  vergaben: Vergabe[];
  oekoprofitCheckups: OekoprofitCheckup[];
  rechnungen: Rechnungsbeleg[];
}): ComplianceShieldState {
  const { zas, vergaben, oekoprofitCheckups, rechnungen } = params;
  const quests: ComplianceShieldQuest[] = [];
  let penalty = 0;

  // 1. Submitted ZAs with incomplete receipt mapping
  const incompleteZas = zas.filter(
    (z) => (z.status === 'Eingereicht' || z.status === 'Abgerechnet') && !z.belegVollstaendig
  );
  if (incompleteZas.length > 0) {
    const impact = Math.min(24, incompleteZas.length * 10);
    penalty += impact;
    quests.push({
      id: 'za-incomplete',
      title: `${incompleteZas.length} ZA(s) ohne vollständige Belegzuordnung`,
      detail: `${incompleteZas.map((z) => z.bezeichnung).join(', ')} als vollständig verknüpft prüfen.`,
      impactPct: impact,
      severity: 'high',
      targetPage: 'mittelabrufe',
      subTab: 'za-rechner',
      actionLabel: 'ZAs vervollständigen',
    });
  }

  // 2. Active Vergaben without BAFA approval
  const missingBafa = vergaben.filter((v) => !v.bafaFreigabe && v.status !== 'abgeschlossen');
  if (missingBafa.length > 0) {
    const impact = Math.min(28, missingBafa.length * 7);
    penalty += impact;
    quests.push({
      id: 'vergaben-bafa',
      title: `${missingBafa.length} Vergabe(n) ohne BAFA-Freigabe`,
      detail: `Rechnungen zu unfreigegebenen Vergaben sind durch das Compliance-Gate gesperrt.`,
      impactPct: impact,
      severity: 'high',
      targetPage: 'vergaben',
      actionLabel: 'Freigaben prüfen',
    });
  }

  // 3. ZA chain errors & 2-month positive Kassenbestand deadlines
  const valMap = validateZaChain(zas);
  const validations = Object.values(valMap);
  const chainIssues = validations.filter((v) => !v.isChainValid);
  if (chainIssues.length > 0) {
    const impact = Math.min(20, chainIssues.length * 10);
    penalty += impact;
    quests.push({
      id: 'za-chain',
      title: `ZA-Ketten-Abweichung in ${chainIssues.length} Zahlungsanforderung(en)`,
      detail: `Spalte 2 weicht von Vor-ZA (Spalte 3 + Spalte 5) ab.`,
      impactPct: impact,
      severity: 'high',
      targetPage: 'mittelabrufe',
      subTab: 'za-rechner',
      actionLabel: 'ZA-Kette abgleichen',
    });
  }

  const overdueKassenbestand = validations.filter(
    (v) => v.hasPositiveKassenbestand && v.daysUntilDeadline !== null && v.daysUntilDeadline < 0
  );
  if (overdueKassenbestand.length > 0) {
    const impact = Math.min(24, overdueKassenbestand.length * 14);
    penalty += impact;
    quests.push({
      id: 'kassenbestand-overdue',
      title: `ANBest-P 2-Monats-Frist überschritten (${overdueKassenbestand.length} ZA)`,
      detail: `Positiver Kassenbestand (Zeile 16) birgt Rückforderungs-/Zinsrisiko.`,
      impactPct: impact,
      severity: 'high',
      targetPage: 'mittelabrufe',
      subTab: 'za-rechner',
      actionLabel: 'Mittelabruf abstimmen',
    });
  } else {
    const warningKassenbestand = validations.filter(
      (v) => v.hasPositiveKassenbestand && v.daysUntilDeadline !== null && v.daysUntilDeadline <= 14
    );
    if (warningKassenbestand.length > 0) {
      const impact = 8;
      penalty += impact;
      quests.push({
        id: 'kassenbestand-warning',
        title: `ANBest-P 2-Monats-Frist endet in ≤ 14 Tagen`,
        detail: `Offener Kassenbestand zeitnah verausgaben oder verrechnen.`,
        impactPct: impact,
        severity: 'medium',
        targetPage: 'mittelabrufe',
        subTab: 'za-rechner',
        actionLabel: 'Frist prüfen',
      });
    }
  }

  // 4. Overdue Ökoprofit protocols (+5 WT / +4 weeks)
  const todayISO = new Date().toISOString().slice(0, 10);
  const overdueOeko = oekoprofitCheckups.filter((c) => {
    const d1 = addBusinessDaysISO(c.termin1Datum, 5);
    const d2 = addBusinessDaysISO(c.termin2Datum, 5);
    const d3 = addWeeksISO(c.termin3Datum, 4);
    return (
      (d1 && !c.protokoll1Abgegeben && d1 < todayISO) ||
      (d2 && !c.protokoll2Abgegeben && d2 < todayISO) ||
      (d3 && !c.abschlussReportingAbgegeben && d3 < todayISO)
    );
  });
  if (overdueOeko.length > 0) {
    const impact = Math.min(18, overdueOeko.length * 6);
    penalty += impact;
    quests.push({
      id: 'oeko-overdue',
      title: `${overdueOeko.length} überfällige(s) Ökoprofit-Protokoll(e)`,
      detail: `5-Werktage- bzw. 4-Wochen-Frist nach Beratungstermin überschritten.`,
      impactPct: impact,
      severity: 'medium',
      targetPage: 'vergaben',
      actionLabel: 'Protokolle nachtragen',
    });
  }

  // 5. Draft invoices awaiting submission check
  const draftInvoices = rechnungen.filter((r) => r.foerderfaehig && r.status === 'ENTWURF');
  if (draftInvoices.length >= 5) {
    const impact = 6;
    penalty += impact;
    quests.push({
      id: 'draft-invoices',
      title: `${draftInvoices.length} Sachbelege noch im Status „ENTWURF“`,
      detail: `Belege prüfen und für den nächsten BAFA-Mittelabruf freigeben.`,
      impactPct: impact,
      severity: 'medium',
      targetPage: 'rechnungen',
      actionLabel: 'Belege prüfen',
    });
  }

  const score = Math.max(0, Math.min(100, 100 - penalty));
  const status: ComplianceShieldState['status'] =
    score >= 95 ? 'optimal' : score >= 75 ? 'warning' : 'critical';

  return { score, status, quests };
}

// ── Regionaler Transformations-Index (Dürener Transformations-Karte) ──
// Stage 1: Idea / Vorbereitung (Grey)
// Stage 2: Pilot / Aktiv (Cyan)
// Stage 3: Completed / Abgeschlossen (Mint)
export function getUseCaseMapStage(
  uc: UseCase,
  vergaben: Vergabe[]
): 1 | 2 | 3 {
  const isCompleted =
    uc.status === 'abgeschlossen' ||
    uc.reifegrad === 'Produktiv' ||
    uc.reifegrad === 'Skalierung';
  if (isCompleted) return 3;

  const hasLinkedApprovedVergabe = vergaben.some(
    (v) => v.useCaseId === uc.id && v.bafaFreigabe
  );
  const isPilot =
    uc.status === 'aktiv' ||
    uc.reifegrad === 'Pilotbetrieb' ||
    hasLinkedApprovedVergabe;
  if (isPilot) return 2;

  return 1;
}

export interface TransformationIndexMetrics {
  score: number;
  stage3Count: number;
  stage2Count: number;
  stage1Count: number;
  boosterCount: number;
  boosterMax: number;
  oekoCount: number;
  oekoMax: number;
  daysToProjectEnd: number;
}

export function computeTransformationIndex(params: {
  usecases: UseCase[];
  vergaben: Vergabe[];
  oekoprofitCheckups: OekoprofitCheckup[];
}): TransformationIndexMetrics {
  const { usecases, vergaben, oekoprofitCheckups } = params;
  let stage1Count = 0;
  let stage2Count = 0;
  let stage3Count = 0;

  usecases.forEach((uc) => {
    const st = getUseCaseMapStage(uc, vergaben);
    if (st === 3) stage3Count++;
    else if (st === 2) stage2Count++;
    else stage1Count++;
  });

  const boosterVergaben = vergaben.filter(
    (v) =>
      v.auftragswert >= 30000 ||
      v.titel.toLowerCase().includes('booster') ||
      v.useCaseId != null
  );
  const boosterCount = Math.min(12, boosterVergaben.length);
  const oekoCount = Math.min(12, oekoprofitCheckups.length);

  // Weighted regional transformation index (0–1000)
  const rawScore =
    stage3Count * 55 +
    stage2Count * 22 +
    stage1Count * 8 +
    boosterCount * 24 +
    oekoCount * 15;
  const score = Math.min(1000, rawScore);

  const endMs = new Date('2029-03-31T23:59:59').getTime();
  const daysToProjectEnd = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));

  return {
    score,
    stage3Count,
    stage2Count,
    stage1Count,
    boosterCount,
    boosterMax: 12,
    oekoCount,
    oekoMax: 12,
    daysToProjectEnd,
  };
}

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

// ── Projekt-Achievements (Trophäenschrank) ──
export interface ProjectAchievement {
  id: string;
  title: string;
  category: string;
  description: string;
  unlocked: boolean;
  progressLabel: string;
}

export function evaluateProjectAchievements(params: {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  zas: Zahlungsanforderung[];
  vergaben: Vergabe[];
  usecases: UseCase[];
  oekoprofitCheckups: OekoprofitCheckup[];
  settings: SystemSettings;
}): ProjectAchievement[] {
  const { personal, rechnungen, zas, vergaben, usecases, oekoprofitCheckups, settings } = params;

  // 1. Erster Booster gezündet
  const boosterRechnung = rechnungen.some((r) => {
    const pos = mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition);
    const ff = getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt);
    const linkedVergabe = vergaben.find((v) => v.id === r.vergabeId);
    return (
      pos === '0835' &&
      Boolean(r.useCaseId) &&
      (ff >= 37000 || (linkedVergabe && linkedVergabe.auftragswert >= 37000))
    );
  });
  const boosterVergabeLinked = vergaben.some(
    (v) => v.bafaFreigabe && v.auftragswert >= 37000 && Boolean(v.useCaseId)
  );
  const boosterUnlocked = boosterRechnung || boosterVergabeLinked;

  // 2. Cent-Präzision (ZA Zeile 19 matches computed value to 0.00 €)
  const valMap = validateZaChain(zas);
  const centExactZas = zas.filter((z) => {
    const val = valMap[z.id];
    return (
      (z.status === 'Eingereicht' || z.status === 'Abgerechnet') &&
      val &&
      Math.abs(z.zeile19Anforderung - val.zeile19Computed) < 0.01
    );
  });

  // 3. Dürener Dreiklang (Papier, Textil, Chemie in Pilotbetrieb/aktiv)
  const isPilotActive = (u: UseCase) =>
    u.status === 'aktiv' || u.status === 'abgeschlossen' || u.reifegrad === 'Pilotbetrieb';
  const hasPapier = usecases.some((u) => isPilotActive(u) && u.branche.toLowerCase().includes('papier'));
  const hasTextil = usecases.some((u) => isPilotActive(u) && u.branche.toLowerCase().includes('textil'));
  const hasChemie = usecases.some((u) => isPilotActive(u) && u.branche.toLowerCase().includes('chemie'));
  const dreiklangCount = [hasPapier, hasTextil, hasChemie].filter(Boolean).length;

  // 4. Ökoprofit-Pionier
  const completedOeko = oekoprofitCheckups.some(
    (c) =>
      c.protokoll1Abgegeben &&
      c.protokoll2Abgegeben &&
      c.abschlussReportingAbgegeben &&
      c.abschlag1Freigegeben &&
      c.abschlag2Freigegeben &&
      c.schlusszahlungFreigegeben
  );

  // 5. Null-Eigenanteil-Lücke
  const latestZa = [...zas].sort((a, b) => a.datum.localeCompare(b.datum)).slice(-1)[0];
  const latestIstBund = latestZa ? sumEuro(Object.values(latestZa.istJePosition || {})) : 0;
  const recordedEigen10 = addEuro(
    sumEuro(personal.map((p) => mulPercent(p.foerderfaehig || 0, 10))),
    sumEuro(
      rechnungen.map((r) =>
        mulPercent(getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt), 10)
      )
    )
  );
  const requiredEigen10 = mulPercent(latestIstBund, 10);
  const eigenCovered = recordedEigen10 > 0 && recordedEigen10 >= requiredEigen10;

  // 6. Backup-Wächter
  const backupMonthly = hasBackupInCurrentMonth();

  // 7. Jahresabschluss-Trophäe
  const boss = computeBossEventKassenschluss({ zas, rechnungen });

  return [
    {
      id: 'first-booster',
      title: 'Erster Booster gezündet',
      category: 'Industrie-Transfer',
      description: '37.000-€-Vergabe oder -Beleg (Pos. 0835) mit Use-Case verknüpft und freigegeben.',
      unlocked: boosterUnlocked,
      progressLabel: boosterUnlocked ? 'Freigeschaltet' : '0 / 1 Booster belegt',
    },
    {
      id: 'cent-precision',
      title: 'Cent-Präzision',
      category: 'profi-online',
      description: 'Eingereichte ZA (Zeile 19) entspricht exakt bis auf 0,00 € der Kettenberechnung.',
      unlocked: centExactZas.length > 0,
      progressLabel: `${centExactZas.length} / ${zas.length} ZAs cent-exakt`,
    },
    {
      id: 'duerener-dreiklang',
      title: 'Dürener Dreiklang',
      category: 'MiD-PTC Cluster',
      description: 'Je mindestens 1 aktiver Pilot in Papier, Textil und Chemie.',
      unlocked: dreiklangCount === 3,
      progressLabel: `${dreiklangCount} / 3 Branchen aktiv`,
    },
    {
      id: 'oekoprofit-pionier',
      title: 'Ökoprofit-Pionier',
      category: 'Leistungsverzeichnis',
      description: 'Erstes Startup hat alle 3 Termine inkl. Abschluss-Reporting komplett abgeschlossen.',
      unlocked: completedOeko,
      progressLabel: completedOeko
        ? 'Abgeschlossen'
        : `${oekoprofitCheckups.length} Checkups aktiv`,
    },
    {
      id: 'eigenanteil-luecke',
      title: 'Null-Eigenanteil-Lücke',
      category: '90/10 Finanzierung',
      description: 'Der 10-%-Eigenanteil (WIN.DN) ist vollständig durch erfasste Belege gedeckt.',
      unlocked: eigenCovered,
      progressLabel: eigenCovered
        ? `${formatEuro(recordedEigen10, 0)} gedeckt`
        : 'Belege abgleichen',
    },
    {
      id: 'backup-waechter',
      title: 'Backup-Wächter',
      category: 'Datensicherheit',
      description: 'Mindestens 1 JSON-Snapshot oder Offline-HTML-Export im laufenden Monat erstellt.',
      unlocked: backupMonthly,
      progressLabel: backupMonthly ? 'Diesen Monat gesichert' : 'Export ausstehend',
    },
    {
      id: 'kassenschluss-trophy',
      title: `Jahresabschluss-Trophäe ${boss.targetYear}`,
      category: 'Kassenschluss 15.11.',
      description: 'Alle 3 Phasen der Jahresabschluss-Prüfung vor dem 15.11. abgeschlossen.',
      unlocked: boss.trophyUnlocked,
      progressLabel: `${boss.progressPct} % abgeschlossen`,
    },
  ];
}

// ── Pacing-Minigame: 48-Monats Ideallinie (04/2025 – 03/2029) ──
export interface IdealliniePoint {
  monthKey: string; // YYYY-MM
  label: string;
  cumPlan: number; // AZA-Geist
  corridorLow: number; // -5%
  corridorHigh: number; // +5%
  cumIst: number | null; // null after current/latest data month
  bandRange: [number, number];
}

export function computeIdeallinieSeries(params: {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  foerderByYear: Record<string, { gesamt: number }>;
  vorsteuerabzugsberechtigt: boolean;
}): {
  series: IdealliniePoint[];
  latestDeviationPct: number;
  inCorridor: boolean;
  latestIst: number;
  latestPlan: number;
} {
  const { personal, rechnungen, foerderByYear, vorsteuerabzugsberechtigt } = params;

  // Build 48 months from 2025-04 to 2029-03
  const months: { key: string; label: string; yearKey: string; monthsInYear: number }[] = [];
  const startYear = 2025;
  const startMonth = 4;
  for (let i = 0; i < 48; i++) {
    const totalM = startYear * 12 + (startMonth - 1) + i;
    const y = Math.floor(totalM / 12);
    const m = (totalM % 12) + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const yearKey = y === 2025 ? 'gesamt25' : y === 2029 ? 'mrz29' : String(y);
    const monthsInYear = y === 2025 ? 9 : y === 2029 ? 3 : 12;
    months.push({
      key,
      label: `${String(m).padStart(2, '0')}/${String(y).slice(2)}`,
      yearKey,
      monthsInYear,
    });
  }

  // Monthly actuals map
  const istByMonth: Record<string, number> = {};
  let latestActualMonth = '2026-07';
  personal.forEach((p) => {
    const mk = `${p.jahr}-${String(p.monat).padStart(2, '0')}`;
    istByMonth[mk] = addEuro(istByMonth[mk] || 0, p.foerderfaehig || 0);
    if (mk > latestActualMonth) latestActualMonth = mk;
  });
  rechnungen.forEach((r) => {
    const ff = getFoerderfaehigerRechnungsBetrag(r, vorsteuerabzugsberechtigt);
    if (ff <= 0 || !r.rechnungsdatum) return;
    const mk = r.rechnungsdatum.slice(0, 7);
    istByMonth[mk] = addEuro(istByMonth[mk] || 0, ff);
    if (mk > latestActualMonth) latestActualMonth = mk;
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const cutoffMonth = latestActualMonth > currentMonth ? latestActualMonth : currentMonth;

  let cumPlan = 0;
  let cumIst = 0;
  let latestDeviationPct = 0;
  let latestIst = 0;
  let latestPlan = 0;

  const series: IdealliniePoint[] = months.map((m) => {
    const yrTotal = foerderByYear[m.yearKey]?.gesamt || 0;
    const monthlyPlan = roundEuro(yrTotal / m.monthsInYear);
    cumPlan = addEuro(cumPlan, monthlyPlan);
    const corridorLow = mulPercent(cumPlan, 95);
    const corridorHigh = mulPercent(cumPlan, 105);

    const hasActual = m.key <= cutoffMonth;
    if (hasActual) {
      cumIst = addEuro(cumIst, istByMonth[m.key] || 0);
      latestIst = cumIst;
      latestPlan = cumPlan;
      latestDeviationPct = cumPlan > 0 ? ((cumIst - cumPlan) / cumPlan) * 100 : 0;
    }

    return {
      monthKey: m.key,
      label: m.label,
      cumPlan,
      corridorLow,
      corridorHigh,
      cumIst: hasActual ? cumIst : null,
      bandRange: [corridorLow, corridorHigh],
    };
  });

  return {
    series,
    latestDeviationPct,
    inCorridor: Math.abs(latestDeviationPct) <= 5,
    latestIst,
    latestPlan,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE SIMULATION & OPERATIONAL MASTERY ENGINES (100% REAL BAFA/STARK DATA)
// ══════════════════════════════════════════════════════════════════════════════

// ── Pillar 2: Anno-Warenlogik Ressourcen-Fluss (Sankey-Pipeline & Engpass-Detektor) ──
export interface ResourceBottleneck {
  position: ProfiPositionCode;
  label: string;
  obligo: number;
  invoicedIst: number;
  stauBetrag: number;
  message: string;
  targetPage: 'rechnungen' | 'vergaben' | 'personal';
}

export interface ResourcePipelineState {
  stage1AzaPotenzial: number;
  stage2GebundenesObligo: number;
  stage3BelegtesIst: number;
  stage3Bund90: number;
  stage3Eigen10Katalysator: number;
  stage4LiquideBundesmittel: number;
  stage4OffeneForderungen: number;
  positionBreakdown: {
    code: ProfiPositionCode;
    displayCode: string;
    label: string;
    azaPlan: number;
    obligo: number;
    ist: number;
    stau: number;
  }[];
  bottlenecks: ResourceBottleneck[];
  primaryBottleneck: ResourceBottleneck | null;
}

export function computeResourcePipeline(params: {
  posPlan: Record<ProfiPositionCode, number>;
  posIst: Record<ProfiPositionCode, number>;
  vergaben: Vergabe[];
  mittelabrufe: Mittelabruf[];
  rechnungen: Rechnungsbeleg[];
  vorsteuerabzugsberechtigt: boolean;
}): ResourcePipelineState {
  const { posPlan, posIst, vergaben, mittelabrufe, rechnungen, vorsteuerabzugsberechtigt } = params;

  const stage1AzaPotenzial = sumEuro(Object.values(posPlan));
  const stage3BelegtesIst = sumEuro(Object.values(posIst));
  const split3 = splitPercent9010(stage3BelegtesIst);

  // Obligo 0835 from contracted/awarded/active Vergaben (Zuschlag / abgeschlossen)
  const obligo0835Vergaben = sumEuro(
    vergaben
      .filter((v) => v.status === 'Zuschlag' || v.status === 'abgeschlossen')
      .map((v) => v.auftragswert || 0)
  );
  // Recorded invoiced amounts strictly in 0835
  const ist0835Rechnungen = sumEuro(
    rechnungen
      .filter((r) => mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition) === '0835')
      .map((r) => getFoerderfaehigerRechnungsBetrag(r, vorsteuerabzugsberechtigt))
  );

  // Total Obligo combines Personnel + Overhead commitments + Contracted 0835 + Travel/Admin Ist
  const obligo0812 = Math.max(posIst['0812'], posIst['0812']);
  const obligo0817 = Math.max(posIst['0817'], posIst['0817']);
  const obligo0820 = Math.max(posIst['0820'], posIst['0820']);
  const obligo0831 = posIst['0831'];
  const obligo0835 = Math.max(obligo0835Vergaben, ist0835Rechnungen);
  const obligo0843 = posIst['0843'];

  const stage2GebundenesObligo = sumEuro([
    obligo0812,
    obligo0817,
    obligo0820,
    obligo0831,
    obligo0835,
    obligo0843,
  ]);

  const stage4LiquideBundesmittel = sumEuro(mittelabrufe.map((m) => m.eingegangen || 0));
  const beantragtGesamt = sumEuro(mittelabrufe.map((m) => m.beantragt || 0));
  const stage4OffeneForderungen = Math.max(0, subEuro(beantragtGesamt, stage4LiquideBundesmittel));

  const positionBreakdown = PROFI_POSITIONEN.map((p) => {
    const obligo =
      p.code === '0835'
        ? obligo0835
        : p.code === '0812'
        ? obligo0812
        : p.code === '0817'
        ? obligo0817
        : p.code === '0820'
        ? obligo0820
        : p.code === '0831'
        ? obligo0831
        : obligo0843;
    const ist = posIst[p.code] || 0;
    const stau = Math.max(0, subEuro(obligo, ist));
    return {
      code: p.code,
      displayCode: p.displayCode,
      label: p.kurzBezeichnung,
      azaPlan: posPlan[p.code] || 0,
      obligo,
      ist,
      stau,
    };
  });

  const bottlenecks: ResourceBottleneck[] = [];
  if (obligo0835Vergaben > ist0835Rechnungen + 1) {
    const stau0835 = subEuro(obligo0835Vergaben, ist0835Rechnungen);
    bottlenecks.push({
      position: '0835',
      label: 'Vergaben & Booster (Pos. 0835)',
      obligo: obligo0835Vergaben,
      invoicedIst: ist0835Rechnungen,
      stauBetrag: stau0835,
      message: `Produktionsstau in Pipeline 0835: ${formatEuro(stau0835, 2)} offenes Obligo (${formatEuro(obligo0835Vergaben, 2)} Zuschlag vs. ${formatEuro(ist0835Rechnungen, 2)} Rechnung) warten auf Rechnungsabruf!`,
      targetPage: 'rechnungen',
    });
  }

  // Also flag pending un-approved Vergaben waiting in pipeline
  const pendingApproval = vergaben.filter((v) => !v.bafaFreigabe && v.status !== 'abgeschlossen');
  if (pendingApproval.length > 0 && bottlenecks.length === 0) {
    const pendingSum = sumEuro(pendingApproval.map((v) => v.auftragswert || 0));
    bottlenecks.push({
      position: '0835',
      label: 'BAFA-Freigabe-Gate (Pos. 0835)',
      obligo: pendingSum,
      invoicedIst: ist0835Rechnungen,
      stauBetrag: pendingSum,
      message: `${pendingApproval.length} Vergabe(n) über ${formatEuro(pendingSum, 2)} warten im Compliance-Gate auf BAFA-Freigabe.`,
      targetPage: 'vergaben',
    });
  }

  return {
    stage1AzaPotenzial,
    stage2GebundenesObligo,
    stage3BelegtesIst,
    stage3Bund90: split3.bund90,
    stage3Eigen10Katalysator: split3.eigen10,
    stage4LiquideBundesmittel,
    stage4OffeneForderungen,
    positionBreakdown,
    bottlenecks,
    primaryBottleneck: bottlenecks[0] || null,
  };
}

// ── Pillar 6: Berater-Stab (3 Executive NPC Advisors driven by real state) ──
export interface ExecutiveAdvisor {
  id: 'kaemmerer' | 'justiziarin' | 'architekt';
  name: string;
  role: string;
  focus: string;
  status: 'optimal' | 'attention' | 'alert';
  message: string;
  metricLabel: string;
  actionLabel: string;
  targetPage: string;
  filters: Record<string, any>;
}

export function computeExecutiveAdvisors(params: {
  zas: Zahlungsanforderung[];
  vergaben: Vergabe[];
  oekoprofitCheckups: OekoprofitCheckup[];
  usecases: UseCase[];
  rechnungen: Rechnungsbeleg[];
  unspent0835: number;
}): ExecutiveAdvisor[] {
  const { zas, vergaben, oekoprofitCheckups, usecases, unspent0835 } = params;
  const valMap = validateZaChain(zas);
  const validations = Object.values(valMap);
  const chainIssues = validations.filter((v) => !v.isChainValid);
  const positiveKb = validations.filter((v) => v.hasPositiveKassenbestand);
  const incompleteZas = zas.filter((z) => !z.belegVollstaendig);

  // 1. Finanz- & BAFA-Kämmerer
  let kaemmererStatus: ExecutiveAdvisor['status'] = 'optimal';
  let kaemmererMsg = `Alle ${zas.length} ZAs sind lückenlos verkettet. Positionen 0812–0843 im Plan-Korridor; Restbudget 0835: ${formatEuro(unspent0835, 0)}.`;
  if (chainIssues.length > 0 || positiveKb.length > 0) {
    kaemmererStatus = 'alert';
    kaemmererMsg =
      chainIssues.length > 0
        ? `Achtung: ${chainIssues.length} ZA zeigt eine Spalte-2-Abweichung zur Vor-ZA. Bitte vor dem nächsten Abruf abgleichen.`
        : `ANBest-P Frist läuft: Positiver Kassenbestand (Zeile 16) in ${positiveKb[0].bezeichnung} – Ausgabenzuordnung vor 2-Monats-Frist prüfen.`;
  } else if (incompleteZas.length > 0 || unspent0835 > 40000) {
    kaemmererStatus = 'attention';
    kaemmererMsg =
      incompleteZas.length > 0
        ? `${incompleteZas.length} ZA(s) warten auf vollständigen Belegabgleich. Außerdem liegen in Pos. 0835 noch ${formatEuro(unspent0835, 0)} — Übertrag vor 15.11. prüfen.`
        : `Vor dem Kassenschluss (15.11.) stehen noch ${formatEuro(unspent0835, 0)} in Pos. 0835 offen — Übertragungs-Dekret nach 2027 vorbereiten.`;
  }

  // 2. Vergabe- & Compliance-Justiziarin
  const unapprovedVergaben = vergaben.filter((v) => !v.bafaFreigabe && v.status !== 'abgeschlossen');
  const todayISO = new Date().toISOString().slice(0, 10);
  const urgentOeko = oekoprofitCheckups.find((c) => {
    const d1 = addBusinessDaysISO(c.termin1Datum, 5);
    const d2 = addBusinessDaysISO(c.termin2Datum, 5);
    const d3 = addWeeksISO(c.termin3Datum, 4);
    return (
      (d1 && !c.protokoll1Abgegeben && d1 <= todayISO) ||
      (d2 && !c.protokoll2Abgegeben && d2 <= todayISO) ||
      (d3 && !c.abschlussReportingAbgegeben && d3 <= todayISO)
    );
  });
  let justiziarinStatus: ExecutiveAdvisor['status'] = 'optimal';
  let justiziarinMsg = `Alle ${vergaben.length} Vergaben sind BAFA-konform dokumentiert und ${oekoprofitCheckups.length} Ökoprofit-Checkups liegen innerhalb der Frist.`;
  if (urgentOeko) {
    justiziarinStatus = 'alert';
    justiziarinMsg = `Fristalarm Ökoprofit (${urgentOeko.startupName}): Ergebnisprotokoll/Reporting sofort abhaken, damit die 1.250-€-/2.500-€-Tranche freigeschaltet wird.`;
  } else if (unapprovedVergaben.length > 0) {
    justiziarinStatus = 'attention';
    justiziarinMsg = `${unapprovedVergaben.length} Vergabe(n) ohne BAFA-Freigabe-Siegel (Compliance-Gate sperrt Rechnungsbuchung in Modul 4). Jetzt Fast-Track prüfen.`;
  }

  // 3. Netzwerk- & Transformations-Architekt
  const batch1 = usecases.filter((u) => u.batch === 'Batch 1');
  const batch2 = usecases.filter((u) => u.batch === 'Batch 2');
  const avgProbB1 =
    batch1.length > 0
      ? Math.round(batch1.reduce((s, u) => s + (u.erfolgswahrscheinlichkeit || 75), 0) / batch1.length)
      : 0;
  const readyB2 = batch2.find((u) => u.status === 'in Vorbereitung');
  const architektStatus: ExecutiveAdvisor['status'] = readyB2 ? 'attention' : 'optimal';
  const architektMsg = readyB2
    ? `Batch 1 läuft stabil bei ${avgProbB1} % Ø-Erfolgswahrscheinlichkeit. In Batch 2 warten ${batch2.length} Vorhaben — Kickoff für „${readyB2.unternehmen} × ${readyB2.startupPartner || readyB2.loesung}“ anstoßen.`
    : `${usecases.length} regionale Use-Cases aktiv verknüpft (Ø ${avgProbB1} % Erfolgswahrscheinlichkeit). Innovations-Cluster bereit für Folgeantrag 2029+.`;

  return [
    {
      id: 'kaemmerer',
      name: 'Finanz- & BAFA-Kämmerer',
      role: '0812–0843 · Zeile 19 · 15.11.',
      focus: 'Haushalts- & Abrufsteuerung',
      status: kaemmererStatus,
      message: kaemmererMsg,
      metricLabel: `${zas.length} ZAs · ${formatEuro(unspent0835, 0)} Rest 0835`,
      actionLabel: incompleteZas.length > 0 || chainIssues.length > 0 ? 'ZA-Rechner öffnen' : 'Übertrag prüfen',
      targetPage: incompleteZas.length > 0 || chainIssues.length > 0 ? 'mittelabrufe' : 'budget',
      filters:
        incompleteZas.length > 0 || chainIssues.length > 0
          ? { mittelabrufeSubTab: 'za-rechner' }
          : { budgetTab: 'kategorie' },
    },
    {
      id: 'justiziarin',
      name: 'Vergabe- & Compliance-Justiziarin',
      role: 'ANBest-P · Fristen · Protokolle',
      focus: 'Rechts- & Fristsicherheit',
      status: justiziarinStatus,
      message: justiziarinMsg,
      metricLabel: `${unapprovedVergaben.length} ohne Siegel · ${oekoprofitCheckups.length} Checkups`,
      actionLabel: 'Vergaben & Checkups',
      targetPage: 'vergaben',
      filters: {},
    },
    {
      id: 'architekt',
      name: 'Netzwerk- & Transformations-Architekt',
      role: 'Batches 1–3 · Tech-Tree · Synergien',
      focus: 'Cluster-Wachstum Düren',
      status: architektStatus,
      message: architektMsg,
      metricLabel: `${batch1.length} aktiv · ${batch2.length} Batch 2`,
      actionLabel: 'Tech-Tree & Use-Cases',
      targetPage: 'usecase',
      filters: {},
    },
  ];
}

// ── Pillar 7: 48-Monate-Chronik & Replay-Scrubber (04/2025 – 03/2029) ──
export interface ChronikFrame {
  index: number; // 0..47
  monthKey: string; // YYYY-MM
  label: string; // MM/YYYY
  azaPeriod: string;
  cumPlan: number;
  cumIst: number;
  activePilots: number;
  pipelinePilots: number;
  boostersReleased: number;
  milestoneEvents: { id: number; titel: string; datum: string; ort: string }[];
}

export function computeChronikTimeline(params: {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  vergaben: Vergabe[];
  usecases: UseCase[];
  events: { id: number; titel: string; datum: string; ort: string }[];
  foerderByYear: Record<string, { gesamt: number }>;
  vorsteuerabzugsberechtigt: boolean;
}): ChronikFrame[] {
  const { personal, rechnungen, vergaben, usecases, events, foerderByYear, vorsteuerabzugsberechtigt } = params;

  const ideallinie = computeIdeallinieSeries({
    personal,
    rechnungen,
    foerderByYear,
    vorsteuerabzugsberechtigt,
  });

  const azaLabelForMonth = (mk: string): string => {
    if (mk <= '2025-12') return 'AZA 1 · Aufbau 2025';
    if (mk <= '2026-12') return 'AZA 2 · Pilotjahr 2026';
    if (mk <= '2027-12') return 'AZA 3 · Skalierung 2027';
    if (mk <= '2028-12') return 'AZA 4 · Transfer 2028';
    return 'AZA 5 · Abschluss Q1/2029';
  };

  return ideallinie.series.map((pt, idx) => {
    const mk = pt.monthKey;
    const monthEvents = events.filter((ev) => ev.datum && ev.datum.slice(0, 7) === mk);

    // Count boosters awarded up to this month
    const boostersByMonth = vergaben.filter((v) => {
      const refDate = v.zuschlagsDatum || v.ausschreibungsDatum || '2026-01-01';
      return v.auftragswert >= 30000 && refDate.slice(0, 7) <= mk;
    }).length;

    // Simulate gradual network activation across the 48 months anchored in real Batch statuses
    const batch1Count = usecases.filter((u) => u.batch === 'Batch 1').length;
    const batch2Count = usecases.filter((u) => u.batch === 'Batch 2').length;
    const batch3Count = usecases.filter((u) => u.batch === 'Batch 3').length;

    let activePilots = 0;
    let pipelinePilots = 0;
    if (mk >= '2025-06' && mk < '2025-11') {
      activePilots = Math.min(batch1Count, 1);
      pipelinePilots = batch1Count - activePilots + Math.min(2, batch2Count);
    } else if (mk >= '2025-11' && mk < '2026-09') {
      activePilots = batch1Count;
      pipelinePilots = batch2Count + batch3Count;
    } else if (mk >= '2026-09' && mk < '2027-06') {
      activePilots = batch1Count + Math.min(3, batch2Count);
      pipelinePilots = Math.max(0, batch2Count - 3) + batch3Count;
    } else if (mk >= '2027-06' && mk < '2028-06') {
      activePilots = batch1Count + batch2Count;
      pipelinePilots = batch3Count;
    } else if (mk >= '2028-06') {
      activePilots = usecases.length;
      pipelinePilots = 0;
    } else {
      pipelinePilots = batch1Count;
    }

    const lastRealIst =
      pt.cumIst !== null
        ? pt.cumIst
        : ideallinie.latestIst;

    return {
      index: idx,
      monthKey: mk,
      label: `${mk.slice(5, 7)}/${mk.slice(0, 4)}`,
      azaPeriod: azaLabelForMonth(mk),
      cumPlan: pt.cumPlan,
      cumIst: lastRealIst,
      activePilots,
      pipelinePilots,
      boostersReleased: boostersByMonth,
      milestoneEvents: monthEvents,
    };
  });
}

// ── Pillar 3: Adjacencies, Blaupausen & Infrastruktur-Hubs ──
export interface ClusterSynergy {
  id: string;
  clusterName: string;
  sharedChallenge: string;
  blueprintUseCaseId: number | null;
  blueprintTitle: string;
  targetUseCaseIds: number[];
  benefitLabel: string;
}

export interface InfrastructureHub {
  id: string;
  name: string;
  shortName: string;
  role: string;
  bonusEffect: string;
  dockedUseCaseIds: number[];
}

export function computeClusterSynergies(usecases: UseCase[]): {
  synergies: ClusterSynergy[];
  hubs: InfrastructureHub[];
} {
  const findIds = (keywords: string[]) =>
    usecases
      .filter((u) => {
        const txt = `${u.unternehmen} ${u.titel} ${u.thema} ${u.branche}`.toLowerCase();
        return keywords.some((k) => txt.includes(k));
      })
      .map((u) => u.id);

  const heatIds = findIds(['wärme', 'abwärme', 'wasserstoff', 'dampf', 'speicher', 'energie']);
  const coatIds = findIds(['beschichtung', 'barriere', 'chitosan', 'spezialpapier', 'chatbot']);
  const visionIds = findIds(['gewebe', 'vlies', 'walzen', 'sensor', 'vision', 'recycling']);

  const pickBlueprint = (ids: number[]) => {
    const matched = usecases.filter((u) => ids.includes(u.id));
    const best = matched.find((u) => u.batch === 'Batch 1' || u.status === 'aktiv') || matched[0];
    return best || null;
  };

  const bHeat = pickBlueprint(heatIds);
  const bCoat = pickBlueprint(coatIds);
  const bVision = pickBlueprint(visionIds);

  const synergies: ClusterSynergy[] = [
    {
      id: 'syn-heat',
      clusterName: 'Cluster Prozesswärme & Energiespeicher',
      sharedChallenge: 'Dampf, Abwärmerückgewinnung & Lastspitzen-Steuerung (Schoellershammer · Metsä · AkzoNobel · Leitungspartner)',
      blueprintUseCaseId: bHeat?.id || null,
      blueprintTitle: bHeat ? `${bHeat.unternehmen} (${bHeat.startupPartner || bHeat.loesung})` : 'Energie-Blaupause',
      targetUseCaseIds: heatIds.filter((id) => id !== bHeat?.id),
      benefitLabel: '40 % schnellere Vergabe- & Lastenheft-Vorbereitung',
    },
    {
      id: 'syn-coat',
      clusterName: 'Cluster Spezialpapier & Biobasierte Barrieren',
      sharedChallenge: 'Kreislauffähige Beschichtungen & Schichtwissen (Sihl · Kanzan · Mondi)',
      blueprintUseCaseId: bCoat?.id || null,
      blueprintTitle: bCoat ? `${bCoat.unternehmen} (${bCoat.startupPartner || bCoat.loesung})` : 'Papier-Blaupause',
      targetUseCaseIds: coatIds.filter((id) => id !== bCoat?.id),
      benefitLabel: 'Transfer-Multiplikator BioökonomieREVIER + 40 % Checklisten-Vorsprung',
    },
    {
      id: 'syn-vision',
      clusterName: 'Cluster KI-Inspektion & Kreislauf-Fertigung',
      sharedChallenge: 'Inline-Sensorik, Robotik & Material-Recycling (GKD · Heimbach · Krafft · Neenah)',
      blueprintUseCaseId: bVision?.id || null,
      blueprintTitle: bVision ? `${bVision.unternehmen} (${bVision.startupPartner || bVision.loesung})` : 'KI-Blaupause',
      targetUseCaseIds: visionIds.filter((id) => id !== bVision?.id),
      benefitLabel: 'Geteilte Redeker-Vergabeblaupause & Sensorik-Standards',
    },
  ];

  const hubs: InfrastructureHub[] = [
    {
      id: 'hub-icd',
      name: 'Innovation Center Düren (ICD)',
      shortName: 'ICD Düren',
      role: 'KI-, Sensorik- & Startup-Transferhub',
      bonusEffect: '+15 % Matchmaking-Tempo für KI- & Digital-Piloten',
      dockedUseCaseIds: findIds(['ki', 'chatbot', 'vision', 'sensor', 'walzen']),
    },
    {
      id: 'hub-mfp',
      name: 'Modellfabrik Papier (MFP)',
      shortName: 'Modellfabrik Papier',
      role: 'Faser-, Trocknungs- & Wasserstoff-Testfeld',
      bonusEffect: 'Validiert Dekarbonisierungs-Reifegrad vor Vollanlage',
      dockedUseCaseIds: findIds(['papier', 'schoellershammer', 'metsä', 'kanzan', 'mondi', 'sihl']),
    },
    {
      id: 'hub-cospace',
      name: 'CO_SPACE.DN',
      shortName: 'CO_SPACE.DN',
      role: 'Design-Thinking- & Co-Creation-Bezirk',
      bonusEffect: 'Beschleunigt Batch-2/3-Konsortialworkshops & LoIs',
      dockedUseCaseIds: usecases.filter((u) => u.batch === 'Batch 2' || u.batch === 'Batch 3').map((u) => u.id),
    },
    {
      id: 'hub-kw66',
      name: 'Klassikwerk 66',
      shortName: 'Klassikwerk 66',
      role: 'Netzwerk- & Lenkungskreis-Forum (DN POWER UP)',
      bonusEffect: 'Erhöht politische Sichtbarkeit & Folgeantrag-Readiness',
      dockedUseCaseIds: usecases.filter((u) => u.politischeRelevanz >= 5).map((u) => u.id),
    },
  ];

  return { synergies, hubs };
}


