/**
 * Washington (WA) — local employee-side state wage tax estimate (TY 2026).
 * No wage income tax. Models employee WA Cares + Paid Leave premiums.
 * Not tax advice; capital-gains tax and employer-share PFML variants are out of scope.
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import { parts } from "./helpers";

/** WA Cares 2026: 0.58% of gross wages, no Social Security cap (employee-paid). */
const WA_CARES_RATE = 0.0058;

/**
 * WA Paid Leave 2026 total premium 1.13% up to SS wage base; employee share 71.43%
 * per ESD / paidleave.wa.gov toolkit (simplified combined method).
 */
const WA_PFML_TOTAL = 0.0113;
const WA_PFML_EMPLOYEE_SHARE = 0.7143;
const SS_WAGE_BASE = 184_500;

export function estimateWashingtonStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const gross = Math.max(0, params.grossAnnual);
  const cares = gross * WA_CARES_RATE;
  const pfml = Math.min(gross, SS_WAGE_BASE) * WA_PFML_TOTAL * WA_PFML_EMPLOYEE_SHARE;
  return parts(
    "WA",
    0,
    cares + pfml,
    "No wage income tax. Includes WA Cares (0.58% uncapped) + employee Paid Leave share (1.13% × 71.43% up to SS base).",
  );
}
