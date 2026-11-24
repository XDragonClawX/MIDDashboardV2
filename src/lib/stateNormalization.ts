// Normalisierung und Bereinigung gespeicherter Datenstände (aus localStorage, Server oder Offline-HTML).
// Reine Funktionen ohne React – dadurch direkt testbar.
import type {
  Buchung,
  PartnerMatch,
  PersonalEintrag,
  Rechnungsbeleg,
  Zahlungsanforderung,
} from '../types';
import {
  SEED_PERSONAL as INITIAL_PERSONAL,
  SEED_RECHNUNGEN as INITIAL_RECHNUNGEN,
  SEED_ZAHLUNGSANFORDERUNGEN as INITIAL_ZAS,
} from '../data';
import { addEuro, mulPercent, normalizeProfiAmounts, subEuro } from '../utils';

declare global {
  interface Window {
    __MIDPCT_INITIAL_STATE__?: Record<string, any>;
  }
}

export const INITIAL_MATCHES: PartnerMatch[] = [];
export const INITIAL_BUCHUNGEN: Buchung[] = [];

export function getOfflineInjectedState(): Record<string, any> | null {
  if (typeof window !== 'undefined' && window.__MIDPCT_INITIAL_STATE__) {
    return window.__MIDPCT_INITIAL_STATE__;
  }
  return null;
}

export function sanitizeAndDeduplicate<T extends { id: number }>(items: T[], fallbackSeed: T[] = []): T[] {
  const list = Array.isArray(items) && items.length > 0 ? items : fallbackSeed;
  const seenIds = new Set<number>();
  const verifiedList: T[] = [];

  list.forEach((item) => {
    if (item && typeof item.id === 'number' && !isNaN(item.id) && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      verifiedList.push(item);
    } else if (item) {
      verifiedList.push({ ...item, id: -1 });
    }
  });

  let nextId = verifiedList.length > 0 ? Math.max(...verifiedList.map((x) => x.id)) + 1 : 1;
  if (nextId < 1 || isNaN(nextId)) nextId = 1;

  return verifiedList.map((item) => {
    if (item.id === -1) {
      const newId = nextId++;
      return { ...item, id: newId };
    }
    return item;
  });
}

export function upgradeAndNormalizeZas(rawZas: Zahlungsanforderung[]): Zahlungsanforderung[] {
  const baseList = Array.isArray(rawZas) && rawZas.length > 0 ? rawZas : INITIAL_ZAS;

  // Upgrade historical 2026 ZAs if stored version had incomplete 0-euro placeholders (!belegVollstaendig)
  const upgraded = baseList.map((z) => {
    const seedMatch = INITIAL_ZAS.find(
      (s) =>
        s.datum.trim() === String(z?.datum || '').trim() ||
        s.bezeichnung.toLowerCase().trim() === String(z?.bezeichnung || '').toLowerCase().trim()
    );
    if (seedMatch && !z.belegVollstaendig) {
      return {
        ...seedMatch,
        id: z.id || seedMatch.id,
      };
    }
    return {
      ...z,
      istJePosition: normalizeProfiAmounts(z.istJePosition),
      vorschauJePosition: normalizeProfiAmounts(z.vorschauJePosition),
    };
  });

  const existingKeys = new Set(
    upgraded.map((z) => `${String(z?.datum || '').trim()}::${String(z?.bezeichnung || '').toLowerCase().trim()}`)
  );
  const missing = INITIAL_ZAS.filter(
    (seed) =>
      !existingKeys.has(`${seed.datum.trim()}::${seed.bezeichnung.toLowerCase().trim()}`) &&
      !upgraded.some((u) => u.datum === seed.datum)
  );

  return sanitizeAndDeduplicate([...upgraded, ...missing], INITIAL_ZAS).map((z) => ({
    ...z,
    istJePosition: normalizeProfiAmounts(z.istJePosition),
    vorschauJePosition: normalizeProfiAmounts(z.vorschauJePosition),
  }));
}

export function normalizePersonalList(raw: PersonalEintrag[]): PersonalEintrag[] {
  const loaded = sanitizeAndDeduplicate(raw, INITIAL_PERSONAL);
  return loaded.map((p) => {
    const ff = p.foerderfaehig || addEuro(p.agKosten || 0, p.sachkosten || 0);
    const bafa = mulPercent(ff, 90);
    const eigen = subEuro(ff, bafa);
    return {
      ...p,
      foerderfaehig: ff,
      bafaAnteil: bafa,
      lhoAnteil: 0,
      eigenaufwand: eigen,
    };
  });
}

export function normalizeRechnungenList(raw: Rechnungsbeleg[]): Rechnungsbeleg[] {
  const loaded = sanitizeAndDeduplicate(raw, INITIAL_RECHNUNGEN);
  return loaded.map((r) => ({
    ...r,
    mwstSatz:
      r.mwstSatz !== undefined
        ? r.mwstSatz
        : r.betragBrutto > (r.betragNetto || 0) + 0.01
        ? 19
        : 'brutto',
  }));
}
