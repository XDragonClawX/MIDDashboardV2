import type {
  Zahlungsanforderung,
} from '../types';
import { addEuro, mulPercent, roundEuro, subEuro, sumEuro } from './money';

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
