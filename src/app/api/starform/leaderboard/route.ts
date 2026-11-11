import { json } from "@/lib/wooftag-http";
import { getStarFormStore } from "@/lib/starform/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public read: the all-time top 3 (names + scores only). */
export async function GET() {
  const store = getStarFormStore();
  if (!store) return json({ ok: true, available: false, top: [] });
  try {
    const top = await store.top3();
    return json({
      ok: true,
      available: true,
      top: top.map((e) => ({ name: e.name, score: Math.round(e.score), at: e.at })),
    });
  } catch (err) {
    console.error("[starform/leaderboard]", err instanceof Error ? err.message : "error");
    return json({ ok: true, available: false, top: [] });
  }
}
