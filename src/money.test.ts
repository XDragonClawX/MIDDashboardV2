import { describe, expect, it } from 'vitest';
import type { AuditLog, MitarbeiterStamm, PersonalEintrag, Rechnungsbeleg, Zahlungsanforderung } from './types';
import {
  GOBD_GENESIS_HASH,
  addBusinessDaysISO,
  addDaysISO,
  addEuro,
  addWeeksISO,
  computeAuditEntryHash,
  createEmptyProfiAmounts,
  ensureAuditLogChain,
  fromCents,
  getFoerderfaehigerRechnungsBetrag,
  mapKategorieToProfiPosition,
  mulPercent,
  normalizeProfiAmounts,
  roundEuro,
  sha256HexSync,
  splitPercent9010,
  splitPersonalToProfi,
  subEuro,
  sumEuro,
  toCents,
  validateZaChain,
  verifyAuditChain,
} from './utils';

describe('Cent-Arithmetik', () => {
  it('vermeidet Gleitkomma-Fehler', () => {
    expect(0.1 + 0.2).not.toBe(0.3); // Ausgangsproblem
    expect(addEuro(0.1, 0.2)).toBe(0.3);
    expect(subEuro(0.3, 0.1)).toBe(0.2);
    expect(sumEuro([0.1, 0.2, 0.3])).toBe(0.6);
  });

  it('rechnet in Cent und zurück', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(Number.NaN)).toBe(0);
    expect(fromCents(1999)).toBe(19.99);
    expect(roundEuro(10.004)).toBe(10);
    expect(roundEuro(10.006)).toBe(10.01);
  });

  it('berechnet Prozentanteile cent-genau', () => {
    expect(mulPercent(100.01, 90)).toBe(90.01);
    expect(mulPercent(1000, 10)).toBe(100);
  });
});

describe('90/10-Aufteilung (Bund/Eigenanteil)', () => {
  it('teilt glatte Beträge exakt', () => {
    expect(splitPercent9010(1000)).toEqual({ bund90: 900, eigen10: 100 });
  });

  it('verliert nie einen Cent (Summe = Gesamtbetrag)', () => {
    for (const amount of [0.01, 0.05, 0.99, 1.01, 33.33, 99.99, 1234.57, 154587.63]) {
      const { bund90, eigen10 } = splitPercent9010(amount);
      expect(toCents(bund90) + toCents(eigen10)).toBe(toCents(amount));
    }
  });
});

describe('Profi-Positionen', () => {
  it('legt leere und normalisierte Beträge an', () => {
    expect(Object.values(createEmptyProfiAmounts()).every((v) => v === 0)).toBe(true);
    expect(normalizeProfiAmounts({ '0812': 10.005 + 0.001, '0835': 5 })['0835']).toBe(5);
    expect(normalizeProfiAmounts(undefined)['0812']).toBe(0);
  });

  it('ordnet Kategorien Positionen zu', () => {
    expect(mapKategorieToProfiPosition('Dienstreise Berlin')).toBe('0831');
    expect(mapKategorieToProfiPosition('Ökoprofit-Checkup')).toBe('0835');
    expect(mapKategorieToProfiPosition('Booster 3')).toBe('0835');
    expect(mapKategorieToProfiPosition('Marketing')).toBe('0843');
    expect(mapKategorieToProfiPosition('Hosting')).toBe('0843');
    expect(mapKategorieToProfiPosition('Unbekannt')).toBe('0835');
  });

  it('bevorzugt eine ausdrücklich gesetzte Position', () => {
    expect(mapKategorieToProfiPosition('Marketing', '0831')).toBe('0831');
  });
});

