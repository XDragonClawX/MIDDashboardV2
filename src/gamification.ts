// Gamification Stufe 1: Serien (Streaks) und dauerhafte Freischaltungen.
// Alle Funktionen sind rein (ohne Seiteneffekte) und damit direkt testbar.
import type {
  AchievementTier,
  AchievementUnlock,
  ComplianceStreaks,
  Rechnungsbeleg,
  StreakResult,
  Zahlungsanforderung,
} from './types';
import { addBusinessDaysISO, validateZaChain, ProjectAchievement, TIER_ORDER } from './utils';

/** Standard-Schonfrist: ein verpasster Eintrag bricht eine Serie nicht. */
export const DEFAULT_STREAK_GRACE = 1;
/** Belege gelten als fristgerecht, wenn sie spätestens nach so vielen Werktagen erfasst sind. */
export const BELEG_TEMPO_WERKTAGE = 5;

/**
 * Berechnet aktuelle und beste Serie aus einer chronologischen Ergebnisliste
 * (ältester Eintrag zuerst). Bis zu `grace` Fehlschläge werden pro Serie
 * toleriert – sie zählen nicht mit, brechen die Serie aber nicht.
 */
export function computeStreak(results: boolean[], grace: number = DEFAULT_STREAK_GRACE): StreakResult {
  // Aktuelle Serie: vom neuesten Eintrag rückwärts
  let current = 0;
  let misses = 0;
  let pendingMisses = 0;
  let jokerUsed = false;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i]) {
      current++;
      if (pendingMisses > 0) jokerUsed = true;
      pendingMisses = 0;
    } else {
      misses++;
      if (misses > grace) break;
      pendingMisses++;
    }
  }

  // Beste Serie: vorwärts durch den gesamten Verlauf
  let best = 0;
  let run = 0;
  let runMisses = 0;
  for (const ok of results) {
    if (ok) {
      run++;
      best = Math.max(best, run);
    } else {
      runMisses++;
      if (runMisses > grace) {
        run = 0;
        runMisses = 0;
      }
    }
  }

  return { current, best: Math.max(best, current), jokerUsed, total: results.length };
}

/**
 * Serie fristgerecht erfasster Belege (Erfassung ≤ 5 Werktage nach Rechnungsdatum).
 * Belege ohne Erfassungszeitpunkt (Altbestand, Importe) werden nicht bewertet.
 */
export function computeBelegTempoStreak(
  rechnungen: Rechnungsbeleg[],
  grace: number = DEFAULT_STREAK_GRACE
): StreakResult {
  const measured = rechnungen
    .filter((r) => Boolean(r.createdAt) && Boolean(r.rechnungsdatum))
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const results = measured.map((r) => {
    const deadline = addBusinessDaysISO(r.rechnungsdatum, BELEG_TEMPO_WERKTAGE);
    return deadline !== null && (r.createdAt || '').slice(0, 10) <= deadline;
  });
  return computeStreak(results, grace);
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1)); // m ist 1-basiert → ergibt Folgemonat
  return d.toISOString().slice(0, 7);
}

/**
 * Serie der Monate mit mindestens einer Sicherung, ab dem ersten gesicherten Monat.
 * Der laufende Monat zählt erst, wenn gesichert wurde – vorher ist er offen, kein Fehlschlag.
 */
export function computeBackupStreak(
  backupMonths: string[],
  nowIso: string,
  grace: number = DEFAULT_STREAK_GRACE
): StreakResult {
  const months = [...new Set(backupMonths)].sort();
  if (months.length === 0) return { current: 0, best: 0, jokerUsed: false, total: 0 };

  const currentMonth = nowIso.slice(0, 7);
  const backedUp = new Set(months);
  const results: boolean[] = [];
  for (let m = months[0]; m <= currentMonth; m = nextMonth(m)) {
    if (m === currentMonth && !backedUp.has(m)) break; // laufender Monat noch offen
    results.push(backedUp.has(m));
  }
  return computeStreak(results, grace);
}

/** Serie eingereichter ZAs (chronologisch) mit gültiger Kette. */
export function computeZaKettenStreak(
  zas: Zahlungsanforderung[],
  grace: number = DEFAULT_STREAK_GRACE
): StreakResult {
  const validation = validateZaChain(zas);
  const submitted = zas
    .filter((z) => z.status === 'Eingereicht' || z.status === 'Abgerechnet')
    .sort((a, b) => a.datum.localeCompare(b.datum));
  return computeStreak(
    submitted.map((z) => Boolean(validation[z.id]?.isChainValid)),
    grace
  );
}

export function computeComplianceStreaks(params: {
  rechnungen: Rechnungsbeleg[];
  zas: Zahlungsanforderung[];
  backupMonths: string[];
  nowIso: string;
}): ComplianceStreaks {
  return {
    belegTempo: computeBelegTempoStreak(params.rechnungen),
    backup: computeBackupStreak(params.backupMonths, params.nowIso),
    zaKette: computeZaKettenStreak(params.zas),
  };
}

