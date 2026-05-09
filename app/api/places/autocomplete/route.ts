import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ ok: true, predictions: [] satisfies { description: string; place_id: string }[] });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, code: "missing_key", predictions: [] },
      { status: 503 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", q);
  url.searchParams.set("types", "(cities)");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as {
    predictions?: { description: string; place_id: string }[];
    status: string;
    error_message?: string;
  };

  if (!res.ok || data.status === "REQUEST_DENIED") {
    return NextResponse.json(
      { ok: false, code: "upstream", predictions: [], detail: data.error_message ?? data.status },
      { status: 502 },
    );
  }

  const predictions =
    data.predictions?.map((p) => ({
      description: p.description,
      place_id: p.place_id,
    })) ?? [];

  return NextResponse.json({ ok: true, predictions });
}