describe('splitPersonalToProfi', () => {
  const entry = (o: Partial<PersonalEintrag>) =>
    ({ id: 1, mitarbeiter: 'Max Muster', agKosten: 0, sachkosten: 0, ...o }) as PersonalEintrag;

  it('teilt AG-Kosten mit Standard-SV-Quote 18 % in 0812 und 0820', () => {
    const r = splitPersonalToProfi([entry({ agKosten: 1000 })]);
    expect(r.pos0820).toBe(180);
    expect(r.pos0812).toBe(820);
    expect(r.pos0817).toBe(0);
  });

  it('bucht Sachkosten auf 0843', () => {
    expect(splitPersonalToProfi([entry({ agKosten: 0, sachkosten: 50 })]).pos0843Overhead).toBe(50);
  });

  it('verwendet exakte DATEV-Felder vorrangig', () => {
    const r = splitPersonalToProfi([entry({ agKosten: 9999, brutto0812: 700, brutto0817: 100, sv0820: 150 })]);
    expect(r).toMatchObject({ pos0812: 700, pos0817: 100, pos0820: 150 });
  });

  it('ordnet Hilfskräfte per Name 0817 zu', () => {
    const r = splitPersonalToProfi([entry({ mitarbeiter: 'Hilfskraft Fischöder', agKosten: 1000 })]);
    expect(r.pos0817).toBe(820);
    expect(r.pos0812).toBe(0);
  });

  it('nutzt Stammdaten (Position und SV-Quote)', () => {
    const stamm = [{ name: 'Anna Beispiel', primaerePosition: '0817', svQuote: 0.2 }] as MitarbeiterStamm[];
    const r = splitPersonalToProfi([entry({ mitarbeiter: 'Anna Beispiel', agKosten: 1000 })], 0.18, stamm);
    expect(r.pos0820).toBe(200);
    expect(r.pos0817).toBe(800);
  });

  it('bucht eine Eintragung mit Position 0820 komplett dorthin', () => {
    expect(splitPersonalToProfi([entry({ agKosten: 400, profiPosition: '0820' })]).pos0820).toBe(400);
  });

  it('verliert keinen Cent (Summe = AG-Kosten + Sachkosten)', () => {
    const entries = [101.01, 333.33, 777.77, 1234.56].map((ag, i) =>
      entry({ id: i, agKosten: ag, sachkosten: 1.11 })
    );
    const r = splitPersonalToProfi(entries);
    const total = sumEuro(entries.map((e) => addEuro(e.agKosten, e.sachkosten)));
    expect(sumEuro([r.pos0812, r.pos0817, r.pos0820, r.pos0843Overhead])).toBe(total);
  });

  it('begrenzt unsinnige SV-Quoten', () => {
    expect(splitPersonalToProfi([entry({ agKosten: 1000 })], 5).pos0820).toBe(500);
    expect(splitPersonalToProfi([entry({ agKosten: 1000 })], -1).pos0820).toBe(0);
  });
});

describe('§ 15 UStG – förderfähiger Rechnungsbetrag', () => {
  const beleg = (o: Partial<Rechnungsbeleg>) =>
    ({ betragNetto: 100, betragBrutto: 119, foerderfaehig: true, mwstSatz: 19, ...o }) as Rechnungsbeleg;

  it('nimmt netto bei Vorsteuerabzug, sonst brutto', () => {
    expect(getFoerderfaehigerRechnungsBetrag(beleg({}), true)).toBe(100);
    expect(getFoerderfaehigerRechnungsBetrag(beleg({}), false)).toBe(119);
  });

  it('ist 0 für nicht förderfähige Belege', () => {
    expect(getFoerderfaehigerRechnungsBetrag(beleg({ foerderfaehig: false }), false)).toBe(0);
  });

  it('erzwungenes "brutto" gilt auch bei Vorsteuerabzug', () => {
    expect(getFoerderfaehigerRechnungsBetrag(beleg({ mwstSatz: 'brutto' as never }), true)).toBe(119);
  });

  it('fällt auf netto zurück, wenn kein Brutto vorliegt', () => {
    expect(getFoerderfaehigerRechnungsBetrag(beleg({ betragBrutto: 0 }), false)).toBe(100);
  });
});