// ── Dauerhafte Freischaltungen ──

export function unlockKey(achievementId: string, tier: AchievementTier | null): string {
  return `${achievementId}:${tier ?? 'basis'}`;
}

/** Alle Stufen bis einschließlich der erreichten (Sprung auf Gold schaltet auch Bronze/Silber frei). */
function reachedTiers(achievement: ProjectAchievement): (AchievementTier | null)[] {
  if (achievement.tier) {
    return TIER_ORDER.slice(0, TIER_ORDER.indexOf(achievement.tier) + 1);
  }
  return achievement.unlocked ? [null] : [];
}

/**
 * Ergänzt die gespeicherten Freischaltungen um neu erreichte Abzeichen/Stufen.
 * Einmal Freigeschaltetes bleibt erhalten, auch wenn die Bedingung später
 * nicht mehr erfüllt ist. `newlyUnlocked` enthält je Abzeichen nur die
 * höchste neu erreichte Stufe (für Hinweis-Toast und Audit-Log).
 */
export function mergeAchievementUnlocks(
  previous: AchievementUnlock[],
  achievements: ProjectAchievement[],
  nowIso: string,
  retroactive: boolean = false
): { unlocks: AchievementUnlock[]; newlyUnlocked: AchievementUnlock[] } {
  const known = new Set(previous.map((u) => unlockKey(u.achievementId, u.tier)));
  const added: AchievementUnlock[] = [];
  const newlyUnlocked: AchievementUnlock[] = [];

  for (const achievement of achievements) {
    const fresh = reachedTiers(achievement)
      .filter((tier) => !known.has(unlockKey(achievement.id, tier)))
      .map((tier): AchievementUnlock => ({
        achievementId: achievement.id,
        tier,
        unlockedAt: nowIso,
        ...(retroactive ? { retroactive: true } : {}),
      }));
    if (fresh.length > 0) {
      added.push(...fresh);
      newlyUnlocked.push(fresh[fresh.length - 1]);
    }
  }

  return { unlocks: added.length > 0 ? [...previous, ...added] : previous, newlyUnlocked };
}

export interface DisplayAchievement extends ProjectAchievement {
  unlockedAt: string | null; // erste Freischaltung (Basis bzw. Bronze)
  tierUnlockedAt: string | null; // Freischaltung der aktuell angezeigten Stufe
  retroactive: boolean; // angezeigte Stufe stammt aus der Erst-Übernahme des Bestands
}

/**
 * Kombiniert den Live-Zustand mit den gespeicherten Freischaltungen:
 * angezeigt wird jeweils die höhere Stufe, samt Freischaltdatum.
 */
export function applyPersistedUnlocks(
  achievements: ProjectAchievement[],
  unlocks: AchievementUnlock[]
): DisplayAchievement[] {
  return achievements.map((achievement) => {
    const own = unlocks.filter((u) => u.achievementId === achievement.id);
    const persistedTier = own.reduce<AchievementTier | null>((best, u) => {
      if (!u.tier) return best;
      if (!best) return u.tier;
      return TIER_ORDER.indexOf(u.tier) > TIER_ORDER.indexOf(best) ? u.tier : best;
    }, null);

    const liveTier = achievement.tier ?? null;
    let tier: AchievementTier | null = liveTier;
    if (persistedTier && (!liveTier || TIER_ORDER.indexOf(persistedTier) > TIER_ORDER.indexOf(liveTier))) {
      tier = persistedTier;
    }

    const first = [...own].sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt))[0];
    const tierRecord = own.find((u) => u.tier === tier) ?? (tier === null ? first : undefined);
    const nextTier =
      tier && achievement.nextTier && TIER_ORDER.indexOf(achievement.nextTier.tier) <= TIER_ORDER.indexOf(tier)
        ? null
        : achievement.nextTier ?? null;

    return {
      ...achievement,
      unlocked: achievement.unlocked || own.length > 0,
      tier,
      nextTier: tier === 'gold' ? null : nextTier,
      unlockedAt: first?.unlockedAt ?? null,
      tierUnlockedAt: tierRecord?.unlockedAt ?? null,
      // bezieht sich auf die angezeigte Stufe (bzw. die Basis-Freischaltung)
      retroactive: Boolean((tier ? tierRecord : first)?.retroactive),
    };
  });
}

/** Robustes Einlesen gespeicherter Freischaltungen (null = noch nie initialisiert). */
export function sanitizeUnlocks(raw: unknown): AchievementUnlock[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (u): u is AchievementUnlock =>
      typeof u === 'object' &&
      u !== null &&
      typeof (u as AchievementUnlock).achievementId === 'string' &&
      typeof (u as AchievementUnlock).unlockedAt === 'string' &&
      ((u as AchievementUnlock).tier === null || TIER_ORDER.includes((u as AchievementUnlock).tier as AchievementTier))
  );
}
