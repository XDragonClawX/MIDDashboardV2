import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_BASE64_CHARS,
  atomicWriteFileSync,
  backupFileName,
  checkBasicAuth,
  createRateLimiter,
  injectBeforeHeadEnd,
  isLoopbackHost,
  validateStateBody,
  validateUpload,
  writeHourlyBackup,
} from './serverSecurity';

const basic = (user: string, pass: string) => 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

describe('isLoopbackHost', () => {
  it('erkennt lokale Adressen', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('::1')).toBe(true);
  });
  it('stuft Netzadressen als offen ein', () => {
    expect(isLoopbackHost('0.0.0.0')).toBe(false);
    expect(isLoopbackHost('192.168.1.5')).toBe(false);
  });
});

describe('checkBasicAuth', () => {
  it('akzeptiert korrekte Zugangsdaten, auch mit Doppelpunkt im Passwort', () => {
    expect(checkBasicAuth(basic('midpct', 'geheim'), 'midpct', 'geheim')).toBe(true);
    expect(checkBasicAuth(basic('midpct', 'a:b'), 'midpct', 'a:b')).toBe(true);
  });
  it('lehnt falsche, fehlende und fremde Header ab', () => {
    expect(checkBasicAuth(basic('midpct', 'falsch'), 'midpct', 'geheim')).toBe(false);
    expect(checkBasicAuth(basic('andere', 'geheim'), 'midpct', 'geheim')).toBe(false);
    expect(checkBasicAuth(undefined, 'midpct', 'geheim')).toBe(false);
    expect(checkBasicAuth('Bearer abc', 'midpct', 'geheim')).toBe(false);
    expect(checkBasicAuth('Basic %%%', 'midpct', 'geheim')).toBe(false);
  });
});

describe('createRateLimiter', () => {
  const fakeRes = () => {
    const res: any = { headers: {}, statusCode: 200 };
    res.setHeader = (k: string, v: string) => (res.headers[k] = v);
    res.status = (c: number) => ((res.statusCode = c), res);
    res.json = (b: unknown) => ((res.body = b), res);
    return res;
  };

  it('lässt max Anfragen pro Fenster durch und sperrt danach, bis das Fenster abläuft', () => {
    let t = 1_000_000;
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, now: () => t });
    const req: any = { ip: '10.0.0.1', socket: {} };
    let passed = 0;
    const next = () => passed++;

    limiter(req, fakeRes(), next);
    limiter(req, fakeRes(), next);
    const blocked = fakeRes();
    limiter(req, blocked, next);
    expect(passed).toBe(2);
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers['Retry-After'])).toBeGreaterThan(0);

    t += 61_000;
    limiter(req, fakeRes(), next);
    expect(passed).toBe(3);
  });

  it('zählt Clients getrennt', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    let passed = 0;
    limiter({ ip: 'a', socket: {} } as any, fakeRes(), () => passed++);
    limiter({ ip: 'b', socket: {} } as any, fakeRes(), () => passed++);
    expect(passed).toBe(2);
  });
});

describe('validateUpload', () => {
  it('erlaubt PDF und Bilder, lehnt Rest ab', () => {
    expect(validateUpload('QUJD', 'application/pdf').ok).toBe(true);
    expect(validateUpload('QUJD', undefined).ok).toBe(true);
    expect(validateUpload('QUJD', 'text/html').ok).toBe(false);
    expect(validateUpload('', 'application/pdf').ok).toBe(false);
    expect(validateUpload(123, 'application/pdf').ok).toBe(false);
  });
  it('begrenzt die Größe', () => {
    expect(validateUpload('A'.repeat(MAX_UPLOAD_BASE64_CHARS + 1), 'application/pdf').ok).toBe(false);
  });
});

describe('validateStateBody', () => {
  it('verlangt ein Objekt unter "state"', () => {
    expect(validateStateBody({ state: { a: 1 } }).ok).toBe(true);
    expect(validateStateBody({ state: [] }).ok).toBe(false);
    expect(validateStateBody({ state: 'x' }).ok).toBe(false);
    expect(validateStateBody({}).ok).toBe(false);
    expect(validateStateBody(null).ok).toBe(false);
    expect(validateStateBody([]).ok).toBe(false);
  });
});

describe('Dateien', () => {
  let dir = '';
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'midpct-test-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('atomicWriteFileSync schreibt vollständig und hinterlässt keine Temp-Datei', () => {
    const file = path.join(dir, 'db.json');
    atomicWriteFileSync(file, '{"a":1}');
    atomicWriteFileSync(file, '{"a":2}');
    expect(fs.readFileSync(file, 'utf-8')).toBe('{"a":2}');
    expect(fs.readdirSync(dir)).toEqual(['db.json']);
  });

  it('backupFileName ist sortierbar und ohne Doppelpunkt', () => {
    const name = backupFileName(new Date('2026-11-24T14:05:33Z'));
    expect(name).toBe('2026-11-24T14-05.json');
  });

  it('writeHourlyBackup sichert höchstens einmal pro Stunde', () => {
    const first = writeHourlyBackup(dir, 'A', new Date('2026-11-24T14:05:00Z'), 10);
    const sameHour = writeHourlyBackup(dir, 'B', new Date('2026-11-24T14:55:00Z'), 10);
    const nextHour = writeHourlyBackup(dir, 'C', new Date('2026-11-24T15:01:00Z'), 10);
    expect(first).not.toBeNull();
    expect(sameHour).toBeNull();
    expect(nextHour).not.toBeNull();
    expect(fs.readdirSync(dir)).toHaveLength(2);
    expect(fs.readFileSync(path.join(dir, first!), 'utf-8')).toBe('A');
  });

  it('writeHourlyBackup behält nur die jüngsten Dateien', () => {
    for (let h = 0; h < 6; h++) {
      writeHourlyBackup(dir, String(h), new Date(`2026-11-24T${String(10 + h)}:00:00Z`), 3);
    }
    expect(fs.readdirSync(dir).sort()).toEqual(['2026-11-24T13-00.json', '2026-11-24T14-00.json', '2026-11-24T15-00.json']);
  });
});

describe('injectBeforeHeadEnd', () => {
  it('fügt Text ein, auch wenn er $-Sonderzeichen enthält', () => {
    const html = '<html><head><title>x</title></head><body></body></html>';
    const injection = '<script>var s = "Preis $& $\' $1";</script>\n</head>';
    const out = injectBeforeHeadEnd(html, injection);
    expect(out).toContain('"Preis $& $\' $1"');
    expect(out.match(/<\/head>/g)).toHaveLength(1);
  });
});
