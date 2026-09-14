import { createHash } from "node:crypto";

/** SHA-256(tag + WOOFTAG_PEPPER) as lowercase hex. Server stores this, never plaintext. */
export function hashWooftag(tag: string, pepper: string): string {
  return createHash("sha256").update(tag + pepper, "utf8").digest("hex");
}

export function getWooftagPepper(): string | null {
  const pepper = process.env.WOOFTAG_PEPPER?.trim() ?? "";
  return pepper.length > 0 ? pepper : null;
}
