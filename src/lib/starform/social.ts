/**
 * Optional social handle on a Star Form board entry. Shared by the game (live
 * checks, profile links) and the server (validation before storing). Handles
 * are strictly whitelisted per platform, so a stored handle can only ever be
 * plain letters/digits/._- — never markup, spaces or a URL — and the profile
 * link is always rebuilt here from the platform's fixed https:// base.
 */
export const SOCIAL_IDS = ["x", "ig", "tt", "yt", "tg"] as const;
export type SocialId = (typeof SOCIAL_IDS)[number];
export type Social = { p: SocialId; h: string };

type Spec = { label: string; prefix: string; max: number; re: RegExp; rule: string; url: (h: string) => string };

export const SOCIALS: Record<SocialId, Spec> = {
  x: {
    label: "X",
    prefix: "@",
    max: 15,
    re: /^[A-Za-z0-9_]{1,15}$/,
    rule: "1–15 letters, numbers or _",
    url: (h) => `https://x.com/${h}`,
  },
  ig: {
    label: "Instagram",
    prefix: "@",
    max: 30,
    re: /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/,
    rule: "up to 30 letters, numbers, . or _ (no dot at the ends, no ..)",
    url: (h) => `https://www.instagram.com/${h}/`,
  },
  tt: {
    label: "TikTok",
    prefix: "@",
    max: 24,
    re: /^(?!.*\.$)[A-Za-z0-9._]{2,24}$/,
    rule: "2–24 letters, numbers, . or _ (can't end with a dot)",
    url: (h) => `https://www.tiktok.com/@${h}`,
  },
  yt: {
    label: "YouTube",
    prefix: "@",
    max: 30,
    re: /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/,
    rule: "3–30 letters, numbers, . _ or -",
    url: (h) => `https://www.youtube.com/@${h}`,
  },
  tg: {
    label: "Telegram",
    prefix: "@",
    max: 32,
    re: /^[A-Za-z](?!.*__)[A-Za-z0-9_]{3,30}[A-Za-z0-9]$/,
    rule: "5–32 letters, numbers or _, starting with a letter",
    url: (h) => `https://t.me/${h}`,
  },
};

export const isSocialId = (v: unknown): v is SocialId => typeof v === "string" && (SOCIAL_IDS as readonly string[]).includes(v);

/** What the player typed → bare handle (trims spaces and one leading @). */
export function cleanHandle(raw: string): string {
  return raw.normalize("NFKC").trim().replace(/^@/, "").trim();
}

export function validHandle(p: SocialId, h: string): boolean {
  return h.length <= SOCIALS[p].max && SOCIALS[p].re.test(h);
}

/**
 * Server: read the optional `social` field of a post.
 * Absent / null / empty handle → no social. Anything malformed → "invalid".
 */
export function parseSocial(v: unknown): Social | null | "invalid" {
  if (v === undefined || v === null) return null;
  if (typeof v !== "object" || Array.isArray(v)) return "invalid";
  const o = v as { p?: unknown; h?: unknown };
  if (!isSocialId(o.p) || typeof o.h !== "string" || o.h.length > 64) return "invalid";
  const h = cleanHandle(o.h);
  if (!h) return null;
  return validHandle(o.p, h) ? { p: o.p, h } : "invalid";
}

/** Store/board: keep a stored social only if it is still valid (old or odd entries just show no handle). */
export function readSocial(v: unknown): Social | undefined {
  const s = parseSocial(v);
  return s && s !== "invalid" ? s : undefined;
}

/** https:// profile link, rebuilt from the fixed base — never from stored text. */
export function profileUrl(s: Social): string | null {
  return isSocialId(s.p) && validHandle(s.p, s.h) ? SOCIALS[s.p].url(s.h) : null;
}
