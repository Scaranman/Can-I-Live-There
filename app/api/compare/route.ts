import { compareSnapshotOnServer } from "@/lib/compareSnapshot";
import { normalizeSnapshotBaseline } from "@/lib/defaultSnapshot";
import { fetchUsdCadSnapshot } from "@/lib/exchangeRateApi";
import type { ComparisonSnapshot } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: ComparisonSnapshot;
  try {
    body = (await req.json()) as ComparisonSnapshot;
  } catch {
    return NextResponse.json({ ok: false, detail: "invalid_json" }, { status: 400 });
  }

  if (!body || body.version !== 1 || !Array.isArray(body.cities)) {
    return NextResponse.json({ ok: false, detail: "invalid_snapshot" }, { status: 400 });
  }

  const snapshot = normalizeSnapshotBaseline(body);

  try {
    const fx = await fetchUsdCadSnapshot();
    const { computed, taxSource, message, payrollTaxLookups } = await compareSnapshotOnServer(snapshot, fx);
    return NextResponse.json({ ok: true, computed, taxSource, message, payrollTaxLookups });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "compare_failed";
    return NextResponse.json({ ok: false, detail }, { status: 500 });
  }
}
