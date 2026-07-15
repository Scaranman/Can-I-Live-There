/**
 * American Samoa (AS) — IRC-modeled territorial income tax (closely follows US federal ordinary rates).
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import { estimateMirrorFederalTerritoryTax } from "./mirrorFederalTerritory";

export function estimateAmericanSamoaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  return estimateMirrorFederalTerritoryTax(
    "AS",
    params,
    "American Samoa IRC-modeled income tax (approx. US federal ordinary rates). Mapped to the UI state bucket.",
  );
}
