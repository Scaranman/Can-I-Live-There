/**
 * Washington (WA) — local employee-side state wage tax estimate (TY 2026).
 * Source: Tax Foundation state individual income tax rates/brackets (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/).
 * Not tax advice; excludes credits, local add-ons, and most phaseouts.
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import { zeroStateTax } from "./helpers";

export function estimateWashingtonStateTax(_params: StateTaxEstimateInput): StateTaxAnnualParts {
  return zeroStateTax("WA", "No wage income tax; capital-gains-only tax is out of scope for payroll wage estimates.");
}
