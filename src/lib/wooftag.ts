/**
 * Wooftag issue format. ISSUE ONLY — never send on Cardano from here.
 *
 * Format: WOOF-XXXX-XXXX-XXXX-XXXX
 * Alphabet: Crockford-like, 32 glyphs, excluding I L O U (ambiguous).
 * 16 glyphs × 5 bits = 80 bits, drawn from CSPRNG.
 */

export const WOOFTAG_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const WOOFTAG_DAILY_CAP = 200;
export const WOOFTAG_GROUP_COUNT = 4;
export const WOOFTAG_GROUP_LEN = 4;
export const WOOFTAG_GLYPHS = WOOFTAG_GROUP_COUNT * WOOFTAG_GROUP_LEN; // 16
export const WOOFTAG_BITS = WOOFTAG_GLYPHS * 5; // 80

/** Min age of the school-gate cookie before mint is allowed (soft anti-script). */
export const WOOFTAG_MIN_GATE_MS = 5_000;

export const WOOFTAG_BOWL_FULL =
  "Hosky’s tip bowl is full until tomorrow — your Wooftag will be ready when the bowl reopens";

export const WOOFTAG_CLAIM_LATER = "Claim opens later";

export const WOOFTAG_TIP_COPY =
  "This Wooftag is Hosky’s tip-jar marker — not wages, not a prize you earned. A future claim of 1B Quantumwoof may attach to it. Claim opens later.";

const TAG_BODY =
  /^WOOF-([0-9A-HJKMNP-TV-Z]{4})-([0-9A-HJKMNP-TV-Z]{4})-([0-9A-HJKMNP-TV-Z]{4})-([0-9A-HJKMNP-TV-Z]{4})$/;

export function utcDateKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function isWooftagFormat(tag: string): boolean {
  return TAG_BODY.test(tag);
}

/** 10 CSPRNG bytes → 80 bits → 16 Crockford glyphs, grouped. */
export function generateWooftag(randomBytes?: Uint8Array): string {
  const bytes = randomBytes ?? new Uint8Array(WOOFTAG_BITS / 8);
  if (bytes.byteLength < 10) {
    throw new Error("Wooftag CSPRNG needs 10 bytes");
  }
  if (!randomBytes) {
    crypto.getRandomValues(bytes);
  }
  let n = BigInt(0);
  for (let i = 0; i < 10; i++) {
    n = (n << BigInt(8)) | BigInt(bytes[i] ?? 0);
  }
  const glyphs: string[] = [];
  for (let i = 0; i < WOOFTAG_GLYPHS; i++) {
    const shift = BigInt(5 * (WOOFTAG_GLYPHS - 1 - i));
    const idx = Number((n >> shift) & BigInt(31));
    glyphs.push(WOOFTAG_ALPHABET[idx] ?? "0");
  }
  const g = (i: number) => glyphs.slice(i, i + 4).join("");
  return `WOOF-${g(0)}-${g(4)}-${g(8)}-${g(12)}`;
}

export function newOpaqueId(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let n = BigInt(0);
  for (const b of buf) n = (n << BigInt(8)) | BigInt(b);
  const out: string[] = [];
  const glyphs = Math.ceil((bytes * 8) / 5);
  for (let i = 0; i < glyphs; i++) {
    out.push(WOOFTAG_ALPHABET[Number(n % BigInt(32))] ?? "0");
    n /= BigInt(32);
  }
  return out.join("");
}
