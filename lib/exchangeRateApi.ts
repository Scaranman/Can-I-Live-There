import { FALLBACK_CAD_PER_USD } from "./currencyConversion";

export type FxSnapshot = {
  cadPerUsd: number;
  fetchedAt: string;
  source: "exchangerate_api_key" | "open_er_api" | "fallback";
};

function readCadFromPayload(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  const rates =
    (d.conversion_rates as Record<string, number> | undefined) ??
    (d.rates as Record<string, number> | undefined);
  const cad = rates?.CAD;
  return typeof cad === "number" && cad > 0 ? cad : undefined;
}

/**
 * USD-base rate: CAD per 1 USD. Tries EXCHANGERATE_API_KEY (v6), then open.er-api.com, then fallback.
 */
export async function fetchUsdCadSnapshot(): Promise<FxSnapshot> {
  const now = new Date().toISOString();
  const key = process.env.EXCHANGERATE_API_KEY?.trim();

  if (key) {
    try {
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/latest/USD`, {
        cache: "no-store",
      });
      const data: unknown = await res.json();
      const cad = readCadFromPayload(data);
      if (cad != null) {
        return { cadPerUsd: cad, fetchedAt: now, source: "exchangerate_api_key" };
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    const data: unknown = await res.json();
    const cad = readCadFromPayload(data);
    if (cad != null) {
      return { cadPerUsd: cad, fetchedAt: now, source: "open_er_api" };
    }
  } catch {
    /* fall through */
  }

  return { cadPerUsd: FALLBACK_CAD_PER_USD, fetchedAt: now, source: "fallback" };
}