describe('Datumshilfen', () => {
  it('addDaysISO', () => {
    expect(addDaysISO('2026-06-10', 60)).toBe('2026-08-09');
    expect(addDaysISO('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDaysISO(undefined, 3)).toBeNull();
    expect(addDaysISO('kein-datum', 3)).toBeNull();
  });

  it('addBusinessDaysISO überspringt Wochenenden', () => {
    expect(addBusinessDaysISO('2026-03-02', 5)).toBe('2026-03-09'); // Mo → Mo
    expect(addBusinessDaysISO('2026-03-06', 1)).toBe('2026-03-09'); // Fr → Mo
    expect(addBusinessDaysISO('2026-03-07', 1)).toBe('2026-03-09'); // Sa → Mo
  });

  it('addWeeksISO', () => {
    expect(addWeeksISO('2026-01-01', 2)).toBe('2026-01-15');
  });
});

describe('ZA-Kette und ANBest-P-2-Monats-Frist', () => {
  const amounts = (o: Record<string, number>) => ({ ...createEmptyProfiAmounts(), ...o });
  const za = (o: Partial<Zahlungsanforderung>): Zahlungsanforderung =>
    ({
      id: 1,
      bezeichnung: 'ZA',
      datum: '2026-03-13',
      stichtagIst: '2026-03-10',
      istJePosition: amounts({ '0812': 1000, '0843': 100 }),
      vorschauJePosition: amounts({ '0812': 500 }),
      bundesanteilQuote: 0.9,
      ...o,
    }) as Zahlungsanforderung;

  it('erste ZA hat Spalte 2 = 0 und ist gültig', () => {
    const v = validateZaChain([za({})])[1];
    expect(v.sumIst).toBe(1100);
    expect(v.sumVorschau).toBe(500);
    expect(v.actualSpalte2).toBe(0);
    expect(v.isChainValid).toBe(true);
  });

  it('erwartet Spalte 2 = Ist + Vorschau der Vor-ZA', () => {
    const map = validateZaChain([za({ id: 1 }), za({ id: 2, datum: '2026-06-01' })]);
    expect(map[2].expectedSpalte2).toBe(1600);
    expect(map[2].isChainValid).toBe(true);
  });

  it('erkennt Abweichungen in Spalte 2 und toleriert 5 Cent', () => {
    const base = za({ id: 1 });
    const off = validateZaChain([base, za({ id: 2, datum: '2026-06-01', spalte2BisherGeplant: 1000 })])[2];
    expect(off.isChainValid).toBe(false);
    expect(off.deltaSpalte2).toBe(-600);
    const close = validateZaChain([base, za({ id: 2, datum: '2026-06-01', spalte2BisherGeplant: 1599.97 })])[2];
    expect(close.isChainValid).toBe(true);
  });

  it('sortiert nach Datum, nicht nach Reihenfolge der Liste', () => {
    const map = validateZaChain([za({ id: 2, datum: '2026-06-01' }), za({ id: 1 })]);
    expect(map[2].expectedSpalte2).toBe(1600);
  });

  it('berechnet Kassenbestand (Zeile 16) und die 2-Monats-Frist bei positivem Guthaben', () => {
    const first = za({ id: 1 });
    const second = za({
      id: 2,
      datum: '2026-06-01',
      istJePosition: amounts({ '0812': 1500 }),
      auszahlungsDatum: '2026-06-10',
    });
    const v = validateZaChain([first, second])[2];
    expect(v.zeile14Expected).toBe(1440); // 90 % von 1600
    expect(v.zeile15Ist90).toBe(1350); // 90 % von 1500
    expect(v.zeile16Kassenbestand).toBe(90);
    expect(v.hasPositiveKassenbestand).toBe(true);
    expect(v.twoMonthDeadline).toBe('2026-08-09');
  });

  it('hat ohne positives Guthaben keine Frist', () => {
    const v = validateZaChain([za({})])[1];
    expect(v.hasPositiveKassenbestand).toBe(false);
    expect(v.twoMonthDeadline).toBeNull();
  });

  it('berechnet Zeile 19 = Vorschau (90 %) − Kassenbestand − Zusatz', () => {
    const v = validateZaChain([za({ zeile17ZusatzVerrechnung: 20 })])[1];
    expect(v.zeile18Vorschau90).toBe(450);
    expect(v.zeile16Kassenbestand).toBe(-990);
    expect(v.zeile19Computed).toBe(450 + 990 - 20);
  });
});

describe('GoBD: SHA-256 und Hash-Kette', () => {
  it('liefert die bekannten SHA-256-Testvektoren', () => {
    expect(sha256HexSync('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256HexSync('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  const log = (id: number, details: string): AuditLog => ({
    id,
    timestamp: `2026-11-0${id}T10:00:00Z`,
    module: 'Test',
    action: 'UPDATE',
    details,
    user: 'tester',
  });
  // Protokoll liegt neueste zuerst
  const chain = () => ensureAuditLogChain([log(3, 'c'), log(2, 'b'), log(1, 'a')]);

  it('verkettet ab dem Genesis-Hash und ist deterministisch', () => {
    const c = chain();
    const oldest = c[c.length - 1];
    expect(oldest.previousHash).toBe(GOBD_GENESIS_HASH);
    expect(c[0].previousHash).toBe(c[1].hash);
    expect(computeAuditEntryHash({ ...oldest }, GOBD_GENESIS_HASH)).toBe(oldest.hash);
    expect(verifyAuditChain(c)).toEqual({ valid: true, checkedCount: 3, brokenId: null });
  });

  it('erkennt nachträglich veränderte Einträge', () => {
    const c = chain();
    c[1] = { ...c[1], details: 'manipuliert' };
    const r = verifyAuditChain(c);
    expect(r.valid).toBe(false);
    expect(r.brokenId).toBe(2);
  });

  it('erkennt entfernte Einträge', () => {
    const c = chain();
    const withoutMiddle = [c[0], c[2]];
    expect(verifyAuditChain(withoutMiddle).valid).toBe(false);
  });

  it('akzeptiert ein leeres Protokoll', () => {
    expect(verifyAuditChain([])).toEqual({ valid: true, checkedCount: 0, brokenId: null });
  });
});
