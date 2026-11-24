// Globale Suche (Strg+K) über die ERP-Sammlungen. Reine Funktion, dadurch testbar.
import type { OekoprofitCheckup, PersonalEintrag, Rechnungsbeleg, UseCase, Vergabe, Zahlungsanforderung } from '../types';

export interface SearchResult {
  text: string;
  page: string;
  category: string;
}

export interface SearchCollections {
  rechnungen: Rechnungsbeleg[];
  personal: PersonalEintrag[];
  vergaben: Vergabe[];
  usecases: UseCase[];
  oekoprofitCheckups: OekoprofitCheckup[];
  zas: Zahlungsanforderung[];
}

export const MAX_SEARCH_RESULTS = 8;

const has = (value: string | undefined | null, q: string) => (value || '').toLowerCase().includes(q);

export function searchErp(query: string, c: SearchCollections, limit: number = MAX_SEARCH_RESULTS): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: SearchResult[] = [];

  c.rechnungen.forEach((r) => {
    if (has(r.rechnungsnummer, q) || has(r.rechnungssteller, q) || has(r.kostenkategorie, q) || has(r.leistungsbeschreibung, q)) {
      results.push({
        text: `Rechnung #${r.rechnungsnummer || ''} von ${r.rechnungssteller || ''} (${r.kostenkategorie || ''})`,
        page: 'rechnungen',
        category: 'Rechnungsbelege',
      });
    }
  });

  c.personal.forEach((p) => {
    if (has(p.mitarbeiter, q) || has(p.bemerkung, q)) {
      results.push({
        text: `Mitarbeiter-Eintrag: ${p.mitarbeiter || ''} (Jahr ${p.foerderjahr || ''}, Q${p.quartal || ''})`,
        page: 'personal',
        category: 'Personalbelege',
      });
    }
  });

  c.vergaben.forEach((v) => {
    if (has(v.titel, q) || has(v.auftragnehmer, q) || has(v.vergabeart, q) || has(v.notizen, q)) {
      results.push({
        text: `Ausschreibung: ${v.titel || ''} (Bieter: ${v.auftragnehmer || 'keiner'})`,
        page: 'vergaben',
        category: 'Ausschreibungen/Vergabe',
      });
    }
  });

  c.usecases.forEach((u) => {
    if (has(u.titel, q) || has(u.unternehmen, q) || has(u.ansprechpartner, q) || has(u.branche, q) || has(u.notizen, q)) {
      results.push({
        text: `Use-Case: ${u.titel || ''} (${u.unternehmen || ''})`,
        page: 'usecase',
        category: 'Transformationspiloten',
      });
    }
  });

  c.oekoprofitCheckups.forEach((o) => {
    if (
      has(o.startupName, q) ||
      has(o.berater, q) ||
      has(o.branche, q) ||
      'oekoprofit'.includes(q) ||
      'ökoprofit'.includes(q) ||
      'transformationsbooster'.includes(q)
    ) {
      results.push({
        text: `Ökoprofit-Checkup: ${o.startupName || ''} (${o.berater || 'Berater offen'} · ${o.status})`,
        page: 'vergaben',
        category: 'Ökoprofit / Pos. 0835',
      });
    }
  });

  c.zas.forEach((z) => {
    if (has(z.bezeichnung, q) || has(z.datum, q) || 'za'.includes(q) || 'profi-online'.includes(q) || 'zeile 19'.includes(q)) {
      results.push({
        text: `Zahlungsanforderung: ${z.bezeichnung || ''} (${z.datum || ''})`,
        page: 'mittelabrufe',
        category: 'profi-online ZA',
      });
    }
  });

  return results.slice(0, limit);
}
