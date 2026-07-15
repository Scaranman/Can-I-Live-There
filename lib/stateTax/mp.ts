/**
 * Commonwealth of the Northern Mariana Islands (MP) — mirror-code territorial income tax.
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import { estimateMirrorFederalTerritoryTax } from "./mirrorFederalTerritory";

export function estimateNorthernMarianaIslandsStateTax(
  params: StateTaxEstimateInput,
): StateTaxAnnualParts {
  return estimateMirrorFederalTerritoryTax(
    "MP",
    params,
    "CNMI mirror-code income tax (approx. US federal ordinary rates). Mapped to the UI state bucket.",
  );
}
