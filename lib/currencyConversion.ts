import type { MoneyCurrency, WorkCountry } from "./types";

/** When the API is unavailable — rough placeholder only. */
export const FALLBACK_CAD_PER_USD = 1.37;

export function workCountryToCurrency(w: WorkCountry): MoneyCurrency {
  return w === "CA" ? "CAD" : "USD";
}

export function resolveCadPerUsd(raw: number | null | undefined): number {
  if (raw != null && Number.isFinite(raw) && raw > 0) return raw;
  return FALLBACK_CAD_PER_USD;
}

/** `cadPerUsd` = CAD equivalent of 1 USD (from USD-base API). */
export function convertCurrency(
  amount: number,
  from: MoneyCurrency,
  to: MoneyCurrency,
  cadPerUsd: number,
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const r = resolveCadPerUsd(cadPerUsd);
  if (from === "USD" && to === "CAD") return amount * r;
  if (from === "CAD" && to === "USD") return amount / r;
  return amount;
}
