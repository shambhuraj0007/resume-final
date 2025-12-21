import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { lat, lng } = await req.json();

  // Nominatim reverse geocode (rate-limited; cache results!)
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));

  const res = await fetch(url.toString(), {
    headers: {
      // Important: set a real User-Agent per Nominatim rules
      "User-Agent": "ShortlistAI/1.0 (support@shortlistai.xyz)",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Reverse geocode failed" }, { status: 400 });
  }

  const data = await res.json();
  const countryCode = data?.address?.country_code?.toUpperCase?.() ?? null;

  return NextResponse.json({ countryCode });
}
