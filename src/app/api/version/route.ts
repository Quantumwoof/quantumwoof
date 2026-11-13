import { NextResponse } from "next/server";

/** Build id of the deployment answering right now (the client compares it with its own bundle). */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
