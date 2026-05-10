import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId")?.trim() ?? "";
  if (!placeId) {
    return NextResponse.json({ ok: false, code: "missing_place_id" }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, code: "missing_key" }, { status: 503 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "address_component,formatted_address,name");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as {
    status: string;
    result?: {
      formatted_address?: string;
      name?: string;
      address_components?: { long_name: string; short_name: string; types: string[] }[];
    };
    error_message?: string;
  };

  if (!res.ok || data.status !== "OK") {
    return NextResponse.json(
      { ok: false, code: "upstream", detail: data.error_message ?? data.status },
      { status: 502 },
    );
  }

  const comps = data.result?.address_components ?? [];
  const locality = comps.find((c) => c.types.includes("locality"))?.long_name;
  const admin = comps.find((c) => c.types.includes("administrative_area_level_1"))?.short_name;
  const label =
    locality && admin ? `${locality}, ${admin}` : data.result?.formatted_address ?? data.result?.name ?? "";
  const countryShort = comps.find((c) => c.types.includes("country"))?.short_name;
  const countryCode =
    countryShort === "CA" || countryShort === "US" ? (countryShort as "CA" | "US") : undefined;

  return NextResponse.json({
    ok: true,
    label,
    formattedAddress: data.result?.formatted_address ?? "",
    placeId,
    countryCode,
  });
}
