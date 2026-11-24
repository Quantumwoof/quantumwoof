#!/usr/bin/env bun
/**
 * Restore a Redis snapshot made by /api/cron/backup.
 *
 * DRY RUN BY DEFAULT — prints what it would write and touches nothing.
 *
 *   # list stored backups / download one (needs BLOB_READ_WRITE_TOKEN, e.g. from `vercel env pull`)
 *   bun scripts/restore-backup.ts --list
 *   bun scripts/restore-backup.ts --blob redis-backups/2026-11-24.json --save ./snap.json
 *
 *   # preview a restore (no writes)
 *   bun scripts/restore-backup.ts --file ./snap.json
 *
 *   # really write — target must be named explicitly (never read from the app's own env vars)
 *   RESTORE_REDIS_URL=https://... RESTORE_REDIS_TOKEN=... \
 *     bun scripts/restore-backup.ts --file ./snap.json --apply [--overwrite] [--only wooftag:]
 *
 * Without --overwrite, keys that already exist in the target are left alone.
 * With --overwrite, each restored key is deleted first, then rewritten.
 * TTLs are re-applied as they were at snapshot time.
 */
import { get, list } from "@vercel/blob";
import { readFileSync, writeFileSync } from "node:fs";
import { restoreCommands, BACKUP_PREFIX, type Command, type Snapshot } from "../src/lib/backup/snapshot";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  if (flag("--list")) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: BACKUP_PREFIX, cursor });
      for (const b of page.blobs) console.log(`${b.pathname}\t${b.size} bytes\t${b.uploadedAt.toISOString()}`);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return;
  }

  let text: string;
  const file = opt("--file");
  const blobPath = opt("--blob");
  if (file) text = readFileSync(file, "utf8");
  else if (blobPath) {
    const r = await get(blobPath, { access: "private", useCache: false });
    if (!r || r.statusCode !== 200) throw new Error(`backup not found: ${blobPath}`);
    text = await new Response(r.stream).text();
  } else throw new Error("pass --file <snapshot.json>, --blob <pathname>, or --list");

  const save = opt("--save");
  if (save) {
    writeFileSync(save, text, { mode: 0o600 });
    console.log(`saved ${save}`);
  }

  const snap = JSON.parse(text) as Snapshot;
  if (snap.version !== 1 || !Array.isArray(snap.keys)) throw new Error("not a quantumwoof snapshot");
  const only = opt("--only");
  const entries = only ? snap.keys.filter((e) => e.key.startsWith(only)) : snap.keys;
  console.log(`snapshot ${snap.createdAt}: ${snap.keys.length} keys; restoring ${entries.length}`);
  console.log("counts:", snap.counts);

  const apply = flag("--apply");
  const overwrite = flag("--overwrite");
  if (!apply) {
    for (const e of entries.slice(0, 20)) console.log(`  would restore ${e.type.padEnd(6)} ${e.key}`);
    if (entries.length > 20) console.log(`  … and ${entries.length - 20} more`);
    console.log("DRY RUN — nothing written. Add --apply with RESTORE_REDIS_URL/RESTORE_REDIS_TOKEN to write.");
    return;
  }

  const url = process.env.RESTORE_REDIS_URL?.trim();
  const token = process.env.RESTORE_REDIS_TOKEN?.trim();
  if (!url || !token) throw new Error("--apply needs RESTORE_REDIS_URL and RESTORE_REDIS_TOKEN");
  const send = async (cmds: Command[]) => {
    const res = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds.map((c) => c.map(String))),
    });
    if (!res.ok) throw new Error(`redis HTTP ${res.status}`);
    const rows = (await res.json()) as { result?: unknown; error?: string }[];
    rows.forEach((r, i) => {
      if (r.error) throw new Error(`${String(cmds[i][0])} ${String(cmds[i][1])}: ${r.error}`);
    });
    return rows.map((r) => r.result);
  };

  let written = 0;
  let skipped = 0;
  for (const e of entries) {
    if (!overwrite) {
      const [exists] = await send([["EXISTS", e.key]]);
      if (Number(exists) > 0) {
        skipped++;
        continue;
      }
    }
    const cmds = restoreCommands(e);
    await send(overwrite ? [["DEL", e.key], ...cmds] : cmds);
    written++;
  }
  console.log(`restored ${written} keys, left ${skipped} existing keys alone`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
