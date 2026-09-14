import { createHash } from "node:crypto";

/**
 * Server-only. WOOFTAG_PEPPER must never reach the browser bundle
 * (no NEXT_PUBLIC_*, no client imports of this module).
 * Browser may keep plaintext Wooftag in localStorage + httpOnly cookies only.
 */

/** SHA-256(tag + WOOFTAG_PEPPER) as lowercase hex. Server stores this, never plaintext. */
export function hashWooftag(tag: string, pepper: string): string {
  return createHash("sha256").update(tag + pepper, "utf8").digest("hex");
}

export function getWooftagPepper(): string | null {
  const pepper = process.env.WOOFTAG_PEPPER?.trim() ?? "";
  return pepper.length > 0 ? pepper : null;
}
