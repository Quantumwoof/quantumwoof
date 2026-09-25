import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Server-only. WOOFTAG_PEPPER must never reach the browser bundle
 * (no NEXT_PUBLIC_*, no client imports of this module).
 *
 * Tag fingerprints (server never stores plaintext for anonymous mint):
 *
 * - v2 (current, all new tags): HMAC-SHA256(key = WOOFTAG_PEPPER,
 *   msg = normalizeWooftag(tag)) as lowercase hex, stored under
 *   `wooftag:h2:<hex>`.
 * - v1 (legacy, read-only): SHA-256(tag + WOOFTAG_PEPPER) as lowercase hex,
 *   stored under `wooftag:h:<hex>`. Existing production tags live here and are
 *   never migrated or rewritten; every lookup/dedupe checks v2 first, then v1.
 */

/** Canonical tag form: trimmed, upper-case, unicode dashes → "-", no spaces. */
export function normalizeWooftag(tag: string): string {
  return tag
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, "");
}

/** v2: HMAC-SHA256(pepper, normalized tag) — lowercase hex. */
export function hmacWooftag(tag: string, pepper: string): string {
  return createHmac("sha256", pepper).update(normalizeWooftag(tag), "utf8").digest("hex");
}

/** v1 legacy: SHA-256(tag + pepper) — lowercase hex. Verify/dedupe only. */
export function legacyHashWooftag(tag: string, pepper: string): string {
  return createHash("sha256").update(normalizeWooftag(tag) + pepper, "utf8").digest("hex");
}

export type WooftagFingerprint = { hmac: string; legacy: string };

/** Both fingerprints for a tag — store checks `hmac` first, then `legacy`. */
export function wooftagFingerprint(tag: string, pepper: string): WooftagFingerprint {
  return { hmac: hmacWooftag(tag, pepper), legacy: legacyHashWooftag(tag, pepper) };
}

/** Constant-time compare of two hex digests (false on length/format mismatch). */
export function safeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const ba = Buffer.from(a.toLowerCase(), "hex");
  const bb = Buffer.from(b.toLowerCase(), "hex");
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * True if `storedHex` is this tag's fingerprint under either scheme
 * (HMAC first, then legacy). Constant-time per comparison.
 */
export function wooftagMatchesHash(tag: string, pepper: string, storedHex: string): boolean {
  const fp = wooftagFingerprint(tag, pepper);
  const v2 = safeEqualHex(fp.hmac, storedHex);
  const v1 = safeEqualHex(fp.legacy, storedHex);
  return v2 || v1;
}

export function getWooftagPepper(): string | null {
  const pepper = process.env.WOOFTAG_PEPPER?.trim() ?? "";
  return pepper.length > 0 ? pepper : null;
}
