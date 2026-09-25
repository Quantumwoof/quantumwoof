/**
 * Same-site request guard for state-changing POST routes.
 *
 * Allowed when the request's Origin host is on the allowlist; if Origin is
 * absent, the Referer host is used; if both are absent, only
 * `Sec-Fetch-Site: same-origin` is accepted. Everything else → 403.
 *
 * Allowlist: www.quantumwoof.io, quantumwoof.io, this project's own Vercel
 * deployment hosts (VERCEL_URL / VERCEL_BRANCH_URL /
 * VERCEL_PROJECT_PRODUCTION_URL), plus localhost / 127.0.0.1 (any port) when
 * NODE_ENV !== "production".
 */
import { json } from "@/lib/wooftag-http";

type Env = Record<string, string | undefined>;
type HeaderSource = { get(name: string): string | null };

export const FORBIDDEN_ORIGIN_ERROR = "forbidden_origin" as const;
export const FORBIDDEN_ORIGIN_MESSAGE =
  "That request was blocked. Refresh the page and try again.";

const SITE_HOSTS = ["www.quantumwoof.io", "quantumwoof.io"];
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function vercelHosts(env: Env): string[] {
  return [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
    .map((v) => (v ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter((v) => v.length > 0);
}

/** True if a parsed URL (from Origin or Referer) belongs to an allowed host. */
export function isAllowedUrl(raw: string, env: Env = process.env): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  const host = u.host.toLowerCase();
  const isProd = env.NODE_ENV === "production";

  if (!isProd && LOCAL_HOSTNAMES.has(u.hostname.toLowerCase())) {
    return u.protocol === "http:" || u.protocol === "https:";
  }
  if (u.protocol !== "https:") return false;
  if (SITE_HOSTS.includes(host)) return true;
  return vercelHosts(env).includes(host);
}

/** Core decision — pure so it can be unit-tested with plain Headers. */
export function isAllowedRequestOrigin(headers: HeaderSource, env: Env = process.env): boolean {
  const origin = headers.get("origin")?.trim() ?? "";
  if (origin) {
    if (origin === "null") return false;
    return isAllowedUrl(origin, env);
  }
  const referer = headers.get("referer")?.trim() ?? "";
  if (referer) return isAllowedUrl(referer, env);
  return (headers.get("sec-fetch-site")?.trim().toLowerCase() ?? "") === "same-origin";
}

/**
 * Returns a 403 response when the request is cross-site, or null when allowed.
 * Call first thing in every state-changing POST handler.
 */
export function rejectForeignOrigin(req: { headers: HeaderSource }) {
  if (isAllowedRequestOrigin(req.headers)) return null;
  return json(
    { ok: false, error: FORBIDDEN_ORIGIN_ERROR, message: FORBIDDEN_ORIGIN_MESSAGE },
    { status: 403 },
  );
}
