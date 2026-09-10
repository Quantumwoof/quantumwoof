import { NextResponse } from "next/server";
import {
  astronomyFacts,
  getFactForSlot,
  getSlotEndMs,
  getUtcFactSlot,
} from "@/content/astronomyFacts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function GET() {
  const now = Date.now();
  const slot = getUtcFactSlot(now);
  const index =
    ((slot % astronomyFacts.length) + astronomyFacts.length) % astronomyFacts.length;
  const nextChangeAt = new Date(getSlotEndMs(now)).toISOString();
  const hoursLeft = Math.max(0, (getSlotEndMs(now) - now) / 3_600_000);

  return NextResponse.json(
    {
      fact: getFactForSlot(slot),
      slot,
      index,
      nextChangeAt,
      hoursLeft: Math.round(hoursLeft * 100) / 100,
      windowHours: 12,
    },
    { headers: corsHeaders },
  );
}
