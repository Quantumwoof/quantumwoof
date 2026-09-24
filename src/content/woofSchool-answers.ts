import "server-only";

/**
 * Server-only answer key for Woof School checks.
 * Never import from client components — grading lives in /api/woof-school/check.
 */
export type WoofAnswer = "a" | "b" | "c";

/** topicSlug → questionId → correct choice */
export const woofSchoolAnswers: Record<string, Record<string, WoofAnswer>> = {
  "looking-up": {
    "lu-1": "a",
    "lu-2": "c",
    "lu-3": "c"
  },
  "our-backyard": {
    "ob-1": "c",
    "ob-2": "a",
    "ob-3": "c",
    "ob-4": "c"
  },
  "solar-system": {
    "ss-1": "a",
    "ss-2": "a",
    "ss-3": "c",
    "ss-4": "c"
  },
  "star-lives": {
    "sl-1": "b",
    "sl-2": "c",
    "sl-3": "c",
    "sl-4": "a"
  },
  "light-tricks": {
    "lt-1": "a",
    "lt-2": "b",
    "lt-3": "b",
    "lt-4": "a"
  },
  "deep-sky": {
    "ds-1": "b",
    "ds-2": "c",
    "ds-3": "c",
    "ds-4": "b"
  },
  "cosmos-timeline": {
    "ct-1": "b",
    "ct-2": "c",
    "ct-3": "b",
    "ct-4": "a"
  },
  "go-outside": {
    "go-1": "b",
    "go-2": "b",
    "go-3": "a",
    "go-4": "c"
  },
  "missions-humans": {
    "mh-1": "a",
    "mh-2": "b",
    "mh-3": "b",
    "mh-4": "b"
  }
};

export type GradeResult = {
  score: number;
  total: number;
  results: Record<
    string,
    { pick: WoofAnswer | null; correct: boolean; answer: WoofAnswer }
  >;
};

/** Grade submitted picks against the answer key. Returns null if topic unknown. */
export function gradeWoofCheck(
  topicSlug: string,
  answers: Record<string, unknown>,
): GradeResult | null {
  const key = woofSchoolAnswers[topicSlug];
  if (!key) return null;
  const results: GradeResult["results"] = {};
  let score = 0;
  for (const id of Object.keys(key)) {
    const answer = key[id]!;
    const raw = answers[id];
    const pick =
      raw === "a" || raw === "b" || raw === "c" ? (raw as WoofAnswer) : null;
    const correct = pick !== null && pick === answer;
    if (correct) score += 1;
    results[id] = { pick, correct, answer };
  }
  return { score, total: Object.keys(key).length, results };
}
