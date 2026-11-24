import { describe, expect, it } from 'vitest';
import type { OekoprofitCheckup, PersonalEintrag, Rechnungsbeleg, UseCase, Vergabe, Zahlungsanforderung } from './types';
import { searchErp } from './lib/search';
import { normalizePersonalList, normalizeRechnungenList, sanitizeAndDeduplicate } from './lib/stateNormalization';

describe('sanitizeAndDeduplicate', () => {
  it('vergibt neue IDs für doppelte und ungültige IDs', () => {
    const out = sanitizeAndDeduplicate([{ id: 1 }, { id: 1 }, { id: Number.NaN }, { id: 5 }] as { id: number }[]);
    const ids = out.map((x) => x.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids[0]).toBe(1);
    expect(ids[3]).toBe(5);
    expect(Math.min(...ids)).toBeGreaterThan(0);
  });

  it('fällt bei leerer Liste auf den Seed zurück', () => {
    expect(sanitizeAndDeduplicate([], [{ id: 7 }])).toEqual([{ id: 7 }]);
    expect(sanitizeAndDeduplicate(undefined as never, [{ id: 7 }])).toEqual([{ id: 7 }]);
  });

  it('verwirft leere Einträge', () => {
    expect(sanitizeAndDeduplicate([null, { id: 2 }] as never)).toEqual([{ id: 2 }]);
  });
});

describe('Normalisierung gespeicherter Listen', () => {
  it('berechnet Förderanteile cent-genau (90 % Bund / 10 % Eigen)', () => {
    const [p] = normalizePersonalList([
      { id: 1, mitarbeiter: 'A', agKosten: 1000.01, sachkosten: 0 } as PersonalEintrag,
    ]);
    expect(p.foerderfaehig).toBe(1000.01);
    expect(p.bafaAnteil).toBe(900.01);
    expect(p.eigenaufwand).toBe(100);
    expect(p.lhoAnteil).toBe(0);
  });

  it('ergänzt fehlende MwSt-Angabe: Brutto > Netto → 19, sonst "brutto"', () => {
    const [a, b] = normalizeRechnungenList([
      { id: 1, betragNetto: 100, betragBrutto: 119 } as Rechnungsbeleg,
      { id: 2, betragNetto: 100, betragBrutto: 100 } as Rechnungsbeleg,
    ]);
    expect(a.mwstSatz).toBe(19);
    expect(b.mwstSatz).toBe('brutto');
  });
});

describe('searchErp', () => {
  const data = {
    rechnungen: [
      { rechnungsnummer: 'R-42', rechnungssteller: 'Acme GmbH', kostenkategorie: 'Marketing', leistungsbeschreibung: '' },
    ] as unknown as Rechnungsbeleg[],
    personal: [{ mitarbeiter: 'Erika Muster', bemerkung: '', foerderjahr: 2026, quartal: 2 }] as unknown as PersonalEintrag[],
    vergaben: [{ titel: 'Booster 4', auftragnehmer: '', vergabeart: '', notizen: '' }] as unknown as Vergabe[],
    usecases: [{ titel: 'Abwärmenutzung', unternehmen: 'Papier AG', ansprechpartner: '', branche: '', notizen: '' }] as unknown as UseCase[],
    oekoprofitCheckups: [{ startupName: 'Startup X', berater: '', branche: '', status: 'geplant' }] as unknown as OekoprofitCheckup[],
    zas: [{ bezeichnung: 'ZA 03', datum: '2026-03-13' }] as unknown as Zahlungsanforderung[],
  };

  it('liefert bei leerer Suche nichts', () => {
    expect(searchErp('', data)).toEqual([]);
    expect(searchErp('   ', data)).toEqual([]);
  });

  it('findet unabhängig von Groß-/Kleinschreibung in allen Sammlungen', () => {
    expect(searchErp('acme', data)[0]).toMatchObject({ page: 'rechnungen', category: 'Rechnungsbelege' });
    expect(searchErp('ERIKA', data)[0].page).toBe('personal');
    expect(searchErp('booster', data)[0].page).toBe('vergaben');
    expect(searchErp('abwärme', data)[0].page).toBe('usecase');
    expect(searchErp('startup x', data)[0].page).toBe('vergaben');
    expect(searchErp('2026-03', data)[0].page).toBe('mittelabrufe');
  });

  it('begrenzt die Trefferzahl', () => {
    const many = { ...data, zas: Array.from({ length: 20 }, (_, i) => ({ bezeichnung: `ZA ${i}`, datum: '2026-01-01' })) as unknown as Zahlungsanforderung[] };
    expect(searchErp('za', many)).toHaveLength(8);
    expect(searchErp('za', many, 3)).toHaveLength(3);
  });

  it('meldet keine Treffer bei unbekanntem Begriff', () => {
    expect(searchErp('qwertzuiop', data)).toEqual([]);
  });
});
