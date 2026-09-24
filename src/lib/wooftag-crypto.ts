/**
 * Server-only AES-256-GCM for Wooftag plaintext at rest (X-claim re-show).
 * Key derived from QW_SESSION_SECRET — never import from client components.
 */
import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ENC_PREFIX = "v1";

function getEncKey(): Buffer | null {
  const secret = process.env.QW_SESSION_SECRET?.trim() ?? "";
  if (secret.length < 16) return null;
  return createHash("sha256").update(`qw:wooftag-enc:v1:${secret}`, "utf8").digest();
}

/** Encrypt plaintext Wooftag → opaque string (iv + ciphertext + auth tag). */
export function encryptWooftag(plaintext: string): string | null {
  const key = getEncKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}.${iv.toString("base64url")}.${enc.toString("base64url")}.${tag.toString("base64url")}`;
}

/** Decrypt opaque string → plaintext Wooftag, or null on failure. */
export function decryptWooftag(payload: string): string | null {
  const key = getEncKey();
  if (!key) return null;
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== ENC_PREFIX) return null;
  const [, ivB64, encB64, tagB64] = parts;
  if (!ivB64 || !encB64 || !tagB64) return null;
  try {
    const iv = Buffer.from(ivB64, "base64url");
    const data = Buffer.from(encB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
