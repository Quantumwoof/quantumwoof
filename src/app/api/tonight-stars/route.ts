import { NextRequest, NextResponse } from "next/server";
import { getTonightStars, seasonLabel } from "@/content/tonightStars";
import {
  DEFAULT_COUNTRY_CODE,
  getCountryByCode,
  hemisphereForCountry,
} from "@/lib/country";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("country") ?? DEFAULT_COUNTRY_CODE;
  const country = getCountryByCode(raw.toUpperCase());
  const hemisphere = hemisphereForCountry(country.code);
  const now = new Date();
  const stars = getTonightStars(hemisphere, now);

  return NextResponse.json(
    {
      country: { code: country.code, name: country.name },
      hemisphere,
      season: seasonLabel(hemisphere, now),
      stars,
    },
    { headers: corsHeaders },
  );
}
