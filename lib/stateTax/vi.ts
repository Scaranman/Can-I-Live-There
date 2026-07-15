/**
 * U.S. Virgin Islands (VI) — mirror-code territorial income tax (US IRC ordinary rates as local tax).
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import { estimateMirrorFederalTerritoryTax } from "./mirrorFederalTerritory";

export function estimateUsVirginIslandsStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  return estimateMirrorFederalTerritoryTax(
    "VI",
    params,
    "U.S. Virgin Islands mirror-code income tax (approx. US federal ordinary rates). Mapped to the UI state bucket.",
  );
}
