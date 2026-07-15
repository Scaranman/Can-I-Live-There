/**
 * Shared estimate for US territories that mirror / closely follow the US IRC
 * ordinary income brackets (Guam, USVI, CNMI mirror code; American Samoa IRC-modeled).
 *
 * Territorial tax is mapped to the app's "state" bucket. Bona fide residents generally
 * do not also owe US federal ordinary income tax on territory-source wages — the stub
 * zeros federal ordinary income for these codes to avoid double-counting.
 */
import { federalOrdinaryIncomeTaxAnnual, standardDeductionFor } from "../federalTax";
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import { parts, wagesAfterPretax } from "./helpers";

export function estimateMirrorFederalTerritoryTax(
  territoryCode: string,
  params: StateTaxEstimateInput,
  notes: string,
): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = Math.max(0, wages - standardDeductionFor(params.filingStatus));
  const income = federalOrdinaryIncomeTaxAnnual(taxable, params.filingStatus);
  return parts(territoryCode, income, 0, notes);
}
