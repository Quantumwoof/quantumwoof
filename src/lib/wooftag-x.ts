/**
 * Optional "Claim your Wooftag with X" — gated behind env.
 * Learning / Nebula Sniffer cert stay fully open with no sign-in.
 */

/** Single config for eligibility checks (owner-approved). */
export const WOOFTAG_X_ELIGIBILITY = {
  /** Account created_at must be strictly before this instant (UTC). */
  createdBeforeIso: "2026-08-31T00:00:00.000Z",
  /** Light activity: either threshold is enough. */
  minTweetCount: 5,
  minFollowersCount: 5,
} as const;

export const WOOFTAG_X_SCOPES = "users.read tweet.read" as const;

export const WOOFTAG_X_MESSAGES = {
  signInRequired:
    "Wooftags are claimed with X now — sign in daily to claim yours (learning stays free).",
  tooNew:
    "This X account is too new for a Wooftag tip. Accounts must be created before 31 Aug 2026 UTC. Keep sniffing — Woof School stays open.",
  inactive:
    "This X account looks too quiet for a tip just yet (need a little post history or a few followers). Learning and your Nebula Sniffer cert stay yours either way.",
  missingStamps:
    "Pass today’s Woof School quizzes first — then you can claim today’s Wooftag with X.",
  alreadyToday: "You already claimed today’s Wooftag with this X account.",
  stateMismatch: "Sign-in didn’t line up — please try Claim with X again.",
  disabled: "X claim is not available right now.",
  ineligibleFallback:
    "This X account isn’t eligible for a Wooftag tip right now. Learning stays open.",
  dailyHint:
    "You can sign in daily to claim a Wooftag — pass today’s Woof School quizzes, then claim.",
  browserAlreadyClaimedToday:
    "This browser already claimed today’s Wooftag. Come back after 1 AM Lagos / midnight UTC.",
  browserRequired:
    "Refresh this page and pass today’s woof checks in this browser, then claim.",
} as const;

/**
 * X claim is ON only when credentials + session secret exist AND the switch is on.
 * While off: anonymous mint works; no X button.
 */
export function isWooftagXClaimEnabled(): boolean {
  const flag = (process.env.WOOFTAG_X_CLAIM ?? "").trim().toLowerCase();
  if (flag !== "on" && flag !== "1" && flag !== "true") return false;
  const id = process.env.X_CLIENT_ID?.trim() ?? "";
  const secret = process.env.X_CLIENT_SECRET?.trim() ?? "";
  const session = process.env.QW_SESSION_SECRET?.trim() ?? "";
  return id.length > 0 && secret.length > 0 && session.length > 0;
}

export type XPublicMetrics = {
  tweet_count?: number;
  followers_count?: number;
};

export type XUserMe = {
  id: string;
  username: string;
  created_at?: string;
  public_metrics?: XPublicMetrics;
};

export type XEligibilityResult =
  | { ok: true }
  | { ok: false; reason: "too_new" | "inactive" | "incomplete"; message: string };

export function evaluateXEligibility(user: XUserMe): XEligibilityResult {
  const createdRaw = user.created_at?.trim() ?? "";
  if (!createdRaw) {
    return {
      ok: false,
      reason: "incomplete",
      message: WOOFTAG_X_MESSAGES.ineligibleFallback,
    };
  }
  const createdMs = Date.parse(createdRaw);
  const cutoffMs = Date.parse(WOOFTAG_X_ELIGIBILITY.createdBeforeIso);
  if (!Number.isFinite(createdMs) || !Number.isFinite(cutoffMs)) {
    return {
      ok: false,
      reason: "incomplete",
      message: WOOFTAG_X_MESSAGES.ineligibleFallback,
    };
  }
  if (createdMs >= cutoffMs) {
    return { ok: false, reason: "too_new", message: WOOFTAG_X_MESSAGES.tooNew };
  }

  const tweets = Number(user.public_metrics?.tweet_count ?? 0) || 0;
  const followers = Number(user.public_metrics?.followers_count ?? 0) || 0;
  if (
    tweets < WOOFTAG_X_ELIGIBILITY.minTweetCount &&
    followers < WOOFTAG_X_ELIGIBILITY.minFollowersCount
  ) {
    return { ok: false, reason: "inactive", message: WOOFTAG_X_MESSAGES.inactive };
  }

  return { ok: true };
}
