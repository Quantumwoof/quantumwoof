import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "quantumwoof",
      time: new Date().toISOString(),
    },
    { headers: corsHeaders },
  );
}
