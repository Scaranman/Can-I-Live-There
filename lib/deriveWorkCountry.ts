import { guessProvinceFromLabel } from "./canadaTax";
import { guessStateFromLabel } from "./taxStub";
import type { WorkCountry } from "./types";

/**
 * Payroll jurisdiction from Google Places country (when known) and/or city label.
 * Canadian provinces/territories are detected before US state codes (e.g. Toronto, ON → Canada).
 */
export function derivePayrollWorkCountry(city: {
  label: string;
  placeId?: string;
  placeCountryCode?: "US" | "CA";
}): WorkCountry {
  const placeId = (city.placeId ?? "").trim();
  const cc = city.placeCountryCode;
  if (placeId && (cc === "CA" || cc === "US")) {
    return cc;
  }

  if (guessProvinceFromLabel(city.label)) return "CA";

  const t = city.label.trim().toLowerCase();
  if (t.includes("canada") || /,\s*canada\s*$/i.test(city.label.trim())) {
    return "CA";
  }

  if (guessStateFromLabel(city.label)) return "US";

  return "US";
}
