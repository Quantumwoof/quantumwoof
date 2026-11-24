import { del, get, list, put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import {
  BACKUP_PREFIX,
  backupPathname,
  buildSnapshot,
  cronAuthorized,
  prunable,
  upstashPipeline,
  type Snapshot,
} from "@/lib/backup/snapshot";

/**
 * Daily private backup of the app's Redis data (Vercel Cron, see vercel.json).
 * Only callers with `Authorization: Bearer $CRON_SECRET` get in — Vercel Cron
 * sends exactly that. Reads Redis (read-only), writes one private Blob per UTC
 * day to redis-backups/YYYY-MM-DD.json, and prunes files older than 30 days.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const noStore = { "Cache-Control": "no-store" };

function readOnlyRedisEnv(): { url: string; token: string; readOnly: boolean } | null {
  const url = process.env.KV_REST_API_URL?.trim() || process.env.UPSTASH_REDIS_REST_URL?.trim() || "";
  const ro =
    process.env.KV_REST_API_READ_ONLY_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN?.trim() ||
    "";
  const rw = process.env.KV_REST_API_TOKEN?.trim() || process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";
  if (!url || !(ro || rw)) return null;
  return { url, token: ro || rw, readOnly: Boolean(ro) };
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const env = readOnlyRedisEnv();
  if (!env) return NextResponse.json({ ok: false, error: "store not configured" }, { status: 503, headers: noStore });

  const now = new Date();
  try {
    const snap = await buildSnapshot(upstashPipeline(env.url, env.token), now);
    const body = JSON.stringify(snap);
    const pathname = backupPathname(now);
    const blob = await put(pathname, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true, // a re-run on the same UTC day replaces that day's file
    });

    // Read it back to prove the file landed intact.
    const back = await get(pathname, { access: "private", useCache: false });
    let verified = false;
    if (back && back.statusCode === 200) {
      const text = await new Response(back.stream).text();
      const parsed = JSON.parse(text) as Snapshot;
      verified = parsed.keys.length === snap.keys.length && parsed.createdAt === snap.createdAt;
    }

    // Keep ~30 days.
    const names: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: BACKUP_PREFIX, limit: 1000, cursor });
      names.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    const old = prunable(names, now);
    if (old.length) await del(old);

    return NextResponse.json(
      {
        ok: true,
        pathname,
        url: blob.url,
        bytes: body.length,
        verified,
        readOnlyToken: env.readOnly,
        dbsize: snap.dbsize,
        keys: snap.keys.length,
        skipped: snap.skipped,
        counts: snap.counts,
        stored: names.length - old.length,
        pruned: old.length,
      },
      { headers: noStore },
    );
  } catch (e) {
    console.error("backup failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "backup failed" }, { status: 500, headers: noStore });
  }
}
