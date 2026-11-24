// Härtung des lokalen Express-Servers: Zugriffsschutz, Begrenzungen, sicheres Schreiben, Backups.
// Reine Helfer ohne Abhängigkeit von server.ts, damit sie einzeln testbar sind.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.trim().toLowerCase());
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Prüft einen `Authorization: Basic …`-Header gegen Benutzer und Passwort. */
export function checkBasicAuth(header: string | undefined, user: string, password: string): boolean {
  if (!header || !header.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
  } catch {
    return false;
  }
  const idx = decoded.indexOf(':');
  if (idx < 0) return false;
  const okUser = safeEqual(decoded.slice(0, idx), user);
  const okPass = safeEqual(decoded.slice(idx + 1), password);
  return okUser && okPass;
}

/** Express-Middleware: verlangt Basic-Auth (Browser fragen selbst nach). `/api/health` bleibt frei. */
export function createBasicAuth(user: string, password: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/health') return next();
    if (checkBasicAuth(req.headers.authorization, user, password)) return next();
    res.setHeader('WWW-Authenticate', 'Basic realm="MiD-PCT Dashboard", charset="UTF-8"');
    res.status(401).send('Anmeldung erforderlich.');
  };
}

/** Einfache Begrenzung pro Client-IP im Arbeitsspeicher (reicht für ein internes Werkzeug). */
export function createRateLimiter(options: { windowMs: number; max: number; now?: () => number }) {
  const hits = new Map<string, number[]>();
  const now = options.now ?? Date.now;
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const t = now();
    const recent = (hits.get(key) ?? []).filter((ts) => t - ts < options.windowMs);
    if (recent.length >= options.max) {
      const retryAfter = Math.ceil((options.windowMs - (t - recent[0])) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({ error: 'Zu viele Anfragen – bitte kurz warten.' });
    }
    recent.push(t);
    hits.set(key, recent);
    next();
  };
}

export const MAX_UPLOAD_BASE64_CHARS = 14 * 1024 * 1024; // ≈ 10 MB Rohdaten
const ALLOWED_UPLOAD_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

export function validateUpload(base64Data: unknown, mimeType: unknown): { ok: true } | { ok: false; error: string } {
  if (typeof base64Data !== 'string' || base64Data.length === 0) {
    return { ok: false, error: 'Keine Datei-Daten (base64Data) übermittelt.' };
  }
  if (base64Data.length > MAX_UPLOAD_BASE64_CHARS) {
    return { ok: false, error: 'Datei ist zu groß (maximal ca. 10 MB).' };
  }
  const type = typeof mimeType === 'string' && mimeType ? mimeType : 'application/pdf';
  if (!ALLOWED_UPLOAD_TYPES.has(type)) {
    return { ok: false, error: 'Dateityp nicht erlaubt (PDF, PNG, JPEG oder WebP).' };
  }
  return { ok: true };
}

/** Der Stand muss ein JSON-Objekt unter `state` sein – nichts anderes wird gespeichert. */
export function validateStateBody(body: unknown): { ok: true } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Ungültiger Datenstand (Objekt erwartet).' };
  }
  const state = (body as { state?: unknown }).state;
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    return { ok: false, error: 'Ungültiger Datenstand (Feld "state" fehlt).' };
  }
  return { ok: true };
}

/** Schreibt über eine Temp-Datei und benennt sie um – ein Abbruch hinterlässt nie eine halbe Datei. */
export function atomicWriteFileSync(file: string, data: string): void {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, data, 'utf-8');
    fs.renameSync(tmp, file);
  } catch (err) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      /* Aufräumen ist optional */
    }
    throw err;
  }
}

/** `2026-11-24T14-05` – sortierbar und auf Windows als Dateiname erlaubt. */
export function backupFileName(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace(':', '-')}.json`;
}

/**
 * Legt höchstens eine Sicherung pro Stunde an (Stundenstempel im Dateinamen) und
 * behält nur die jüngsten `keep` Dateien. Gibt den Dateinamen zurück, falls geschrieben wurde.
 */
export function writeHourlyBackup(dir: string, data: string, now: Date, keep: number): string | null {
  const hourPrefix = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const existing = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const hasThisHour = existing.some((f) => f.startsWith(hourPrefix));
  let written: string | null = null;
  if (!hasThisHour) {
    written = backupFileName(now);
    atomicWriteFileSync(path.join(dir, written), data);
  }
  const all = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - keep))) {
    fs.rmSync(path.join(dir, old), { force: true });
  }
  return written;
}

/** Ersetzt `</head>` ohne die Sonderzeichen (`$&`, `$'`) des Ersatztexts auszuwerten. */
export function injectBeforeHeadEnd(html: string, injection: string): string {
  return html.replace('</head>', () => injection);
}
