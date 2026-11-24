import type {
  AuditLog,
} from '../types';

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
