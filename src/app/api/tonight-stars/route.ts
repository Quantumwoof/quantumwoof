import { NextRequest, NextResponse } from "next/server";
import { getTonightStars, seasonLabel } from "@/content/tonightStars";
import { COUNTRIES, findCountry, hemisphereForCountry } from "@/lib/country";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function GET(request: NextRequest) {
  // No silent default: a hemisphere guess for the wrong country would be wrong
  // half the time. The site itself asks for a country first and never calls
  // this route without one.
  const raw = request.nextUrl.searchParams.get("country");
  const country = findCountry(raw);
  if (!country) {
    return NextResponse.json(
      {
        ok: false,
        error: raw ? "invalid_country" : "country_required",
        message: raw
          ? "Unknown country code. Use an ISO 3166-1 alpha-2 code such as NG, GB or AU."
          : "Pass ?country=<ISO 3166-1 alpha-2 code>, e.g. ?country=NG.",
        supported: COUNTRIES.map((c) => c.code),
      },
      { status: 400, headers: { ...corsHeaders, "Cache-Control": "no-store" } },
    );
  }
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
